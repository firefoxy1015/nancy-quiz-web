// Numbers room, Weekend 5 (cardiac arrest and the crashing heart): the question makers.
// The room itself (rounds, retries, misses that come back) is numlab.js; this file only makes the questions.
// Numbers follow EMALB (the exam): nitroglycerin p.73, CPR/AED p.40–45, hypothermia p.29, heat p.36, epinephrine p.66,
// ASA p.60. Where the exam is silent the BCEHS guideline is named in the question (N03 after ROSC, I01 warmed saline,
// R03 life extinct). Shock index and the stop clock come from the Weekend 5 lessons and the exam's CPR/AED page.

const rnd = n => Math.floor(Math.random() * n);
const pick = xs => xs[rnd(xs.length)];

export const TAG = {
  nitro: ['Nitro: give or not', '硝酸甘油：给不给'], stop: ['When may you stop?', '什么时候可以停？'], shock: ['Shock index', '休克指数'],
  epi: ['Child epinephrine', '儿童肾上腺素'], hypo: ['Cold patient', '失温病人'], fluid: ['Fluid volume', '补液量'], recall: ['One number', '一个数字'],
};
const NITRO_YN = [['Give nitro', '给硝酸甘油'], ['No nitro', '不给硝酸甘油']];
const WARM_YN = [['Actively rewarm', '主动复温'], ['Do not actively rewarm', '不主动复温']];

// nitroglycerin gates (EMALB p.73): SBP < 110, HR < 50 or > 150, Viagra/Levitra in 24 h, Cialis in 48 h. Values never sit on a boundary.
function mkNitro() {
  const fail = pick(['none', 'none', 'sbp', 'hr', 'pde']);
  const sbp = fail === 'sbp' ? pick([94, 100, 104, 108]) : pick([114, 122, 134, 148, 162]);
  const hr = fail === 'hr' ? pick([42, 46, 156, 164]) : pick([56, 68, 84, 96, 118, 136]);
  let drug = null;
  if (fail === 'pde') drug = pick([['Viagra (sildenafil)', 'Viagra（西地那非 sildenafil）', pick([5, 14, 20]), 24], ['Levitra (vardenafil)', 'Levitra（伐地那非 vardenafil）', pick([8, 16, 22]), 24], ['Cialis (tadalafil)', 'Cialis（他达拉非 tadalafil）', pick([12, 30, 40]), 48]]);
  else if (Math.random() < 0.4) drug = pick([['Viagra (sildenafil)', 'Viagra（西地那非 sildenafil）', pick([30, 40, 60]), 24], ['Cialis (tadalafil)', 'Cialis（他达拉非 tadalafil）', pick([56, 72, 96]), 48]]);
  const pdeOk = !drug || drug[2] > drug[3];
  const G = [
    [sbp > 110, `Systolic ${sbp}: must be above 110`, `收缩压 ${sbp}：必须高于 110`],
    [hr >= 50 && hr <= 150, `Heart rate ${hr}: must be 50–150`, `心率 ${hr}：必须在 50–150 之间`],
    [pdeOk, drug ? `${drug[0]} ${drug[2]} h ago: the window is ${drug[3]} h` : 'No erectile-dysfunction drug', drug ? `${drug[1]} ${drug[2]} 小时前：窗口是 ${drug[3]} 小时` : '没有用过壮阳药'],
  ];
  const yes = G.every(g => g[0]);
  return { type: 'nitro', key: 'nitro' + (yes ? '' : '-' + fail), yes, yn: NITRO_YN, gates: G,
    scene: [`64-year-old, crushing chest pain for 25 minutes. BP ${sbp}/${Math.round(sbp * 0.6)}, heart rate ${hr}. ${drug ? `He took ${drug[0]} ${drug[2]} hours ago.` : 'He takes no erectile-dysfunction drugs.'} ASA already chewed.`,
      `64 岁，压榨样胸痛 25 分钟。血压 ${sbp}/${Math.round(sbp * 0.6)}，心率 ${hr}。${drug ? `${drug[2]} 小时前吃过 ${drug[1]}。` : '没有用过壮阳药。'}阿司匹林 (ASA) 已经嚼服。`],
    q: ['EMALB: do you give nitroglycerin 0.4 mg SL now?', '按 EMALB：现在给硝酸甘油 (nitroglycerin) 0.4 mg 舌下吗？'],
    why: yes ? ['Every gate passes: systolic above 110, heart rate 50–150, no Viagra or Levitra in 24 h, no Cialis in 48 h. Give 0.4 mg SL and start moving to hospital after the first dose.', '每道门槛都过了：收缩压高于 110，心率 50–150，24 小时内没有 Viagra 或 Levitra，48 小时内没有 Cialis。给 0.4 mg 舌下，第一次给药后就开始转运。']
      : ['One failed gate is enough to withhold it. EMALB: systolic below 110, heart rate below 50 or above 150, Viagra or Levitra in the past 24 h, or Cialis in the last 48 h.', '只要有一道门槛不过就不能给。EMALB：收缩压低于 110、心率低于 50 或高于 150、24 小时内用过 Viagra 或 Levitra、48 小时内用过 Cialis。'] };
}

