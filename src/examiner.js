// AI Examiner — a simulated EMALB practical station: dispatch → live call → PCR → grading form.
// The browser owns the run (crash-safe in localStorage); the server owns the sheet, the model and the scoring.
// Voice: browser SpeechRecognition for the candidate, speechSynthesis for the examiner/patient/partner. No backend.
import { S, save, bi, t, esc, nav, ico } from './app.js?v=21';

const API = (() => {
  try { const o = localStorage.getItem('bcprep2.examinerApi'); if (o) return o; } catch (e) {}
  return (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:8787' : 'https://bcprep-examiner.onrender.com';
})();
const EXAM_MS = 40 * 60000, PCR_MS = 5 * 60000, AUTOSEND_MS = 3000;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const TTS = 'speechSynthesis' in window;

function deviceId() {
  if (!S.deviceId) { S.deviceId = Math.random().toString(36).slice(2) + Date.now().toString(36); save(); }
  return S.deviceId;
}
async function api(path, body) {
  const r = await fetch(API + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-Device': deviceId() }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { let m = r.statusText; try { m = (await r.json()).detail || m; } catch (e) {} throw new Error(m); }
  return r.json();
}
const fmt = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
let run = null;
const persist = () => { S.examinerRun = run; save(); };

/* ---------------- voice ---------------- */
const voiceOn = () => !!S.examinerVoice;
let voice = null;
function pickVoice() {
  if (!TTS) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find(v => /en-CA/i.test(v.lang)) || vs.find(v => /^en-(US|GB|AU)/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
if (TTS) speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
function speak(lines) {
  if (!voiceOn() || !TTS) return;
  if (!voice) voice = pickVoice();
  for (const l of lines) {
    const u = new SpeechSynthesisUtterance(l.text);
    u.lang = 'en-CA'; u.rate = 1; u.pitch = l.role === 'patient' ? 0.85 : l.role === 'partner' ? 1.15 : 1;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }
}
const hush = () => { if (TTS) speechSynthesis.cancel(); };
let rec = null, listening = false, autoTimer = null, autoLeft = 0;
function setMic(el) {
  const b = el.querySelector('#exMic'); if (!b) return;
  b.classList.toggle('listening', listening);
  b.textContent = listening ? '⏹' : '🎤';
  b.title = listening ? t('Stop listening', '停止') : t('Speak', '说话');
}
function cancelAuto(el) {
  clearInterval(autoTimer); autoTimer = null;
  const s = el.querySelector('#exAuto'); if (s) s.textContent = '';
}
function scheduleAuto(el, send) {
  cancelAuto(el);
  autoLeft = AUTOSEND_MS / 1000;
  const s = el.querySelector('#exAuto');
  const tickFn = () => {
    if (s) s.textContent = t(`Sending in ${autoLeft}s — tap the text to edit`, `${autoLeft} 秒后发送——点文字可修改`);
    if (autoLeft <= 0) { cancelAuto(el); send(); }
    autoLeft--;
  };
  tickFn(); autoTimer = setInterval(tickFn, 1000);
}
function listen(el, send) {
  if (!SR) return;
  if (listening) { try { rec.stop(); } catch (e) {} return; }
  hush(); cancelAuto(el);
  rec = new SR(); rec.lang = 'en-CA'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  const ta = el.querySelector('#exText');
  listening = true; setMic(el);
  rec.onresult = e => {
    let fin = '', interim = '';
    for (const r of e.results) { if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript; }
    if (ta) ta.value = (fin || interim).trim();
  };
  rec.onend = () => { listening = false; setMic(el); if (ta && ta.value.trim()) scheduleAuto(el, send); };
  rec.onerror = ev => { listening = false; setMic(el); if (ev.error === 'not-allowed') alert(t('Microphone blocked — allow it in the browser, or type instead.', '麦克风被禁用——在浏览器里允许，或改用打字。')); };
  try { rec.start(); } catch (e) { listening = false; setMic(el); }
}

/* ---------------- hub ---------------- */
export async function renderExaminerHub(el) {
  const tr = S.track;
  let list = [], err = null;
  try { list = (await api('/api/examiner/scenarios')).scenarios; } catch (e) { err = e.message; }
  const hist = S.examinerHistory || [];
  const live = S.examinerRun && !S.examinerRun.finished ? S.examinerRun : null;
  const mock = S.examinerMock;
  const canMock = list.some(x => x.type === 'medical') && list.some(x => x.type === 'trauma');
  el.innerHTML = `
    <a class="back-link" href="#/practical">← ${t('Practical camp', '实操营')}</a>
    <div class="card">
      <h2>${ico('ambulance')} ${t('AI Examiner', '考官机器人')} <span class="pill ${tr}">${tr.toUpperCase()}</span> <span class="pill gray">BETA</span></h2>
      ${bi('A simulated EMALB station. The examiner reads the dispatch, then only answers what you actually assess or ask — in English, like the real exam. You talk; it never coaches. At 40 minutes the call ends and you write the PCR. Then you get the official-style grading form with every deduction tied to your own words.',
           '模拟 EMALB 考站。考官念完派遣信息后，只回答你真正评估到或问到的内容——全程英文，和真实考试一样。你说，它不教。40 分钟到自动收卷，接着写 PCR，最后拿到官方格式的扣分表，每条扣分都对应你自己说过的话。')}
      <div class="notice" style="margin-top:10px">${bi('It grades what you say; the real examiner grades what you do. Narrate every action with specifics: "Radial pulse, 15 seconds times 4 — 92, strong and regular."',
        '它评你说的；真考官评你做的。所以每个动作都要说具体："Radial pulse, 15 seconds times 4 — 92, strong and regular."')}</div>
      <label class="chk" style="margin-top:10px"><input type="checkbox" id="exVoicePref" ${voiceOn() ? 'checked' : ''} ${SR || TTS ? '' : 'disabled'}/>
        <span>${bi(`Voice mode — speak to the examiner and hear the replies (${SR ? 'microphone available' : 'no speech recognition in this browser'}${TTS ? '' : ', no speech output'})`,
                   `语音模式——对考官说话、听回复（${SR ? '本浏览器支持听写' : '本浏览器不支持听写'}${TTS ? '' : '，不支持朗读'}）`, 'span')}</span></label>
    </div>
    ${live ? `<div class="notice" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${ico('clock')} ${bi('A station is in progress.', '有一场考站进行中。', 'span')}
      <a class="btn" style="margin-left:auto" href="#/examiner-run/${live.id}">${t('Resume', '继续')} →</a>
      <button class="btn ghost" id="exAbandon">${t('Abandon', '放弃')}</button></div>` : ''}
    ${mock && mock.active ? `<div class="notice" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${ico('cap')} ${bi(`Exam-day mock in progress — next: the ${mock.stage} station.`, `考试日模考进行中——下一场：${mock.stage === 'medical' ? '内科' : '创伤'}站。`, 'span')}
      <a class="btn" style="margin-left:auto" href="#/examiner-run/${mock.ids[mock.stage]}">${t('Continue', '继续')} →</a>
      <button class="btn ghost" id="exMockAbandon">${t('Abandon', '放弃')}</button></div>` : ''}
    <div class="card" style="border-color:var(--accent)">
      <h3 style="margin-top:0">${ico('cap')} ${t('Exam-day mock — one medical + one trauma', '考试日模考——1 内科 + 1 创伤')}</h3>
      ${bi('Like the real day: one medical and one trauma station drawn at random, back to back. You need 70% on each, with no critical deduction, to pass.',
           '和真实考试日一样：随机抽 1 个内科站 + 1 个创伤站，连考两场。每场都要 70% 以上且没有 100% 扣分项才算通过。')}
      <div class="btn-row"><button class="btn big" id="exMockStart" ${live || (mock && mock.active) || !canMock ? 'disabled' : ''}>▶ ${t('Draw my two stations', '抽签开考')}</button></div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">${ico('film')} ${t('Choose a station', '选一个考站')}</h3>
      ${err ? `<p class="muted">${t('Examiner server unreachable:', '考官服务器连不上：')} ${esc(err)}</p>` : ''}
      <div class="list">${list.map(s => `
        <div class="list-row">
          <div><b>${esc(s.titleEn)}</b><div class="tiny"><span class="pill ${s.type}">${s.type}</span> <span class="pill ${s.priority === 'rtc' ? 'rtc' : 'nonrtc'}">${s.priority.toUpperCase()}</span></div></div>
          <a class="btn" href="#/examiner-run/${s.id}" ${live ? 'style="pointer-events:none;opacity:.5"' : ''}>${t('Start', '开始')}</a>
        </div>`).join('')}</div>
    </div>
    ${hist.length ? `<div class="card"><h3 style="margin-top:0">${ico('list')} ${t('Your stations', '你的考站记录')}</h3>
      <table class="vitals-table">${hist.slice().reverse().slice(0, 12).map(h => `<tr><td>${h.date}</td><td>${esc(h.title)}</td><td><b style="color:${h.pass ? 'var(--green)' : 'var(--red)'}">${h.autofail ? 'FAIL (critical)' : h.score + '%'}</b></td></tr>`).join('')}</table></div>` : ''}`;
  el.querySelector('#exVoicePref').onchange = e => { S.examinerVoice = e.target.checked; save(); if (S.examinerVoice && TTS) speak([{ role: 'examiner', text: 'Voice mode on.' }]); };
  const ab = el.querySelector('#exAbandon');
  if (ab) ab.onclick = () => armed(ab, t('Tap again to abandon', '再点一次确认放弃'), () => { S.examinerRun = null; run = null; save(); renderExaminerHub(el); });
  const ms = el.querySelector('#exMockStart');
  if (ms) ms.onclick = () => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const ids = { medical: pick(list.filter(x => x.type === 'medical')).id, trauma: pick(list.filter(x => x.type === 'trauma')).id };
    S.examinerMock = { active: true, ids, stage: 'medical', results: {} }; S.examinerRun = null; run = null; save();
    nav('/examiner-run/' + ids.medical);
  };
  const ma = el.querySelector('#exMockAbandon');
  if (ma) ma.onclick = () => armed(ma, t('Tap again to abandon the mock', '再点一次放弃模考'), () => { S.examinerMock = null; S.examinerRun = null; run = null; save(); renderExaminerHub(el); });
}
// two-tap confirmation (confirm() dialogs are blocked in some embedded browsers and awkward on phones)
function armed(btn, label, fn) {
  if (btn.dataset.armed) { delete btn.dataset.armed; fn(); return; }
  const orig = btn.textContent;
  btn.dataset.armed = '1'; btn.textContent = label; btn.classList.add('danger');
  setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = orig; btn.classList.remove('danger'); } }, 4000);
}

