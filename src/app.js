// BC EMR/PCP Exam Prep v2 — core: state, i18n, router, data, home/guide
// NOTE: keep the ?v= build tag in sync across index.html and these imports —
// without it browsers serve stale modules after a deploy.
import { renderWrittenHub, renderPractice, renderMock, renderWrong } from './exam.js?v=6';
import { renderPracticalHub, renderScenarioList, renderScenarioPlayer, renderRubricBrowser, renderAutoFails } from './scenario.js?v=6';
import { renderStudyHub, renderStudySection, renderJurisHub, renderExamInfo } from './study.js?v=6';

/* ---------------- state ---------------- */
const LS_KEY = 'bcprep2';
export const S = loadState();
function loadState() {
  try { return Object.assign(defaultState(), JSON.parse(localStorage.getItem(LS_KEY) || '{}')); }
  catch { return defaultState(); }
}
function defaultState() {
  return { track: null, lang: 'both', theme: 'auto', wrong: {}, mockHistory: [], scenarioHistory: [], practiceStats: {}, jurisHistory: [] };
}
export function save() { localStorage.setItem(LS_KEY, JSON.stringify(S)); }

/* ---------------- icons ---------------- */
// inline sprite symbols live in index.html
export function ico(name, cls = '') { return `<svg class="icon ${cls}"><use href="#i-${name}"/></svg>`; }

/* ---------------- i18n ---------------- */
export function bi(en, zh, tag = 'div') {
  if (en == null && zh == null) return '';
  return `<${tag} class="bi"><div class="bi-en">${esc(en)}</div><div class="bi-zh">${esc(zh)}</div></${tag}>`;
}
export function biList(enArr = [], zhArr = []) {
  const n = Math.max(enArr.length, zhArr.length);
  let h = '';
  for (let i = 0; i < n; i++) h += `<li>${bi(enArr[i] ?? '', zhArr[i] ?? '', 'span')}</li>`;
  return h;
}
export function t(en, zh) { // inline label by lang mode
  if (S.lang === 'en') return en;
  if (S.lang === 'zh') return zh;
  return `${en} ${zh}`;
}
export function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------------- data loading ---------------- */
// Data files carry the same build tag as the modules. Without it the browser
// serves a cached copy after a content update and users silently keep the old
// question bank — bump this whenever data/ changes.
const DATA_V = '6';
const cache = {};
export async function loadJSON(path) {
  if (cache[path]) return cache[path];
  try {
    const r = await fetch(path + (path.includes('?') ? '&' : '?') + 'v=' + DATA_V);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    cache[path] = d;
    return d;
  } catch (e) {
    console.warn('load failed', path, e);
    return null;
  }
}
export async function loadBank(track) { // merged question pool for a licence track
  const idx = await loadJSON('./data/written/index.json');
  if (!idx) return [];
  const parts = await Promise.all(idx.parts.map(p => loadJSON('./data/written/parts/' + p)));
  const pool = [];
  for (const part of parts) {
    if (!part || !part.questions) continue;
    for (const q of part.questions) {
      if (q.licence === track || q.licence === 'both') pool.push(q);
    }
  }
  // passage-based sets: the real exam attaches 3-5 linked questions to a patient
  // profile table or an evolving case scenario. Each question carries its passage
  // so it can be rendered standalone, plus the ids needed to keep a set together.
  const passageFiles = (idx.passages || []);
  const packs = await Promise.all(passageFiles.map(p => loadJSON('./data/written/passages/' + p)));
  for (const pack of packs) {
    if (!pack || !pack.passages) continue;
    const licence = pack.meta && pack.meta.licence;
    if (licence && licence !== track && licence !== 'both') continue;
    for (const psg of pack.passages) {
      const qs = psg.questions || [];
      qs.forEach((q, i) => {
        pool.push(Object.assign({}, q, {
          licence: licence || 'both',
          passageId: psg.id,
          passageIndex: i,
          passageTotal: qs.length,
          passage: {
            id: psg.id, format: psg.format,
            titleEn: psg.titleEn, titleZh: psg.titleZh,
            profile: psg.profile || null,
            passageEn: psg.passageEn || '', passageZh: psg.passageZh || '',
          },
        }));
      });
    }
  }
  return pool;
}

