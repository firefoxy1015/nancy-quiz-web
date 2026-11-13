// Weekend 5 case level: the arrest at the checkout. One witnessed VF arrest carries the weekend: the pit crew, the pauses,
// the shock, "no shock advised", the EtCO₂ ROSC spike, the first ten minutes after ROSC, the PCI centre and the pre-alert,
// and, on a second run with no ROSC, the stop clock, ROLE and the family. Played by the licensing exam's rules (EMALB Exam
// Guidelines p.40 Adult CPR/AED and the stop clocks, p.42-43 CPR/AED basics, p.45 reversible causes), with road notes from
// BCEHS PR06 High Performance CPR, N02 Adult Cardiac Arrest, N03 Return of Spontaneous Circulation, R02 Resuscitation
// Decision Making, R03 Recognition of Life Extinct and A03 Clinical Handover & Communication. The patient is the Wednesday
// case of lesson w05-21. Clips: w05-lab-checkout-<key>.
export const LEVEL = {
  id: 'w05-checkout', wk: 5, clip: 'w05-lab-checkout-',
  title: { en: 'The arrest at the checkout', zh: '收银台前的心跳骤停' },
  endTitle: { en: 'Cath lab doors. Hand-over done.', zh: '导管室门口，交接完成。' },
  outro: { en: 'That is the call, both endings. Whatever you missed comes back at the start of your next run, until it sticks. See you on the next one.', zh: '这趟车跑完了，两种结局都走了一遍。没记住的会在你下次开头再出现，直到记住为止。下一趟见。' },
  steps: [
    { kind: 'scene', time: '16:48', say: 'intro',
      text: { en: 'A busy grocery store. At 16:40 a 61-year-old man collapsed at the checkout in front of his wife. A clerk started hands-only CPR within a minute. Fire arrived at 16:45, put the pads on while CPR went on, and the AED shocked once. You are the PCP crew, and you lead. ACP is about 15 minutes away.',
        zh: '一家很忙的超市。16:40，一名 61 岁男子在收银台前倒下，他妻子就在旁边。一分钟内，一名店员开始只按压的 CPR。消防 16:45 到达，一边继续按压一边贴上电极片，AED 电击了一次。你们是 PCP 车组，由你带队。ACP 大约 15 分钟后到。' },
      teach: { en: 'One arrest, the whole weekend. We play it by the licensing exam, and I will tell you where the road is different. You decide first; I talk after.', zh: '一例骤停，装下整个周末。按执照考试的规则来，路上不一样的地方我会告诉你。你先决定，我后说话。' } },

    { kind: 'multi', key: 'crew', q: { en: 'Five people around one man. Which of these belong in a good pit crew? Pick all that apply.', zh: '五个人围着一个病人。下面哪些属于好的“维修站”团队分工？全选。' }, opts: [
      { ok: true, en: 'Two compressors on opposite sides of the chest, swapping at each analysis', zh: '两名按压者在胸口两侧，每次分析时换人' },
      { ok: true, en: 'Airway at the head', zh: '气道负责人在头侧' },
      { ok: true, en: 'Pads and monitor at the side, screen turned toward the lead', zh: '电极片和监护仪在一侧，屏幕朝向队长' },
      { ok: true, en: 'The lead at the feet, hands off, watching everything', zh: '队长在脚边，不动手，看全局' },
      { en: 'The lead takes a turn compressing, to save a person', zh: '队长也轮流按压，省一个人' },
      { en: 'Swap compressors in the middle of a cycle, whenever someone is tired', zh: '谁累了就在循环中间换人' }],
      then: { en: 'Two compressors, airway, pads and monitor, a lead who keeps hands off. With a fifth person, a recorder on the clock.', zh: '两名按压者、气道、电极片和监护仪，加一个不动手的队长。第五个人就当记录员，管时间。' },
      teach: { en: 'A lead who is compressing cannot see the room. Swaps happen inside the analysis pause, so they cost nothing; a swap in the middle of a cycle is one more pause. The exam wants the compressor changed every two minutes.', zh: '正在按压的队长看不到全局。换人放在分析的暂停里做，就不多花时间；循环中间换人，就多了一次暂停。考试要求每两分钟换一次按压者。' } },

    { kind: 'choose', key: 'igel', time: '16:49', text: { en: 'Your partner has the iGel sized and lubricated: "Hold compressions, I need thirty seconds to get this in."', zh: '搭档已经选好 iGel 的型号、涂好润滑：「先停按压，我要三十秒放进去。」' }, q: { en: 'What do you say?', zh: '你怎么说？' }, opts: [
      { ok: true, en: '"No pause. Put it in while they keep compressing, then continuous."', zh: '「不停。一边按压一边放，放好以后持续按压。」', then: { en: 'It goes in during compressions. Waveform on every breath. Now compressions run without stopping, with one breath every 6 seconds.', zh: '按压中放进去了，每口气都有波形。现在持续按压，每 6 秒通气一次。' } },
      { en: '"Go ahead, thirty seconds is fine."', zh: '「去吧，三十秒没问题。」', then: { en: 'Thirty seconds hands off. Coronary pressure falls to near zero and takes many compressions to rebuild. The exam allows pauses under 5 seconds.', zh: '三十秒没人按压。冠脉灌注压掉到接近零，要很多次按压才能重新建起来。考试允许的暂停少于 5 秒。' } },
      { en: '"Leave it. We bag 30:2 until ACP arrives."', zh: '「不放了。一直 30:2 捏球囊，等 ACP 来。」', then: { en: '30:2 with a BVM costs you a quarter of the time in pauses for breaths. The supraglottic airway is a PCP skill: use it, without a pause.', zh: '30:2 用球囊，光是通气的停顿就占掉四分之一的时间。声门上气道是 PCP 的技能：要用，而且不停按压。' } }],
      teach: { en: 'The airway goes in during compressions; nothing about it needs a pause. Once it is in, BCEHS PR06, high performance CPR, runs continuous compressions with one breath every six seconds.', zh: '气道在按压中放，不需要为它停。放好之后，按 BCEHS PR06（高质量 CPR），持续按压，每六秒一口气。' } },

    { kind: 'type', key: 'pause', q: { en: 'The exam: each pause in compressions must be less than how many seconds?', zh: '考试：每次按压暂停必须少于多少秒？' }, answer: 5, unit: 's', placeholder: '?',
      hint: { en: 'Count the fingers on one hand.', zh: '数数一只手的手指。' },
      teach: { en: 'Under five seconds on the exam. BCEHS PR06 and the AHA module allow ten seconds or less. Plan the pause before anyone stops.', zh: '考试要求少于 5 秒。BCEHS PR06 和 AHA 模块允许 10 秒以内。停手之前先想好要做什么。' } },

    { kind: 'choose', key: 'shock', time: '16:50', text: { en: 'Two minutes are up. Hands off. The AED: "Shock advised. Charging."', zh: '两分钟到了，手离开。AED：「建议电击。正在充电。」' }, q: { en: 'The shock is delivered. The very next thing?', zh: '电击完成。紧接着做什么？' }, opts: [
      { ok: true, en: 'Compressions at once, the fresh compressor, no pulse check', zh: '马上按压，换上新的按压者，不摸脉搏', then: { en: 'Hands back on the chest within a second. The recorder calls "Shock two, 16:50."', zh: '一秒内手回到胸口。记录员报：「第二次电击，16:50。」' } },
      { en: 'Check the carotid for 10 seconds', zh: '摸 10 秒颈动脉', then: { en: 'Even a shock that works leaves a weak heart that needs compressions. The exam: resume CPR immediately after the shock.', zh: '即使电击成功，心脏也很弱，需要按压帮忙。考试：电击后立即继续 CPR。' } },
      { en: 'Let the AED analyze again to see if it worked', zh: '让 AED 再分析一次，看看有没有用', then: { en: 'The next analysis comes after two minutes of CPR, not now. Every extra analysis is a pause.', zh: '下一次分析在两分钟 CPR 之后，不是现在。每多一次分析，就多一次暂停。' } }],
      teach: { en: 'Shock, then compress. And during the charge, hands stay on the chest: the exam resumes CPR during the charging phase too, so the only real pause is the shock itself.', zh: '电击，然后按压。充电的时候手也不离开胸口：考试规定充电期间同样继续 CPR，所以真正的暂停只有电击那一下。' } },

    { kind: 'choose', key: 'nsa', time: '16:52', text: { en: 'Next analysis. The AED: "No shock advised." The monitor shows narrow, regular complexes.', zh: '下一次分析。AED：「不建议电击。」监护仪上是窄的、规律的波群。' }, q: { en: 'Under the exam guideline, what now?', zh: '按考试指南，现在做什么？' }, opts: [
      { ok: true, en: 'Resume CPR immediately; a pulse check belongs only with the analysis or signs of ROSC', zh: '立即继续 CPR；摸脉搏只在分析时或出现 ROSC 迹象时', then: { en: 'Compressions restart. With two of you you also check the carotid during that analysis pause: nothing. This is PEA until proven otherwise.', zh: '按压重新开始。两个人时，在那次分析暂停里也摸了颈动脉：没有。在证明之前，这就是无脉电活动 (PEA)。' } },
      { en: 'Stop CPR: a regular rhythm means the heart is beating', zh: '停止 CPR：规律的心律说明心脏在跳', then: { en: 'Electrical activity is not a pulse. Without a pulse this is PEA, and only compressions move blood.', zh: '有电活动不等于有脉搏。没有脉搏就是 PEA，只有按压能推动血流。' } },
      { en: 'Wait one minute and analyze again', zh: '等一分钟再分析一次', then: { en: 'No waiting. "No shock advised": resume CPR immediately, two minutes, then analyze.', zh: '不能等。「不建议电击」：立即继续 CPR，做两分钟，再分析。' } }],
      teach: { en: 'No shock advised: CPR immediately, two minutes, analyze, repeat. While you compress, say the reversible causes aloud. The exam lists hypoxia, hypovolemia, acidosis, potassium, cold, tension pneumothorax, tamponade, toxins and clots.', zh: '不建议电击：立即 CPR，两分钟，分析，重复。按压时把可逆原因说出来。考试列出：缺氧、低血容量、酸中毒、钾、低温、张力性气胸、心包填塞、毒物、血栓。' } },

    { kind: 'choose', key: 'spike', time: '16:53', text: { en: 'Mid-cycle. The EtCO₂ has sat at 17 with good compressions. Suddenly it reads 44, then 45, then 43, breath after breath.', zh: '循环中间。按压质量很好，EtCO₂ 一直在 17。突然变成 44，然后 45、43，一口气接一口气都这么高。' }, q: { en: 'What do you call?', zh: '你喊什么？' }, opts: [
      { ok: true, en: '"EtCO₂ up, pulse check": 10 seconds or less', zh: '「EtCO₂ 上来了，摸脉搏」：不超过 10 秒', then: { en: 'Strong carotid pulse. The recorder: "ROSC, 16:53." Blood pressure next, pads stay on.', zh: '颈动脉搏动有力。记录员：「ROSC，16:53。」接着量血压，电极片继续贴着。' } },
      { en: 'Nothing: wait for the two-minute analysis', zh: '不喊：等两分钟的分析', then: { en: 'He may already have a pulse. A sudden, sustained jump is the best clue to ROSC you have.', zh: '他可能已经有脉搏了。突然而且持续的升高，是你手上最好的 ROSC 线索。' } },
      { en: '"Bag faster, the CO₂ is too high"', zh: '「捏快点，二氧化碳太高了」', then: { en: 'The CO₂ is high because blood is flowing again. Fast bagging would only drive it down and starve the brain.', zh: '二氧化碳高，是因为血又流起来了。快速捏球囊只会把它压下去，让大脑缺血。' } },
      { en: '"The iGel has moved, take it out"', zh: '「iGel 移位了，拔出来」', then: { en: 'A displaced airway makes the reading fall or vanish, not jump.', zh: '气道移位会让读数下降或消失，而不是跳高。' } }],
      teach: { en: 'A sudden, sustained rise, often to thirty-five or more, means ROSC is likely. Call it, check briefly, and if there is no pulse, compress at once. BCEHS N02, adult cardiac arrest, trusts an EtCO₂ change more than the monitor rhythm.', zh: '突然而且持续的升高，常到 35 以上，说明很可能 ROSC。喊出来，快速摸脉搏；没有脉搏就立刻按压。BCEHS N02（成人心脏骤停）认为，EtCO₂ 的变化比监护仪上的心律更可信。' } },

    { kind: 'choose', key: 'o2', time: '16:55', text: { en: 'BP 94/60. He is not waking up. High-flow oxygen through the iGel; the oximeter now has a clean trace and reads 100%.', zh: '血压 94/60，他没有醒。经 iGel 给高流量氧；血氧仪现在波形很清楚，读数 100%。' }, q: { en: 'What do you do with the oxygen?', zh: '氧气怎么调？' }, opts: [
      { ok: true, en: 'Turn it down in steps to an SpO₂ of 92–98% (N03)', zh: '分步调低，目标 SpO₂ 92–98%（N03）', then: { en: 'Down in steps; it settles at 96%. One breath every 6 seconds, EtCO₂ 36.', zh: '一步步调低，稳定在 96%。每 6 秒一口气，EtCO₂ 36。' } },
      { en: 'Keep 100%: after an arrest you can never give too much', zh: '保持 100%：骤停后氧气越多越好', then: { en: 'At 100% you cannot see how high the oxygen has climbed, and the excess makes free radicals in the brain you just saved.', zh: '在 100% 时你看不出血氧到底多高，多余的氧会在你刚救回来的大脑里产生自由基。' } },
      { en: 'Take the oxygen off: he has a pulse now', zh: '把氧撤掉：他已经有脉搏了', then: { en: 'He is unconscious with a stunned heart. He still needs oxygen and ventilation, just not too much.', zh: '他昏迷，心脏还处于顿抑状态。他仍然需要氧气和通气，只是不要过多。' } }],
      teach: { en: 'BCEHS N03, return of spontaneous circulation: SpO₂ ninety-two to ninety-eight once the reading is reliable, EtCO₂ thirty to forty. The school module says ninety-four to ninety-eight; the exam has no post-ROSC range and a general target of ninety-four or more.', zh: 'BCEHS N03（自主循环恢复）：读数可靠后 SpO₂ 92–98%，EtCO₂ 30–40。学校模块写的是 94–98%；考试没有 ROSC 后的专门范围，一般目标是 94% 以上。' } },

    { kind: 'multi', key: 'bundle', q: { en: 'The first ten minutes after ROSC. Which belong? Pick all that apply.', zh: 'ROSC 后的头十分钟。下面哪些该做？全选。' }, opts: [
      { ok: true, en: 'Head of the cot up 30° where possible', zh: '条件允许时床头抬高 30°' },
      { ok: true, en: 'Passive cooling: minimal blankets', zh: '被动降温：少盖毯子' },
      { ok: true, en: 'The pads stay on', zh: '电极片继续贴着' },
      { ok: true, en: 'Check his blood glucose', zh: '查血糖' },
      { en: 'Ice packs in the groin and armpits', zh: '腹股沟和腋下放冰袋' },
      { en: 'Bag fast to keep the EtCO₂ low', zh: '快速捏球囊，把 EtCO₂ 压低' }],
      then: { en: 'Head up, minimal blankets, pads on, a glucose of 7.4.', zh: '床头抬高、少盖毯子、电极片贴着、血糖 7.4。' },
      teach: { en: 'Re-arrest is common, so the pads never come off. Cooling is passive only: ice packs showed no benefit and more re-arrest. And no passive cooling at all after a traumatic arrest, because cold harms clotting.', zh: '再次骤停很常见，所以电极片绝不摘。降温只能被动：冰袋没有好处，反而更容易再骤停。创伤性骤停后则完全不做被动降温，因为冷会影响凝血。' } },

    { kind: 'type', key: 'bolus', time: '16:58', text: { en: 'BP now 86/54. No sign of bleeding or dehydration. He weighs about 90 kg. Your partner has an IV in.', zh: '血压现在 86/54。没有出血或脱水的迹象。他大约 90 kg。搭档已经开好静脉。' }, q: { en: 'BCEHS N03: the most saline you give as a bolus, in mL?', zh: 'BCEHS N03：最多给多少毫升生理盐水冲击？' }, answer: 1800, unit: 'mL', placeholder: '?',
      hint: { en: 'So many mL per kg. Not the 2-litre number.', zh: '每公斤多少毫升。不是 2 升那个数。' },
      teach: { en: 'Twenty per kilo: eighteen hundred, room-temperature saline, aiming for a systolic above ninety. A stunned heart cannot take much more volume, so the limit is twenty unless you suspect hypovolemia.', zh: '每公斤 20 毫升：1,800 毫升，常温生理盐水，目标收缩压高于 90。顿抑的心脏承受不了更多容量，所以除非怀疑低血容量，上限就是 20 mL/kg。' } },

    { kind: 'type', key: 'twelve', q: { en: 'About how many minutes after ROSC do you acquire the 12-lead?', zh: 'ROSC 后大约几分钟做 12 导联？' }, answer: 10, unit: 'min', placeholder: '?',
      hint: { en: 'Long enough for the rhythm to settle.', zh: '要等心律稳定下来。' },
      teach: { en: 'About ten minutes of perfusion first. A tracing taken in the first minutes often shows changes from the arrest itself.', zh: '先灌注大约十分钟。头几分钟做的心电图，常有骤停本身造成的改变。' } },

    { kind: 'choose', key: 'dest', time: '17:04', text: { en: 'The 12-lead: ST elevation of 3 mm in V2 to V4. You transmit it.', zh: '12 导联：V2 到 V4 导联 ST 段抬高 3 mm。你把它传了出去。' }, q: { en: 'Where does he go, and what does the hospital hear first?', zh: '送去哪里？医院先听到什么？' }, opts: [
      { ok: true, en: 'The closest PCI centre, with a pre-arrival notification', zh: '最近的 PCI 中心，并提前通知医院', then: { en: 'ACP meets you en route. The pre-alert goes out in under 60 seconds: age, arrest, shocks, ROSC time, the STEMI, vitals, ETA.', zh: 'ACP 在路上和你会合。预警 60 秒内讲完：年龄、骤停、电击、ROSC 时间、STEMI、生命体征、预计到达时间。' } },
      { en: 'The nearest emergency department, no call needed', zh: '最近的急诊，不用提前打电话', then: { en: 'A cardiac cause goes to the PCI centre, and BCEHS A03 requires a pre-arrival notification after an arrest.', zh: '心源性原因要送 PCI 中心，而且 BCEHS A03 规定骤停后必须提前通知医院。' } },
      { en: 'Stay on scene until ACP arrives to decide', zh: '留在现场等 ACP 来决定', then: { en: 'Never wait on scene for the intercept: meet them on the way.', zh: '绝不在现场等 ACP：在路上会合。' } }],
      teach: { en: 'BCEHS N03 sends a cardiac cause to the closest PCI centre, and A03, clinical handover and communication, makes the pre-arrival notification required. The school wants it in sixty seconds, in ATMIST order.', zh: 'BCEHS N03 规定心源性原因送最近的 PCI 中心；A03（临床交接与沟通）规定必须提前通知医院。学校要求 60 秒内讲完，按 ATMIST 的顺序。' } },

    { kind: 'header', time: '16:48', say: 'rerun', text: { en: 'Second run. Same store, same man, same start. This time the shocks do not work and the heart never comes back.', zh: '第二遍。同一家超市、同一个人、同样的开头。这一次电击没用，心脏再也没有回来。' },
      teach: { en: 'Now the hardest part of the weekend: when to stop, and what to say.', zh: '现在是这个周末最难的部分：什么时候停，以及说什么。' } },

    { kind: 'choose', key: 'stop30', time: '17:10', text: { en: 'Thirty minutes since the collapse. Shocked twice early on, never a pulse, asystole for the last ten minutes. Your partner: "Thirty minutes. Let\'s call it."', zh: '倒下已经 30 分钟。早期电击过两次，从来没有脉搏，最近十分钟一直是心搏停止。搭档：「三十分钟了，停吧。」' }, q: { en: 'What do you say?', zh: '你怎么说？' }, opts: [
      { ok: true, en: '"Not yet. He was shocked: forty minutes, and CliniCall before we stop."', zh: '「还不行。他被电击过：要 40 分钟，停之前打 CliniCall。」', then: { en: 'You keep going. The exam: 40 minutes because of the shocks. The road: R02 also says 40, because the first rhythm was shockable, and every stop goes through CliniCall.', zh: '继续做。考试：因为电击过，要 40 分钟。路上：R02 也是 40 分钟，因为首个心律可电击；而且每次停止都要经过 CliniCall。' } },
      { en: '"Yes, thirty minutes is the limit."', zh: '「对，30 分钟就是上限。」', then: { en: 'Thirty is the clock only with no ROSC and no defibrillation at all. He was shocked twice.', zh: '只有从头到尾没有 ROSC、也没有除颤过，才是 30 分钟。他被电击过两次。' } },
      { en: '"We should have stopped at twenty."', zh: '「其实 20 分钟就该停了。」', then: { en: 'R02\'s 20-minute minimum needs all three: unwitnessed by responders, non-shockable throughout, no ROSC. He was shocked.', zh: 'R02 的最少 20 分钟需要三条全满足：急救人员没目击、全程不可电击、从未 ROSC。他被电击过。' } }],
      teach: { en: 'Two clocks on the exam: thirty with no ROSC and no shocks, forty with any ROSC or any shock. On the road, R02, resuscitation decision making, asks the first rhythm instead, and a PCP-led arrest calls CliniCall early anyway.', zh: '考试有两只钟：没有 ROSC 也没电击过是 30 分钟；有过 ROSC 或电击过是 40 分钟。路上，R02（复苏决策）改按首个心律来分，而且 PCP 带队的骤停本来就要尽早打 CliniCall。' } },

    { kind: 'type', key: 'role', time: '17:21', text: { en: '17:20. CliniCall agrees to stop. You record life extinct under R03.', zh: '17:20，CliniCall 同意停止。你按 R03 确认生命消失。' }, q: { en: 'Each check (heart sounds, breathing, carotid) lasts how many seconds?', zh: '每项检查（心音、呼吸、颈动脉）持续多少秒？' }, answer: 90, unit: 's', placeholder: '?',
      hint: { en: 'A minute and a half.', zh: '一分半钟。' },
      teach: { en: 'Ninety seconds each, two providers, quiet and still. Never in environmental hypothermia, where no signs of life means nothing. A sudden, unexpected death also needs the coroner or police.', zh: '每项 90 秒，两名人员，保持安静、不动。环境性失温不能用，那时没有生命迹象说明不了什么。突然、意外的死亡还要通知验尸官或警察。' } },

    { kind: 'choose', key: 'wife', time: '17:25', text: { en: 'His wife has been with a firefighter since minute eight. She looks at you.', zh: '从第八分钟起，一名消防员一直陪着他妻子。她看着你。' }, q: { en: 'How do you tell her?', zh: '你怎么告诉她？' }, opts: [
      { ok: true, en: 'Gloves off, sit at her eye level: "I\'m so sorry. He has died." Then silence.', zh: '摘掉手套，坐到和她视线一样高：「很抱歉，他去世了。」然后安静。', then: { en: 'She asks, "Are you sure?" You repeat the facts gently. You thank the clerk who started CPR.', zh: '她问：「你确定吗？」你温和地把事实再说一遍。你也感谢了那位开始 CPR 的店员。' } },
      { en: 'Standing, still in gloves: "We lost him."', zh: '站着、戴着手套：「我们失去他了。」', then: { en: '"Lost" can sound like he may still be found. Gloves off, eye level, and the plain word: died.', zh: '“失去”听起来像还能找回来。摘掉手套、视线平齐，用最直白的词：去世了。' } },
      { en: 'Leave it to the police when they arrive', zh: '等警察来了让警察说', then: { en: 'She is part of the call. She should hear it from the people who were with him.', zh: '她也是这趟出车的一部分，应该由陪在他身边的人告诉她。' } }],
      teach: { en: 'The family is part of the call. Gloves off, eye level, the word died, then silence. If she asks again, repeat the facts. Thank the bystander who started CPR; that clerk gave him his only chance.', zh: '家属也是这趟出车的一部分。摘手套、视线平齐、说“去世了”，然后安静。她再问，就再说一遍事实。感谢开始 CPR 的旁观者，那位店员给了他唯一的机会。' } },

    { kind: 'header', say: 'recall', text: { en: 'Back in the truck. Before it fades: no story, just the numbers.', zh: '回到车上。趁还没忘：不讲故事，只问数字。' },
      teach: { en: 'Quick round. Type what you would say to the examiner.', zh: '快问快答。打出你会对考官说的那个数。' } },

    { kind: 'type', key: 'r-fraction', q: { en: 'Compression fraction: the minimum the AHA module accepts, in %?', zh: '按压分数：AHA 模块接受的最低值是百分之多少？' }, answer: 60, unit: '%', placeholder: '?',
      hint: { en: 'High-performance teams aim for 80.', zh: '高水平团队的目标是 80。' }, teach: { en: 'Sixty at least; good teams reach eighty.', zh: '至少 60%；好的团队能到 80%。' } },
    { kind: 'type', key: 'r-sbp', q: { en: 'After ROSC: keep the systolic above what number?', zh: 'ROSC 后：收缩压要保持在多少以上？' }, answer: 90, unit: 'mmHg', placeholder: '?',
      hint: { en: 'Or a MAP above 65.', zh: '或平均动脉压高于 65。' }, teach: { en: 'Above ninety, or a MAP above sixty-five.', zh: '高于 90，或平均动脉压高于 65。' } },
    { kind: 'type', key: 'r-etco2', q: { en: 'After ROSC: ventilate to an EtCO₂ of at least how many mmHg?', zh: 'ROSC 后：通气使 EtCO₂ 至少达到多少 mmHg？' }, answer: 30, unit: 'mmHg', placeholder: '?',
      hint: { en: 'The target is a range of ten.', zh: '目标是一个相差 10 的范围。' }, teach: { en: 'Thirty to forty. Lower means you are bagging too fast.', zh: '30 到 40。更低说明你捏得太快。' } },
    { kind: 'type', key: 'r-clock', q: { en: 'Exam: an arrest with no ROSC and no shock at any time may stop after how many minutes?', zh: '考试：从头到尾没有 ROSC、没有电击的骤停，多少分钟后可以停？' }, answer: 30, unit: 'min', placeholder: '?',
      hint: { en: 'The shorter of the two clocks.', zh: '两只钟里短的那只。' }, teach: { en: 'Thirty. Any ROSC or any shock makes it forty.', zh: '30 分钟。有过 ROSC 或电击过就是 40。' } },
    { kind: 'end' },
  ],
};