/* ---------------- exam-day mock ---------------- */
function inMock() {
  const m = S.examinerMock;
  return !!(m && m.active && run && m.ids[m.stage] === run.id);
}
function mockPanel() {
  const m = S.examinerMock;
  if (!m || !run || !run.mockStage) return '';
  if (run.mockStage === 'medical') {
    return `<div class="card" style="border-color:var(--accent)"><h3 style="margin-top:0">${ico('cap')} ${t('Exam-day mock: station 1 of 2 done', '考试日模考：第 1 场完成')}</h3>
      ${bi('Take a breath. The trauma station is next — on the real day you would move straight to the next room.', '缓口气，接下来是创伤站——真实考试日你会直接进下一个考场。')}
      <div class="btn-row"><button class="btn big" id="exMockNext">${t('Next station: trauma', '下一场：创伤站')} →</button></div></div>`;
  }
  const r = m.results, both = r.medical && r.trauma && r.medical.pass && r.trauma.pass;
  const cell = x => x ? `<b style="color:${x.pass ? 'var(--green)' : 'var(--red)'}">${x.autofail ? 'FAIL (critical)' : x.score + '%'}</b>` : '—';
  return `<div class="card" style="border-color:${both ? 'var(--green)' : 'var(--red)'}"><h3 style="margin-top:0">${ico('cap')} ${t('Exam-day mock result', '考试日模考结果')}: ${both ? t('PASS', '通过') : t('NOT YET', '未通过')}</h3>
    <table class="vitals-table"><tr><th>${t('Medical', '内科')}</th><td>${esc(r.medical ? r.medical.title : '')}</td><td>${cell(r.medical)}</td></tr>
    <tr><th>${t('Trauma', '创伤')}</th><td>${esc(r.trauma ? r.trauma.title : '')}</td><td>${cell(r.trauma)}</td></tr></table>
    ${both ? '' : bi('On the real exam only the failed station type is retaken (another scenario of that type).', '真实考试中只补考没过的那一类（换一个同类场景）。')}</div>`;
}

