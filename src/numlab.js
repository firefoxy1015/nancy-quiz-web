// Numbers room (one per weekend; Weekend 4's makers live here, Weekend 5's in numlab5.js): five minutes of typed answers, no options to recognise.
// Traction weight from body weight, the fluid bolus, TXA go / no-go from the clock and the age, a GCS from three
// descriptions, a burn area from a shaded figure, and one bare number to recall. New numbers every round; a miss
// brings the same kind of question back at the end of the round and first in the next one.
// Numbers follow EMALB (the exam): traction p.23, hypovolemia p.54, TXA p.78, TBI p.27, burns p.28; where EMALB is
// silent the BCEHS procedure is named in the question (PR03 tourniquet, PR04 wound packing, PR02 pelvic binder).
import { t, esc } from './app.js?v=73';

const rnd = n => Math.floor(Math.random() * n);
const pick = xs => xs[rnd(xs.length)];
const shuffle = xs => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const both = () => t('a', 'b') === 'a b';
// one bilingual line: English with the Chinese stacked under it in both-mode, otherwise the one language
const L2 = (en, zh) => both() ? `<span>${esc(en)}</span><span class="nl-zh">${esc(zh)}</span>` : esc(t(en, zh));
const fmtN = v => Number.isInteger(v) ? v.toLocaleString('en-US') : String(v);
const clock = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// what she typed -> the numbers in it ("1,400 mL" -> [1400]; "5-8" -> [5, 8]; "4,5" -> [4.5])
export function parseNums(raw) {
  const out = []; let cur = '';
  for (const ch of String(raw == null ? '' : raw) + ' ') {
    if ((ch >= '0' && ch <= '9') || ch === '.' || ch === ',') cur += ch;
    else if (cur) { out.push(cur); cur = ''; }
  }
  return out.map(x => {
    const p = x.split(',');
    if (p.length > 1 && p.slice(1).every(s => s.length === 3 && !s.includes('.'))) return parseFloat(p.join(''));
    return parseFloat(x.replace(',', '.'));
  }).filter(n => !isNaN(n));
}
// right when the first number is within tolerance, or (for a range answer) when every number typed sits inside the range
export function isRight(q, raw) {
  const ns = parseNums(raw); if (!ns.length) return false;
  if (q.lo != null) return ns.every(n => n >= q.lo - 1e-9 && n <= q.hi + 1e-9);
  return Math.abs(ns[0] - q.answer) <= (q.tol || 0) + 1e-9;
}

/* ---------------- question makers: each returns { type, key, scene, q, unit, answer | lo/hi | yes, hint, why } ---------------- */
const TAG = {
  trac: ['Traction splint', '牵引夹板'], bolus: ['Fluid bolus', '补液'], txa: ['TXA: give or not', 'TXA：给不给'],
  gcs: ['GCS', 'GCS 评分'], burn: ['Burn area', '烧伤面积'], recall: ['One number', '一个数字'],
};
const NOTE0 = ['If traction is not indicated, type 0.', '如果不该上牵引，就填 0。'];

