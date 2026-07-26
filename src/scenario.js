// Practical exam: scenario player with official deduction rubric, timers, PCR practice
import { S, save, bi, biList, t, esc, loadJSON, nav } from './app.js';

const PHASE_NAMES = {
  dispatch: ['Dispatch', '派遣'], scene: ['Scene Assessment + PPE', '现场评估+PPE'],
  primary: ['Primary Survey', '初级评估'], transport: ['Transport Decision', '转运决策'],
  history: ['History', '病史采集'], vitals: ['Vital Signs', '生命体征'],
  fe: ['Functional Enquiry (PCP)', '系统问诊(PCP)'], exam: ['Head-to-Toe', '从头到脚检查'],
  interventions: ['Skills / Protocols / Drugs', '技能·协议·给药'], ongoing: ['Ongoing Assessment', '持续复评'],
  handoff: ['Notification · Hand-off · PCR', '通报·交接·PCR'],
};

/* ---------------- hub ---------------- */
export async function renderPracticalHub(el) {
  const tr = S.track;
  const data = await loadJSON('./data/practical/scenarios.json');
  const rubric = await loadJSON('./data/practical/rubric.json');
  const n = data ? data.scenarios.length : 0;
  const med = data ? data.scenarios.filter(s => s.type === 'medical').length : 0;
  const runs = S.scenarioHistory;
  el.innerHTML = `
    <div class="card">
      <h2>🚑 ${t('Practical Exam Camp', '实操营')} <span class="pill ${tr}">${tr.toUpperCase()}</span></h2>
      ${bi('The real exam: one medical + one trauma scenario, 40 minutes each plus 5 minutes for the PCR. You start at 100% and every deficiency deducts — 70% passes. RTC (unstable) patients must be packaged in 15 minutes, stable patients in 30.',
           '真实考试：1 个内科 + 1 个创伤场景，每场 40 分钟另加 5 分钟写 PCR。扣分制 100% 起步，70% 及格。危重(RTC)患者 15 分钟内打包完，稳定患者 30 分钟。')}
      <div class="stat-row" style="margin-top:12px">
        <div class="stat"><b>${n}</b><span>${t('scenarios', '场景数')}</span></div>
        <div class="stat"><b>${med}/${n - med}</b><span>medical/trauma</span></div>
        <div class="stat"><b>${runs.length}</b><span>${t('runs done', '已练次数')}</span></div>
        <div class="stat"><b>${runs.length ? Math.max(...runs.map(r => r.score)) + '%' : '—'}</b><span>${t('best score', '最好成绩')}</span></div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3 style="margin-top:0">🎬 ${t('Scenario simulator', '场景模拟器')}</h3>
        ${bi('Run a full call phase by phase against the real examiner checklist, with live deduction scoring and the packaging clock.',
             '按真实考官清单逐幕跑完整个 call，实时扣分计分，附打包倒计时。')}
        <div class="btn-row"><a class="btn" href="#/scenarios">${t('Choose a scenario', '选场景')}</a></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">☠️ ${t('Auto-fail traps', '直接挂科陷阱')}</h3>
        ${bi('Every 100%-deduction action from the official rubric as flashcards. Know them cold.',
             '官方评分表里所有 100% 扣分（=当场挂科）的动作做成闪卡，必须背到条件反射。')}
        <div class="btn-row"><a class="btn danger" href="#/autofails">${t('Drill them', '开背')}</a></div>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">📋 ${t('The official grading rubric', '官方评分细则')}</h3>
      ${bi('Browse every scoring item and its deduction weights — this is the exact standard examiners mark you against (EMALB, March 2025).',
           '逐项浏览每个考核点和扣分权重——这就是考官手里的评分标准（EMALB 2025年3月版）。')}
      <div class="btn-row"><a class="btn secondary" href="#/rubric">${t('Open rubric', '打开细则')}</a></div>
    </div>
    <div class="notice">${t('A website trains decisions, sequencing and timing. Hands-on skills (BVM, bandaging, spinal rolls) need real-world practice with real equipment.',
      '网站能练决策、流程和时间感；动手技能（BVM、包扎、脊柱滚动）必须用真实器材线下实练。')}</div>`;
}