/* ---------------- run ---------------- */
export async function renderExaminerRun(el, id) {
  if (!run || run.id !== id) {
    const saved = S.examinerRun;
    run = (saved && saved.id === id) ? saved : { id, track: S.track, phase: 'brief', startedAt: null, log: [], events: [], fired: [], pcr: {}, pcrStartedAt: null, result: null, finished: false, brief: null };
  }
  if (!run.brief) {
    try { run.brief = await api('/api/examiner/start', { scenarioId: id, track: run.track }); persist(); }
    catch (e) { el.innerHTML = `<a class="back-link" href="#/examiner">← ${t('AI Examiner', '考官机器人')}</a><div class="card"><p>${esc(e.message)}</p></div>`; return; }
  }
  draw(el);
}
function draw(el) {
  if (run.phase === 'brief') return drawBrief(el);
  if (run.phase === 'live') return drawLive(el);
  if (run.phase === 'pcr') return drawPcr(el);
  return drawResult(el);
}
function drawBrief(el) {
  const b = run.brief.brief, sc = run.brief.scenario;
  el.innerHTML = `
    <a class="back-link" href="#/examiner">← ${t('AI Examiner', '考官机器人')}</a>
    <div class="card">
      <div class="q-meta"><h2 style="font-size:1.05rem">${esc(sc.titleEn)}</h2><span style="display:flex;gap:6px">${inMock() ? `<span class="pill gray">${ico('cap')} ${t('MOCK', '模考')} ${S.examinerMock.stage === 'medical' ? '1/2' : '2/2'}</span>` : ''}<span class="pill ${sc.type}">${sc.type}</span></span></div>
      <div class="sc-info"><div class="sc-label">Dispatch</div><p>${esc(b.dispatchEn)}</p>${b.dispatchUpdateEn ? `<p>${esc(b.dispatchUpdateEn)}</p>` : ''}</div>
      <div class="sc-info"><div class="sc-label">Equipment on scene</div><p>${(b.equipmentEn || []).map(esc).join(' · ')}</p></div>
      <div class="sc-info"><div class="sc-label">Your partner</div><p>${esc(b.partnerEn || '')}</p></div>
      ${b.trackNoteEn ? `<div class="notice">${run.track.toUpperCase()}: ${esc(b.trackNoteEn)}</div>` : ''}
      ${bi(`When you press Begin, the 40-minute clock starts and the examiner says "You may begin." ${voiceOn() ? 'Voice mode is on: tap the microphone, speak, and your words are sent after a short countdown.' : 'Everything you type is heard by the examiner.'} ${run.brief.dailyLeft} station(s) left today.`,
           `按下开始后 40 分钟计时启动，考官会说 "You may begin."。${voiceOn() ? '语音模式已开：点麦克风说话，说完几秒后自动发送。' : '你输入的每句话考官都听得到。'}今天还剩 ${run.brief.dailyLeft} 场。`)}
      <div class="btn-row"><button class="btn big" id="exBegin">▶ ${t('Begin the station', '开始考站')}</button></div>
    </div>`;
  el.querySelector('#exBegin').onclick = () => {
    run.phase = 'live'; run.startedAt = Date.now();
    const first = { t: 0, role: 'examiner', text: 'You may begin. Talk me through everything you do.' };
    run.log.push(first); persist(); draw(el); speak([first]);
  };
}
const elapsed = () => Date.now() - run.startedAt;
let tick = null, busy = false;
function drawLive(el) {
  const sc = run.brief.scenario;
  el.innerHTML = `
    <div class="card ex-card">
      <div class="q-meta"><h2 style="font-size:1rem;margin:0">${esc(sc.titleEn)}</h2><span class="pill ${sc.type}">${sc.type}</span></div>
      <div class="timer-bar">
        <span>⏱ <b id="exClock">40:00</b></span>
        <span id="exPkg" class="hidden">${ico('list')} <b id="exPkgClock">--:--</b> <span class="tiny">${t('to package', '打包')}</span></span>
        <span id="exVit" style="margin-left:auto" class="tiny">${t('vitals', '体征')}: <b id="exVitAge">—</b></span>
      </div>
      <div class="ex-chat" id="exChat"></div>
      <div class="ex-input">
        ${SR ? `<button class="btn ghost ex-mic" id="exMic" title="${t('Speak', '说话')}">🎤</button>` : ''}
        <textarea id="exText" rows="2" placeholder="${t('What are you doing / saying? (English)', '你在做什么、说什么？（英文）')}"></textarea>
        <button class="btn" id="exSend">${t('Say', '说')}</button>
      </div>
      <div class="tiny muted" id="exAuto" style="min-height:1.2em"></div>
      <div class="btn-row" style="justify-content:space-between">
        <label class="tiny muted" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="exVoiceLive" ${voiceOn() ? 'checked' : ''} ${SR || TTS ? '' : 'disabled'}/> 🔊 ${t('voice', '语音')}</label>
        <button class="btn ghost" id="exEnd">${t('Hand-off done → write PCR', '交接完毕 → 写 PCR')}</button>
      </div>
    </div>`;
  renderChat(el);
  const ta = el.querySelector('#exText');
  const send = () => { const v = ta.value.trim(); cancelAuto(el); if (!v || busy) return; ta.value = ''; candidateSays(el, v); };
  el.querySelector('#exSend').onclick = send;
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  ta.onfocus = () => cancelAuto(el);
  ta.oninput = () => cancelAuto(el);
  const mic = el.querySelector('#exMic');
  if (mic) { mic.onclick = () => listen(el, send); setMic(el); }
  el.querySelector('#exVoiceLive').onchange = e => { S.examinerVoice = e.target.checked; save(); if (!S.examinerVoice) hush(); };
  const endBtn = el.querySelector('#exEnd');
  endBtn.onclick = () => armed(endBtn, t('Tap again to end the call', '再点一次结束出勤'), () => endCall(el));
  clearInterval(tick);
  tick = setInterval(() => {
    const c = document.getElementById('exClock'); if (!c || run.phase !== 'live') { clearInterval(tick); return; }
    const left = EXAM_MS - elapsed();
    c.textContent = fmt(left); c.style.color = left < 5 * 60000 ? 'var(--red)' : left < 10 * 60000 ? 'var(--yellow)' : '';
    const tr = run.events.find(e => e.name.startsWith('transport:'));
    const pk = document.getElementById('exPkg');
    if (tr && pk) { pk.classList.remove('hidden'); const lim = (tr.name.endsWith('non-rtc') ? 30 : 15) * 60000; const pl = lim - elapsed(); const pc = document.getElementById('exPkgClock'); pc.textContent = fmt(pl); pc.style.color = pl < 0 ? 'var(--red)' : pl < 3 * 60000 ? 'var(--yellow)' : ''; }
    const vit = run.events.filter(e => ['blood-pressure', 'pulse', 'respirations'].includes(e.name));
    const va = document.getElementById('exVitAge');
    if (va) { if (!vit.length) va.textContent = t('none yet', '还没测'); else { const age = elapsed() - Math.max(...vit.map(e => e.t)); va.textContent = fmt(age) + ' ' + t('ago', '前'); va.style.color = age > 9 * 60000 ? 'var(--red)' : age > 7 * 60000 ? 'var(--yellow)' : ''; } }
    if (left <= 0 && !busy) { clearInterval(tick); timeUp(el); }
  }, 500);
  if (!voiceOn()) ta.focus();
}
function renderChat(el) {
  const box = el.querySelector('#exChat'); if (!box) return;
  box.innerHTML = run.log.map(l => `<div class="ex-line ${l.role}"><span class="ex-who">${l.role === 'candidate' ? 'You' : l.role.charAt(0).toUpperCase() + l.role.slice(1)} <i>${fmt(l.t)}</i></span><div>${esc(l.text)}</div></div>`).join('')
    + (busy ? `<div class="ex-line examiner"><span class="ex-who">Examiner</span><div class="muted">…</div></div>` : '');
  box.scrollTop = box.scrollHeight;
}
async function candidateSays(el, text) {
  const tms = Math.min(elapsed(), EXAM_MS);
  run.log.push({ t: tms, role: 'candidate', text }); persist();
  busy = true; renderChat(el); hush();
  const spoken = [];
  try {
    const r = await api('/api/examiner/turn', { scenarioId: run.id, track: run.track, elapsedMs: tms, text, log: run.log.slice(0, -1), events: run.events, fired: run.fired });
    for (const s of r.say) { const l = { t: tms, role: s.role, text: s.text }; run.log.push(l); spoken.push(l); }
    for (const l of r.engineLines) { const x = { t: tms, role: 'examiner', text: l }; run.log.push(x); spoken.push(x); }
    run.events.push(...r.events); run.fired = r.fired;
    if (!r.say.length && !r.engineLines.length) { const x = { t: tms, role: 'examiner', text: 'Noted.' }; run.log.push(x); spoken.push(x); }
  } catch (e) {
    run.log.push({ t: tms, role: 'examiner', text: '(connection problem — please repeat that) ' + e.message });
  }
  busy = false; persist(); renderChat(el); speak(spoken);
  if (tms >= EXAM_MS) timeUp(el);
}
function timeUp(el) {
  const l = { t: EXAM_MS, role: 'examiner', text: 'Time. The scenario is over. Please complete your patient care report.' };
  run.log.push(l); speak([l]);
  endCall(el, true);
}
function endCall(el, timed) {
  hush(); if (listening) { try { rec.stop(); } catch (e) {} }
  run.phase = 'pcr'; run.endMs = timed ? EXAM_MS : Math.min(elapsed(), EXAM_MS); run.pcrStartedAt = Date.now(); persist(); draw(el);
}
const PCR_FIELDS = [['cc', 'Chief complaint'], ['hxcc', 'History of chief complaint'], ['pmhx', 'Past medical history'], ['meds', 'Medications'], ['allergies', 'Allergies'],
  ['vitals', 'Vital signs (all sets, with times)'], ['treatments', 'Treatments / protocols (with times, doses, routes)'], ['findings', 'Physical findings'], ['narrative', 'Narrative']];
