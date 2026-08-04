// Practical exam: scenario player with official deduction rubric, timers, PCR practice,
// full-exam mock mode (1 medical + 1 trauma), and crash-safe run persistence.
import { S, save, bi, biList, t, esc, loadJSON, nav, ico} from './app.js?v=6';

// Scenarios live in several files (see data/practical/index.json) so batches can
// be authored independently; they are merged into one pool at load time.
let scenarioPool = null;
async function loadScenarios() {
  if (scenarioPool) return scenarioPool;
  const idx = await loadJSON('./data/practical/index.json');
  const files = idx ? idx.files : ['scenarios.json'];
  const parts = await Promise.all(files.map(f => loadJSON('./data/practical/' + f)));
  const scenarios = [];
  const seen = new Set();
  for (const p of parts) {
    if (!p || !p.scenarios) continue;
    for (const s of p.scenarios) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      scenarios.push(s);
    }
  }
  scenarioPool = { scenarios };
  return scenarioPool;
}
// scenarios usable on the current track: universal ones plus this track's focused ones
function trackPool(scenarios) {
  return scenarios.filter(s => !s.focus || s.focus === S.track);
}

const PHASE_NAMES = {
  dispatch: ['Dispatch', '派遣'], scene: ['Scene Assessment + PPE', '现场评估+PPE'],
  primary: ['Primary Survey', '初级评估'], transport: ['Transport Decision', '转运决策'],
  history: ['History', '病史采集'], vitals: ['Vital Signs', '生命体征'],
  fe: ['Functional Enquiry (PCP)', '系统问诊(PCP)'], exam: ['Head-to-Toe', '从头到脚检查'],
  interventions: ['Skills / Protocols / Drugs', '技能·协议·给药'], ongoing: ['Ongoing Assessment', '持续复评'],
  handoff: ['Notification · Hand-off · PCR', '通报·交接·PCR'],
};
const phaseName = id => PHASE_NAMES[id] ? t(PHASE_NAMES[id][0], PHASE_NAMES[id][1]) : id;

