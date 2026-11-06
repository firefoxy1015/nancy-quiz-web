// ECG lab (心电图练习室): a visual, step-by-step ECG learning session for Weekend 3.
// Every concept is drawn on a real-scale strip from ecgstrip.js, and every step ends in practice with instant feedback.
// Seven steps: one beat → the paper → rate → the six steps → rhythm atlas → rhythm drill → the 12-lead.
// Progress and drill scores stay on this device through the store the caller passes in (prefix aetclass:).
import { t, esc, bi } from './app.js?v=68';
import { RHYTHMS, RHYTHM, GROUPS, makeStrip, stripSVG, overlaysSVG, customStrip, beat, make12, LAYOUT, WALLS, PATTERNS, wallOf, rng, NOISE } from './ecgstrip.js?v=68';

const STEPS = [['beat', 'One beat', '一个心跳'], ['paper', 'The paper', '格子与量尺'], ['rate', 'Rate', '算心率'], ['six', 'Six steps', '六步法'],
  ['atlas', 'Rhythm atlas', '节律图鉴'], ['drill', 'Rhythm drill', '节律训练'], ['twelve', '12-lead', '12 导联']];
const seed = () => Math.floor(Math.random() * 1e9) + 1;
const rnd = n => Math.floor(Math.random() * n);
const pick = xs => xs[rnd(xs.length)];
const shuffle = xs => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const name = R => t(R.en, R.zh);
// a strip in a box that fits the screen, with a zoom toggle that switches it to true paper scale (scrollable)
const box = (s, o = {}) => { const W = (o.win ? o.win[1] - o.win[0] : s.sec) * 25; return `<div class="ecg-wrap zoomable" style="--zw:${Math.round(W * 4.6)}px"><button class="ecg-zoom" type="button" title="zoom">⤢</button><div class="ecg-svg">${stripSVG(s, o)}</div></div>`; };
const rebox = (el, s, o = {}) => { const w = el.classList.contains('ecg-wrap') ? el : el.querySelector('.ecg-wrap'); w.querySelector('.ecg-svg').innerHTML = stripSVG(s, o); };
const note = (en, zh, cls = 'ecg-note') => `<div class="${cls}">${bi(en, zh)}</div>`;
const six = (R, bad = []) => `<table class="ecg-six">${[['rate', 'Rate', '速率'], ['reg', 'Regularity', '规律性'], ['p', 'P waves', 'P 波'], ['pr', 'PR', 'PR'], ['qrs', 'QRS', 'QRS']]
  .map(([k, en, zh]) => `<tr class="${bad.includes(k) ? 'bad' : ''}"><th>${t(en, zh)}</th><td>${t(R.find[k][0], R.find[k][1])}</td></tr>`).join('')}</table>`;
const opts = (items, cls = '') => `<div class="eo-grid ${cls}">${items.map(([v, label]) => `<button class="eo" data-v="${esc(v)}">${label}</button>`).join('')}</div>`;
const GIVEAWAY = { nsr: [{ type: 'p' }, { type: 'pr', k: 1 }], sbrady: [{ type: 'six' }, { type: 'rcount', to: 6 }], stachy: [{ type: 'six' }, { type: 'rcount', to: 6 }], sarr: [{ type: 'rr' }], spause: [{ type: 'rr' }], pac: [{ type: 'p' }, { type: 'rr' }],
  flutter: [{ type: 'rr', boxes: true }], afib: [{ type: 'rr', boxes: true }, { type: 'p' }], svt: [{ type: 'rr', boxes: true }, { type: 'p' }], junc: [{ type: 'p' }], pvc: [{ type: 'rr' }], vt: [{ type: 'qrs', k: 1 }, { type: 'p' }], torsades: [], vf: [], ivr: [{ type: 'qrs', k: 0 }, { type: 'p' }], asys: [], pea: [],
  avb1: [{ type: 'pr', k: 0 }, { type: 'pr', k: 2 }], avb2w: [{ type: 'p' }, { type: 'pr', k: 0 }, { type: 'pr', k: 1 }, { type: 'pr', k: 2 }], avb2m: [{ type: 'p' }, { type: 'pr', k: 0 }, { type: 'pr', k: 1 }], avb3: [{ type: 'p' }, { type: 'rr' }], bbb: [{ type: 'qrs', k: 1 }, { type: 'pr', k: 1 }], paced: [{ type: 'spike' }], artifact: [{ type: 'rcount', to: 6 }] };
const CONFUSE = { nsr: ['sarr', 'avb1', 'sbrady'], sbrady: ['junc', 'nsr', 'avb1'], stachy: ['svt', 'afib', 'flutter'], sarr: ['afib', 'nsr', 'pac'], spause: ['avb2m', 'sbrady', 'sarr'], pac: ['pvc', 'sarr', 'afib'], flutter: ['svt', 'stachy', 'afib'], afib: ['sarr', 'flutter', 'pac'],
  svt: ['stachy', 'flutter', 'vt'], junc: ['sbrady', 'ivr', 'avb3'], pvc: ['pac', 'bbb', 'vt'], vt: ['svt', 'torsades', 'paced'], torsades: ['vf', 'vt', 'artifact'], vf: ['artifact', 'torsades', 'asys'], ivr: ['avb3', 'junc', 'paced'], asys: ['vf', 'spause', 'pea'],
  avb1: ['nsr', 'avb2w', 'sbrady'], avb2w: ['avb2m', 'pac', 'sarr'], avb2m: ['avb2w', 'avb3', 'spause'], avb3: ['avb2m', 'ivr', 'junc'], bbb: ['vt', 'paced', 'pvc'], paced: ['bbb', 'vt', 'ivr'], artifact: ['vf', 'torsades', 'afib'] };
const BASIC = ['nsr', 'sbrady', 'stachy', 'afib', 'flutter', 'svt', 'vt', 'vf', 'asys', 'avb1', 'avb3', 'pvc', 'paced', 'artifact'];

