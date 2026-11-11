// Skill diagrams (Weekend 4): real labelled drawings for the hands-on lessons, replacing the decorative pictures.
// A lesson slide carries `dia` (which drawing) and `guess` (which "you first" question). The player shows the drawing
// with tappable spots before the teacher explains; her answer is marked on the drawing, then the slide plays as usual.
// The last slide of each skill lesson carries `ask`: two or three numbers she has to type, no options.
// Facts follow EMALB (the exam) first, then the BCEHS procedure, each named with its title.
import { esc } from './app.js?v=71';
import { isRight } from './numlab.js?v=71';

const two = (en, zh, inl) => `<span class="l-en">${esc(en)}</span><span class="l-zh${inl ? ' inl' : ''}">${esc(zh)}</span>`;
const tube = (d, w = 9) => `<path class="bo" d="${d}" stroke-width="${w}"/><path class="bi" d="${d}" stroke-width="${w - 2.6}"/>`;
const mk = (k, x, y, st, r = 13) => `<g class="sk-mk${st ? ' ' + st : ''}" data-k="${k}" transform="translate(${x},${y})"><circle r="${r}"/><text y="4.5">${k}</text></g>`;
const mirror = s => `<g transform="translate(360,0) scale(-1,1)">${s}</g>`;
const arrow = (x, y, dx, dy) => { const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n, ex = x + dx, ey = y + dy;
  return `<path class="air" d="M${x},${y} L${ex},${ey} M${(ex - ux * 6 - uy * 4).toFixed(1)},${(ey - uy * 6 + ux * 4).toFixed(1)} L${ex},${ey} L${(ex - ux * 6 + uy * 4).toFixed(1)},${(ey - uy * 6 - ux * 4).toFixed(1)}"/>`; };
// labels on the drawings: English and Chinese in one <text>, each hidden by the text mode; a white halo keeps them readable over the drawing
const lab = (x, y, en, zh, a = 'start', c = '') => `<text class="lbl${c ? ' ' + c : ''}" x="${x}" y="${y}" text-anchor="${a}"><tspan class="l-en">${esc(en)}</tspan><tspan class="l-zh" dx="3">${esc(zh)}</tspan></text>`;
// the same, stacked: one line per English piece, then the Chinese under it
const labs = (x, y, en, zh, a = 'start', c = '') => `<text class="lbl${c ? ' ' + c : ''}" text-anchor="${a}">` +
  [...en.map(t => ['l-en', t]), ['l-zh', zh]].map(([k, t], i) => `<tspan class="${k}" x="${x}" y="${y + i * 10.5}">${esc(t)}</tspan>`).join('') + `</text>`;
const dot = (n, x, y, r = 6.5) => `<g class="stepd"><circle cx="${x}" cy="${y}" r="${r}"/><text x="${x}" y="${y + 3.2}">${n}</text></g>`;