function mkTrac() {
  const kg = Math.random() < 0.2;
  const w = kg ? 40 + 5 * rnd(15) : (Math.random() < 0.5 ? 90 + 10 * rnd(7) : 160 + 10 * rnd(11));
  const cap = kg ? 7 : 15, u = kg ? 'kg' : 'lb', raw = Math.round(w * 10) / 100, ans = Math.min(cap, raw);
  return { type: 'trac', key: 'trac', unit: u, answer: ans, tol: kg ? 0.3 : 0.5, note: NOTE0,
    scene: [`Stable patient. Closed fracture of the middle of the femur. Body weight ${w} ${u}.`, `病人稳定。股骨干中段闭合骨折。体重 ${w} ${u}。`],
    q: [`How much traction do you pull, in ${u}?`, `牵引拉多少 ${u}？`],
    hint: ['Ten percent of body weight, and there is a cap.', '体重的 10%，而且有上限。'],
    why: raw > cap ? [`10% of ${w} ${u} is ${raw} ${u}, over the cap. Closed mid-shaft femur: 10% of body weight to a maximum of 15 lb (7 kg). Pull ${cap} ${u}, and never release it.`, `${w} ${u} 的 10% 是 ${raw} ${u}，超过上限。闭合股骨干中段骨折：体重的 10%，最多 15 lb（7 kg）。拉 ${cap} ${u}，拉上就不松。`]
      : [`10% of ${w} ${u} = ${ans} ${u}, ${raw === cap ? 'right at' : 'under'} the cap of ${cap} ${u}. Once it is on, never release it.`, `${w} ${u} 的 10% = ${ans} ${u}，${raw === cap ? '正好是' : '没到'}上限 ${cap} ${u}。拉上就不松。`] };
}
function mkTracX() {
  const w = 110 + 10 * rnd(14), k = rnd(4);
  if (k === 0) return { type: 'trac', key: 'tracOpen', unit: 'lb', answer: 5, tol: 0.2, note: NOTE0,
    scene: [`Stable patient. Open fracture of the middle of the femur: the bone end shows in the wound, bleeding controlled. Body weight ${w} lb.`, `病人稳定。股骨干中段开放骨折：伤口里看得到骨端，出血已控制。体重 ${w} lb。`],
    q: ['EMALB: how much traction, in lb?', '按 EMALB：牵引拉多少 lb？'],
    hint: ['An open fracture has its own maximum, and body weight does not change it.', '开放骨折有自己的上限，和体重无关。'],
    why: ['Open mid-shaft femur fracture: a maximum of 5 lb, whatever the weight. (Closed: 10% of body weight to 15 lb.)', '开放股骨干中段骨折：最多 5 lb，和体重无关。（闭合：体重的 10%，最多 15 lb。）'] };
  const NO = [
    [`Mid-shaft femur fracture, closed. Skin cool, pale and wet, radial pulse gone, BP 84/50. Body weight ${w} lb.`, `股骨干中段闭合骨折。皮肤凉、白、湿，桡动脉摸不到，血压 84/50。体重 ${w} lb。`,
      'Traction is for a stable patient. This one is in shock: leg-to-leg splint, clamshell, go.', '牵引只给稳定的病人。这个病人在休克：两腿绑在一起、铲式担架、走。'],
    [`Stable patient, fell from a roof. Thigh deformed mid-shaft, and the pelvis hurts when you examine it once, gently. Body weight ${w} lb.`, `病人稳定，从屋顶坠落。大腿中段畸形，轻轻查一次骨盆有痛。体重 ${w} lb。`,
      'A suspected pelvis or hip fracture is a contraindication (BCEHS PR50, Sager traction splint): the splint pushes against the pelvis. Binder, leg-to-leg, clamshell.', '疑骨盆或髋部骨折是禁忌（BCEHS PR50，Sager 牵引夹板）：夹板顶在骨盆上。上骨盆带、两腿绑在一起、铲式担架。'],
    [`Stable patient. The deformity is just above the knee, and the knee is swollen. Body weight ${w} lb.`, `病人稳定。畸形在膝盖正上方，膝关节肿。体重 ${w} lb。`,
      'Traction is for the middle of the shaft. A fracture at the knee or the lower end of the femur is a contraindication (BCEHS PR50, Sager traction splint).', '牵引只用于股骨干中段。膝部或股骨远端骨折是禁忌（BCEHS PR50，Sager 牵引夹板）。'],
  ][k - 1];
  return { type: 'trac', key: 'tracNo', unit: 'lb', answer: 0, tol: 0, note: NOTE0, scene: [NO[0], NO[1]],
    q: ['How much traction, in lb?', '牵引拉多少 lb？'], hint: ['Read the scene again: is this the patient traction is for?', '再读一遍现场：牵引是给这种病人的吗？'], why: [NO[2], NO[3]] };
}
function mkBolus() {
  const lb = Math.random() < 0.4, kg = lb ? 50 + 10 * rnd(7) : 45 + 5 * rnd(16), w = lb ? Math.round(kg * 2.2) : kg;
  const raw = kg * 20, ans = Math.min(2000, raw);
  return { type: 'bolus', key: 'bolus', unit: 'mL', answer: ans, tol: 50,
    scene: [`Hypovolemia protocol: bleeding trauma, BP 82/50, skin cool, pale and wet. IV in. Body weight ${w} ${lb ? 'lb' : 'kg'}.`, `低血容量规程：创伤出血，血压 82/50，皮肤凉、白、湿。静脉已开。体重 ${w} ${lb ? 'lb' : 'kg'}。`],
    q: ['How many mL is the whole bolus?', '整个补液量是多少 mL？'],
    hint: [lb ? 'Pounds to kilograms first (divide by 2.2), then 20 mL per kg, and there is a maximum.' : '20 mL per kg, and there is a maximum.', lb ? '先把磅换成公斤（除以 2.2），再按每公斤 20 mL，而且有上限。' : '每公斤 20 mL，而且有上限。'],
    why: [`${lb ? `${w} lb ÷ 2.2 = ${kg} kg. ` : ''}${kg} kg × 20 mL = ${fmtN(raw)} mL${raw > 2000 ? ', over the maximum: give 2,000 mL' : ''}. Reassess every 500 mL.`,
      `${lb ? `${w} lb ÷ 2.2 = ${kg} kg。` : ''}${kg} kg × 20 mL = ${fmtN(raw)} mL${raw > 2000 ? '，超过上限：给 2,000 mL' : ''}。每 500 mL 复评一次。`] };
}
function mkTxa() {
  const fail = Math.random() < 0.5 ? null : pick(['time', 'age', 'head', 'allergy']);
  const mins = fail === 'time' ? 195 + 5 * rnd(22) : pick([20, 35, 45, 60, 75, 90, 110, 130, 150, 165]);
  const age = fail === 'age' ? 6 + rnd(6) : (Math.random() < 0.25 ? 12 + rnd(4) : 18 + rnd(60));
  const t0 = 6 * 60 + 5 * rnd(144), t1 = t0 + mins;
  const mech = fail === 'head'
    ? ['Fell from a ladder. Only injury found: the head, GCS 10. No bleeding outside; chest, belly, pelvis and long bones clear.', '从梯子上摔下。只发现头部受伤，GCS 10。体表无出血；胸、腹、骨盆、长骨都没问题。']
    : pick([['Crushed thigh, tourniquet on. After the fluids: BP 84/52, pulse 128, skin cool and wet.', '大腿被压伤，止血带已上。补液后：血压 84/52，脉搏 128，皮肤凉湿。'],
      ['Stab wound to the belly. After the fluids: BP 80/48, pulse 132, skin pale and wet.', '腹部刺伤。补液后：血压 80/48，脉搏 132，皮肤苍白潮湿。'],
      ['Car into a pole, unstable pelvis, binder on. After the fluids: BP 86/50, pulse 124.', '车撞电线杆，骨盆不稳，骨盆带已上。补液后：血压 86/50，脉搏 124。']]);
  const al = fail === 'allergy' ? [' Medical bracelet: allergy to tranexamic acid.', ' 医疗手环：对氨甲环酸（tranexamic acid）过敏。'] : ['', ''];
  const h = Math.floor(mins / 60), m = mins % 60, dur = [`${h ? h + ' h ' : ''}${m} min`, `${h ? h + ' 小时 ' : ''}${m} 分钟`];
  const G = [
    [mins <= 180, `Time since injury: ${dur[0]} (must be 3 hours or less)`, `受伤到现在：${dur[1]}（必须 3 小时以内）`],
    [age >= 12, `Age ${age} (must be 12 or older)`, `年龄 ${age} 岁（必须满 12 岁）`],
    [fail !== 'head', fail === 'head' ? 'Isolated head injury: contraindicated' : 'Not an isolated head injury', fail === 'head' ? '孤立性颅脑损伤：禁用' : '不是孤立性颅脑损伤'],
    [fail !== 'allergy', fail === 'allergy' ? 'Allergy to TXA: contraindicated' : 'No allergy to TXA', fail === 'allergy' ? '对 TXA 过敏：禁用' : '对 TXA 不过敏'],
  ];
  return { type: 'txa', key: 'txa' + (fail ? '-' + fail : ''), yes: !fail, gates: G,
    scene: [`${mech[0]} Injured at ${clock(t0)}. It is now ${clock(t1)}. Age ${age}.${al[0]}`, `${mech[1]} 受伤时间 ${clock(t0)}，现在 ${clock(t1)}。年龄 ${age} 岁。${al[1]}`],
    q: ['TXA (tranexamic acid) under the EMALB hypovolemia protocol?', '按 EMALB 低血容量规程，给不给氨甲环酸（TXA, tranexamic acid）？'],
    why: fail ? ['One gate is closed, so no TXA. Keep going with bleeding control, warmth and transport.', '有一道关没过，所以不给 TXA。继续止血、保暖、转运。'] : ['All four gates open: 2 g IV push over 1 minute.', '四道关都过：2 g 静脉推注，1 分钟推完。'] };
}
const GCS = {
  E: [['Eyes stay shut, even to a trapezius pinch', '眼睛一直闭着，捏斜方肌也不睁'], ['Eyes open only to a trapezius pinch', '捏斜方肌才睁眼'], ['Eyes open when you speak to them', '叫他才睁眼'], ['Eyes open on their own', '自己睁着眼']],
  V: [['No sound at all', '完全不出声'], ['Only moans, no words', '只有呻吟，没有字'], ['Single words that do not fit the question', '只蹦出单个的词，答非所问'], ['Speaks in sentences but thinks it is 1995', '能说整句，但以为现在是 1995 年'], ['Gets name, place and month right', '姓名、地点、月份都答对']],
  M: [['No movement to a trapezius pinch', '捏斜方肌没有任何动作'], ['Arms straighten stiff, palms turned outward', '双臂僵直伸开，手掌向外翻'], ['Arms bend tight to the chest, wrists curled', '双臂紧屈在胸前，手腕内勾'], ['Pulls the arm away from a nail-bed press', '压甲床时把手缩回去'], ['Reaches up and pushes your hand off the pinch', '伸手过来把你捏他的手推开'], ['Squeezes and lets go when you ask', '叫他握手、松手都照做']],
};
function mkGcs() {
  const lv = Math.random(), j = max => Math.max(1, Math.min(max, 1 + Math.round(lv * (max - 1) + (Math.random() - 0.5) * 1.6)));
  const e = j(4), v = j(5), m = j(6), tot = e + v + m;
  const band = tot >= 13 ? ['mild (13 to 15)', '轻度（13–15）'] : tot >= 9 ? ['moderate (9 to 12)', '中度（9–12）'] : ['severe (8 or less)', '重度（8 及以下）'];
  return { type: 'gcs', key: 'gcs', unit: '', answer: tot, tol: 0,
    list: [GCS.E[e - 1], GCS.V[v - 1], GCS.M[m - 1]],
    q: ['Type the GCS total.', '填 GCS 总分。'],
    hint: ['Eyes out of 4, voice out of 5, movement out of 6. Score each line, then add.', '睁眼满分 4，言语满分 5，运动满分 6。每行先打分，再相加。'],
    why: [`E${e} + V${v} + M${m} = ${tot}: ${band[0]} head injury.`, `E${e} + V${v} + M${m} = ${tot}：${band[1]}颅脑损伤。`] };
}

