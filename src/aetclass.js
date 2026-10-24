// AET class lectures — spoken lessons (slides + narration + quick questions) behind the class password.
// Everything is AES-256-GCM encrypted: the lesson text in data/aet-class/vault.json and each narration
// clip as audio/*.bin (12-byte IV + ciphertext) in the aet-audio repo. The browser derives the key from the password
// (PBKDF2-SHA256) and decrypts in memory only; nothing readable is served. Built by D:\Claude\aet-class\tools\build_vault.py.
import { S, save, t, esc, ico } from './app.js?v=34';

const BASE = './data/aet-class/';
const KEY_LS = 'aetclassKey';
const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:8787' : 'https://bcprep-examiner.onrender.com';
const SPEEDS = [1.0, 1.15, 1.3, 0.9, 0.8];
const store = {
  get(k, d) { try { const v = localStorage.getItem('aetclass:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('aetclass:' + k, JSON.stringify(v)); } catch {} },
};
function deviceId() {
  if (!S.deviceId) { S.deviceId = Math.random().toString(36).slice(2) + Date.now().toString(36); save(); }
  return S.deviceId;
}

let DOC = null, KEY = null, vaultMeta = null, live = null;
const urls = new Map();   // decrypted narration, as object URLs, for this visit
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64e = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
window.addEventListener('hashchange', () => { if (live) { live.stop(); live = null; } });

/* ---------------- crypto ---------------- */
async function fetchVault() {
  if (vaultMeta) return vaultMeta;
  const r = await fetch(BASE + 'vault.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('vault ' + r.status);
  return (vaultMeta = await r.json());
}
async function deriveKey(pw, v) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: b64d(v.salt), iterations: v.iter },
    base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}
async function openVault(v, key) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(v.iv) }, key, b64d(v.ct));
  const text = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return JSON.parse(text);
}
function storedKey() { try { return JSON.parse(localStorage.getItem(KEY_LS) || 'null'); } catch { return null; } }
function forgetKey() { try { localStorage.removeItem(KEY_LS); } catch {} }
async function tryRemembered(v) {
  const s = storedKey();
  if (!s || s.salt !== v.salt) { if (s) forgetKey(); return false; }
  try {
    const key = await crypto.subtle.importKey('raw', b64d(s.key), 'AES-GCM', false, ['decrypt']);
    DOC = await openVault(v, key); KEY = key;
    return true;
  } catch { forgetKey(); return false; }
}
// Narration lives in the separate aet-audio Pages repo (same github.io origin; one Pages site is capped at 1 GB).
// '../aet-audio/' resolves to /aet-audio/ on github.io and to a sibling folder on a local server rooted above both repos.
const AUDIO_BASES = ['../aet-audio/audio/', BASE + 'audio/'];
async function audioURL(rel) {
  if (urls.has(rel)) return urls.get(rel);
  const name = rel.replace(/^audio\//, '').replace(/\.mp3$/, '.bin');
  let r = null;
  for (const b of AUDIO_BASES) { r = await fetch(b + name).catch(() => null); if (r && r.ok) break; }
  if (!r || !r.ok) throw new Error('audio ' + (r ? r.status : 'network'));
  const buf = new Uint8Array(await r.arrayBuffer());
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, KEY, buf.slice(12));
  const url = URL.createObjectURL(new Blob([plain], { type: 'audio/mpeg' }));
  urls.set(rel, url);
  return url;
}
function lock() {
  DOC = null; KEY = null; forgetKey();
  for (const u of urls.values()) URL.revokeObjectURL(u);
  urls.clear();
}

/* ---------------- entry ---------------- */
export async function renderAetClass(el, arg, params) {
  if (live) { live.stop(); live = null; }
  if (!window.crypto || !crypto.subtle || typeof DecompressionStream === 'undefined') {
    el.innerHTML = `<div class="card"><h2>${ico('lock')} ${t('Class lectures', '课堂讲课')}</h2>
      <p>${t('This browser cannot open the lectures. Use a current version of Chrome, Edge, Safari or Firefox.', '这个浏览器打不开，请用新版 Chrome、Edge、Safari 或 Firefox。')}</p></div>`;
    return;
  }
  let v;
  try { v = await fetchVault(); } catch {
    el.innerHTML = `<a class="back-link" href="#/aet">← AET</a><div class="card"><h2>${t('Class lectures', '课堂讲课')}</h2><p class="muted">${t('Lectures are deploying — check back shortly.', '课程部署中，稍后再来。')}</p></div>`;
    return;
  }
  if (!DOC) await tryRemembered(v);
  if (!DOC) { lockScreen(el, v, params); return; }
  if (params.l) {
    const meta = DOC.index.units.flatMap(u => u.lessons).find(l => l.id === params.l);
    if (meta && meta.ready && DOC.lessons[meta.id]) { await drawLesson(el, DOC.lessons[meta.id]); return; }
  }
  drawCourse(el);
}