/* ---------------- the questions she answers before the teacher explains ---------------- */
export const GUESS = {
  tq: { dia: 'leg', v: 'tq', ok: 'B', clip: 'w04-lab-dia-tq',
    cue: ['Before I teach this one, you tell me. Blood is pumping from his thigh, and your hand is not holding it. Where does the tourniquet go? Tap a spot on the picture.',
      '这个我先不讲，你先说。大腿的血在喷，你的手压不住。止血带绑在哪儿？在图上点一个位置。'],
    q: ['Bright red blood is pumping from the thigh and direct pressure is not holding it. Where does the tourniquet go?', '大腿伤口鲜红色的血在喷，直接压迫压不住。止血带绑在哪儿？'],
    options: [
      { k: 'A', en: 'On the wound', zh: '压在伤口上', why: ['On the wound the band cannot squeeze the artery shut, and it grinds into the injury. The wound gets pressure or packing; the band goes above it.', '绑在伤口上压不闭动脉，还会碾进伤口。伤口用压迫或填塞，止血带绑在上方。'] },
      { k: 'B', en: 'Above the wound', zh: '伤口上方', why: ['5 to 8 cm above the wound, on bare skin, between the wound and the heart.', '伤口上方 5–8 cm，贴着皮肤，在伤口和心脏之间。'] },
      { k: 'C', en: 'Over the knee', zh: '膝盖上', why: ['Never over a joint: the bones hold the band off the artery, so it cannot close it.', '绝不绑在关节上：骨头把带子撑开，压不到动脉。'] },
      { k: 'D', en: 'On the calf', zh: '小腿上', why: ['Below the wound it stops nothing. The blood arrives from the heart side.', '绑在伤口下方什么也止不住，血是从心脏那一侧来的。'] }] },
  tq2: { dia: 'leg', v: 'tq2', ok: 'A', clip: 'w04-lab-dia-tq2',
    cue: ['Same leg, harder problem. His trousers are soaked, and you cannot see where the blood is coming from. You have seconds, not minutes. Where does the band go now? Tap it.',
      '同一条腿，题目更难。裤子湿透了，你看不出血从哪儿来。你只有几秒钟。这回止血带绑哪儿？点一下。'],
    q: ['The trouser leg is soaked and you cannot find the wound. Where does the tourniquet go?', '裤腿被血浸透，找不到伤口。止血带绑在哪儿？'],
    options: [
      { k: 'A', en: 'As high as possible', zh: '尽量靠近大腿根', why: ['Source unclear: as high as possible on the limb. Cut the trouser away so the band sits on bare skin.', '出血点不明：尽量绑在肢体根部。把裤子剪开，让带子贴着皮肤。'] },
      { k: 'B', en: 'On the stain', zh: '血迹最深的地方', why: ['The stain shows where the blood soaked, not where the hole is. If the wound is above your band, he keeps bleeding.', '血迹只说明血流到了哪儿，不是伤口在哪儿。伤口要是在带子上方，血照样流。'] },
      { k: 'C', en: 'Over the knee', zh: '膝盖上', why: ['Never over a joint: the bones hold the band off the artery.', '绝不绑在关节上：骨头把带子撑开，压不到动脉。'] },
      { k: 'D', en: 'On the calf', zh: '小腿上', why: ['Almost certainly below the wound: it stops nothing.', '几乎肯定在伤口下方，什么也止不住。'] }] },
  binder: { dia: 'pelvis', v: 'binder', ok: 'B', clip: 'w04-lab-dia-binder',
    cue: ['You first. He was pinned at the hips, his heart rate is 118, and you are reaching for the binder. Where does the middle of it sit? Tap one of the three lines.',
      '你先来。他的髋部被压过，心率 118，你伸手去拿骨盆带。骨盆带的中线压在哪儿？点三条线里的一条。'],
    q: ['The pelvis took the hit and the heart rate is 118. Where does the centre of the binder sit?', '骨盆受了撞击，心率 118。骨盆带的中线放在哪儿？'],
    options: [
      { k: 'A', en: 'Belt level, on the iliac crests', zh: '腰带的高度，髂嵴上', why: ['At belt level it squeezes the wings of the pelvis and does not close the ring.', '在腰带高度只是夹住髂骨翼，合不上骨盆环。'] },
      { k: 'B', en: 'On the greater trochanters', zh: '大转子上', why: ['Centred on the greater trochanters, the bony bumps at the sides of the upper thighs. Squeezing there closes the ring.', '中线对准大转子，也就是大腿根外侧摸得到的骨突。在这里收紧才能合上骨盆环。'] },
      { k: 'C', en: 'Mid-thigh', zh: '大腿中段', why: ['Too low: it only ties the thighs together. The ring is above it.', '太低了，只是把两条大腿捆在一起，骨盆环在它上面。'] }] },
  binder2: { dia: 'pelvis', v: 'binder2', ok: 'C', clip: 'w04-lab-dia-binder2',
    cue: ['Quick one before I go on. The binder is under him, over the trochanters, and you are about to pull. How big a gap do you leave at the front? Pick a number.',
      '继续之前先问一个快的。骨盆带已经在他身下，压在大转子上，你正要拉紧。前面留多大的缺口？选一个数。'],
    q: ['Before you pull the binder tight: how wide is the gap you leave between its two ends, over the pubic bone?', '拉紧骨盆带之前，两端之间在耻骨上方留多宽的缺口？'],
    options: [
      { k: 'A', en: '0 cm', zh: '0 cm', why: ['With no gap there is nothing left to pull: the ends meet before the ring is closed.', '不留缺口就没有收紧的余地，两端先碰上了，骨盆环还没合拢。'] },
      { k: 'B', en: '5 cm', zh: '5 cm', why: ['Too little travel: the pull runs out early.', '余量太小，拉不了多少就到头了。'] },
      { k: 'C', en: '15–20 cm', zh: '15–20 cm', why: ['BCEHS PR02 (pelvic binder): leave a 15 to 20 cm gap over the pubic bone, then pull slowly and evenly until snug, and write the time.', 'BCEHS PR02（骨盆带）：在耻骨上方留 15–20 cm 的缺口，然后缓慢均匀地拉到贴紧，记下时间。'] },
      { k: 'D', en: '30 cm', zh: '30 cm', why: ['Too wide: the pull unit has to bridge the gap, and it will not close the ring.', '太宽了，拉紧装置要跨过这段距离，合不上骨盆环。'] }] },
  seal: { dia: 'chest', v: 'seal', ok: '3', clip: 'w04-lab-dia-seal',
    cue: ['Your guess first. There is a hole in his chest, and it bubbles every time he breathes. You are taping a dressing over it. How many sides do you tape down? Pick a number.',
      '你先猜。他胸口有个洞，每次呼吸都冒泡。你要在上面贴一块敷料。贴住几条边？选一个数。'],
    q: ['An open chest wound that bubbles with each breath. On the exam you tape an occlusive dressing over it: how many sides do you tape?', '开放性胸部伤口，每次呼吸都冒泡。考试里你贴一块不透气敷料：贴住几条边？'],
    options: [
      { k: '1', en: '1 side', zh: '1 条边', why: ['One side is a flap in the wind: air goes in around it with every breath.', '只贴一边等于一块挂着的布，每次吸气空气照样从旁边进去。'] },
      { k: '2', en: '2 sides', zh: '2 条边', why: ['Two sides still leave it loose: it does not seal when he breathes in.', '贴两边还是松的，吸气时封不住。'] },
      { k: '3', en: '3 sides', zh: '3 条边', why: ['Three sides: the dressing is sucked flat when he breathes in, and air escapes from the open side when he breathes out. EMALB accepts this or a commercial seal; BCEHS H06 (chest trauma) prefers a vented commercial seal.', '贴三边：吸气时敷料被吸平封住，呼气时空气从没贴的那一边出去。EMALB 接受三边敷料或成品胸封；BCEHS H06（胸部创伤）首选带排气阀的成品胸封。'] },
      { k: '4', en: '4 sides', zh: '4 条边', why: ['Four sides with no vent traps the air inside: that is how an open wound turns into a tension pneumothorax.', '四边全封又没有排气阀，空气就困在里面：开放性伤口就是这样变成张力性气胸的。'] }] },
  seal2: { dia: 'chest', v: 'seal2', ok: 'C', clip: 'w04-lab-dia-seal2',
    cue: ['You sealed the hole ten minutes ago. Now he is working harder to breathe, his pressure is dropping, and his neck veins are standing up. What do you do with the seal? Choose one.',
      '十分钟前你封住了那个洞。现在他喘得更费力，血压在掉，颈静脉鼓起来了。这块胸封你怎么处理？选一个。'],
    q: ['Ten minutes after the seal went on: breathing worse, pressure falling, neck veins distended. What do you do with the seal?', '贴上胸封十分钟后：呼吸更差、血压下降、颈静脉怒张。这块胸封怎么办？'],
    options: [
      { k: 'A', en: 'Press it down harder', zh: '压得更紧', why: ['Pressing harder keeps the air in. The problem is air that cannot get out.', '压得更紧只会把气关在里面。问题就是气出不来。'] },
      { k: 'B', en: 'Add a second seal on top', zh: '再加一块盖上去', why: ['A second seal locks the pressure in under the first.', '再盖一块，等于把第一块底下的压力锁死。'] },
      { k: 'C', en: 'Lift one edge', zh: '掀起一条边', why: ['Lift one edge, let the trapped air out, lay it back down and watch again. This is the fix the exam wants: relieve the seal.', '掀起一条边，把困住的气放出来，再贴回去继续观察。考试要的就是这一步：给胸封放气。'] },
      { k: 'D', en: 'Leave it and drive faster', zh: '不动它，开快点', why: ['A tension pneumothorax kills in minutes; it will not wait for the hospital. Relieve it first, then drive.', '张力性气胸几分钟就要命，等不到医院。先放气，再赶路。'] }] },
  needle: { dia: 'chest', v: 'needle', ok: 'A', clip: 'w04-lab-dia-needle',
    cue: ['Put a finger on your own chest for this one. The school teaches the needle, so you need the spot. Front of the chest, three choices. Which one is safe? Tap it.',
      '这一题把手指放在自己胸口上。学校教穿刺，所以你得知道位置。胸前三个点，哪个安全？点一下。'],
    q: ['Anterior site for needle decompression: which spot?', '针刺减压的前胸位置：哪一个点？'],
    options: [
      { k: 'A', en: '2nd space, mid-clavicular line', zh: '第 2 肋间，锁骨中线', why: ['Second intercostal space on the mid-clavicular line, just over the top of the third rib.', '锁骨中线第 2 肋间，紧贴第 3 肋骨上缘。'] },
      { k: 'B', en: '2nd space, beside the sternum', zh: '第 2 肋间，胸骨旁', why: ['Never medial to the mid-clavicular line: the internal thoracic vessels run beside the sternum, with the heart and great vessels behind.', '绝不能比锁骨中线更靠内：胸廓内血管紧贴胸骨两侧，后面就是心脏和大血管。'] },
      { k: 'C', en: 'Below the nipple', zh: '乳头下方', why: ['Too low in front: the diaphragm rises this high, with the liver under it on the right and the heart on the left.', '前胸这个位置太低：膈肌能升到这里，右边下面是肝，左边是心脏。'] }] },
  traction: { dia: 'traction', v: 'traction', ok: 'B', clip: 'w04-lab-dia-traction',
    cue: ['Before the steps, the first decision. A Sager traction splint is made for one fracture, and only one. Where is it? Tap the spot on the leg.',
      '讲步骤之前，先做第一个决定。Sager 牵引夹板只为一种骨折设计，只有一种。在哪儿？在腿上点出来。'],
    q: ['A Sager traction splint is for a fracture where?', 'Sager 牵引夹板用于哪里的骨折？'],
    options: [
      { k: 'A', en: 'Hip / femoral neck', zh: '髋部 / 股骨颈', why: ['Hip or pelvis fracture: no traction (PR50, Sager traction splint). Pad it and immobilise it as found.', '髋部或骨盆骨折：不牵引（PR50，Sager 牵引夹板）。垫好，按原位固定。'] },
      { k: 'B', en: 'Mid-shaft femur', zh: '股骨干中段', why: ['A suspected mid-shaft femur fracture in a stable patient (EMALB).', '稳定病人的疑似股骨干中段骨折（EMALB）。'] },
      { k: 'C', en: 'Knee / distal femur', zh: '膝关节 / 股骨远端', why: ['Knee or distal femur involved: no traction. You would be pulling across an injured joint.', '累及膝关节或股骨远端：不牵引，否则是在跨着受伤的关节拉。'] },
      { k: 'D', en: 'Ankle or foot', zh: '踝或足', why: ['The ankle hitch pulls on the ankle and foot. If they are broken, no traction.', '踝带是拉在踝和足上的。踝或足骨折就不能牵引。'] }] },
};

