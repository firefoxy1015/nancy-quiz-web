// Written exam engine: practice mode + blueprint-weighted mock + wrongbook
import { S, save, bi, t, esc, loadJSON, loadBank, nav, ico} from './app.js?v=7';

let session = null; // current exam session (mock or practice)

/* ---------------- hub ---------------- */
export async function renderWrittenHub(el) {
  const tr = S.track;
  const bank = await loadBank(tr);
  const bp = await loadJSON('./data/meta/cpcf-blueprint.json');
  const isPcp = tr === 'pcp';
  const mocks = S.mockHistory.filter(m => m.track === tr);
  const topics = countBy(bank, q => q.topic);
  el.innerHTML = `
    <div class="card">
      <h2>${ico('pen')} ${t('Written Exam Camp', '笔试营')} <span class="pill ${tr}">${tr.toUpperCase()}</span></h2>
      ${isPcp
        ? bi('COPR national exam: 200 questions (180 scored) · two 120-minute parts with a 10-minute break · standard-score pass mark. From Nov 2026 all exams test to the CPCF.',
             'COPR 全国统考：200 题（180 计分）· 两部分各 120 分钟，中间休息 10 分钟 · 标准分制。2026 年 11 月起全部按 CPCF 框架出题。')
        : bi("EMALB's own online exam: 200 questions · 2.5 hours · 75% to pass. Results are instant.",
             'EMALB 自己的在线考试：200 题 · 2.5 小时 · 75% 及格 · 交卷即出分。')}
      <div class="stat-row" style="margin-top:12px">
        <div class="stat"><b>${bank.length}</b><span>${t('questions in bank', '题库总量')}</span></div>
        <div class="stat"><b>${mocks.length}</b><span>${t('mocks taken', '已考模考')}</span></div>
        <div class="stat"><b>${mocks.length ? Math.max(...mocks.map(m => m.pct)) + '%' : '—'}</b><span>${t('best mock', '模考最好成绩')}</span></div>
        <div class="stat"><b>${Object.keys(S.wrong).length}</b><span>${t('wrong answers', '错题数')}</span></div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3 style="margin-top:0">${ico('target')} ${t('Practice mode', '练习模式')}</h3>
        ${bi('Instant feedback with explanations. Filter by topic. Wrong answers go to your wrong-answer book automatically.',
             '即时判分带解析，可按主题筛选。错题自动进错题本。')}
        <div class="btn-row"><a class="btn" href="#/practice">${t('Start practice', '开始练习')}</a></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">${ico('clock')} ${t('Full mock exam', '全真模考')}</h3>
        ${isPcp
          ? bi('Blueprint-weighted 180 scored questions, real two-part timing with break, COPR-style area report at the end.',
               '按 CPCF 蓝图配比抽 180 计分题，全真两段计时+中场休息，考完出 COPR 风格分域报告。')
          : bi('200 questions, 150-minute timer, pass at 75% — exactly like the EMALB exam.',
               '200 题 · 150 分钟计时 · 75% 及格线，完全复刻 EMALB 考试。')}
        <div class="btn-row"><a class="btn" href="#/mock">${t('Start mock', '开始模考')}</a></div>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">${ico('x')} ${t('Wrong-answer book', '错题本')}</h3>
      ${bi('Re-drill every question you have ever missed until none are left.', '把你错过的每道题反复刷，刷到清零为止。')}
      <div class="btn-row"><a class="btn secondary" href="#/wrong">${t('Open', '打开')} (${Object.keys(S.wrong).length})</a></div>
    </div>
    ${mocks.length ? `<div class="card"><h3 style="margin-top:0">${t('Mock history', '模考历史')}</h3>
      ${mocks.slice(-8).reverse().map(m => `<div class="area-bar ${m.pass ? 'band-lgreen' : 'band-red'}">
        <span class="area-tag">${m.pct}</span>
        <div><b>${m.date}</b> · ${m.right}/${m.total} · ${m.pass ? t('PASS', '通过') : t('FAIL', '未过')}</div>
      </div>`).join('')}</div>` : ''}`;
}

