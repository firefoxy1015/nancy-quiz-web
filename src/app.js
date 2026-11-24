// BC EMR/PCP Exam Prep v2 — core: state, i18n, router, data, home/guide
// NOTE: keep the ?v= build tag in sync across index.html and these imports —
// without it browsers serve stale modules after a deploy.
import { renderWrittenHub, renderPractice, renderMock, renderWrong, renderAetHub } from './exam.js?v=88';
import { renderPracticalHub, renderScenarioList, renderScenarioPlayer, renderRubricBrowser, renderAutoFails } from './scenario.js?v=88';
import { renderPlay } from './play.js?v=88';
import { renderStudyHub, renderStudySection, renderJurisHub, renderExamInfo } from './study.js?v=88';
import { renderExaminerHub, renderExaminerRun, renderExaminerLog } from './examiner.js?v=88';
import { renderPortal } from './portal.js?v=88';
import { renderAetClass } from './aetclass.js?v=88';
import { renderBackup } from './backup.js?v=88';
import { renderHome, placeOf } from './home.js?v=88';

/* ---------------- state ---------------- */
const LS_KEY = 'bcprep2';
export const S = loadState();
function loadState() {
  try {
    const st = Object.assign(defaultState(), JSON.parse(localStorage.getItem(LS_KEY) || '{}'));
    // English is the default; bilingual/Chinese is an explicit choice. States saved
    // before this rule carried the old 'both' default without the visitor choosing it.
    if (!st.langChosen) st.lang = 'en';
    return st;
  }
  catch { return defaultState(); }
}
function defaultState() {
  return { track: null, lang: 'en', theme: 'auto', wrong: {}, mockHistory: [], scenarioHistory: [], practiceStats: {}, jurisHistory: [] };
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
const DATA_V = '28';
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
/* ---------------- topic grouping ---------------- */
// The bank's raw `topic` values are authoring-granular (255 distinct values,
// dozens holding a single question) — unusable as a filter list and unfair as
// a sampling axis. These 17 clinical-domain groups are the user-facing unit.
// Order matters: first matching rule wins, so specific domains precede broad ones.
export const TOPIC_GROUPS = [
  ['ddx', 'Differential Dx', '鉴别诊断', /^ddx-/],
  ['arrest', 'Cardiac Arrest & Resus', '骤停与复苏', /arrest|cpr|aed|defib|resus|rosc/],
  ['ops', 'Operations & Safety', '运营与安全', /driving|ambulance|vehicle|safety|lifting|body-mechanic|ppe|infection|disinfect|sharps|hazmat|mci|triage|scene|extricat|transport|equipment|restraint|violence|crime|incident-command|patient-moving|landing-zone|hand-hygiene|routine-practices|cbrne|decontamin|droplet|occupational|multi-casualty|offload/],
  ['tox', 'Toxicology & Overdose', '中毒与过量', /poison|overdose|tox|alcohol|withdrawal|opioid|naloxone|carbon-monoxide|substance|huff/],
  ['obgyn', 'OB & Neonatal', '产科与新生儿', /obstetric|pregnan|birth|labour|labor|neonat|newborn|deliver|eclamp|postpartum|gyne|vaginal|miscarr/],
  ['environment', 'Environmental', '环境急症', /hypotherm|hyperther|heat|cold-|drown|submers|bite|sting|envenom|altitude|electric|lightning|frostbite|diving|environmental/],
  ['trauma', 'Trauma', '创伤', /trauma|fracture|burn|spinal|c-spine|head-injur|tbi|chest-injur|pelvi|amputat|wound|crush|blast|msk|dislocat|sprain|lacerat|avuls|impale|eviscer|pneumothorax|flail|concuss|bleeding-control|soft-tissue|splint|traction|eye|dental|facial|neck|musculoskeletal|injur/],
  ['shock', 'Shock · Bleeding · Allergy', '休克·出血·过敏', /shock|hemorrhag|bleed|fluid|tourniquet|txa|sepsis|anaphyla|allerg/],
  ['cardiac', 'Cardiac', '心血管', /cardiac|chest-pain|acs|\bmi\b|ecg|heart|chf|arrhythm|av-block|nitro|angina|coronary|pulmonary-edema|tachy|brady|aortic|cardio/],
  ['airway', 'Airway & Breathing', '气道与呼吸', /airway|breath|resp|oxygen|ventil|copd|asthma|croup|fbao|chok|suction|cpap|stridor|epiglott|tracheit|pneumonia|intub|opa|npa|bvm|hyperventil|dyspnea|sob/],
  ['neuro', 'Neurological', '神经急症', /stroke|seizure|syncope|altered|dloc|\bloc\b|headache|tia|epilep|neuro|gcs|glasgow|meningitis|unconscious|avpu/],
  ['medical', 'Medical & GI', '内科与消化', /diabet|glyc|endocrin|\bgi\b|abdominal|nausea|renal|uro|bowel|appendic|cholecyst|ulcer|gastro|hepat|pancrea|sickle|dka|fever|medical|infectious|dialysis|dehydrat/],
  ['pharm', 'Pharmacology & IV', '药理与IV', /drug|medicat|pharm|dose|administr|entonox|glucagon|salbutamol|epinephrine|aspirin|glucose|ipratropium|dimenhydrinate|acetaminophen|ibuprofen|pain-management|analgesia|iv-/],
  ['peds', 'Pediatrics', '儿科', /pediatric|paediatric|peds|child|infant|toddler|adolescent|development/],
  ['geriatric', 'Geriatrics', '老年', /geriatric|elder|senior|dementia|aging|delirium|falls-prevention/],
  ['assessment', 'Assessment & Vitals', '评估与体征', /assess|vital|history|physical-exam|head-to-toe|sample-|opqrst|primary|secondary|baseline|pupil|skin-|palpat|auscult|unstable-criteria/],
  ['professional', 'Professional & Legal', '职业与法规', /legal|consent|ethic|communicat|document|profession|jurispr|quality|research|health-promot|educat|cultural|team|wellness|stress|confidential|capacity|refus|ems|paramedic|community|reporting|abuse|neglect|mental-health|psychiat|behavior|behaviour|end-of-life|palliat|dnr|expanded|equity|learning|evidence|wellbeing|advocacy|leadership|scope-of-practice|substitute-decision|advance-directive|fitness|handover|health-literacy|social-determinants|privacy|colleague|fatigue|language|difficult-conversations|peer-support|disclosure|pcr/],
];
const groupCache = {};
export function topicGroup(topic) {
  const tp = topic || '?';
  if (groupCache[tp]) return groupCache[tp];
  let g = 'other';
  for (const [id, , , rx] of TOPIC_GROUPS) if (rx.test(tp)) { g = id; break; }
  return groupCache[tp] = g;
}
export function groupLabel(id) {
  const g = TOPIC_GROUPS.find(x => x[0] === id);
  return g ? t(g[1], g[2]) : id;
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
  'written': renderWrittenHub, 'practice': renderPractice, 'mock': renderMock, 'wrong': renderWrong, 'aet': renderAetHub,
  'practical': renderPracticalHub, 'scenarios': renderScenarioList, 'scenario': renderScenarioPlayer,
  'rubric': renderRubricBrowser, 'autofails': renderAutoFails, 'examiner': renderExaminerHub, 'examiner-run': renderExaminerRun, 'examiner-log': renderExaminerLog,
  'juris': renderJurisHub, 'portal': renderPortal, 'backup': renderBackup, 'play': renderPlay,
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
  const noTrack = ['', 'home', 'guide', 'info', 'portal', 'backup'];
  if (!S.track && !noTrack.includes(name) && name !== 'play' && !(name === 'aet' && arg === 'class')) { nav('/'); return; }
  let fn = routes[name] || renderHome;
  if (name === 'study' && arg) fn = renderStudySection;
  if (name === 'aet' && arg === 'class') fn = renderAetClass;
  window.scrollTo(0, 0);
  el.innerHTML = `<div class="card"><p class="muted">Loading… 加载中…</p></div>`;
  if (S.track && placeOf(location.hash)) { S.last = { h: location.hash, track: S.track, at: Date.now() }; save(); }
  try { await fn(el, arg, params); } catch (e) {
    console.error(e);
    el.innerHTML = `<div class="card"><h2>Error 出错了</h2><p class="muted">${esc(e.message)}</p></div>`;
  }
  updateNav(name);
}
function updateNav(name) {
  const map = { '': 'home', home: 'home', guide: 'home', info: 'home', study: 'study', 'study-section': 'study', written: 'written', practice: 'written', mock: 'written', wrong: 'written', aet: 'study', portal: 'study', practical: 'practical', scenarios: 'practical', scenario: 'practical', rubric: 'practical', autofails: 'practical', examiner: 'practical', 'examiner-run': 'practical', 'examiner-log': 'practical', juris: 'written' };
  if (name === 'play') map.play = /sims/.test(location.hash) ? 'practical' : /written/.test(location.hash) ? 'written' : 'home';
  document.querySelectorAll('#bottomNav a').forEach(a => a.classList.toggle('active', a.dataset.nav === (map[name] || '')));
  syncTrackUI();
}
function syncTrackUI() {
  if (S.track) document.documentElement.dataset.track = S.track;
  else delete document.documentElement.dataset.track;
  const tc = document.querySelector('meta[name="theme-color"][media*="light"]');
  if (tc) tc.content = S.track === 'emr' ? '#1d4ed8' : '#0d5c5c';
  document.querySelectorAll('#trackSwitch button').forEach(b => {
    b.className = '';
    if (S.track === b.dataset.track) b.classList.add('active-' + S.track);
  });
  document.documentElement.dataset.lang = S.lang;
  document.documentElement.lang = S.lang === 'zh' ? 'zh' : 'en';
  const langBtn = document.getElementById('langBtn');
  langBtn.textContent = S.lang === 'both' ? 'EN+中' : (S.lang === 'en' ? 'EN' : '中文');
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
          ${bi('Learn the content under Learn — it has two layers. The Nancy Caroline Chapter Review condenses the 4,700-page textbook chapter by chapter (knowledge map, every testable number, textbook-vs-BC conflicts flagged); read the ★★★ chapters first and drill each one\'s domain as you finish it. Then the guideline layer: the Patient Assessment Model, Protocols and Drugs, straight from the official BC exam guidelines — the only standard examiners may mark against.',
              '进「上课」打基础——它分两层。「Nancy Caroline 章节精读」把 4700 页教材逐章浓缩（知识地图、全部可考数值、教材与 BC 考纲冲突逐处标注），先读 ★★★ 高权重章，每读完一章就顺手刷它对应的题。然后是考纲层：患者评估模型、13 个处置协议、18 个药物卡——全部来自 BC 官方考纲，考官唯一被允许使用的评分标准。')}
          <div class="btn-row">
            <a class="btn ghost" href="#/study/chapters">${t('Chapter review', '章节精读')}</a>
            <a class="btn ghost" href="#/study">${t('Learn', '上课')}</a>
          </div>
        </div></div>
        <div class="step"><span class="step-num">4</span><div>
          ${bi('Drill with Practice mode (instant feedback, filter by topic), then take full timed Mock Exams that replicate the real format — including the two-part timer and break for PCP. Review every wrong answer in the Wrong-answer book.',
              '先用"练习模式"刷题（即时解析、可按主题筛选），再上"全真模考"——完整复刻真实考试格式（PCP 含两段计时和中场休息）。每道错题都会进错题本，考前重点清错题。')}
          <div class="btn-row"><a class="btn ghost" href="#/written">${t('Questions', '刷题')}</a></div>
        </div></div>
        <div class="step"><span class="step-num">5</span><div>
          ${bi('Train the Practical: run scenarios phase by phase with the real examiner deduction rubric, race the 15/30-minute packaging clock, write PCRs, and memorize the auto-fail traps. Then practice hands-on skills in person — a website cannot replace physical practice.',
              '攻实操：用真实考官扣分表逐幕过场景、卡 15/30 分钟打包倒计时、写 PCR、背熟"直接挂科陷阱"。注意：动手技能（BVM、包扎、脊柱滚动）必须线下真人实练，网站只能练决策和流程。')}
          <div class="btn-row"><a class="btn ghost" href="#/practical">${t('Practical', '实操')}</a></div>
        </div></div>
        <div class="step"><span class="step-num">6</span><div>
          ${bi('Do not skip Jurisprudence — 25 questions, 80% to pass, the highest bar of the three. One evening of notes + a few mocks is usually enough, but only if you actually do it.',
              '别小看法规考——25 题、80% 及格，三关里及格线最高。认真过一遍笔记+几套模拟一般就够，但前提是你真的做了。')}
          <div class="btn-row"><a class="btn ghost" href="#/juris">${t('Jurisprudence exam', '法规考')}</a></div>
        </div></div>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">${t('Suggested weekly rhythm', '建议的备考节奏')}</h3>
      ${bi('Weeks 1-2: everything under Learn, front to back. Weeks 3-4: practice mode by topic, fix weak areas. Weeks 5-6: one full mock every 2-3 days + scenario runs. Final week: wrong-answer book, auto-fail flashcards, jurisprudence mocks, and rest before exam day.',
          '第1-2周：把「上课」里的内容过完。第3-4周：按主题刷练习题，补弱项。第5-6周：每2-3天一套全真模考+实操场景练习。最后一周：清错题本、背直接挂科卡、做法规模拟，考前一天好好休息。')}
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
  S.langChosen = true;
  save();
  // a page that can take the change in place (the lesson player: switch the text, keep the lesson playing) says so
  if (window.langInPlace && window.langInPlace(S.lang)) { syncTrackUI(); return; }
  route();
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