/* ---------------- what stays under each drawing once she has answered ---------------- */
const LEGEND = {
  leg: { src: ['EMALB bleeding control (p.19) · BCEHS PR03 (tourniquet)', 'EMALB 出血控制（第 19 页）· BCEHS PR03（止血带）'], rows: [
    ['On bare skin, 5–8 cm above the wound; source unclear → as high as possible', '贴皮肤，伤口上方 5–8 cm；找不到出血点 → 尽量靠近肢体根部'],
    ['Never over a joint', '绝不绑在关节上'],
    ['Twist the windlass until the bleeding stops and the distal pulse is gone', '转动绞棒，直到出血停止、远端脉搏消失'],
    ['Lock it and write TK and the time', '卡住绞棒，写上 TK 和时间'],
    ['2 hours at most, then CliniCall. It hurts: treat the pain, never loosen it', '最长 2 小时，再长联系 CliniCall。会很疼：给镇痛，绝不松开']] },
  pelvis: { src: ['EMALB pelvic binding (p.24) · BCEHS PR02 (pelvic binder)', 'EMALB 骨盆固定（第 24 页）· BCEHS PR02（骨盆带）'], rows: [
    ['When: major mechanism plus any of heart rate over 100 or systolic under 90, pelvic pain, instability, decreased LOC, a major distracting injury', '什么时候绑：重大受伤机制，加上以下任一项：心率 > 100 或收缩压 < 90、骨盆痛、骨盆不稳、意识下降、严重的分散性损伤'],
    ['Bare skin. Slide it under the knees and work it up: no log roll, never rock the pelvis', '贴皮肤。从膝下塞进去再往上挪：不翻身，绝不摇晃骨盆'],
    ['Centre it on the greater trochanters, not the iliac crests', '中线对准大转子，不是髂嵴'],
    ['Leave a 15–20 cm gap, pull slowly and evenly until snug, write the time', '留 15–20 cm 缺口，缓慢均匀拉到贴紧，记下时间'],
    ['Not for a femoral neck fracture or a fall from standing height', '股骨颈骨折、站立高度跌倒不用']] },
  chest: { src: ['EMALB chest injuries (p.34) · BCEHS H06 (chest trauma)', 'EMALB 胸部损伤（第 34 页）· BCEHS H06（胸部创伤）'], rows: [
    ['Gloved hand over the hole at once', '戴手套的手立刻盖住伤口'],
    ['Look for an exit wound: the back and the armpits', '找出口伤：后背和腋下'],
    ['Wipe it dry; seal on as he breathes out (three sides, or a vented commercial seal)', '擦干；在呼气末贴上（贴三边，或用带排气阀的成品胸封）'],
    ['Sit him up, high-flow oxygen; no CPAP, no Entonox (nitrous oxide)', '让他坐起，高流量吸氧；不用 CPAP，不用笑气（Entonox，nitrous oxide）'],
    ['Getting worse → lift the seal, let the air out, reassess', '变差 → 掀起胸封放气，再评估']] },
  needle: { src: ['School skill: NEEDLE decompression module · BCEHS H06 (chest trauma)', '学校技能：针刺减压模块 · BCEHS H06（胸部创伤）'], rows: [
    ['Find it: sternal notch → angle of Louis → second rib → out to the mid-clavicular line', '找法：胸骨上切迹 → 胸骨角 → 第 2 肋 → 向外到锁骨中线'],
    ['Front: 2nd space on the mid-clavicular line, never medial to it', '前胸：锁骨中线第 2 肋间，绝不更靠内'],
    ['Side: 4th or 5th space between the anterior and mid-axillary lines, never lower', '侧胸：腋前线到腋中线之间的第 4 或第 5 肋间，绝不更低'],
    ['14 g, 8 cm (3.25 in) needle, 90° to the chest wall, over the top of the rib', '14 g、8 cm（3.25 英寸）的针，垂直胸壁，贴着肋骨上缘进'],
    ['School: full skill · licence: optional endorsement · BCEHS H06 (chest trauma): ACP skill → seal, lift the seal, call the ACP early · exam: relieve the seal', '学校：完整技能 · 执照：可选加签 · BCEHS H06（胸部创伤）：ACP 技能 → 贴胸封、掀胸封放气、尽早叫 ACP · 考试：给胸封放气']] },
  traction: { src: ['EMALB traction splinting (p.23) · BCEHS PR50 (Sager traction splint)', 'EMALB 牵引固定（第 23 页）· BCEHS PR50（Sager 牵引夹板）'], rows: [
    ['Stable patient only, suspected mid-shaft femur fracture', '只用于稳定的病人，疑似股骨干中段骨折'],
    ['Splint on the inner side, about 10 cm past the heel; thigh strap, then ankle hitch', '夹板放在腿内侧，超出足跟约 10 cm；先扣大腿带，再扣踝带'],
    ['Closed: 10% of body weight, 15 lb (7 kg) at most. Open: 5 lb at most (EMALB)', '闭合性：体重的 10%，最多 15 lb（7 kg）。开放性：最多 5 lb（EMALB）'],
    ['Once it is on, never release the traction', '一旦上了牵引，绝不松开'],
    ['No traction: unstable patient; hip or pelvis fracture; knee or distal femur; ankle or foot fracture; partial amputation', '不牵引：病人不稳定；髋部或骨盆骨折；膝或股骨远端受累；踝或足骨折；部分离断']] },
};