/* the burn figure: adult front and back, cut into Rule-of-Nines pieces */
const BURN_UNITS = [
  { p: ['hF', 'hB'], v: 9, en: 'whole head and neck', zh: '整个头颈' },
  { p: ['hF'], v: 4.5, en: 'face and front of the neck (half of the head)', zh: '面部和颈前（头的一半）' },
  { p: ['arF', 'arB'], v: 9, en: 'whole right arm', zh: '整条右臂' },
  { p: ['alF', 'alB'], v: 9, en: 'whole left arm', zh: '整条左臂' },
  { p: ['arF'], v: 4.5, en: 'front of the right arm (half an arm)', zh: '右臂前面（半条手臂）' },
  { p: ['alF'], v: 4.5, en: 'front of the left arm (half an arm)', zh: '左臂前面（半条手臂）' },
  { p: ['chest', 'abd'], v: 18, en: 'whole front of the trunk (the back is another 18)', zh: '躯干整个前面（背面另算 18）' },
  { p: ['chest'], v: 9, en: 'chest (half of the trunk\'s front 18)', zh: '胸部（躯干前面 18 的一半）' },
  { p: ['abd'], v: 9, en: 'abdomen (half of the trunk\'s front 18)', zh: '腹部（躯干前面 18 的一半）' },
  { p: ['upb', 'lowb'], v: 18, en: 'whole back of the trunk (the front is another 18)', zh: '躯干整个后面（正面另算 18）' },
  { p: ['upb'], v: 9, en: 'upper back (half of the trunk\'s back 18)', zh: '上背（躯干后面 18 的一半）' },
  { p: ['lrF', 'lrB'], v: 18, en: 'whole right leg', zh: '整条右腿' },
  { p: ['llF', 'llB'], v: 18, en: 'whole left leg', zh: '整条左腿' },
  { p: ['lrF'], v: 9, en: 'front of the right leg (half a leg)', zh: '右腿前面（半条腿）' },
  { p: ['llF'], v: 9, en: 'front of the left leg (half a leg)', zh: '左腿前面（半条腿）' },
  { p: ['llB'], v: 9, en: 'back of the left leg (half a leg)', zh: '左腿后面（半条腿）' },
  { p: ['peri'], v: 1, en: 'perineum', zh: '会阴' },
];
function burnSVG(deep, sup) {
  const cls = id => deep.includes(id) ? 'bd' : sup.includes(id) ? 'bs' : 'b0';
  // one figure; s = +1 puts the patient's right arm and leg on the viewer's left (front view), -1 mirrors it (back view)
  const fig = (cx, s, ids) => {
    const R = s > 0 ? 'r' : 'l', Lf = s > 0 ? 'l' : 'r';
    return `<g><ellipse class="${cls(ids.h)}" cx="${cx}" cy="27" rx="15" ry="18"/><rect class="${cls(ids.h)}" x="${cx - 6}" y="43" width="12" height="9"/>
      <rect class="${cls(ids.t1)}" x="${cx - 30}" y="52" width="60" height="41" rx="7"/><rect class="${cls(ids.t2)}" x="${cx - 28}" y="94" width="56" height="40" rx="4"/>
      <rect class="${cls(ids['a' + R])}" x="${cx - 49}" y="54" width="16" height="98" rx="8"/><rect class="${cls(ids['a' + Lf])}" x="${cx + 33}" y="54" width="16" height="98" rx="8"/>
      <rect class="${cls(ids['l' + R])}" x="${cx - 29}" y="136" width="27" height="112" rx="10"/><rect class="${cls(ids['l' + Lf])}" x="${cx + 2}" y="136" width="27" height="112" rx="10"/>
      ${ids.peri ? `<path class="${cls(ids.peri)}" d="M${cx - 8} 135 L${cx + 8} 135 L${cx} 150 Z"/>` : ''}</g>`;
  };
  return `<svg class="nl-burn" viewBox="0 0 340 276" role="img" aria-label="${esc(t('Adult figure, front and back, with the burned areas shaded', '成人正面和背面图，烧伤部位涂色'))}">
    ${fig(88, 1, { h: 'hF', t1: 'chest', t2: 'abd', ar: 'arF', al: 'alF', lr: 'lrF', ll: 'llF', peri: 'peri' })}
    ${fig(252, -1, { h: 'hB', t1: 'upb', t2: 'lowb', ar: 'arB', al: 'alB', lr: 'lrB', ll: 'llB' })}
    <text x="88" y="268" text-anchor="middle">${esc(t('FRONT', '正面'))}</text><text x="252" y="268" text-anchor="middle">${esc(t('BACK', '背面'))}</text>
    <text x="22" y="64" text-anchor="middle" class="sm">R</text><text x="154" y="64" text-anchor="middle" class="sm">L</text><text x="186" y="64" text-anchor="middle" class="sm">L</text><text x="318" y="64" text-anchor="middle" class="sm">R</text></svg>`;
}
function mkBurn() {
  const n = pick([1, 2, 2, 2, 3, 3]), used = new Set(), deepU = [], pool = shuffle(BURN_UNITS);
  for (const u of pool) { if (deepU.length >= n) break; if (u.p.some(x => used.has(x))) continue; deepU.push(u); u.p.forEach(x => used.add(x)); }
  let supU = null;
  if (Math.random() < 0.4) supU = pool.find(u => !u.p.some(x => used.has(x)) && u.v >= 4.5) || null;
  const tot = deepU.reduce((s, u) => s + u.v, 0);
  const sumEn = deepU.map(u => `${u.en} ${u.v}`).join(' + '), sumZh = deepU.map(u => `${u.zh} ${u.v}`).join(' + ');
  const big = tot > 20;
  return { type: 'burn', key: 'burn', unit: '%', answer: tot, tol: 0.5,
    fig: burnSVG(deepU.flatMap(u => u.p), supU ? supU.p : []),
    scene: ['Adult. Dark red = blistered or deeper.' + (supU ? ' Pale pink with a dashed edge = red only, no blisters.' : ''), '成人。深红 = 起水疱或更深。' + (supU ? '浅粉虚线 = 只是发红、没有水疱。' : '')],
    q: ['What percent of the body surface is burned?', '烧伤面积占体表百分之多少？'],
    hint: ['Rule of Nines: head 9, each arm 9, trunk 36 = front 18 + back 18, each leg 18, perineum 1. Half a part is half the number.' + (supU ? ' Skin that is only red is not counted.' : ''),
      '九分法：头 9，每条手臂 9，躯干共 36 = 前面 18 + 后面 18，每条腿 18，会阴 1。只烧了半边就算一半。' + (supU ? '只发红的皮肤不算。' : '')],
    why: [`${sumEn}${deepU.length > 1 ? ` = ${tot}%` : '%'}.${supU ? ` Not counted: ${supU.en} (red only = superficial).` : ''}${big ? ' Over 20%: an unstable patient on the EMALB list, and the hypovolemia protocol covers burns over 20% BSA.' : ''}`,
      `${sumZh}${deepU.length > 1 ? ` = ${tot}%` : '%'}。${supU ? `不算：${supU.zh}（只发红 = 浅表烧伤）。` : ''}${big ? '超过 20%：按 EMALB 属于不稳定病人，低血容量规程也包括烧伤面积超过 20% 的情况。' : ''}`] };
}
const RECALL = [
  { k: 'txaDose', unit: 'g', answer: 2, q: ['EMALB hypovolemia protocol: the TXA (tranexamic acid) dose, in grams?', 'EMALB 低血容量规程：氨甲环酸（TXA, tranexamic acid）的剂量是几克？'], why: ['2 g IV push over 1 minute.', '2 g 静脉推注，1 分钟推完。'] },
  { k: 'txaVol', unit: 'mL', answer: 20, q: ['BCEHS carries TXA (tranexamic acid) at 100 mg/mL. How many mL is the 2 g dose?', 'BCEHS 的氨甲环酸（TXA, tranexamic acid）是 100 mg/mL。2 g 是多少 mL？'], why: ['2 g = 2,000 mg. 2,000 ÷ 100 = 20 mL.', '2 g = 2,000 mg。2,000 ÷ 100 = 20 mL。'] },
  { k: 'txaPush', unit: 'min', unitZh: '分钟', answer: 1, q: ['TXA (tranexamic acid) 2 g IV push: over how many minutes?', '氨甲环酸（TXA, tranexamic acid）2 g 静脉推注：几分钟推完？'], why: ['Over 1 minute.', '1 分钟推完。'] },
  { k: 'reassess', unit: 'mL', answer: 500, q: ['During the fluid bolus you reassess after every how many mL?', '补液过程中，每输多少 mL 复评一次？'], why: ['Every 500 mL: pressure, pulse, skin, chest.', '每 500 mL 复评：血压、脉搏、皮肤、听肺。'] },
  { k: 'maxBolus', unit: 'mL', answer: 2000, q: ['Hypovolemia protocol: 20 mL/kg, up to a maximum of how many mL?', '低血容量规程：每公斤 20 mL，最多多少 mL？'], why: ['Maximum 2 L (2,000 mL).', '最多 2 L（2,000 mL）。'] },
  { k: 'pack', unit: 'min', unitZh: '分钟', answer: 3, q: ['Wound packed to the top. Very firm pressure for at least how many minutes? (BCEHS PR04, wound packing)', '伤口填塞到顶。用力压迫至少几分钟？（BCEHS PR04，伤口填塞）'], why: ['At least 3 minutes, without lifting to look.', '至少 3 分钟，中途不掀开看。'] },
  { k: 'tqHours', unit: 'h', unitZh: '小时', answer: 2, q: ['A tourniquet may stay on for how many hours before you need CliniCall? (BCEHS PR03, tourniquet)', '止血带最多绑几小时，再久就要联系 CliniCall？（BCEHS PR03，止血带）'], why: ['2 hours. Past that, call CliniCall. It is never loosened in the field.', '2 小时。超过就联系 CliniCall。现场绝不松开。'] },
  { k: 'tqSecs', unit: 's', unitZh: '秒', answer: 60, q: ['Saturday station: the tourniquet is on, tight and timed within how many seconds?', '周六考站：止血带要在多少秒内绑好、绞紧、记时间？'], why: ['60 seconds, every step out loud.', '60 秒，每一步都说出来。'] },
  { k: 'tqCm', unit: 'cm', lo: 5, hi: 8, show: '5–8', q: ['How many cm above the wound does the tourniquet go? (BCEHS PR03, tourniquet)', '止血带绑在伤口上方几厘米？（BCEHS PR03，止血带）'], why: ['5 to 8 cm above the wound, never over a joint; as high as possible if you cannot find the source.', '伤口上方 5–8 cm，不跨关节；找不到出血点就尽量靠上。'] },
  { k: 'binderGap', unit: 'cm', lo: 15, hi: 20, show: '15–20', q: ['Pelvic binder: how many cm of gap do you leave in front, over the pubic bone? (BCEHS PR02, pelvic binder)', '骨盆带：前面耻骨上方留几厘米的空隙？（BCEHS PR02，骨盆带）'], why: ['A 15 to 20 cm gap, then pull slowly and evenly until snug, and record the time.', '留 15–20 cm，然后慢慢均匀拉紧到贴合，记下时间。'] },
  { k: 'cool', unit: 'min', unitZh: '分钟', lo: 15, hi: 20, show: '15–20', q: ['EMALB: cool a burn under cool running water for how many minutes?', 'EMALB：烧伤用凉的流动水冷却几分钟？'], why: ['15 to 20 minutes. Cool water, not ice.', '15–20 分钟。凉水，不是冰水。'] },
  { k: 'headUp', unit: '°', answer: 30, q: ['Head injury: raise the head of the stretcher how many degrees?', '颅脑损伤：担架床头抬高多少度？'], why: ['30 degrees.', '30 度。'] },
  { k: 'spo2', unit: '%', answer: 94, q: ['Head injury: keep SpO₂ at or above what percent?', '颅脑损伤：血氧 SpO₂ 至少保持在百分之多少？'], why: ['94% or higher: one episode of low oxygen worsens the outcome.', '94% 或以上：一次低氧就会让预后变差。'] },
  { k: 'sbpTbi', unit: 'mmHg', answer: 120, q: ['PCP, head injury: keep the systolic pressure above what number?', 'PCP，颅脑损伤：收缩压要维持在多少以上？'], why: ['Above 120 mmHg. The injured brain cannot take a low pressure.', '120 mmHg 以上。受伤的脑经不起低血压。'] },
  { k: 'gcsSevere', unit: '', answer: 8, q: ['A severe head injury is a GCS of what number or lower?', '重度颅脑损伤是 GCS 多少分及以下？'], why: ['8 or less is severe; 9 to 12 moderate; 13 to 15 mild.', '8 及以下重度；9–12 中度；13–15 轻度。'] },
  { k: 'burn20', unit: '%', answer: 20, q: ['The hypovolemia protocol covers burns over what percent of the body surface?', '烧伤面积超过百分之多少，就适用低血容量规程？'], why: ['Over 20% BSA.', '超过 20% 体表面积。'] },
];
function mkRecall(miss) {
  const pool = RECALL.flatMap(r => Array(1 + 3 * Math.min(2, (miss || {})['r-' + r.k] || 0)).fill(r)), r = pick(pool);
  return { type: 'recall', key: 'r-' + r.k, unit: r.unit, unitZh: r.unitZh, answer: r.answer, lo: r.lo, hi: r.hi, show: r.show, tol: 0, q: r.q,
    hint: ['Not that one. One more try, then I will show you.', '不是这个。再试一次，再错我就告诉你。'], why: r.why };
}
const MAKE4 = { trac: mkTrac, tracX: mkTracX, bolus: mkBolus, txa: mkTxa, gcs: mkGcs, burn: mkBurn, recall: mkRecall };
const SLOT_OF4 = key => key.startsWith('r-') ? 'recall' : key.startsWith('txa') ? 'txa' : key === 'tracOpen' || key === 'tracNo' ? 'tracX' : key;
export const _test = { MAKE: MAKE4, RECALL, BURN_UNITS };
const TXA_YN = [['Give TXA', '给 TXA'], ['No TXA', '不给 TXA']];
const W4 = { key: 'num:w04', TAG, MAKE: MAKE4, SLOT_OF: SLOT_OF4, SLOTS: ['trac', 'tracX', 'bolus', 'txa', 'txa', 'gcs', 'burn', 'recall'] };