// EMALB p.40: 30 min with no ROSC and no defibrillation; 40 min if ROSC at any time or any defibrillation.
function mkStop() {
  const k = rnd(3), m = 3 + rnd(8);
  const S = [
    [`Unwitnessed adult arrest. Asystole on every analysis, never a shock, never a pulse.`, `无人目击的成人骤停。每次分析都是心搏停止，从来没电击过，也从来没有脉搏。`, 30, ['No ROSC and no defibrillation at any time: the 30-minute clock.', '从头到尾没有 ROSC、没有除颤：走 30 分钟这只钟。']],
    [`Witnessed adult arrest. The AED shocked once at minute ${m}; every analysis since says no shock, never a pulse.`, `有人目击的成人骤停。AED 在第 ${m} 分钟电击过一次，之后每次都不建议电击，一直没有脉搏。`, 40, ['One defibrillation at any point moves the patient to the 40-minute clock.', '只要除颤过一次，就走 40 分钟这只钟。']],
    [`Adult arrest, never shocked. At minute ${m} there was a pulse for about a minute, then he arrested again.`, `成人骤停，从没电击过。第 ${m} 分钟摸到过大约一分钟的脉搏，然后又停了。`, 40, ['ROSC at any time, however short, moves the patient to the 40-minute clock.', '任何时候出现过 ROSC，哪怕很短，都走 40 分钟这只钟。']],
  ][k];
  return { type: 'stop', key: 'stop' + k, unit: 'min', unitZh: '分钟', answer: S[2], tol: 0,
    scene: [S[0] + ' No advanced crew is coming.', S[1] + '没有更高级别的人员会来。'],
    q: ['EMALB: after how many minutes in total may you stop?', '按 EMALB：总共做满多少分钟才可以停？'],
    hint: ['Two clocks: 30 and 40. What happened during this arrest?', '两只钟：30 和 40。这次骤停中发生过什么？'],
    why: [S[3][0] + ' On a BCEHS call R02 Resuscitation Decision Making uses the first rhythm instead, and every stop needs CliniCall.', S[3][1] + '在 BCEHS 出车时，R02 Resuscitation Decision Making（复苏决策）改按首个心律来分，而且每次停止都要打 CliniCall。'] };
}

function mkShock() {
  const hr = 70 + 2 * rnd(36), sbp = 80 + 2 * rnd(36), si = Math.round(hr / sbp * 100) / 100;
  return { type: 'shock', key: 'shock', unit: '', answer: si, tol: 0.03, show: si.toFixed(2),
    scene: [`Heart rate ${hr}, systolic pressure ${sbp}.`, `心率 ${hr}，收缩压 ${sbp}。`],
    q: ['What is the shock index? (2 decimal places)', '休克指数是多少？（保留 2 位小数）'],
    hint: ['Heart rate divided by systolic pressure.', '心率除以收缩压。'],
    why: [`${hr} ÷ ${sbp} = ${si.toFixed(2)}. ${si > 0.9 ? 'Above 0.9 is abnormal: think shock, even if the pressure still looks acceptable.' : 'Not above 0.9, but a beta blocker or a slow heart can hide shock: believe the skin and the mind.'}`,
      `${hr} ÷ ${sbp} = ${si.toFixed(2)}。${si > 0.9 ? '高于 0.9 就是异常：要想到休克，即使血压看起来还可以。' : '没超过 0.9，但 β 受体阻滞剂或心率慢会掩盖休克：要相信皮肤和意识。'}`] };
}