/* ---------------- the drawings (viewBox 0 0 360 250, fixed colours on a white plate) ---------------- */
const LEG = 'M0,66 C70,60 150,76 200,88 C214,84 226,90 240,96 C268,100 288,103 304,103 L311,64 C313,52 331,52 333,66 L331,128 C329,141 311,141 300,134 C270,134 240,140 205,143 C150,152 70,164 0,164 Z';
function drawLeg(v, done, cls) {
  const hard = v === 'tq2', okK = hard ? 'A' : 'B';
  const at = hard ? { A: 20, B: 128, C: 207, D: 256 } : { B: 108, A: 151, C: 207, D: 256 };
  const top = hard ? 65 : 71;                                     // the skin line above the right answer's band
  let s = `<defs><clipPath id="skLeg"><path d="${LEG}"/></clipPath></defs><rect class="bed" x="0" y="166" width="360" height="9" rx="3"/><path class="skin" d="${LEG}"/>`;
  if (hard) {
    s += `<g clip-path="url(#skLeg)"><rect class="cloth" x="${done ? 60 : -2}" y="40" width="${done ? 230 : 292}" height="140"/>` +
      `<path class="stain" d="M96,84 C120,70 160,78 176,100 C186,122 170,150 138,152 C108,154 86,132 88,108 C89,98 91,90 96,84 Z"/></g>` +
      (done ? `<path class="cut" d="M60,62 l5,9 l-5,9 l5,9 l-5,9 l5,9 l-5,9 l5,9 l-5,9 l5,9 l-5,9 l5,9"/>` : '');
  } else {
    s += `<path class="blood" d="M150,104 C156,97 167,99 171,108 C173,117 166,125 158,123 C151,121 146,112 150,104 Z"/><path class="blood" d="M146,166 C158,159 198,159 208,166 Z"/>` +
      (done ? '' : `<path class="spurt" d="M160,102 C158,84 168,70 182,60 M164,103 C170,90 180,82 194,78"/>`);
  }
  s += `<path class="line" d="${LEG}"/><path class="crease" d="M206,93 C214,99 223,99 232,96 M296,106 C300,112 302,120 300,128"/>`;
  const names = `<path class="lead" d="M26,10 H6 M11,6 L6,10 L11,14"/>` + lab(30, 14, 'to the heart', '往心脏') + lab(219, 76, 'knee', '膝', 'middle') + lab(322, 44, 'foot', '脚', 'middle') +
    (hard ? lab(150, 56, 'wound hidden', '伤口看不见', 'middle') : labs(176, 126, ['wound'], '伤口'));
  for (const k of Object.keys(at).sort()) {
    const x = at[k], c = cls(k);
    if (done && k === okK) continue;
    s += `<g clip-path="url(#skLeg)"><rect class="cand${c ? ' ' + c : ''}" x="${x}" y="40" width="14" height="140"/></g>`;
  }
  if (done) {
    const x = at[okK], tx = hard ? x + 26 : x - 66;
    s += `<g clip-path="url(#skLeg)"><rect class="band" x="${x}" y="40" width="14" height="140"/></g>` +
      `<rect class="rod" x="${x - 9}" y="${top + 9}" width="32" height="6" rx="3" transform="rotate(-16 ${x + 7} ${top + 12})"/>` +
      `<path class="lead" d="M${x + 7},${top - 2} L${hard ? tx : tx + 54},${top - 24}"/><g class="tag"><rect x="${tx}" y="${top - 41}" width="54" height="18" rx="3"/><text x="${tx + 27}" y="${top - 28}">TK 14:32</text></g>`;
    if (!hard) s += `<path class="dim" d="M122,52 v10 M150,52 v10 M122,57 H150"/><text class="dimt" x="148" y="47">5–8 cm</text>` + lab(97, 100, 'windlass', '绞棒', 'end');
    else s += lab(66, 151, 'cut', '剪开');
  }
  s += names;
  for (const k of Object.keys(at).sort()) { const x = at[k] + 7; s += `<path class="lead" d="M${x},176 V188"/>` + mk(k, x, 202, cls(k)); }
  return s;
}