/* ---------------- the room ---------------- */
// wk picks the weekend's question makers; progress is stored per weekend ("num:w04", "num:w05")
export async function numLab(host, store, wk = 4) {
  const C = wk === 4 ? W4 : Object.assign({ key: 'num:w' + String(wk).padStart(2, '0') }, await import(`./numlab${wk}.js?v=73`));
  const { TAG, MAKE, SLOT_OF } = C;
  const st = Object.assign({ rounds: 0, best: 0, miss: {}, last: [], days: {} }, store.get(C.key, {}));
  const saveSt = () => store.set(C.key, st);
  const yn = q => q.yn || TXA_YN;
  let queue = [], i = 0, firstTry = 0, base = 0, extras = 0, missed = [];

  function start() {
    const slots = C.SLOTS;
    const first = [...new Set((st.last || []).map(SLOT_OF))].filter(s => slots.includes(s));
    const rest = slots.slice(); first.forEach(s => rest.splice(rest.indexOf(s), 1));
    queue = first.concat(shuffle(rest)).map(s => MAKE[s](st.miss));
    i = 0; firstTry = 0; base = queue.length; extras = 0; missed = [];
    ask();
  }
  const unitOf = q => q.unitZh ? t(q.unit, q.unitZh) : q.unit;
  const answerText = q => q.yes != null ? t(...yn(q)[q.yes ? 0 : 1]) : `${q.show || fmtN(q.answer)}${q.unit === '%' || q.unit === '°' ? '' : ' '}${unitOf(q)}`.trim();
  function onMiss(q) {
    st.miss[q.key] = (st.miss[q.key] || 0) + 1; missed.push(q);
    if (extras < 3) { extras++; queue.push(Object.assign(MAKE[SLOT_OF(q.key)](st.miss), { back: true })); }
    saveSt();
  }
  function onHit(q) { if (!q.back) firstTry++; if (st.miss[q.key]) { st.miss[q.key]--; saveSt(); } }

  function ask() {
    const q = queue[i]; let tries = 0, done = false;
    const tag = TAG[q.type];
    host.innerHTML = `<div class="case-top"><div class="case-bar"><i style="width:${Math.round(i / queue.length * 100)}%"></i></div><span class="case-n">${i + 1} / ${queue.length}</span></div>
      <div class="nl-card">
        <div class="nl-tag">${esc(t(tag[0], tag[1]))}${q.back ? ` · <b>${esc(t('came back', '回炉'))}</b>` : ''}</div>
        ${q.scene ? `<p class="nl-scene">${L2(q.scene[0], q.scene[1])}</p>` : ''}
        ${q.fig ? `<div class="nl-fig">${q.fig}</div>` : ''}
        ${q.list ? `<ul class="nl-list">${q.list.map((x, k) => `<li><b>${'EVM'[k]}</b><span>${L2(x[0], x[1])}</span></li>`).join('')}</ul>` : ''}
        <p class="case-q">${L2(q.q[0], q.q[1])}</p>
        ${q.yes != null ? `<div class="nl-yn"><button class="btn" data-y="1">${esc(t(...yn(q)[0]))}</button><button class="btn" data-y="0">${esc(t(...yn(q)[1]))}</button></div>`
          : `<div class="case-type"><input id="nlIn" inputmode="decimal" autocomplete="off" enterkeyhint="done" aria-label="${esc(t('Your answer', '你的答案'))}"><span class="unit">${esc(unitOf(q))}</span><button class="btn" id="nlGo">${esc(t('Check', '核对'))}</button></div>
            ${q.note ? `<p class="tiny muted nl-note">${L2(q.note[0], q.note[1])}</p>` : ''}`}
        <div id="nlFb"></div>
      </div>`;
    const fb = host.querySelector('#nlFb');
    const finish = (ok, typed) => {
      done = true;
      if (ok && tries === 0) onHit(q); else onMiss(q);
      const gates = q.gates ? `<ul class="nl-gates">${q.gates.map(g => `<li class="${g[0] ? 'ok' : 'no'}"><b>${g[0] ? '✓' : '✗'}</b><span>${L2(g[1], g[2])}</span></li>`).join('')}</ul>` : '';
      fb.innerHTML = `<div class="case-res ${ok ? 'ok' : 'bad'}"><b>${ok ? (tries === 0 ? esc(t('Right.', '对。')) : esc(t('Right, second try.', '第二次对了。'))) : `${esc(t('The answer:', '答案：'))} ${esc(answerText(q))}`}</b>${gates}<div class="nl-why">${L2(q.why[0], q.why[1])}</div></div>
        <button class="btn case-next" id="nlNext">${i + 1 < queue.length ? esc(t('Next', '下一题')) : esc(t('See the round', '看这一轮的结果'))} →</button>`;
      const inp = host.querySelector('#nlIn'); if (inp) inp.disabled = true;
      const go = host.querySelector('#nlGo'); if (go) go.disabled = true;
      host.querySelectorAll('.nl-yn button').forEach(b => { b.disabled = true; const y = b.dataset.y === '1'; if (y === q.yes) b.classList.add('right'); else if (typed === y) b.classList.add('wrong'); });
      const nx = host.querySelector('#nlNext'); nx.onclick = () => { i++; if (i < queue.length) ask(); else end(); };
      nx.focus({ preventScroll: true }); nx.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    if (q.yes != null) { host.querySelectorAll('.nl-yn button').forEach(b => b.onclick = () => { if (!done) { const y = b.dataset.y === '1'; finish(y === q.yes, y); } }); return; }
    const inp = host.querySelector('#nlIn');
    const check = () => {
      if (done) return;
      if (!parseNums(inp.value).length) { inp.focus(); return; }
      if (isRight(q, inp.value)) { finish(true); return; }
      if (tries === 0) { tries = 1; fb.innerHTML = `<div class="case-res bad"><b>${esc(t('Not yet.', '还不对。'))}</b> ${L2(q.hint[0], q.hint[1])}</div>`; inp.value = ''; inp.focus(); return; }
      finish(false);
    };
    host.querySelector('#nlGo').onclick = check;
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); check(); } };
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) inp.focus({ preventScroll: true });
  }

  function end() {
    st.rounds++; st.best = Math.max(st.best || 0, firstTry); st.last = [...new Set(missed.map(q => q.key))];
    const d = new Date(), day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; st.days[day] = (st.days[day] || 0) + 1;
    saveSt();
    const seen = new Set(), list = missed.filter(q => !seen.has(q.key) && seen.add(q.key));
    host.innerHTML = `<div class="case-end"><div class="nl-tag">${esc(t('Round done', '这一轮做完了'))}</div>
      <div class="big">${firstTry} / ${base}</div><div class="sub">${esc(t('right on the first try', '第一次就答对'))}${extras ? ` · ${extras} ${esc(t('came back', '题回炉'))}` : ''}</div>
      ${list.length ? `<p class="nl-endh">${esc(t('These open the next round:', '下一轮先考这些：'))}</p><ul class="nl-missed">${list.map(q => `<li>${L2(q.q[0], q.q[1])}<br><b>${esc(answerText(q))}</b> <span class="tiny muted">${L2(q.why[0], q.why[1])}</span></li>`).join('')}</ul>`
        : `<p class="n2-goal">${esc(t('Clean round. The numbers are yours.', '全对。这些数字是你的了。'))}</p>`}
      <p class="tiny muted">${esc(t('Rounds done', '已做轮数'))} ${st.rounds} · ${esc(t('days practised', '练习天数'))} ${Object.keys(st.days).length} · ${esc(t('best', '最好'))} ${st.best} / ${base}</p>
      <div class="btn-row"><button class="btn" id="nlAgain">${esc(t('Another round, new numbers', '再来一轮，换新数字'))}</button><a class="btn ghost" href="#/aet/class">${esc(t('Back to class', '回课程'))}</a></div></div>`;
    host.querySelector('#nlAgain').onclick = start;
  }

  host.innerHTML = `<div class="nl-card nl-intro"><p>${L2('Eight questions, about five minutes. You type the number: nothing to pick from. New numbers every round, and what you miss comes back.', '八道题，大约五分钟。数字自己填，没有选项。每一轮数字都换，答错的会回来。')}</p>
    ${st.rounds ? `<p class="tiny muted">${esc(t('Rounds done', '已做轮数'))} ${st.rounds} · ${esc(t('best', '最好'))} ${st.best} / 8${(st.last || []).length ? ` · ${esc(t('last round’s misses come first', '上一轮错的先考'))}` : ''}</p>` : ''}
    <button class="btn case-next" id="nlStart">${esc(t('Start', '开始'))} →</button></div>`;
  host.querySelector('#nlStart').onclick = start;
}
