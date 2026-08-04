# 执行交接手册 (HANDOFF) — 给接手的 Claude/Sonnet

> 配合 [PLAN.md](PLAN.md) 使用：PLAN 讲"做什么和为什么"，本文讲"做到哪了、怎么接着干、红线在哪"。
> 更新：2026-07-25 晚（第二次 session 限额中断后）

---

## 0. 一句话现状

**平台代码 100% 完成并本地验证通过；官方内容库 100% 完成；缺的是"练习弹药"：6 个笔试题库分片（745 题）和 16 个实操场景还没生成完**（生成它们的 agent 两次被 session 限额杀掉）。补完弹药→跑校验→push 上线，就是全部剩余工作。

---

## 1. 已完成清单（不要重做！）

### 1.1 应用代码（全部写好且浏览器实测零报错）
| 文件 | 内容 |
|---|---|
| `index.html` | 应用壳：顶栏(track切换EMR/PCP + 语言EN/中/双语)、底部导航、免责页脚 |
| `styles.css` | 全站样式：临床白底风、红黄绿状态色、移动端优先、双语块(.bi-en/.bi-zh) |
| `src/app.js` | 状态(localStorage key=`bcprep2`)、hash路由、i18n(bi/t函数)、数据加载(loadJSON/loadBank)、首页仪表盘、六步使用引导页 |
| `src/exam.js` | 笔试引擎：练习模式(筛选+即时解析)、全真模考(PCP蓝图配比抽180题+两段120min计时+10min休息+COPR四色分域报告；EMR 200题150min 75%线)、错题本 |
| `src/scenario.js` | 实操模拟器：11幕场景播放、官方扣分权重自评清单、40min主计时+RTC15/30min打包倒计时、FE/头脚检查扣分封顶15%、PCR练习、交接报告对照、评分细则浏览器、23张直接挂科闪卡 |
| `src/study.js` | 学习库(评估模型/协议/处置/药物/速查)、法规营(笔记+练习+25题模考)、考务信息页 |

### 1.2 数据（全部验证合法，别动 schema）
| 文件 | 状态 |
|---|---|
| `data/meta/exam-rules.json` | ✅ 三关规则全量（2026-07-25 对照官方核实） |
| `data/meta/cpcf-blueprint.json` | ✅ COPR 蓝图（PCP 180计分题域配比 A8/B10/C10/D6/E10/F10/G6/H120） |
| `data/study/drugs.json` | ✅ 18 药物专论，licence 逐药标注 |
| `data/study/treatments.json` | ✅ 32 处置主题 |
| `data/study/protocols.json` | ✅ 13 协议（drugs 关联 id 已修复对齐） |
| `data/study/assessment-model.json` | ✅ 官方 7 阶段评估模型 + unstableCriteria + 口诀 |
| `data/study/reference.json` | ✅ 145 缩写 + GCS |
| `data/practical/rubric.json` | ✅ 39页评分手册全量：13节57项+23 autoFails+疼痛专项+计时规则 |
| `data/jurisprudence/notes.json` | ✅ 8 章法规笔记 |
| `data/jurisprudence/bank.json` | ✅ 80 题（带法条 sourceRef，答案已均衡 a17/b20/c26/d17） |
| `data/written/parts/nancy-foundation.json` | ✅ 454 题（v1迁移，foundation层，licence=both） |
| `data/written/parts/bc-guidelines-v1.json` | ✅ 100 题（v1迁移） |
| `data/written/index.json` | ✅ manifest（已预列全部8个分片名，缺的文件 loader 会容错跳过） |
| `v1/` | ✅ 老站完整归档，别删 |

### 1.3 本地预览
`D:\Claude\.claude\launch.json` 里有 `bcprep` 配置（python http.server 8765, cwd=nancy-quiz-web）。preview_start name="bcprep" 即可。

---

## 2. 剩余工作（按优先级）