const PELV = 'M108,0 C104,40 92,80 90,118 C90,160 98,210 104,250 L170,250 C172,215 176,180 180,158 C184,180 188,215 190,250 L256,250 C262,210 270,160 270,118 C268,80 256,40 252,0 Z';
function drawPelvis(v, done, cls) {
  const gap = v === 'binder2', on = done || gap;
  const half = `<path class="bone" d="M152,52 C132,34 102,42 100,68 C99,88 110,104 128,110 C142,112 152,104 156,92 C160,78 160,62 152,52 Z"/>` +
    tube('M108,132 L132,250', 15) + tube('M124,116 L106,125', 10) + `<ellipse class="bone" cx="101" cy="124" rx="8" ry="12"/><circle class="bone" cx="124" cy="116" r="12"/>` +
    tube('M133,113 C150,115 166,122 177,130', 8) + tube('M135,127 C141,149 162,151 176,137', 7);
  let s = `<defs><clipPath id="skPel"><path d="${PELV}"/></clipPath></defs><path class="skin" d="${PELV}"/>` + half + mirror(half) +
    `<path class="bone" d="M158,54 L202,54 L191,98 L180,108 L169,98 Z"/><path class="crease" d="M180,126 V139"/>`;
  if (!gap) for (const [k, y] of [['A', 38], ['B', 113], ['C', 196]]) {
    if (done && k === 'B') continue;
    const c = cls(k); s += `<g clip-path="url(#skPel)"><rect class="cand${c ? ' ' + c : ''}" x="60" y="${y}" width="240" height="20"/></g>`;
  }
  if (on) s += `<g clip-path="url(#skPel)"><rect class="binder" x="60" y="101" width="80" height="44"/><rect class="binder" x="220" y="101" width="80" height="44"/></g>` +
    `<path class="lace" d="M140,109 L220,117 M140,117 L220,109 M140,123 L220,123 M140,129 L220,137 M140,137 L220,129"/>` +
    `<circle class="okring" cx="101" cy="124" r="14"/><circle class="okring" cx="259" cy="124" r="14"/>` +
    `<path class="dim" d="M140,84 v10 M220,84 v10 M140,89 H220"/><text class="dimt${done ? '' : ' ask'}" x="180" y="80">${done ? '15–20 cm' : '? cm'}</text>`;
  s += labs(84, 42, ['iliac crest'], '髂嵴', 'end') + `<path class="lead" d="M86,44 L105,51"/>` +
    labs(80, 113, ['greater', 'trochanter'], '大转子', 'end') + (on ? '' : `<path class="lead" d="M82,121 H92"/>`) +
    lab(84, 232, 'femur', '股骨', 'end') + `<path class="lead" d="M86,229 H120"/>` +
    `<path class="lead" d="M180,164 V144"/>` + lab(180, 175, 'pubic bone', '耻骨', 'middle') + (on ? '' : labs(180, 70, ['sacrum'], '骶骨', 'middle'));
  if (!gap) for (const [k, y] of [['A', 48], ['B', 123], ['C', 206]]) s += `<path class="lead" d="M274,${y} H302"/>` + mk(k, 318, y, cls(k));
  return s;
}

const TORSO = 'M165,6 L165,26 C150,36 110,38 84,48 C62,56 54,76 54,100 L54,128 L88,128 L92,108 C94,150 98,200 102,244 L258,244 C262,200 266,150 268,108 L272,128 L306,128 L306,100 C306,76 298,56 276,48 C250,38 210,36 195,26 L195,6 Z';
const RIBS = ['M168,74 C150,72 134,76 126,79 C116,82 106,84 98,84', 'M168,98 C150,97 136,101 126,104 C114,107 102,108 94,106', 'M169,122 C152,122 138,127 126,130 C114,132 102,131 94,126',
  'M170,146 C154,148 138,153 126,156 C114,158 102,156 95,149', 'M171,166 C156,172 140,180 126,183 C114,185 104,181 97,172'];