function lockScreen(el, v, params) {
  el.innerHTML = `
    <a class="back-link" href="#/aet">← AET</a>
    <div class="card" style="max-width:520px;margin:0 auto">
      <h2 style="margin-top:0">${ico('lock')} ${t('Class lectures', '课堂讲课')}</h2>
      <p class="muted">${t('Spoken lessons that follow the AET PCP course weekend by weekend. Password-protected for the class.', '按 AET PCP 课程的周末顺序讲的语音课，班级专用，需要密码。')}</p>
      <form id="pwForm" autocomplete="off">
        <input id="pw" class="search-box" type="password" autocomplete="current-password" placeholder="${t('Password', '密码')}" style="width:100%;margin:8px 0" />
        <label class="tiny" style="display:flex;gap:8px;align-items:center;margin:6px 0 12px"><input type="checkbox" id="remember" /> ${t('Remember on this device', '在这台设备上记住')}</label>
        <div class="btn-row"><button class="btn" type="submit" id="unlock">${t('Unlock', '解锁')}</button></div>
        <p class="tiny" id="pwMsg" style="min-height:1.2em"></p>
      </form>
    </div>`;
  const pw = el.querySelector('#pw');
  pw.focus();
  el.querySelector('#pwForm').onsubmit = async e => {
    e.preventDefault();
    const msg = el.querySelector('#pwMsg'), btn = el.querySelector('#unlock');
    if (!pw.value) return;
    btn.disabled = true; msg.textContent = t('Checking…', '验证中…');
    try {
      let key = null;
      for (const cand of [...new Set([pw.value, pw.value.toUpperCase(), pw.value.toLowerCase()])]) {   // the class password is case-insensitive
        try { const k = await deriveKey(cand, v); DOC = await openVault(v, k); key = k; break; } catch {}
      }
      if (!key) throw new Error('wrong');
      KEY = key;
      if (el.querySelector('#remember').checked) {
        try { localStorage.setItem(KEY_LS, JSON.stringify({ salt: v.salt, key: b64e(await crypto.subtle.exportKey('raw', key)) })); } catch {}
      }
      renderAetClass(el, 'class', params);
    } catch {
      msg.textContent = t('Wrong password.', '密码不对。'); btn.disabled = false; pw.select();
    }
  };
}