### ★ A. 实操场景库 `data/practical/scenarios.json`（最高优先级，用户点名重点）
16 个场景：8 trauma + 8 medical。**用户明确要求：以真实考试为蓝本，严禁胡编。**
- 必读参考：① `v1/data/scenarios.json`（22个旧CPR场景，真实考卷 sheet 风格基准）② `D:\Claude\bcexam-sources\bc-exam-guidelines.txt`（临床唯一标准）③ `D:\Claude\bcexam-sources\grading-criteria.txt`（扣分项来源）④ https://mediprofirstaid.com/bc-emalb-practical-examination-guidelines.html
- trauma 覆盖：跌落(脊柱+骨折)/车祸多发伤/开放胸伤/大出血截肢(tourniquet+TXA)/烧伤/TBI/骨盆(binding)/股骨(traction+三联镇痛)
- medical 覆盖：anaphylaxis/cardiac chest pain/低血糖DLOC/narcotic OD/SOB asthma-COPD/stroke/hypothermia/seizure-AMS NYD
- RTC 与 non-RTC 约各半
- **Schema 契约（播放器 src/scenario.js 按此解析，一个字段都不能改名）**：
```json
{"meta":{"title":"BC Practical Exam Scenarios","version":1,"languages":["en","zh"],"passMark":70,"disclaimer":"Unofficial practice scenarios modeled on EMALB exam format"},
 "scenarios":[{
  "id":"tr-01","type":"trauma|medical","titleEn":"","titleZh":"",
  "protocols":["Hemorrhage Control"],"priority":"rtc|non-rtc",
  "dispatchEn":"","dispatchZh":"",
  "phases":[  // 固定11幕、固定id顺序：dispatch,scene,primary,transport,history,vitals,fe,exam,interventions,ongoing,handoff
    {"id":"scene","infoEn":"考官该幕给的信息","infoZh":"",
     "expected":[{"actionEn":"","actionZh":"","weight":5,"rubricRef":"scene-ppe"}]}],
  "vitalsSets":[{"set":1,"timeHint":"baseline","gcs":"15 (E4V5M6)","bp":"88/60","pulse":"128 weak regular","resp":"24 shallow","skin":"pale cool clammy","pupils":"PERL","spo2":"91% RA","bgl":null,"temp":null},{"set":2,"timeHint":"after interventions"}],
  "criticalPitfallsEn":[],"criticalPitfallsZh":[],
  "emrVariantEn":"","emrVariantZh":"","pcpVariantEn":"","pcpVariantZh":"",
  "handoffModelEn":"完整示范交接报告一段话","handoffModelZh":"",
  "pcrKeyPoints":{"cc":"","hxcc":"","pmhx":"","meds":"","allergies":"","treatments":[],"findings":[]}}]}
```
- expected 权重 = 该动作对应扣分项的**最重档**：C-spine不做=100 / RBS不做=100 / protocol违规=100 / transport分类错=25 / Skills类=25 / BP漏=15 / Pulse漏=15 / Resp漏=15 / HxCC漏=15 / GCS漏=5 / FE每系统=5 / 头脚每区=5 / handoff=5 / PCR=5
- fe 幕只有 PCP 用（EMR 播放器自动跳过），但**每个场景都要写 fe 幕**
- history 幕 expected 必含6项：C/C、HxC/C(OPQRRRST/LOTARP)、PMHx、Meds、Allergies、LOI
- vitals 幕必含 GCS/BP/Pulse/Resp/Skin/Pupils + 按指征 SpO2/BGL/Temp
- ongoing 幕必含 ABC+interventions 复评 + 第二套 vitals

### ★ B. 六个笔试题库分片 `data/written/parts/*.json`
文件名和目标量（index.json 已预列，写完即生效）：
| 文件 | 题量 | 内容 | id前缀 |
|---|---|---|---|
| `pcp-resp-cardiac.json` | 120 | 气道/呼吸/CPAP/胸痛/CHF/休克/出血/CPR/FBAO（源 p40-54 + 药物） | prc- |
| `pcp-trauma-medical.json` | 120 | 创伤全类+环境+anaphylaxis/OD/糖尿病/stroke/N&V（源 p19-37,55-57） | ptm- |
| `pcp-assessment-populations.json` | 100 | 评估模型/RTC决策/GCS计算/IV滴速/儿老新生儿人群（geriatric 35%！） | pap- |
| `pcp-professional.json` | 105 | CPCF A-G 七域：A14/B18/C18/D10/E18/F17/G10（源 cpcf-pcp-framework.txt） | ppf- |
| `emr-core-1.json` | 150 | EMR:评估/CPR-AED/FBAO/氧疗/休克/出血/胸痛/呼吸（授权范围约束！） | emr1- |
| `emr-core-2.json` | 150 | EMR:创伤全类/环境/EMR范围内科/EMR药物/scope判断题 | emr2- |

**题目 Schema 契约（引擎按此解析）**：
```json
{"meta":{"part":"pcp-resp-cardiac","count":120,"languages":["en","zh"]},
 "questions":[{"id":"prc-001","licence":"pcp|emr|both","cpcfArea":"A-H","cognitive":"knowledge|application|critical","population":"adult|pediatric|geriatric|neonatal","topic":"airway","difficulty":"foundation|intermediate|advanced","questionEn":"","questionZh":"","options":[{"key":"A","en":"","zh":""},{"key":"B"},{"key":"C"},{"key":"D"}],"answer":"B","explanationEn":"","explanationZh":"","sourceRef":"BC Guidelines p.49","verified":false}]}
```

**质量红线（第一批1000题就是因为违反这条被整库废弃的）**：
1. 题干=具体临床情境（年龄/性别/主诉/vitals数值），选项=具体临床动作。**绝对禁止**抽象套话选项（"选择最安全的做法"这种=废题）。干扰项=真实会犯的错（剂量错/顺序错/漏禁忌）。
2. 剂量/流程/禁忌只认 `D:\Claude\bcexam-sources\bc-exam-guidelines.txt`（BC标准≠美国NREMT标准）。每题 sourceRef 页码。
3. EMR 题的正确答案不能是 EMR 无权操作（IV/CPAP/PCP-only药），除非考"哪项超范围"。EMR 授权哪些药：看 drugs.json 各药 licence 字段。
4. 认知配比：PCP 30/50/20（K/A/CT），EMR 45/40/15。人群配比：PCP 老年 30-35%。答案 A-D 均匀（写完统计，别一边倒）。
5. 中文自然通顺完整句（用户红线：禁止碎片硬拼）；英文为主。