function drawChest(v, done, cls) {
  let s = `<path class="skin" d="${TORSO}"/>`;
  if (v === 'needle') {
    const half = tube('M168,54 C152,52 134,56 120,64', 7) + RIBS.map(d => tube(d, 9)).join('') + tube('M166,44 C140,40 112,46 88,52', 8);
    s += (done ? `<path class="heart" d="M178,104 C198,96 226,110 224,136 C222,158 198,168 182,162 C172,152 170,116 178,104 Z"/>` : '') + half + mirror(half) +
      `<path class="bone" d="M164,40 L196,40 L192,73 L168,73 Z"/><path class="bone" d="M168,75 L192,75 L190,166 L170,166 Z"/><path class="bone" d="M174,168 L186,168 L180,182 Z"/>` +
      [[206, 76], [206, 100.5], [206, 125.5], [206, 151], [204, 176.5]].map(([x, y], i) => `<text class="ribn" x="${x}" y="${y}">${i + 2}</text>`).join('') +
      `<circle class="nip" cx="122" cy="143" r="3"/><circle class="nip" cx="238" cy="143" r="3"/>` + lab(100, 31, 'clavicle', '锁骨', 'middle');
    if (done) s += `<path class="dome" d="M98,178 C120,160 160,160 180,172 C200,160 240,160 262,178"/><path class="vessel" d="M162,48 L160,170 M198,48 L200,170"/>` +
      `<path class="mcl" d="M126,40 V236"/><path class="way" d="M180,38 L180,73 L168,74 C150,72 134,76 126,79 L126,90"/>` +
      `<g class="stepd"><circle cx="180" cy="38" r="6.5"/><text x="180" y="41.2">1</text><circle cx="180" cy="73" r="6.5"/><text x="180" y="76.2">2</text></g>` +
      `<rect class="okring" x="92" y="131" width="13" height="38" rx="6.5"/><path class="lead" d="M92,150 H78"/>` + labs(76, 143, ['side site', '4th–5th space'], '侧胸 4–5 肋间', 'end', 'g') +
      `<path class="vessel" d="M4,9 H16"/>` + lab(20, 12.5, 'sternal vessels', '胸骨旁血管', 'start', 'r') +
      dot(1, 209, 9, 5) + lab(217, 12.5, 'sternal notch', '胸骨上切迹') + dot(2, 209, 21, 5) + lab(217, 24.5, 'angle of Louis', '胸骨角') +
      labs(130, 222, ['mid-clavicular line'], '锁骨中线', 'start', 'b') +
      `<path class="lead" d="M272,143 L226,134"/>` + lab(274, 147, 'heart', '心脏', 'start', 'r') +
      `<path class="lead" d="M272,180 H264"/>` + lab(274, 184, 'diaphragm', '膈肌', 'start', 'p');
    s += mk('A', 126, 91, cls('A'), 10) + mk('B', 156, 86, cls('B'), 10) + mk('C', 124, 170, cls('C'), 10);
    return s;
  }
  s += `<path class="crease" d="M166,44 C140,41 112,46 92,52 M194,44 C220,41 248,46 268,52 M180,50 V168"/><circle class="nip" cx="122" cy="150" r="3"/><circle class="nip" cx="238" cy="150" r="3"/>`;
  if (v === 'seal') {
    s += `<path class="blood" d="M122,100 C126,96 134,98 135,105 C135,112 127,115 122,111 C119,108 119,103 122,100 Z"/>`;
    if (!done) s += `<circle class="bub" cx="138" cy="96" r="3"/><circle class="bub" cx="143" cy="88" r="2"/><circle class="bub" cx="119" cy="94" r="2.2"/>` +
      `<rect class="cand" x="100" y="78" width="56" height="56"/><text class="note" x="128" y="72" text-anchor="middle">?</text><text class="note" x="92" y="110" text-anchor="middle">?</text><text class="note" x="164" y="110" text-anchor="middle">?</text><text class="note" x="128" y="148" text-anchor="middle">?</text>` +
      `<path class="lead" d="M190,84 L141,100"/>` + labs(192, 82, ['open wound'], '开放伤口');
    else s += `<rect class="film" x="100" y="78" width="56" height="56"/><rect class="tape" x="95" y="73" width="66" height="9"/><rect class="tape" x="95" y="73" width="9" height="64"/><rect class="tape" x="152" y="73" width="9" height="64"/>` +
      arrow(112, 136, 0, 16) + arrow(128, 136, 0, 16) + arrow(144, 136, 0, 16) +
      `<g class="stepd"><circle cx="128" cy="62" r="6.5"/><text x="128" y="65.2">1</text><circle cx="84" cy="106" r="6.5"/><text x="84" y="109.2">2</text><circle cx="172" cy="106" r="6.5"/><text x="172" y="109.2">3</text></g>` +
      `<path class="lead" d="M190,84 L163,88"/>` + labs(192, 82, ['tape: 3 sides'], '胶带贴三边') + labs(136, 166, ['open side: air out'], '这一边不贴，气出去', 'middle');
    return s;
  }
  // seal2: the seal is on and he is getting worse; answered = one edge lifted, the air escaping
  s += `<path class="blood" d="M122,100 C126,96 134,98 135,105 C135,112 127,115 122,111 C119,108 119,103 122,100 Z"/>`;
  if (!done) s += `<circle class="film" cx="128" cy="106" r="30"/><circle class="valve" cx="128" cy="106" r="6"/><path class="vein" d="M171,9 C169,15 172,20 170,27 M189,9 C191,15 188,20 190,27"/>` +
    `<text class="note" x="352" y="22" text-anchor="end">SpO₂ ↓ · BP ↓</text>` + labs(160, 12, ['neck veins distended'], '颈静脉怒张', 'end') + lab(126, 68, 'vented seal', '带阀胸封', 'middle');
  else s += `<path class="film" d="M98,106 A30,30 0 1 1 152,124 L104,124 A30,30 0 0 1 98,106 Z"/><circle class="valve" cx="128" cy="106" r="6"/>` +
    `<path class="flap" d="M104,124 L152,124 C146,112 110,112 104,124 Z"/>` + arrow(112, 128, -6, 18) + arrow(128, 128, 0, 20) + arrow(144, 128, 6, 18) +
    `<text class="note g" x="352" y="22" text-anchor="end">SpO₂ ↑ · BP ↑</text>` + lab(126, 68, 'vented seal', '带阀胸封', 'middle') + labs(128, 162, ['lift one edge'], '掀起一边，放气', 'middle');
  return s;
}