// EMALB p.66: 0.01 mg/kg IM to a maximum of 0.5 mg.
function mkEpi() {
  const w = Math.random() < 0.2 ? 52 + rnd(20) : 8 + rnd(38), dose = Math.min(0.5, Math.round(w) / 100);
  return { type: 'epi', key: 'epi', unit: 'mg', unitZh: '毫克', answer: dose, tol: 0.005,
    scene: [`A child of ${w} kg has anaphylaxis and epinephrine is indicated.`, `一个 ${w} kg 的孩子过敏性休克，需要给肾上腺素 (epinephrine)。`],
    q: ['EMALB: how many mg of epinephrine IM?', '按 EMALB：肌注多少毫克肾上腺素 (epinephrine)？'],
    hint: ['0.01 mg per kg, and there is a ceiling.', '每公斤 0.01 mg，而且有上限。'],
    why: [w * 0.01 > 0.5 ? `0.01 × ${w} = ${(w / 100).toFixed(2)} mg, over the 0.5 mg maximum: give 0.5 mg.` : `0.01 × ${w} = ${dose.toFixed(2)} mg, under the 0.5 mg maximum. May repeat up to 3 times.`,
      w * 0.01 > 0.5 ? `0.01 × ${w} = ${(w / 100).toFixed(2)} mg，超过 0.5 mg 上限：给 0.5 mg。` : `0.01 × ${w} = ${dose.toFixed(2)} mg，没超过 0.5 mg 上限。最多可重复 3 次。`] };
}

// EMALB p.29: moderate (>28 to <32 °C) actively rewarm; severe (<28 °C) do not actively rewarm.
function mkHypo() {
  const sev = Math.random() < 0.5, temp = sev ? pick([24.5, 25, 26, 27, 27.5]) : pick([28.5, 29, 30, 31, 31.5]);
  return { type: 'hypo', key: 'hypo' + (sev ? 'S' : 'M'), yes: !sev, yn: WARM_YN,
    gates: [[!sev, `${temp} °C: ${sev ? 'severe (below 28 °C)' : 'moderate (above 28, below 32 °C)'}`, `${temp} °C：${sev ? '严重（低于 28 °C）' : '中度（高于 28、低于 32 °C）'}`]],
    scene: [`Found outdoors overnight. Core temperature ${temp} °C. He has a pulse.`, `在户外过了一夜。核心体温 ${temp} °C，有脉搏。`],
    q: ['EMALB: do you actively rewarm him (hot packs, warm blankets)?', '按 EMALB：要主动复温吗（热敷袋、暖毯）？'],
    why: sev ? ['Severe hypothermia: do not actively rewarm. Insulate, heat the ambulance to 30 °C, avoid rough handling; the cold heart fibrillates easily.', '严重失温：不主动复温。保温隔离、救护车加热到 30 °C、避免粗暴搬动；冰冷的心脏很容易室颤。']
      : ['Moderate hypothermia: actively rewarm. Hot packs wrapped in towels, warm blankets, the ambulance preheated to 30 °C.', '中度失温：主动复温。用毛巾包着的热敷袋、暖毯，救护车预热到 30 °C。'] };
}