/* ---------------- hub ---------------- */
export async function renderPracticalHub(el) {
  const tr = S.track;
  const data = await loadScenarios();
  const pool = trackPool(data.scenarios);
  const n = pool.length;
  const med = pool.filter(s => s.type === 'medical').length;
  const runs = S.scenarioHistory;
  const pm = S.practicalMock;
  el.innerHTML = `
    <div class="card">
      <h2>${ico('ambulance')} ${t('Practical Exam Camp', '实操营')} <span class="pill ${tr}">${tr.toUpperCase()}</span></h2>
      ${bi('The real exam: one medical + one trauma scenario, 40 minutes each plus 5 minutes for the PCR. You start at 100% and every deficiency deducts — 70% passes. RTC (unstable) patients must be packaged in 15 minutes, stable patients in 30.',
           '真实考试：1 个内科 + 1 个创伤场景，每场 40 分钟另加 5 分钟写 PCR。扣分制 100% 起步，70% 及格。危重(RTC)患者 15 分钟内打包完，稳定患者 30 分钟。')}
      <div class="stat-row" style="margin-top:12px">
        <div class="stat"><b>${n}</b><span>${t('scenarios', '场景数')}</span></div>
        <div class="stat"><b>${med}/${n - med}</b><span>medical/trauma</span></div>
        <div class="stat"><b>${runs.length}</b><span>${t('runs done', '已练次数')}</span></div>
        <div class="stat"><b>${runs.length ? Math.max(...runs.map(r => r.score)) + '%' : '—'}</b><span>${t('best score', '最好成绩')}</span></div>
      </div>
    </div>
    ${pm && pm.active ? `<div class="notice" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      ${ico('cap')} ${bi(`A full practical mock is in progress — next up: the ${pm.stage} scenario.`, `你有一场全真实操模考进行中——接下来是${pm.stage === 'medical' ? '内科' : '创伤'}场景。`, 'span')}
      <a class="btn" style="margin-left:auto" href="#/scenario/${pm.ids[pm.stage]}">${t('Continue', '继续考试')} →</a>
      <button class="btn ghost" id="cancelMock">${t('Abandon', '放弃')}</button>
    </div>` : ''}
    <div class="card" style="border-color:var(--accent)">
      <h3 style="margin-top:0">${ico('cap')} ${t('Full practical mock — exam day simulation', '全真实操模考——考试日模拟')}</h3>
      ${bi('Exactly like the real day: the system randomly draws one medical and one trauma scenario. Run both under the clock; you must score 70%+ on each to pass. When time expires the scenario ends and everything not done counts against you.',
           '完全复刻真实考试日：系统随机抽 1 个内科 + 1 个创伤场景，连考两场。每场都要 70% 以上才算通过；40 分钟一到当场收卷，没做的项目全部按漏做扣分。')}
      <div class="btn-row"><button class="btn big" id="startPMock" ${pm && pm.active ? 'disabled' : ''}>▶ ${t('Draw my two scenarios', '抽签开考')}</button></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3 style="margin-top:0">${ico('film')} ${t('Practice one scenario', '单场练习')}</h3>
        ${bi('Pick any scenario and run it phase by phase against the real examiner checklist — no pressure, learn the flow.',
             '任选一个场景逐幕练，对照真实考官清单自评——没有收卷压力，先把流程练熟。')}
        <div class="btn-row"><a class="btn" href="#/scenarios">${t('Choose a scenario', '选场景')}</a></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0"> ${t('Auto-fail traps', '直接挂科陷阱')}</h3>
        ${bi('Every 100%-deduction action from the official rubric as flashcards. Know them cold.',
             '官方评分表里所有 100% 扣分（=当场挂科）的动作做成闪卡，必须背到条件反射。')}
        <div class="btn-row"><a class="btn danger" href="#/autofails">${t('Drill them', '开背')}</a></div>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">${ico('list')} ${t('The official grading rubric', '官方评分细则')}</h3>
      ${bi('Browse every scoring item and its deduction weights — this is the exact standard examiners mark you against (EMALB, March 2025).',
           '逐项浏览每个考核点和扣分权重——这就是考官手里的评分标准（EMALB 2025年3月版）。')}
      <div class="btn-row"><a class="btn secondary" href="#/rubric">${t('Open rubric', '打开细则')}</a></div>
    </div>
    <div class="notice">${t('A website trains decisions, sequencing and timing. Hands-on skills (BVM, bandaging, spinal rolls) need real-world practice with real equipment.',
      '网站能练决策、流程和时间感；动手技能（BVM、包扎、脊柱滚动）必须用真实器材线下实练。')}</div>`;
  const startBtn = el.querySelector('#startPMock');
  if (startBtn) startBtn.onclick = async () => {
    const meds = pool.filter(s => s.type === 'medical');
    const tras = pool.filter(s => s.type === 'trauma');
    if (!meds.length || !tras.length) { alert(t('Scenario pool incomplete.', '场景池还不完整。')); return; }
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    S.practicalMock = { active: true, stage: 'medical', ids: { medical: pick(meds).id, trauma: pick(tras).id }, results: [] };
    S.scenarioRun = null; run = null; save();
    nav('/scenario/' + S.practicalMock.ids.medical);
  };
  const cancelBtn = el.querySelector('#cancelMock');
  if (cancelBtn) cancelBtn.onclick = () => {
    if (!confirm(t('Abandon this mock exam?', '确定放弃本场模考？'))) return;
    S.practicalMock = null; S.scenarioRun = null; run = null; save(); renderPracticalHub(el);
  };
}

/* ---------------- scenario list ---------------- */
export async function renderScenarioList(el, arg, params) {
  const data = await loadScenarios();
  if (!data) { el.innerHTML = `<div class="card"><h2>${t('Scenarios deploying…', '场景库部署中…')}</h2></div>`; return; }
  const type = params.type || 'all';
  const list = trackPool(data.scenarios)
    .filter(s => type === 'all' || s.type === type)
    .sort((a, b) => (b.focus === S.track ? 1 : 0) - (a.focus === S.track ? 1 : 0));
  const mine = list.filter(s => s.focus === S.track).length;
  el.innerHTML = `
    <div class="card">
      <h2>${ico('film')} ${t('Scenarios', '场景库')} <span class="pill ${S.track}">${S.track.toUpperCase()}</span></h2>
      ${mine ? `<p class="tiny">${t(`${mine} scenario(s) written specifically for your scope are listed first.`, `其中 ${mine} 个是专门按你的授权范围写的，排在前面。`)}</p>` : ''}
      <div class="btn-row">
        ${['all', 'medical', 'trauma'].map(x => `<a class="btn ${type === x ? '' : 'ghost'}" href="#/scenarios?type=${x}">${x === 'all' ? t('All', '全部') : x}</a>`).join('')}
      </div>
    </div>
    <div class="list-wrap">
      ${list.map(s => {
        const best = S.scenarioHistory.filter(r => r.id === s.id).reduce((m, r) => Math.max(m, r.score), 0);
        return `<button class="list-item" data-open="${esc(s.id)}">
          <span class="pill ${s.type}">${s.type}</span>
          <span>${bi(s.titleEn, s.titleZh, 'span')}
            ${s.focus === S.track ? `<span class="tiny" style="color:var(--${S.track})"> ${t(S.track.toUpperCase() + '-focused', S.track.toUpperCase() + ' 专属')}</span>` : ''}</span>
          <span class="tag-count">${best ? best + '%' : t('new', '未练')}</span>
          <span class="li-arrow">›</span>
        </button>`;
      }).join('')}
    </div>`;
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => nav('/scenario/' + b.dataset.open));
}