### C. 蓝图覆盖校验脚本 `tools/validate.py`
写一个脚本：读全部 parts → 统计各 licence/cpcfArea/cognitive/population 分布 → 对照 `data/meta/cpcf-blueprint.json` 的 PCP 180 题配比（A8/B10/C10/D6/E10/F10/G6/H120）算"能生成几套不重复模考"→ 输出缺口清单。答案分布均衡检查也放这里。

### D. 发布（P6）
1. `python tools/validate.py` 全绿（或缺口已知晓）
2. 本地 preview 全流程点一遍：选轨→引导→学习库→练习→模考(至少开考一次验证计时)→场景(跑一个完整场景)→法规模考→错题本
3. `README.md` 重写（新定位+免责声明+官方来源清单）
4. `git add -A && git commit && git push origin main` → GitHub Pages 自动部署 https://firefoxy1015.github.io/nancy-quiz-web/
5. 打开线上站验证（改动后加 ?v= 查询串防缓存）

---

## 2.5 历史协作说明

曾有一个并行会话（作者 win@local，提交 "Add ChN ..." 系列）用 v1 老格式往章节题库加题——**该会话已于 2026-08 弃用**，它的 504 题已通过 `tools/sync-v1-bank.py` 一次性导入并经过质量审计清洗（见 tools/audit/）。以后不会再有 v1 格式的新题进来；`sync-v1-bank.py` 保留仅作归档用途。质量原则（用户定的）：**不是越多越好**——新增任何题都必须达到 HANDOFF 第 2 节 B 的质量红线，宁缺毋滥。push 前照例 `git pull --rebase`。

## 3. 踩过的坑（必读，省你重踩）

1. **Session 限额会杀长任务 agent**（本 session 被杀两轮，11:40pm PT 重置）。对策：**分块写盘**——每 25-50 题/2-4 个场景就写盘一次成合法 JSON（meta.count 更新），再续加。永远保持磁盘上的文件可解析。被杀后 SendMessage 原 agent id 可原地续跑（上下文还在）。
2. **EMR 笔试是 EMALB 自己的考试（200题/2.5h/75%），不是 COPR**——网上搜到"EMR 考 COPR"是萨省的规定，别混。
3. **EHS Act 是 RSBC 1996 c.182**（不是 c.108，那个 URL 404）。
4. **唯一临床标准=EMALB 考纲**：评分手册明文禁止采纳其它机构标准。Nancy 教材/BCEHS/美国 AHA 细节与考纲冲突时，以考纲为准。
5. **改 UI 必须同步 4 处版本串**：`index.html` 的 css + app.js 引用，以及 `src/{exam,scenario,study}.js` 顶部 `from './app.js?v=N'`。⚠️ 子模块导入 app.js **必须带和入口相同的 ?v=**——URL 不同 = ES module 会创建两个独立实例，状态 S 会被复制成两份（这个隐患一直存在到 2026-08-03 才发现）。
6. **主题/背景色**：页面背景设在 `html` 上，不要设在 `body`——body 背景会被传播到 canvas，某些引擎在 CSS 变量变化时不重绘，导致主题切换后旧色卡住。同理别给 body 的 background-color 加 transition。
7. **药物 id 命名**：aspirin / oral-glucose / d10w / tranexamic-acid…（见 drugs.json）。协议/场景里引用药物用这些 id，别自创（上次 agent 写了 acetylsalicylic-acid 和 glucose-gel，已修）。
8. 官方评估模型是 **7 阶段**（Rescue Scene Evaluation→Primary(含Transport Decision)→Secondary→Protocols→Treatments→Load and transport→Records），场景播放器的 11 幕是训练用分解，两者并存不矛盾，别"统一"它们。
9. 旧 v1 数据里 **copr-mock-bank.json 的 1000 题是模板垃圾，已废弃**，永远别迁移回来。
10. juris bank 的选项格式是 `{id,textEn,textZh}`，written parts 是 `{key,en,zh}`——引擎两种都支持，别改存量。

## 4. 资源位置

- 官方文件全文提取：`D:\Claude\bcexam-sources\`（bc-exam-guidelines.txt 94页 / grading-criteria.txt 39页 / copr-handbook.txt / cpcf-pcp-framework.txt / cpcf-emr-framework.txt / 各蓝图）
- 仓库：`D:\Claude\nancy-quiz-web`（GitHub: firefoxy1015/nancy-quiz-web，Pages 从 main 根目录发布）
- 记忆：`~/.claude/projects/D--Claude/memory/bc-emr-pcp-exam-facts.md` + `nancy-quiz-web-project.md`
- 用户要求汇总：全站双语（EN主中辅）/ 场景是重点、要真实不编造 / EMR 和 PCP 同等分量 / 用户一进站就知道怎么用（引导页已做）/ 学完能有信心过考试