const TLEG = 'M58,52 C100,50 150,58 178,62 C200,60 215,64 240,68 C265,70 280,72 290,72 L290,92 C280,92 265,94 240,96 C215,100 200,104 178,102 C150,106 100,110 58,110 Z';
const TNAME = { A: ['hip', '髋'], B: ['mid-shaft', '股骨干'], C: ['knee', '膝'], D: ['ankle', '踝'] };
function drawTraction(v, done, cls) {
  const toes = [72, 77, 82, 87.2].map(y => `<circle class="skin" cx="312" cy="${y}" r="2.6"/>`).join('') + `<circle class="skin" cx="312.5" cy="93.4" r="3.6"/>`;
  const leg = `<path class="skin" d="${TLEG}"/>${toes}<path class="skin" d="M288,73 C293,66 305,65 311,69 L311,96 C305,100 293,98 288,91 Z"/>`;
  let s = `<rect class="skin" x="-12" y="34" width="78" height="186" rx="16"/><g transform="translate(0,254) scale(1,-1)">${leg}</g>${leg}` +
    `<path class="crease" d="M60,56 C67,72 67,90 60,106 M60,148 C67,164 67,182 60,198"/>` +
    `<circle class="bone" cx="54" cy="98" r="9"/>` + tube('M54,98 L70,72', 8) + `<ellipse class="bone" cx="72" cy="66" rx="8" ry="6"/>` +
    (done ? tube('M76,70 L116,76', 9) + tube('M122,82 L170,82', 9) + `<path class="frac" d="M113,66 l6,6 l-6,5 l6,6 l-6,5 l6,6"/>` : tube('M76,70 L170,82', 9)) +
    `<ellipse class="bone" cx="174" cy="82" rx="6" ry="10"/><circle class="bone" cx="186" cy="83" r="7"/>` + tube('M196,74 L280,76', 4) + tube('M196,84 L282,84', 8) + `<ellipse class="bone" cx="289" cy="82" rx="5" ry="8"/>`;
  // the splint lies between the legs; its four parts are numbered and named in the key under the drawing
  if (done) s += `<rect class="sbar" x="66" y="123" width="266" height="8" rx="4"/><rect class="spad" x="58" y="112" width="12" height="30" rx="5"/><rect class="sbar" x="328" y="112" width="6" height="30" rx="2"/>` +
    `<rect class="strap" x="80" y="50" width="12" height="82" rx="3"/><rect class="strap l" x="148" y="57" width="7" height="75" rx="3"/><rect class="strap l" x="232" y="66" width="7" height="66" rx="3"/>` +
    `<rect class="strap" x="272" y="70" width="10" height="24" rx="3"/><path class="hitch" d="M277,94 L328,126"/><circle class="gauge" cx="312" cy="127" r="7"/><path class="hitch" d="M312,127 L316,122"/>` +
    dot(1, 48, 127) + dot(2, 86, 43) + dot(3, 277, 60) + dot(4, 312, 146) +
    `<path class="dim" d="M315,52 v9 M334,52 v9 M315,56.5 H334"/><path class="ext" d="M315,61 V67 M334,61 V112"/><text class="dimt" x="325" y="47">10 cm</text>` +
    dot(1, 76, 228.5, 5) + lab(85, 232, 'ischial pad', '坐骨垫') + dot(2, 200, 228.5, 5) + lab(209, 232, 'thigh strap', '大腿带') +
    dot(3, 76, 241.5, 5) + lab(85, 245, 'ankle hitch', '踝带') + dot(4, 200, 241.5, 5) + lab(209, 245, 'scale: max 15 lb', '最多 15 磅');
  for (const [k, mx, x, y] of [['A', 56, 56, 88], ['B', 120, 120, 72], ['C', 204, 188, 74], ['D', 294, 294, 66]])
    s += `<path class="lead" d="M${mx},36 L${x},${y}"/>` + mk(k, mx, 22, cls(k)) + labs(mx + 17, 19, [TNAME[k][0]], TNAME[k][1]);
  return s;
}
const DRAW = { leg: drawLeg, pelvis: drawPelvis, chest: drawChest, traction: drawTraction };
const DIA_OF = { tq: ['leg', 'tq'], binder: ['pelvis', 'binder'], seal: ['chest', 'seal'], needle: ['chest', 'needle'], traction: ['traction', 'traction'] };
const ALT = { leg: 'A leg seen from the side, with the places a tourniquet could go', pelvis: 'A pelvis seen from the front, with the places a binder could go',
  chest: 'A chest seen from the front', traction: 'Both legs seen from the front, with a traction splint' };