function countBy(arr, fn) { const m = {}; for (const x of arr) { const k = fn(x) || '?'; m[k] = (m[k] || 0) + 1; } return m; }

/* ---------------- practice ---------------- */
export async function renderPractice(el, arg, params) {
  const tr = S.track;
  const bank = await loadBank(tr);
  if (!bank.length) { el.innerHTML = emptyBank(); return; }
  const topic = params.topic || 'all';
  const area = params.area || 'all';
  const topics = Object.entries(countBy(bank, q => q.topic)).sort((a, b) => b[1] - a[1]);
  const areas = Object.entries(countBy(bank, q => q.cpcfArea)).sort();
  let pool = bank.filter(q => (topic === 'all' || q.topic === topic) && (area === 'all' || q.cpcfArea === area));
  if (!session || session.mode !== 'practice' || session.filterKey !== topic + area) {
    session = { mode: 'practice', filterKey: topic + area, order: shuffle(pool.map((_, i) => i)), pos: 0, right: 0, done: 0, pool };
  }
  drawPracticeQ(el, topics, areas, topic, area);
}
function drawPracticeQ(el, topics, areas, topic, area) {
  const q = session.pool[session.order[session.pos]];
  el.innerHTML = `
    <div class="q-wrap">
      <div class="card">
        <div class="q-meta">
          <div>
            <select id="topicSel" class="lang-btn">${['all', ...topics.map(x => x[0])].map(tp =>
              `<option value="${tp}" ${tp === topic ? 'selected' : ''}>${tp === 'all' ? t('All topics', '全部主题') : tp}</option>`).join('')}</select>
            <select id="areaSel" class="lang-btn">${['all', ...areas.map(x => x[0])].map(a =>
              `<option value="${a}" ${a === area ? 'selected' : ''}>${a === 'all' ? t('All areas', '全部能力域') : 'Area ' + a}</option>`).join('')}</select>
          </div>
          <div class="muted">${t('Score', '得分')}: <b>${session.right}/${session.done}</b> · ${session.pool.length} ${t('in pool', '题可刷')}</div>
        </div>
        ${q ? questionHTML(q, false) : `<p class="muted">${t('No questions match this filter.', '这个筛选下没有题。')}</p>`}
        <div class="btn-row">
          <button class="btn ghost" id="skipBtn">${t('Skip', '跳过')} →</button>
          <a class="btn ghost" href="#/written">← ${t('Back', '返回')}</a>
        </div>
      </div>
    </div>`;
  el.querySelector('#topicSel').onchange = e => nav('/practice?topic=' + encodeURIComponent(e.target.value) + '&area=' + area);
  el.querySelector('#areaSel').onchange = e => nav('/practice?topic=' + topic + '&area=' + encodeURIComponent(e.target.value));
  el.querySelector('#skipBtn').onclick = () => { advance(); drawPracticeQ(el, topics, areas, topic, area); };
  if (q) bindOptions(el, q, () => { // after answer
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn'; nextBtn.textContent = t('Next question', '下一题') + ' →';
    nextBtn.onclick = () => { advance(); drawPracticeQ(el, topics, areas, topic, area); };
    el.querySelector('.btn-row').prepend(nextBtn);
  });
}
function advance() { session.pos = (session.pos + 1) % session.order.length; }