/* ---------------- router ---------------- */
const routes = {
  '': renderHome, 'home': renderHome, 'guide': renderGuide, 'info': renderExamInfo,
  'study': renderStudyHub, 'study-section': renderStudySection,
  'written': renderWrittenHub, 'practice': renderPractice, 'mock': renderMock, 'wrong': renderWrong,
  'practical': renderPracticalHub, 'scenarios': renderScenarioList, 'scenario': renderScenarioPlayer,
  'rubric': renderRubricBrowser, 'autofails': renderAutoFails,
  'juris': renderJurisHub,
};
export function nav(hash) { location.hash = hash; }
export function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = h.split('?');
  const segs = pathPart.split('/').filter(Boolean);
  const params = {};
  if (queryPart) for (const kv of queryPart.split('&')) { const [k, v] = kv.split('='); params[k] = decodeURIComponent(v || ''); }
  return { name: segs[0] || '', arg: segs[1] || null, params };
}
async function route() {
  const { name, arg, params } = parseRoute();
  const el = document.getElementById('view');
  el.className = 'view-root lang-' + S.lang;
  // track required for most views
  const noTrack = ['', 'home', 'guide', 'info'];
  if (!S.track && !noTrack.includes(name)) { nav('/'); return; }
  let fn = routes[name] || renderHome;
  if (name === 'study' && arg) fn = renderStudySection;
  window.scrollTo(0, 0);
  el.innerHTML = `<div class="card"><p class="muted">Loading… 加载中…</p></div>`;
  try { await fn(el, arg, params); } catch (e) {
    console.error(e);
    el.innerHTML = `<div class="card"><h2>Error 出错了</h2><p class="muted">${esc(e.message)}</p></div>`;
  }
  updateNav(name);
}
function updateNav(name) {
  const map = { '': 'home', home: 'home', guide: 'home', info: 'home', study: 'study', 'study-section': 'study', written: 'written', practice: 'written', mock: 'written', wrong: 'written', practical: 'practical', scenarios: 'practical', scenario: 'practical', rubric: 'practical', autofails: 'practical', juris: 'juris' };
  document.querySelectorAll('#bottomNav a').forEach(a => a.classList.toggle('active', a.dataset.nav === (map[name] || '')));
  syncTrackUI();
}
function syncTrackUI() {
  document.querySelectorAll('#trackSwitch button').forEach(b => {
    b.className = '';
    if (S.track === b.dataset.track) b.classList.add('active-' + S.track);
  });
  const langBtn = document.getElementById('langBtn');
  langBtn.textContent = S.lang === 'both' ? 'EN+中' : (S.lang === 'en' ? 'EN' : '中文');
}