// the figure for a slide: pending (pick == null, the question and its choices), or answered / skipped ('-')
export function skFigure(s, pick) {
  const G = s.guess ? GUESS[s.guess] : null;
  const [dia, v] = G ? [G.dia, G.v] : (DIA_OF[s.dia] || ['leg', 'tq']);
  const done = !G || pick != null;
  const cls = k => !G || !done ? '' : k === G.ok ? 'ok' : k === pick ? 'no' : 'off';
  const svg = `<div class="sk-plate"><svg class="sk-svg" viewBox="0 0 360 250" role="img" aria-label="${esc(ALT[dia])}">${DRAW[dia](v, done, cls)}</svg></div>`;
  if (!done) return `<figure class="cls-fig sk-fig q">${svg}<div class="sk-ask"><div class="sk-kick">${two('You first', '你先猜')}</div><div class="sk-q">${two(G.q[0], G.q[1])}</div>
    <div class="sk-chips">${G.options.map(o => `<button class="sk-chip" data-k="${o.k}"><b>${o.k}</b><span>${two(o.en, o.zh)}</span></button>`).join('')}</div>
    <button class="btn ghost tiny" data-skip>${two('Skip, just teach me', '跳过，直接讲', 1)}</button></div></figure>`;
  const L = LEGEND[v === 'needle' ? 'needle' : dia];
  let res = '';
  if (G && pick !== '-') {
    const mine = G.options.find(o => o.k === pick), right = G.options.find(o => o.k === G.ok), good = pick === G.ok;
    res = `<div class="case-res ${good ? 'ok' : 'bad'} sk-res"><div class="sk-you">${two('Your answer', '你的答案', 1)}</div><b>${good ? '✓' : '✗'} ${mine ? two(mine.en, mine.zh, 1) : ''}</b>${mine ? `<p>${two(mine.why[0], mine.why[1])}</p>` : ''}` +
      (good ? '' : `<div class="sk-you">${two('The right answer', '正确答案', 1)}</div><b>✓ ${two(right.en, right.zh, 1)}</b><p>${two(right.why[0], right.why[1])}</p>`) + `</div>`;
  } else if (G) { const right = G.options.find(o => o.k === G.ok); res = `<div class="case-res ok sk-res"><b>✓ ${two(right.en, right.zh, 1)}</b><p>${two(right.why[0], right.why[1])}</p></div>`; }
  return `<figure class="cls-fig sk-fig a">${svg}${res}<ul class="sk-leg">${L.rows.map(r => `<li>${two(r[0], r[1])}</li>`).join('')}</ul><div class="sk-src">${two(L.src[0], L.src[1])}</div>` +
    (s.img && s.img.caption ? `<figcaption>${two(s.img.caption, s.img.captionZh || '', 1)}</figcaption>` : '') + `</figure>`;
}
// taps on the drawing's spots and on the choices under it
export function wireSk(root, onPick) {
  const fig = root.querySelector('.sk-fig.q'); if (!fig) return;
  fig.querySelectorAll('.sk-mk[data-k], .sk-chip[data-k]').forEach(b => b.addEventListener('click', () => onPick(b.dataset.k)));
  const sk = fig.querySelector('[data-skip]'); if (sk) sk.onclick = () => onPick('-');
}

/* ---------------- typed numbers at the end of a skill lesson ---------------- */
const fmt = n => Number(n).toLocaleString('en-US');
const ansText = a => (a.lo != null ? `${fmt(a.lo)}–${fmt(a.hi)}` : fmt(a.answer));
export const askDone = (asks, get) => asks.every((a, j) => (get(j) || {}).done);
// host: the element to fill; get(j) / set(j, state) read and store { v, n, ok, done }; onDone() fires when the last one is answered
export function askBlock(host, asks, get, set, onDone) {
  const draw = focus => {
    host.innerHTML = `<div class="sk-type"><div class="sk-kick">${two('Before you go: type it. No options.', '走之前：自己打出来，没有选项。')}</div>` + asks.map((a, j) => {
      const st = get(j) || {};
      const unit = a.unit ? `<span class="unit">${two(a.unit, a.unitZh || a.unit, 1)}</span>` : '';
      return `<div class="sk-row${st.done ? (st.ok ? ' ok' : ' bad') : ''}"><div class="sk-rq"><b>${j + 1}</b><span>${two(a.q, a.qZh)}</span></div>` + (st.done
        ? `<div class="case-res ${st.ok ? 'ok' : 'bad'}"><b>${st.ok ? '✓' : '✗'} ${ansText(a)} ${a.unit ? two(a.unit, a.unitZh || a.unit, 1) : ''}</b>${st.ok ? '' : ` <span class="sk-typed">${two('you typed', '你打的是', 1)} ${esc(st.v)}</span>`}<p>${two(a.why, a.whyZh)}</p></div>`
        : `<div class="case-type"><input inputmode="decimal" autocomplete="off" data-j="${j}" value="">${unit}<button class="btn small" data-chk="${j}">${two('Check', '核对', 1)}</button></div>` +
          (st.n ? `<div class="sk-hint">${two('Not that. One more try, then I will show you.', '不对。再试一次，然后我告诉你。')}</div>` : '')) + `</div>`; }).join('') + `</div>`;
    host.querySelectorAll('input[data-j]').forEach(inp => {
      const j = +inp.dataset.j, go = () => {
        const raw = inp.value.trim(); if (!raw) { inp.focus(); return; }
        const st = Object.assign({ n: 0 }, get(j) || {}), ok = isRight(asks[j], raw);
        st.v = raw; st.n += 1; st.ok = ok; st.done = ok || st.n >= 2; set(j, st); draw(st.done ? -1 : j);
        if (askDone(asks, get)) onDone();
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      host.querySelector(`[data-chk="${j}"]`).onclick = go;
      if (focus === j) inp.focus();
    });
  };
  draw(-1);
}