// Patient-profile table / case-scenario prose, shown above every question in a set.
// Collapsed by default from the second question on, since the candidate has read it.
export function passageHTML(q) {
  if (!q.passage) return '';
  const p = q.passage;
  const isProfile = p.format === 'patient-profile';
  const rows = [
    ['Age 年龄', p.profile?.ageEn, p.profile?.ageZh],
    ['Gender 性别', p.profile?.genderEn, p.profile?.genderZh],
    ['Chief complaint 主诉', p.profile?.chiefComplaintEn, p.profile?.chiefComplaintZh],
    ['Past medical Hx 既往史', p.profile?.pastMedicalHxEn, p.profile?.pastMedicalHxZh],
    ['Medications 用药', p.profile?.medicationsEn, p.profile?.medicationsZh],
    ['1st vital signs 首次生命体征', p.profile?.firstVitalsEn, p.profile?.firstVitalsZh],
    ['Physical findings 查体发现', p.profile?.physicalFindingsEn, p.profile?.physicalFindingsZh],
    ['Other information 其他信息', p.profile?.otherInformationEn, p.profile?.otherInformationZh],
  ].filter(r => r[1]);
  const body = isProfile
    ? `<table class="vitals-table">${rows.map(r =>
        `<tr><th>${esc(r[0])}</th><td>${bi(r[1], r[2] || '', 'span')}</td></tr>`).join('')}</table>`
    : bi(p.passageEn, p.passageZh);
  const label = isProfile ? t('Patient profile', '患者资料') : t('Case scenario', '情境');
  const counter = `${t('Question', '第')} ${q.passageIndex + 1}/${q.passageTotal} ${t('of this set', '题 / 本组')}`;
  return `
    <details class="acc passage" ${q.passageIndex === 0 ? 'open' : ''}>
      <summary>📋 ${label}${p.titleEn ? ' · ' + bi(p.titleEn, p.titleZh, 'span') : ''}
        <span class="tag-count">${counter}</span></summary>
      <div class="acc-body">${body}</div>
    </details>
    ${q.evolutionEn ? `<div class="sc-info"><div class="sc-label">${t('Update 病情更新', '病情更新')}</div>${bi(q.evolutionEn, q.evolutionZh)}</div>` : ''}`;
}
// answer may be a single key ("B") or, for select-all-that-apply items, an array
export function answerKeys(q) { return Array.isArray(q.answer) ? q.answer : [q.answer]; }
export function isMulti(q) { return Array.isArray(q.answer) && q.answer.length > 1; }
function pickedKeys(picked) { return picked == null ? [] : (Array.isArray(picked) ? picked : [picked]); }

function questionHTML(q, review, picked) {
  const correct = answerKeys(q);
  const chosen = pickedKeys(picked);
  return `
    ${passageHTML(q)}
    <div class="q-text">${bi(q.questionEn, q.questionZh)}</div>
    ${isMulti(q) ? `<p class="tiny" style="color:var(--accent);font-weight:700">${t(`Select all that apply — ${correct.length} correct answers.`, `多选题——共 ${correct.length} 个正确答案。`)}</p>` : ''}
    <div class="q-opts" data-qid="${esc(q.id)}" data-multi="${isMulti(q) ? '1' : ''}">
      ${q.options.map(o => {
        let cls = 'opt';
        if (review) {
          if (correct.includes(o.key)) cls += ' correct';
          else if (chosen.includes(o.key)) cls += ' wrong';
        } else if (chosen.includes(o.key)) cls += ' picked';
        return `<button class="${cls}" data-key="${o.key}"><span class="opt-key">${o.key}</span><span>${bi(o.en, o.zh, 'span')}</span></button>`;
      }).join('')}
    </div>
    ${isMulti(q) && !review ? `<div class="btn-row" style="margin-top:8px"><button class="btn secondary" id="submitMulti">${t('Submit answer', '提交答案')}</button></div>` : ''}
    ${review ? explainHTML(q) : `<div id="explainSlot"></div>`}
    <p class="tiny">${esc(q.sourceRef || '')} ${q.verified === false ? '· ' + t('unaudited', '未复核') : ''}</p>`;
}
function explainHTML(q) {
  return `<div class="explain">${bi(q.explanationEn || '', q.explanationZh || '')}</div>`;
}
function bindOptions(el, q, onAnswered) {
  const wrap = el.querySelector('.q-opts');
  if (!wrap) return;
  const correct = answerKeys(q);
  // select-all-that-apply: toggle picks, then grade on submit — all-or-nothing,
  // the way the real exam scores a multi-select item
  if (isMulti(q)) {
    const chosen = new Set();
    wrap.querySelectorAll('.opt').forEach(btn => btn.onclick = () => {
      if (wrap.dataset.done) return;
      const k = btn.dataset.key;
      if (chosen.has(k)) { chosen.delete(k); btn.classList.remove('picked'); }
      else { chosen.add(k); btn.classList.add('picked'); }
    });
    const submit = el.querySelector('#submitMulti');
    if (submit) submit.onclick = () => {
      if (wrap.dataset.done) return;
      if (!chosen.size) { alert(t('Select at least one option.', '至少选一项。')); return; }
      wrap.dataset.done = '1';
      const right = correct.length === chosen.size && correct.every(k => chosen.has(k));
      session.done++;
      if (right) { session.right++; delete S.wrong[q.id]; } else S.wrong[q.id] = { at: Date.now() };
      wrap.querySelectorAll('.opt').forEach(b => {
        const k = b.dataset.key;
        b.classList.remove('picked');
        if (correct.includes(k)) b.classList.add('correct');
        else if (chosen.has(k)) b.classList.add('wrong');
      });
      submit.remove();
      save();
      el.querySelector('#explainSlot').innerHTML = explainHTML(q);
      if (onAnswered) onAnswered([...chosen]);
    };
    return;
  }
  wrap.querySelectorAll('.opt').forEach(btn => btn.onclick = () => {
    if (wrap.dataset.done) return;
    wrap.dataset.done = '1';
    const k = btn.dataset.key;
    session.done++;
    if (correct.includes(k)) { session.right++; btn.classList.add('correct'); delete S.wrong[q.id]; }
    else {
      btn.classList.add('wrong');
      const el2 = wrap.querySelector(`[data-key="${correct[0]}"]`);
      if (el2) el2.classList.add('correct');
      S.wrong[q.id] = { at: Date.now() };
    }
    save();
    el.querySelector('#explainSlot').innerHTML = explainHTML(q);
    if (onAnswered) onAnswered(k);
  });
}

