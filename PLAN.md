# BC EMR/PCP 考证系统重做计划 (v2.0)

> 目标：把 nancy-quiz-web 从"Nancy 教材刷题网站"重做成一套**完整对齐 BC 省官方考试要求**的 EMR/PCP 备考系统，覆盖笔试（Written）、法规考（Jurisprudence）、实操考（Practical）三大关卡。
>
> 计划版本：v1.0 · 2026-07-25
> 调研依据：全部来自 2026 年现行官方文件（见文末来源清单），非记忆、非二手资料。

---

## 一、官方考试要求（调研结论）

### 1.1 BC 省发牌体系总览

BC 省急救人员（EMA = Emergency Medical Assistant）由 **EMALB**（Emergency Medical Assistants Licensing Board，卫生厅下属发牌委员会）发牌。等级：EMR → PCP → ACP → CCP。

**拿牌 = 完成认可课程 + 通过全部考试 + 申请牌照。** 所有考试必须在**课程结业后 12 个月内**全部通过。每门考试最多 **3 次机会**，3 次全挂需重读课程。

### 1.2 EMR 考试（三关）

| 关卡 | 主办方 | 题量/时长 | 及格线 | 补考规则 |
|---|---|---|---|---|
| Jurisprudence（法规考） | EMALB 在线 | 25 题 / 不限时 | **80%** | 挂1次可立刻重考；挂2次等5天后终考 |
| Written（笔试） | **EMALB 自己的在线考试**（不是 COPR！） | **200 题 / 2.5 小时** | **75%** | 挂1次等2天；挂2次等5天 |
| Practical（实操） | EMALB 线下考官 | **2 个场景：1 medical + 1 trauma**，每场 40 分钟 | 每场 **70%**（扣分制） | 挂哪类补哪类 |

⚠️ 实操必须先通过 Written + Jurisprudence 才给排期。全省 7 个考点（Victoria、温哥华岛、Lower Mainland、Vernon、Kootenays、Prince George、东北 BC）。

### 1.3 PCP 考试（三关）

| 关卡 | 主办方 | 题量/时长 | 及格线 | 费用 |
|---|---|---|---|---|
| Jurisprudence | EMALB 在线 | 25 题 / 不限时 | 80% | — |
| Written（笔试） | **COPR 全国统考**（机考，Meazure Learning 监考） | **200 题（180 计分）/ 两部分各 120 分钟，中间休息 10 分钟** | 标准分制（Standard Score），无固定百分比 | **$650/次** + 税 |
| Practical（实操） | EMALB 线下考官 | 2 个场景：1 medical + 1 trauma，每场 40 分钟 | 每场 70%（扣分制） | — |

**COPR 考试关键事实：**
- **在家远程考，不去考场**（"The EMR, PCP, and ACP Examinations are offered using online proctoring"）。实体考场只留给获批需要它的 testing accommodation 考生，名额有限。设备与环境要求极严（台式/笔记本、Guardian Browser、单显示器、上传≥3Mbps、360°房扫+镜子照屏、禁耳机、桌面清空、迟到15分钟作废）。
- 2027 年考生**必考 CPCF 版**（NOCP 版 2026 年 11 月后彻底停办）。
- 一年 4-5 场（2026 年：2/11、5/6、7/8、9/9、11/12），报名截止约考前 4 周，考前约 3 周预约座位与连线时间，成绩考后 3-4 周出。
- 出分带**八大能力域红/黄/浅绿/深绿弱项报告**——我们的模拟考应该复刻这个报告样式。
- 官方有 60 题 Preparatory Test（$—另购）；挂科可花 $200 人工核分。
- **次数**：课程结业后 12 个月内最多 3 次；⚠️ 手册明写重修/重读课程**不会**重置次数与时限，需省级监管机构（EMALB）签发 Eligibility Confirmation Letter 才能再考。

### 1.4 COPR PCP 笔试蓝图（CPCF 2024 版，出题权重）

八大能力域（Competence Areas）：

| 域 | 名称 | 权重 | 题数范围(180计分) |
|---|---|---|---|
| A | Professionalism 职业素养 | 4% | 7-9 |
| B | Patient- and Community-Centred Communication 沟通 | 5% | 9-11 |
| C | Integrated Collaborative Health Care 协作 | 5% | 9-11 |
| D | Continuous Learning and Adapting to Evidence 循证学习 | 3% | 5-7 |
| E | Health of Professional 从业者健康 | 5% | 9-11 |
| F | Advocacy for Health, Equity, and Justice 健康公平倡导 | 5% | 9-11 |
| G | Leadership 领导力 | 3% | 5-7 |
| **H** | **Care Along a Health and Social Continuum 临床照护** | **70%** | **126-154** |

