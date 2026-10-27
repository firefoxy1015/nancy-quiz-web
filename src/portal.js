// Class portal — course material for one class, behind a password.
// data/portal/vault.json is AES-256-GCM ciphertext (key = PBKDF2-SHA256 of the
// password); it is built outside this repo, so the plain text never lands here.
// The browser derives the key, decrypts and gunzips in memory only.
// The vault carries the English text plus an English -> Chinese table (DOC.zh),
// so every view follows the site's EN / 中文 / EN+中 switch.
import { t, bi, esc, ico } from './app.js?v=51';

const VAULT = './data/portal/vault.json';
const KEY_LS = 'bcprepPortalKey';
const PROG_LS = 'bcprepPortalQuiz';
let DOC = null;
let vaultMeta = null;
let run = null;

const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64e = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));

/* ---------------- language ---------------- */
const Z = s => (s && DOC && DOC.zh && DOC.zh[s]) || s;   // Chinese for an English string
const L = (s, tag = 'div') => (s ? bi(s, Z(s), tag) : '');  // block text
const T = s => esc(t(s, Z(s)));                           // short inline label

async function fetchVault() {
  if (vaultMeta) return vaultMeta;
  const r = await fetch(VAULT, { cache: 'no-cache' });
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
function forgetKey() { try { localStorage.removeItem(KEY_LS); } catch { /* storage blocked */ } }

async function tryRemembered(v) {
  const s = storedKey();
  if (!s || s.salt !== v.salt) { if (s) forgetKey(); return false; }
  try {
    const key = await crypto.subtle.importKey('raw', b64d(s.key), 'AES-GCM', false, ['decrypt']);
    DOC = await openVault(v, key);
    return true;
  } catch { forgetKey(); return false; }
}

/* ---------------- progress ---------------- */
function prog() {
  try { return Object.assign({ st: {}, wrong: {} }, JSON.parse(localStorage.getItem(PROG_LS) || '{}')); }
  catch { return { st: {}, wrong: {} }; }
}
function saveProg(p) { try { localStorage.setItem(PROG_LS, JSON.stringify(p)); } catch { /* storage blocked */ } }

/* ---------------- entry ---------------- */
export async function renderPortal(el, arg, params) {
  if (!window.crypto || !crypto.subtle || typeof DecompressionStream === 'undefined') {
    el.innerHTML = `<div class="card"><h2>${ico('lock')} ${t('Class portal', '班级门户')}</h2>
      <p>${t('This browser cannot open the portal. Use a current version of Chrome, Edge, Safari or Firefox.',
             '这个浏览器打不开门户，请用新版 Chrome、Edge、Safari 或 Firefox。')}</p></div>`;
    return;
  }
  let v;
  try { v = await fetchVault(); } catch (e) {
    el.innerHTML = `<div class="card"><h2>${t('Class portal', '班级门户')}</h2><p class="muted">${t('Could not load the portal.', '门户加载失败。')}</p></div>`;
    return;
  }
  if (!DOC) await tryRemembered(v);
  if (!DOC) { lockScreen(el, v, arg, params); return; }
  const sec = arg || 'home';
  const views = { home: viewHome, weeks: viewWeeks, quiz: viewQuiz, meds: viewMeds, glossary: viewGlossary, exam: viewExam };
  (views[sec] || viewHome)(el, params);
}

function lockScreen(el, v, arg, params) {
  el.innerHTML = `
    <div class="card" style="max-width:520px;margin:0 auto">
      <h2 style="margin-top:0">${ico('lock')} ${t('Class portal', '班级门户')}</h2>
      <p class="muted">${t('Password-protected area for the AET PCP class.', 'AET PCP 班级专用，需要密码。')}</p>
      <form id="pwForm" autocomplete="off">
        <input id="pw" class="search-box" type="password" autocomplete="current-password"
          placeholder="${t('Password', '密码')}" style="width:100%;margin:8px 0" />
        <label class="tiny" style="display:flex;gap:8px;align-items:center;margin:6px 0 12px">
          <input type="checkbox" id="remember" /> ${t('Remember on this device', '在这台设备上记住')}
        </label>
        <div class="btn-row"><button class="btn" type="submit" id="unlock">${t('Unlock', '解锁')}</button></div>
        <p class="tiny" id="pwMsg" style="min-height:1.2em"></p>
      </form>
    </div>`;
  const pw = el.querySelector('#pw');
  pw.focus();
  el.querySelector('#pwForm').onsubmit = async e => {
    e.preventDefault();
    const msg = el.querySelector('#pwMsg');
    const btn = el.querySelector('#unlock');
    if (!pw.value) return;
    btn.disabled = true;
    msg.textContent = t('Checking…', '验证中…');
    try {
      const key = await deriveKey(pw.value.trim().toLowerCase(), v);  // password is case-insensitive
      DOC = await openVault(v, key);
      if (el.querySelector('#remember').checked) {
        try { localStorage.setItem(KEY_LS, JSON.stringify({ salt: v.salt, key: b64e(await crypto.subtle.exportKey('raw', key)) })); }
        catch { /* storage blocked: unlocked for this visit only */ }
      }
      renderPortal(el, arg, params);
    } catch {
      msg.textContent = t('Wrong password.', '密码不对。');
      btn.disabled = false;
      pw.select();
    }
  };
}

/* ---------------- shell ---------------- */
const TABS = [
  ['home', 'Overview', '概览'], ['weeks', 'Schedule', '课程表'], ['quiz', 'Quiz bank', '题库'],
  ['meds', 'Medications', '药物'], ['glossary', 'Glossary', '术语表'], ['exam', 'School vs exam', '课堂与考试差异'],
];
function shell(active, body) {
  return `
    <div class="card" style="padding-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h2 style="margin:0">${ico('lock')} ${t('Class portal', '班级门户')}</h2>
        <button class="btn ghost" id="lockBtn" style="margin-left:auto">${t('Lock', '锁定')}</button>
      </div>
      <p class="tiny muted" style="margin:6px 0 0">${esc(DOC.course.name)}</p>
      <nav class="sec-toc">${TABS.map(([id, en, zh]) =>
        `<a href="#/portal/${id}" style="${id === active ? 'border-color:var(--accent);color:var(--accent);font-weight:700' : ''}">${t(en, zh)}</a>`).join('')}</nav>
    </div>
    ${body}`;
}
function bindShell(el) {
  const b = el.querySelector('#lockBtn');
  if (b) b.onclick = () => {
    DOC = null; run = null; forgetKey();
    if (location.hash === '#/portal') renderPortal(el, null, {}); else location.hash = '#/portal';
  };
}

/* ---------------- overview ---------------- */
function viewHome(el) {
  const nQ = DOC.modules.reduce((a, m) => a + m.q.length, 0);
  el.innerHTML = shell('home', `
    <div class="card">
      <div class="stat-row">
        <div class="stat"><b>${DOC.weeks.length}</b><span>${t('weekends', '个周末')}</span></div>
        <div class="stat"><b>${DOC.modules.length}</b><span>${t('online modules', '门线上模块')}</span></div>
        <div class="stat"><b>${nQ}</b><span>${t('module quiz questions', '道随堂测验题')}</span></div>
        <div class="stat"><b>${DOC.glossary.length}</b><span>${t('glossary terms', '条术语')}</span></div>
      </div>
      <div style="margin-top:14px">${L(DOC.course.format)}</div>
      <div class="tiny muted" style="white-space:pre-line;margin-top:10px">${L(DOC.course.hub)}</div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">${t('How the course runs', '课程怎么上')}</h3>
      <table class="hard-table">${DOC.frameworks.map(([k, v]) =>
        `<tr><th style="white-space:normal;width:32%">${L(k)}</th><td>${L(v)}</td></tr>`).join('')}</table>
    </div>
    <div class="notice">${t('The course teaches BCEHS practice. Where that differs from the EMALB licensing exam, the exam follows the BC Provincial Examination Guidelines — see "School vs exam".',
      '课程教的是 BCEHS 实际做法；和 EMALB 执照考试不一样的地方，考试按 BC 考纲——见「课堂与考试差异」。')}</div>`);
  bindShell(el);
}

/* ---------------- schedule ---------------- */
function viewWeeks(el, params) {
  const open = Number(params.w || 0);
  el.innerHTML = shell('weeks', DOC.weeks.map(w => {
    const c = w.case;
    return `
    <details class="acc" id="w${w.n}" ${w.n === open ? 'open' : ''}>
      <summary><span class="tag-count" style="margin:0 10px 0 0">W${w.n}</span>
        <span>${L(w.title, 'span')}${w.date ? `<span class="tiny muted">${T(w.date)}</span>` : ''}</span></summary>
      <div class="acc-body">
        ${w.prior ? `<p style="margin-bottom:4px"><b>${t('Before class', '课前')}</b></p>${L(w.prior)}` : ''}
        ${w.inClass ? `<p style="margin-bottom:4px"><b>${t('In class', '课上')}</b></p>${L(w.inClass)}` : ''}
        ${w.modules.length ? `<p><b>${t('Online modules', '线上模块')}:</b> ${w.modules.map(m =>
          `<a class="pill gray" style="text-decoration:none;margin:0 4px 4px 0;display:inline-block" href="#/portal/quiz?m=${encodeURIComponent(m)}">${esc(m)}</a>`).join('')}</p>` : ''}
        ${c ? `
          <h4 style="margin:14px 0 6px">${t('Wednesday live case study', '周三线上案例')}</h4>
          ${L(c.title)}
          <div class="tiny muted" style="margin:2px 0 8px">${L(c.when)}</div>
          ${c.cases.map(k => `
            <div class="sc-info" style="margin-bottom:8px">
              <div class="sc-label">${T(k.name)}</div>
              ${L(k.presentation)}
              ${k.tieIns ? `<div class="tiny muted" style="margin-top:4px"><b>${t('Tie-ins', '关联知识')}</b>${L(k.tieIns)}</div>` : ''}
              <ul style="margin:6px 0 0 18px">${k.complications.map(x => `<li>${L(x)}</li>`).join('')}</ul>
            </div>`).join('')}
          ${c.focus ? `<p style="margin-bottom:4px"><b>${t('Weekend focus', '周末重点')}</b></p>${L(c.focus)}` : ''}` : ''}
        ${w.sessions.length ? `<div class="tiny" style="margin-top:10px">${w.sessions.map(s =>
          `<div style="margin-bottom:6px"><b>${L(s.name, 'span')}</b>${L(s.desc)}</div>`).join('')}</div>` : ''}
        ${w.folders.length ? `<div class="tiny muted" style="margin-top:6px">${t('Slide folders', '课件文件夹')}: ${w.folders.map(f => L(f, 'span')).join('')}</div>` : ''}
        ${w.readings.length ? `
          <h4 style="margin:14px 0 6px">${t('Required reading', '必读')}</h4>
          <div style="overflow-x:auto"><table class="hard-table">
            <tr><th>${t('Book', '教材')}</th><th>${t('Chapter', '章节')}</th><th>${t('Pages', '页码')}</th><th>${t('Focus', '重点')}</th><th>NOCP / CPCF</th></tr>
            ${w.readings.map(r => `<tr><td><b>${T(r.book)}</b></td><td>${L(r.chapter)}</td><td>${esc(r.pages)}</td>
              <td>${L(r.note)}<span class="tiny muted">(${T(r.type)})</span></td><td class="tiny">${esc(r.nocp)}<br>${esc(r.cpcf)}</td></tr>`).join('')}
          </table></div>` : ''}
      </div>
    </details>`;
  }).join(''));
  bindShell(el);
  if (open) el.querySelector('#w' + open)?.scrollIntoView({ block: 'start' });
}

/* ---------------- medications ---------------- */
const SCHOOL_ONLY = /ketamine|ketorolac|hydrocortisone|thiamine|palliative|b12|nebulized/i;
function viewMeds(el) {
  const only = `<span class="pill gray">${t('school only', '仅课程')}</span>`;
  el.innerHTML = shell('meds', `
    <div class="card">
      <p class="tiny muted" style="margin-top:0">${t('Drugs to learn before each weekend, as listed by the course.', '课程列出的每个周末前要学完的药物。')}
        ${only} ${t('= not on the EMALB licensing exam formulary.', '= 不在 EMALB 执照考试药单里。')}</p>
      ${DOC.medications.map(ph => `
        <h3 style="margin:16px 0 6px">${L(ph.phase, 'span')}</h3>
        ${ph.groups.map(g => `
          ${g.deadline ? `<div class="tiny" style="margin:8px 0 4px"><b>${t('Deadline', '截止')}</b>${L(g.deadline)}</div>` : ''}
          <table class="hard-table meds-table" style="margin-bottom:6px">${g.drugs.map(d => `
            <tr><th style="white-space:normal;width:38%">${L(d.name)}${SCHOOL_ONLY.test(d.name) ? only : ''}</th>
            <td>${L(d.use)}</td></tr>`).join('')}</table>`).join('')}`).join('')}
    </div>`);
  bindShell(el);
}

/* ---------------- glossary ---------------- */
function viewGlossary(el) {
  const cats = [...new Set(DOC.glossary.map(g => g.category).filter(Boolean))].sort();
  el.innerHTML = shell('glossary', `
    <div class="card">
      <input id="gq" class="search-box" placeholder="${t('Search terms', '搜索术语')}" style="width:100%" />
      <div class="sec-toc" id="gcats"><a href="#" data-c="" style="border-color:var(--accent);color:var(--accent)">${t('All', '全部')}</a>
        ${cats.map(c => `<a href="#" data-c="${esc(c)}">${T(c)}</a>`).join('')}</div>
    </div>
    <div id="glist"></div>`);
  bindShell(el);
  let cat = '';
  const both = s => s + ' ' + Z(s);
  const draw = () => {
    const q = el.querySelector('#gq').value.trim().toLowerCase();
    const list = DOC.glossary.filter(g => (!cat || g.category === cat) &&
      (!q || [g.term, g.summary, ...g.fields.flat()].map(both).join(' ').toLowerCase().includes(q)));
    el.querySelector('#glist').innerHTML = list.map(g => `
      <details class="acc">
        <summary>${L(g.term, 'span')}<span class="pill gray" style="margin-left:8px">${T(g.category)}</span></summary>
        <div class="acc-body">
          <div style="margin-bottom:8px">${L(g.summary)}</div>
          <table class="hard-table">${g.fields.map(([k, v]) => k
            ? `<tr><th style="white-space:normal;width:30%">${L(k)}</th><td>${L(v)}</td></tr>`
            : `<tr><td colspan="2">${L(v)}</td></tr>`).join('')}</table>
          ${g.warning ? `<div class="notice" style="margin-top:8px">${L(g.warning)}</div>` : ''}
        </div>
      </details>`).join('') || `<p class="muted">${t('No matching terms.', '没有匹配的术语。')}</p>`;
  };
  el.querySelector('#gq').oninput = draw;
  el.querySelectorAll('#gcats a').forEach(a => a.onclick = e => {
    e.preventDefault();
    cat = a.dataset.c;
    el.querySelectorAll('#gcats a').forEach(x => x.style.cssText = x === a ? 'border-color:var(--accent);color:var(--accent)' : '');
    draw();
  });
  draw();
}

/* ---------------- school vs exam ---------------- */
function viewExam(el) {
  el.innerHTML = shell('exam', `
    <div class="notice">${t('In class and at work you follow BCEHS. On the EMALB licensing exam, answer from the BC Provincial Examination Guidelines.',
      '上课和工作按 BCEHS；考 EMALB 执照时，按 BC 考纲作答。')}</div>
    ${DOC.differences.map(d => `
      <div class="card">
        <h3 style="margin-top:0">${L(d.topic, 'span')}</h3>
        <table class="hard-table">
          <tr><th style="white-space:normal;width:22%">${t('Course', '课程')}</th><td>${L(d.school)}</td></tr>
          <tr><th style="white-space:normal">${t('Licensing exam', '执照考试')}</th><td>${L(d.exam)}</td></tr>
        </table>
        <div class="tiny muted" style="margin:6px 0 0">${L(d.ref)}</div>
      </div>`).join('')}`);
  bindShell(el);
}

/* ---------------- quiz bank ---------------- */
function allItems() {
  return DOC.modules.flatMap(m => m.q.map(q => Object.assign({ mod: m.code }, q)));
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function viewQuiz(el, params) {
  const m = params.m;
  if (m) {
    const items = allItems();
    const st = prog();
    let list, label;
    if (m === 'all') { list = shuffle(items); label = t('All modules, shuffled', '全部模块随机'); }
    else if (m === 'new') { list = shuffle(items.filter(q => !(q.id in st.st))); label = t('Unanswered', '没做过的'); }
    else if (m === 'wrong') { list = shuffle(items.filter(q => st.wrong[q.id])); label = t('Missed questions', '错题'); }
    else {
      const mod = DOC.modules.find(x => x.code === m);
      list = mod ? items.filter(q => q.mod === m) : [];
      label = mod ? `${esc(mod.code)} · ${T(mod.title)}` : esc(m);
    }
    if (!run || run.key !== m) run = { key: m, list, label, i: 0, right: 0, done: 0 };
    drawQuestion(el);
    return;
  }
  run = null;
  const st = prog();
  const items = allItems();
  const done = items.filter(q => q.id in st.st).length;
  const right = items.filter(q => st.st[q.id] === 1).length;
  const missed = items.filter(q => st.wrong[q.id]).length;
  const weeks = {};
  for (const mod of DOC.modules) (weeks[mod.weekend] = weeks[mod.weekend] || []).push(mod);
  el.innerHTML = shell('quiz', `
    <div class="card">
      <div class="stat-row">
        <div class="stat"><b>${items.length}</b><span>${t('questions', '题')}</span></div>
        <div class="stat"><b>${done}</b><span>${t('answered', '已做')}</span></div>
        <div class="stat"><b>${done ? Math.round(right / done * 100) + '%' : '—'}</b><span>${t('accuracy', '正确率')}</span></div>
      </div>
      <div class="btn-row" style="margin-top:12px">
        <a class="btn" href="#/portal/quiz?m=all">${t('Shuffle all', '全部随机')}</a>
        <a class="btn secondary" href="#/portal/quiz?m=new">${t('Unanswered only', '只做没做过的')}</a>
        ${missed ? `<a class="btn secondary" href="#/portal/quiz?m=wrong">${t('Missed questions', '错题')} (${missed})</a>` : ''}
        <button class="btn ghost" id="resetQ">${t('Reset progress', '清空进度')}</button>
      </div>
      <p class="tiny muted">${t('These are the knowledge checks from the course\'s online modules. Highlighted notes mark a corrected school answer key or a place where the licensing exam answers differently.',
        '这些是课程线上模块里的随堂测验。高亮说明表示学校答案键已更正，或执照考试答案不同。')}</p>
    </div>
    ${Object.keys(weeks).sort((a, b) => a - b).map(w => `
      <h3 style="margin:18px 4px 8px">${t('Weekend ' + w, '第 ' + w + ' 周末')}</h3>
      <div class="list-wrap">${weeks[w].map(mod => {
        const d = mod.q.filter(q => q.id in st.st).length;
        const r = mod.q.filter(q => st.st[q.id] === 1).length;
        return `<a class="list-item" href="#/portal/quiz?m=${encodeURIComponent(mod.code)}" style="color:inherit;text-decoration:none">
          <span class="tag-count" style="flex:0 0 auto;margin:0">${esc(mod.code)}</span>
          <span>${L(mod.title, 'span')}<span class="tiny muted">${L(mod.source)}</span></span>
          <span class="tag-count">${d}/${mod.q.length}${d ? ' · ' + Math.round(r / d * 100) + '%' : ''}</span>
          <span class="li-arrow">›</span></a>`;
      }).join('')}</div>`).join('')}`);
  bindShell(el);
  el.querySelector('#resetQ').onclick = () => {
    if (confirm(t('Clear all quiz progress and the missed-question list?', '清空全部做题记录和错题？'))) { saveProg({ st: {}, wrong: {} }); viewQuiz(el, {}); }
  };
}

function drawQuestion(el) {
  if (!run.list.length) {
    el.innerHTML = shell('quiz', `<div class="card"><p>${t('No questions here.', '这里没有题。')}</p>
      <a class="btn ghost" href="#/portal/quiz">← ${t('Quiz bank', '题库')}</a></div>`);
    bindShell(el);
    return;
  }
  const q = run.list[run.i];
  const multi = q.y === 'mr', match = q.y === 'mt', fill = q.y === 'fb';
  const nRight = q.o.filter(o => o.k).length;
  const keyOf = i => String.fromCharCode(65 + i);
  const scoreLine = () => `${t('Question', '第')} ${run.i + 1}/${run.list.length} · ${t('Score', '得分')} ${run.right}/${run.done}`;
  el.innerHTML = shell('quiz', `
    <div class="card">
      <div class="q-meta">
        <div><b>${run.label}</b> <a class="tiny" href="#/portal/quiz" style="margin-left:6px">← ${t('Quiz bank', '题库')}</a></div>
        <div class="muted">${scoreLine()}</div>
      </div>
      <div class="tiny muted" style="margin:0 0 6px">${esc(q.mod)}${q.l ? ' · ' + T(q.l) : ''}</div>
      <div class="q-text" style="white-space:pre-wrap">${q.q ? L(q.q) : t('(question text missing)', '（题干缺失）')}</div>
      ${multi ? `<p class="tiny" style="color:var(--accent);font-weight:700">${t(`Select all that apply — ${nRight} correct.`, `多选题——共 ${nRight} 个正确答案。`)}</p>` : ''}
      ${match ? `<p class="tiny" style="color:var(--accent);font-weight:700">${t('Matching: pair each item in your head, then show the answer and mark yourself.', '配对题：先在心里配好，再看答案自评。')}</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:4px 16px">
          <div><b class="tiny">${t('Items', '项目')}</b><ol>${q.o.map(o => `<li>${L(o.t)}</li>`).join('')}</ol></div>
          <div><b class="tiny">${t('Matches', '对应')}</b><ol type="A">${shuffle(q.o.map(o => o.m || '')).map(m => `<li>${L(m)}</li>`).join('')}</ol></div>
        </div>` : ''}
      ${fill ? `<input id="fillIn" class="search-box" style="width:100%" placeholder="${t('Type your answer', '输入答案')}" />` : ''}
      ${!match && !fill ? `<div class="q-opts">${q.o.map((o, i) =>
        `<button class="opt" data-i="${i}"><span class="opt-key">${keyOf(i)}</span><span style="white-space:pre-wrap">${L(o.t, 'span')}</span></button>`).join('')}</div>` : ''}
      <div id="res"></div>
      <div class="btn-row" id="qBtns">
        ${multi ? `<button class="btn secondary" id="submitQ">${t('Submit', '提交')}</button>` : ''}
        ${match || fill ? `<button class="btn secondary" id="revealQ">${t('Show answer', '显示答案')}</button>` : ''}
        <button class="btn ghost" id="skipQ">${t('Skip', '跳过')} →</button>
      </div>
    </div>`);
  bindShell(el);

  let answered = false;
  const picked = new Set();
  const record = ok => {
    const st = prog();
    st.st[q.id] = ok ? 1 : 0;
    if (ok) delete st.wrong[q.id]; else st.wrong[q.id] = 1;
    saveProg(st);
    run.done++; if (ok) run.right++;
    el.querySelector('.q-meta .muted').textContent = scoreLine();
  };
  const showResult = ok => {
    answered = true;
    el.querySelectorAll('.q-opts .opt').forEach((b, i) => {
      b.disabled = true;
      const o = q.o[i];
      if (o.k) b.classList.add('correct');
      else if (picked.has(i)) b.classList.add('wrong');
    });
    el.querySelector('#res').innerHTML = `
      ${ok == null ? '' : `<p style="font-weight:700;color:var(--${ok ? 'green' : 'red'})">${ok ? t('✓ Correct', '✓ 答对了') : t('✗ Incorrect', '✗ 答错了')}</p>`}
      ${match ? `<div class="explain"><b>${t('Correct pairs', '正确配对')}</b><ol>${q.o.map(o =>
        `<li>${L(o.t)}<div style="padding-left:1em">→ ${L(o.m || '', 'span')}</div></li>`).join('')}</ol></div>` : ''}
      ${fill ? `<div class="explain"><b>${t('Answer', '答案')}</b>${q.o.map(o => L(o.t)).join('')}</div>` : ''}
      ${q.f ? `<div class="explain">${L(q.f)}</div>` : ''}
      ${q.n ? `<div class="notice" style="margin-top:8px">${L(q.n)}</div>` : ''}`;
    ['#submitQ', '#revealQ'].forEach(s => el.querySelector(s)?.remove());
    const nb = document.createElement('button');
    nb.className = 'btn';
    nb.textContent = run.i + 1 < run.list.length ? t('Next', '下一题') + ' →' : t('Finish', '完成');
    nb.onclick = next;
    el.querySelector('#qBtns').prepend(nb);
  };
  const next = () => {
    if (run.i + 1 < run.list.length) { run.i++; drawQuestion(el); window.scrollTo(0, 0); }
    else { alert(t(`Round complete: ${run.right}/${run.done}`, `本轮完成：${run.right}/${run.done}`)); run = null; location.hash = '#/portal/quiz'; }
  };
  el.querySelectorAll('.q-opts .opt').forEach(b => b.onclick = () => {
    if (answered) return;
    const i = Number(b.dataset.i);
    if (multi) { picked.has(i) ? picked.delete(i) : picked.add(i); b.classList.toggle('picked'); return; }
    picked.add(i);
    const ok = !!q.o[i].k;
    record(ok);
    showResult(ok);
  });
  el.querySelector('#submitQ')?.addEventListener('click', () => {
    const want = q.o.map((o, i) => o.k ? i : -1).filter(i => i >= 0);
    const ok = want.length === picked.size && want.every(i => picked.has(i));
    record(ok);
    showResult(ok);
  });
  el.querySelector('#revealQ')?.addEventListener('click', () => {
    if (fill) {
      const norm = s => String(s || '').trim().toLowerCase().replace(/[.。!！]+$/, '');
      const v = norm(el.querySelector('#fillIn').value);
      const ok = !!v && q.o.some(o => norm(o.t) === v || norm(Z(o.t)) === v);
      record(ok);
      showResult(ok);
      return;
    }
    showResult(null);
    const self = document.createElement('div');
    self.className = 'btn-row';
    self.innerHTML = `<button class="btn secondary" id="selfOk">${t('I got them all', '全部配对正确')}</button>
      <button class="btn ghost" id="selfBad">${t('I missed some', '有配错')}</button>`;
    el.querySelector('#res').prepend(self);
    const mark = ok => { record(ok); self.remove(); };
    self.querySelector('#selfOk').onclick = () => mark(true);
    self.querySelector('#selfBad').onclick = () => mark(false);
  });
  el.querySelector('#skipQ').onclick = next;
}
