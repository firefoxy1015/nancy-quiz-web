// ECG strip engine: synthesises rhythm strips and 12-leads at true paper scale (25 mm/s, 10 mm/mV) and renders them as SVG.
// No DOM is needed, so the same file draws the interactive lab in the browser and the printed atlas under node.
// Every strip is built from a seed, so a drill item can be redrawn exactly, and "redraw" gives a fresh variant of the same rhythm.

export const FS = 250;                       // samples per second
const SMALL = 0.04;                          // one small box in seconds (1 mm)

/* ---------------- seeded random ---------------- */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.between = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(r.between(lo, hi + 1));
  r.pick = xs => xs[Math.floor(r() * xs.length)];
  return r;
}

/* ---------------- one beat ---------------- */
const g = (t, c, s) => { const x = (t - c) / s; return x > 6 || x < -6 ? 0 : Math.exp(-0.5 * x * x); };
const sig = (x, w) => 1 / (1 + Math.exp(-x / w));

// A beat is described relative to its QRS onset (t0). Amplitudes in mV, times in seconds.
export function beat(o) {
  return Object.assign({ t0: 0, p: true, pr: 0.16, pAmp: 0.15, pInv: false, pPeak: false, q: 0.08, r: 1.1, s: 0.22, wide: false, notch: false,
    tAmp: 0.32, tInv: false, st: 0, spike: false, qrsW: 0.09 }, o);
}
export function jPoint(b) { return b.wide ? Math.max(0.14, b.qrsW) : b.qrsW; }
export function rPeakT(b) { return b.t0 + (b.wide ? 0.05 : 0.036); }

function beatWave(t, b) {          // t relative to t0
  let v = 0;
  if (b.p) {
    const pc = -b.pr + 0.045, pw = b.pPeak ? 0.016 : 0.022, pa = b.pAmp * (b.pInv ? -1 : 1) * (b.pPeak ? 1.5 : 1);
    v += pa * g(t, pc, pw);
  }
  if (b.spike) v += 1.6 * g(t, -0.006, 0.0025);
  const J = jPoint(b);
  if (!b.wide) {
    v += -b.q * g(t, 0.012, 0.006);
    v += b.r * g(t, 0.036, 0.011);
    if (b.notch) v += b.r * 0.75 * g(t, 0.07, 0.012);
    v += -b.s * g(t, b.notch ? 0.10 : 0.062, 0.009);
  } else {
    v += b.r * g(t, 0.05, 0.026);
    v += -b.s * g(t, J - 0.04, 0.03);
  }
  const tc = J + (b.wide ? 0.16 : 0.19), ta = b.tAmp * (b.tInv ? -1 : 1) * (b.wide && !b.tInv ? -1 : 1);
  v += ta * g(t, tc, 0.055);
  if (b.st) v += b.st * sig(t - J + 0.01, 0.008) * (1 - sig(t - tc - 0.06, 0.03));
  return v;
}

/* ---------------- continuous components ---------------- */
const fwaves = (r, amp) => { const f = [r.between(5.5, 7), r.between(7, 9), r.between(9, 11)], ph = [r() * 7, r() * 7, r() * 7];
  return t => amp * (Math.sin(2 * Math.PI * f[0] * t + ph[0]) + 0.6 * Math.sin(2 * Math.PI * f[1] * t + ph[1]) + 0.4 * Math.sin(2 * Math.PI * f[2] * t + ph[2])) / 2; };
const sawtooth = (ratePerMin, amp) => { const T = 60 / ratePerMin; return t => amp * (0.5 - ((t / T) % 1)); };
const chaos = (r, amp) => { const n = 5, f = [], ph = [], a = [];
  for (let i = 0; i < n; i++) { f.push(r.between(2.5, 7)); ph.push(r() * 7); a.push(r.between(0.5, 1)); }
  return t => { let v = 0; for (let i = 0; i < n; i++) v += a[i] * Math.sin(2 * Math.PI * (f[i] + 0.6 * Math.sin(0.7 * t + ph[i])) * t + ph[i]); return amp * v / 2.2; }; };
const wander = (r, amp) => { const f = r.between(0.15, 0.35), ph = r() * 7; return t => amp * Math.sin(2 * Math.PI * f * t + ph); };
const mains = amp => t => amp * Math.sin(2 * Math.PI * 60 * t);
const tremor = (r, amp, from, to) => { const f = [r.between(5, 7), r.between(7, 9)], ph = [r() * 7, r() * 7];
  return t => t < from || t > to ? 0 : amp * (Math.sin(2 * Math.PI * f[0] * t + ph[0]) + 0.7 * Math.sin(2 * Math.PI * f[1] * t + ph[1])) * (0.6 + 0.4 * Math.sin(3 * t)); };

/* ---------------- rhythm generators ---------------- */
// Each returns { beats, cont, meta } for a strip of `sec` seconds. meta.regular / meta.rate are the teaching truth for the drill.
function regularBeats(sec, rate, make, jitter = 0.015, r = Math.random) {
  const beats = [], rr = 60 / rate; let t = -rr * 0.35 - 0.2;
  while (t < sec + 0.5) { beats.push(make(t, beats.length)); t += rr * (1 + (r() - 0.5) * 2 * jitter); }
  return beats;
}
const narrow = (t0, o = {}) => beat(Object.assign({ t0 }, o));
const wideB = (t0, o = {}) => beat(Object.assign({ t0, wide: true, p: false, r: 1.2, s: 0.9, qrsW: 0.15, tAmp: 0.5 }, o));