H 域内部：H1（临床实践综合）19.44%、**H2（评估/诊断/临床推理）68.33% ≈ 86-106 题**、H3（照护计划）12.22%、H4 不考。

认知层级：Knowledge 30% / **Application 50%** / Critical Thinking 20% —— 一半以上是情境应用题，死记硬背过不了。
患者人群（约6成题目含患者）：新生儿 5% / 儿科 15% / 成人 45% / **老年 35%**（老年权重远超直觉，题库必须体现）。

（EMR 的 COPR 蓝图虽然 BC 不用，但结构相同：125 题/2.5h，H 域 70%，认知层级 Knowledge 50%/Application 35%/CT 15% —— 保留做参考，因为 EMALB 自己的 EMR 笔试没有公开蓝图，CPCF 是最接近的官方结构。）

### 1.5 实操考试规则（EMR/PCP 通用，扣分制）

**流程与计时（写死在考纲里，必须练成肌肉记忆）：**
- 每场 40 分钟封顶，另加 5 分钟写 PCR（患者护理报告）。
- **RTC（危重/Priority）患者：15 分钟内完成评估+打包准备转运**，剩 25 分钟"去医院"。
- **非 RTC（稳定）患者：30 分钟内打包**，剩 10 分钟。
- 生命体征复测间隔：Priority 超过 7-8 分钟扣 Moderate、超 9 分钟扣 Major；非 Priority 17-18 分钟 Moderate、19+ 分钟 Major。
- 必须**动手做**，不能嘴说"我会做什么"；边做边 narrate。

**评分：100% 起步往下扣，≥70% 过。** 扣分权重（来自官方 39 页评分手册，已全文拿到）：

| 考核块 | 最重扣分 | 说明 |
|---|---|---|
| Scene Assessment + PPE | 5/3/1% | 上手前必须口述 Hazards/Env/MOI/患者数 + 戴 PPE |
| Primary Survey: LOC(AVPU) | 15/5/3% | 必须口述 AVPU 定位 |
| Delicate Spine | **100%**/15/5% | 该上 C-spine 不上 = 直接挂 |
| Airway | **100%**/15/5% | 不评估气道 = 直接挂 |
| Breathing | **100%**/15/5% | 呼吸异常不立刻干预 = 直接挂 |
| Circulation | **100%**/15/5% | 无脉不 CPR = 直接挂 |
| Rapid Body Survey | **100%**/15/10% | 找到致命出血不控制 = 直接挂 |
| Skin / Oxygen / Position | 5-15% | 氧疗给错装置或流量 = 15% |
| **Transport 决策（RTC 判断）** | **25%**/15/10% | 分类错误+超时打包是最常见挂点 |
| History: C/C, HxC/C (OPQRRRST/LOTARP) | 15/5/3% | |
| History: PMHx / Meds / Allergies / LOI | 各 5/3/1% | |
| Vitals: GCS 5% / BP 15% / Pulse 15% / Resp 15% / Skin 5% / Pupils 5% | | 每套 vitals 都要完整 |
| Diagnostics: SpO2 / BGL / Temp | 各 5/3/1% | BGL 该测不测 = 5% |
| **Functional Enquiry（仅 PCP）** | 9 个系统各 5/3/1%，**封顶 −15%** | EMR 不考 |
| Physical Exam (Head-to-Toe) 6 区 | 各 5/3/1%，**封顶 −15%** | 胸部听诊≥6点、双侧对比 |
| Skills: Airway/Breathing/CPR-AED/Spinal/Fracture/Wound | 各 25/15/10% | |
| Drug Administration（6 Rights） | 25/15/10% | 给错途径/剂量 = 25% |
| **Protocols（协议执行）** | **100%**/25/15% | 无指征启动协议或漏禁忌症致害 = 直接挂 |
| Overall Call Management | 25/15/10% | |
| Overall Patient Care | **100%**/25/10% | 对有脉患者做按压 = 直接挂 |
| Ongoing ABC+Interventions 复评 | 15/5/3% | 每次"大动作"后必须复评 |
| Notification / Hand-off / PCR | 各 5/3/1% | 内容清单官方已给定 |
| Pain Management 专项 | 见 Appendix A | Entonox+Acet+Ibu 三联给药顺序有专门扣分表，先复位后 Entonox = **100% 直接挂** |