let pcrTick = null;
function drawPcr(el) {
  el.innerHTML = `
    <div class="card">
      <div class="timer-bar"><span>📝 PCR <b id="pcrClock">05:00</b></span><span class="tiny" style="margin-left:auto">${t('5 minutes, like the real exam', '5 分钟，和真实考试一样')}</span></div>
      ${PCR_FIELDS.map(([k, label]) => `<label class="pcr-field"><span>${label}</span><textarea data-pcr="${k}" rows="${k === 'narrative' ? 4 : 2}">${esc(run.pcr[k] || '')}</textarea></label>`).join('')}
      <div class="btn-row"><button class="btn big" id="pcrSubmit">${t('Submit PCR & get graded', '交 PCR，出成绩')}</button></div>
    </div>`;
  el.querySelectorAll('[data-pcr]').forEach(ta => ta.oninput = () => { run.pcr[ta.dataset.pcr] = ta.value; persist(); });
  const submit = () => { clearInterval(pcrTick); finish(el); };
  el.querySelector('#pcrSubmit').onclick = submit;
  clearInterval(pcrTick);
  pcrTick = setInterval(() => {
    const c = document.getElementById('pcrClock'); if (!c) { clearInterval(pcrTick); return; }
    const left = PCR_MS - (Date.now() - run.pcrStartedAt);
    c.textContent = fmt(left); c.style.color = left < 60000 ? 'var(--red)' : '';
    if (left <= 0) submit();
  }, 500);
}
async function finish(el) {
  el.innerHTML = `<div class="card"><p class="muted">${t('The examiner is grading your station…', '考官正在打分…')}</p></div>`;
  try {
    run.result = await api('/api/examiner/finish', { scenarioId: run.id, track: run.track, endMs: run.endMs, log: run.log, events: run.events, pcr: run.pcr });
  } catch (e) {
    el.innerHTML = `<div class="card"><p>${t('Grading failed:', '打分失败：')} ${esc(e.message)}</p><div class="btn-row"><button class="btn" id="retry">${t('Retry', '重试')}</button></div></div>`;
    el.querySelector('#retry').onclick = () => finish(el); return;
  }
  run.phase = 'result'; run.finished = true;
  const f = run.result.form;
  (S.examinerHistory = S.examinerHistory || []).push({ id: run.id, title: run.brief.scenario.titleEn, date: new Date().toISOString().slice(0, 10), score: f.score, pass: f.pass, autofail: f.autofail });
  if (inMock()) {
    const m = S.examinerMock;
    m.results[m.stage] = { id: run.id, title: run.brief.scenario.titleEn, score: f.score, pass: f.pass, autofail: f.autofail };
    run.mockStage = m.stage;
    if (m.stage === 'trauma') {
      m.active = false;
      (S.examinerMockHistory = S.examinerMockHistory || []).push({ date: new Date().toISOString().slice(0, 10), results: m.results, pass: !!(m.results.medical && m.results.medical.pass && m.results.trauma.pass) });
    }
  }
  S.examinerRun = null; save();
  draw(el);
}
function drawResult(el) {
  const r = run.result, f = r.form, fb = r.feedback;
  const secs = {};
  for (const row of f.rows) (secs[row.section] = secs[row.section] || []).push(row);
  const zh = S.lang !== 'en';
  el.innerHTML = `
    <a class="back-link" href="#/examiner">← ${t('AI Examiner', '考官机器人')}</a>
    <div class="card" style="border-color:${f.pass ? 'var(--green)' : 'var(--red)'}">
      <h2 style="margin-top:0">${esc(run.brief.scenario.titleEn)}</h2>
      <div class="stat-row">
        <div class="stat"><b style="color:${f.pass ? 'var(--green)' : 'var(--red)'}">${f.autofail ? 'FAIL' : f.score + '%'}</b><span>${f.autofail ? t('critical deduction', '100% 扣分项') : t('score (pass 70%)', '得分（70% 及格）')}</span></div>
        <div class="stat"><b>${f.rows.length}</b><span>${t('deductions', '扣分项')}</span></div>
        <div class="stat"><b>${fmt(f.durationMs)}</b><span>${t('call length', '出勤时长')}</span></div>
        <div class="stat"><b>${f.transport.decided ? f.transport.decided.toUpperCase() : '—'}</b><span>${t('your category', '你的分级')} (${f.transport.correct.toUpperCase()})</span></div>
      </div>
      ${f.autofail ? `<div class="notice" style="background:var(--red-soft);border-color:var(--red)">${bi('A 100% deduction was recorded — in the real exam this station is failed regardless of everything else.', '记录到 100% 扣分项——真实考试中本站直接不及格，其余表现不计。')}</div>` : ''}
    </div>
    <div class="card">
      <h3 style="margin-top:0">${ico('list')} ${t('Grading form', '评分表')}</h3>
      ${!f.rows.length ? `<p>${t('No deductions.', '无扣分。')}</p>` : Object.entries(secs).map(([sec, rows]) => `
        <h4 class="ex-sec">${esc(sec)}${f.caps && f.caps[sec] && rows.reduce((a, r) => a + r.weight, 0) > f.caps[sec] ? ` <span class="pill gray">${t(`capped at −${f.caps[sec]}%`, `本节封顶 −${f.caps[sec]}%`)}</span>` : ''}</h4>
        ${rows.map(row => `<div class="ex-row"><div class="ex-row-h"><b>${esc(row.nameEn)}</b>${zh && row.nameZh ? ` <span class="muted">${esc(row.nameZh)}</span>` : ''}<span class="ex-w">−${row.weight}%</span></div>
          <div class="tiny">${esc(row.errorEn)}${zh && row.errorZh ? `<br>${esc(row.errorZh)}` : ''}</div>
          ${row.evidence && (row.evidence.quote || row.evidence.t != null) ? `<div class="ex-ev">${row.evidence.t != null ? `<i>${fmt(row.evidence.t)}</i> ` : ''}${esc(row.evidence.quote || '')}${row.source === 'examiner-judgement' ? ` <span class="pill gray">${t('examiner judgement', '考官判断')}</span>` : ''}</div>` : ''}
        </div>`).join('')}`).join('')}
    </div>
    <div class="card">
      <h3 style="margin-top:0">${ico('clock')} ${t('Timeline', '时间线')}</h3>
      <table class="vitals-table">
        ${f.vitalsSets.map((v, i) => `<tr><th>${t('Vitals set', '体征组')} ${i + 1}</th><td>${fmt(v.start)} → ${v.complete != null ? fmt(v.complete) : t('incomplete', '未完成')}</td></tr>`).join('')}
        <tr><th>${t('Packaged', '打包完成')}</th><td>${f.transport.packagedAt != null ? fmt(f.transport.packagedAt) : '—'}</td></tr>
        <tr><th>${t('Notification', '医院通报')}</th><td>${r.closing.notification.given ? '✓' : '✗'}</td></tr>
        <tr><th>${t('Hand-off', '交接')}</th><td>${r.closing.handoff.given ? '✓' : '✗'}</td></tr>
      </table>
    </div>
    <div class="card"><h3 style="margin-top:0">${t("Examiner's verbal feedback", '考官口头反馈')}</h3><p>${esc(fb.examinerFeedbackEn)}</p>
      ${TTS ? `<div class="btn-row"><button class="btn ghost" id="exReadFb">🔊 ${t('Read it to me', '读给我听')}</button></div>` : ''}</div>
    <details class="acc card"><summary>${ico('cap')} ${t('Coach debrief (not part of the real exam)', '教练复盘（真实考试没有这个）')}</summary>
      <div class="acc-body"><p>${esc(zh ? fb.coachDebriefZh || fb.coachDebriefEn : fb.coachDebriefEn)}</p></div></details>
    ${mockPanel()}
    <div class="btn-row"><a class="btn" href="#/examiner">${t('Another station', '再来一场')}</a><a class="btn ghost" href="#/practical">${t('Practical camp', '实操营')}</a></div>`;
  const nx = el.querySelector('#exMockNext');
  if (nx) nx.onclick = () => { S.examinerMock.stage = 'trauma'; save(); run = null; nav('/examiner-run/' + S.examinerMock.ids.trauma); };
  const rb = el.querySelector('#exReadFb');
  if (rb) rb.onclick = () => { const was = S.examinerVoice; S.examinerVoice = true; speak([{ role: 'examiner', text: fb.examinerFeedbackEn }]); S.examinerVoice = was; };
}