export const RHYTHMS = [
  // ---- sinus family: the SA node is in charge; a P before every QRS, upright in II
  { id: 'nsr', group: 'sinus', en: 'Normal sinus rhythm', zh: '正常窦性心律', short: 'NSR',
    gen: (r, sec) => { const rate = r.int(62, 98), pr = r.between(0.13, 0.19); return { beats: regularBeats(sec, rate, t => narrow(t, { pr }), 0.012, r), cont: [], rate, regular: true }; },
    find: { rate: ['60–100', '60–100'], reg: ['Regular', '规则'], p: ['One upright P before every QRS', '每个 QRS 前一个直立 P'], pr: ['0.12–0.20 s, constant', '0.12–0.20 s，恒定'], qrs: ['Narrow', '窄'] },
    tell: ['Every step of the six is normal. This is the baseline you compare everything else to.', '六步全正常。所有异常节律都拿它当对照。'],
    act: ['No rhythm treatment. Treat the patient, not the monitor.', '节律不需要处理。治病人，不治监护仪。'] },
  { id: 'sbrady', group: 'sinus', en: 'Sinus bradycardia', zh: '窦性心动过缓', short: 'Sinus brady',
    gen: (r, sec) => { const rate = r.int(36, 56); return { beats: regularBeats(sec, rate, t => narrow(t), 0.012, r), cont: [], rate, regular: true }; },
    find: { rate: ['< 60', '< 60'], reg: ['Regular', '规则'], p: ['One upright P before every QRS', '每个 QRS 前一个直立 P'], pr: ['Normal', '正常'], qrs: ['Narrow', '窄'] },
    tell: ['Normal sinus rhythm, just slow: the R waves are far apart but everything else is textbook.', '就是慢版的正常窦律：R 波离得远，其他都正常。'],
    act: ['BCEHS C02 (Bradycardia): bradycardia is < 50, and only symptomatic bradycardia (weakness, decreased LOC, SOB, hypotension, chest pain) is treated. The module counts < 60 as slow. Fit athletes and sleepers live here.', 'BCEHS C02（心动过缓）：< 50 才算心动过缓，且只处理有症状的（乏力、意识下降、气促、低血压、胸痛）。学校模块的「慢」是 < 60。运动员和睡着的人常在这里。'] },
  { id: 'stachy', group: 'sinus', en: 'Sinus tachycardia', zh: '窦性心动过速', short: 'Sinus tachy',
    gen: (r, sec) => { const rate = r.int(104, 148); return { beats: regularBeats(sec, rate, t => narrow(t, { pr: 0.14, tAmp: 0.28 }), 0.01, r), cont: [], rate, regular: true }; },
    find: { rate: ['100–150', '100–150'], reg: ['Regular', '规则'], p: ['Upright P before every QRS (may sit close to the T before it)', '每个 QRS 前有直立 P（快时会贴近前一个 T）'], pr: ['Normal', '正常'], qrs: ['Narrow', '窄'] },
    tell: ['Fast but still sinus: P waves are there and the rate climbs and falls with the cause.', '快，但仍是窦性：P 波在，心率随原因升降。'],
    act: ['Usually compensatory: pain, fear, fever, hypovolemia, hypoxia. BCEHS C03 (Narrow Complex Tachycardia): never try to slow a compensatory tachycardia; find and treat the cause.', '多是代偿：疼痛、恐惧、发热、低血容量、缺氧。BCEHS C03（窄 QRS 心动过速）：代偿性的心动过速不要去降心率，找原因治原因。'] },
  { id: 'sarr', group: 'sinus', en: 'Sinus arrhythmia', zh: '窦性心律不齐', short: 'Sinus arrhythmia',
    gen: (r, sec) => { const rate = r.int(60, 84), beats = [], rr0 = 60 / rate; let t = -0.4, k = 0;
      while (t < sec + 0.5) { beats.push(narrow(t)); t += rr0 * (1 + 0.16 * Math.sin(k * 2 * Math.PI / 5.5)); k++; } return { beats, cont: [], rate, regular: false, phasic: true }; },
    find: { rate: ['60–100', '60–100'], reg: ['Irregular, but in a breathing pattern: speeds up, slows down, repeats', '不规则，但跟呼吸走：渐快、渐慢、重复'], p: ['Upright P before every QRS', '每个 QRS 前直立 P'], pr: ['Normal', '正常'], qrs: ['Narrow', '窄'] },
    tell: ['The R-R gets shorter then longer in waves. Every beat still has its P. Common in the young and healthy.', 'R-R 一阵短一阵长，像波浪；每个 QRS 仍有自己的 P。年轻健康人常见。'],
    act: ['Normal variant. Nothing to treat.', '正常变异，不需要处理。'] },
  { id: 'spause', group: 'sinus', en: 'Sinus pause / arrest', zh: '窦性停搏', short: 'Sinus pause',
    gen: (r, sec) => { const rate = r.int(64, 80), rr = 60 / rate, gap = r.between(2.2, 3.0), at = r.int(2, 4), beats = []; let t = -0.3, k = 0;
      while (t < sec + 0.5) { beats.push(narrow(t)); k++; t += k === at ? gap : rr; } return { beats, cont: [], rate, regular: false }; },
    find: { rate: ['Underlying 60–100, then a hole', '底下 60–100，中间一个洞'], reg: ['Regular until the pause', '停搏前规则'], p: ['Upright P before every QRS; none in the pause', '每个 QRS 前直立 P；停搏里什么都没有'], pr: ['Normal', '正常'], qrs: ['Narrow', '窄'] },
    tell: ['Normal beats, then the SA node simply does not fire: a flat gap longer than two cycles, then it resumes.', '正常心跳，然后 SA 结干脆不点火：一段超过两个周期的空白，再恢复。'],
    act: ['Ask about dizziness and syncope; monitor; if it brings a slow rate with symptoms it is symptomatic bradycardia (BCEHS C02).', '问头晕和晕厥；持续监护；若带来有症状的慢心率，按 BCEHS C02（心动过缓）处理。'] },
  // ---- atrial: the beat starts in the atria but not in the SA node
  { id: 'pac', group: 'atrial', en: 'Premature atrial contraction (PAC)', zh: '房性早搏（房早）', short: 'PAC',
    gen: (r, sec) => { const rate = r.int(66, 84), rr = 60 / rate, at = r.int(2, 3), beats = []; let t = -0.3, k = 0;
      while (t < sec + 0.5) { const early = k === at; beats.push(narrow(t, early ? { pPeak: true, pr: 0.14 } : {})); k++; t += early ? rr * 1.05 : (k === at ? rr * 0.62 : rr); }
      return { beats, cont: [], rate, regular: false }; },
    find: { rate: ['Underlying 60–100', '底下 60–100'], reg: ['Regular except one early beat', '规则，只有一个提前的心跳'], p: ['The early beat has a P, but a different-looking one', '提前那跳有 P，但长得不一样'], pr: ['Normal', '正常'], qrs: ['Narrow (the ventricles conduct normally)', '窄（心室传导正常）'] },
    tell: ['One beat comes early and its P wave is peaked or odd; the QRS is still narrow, so the problem is above the ventricles.', '一跳提前出现，P 波尖或怪；QRS 仍是窄的，说明问题在心室以上。'],
    act: ['Usually benign (caffeine, stress, electrolytes). Note how often; frequent PACs can precede atrial fibrillation.', '多为良性（咖啡因、紧张、电解质）。记下频率；房早频发可能是房颤的前奏。'] },
  { id: 'flutter', group: 'atrial', en: 'Atrial flutter (2:1)', zh: '心房扑动（2:1 下传）', short: 'A-flutter',
    gen: (r, sec) => { const aRate = r.int(290, 310), ratio = r.pick([2, 2, 2, 4]), rate = Math.round(aRate / ratio);
      return { beats: regularBeats(sec, rate, t => narrow(t, { p: false, tAmp: 0.1 }), 0.004, r), cont: [sawtooth(aRate, 0.3)], rate, regular: true }; },
    find: { rate: ['Ventricles often exactly ~150 (300 ÷ 2)', '心室常正好约 150（300 ÷ 2）'], reg: ['Regular', '规则'], p: ['No P: sawtooth flutter waves at ~300/min, no flat baseline', '没有 P：锯齿样 F 波约 300/分，基线没有平的地方'], pr: ['Not measurable', '量不了'], qrs: ['Narrow', '窄'] },
    tell: ['The baseline is a sawtooth that never rests. A narrow, regular rhythm at exactly 150 is flutter until proven otherwise, not sinus tachycardia.', '基线是一排永不停歇的锯齿。窄、规则、正好 150 的节律先想扑动，不要叫窦速。'],
    act: ['Identify and escalate. If unstable (hypotension, altered LOC, chest pain, pulmonary edema) the fix is synchronized cardioversion: ACP / hospital. BCEHS C03 (Narrow Complex Tachycardia).', '认出来、升级。不稳定（低血压、意识改变、胸痛、肺水肿）→ 同步电复律，那是 ACP 和医院的事。BCEHS C03（窄 QRS 心动过速）。'] },
  { id: 'afib', group: 'atrial', en: 'Atrial fibrillation', zh: '心房颤动（房颤）', short: 'A-fib',
    gen: (r, sec) => { const rate = r.pick([r.int(62, 92), r.int(110, 150)]), beats = [], rr = 60 / rate; let t = -0.3;
      while (t < sec + 0.5) { beats.push(narrow(t, { p: false, tAmp: 0.22 })); t += rr * r.between(0.62, 1.42); }
      return { beats, cont: [fwaves(r, r.between(0.06, 0.12))], rate, regular: false, chaotic: true }; },
    find: { rate: ['Any; "rapid" when > 100. Only the 6-second method works', '任何；> 100 叫快速房颤。只能用 6 秒法算'], reg: ['Irregularly irregular: no two R-R the same, no pattern', '绝对不规则：没有两个 R-R 一样，也没有规律'], p: ['No P waves: a wobbly, fibrillating baseline', '没有 P 波：基线细碎抖动'], pr: ['None', '无'], qrs: ['Narrow', '窄'] },
    tell: ['Put a paper edge on the R waves: nothing lines up. Then look for P waves: there are none, just a shaky baseline. Those two findings make the diagnosis.', '拿纸边对 R 波：对不齐。再找 P 波：没有，只有抖动的基线。这两条就是诊断。'],
    act: ['Chronic AF is common and often not the emergency. New or rapid AF with symptoms: identify, 12-lead, escalate. Rate control is ACP / hospital (BCEHS C03).', '慢性房颤很常见，往往不是急症。新发或快速伴症状：认出来、做 12 导、升级。控制心率是 ACP 和医院的事（BCEHS C03）。'] },
  { id: 'svt', group: 'atrial', en: 'Supraventricular tachycardia (SVT)', zh: '室上性心动过速', short: 'SVT',
    gen: (r, sec) => { const rate = r.int(160, 200); return { beats: regularBeats(sec, rate, t => narrow(t, { p: false, tAmp: 0.22, r: 0.95 }), 0.003, r), cont: [], rate, regular: true }; },
    find: { rate: ['150–250', '150–250'], reg: ['Perfectly regular', '极其规则'], p: ['Not visible: buried in the previous T', '看不见：埋在前一个 T 里'], pr: ['Not measurable', '量不了'], qrs: ['Narrow', '窄'] },
    tell: ['Narrow, regular and very fast, switching on and off like a light. The QRS is narrow, so it is above the ventricles: that is all the name says.', '窄、规则、极快，像开关一样突然开始突然停。QRS 窄，所以起源在心室以上，名字说的就只是这个。'],
    act: ['Stable: monitor, 12-lead, transport, escalate. Unstable (SBP low, altered LOC, chest pain, pulmonary edema): immediate synchronized cardioversion is ACP / hospital; PCP recognizes, requests intercept, pre-notifies, transports. BCEHS C03.', '稳定：监护、12 导、转运、升级。不稳定（低血压、意识改变、胸痛、肺水肿）：立即同步电复律是 ACP 和医院的事；PCP 认出来、请求拦截、提前通知、转运。BCEHS C03。'] },
  // ---- junctional
  { id: 'junc', group: 'junctional', en: 'Junctional escape rhythm', zh: '交界性逸搏心律', short: 'Junctional',
    gen: (r, sec) => { const rate = r.int(40, 58), inv = r() < 0.5; return { beats: regularBeats(sec, rate, t => narrow(t, inv ? { p: true, pInv: true, pr: 0.09, pAmp: 0.12 } : { p: false }), 0.006, r), cont: [], rate, regular: true }; },
    find: { rate: ['40–60 (the AV junction\'s own rate)', '40–60（交界区自己的速率）'], reg: ['Regular', '规则'], p: ['Absent, or inverted just before / after the QRS', '没有，或者紧贴 QRS 前后的倒置 P'], pr: ['Short (< 0.12) if a P is seen', '若有 P，很短（< 0.12）'], qrs: ['Narrow', '窄'] },
    tell: ['The SA node has stopped and the AV junction has taken over at its own speed. Narrow QRS, slow, no proper P.', 'SA 结停了，交界区按自己的速度接管。QRS 窄、慢、没有正经的 P。'],
    act: ['It is an escape rhythm: it is protecting the patient. Treat the slow rate only if symptomatic (BCEHS C02 Bradycardia); never suppress it.', '这是逸搏节律，在保护病人。只在有症状时按 BCEHS C02（心动过缓）处理慢心率；绝不去压制它。'] },
  // ---- ventricular
  { id: 'pvc', group: 'ventricular', en: 'Premature ventricular contractions (PVC)', zh: '室性早搏（室早）', short: 'PVC',
    gen: (r, sec) => { const rate = r.int(66, 84), rr = 60 / rate, bigem = r() < 0.4, beats = []; let t = -0.3, k = 0;
      while (t < sec + 0.5) { const pvc = bigem ? k % 2 === 1 : (k === 2 || k === 5); beats.push(pvc ? wideB(t, { r: 1.3, s: 0.7 }) : narrow(t)); k++;
        const nextPvc = bigem ? k % 2 === 1 : (k === 2 || k === 5); t += nextPvc ? rr * 0.58 : (pvc ? rr * 1.42 : rr); }
      return { beats, cont: [], rate, regular: false, bigem }; },
    find: { rate: ['Underlying 60–100', '底下 60–100'], reg: ['Regular, interrupted by early wide beats', '规则，被提前的宽心跳打断'], p: ['The early beat has no P', '提前那跳没有 P'], pr: ['None for the PVC', '室早没有 PR'], qrs: ['Wide and bizarre on the early beat, T opposite; then a full pause', '提前那跳宽大畸形，T 波反向；之后一个完整的停顿'] },
    tell: ['An early beat with no P, wide and strange-looking, followed by a pause. Every other beat = bigeminy. A PVC landing on the T wave (R-on-T) can start VF.', '一个提前的心跳，没有 P、又宽又怪，后面跟一个停顿。隔一跳一个 = 二联律。室早落在 T 波上（R-on-T）可能引发 VF。'],
    act: ['Occasional PVCs are common. Frequent, multiform or R-on-T in a chest-pain patient: oxygen to 94%, 12-lead, escalate; the cause (ischemia, hypoxia, electrolytes) is the treatment.', '偶发室早很常见。胸痛病人出现频发、多形或 R-on-T：氧到 94%、12 导、升级；治的是原因（缺血、缺氧、电解质）。'] },
  { id: 'vt', group: 'ventricular', en: 'Ventricular tachycardia (monomorphic)', zh: '室性心动过速（单形）', short: 'VT',
    gen: (r, sec) => { const rate = r.int(140, 190); return { beats: regularBeats(sec, rate, t => wideB(t, { r: 1.3, s: 1.0, qrsW: 0.16, tAmp: 0.55 }), 0.004, r), cont: [], rate, regular: true }; },
    find: { rate: ['100–250, usually > 140', '100–250，多 > 140'], reg: ['Regular', '规则'], p: ['None (or marching through independently)', '没有（或各走各的）'], pr: ['None', '无'], qrs: ['Wide (≥ 0.12 s), all the same shape, T opposite', '宽（≥ 0.12 s），形态一致，T 波反向'] },
    tell: ['Wide, regular, fast: treat as VT until proven otherwise. Width decides the name, not speed. First question: is there a pulse?', '宽、规则、快：按 VT 处理，直到证明不是。宽窄决定名字，不是快慢。第一个问题：有没有脉搏？'],
    act: ['With a pulse: not an arrest rhythm, no defibrillation; AED pads on, oxygen, 12-lead, request ACP intercept, rapid transport. Without a pulse: cardiac arrest, CPR + defibrillate (shockable).', '有脉搏：不是骤停节律，不除颤；贴好 AED 电极、给氧、12 导、请求 ACP 拦截、快速转运。无脉搏：心脏骤停，CPR + 除颤（可电击）。'], arrest: { shock: true, pulseAsk: true } },
  { id: 'torsades', group: 'ventricular', en: 'Torsades de pointes (polymorphic VT)', zh: '尖端扭转型室速', short: 'Torsades',
    gen: (r, sec) => { const f = r.between(3.6, 4.2), ph = r() * 7, env = r.between(2.2, 3.0);
      return { beats: [], cont: [t => 1.3 * Math.sin(2 * Math.PI * t / env + ph) * Math.sin(2 * Math.PI * f * t)], rate: Math.round(f * 60), regular: false, noQrs: true }; },
    find: { rate: ['200–250', '200–250'], reg: ['Irregular', '不规则'], p: ['None', '没有'], pr: ['None', '无'], qrs: ['Wide, and the height twists up and down around the baseline', '宽，而且高度绕着基线一阵大一阵小地扭转'] },
    tell: ['The QRS tips seem to spiral around the baseline, like a twisted ribbon. It comes from a long QT (drugs, low K⁺/Mg²⁺) and often collapses into VF.', 'QRS 的尖端像一条拧过的丝带绕着基线转。来自 QT 延长（药物、低钾低镁），常恶化成 VF。'],
    act: ['Pulse check. Pulseless: CPR + defibrillate. With a pulse: oxygen, escalate urgently (magnesium sulfate 硫酸镁 is ACP / hospital).', '摸脉搏。无脉：CPR + 除颤。有脉：给氧、紧急升级（硫酸镁 magnesium sulfate 是 ACP 和医院的事）。'], arrest: { shock: true, pulseAsk: true } },
  { id: 'vf', group: 'ventricular', en: 'Ventricular fibrillation (VF)', zh: '心室颤动（室颤）', short: 'VF',
    gen: (r, sec) => { const fine = r() < 0.3; return { beats: [], cont: [chaos(r, fine ? r.between(0.1, 0.16) : r.between(0.45, 0.7))], rate: 0, regular: false, noQrs: true, fine }; },
    find: { rate: ['None: nothing to count', '没有：无从数起'], reg: ['Chaotic', '混乱'], p: ['None', '没有'], pr: ['None', '无'], qrs: ['None: no recognisable complexes at all', '没有：根本没有可辨认的波'] },
    tell: ['A chaotic scribble with no P, QRS or T. Coarse VF is big waves; fine VF is small waves that look almost flat (turn the gain up before calling asystole).', '一团没有 P、QRS、T 的乱线。粗颤是大波，细颤是小波，几乎像平线（叫心搏停止前先把增益调大）。'],
    act: ['Always a cardiac arrest. CPR + defibrillate as early as possible (shockable). A talking, shivering patient with "VF" on the screen has artifact: look at the patient first.', '一定是心脏骤停。CPR + 尽早除颤（可电击）。屏幕显示「VF」但病人在说话、在发抖，那是伪差：先看病人。'], arrest: { shock: true, pulse: 'none' } },
  { id: 'ivr', group: 'ventricular', en: 'Idioventricular (ventricular escape) rhythm', zh: '室性逸搏心律', short: 'Idioventricular',
    gen: (r, sec) => { const rate = r.int(24, 40); return { beats: regularBeats(sec, rate, t => wideB(t, { r: 1.0, s: 0.8, qrsW: 0.16 }), 0.01, r), cont: [], rate, regular: true }; },
    find: { rate: ['20–40 (the ventricles\' own rate)', '20–40（心室自己的速率）'], reg: ['Regular', '规则'], p: ['None', '没有'], pr: ['None', '无'], qrs: ['Wide, T opposite', '宽，T 波反向'] },
    tell: ['Slow and wide with no P: the last backup pacemaker, in the ventricles, is all that is left. Often seen as a dying heart\'s rhythm or as PEA: check the pulse.', '慢、宽、没有 P：最后一级备用起搏点（心室）在撑着。常是濒死心脏的节律，或者就是 PEA：摸脉搏。'],
    act: ['Pulse check first. No pulse: PEA, CPR, reversible causes. Pulse present: symptomatic bradycardia (BCEHS C02), oxygen, ACP intercept for pacing, rapid transport.', '先摸脉搏。无脉：PEA，CPR，找可逆病因。有脉：有症状的心动过缓（BCEHS C02），给氧、请 ACP 拦截起搏、快速转运。'], arrest: { shock: false, pulseAsk: true } },
  { id: 'asys', group: 'ventricular', en: 'Asystole', zh: '心搏停止', short: 'Asystole',
    gen: (r, sec) => ({ beats: [], cont: [wander(r, 0.03)], rate: 0, regular: false, noQrs: true }),
    find: { rate: ['0', '0'], reg: ['—', '—'], p: ['None', '没有'], pr: ['None', '无'], qrs: ['None: a flat (slightly wandering) line', '没有：一条平的（略微漂移的）线'] },
    tell: ['A flat line. Before you believe it: check the leads are attached, check the gain, check a second lead. Fine VF can hide here.', '一条平线。相信它之前：查导联有没有掉、查增益、换一个导联看。细颤可能藏在里面。'],
    act: ['Cardiac arrest, not shockable: CPR + search for reversible causes (Hs and Ts). The AED will say "no shock advised".', '心脏骤停，不可电击：CPR + 找可逆病因（H 和 T）。AED 会说「不建议电击」。'], arrest: { shock: false, pulse: 'none' } },
  { id: 'pea', group: 'ventricular', en: 'Pulseless electrical activity (PEA)', zh: '无脉性电活动', short: 'PEA',
    gen: (r, sec) => { const kind = r.pick(['slowWide', 'nsrLike', 'slowNarrow']); const rate = kind === 'nsrLike' ? r.int(60, 90) : r.int(30, 50);
      const mk = kind === 'slowWide' ? (t => wideB(t, { r: 0.8, s: 0.6 })) : kind === 'slowNarrow' ? (t => narrow(t, { r: 0.7, tAmp: 0.15 })) : (t => narrow(t, { r: 0.9 }));
      return { beats: regularBeats(sec, rate, mk, 0.02, r), cont: [], rate, regular: true, pea: true }; },
    find: { rate: ['Any', '任何'], reg: ['Any', '任何'], p: ['May be present', '可能有'], pr: ['May be normal', '可能正常'], qrs: ['Narrow or wide: any organised rhythm', '窄或宽：任何有组织的节律'] },
    tell: ['The strip can look completely normal. PEA is not a shape on paper: it is any organised rhythm in a patient with no pulse. The monitor cannot tell you this; your fingers can.', '条带可以看起来完全正常。PEA 不是纸上的形状，而是「有组织的节律 + 摸不到脉搏」。监护仪告诉不了你，手指才能。'],
    act: ['Cardiac arrest, not shockable: CPR + reversible causes (hypovolemia, hypoxia, H⁺, hypo/hyperkalemia, hypothermia; tension pneumothorax, tamponade, toxins, thrombosis).', '心脏骤停，不可电击：CPR + 找可逆病因（低血容量、缺氧、酸中毒、低/高钾、低体温；张力性气胸、心包填塞、中毒、血栓）。'], arrest: { shock: false, pulse: 'none' } },
  // ---- AV blocks: the problem is the delay or the drop between P and QRS
  { id: 'avb1', group: 'block', en: 'First-degree AV block', zh: '一度房室阻滞', short: '1° AV block',
    gen: (r, sec) => { const rate = r.int(58, 84), pr = r.between(0.24, 0.36); return { beats: regularBeats(sec, rate, t => narrow(t, { pr }), 0.012, r), cont: [], rate, regular: true, pr }; },
    find: { rate: ['Usually 60–100', '多 60–100'], reg: ['Regular', '规则'], p: ['One P before every QRS', '每个 QRS 前一个 P'], pr: ['> 0.20 s (more than 5 small boxes), and the same every beat', '> 0.20 s（超过 5 小格），而且每跳一样'], qrs: ['Narrow', '窄'] },
    tell: ['Everything conducts, just slowly: a long, constant PR. The only abnormal step is step 4. Measure to the start of the QRS, not to the R peak.', '每个都下传，只是慢：PR 长而恒定。六步里只有第四步异常。量到 QRS 起点，不是量到 R 波峰。'],
    act: ['Usually benign on its own; note it, look for the cause (drugs, inferior MI, vagal tone), monitor for a higher block.', '本身多为良性；记下来，找原因（药物、下壁心梗、迷走张力），监护有没有进展成更高级阻滞。'] },
  { id: 'avb2w', group: 'block', en: 'Second-degree AV block, type I (Wenckebach)', zh: '二度 I 型房室阻滞（文氏）', short: '2° type I',
    gen: (r, sec) => { const aRate = r.int(66, 84), pp = 60 / aRate, n = r.pick([3, 4]), beats = []; let t = -0.4, k = 0;
      while (t < sec + 0.6) { const i = k % n; if (i < n - 1) beats.push(narrow(t, { pr: 0.16 + 0.08 * i })); else beats.push(narrow(t, { pr: 0.16, r: 0, s: 0, q: 0, tAmp: 0, qrsW: 0.001, dropped: true })); k++; t += pp; }
      return { beats, cont: [], rate: Math.round(aRate * (n - 1) / n), regular: false, grouped: true }; },
    find: { rate: ['Atrial regular; ventricular a little slower', '心房规则；心室略慢'], reg: ['Regularly irregular: groups of beats, then a dropped one', '规律的不规则：几跳一组，然后掉一跳'], p: ['More P than QRS; P-P regular', 'P 比 QRS 多；P-P 规则'], pr: ['Gets longer, longer, longer… then a P with no QRS; the cycle repeats', '越来越长、越来越长……然后一个 P 后面没有 QRS；再重来'], qrs: ['Narrow', '窄'] },
    tell: ['"Longer, longer, drop." The AV node tires a little more each beat until one P is not conducted, then it rests and starts again. Grouped beating on the strip.', '「长、更长、掉」。AV 结一跳比一跳累，直到一个 P 传不下去，休息一下再来。条带上看是成组的心跳。'],
    act: ['Usually benign and transient (vagal tone, inferior MI). Monitor; treat only symptomatic bradycardia (BCEHS C02).', '多为良性、一过性（迷走张力、下壁心梗）。监护；只处理有症状的心动过缓（BCEHS C02）。'] },
  { id: 'avb2m', group: 'block', en: 'Second-degree AV block, type II (Mobitz II)', zh: '二度 II 型房室阻滞（莫氏 II）', short: '2° type II',
    gen: (r, sec) => { const aRate = r.int(70, 90), pp = 60 / aRate, pr = r.between(0.16, 0.2), pattern = r.pick([[1, 1, 0], [1, 0], [1, 1, 1, 0]]), beats = []; let t = -0.4, k = 0;
      while (t < sec + 0.6) { const c = pattern[k % pattern.length]; beats.push(c ? narrow(t, { pr, notch: true, qrsW: 0.12 }) : narrow(t, { pr, r: 0, s: 0, q: 0, tAmp: 0, qrsW: 0.001, dropped: true })); k++; t += pp; }
      const conducted = pattern.filter(Boolean).length / pattern.length; return { beats, cont: [], rate: Math.round(aRate * conducted), regular: false }; },
    find: { rate: ['Ventricular slow (often half the atrial rate)', '心室慢（常是心房的一半）'], reg: ['Irregular where beats drop, or regular 2:1', '掉跳处不规则，或规则的 2:1'], p: ['More P than QRS; P-P regular', 'P 比 QRS 多；P-P 规则'], pr: ['Constant on the conducted beats, then a P is suddenly dropped', '下传的那些 PR 恒定，然后突然一个 P 不下传'], qrs: ['Often wide (the block is low, below the AV node)', '常是宽的（阻滞位置低，在 AV 结以下）'] },
    tell: ['No warning: the PR stays the same, then a P simply has no QRS. This block is lower and less stable than Wenckebach and can fall into complete block.', '没有预警：PR 一直一样，然后一个 P 就是没有 QRS。这种阻滞位置更低、更不稳，可能跌成完全阻滞。'],
    act: ['Dangerous. Oxygen, IV, pads on, early ACP intercept (pacing), rapid transport; treat symptomatic bradycardia per BCEHS C02.', '危险。给氧、开通静脉、贴好电极、早请 ACP 拦截（起搏）、快速转运；有症状按 BCEHS C02（心动过缓）。'] },
  { id: 'avb3', group: 'block', en: 'Third-degree (complete) AV block', zh: '三度（完全性）房室阻滞', short: '3° AV block',
    gen: (r, sec) => { const aRate = r.int(72, 92), vRate = r.int(28, 42), beats = []; let t = -0.4;
      while (t < sec + 0.6) { beats.push(narrow(t, { pr: 0.0, pAmp: 0.15, r: 0, s: 0, q: 0, tAmp: 0, qrsW: 0.001, dropped: true, pOnly: true })); t += 60 / aRate; }
      t = -0.2 + r() * 0.5; while (t < sec + 0.6) { beats.push(wideB(t, { r: 1.1, s: 0.8, qrsW: 0.16 })); t += 60 / vRate; }
      return { beats, cont: [], rate: vRate, regular: true, dissoc: true }; },
    find: { rate: ['Atria 60–100; ventricles 20–40 (escape)', '心房 60–100；心室 20–40（逸搏）'], reg: ['Both regular, but to each other they are strangers', '各自规则，但彼此没关系'], p: ['Regular P waves marching through, some hidden in QRS or T', 'P 波规则地一路走过去，有的藏在 QRS 或 T 里'], pr: ['Different every beat: there is no real PR', '每跳都不一样：其实没有 PR'], qrs: ['Wide and slow (ventricular escape); narrow if the escape is junctional', '宽而慢（室性逸搏）；交界性逸搏则窄'] },
    tell: ['The P waves and the QRS complexes each keep their own regular beat and never agree: regular QRS with a PR that keeps changing is almost always third degree.', 'P 波和 QRS 各打各的拍子，永远对不上：规则的 QRS 配上一直在变的 PR，几乎都是三度。'],
    act: ['Unstable by nature. Oxygen, IV, pads on, request ACP intercept early (pacing), rapid transport; symptomatic bradycardia per BCEHS C02.', '本质上就不稳定。给氧、开通静脉、贴好电极、早请 ACP 拦截（起搏）、快速转运；有症状按 BCEHS C02（心动过缓）。'] },
  { id: 'bbb', group: 'block', en: 'Bundle branch block (sinus rhythm with wide QRS)', zh: '束支阻滞（窦律 + 宽 QRS）', short: 'BBB',
    gen: (r, sec) => { const rate = r.int(62, 90); return { beats: regularBeats(sec, rate, t => narrow(t, { notch: true, qrsW: 0.14, tInv: true, tAmp: 0.25 }), 0.012, r), cont: [], rate, regular: true }; },
    find: { rate: ['60–100', '60–100'], reg: ['Regular', '规则'], p: ['One P before every QRS', '每个 QRS 前一个 P'], pr: ['Normal', '正常'], qrs: ['Wide (≥ 0.12 s), often notched (RSR\'); T opposite', '宽（≥ 0.12 s），常有切迹（RSR\'）；T 波反向'] },
    tell: ['A normal sinus beat whose QRS is wide: the signal reached the ventricles on time (normal PR) but had to crawl through muscle because one bundle branch is blocked.', '一个正常窦性心跳，只是 QRS 宽：信号准时到了心室（PR 正常），但因为一支束支堵了，只能在肌肉里爬。'],
    act: ['Ask for an old ECG. New LBBB with chest pain is treated as a STEMI equivalent (BCEHS C01); a BBB also makes ST reading unreliable: transmit and consult.', '问有没有旧心电图。新发 LBBB + 胸痛按 STEMI 等同处理（BCEHS C01）；束支阻滞也让 ST 读不准：传输、咨询。'] },
  // ---- other
  { id: 'paced', group: 'other', en: 'Paced rhythm', zh: '起搏心律', short: 'Paced',
    gen: (r, sec) => { const rate = r.int(60, 72); return { beats: regularBeats(sec, rate, t => wideB(t, { spike: true, r: 1.0, s: 0.9, qrsW: 0.15 }), 0.002, r), cont: [], rate, regular: true }; },
    find: { rate: ['Set by the device, often 60–72', '由起搏器设定，常 60–72'], reg: ['Metronome-regular', '节拍器一样规则'], p: ['None (ventricular pacing)', '没有（心室起搏）'], pr: ['None', '无'], qrs: ['A thin vertical spike, then a wide QRS', '一根细直的钉子，紧跟一个宽 QRS'] },
    tell: ['Look for the pacer spike: a hairline vertical line right before each wide QRS. Perfectly regular, because a machine is timing it.', '找起搏钉：每个宽 QRS 前一条细如发丝的竖线。极其规则，因为是机器在计时。'],
    act: ['Normal for a patient with a pacemaker. Problems are failure to capture (spikes with no QRS) or failure to sense; still check the pulse and the patient.', '有起搏器的病人这就是正常。要注意的是不夺获（有钉子没 QRS）和感知失灵；照样摸脉搏、看病人。'] },
  { id: 'artifact', group: 'other', en: 'Artifact (looks like VF)', zh: '伪差（像 VF）', short: 'Artifact',
    gen: (r, sec) => { const rate = r.int(66, 88), from = r.between(1.2, 2.5), to = from + r.between(1.8, 2.6);
      return { beats: regularBeats(sec, rate, t => narrow(t), 0.012, r), cont: [tremor(r, r.between(0.35, 0.6), from, to)], rate, regular: true, artifact: [from, to] }; },
    find: { rate: ['Normal underneath', '底下正常'], reg: ['Regular where you can see it', '看得见的地方规则'], p: ['Present where the trace is clean', '干净处有 P'], pr: ['Normal', '正常'], qrs: ['Narrow QRS marching straight through the "chaos"', '窄 QRS 穿过「乱线」一路走'] },
    tell: ['The mess starts and stops suddenly and the normal QRS keep marching through it at their usual spacing. Shivering, brushing teeth, a loose electrode, a moving ambulance.', '乱线突然开始突然结束，正常的 QRS 按原来的间距从中间一路穿过去。发抖、刷牙、电极松、车在动。'],
    act: ['Look at the patient and feel the pulse before you believe any "VF". Fix the cause (warm, still, fresh electrode) and re-run.', '相信任何「VF」之前先看病人、摸脉搏。修原因（保暖、别动、换新电极）再采。'] },
];
export const RHYTHM = Object.fromEntries(RHYTHMS.map(x => [x.id, x]));
export const GROUPS = [['sinus', 'Sinus family', '窦性家族'], ['atrial', 'Atrial', '心房'], ['junctional', 'Junctional', '交界'], ['ventricular', 'Ventricular & arrest', '心室与骤停'], ['block', 'AV blocks', '房室阻滞'], ['other', 'Other', '其他']];