/* ---------------- course list ---------------- */
function drawCourse(el) {
  const course = DOC.index;
  const all = course.units.flatMap(u => u.lessons);
  const ready = all.filter(l => l.ready).length;
  const done = all.filter(l => store.get(l.id + ':done', false)).length;
  // priority: "digest" = the weekend's overview lesson, "core" = must-listen, "deep" = the rest (nothing is dropped)
  const coreOnly = store.get('coreOnly', false);
  const isCore = l => l.priority === 'digest' || l.priority === 'core' || !l.priority;
  const mins = ls => Math.round(ls.filter(l => l.ready).reduce((s, l) => s + (l.minutes || 0), 0) / 6) / 10;
  const prTag = l => l.priority === 'digest' ? `<span class="cls-pr pr-digest">${t('Overview', '速览')}</span>`
    : l.priority === 'core' ? `<span class="cls-pr pr-core">${t('Core', '必听')}</span>`
    : l.priority === 'deep' ? `<span class="cls-pr pr-deep">${t('Deep dive', '深入')}</span>` : '';
  el.innerHTML = `
    <style>.cls-pr{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border-radius:9px;margin-right:6px;vertical-align:1px}
      .pr-digest{background:#2563eb;color:#fff}.pr-core{background:#16a34a;color:#fff}.pr-deep{background:transparent;color:var(--muted,#888);border:1px solid currentColor}
      .cls-filter{display:flex;gap:6px;margin-top:10px}.cls-filter .on{outline:2px solid currentColor}</style>
    <a class="back-link" href="#/aet">← AET</a>
    <div class="card cls-intro">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h2 style="margin:0">${ico('film')} ${esc(course.title)}</h2>
        <button class="btn ghost" id="lockBtn" style="margin-left:auto">${t('Lock', '锁定')}</button>
      </div>
      <p>Spoken lessons in English that follow the AET PCP program weekend by weekend: the week's online modules section by section, the assigned readings, the lab PPT topics and linked resources, the Wednesday cases and the lab skills — checked against the BCEHS clinical practice guidelines, with "module vs BCEHS vs the licensing exam" spelled out wherever they differ.</p>
      <p class="muted">${t('Tap 中文 inside a lesson to see the teacher\'s words in Chinese.', '课件和讲解都是英文；课内点「中文」可看老师这段话的中文翻译。')}</p>
      <div class="tiny">${ready} / ${all.length} ${t('lessons ready', '节已上线')} · ${done} ${t('finished', '节已学完')} · ${t('built', '更新')} ${esc(DOC.course.built || '')}</div>
      <p class="muted" style="margin:8px 0 0">${t('Fastest route: each weekend starts with an Overview lesson, then the Core lessons. Deep-dive lessons cover everything else the school teaches, so nothing is missed — use them when you have time or to check a topic.', '最快路线：每个周末先听「速览」，再听「必听」。「深入」课覆盖学校教的其余全部内容，保证不漏——有空再听，或用来查漏补缺。')}</p>
      <div class="cls-filter">
        <button class="btn ghost${coreOnly ? '' : ' on'}" data-filter="all">${t('All lessons', '全部课程')}</button>
        <button class="btn ghost${coreOnly ? ' on' : ''}" data-filter="core">${t('Overview + Core only', '只看速览 + 必听')}</button>
      </div>
    </div>
    ${course.units.map(u => {
      const shown = coreOnly ? u.lessons.filter(isCore) : u.lessons;
      if (!shown.length) return '';
      const coreMin = mins(u.lessons.filter(isCore)), allMin = mins(u.lessons);
      return `
      <div class="cls-unit">
        <h3>${esc(u.label)}</h3>
        <div class="tiny muted" style="margin:-4px 0 6px">${t('Core', '必听')} ${coreMin} h · ${t('all', '全部')} ${allMin} h${coreOnly && shown.length < u.lessons.length ? ` · ${u.lessons.length - shown.length} ${t('deep-dive lessons hidden', '节「深入」已隐藏')}` : ''}</div>
        <div class="list-wrap">
          ${shown.map(l => {
            const fin = store.get(l.id + ':done', false);
            const badge = !l.ready ? t('Soon', '待上线') : fin ? t('Done', '已学完') : t('Open', '上课');
            return `<button class="list-item cls-lesson${fin ? ' done' : ''}" ${l.ready ? `data-l="${l.id}"` : 'disabled'}>
              <span>${prTag(l)}${esc(l.title)}<div class="tiny">${l.ready ? l.minutes + ' min' : t('coming soon', '即将上线')}</div></span>
              <span class="tag-count">${badge}</span></button>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}`;
  el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { location.hash = '#/aet/class?l=' + b.dataset.l; });
  el.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { store.set('coreOnly', b.dataset.filter === 'core'); drawCourse(el); });
  el.querySelector('#lockBtn').onclick = () => { lock(); renderAetClass(el, 'class', {}); };
}

/* ---------------- lesson player ---------------- */
async function drawLesson(el, L) {
  const answers = store.get(L.id + ':ans', {});
  const quizzes = L.slides.filter(s => s.kind === 'quiz').length;
  let i = 0, playing = false, speedIx = store.get('speed', 0), timer = null, playToken = 0;

  el.innerHTML = `
    <a class="back-link" href="#/aet/class">← ${t('All lessons', '全部课程')}</a>
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
      <textarea id="clsQ" class="cls-q" rows="3" placeholder="e.g. When does the school want the 12-lead done? (中文也可以问)"></textarea>
      <div class="btn-row"><button class="btn" id="clsAskGo">Ask</button><button class="btn ghost hidden" id="clsRead">Read it to me</button></div>
      <div class="cls-tx" id="clsAns"></div>
      <div class="tiny" id="clsAskHint">The teacher answers about the slide you're on. On the licensing exam, the EMALB guidelines always win.</div>
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
      st.innerHTML = head + `<h2>${esc(s.title)}</h2><div class="cls-body">${s.body}</div>`;   // our own lesson HTML, decrypted
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
  async function play(p) {
    clearTimeout(timer);
    const token = ++playToken;
    let url;
    try { url = await audioURL(p); } catch { setPlaying(false); return; }
    if (token !== playToken) return;                       // the student moved on while this clip was decrypting
    audio.src = url; audio.playbackRate = SPEEDS[speedIx];
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
  const srcFor = s => s.kind === 'quiz' ? (answers[i] != null ? s.audioA : s.audioQ) : s.audio;
  function go(k, auto) {
    if (k < 0 || k >= L.slides.length) return;
    clearTimeout(timer); audio.pause();
    i = k; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    if (auto) play(srcFor(L.slides[i])); else setPlaying(false);
    const n = L.slides[i + 1]; if (n) audioURL(n.audio || n.audioQ).catch(() => {});   // decrypt the next clip early
  }
  audio.addEventListener('ended', () => {
    setPlaying(false);
    const s = L.slides[i];
    if (s.kind === 'quiz' && answers[i] == null) return;
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
  live = { stop() { clearTimeout(timer); audio.pause(); playToken++; document.body.classList.remove('cls-playing'); } };
}
