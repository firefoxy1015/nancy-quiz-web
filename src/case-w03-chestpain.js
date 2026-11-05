// Weekend 3 case level: the cardiac chest pain call. Facts and marks are the Weekend 3 condensed book's (EMALB Exam
// Guidelines p.47 cardiac chest pain, p.60 ASA, p.73 nitroglycerin, p.65 Entonox; EMALB Grading Criteria p.33–34;
// BCEHS C01 acute coronary syndrome, C05 aortic dissection, PR16 12-lead acquisition). Clips: w03-lab-chestpain-<key>.
export const LEVEL = {
  id: 'w03-chestpain', wk: 3, clip: 'w03-lab-chestpain-',
  title: { en: 'Chest pain call', zh: '胸痛出车' },
  endTitle: { en: 'Hospital. Hand-over done.', zh: '到院，交接完成。' },
  outro: { en: 'That is the call. Whatever you missed comes back at the start of your next run, until it sticks. See you on the next one.', zh: '这趟车跑完了。没记住的会在你下次开头再出现，直到记住为止。下一趟见。' },
  steps: [
    { kind: 'scene', time: '14:10', say: 'intro',
      text: { en: 'Dispatch: 58-year-old male, chest pain. You walk in. He is on the edge of the couch, grey, sweating, one hand flat on his chest. "Like someone is standing on it. Twenty minutes."',
        zh: '调度：58 岁男性，胸痛。你进门。他坐在沙发边上，脸色发灰、出汗，一只手按在胸口。「像有人站在我胸上，二十分钟了。」' },
      teach: { en: 'This is the call the exam loves. From here every decision is a mark gained or a mark lost. You decide first; I talk after.', zh: '这是考试最爱考的一趟车。从现在起每个决定都是得分或扣分。你先决定，我后说话。' } },

    { kind: 'choose', key: 'first', q: { en: 'First move?', zh: '第一件事做什么？' }, opts: [
      { en: 'Monitor on, 12-lead now. This is a STEMI until proven otherwise.', zh: '先接监护仪、马上做 12 导，没排除前就当 STEMI。',
        then: { en: 'Six minutes gone. Wires everywhere, no aspirin in him, the truck is not moving. On the exam that is the protocol out of order: minus 100%.', zh: '六分钟过去了。满地导线，阿司匹林没吃，车没动。考试里这叫规程顺序错：−100%。' } },
      { ok: true, en: 'Position of comfort, limit his activity, primary survey. Oxygen only if SpO₂ is under 94%.', zh: '舒适体位、别让他动，做初级评估。SpO₂ 低于 94% 才给氧。',
        then: { en: 'He settles back. Your partner reads SpO₂ 97%: no oxygen needed. You have ten seconds to think about the next thing.', zh: '他靠回去了。搭档报 SpO₂ 97%：不用给氧。你有十秒想下一步。' } },
      { en: 'Nitro spray right now, he is in pain.', zh: '他疼，先喷一下硝酸甘油。',
        then: { en: 'No vitals, no gates checked, one spray into an unknown blood pressure. Exam: a drug before baseline vitals, minus 100%.', zh: '没量生命体征，四道门一道没查，往一个未知的血压里喷药。考试：给药前没做基础生命体征，−100%。' } },
      { en: 'Start an IV first, he will need it.', zh: '先开静脉，反正要用。',
        then: { en: 'The IV is a PCP add-on, after the pill, after the wheels are turning. He is still sitting here with a blocked artery.', zh: '静脉是 PCP 加项，排在嚼药和启动转运之后。他还坐在这儿，血管还堵着。' } }],
      teach: { en: 'The protocol has no ECG step and no IV step at the top. Comfort, primary survey, then the pill he can chew. The monitor comes later, in the truck.', zh: '规程开头没有 ECG，也没有静脉。舒适体位、初级评估，然后是他能嚼的那片药。监护仪晚点，上车再说。' } },

    { kind: 'choose', key: 'asa', text: { en: 'He says: "I took a baby aspirin, 81 milligrams, about an hour ago."', zh: '他说：「一个小时前我自己吃了一片小儿阿司匹林，81 mg。」' },
      q: { en: 'Aspirin?', zh: '给不给阿司匹林 ASA？' }, opts: [
      { en: 'No. He has already taken aspirin, that is a contraindication.', zh: '不给。他已经吃过阿司匹林了，这是禁忌。',
        then: { en: 'The contraindication reads "already had the recommended dose". 81 mg is not 160 mg. He just lost his antiplatelet.', zh: '禁忌写的是「已服过推荐剂量」。81 mg 不是 160 mg。他的抗血小板药就这么没了。' } },
      { ok: true, en: 'Yes: 160 mg chewed, right after the rapid body survey. 81 mg is not the recommended dose.', zh: '给：160 mg 嚼碎吞服，快速全身检查之后。81 mg 不算推荐剂量。',
        then: { en: '"Chew these, don\'t swallow them whole." He chews. Forty seconds, done.', zh: '「嚼碎，别整片吞。」他嚼了。四十秒，搞定。' } },
      { en: 'Yes, but only after a full set of baseline vitals.', zh: '给，但要先量完一套基础生命体征。',
        then: { en: 'Aspirin is the one drug that does not wait for vitals. Every minute on the cuff first is a minute of platelets piling up.', zh: '阿司匹林是唯一不用先量生命体征的药。你先量血压的每一分钟，血小板都在堆。' } },
      { en: 'Yes, 320 mg, he needs the full dose.', zh: '给，320 mg，要给足。',
        then: { en: 'Dispatch may have said 320 on the phone, but your monograph says 160 mg. Say the number the examiner is holding.', zh: '调度电话里可能让他嚼 320，但你的专论写的是 160 mg。说考官手里那个数。' } }],
      teach: { en: 'ASA, 160 milligrams, chewed. The only drug that goes in before vitals, right after the rapid body survey. The contraindication is the recommended dose already taken, and a baby aspirin is not that.', zh: '阿司匹林 ASA，160 mg，嚼服。唯一一个排在生命体征前面的药，快速全身检查之后就给。禁忌是「已服过推荐剂量」，一片小儿阿司匹林不算。' } },

    { kind: 'type', key: 'asa-dose', q: { en: 'Before it goes in, say the dose out loud. Type it:', zh: '给药前把剂量说出口。打出来：' }, answer: 160, unit: 'mg', placeholder: '?',
      hint: { en: 'Two 80 mg tablets, chewed.', zh: '两片 80 mg 的，嚼。' },
      teach: { en: '160. Not 81, not 320. 160, chewed.', zh: '160。不是 81，不是 320。160，嚼。' } },

    { kind: 'order', key: 'order', text: { en: 'Your partner is back with the stretcher.', zh: '搭档把担架推进来了。' }, q: { en: 'Tap the protocol steps in order.', zh: '按规程顺序点这四步。' },
      items: [{ en: 'ASA chewed', zh: '阿司匹林 ASA 嚼服' }, { en: 'Initiate transport', zh: '启动转运' }, { en: 'History + baseline vitals', zh: '病史 + 基础生命体征' }, { en: 'Nitroglycerin', zh: '硝酸甘油 nitroglycerin' }], answer: [0, 1, 2, 3],
      teach: { en: 'Pill, wheels, numbers, spray. Aspirin, start transport, history and baseline vitals, then nitro. If you can move him, move him before you measure him.', zh: '药、轮子、数字、喷雾。阿司匹林、启动转运、病史加基础生命体征、再硝酸甘油。能走就先走，再量。' } },

    { kind: 'scene', time: '14:16', text: { en: 'In the truck, doors shut, rolling. Partner: "BP 142 over 88, heart rate 92, sats 97, resps 20. Pain still 8 out of 10." No Viagra, no Cialis, no nitrate allergy.',
      zh: '上车，关门，开动。搭档：「血压 142/88，心率 92，血氧 97，呼吸 20。疼还是 8 分。」没用过 Viagra、Cialis，没有硝酸酯过敏。' },
      vitals: { BP: '142/88', HR: 92, SpO2: '97%', RR: 20, Pain: '8/10' } },

    { kind: 'multi', key: 'gates', q: { en: 'Nitro is next. Which gates must pass before the first spray? Pick all that apply.', zh: '下一步硝酸甘油。第一喷之前必须过哪几道门？全选。' }, opts: [
      { ok: true, en: 'SBP over 110', zh: '收缩压 > 110' },
      { en: 'SpO₂ at least 94%', zh: 'SpO₂ ≥ 94%' },
      { ok: true, en: 'Heart rate 50 to 150', zh: '心率 50–150' },
      { en: 'Pain at least 5 out of 10', zh: '疼痛 ≥ 5 分' },
      { ok: true, en: 'No Viagra or Levitra in 24 h, no Cialis in 48 h', zh: '24 小时内没用 Viagra/Levitra，48 小时内没用 Cialis' },
      { en: 'Age under 70', zh: '年龄 < 70' },
      { ok: true, en: 'No nitrate allergy', zh: '没有硝酸酯过敏' }],
      then: { en: 'Four gates, all open: 142, 92, no PDE5 drug, no allergy.', zh: '四道门全开：142、92、没用过那三种药、没过敏。' },
      teach: { en: 'Four gates, before every dose: pressure over 110, rate 50 to 150, no PDE5 drug, no nitrate allergy. Oxygen is primary-survey business, not a nitro gate. Assuming a gate is clear without checking: minus 25.', zh: '四道门，每一剂之前都过：收缩压 > 110、心率 50–150、没用过 Viagra/Levitra/Cialis、没有硝酸酯过敏。血氧是初级评估的事，不是硝酸甘油的门。没评估就当没禁忌：−25%。' } },

    { kind: 'type', key: 'nitro-dose', q: { en: 'All four gates pass. Dose per spray, in mg:', zh: '四道门全过。每喷的剂量，mg：' }, answer: 0.4, unit: 'mg', show: '0.4', placeholder: '?',
      hint: { en: 'Less than one milligram. Sublingual.', zh: '不到 1 mg。舌下。' },
      teach: { en: 'Zero point four under the tongue, every three to five minutes, up to three in thirty minutes, and the pressure gate again before each one.', zh: '0.4 mg 舌下，每 3–5 分钟一次，30 分钟内最多 3 剂，每一剂之前血压那道门再过一次。' } },

    { kind: 'choose', key: 'prime', q: { en: 'Spray in hand. The one thing people forget costs 10%:', zh: '喷雾拿在手里。有一件事大家总忘，扣 10%：' }, opts: [
      { en: 'Shake the bottle first', zh: '先摇一摇瓶子', then: { en: 'Never shake it. And that is not the thing you forgot.', zh: '喷雾不能摇。而且你忘的也不是这个。' } },
      { ok: true, en: 'Say out loud that you are priming the spray', zh: '口述「预充喷雾」', then: { en: '"Priming the spray. Zero point four under the tongue." The examiner\'s pen stays still.', zh: '「预充喷雾，0.4 mg 舌下。」考官的笔没动。' } },
      { en: 'Lay him flat first', zh: '先让他躺平', then: { en: 'Position of comfort, not flat. His pressure will drop soon enough without your help.', zh: '舒适体位，不是躺平。他的血压一会儿不用你帮忙也会掉。' } },
      { en: 'Tell him to swallow it', zh: '让他吞下去', then: { en: 'Sublingual. Under the tongue, not swallowed.', zh: '舌下。含在舌下，不是吞。' } }],
      teach: { en: 'Say the priming out loud. No shaking, no swallowing, no dawdling between doses: a moderate delay between sprays is minus 25.', zh: '预充要说出口。不摇、不吞、两剂之间不拖：拖延 −25%。' } },

    { kind: 'choose', key: 'wall', time: '14:19', strip12: { kind: 'inferior', seed: 7 },
      text: { en: 'Partner hands you the 12-lead print. Read it.', zh: '搭档把 12 导打印条递给你。读一下。' },
      q: { en: 'Where is it?', zh: '病在哪面墙？' }, opts: [
      { ok: true, en: 'Inferior wall: II, III, aVF. Right coronary.', zh: '下壁：II、III、aVF。右冠。', then: { en: 'ST up 2 to 3 mm in II, III and aVF, mirror down in I and aVL. Inferior STEMI.', zh: 'II、III、aVF ST 抬高 2–3 mm，I、aVL 镜像压低。下壁 STEMI。' } },
      { en: 'Anterior wall: V3, V4. LAD.', zh: '前壁：V3、V4。左前降支。', then: { en: 'V3 and V4 are quiet. Look again at II, III and aVF: neighbours up, and I and aVL mirror down.', zh: 'V3、V4 没动静。再看 II、III、aVF：相邻导联抬高，I、aVL 镜像压低。' } },
      { en: 'Lateral wall: I, aVL, V5, V6. Circumflex.', zh: '侧壁：I、aVL、V5、V6。回旋支。', then: { en: 'I and aVL are down, not up. That is the mirror of something. Find the wall that is up.', zh: 'I、aVL 是压低，不是抬高。那是别处的镜像。找抬高的那面墙。' } },
      { en: 'Septal: V1, V2. LAD.', zh: '间隔：V1、V2。左前降支。', then: { en: 'V1 and V2 are flat. The elevation is in the limb leads at the bottom of the print.', zh: 'V1、V2 是平的。抬高在打印条下面那排肢体导联。' } }],
      teach: { en: 'Two or more neighbouring leads up, the mirror image down: STEMI, inferior wall, right coronary. The right coronary also feeds the right ventricle and the AV node. Hold that thought, you need it in three minutes.', zh: '两个以上相邻导联抬高，对侧镜像压低：STEMI，下壁，右冠。右冠还供右室和房室结。记住这句，三分钟后要用。' } },

    { kind: 'choose', key: 'nitro2', time: '14:22', vitals: { BP: '96/60', HR: 54, Pain: '7/10' },
      text: { en: 'Three minutes after the first spray. Pain 7 out of 10. Partner: "BP 96 over 60. Heart rate 54."', zh: '第一喷后三分钟。疼 7 分。搭档：「血压 96/60，心率 54。」' },
      q: { en: 'Second nitro?', zh: '第二剂硝酸甘油？' }, opts: [
      { en: 'Yes. Still in pain, it is due.', zh: '给。还疼，到时间了。', then: { en: 'Thirty seconds later he is grey and mumbling. Systolic 72. The nitro took the preload his right ventricle was living on.', zh: '三十秒后他脸色发灰、说话含糊。收缩压 72。硝酸甘油把右室赖以生存的前负荷抽走了。' } },
      { ok: true, en: 'No. SBP 96 fails the gate, and inferior STEMI with a falling pressure and a slow rate says right ventricle.', zh: '不给。收缩压 96 过不了门，下壁 STEMI 加血压往下掉、心率慢，就是右室受累。', then: { en: '"Holding the nitro, pressure 96." You open the IV and run fluid instead.', zh: '「硝酸甘油暂停，血压 96。」你改开静脉跑液。' } },
      { en: 'Half a dose.', zh: '给半剂。', then: { en: 'There is no half dose in the monograph, and a gate is a gate.', zh: '专论里没有半剂，门就是门。' } },
      { en: 'Switch to Entonox now.', zh: '现在改笑气。', then: { en: 'Entonox waits five minutes after the last nitro, and is for three doses failed or nitro contraindicated. He has had one.', zh: '笑气要等最后一剂硝酸甘油 5 分钟后，而且是 3 剂无效或禁忌才用。他才一剂。' } }],
      teach: { en: 'The gate is 110 and it is checked before every dose, not just the first. Inferior STEMI plus a dropping pressure plus bradycardia is the nitro trap: the right ventricle lives on its preload. Hold the spray, open the line, run fluid.', zh: '门槛是 110，每一剂之前都查，不只第一剂。下壁 STEMI + 血压往下掉 + 心动过缓，就是硝酸甘油陷阱：右室要靠前负荷。停喷雾，开静脉，跑液。' } },

    { kind: 'choose', key: 'stemi', q: { en: 'He meets STEMI criteria. What happens now?', zh: '他符合 STEMI 标准。现在做什么？' }, opts: [
      { en: 'Pull over and repeat the 12-lead in ten minutes to be sure.', zh: '靠边停，十分钟后重做 12 导确认。', then: { en: 'Ten minutes of muscle. Repeat it on the way, not on the shoulder.', zh: '十分钟的心肌。路上重做，别停在路肩上做。' } },
      { ok: true, en: 'Request ACP intercept, pads anterior-lateral with wires toward the head, transmit, early notification or the PCP STEMI pathway if under 60 minutes.', zh: '请求 ACP 拦截，电极前侧位、导线朝头，传输，提前通知医院，或 < 60 分钟走 PCP STEMI 通路。',
        then: { en: '"STEMI criteria met in the inferior leads. Requesting intercept, transmitting now." The hospital is waiting when you arrive.', zh: '「下壁导联符合 STEMI 标准。请求拦截，现在传输。」到院时医院已经等着了。' } },
      { en: 'Give Entonox for the pain.', zh: '给笑气止痛。', then: { en: 'Five minutes after the last nitro, and only when nitro failed or is blocked. Not the headline here.', zh: '最后一剂硝酸甘油 5 分钟后，且硝酸甘油无效或禁忌才用。现在的重点不是它。' } },
      { en: 'Two more aspirin.', zh: '再给两片阿司匹林。', then: { en: 'One dose. Aspirin is never repeated on this call.', zh: '就一剂。这趟车阿司匹林不重复。' } }],
      teach: { en: 'Four moves: intercept, pads, transmit, notify. Keep the wheels turning. Open the IV, but never delay transport for it.', zh: '四个动作：拦截、电极、传输、通知。轮子别停。静脉可以开，但绝不为它拖转运。' } },

    { kind: 'header', say: 'recall', text: { en: 'Hospital. Hand-over done. Now, before it fades: no story, just the numbers.', zh: '到院，交接完。趁还没忘：不讲故事，只问数字。' },
      teach: { en: 'Quick round. Type what you would say to the examiner.', zh: '快问快答。打出你会对考官说的那个数。' } },

    { kind: 'type', key: 'r-max', q: { en: 'Nitro: maximum doses in 30 minutes?', zh: '硝酸甘油：30 分钟内最多几剂？' }, answer: 3, placeholder: '?',
      hint: { en: 'Fewer than four.', zh: '不到四。' }, teach: { en: 'Three in thirty minutes.', zh: '30 分钟内 3 剂。' } },
    { kind: 'type', key: 'r-sbp', q: { en: 'Nitro: systolic must be above…', zh: '硝酸甘油：收缩压必须大于…' }, answer: 110, unit: 'mmHg', placeholder: '?',
      hint: { en: 'Between 100 and 120.', zh: '100 到 120 之间。' }, teach: { en: '110, before every single dose.', zh: '110，每一剂之前。' } },
    { kind: 'type', key: 'r-entonox', q: { en: 'Three sprays, still in pain. Minutes after the last nitro before Entonox?', zh: '三剂后还疼。最后一剂硝酸甘油后几分钟才能给笑气？' }, answer: 5, unit: 'min', placeholder: '?',
      hint: { en: 'The Entonox contraindication says "nitro within … minutes".', zh: '笑气的禁忌写着「… 分钟内用过硝酸甘油」。' },
      teach: { en: 'Five. And twenty minutes on Entonox without arriving: stop it, high-flow oxygen, back to nitro.', zh: '5 分钟。吸着笑气 20 分钟还没到院：停笑气、高流量氧、回到硝酸甘油。' } },
    { kind: 'choose', key: 'r-dissect', text: { en: 'Different call. "It tears through to my back." Right arm 142/88, left arm 108/70.', zh: '另一趟车。「疼得像撕开，穿到后背。」右臂 142/88，左臂 108/70。' },
      q: { en: 'Aspirin and nitro?', zh: '阿司匹林和硝酸甘油？' }, opts: [
      { en: 'Both, it is chest pain.', zh: '都给，这是胸痛。', then: { en: 'An antiplatelet and a vasodilator in a torn aorta: both are harm.', zh: '撕开的主动脉里给抗血小板和扩血管：都是伤害。' } },
      { en: 'ASA only.', zh: '只给阿司匹林。', then: { en: 'He may be bleeding into his own chest. No antiplatelet.', zh: '他可能正在往自己胸腔里出血。不给抗血小板。' } },
      { en: 'Nitro only.', zh: '只给硝酸甘油。', then: { en: 'Dropping the pressure does not close a tear, and the arm difference does not rule anything out either way.', zh: '把血压降下来堵不住撕裂，双臂血压差也不能用来排除或确认。' } },
      { ok: true, en: 'Neither. This does not suggest cardiac chest pain: suspected dissection.', zh: '都不给。这个表现不提示心源性胸痛：疑主动脉夹层。', then: { en: '"This presentation does not suggest cardiac chest pain. Suspected dissection, no ASA, no nitro." That sentence is the exam.', zh: '「这个表现不提示心源性胸痛，疑主动脉夹层，不给阿司匹林、不给硝酸甘油。」这句话就是考试。' } }],
      teach: { en: 'Say why it is not cardiac before you say what you are not giving. Dissection gets neither drug, and the arm pressures cannot rule it out.', zh: '先说为什么不是心源性，再说不给什么。夹层两种药都不给，双臂血压差也不能用来排除它。' } },

    { kind: 'end' },
  ],
};