/* ---------------- strip synthesis ---------------- */
export function makeStrip(id, seed = 1, sec = 6) {
  const def = RHYTHM[id], r = rng(seed), spec = def.gen(r, sec);
  const n = Math.round(sec * FS), samples = new Float32Array(n);
  const base = wander(r, spec.noQrs ? 0 : 0.015);
  const beats = spec.beats;
  for (let i = 0; i < n; i++) {
    const t = i / FS; let v = base(t);
    for (const c of spec.cont) v += c(t);
    for (const b of beats) { const d = t - b.t0; if (d > -0.5 && d < 0.75) v += beatWave(d, b); }
    samples[i] = v;
  }
  const qrs = beats.filter(b => !b.dropped && !b.pOnly);
  const peaks = qrs.map(rPeakT).filter(t => t >= 0 && t < sec);
  const rr = peaks.slice(1).map((t, i) => t - peaks[i]);
  const rrMean = rr.length ? rr.reduce((a, b) => a + b, 0) / rr.length : 0;
  const rrCv = rr.length > 1 ? Math.sqrt(rr.reduce((a, b) => a + (b - rrMean) ** 2, 0) / rr.length) / rrMean : 0;
  return { id, seed, sec, fs: FS, samples, beats, peaks, rate6: peaks.filter(t => t < 6).length * 10, rrCv, spec: Object.assign({}, spec, { beats: undefined, cont: undefined }) };
}