**考察的 13 个 Protocols：** Respiratory Arrest / Altered Mental Status NYD / Anaphylaxis / Cardiac Arrest / Cardiac Chest Pain / Diabetic Emergencies / Fluid Resuscitation / Hemorrhage Control / Nausea and Vomiting / Pain Management / SOB Suspected / Narcotic Overdose / Environmental Emergencies。

**考察的 18 个药物（Drug Monographs）：** Acetaminophen, ASA, D10W, Dexamethasone, Dimenhydrinate, Diphenhydramine, Entonox, Epinephrine, Glucagon, Ibuprofen, Ipratropium, Methoxyflurane(Penthrox), Naloxone, Nitroglycerin, Ondansetron, Oral Glucose, Salbutamol, TXA。（EMR/PCP 授权范围不同，需按 licence level 标注。）

**唯一评分标准 = EMALB 考纲本身。** 官方评分手册明文规定"其他机构或培训学校的标准一律不采纳"——所以本系统的临床内容必须以《BC Provincial Examination Guidelines》（2026-06-15 现行版，94 页）为唯一蓝本，**不能**用 BCEHS 手册或 Nancy 教材的美国标准来出实操内容。这是老版本最大的方向性错误之一。

### 1.6 Jurisprudence 考试内容来源

EMA Act（RSBC 1996 c.182）、EMA Regulation（B.C. Reg. 210/2010，含 Schedule 1/2 执业范围）、Board 政策文件（emalb2011-01 / 2012-02 / 2018-03）、执业行为与继续能力要求。**现有系统完全没有这个模块**，而它是 EMR 和 PCP 共同的必考关卡（80% 及格线还是三关里最高的）。

---

## 二、现有系统审计（为什么要重做）

| 现状 | 问题 |
|---|---|
| 454 题 Nancy 教材章节题（54 章） | 教材是美国 paramedic 教材，与 BC 考纲多处不一致（如脊柱管理、给药范围）；只能当基础层，不能当主线 |
| 1000 题 "COPR mock"（带 topic/difficulty 标签） | 未按 CPCF 八域蓝图配比；没有 200 题完整模拟考模式；没有两部分计时；没有分域成绩报告；题目质量未经蓝图校验 |
| 100 题 "EMR/PCP exam bank" | 混在一起，没有 EMR/PCP 分轨；EMR 的 EMALB 笔试(200题/75%)完全没有针对性内容 |
| 22 个 CPR scenario sheets | 只有 CPR 一个协议；**没有 trauma 场景**（实操必考 1 medical + 1 trauma）；没有扣分制自评；没有计时训练；没有 PCR 练习 |
| COPR guide 笔记 | 基于 2026-03-05 版手册，已过时（现行版 2026-07-09）；且把 BC 的 EMR 笔试误当成 COPR 考试 |
| 无 Jurisprudence 模块 | 三关缺一关 |
| 无实操评分细则内容 | 39 页官方扣分手册的内容 0 覆盖——这是实操考的"答案之书" |
| UI 单层导航 9 个 tab | 没有 EMR/PCP 分轨，没有"我离考试还差什么"的进度视图 |

**结论：数据层重建，UI 重构，Nancy 内容降级为基础层保留。**

---

## 三、新产品架构

### 3.1 顶层：选轨 + 三关卡导航

```
首页（选身份）
├── EMR 考生轨
│   ├── ① Written 笔试营   (EMALB 200题/2.5h/75%)
│   ├── ② Jurisprudence 法规营 (25题/80%)
│   ├── ③ Practical 实操营  (medical + trauma, 扣分制)
│   └── 进度仪表盘（三关达标度 + 弱项雷达）
├── PCP 考生轨
│   ├── ① Written 笔试营   (COPR CPCF 200题/4h/标准分)
│   ├── ② Jurisprudence 法规营 (同 EMR，共用题库)
│   ├── ③ Practical 实操营  (含 PCP 专属：Functional Enquiry、CPAP、IV、更多药物)
│   └── 进度仪表盘
└── 公共资源库
    ├── 18 药物卡片（按 EMR/PCP 授权标注）
    ├── 13 Protocols 速查
    ├── Patient Assessment Model 交互流程图
    ├── 缩写表 / GCS 计算器 / OPQRRRST·LOTARP 卡
    └── 考务信息（报名流程、费用、考点、时间线、官方链接）
```

### 3.2 核心功能模块规格