/* ---------------- scenario list ---------------- */
export async function renderScenarioList(el, arg, params) {
  const data = await loadJSON('./data/practical/scenarios.json');
  if (!data) { el.innerHTML = `<div class="card"><h2>${t('Scenarios deploying…', '场景库部署中…')}</h2></div>`; return; }
  const type = params.type || 'all';
  const list = data.scenarios.filter(s => type === 'all' || s.type === type);
  el.innerHTML = `
    <div class="card">
      <h2>🎬 ${t('Scenarios', '场景库')}</h2>
      <div class="btn-row">
        ${['all', 'medical', 'trauma'].map(x => `<a class="btn ${type === x ? '' : 'ghost'}" href="#/scenarios?type=${x}">${x === 'all' ? t('All', '全部') : x}</a>`).join('')}
      </div>
    </div>
    <div class="list-wrap">
      ${list.map(s => {
        const best = S.scenarioHistory.filter(r => r.id === s.id).reduce((m, r) => Math.max(m, r.score), 0);
        return `<button class="list-item" data-open="${esc(s.id)}">
          <span class="pill ${s.type}">${s.type}</span>
          <span>${bi(s.titleEn, s.titleZh, 'span')}</span>
          <span class="tag-count">${best ? best + '%' : t('new', '未练')}</span>
          <span class="li-arrow">›</span>
        </button>`;
      }).join('')}
    </div>`;
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => nav('/scenario/' + b.dataset.open));
}