// A strip from explicit beats and continuous parts (single-beat figures, noisy leads for the artifact drill)
export function customStrip(beats, cont = [], sec = 2, seed = 1, meta = {}) {
  const n = Math.round(sec * FS), samples = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / FS; let v = 0; for (const c of cont) v += c(t); for (const b of beats) { const d = t - b.t0; if (d > -0.5 && d < 0.75) v += beatWave(d, b); } samples[i] = v; }
  const qrs = beats.filter(b => !b.dropped && !b.pOnly), peaks = qrs.map(rPeakT).filter(t => t >= 0 && t < sec);
  return { id: 'custom', seed, sec, fs: FS, samples, beats, peaks, rate6: peaks.filter(t => t < 6).length * 10, rrCv: 0, spec: Object.assign({ rate: 70 }, meta) };
}
export const NOISE = { mains: amp => mains(amp), tremor: (r, amp, from, to) => tremor(r, amp, from, to), wander: (r, amp) => wander(r, amp) };

/* ---------------- SVG rendering ---------------- */
const f1 = x => (Math.round(x * 100) / 100).toString();
// opts: pxPerMm, heightMm, baseMm (baseline from top), label, overlays [], window [fromS, toS], gain (mm per mV)
export function stripSVG(strip, opts = {}) {
  const { pxPerMm = 4, heightMm = 30, baseMm = 19, gain = 10, label = '', overlays = [], cls = '', fit = false, win, textMm = 2.6 } = opts;
  const from = win ? win[0] : 0, to = win ? win[1] : strip.sec, W = (to - from) * 25, H = heightMm;
  const X = t => (t - from) * 25, Y = mv => baseMm - mv * gain;
  let grid1 = '', grid2 = '';
  for (let x = 0; x <= W + 1e-6; x += 1) (x % 5 === 0 ? 0 : 1) ? grid1 += `M${x} 0V${H}` : grid2 += `M${x} 0V${H}`;
  for (let y = 0; y <= H + 1e-6; y += 1) (y % 5 === 0 ? 0 : 1) ? grid1 += `M0 ${y}H${W}` : grid2 += `M0 ${y}H${W}`;
  const i0 = Math.max(0, Math.floor(from * strip.fs)), i1 = Math.min(strip.samples.length - 1, Math.ceil(to * strip.fs));
  let d = '';
  for (let i = i0; i <= i1; i++) { const t = i / strip.fs; d += (i === i0 ? 'M' : 'L') + f1(X(t)) + ' ' + f1(Y(Math.max(-2.2, Math.min(2.4, strip.samples[i])))); }
  const ov = `<g class="ovl">${overlays.map(o => overlay(o, strip, X, Y, W, H, baseMm, textMm)).join('')}</g>`;
  const lab = label ? `<text class="lab" x="1.5" y="3.4" font-size="3">${label}</text>` : '';
  return `<svg class="ecg ${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="${fit ? 'width:100%' : 'width:' + Math.round(W * pxPerMm) + 'px'};height:${Math.round(H * pxPerMm)}px" xmlns="http://www.w3.org/2000/svg">
<rect class="paper" width="${W}" height="${H}"/><path class="g1" d="${grid1}"/><path class="g2" d="${grid2}"/>${lab}<path class="tr" d="${d}"/>${ov}</svg>`;
}