**M1 · 笔试模拟考引擎（重头戏之一）**
- PCP 模式：严格按 CPCF 蓝图配比抽题生成 **180 计分题模拟考**（A 7-9 / B 9-11 / C 9-11 / D 5-7 / E 9-11 / F 9-11 / G 5-7 / H 126-154，H 内部按 H1/H2/H3 比例），认知层级 30/50/20 配比，患者人群含 35% 老年权重。
- 复刻真实考试体验：**两部分各 120 分钟独立计时 + 中间 10 分钟休息**（Part 1 交卷后不可回头）。
- EMR 模式：200 题 / 2.5h / 75% 及格线，内容按 EMALB 考纲主题配比（评估模型、协议、药物、CPR、解剖生理基础、运营法规）。
- 出分页复刻 COPR Standard Score Report：总分 + 八域**红/黄/浅绿/深绿**弱项条，弱项直接链接到对应学习模块。
- 练习模式（不计时、即时解析）与模考模式（全真计时、考后统一解析）分开。

**M2 · 实操场景模拟器（重头戏之二，全新）**
- 场景库：**medical + trauma 双类**，每类覆盖 13 protocols 的组合（目标 ≥40 个场景：20 medical + 20 trauma，EMR/PCP 各有变体）。
- 每个场景按官方考试流程分幕：Dispatch → Scene Assessment/PPE → Primary Survey（AVPU→C-spine→A→B→C→RBS→Skin→O2→Position）→ **RTC 决策点** → History → Vitals → [PCP: Functional Enquiry] → Head-to-Toe → Skills/Protocols/Drugs → Ongoing 复评 → Notification → Hand-off → PCR。
- **交互自评模式**：每幕结束弹出该幕的官方扣分清单（用真实权重 100/25/15/10/5/3/1%），学员勾选自己做没做到，实时算剩余分数，<70% 当场亮红。
- **计时器**：40 分钟总计时 + RTC 15 分钟/非 RTC 30 分钟打包倒计时 + vitals 复测间隔提醒 + 5 分钟 PCR 计时。
- **PCR 练习**：场景结束给空白 PCR 表单（按官方数据字段），填完对照参考答案；Hand-off Report 按官方清单（年龄性别/CC/MOI/HxCC/初末 vitals/病史/用药/过敏/处置/发现）逐项核对。
- 陷阱训练：内置"直接挂科动作清单"（100% 扣分项）专项闪卡——如对有脉患者按压、先复位后给 Entonox、该上 C-spine 不上等。

**M3 · Jurisprudence 法规营（全新）**
- 学习笔记：EMA Act / Regulation 210/2010 / Schedule 1&2 执业范围 / Board 政策，双语摘要。
- 题库目标 ≥150 题（模拟 25 题一套的考试，80% 及格线）。

**M4 · 学习内容库（重构）**
- 以 94 页官方考纲为唯一蓝本重写：Patient Assessment Model（交互式流程）、Critical History Questions、AVPU/GCS、27 个处置主题（Wound Care→Diabetic Emergencies）、18 药物专论（剂量/途径/指征/禁忌/EMR·PCP 授权差异）、IV 维持速率计算器（PCP）。
- 每条内容标注出处页码，方便对照官方 PDF 复核。
- Nancy 454 题保留为"基础知识层"，重新映射到 CPCF 八域标签；与 BC 考纲冲突的题目修订或下架。

**M5 · 进度与弱项系统**
- 错题本升级：按 CPCF 域 + 协议 + 药物三个维度聚合弱项。
- 仪表盘：三关各自的"达标预测"（近 N 次模考均分 vs 及格线）+ 考试倒计时 + 报名时间线提醒（COPR 考前 4 周截止）。

### 3.3 数据架构（全部静态 JSON，延续零成本 GitHub Pages）