// BCEHS N03: bolus limited to 20 mL/kg after ROSC. BCEHS I01: warmed saline 30 mL/kg, maximum 2 L.
function mkFluid() {
  if (Math.random() < 0.5) {
    const w = 50 + 5 * rnd(10);
    return { type: 'fluid', key: 'fluidRosc', unit: 'mL', unitZh: '毫升', answer: 20 * w, tol: 0,
      scene: [`After ROSC. ${w} kg, hypotensive, no sign of blood loss or dehydration.`, `ROSC 之后。${w} kg，低血压，没有失血或脱水的迹象。`],
      q: ['BCEHS N03: the most you give as a bolus, in mL?', '按 BCEHS N03：液体冲击最多给多少毫升？'],
      hint: ['A limit in mL per kg.', '按每公斤多少毫升来限。'],
      why: [`N03 Return of Spontaneous Circulation limits a bolus to 20 mL/kg unless you suspect hypovolemia: ${w} × 20 = ${(20 * w).toLocaleString('en-US')} mL, room-temperature saline.`, `N03（自主循环恢复）规定，除非怀疑低血容量，冲击最多 20 mL/kg：${w} × 20 = ${(20 * w).toLocaleString('en-US')} 毫升，用常温生理盐水。`] };
  }
  const w = 40 + 5 * rnd(13), ans = Math.min(2000, 30 * w);
  return { type: 'fluid', key: 'fluidCold', unit: 'mL', unitZh: '毫升', answer: ans, tol: 0,
    scene: [`Hypothermic and hypotensive. Weight ${w} kg.`, `失温，低血压。体重 ${w} kg。`],
    q: ['BCEHS I01: how much warmed saline at most, in mL?', '按 BCEHS I01：加温生理盐水最多给多少毫升？'],
    hint: ['So many mL per kg, and a ceiling in litres.', '每公斤多少毫升，还有一个以升计的上限。'],
    why: [30 * w > 2000 ? `30 × ${w} = ${(30 * w).toLocaleString('en-US')} mL, over the 2 L maximum: give 2,000 mL (37–42 °C).` : `30 × ${w} = ${ans.toLocaleString('en-US')} mL, under the 2 L maximum. Warmed to 37–42 °C.`,
      30 * w > 2000 ? `30 × ${w} = ${(30 * w).toLocaleString('en-US')} 毫升，超过 2 升上限：给 2,000 毫升（37–42 °C）。` : `30 × ${w} = ${ans.toLocaleString('en-US')} 毫升，没超过 2 升上限。加温到 37–42 °C。`] };
}

