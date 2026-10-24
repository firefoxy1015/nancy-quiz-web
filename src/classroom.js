// PCP Classroom — spoken English lessons (slides + narration + quick questions), under Study.
// Lessons and audio are built in D:\Claude\textbook-study-pdf (classroom/) and synced to data/classroom/.
import { S, save, t, esc, ico } from './app.js?v=35';

const BASE = './data/classroom/';
// lessons go live in batches: always revalidate the index and lesson files (cheap ETag check) so new lessons show up at once
async function loadJSON(path) {
  try { const r = await fetch(path, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch { return null; }
}
// "Ask the teacher" goes to the examiner service (same host the AI examiner uses; rate-limited server-side)
const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:8787' : 'https://bcprep-examiner.onrender.com';
function deviceId() {
  if (!S.deviceId) { S.deviceId = Math.random().toString(36).slice(2) + Date.now().toString(36); save(); }
  return S.deviceId;
}
const AUDIO_V = '1';           // bump when any narration file is regenerated
const SPEEDS = [1.0, 1.15, 1.3, 0.9, 0.8];
const store = {
  get(k, d) { try { const v = localStorage.getItem('pcpclass:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('pcpclass:' + k, JSON.stringify(v)); } catch {} },
};

// one player per page; torn down whenever the route changes
let live = null;
window.addEventListener('hashchange', () => { if (live) { live.stop(); live = null; } });

export async function sClassroom(el, params) {
  if (live) { live.stop(); live = null; }
  const course = await loadJSON(BASE + 'index.json');
  if (!course) {
    el.innerHTML = `<a class="back-link" href="#/study">← ${t('Study library', '学习内容库')}</a>
      <div class="card"><h2>${t('PCP Classroom', 'PCP 课堂')}</h2><p class="muted">${t('Lessons are deploying — check back shortly.', '课程部署中，稍后再来。')}</p></div>`;
    return;
  }
  if (params.l) {
    const meta = course.units.flatMap(u => u.lessons).find(l => l.id === params.l);
    if (meta && meta.ready) { await drawLesson(el, meta, course); return; }
  }
  drawCourse(el, course);
}

/* ---------------- course list ---------------- */
function drawCourse(el, course) {
  const all = course.units.flatMap(u => u.lessons);
  const ready = all.filter(l => l.ready).length;
  const done = all.filter(l => store.get(l.id + ':done', false)).length;
  el.innerHTML = `
    <a class="back-link" href="#/study">← ${t('Study library', '学习内容库')}</a>
    <div class="card cls-intro">
      <h2>${ico('film')} PCP Classroom <span class="pill pcp">PCP</span></h2>
      <p>Short spoken lessons in English for EMRs stepping up to PCP practice: what you can now do, what you must do more of, and what's new to watch out for. Built on Nancy Caroline (Canadian 8th ed.) and the BC EMALB exam guidelines.</p>
      <p class="muted">${t('Tap 中文 inside a lesson to see the teacher\'s words in Chinese.', '课件和讲解都是英文；课内点「中文」可看老师这段话的中文翻译。')}</p>
      <div class="tiny">${ready} / ${all.length} ${t('lessons ready', '节已上线')} · ${done} ${t('finished', '节已学完')}</div>
    </div>
    ${course.units.map(u => `
      <div class="cls-unit">
        <h3>${esc(u.label)}</h3>
        <div class="list-wrap">
          ${u.lessons.map(l => {
            const fin = store.get(l.id + ':done', false);
            const badge = !l.ready ? t('Soon', '待上线') : fin ? t('Done', '已学完') : t('Open', '上课');
            return `<button class="list-item cls-lesson${fin ? ' done' : ''}" ${l.ready ? `data-l="${l.id}"` : 'disabled'}>
              <span>${esc(l.title)}<div class="tiny">${l.ready ? l.minutes + ' min' : t('coming soon', '即将上线')}</div></span>
              <span class="tag-count">${badge}</span></button>`;
          }).join('')}
        </div>
      </div>`).join('')}`;
  el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { location.hash = '#/study/classroom?l=' + b.dataset.l; });
}

/* ---------------- lesson player ---------------- */
async function drawLesson(el, meta, course) {
  const L = await loadJSON(BASE + meta.file);
  if (!L) { drawCourse(el, course); return; }
  const answers = store.get(L.id + ':ans', {});
  const quizzes = L.slides.filter(s => s.kind === 'quiz').length;
  let i = 0, playing = false, speedIx = store.get('speed', 0), timer = null;

  el.innerHTML = `
    <a class="back-link" href="#/study/classroom">← ${t('All lessons', '全部课程')}</a>
    <section class="card cls-start" id="clsStart">
      <div class="cls-kicker">${esc(L.book)}</div>
      <h2>${esc(L.title)}</h2>
      <ul class="muted"><li>Spoken lesson, about ${L.minutes} minutes, ${L.slides.length} slides</li><li>${quizzes} quick questions along the way</li><li>${t('Stuck? Turn on Subtitles or 中文.', '听不懂可以开字幕或「中文」。')}</li></ul>
      <div class="btn-row"><button class="btn" id="clsGo">Start class</button>
        ${store.get(L.id + ':pos', 0) > 0 ? `<button class="btn ghost" id="clsResume">Continue where I left off</button>` : ''}</div>
    </section>
    <div class="cls-progress hidden" id="clsProg"></div>
    <section class="card cls-stage hidden" id="clsStage" aria-live="polite"></section>
    <section class="card cls-panel hidden" id="clsSubs"><h4>The teacher is saying</h4><div class="cls-tx" id="clsTx"></div></section>
    <section class="card cls-panel hidden" id="clsZhP"><h4>中文翻译</h4><div class="cls-tx cls-zh" id="clsZh"></div></section>
    <section class="card cls-panel hidden" id="clsAskP"><h4>Ask the teacher</h4>
      <textarea id="clsQ" class="cls-q" rows="3" placeholder="e.g. Why does pulse pressure narrow before the blood pressure drops? (中文也可以问)"></textarea>
      <div class="btn-row"><button class="btn" id="clsAskGo">Ask</button><button class="btn ghost hidden" id="clsRead">Read it to me</button></div>
      <div class="cls-tx" id="clsAns"></div>
      <div class="tiny" id="clsAskHint">The teacher answers about the slide you're on. For BC scope and doses, the EMALB guidelines always win.</div>
    </section>
    <nav class="cls-bar hidden" id="clsBar">
      <button id="clsPrev" aria-label="Previous slide">‹‹</button>
      <button id="clsSpeed" aria-label="Speed"></button>
      <button id="clsSubBtn" aria-pressed="false">Subtitles</button>
      <button id="clsPlay" class="cls-play" aria-label="Play">▶</button>
      <button id="clsZhBtn" aria-pressed="false">中文</button>
      <button id="clsAskBtn" aria-pressed="false">Ask</button>
      <button id="clsNext" aria-label="Next slide">››</button>
    </nav>
    <audio id="clsAudio" preload="auto"></audio>`;

  const $ = id => el.querySelector('#' + id);
  const audio = $('clsAudio');
  const src = p => BASE + p + '?v=' + AUDIO_V;
  const setPlaying = p => { playing = p; $('clsPlay').textContent = p ? '❚❚' : '▶'; $('clsPlay').setAttribute('aria-label', p ? 'Pause' : 'Play'); };
  const speedLabel = () => SPEEDS[speedIx].toFixed(2).replace(/0$/, '') + '×';
  $('clsSpeed').textContent = speedLabel();

  function texts() {
    const s = L.slides[i], a = answers[i] != null;
    if (s.kind === 'quiz') return [s.say + (a ? '\n\n' + s.explain : ''), (s.sayZh || '') + (a && s.explainZh ? '\n\n' + s.explainZh : '')];
    return [s.say, s.sayZh || ''];
  }
  function render() {
    const s = L.slides[i], st = $('clsStage');
    const head = `<div class="cls-meta"><span>${s.kind === 'quiz' ? 'Quick question' : 'Slide ' + (i + 1)}</span><span>${i + 1} / ${L.slides.length}</span></div>`;
    if (s.kind === 'quiz') {
      st.innerHTML = head + `<h2>${esc(s.q)}</h2><div class="cls-opts">` +
        s.options.map((o, k) => `<button class="cls-opt" data-k="${k}"><b>${'ABCD'[k]}</b><span>${esc(o)}</span></button>`).join('') +
        `</div><div id="clsQx"></div>`;
      st.querySelectorAll('.cls-opt').forEach(b => b.onclick = () => choose(+b.dataset.k));
      if (answers[i] != null) markQuiz(answers[i], false);
      else st.querySelector('#clsQx').innerHTML = `<p class="muted">Pick an answer and the teacher will explain.</p>`;
    } else {
      st.innerHTML = head + `<h2>${esc(s.title)}</h2><div class="cls-body">${s.body}</div>`;   // lesson HTML is our own content
    }
    const [en, zh] = texts(); $('clsTx').textContent = en; $('clsZh').textContent = zh;
    const pg = $('clsProg'); pg.innerHTML = '';
    L.slides.forEach((x, k) => {
      const b = document.createElement('button');
      b.setAttribute('aria-label', 'Slide ' + (k + 1));
      b.className = (k < i ? 'done' : k === i ? 'cur' : '') + (x.kind === 'quiz' ? ' q' : '');
      b.onclick = () => go(k, true);
      pg.append(b);
    });
    store.set(L.id + ':pos', i);
  }
  function markQuiz(k, speak) {
    const s = L.slides[i];
    $('clsStage').querySelectorAll('.cls-opt').forEach(b => {
      const kk = +b.dataset.k; b.disabled = true;
      if (kk === s.answer) b.classList.add('right'); else if (kk === k) b.classList.add('wrong');
    });
    $('clsStage').querySelector('#clsQx').innerHTML = `<p class="cls-explain"><b>${k === s.answer ? 'Correct! ' : 'Not quite. '}</b>${esc(s.explain)}</p>`;
    const [en, zh] = texts(); $('clsTx').textContent = en; $('clsZh').textContent = zh;
    if (speak) play(s.audioA);
  }
  function choose(k) { if (answers[i] != null) return; answers[i] = k; store.set(L.id + ':ans', answers); markQuiz(k, true); }
  function play(p) {
    clearTimeout(timer);
    audio.src = src(p); audio.playbackRate = SPEEDS[speedIx];
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
  const srcFor = s => s.kind === 'quiz' ? (answers[i] != null ? s.audioA : s.audioQ) : s.audio;
  function go(k, auto) {
    if (k < 0 || k >= L.slides.length) return;
    clearTimeout(timer); audio.pause();
    i = k; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    if (auto) play(srcFor(L.slides[i])); else setPlaying(false);
    const n = L.slides[i + 1]; if (n) { const pre = new Audio(); pre.preload = 'auto'; pre.src = src(n.audio || n.audioQ); }
  }
  audio.addEventListener('ended', () => {
    setPlaying(false);
    const s = L.slides[i];
    if (s.kind === 'quiz' && answers[i] == null) return;           // wait for the student's answer
    if (i < L.slides.length - 1) timer = setTimeout(() => go(i + 1, true), 1100);
    else store.set(L.id + ':done', true);
  });
  $('clsPlay').onclick = () => {
    if (playing) { audio.pause(); setPlaying(false); return; }
    if (!audio.src || audio.ended) { play(srcFor(L.slides[i])); return; }
    audio.play().then(() => setPlaying(true)).catch(() => {});
  };
  $('clsPrev').onclick = () => go(i - 1, true);
  $('clsNext').onclick = () => go(i + 1, true);
  $('clsSpeed').onclick = () => { speedIx = (speedIx + 1) % SPEEDS.length; audio.playbackRate = SPEEDS[speedIx]; $('clsSpeed').textContent = speedLabel(); store.set('speed', speedIx); };
  const toggle = (btn, panel, key) => { const on = $(panel).classList.contains('hidden'); $(panel).classList.toggle('hidden', !on); $(btn).setAttribute('aria-pressed', String(on)); store.set(key, on); };
  $('clsSubBtn').onclick = () => toggle('clsSubBtn', 'clsSubs', 'subs');
  $('clsZhBtn').onclick = () => toggle('clsZhBtn', 'clsZhP', 'zh');

  // ---- Ask the teacher ----
  let lastAnswer = '';
  $('clsAskBtn').onclick = () => {
    const on = $('clsAskP').classList.contains('hidden');
    $('clsAskP').classList.toggle('hidden', !on); $('clsAskBtn').setAttribute('aria-pressed', String(on));
    if (on) { audio.pause(); setPlaying(false); clearTimeout(timer); $('clsQ').focus(); $('clsAskP').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  };
  $('clsAskGo').onclick = async () => {
    const q = $('clsQ').value.trim(); if (!q) return;
    const s = L.slides[i];
    const tmp = document.createElement('div'); tmp.innerHTML = s.body || '';
    const slide = s.kind === 'quiz'
      ? `Quiz question: ${s.q}\nOptions: ${s.options.join(' / ')}\nExplanation: ${s.explain}`
      : `Slide title: ${s.title}\nSlide content: ${tmp.textContent.replace(/\s+/g, ' ').trim()}\nWhat the teacher said: ${s.say}`;
    $('clsAskGo').disabled = true; $('clsRead').classList.add('hidden'); $('clsAns').textContent = 'Thinking…';
    try {
      const r = await fetch(API + '/api/class/ask', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device': deviceId() },
        body: JSON.stringify({ lesson: `${L.book} — ${L.title}`, slide, question: q }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.detail || 'The teacher could not answer right now. Try again in a few minutes.');
      lastAnswer = d.answer; $('clsAns').textContent = d.answer;
      $('clsAskHint').textContent = `${d.left} questions left today.`;
      $('clsRead').classList.toggle('hidden', !('speechSynthesis' in window));
    } catch (e) {
      $('clsAns').textContent = '';
      $('clsAskHint').textContent = e.message === 'Failed to fetch' ? 'The teacher is waking up (the server sleeps when idle). Wait 30 seconds and tap Ask again.' : e.message;
    } finally { $('clsAskGo').disabled = false; }
  };
  $('clsRead').onclick = () => {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(lastAnswer); u.lang = 'en-US'; u.rate = 0.95; speechSynthesis.speak(u); } catch {}
  };

  function begin(fromStart) {
    $('clsStart').classList.add('hidden');
    ['clsProg', 'clsStage', 'clsBar'].forEach(id => $(id).classList.remove('hidden'));
    if (store.get('subs', false)) { $('clsSubs').classList.remove('hidden'); $('clsSubBtn').setAttribute('aria-pressed', 'true'); }
    if (store.get('zh', false)) { $('clsZhP').classList.remove('hidden'); $('clsZhBtn').setAttribute('aria-pressed', 'true'); }
    document.body.classList.add('cls-playing');
    go(fromStart ? 0 : store.get(L.id + ':pos', 0), true);
    try { navigator.wakeLock?.request('screen').catch(() => {}); } catch {}
  }
  $('clsGo').onclick = () => begin(true);
  const r = $('clsResume'); if (r) r.onclick = () => begin(false);
  live = { stop() { clearTimeout(timer); audio.pause(); document.body.classList.remove('cls-playing'); } };
}