// Only the overlay layer, for callers that update marks on an existing strip (the caliper): same geometry as stripSVG.
export function overlaysSVG(strip, opts = {}) {
  const { heightMm = 30, baseMm = 19, gain = 10, overlays = [], win, textMm = 2.6 } = opts;
  const from = win ? win[0] : 0, to = win ? win[1] : strip.sec, W = (to - from) * 25, H = heightMm;
  const X = t => (t - from) * 25, Y = mv => baseMm - mv * gain;
  return overlays.map(o => overlay(o, strip, X, Y, W, H, baseMm, textMm)).join('');
}
// overlays draw the teaching marks: numbers on R waves, R-R brackets, P circles, PR / QRS brackets, J points, the 6-second window, the 300 rule, a caliper
function overlay(o, s, X, Y, W, H, base, fs = 2.6) {
  const inWin = t => X(t) >= -0.5 && X(t) <= W + 0.5;
  const qrs = s.beats.filter(b => !b.dropped && !b.pOnly && b.t0 >= 0.05), txt = (x, y, str, extra = '') => `<text x="${f1(x)}" y="${f1(y)}" font-size="${fs}" text-anchor="middle" ${extra}>${str}</text>`;
  const br = (x1, x2, y, str, cls = 'ov') => `<path class="${cls}" d="M${f1(x1)} ${f1(y - 1.2)}V${f1(y)}H${f1(x2)}V${f1(y - 1.2)}"/>` + (str ? txt((x1 + x2) / 2, y + 2.8, str, `class="${cls}-t"`) : '');
  switch (o.type) {
    case 'rcount': { let k = 0; return s.peaks.filter(t => (o.to == null || t < o.to) && inWin(t)).map(t => `<circle class="ov-c" cx="${f1(X(t))}" cy="${f1(base - 13.5)}" r="1.7"/>` + txt(X(t), base - 12.6, String(++k), 'class="ov-ct"')).join(''); }
    case 'rr': { const ps = s.peaks.filter(inWin); return ps.slice(1).map((t, i) => br(X(ps[i]), X(t), base - 10.5, o.boxes ? Math.round((t - ps[i]) / SMALL) + (o.unit || '') : (t - ps[i]).toFixed(2) + ' s')).join(''); }
    case 'p': return s.beats.filter(b => inWin(b.t0)).map(b => b.p ? `<circle class="ov" cx="${f1(X(b.t0 - b.pr + 0.045))}" cy="${f1(Y(b.pAmp * (b.pInv ? -1 : 1) * 0.5))}" r="2.6"/>`
      : `<text class="ov-q" x="${f1(X(b.t0 - 0.16))}" y="${f1(Y(0.45))}" font-size="3.4" text-anchor="middle">?</text>`).join('');
    case 'pr': { const b = qrs[o.k ?? 1]; if (!b || !b.p) return ''; return br(X(b.t0 - b.pr), X(b.t0), Y(-0.55), `PR ${b.pr.toFixed(2)} s · ${Math.round(b.pr / SMALL)}${o.boxWord || ''}`); }
    case 'qrs': { const b = qrs[o.k ?? 1]; if (!b) return ''; const w = b.wide ? jPoint(b) : b.qrsW; return br(X(b.t0), X(b.t0 + w), Y(-1.0), `QRS ${w.toFixed(2)} s · ${Math.round(w / SMALL)}${o.boxWord || ''}`); }
    case 'qt': { const b = qrs[o.k ?? 1]; if (!b) return ''; const J = jPoint(b), end = J + (b.wide ? 0.16 : 0.19) + 0.11; return br(X(b.t0), X(b.t0 + end), Y(-1.45), `QT ${end.toFixed(2)} s`); }
    case 'j': return qrs.filter(b => inWin(b.t0)).slice(0, o.n || 99).map(b => `<circle class="ov-j" cx="${f1(X(b.t0 + jPoint(b)))}" cy="${f1(Y(b.st))}" r="1"/>` + (o.label ? txt(X(b.t0 + jPoint(b)), Y(b.st) - 2, 'J', 'class="ov-t"') : '')).join('');
    case 'baseline': return `<path class="ov-d" d="M0 ${f1(Y(0))}H${W}"/>` + (o.label ? txt(W - 12, Y(0) - 1.2, o.label, 'class="ov-t"') : '');
    case 'six': return `<path class="ov-s" d="M${f1(X(0))} 0V${H}M${f1(X(6))} 0V${H}"/>` + (o.label ? txt(X(3), 2.8, o.label, 'class="ov-t"') : '');
    case 'thick': { const p = s.peaks[o.k ?? 1]; if (p == null) return ''; const x0 = Math.round(X(p) / 5) * 5, labels = [300, 150, 100, 75, 60, 50, 43, 37];
      return `<path class="ov-s" d="M${x0} 0V${H}"/>` + labels.map((v, i) => `<path class="ov-d" d="M${x0 + 5 * (i + 1)} ${f1(base - 16)}V${f1(base - 9)}"/>` + txt(x0 + 5 * (i + 1), base - 16.6, String(v), 'class="ov-ct"')).join(''); }
    case 'cal': return `<path class="ov-s" d="M${f1(X(o.a))} 0V${H}M${f1(X(o.b))} 0V${H}"/>` + (o.text ? txt((X(o.a) + X(o.b)) / 2, base - 15, o.text, 'class="ov-ct"') : '');
    case 'band': return `<rect class="ov-band" x="${f1(X(o.a))}" y="0" width="${f1(X(o.b) - X(o.a))}" height="${H}"/>` + (o.text ? txt((X(o.a) + X(o.b)) / 2, 3, o.text, 'class="ov-t"') : '');
    case 'spike': return qrs.filter(b => b.spike && inWin(b.t0)).map(b => `<path class="ov-a" d="M${f1(X(b.t0 - 0.006))} ${f1(Y(1.9))}v2.5"/>`).join('');
    case 'wave': { const b = qrs[o.k ?? 1]; if (!b) return ''; const J = jPoint(b), tc = J + 0.19;
      const spans = { P: [b.t0 - b.pr, b.t0 - b.pr + 0.09, 'P'], PR: [b.t0 - b.pr, b.t0, 'PR'], QRS: [b.t0, b.t0 + b.qrsW, 'QRS'], ST: [b.t0 + J, b.t0 + tc - 0.07, 'ST'], T: [b.t0 + tc - 0.07, b.t0 + tc + 0.11, 'T'], QT: [b.t0, b.t0 + tc + 0.11, 'QT'], TP: [b.t0 + tc + 0.11, b.t0 + 60 / (s.spec.rate || 70) - b.pr, 'TP'] };
      const sp = spans[o.wave]; if (!sp) return ''; return `<rect class="ov-band" x="${f1(X(sp[0]))}" y="0" width="${f1(X(sp[1]) - X(sp[0]))}" height="${H}"/>`; }
    case 'mv': { const x = X(o.t ?? 0.2); return `<path class="ov" d="M${f1(x - 1)} ${f1(Y(0))}h1V${f1(Y(1))}h-1"/><text class="ov-t" x="${f1(x - 1.6)}" y="${f1(Y(0.5))}" font-size="${fs}" text-anchor="end">${o.text || '10 mm = 1 mV'}</text>`; }
    case 'box': { const x = X(o.t), y = o.y ?? base - 8, w = o.big ? 5 : 1; return `<rect class="ov-box" x="${f1(x)}" y="${f1(y)}" width="${w}" height="${w}"/>` + (o.text ? `<text class="ov-t" x="${f1(x + w + 0.8)}" y="${f1(y + w * 0.5 + fs * 0.35)}" font-size="${fs}">${o.text}</text>` : ''); }
    case 'text': return txt(X(o.t), o.y ?? 4, o.text, 'class="ov-t"');
    default: return '';
  }
}