/* ---------------- home ---------------- */
async function renderHome(el) {
  const rules = await loadJSON('./data/meta/exam-rules.json');
  if (!S.track) {
    el.innerHTML = `
      <div class="hero card">
        <h1>${t('BC Paramedic Licensing Exam Prep', 'BC 省急救员考证备考系统')}</h1>
        <p class="muted">${t('Written · Jurisprudence · Practical — everything aligned to the official EMALB & COPR requirements.', '笔试 · 法规考 · 实操考——全部对齐 EMALB 与 COPR 官方要求。')}</p>
        <div class="track-choice">
          <button class="track-card emr" data-pick-track="emr">
            <span class="pill emr">EMR</span>
            <h3>Emergency Medical Responder</h3>
            ${bi('First responder level. EMALB written (200Q · 75%) + jurisprudence + 2 practical scenarios.', '急救反应员。EMALB 笔试（200题·75%及格）+ 法规考 + 2 场实操。')}
          </button>
          <button class="track-card pcp" data-pick-track="pcp">
            <span class="pill pcp">PCP</span>
            <h3>Primary Care Paramedic</h3>
            ${bi('Paramedic entry level. COPR national written (200Q · CPCF) + jurisprudence + 2 practical scenarios.', '初级急救员。COPR 全国统考（200题·CPCF框架）+ 法规考 + 2 场实操。')}
          </button>
        </div>
        <div class="btn-row" style="justify-content:center;margin-top:18px">
          <a class="btn secondary" href="#/guide">${ico('cap')} ${t('How to use this site', '怎么用这个网站')}</a>
        </div>
      </div>`;
    return;
  }
  const tr = S.track, R = rules ? rules[tr] : null;
  const jr = rules ? rules.jurisprudence : null;
  const pr = rules ? rules.practical : null;
  const wrongCount = Object.keys(S.wrong).length;
  const mocks = S.mockHistory.filter(m => m.track === tr);
  const lastMock = mocks[mocks.length - 1];
  const scen = S.scenarioHistory.length;
  const writtenFacts = tr === 'pcp'
    ? t('COPR · 200Q · 2×120 min · standard score', 'COPR 统考 · 200题 · 两段各120分钟 · 标准分制')
    : t('EMALB · 200Q · 2.5h · pass 75%', 'EMALB 自考 · 200题 · 2.5小时 · 75%及格');
  el.innerHTML = `
    <div class="card">
      <h2>${t(`${tr.toUpperCase()} Candidate Dashboard`, `${tr.toUpperCase()} 考生仪表盘`)}</h2>
      <p class="muted">${t('Three exams stand between you and your licence. Attack all three.', '拿牌要过三关，三关都在这里练。')}</p>
      <div class="pillar-row">
        <div class="pillar">
          <div class="p-head"><span class="p-ico">${ico('pen')}</span>${t('Written', '笔试')}</div>
          <div class="p-facts">${writtenFacts}</div>
          ${lastMock ? `<div class="tiny">${t('Last mock', '上次模考')}: <b>${lastMock.pct}%</b> (${lastMock.date})</div>` : `<div class="tiny">${t('No mock exams yet', '还没做过模考')}</div>`}
          <a class="btn" href="#/written">${t('Enter', '进入')}</a>
        </div>
        <div class="pillar">
          <div class="p-head"><span class="p-ico">${ico('scale')}</span>${t('Jurisprudence', '法规考')}</div>
          <div class="p-facts">${t('EMALB · 25Q · no time limit · pass 80%', 'EMALB · 25题 · 不限时 · 80%及格')}</div>
          <div class="tiny">${S.jurisHistory.length ? t(`${S.jurisHistory.length} mock(s) done`, `已做 ${S.jurisHistory.length} 次模拟`) : t('Highest pass mark of the three!', '三关里及格线最高的一关！')}</div>
          <a class="btn" href="#/juris">${t('Enter', '进入')}</a>
        </div>
        <div class="pillar">
          <div class="p-head"><span class="p-ico">${ico('ambulance')}</span>${t('Practical', '实操')}</div>
          <div class="p-facts">${t('1 medical + 1 trauma · 40 min · pass 70% (deduction-based)', '1内科+1创伤 · 每场40分钟 · 扣分制70%过')}</div>
          <div class="tiny">${scen ? t(`${scen} scenario run(s)`, `已练 ${scen} 场`) : t('Practice with the real grading rubric', '用真实考官扣分表练习')}</div>
          <a class="btn" href="#/practical">${t('Enter', '进入')}</a>
        </div>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">${t('Quick actions', '快捷入口')}</h3>
      <div class="btn-row">
        <a class="btn secondary" href="#/guide">${ico('cap')} ${t('How to use / study path', '使用指南·备考路线')}</a>
        <a class="btn secondary" href="#/study">${ico('book')} ${t('Study library', '学习内容库')}</a>
        <a class="btn secondary" href="#/wrong">${ico('x')} ${t(`Wrong answers (${wrongCount})`, `错题本 (${wrongCount})`)}</a>
        <a class="btn secondary" href="#/autofails">${ico('skull')} ${t('Auto-fail traps', '直接挂科陷阱')}</a>
        <a class="btn secondary" href="#/info">${ico('info')} ${t('Exam logistics & fees', '考务流程与费用')}</a>
      </div>
    </div>
    ${rules ? `<div class="card">
      <h3 style="margin-top:0">${t('The rules you are playing by', '你要面对的硬规则')}</h3>
      <ul class="steps" style="list-style:none">
        <li class="step"><span class="step-num">3</span>${bi('Three attempts per exam. Fail all three → repeat your entire training program.', '每门考试只有 3 次机会，三次全挂就要重读整个课程。')}</li>
        <li class="step"><span class="step-num">12</span>${bi('All exams must be passed within 12 months of finishing your course.', '所有考试必须在课程结业后 12 个月内全部通过。')}</li>
        <li class="step"><span class="step-num">!</span>${bi('Practical exams are only scheduled after written + jurisprudence are passed — do those first.', '实操考要等笔试和法规考都过了才给排期——先攻前两关。')}</li>
      </ul>
    </div>` : ''}`;
}