/* ---------------- mock exam ---------------- */
export async function renderMock(el) {
  const tr = S.track;
  if (session && session.mode === 'mock' && session.track === tr && !session.finished) { drawMock(el); return; }
  const bank = await loadBank(tr);
  const bp = await loadJSON('./data/meta/cpcf-blueprint.json');
  if (!bank.length) { el.innerHTML = emptyBank(); return; }
  const isPcp = tr === 'pcp';
  const plan = isPcp ? { parts: 2, partMin: 120, breakMin: 10, passPct: null } : { parts: 1, partMin: 150, breakMin: 0, passPct: 75 };
  el.innerHTML = `
    <div class="card">
      <h2>⏱ ${t('Full Mock Exam', '全真模考')} <span class="pill ${tr}">${tr.toUpperCase()}</span></h2>
      ${isPcp
        ? bi(`Format: 180 scored questions sampled to the CPCF blueprint (Area H ≈ 70%). Two parts of 120 minutes; after the break you cannot return to Part 1. Report card uses COPR's four colour bands.`,
             `格式：按 CPCF 蓝图配比抽 180 计分题（H 域约 70%）。两部分各 120 分钟；休息后不能回改第一部分。考完出 COPR 四色分域报告。`)
        : bi(`Format: 200 questions in 150 minutes. Pass mark 75%. Results instant, with topic breakdown.`,
             `格式：200 题 · 150 分钟 · 75% 及格。交卷即出分，附主题强弱分析。`)}
      <div class="notice">${t('Put your phone on Do-Not-Disturb and treat this like the real thing — no notes, no pausing.', '把手机调成勿扰，当真考对待——不看笔记、不暂停。')}</div>
      <div class="btn-row">
        <button class="btn big" id="startMock">${t('Start exam', '开始考试')}</button>
      </div>
      <p class="tiny">${t(`Question pool: ${bank.length}. If a blueprint area lacks questions, the sampler backfills from clinical topics and notes it in the report.`, `当前题库 ${bank.length} 题。蓝图某域题量不足时会用临床题补位并在报告中注明。`)}</p>
    </div>`;
  el.querySelector('#startMock').onclick = () => {
    const qs = isPcp ? samplePcp(bank) : sampleEmr(bank);
    session = {
      mode: 'mock', track: tr, qs, answers: {}, flags: {}, pos: 0,
      part: 1, parts: plan.parts, partMin: plan.partMin, breakMin: plan.breakMin, passPct: plan.passPct,
      partEndsAt: Date.now() + plan.partMin * 60000, finished: false, backfilled: qs.backfilled || 0,
    };
    drawMock(el);
  };
}
// Sampling works on units, not loose questions: a standalone question is a unit of
// one, a passage set is a unit of all its questions. That keeps a patient profile
// and its 3-5 linked questions together and in order, as the real exam presents them.
function toUnits(questions) {
  const sets = new Map(); const units = [];
  for (const q of questions) {
    if (!q.passageId) { units.push([q]); continue; }
    if (!sets.has(q.passageId)) { const u = []; sets.set(q.passageId, u); units.push(u); }
    sets.get(q.passageId).push(q);
  }
  for (const u of units) if (u.length > 1) u.sort((a, b) => a.passageIndex - b.passageIndex);
  return units;
}
function flatten(units) { return units.flat(); }

export function samplePcp(bank) {
  const targets = { A: 8, B: 10, C: 10, D: 6, E: 10, F: 10, G: 6, H: 120 };
  const byArea = {};
  for (const u of toUnits(bank)) (byArea[u[0].cpcfArea || 'H'] ||= []).push(u);
  Object.values(byArea).forEach(shuffleInPlace);
  const picked = []; let backfilled = 0;
  for (const [a, n] of Object.entries(targets)) {
    const pool = byArea[a] || [];
    let got = 0;
    for (const u of pool) {
      if (got >= n) break;
      picked.push(u); got += u.length;
    }
    if (got < n) backfilled += n - got;
  }
  let out = flatten(picked);
  if (out.length < 180) {
    const used = new Set(out.map(q => q.id));
    const rest = shuffle(toUnits(bank).filter(u => !used.has(u[0].id)));
    while (out.length < 180 && rest.length) out = out.concat(rest.pop());
  }
  // shuffle by unit so sets stay contiguous, then trim on a set boundary
  const finalUnits = shuffle(toUnits(out));
  const qs = [];
  for (const u of finalUnits) { if (qs.length + u.length > 180) continue; qs.push(...u); }
  qs.backfilled = backfilled;
  return qs;
}
export function sampleEmr(bank) {
  // topic-spread round robin over units, up to 200 questions
  const byTopic = {};
  for (const u of toUnits(bank)) (byTopic[u[0].topic || '?'] ||= []).push(u);
  Object.values(byTopic).forEach(shuffleInPlace);
  const topics = Object.keys(byTopic);
  const picked = []; let total = 0, added = true;
  while (total < 200 && added) {
    added = false;
    for (const tp of topics) {
      const pool = byTopic[tp];
      if (!pool.length || total >= 200) continue;
      const u = pool.pop();
      if (total + u.length > 200) continue;
      picked.push(u); total += u.length; added = true;
    }
  }
  return flatten(shuffle(picked));
}
function drawMock(el) {
  if (session.onBreak) { drawBreak(el); return; }
  const qs = session.qs;
  const half = Math.ceil(qs.length / session.parts);
  const [lo, hi] = session.part === 1 ? [0, session.parts === 2 ? half : qs.length] : [half, qs.length];
  if (session.pos < lo) session.pos = lo;
  if (session.pos >= hi) session.pos = hi - 1;
  const q = qs[session.pos];
  el.innerHTML = `
    <div class="q-wrap">
      <div class="q-meta">
        <div><b>${S.lang === 'zh' ? `第 ${session.part} 部分（共 ${session.parts} 部分）` : `Part ${session.part}/${session.parts}`}</b> · Q${session.pos + 1 - lo}/${hi - lo}</div>
        <div class="q-timer" id="mockTimer">--:--</div>
      </div>
      <div class="q-grid">${qs.slice(lo, hi).map((qq, i) => {
        const gi = lo + i;
        let cls = [];
        if (pickedKeys(session.answers[qq.id]).length) cls.push('answered');
        if (session.flags[qq.id]) cls.push('flagged');
        if (gi === session.pos) cls.push('current');
        return `<button class="${cls.join(' ')}" data-goto="${gi}">${gi + 1 - lo}</button>`;
      }).join('')}</div>
      <div class="card">
        ${passageHTML(q)}
        <div class="q-text">${bi(q.questionEn, q.questionZh)}</div>
        <div class="q-opts">
          ${q.options.map(o => `<button class="opt ${pickedKeys(session.answers[q.id]).includes(o.key) ? 'picked' : ''}" data-key="${o.key}">
            <span class="opt-key">${o.key}</span><span>${bi(o.en, o.zh, 'span')}</span></button>`).join('')}
        </div>
        <div class="btn-row">
          <button class="btn ghost" id="prevQ" ${session.pos <= lo ? 'disabled' : ''}>←</button>
          <button class="btn ghost" id="flagQ">${session.flags[q.id] ? ico('list') + ' ' + t('Unflag', '取消标记') : t('Flag', '标记')}</button>
          <button class="btn ghost" id="nextQ" ${session.pos >= hi - 1 ? 'disabled' : ''}>→</button>
          <button class="btn ${session.part === session.parts ? 'danger' : 'secondary'}" id="endPart">
            ${session.part === session.parts ? t('Submit exam', '交卷') : t('End Part 1 → break', '结束第一部分→休息')}</button>
        </div>
      </div>
    </div>`;
  el.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { session.pos = +b.dataset.goto; drawMock(el); });
  el.querySelectorAll('.q-opts .opt').forEach(b => b.onclick = () => {
    const k = b.dataset.key;
    if (isMulti(q)) {
      const cur = pickedKeys(session.answers[q.id]);
      session.answers[q.id] = cur.includes(k) ? cur.filter(x => x !== k) : cur.concat(k);
      if (!session.answers[q.id].length) delete session.answers[q.id];
    } else session.answers[q.id] = k;
    drawMock(el);
  });
  el.querySelector('#prevQ').onclick = () => { session.pos--; drawMock(el); };
  el.querySelector('#nextQ').onclick = () => { session.pos++; drawMock(el); };
  el.querySelector('#flagQ').onclick = () => { session.flags[q.id] = !session.flags[q.id]; drawMock(el); };
  el.querySelector('#endPart').onclick = () => {
    const unanswered = qs.slice(lo, hi).filter(qq => !pickedKeys(session.answers[qq.id]).length).length;
    const msg = session.part === session.parts
      ? t(`Submit now? ${unanswered} unanswered.`, `确定交卷？还有 ${unanswered} 题没答。`)
      : t(`End Part 1? You cannot return after the break. ${unanswered} unanswered.`, `结束第一部分？休息后不能回改。还有 ${unanswered} 题没答。`);
    if (!confirm(msg)) return;
    if (session.part === session.parts) finishMock(el);
    else { session.onBreak = true; session.breakEndsAt = Date.now() + session.breakMin * 60000; drawMock(el); }
  };
  tickMock(el, hi);
}
let mockTick = null;
function tickMock(el, hi) {
  clearInterval(mockTick);
  mockTick = setInterval(() => {
    const tEl = document.getElementById('mockTimer');
    if (!tEl || !session || session.finished) { clearInterval(mockTick); return; }
    const ms = session.partEndsAt - Date.now();
    if (ms <= 0) {
      clearInterval(mockTick);
      if (session.part === session.parts) finishMock(el);
      else { session.onBreak = true; session.breakEndsAt = Date.now() + session.breakMin * 60000; drawMock(el); }
      return;
    }
    tEl.textContent = fmtMs(ms);
    tEl.className = 'q-timer' + (ms < 5 * 60000 ? ' crit' : ms < 15 * 60000 ? ' warn' : '');
  }, 500);
}
function drawBreak(el) {
  el.innerHTML = `
    <div class="card" style="text-align:center;padding:40px 20px">
      <h2>${ico('clock')} ${t('Break', '中场休息')}</h2>
      ${bi('Up to 10 minutes. In the real exam the proctor re-secures your area — keep time away under 5 minutes. You cannot return to Part 1.',
           '最多 10 分钟。真实考试里离开考位要控制在 5 分钟内以便监考重新核验。你不能再回到第一部分。')}
      <div class="q-timer" id="breakTimer" style="font-size:1.8rem;margin:18px auto;max-width:180px">--:--</div>
      <button class="btn big" id="startP2">${t('Start Part 2 now', '直接开始第二部分')}</button>
    </div>`;
  const start2 = () => {
    session.onBreak = false; session.part = 2;
    session.pos = Math.ceil(session.qs.length / 2);
    session.partEndsAt = Date.now() + session.partMin * 60000;
    drawMock(el);
  };
  el.querySelector('#startP2').onclick = start2;
  clearInterval(mockTick);
  mockTick = setInterval(() => {
    const tEl = document.getElementById('breakTimer');
    if (!tEl) { clearInterval(mockTick); return; }
    const ms = session.breakEndsAt - Date.now();
    if (ms <= 0) { clearInterval(mockTick); start2(); return; }
    tEl.textContent = fmtMs(ms);
  }, 500);
}
function finishMock(el) {
  clearInterval(mockTick);
  session.finished = true;
  const qs = session.qs;
  let right = 0;
  const areaStat = {};
  for (const q of qs) {
    const a = q.cpcfArea || 'H';
    areaStat[a] ||= { right: 0, total: 0 };
    areaStat[a].total++;
    const want = answerKeys(q), got = pickedKeys(session.answers[q.id]);
    if (want.length === got.length && want.every(k => got.includes(k))) { right++; areaStat[a].right++; delete S.wrong[q.id]; }
    else S.wrong[q.id] = { at: Date.now() };
  }
  const pct = Math.round(right / qs.length * 100);
  const pass = session.passPct != null ? pct >= session.passPct : pct >= 65; // PCP: scaled — 65% shown as indicative only
  const rec = { track: session.track, date: new Date().toISOString().slice(0, 10), right, total: qs.length, pct, pass };
  S.mockHistory.push(rec); save();
  const bandOf = p => p < 60 ? ['band-red', t('Weakness', '弱项')] : p < 70 ? ['band-yellow', t('Below acceptable', '低于达标')] : p < 85 ? ['band-lgreen', t('Acceptable', '达标')] : ['band-dgreen', t('Strength', '强项')];
  el.innerHTML = `
    <div class="card score-hero">
      <div class="score-big ${pass ? 'pass' : 'fail'}">${pct}%</div>
      <p><b>${right}/${qs.length}</b> · ${pass ? t('PASS (indicative)', '通过（模拟判定）') : t('NOT YET', '还没到')}</p>
      ${session.track === 'pcp'
        ? `<p class="tiny">${t('The real COPR exam uses a scaled standard score, not a fixed percentage. Treat ≥70% here as a healthy margin.', '真实 COPR 考试是标准分制没有固定及格百分比；这里建议以 ≥70% 作为安全边际。')}</p>`
        : `<p class="tiny">${t('Real pass mark: 75%.', '真实及格线：75%。')}</p>`}
      ${session.backfilled ? `<p class="tiny"> ${t(`${session.backfilled} blueprint slots backfilled from clinical topics (bank still growing).`, `有 ${session.backfilled} 个蓝图名额由临床题补位（题库还在扩容）。`)}</p>` : ''}
    </div>
    <div class="card">
      <h3 style="margin-top:0">${t('Competency area report', '能力域报告')} <span class="tiny">(COPR ${t('style', '风格')})</span></h3>
      ${Object.entries(areaStat).sort().map(([a, s]) => {
        const p = Math.round(s.right / s.total * 100);
        const [band, label] = bandOf(p);
        // weak areas link straight into filtered practice — the report is only
        // useful if acting on it is one tap away
        const weak = p < 70;
        return `<div class="area-bar ${band}">
          <span class="area-tag">${a}</span>
          <div style="flex:1"><div style="display:flex;justify-content:space-between;gap:8px">
            <span>${label}</span><b>${s.right}/${s.total} (${p}%)</b></div>
          <div class="area-meter"><i style="width:${p}%"></i></div></div>
          <a class="btn ${weak ? '' : 'ghost'}" style="flex:0 0 auto;padding:6px 12px;font-size:.78rem"
             href="#/practice?area=${a}">${weak ? t('Drill this', '专项攻克') : t('Practise', '再练')}</a>
        </div>`;
      }).join('')}
      <p class="tiny" style="margin-top:10px">${t('Anything under 70% is flagged. Tap "Drill this" to practise only that competency area.', '低于 70% 的会被标出。点「专项攻克」只刷那个能力域的题。')}</p>
    </div>
    <div class="card">
      <div class="btn-row">
        <button class="btn" id="reviewBtn">${t('Review all answers', '逐题回看')}</button>
        <a class="btn secondary" href="#/wrong">${t('Wrong-answer book', '错题本')}</a>
        <a class="btn ghost" href="#/written">← ${t('Back', '返回')}</a>
      </div>
    </div>
    <div id="reviewWrap"></div>`;
  el.querySelector('#reviewBtn').onclick = () => {
    document.getElementById('reviewWrap').innerHTML = qs.map((q, i) => `
      <div class="card">
        <p class="tiny">Q${i + 1} · ${q.cpcfArea || ''} · ${esc(q.topic || '')}</p>
        ${questionHTML(q, true, session.answers[q.id])}
      </div>`).join('');
  };
}

/* ---------------- wrongbook ---------------- */
export async function renderWrong(el) {
  const tr = S.track;
  const bank = await loadBank(tr);
  const wrongQs = bank.filter(q => S.wrong[q.id]);
  if (!wrongQs.length) {
    el.innerHTML = `<div class="card" style="text-align:center;padding:40px">
      <h2>${ico('target')} ${t('Wrong-answer book is empty', '错题本是空的')}</h2>
      ${bi('Either you are perfect, or you have not practiced yet. Both are fixable.', '要么你是天才，要么你还没开始刷题。去练两道就知道了。')}
      <div class="btn-row" style="justify-content:center"><a class="btn" href="#/practice">${t('Go practice', '去刷题')}</a></div>
    </div>`;
    return;
  }
  session = { mode: 'practice', filterKey: 'wrong', order: shuffle(wrongQs.map((_, i) => i)), pos: 0, right: 0, done: 0, pool: wrongQs };
  const draw = () => {
    const q = session.pool[session.order[session.pos]];
    el.innerHTML = `
      <div class="q-wrap"><div class="card">
        <div class="q-meta"><h2 style="font-size:1.05rem">${ico('x')} ${t('Wrong-answer drill', '错题重刷')}</h2>
        <div class="muted">${session.pool.length} ${t('left', '题待清')} · ${t('correct answers remove the question', '答对即从错题本移除')}</div></div>
        ${questionHTML(q, false)}
        <div class="btn-row">
          <button class="btn ghost" id="skipBtn">${t('Skip', '跳过')} →</button>
          <a class="btn ghost" href="#/written">← ${t('Back', '返回')}</a>
        </div>
      </div></div>`;
    el.querySelector('#skipBtn').onclick = () => { advance(); draw(); };
    bindOptions(el, q, k => {
      const btn = document.createElement('button');
      btn.className = 'btn'; btn.textContent = t('Next', '下一题') + ' →';
      btn.onclick = () => renderWrong(el);
      el.querySelector('.btn-row').prepend(btn);
    });
  };
  draw();
}

/* ---------------- utils ---------------- */
function emptyBank() {
  return `<div class="card"><h2>${t('Question bank loading…', '题库建设中…')}</h2>
    ${bi('The question bank files for this track are not deployed yet. Check back shortly.', '这个轨道的题库文件还没部署完成，稍后再来。')}</div>`;
}
function shuffle(a) { return shuffleInPlace([...a]); }
function shuffleInPlace(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function fmtMs(ms) { const s = Math.max(0, Math.floor(ms / 1000)); const m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