/* ---------------- 12-lead ---------------- */
// Typical normal amplitudes per lead (mV); st = ST shift in mm, applied by the pattern
const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const PROFILE = { I: [0.1, 0.05, 0.7, 0.1, 0.25], II: [0.15, 0.08, 1.1, 0.2, 0.35], III: [0.08, 0.1, 0.5, 0.25, 0.15], aVR: [-0.1, 0, 0.15, 0.9, -0.25], aVL: [0.05, 0.05, 0.45, 0.2, 0.12], aVF: [0.12, 0.08, 0.8, 0.2, 0.25],
  V1: [0.06, 0, 0.25, 1.2, -0.12], V2: [0.08, 0, 0.5, 1.6, 0.4], V3: [0.08, 0, 0.9, 1.2, 0.45], V4: [0.1, 0.05, 1.6, 0.6, 0.5], V5: [0.1, 0.05, 1.5, 0.3, 0.4], V6: [0.1, 0.05, 1.2, 0.15, 0.3] };
export const WALLS = { inferior: { leads: ['II', 'III', 'aVF'], en: 'Inferior', zh: '下壁', artery: 'RCA', arteryZh: '右冠状动脉', color: '#2e9e5b' }, septal: { leads: ['V1', 'V2'], en: 'Septal', zh: '间隔', artery: 'LAD', arteryZh: '左前降支', color: '#d9822b' },
  anterior: { leads: ['V3', 'V4'], en: 'Anterior', zh: '前壁', artery: 'LAD', arteryZh: '左前降支', color: '#d0383b' }, lateral: { leads: ['I', 'aVL', 'V5', 'V6'], en: 'Lateral', zh: '侧壁', artery: 'LCx', arteryZh: '回旋支', color: '#3b6fd6' } };