/* ---------------- guide ---------------- */
async function renderGuide(el) {
  el.innerHTML = `
    <div class="card">
      <h2>${ico('cap')} ${t('How to use this site', '怎么用这个网站')}</h2>
      <p class="muted">${t('A complete path from zero to exam-ready. Follow the six steps in order.', '从零到考前就绪的完整路线，按下面六步走。')}</p>
      <div class="steps">
        <div class="step"><span class="step-num">1</span><div>
          ${bi('Pick your track (EMR or PCP) at the top of the page. Everything — question banks, drug lists, scenario variants — adapts to your licence level.',
              '先在页面顶部选好你的轨道（EMR 或 PCP）。选完后全站的题库、药物清单、场景变体都会按你的牌照等级适配。')}
        </div></div>
        <div class="step"><span class="step-num">2</span><div>
          ${bi('Understand your three exams: open "Exam logistics" to see exactly what you face — question counts, pass marks, fees, retake rules, deadlines.',
              '搞清楚你的三关：打开"考务流程"，看清每关的题量、及格线、费用、补考规则和时间线。')}
          <div class="btn-row"><a class="btn ghost" href="#/info">${t('Exam logistics', '考务流程')}</a></div>
        </div></div>
        <div class="step"><span class="step-num">3</span><div>
          ${bi('Learn the content in the Study library. Start with the Patient Assessment Model (the backbone of everything), then Protocols, then Drugs. These come from the official BC exam guidelines — the only standard examiners are allowed to mark against.',
              '进"学习内容库"打基础：先学患者评估模型（一切的主线），再学 13 个处置协议，再背 18 个药物卡。这些内容全部来自 BC 官方考纲——考官唯一被允许使用的评分标准。')}
          <div class="btn-row"><a class="btn ghost" href="#/study">${t('Study library', '学习内容库')}</a></div>
        </div></div>
        <div class="step"><span class="step-num">4</span><div>
          ${bi('Drill with Practice mode (instant feedback, filter by topic), then take full timed Mock Exams that replicate the real format — including the two-part timer and break for PCP. Review every wrong answer in the Wrong-answer book.',
              '先用"练习模式"刷题（即时解析、可按主题筛选），再上"全真模考"——完整复刻真实考试格式（PCP 含两段计时和中场休息）。每道错题都会进错题本，考前重点清错题。')}
          <div class="btn-row"><a class="btn ghost" href="#/written">${t('Written camp', '笔试营')}</a></div>
        </div></div>
        <div class="step"><span class="step-num">5</span><div>
          ${bi('Train the Practical: run scenarios phase by phase with the real examiner deduction rubric, race the 15/30-minute packaging clock, write PCRs, and memorize the auto-fail traps. Then practice hands-on skills in person — a website cannot replace physical practice.',
              '攻实操：用真实考官扣分表逐幕过场景、卡 15/30 分钟打包倒计时、写 PCR、背熟"直接挂科陷阱"。注意：动手技能（BVM、包扎、脊柱滚动）必须线下真人实练，网站只能练决策和流程。')}
          <div class="btn-row"><a class="btn ghost" href="#/practical">${t('Practical camp', '实操营')}</a></div>
        </div></div>
        <div class="step"><span class="step-num">6</span><div>
          ${bi('Do not skip Jurisprudence — 25 questions, 80% to pass, the highest bar of the three. One evening of notes + a few mocks is usually enough, but only if you actually do it.',
              '别小看法规考——25 题、80% 及格，三关里及格线最高。认真过一遍笔记+几套模拟一般就够，但前提是你真的做了。')}
          <div class="btn-row"><a class="btn ghost" href="#/juris">${t('Jurisprudence camp', '法规营')}</a></div>
        </div></div>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">${t('Suggested weekly rhythm', '建议的备考节奏')}</h3>
      ${bi('Weeks 1-2: Study library front to back. Weeks 3-4: practice mode by topic, fix weak areas. Weeks 5-6: one full mock every 2-3 days + scenario runs. Final week: wrong-answer book, auto-fail flashcards, jurisprudence mocks, and rest before exam day.',
          '第1-2周：把学习内容库过完。第3-4周：按主题刷练习题，补弱项。第5-6周：每2-3天一套全真模考+实操场景练习。最后一周：清错题本、背直接挂科卡、做法规模拟，考前一天好好休息。')}
    </div>`;
}

/* ---------------- boot ---------------- */
document.getElementById('trackSwitch').addEventListener('click', e => {
  const b = e.target.closest('button[data-track]');
  if (!b) return;
  S.track = b.dataset.track; save(); route();
});
document.getElementById('langBtn').addEventListener('click', () => {
  S.lang = S.lang === 'both' ? 'en' : (S.lang === 'en' ? 'zh' : 'both');
  save(); route();
});
document.getElementById('view').addEventListener('click', e => {
  const tb = e.target.closest('[data-pick-track]');
  if (tb) { S.track = tb.dataset.pickTrack; save(); nav('/'); route(); }
});
// theme: auto (follow OS) → light → dark → auto
document.getElementById('themeBtn').addEventListener('click', () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (S.theme === 'auto') S.theme = prefersDark ? 'light' : 'dark';
  else if (S.theme === (prefersDark ? 'light' : 'dark')) S.theme = prefersDark ? 'dark' : 'light';
  else S.theme = 'auto';
  applyTheme(); save();
});
function applyTheme() {
  const root = document.documentElement;
  if (S.theme === 'light' || S.theme === 'dark') root.dataset.theme = S.theme;
  else delete root.dataset.theme;
  const btn = document.getElementById('themeBtn');
  if (btn) btn.title = S.theme === 'auto' ? 'Theme: auto 跟随系统' : (S.theme === 'dark' ? 'Theme: dark 深色' : 'Theme: light 浅色');
}
applyTheme();
window.addEventListener('hashchange', route);
route();
