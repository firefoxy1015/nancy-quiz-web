// Weekend 4 case level: the thigh under the steel coil. One leg carries the whole weekend: bleeding ladder, tourniquet,
// unstable criteria, hypovolemia protocol, TXA, the traction decision, and the analgesia order. Played by the licensing
// exam's rules (EMALB Exam Guidelines p.7 unstable criteria, p.19 bleeding control, p.21 MSK, p.23 traction, p.54 hypovolemia,
// p.58 acetaminophen, p.65 Entonox, p.68 ibuprofen, p.78 TXA; EMALB Grading Criteria p.16 RBS, p.19 transport category,
// p.33-34 protocols, p.37 reassessment, Appendix A analgesia), with one-line road notes from BCEHS PR03 (tourniquet),
// PR50 (Sager traction splint), H02 (crush injury). The patient is the Wednesday case of lesson w04-21.
// Clips: w04-lab-thigh-<key>.
export const LEVEL = {
  id: 'w04-thigh', wk: 4, clip: 'w04-lab-thigh-',
  title: { en: 'The thigh under the coil', zh: '钢卷下的大腿' },
  endTitle: { en: 'Trauma bay. Hand-over done.', zh: '创伤室，交接完成。' },
  outro: { en: 'That is the call. Whatever you missed comes back at the start of your next run, until it sticks. See you on the next one.', zh: '这趟车跑完了。没记住的会在你下次开头再出现，直到记住为止。下一趟见。' },
  steps: [
    { kind: 'scene', time: '14:05', say: 'intro',
      text: { en: 'A steel fabrication yard. A 34-year-old man, left thigh pinned under a two-tonne coil since 12:05. Fire has blocked the coil and locked out the machinery. As they set the lifting bags the coil shifts, and bright red blood starts pulsing from his inner thigh. Your partner presses a dressing on it. It soaks through in seconds.',
        zh: '钢材加工场。34 岁男性，左大腿从 12:05 起被一卷两吨的钢卷压住。消防已经垫住钢卷、锁停了机器。他们放顶升气囊的时候钢卷动了一下，鲜红的血开始从他大腿内侧一股一股往外喷。搭档拿敷料压上去，几秒钟就湿透了。' },
      teach: { en: 'This call is the whole weekend in one leg. We play it by the licensing exam, and I will tell you where the road is different. You decide first; I talk after.', zh: '这一趟车，一条腿装下整个周末。按执照考试的规则来，路上不一样的地方我会告诉你。你先决定，我后说话。' } },

    { kind: 'order', key: 'ladder', q: { en: 'The exam has a written order for bleeding control. Tap the five rungs in order.', zh: '考试的止血有写死的顺序。按顺序点这五级。' },
      items: [{ en: 'Direct pressure', zh: '直接压迫' }, { en: 'Pressure dressing', zh: '加压包扎' }, { en: 'Position: limb up if nothing else is hurt, patient flat and still', zh: '体位：没有别的伤就抬高肢体，病人平躺不动' }, { en: 'Tourniquet, with the time written', zh: '止血带，写下时间' }, { en: 'Pack the limb wound if it still bleeds', zh: '还在出血就填塞肢体伤口' }], answer: [0, 1, 2, 3, 4],
      teach: { en: 'Pressure, dressing, position, tourniquet, pack. On this call the first rungs have already failed and a pinned leg cannot be raised, so you go straight down to the tourniquet. The road agrees: BCEHS PR03, tourniquet, says one failed direct pressure is enough.', zh: '压迫、包扎、体位、止血带、填塞。这趟车前两级已经失败，被压住的腿也抬不起来，所以直接下到止血带。路上也一样：BCEHS PR03（止血带）写的是直接压迫失败一次就上。' } },

    { kind: 'choose', key: 'tq-where', text: { en: 'The dressing has failed. The CAT is in your hand.', zh: '敷料压不住。止血带 CAT 在你手里。' }, q: { en: 'Where does it go?', zh: '绑哪儿？' }, opts: [
      { ok: true, en: 'High on the thigh: 5 to 8 cm above the wound and above the crushed part, on bare skin.', zh: '大腿高位：伤口上方 5–8 cm、压伤部位以上，直接贴皮肤。', then: { en: 'Jeans cut away, strap on skin, windlass until the pulsing stops and the foot pulse is gone. Clip, strap. "Tourniquet on at 14:07."', zh: '剪开牛仔裤，带子贴皮肤，绞棒一直拧到不喷血、足背脉搏消失。卡住、固定。「止血带 14:07 上好。」' } },
      { en: 'Over the jeans, as high as you can, to save time.', zh: '隔着牛仔裤，越高越好，省时间。', then: { en: 'The strap slips on the denim and you cannot see what is under it. It still oozes. BCEHS PR03 (tourniquet): directly on skin. Wrong technique on the exam: minus 15.', zh: '带子在牛仔布上打滑，下面压着什么你也看不见，还在渗。BCEHS PR03（止血带）：直接贴皮肤。考试上手法错：−15%。' } },
      { en: 'Right over the wound, where the blood comes out.', zh: '正对伤口，哪儿出血绑哪儿。', then: { en: 'You are squeezing the wound, not the artery that feeds it. It keeps pulsing. Above the wound.', zh: '你勒的是伤口，不是给它供血的动脉。还在喷。要绑在伤口上方。' } },
      { en: 'Just above the knee.', zh: '膝盖上方一点。', then: { en: 'That is below the wound and next to a joint. The artery is still open upstream. He is still bleeding.', zh: '那是伤口下方，还挨着关节。上游的动脉还开着，他还在流血。' } }],
      teach: { en: 'Above the wound, five to eight centimetres or as high as you can, never over a joint, on skin. Tighten until the bleeding stops, lock it, and say the time out loud. A life-threatening bleed found and not controlled is minus one hundred.', zh: '伤口上方 5–8 cm，或者尽量高；不压关节；贴皮肤。拧到血停、锁住、把时间说出来。发现致命出血却没控制住：−100%。' } },

    { kind: 'multi', key: 'unstable', time: '14:08', text: { en: 'The pulsing has stopped. He is pale, cool and sweaty, talking in full sentences. "It hurts. Ten out of ten."', zh: '不喷了。他脸色苍白、皮肤又凉又湿，能说整句话。「疼，十分。」' },
      q: { en: 'Stable or unstable decides everything after this. Which of the exam’s unstable findings does he have? Pick all that apply.', zh: '稳定还是不稳定，决定后面的一切。考试的「不稳定」清单里，他占了哪几条？全选。' }, opts: [
      { ok: true, en: 'Bleeding that needed a tourniquet', zh: '需要上止血带的出血' },
      { ok: true, en: 'Cool, pale, clammy skin suggesting shock', zh: '皮肤凉、苍白、湿冷，提示休克' },
      { ok: true, en: 'A crushed limb', zh: '肢体被压伤' },
      { en: 'Pain 10 out of 10', zh: '疼痛 10 分' },
      { en: 'Trapped for two hours', zh: '被困两小时' },
      { en: 'A fall from more than 6 metres', zh: '从 6 米以上坠落' }],
      then: { en: 'Three findings. Any one of them makes him unstable.', zh: '三条。占一条就是不稳定。' },
      teach: { en: 'One finding is enough and he has three. Pain is not on the list, and neither is time trapped. Unstable means a priority patient, and the exam wants a priority patient ready to load within fifteen minutes.', zh: '一条就够，他占了三条。疼痛不在清单上，被困多久也不在。不稳定 = 优先病人，考试要求优先病人 15 分钟内准备好装车。' } },

    { kind: 'choose', key: 'vitals-first', text: { en: 'Fire: "Five minutes to lift." Your partner already has the IV bag out: "Fluids and TXA, now?"', zh: '消防：「五分钟后起吊。」搭档已经把输液袋拿出来了：「现在就补液、上 TXA？」' }, q: { en: 'What comes first?', zh: '先做什么？' }, opts: [
      { ok: true, en: 'Baseline vitals first. Then the protocol.', zh: '先量基础生命体征，再启动规程。', then: { en: '"Vitals first." Forty seconds. Now every protocol you start has a number behind it.', zh: '「先量生命体征。」四十秒。现在你启动的每个规程后面都有数字撑着。' } },
      { en: 'Start the bolus now. He is obviously in shock.', zh: '马上补液，他明显休克了。', then: { en: 'On the exam, a protocol started before baseline vitals is minus 100, however right the fluid is.', zh: '考试上，没量基础生命体征就启动规程：−100%，补液本身再对也没用。' } },
      { en: 'TXA first. The clock is running.', zh: '先推 TXA，时间不等人。', then: { en: 'TXA comes after the hypovolemia protocol is started, and no protocol starts before baseline vitals. Minus 100.', zh: 'TXA 要等低血容量规程启动之后，而任何规程都不能在基础生命体征之前启动。−100%。' } },
      { en: 'Wait for the lift and do everything in the truck.', zh: '等起吊，上车再说。', then: { en: 'He bleeds inside and cools on the concrete for five minutes while you watch. Vitals take forty seconds. Take them now.', zh: '你看着的这五分钟，他在里面继续出血、躺在水泥地上继续变凉。量生命体征只要四十秒，现在就量。' } }],
      teach: { en: 'You stopped the bleeding in the primary survey, and that never waits. The hypovolemia protocol, TXA and pain relief all wait for one thing: baseline vitals. Protocol before vitals is minus one hundred.', zh: '止血是初级评估里做的，永远不等。低血容量规程、TXA、止痛都要等一样东西：基础生命体征。先启动规程后量体征：−100%。' } },

    { kind: 'scene', time: '14:09', text: { en: 'Partner: "BP 88 over 56. Heart rate 128. Resps 28. Sats 93 on room air. Alert, GCS 15. He says he weighs 176 pounds."', zh: '搭档：「血压 88/56，心率 128，呼吸 28，血氧 93（不吸氧）。清醒，GCS 15。他说自己 176 磅。」' },
      vitals: { BP: '88/56', HR: 128, SpO2: '93%', RR: 28, Pain: '10/10' } },

    { kind: 'multi', key: 'hypo-all', q: { en: 'Hypovolemia protocol. Before the needle comes the part every licence level does. Pick all that apply.', zh: '低血容量规程。扎针之前，有一段是所有执照级别都要做的。全选。' }, opts: [
      { ok: true, en: 'Keep the external bleeding controlled', zh: '控制住外出血' },
      { ok: true, en: 'Stabilize the pelvis and fractures', zh: '固定骨盆和骨折' },
      { ok: true, en: 'Lie him flat (supine)', zh: '平躺（仰卧）' },
      { ok: true, en: 'Keep him warm', zh: '保暖' },
      { ok: true, en: 'Oxygen to SpO₂ of at least 94%', zh: '给氧到 SpO₂ ≥ 94%' },
      { en: 'Give him water to drink', zh: '给他喝水' },
      { en: 'Sit him up so he breathes easier', zh: '扶他坐起来好呼吸' },
      { en: 'Loosen the tourniquet every 15 minutes', zh: '每 15 分钟松一次止血带' }],
      then: { en: 'Five steps, and none of them needs a needle: bleeding, bones, flat, warm, oxygen.', zh: '五步，一步都不用针：止血、固定、平躺、保暖、给氧。' },
      teach: { en: 'Bleeding, bones, flat, warm, oxygen to ninety-four. Then your part as a PCP, on the way or while you are delayed: the IV, the bolus, and TXA. Being slow to lay a shock patient flat is minus five.', zh: '止血、固定、平躺、保暖、给氧到 94%。然后才是 PCP 的部分，在路上或者被耽搁时做：开静脉、补液、TXA。休克病人拖着不放平：−5%。' } },

    { kind: 'type', key: 'bolus', q: { en: 'He weighs 176 lb. The bolus at 20 mL/kg, in mL:', zh: '他 176 磅。按 20 mL/kg 补液，多少 mL：' }, answer: 1600, unit: 'mL', show: '1,600', placeholder: '?',
      hint: { en: '176 ÷ 2.2 = 80 kg. Then times 20.', zh: '176 ÷ 2.2 = 80 kg，再乘 20。' },
      teach: { en: 'Eighty kilos times twenty: sixteen hundred. The ceiling is two litres, and you reassess every five hundred.', zh: '80 kg × 20 = 1,600 mL。上限 2 L，每 500 mL 复评一次。' } },

    { kind: 'scene', time: '14:14', say: 'free', text: { en: 'IV in, the bolus is running, blanket under and over him. Fire lifts the coil. He is free. The thigh is crushed and bent in the middle at an angle no thigh should have. The tourniquet holds. No new bleeding.', zh: '静脉开好，液体在走，身下身上都垫了毯子。消防把钢卷吊起来，他出来了。大腿被压烂，中段弯成了一个不该有的角度。止血带没松，没有新的出血。' },
      teach: { en: 'A road note. BCEHS H02, crush injury, has you call CliniCall before the lift, run two litres of normal saline just before release, and put the pads on, ready for an arrest. The licensing exam has no crush protocol. There it is bleeding control and the hypovolemia protocol, the one you are running.', zh: '路上的做法：BCEHS H02（挤压伤）要你在起吊前打 CliniCall、松解前输 2 L 生理盐水、贴好除颤电极准备应对心脏骤停。执照考试没有挤压伤规程，考的就是止血 + 低血容量规程，也就是你现在跑的这个。' } },

    { kind: 'multi', key: 'txa-gates', q: { en: 'TXA is next. Which of these must be true before you push it? Pick all that apply.', zh: '下一步氨甲环酸 TXA。推药之前，下面哪些必须成立？全选。' }, opts: [
      { ok: true, en: 'The hypovolemia protocol is already started', zh: '低血容量规程已经启动' },
      { ok: true, en: 'Injured no more than 3 hours ago', zh: '受伤不超过 3 小时' },
      { ok: true, en: 'Age 12 or older', zh: '年龄 ≥ 12 岁' },
      { ok: true, en: 'Not an isolated head injury', zh: '不是单纯的颅脑损伤' },
      { ok: true, en: 'No known allergy to TXA', zh: '没有已知的 TXA 过敏' },
      { en: 'The whole bolus has finished', zh: '液体全部输完' },
      { en: 'The bleeding is external and you can see it', zh: '出血是看得见的外出血' },
      { en: 'The tourniquet has come off', zh: '止血带已经取下' }],
      then: { en: 'Five gates, all open: protocol running, injured at 12:05, he is 34, it is his leg, no allergy.', zh: '五道门全开：规程在跑、12:05 受的伤、34 岁、伤的是腿、没过敏。' },
      teach: { en: 'Five gates: protocol started, within three hours, twelve or older, not an isolated head injury, no allergy. TXA does not wait for the bolus to finish, and bleeding you cannot see counts as much as bleeding you can.', zh: '五道门：规程已启动、3 小时内、≥ 12 岁、不是单纯颅脑伤、没过敏。TXA 不用等液体输完；看不见的出血和看得见的一样算。' } },

    { kind: 'type', key: 'txa-min', time: '14:20', text: { en: 'It is 14:20. He was pinned at 12:05.', zh: '现在 14:20。他是 12:05 被压住的。' }, q: { en: 'How many minutes until the TXA window closes?', zh: '离 TXA 的时间窗关闭还有几分钟？' }, answer: 45, unit: 'min', placeholder: '?',
      hint: { en: 'Three hours after 12:05 is 15:05.', zh: '12:05 加三小时是 15:05。' },
      teach: { en: 'The window closes at five past three: forty-five minutes left. Past three hours TXA is contraindicated, so you ask the time of injury on every trauma call.', zh: '窗口 15:05 关：还剩 45 分钟。超过 3 小时 TXA 就是禁忌，所以每趟创伤都要问受伤时间。' } },

    { kind: 'type', key: 'txa-ml', q: { en: 'TXA 2 g. The vial is 100 mg/mL. How many mL do you draw up?', zh: '氨甲环酸 TXA 2 g，药瓶浓度 100 mg/mL。抽多少 mL？' }, answer: 20, unit: 'mL', placeholder: '?',
      hint: { en: '2 g is 2,000 mg.', zh: '2 g = 2,000 mg。' },
      teach: { en: 'Two thousand milligrams at a hundred per mL: twenty mL, IV push over one minute. Pushed faster, it can make his low pressure worse.', zh: '2,000 mg ÷ 100 mg/mL = 20 mL，静脉推注 1 分钟。推太快会加重低血压。' } },

    { kind: 'choose', key: 'traction', text: { en: 'Your partner looks at the bent thigh and reaches for the Sager. "Mid-shaft femur. Traction?"', zh: '搭档看着那条弯掉的大腿，伸手去拿 Sager 牵引夹板。「股骨干骨折，上牵引？」' }, q: { en: 'Traction splint?', zh: '上牵引夹板吗？' }, opts: [
      { ok: true, en: 'No. Traction is for a stable patient. One realignment, padded splint, joints above and below.', zh: '不上。牵引只给稳定的病人。复位一次、带衬垫的夹板、固定上下两个关节。', then: { en: '"He is unstable. No Sager. One realignment, splint, go." Right plan. Before anyone touches that leg, there is one more decision.', zh: '「他不稳定，不上 Sager。复位一次、上夹板、走。」方案对了。动那条腿之前，还有一个决定。' } },
      { en: 'Yes. Closed femur: 10% of body weight, up to 15 lb.', zh: '上。闭合性股骨骨折：体重的 10%，最多 15 磅。', then: { en: 'The numbers are right; the patient is wrong. Traction is for a suspected mid-shaft femur in a stable patient. BCEHS PR50 (Sager traction splint) lists clinically unstable as a contraindication.', zh: '数字对，病人不对。牵引用于疑似股骨干骨折的稳定病人。BCEHS PR50（Sager 牵引夹板）把「临床不稳定」列为禁忌。' } },
      { en: 'Yes, but there is a wound, so 5 lb at most.', zh: '上，但有伤口，最多 5 磅。', then: { en: 'Five pounds is the right ceiling for an open fracture, and he is still the wrong patient. Unstable: no traction, and no minutes spent on it.', zh: '开放性骨折上限 5 磅没错，可他还是不该上牵引的病人。不稳定：不上牵引，也不在这上面花时间。' } },
      { en: 'Leave the leg bent as it is and go.', zh: '腿就这么弯着，直接走。', then: { en: 'A severely deformed limb gets one attempt at realignment and a splint. Left loose, every bump on the road moves broken bone through crushed muscle.', zh: '严重变形的肢体要尝试复位一次并上夹板。不固定，路上每颠一下，断骨都在压烂的肌肉里动一次。' } }],
      teach: { en: 'Traction belongs to the stable patient with a suspected mid-shaft femur: ten percent of body weight up to fifteen pounds when closed, five pounds when open. He is unstable, so no Sager. One realignment, a padded splint, the joints above and below.', zh: '牵引属于疑似股骨干骨折的稳定病人：闭合性按体重 10%、最多 15 磅；开放性最多 5 磅。他不稳定，不上 Sager。复位一次、带衬垫夹板、固定上下关节。' } },

    { kind: 'choose', key: 'analgesia', time: '14:22', text: { en: 'He grabs your sleeve. "The strap is killing me. Please do not touch my leg." Pain 10 out of 10. No allergies, no blood thinners, no ulcer, no liver disease. Chest clear, no head injury, alert. Your partner: "Tylenol and Advil now, straighten and splint, and the gas in the truck."',
      zh: '他抓住你的袖子。「这带子勒死我了。求你别碰我的腿。」疼痛 10 分。没有过敏、没吃抗凝药、没有溃疡、没有肝病。胸部没问题、没有头伤、清醒。搭档：「先吃对乙酰氨基酚 acetaminophen (Tylenol) 和布洛芬 ibuprofen (Advil)，拉直上夹板，笑气 Entonox 上车再吸。」' },
      q: { en: 'Your call?', zh: '你怎么定？' }, opts: [
      { ok: true, en: 'Gas first: Entonox in his own hand now, acetaminophen 1,000 mg and ibuprofen 400 mg alongside, then one realignment.', zh: '先吸气：现在就让他自己拿着吸笑气 Entonox，同时口服对乙酰氨基酚 acetaminophen 1,000 mg + 布洛芬 ibuprofen 400 mg，然后复位一次。', then: { en: 'Pain score asked, vitals done, contraindications ruled out, cylinder inverted three times. He breathes it himself while the stretcher comes over. Four minutes later: "Six. Do it." The leg comes straight on the first try.', zh: '疼痛评分问过、生命体征量过、禁忌排除了、气瓶倒置三次。担架推过来的工夫他自己吸着。四分钟后：「六分。来吧。」一次就把腿拉直了。' } },
      { en: 'Your partner’s plan: tablets now, straighten and splint, gas in the truck.', zh: '照搭档说的：先吃药，拉直上夹板，上车再吸笑气。', then: { en: 'He screams through the realignment on two tablets that have not started to work. Grading Appendix A, line 6: tablets given and Entonox held until after the realignment is minus 100.', zh: '两片药还没起效，复位的时候他惨叫到底。评分附录 A 第 6 条：口服药给了、笑气 Entonox 拖到复位之后：−100%。' } },
      { en: 'Tablets only. He is in shock, so no Entonox.', zh: '只给口服药。他休克了，不能吸笑气。', then: { en: 'Shock is a caution for Entonox, not a contraindication: you say it out loud and you watch him. Entonox indicated, not given, and the limb realigned anyway: minus 100.', zh: '休克是笑气 Entonox 的「慎用」，不是禁忌：说出来，然后盯着他。笑气有指征却没给，还照样复位了：−100%。' } },
      { en: 'Entonox only. Skip the tablets.', zh: '只吸笑气，不吃药。', then: { en: 'The leg comes straight and he copes. But the gas stops working when the mouthpiece comes out, and both tablets were indicated: minus 10.', zh: '腿拉直了，他也扛住了。可咬嘴一拿开笑气就不管用了，而两种口服药都有指征：−10%。' } },
      { en: 'Loosen the tourniquet one turn. That is what hurts.', zh: '把止血带松一圈，疼的就是它。', then: { en: 'Bright red blood wells up within seconds. Once it is on, it is never loosened. You treat the pain, not the strap.', zh: '几秒钟鲜红的血又涌出来了。止血带上了就不松。治的是疼，不是带子。' } }],
      teach: { en: 'The order is the trap. The gas works in minutes and the tablets take far longer, so the gas goes on before you move the limb, and the tablets ride alongside. Miss the tablets: minus ten. Miss the gas: minus twenty-five. Gas after the realignment: minus one hundred. Shock is a caution for Entonox and low volume is a caution for acetaminophen, so say both and watch his pressure and how awake he is. And starting the gas is not a transport delay. One road note: BCEHS holds ibuprofen in severe active bleeding.',
        zh: '陷阱就在顺序。笑气 Entonox 几分钟起效，口服药慢得多，所以动肢体之前先吸上气，口服药同时给。缺口服药 −10%；缺笑气 −25%；笑气晚于复位 −100%。休克是笑气的慎用项、低血容量是对乙酰氨基酚 acetaminophen 的慎用项：两条都说出来，盯住血压和意识。启动止痛规程不算延误转运。路上有一点不同：BCEHS 在严重活动性出血时不给布洛芬 ibuprofen。' } },

    { kind: 'choose', key: 'after-move', time: '14:31', text: { en: 'Splinted, strapped to the stretcher, lifted into the truck.', zh: '夹板上好，在担架上系好带，抬上车。' }, q: { en: 'First thing after the move?', zh: '搬动之后第一件事？' }, opts: [
      { ok: true, en: 'Reassess ABCs and every intervention: tourniquet, bleeding, splint, IV.', zh: '复评 ABC 和每一项干预：止血带、出血、夹板、静脉通路。', then: { en: 'Airway clear, breathing 24, radial pulse stronger. Tourniquet tight, no new blood, splint intact, IV running. Twenty seconds.', zh: '气道通、呼吸 24、桡动脉搏动变强。止血带紧、没有新出血、夹板完好、液体在走。二十秒。' } },
      { en: 'Drive. Everything was fine two minutes ago.', zh: '开车。两分钟前一切都好。', then: { en: 'The move is exactly when a tourniquet slips or a line pulls out. No ABC reassessment after a major move: minus 15.', zh: '止血带滑脱、针头被扯掉，恰恰就在搬动的时候。大的搬动后不复评 ABC：−15%。' } },
      { en: 'A full set of vitals first.', zh: '先量一整套生命体征。', then: { en: 'Vitals are coming, but after a move the ABCs and your interventions come first. Skip them: minus 15.', zh: '生命体征马上量，但搬动之后先看 ABC 和你做过的干预。漏了：−15%。' } },
      { en: 'Call the hospital first.', zh: '先给医院打电话。', then: { en: 'The call matters, and missing it for a critical patient is minus 5. But a slipped tourniquet kills faster than a late phone call. ABCs first.', zh: '通知医院重要，危重病人没通知要 −5%。但滑脱的止血带比晚打的电话要命得多。先 ABC。' } }],
      teach: { en: 'After every major move: airway, breathing, circulation, and every intervention you placed. Then the clock: vitals again, the next five hundred of fluid, and the hospital notification.', zh: '每次大的搬动之后：气道、呼吸、循环，再加你做过的每一项干预。然后才是时间表：再量生命体征、下一个 500 mL、通知医院。' } },

    { kind: 'header', say: 'recall', text: { en: 'Trauma bay. Hand-over done: tourniquet time, first and last vitals, fluid in, TXA time. Now, before it fades: no story, just the numbers.', zh: '创伤室，交接完：止血带时间、第一组和最后一组生命体征、输了多少液、TXA 时间。趁还没忘：不讲故事，只问数字。' },
      teach: { en: 'Quick round. Type what you would say to the examiner.', zh: '快问快答。打出你会对考官说的那个数。' } },

    { kind: 'type', key: 'r-load', q: { en: 'A priority patient is ready to load within how many minutes?', zh: '优先病人要在几分钟内准备好装车？' }, answer: 15, unit: 'min', placeholder: '?',
      hint: { en: 'Half of the non-priority number.', zh: '是非优先病人那个数的一半。' }, teach: { en: 'Fifteen for priority, thirty for non-priority.', zh: '优先 15 分钟，非优先 30 分钟。' } },
    { kind: 'type', key: 'r-max', q: { en: 'Hypovolemia bolus: the ceiling, in mL?', zh: '低血容量补液：上限多少 mL？' }, answer: 2000, unit: 'mL', show: '2,000', placeholder: '?',
      hint: { en: 'Two bags of one litre.', zh: '两袋 1 升的。' }, teach: { en: 'Twenty per kilo, never more than two thousand, reassess every five hundred.', zh: '20 mL/kg，最多 2,000 mL，每 500 mL 复评。' } },
    { kind: 'type', key: 'r-age', q: { en: 'TXA: the youngest age, in years?', zh: 'TXA：最小几岁可以给？' }, answer: 12, placeholder: '?',
      hint: { en: 'Not a small child. The start of the teens.', zh: '不是小小孩，快进青春期那个年纪。' }, teach: { en: 'Twelve. Under twelve, no TXA.', zh: '12 岁。不满 12 岁不给 TXA。' } },
    { kind: 'type', key: 'r-invert', q: { en: 'Entonox: how many times do you invert the cylinder before use?', zh: '笑气 Entonox：用之前气瓶倒置几次？' }, answer: 3, placeholder: '?',
      hint: { en: 'Fewer than five.', zh: '不到五次。' }, teach: { en: 'Three times, and the truck fans on.', zh: '三次，车里开通风。' } },

    { kind: 'end' },
  ],
};