export const PATTERNS = {
  normal: { en: 'Normal 12-lead', zh: '正常 12 导联', st: {} },
  inferior: { en: 'Inferior STEMI', zh: '下壁 STEMI', wall: 'inferior', st: { II: 2.2, III: 3, aVF: 2.5, I: -1, aVL: -1.6 } },
  anterior: { en: 'Anterior STEMI', zh: '前壁 STEMI', wall: 'anterior', st: { V1: 1.5, V2: 3.5, V3: 4, V4: 3, V5: 1.2, II: -0.8, III: -1.2, aVF: -1 } },
  lateral: { en: 'Lateral STEMI', zh: '侧壁 STEMI', wall: 'lateral', st: { I: 1.6, aVL: 2.2, V5: 2, V6: 2, III: -1.5, aVF: -1 } },
  septal: { en: 'Septal STEMI', zh: '间隔 STEMI', wall: 'septal', st: { V1: 2.2, V2: 2.8, V3: 1.2 } },
  inferolateral: { en: 'Inferolateral STEMI', zh: '下侧壁 STEMI', wall: 'inferior', walls: ['inferior', 'lateral'], st: { II: 2, III: 2.5, aVF: 2.2, V5: 1.8, V6: 2, aVL: -1.2, V1: -1, V2: -1.2 } },
  posterior: { en: 'Posterior MI (STEMI equivalent)', zh: '后壁心梗（STEMI 等同）', wall: 'posterior', st: { V1: -2, V2: -2.5, V3: -2 }, tallR: ['V1', 'V2'] },
  pericarditis: { en: 'Pericarditis (STEMI mimic)', zh: '心包炎（STEMI 拟似）', mimic: true, st: { I: 1, II: 1.2, III: 0.8, aVL: 0.8, aVF: 1, V2: 1, V3: 1.3, V4: 1.4, V5: 1.3, V6: 1.1, aVR: -0.8 }, prDep: true },
  lbbb: { en: 'Left bundle branch block (new LBBB + chest pain = STEMI equivalent)', zh: '左束支阻滞（新发 + 胸痛 = STEMI 等同）', mimic: true, wide: true, st: { V1: 2, V2: 2.5, V3: 1.5, V5: -1, V6: -1.2, I: -0.8, aVL: -0.8 } },
};
export function make12(kind = 'normal', seed = 1, sec = 2.5) {
  const pat = PATTERNS[kind], r = rng(seed), rate = r.int(64, 88), pr = r.between(0.14, 0.18), n = Math.round(sec * FS);
  const starts = []; for (let t = -0.3 + r() * 0.3; t < sec + 0.5; t += 60 / rate) starts.push(t);
  const leads = LEADS.map(L => {
    const [pA, qA, rA, sA, tA] = PROFILE[L], st = (pat.st[L] || 0) / 10, tall = pat.tallR && pat.tallR.includes(L);
    const beats = starts.map(t0 => beat({ t0, pr, pAmp: pA, q: qA, r: tall ? rA + 1.0 : rA, s: tall ? sA * 0.5 : sA, tAmp: Math.abs(tA) * (st > 0.1 ? 1.6 : 1), tInv: tA < 0 || (st < -0.05 && !tall) || (pat.wide && L.match(/V5|V6|I$|aVL/) != null), st,
      wide: !!pat.wide && false, notch: !!pat.wide, qrsW: pat.wide ? 0.14 : 0.09 }));
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / FS; let v = 0; for (const b of beats) { const d = t - b.t0; if (d > -0.5 && d < 0.75) v += beatWave(d, b) + (pat.prDep && b.p && d > -b.pr && d < 0 ? -0.08 : 0); } samples[i] = v; }
    return { id: L, samples, st: pat.st[L] || 0, beats, peaks: beats.map(rPeakT), sec, fs: FS, spec: { rate } };
  });
  return { kind, pat, rate, leads };
}
export const LAYOUT = [['I', 'aVR', 'V1', 'V4'], ['II', 'aVL', 'V2', 'V5'], ['III', 'aVF', 'V3', 'V6']];
export function wallOf(L) { return Object.keys(WALLS).find(w => WALLS[w].leads.includes(L)) || ''; }
