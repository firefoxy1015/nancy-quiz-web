// AET class lectures — spoken lessons (slides + narration + quick questions) behind the class password.
// Everything is AES-256-GCM encrypted: the lesson text in data/aet-class/vault.json and each narration
// clip as audio/*.bin (12-byte IV + ciphertext) in the aet-audio repo. The browser derives the key from the password
// (PBKDF2-SHA256) and decrypts in memory only; nothing readable is served. Built by D:\Claude\aet-class\tools\build_vault.py.
import { S, save, t, esc, ico } from './app.js?v=41';

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
async function decryptJSON(blob, key) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(blob.iv) }, key, b64d(blob.ct));
  const text = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return JSON.parse(text);
}
// v1 vaults hold the whole course; v2 vaults hold the head (course, index, cards) and the lesson text comes
// per weekend from vault-wNN.json, fetched on first use — so unlocking costs a few hundred KB, not the whole course.
async function openVault(v, key) {
  const doc = await decryptJSON(v, key);
  doc.lessons = doc.lessons || {};
  return doc;
}
const weeksLoaded = new Set();
const wkOfId = id => +((id.match(/^w(\d+)/) || [])[1] || 0);
async function loadWeek(wk) {
  if (!vaultMeta || vaultMeta.v < 2 || !wk || weeksLoaded.has(wk) || !KEY) return;
  const r = await fetch(BASE + 'vault-w' + String(wk).padStart(2, '0') + '.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('week ' + r.status);
  const part = await decryptJSON(await r.json(), KEY);
  Object.assign(DOC.lessons, part.lessons);
  weeksLoaded.add(wk);
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
// Narration lives in separate Pages repos (same github.io origin; one Pages site is capped at 1 GB):
// Weekends 1–8 in aet-audio, Weekend 9 onward in aet-audio2 (tools/build_vault.py splits them the same way).
// '../aet-audio/' resolves to /aet-audio/ on github.io and to a sibling folder on a local server rooted above the repos.
function audioBases(name) {
  const wk = +((name.match(/^w(\d+)-/) || [])[1] || 0);
  return [wk >= 9 ? '../aet-audio2/audio/' : '../aet-audio/audio/', BASE + 'audio/'];
}
async function audioURL(rel) {
  if (urls.has(rel)) return urls.get(rel);
  const name = rel.replace(/^audio\//, '').replace(/\.mp3$/, '.bin');
  let r = null;
  for (const b of audioBases(name)) { r = await fetch(b + name).catch(() => null); if (r && r.ok) break; }
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
  urls.clear(); weeksLoaded.clear();
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
  if (!DOC) {
    lockScreen(el, v, { back: '#/aet', backLabel: 'AET', title: t('Class lectures', '课堂讲课'),
      blurb: t('Spoken lessons that follow the AET PCP course weekend by weekend. Password-protected for the class.', '按 AET PCP 课程的周末顺序讲的语音课，班级专用，需要密码。'),
      done: () => renderAetClass(el, 'class', params) });
    return;
  }
  if (params.test) { await loadWeek(+params.test); drawTest(el, +params.test); return; }
  if (params.cards) { drawCards(el, +params.cards); return; }
  if (params.l) {
    const meta = DOC.index.units.flatMap(u => u.lessons).find(l => l.id === params.l);
    if (meta && meta.ready) await loadWeek(wkOfId(meta.id));
    if (meta && meta.ready && DOC.lessons[meta.id]) { await drawLesson(el, DOC.lessons[meta.id], params.auto === '1'); return; }
  }
  drawCourse(el);
}

// The whole AET section (the #/aet hub, its module drills, the lectures) sits behind the one class password.
// The lecture vault is the check: whatever opens it opens the section, so no second secret lives in the repo.
export async function aetUnlocked() {
  if (DOC) return true;
  try { return await tryRemembered(await fetchVault()); } catch { return false; }
}
export async function aetGate(el, done) {
  let v;
  try { v = await fetchVault(); } catch {
    el.innerHTML = `<a class="back-link" href="#/study">← ${t('Study library', '学习内容库')}</a><div class="card"><h2>${t('AET PCP Course', 'AET PCP 课程')}</h2><p class="muted">${t('Could not load — check back shortly.', '加载失败，请稍后再来。')}</p></div>`;
    return;
  }
  lockScreen(el, v, { back: '#/study', backLabel: t('Study library', '学习内容库'), title: t('AET PCP Course', 'AET PCP 课程'),
    blurb: t('Lectures, module practice and the class portal for the AET PCP class. Password-protected for the class.', 'AET PCP 班的讲课、模块练习和班级门户，班级专用，需要密码。'),
    done });
}

function lockScreen(el, v, o) {
  el.innerHTML = `
    <a class="back-link" href="${o.back}">← ${o.backLabel}</a>
    <div class="card" style="max-width:520px;margin:0 auto">
      <h2 style="margin-top:0">${ico('lock')} ${o.title}</h2>
      <p class="muted">${o.blurb}</p>
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
      o.done();
    } catch {
      msg.textContent = t('Wrong password.', '密码不对。'); btn.disabled = false; pw.select();
    }
  };
}

/* ---------------- course list ---------------- */
// priority: "digest" = the weekend's overview lesson, "core" = must-listen, "deep" = the rest (nothing is dropped)
const isCore = l => l.priority === 'digest' || l.priority === 'core' || !l.priority;
const wkOf = u => +((u.label.match(/Weekend (\d+)/) || [])[1] || 0);
const isReadingsUnit = u => /·\s*readings\s*$/.test(u.label);
const testOf = l => store.get('test:' + l.id, null);                                   // {r, n} from the weekend's test-first run
const mastered = l => { const r = testOf(l); return !!r && r.n > 0 && r.r === r.n; };
const filterMode = () => store.get('filter', store.get('coreOnly', false) ? 'core' : 'all');   // all | core | need
const isDone = l => store.get(l.id + ':done', false);
// Which lessons the current filter lists. "need" hides what is finished or tested as mastered; readings stay listed
// even when mastered, because the student's rule is to finish every reading first.
function shows(l, u) {
  const m = filterMode();
  if (m === 'core') return isCore(l);
  if (m === 'need') return !isDone(l) && (isReadingsUnit(u) || !mastered(l));
  return true;
}
function nextLessonId(id) {
  const seq = DOC.index.units.flatMap(u => u.lessons.filter(l => l.ready).map(l => ({ l, u })));
  const k = seq.findIndex(x => x.l.id === id);
  for (let j = k + 1; j < seq.length; j++) if (shows(seq[j].l, seq[j].u)) return seq[j].l.id;
  return null;
}
const quizzesOf = L => (L ? L.slides.filter(s => s.kind === 'quiz') : []);
const today = () => Math.floor(Date.now() / 864e5);
// flashcards: a Leitner box per card — box 1 every day, box 2 every 3 days, box 3 every week; new cards are due at once
const cardState = (wk, k) => store.get(`card:${wk}:${k}`, { box: 1, due: 0 });
const cardsDue = wk => ((DOC.cards || {})[wk] || []).filter((_, k) => cardState(wk, k).due <= today()).length;
const mins = ls => Math.round(ls.filter(l => l.ready).reduce((s, l) => s + (l.minutes || 0), 0) / 6) / 10;

function drawCourse(el) {
  const course = DOC.index;
  const all = course.units.flatMap(u => u.lessons);
  const ready = all.filter(l => l.ready).length;
  const done = all.filter(isDone).length;
  const mode = filterMode(), autoNext = store.get('autoNext', true);
  const prTag = l => l.priority === 'digest' ? `<span class="cls-pr pr-digest">${t('Overview', '速览')}</span>`
    : l.priority === 'core' ? `<span class="cls-pr pr-core">${t('Core', '必听')}</span>`
    : l.priority === 'deep' ? `<span class="cls-pr pr-deep">${t('Deep dive', '深入')}</span>` : '';
  const weekends = [...new Set(course.units.map(wkOf))];
  const wkHead = wk => {
    const units = course.units.filter(u => wkOf(u) === wk), ls = units.flatMap(u => u.lessons), rd = ls.filter(l => l.ready);
    const theme = (units[0].label.split('·')[1] || '').trim();
    const nQ = rd.reduce((s, l) => s + (l.nq ?? quizzesOf(DOC.lessons[l.id]).length), 0);
    const left = mins(units.flatMap(u => u.lessons.filter(l => shows(l, u) && !isDone(l))));
    const fin = rd.filter(isDone).length, due = cardsDue(wk), hasCards = !!((DOC.cards || {})[wk] || []).length;
    return `<div class="card cls-wk">
      <div class="cls-wk-row"><b>${t('Weekend', '周末')} ${wk}</b> · ${esc(theme)}
        <span class="tiny muted">${fin}/${rd.length} ${t('done', '已学完')} · ${t('left on your list', '还要听')} ${left} h</span></div>
      <div class="btn-row" style="margin-top:6px">
        ${nQ ? `<button class="btn ghost" data-test="${wk}">${t('Test first', '先测后听')} · ${nQ} ${t('questions', '题')} · ~${Math.round(nQ * 0.35)} min</button>` : ''}
        ${hasCards ? `<button class="btn ghost" data-cards="${wk}">${t('Flashcards', '闪卡')} · ${due} ${t('due', '待复习')}</button>` : ''}
      </div>
      <div class="tiny muted" style="margin-top:6px">${t('Suggested week: Mon–Tue the readings · Wed the modules, and the case lesson before the live case · Thu–Fri the lab lessons · then test again and clear your flashcards.',
        '建议节奏：周一二阅读课 · 周三模块课，直播案例前先听案例课 · 周四五实操课 · 然后再测一次、把闪卡清完。')}</div>
    </div>`;
  };
  el.innerHTML = `
    <style>.cls-pr{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border-radius:9px;margin-right:6px;vertical-align:1px}
      .pr-digest{background:#2563eb;color:#fff}.pr-core{background:#16a34a;color:#fff}.pr-deep{background:transparent;color:var(--muted,#888);border:1px solid currentColor}
      .cls-filter{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}.cls-filter .on{outline:2px solid currentColor}
      .cls-wk{margin-top:var(--s4,24px);padding:12px 16px}.cls-wk-row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
      .cls-lesson .mast{color:#16a34a;border-color:#16a34a}</style>
    <a class="back-link" href="#/aet">← AET</a>
    <div class="card cls-intro">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h2 style="margin:0">${ico('film')} ${esc(course.title)}</h2>
        <button class="btn ghost" id="lockBtn" style="margin-left:auto">${t('Lock', '锁定')}</button>
      </div>
      <p>Spoken lessons in English that follow the AET PCP program weekend by weekend: the week's online modules section by section, the assigned readings, the lab PPT topics and linked resources, the Wednesday cases and the lab skills — checked against the BCEHS clinical practice guidelines, with "module vs BCEHS vs the licensing exam" spelled out wherever they differ.</p>
      <p class="muted">${t('Subtitles show the teacher\'s words in English with the Chinese right underneath.', '课件和讲解都是英文；字幕同时显示英文和中文翻译。')}</p>
      <div class="tiny">${ready} / ${all.length} ${t('lessons ready', '节已上线')} · ${done} ${t('finished', '节已学完')} · ${t('built', '更新')} ${esc(DOC.course.built || '')}</div>
      <p class="muted" style="margin:8px 0 0">${t('Order each weekend: the Overview, then all the readings (required), then the online modules, then the lab and case lessons. To save time: tap "Test first" — the weekend\'s quiz questions, about 20 minutes — and the list then shows which lessons you can skip, skim or must hear. Lessons auto-continue to the next one, so a weekend can play like a podcast; the flashcards hold the numbers and rules to keep in your head.',
        '每个周末的顺序：先听「速览」，再把阅读课全部听完（必修），然后线上模块，最后实操和案例。省时间：点「先测后听」——做完这周所有随堂题（约 20 分钟），列表就会标出哪些课可以跳过、快听、必听。课会自动连播，一个周末可以像播客一样连着听；「闪卡」装的是要记住的数字和规则。')}</p>
      <div class="cls-filter">
        <button class="btn ghost${mode === 'all' ? ' on' : ''}" data-filter="all">${t('All lessons', '全部课程')}</button>
        <button class="btn ghost${mode === 'core' ? ' on' : ''}" data-filter="core">${t('Overview + Core only', '只看速览 + 必听')}</button>
        <button class="btn ghost${mode === 'need' ? ' on' : ''}" data-filter="need">${t('Only what I still need', '只看还没学会的')}</button>
        <button class="btn ghost" id="autoBtn" style="margin-left:auto">${t('Auto-continue', '自动连播')}: ${autoNext ? t('on', '开') : t('off', '关')}</button>
      </div>
    </div>
    ${weekends.map(wk => wkHead(wk) + course.units.filter(u => wkOf(u) === wk).map(u => {
      const shown = u.lessons.filter(l => shows(l, u));
      if (!shown.length) return '';
      const coreMin = mins(u.lessons.filter(isCore)), allMin = mins(u.lessons), hidden = u.lessons.length - shown.length;
      return `
      <div class="cls-unit">
        <h3>${esc(u.label)}</h3>
        <div class="tiny muted" style="margin:-4px 0 6px">${t('Core', '必听')} ${coreMin} h · ${t('all', '全部')} ${allMin} h${hidden ? ` · ${hidden} ${t('hidden by the filter', '节已按筛选隐藏')}` : ''}</div>
        <div class="list-wrap">
          ${shown.map(l => {
            const fin = isDone(l), r = testOf(l);
            const badge = !l.ready ? t('Soon', '待上线') : fin ? t('Done', '已学完') : mastered(l) ? t('Mastered', '已掌握') : t('Open', '上课');
            const tested = r && !fin ? `<span class="tiny"> · ${t('test', '测验')} ${r.r}/${r.n}${r.r === r.n ? (isReadingsUnit(u) ? ' · ' + t('reading: still on your list', '阅读课仍需听完') : ' · ' + t('skip or skim', '可跳过或快听')) : r.r ? ' · ' + t('skim at 1.3×', '可 1.3 倍速快听') : ' · ' + t('listen', '必听')}</span>` : '';
            return `<button class="list-item cls-lesson${fin ? ' done' : ''}" ${l.ready ? `data-l="${l.id}"` : 'disabled'}>
              <span>${prTag(l)}${esc(l.title)}<div class="tiny">${l.ready ? l.minutes + ' min' : t('coming soon', '即将上线')}${tested}</div></span>
              <span class="tag-count${mastered(l) && !fin ? ' mast' : ''}">${badge}</span></button>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')).join('')}`;
  el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { location.hash = '#/aet/class?l=' + b.dataset.l; });
  el.querySelectorAll('[data-test]').forEach(b => b.onclick = () => { location.hash = '#/aet/class?test=' + b.dataset.test; });
  el.querySelectorAll('[data-cards]').forEach(b => b.onclick = () => { location.hash = '#/aet/class?cards=' + b.dataset.cards; });
  el.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { store.set('filter', b.dataset.filter); drawCourse(el); });
  el.querySelector('#autoBtn').onclick = () => { store.set('autoNext', !store.get('autoNext', true)); drawCourse(el); };
  el.querySelector('#lockBtn').onclick = () => { lock(); renderAetClass(el, 'class', {}); };
}

/* ---------------- test first: the weekend's own quiz questions, then a skip / skim / listen verdict per lesson ---------------- */
function drawTest(el, wk) {
  const units = DOC.index.units.filter(u => wkOf(u) === wk);
  const items = [];
  for (const u of units) for (const l of u.lessons.filter(l => l.ready)) {
    const qs = quizzesOf(DOC.lessons[l.id]);
    qs.forEach((s, k) => items.push({ lid: l.id, title: l.title, reading: isReadingsUnit(u), last: k === qs.length - 1, n: qs.length, s }));
  }
  if (!items.length) { location.hash = '#/aet/class'; return; }
  const key = 'testrun:' + wk;
  let run = store.get(key, { i: 0, got: {} });          // got[lid] = right answers so far in this run
  const $ = id => el.querySelector('#' + id);

  function finish() {
    const rows = [];
    for (const u of units) for (const l of u.lessons.filter(l => l.ready)) {
      const n = quizzesOf(DOC.lessons[l.id]).length, r = run.got[l.id] || 0;
      if (n) rows.push({ l, u, r, n });
    }
    const grp = (f, label, hint) => {
      const xs = rows.filter(f); if (!xs.length) return '';
      return `<h3>${label} <span class="tiny muted">(${xs.length})</span></h3><p class="tiny muted">${hint}</p><div class="list-wrap">` +
        xs.map(x => `<button class="list-item" data-l="${x.l.id}"><span>${esc(x.l.title)}<div class="tiny">${x.r}/${x.n} · ${x.l.minutes} min</div></span><span class="tag-count">${t('Open', '上课')}</span></button>`).join('') + `</div>`;
    };
    const listen = rows.filter(x => x.r === 0), skim = rows.filter(x => x.r > 0 && x.r < x.n), skip = rows.filter(x => x.r === x.n);
    const minutes = listen.reduce((s, x) => s + x.l.minutes, 0) + Math.round(skim.reduce((s, x) => s + x.l.minutes, 0) / 1.3) + skip.filter(x => isReadingsUnit(x.u)).reduce((s, x) => s + x.l.minutes, 0);
    el.innerHTML = `<a class="back-link" href="#/aet/class">← ${t('All lessons', '全部课程')}</a>
      <div class="card"><h2>${t('Weekend', '周末')} ${wk} · ${t('your listening plan', '你的听课计划')}</h2>
      <p class="muted">${t('From the test:', '按测验结果：')} ${listen.length} ${t('to listen', '节必听')}, ${skim.length} ${t('to skim', '节快听')}, ${skip.length} ${t('mastered', '节已掌握')} · ${t('about', '大约')} ${Math.round(minutes / 6) / 10} h ${t('instead of', '而不是')} ${mins(rows.map(x => x.l))} h.
      ${t('Mastered readings stay on your list (your rule: finish every reading); mastered module and lab lessons can be skipped.', '已掌握的阅读课仍留在清单里（你的规则：阅读课全部听完）；已掌握的模块和实操课可以跳过。')}</p>
      <div class="btn-row"><button class="btn" id="needBtn">${t('Show only what I still need', '只看还没学会的')}</button><button class="btn ghost" id="retake">${t('Retake the test', '重测')}</button></div></div>
      <div class="card">${grp(x => x.r === 0, t('Listen', '必听'), t('Both questions missed: hear the whole lesson.', '两题都错：整课听。'))}
      ${grp(x => x.r > 0 && x.r < x.n, t('Skim', '快听'), t('One missed: play it at 1.3× and watch for the point you missed.', '错一题：1.3 倍速听，注意错的那一点。'))}
      ${grp(x => x.r === x.n, t('Mastered', '已掌握'), t('All right: skip, or keep for revision.', '全对：可以跳过，或留作复习。'))}</div>`;
    el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { location.hash = '#/aet/class?l=' + b.dataset.l; });
    $('needBtn').onclick = () => { store.set('filter', 'need'); location.hash = '#/aet/class'; };
    $('retake').onclick = () => { rows.forEach(x => store.set('test:' + x.l.id, null)); store.set(key, null); drawTest(el, wk); };
  }
  function show() {
    if (run.i >= items.length) { finish(); return; }
    const it = items[run.i], s = it.s;
    el.innerHTML = `<a class="back-link" href="#/aet/class">← ${t('All lessons', '全部课程')}</a>
      <div class="card cls-stage"><div class="cls-meta"><span>${t('Weekend', '周末')} ${wk} · ${t('test first', '先测后听')}</span><span>${run.i + 1} / ${items.length}</span></div>
      <div class="tiny muted">${esc(it.title)}</div>
      <h2>${esc(s.q)}</h2><div class="cls-opts">${s.options.map((o, k) => `<button class="cls-opt" data-k="${k}"><b>${'ABCD'[k]}</b><span>${esc(o)}</span></button>`).join('')}</div>
      <div id="tq"><p class="muted">${t('Tap an answer.', '点选答案。')}</p></div></div>`;
    el.querySelectorAll('.cls-opt').forEach(b => b.onclick = () => {
      const k = +b.dataset.k, right = k === s.answer;
      el.querySelectorAll('.cls-opt').forEach(x => { const kk = +x.dataset.k; x.disabled = true; if (kk === s.answer) x.classList.add('right'); else if (kk === k) x.classList.add('wrong'); });
      run.got[it.lid] = (run.got[it.lid] || 0) + (right ? 1 : 0);
      if (it.last) store.set('test:' + it.lid, { r: run.got[it.lid], n: it.n });
      run.i++; store.set(key, run);
      $('tq').innerHTML = `<p class="cls-explain"><b>${right ? t('Correct! ', '对！') : t('Not quite. ', '不对。')}</b>${esc(s.explain)}${s.explainZh ? `<br><span class="cls-zh">${esc(s.explainZh)}</span>` : ''}</p>
        <div class="btn-row"><button class="btn" id="nextQ">${run.i >= items.length ? t('See my plan', '看我的计划') : t('Next question', '下一题')}</button></div>`;
      $('nextQ').onclick = show; $('nextQ').focus();
    });
  }
  show();
}

/* ---------------- flashcards: the weekend's numbers and rules, Leitner boxes, a few minutes a day ---------------- */
function drawCards(el, wk) {
  const deck = (DOC.cards || {})[wk] || [];
  const $ = id => el.querySelector('#' + id);
  if (!deck.length) {
    el.innerHTML = `<a class="back-link" href="#/aet/class">← ${t('All lessons', '全部课程')}</a><div class="card"><h2>${t('Flashcards', '闪卡')} · ${t('Weekend', '周末')} ${wk}</h2><p class="muted">${t('Being prepared.', '制作中。')}</p></div>`;
    return;
  }
  let all = store.get('cardsAll:' + wk, false);
  function queue() { return deck.map((c, k) => ({ c, k })).filter(x => all || cardState(wk, x.k).due <= today()); }
  function show() {
    const q = queue();
    if (!q.length) {
      el.innerHTML = `<a class="back-link" href="#/aet/class">← ${t('All lessons', '全部课程')}</a><div class="card"><h2>${t('Flashcards', '闪卡')} · ${t('Weekend', '周末')} ${wk}</h2>
        <p class="muted">${t('Nothing due today. Cards come back after 1, 3 or 7 days depending on how well you knew them.', '今天没有要复习的卡。按掌握程度，卡会在 1、3 或 7 天后再出现。')}</p>
        <div class="btn-row"><button class="btn ghost" id="allBtn">${t('Go through all', '全部过一遍')} (${deck.length})</button></div></div>`;
      $('allBtn').onclick = () => { all = true; store.set('cardsAll:' + wk, true); show(); };
      return;
    }
    const { c, k } = q[0], st = cardState(wk, k);
    el.innerHTML = `<a class="back-link" href="#/aet/class">← ${t('All lessons', '全部课程')}</a>
      <div class="card cls-stage"><div class="cls-meta"><span>${t('Flashcards', '闪卡')} · ${t('Weekend', '周末')} ${wk}</span><span>${q.length} ${t('left', '张待复习')} · ${t('box', '盒')} ${st.box}</span></div>
      <h2>${esc(c.q)}</h2>${c.qZh ? `<p class="cls-zh muted">${esc(c.qZh)}</p>` : ''}
      <div id="ans" class="hidden"><div class="cls-body cls-card-a"><p><b>${esc(c.a)}</b></p>${c.aZh ? `<p class="cls-zh">${esc(c.aZh)}</p>` : ''}${c.src ? `<p class="tiny muted">${t('Source', '来源')}: ${esc(c.src)}</p>` : ''}</div>
        <div class="btn-row"><button class="btn" id="knew">${t('Knew it', '记得')}</button><button class="btn ghost" id="missed">${t("Didn't", '没记住')}</button></div></div>
      <div class="btn-row" id="rev"><button class="btn" id="flip">${t('Show answer', '看答案')}</button>${all ? '' : `<button class="btn ghost" id="allBtn">${t('All cards', '全部卡')}</button>`}</div></div>`;
    $('flip').onclick = () => { $('ans').classList.remove('hidden'); $('rev').classList.add('hidden'); };
    const allB = $('allBtn'); if (allB) allB.onclick = () => { all = true; store.set('cardsAll:' + wk, true); show(); };
    $('knew').onclick = () => { const box = Math.min(3, st.box + 1); store.set(`card:${wk}:${k}`, { box, due: today() + [0, 1, 3, 7][box] }); show(); };
    $('missed').onclick = () => { store.set(`card:${wk}:${k}`, { box: 1, due: today() + 1 }); show(); };
  }
  if (all && !queue().length) { all = false; store.set('cardsAll:' + wk, false); }
  show();
}

/* ---------------- lesson player ---------------- */
// The school's own videos, articles and module pages a lesson teaches from (lesson.links / slide.links):
// {label, url, kind: video | article | module | page, note?}. Module pages open in the student's own Moodle / AET University login.
function linksHtml(list) {
  const KIND = { video: t('Video', '视频'), article: t('Article', '文章'), module: t('School module', '学校模块'), page: t('Page', '网页') };
  return `<ul class="cls-links">` + list.map(x =>
    `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a> <span class="tiny muted">${KIND[x.kind] || ''}${x.note ? ' · ' + esc(x.note) : ''}</span></li>`).join('') + `</ul>`;
}

async function drawLesson(el, L, autoStart) {
  const answers = store.get(L.id + ':ans', {});
  const links = L.links || [];
  const linksHead = t('From the school: videos, articles and modules', '学校的视频、文章和模块');
  const quizzes = L.slides.filter(s => s.kind === 'quiz').length;
  let i = 0, playing = false, speedIx = store.get('speed', 0), timer = null, playToken = 0;

  el.innerHTML = `
    <a class="back-link" href="#/aet/class">← ${t('All lessons', '全部课程')}</a>
    <section class="card cls-start" id="clsStart">
      <div class="cls-kicker">${esc(L.book)}</div>
      <h2>${esc(L.title)}</h2>
      <ul class="muted"><li>Spoken lesson, about ${L.minutes} minutes, ${L.slides.length} slides</li><li>${quizzes} quick questions along the way</li><li>${t('Subtitles show English with Chinese underneath; tap the 字幕 button to switch.', '字幕默认英文+中文对照；点「字幕」按钮可切换。')}</li></ul>
      <div class="btn-row"><button class="btn" id="clsGo">Start class</button>
        ${store.get(L.id + ':pos', 0) > 0 ? `<button class="btn ghost" id="clsResume">Continue where I left off</button>` : ''}</div>
      ${links.length ? `<h4>${linksHead}</h4>` + linksHtml(links) : ''}
    </section>
    <div class="cls-progress hidden" id="clsProg"></div>
    <section class="card cls-stage hidden" id="clsStage" aria-live="polite"></section>
    <section class="card cls-panel hidden" id="clsSubs"><div class="cls-tx" id="clsTx"></div><div class="cls-tx cls-zh" id="clsZh" style="margin-top:10px"></div></section>
    ${links.length ? `<details class="card cls-panel hidden" id="clsLinksP"><summary>${linksHead} (${links.length})</summary>${linksHtml(links)}</details>` : ''}
    <section class="card cls-panel hidden" id="clsAskP"><h4>Ask the teacher</h4>
      <textarea id="clsQ" class="cls-q" rows="3" placeholder="e.g. When does the school want the 12-lead done? (中文也可以问)"></textarea>
      <div class="btn-row"><button class="btn" id="clsAskGo">Ask</button><button class="btn ghost hidden" id="clsRead">Read it to me</button></div>
      <div class="cls-tx" id="clsAns"></div>
      <div class="tiny" id="clsAskHint">The teacher answers about the slide you're on. On the licensing exam, the EMALB guidelines always win.</div>
    </section>
    <nav class="cls-bar hidden" id="clsBar">
      <button id="clsPrev" aria-label="Previous slide">‹‹</button>
      <button id="clsSpeed" aria-label="Speed"></button>
      <button id="clsSubBtn" aria-label="Subtitles"></button>
      <button id="clsPlay" class="cls-play" aria-label="Play">▶</button>
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
      // qZh / optionsZh: the Chinese line under the question and each option, when the lesson has them
      st.innerHTML = head + `<h2>${esc(s.q)}</h2>${s.qZh ? `<p class="cls-zh muted">${esc(s.qZh)}</p>` : ''}<div class="cls-opts">` +
        s.options.map((o, k) => `<button class="cls-opt" data-k="${k}"><b>${'ABCD'[k]}</b><span>${esc(o)}${s.optionsZh && s.optionsZh[k] ? `<br><span class="cls-zh muted">${esc(s.optionsZh[k])}</span>` : ''}</span></button>`).join('') +
        `</div><div id="clsQx"></div>`;
      st.querySelectorAll('.cls-opt').forEach(b => b.onclick = () => choose(+b.dataset.k));
      if (answers[i] != null) markQuiz(answers[i], false);
      else st.querySelector('#clsQx').innerHTML = `<p class="muted">Pick an answer and the teacher will explain.</p>`;
    } else {
      st.innerHTML = head + `<h2>${esc(s.title)}</h2><div class="cls-body">${s.body}</div>` +   // our own lesson HTML, decrypted
        (s.bodyZh ? `<div class="cls-body-zh">${esc(s.bodyZh)}</div>` : '') +                   // the slide's Chinese summary line
        (s.links && s.links.length ? linksHtml(s.links) : '');
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
    else {
      store.set(L.id + ':done', true);
      // auto-continue: the next lesson the current filter lists, so a weekend plays through like a podcast
      const nx = store.get('autoNext', true) ? nextLessonId(L.id) : null;
      if (nx) timer = setTimeout(() => { location.hash = '#/aet/class?l=' + nx + '&auto=1'; }, 1800);
    }
  });
  $('clsPlay').onclick = () => {
    if (playing) { audio.pause(); setPlaying(false); return; }
    if (!audio.src || audio.ended) { play(srcFor(L.slides[i])); return; }
    audio.play().then(() => setPlaying(true)).catch(() => {});
  };
  $('clsPrev').onclick = () => go(i - 1, true);
  $('clsNext').onclick = () => go(i + 1, true);
  $('clsSpeed').onclick = () => { speedIx = (speedIx + 1) % SPEEDS.length; audio.playbackRate = SPEEDS[speedIx]; $('clsSpeed').textContent = speedLabel(); store.set('speed', speedIx); };
  // subtitles: English with the Chinese right under it by default; one button cycles 中英 → EN → 中文 → off
  const SUB_MODES = ['both', 'en', 'zh', 'off'];
  const SUB_LABEL = { both: '字幕 EN+中', en: '字幕 EN', zh: '字幕 中文', off: '字幕 关' };
  const applySub = () => {
    const m = store.get('subMode', 'both');
    $('clsSubs').classList.toggle('hidden', m === 'off');
    $('clsTx').classList.toggle('hidden', m === 'zh');
    $('clsZh').classList.toggle('hidden', m === 'en');
    $('clsSubBtn').textContent = SUB_LABEL[m]; $('clsSubBtn').setAttribute('aria-pressed', String(m !== 'off'));
  };
  $('clsSubBtn').onclick = () => { const m = store.get('subMode', 'both'); store.set('subMode', SUB_MODES[(SUB_MODES.indexOf(m) + 1) % SUB_MODES.length]); applySub(); };

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
    ['clsProg', 'clsStage', 'clsBar', 'clsLinksP'].forEach(id => $(id)?.classList.remove('hidden'));
    applySub();
    document.body.classList.add('cls-playing');
    go(fromStart ? 0 : store.get(L.id + ':pos', 0), true);
    try { navigator.wakeLock?.request('screen').catch(() => {}); } catch {}
  }
  $('clsGo').onclick = () => begin(true);
  const r = $('clsResume'); if (r) r.onclick = () => begin(false);
  live = { stop() { clearTimeout(timer); audio.pause(); playToken++; document.body.classList.remove('cls-playing'); } };
  if (autoStart) begin(true);
}