/* ---------------- player ---------------- */
let run = null;
function persistRun() { S.scenarioRun = run ? { ...run } : null; save(); }
export async function renderScenarioPlayer(el, id) {
  const data = await loadScenarios();
  const sc = data && data.scenarios.find(s => s.id === id);
  if (!sc) { el.innerHTML = `<div class="card">Scenario not found</div>`; return; }
  const phases = sc.phases.filter(p => !(p.id === 'fe' && S.track === 'emr'));
  if (!run || run.id !== id) {
    // resume a saved run after a refresh; otherwise start fresh
    const saved = S.scenarioRun;
    if (saved && saved.id === id && !saved.finished) run = { ...saved };
    else run = { id, phaseIdx: 0, checks: {}, deductions: [], startedAt: null, rtcChoice: null, finished: false, timeUp: false };
  }
  drawPhase(el, sc, phases);
}
function drawPhase(el, sc, phases) {
  if (run.finished) { drawScenarioResult(el, sc); return; }
  if (run.phaseIdx >= phases.length) run.phaseIdx = phases.length - 1;
  const p = phases[run.phaseIdx];
  const started = !!run.startedAt;
  const variant = S.track === 'emr' ? [sc.emrVariantEn, sc.emrVariantZh] : [sc.pcpVariantEn, sc.pcpVariantZh];
  const inMock = isMockRun(sc);
  el.innerHTML = `
    <a class="back-link" href="${inMock ? '#/practical' : '#/scenarios'}">← ${inMock ? t('Practical camp', '实操营') : t('Scenarios', '场景库')}</a>
    <div class="card">
      <div class="q-meta">
        <h2 style="font-size:1.05rem">${bi(sc.titleEn, sc.titleZh, 'span')}</h2>
        <span style="display:flex;gap:6px">${inMock ? `<span class="pill gray">${ico('cap')} ${t('MOCK', '模考')}</span>` : ''}<span class="pill ${sc.type}">${sc.type}</span></span>
      </div>
      ${!started ? `
        <div class="sc-info"><div class="sc-label">Dispatch 派遣</div>${bi(sc.dispatchEn, sc.dispatchZh)}</div>
        ${variant[0] ? `<div class="notice">${t('Your level', '你的等级')} (${S.track.toUpperCase()}): ${bi(variant[0], variant[1], 'span')}</div>` : ''}
        ${inMock ? bi('MOCK RULES: when the 40-minute clock hits zero the scenario ends itself and every unticked item deducts, exactly like the real exam.',
                      '模考规则：40 分钟一到自动收卷，所有没勾的项目按漏做扣分——和真实考试一样。')
                 : bi('When you press start, the 40-minute exam clock begins. Work each phase as if the examiner is watching: do it, say it, then open the self-check list and be honest.',
                      '按下开始后 40 分钟考试计时启动。把每一幕当考官在场：先做、边做边口述，然后打开该幕的自评清单，诚实勾选。')}
        <div class="btn-row"><button class="btn big" id="startRun">▶ ${t('Start scenario', '开始场景')}</button></div>`
      : `
        <div class="timer-bar">
          <span>⏱ <b id="mainClock">40:00</b></span>
          <span id="pkgClockWrap" class="hidden">${ico('list')} <b id="pkgClock">--:--</b> <span class="tiny" id="pkgLabel"></span></span>
          <span style="margin-left:auto">${ico('target')} <b id="scoreNow">100%</b></span>
        </div>
        <div id="timeUpBanner" class="${run.timeUp ? '' : 'hidden'} notice" style="background:var(--red-soft);border-color:var(--red);color:#7f1d1d">
          ⏰ ${t('TIME IS UP — in the real exam the scenario ends here.', '时间到——真实考试到这里就收卷了。')}</div>
        <div class="phase-track">${phases.map((ph, i) =>
          `<span class="ph ${i < run.phaseIdx ? 'done' : i === run.phaseIdx ? 'now' : ''}">${phaseName(ph.id)}</span>`).join('')}</div>
        <h3 style="margin-top:0">${phaseName(p.id)}</h3>
        ${p.infoEn ? `<div class="sc-info"><div class="sc-label">${t('Examiner info', '考官信息')}</div>${bi(p.infoEn, p.infoZh)}</div>` : ''}
        ${p.id === 'vitals' || p.id === 'ongoing' ? vitalsTable(sc, p.id === 'ongoing' ? 1 : 0) : ''}
        ${p.id === 'transport' ? rtcChooser() : ''}
        <details class="acc" id="selfCheck">
          <summary>${ico('target')} ${t('Done it out loud? Open the self-check', '这幕做完口述完了？打开自评清单')}</summary>
          <div class="acc-body">
            <p class="tiny">${t('Tick only what you did/said out loud. Unticked items deduct at exam weight.', '只勾你真正做了/口述了的项目；没勾的按考试权重扣分。')}</p>
            ${(p.expected || []).map((ex, i) => `
              <label class="chk ${run.checks[p.id + i] ? 'done' : ''}">
                <input type="checkbox" data-chk="${p.id + i}" ${run.checks[p.id + i] ? 'checked' : ''}/>
                <span>${bi(ex.actionEn, ex.actionZh, 'span')}</span>
                <span class="chk-w">−${ex.weight}%</span>
              </label>`).join('')}
          </div>
        </details>
        <div class="btn-row">
          <button class="btn" id="nextPhase">${run.phaseIdx >= phases.length - 1 ? t('Finish & score', '结束并评分') : t('Next phase', '下一幕') + ' →'}</button>
        </div>`}
    </div>`;
  if (!started) {
    el.querySelector('#startRun').onclick = () => { run.startedAt = Date.now(); persistRun(); drawPhase(el, sc, phases); };
    return;
  }
  el.querySelectorAll('[data-chk]').forEach(c => c.onchange = () => {
    run.checks[c.dataset.chk] = c.checked;
    c.closest('.chk').classList.toggle('done', c.checked);
    persistRun();
    updateScoreNow();
  });
  el.querySelectorAll('[data-rtc]').forEach(b => b.onclick = () => { run.rtcChoice = b.dataset.rtc; persistRun(); drawPhase(el, sc, phases); });
  el.querySelector('#nextPhase').onclick = () => {
    if (p.id === 'transport' && !run.rtcChoice) { alert(t('Make your transport decision first.', '先做出转运决策。')); return; }
    scorePhase(sc, p);
    if (run.phaseIdx >= phases.length - 1) finishRun(el, sc);
    else { run.phaseIdx++; persistRun(); drawPhase(el, sc, phases); }
  };
  tickScenario(el, sc, phases);
  updateScoreNow();
}
function isMockRun(sc) {
  const pm = S.practicalMock;
  return !!(pm && pm.active && pm.ids && pm.ids[pm.stage] === sc.id);
}
function rtcChooser() {
  return `<div class="btn-row">
    <button class="btn ${run.rtcChoice === 'rtc' ? 'danger' : 'ghost'}" data-rtc="rtc">${ico('cross')} ${t('RTC / Priority — package in 15 min', 'RTC 危重——15 分钟内打包')}</button>
    <button class="btn ${run.rtcChoice === 'non-rtc' ? '' : 'ghost'}" data-rtc="non-rtc">${ico('target')} ${t('Non-RTC / Stable — package in 30 min', '非 RTC 稳定——30 分钟内打包')}</button>
  </div>`;
}
function vitalsTable(sc, setIdx) {
  const v = (sc.vitalsSets || [])[setIdx];
  if (!v) return '';
  const rows = [['GCS', v.gcs], ['BP', v.bp], ['Pulse', v.pulse], ['Resp', v.resp], ['Skin', v.skin], ['Pupils', v.pupils], ['SpO2', v.spo2], ['BGL', v.bgl], ['Temp', v.temp]].filter(r => r[1]);
  return `<details class="acc"><summary>${ico('cross')} ${t(`Vitals set ${v.set} (ask, then reveal)`, `第 ${v.set} 套生命体征（先测再看）`)}</summary>
    <div class="acc-body"><table class="vitals-table">${rows.map(r => `<tr><th>${r[0]}</th><td>${esc(r[1])}</td></tr>`).join('')}</table>
    <p class="tiny">${esc(v.timeHint || '')}</p></div></details>`;
}
function scorePhase(sc, p) {
  (p.expected || []).forEach((ex, i) => {
    if (!run.checks[p.id + i]) {
      run.deductions.push({ phase: p.id, actionEn: ex.actionEn, actionZh: ex.actionZh, weight: ex.weight, ref: ex.rubricRef });
    }
  });
  if (p.id === 'transport' && run.rtcChoice && run.rtcChoice !== sc.priority) {
    run.deductions.push({ phase: 'transport', actionEn: `Wrong transport category (correct: ${sc.priority.toUpperCase()})`, actionZh: `转运分类错误（正确：${sc.priority === 'rtc' ? 'RTC 危重' : '非 RTC 稳定'}）`, weight: 25, ref: 'transport' });
  }
}
// time expired in mock mode: everything not yet committed counts as missed
function commitRemaining(sc, phases) {
  for (let i = run.phaseIdx; i < phases.length; i++) scorePhase(sc, phases[i]);
}
function finishRun(el, sc) {
  run.finished = true;
  S.scenarioRun = null; save();
  drawScenarioResult(el, sc);
}
function currentScore() {
  // caps: fe & exam sections cap at 15 per the official rubric
  let feDed = 0, examDed = 0, other = 0;
  for (const d of run.deductions) {
    if (d.phase === 'fe') feDed += d.weight;
    else if (d.phase === 'exam') examDed += d.weight;
    else other += d.weight;
  }
  return Math.max(0, 100 - other - Math.min(feDed, 15) - Math.min(examDed, 15));
}
function updateScoreNow() {
  const elS = document.getElementById('scoreNow');
  if (!elS) return;
  const s = currentScore();
  elS.textContent = s + '%';
  elS.style.color = s < 70 ? 'var(--red)' : 'var(--green)';
}
let scTick = null;
function tickScenario(el, sc, phases) {
  clearInterval(scTick);
  scTick = setInterval(() => {
    const mc = document.getElementById('mainClock');
    if (!mc || !run || run.finished || !run.startedAt) { clearInterval(scTick); return; }
    const elapsed = Date.now() - run.startedAt;
    const left = 40 * 60000 - elapsed;
    mc.textContent = fmt(Math.max(0, left));
    mc.style.color = left < 5 * 60000 ? 'var(--red)' : left < 10 * 60000 ? 'var(--yellow)' : '';
    if (left <= 0 && !run.timeUp) {
      run.timeUp = true; persistRun();
      if (isMockRun(sc)) { clearInterval(scTick); commitRemaining(sc, phases); finishRun(el, sc); return; }
      const banner = document.getElementById('timeUpBanner');
      if (banner) banner.classList.remove('hidden');
    }
    const wrap = document.getElementById('pkgClockWrap');
    if (wrap && run.rtcChoice) {
      wrap.classList.remove('hidden');
      const target = (run.rtcChoice === 'rtc' ? 15 : 30) * 60000;
      const pc = document.getElementById('pkgClock');
      const pl = document.getElementById('pkgLabel');
      const pkgLeft = target - elapsed;
      pc.textContent = fmt(pkgLeft);
      pl.textContent = t('to package', '打包倒计时');
      pc.style.color = pkgLeft < 0 ? 'var(--red)' : pkgLeft < 3 * 60000 ? 'var(--yellow)' : '';
    }
  }, 500);
}
function fmt(ms) {
  const neg = ms < 0; const s = Math.floor(Math.abs(ms) / 1000);
  return (neg ? '-' : '') + `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ---------------- result ---------------- */
let pcrTick = null;
function drawScenarioResult(el, sc) {
  clearInterval(scTick);
  const score = currentScore();
  const pass = score >= 70;
  const mins = run.startedAt ? Math.round((Date.now() - run.startedAt) / 60000) : 0;
  if (!run.saved) {
    S.scenarioHistory.push({ id: sc.id, date: new Date().toISOString().slice(0, 10), score, pass });
    run.saved = true;
    // full-mock bookkeeping
    const pm = S.practicalMock;
    if (pm && pm.active && pm.ids[pm.stage] === sc.id && !pm.results.find(r => r.id === sc.id)) {
      pm.results.push({ id: sc.id, type: sc.type, score, pass });
      if (pm.stage === 'medical') pm.stage = 'trauma';
      else pm.active = false;
    }
    save();
  }
  const pm = S.practicalMock;
  const mockNextId = pm && pm.active && pm.results.length === 1 ? pm.ids.trauma : null;
  const mockDone = pm && !pm.active && pm.results && pm.results.length === 2 && pm.results.find(r => r.id === sc.id);
  const autoFails = run.deductions.filter(d => d.weight >= 100);
  el.innerHTML = `
    <a class="back-link" href="${pm && (pm.active || mockDone) ? '#/practical' : '#/scenarios'}">← ${pm && (pm.active || mockDone) ? t('Practical camp', '实操营') : t('Scenarios', '场景库')}</a>
    <div class="card score-hero">
      <div class="score-big ${pass ? 'pass' : 'fail'}">${score}%</div>
      <p><b>${bi(sc.titleEn, sc.titleZh, 'span')}</b></p>
      <p class="muted">${pass ? t('PASS — 70% needed', '通过——及格线 70%') : t('BELOW 70% — review the deductions', '低于 70%——复盘扣分项')} · ${mins} min${run.timeUp ? ' · ⏰ ' + t('time expired', '到点收卷') : ''}</p>
    </div>
    ${mockNextId ? `<div class="card" style="border-color:var(--accent);text-align:center">
      <h3 style="margin-top:0">${ico('cap')} ${t('Mock exam: scenario 1 of 2 complete', '模考：第 1 场结束')}</h3>
      ${bi('Take a breath. The trauma scenario is next — in the real exam you would move to the second room now.',
           '喘口气，接下来是创伤场景——真实考试现在就会带你去第二个考场。')}
      <div class="btn-row" style="justify-content:center"><button class="btn big" id="nextMock">▶ ${t('Start trauma scenario', '开始创伤场景')}</button></div>
    </div>` : ''}
    ${mockDone ? mockSummary(pm) : ''}
    ${autoFails.length ? `<div class="card" style="border-color:var(--red);background:var(--red-soft)">
      <h3 style="margin-top:0;color:var(--red)"> ${t('AUTO-FAIL', '直接挂科')}</h3>
      ${bi('You missed a 100%-deduction item. In the real exam this ends the scenario as a fail regardless of everything else you did well.',
           '你踩到了 100% 扣分项。在真实考试里这一条就直接判挂，不管你其它地方做得多好。')}
      <ul style="margin-top:8px">${autoFails.map(d => `<li>${bi(d.actionEn, d.actionZh, 'span')}</li>`).join('')}</ul>
    </div>` : ''}
    ${run.deductions.length ? `<div class="card">
      <h3 style="margin-top:0">${t('Deductions taken', '被扣的分')}</h3>
      <ul class="deduct-list" style="list-style:none">
        ${run.deductions.sort((a, b) => b.weight - a.weight).map(d => `<li>
          <span>${bi(d.actionEn, d.actionZh, 'span')} <span class="tiny">(${phaseName(d.phase)})</span>
            ${d.ref ? ` <a class="tiny" href="#/rubric?item=${esc(d.ref)}">${ico('book')} ${t('rubric', '查细则')}</a>` : ''}</span>
          <b style="color:var(--red)">−${d.weight}%</b></li>`).join('')}
      </ul>
      <p class="tiny">${t('Functional enquiry and head-to-toe deductions are capped at −15% each, as in the real rubric.', '系统问诊和从头到脚检查的扣分按官方规则各封顶 −15%。')}</p>
    </div>` : `<div class="card"><h3>${ico('target')} ${t('Clean run — zero deductions', '零扣分完美运行')}</h3></div>`}
    ${(sc.criticalPitfallsEn || []).length ? `<div class="card">
      <h3 style="margin-top:0"> ${t('Auto-fail traps in this scenario', '本场景的直接挂科陷阱')}</h3>
      <ul>${biList(sc.criticalPitfallsEn, sc.criticalPitfallsZh)}</ul></div>` : ''}
    <div class="card">
      <h3 style="margin-top:0"> ${t('Model hand-off report', '示范交接报告')}</h3>
      <details class="acc"><summary>${t('Write/say yours first, then reveal', '先自己说一遍，再看示范')}</summary>
        <div class="acc-body">${bi(sc.handoffModelEn, sc.handoffModelZh)}</div></details>
    </div>
    <div class="card">
      <h3 style="margin-top:0">${ico('list')} ${t('PCR practice — 5 minutes, like the real exam', 'PCR 练习——限时 5 分钟，和真考一样')}</h3>
      <div class="btn-row" style="margin-top:0;margin-bottom:8px">
        <button class="btn secondary" id="pcrTimerBtn">▶ ${t('Start the 5-minute clock', '启动 5 分钟计时')}</button>
        <span class="q-timer hidden" id="pcrClock">05:00</span>
      </div>
      <textarea class="pcr-box" id="pcrBox" placeholder="${t('Write your patient care report here…', '在这里写你的 PCR…')}"></textarea>
      <div class="btn-row"><button class="btn secondary" id="revealPcr">${t('Reveal key points', '看关键点对照')}</button></div>
      <div id="pcrKey"></div>
    </div>
    <div class="btn-row">
      ${mockNextId || mockDone ? '' : `<button class="btn" id="againBtn">${ico('clock')} ${t('Run again', '再来一遍')}</button>
      <a class="btn ghost" href="#/scenarios">${t('Another scenario', '换个场景')}</a>`}
    </div>`;
  const nextBtn = el.querySelector('#nextMock');
  if (nextBtn) nextBtn.onclick = () => { run = null; S.scenarioRun = null; save(); nav('/scenario/' + mockNextId); };
  const againBtn = el.querySelector('#againBtn');
  if (againBtn) againBtn.onclick = () => { run = null; S.scenarioRun = null; save(); renderScenarioPlayer(document.getElementById('view'), sc.id); };
  el.querySelector('#revealPcr').onclick = () => {
    const k = sc.pcrKeyPoints || {};
    document.getElementById('pcrKey').innerHTML = `<table class="vitals-table" style="margin-top:10px">
      ${Object.entries(k).map(([f, v]) => `<tr><th>${esc(f)}</th><td>${esc(Array.isArray(v) ? v.join('; ') : v)}</td></tr>`).join('')}</table>`;
  };
  el.querySelector('#pcrTimerBtn').onclick = () => {
    const clock = el.querySelector('#pcrClock');
    const box = el.querySelector('#pcrBox');
    clock.classList.remove('hidden');
    el.querySelector('#pcrTimerBtn').disabled = true;
    box.focus();
    const end = Date.now() + 5 * 60000;
    clearInterval(pcrTick);
    pcrTick = setInterval(() => {
      const left = end - Date.now();
      if (!document.getElementById('pcrClock')) { clearInterval(pcrTick); return; }
      clock.textContent = fmt(Math.max(0, left));
      clock.className = 'q-timer' + (left < 60000 ? ' crit' : left < 2 * 60000 ? ' warn' : '');
      if (left <= 0) {
        clearInterval(pcrTick);
        box.readOnly = true;
        box.style.background = 'var(--bg)';
        clock.textContent = t('Time — pens down', '时间到，收笔');
      }
    }, 500);
  };
}
function mockSummary(pm) {
  const bothPass = pm.results.length === 2 && pm.results.every(r => r.pass);
  return `<div class="card" style="border-color:${bothPass ? 'var(--green)' : 'var(--red)'}">
    <h3 style="margin-top:0">${ico('cap')} ${t('Full practical mock — final result', '全真实操模考——总成绩')}</h3>
    ${pm.results.map(r => `<div class="area-bar ${r.pass ? 'band-lgreen' : 'band-red'}">
      <span class="area-tag">${r.score}</span>
      <div><b>${r.type}</b> · ${r.pass ? t('PASS', '通过') : t('FAIL', '未过')} <span class="tiny">(${esc(r.id)})</span></div></div>`).join('')}
    <p style="margin-top:10px"><b>${bothPass
      ? ico('target') + ' ' + t('You passed both scenarios — exam-day standard met.', '两场全部通过——达到考试日标准！')
      : ico('x') + ' ' + t('The real exam requires 70%+ on BOTH scenarios. Fail one, and you are reassigned another of the same type.', '真实考试要求两场都 70% 以上。挂哪类，补考就重抽哪类。')}</b></p>
  </div>`;
}

/* ---------------- rubric browser ---------------- */
export async function renderRubricBrowser(el, arg, params) {
  const r = await loadJSON('./data/practical/rubric.json');
  if (!r) { el.innerHTML = `<div class="card"><h2>${t('Rubric deploying…', '评分细则部署中…')}</h2></div>`; return; }
  const wcls = w => w >= 100 ? 'w100' : w >= 25 ? 'wbig' : w >= 10 ? 'wmid' : 'wsm';
  el.innerHTML = `
    <a class="back-link" href="#/practical">← ${t('Practical camp', '实操营')}</a>
    <div class="card">
      <h2>${ico('list')} ${t('Official Grading Rubric', '官方评分细则')}</h2>
      <p class="tiny">${esc(r.meta.source)} · ${esc(r.meta.sourceVersion)} · ${t('start at 100%, pass at 70%', '100% 起扣，70% 及格')}</p>
      <h3>${t('Deficiency levels', '缺陷分级')}</h3>
      <details class="acc"><summary>*** Major</summary><div class="acc-body"><ul>${biList(r.deficiencyLevels.majorEn, r.deficiencyLevels.majorZh)}</ul></div></details>
      <details class="acc"><summary>** Moderate</summary><div class="acc-body"><ul>${biList(r.deficiencyLevels.moderateEn, r.deficiencyLevels.moderateZh)}</ul></div></details>
      <details class="acc"><summary>* Minor</summary><div class="acc-body"><ul>${biList(r.deficiencyLevels.minorEn, r.deficiencyLevels.minorZh)}</ul></div></details>
    </div>
    ${r.sections.filter(s => !(s.licence === 'pcp' && S.track === 'emr')).map(sec => `
      <div class="card">
        <h3 style="margin-top:0">${bi(sec.nameEn, sec.nameZh, 'span')} ${sec.licence === 'pcp' ? '<span class="pill pcp">PCP</span>' : ''}
          ${sec.capDeduction ? `<span class="pill gray">cap −${sec.capDeduction}%</span>` : ''}</h3>
        ${sec.items.map(it => `
          <details class="acc" id="rub-${esc(it.id)}">
            <summary>${bi(it.nameEn, it.nameZh, 'span')} <span style="margin-left:auto;display:flex;gap:4px">${it.weights.map(w => `<span class="rubric-w ${wcls(w)}">${w}%</span>`).join('')}</span></summary>
            <div class="acc-body">
              ${it.errorsByWeight.map(g => `
                <div class="detail-section"><h4><span class="rubric-w ${wcls(g.weight)}">−${g.weight}%</span></h4>
                <ul>${biList(g.errorsEn, g.errorsZh)}</ul></div>`).join('')}
              ${(it.commentsEn || []).length ? `<div class="detail-section"><h4>${t('Examiner notes', '考官备注')}</h4><ul>${biList(it.commentsEn, it.commentsZh)}</ul></div>` : ''}
            </div>
          </details>`).join('')}
      </div>`).join('')}
    ${r.painManagementRules ? `<div class="card">
      <h3 style="margin-top:0">${ico('pill')} ${t('Pain Management special rules (Appendix A)', '疼痛管理专项扣分规则 (附录A)')}</h3>
      <ul>${biList(r.painManagementRules.rulesEn, r.painManagementRules.rulesZh)}</ul></div>` : ''}`;
  // deep link from a deduction: open and scroll to the referenced item
  if (params && params.item) {
    const target = el.querySelector('#rub-' + CSS.escape(params.item));
    if (target) {
      target.open = true;
      target.style.borderColor = 'var(--accent)';
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }
}

/* ---------------- auto-fail flashcards ---------------- */
export async function renderAutoFails(el) {
  const r = await loadJSON('./data/practical/rubric.json');
  if (!r || !r.autoFails) { el.innerHTML = `<div class="card"><h2>${t('Deploying…', '部署中…')}</h2></div>`; return; }
  let order = shuffle(r.autoFails.map((_, i) => i)), pos = 0, revealed = false;
  const draw = () => {
    const af = r.autoFails[order[pos]];
    el.innerHTML = `
      <a class="back-link" href="#/practical">← ${t('Practical camp', '实操营')}</a>
      <div class="card">
        <h2> ${t('Auto-fail flashcards', '直接挂科闪卡')} <span class="tag-count">${pos + 1}/${order.length}</span></h2>
        ${bi('These actions (or omissions) are worth a 100% deduction — instant fail. Tap the card to reveal.', '这些动作（或不作为）直接扣 100% = 当场挂科。点卡片翻面。')}
        <div class="flash ${revealed ? 'revealed' : ''}" id="flashCard">
          ${revealed
            ? `<div style="font-size:1.05rem">${bi(af.actionEn, af.actionZh)}</div><div class="flash-hint">${esc(af.itemId || '')}</div>`
            : `<div style="font-size:2rem">${ico('skull')}</div><div class="flash-hint">${t('Auto-fail #' + (pos + 1) + ' — can you name it? Tap to reveal.', '第 ' + (pos + 1) + ' 个挂科点——你能说出来吗？点开看。')}</div>`}
        </div>
        <div class="btn-row">
          <button class="btn ghost" id="prevF" ${pos === 0 ? 'disabled' : ''}>←</button>
          <button class="btn" id="nextF">${pos >= order.length - 1 ? t('Shuffle & restart', '洗牌重来') : t('Next', '下一张') + ' →'}</button>
        </div>
      </div>`;
    el.querySelector('#flashCard').onclick = () => { revealed = !revealed; draw(); };
    el.querySelector('#prevF').onclick = () => { pos--; revealed = false; draw(); };
    el.querySelector('#nextF').onclick = () => {
      if (pos >= order.length - 1) { order = shuffle(order); pos = 0; } else pos++;
      revealed = false; draw();
    };
  };
  draw();
}
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