/* ---------------- player ---------------- */
let run = null;
export async function renderScenarioPlayer(el, id) {
  const data = await loadJSON('./data/practical/scenarios.json');
  const sc = data && data.scenarios.find(s => s.id === id);
  if (!sc) { el.innerHTML = `<div class="card">Scenario not found</div>`; return; }
  const phases = sc.phases.filter(p => !(p.id === 'fe' && S.track === 'emr'));
  if (!run || run.id !== id) {
    run = { id, phaseIdx: 0, checks: {}, deductions: [], startedAt: null, rtcChoice: null, finished: false };
  }
  drawPhase(el, sc, phases);
}
function drawPhase(el, sc, phases) {
  if (run.finished) { drawScenarioResult(el, sc); return; }
  const p = phases[run.phaseIdx];
  const started = !!run.startedAt;
  const variant = S.track === 'emr' ? [sc.emrVariantEn, sc.emrVariantZh] : [sc.pcpVariantEn, sc.pcpVariantZh];
  el.innerHTML = `
    <a class="back-link" href="#/scenarios">← ${t('Scenarios', '场景库')}</a>
    <div class="card">
      <div class="q-meta">
        <h2 style="font-size:1.05rem">${bi(sc.titleEn, sc.titleZh, 'span')}</h2>
        <span class="pill ${sc.type}">${sc.type}</span>
      </div>
      ${!started ? `
        <div class="sc-info"><div class="sc-label">Dispatch 派遣</div>${bi(sc.dispatchEn, sc.dispatchZh)}</div>
        ${variant[0] ? `<div class="notice">${t('Your level', '你的等级')} (${S.track.toUpperCase()}): ${bi(variant[0], variant[1], 'span')}</div>` : ''}
        ${bi('When you press start, the 40-minute exam clock begins. Work each phase as if the examiner is watching: do it, say it, then open the self-check list and be honest.',
             '按下开始后 40 分钟考试计时启动。把每一幕当考官在场：先做、边做边口述，然后打开该幕的自评清单，诚实勾选。')}
        <div class="btn-row"><button class="btn big" id="startRun">▶ ${t('Start scenario', '开始场景')}</button></div>`
      : `
        <div class="timer-bar">
          <span>⏱ <b id="mainClock">40:00</b></span>
          <span id="pkgClockWrap" class="hidden">📦 <b id="pkgClock">--:--</b> <span class="tiny" id="pkgLabel"></span></span>
          <span style="margin-left:auto">💯 <b id="scoreNow">100%</b></span>
        </div>
        <div class="phase-track">${phases.map((ph, i) =>
          `<span class="ph ${i < run.phaseIdx ? 'done' : i === run.phaseIdx ? 'now' : ''}">${PHASE_NAMES[ph.id] ? PHASE_NAMES[ph.id][0] : ph.id}</span>`).join('')}</div>
        <h3 style="margin-top:0">${PHASE_NAMES[p.id] ? t(PHASE_NAMES[p.id][0], PHASE_NAMES[p.id][1]) : p.id}</h3>
        ${p.infoEn ? `<div class="sc-info"><div class="sc-label">${t('Examiner info', '考官信息')}</div>${bi(p.infoEn, p.infoZh)}</div>` : ''}
        ${p.id === 'vitals' || p.id === 'ongoing' ? vitalsTable(sc, p.id === 'ongoing' ? 1 : 0) : ''}
        ${p.id === 'transport' ? rtcChooser() : ''}
        <details class="acc" id="selfCheck">
          <summary>✅ ${t('Self-check: what did you actually do?', '自评清单：你刚才真的做了哪些？')}</summary>
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
  if (!started) { el.querySelector('#startRun').onclick = () => { run.startedAt = Date.now(); drawPhase(el, sc, phases); }; return; }
  el.querySelectorAll('[data-chk]').forEach(c => c.onchange = () => { run.checks[c.dataset.chk] = c.checked; c.closest('.chk').classList.toggle('done', c.checked); updateScoreNow(sc, phases); });
  const rtcBtns = el.querySelectorAll('[data-rtc]');
  rtcBtns.forEach(b => b.onclick = () => { run.rtcChoice = b.dataset.rtc; drawPhase(el, sc, phases); });
  el.querySelector('#nextPhase').onclick = () => {
    if (p.id === 'transport' && !run.rtcChoice) { alert(t('Make your transport decision first.', '先做出转运决策。')); return; }
    scorePhase(sc, p);
    if (run.phaseIdx >= phases.length - 1) { run.finished = true; drawScenarioResult(el, sc); }
    else { run.phaseIdx++; drawPhase(el, sc, phases); }
  };
  tickScenario(sc);
  updateScoreNow(sc, phases);
}
function rtcChooser() {
  return `<div class="btn-row">
    <button class="btn ${run.rtcChoice === 'rtc' ? 'danger' : 'ghost'}" data-rtc="rtc">🚨 ${t('RTC / Priority — package in 15 min', 'RTC 危重——15 分钟内打包')}</button>
    <button class="btn ${run.rtcChoice === 'non-rtc' ? '' : 'ghost'}" data-rtc="non-rtc">🟢 ${t('Non-RTC / Stable — package in 30 min', '非 RTC 稳定——30 分钟内打包')}</button>
  </div>`;
}
function vitalsTable(sc, setIdx) {
  const v = (sc.vitalsSets || [])[setIdx];
  if (!v) return '';
  const rows = [['GCS', v.gcs], ['BP', v.bp], ['Pulse', v.pulse], ['Resp', v.resp], ['Skin', v.skin], ['Pupils', v.pupils], ['SpO2', v.spo2], ['BGL', v.bgl], ['Temp', v.temp]].filter(r => r[1]);
  return `<details class="acc"><summary>🩺 ${t(`Vitals set ${v.set} (ask, then reveal)`, `第 ${v.set} 套生命体征（先测再看）`)}</summary>
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
function currentScore(capped = true) {
  // caps: fe & exam sections cap at 15 per official rubric
  let feDed = 0, examDed = 0, other = 0;
  for (const d of run.deductions) {
    if (d.phase === 'fe') feDed += d.weight;
    else if (d.phase === 'exam') examDed += d.weight;
    else other += d.weight;
  }
  if (capped) { feDed = Math.min(feDed, 15); examDed = Math.min(examDed, 15); }
  return Math.max(0, 100 - other - feDed - examDed);
}
function updateScoreNow(sc, phases) {
  const el = document.getElementById('scoreNow');
  if (!el) return;
  // live estimate: committed deductions + unticked in current phase
  const p = phases[run.phaseIdx];
  let pending = 0;
  (p.expected || []).forEach((ex, i) => { if (!run.checks[p.id + i]) pending += 0; }); // pending not counted until committed
  const s = currentScore();
  el.textContent = s + '%';
  el.style.color = s < 70 ? 'var(--red)' : 'var(--green)';
}
let scTick = null;
function tickScenario(sc) {
  clearInterval(scTick);
  scTick = setInterval(() => {
    const mc = document.getElementById('mainClock');
    if (!mc || !run || run.finished || !run.startedAt) { clearInterval(scTick); return; }
    const elapsed = Date.now() - run.startedAt;
    const left = 40 * 60000 - elapsed;
    mc.textContent = fmt(left);
    mc.style.color = left < 5 * 60000 ? 'var(--red)' : left < 10 * 60000 ? 'var(--yellow)' : '';
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
function drawScenarioResult(el, sc) {
  clearInterval(scTick);
  const score = currentScore();
  const pass = score >= 70;
  const mins = run.startedAt ? Math.round((Date.now() - run.startedAt) / 60000) : 0;
  if (!run.saved) {
    S.scenarioHistory.push({ id: sc.id, date: new Date().toISOString().slice(0, 10), score, pass });
    save(); run.saved = true;
  }
  const autoFails = run.deductions.filter(d => d.weight >= 100);
  el.innerHTML = `
    <a class="back-link" href="#/scenarios">← ${t('Scenarios', '场景库')}</a>
    <div class="card score-hero">
      <div class="score-big ${pass ? 'pass' : 'fail'}">${score}%</div>
      <p><b>${bi(sc.titleEn, sc.titleZh, 'span')}</b></p>
      <p class="muted">${pass ? t('PASS — 70% needed', '通过——及格线 70%') : t('BELOW 70% — review the deductions', '低于 70%——复盘扣分项')} · ${mins} min</p>
    </div>
    ${autoFails.length ? `<div class="card" style="border-color:var(--red);background:var(--red-soft)">
      <h3 style="margin-top:0;color:var(--red)">☠️ ${t('AUTO-FAIL', '直接挂科')}</h3>
      ${bi('You missed a 100%-deduction item. In the real exam this ends the scenario as a fail regardless of everything else you did well.',
           '你踩到了 100% 扣分项。在真实考试里这一条就直接判挂，不管你其它地方做得多好。')}
      <ul style="margin-top:8px">${autoFails.map(d => `<li>${bi(d.actionEn, d.actionZh, 'span')}</li>`).join('')}</ul>
    </div>` : ''}
    ${run.deductions.length ? `<div class="card">
      <h3 style="margin-top:0">${t('Deductions taken', '被扣的分')}</h3>
      <ul class="deduct-list" style="list-style:none">
        ${run.deductions.sort((a, b) => b.weight - a.weight).map(d => `<li>
          <span>${bi(d.actionEn, d.actionZh, 'span')} <span class="tiny">(${PHASE_NAMES[d.phase] ? PHASE_NAMES[d.phase][0] : d.phase})</span></span>
          <b style="color:var(--red)">−${d.weight}%</b></li>`).join('')}
      </ul>
      <p class="tiny">${t('Functional enquiry and head-to-toe deductions are capped at −15% each, as in the real rubric.', '系统问诊和从头到脚检查的扣分按官方规则各封顶 −15%。')}</p>
    </div>` : `<div class="card"><h3>🏆 ${t('Clean run — zero deductions', '零扣分完美运行')}</h3></div>`}
    ${(sc.criticalPitfallsEn || []).length ? `<div class="card">
      <h3 style="margin-top:0">☠️ ${t('Auto-fail traps in this scenario', '本场景的直接挂科陷阱')}</h3>
      <ul>${biList(sc.criticalPitfallsEn, sc.criticalPitfallsZh)}</ul></div>` : ''}
    <div class="card">
      <h3 style="margin-top:0">🗣️ ${t('Model hand-off report', '示范交接报告')}</h3>
      <details class="acc"><summary>${t('Write/say yours first, then reveal', '先自己说一遍，再看示范')}</summary>
        <div class="acc-body">${bi(sc.handoffModelEn, sc.handoffModelZh)}</div></details>
    </div>
    <div class="card">
      <h3 style="margin-top:0">📄 ${t('PCR practice (5 minutes in the real exam)', 'PCR 练习（真考限时 5 分钟）')}</h3>
      <textarea class="pcr-box" id="pcrBox" placeholder="${t('Write your patient care report here…', '在这里写你的 PCR…')}"></textarea>
      <div class="btn-row"><button class="btn secondary" id="revealPcr">${t('Reveal key points', '看关键点对照')}</button></div>
      <div id="pcrKey"></div>
    </div>
    <div class="btn-row">
      <button class="btn" id="againBtn">🔁 ${t('Run again', '再来一遍')}</button>
      <a class="btn ghost" href="#/scenarios">${t('Another scenario', '换个场景')}</a>
    </div>`;
  el.querySelector('#againBtn').onclick = () => { run = null; nav('/scenario/' + sc.id); renderScenarioPlayer(document.getElementById('view'), sc.id); };
  el.querySelector('#revealPcr').onclick = () => {
    const k = sc.pcrKeyPoints || {};
    document.getElementById('pcrKey').innerHTML = `<table class="vitals-table" style="margin-top:10px">
      ${Object.entries(k).map(([f, v]) => `<tr><th>${esc(f)}</th><td>${esc(Array.isArray(v) ? v.join('; ') : v)}</td></tr>`).join('')}</table>`;
  };
}

/* ---------------- rubric browser ---------------- */
export async function renderRubricBrowser(el) {
  const r = await loadJSON('./data/practical/rubric.json');
  if (!r) { el.innerHTML = `<div class="card"><h2>${t('Rubric deploying…', '评分细则部署中…')}</h2></div>`; return; }
  const wcls = w => w >= 100 ? 'w100' : w >= 25 ? 'wbig' : w >= 10 ? 'wmid' : 'wsm';
  el.innerHTML = `
    <a class="back-link" href="#/practical">← ${t('Practical camp', '实操营')}</a>
    <div class="card">
      <h2>📋 ${t('Official Grading Rubric', '官方评分细则')}</h2>
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
          <details class="acc">
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
      <h3 style="margin-top:0">💊 ${t('Pain Management special rules (Appendix A)', '疼痛管理专项扣分规则 (附录A)')}</h3>
      <ul>${biList(r.painManagementRules.rulesEn, r.painManagementRules.rulesZh)}</ul></div>` : ''}`;
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
        <h2>☠️ ${t('Auto-fail flashcards', '直接挂科闪卡')} <span class="tag-count">${pos + 1}/${order.length}</span></h2>
        ${bi('These actions (or omissions) are worth a 100% deduction — instant fail. Tap the card to reveal.', '这些动作（或不作为）直接扣 100% = 当场挂科。点卡片翻面。')}
        <div class="flash ${revealed ? 'revealed' : ''}" id="flashCard">
          ${revealed
            ? `<div style="font-size:1.05rem">${bi(af.actionEn, af.actionZh)}</div><div class="flash-hint">${esc(af.itemId || '')}</div>`
            : `<div style="font-size:2rem">💀</div><div class="flash-hint">${t('Auto-fail #' + (pos + 1) + ' — can you name it? Tap to reveal.', '第 ' + (pos + 1) + ' 个挂科点——你能说出来吗？点开看。')}</div>`}
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
