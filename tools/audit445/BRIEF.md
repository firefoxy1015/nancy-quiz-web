# 445 道「未复核」PCP 笔试题 逐题审计任务书（2026-11-22）

## 背景
网站 PCP 笔试题库里有 4 个分卷是 2026-07 写的，**从没逐题复核过**（每题 `verified: false`，网页上显示「未复核」）：

| 分卷 | 题数 |
|---|---|
| `data/written/parts/pcp-resp-cardiac.json` | 120 |
| `data/written/parts/pcp-trauma-medical.json` | 120 |
| `data/written/parts/pcp-assessment-populations.json` | 100 |
| `data/written/parts/pcp-professional.json` | 105 |

用户（备考 BC PCP，笔试是 COPR 全国统考）问「这个网站能不能让我考过」，我们承认这 445 道是最大的质量风险，她说「做吧」。
项目铁律：**题库宁缺毋滥，不是越多越好**。以前迁移进来的题曾有八成是垃圾，所以要真审，不要走过场。

你只负责**一个分卷**（任务里会告诉你是哪个）。仓库根目录 `D:\Claude\nancy-quiz-web`。

## 判断对错的依据（按优先级）
1. **BC 官方考纲** `D:\Claude\bcexam-sources\bc-exam-guidelines.txt`（94 页，June 2026 版，`===== PAGE N =====` 分页）。**这是金标准**：剂量、阈值、流程和它冲突就以它为准。
2. **BC 药物专论** `D:\Claude\nancy-quiz-web\data\study\drugs.json`（考试用的 18 种药，BC 剂量）。`drugs-added.json` 是 BCEHS 出车药，**不是考试内容**，题目的正确答案不能依赖它。
3. **Nancy Caroline 教材**（COPR 指定 PCP 参考书）按章切好的原文：`D:\Claude\bcexam-sources\nancy-chapters\chNN\`（每章有 `manifest.json` 列出小节文件和页码）。考纲没写的临床/病理/职业内容用它核。**原文有版权，只准读来核对，不准大段抄进题目或解析。**
4. COPR 考试大纲：`D:\Claude\bcexam-sources\pcp-cpcf-blueprint.txt`、`cpcf-pcp-framework.txt`（A1.1~H4.3 能力条目）、`D:\Claude\nancy-quiz-web\data\meta\cpcf-blueprint.json`。

**冲突时**：BC 考纲说了算。如果这道题考的点恰好是 BC 和教材写法不同的地方（例：低体温骤停 BC 最多除颤 3 次，教材写 1 次），答案按 BC，解析末尾加一句「教材（Nancy）写法不同：……」，中英解析都加。

**不确定就去原文查**；查不到的通用医学常识不算冲突，但「答案依赖一个考纲和教材都找不到的具体数字/说法」= 编造，要删或改。

## 每道题三选一
- **keep**：内容正确、有考试价值、写得好，只需小修也不必改。
- **fix**：有价值但有可改正的问题。你给出**改好的完整题目**。
- **delete**：命中下面任一删除标准，或者问题大到不值得救。

### DELETE 标准（命中任一条即删）
1. **与 BC 考纲冲突且救不回来**（能改对就用 fix）。
2. **正确答案超出 BC PCP 的执业范围**（气管插管、手动除颤、阿片类镇痛、针刺减压、IO 等）。
3. **送分题**：干扰项一眼就能排除，没有鉴别价值。
4. **无考试价值**：只是复述常识，或者考「某框架文件怎么措辞」而不是临床/职业判断。
5. **同分卷内重复**：和你这个分卷里另一道考点+问法基本相同，留更好的那道。
6. **无患者的空泛题**：「哪项最能体现专业精神」这类没有具体情境的一律删；有具体职业情境（疲劳、现场安全、交接、同事冲突、知情同意、保密）的可以留。
7. **事实依据是编的**（见上）。

### FIX 的常见情况（都要改到位）
- **答案长度泄底**：正确项明显最长、最细致，或者唯一带限定条件。改写选项让四个长度和细致程度相近（改干扰项更合理、或精简正确项），不要只加废话。
- **解析太薄**：现在很多解析只说为什么对。改好的解析要**说清为什么对，以及其它三个各错在哪**（每个一句即可），中英文都要。
- **sourceRef 错**：必须是你**亲自核过、那一页真的支持答案**的页码。BC 考纲写 `BC Guidelines p.NN`；考纲没有、来自教材的写 `Nancy Ch NN`（例 `Nancy Ch 38`）；纯职业素养类写 `CPCF <能力代码>`（例 `CPCF E2`）。**不准编页码**。
- **中文不通顺**：中文题干/选项/解析要像中国人写的完整句子，**禁止碎片硬拼**。术语可以保留英文括注，例「anaphylaxis（过敏性休克）」。
- **药名**：中文里出现药名必须中英对照，例「硝酸甘油（nitroglycerin）」「肾上腺素（epinephrine）」。剂量必须和 drugs.json 一致。
- **模块/协议代码**：出现代码时必须带全名。
- **标签错**：`population`（题目讲的是哪类病人；讲从业者自己/无患者的标 `unclassified`）、`cognitive`（knowledge / application / critical）、`cpcfArea`（A–H）、`competency`（H 区尽量标到 H1/H2/H3；A–G 标到区内代码，如 `E2`）、`difficulty`（foundation / intermediate / advanced）。
- **措辞**：解析里不要写「not in PCP scope / 超出 PCP 范围」这种话；要说 BC 考纲规定 PCP 这时做什么。

### 注意
- **儿童和新生儿题照常审、照常留**：COPR PCP 笔试大纲里儿童占 15%、新生儿占 5%，这块不能砍。
- **药名题可以留**：COPR 笔试本身只按药物分类出题、不出现药名，但 BC 的 EMALB 实操和法规考试用真实药名和 BC 剂量，网站两层都要。药名题按 BC 剂量审。
- 题目必须是**原创**，不能照抄教材原句。
- 改题时 `id`、`licence` 保持不变。选项保持 4 个、key 为 A–D。改完后正确答案的位置可以变，但 `answer` 必须对应。

## 输出
写 `D:\Claude\nancy-quiz-web\tools\audit445\output-<分卷名>.json`（分卷名不带 .json，例 `output-pcp-resp-cardiac.json`）：

```json
{
 "meta": {"part": "pcp-resp-cardiac", "auditedThrough": "prc-120", "keep": 0, "fix": 0, "delete": 0},
 "verdicts": [
  {"id": "prc-001", "verdict": "keep", "sourceRef": "BC Guidelines p.40"},
  {"id": "prc-002", "verdict": "fix", "why": "一句话：改了什么、为什么"},
  {"id": "prc-003", "verdict": "delete", "reason": "标准N：一句话"}
 ],
 "fixed": [
  { 完整题目对象，字段与原题相同：id, licence, cpcfArea, competency, cognitive, population, topic, difficulty,
    questionEn, questionZh, options[{key,en,zh}×4], answer, explanationEn, explanationZh, sourceRef, "verified": true }
 ]
}
```
- `verdicts` 必须覆盖分卷里**每一道**题，顺序同原文件。
- keep 的题：如果原 sourceRef 不对或缺，在 verdict 里给正确的 `sourceRef`；对的话也照写一遍（表示你核过）。
- fix 的题：完整对象放进 `fixed`，verdict 里写 `why`。
- 不要改原分卷文件，合并由主会话做。

## 防中断（铁律）
**每审完 20 道就写盘一次**（JSON 保持合法、meta 计数更新、`auditedThrough` 写到最后一道 id），再继续。上下文快满也不会丢活。

## 交付
写完后用 python 检查：JSON 合法、verdicts 数 = 分卷题数、每个 fix 都在 fixed 里且字段齐全、answer 在 A–D 里。然后回报：
- keep / fix / delete 数量；
- delete 原因分布；
- 发现的**真错误**（答案错、剂量错、和考纲冲突）逐条列出：id + 一句话；
- 最典型的 3 道被删题和 3 道改得最有价值的题（各一句话）。