```
data/
├── meta/
│   ├── exam-rules.json          # 三关规则、费用、时长、及格线（带官方来源+日期）
│   ├── cpcf-blueprint.json      # 八域权重、H域内部比例、认知层级、人群配比
│   └── official-links.json      # 官方链接与文件版本追踪
├── written/
│   ├── pcp-bank.json            # PCP题库，每题带: cpcfArea(A-H), competency(H2.4等),
│   │                            #   cognitive(K/A/CT), population(neo/ped/adult/ger),
│   │                            #   licence(pcp), 双语题干/选项/解析, 来源标注
│   └── emr-bank.json            # EMR题库（EMALB 主题标签体系）
├── jurisprudence/
│   ├── notes.json               # 法规学习笔记
│   └── bank.json                # 法规题库
├── practical/
│   ├── rubric.json              # 官方扣分细则全量结构化（39页→JSON）
│   ├── scenarios-medical.json   # 医疗场景（EMR/PCP 变体字段）
│   ├── scenarios-trauma.json    # 创伤场景
│   └── skills-checklists.json   # 技能清单（airway/spinal/fracture/wound/drug 6R…）
├── study/
│   ├── assessment-model.json    # 患者评估模型
│   ├── protocols.json           # 13 协议
│   ├── treatments.json          # 27 处置主题
│   ├── drugs.json               # 18 药物专论
│   └── reference.json           # 缩写/GCS/OPQRRRST/考务信息
└── legacy/
    └── nancy-bank.json          # 老 454 题（重新打标后并入 written 基础层）
```

### 3.4 技术方案

- **保持纯静态**：vanilla JS ES modules + hash 路由，无构建步骤，GitHub Pages 直接部署（零成本、离线可用，考生手机可刷）。
- UI 重构为单页应用三层导航（轨道→关卡→模块），移动端优先（考生大量碎片时间在手机上刷题）。
- 双语架构保留（zh/en 字段对），**英文为主、中文为辅**——真实考试全英文，中文只做理解辅助，题干默认显示英文。
- localStorage 存进度/错题/模考历史（保留现有习惯），加导出/导入 JSON 备份。
- 设计风格：干净的临床工具风（白底、高对比、红/黄/绿状态色与 COPR 成绩报告一致），不做花哨装饰。

---

## 四、内容生产计划与质量控制

### 4.1 题库目标量

| 题库 | 现有 | 目标 | 说明 |
|---|---|---|---|
| PCP Written（CPCF 标签） | 1000（未校验） | **1200+**（审计重标现有 + 补缺口） | 足够生成 ≥6 套不重复全真模考；H 域≥840，老年人群≥250 |
| EMR Written | ~100 | **600+** | 支撑 3 套 200 题模考 |
| Jurisprudence | 0 | **150+** | 6 套 25 题模考 |
| 实操场景 | 22（仅CPR） | **40+**（20 medical + 20 trauma） | 每个含 EMR/PCP 变体 + 全幕扣分清单 + PCR 答案 |
| 药物卡 | 0 | 18 | 按官方专论逐药结构化 |
| 协议卡 | 0 | 13 | 含决策树 |

### 4.2 质量控制（吸取教训）

1. **单一真相源**：临床内容只认 EMALB 2026-06-15 考纲 + 2025-03 评分手册；COPR 结构只认 2026-07-09 手册 + 2024/2025 蓝图。每条内容带 `source` 字段（文件+页码）。
2. **蓝图配比校验脚本**：CI 里跑一个 Python/JS 校验器，检查题库标签分布能否满足模考抽题配比，不达标就报缺口清单。
3. **双语通顺度检查**：所有批量生成的中文内容过通顺度审查（禁止碎片硬拼），最终以"人眼可读格式"整体复核后再上线。
4. **医学准确性**：AI 起草 → 与官方 PDF 原文逐条对照 → 抽样交叉复核；解析里引用协议原文关键句。
5. **版本追踪**：官方文件每年更新（考纲有 Change Index 页），`official-links.json` 记录文件版本+校验日期，首页显示"内容对齐至 2026-06-15 版考纲"。

---

## 五、分阶段路线图

| 阶段 | 内容 | 交付物 |
|---|---|---|
| **P0 · 数据地基**（先做） | 把两份官方 PDF 全量结构化：评分细则→rubric.json，考纲处置/药物/评估模型→study JSON，考试规则→meta JSON | data/ 目录成型，校验脚本跑通 |
| **P1 · 新应用壳** | 新 UI：选轨、三关导航、双语切换、移动端布局、进度仪表盘骨架 | 新版站点上线（空壳+资源库可用） |
| **P2 · 实操模拟器** | 场景播放器 + 分幕扣分自评 + 计时器 + PCR/Hand-off 练习；先做 10 medical + 10 trauma | 实操营 MVP 可完整走一场考试 |
| **P3 · 笔试引擎** | 蓝图抽题模考（两部分计时+休息）、COPR 风格出分报告、练习模式；审计重标现有 1000 题 | PCP/EMR 各可生成全真模考 |
| **P4 · Jurisprudence** | 法规笔记 + 150 题库 + 25 题模考 | 三关闭环 |
| **P5 · 内容扩容** | 题库补到目标量；场景补到 40+；Nancy 454 题重标并入 | 蓝图校验器全绿 |
| **P6 · 打磨发布** | 弱项雷达、备考时间线、导出备份、全站 QA、README 重写 | v2.0 正式发布 |