export const RECALL = [
  { k: 'depth', unit: 'cm', lo: 5, hi: 6, show: '5.0–6.0', q: ['EMALB: adult compression depth, in cm?', 'EMALB：成人按压深度是多少厘米？'], why: ['5.0 to 6.0 cm in a normal adult. BCEHS PR06 calls 5 cm optimal.', '普通成人 5.0–6.0 厘米。BCEHS PR06 说 5 厘米最佳。'] },
  { k: 'rate', unit: '/min', unitZh: '次/分', lo: 100, hi: 120, show: '100–120', q: ['Compression rate, per minute?', '按压速率每分钟多少次？'], why: ['100 to 120 per minute, adult or child.', '每分钟 100–120 次，成人儿童都一样。'] },
  { k: 'pause', unit: 's', unitZh: '秒', answer: 5, q: ['EMALB: keep each interruption in CPR under how many seconds?', 'EMALB：每次 CPR 中断要少于多少秒？'], why: ['Less than 5 seconds on the exam; BCEHS PR06 and the AHA module allow 10 seconds or less.', '考试要求少于 5 秒；BCEHS PR06 和 AHA 模块允许 10 秒以内。'] },
  { k: 'swap', unit: 'min', unitZh: '分钟', answer: 2, q: ['Change the compressor every how many minutes?', '每隔几分钟换一次按压的人？'], why: ['Every 2 minutes, during the analysis.', '每 2 分钟，趁分析时换。'] },
  { k: 'asa', unit: 'mg', unitZh: '毫克', answer: 160, q: ['EMALB: the ASA dose for cardiac chest pain, in mg?', 'EMALB：心源性胸痛的阿司匹林 (ASA) 剂量是多少毫克？'], why: ['160 mg PO, chewed and swallowed. BCEHS C01 aims for a total of at least 162 mg.', '160 mg 口服，嚼碎吞下。BCEHS C01 要求总量至少 162 mg。'] },
  { k: 'ntgDose', unit: 'mg', unitZh: '毫克', answer: 0.4, q: ['One nitroglycerin dose SL, in mg?', '硝酸甘油 (nitroglycerin) 舌下一次多少毫克？'], why: ['0.4 mg SL every 3–5 minutes, while the systolic stays above 110.', '0.4 mg 舌下，每 3–5 分钟一次，收缩压保持在 110 以上。'] },
  { k: 'ntgMax', unit: 'doses', unitZh: '次', answer: 3, q: ['Maximum nitroglycerin doses in any 30-minute period?', '任意 30 分钟内硝酸甘油 (nitroglycerin) 最多几次？'], why: ['3, not counting what the patient took before you arrived.', '3 次，不算病人在你到之前自己用的。'] },
  { k: 'entonox', unit: 'min', unitZh: '分钟', answer: 5, q: ['Start Entonox how many minutes after the last nitroglycerin?', '最后一次硝酸甘油 (nitroglycerin) 后几分钟开始用笑气 (Entonox)？'], why: ['5 minutes after the last dose.', '最后一次给药后 5 分钟。'] },
  { k: 'cool', unit: 'min', unitZh: '分钟', answer: 10, q: ['Heat stroke: cool on scene for at least how many minutes before you leave?', '中暑：出发前至少在现场降温多少分钟？'], why: ['At least 10 minutes before beginning conveyance.', '开始转运前至少 10 分钟。'] },
  { k: 'truck', unit: '°C', answer: 30, q: ['Hypothermia: heat the ambulance to how many °C?', '失温：救护车加热到多少摄氏度？'], why: ['30 °C.', '30 °C。'] },
  { k: 'cold', unit: 's', unitZh: '秒', lo: 30, hi: 45, show: '30–45', q: ['Severe hypothermia: take up to how many seconds to decide there is no pulse?', '严重失温：判断无脉搏最多可以花多少秒？'], why: ['Up to 30–45 seconds; a cold heart can be very slow.', '最多 30–45 秒；冰冷的心脏可能跳得很慢。'] },
  { k: 'kid60', unit: '/min', unitZh: '次/分', answer: 60, q: ['Child with poor perfusion: start CPR below what heart rate?', '灌注差的孩子：心率低于多少要开始 CPR？'], why: ['Below 60 with inadequate perfusion.', '低于 60，而且灌注不足。'] },
  { k: 'pads', unit: 'cm', answer: 2.5, q: ['Pads closer together than how many cm: move to front and back?', '两片电极片相距不到几厘米时，改成前后贴？'], why: ['Within 2.5 cm (one inch) of each other.', '相距 2.5 厘米（1 英寸）以内。'] },
  { k: 'role', unit: 's', unitZh: '秒', answer: 90, q: ['BCEHS R03: each life-extinct check lasts how many seconds?', 'BCEHS R03：确认生命消失时每项检查多少秒？'], why: ['90 seconds each: heart sounds, breathing, carotid. Never in environmental hypothermia.', '每项 90 秒：心音、呼吸、颈动脉。环境性失温不能用。'] },
  { k: 'suction', unit: 's', unitZh: '秒', lo: 10, hi: 15, show: '10–15', q: ['EMALB: adult suction, up to how many seconds per pass?', 'EMALB：成人每次吸引最多多少秒？'], why: ['10–15 seconds adult, 10 child, 5 infant.', '成人 10–15 秒，儿童 10 秒，婴儿 5 秒。'] },
  { k: 'roscO2', unit: '%', lo: 92, hi: 98, show: '92–98', q: ['BCEHS N03: SpO₂ target after ROSC, in %?', 'BCEHS N03：ROSC 后 SpO₂ 目标是百分之多少？'], why: ['92–98%, with EtCO₂ 30–40 mmHg.', '92–98%，EtCO₂ 30–40 mmHg。'] },
  { k: 'twelve', unit: 'min', unitZh: '分钟', answer: 10, q: ['BCEHS N03: wait about how many minutes after ROSC before the 12-lead?', 'BCEHS N03：ROSC 后大约等几分钟再做 12 导联？'], why: ['About 10 minutes of perfusion first.', '先灌注大约 10 分钟。'] },
];
function mkRecall(miss) {
  const pool = RECALL.flatMap(r => Array(1 + 3 * Math.min(2, (miss || {})['r-' + r.k] || 0)).fill(r)), r = pick(pool);
  return { type: 'recall', key: 'r-' + r.k, unit: r.unit, unitZh: r.unitZh, answer: r.answer, lo: r.lo, hi: r.hi, show: r.show, tol: 0, q: r.q,
    hint: ['Not that one. One more try, then I will show you.', '不是这个。再试一次，再错我就告诉你。'], why: r.why };
}

export const MAKE = { nitro: mkNitro, stop: mkStop, shock: mkShock, epi: mkEpi, hypo: mkHypo, fluid: mkFluid, recall: mkRecall };
export const SLOT_OF = key => key.startsWith('r-') ? 'recall' : key.startsWith('nitro') ? 'nitro' : key.startsWith('stop') ? 'stop' : key.startsWith('hypo') ? 'hypo' : key.startsWith('fluid') ? 'fluid' : key;
export const SLOTS = ['nitro', 'nitro', 'stop', 'shock', 'epi', 'hypo', 'fluid', 'recall'];