export function ecgLab(host, store, params = {}, io = {}) {
  const done = () => store.get('ecg:done', {});
  /* ---- teacher narration: one shared player; each section has a play button keyed to a clip (w03-lab-ecg-<key>) ---- */
  const player = document.createElement('div'); player.className = 'lab-player'; player.innerHTML = `<audio preload="none"></audio><span class="who">${t('Teacher', '老师')}</span><span class="what"></span><button class="spd" type="button">1×</button><button class="x" type="button" title="${t('Stop', '停止')}">✕</button>`;
  const au = player.querySelector('audio'); let cur = null, rate = store.get('ecg:speed', 1);
  const paintPlay = () => host.querySelectorAll('.say-btn').forEach(b => { const on = cur && b.dataset.say === cur; b.classList.toggle('on', !!on); b.classList.toggle('paused', !!on && au.paused); });
  const stopSay = () => { au.pause(); cur = null; player.classList.remove('show'); paintPlay(); };
  async function say(key, label) {
    if (cur === key) { if (au.paused) au.play(); else au.pause(); paintPlay(); return; }
    cur = key; player.classList.add('show'); player.querySelector('.what').textContent = label || ''; paintPlay();
    try { au.src = await io.audio('audio/w03-lab-ecg-' + key + '.mp3'); au.playbackRate = rate; await au.play(); }
    catch { player.querySelector('.what').textContent = t('This clip is not available yet.', '这段还没有录音。'); cur = null; paintPlay(); }
  }
  au.onended = () => { cur = null; paintPlay(); player.classList.remove('show'); };
  au.onpause = au.onplay = paintPlay;
  player.querySelector('.x').onclick = stopSay;
  player.querySelector('.spd').onclick = e => { rate = rate >= 1.5 ? 1 : +(rate + 0.25).toFixed(2); au.playbackRate = rate; store.set('ecg:speed', rate); e.target.textContent = rate + '×'; };
  player.querySelector('.spd').textContent = rate + '×';
  const sayBtn = (key, label) => io.audio ? `<button class="say-btn" type="button" data-say="${key}" data-label="${esc(label || '')}" title="${t('Teacher explains this', '老师讲这一段')}"><span class="ic">▶</span>${t('Teacher', '老师讲')}</button>` : '';
  const markDone = k => { const d = done(); if (!d[k]) { d[k] = true; store.set('ecg:done', d); paintTabs(); } };
  let step = STEPS.some(s => s[0] === params.s) ? params.s : store.get('ecg:step', 'beat');
  host.innerHTML = `<div class="lab-tabs" id="labTabs"></div><div id="labBody"></div>`;
  host.addEventListener('click', e => { const z = e.target.closest('.ecg-zoom'); if (z) z.parentElement.classList.toggle('zoom'); const sb = e.target.closest('.say-btn'); if (sb) say(sb.dataset.say, sb.dataset.label); });
  host.appendChild(player);
  const tabs = host.querySelector('#labTabs'), body = host.querySelector('#labBody');
  function paintTabs() {
    const d = done();
    tabs.innerHTML = STEPS.map(([k, en, zh], i) => `<button class="lab-tab${k === step ? ' on' : ''}${d[k] ? ' done' : ''}" data-s="${k}"><span class="n">${d[k] ? '✓' : i + 1}</span>${t(en, zh)}</button>`).join('');
    tabs.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { step = b.dataset.s; store.set('ecg:step', step); paintTabs(); draw(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  }
  const nextBar = () => { const i = STEPS.findIndex(s => s[0] === step); const n = STEPS[i + 1]; return `<div class="btn-row lab-next">${i > 0 ? `<button class="btn ghost" data-go="${STEPS[i - 1][0]}">← ${t(STEPS[i - 1][1], STEPS[i - 1][2])}</button>` : ''}${n ? `<button class="btn" data-go="${n[0]}">${t('Next', '下一步')}: ${t(n[1], n[2])} →</button>` : `<a class="btn" href="#/aet/class?brief=3">${t('Back to the condensed book', '回到精讲')}</a>`}</div>`; };
  function draw() {
    stopSay();
    ({ beat: stepBeat, paper: stepPaper, rate: stepRate, six: stepSix, atlas: stepAtlas, drill: stepDrill, twelve: stepTwelve })[step](body);
    body.insertAdjacentHTML('beforeend', nextBar());
    body.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { step = b.dataset.go; store.set('ecg:step', step); paintTabs(); draw(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  }
  paintTabs(); draw();

  /* ================= 1 · one beat ================= */
  function stepBeat(el) {
    const s = makeStrip('nsr', 11, 4), b1 = s.beats.filter(b => b.t0 >= 0.05)[1], win = [b1.t0 - 0.75, b1.t0 + 1.05];
    const WAVES = [
      ['P', 'P wave', 'P 波', 'The atria depolarize: the SA node fires and the signal spreads across both atria. A small round bump, upright in lead II when it comes from the SA node. No P, or a strange P, means the beat did not start in the SA node.', '心房除极：SA 结点火，信号铺满两个心房。一个小圆包，来自 SA 结时在 II 导直立。没有 P、或 P 长得怪，说明这一跳不是 SA 结发起的。', 'sa'],
      ['PR', 'PR interval', 'PR 间期', 'From the start of P to the start of QRS: the signal crosses the atria and then waits at the AV node, so the atria can empty into the ventricles. Normal 0.12–0.20 s (3–5 small boxes). Longer = the AV node is slow (block). Measure to the start of the QRS, never to the R peak.', '从 P 的起点到 QRS 的起点：信号穿过心房，然后在 AV 结等一下，让心房把血排空进心室。正常 0.12–0.20 s（3–5 小格）。更长 = AV 结走得慢（阻滞）。量到 QRS 起点，绝不量到 R 波峰。', 'av'],
      ['QRS', 'QRS complex', 'QRS 波群', 'The ventricles depolarize: His bundle → bundle branches → Purkinje fibres, so fast that the wave is tall and narrow. Q = first downward, R = first upward, S = the downward after R. Normal < 0.12 s (< 3 small boxes). Wide = the signal crawled through muscle: ventricular origin, or a bundle branch block.', '心室除极：His 束 → 束支 → 浦肯野纤维，传得极快，所以又高又窄。Q = 第一个向下，R = 第一个向上，S = R 之后向下。正常 < 0.12 s（< 3 小格）。宽 = 信号在肌肉里爬：室性起源，或束支阻滞。', 'v'],
      ['J', 'J point', 'J 点', 'Where the QRS ends and the ST segment begins. This is the exact spot where ST elevation or depression is measured, against the TP baseline.', 'QRS 结束、ST 段开始的那一点。量 ST 抬高或压低，就在这一点、以 TP 段为基线量。', 'v'],
      ['ST', 'ST segment', 'ST 段', 'Between depolarization and repolarization every ventricular cell is charged, so the line should sit flat on the baseline. Raised = injury (the STEMI sign); dropped = ischemia, or the mirror image of injury on the far wall.', '除极和复极之间，每个心室细胞都带着电，所以这一段应该平平地躺在基线上。抬高 = 损伤（STEMI 的标志）；压低 = 缺血，或对面墙损伤的镜像。', 'v'],
      ['T', 'T wave', 'T 波', 'The ventricles recharge (repolarize). A broad, slightly lopsided bump, upright in most leads. Peaked = high potassium or very early ischemia; inverted = ischemia (normal in some leads). The middle of the T is the vulnerable period: a beat landing here can start VF.', '心室充电（复极）。一个宽、略不对称的包，大多数导联直立。高尖 = 高钾或极早期缺血；倒置 = 缺血（某些导联正常）。T 波中段是易损期：一跳落在这里可能引发 VF。', 'v'],
      ['QT', 'QT interval', 'QT 间期', 'Start of QRS to end of T: one whole ventricular cycle, charge and recharge. Roughly less than half the R-R at normal rates (0.35–0.45 s). A long QT (drugs, low K⁺ / Mg²⁺) invites torsades.', 'QRS 起点到 T 终点：心室一整个周期，充电加放电。正常心率下大约不到 R-R 的一半（0.35–0.45 s）。QT 延长（药物、低钾低镁）招来尖端扭转。', 'v'],
      ['TP', 'TP segment (baseline)', 'TP 段（基线）', 'The flat line after T and before the next P: nothing is happening in the heart. This is the baseline you compare the ST segment to. Faster rates eat this flat part first.', 'T 之后、下一个 P 之前的平线：心脏里什么都没发生。ST 段抬没抬，就是和这条线比。心率变快，先被吃掉的就是这段平线。', '']];
    const seen = store.get('ecg:waves', {});
    const heartSVG = part => `<svg class="ecg-heart" viewBox="0 0 220 200">
      <path class="hb" d="M40 20h140a14 14 0 0 1 14 14v52H26V34a14 14 0 0 1 14-14z"/><path class="hb" d="M26 86h154v70a30 30 0 0 1-30 30H56a30 30 0 0 1-30-30z"/>
      <path class="hl" d="M110 20v170"/><path class="hl" d="M26 86h154"/>
      <text class="ht" x="68" y="50">${t('Right atrium', '右心房')}</text><text class="ht" x="150" y="50">${t('Left atrium', '左心房')}</text><text class="ht" x="68" y="140">${t('Right ventricle', '右心室')}</text><text class="ht" x="150" y="140">${t('Left ventricle', '左心室')}</text>
      <circle class="hn${part === 'sa' ? ' on' : ''}" cx="48" cy="32" r="7"/><text class="hs" x="60" y="30">SA 60–100</text>
      <circle class="hn${part === 'av' ? ' on' : ''}" cx="104" cy="82" r="7"/><text class="hs" x="80" y="78">AV 40–60</text>
      <path class="hp${part === 'v' ? ' on' : ''}" d="M104 88v22M104 110l-28 30M104 110l28 30M76 140l-14 24M76 140l14 24M132 140l-14 24M132 140l14 24"/>
      <text class="hs" x="112" y="104">His</text><text class="hs" x="140" y="178">${t('Purkinje 20–40', '浦肯野 20–40')}</text>
      <path class="hw${part === 'sa' ? ' on' : ''}" d="M55 38c10 10 20 14 48 16"/><path class="hw${part === 'sa' ? ' on' : ''}" d="M55 38c30 6 70 6 110 10"/></svg>`;
    const show = key => {
      const w = WAVES.find(x => x[0] === key);
      seen[key] = true; store.set('ecg:waves', seen); if (WAVES.every(x => seen[x[0]])) markDone('beat');
      el.querySelector('#beatStrip').innerHTML = stripSVG(s, { pxPerMm: 7, win, baseMm: 20, heightMm: 30, textMm: 1.6, overlays: [{ type: 'wave', k: 1, wave: key }, { type: 'baseline' }, ...(key === 'J' ? [{ type: 'j', n: 9, label: true }] : []), ...(key === 'PR' ? [{ type: 'pr', k: 1, boxWord: ' ' + t('sm', '小格') }] : []), ...(key === 'QRS' ? [{ type: 'qrs', k: 1, boxWord: ' ' + t('sm', '小格') }] : []), ...(key === 'QT' ? [{ type: 'qt', k: 1 }] : [])] });
      el.querySelector('#beatText').innerHTML = `<b>${t(w[1], w[2])} ${sayBtn('wave-' + key, t(w[1], w[2]))}</b>${bi(w[3], w[4])}`;
      if (cur && cur.startsWith('wave-') && cur !== 'wave-' + key) say('wave-' + key, t(w[1], w[2]));
      el.querySelector('#beatHeart').innerHTML = heartSVG(w[5]);
      el.querySelectorAll('[data-w]').forEach(b => b.classList.toggle('on', b.dataset.w === key));
    };
    el.innerHTML = `<h2>${t('1 · One beat on paper', '1 · 纸上的一次心跳')} ${sayBtn('beat-intro', t('One beat', '一个心跳'))}</h2>
      ${bi('The ECG is not a picture of the heart. It is a graph of its electricity against time, drawn on squared paper. One heartbeat leaves three marks: a small bump (P), a tall spike (QRS) and a broad bump (T). Tap each part to see where it comes from.',
        '心电图不是心脏的照片，是心脏的电随时间画在方格纸上的曲线。一次心跳留下三个记号：一个小包（P）、一个高尖（QRS）、一个宽包（T）。点每个部分，看它从哪里来。')}
      <div class="ecg-chips">${WAVES.map(w => `<button data-w="${w[0]}" class="${seen[w[0]] ? 'seen' : ''}">${w[0]}</button>`).join('')}</div>
      <div id="beatStrip" class="ecg-wrap fitx"></div>
      <div class="ecg-two"><div id="beatText" class="ecg-note"></div><div id="beatHeart"></div></div>
      ${note('Electricity first, then contraction. A perfect-looking QRS does not prove the heart is pumping: only a pulse does. Every rhythm you ever read, you also feel the pulse.', '先有电，后有收缩。一个漂亮的 QRS 证明不了心脏在泵血，只有脉搏能。以后你读的每一条节律，都同时摸脉搏。', 'ecg-key')}`;
    el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => show(b.dataset.w));
    show('P');
  }

  /* ================= 2 · the paper ================= */
  function stepPaper(el) {
    const s = makeStrip('nsr', 5, 3);
    const zoom = stripSVG(s, { pxPerMm: 8, win: [0.45, 2.05], baseMm: 21, heightMm: 30, textMm: 1.5, overlays: [{ type: 'box', t: 0.5, y: 2, text: '1 mm = 0.04 s' }, { type: 'box', t: 0.5, y: 5, big: true, text: '5 mm = 0.20 s' }, { type: 'mv', t: 1.95 }, { type: 'baseline' }] });
    const prog = store.get('ecg:paper', { n: 0, ok: 0 });
    el.innerHTML = `<h2>${t('2 · The paper, and how to measure on it', '2 · 格子，以及怎么在上面量')} ${sayBtn('paper-intro', t('The paper', '格子'))}</h2>
      ${bi('The paper moves at 25 mm per second. Sideways is time, up and down is voltage. That gives every box a fixed meaning, and all ECG numbers are just boxes counted.',
        '纸以每秒 25 mm 的速度走。横向是时间，纵向是电压。于是每个格子都有固定的含义，心电图的所有数字都只是数格子。')}
      <div class="ecg-wrap fitx">${zoom}</div>
      <table class="ecg-six"><tr><th>${t('1 small box (1 mm)', '1 小格（1 mm）')}</th><td><b>0.04 s</b></td></tr><tr><th>${t('1 big box (5 small)', '1 大格（5 小格）')}</th><td><b>0.20 s</b></td></tr><tr><th>${t('5 big boxes', '5 大格')}</th><td><b>1 s</b></td></tr><tr><th>${t('30 big boxes', '30 大格')}</th><td><b>6 s</b> ${t('(the strip you count rate on)', '（算心率用的那一段）')}</td></tr><tr><th>${t('10 mm up', '向上 10 mm')}</th><td><b>1 mV</b></td></tr></table>
      ${note('Three numbers to own: PR 0.12–0.20 s = 3–5 small boxes. QRS under 0.12 s = under 3 small boxes. QT about 0.35–0.45 s. The school quiz key once called a small box 0.20 s: that is the big box; a small box is 0.04 s.',
        '要记死的三个数：PR 0.12–0.20 s = 3–5 小格；QRS 不到 0.12 s = 不到 3 小格；QT 约 0.35–0.45 s。学校题库答案键曾把小格写成 0.20 s：那是大格，小格是 0.04 s。', 'ecg-key')}
      <h3>${t('Caliper: drag across the strip', '量尺：在条带上拖一下')} ${sayBtn('paper-caliper', t('Caliper', '量尺'))}</h3>
      ${bi('Put your finger on the start of what you measure, drag to its end, and read the boxes. Try the PR (start of P to start of QRS) and the QRS (start to the J point).', '手指放在要量的起点，拖到终点，读格数。试试 PR（P 起点到 QRS 起点）和 QRS（起点到 J 点）。')}
      <div id="cal" class="ecg-wrap cal"></div><div id="calOut" class="ecg-readout">${t('Drag to measure', '拖动测量')}</div>
      <h3>${t('Practice: long or normal?', '练习：长还是正常？')} <span class="tiny muted" id="paperScore"></span></h3>
      <div id="paperQ"></div>`;
    // caliper
    const cw = el.querySelector('#cal'), out = el.querySelector('#calOut'), co = { pxPerMm: 5, baseMm: 20, heightMm: 30, textMm: 2 };
    let a = null, b = null, drag = false;
    const toT = e => { const r = cw.firstElementChild.getBoundingClientRect(); return Math.max(0, Math.min(s.sec, (e.clientX - r.left) / r.width * s.sec)); };
    cw.innerHTML = stripSVG(s, co);
    const paint = () => { const o = a == null ? [] : [{ type: 'cal', a: Math.min(a, b), b: Math.max(a, b), text: `${Math.round(Math.abs(b - a) / 0.04)} ${t('small boxes', '小格')} · ${Math.abs(b - a).toFixed(2)} s` }]; cw.querySelector('.ovl').innerHTML = overlaysSVG(s, Object.assign({ overlays: o }, co));
      if (a != null) out.innerHTML = `<b>${Math.round(Math.abs(b - a) / 0.04)}</b> ${t('small boxes', '小格')} = <b>${Math.abs(b - a).toFixed(2)} s</b>`; };
    cw.onpointerdown = e => { a = b = toT(e); drag = true; try { cw.setPointerCapture(e.pointerId); } catch {} e.preventDefault(); paint(); };
    cw.onpointermove = e => { if (drag) { b = toT(e); paint(); } };
    cw.onpointerup = cw.onpointercancel = () => { drag = false; };
    // practice
    const qEl = el.querySelector('#paperQ'), score = el.querySelector('#paperScore');
    const paintScore = () => { score.textContent = `${prog.ok} / ${prog.n}`; if (prog.n >= 8) markDone('paper'); };
    function ask() {
      const kind = Math.random() < 0.5 ? 'pr' : 'qrs';
      const id = kind === 'pr' ? pick(['nsr', 'nsr', 'avb1', 'avb1', 'sbrady']) : pick(['nsr', 'nsr', 'bbb', 'bbb', 'avb1']);
      const st = makeStrip(id, seed(), 3), qb = st.beats.filter(x => !x.dropped && !x.pOnly && x.t0 >= 0.05)[1];
      const v = kind === 'pr' ? qb.pr : (qb.wide ? Math.max(0.14, qb.qrsW) : qb.qrsW), boxes = Math.round(v / 0.04);
      const truth = kind === 'pr' ? (boxes > 5 ? 'long' : 'normal') : (boxes >= 3 ? 'wide' : 'narrow');
      qEl.innerHTML = `${box(st, { pxPerMm: 5, baseMm: 20, heightMm: 30, win: [0.3, 2.9], textMm: 2, overlays: [{ type: 'band', a: qb.t0 - (kind === 'pr' ? qb.pr : 0) - 0.02, b: qb.t0 + (kind === 'pr' ? 0 : v) + 0.02 }] })}
        <p><b>${kind === 'pr' ? t('The highlighted PR is…', '高亮的这个 PR 是……') : t('The highlighted QRS is…', '高亮的这个 QRS 是……')}</b></p>
        ${kind === 'pr' ? opts([['normal', t('Normal · 3–5 boxes', '正常 · 3–5 格')], ['long', t('Long · more than 5', '长 · 超过 5 格')]]) : opts([['narrow', t('Narrow · under 3 boxes', '窄 · 不到 3 格')], ['wide', t('Wide · 3 or more', '宽 · 3 格或以上')]])}
        <div class="ecg-fb" id="fb"></div>`;
      qEl.querySelectorAll('.eo').forEach(bt => bt.onclick = () => {
        const ok = bt.dataset.v === truth; prog.n++; if (ok) prog.ok++; store.set('ecg:paper', prog); paintScore();
        qEl.querySelectorAll('.eo').forEach(x => { x.disabled = true; x.classList.toggle('right', x.dataset.v === truth); x.classList.toggle('wrong', x === bt && !ok); });
        rebox(qEl, st, { pxPerMm: 5, baseMm: 20, heightMm: 30, win: [0.3, 2.9], textMm: 2, overlays: [kind === 'pr' ? { type: 'pr', k: 1, boxWord: ' ' + t('sm', '小格') } : { type: 'qrs', k: 1, boxWord: ' ' + t('sm', '小格') }] });
        qEl.querySelector('#fb').innerHTML = `${ok ? '✓' : '✗'} <b>${boxes} ${t('small boxes', '小格')} = ${v.toFixed(2)} s</b> · ${kind === 'pr' ? (truth === 'long' ? t('more than 5 boxes: first-degree AV block (the AV node is slow)', '超过 5 格：一度房室阻滞（AV 结走得慢）') : t('3–5 boxes: normal AV conduction', '3–5 格：AV 传导正常')) : (truth === 'wide' ? t('3 boxes or more: the ventricles were activated slowly, through muscle: ventricular origin or bundle branch block', '3 格或以上：心室是被慢慢地、经肌肉激活的：室性起源或束支阻滞') : t('under 3 boxes: the normal fast pathway was used', '不到 3 格：走的是正常的快速通路'))}
          <button class="btn ghost" id="nx">${t('Next', '下一题')} →</button>`;
        qEl.querySelector('#nx').onclick = ask;
      });
    }
    paintScore(); ask();
  }

  /* ================= 3 · rate ================= */
  function stepRate(el) {
    const s6 = makeStrip('nsr', 23, 6), sReg = makeStrip('nsr', 31, 6), prog = store.get('ecg:rate', { n: 0, ok: 0 });
    el.innerHTML = `<h2>${t('3 · Counting the rate', '3 · 算心率')}</h2>
      <h3>${t('Method 1 · six seconds × 10 (works for every rhythm)', '方法一 · 6 秒 × 10（任何节律都能用）')} ${sayBtn('rate-six', t('Six-second method', '6 秒法'))}</h3>
      ${bi('Thirty big boxes are six seconds. Count the R waves inside them and multiply by ten. Tap the button to count.', '30 个大格就是 6 秒。数这 6 秒里有几个 R 波，乘以 10。点按钮数一数。')}
      <div id="r6"></div><div class="btn-row"><button class="btn ghost" id="cnt">${t('Count the R waves', '数 R 波')}</button><span id="r6out" class="ecg-readout"></span></div>
      <h3>${t('Method 2 · 300-150-100-75-60-50 (regular rhythms only)', '方法二 · 300-150-100-75-60-50（只用于规则节律）')} ${sayBtn('rate-300', t('300 rule', '300 法'))}</h3>
      ${bi('Find an R wave that lands on a thick line. The next thick lines are 300, 150, 100, 75, 60, 50. Read the number nearest to the next R wave. One big box between R waves = 300, two = 150, three = 100, four = 75, five = 60.',
        '找一个正好落在粗线上的 R 波。后面每条粗线依次是 300、150、100、75、60、50。看下一个 R 落在哪条附近，就读那个数。两个 R 之间隔 1 大格 = 300，2 格 = 150，3 格 = 100，4 格 = 75，5 格 = 60。')}
      ${box(sReg, { overlays: [{ type: 'thick', k: 1 }] })}
      ${note('If the R-R intervals are not all the same, the 300 method has nothing to measure. Irregular rhythm (atrial fibrillation, dropped beats): six-second method only.', 'R-R 不是每个都一样时，300 法没东西可量。不规则的节律（房颤、掉跳）：只用 6 秒法。', 'ecg-key')}
      <h3>${t('Practice: what is the rate?', '练习：心率多少？')} <span class="tiny muted" id="rateScore"></span></h3>
      ${bi('Type the rate from the six-second method. Within 10 counts as right.', '用 6 秒法算出心率填进去。误差 10 以内算对。')}
      <div id="rateQ"></div>`;
    const r6 = el.querySelector('#r6'); let counted = false;
    const paint6 = () => { const o = { overlays: [{ type: 'six', label: '6 s = 30 ' + t('big boxes', '大格') }, ...(counted ? [{ type: 'rcount', to: 6 }] : [])] }; if (r6.querySelector('.ecg-svg')) rebox(r6, s6, o); else r6.innerHTML = box(s6, o); el.querySelector('#r6out').innerHTML = counted ? `${s6.rate6 / 10} × 10 = <b>${s6.rate6}</b>` : ''; };
    el.querySelector('#cnt').onclick = () => { counted = !counted; paint6(); }; paint6();
    const q = el.querySelector('#rateQ'), score = el.querySelector('#rateScore');
    const paintScore = () => { score.textContent = `${prog.ok} / ${prog.n}`; if (prog.n >= 6) markDone('rate'); };
    function ask() {
      const id = pick(['nsr', 'sbrady', 'stachy', 'afib', 'svt', 'flutter', 'junc', 'avb1', 'sarr']), st = makeStrip(id, seed(), 6), R = RHYTHM[id];
      q.innerHTML = `${box(st, { overlays: [{ type: 'six' }] })}
        <div class="ecg-inline"><input type="number" id="rateIn" inputmode="numeric" placeholder="${t('rate', '心率')}" min="0" max="300"> <button class="btn" id="rateGo">${t('Check', '核对')}</button></div><div class="ecg-fb" id="fb"></div>`;
      const inp = q.querySelector('#rateIn'), go = () => {
        const v = +inp.value; if (!inp.value) return; const ok = Math.abs(v - st.rate6) <= 10; prog.n++; if (ok) prog.ok++; store.set('ecg:rate', prog); paintScore();
        rebox(q, st, { overlays: [{ type: 'six' }, { type: 'rcount', to: 6 }] }); inp.disabled = true; q.querySelector('#rateGo').disabled = true;
        q.querySelector('#fb').innerHTML = `${ok ? '✓' : '✗'} <b>${st.rate6 / 10} R × 10 = ${st.rate6}</b> · ${name(R)}${st.spec.regular ? '' : ' · ' + t('irregular: six-second method only', '不规则：只能用 6 秒法')} <button class="btn ghost" id="nx">${t('Next', '下一题')} →</button>`;
        q.querySelector('#nx').onclick = ask; };
      q.querySelector('#rateGo').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); }; inp.focus();
    }
    paintScore(); ask();
  }

  /* ================= 4 · six steps ================= */
  function stepSix(el) {
    const EX = [['nsr', 17, []], ['afib', 41, ['reg', 'p', 'pr']], ['avb1', 19, ['pr']], ['vt', 29, ['p', 'pr', 'qrs']]];
    const STEP6 = [
      ['Rate', '速率', 'Count the R waves in six seconds and multiply by ten. Under 60 slow, over 100 fast. Then check it against the patient’s pulse.', '数 6 秒里的 R 波乘以 10。< 60 慢，> 100 快。然后和病人的脉搏核对。', [{ type: 'six' }, { type: 'rcount', to: 6 }]],
      ['Regularity', '规律性', 'Measure R to R with a paper edge. All the same = regular. A repeating pattern of dropped beats = regularly irregular. No pattern at all = irregularly irregular.', '用纸边量 R 到 R。全一样 = 规则。有重复规律的掉跳 = 规律的不规则。毫无规律 = 绝对不规则。', [{ type: 'rr' }]],
      ['P waves', 'P 波', 'Four questions: is there a P? upright in lead II? all the same shape? exactly one before every QRS? Any “no” means the rhythm is not sinus.', '四问：有 P 吗？II 导直立吗？形态都一样吗？每个 QRS 前恰好一个吗？任何一个「否」，就不是窦性。', [{ type: 'p' }]],
      ['PR interval', 'PR 间期', 'Start of P to start of QRS: 3–5 small boxes and the same every beat. Longer = AV block. Changing = the P and QRS may not belong together.', 'P 起点到 QRS 起点：3–5 小格，每跳一样。更长 = 房室阻滞。一直在变 = P 和 QRS 可能根本不是一对。', [{ type: 'pr', k: 0 }, { type: 'pr', k: 1 }, { type: 'pr', k: 2 }]],
      ['QRS width', 'QRS 宽窄', 'Under 3 small boxes = narrow = the beat came from above the ventricles. 3 or more = wide = ventricular origin or bundle branch block. Width names the rhythm; speed does not.', '不到 3 小格 = 窄 = 来自心室以上。3 格或以上 = 宽 = 室性起源或束支阻滞。宽窄决定命名，快慢不决定。', [{ type: 'qrs', k: 0 }, { type: 'qrs', k: 1 }]],
      ['ST and T', 'ST 与 T', 'Find the TP baseline, then look at the J point: is the ST raised or dropped? Are the T waves peaked or inverted? On a monitor strip this is only a flag: ST is read on a printed 12-lead.', '先找 TP 基线，再看 J 点：ST 抬了还是压了？T 波高尖还是倒置？在监护条上这只是提示：ST 要在打印的 12 导上读。', [{ type: 'baseline', label: 'TP' }, { type: 'j', n: 4, label: true }]]];
    let ex = 0, k = 0; const seenEx = store.get('ecg:six', {});
    el.innerHTML = `<h2>${t('4 · The six steps, in order, every time', '4 · 六步法：每次都按同一个顺序')} ${sayBtn('six-intro', t('Six steps', '六步法'))}</h2>
      ${bi('Do not name a rhythm by its look. Walk the six steps on a clean six-second piece of lead II, and the name falls out of whichever step fails. Here is normal sinus rhythm first, then three strips where one step breaks.',
        '不要凭长相叫节律。拿一段干净的 II 导 6 秒条，走完六步，名字自然从「哪一步不正常」里掉出来。先看正常窦律，再看三条各有一步出问题的。')}
      <div class="ecg-chips" id="exChips">${EX.map((e, i) => `<button data-ex="${i}">${name(RHYTHM[e[0]])}</button>`).join('')}</div>
      <div class="ecg-chips" id="stepChips">${STEP6.map((s, i) => `<button data-k="${i}">${i + 1} ${t(s[0], s[1])}</button>`).join('')}<button data-k="6">${t('Conclusion', '结论')}</button></div>
      <div id="sixStrip"></div><div id="sixText" class="ecg-note"></div><div id="sixTable"></div>`;
    const paint = () => {
      const [id, sd, bad] = EX[ex], st = makeStrip(id, sd, 6), R = RHYTHM[id];
      seenEx[ex] = true; store.set('ecg:six', seenEx); if (EX.every((_, i) => seenEx[i]) && k === 6) markDone('six');
      el.querySelectorAll('[data-ex]').forEach(b => b.classList.toggle('on', +b.dataset.ex === ex));
      el.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', +b.dataset.k === k));
      const keys = ['rate', 'reg', 'p', 'pr', 'qrs', 'st'];
      { const o = { overlays: k < 6 ? STEP6[k][4] : [] }, h = el.querySelector('#sixStrip'); if (h.querySelector('.ecg-svg')) rebox(h, st, o); else h.innerHTML = box(st, o); }
      if (k < 6) { const s = STEP6[k], fail = bad.includes(keys[k]); const finding = keys[k] === 'st' ? t('Nothing to call on this strip.', '这条上没有要报的。') : t(R.find[keys[k]][0], R.find[keys[k]][1]);
        el.querySelector('#sixText').innerHTML = `<b>${k + 1} · ${t(s[0], s[1])} ${sayBtn('six-' + (k + 1), t(s[0], s[1]))}</b>${bi(s[2], s[3])}<div class="ecg-finding ${fail ? 'bad' : 'ok'}">${fail ? '✗' : '✓'} ${t('This strip', '这条')}: ${finding}</div>`;
        el.querySelector('#sixTable').innerHTML = ''; }
      else { el.querySelector('#sixText').innerHTML = `<b>${t('Conclusion', '结论')}: ${name(R)} ${sayBtn('six-concl-' + id, name(R))}</b>${bi(R.tell[0], R.tell[1])}${bad.length ? bi('The steps that failed are marked. That is the whole diagnosis.', '失败的步骤已标红。诊断就是这几步。') : bi('Every step passed: a normal rhythm that still needs a patient assessment.', '六步全过：正常节律，病人照样要评估。')}`;
        el.querySelector('#sixTable').innerHTML = six(R, bad); }
    };
    el.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { ex = +b.dataset.ex; k = 0; paint(); });
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { k = +b.dataset.k; paint(); });
    paint();
  }

  /* ================= 5 · atlas ================= */
  function stepAtlas(el) {
    let group = store.get('ecg:group', 'sinus'); const seenG = store.get('ecg:atlas', {});
    el.innerHTML = `<h2>${t('5 · Rhythm atlas', '5 · 节律图鉴')} ${sayBtn('atlas-intro', t('Rhythm atlas', '节律图鉴'))}</h2>
      ${bi('Grouped by where the beat starts, because that is what the strip is telling you: SA node → atria → AV junction → ventricles. Each card: the strip, the six findings, how to recognise it, and what a PCP does. “Redraw” gives a fresh example of the same rhythm: learn the pattern, not one picture.',
        '按心跳从哪里发起分组，因为条带告诉你的就是这个：SA 结 → 心房 → 交界区 → 心室。每张卡：条带、六步发现、怎么认、PCP 在车上做什么。「重画」给同一节律的新例子：学的是规律，不是一张图。')}
      <div class="ecg-chips" id="gChips">${GROUPS.map(g => `<button data-g="${g[0]}" class="${seenG[g[0]] ? 'seen' : ''}">${t(g[1], g[2])}</button>`).join('')}</div><div id="cards"></div>`;
    const paint = () => {
      seenG[group] = true; store.set('ecg:atlas', seenG); store.set('ecg:group', group); if (GROUPS.every(g => seenG[g[0]])) markDone('atlas');
      el.querySelectorAll('[data-g]').forEach(b => { b.classList.toggle('on', b.dataset.g === group); b.classList.toggle('seen', !!seenG[b.dataset.g]); });
      const list = RHYTHMS.filter(R => R.group === group);
      el.querySelector('#cards').innerHTML = list.map(R => `<div class="ecg-card" data-id="${R.id}"><h3>${esc(R.en)} <span class="zh">${esc(R.zh)}</span> ${sayBtn('rh-' + R.id, name(R))}</h3><div data-strip></div>
        <div class="btn-row"><button class="btn ghost" data-redraw>${t('Redraw', '重画')}</button><button class="btn ghost" data-marks>${t('Show the clues', '标出线索')}</button></div>
        ${six(R)}<div class="ecg-note"><b>${t('How to recognise it', '怎么认')}</b>${bi(R.tell[0], R.tell[1])}</div><div class="ecg-note act"><b>${t('What a PCP does', 'PCP 做什么')}</b>${bi(R.act[0], R.act[1])}</div></div>`).join('');
      el.querySelectorAll('.ecg-card').forEach(card => {
        const R = RHYTHM[card.dataset.id]; let sd = 101 + rnd(1000), marks = false;
        const p = () => { const st = makeStrip(R.id, sd, 6), o = { overlays: marks ? GIVEAWAY[R.id] : [] }, h = card.querySelector('[data-strip]'); if (h.querySelector('.ecg-svg')) rebox(h, st, o); else h.innerHTML = box(st, o); card.querySelector('[data-marks]').classList.toggle('on', marks); };
        card.querySelector('[data-redraw]').onclick = () => { sd = seed(); p(); }; card.querySelector('[data-marks]').onclick = () => { marks = !marks; p(); }; p();
      });
    };
    el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { group = b.dataset.g; paint(); });
    paint();
  }

  /* ================= 6 · drill ================= */
  function stepDrill(el) {
    let mode = store.get('ecg:mode', 'name'), pool = store.get('ecg:pool', 'basic');
    const sc = store.get('ecg:score', { n: 0, ok: 0, streak: 0, best: 0, per: {}, arrestN: 0, arrestOk: 0 });
    const save = () => store.set('ecg:score', sc);
    el.innerHTML = `<h2>${t('6 · Rhythm drill', '6 · 节律训练')} <span id="drillSay"></span></h2>
      <div class="ecg-chips" id="modes"><button data-m="name">${t('Name the rhythm', '认节律')}</button><button data-m="arrest">${t('Arrest: shock or not?', '骤停：电不电？')}</button></div>
      <div class="ecg-chips small" id="pools"><button data-p="basic">${t('Starter set (14)', '入门 14 种')}</button><button data-p="all">${t('All rhythms (23)', '全部 23 种')}</button></div>
      <div class="tiny muted" style="margin:4px 0 8px">${t('Prefer paper? The printable workbook (32 strips at true scale, measured with a ruler) is under this weekend’s PDF button.', '想在纸上练？打印版练习册（32 条真实比例条带，拿尺子量）在本周末的 PDF 按钮里。')} <a href="#/aet/class?brief=3&ch=pdf">${t('Open', '打开')} →</a></div>
      <div id="dq"></div><div id="dstats"></div>`;
    const paintChips = () => { el.querySelector('#drillSay').innerHTML = sayBtn(mode === 'arrest' ? 'drill-arrest' : 'drill-intro', mode === 'arrest' ? t('Arrest drill', '骤停训练') : t('Rhythm drill', '节律训练')); el.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === mode)); el.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === pool)); el.querySelector('#pools').style.display = mode === 'name' ? '' : 'none'; };
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; store.set('ecg:mode', mode); paintChips(); ask(); });
    el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pool = b.dataset.p; store.set('ecg:pool', pool); paintChips(); ask(); });
    const stats = () => {
      const rows = Object.entries(sc.per).filter(([, v]) => v[1] >= 2).map(([id, v]) => [id, v[0] / v[1], v]).sort((a, b) => a[1] - b[1]);
      el.querySelector('#dstats').innerHTML = `<div class="ecg-stats"><span>${t('Named', '认节律')} <b>${sc.ok}/${sc.n}</b></span><span>${t('Streak', '连对')} <b>${sc.streak}</b> · ${t('best', '最高')} ${sc.best}</span><span>${t('Arrest', '骤停题')} <b>${sc.arrestOk}/${sc.arrestN}</b></span></div>` +
        (rows.length ? `<details class="ecg-weak"><summary>${t('By rhythm', '按节律')} · ${t('weakest first', '最弱的在前')}</summary>${rows.map(([id, r, v]) => `<div class="${r < 0.7 ? 'bad' : ''}">${name(RHYTHM[id])} <b>${v[0]}/${v[1]}</b></div>`).join('')}</details>` : '');
      if (sc.n >= 20 && sc.arrestN >= 8) markDone('drill'); };
    const dq = el.querySelector('#dq');
    function ask() {
      if (mode === 'arrest') return askArrest();
      const ids = pool === 'basic' ? BASIC : RHYTHMS.map(R => R.id).filter(id => id !== 'pea');
      // weakest rhythms come up more often
      const weighted = ids.flatMap(id => { const v = sc.per[id]; const w = !v ? 2 : v[1] < 3 ? 2 : v[0] / v[1] < 0.7 ? 3 : 1; return Array(w).fill(id); });
      const id = pick(weighted), R = RHYTHM[id], st = makeStrip(id, seed(), 6);
      const distract = shuffle(CONFUSE[id].filter(x => ids.includes(x)).concat(shuffle(ids.filter(x => x !== id && !CONFUSE[id].includes(x))))).slice(0, 3);
      const choices = shuffle([id, ...distract]);
      dq.innerHTML = `${box(st, { overlays: [{ type: 'six' }] })}<p class="tiny muted">${t('Lead II · 6 seconds · patient has a pulse unless the answer says otherwise', 'II 导 · 6 秒 · 除非答案另说，病人有脉搏')}</p>
        ${opts(choices.map(c => [c, name(RHYTHM[c])]))}<button class="btn ghost small" id="more">${t('Show all rhythms', '显示全部节律')}</button><div class="ecg-fb" id="fb"></div>`;
      const answer = v => {
        const ok = v === id; sc.n++; if (ok) { sc.ok++; sc.streak++; sc.best = Math.max(sc.best, sc.streak); } else sc.streak = 0;
        sc.per[id] = sc.per[id] || [0, 0]; sc.per[id][1]++; if (ok) sc.per[id][0]++; save(); stats();
        dq.querySelectorAll('.eo').forEach(x => { x.disabled = true; x.classList.toggle('right', x.dataset.v === id); x.classList.toggle('wrong', x.dataset.v === v && !ok); });
        rebox(dq, st, { overlays: GIVEAWAY[id] });
        dq.querySelector('#fb').innerHTML = `<div class="${ok ? 'ok' : 'bad'}"><b>${ok ? '✓' : '✗'} ${name(R)}</b>${!ok ? ` · ${t('you said', '你选的是')} ${name(RHYTHM[v])}` : ''} · ${t('rate', '心率')} ~${st.rate6}</div>${bi(R.tell[0], R.tell[1])}${six(R)}<button class="btn" id="nx">${t('Next', '下一条')} →</button>`;
        dq.querySelector('#nx').onclick = ask; dq.querySelector('#nx').scrollIntoView({ block: 'nearest' });
      };
      dq.querySelectorAll('.eo').forEach(b => b.onclick = () => answer(b.dataset.v));
      dq.querySelector('#more').onclick = () => { dq.querySelector('.eo-grid').outerHTML = opts(ids.map(c => [c, name(RHYTHM[c])]), 'all'); dq.querySelector('#more').remove(); dq.querySelectorAll('.eo').forEach(b => b.onclick = () => answer(b.dataset.v)); };
    }
    function askArrest() {
      const item = pick([['vf', 'none'], ['vf', 'none'], ['asys', 'none'], ['pea', 'none'], ['pea', 'none'], ['vt', 'none'], ['vt', 'yes'], ['torsades', 'none'], ['ivr', 'none'], ['ivr', 'yes'], ['nsr', 'yes'], ['svt', 'yes'], ['avb3', 'yes']]);
      const [id, pulse] = item, R = RHYTHM[id], st = makeStrip(id, seed(), 6);
      const truth = pulse === 'yes' ? 'notarrest' : (R.arrest && R.arrest.shock ? 'shock' : 'cpr');
      dq.innerHTML = `${box(st, {})}
        <p><b>${t('Unresponsive, not breathing normally.', '无反应，呼吸不正常。')} ${t('Carotid pulse for 10 seconds:', '摸颈动脉 10 秒：')} <span class="ecg-pulse ${pulse}">${pulse === 'yes' ? t('PULSE PRESENT', '有脉搏') : t('NO PULSE', '无脉搏')}</span></b></p>
        ${opts([['shock', t('Shockable: CPR + defibrillate', '可电击：CPR + 除颤')], ['cpr', t('Not shockable: CPR + reversible causes', '不可电击：CPR + 找可逆病因')], ['notarrest', t('Has a pulse: not an arrest rhythm, no shock', '有脉搏：不是骤停节律，不电击')]])}<div class="ecg-fb" id="fb"></div>`;
      dq.querySelectorAll('.eo').forEach(b => b.onclick = () => {
        const ok = b.dataset.v === truth; sc.arrestN++; if (ok) sc.arrestOk++; save(); stats();
        dq.querySelectorAll('.eo').forEach(x => { x.disabled = true; x.classList.toggle('right', x.dataset.v === truth); x.classList.toggle('wrong', x === b && !ok); });
        const why = truth === 'notarrest' ? t('A rhythm with a pulse is never defibrillated. Treat the patient: oxygen, monitor, 12-lead, escalate.', '有脉搏的节律永远不除颤。治病人：给氧、监护、12 导、升级。')
          : truth === 'shock' ? t('VF and pulseless VT (including torsades) are the two shockable rhythms: CPR and shock as early as possible.', 'VF 和无脉 VT（含尖端扭转）是仅有的两种可电击节律：CPR，尽早电击。')
          : t('Asystole and PEA are not shockable: the AED says “no shock advised”. CPR and hunt the reversible causes.', '心搏停止和 PEA 不可电击：AED 会说「不建议电击」。CPR，找可逆病因。');
        dq.querySelector('#fb').innerHTML = `<div class="${ok ? 'ok' : 'bad'}"><b>${ok ? '✓' : '✗'} ${name(R)}</b>${id === 'pea' ? ' · ' + t('organised rhythm, no pulse = PEA', '有组织的节律 + 无脉 = PEA') : ''}</div>${bi(why, why)}${bi(R.act[0], R.act[1])}<button class="btn" id="nx">${t('Next', '下一条')} →</button>`;
        dq.querySelector('#nx').onclick = ask;
      });
    }
    paintChips(); stats(); ask();
  }

  /* ================= 7 · 12-lead ================= */
  function stepTwelve(el) {
    let sub = store.get('ecg:sub', 'electrodes');
    const SUBS = [['electrodes', 'Electrodes', '电极'], ['views', 'Twelve views', '十二个视角'], ['stemi', 'STEMI', 'STEMI'], ['artifact', 'Artifact', '伪差'], ['actions', 'What you do', '动作']];
    el.innerHTML = `<h2>${t('7 · The 12-lead', '7 · 12 导联')}</h2><div class="ecg-chips" id="subs">${SUBS.map(s => `<button data-sub="${s[0]}">${t(s[1], s[2])}</button>`).join('')}</div><div id="subBody"></div>`;
    const sb = el.querySelector('#subBody');
    const paint = () => { store.set('ecg:sub', sub); el.querySelectorAll('[data-sub]').forEach(b => b.classList.toggle('on', b.dataset.sub === sub));
      ({ electrodes: subElectrodes, views: subViews, stemi: subStemi, artifact: subArtifact, actions: subActions })[sub](sb); };
    const tw = () => store.get('ecg:tw', { place: 0, wall: 0, art: 0 });
    const twMark = (k, n) => { const p = tw(); p[k] = (p[k] || 0) + n; store.set('ecg:tw', p); if (p.place >= 8 && p.wall >= 5 && p.art >= 5) markDone('twelve'); };
    el.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { sub = b.dataset.sub; paint(); });
    setTimeout(paint, 0);

    /* ---- electrodes: the torso ---- */
    function torso(mode, extra = '') {
      const dots = mode === 'monitor'
        ? [['RA', 54, 54, '#fff', '#777'], ['LA', 146, 54, '#222', '#222'], ['LL', 150, 176, '#d33', '#d33'], ['RL', 50, 176, '#2a2', '#2a2']]
        : [['RA', 24, 62, '#fff', '#777'], ['LA', 176, 62, '#222', '#222'], ['LL', 162, 224, '#d33', '#d33'], ['RL', 38, 224, '#2a2', '#2a2'], ['V1', 92, 92, '#d33', '#d33'], ['V2', 108, 92, '#dc0', '#aa0'], ['V3', 122, 102, '#2a2', '#2a2'], ['V4', 136, 112, '#36c', '#36c'], ['V5', 158, 112, '#e82', '#e82'], ['V6', 176, 112, '#92c', '#92c']];
      return `<svg class="ecg-torso" viewBox="0 0 200 236">
        <path class="tb" d="M86 0h28v24l48 14 14 24-4 90c-2 36-14 56-32 72l-6 12H66l-6-12C42 208 30 188 28 152l-4-90 14-24 48-14z"/>
        <path class="tl" d="M100 38v84"/><path class="tl thin" d="M40 48L98 38M160 48L102 38"/><path class="tl thin" d="M94 58h12"/>
        <path class="tl rib" d="M62 72q38 10 76 0M60 84q40 12 80 0M58 96q42 14 84 0M58 108q42 16 84 0M60 120q40 18 80 0"/>
        <circle class="tn" cx="64" cy="100" r="3"/><circle class="tn" cx="136" cy="100" r="3"/>
        <path class="tl dash" d="M136 46v90M158 60v80M176 66v80"/>
        <text class="tt" x="100" y="33" text-anchor="middle">${t('sternal notch', '胸骨上切迹')}</text><text class="tt" x="112" y="61">${t('Angle of Louis · 2nd rib', 'Louis 角 · 第 2 肋')}</text>
        <text class="tt small" x="137" y="142" text-anchor="middle">${t('mid-clavicular', '锁骨中线')}</text><text class="tt small" x="159" y="150" text-anchor="middle">${t('ant. axillary', '腋前线')}</text><text class="tt small" x="178" y="156" text-anchor="middle">${t('mid-axillary', '腋中线')}</text>
        <text class="tt small" x="12" y="20">${t('patient’s RIGHT', '病人的右侧')}</text><text class="tt small" x="146" y="20">${t('patient’s LEFT', '病人的左侧')}</text>
        ${extra}${dots.map(d => `<g class="te" data-e="${d[0]}"><circle cx="${d[1]}" cy="${d[2]}" r="6.5" fill="${d[3]}" stroke="${d[4]}"/><text x="${d[1]}" y="${d[2] + 2.6}" text-anchor="middle" font-size="6" font-weight="700" fill="${d[3] === '#fff' || d[3] === '#dc0' ? '#222' : '#fff'}">${d[0]}</text></g>`).join('')}</svg>`;
    }
    const SPOTS = { V1: [92, 92], V2: [108, 92], V3: [122, 102], V4: [136, 112], V5: [158, 112], V6: [176, 112] };
    const LAND = { V1: ['4th intercostal space, right sternal border', '第 4 肋间，右胸骨缘'], V2: ['4th intercostal space, left sternal border', '第 4 肋间，左胸骨缘'], V3: ['halfway between V2 and V4 (place V4 first)', 'V2 与 V4 正中间（先放 V4）'], V4: ['5th intercostal space, mid-clavicular line (usually below the left nipple)', '第 5 肋间，锁骨中线（一般在左乳头下方）'], V5: ['anterior axillary line, level with V4', '腋前线，与 V4 同水平'], V6: ['mid-axillary line, level with V4', '腋中线，与 V4 同水平'] };
    function subElectrodes(b) {
      const prog = tw(); let mode = 'twelve';
      b.innerHTML = `<p>${sayBtn('l12-electrodes', t('Electrodes', '电极'))}</p>${bi('Ten electrodes make twelve leads. The four limb electrodes have fixed colours: RA white, LA black, LL red, RL green (“snow over grass, smoke over fire”: white above green on the right, black above red on the left). RL is only a reference; it is not in any lead. Read the letters on the wires, never trust the colours alone.',
        '10 个电极得到 12 个导联。四个肢体电极颜色固定：RA 白、LA 黑、LL 红、RL 绿（「雪在草上、烟在火上」：右侧白在绿上，左侧黑在红上）。RL 只是参考，不参与任何导联。读导线上的字母，别只认颜色。')}
        <div class="ecg-chips small"><button data-tm="twelve" class="on">${t('12-lead: limbs on the limbs + V1–V6', '12 导：肢体电极放肢体 + V1–V6')}</button><button data-tm="monitor">${t('3- / 4-lead monitoring: on the torso', '3 导 / 4 导监护：贴躯干')}</button></div>
        <div class="ecg-two"><div id="torso"></div><div class="ecg-note" id="torsoText"></div></div>
        <h3>${t('Practice: tap where the electrode goes', '练习：点电极该放的位置')} <span class="tiny muted" id="placeScore">${prog.place || 0}</span></h3><div id="placeQ"></div>`;
      const TT = { twelve: ['For a diagnostic 12-lead, BCEHS PR16 (12-lead acquisition) puts the limb electrodes on the limbs: RA and LA on the deltoids or wrists, RL and LL near the ankles. Not on bone, not on big muscles. Chest leads: find the Angle of Louis (the ridge below the sternal notch), slide to the patient’s right onto the 2nd rib, drop into the 2nd space, count down two more spaces: that is the 4th intercostal space for V1 and V2. V4 is 5th space mid-clavicular; V3 sits between V2 and V4; V5 and V6 follow V4’s level out to the anterior and mid-axillary lines. One space too high makes a false ECG.',
          '做诊断质量的 12 导，BCEHS PR16（12 导联采集）把肢体电极放在肢体上：RA、LA 放三角肌或腕，RL、LL 放踝附近。不压骨头、不压大肌肉。胸导：先找 Louis 角（胸骨上切迹下方那道横嵴），向病人右侧滑到第 2 肋，落进第 2 肋间，再往下数两个肋间：这就是放 V1、V2 的第 4 肋间。V4 在第 5 肋间锁骨中线；V3 放 V2 和 V4 正中间；V5、V6 沿 V4 的水平向外到腋前线、腋中线。高一个肋间就是一张假图。'],
        monitor: ['For monitoring (leads I, II, III on the LIFEPAK 15 ECG cable) the school station puts RA below the right clavicle, LA below the left clavicle, LL on the left lower abdomen, RL on the right lower abdomen. Monitor quality only: good enough to read the rhythm in lead II, not good enough to read ST.',
          '监护用（LIFEPAK 15 心电线的 I、II、III 导），学校考站把 RA 贴右锁骨下、LA 贴左锁骨下、LL 贴左下腹、RL 贴右下腹。只是监护质量：够在 II 导读节律，不够读 ST。'] };
      const pt = () => { b.querySelector('#torso').innerHTML = torso(mode); b.querySelector('#torsoText').innerHTML = bi(TT[mode][0], TT[mode][1]); b.querySelectorAll('[data-tm]').forEach(x => x.classList.toggle('on', x.dataset.tm === mode)); };
      b.querySelectorAll('[data-tm]').forEach(x => x.onclick = () => { mode = x.dataset.tm; pt(); }); pt();
      const q = b.querySelector('#placeQ'); let seq = [];
      function ask() {
        if (!seq.length) seq = shuffle(['V1', 'V2', 'V4', 'V3', 'V5', 'V6', 'color', 'color']);
        const item = seq.shift();
        if (item === 'color') {
          const e = pick(['RA', 'LA', 'LL', 'RL']), truth = { RA: 'white', LA: 'black', LL: 'red', RL: 'green' }[e];
          q.innerHTML = `<p><b>${t('Which colour is', '哪个颜色是')} ${e} (${{ RA: t('right arm', '右臂'), LA: t('left arm', '左臂'), LL: t('left leg', '左腿'), RL: t('right leg', '右腿') }[e]})?</b></p>${opts([['white', t('White', '白')], ['black', t('Black', '黑')], ['red', t('Red', '红')], ['green', t('Green', '绿')]])}<div class="ecg-fb" id="fb"></div>`;
          q.querySelectorAll('.eo').forEach(bt => bt.onclick = () => { const ok = bt.dataset.v === truth; twMark('place', 1); b.querySelector('#placeScore').textContent = tw().place;
            q.querySelectorAll('.eo').forEach(x => { x.disabled = true; x.classList.toggle('right', x.dataset.v === truth); x.classList.toggle('wrong', x === bt && !ok); });
            q.querySelector('#fb').innerHTML = `${ok ? '✓' : '✗'} ${e} = ${t(truth, { white: '白', black: '黑', red: '红', green: '绿' }[truth])} · ${t('snow over grass (right), smoke over fire (left)', '右侧雪在草上，左侧烟在火上')} <button class="btn ghost" id="nx">${t('Next', '下一题')} →</button>`; q.querySelector('#nx').onclick = ask; });
          return;
        }
        q.innerHTML = `<p><b>${t('Tap where', '点出')} <span class="ecg-big">${item}</span> ${t('goes', '该放的位置')}</b> · ${t('tap the chest', '在胸壁上点')}</p><div class="ecg-tap">${torso('blank')}</div><div class="ecg-fb" id="fb"></div>`;
        const svg = q.querySelector('svg'); svg.querySelectorAll('.te').forEach(x => x.remove());
        svg.onpointerdown = e => {
          const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 200, y = (e.clientY - r.top) / r.height * 236, [cx, cy] = SPOTS[item], d = Math.hypot(x - cx, y - cy), ok = d <= 9;
          svg.onpointerdown = null; twMark('place', 1); b.querySelector('#placeScore').textContent = tw().place;
          svg.insertAdjacentHTML('beforeend', `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${ok ? '#15803d' : '#b91c1c'}" opacity=".8"/><circle cx="${cx}" cy="${cy}" r="6.5" fill="none" stroke="#15803d" stroke-width="2"/><text x="${cx}" y="${cy + 2.6}" text-anchor="middle" font-size="6" font-weight="700" fill="#15803d">${item}</text>`);
          q.querySelector('#fb').innerHTML = `${ok ? '✓' : '✗'} <b>${item}</b>: ${t(LAND[item][0], LAND[item][1])}${ok ? '' : ' · ' + t('the green ring is the spot', '绿圈是正确位置')} <button class="btn ghost" id="nx">${t('Next', '下一题')} →</button>`; q.querySelector('#nx').onclick = ask;
        };
      }
      ask();
    }

    /* ---- twelve views ---- */
    function subViews(b) {
      const ANG = { I: 0, II: 60, III: 120, aVF: 90, aVL: -30, aVR: -150 };
      const VIEW = { I: ['looks at the heart from the left side: lateral wall', '从左侧看心脏：侧壁'], II: ['looks up from the left leg: inferior wall (and the best lead for P waves)', '从左腿往上看：下壁（也是看 P 波最好的导联）'], III: ['looks up from the right side of the bottom: inferior wall', '从右下往上看：下壁'],
        aVR: ['looks from the right shoulder: into the cavity. Everything is normally upside-down here; if it is upright, the arm wires are swapped', '从右肩看：看进心腔。这里正常时什么都倒着；要是直立，手臂线接反了'], aVL: ['looks from the left shoulder: high lateral wall', '从左肩看：高侧壁'], aVF: ['looks straight up from the feet: inferior wall', '从脚正下方往上看：下壁'],
        V1: ['right of the sternum: the septum (and the right ventricle)', '胸骨右缘：间隔（和右心室）'], V2: ['left of the sternum: the septum', '胸骨左缘：间隔'], V3: ['front of the chest: anterior wall', '前胸：前壁'], V4: ['the apex: anterior wall', '心尖：前壁'], V5: ['left side: lateral wall', '左侧：侧壁'], V6: ['far left side: lateral wall', '最左侧：侧壁'] };
      const col = L => (WALLS[wallOf(L)] || { color: '#888' }).color;
      const hex = cur => `<svg class="ecg-hex" viewBox="0 0 220 220"><circle cx="110" cy="110" r="82" class="hx"/><ellipse cx="104" cy="112" rx="26" ry="30" transform="rotate(-25 104 112)" class="hh"/>
        ${Object.entries(ANG).map(([L, a]) => { const r = a * Math.PI / 180, x2 = 110 + 82 * Math.cos(r), y2 = 110 + 82 * Math.sin(r), xl = 110 + 97 * Math.cos(r), yl = 110 + 97 * Math.sin(r);
          return `<g class="hl${cur === L ? ' on' : ''}" data-l="${L}"><line x1="110" y1="110" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col(L)}"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="5" fill="${col(L)}"/><text x="${xl.toFixed(1)}" y="${(yl + 4).toFixed(1)}" text-anchor="middle">${L}</text></g>`; }).join('')}
        <text class="hcap" x="110" y="214" text-anchor="middle">${t('Frontal plane: the six limb leads', '额面：六个肢体导联')}</text></svg>`;
      const chest = cur => { const P = { V1: [100, 30], V2: [118, 32], V3: [136, 40], V4: [154, 52], V5: [176, 70], V6: [194, 96] };
        return `<svg class="ecg-hex" viewBox="0 0 220 180"><ellipse cx="110" cy="96" rx="102" ry="64" class="hx"/><circle cx="110" cy="152" r="7" class="hs"/><rect x="100" y="22" width="20" height="5" class="hs"/>
        <ellipse cx="132" cy="90" rx="30" ry="22" transform="rotate(-30 132 90)" class="hh"/><text class="hcap" x="110" y="166" text-anchor="middle">${t('spine', '脊柱')}</text><text class="hcap" x="110" y="18" text-anchor="middle">${t('sternum', '胸骨')}</text>
        ${Object.entries(P).map(([L, [x, y]]) => `<g class="hl${cur === L ? ' on' : ''}" data-l="${L}"><line x1="${x}" y1="${y}" x2="132" y2="90" stroke="${col(L)}"/><circle cx="${x}" cy="${y}" r="7" fill="${col(L)}"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" class="w">${L}</text></g>`).join('')}
        <text class="hcap" x="110" y="178" text-anchor="middle">${t('Horizontal plane: V1–V6 round the left chest', '水平面：V1–V6 绕着左前胸')}</text></svg>`; };
      const grid = () => `<div class="ecg-l12 names">${LAYOUT.flat().map(L => `<div style="border-color:${col(L)};color:${col(L)}" data-l="${L}">${L}<small>${t((WALLS[wallOf(L)] || { en: 'cavity' }).en, (WALLS[wallOf(L)] || { zh: '心腔' }).zh)}</small></div>`).join('')}</div>`;
      let cur = 'II';
      b.innerHTML = `<p>${sayBtn('l12-views', t('Twelve views', '十二个视角'))}</p>${bi('A lead is not a wire. It is one viewpoint: the machine compares two electrodes and draws what the heart’s electricity looks like from that direction. Twelve leads are twelve cameras around the same heart. Six limb leads look at it in the frontal plane; six chest leads look in the horizontal plane. Tap any lead.',
        '导联不是一根线，是一个视角：机器比较两个电极，画出从那个方向看过去心脏的电是什么样。12 个导联就是围着同一个心脏的 12 台摄像机。6 个肢体导联在额面看它，6 个胸导联在水平面看它。点任何一个导联。')}
        <div class="ecg-two" id="views"></div><div class="ecg-note" id="viewText"></div>
        <h3>${t('The printout: cameras that face the same wall sit together', '打印出来：看同一面墙的摄像机挨在一起')} ${sayBtn('l12-layout', t('The printout', '打印排版'))}</h3>
        ${bi('This is the standard 12-lead layout. The colours are the walls. “Contiguous leads” just means two or more cameras pointing at the same wall. A real STEMI lights up a wall, not random leads.', '这是 12 导联的标准排版。颜色就是墙。「相邻导联」只是说两台以上的摄像机对着同一面墙。真的 STEMI 点亮的是一面墙，不是零散的导联。')}
        <div id="grid"></div>
        <table class="ecg-six walls">${Object.entries(WALLS).map(([k, w]) => `<tr><th style="color:${w.color}">${t(w.en, w.zh)}</th><td><b>${w.leads.join(', ')}</b> · ${w.artery} ${t('', w.arteryZh)}<br><span class="tiny">${t({ inferior: 'Right coronary. Beware right-ventricular involvement (hypotension: nitroglycerin can crash the pressure) and AV node ischemia (bradycardia, blocks).', septal: 'Proximal LAD. Watch for bundle branch blocks; often extends into the anterior wall.', anterior: 'LAD, the “widowmaker”: a big territory, highest risk of cardiogenic shock and VF.', lateral: 'Circumflex. Subtle changes; the wall you miss by not reading every lead.' }[k],
          { inferior: '右冠。提防右室受累（低血压：硝酸甘油 nitroglycerin 会把血压打垮）和 AV 结缺血（心动过缓、阻滞）。', septal: 'LAD 近段。注意束支阻滞；常向前壁扩展。', anterior: 'LAD，「寡妇制造者」：面积大，心源性休克和 VF 风险最高。', lateral: '回旋支。改变细微；不逐个导联读就会漏的那面墙。' }[k])}</span></td></tr>`).join('')}</table>`;
      const paint = () => { b.querySelector('#views').innerHTML = hex(cur) + chest(cur); b.querySelector('#grid').innerHTML = grid();
        b.querySelector('#viewText').innerHTML = `<b>${cur}</b> · <span style="color:${col(cur)}">${t((WALLS[wallOf(cur)] || { en: 'cavity' }).en, (WALLS[wallOf(cur)] || { zh: '心腔' }).zh)}</span>${bi(VIEW[cur][0], VIEW[cur][1])}`;
        b.querySelectorAll('[data-l]').forEach(x => { x.classList.toggle('on', x.dataset.l === cur); x.onclick = () => { cur = x.dataset.l; paint(); }; }); };
      paint();
    }

    /* ---- STEMI ---- */
    function subStemi(b) {
      const single = (o, lab) => `<div class="ecg-mini"><div class="ecg-wrap fit">${stripSVG(customStrip([beat(Object.assign({ t0: 0.35 }, o))], [], 1.1), { pxPerMm: 5, baseMm: 20, heightMm: 30, fit: true, overlays: [{ type: 'baseline' }, ...(o.st ? [{ type: 'j', n: 1, label: true }] : [])] })}</div><div class="tiny">${lab}</div></div>`;
      const cascade = `<div class="ecg-minis">${single({}, t('Normal', '正常'))}${single({ tAmp: 0.7 }, t('Hyperacute T: minutes in', '高尖 T：刚开始几分钟'))}${single({ st: 0.3, tAmp: 0.5 }, t('ST elevation: injury (STEMI)', 'ST 抬高：损伤（STEMI）'))}${single({ st: -0.2 }, t('ST depression: ischemia, or a mirror', 'ST 压低：缺血，或镜像'))}${single({ tInv: true }, t('Inverted T: ischemia', '倒置 T：缺血'))}${single({ q: 0.5, r: 0.7, tInv: true }, t('Deep Q: old infarct, scar', '深 Q：陈旧梗死，瘢痕'))}</div>`;
      let kind = 'inferior', marks = false, sd = 5; const prog = tw();
      b.innerHTML = `<h3>${t('What injury looks like in one lead', '损伤在一个导联里长什么样')} ${sayBtn('l12-cascade', t('Injury in one lead', '损伤长什么样'))}</h3>
        ${bi('An artery closes and the muscle behind it goes through a sequence: ischemia (T wave changes), injury (ST elevation: this is the STEMI sign, and it is still saveable), infarction (a deep Q wave: scar, too late). The leads looking at that wall show it; the leads on the opposite wall show the mirror image, ST depression.',
          '一条动脉堵了，它后面的肌肉按顺序变化：缺血（T 波改变）→ 损伤（ST 抬高：这就是 STEMI 的标志，还救得回来）→ 梗死（深 Q 波：瘢痕，晚了）。看那面墙的导联显示它；对面墙的导联显示镜像，ST 压低。')}
        ${cascade}
        ${note('The rule. Find the TP baseline. Go to the J point. STEMI = new ST elevation of 1 mm or more in two or more contiguous leads (the school module adds: 2 mm in the chest leads). Reciprocal depression on the opposite wall supports it. ST is read on a printed, diagnostic-quality 12-lead, never on the monitor screen.',
          '规则。找到 TP 基线。到 J 点。STEMI = 两个以上相邻导联新发 ST 抬高 ≥ 1 mm（学校模块加一条：胸导 ≥ 2 mm）。对面墙的镜像压低是佐证。ST 在打印的诊断质量 12 导上读，绝不在监护屏幕上读。', 'ecg-key')}
        <h3>${t('Whole 12-leads: which wall lit up?', '整张 12 导：哪面墙亮了？')}</h3>
        <div class="ecg-chips small" id="kinds">${Object.keys(PATTERNS).map(k => `<button data-k="${k}">${t(PATTERNS[k].en.split(' (')[0], PATTERNS[k].zh.split('（')[0])}</button>`).join('')}</div>
        <div class="btn-row"><button class="btn ghost" id="marks">${t('Mark the ST changes', '标出 ST 变化')}</button><button class="btn ghost" id="redraw">${t('Redraw', '重画')}</button></div>
        <div id="l12"></div><div class="ecg-note" id="l12text"></div>
        <h3>${t('Practice: which wall?', '练习：哪面墙？')} <span class="tiny muted" id="wallScore">${prog.wall || 0}</span></h3><div id="wallQ"></div>`;
      const TEXT = { normal: ['No ST elevation anywhere; aVR is upside-down as it should be. A normal ECG does not rule out a heart attack (NSTEMI can have a normal tracing): if it looks like ACS, treat it as ACS.', '哪里都没有 ST 抬高；aVR 像它该有的样子倒着。正常心电图排除不了心梗（NSTEMI 可以是正常图）：像 ACS 就按 ACS 处理。'],
        inferior: ['II, III and aVF are up; I and aVL show the mirror. Inferior wall, usually the right coronary artery. Check the blood pressure before nitroglycerin: the right ventricle may be involved. Watch for bradycardia and blocks.', 'II、III、aVF 抬高；I、aVL 是镜像。下壁，通常是右冠。给硝酸甘油 nitroglycerin 前先看血压：右心室可能受累。提防心动过缓和阻滞。'],
        anterior: ['V1–V4 (sometimes to V5) are up, tombstone-shaped; the inferior leads show the mirror. LAD territory: large, high risk of cardiogenic shock and VF. Pads on early.', 'V1–V4（有时到 V5）抬高，墓碑样；下壁导联是镜像。LAD 区域：面积大，心源性休克和 VF 风险高。早点贴好电极。'],
        lateral: ['I, aVL, V5, V6 are up; III and aVF mirror. Circumflex. The changes are often modest: this is the STEMI you miss if you only glance at V1–V4.', 'I、aVL、V5、V6 抬高；III、aVF 镜像。回旋支。改变常不大：只瞄 V1–V4 就会漏的 STEMI。'],
        septal: ['V1 and V2 are up. The septum carries the bundle branches, so watch for new blocks; often extends into V3–V4 (anteroseptal).', 'V1、V2 抬高。间隔里走着束支，提防新发阻滞；常向 V3–V4 扩展（前间隔）。'],
        inferolateral: ['Inferior leads and the lateral leads together: a big right coronary or circumflex. Two walls, one artery. Same actions, more urgency.', '下壁导联和侧壁导联一起亮：粗大的右冠或回旋支。两面墙，一条动脉。动作一样，更紧急。'],
        posterior: ['No elevation on the standard twelve: instead V1–V3 show ST depression with tall R waves. That is the posterior wall seen from the front, a mirror. Treated as a STEMI equivalent; ACP may add posterior leads V7–V9.', '标准 12 导上没有抬高：V1–V3 反而 ST 压低、R 波高。那是从前面看到的后壁，一个镜像。按 STEMI 等同处理；ACP 可以加后壁导联 V7–V9。'],
        pericarditis: ['Elevation almost everywhere, concave (saddle-shaped), PR depression, and no mirror anywhere. An artery cannot close in every territory at once: diffuse elevation without reciprocal changes points to pericarditis. Do not decide alone: transmit and consult.', '几乎到处都抬高，凹面（马鞍形），PR 压低，而且哪里都没有镜像。一条动脉不可能同时堵住所有区域：弥漫抬高、没有镜像，想心包炎。别自己定：传输、咨询。'],
        lbbb: ['Wide QRS with a notched top in the lateral leads and deep S in V1–V3; the ST goes the opposite way to the QRS everywhere. A bundle branch block makes ST unreadable. New LBBB with chest pain is a STEMI equivalent (BCEHS C01): ask for an old ECG, transmit, consult.', '侧壁导联 QRS 宽、顶上有切迹，V1–V3 深 S；ST 到处和 QRS 反向。束支阻滞让 ST 读不了。新发 LBBB + 胸痛是 STEMI 等同（BCEHS C01）：问旧心电图、传输、咨询。'] };
      const tiles = (e, mk) => `<div class="ecg-l12">${LAYOUT.flat().map(L => { const ld = e.leads.find(x => x.id === L), st = e.pat.st[L] || 0, cls = mk && st >= 1 ? 'up' : mk && st <= -0.8 ? 'down' : '';
        return `<div class="tile ${cls}">${stripSVG(ld, { pxPerMm: 2.6, heightMm: 36, baseMm: 20, label: L, fit: true, overlays: mk && st ? [{ type: 'baseline' }, { type: 'j', n: 9 }] : [] })}${mk && st ? `<span class="st">${st > 0 ? '↑' : '↓'} ${Math.abs(st).toFixed(1)} mm</span>` : ''}</div>`; }).join('')}</div>`;
      const paint = () => { const e = make12(kind, sd); b.querySelector('#l12').innerHTML = tiles(e, marks); b.querySelector('#marks').classList.toggle('on', marks);
        b.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x.dataset.k === kind));
        const w = PATTERNS[kind].wall && WALLS[PATTERNS[kind].wall]; b.querySelector('#l12text').innerHTML = `<b>${t(PATTERNS[kind].en, PATTERNS[kind].zh)} ${sayBtn('l12-' + kind, t(PATTERNS[kind].en, PATTERNS[kind].zh))}</b>${w ? ` · <span style="color:${w.color}">${w.leads.join(', ')} · ${w.artery}</span>` : ''}${bi(TEXT[kind][0], TEXT[kind][1])}`; };
      b.querySelectorAll('[data-k]').forEach(x => x.onclick = () => { kind = x.dataset.k; paint(); }); b.querySelector('#marks').onclick = () => { marks = !marks; paint(); }; b.querySelector('#redraw').onclick = () => { sd = seed(); paint(); }; paint();
      const q = b.querySelector('#wallQ');
      function ask() {
        const k = pick(['inferior', 'anterior', 'lateral', 'septal', 'inferior', 'anterior']), e = make12(k, seed());
        q.innerHTML = tiles(e, false) + opts(Object.entries(WALLS).map(([w, v]) => [w, `${t(v.en, v.zh)} · ${v.leads.join(', ')}`])) + `<div class="ecg-fb" id="fb"></div>`;
        q.querySelectorAll('.eo').forEach(bt => bt.onclick = () => { const ok = bt.dataset.v === k; twMark('wall', 1); b.querySelector('#wallScore').textContent = tw().wall;
          q.querySelectorAll('.eo').forEach(x => { x.disabled = true; x.classList.toggle('right', x.dataset.v === k); x.classList.toggle('wrong', x === bt && !ok); });
          q.querySelector('.ecg-l12').outerHTML = tiles(e, true);
          q.querySelector('#fb').innerHTML = `<div class="${ok ? 'ok' : 'bad'}"><b>${ok ? '✓' : '✗'} ${t(PATTERNS[k].en, PATTERNS[k].zh)}</b> · ${WALLS[k].leads.join(', ')} · ${WALLS[k].artery}</div>${bi(TEXT[k][0], TEXT[k][1])}<button class="btn" id="nx">${t('Next', '下一张')} →</button>`; q.querySelector('#nx').onclick = ask; });
      }
      ask();
    }

    /* ---- artifact ---- */
    function subArtifact(b) {
      const prog = tw();
      b.innerHTML = `<p>${sayBtn('l12-artifact', t('Artifact', '伪差'))}</p>${bi('Lead I = RA to LA. Lead II = RA to LL. Lead III = LA to LL. So a bad electrode spoils exactly the two leads that use it, and the third lead, which does not, stays clean. Read the clean lead and it names the guilty electrode.',
        'I 导 = RA 到 LA。II 导 = RA 到 LL。III 导 = LA 到 LL。所以一个坏电极恰好毁掉用到它的两个导联，而不用它的第三个导联是干净的。看哪个干净，它就指出了坏的那个电极。')}
        <table class="ecg-six"><tr><th>${t('Noisy', '有噪')}</th><th>${t('Clean', '干净')}</th><th>${t('Fix', '查')}</th></tr><tr><td>I + II</td><td>III</td><td><b>RA</b> ${t('(white)', '（白）')}</td></tr><tr><td>I + III</td><td>II</td><td><b>LA</b> ${t('(black)', '（黑）')}</td></tr><tr><td>II + III</td><td>I</td><td><b>LL</b> ${t('(red)', '（红）')}</td></tr><tr><td>${t('one V lead', '单个 V 导')}</td><td>${t('the rest', '其余')}</td><td>${t('that chest electrode', '那个胸电极')}</td></tr><tr><td>${t('all leads', '全部')}</td><td>${t('none', '没有')}</td><td>${t('the patient (moving, shivering), the vehicle, interference', '病人（动、发抖）、车、电磁干扰')}</td></tr></table>
        ${note('The order never changes: look at the patient and feel the pulse (a talking patient is not in VF) → which leads are noisy → fix the cause (press the electrode, fresh electrode, off bone and muscle, re-prep the skin; check the wire; warm and still patient, arms relaxed, legs uncrossed; phones and radios away, vehicle stopped) → acquire again. One round, then leave: do not stay on scene for a perfect tracing.',
          '顺序永远一样：先看病人、摸脉搏（会说话的人不是 VF）→ 哪些导联有噪 → 修原因（按紧电极、换新片、离开骨头和肌肉、重备皮；查导线；病人保暖别动、手臂放松、腿不交叉；手机对讲机拿远、车停稳）→ 再采。一轮之后就走：不为一张完美的图停在现场。', 'ecg-key')}
        <h3>${t('Practice: which electrode?', '练习：哪个电极？')} <span class="tiny muted" id="artScore">${prog.art || 0}</span></h3><div id="artQ"></div>`;
      const q = b.querySelector('#artQ'), PROF = { I: [0.1, 0.05, 0.7, 0.1, 0.25], II: [0.15, 0.08, 1.1, 0.2, 0.35], III: [0.08, 0.1, 0.5, 0.25, 0.15] };
      function ask() {
        const guilty = pick(['RA', 'LA', 'LL', 'patient', 'RA', 'LA', 'LL']), noisy = { RA: ['I', 'II'], LA: ['I', 'III'], LL: ['II', 'III'], patient: ['I', 'II', 'III'] }[guilty], r = rng(seed());
        const rate = r.int(64, 88), starts = []; for (let tt = -0.2 + r() * 0.4; tt < 4.5; tt += 60 / rate) starts.push(tt);
        const kind = guilty === 'patient' ? 'tremor' : pick(['mains', 'tremor', 'wander']);
        const leads = ['I', 'II', 'III'].map(L => { const [pA, qA, rA, sA, tA] = PROF[L], cont = noisy.includes(L) ? [kind === 'mains' ? NOISE.mains(0.14) : kind === 'tremor' ? NOISE.tremor(r, 0.35, 0, 9) : NOISE.wander(r, 0.6)] : [];
          return [L, customStrip(starts.map(t0 => beat({ t0, pAmp: pA, q: qA, r: rA, s: sA, tAmp: tA })), cont, 4, 1, { rate })]; });
        q.innerHTML = leads.map(([L, s]) => `<div class="ecg-wrap fit">${stripSVG(s, { pxPerMm: 3, label: L, fit: true, baseMm: 18, heightMm: 26 })}</div>`).join('') +
          opts([['RA', 'RA ' + t('(white)', '（白）')], ['LA', 'LA ' + t('(black)', '（黑）')], ['LL', 'LL ' + t('(red)', '（红）')], ['patient', t('The patient / vehicle / interference', '病人 / 车辆 / 干扰')]]) + `<div class="ecg-fb" id="fb"></div>`;
        q.querySelectorAll('.eo').forEach(bt => bt.onclick = () => { const ok = bt.dataset.v === guilty; twMark('art', 1); b.querySelector('#artScore').textContent = tw().art;
          q.querySelectorAll('.eo').forEach(x => { x.disabled = true; x.classList.toggle('right', x.dataset.v === guilty); x.classList.toggle('wrong', x === bt && !ok); });
          const clean = ['I', 'II', 'III'].filter(L => !noisy.includes(L));
          q.querySelector('#fb').innerHTML = `<div class="${ok ? 'ok' : 'bad'}"><b>${ok ? '✓' : '✗'} ${guilty === 'patient' ? t('all three noisy: the patient, the vehicle or interference', '三个都噪：病人、车辆或干扰') : `${noisy.join(' + ')} ${t('noisy', '有噪')}, ${clean.join('')} ${t('clean', '干净')} → ${guilty}`}</b></div>${bi(guilty === 'patient' ? 'No lead is clean, so no single electrode explains it. Warm the patient, arms down, still for ten seconds, vehicle stopped, phones away.' : `Only the leads that use ${guilty} are spoiled. Press it, replace it with a fresh electrode, re-prep the skin, check its wire, then acquire again.`,
            guilty === 'patient' ? '没有一个导联干净，所以不是某一个电极的事。给病人保暖、手臂放下、静止 10 秒、车停稳、手机拿远。' : `只有用到 ${guilty} 的导联坏了。按紧它、换一片新电极、重备皮、查它的导线，再采一次。`)}<button class="btn" id="nx">${t('Next', '下一题')} →</button>`; q.querySelector('#nx').onclick = ask; });
      }
      ask();
    }

    /* ---- actions ---- */
    function subActions(b) {
      b.innerHTML = `<p>${sayBtn('l12-actions', t('What you do', '动作'))}</p>${bi('The ECG never changes the first things you do. For the licensing exam, the EMALB chest-pain protocol (p.47) has no ECG step at all: comfort, oxygen to 94%, chewed ASA 160 mg, start transport, history and vitals, nitroglycerin when the gates are met (SBP over 110 before each dose, pulse 50–150 by palpation). The monitor must never delay ASA or transport.',
        '心电图从不改变你最先做的事。执照考试里，EMALB 胸痛规程（p.47）根本没有 ECG 这一步：舒适体位、氧到 94%、嚼服阿司匹林 ASA 160 mg、启动转运、病史和生命体征、符合门槛时给硝酸甘油 nitroglycerin（每剂前 SBP > 110，脉搏 50–150，摸出来的）。监护仪绝不能延误阿司匹林和转运。')}
        <h3>${t('When a PCP acquires a 12-lead · BCEHS C01 (Acute Coronary Syndrome)', 'PCP 什么时候做 12 导 · BCEHS C01（急性冠脉综合征）')}</h3>
        <ol class="ecg-list"><li>${t('Trained (online + in-person) with EMALB endorsement.', '完成线上 + 面授培训，有 EMALB 背书。')}</li><li>${t('Patient over 18.', '病人 > 18 岁。')}</li><li>${t('New, non-traumatic chest pain under 12 hours, suspicious for ACS. Never let it delay priority care; if you cannot, consider an ACP intercept to acquire it.', '< 12 小时新发、非创伤性、疑 ACS 的胸痛。不能干扰优先处置；自己做不了，考虑请 ACP 拦截来做。')}</li></ol>
        <h3>${t('The school standard: contact to diagnostic 12-lead under 3 minutes', '学校标准：从接触到诊断质量 12 导 < 3 分钟')}</h3>
        ${bi('Split the work (you assess and take vitals, your partner exposes, preps the skin and places electrodes). Prep the skin once. Wires untangled in advance. Say the ten-second pause out loud. First tracing not diagnostic: repeat before leaving. Symptoms change: repeat. After ROSC wait at least 10 minutes (BCEHS PR16).',
          '分工（你做评估和生命体征，搭档暴露胸部、备皮、贴电极）。皮肤只备一次。线提前理好。那 10 秒的停顿说出口。首张不是诊断质量：走之前重做。症状变化：重做。ROSC 后至少等 10 分钟（BCEHS PR16 12 导联采集）。')}
        <h3>${t('STEMI criteria met: four actions', '符合 STEMI 标准：四个动作')}</h3>
        <ol class="ecg-list"><li>${t('Request ACP intercept.', '请求 ACP 拦截。')}</li><li>${t('Therapy pads on, anterior-lateral, wires toward the head, before loading.', '贴治疗电极：前侧位、导线朝头，上车前贴好。')}</li><li>${t('Transmit to the receiving hospital.', '传输给接收医院。')}</li><li>${t('A PCP STEMI pathway exists and transport is under 60 minutes: take it. Otherwise ACP intercept and early notification. Start an IV en route; never delay transport for it.', '有 PCP STEMI 通路且转运 < 60 分钟：走通路。否则 ACP 拦截 + 尽早通知医院。途中开通静脉；绝不为它延误转运。')}</li></ol>
        ${note('Before you treat, say out loud what else it could be: aortic dissection (tearing pain to the back, unequal arm pressures: no ASA, no nitroglycerin), pulmonary embolism, tension pneumothorax, and the ordinary gastrointestinal causes. The ECG says STEMI but the patient looks fine: check the leads. The patient looks like death but the ECG is normal: believe your eyes.',
          '治疗前先说出口「还可能是什么」：主动脉夹层（撕裂样痛向背、双臂血压不等：不给阿司匹林 ASA、不给硝酸甘油 nitroglycerin）、肺栓塞、张力性气胸，以及普通的胃肠原因。心电图说 STEMI 但病人看着没事：查导联。病人看着要死但心电图正常：信自己的眼睛。', 'ecg-key')}
        <p><a class="btn ghost" href="#/aet/class?brief=3&ch=ch-12lead">${t('Full detail: condensed book, chapter 4', '完整细节：精讲第 4 章')}</a></p>`;
    }
  }
}