每阶段完成即 push 部署（GitHub Pages 现有流水线不变），P1 起老版本先整体归档到 `/v1/` 路径可回看。

---

## 六、风险与边界

1. **非官方声明**：站点必须显著标注"非 EMALB/COPR 官方，题目为自研模拟题，以官方文件为准"，并给官方链接。这也是免责底线。
2. **政策变动**：ACP 2027-06 才完成 CPCF 过渡，EMALB 考纲每年多次修订（现行版标注 Current to June 15, 2026）——设"版本对齐"检查习惯，每季度核对一次官方 PDF 是否更新。
3. **实操的先天局限**：网页只能训练决策流程、扣分意识和计时感，动手技能（BVM 手法、包扎、脊柱滚动）必须线下练。系统里要明说，避免误导。
4. **Jurisprudence 原文获取**：EMA Act/Regulation 在 bclaws.ca 免费公开，但 Board 内部题不公开——我们的题只能基于法条自研，标注"模拟"。
5. **老内容迁移损耗**：1000 题 copr-mock 里估计有相当比例经不起蓝图/准确性校验，宁可删也不留错题（医学内容错误比缺题更伤）。

---

## 七、待拍板的决定

1. **仓库策略**：直接在 nancy-quiz-web 原仓库重做（保留 star/历史，老版归档到 /v1/），还是开新仓库？→ 建议原仓库重做。
2. **优先轨道**：EMR 和 PCP 同步做，还是 PCP 优先（你自己 2027 考 PCP）？→ 建议 P2/P3 阶段 PCP 内容先行，EMR 骨架同步搭好后补题。
3. **改名**：项目定位已从"Nancy 学习系统"变成"BC EMR/PCP 考证系统"，是否改站名/仓库名（如 `bc-paramedic-prep`）？→ 建议至少改站名，仓库名可留。
4. 实操场景是否要加**语音朗读 dispatch/考官提示**（Web Speech API，免费）模拟真实考场听觉压力？→ 可选增强，P6 再说。

---

## 八、官方来源清单（本计划全部事实依据）

| 文件 | 版本 | 用途 |
|---|---|---|
| [BC Provincial Examination Guidelines](https://www2.gov.bc.ca/assets/gov/health/about-bc-s-health-care-system/heath-care-partners/colleges-board-and-commissions/emergency-medical-assistants-licensing-board/britishcolumbiaprovincialexaminationguidelines.pdf)（94页） | Current to 2026-06-15 | 评估模型/处置协议/药物/考试规则的唯一临床蓝本 |
| [EMALB Practical Examination Grading Criteria](https://www2.gov.bc.ca/assets/gov/health/about-bc-s-health-care-system/heath-care-partners/colleges-board-and-commissions/emergency-medical-assistants-licensing-board/emalbpracticalexaminationgradingcriteria.pdf)（39页） | 2025-03 | 实操扣分细则全量 |
| [COPR Entry to Practice Examinations Handbook](https://copr.ca/wp-content/uploads/2025/07/Examination-Handbook.pdf)（29页） | 2026-07-09 | PCP 笔试考务/格式/成绩规则 |
| [PCP CPCF Examination Blueprint](https://copr.ca/wp-content/uploads/2025/09/ExaminationBlueprint_PCP_REV2025.pdf) | 2024（板批） | PCP 模考抽题配比 |
| [EMR CPCF Examination Blueprint](https://copr.ca/wp-content/uploads/2025/09/Examination-Blueprint_EMR_2025.pdf) | 2025 修订 | 参考结构 |
| [CPCF Framework PCP/EMR](https://copr.ca/regulation-of-paramedics-canada/canadian-paramedic-competence-framework2/) | 2024 | 能力条目标签体系（A1.1~H4.3） |
| [EMALB Licensing / Scheduling 页面](https://www2.gov.bc.ca/gov/content/health/about-bc-s-health-care-system/partners/colleges-boards-and-commissions/emergency-medical-assistants-licensing-board/licensing) | 2026 现行 | 三关流程/补考/12个月窗口 |
| [EMA Regulation B.C. Reg. 210/2010](http://www.bclaws.ca/civix/document/id/complete/statreg/210_2010) | 现行 | Jurisprudence 内容源 |

（所有 PDF 原文已下载存档，结构化时逐页对照。）
