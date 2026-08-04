# 外部 500 题库 审计+转换 任务书

## 背景
一位 AI 按 CPCF 新考纲生成了 500 道 PCP 题。域分布精确符合蓝图（A4/B5/C5/D3/E5/F5/G3/H70%），
无重复，题干是真实临床情境、干扰项同领域、无玩笑选项——**素材质量不错**。
但它达不到本项目现行标准，需要你逐题审计并转换。用户原话：**"你认为好的就把它加进去，认为没用的就把它去掉"**，
且项目铁律是 **"不是越多越好"**，宁缺毋滥。

## 你的输入
`tools/audit500/input-N.json`（100 道，字段：id, domain, competency, cognitive, population, topic, stem, options{A-D}, answer, rationaleZh）

## 临床校验唯一依据
`D:\Claude\bcexam-sources\bc-exam-guidelines.txt`（BC 官方考纲 94 页，===== PAGE N ===== 分页）
以及 `D:\Claude\nancy-quiz-web\data\study\drugs.json`（18 药物的 BC 授权与剂量）

## DELETE 标准（命中任意一条即删）
1. **与 BC 考纲冲突**：剂量/阈值/流程和考纲不符（典型：Nitro 收缩压阈值 BC 是 >110 不是 90/100；
   TXA 是 2 g 静推 1 分钟；新生儿心率 <100 即按压不是 <60；肾上腺素 anaphylaxis 成人 0.5 mg IM；
   D10W 10-25 g）。**不确定就去考纲查**，查不到的通用医学常识不算冲突。
2. **超出 PCP 授权范围**：正确答案是 ACP/CCP 才能做的（气管插管、手动除颤、阿片类镇痛、环甲膜切开等）。
3. **送分题**：干扰项一眼排除，无鉴别价值。
4. **答案长度泄底**：正确项明显最长最细致。
5. **无考试价值**：只是复述常识，或考"框架文件怎么说"而非临床/职业判断。
6. **同批内重复**：与你这 100 道里另一道考点+问法基本相同（保留更好的那道）。
7. **population 是 Non-patient 且内容空泛**：真考约六成题目有患者。Non-patient 的题只有在考
   真实职业情境（如疲劳管理、现场安全、交接、同事冲突）且有具体情境时才保留；
   泛泛而谈的"哪项体现专业精神"一律删。

## KEEP 的题必须补全（转换成本项目 schema）
- **中文题干和中文选项**（原文只有英文）：自然通顺完整句，术语保留英文（如 "anaphylaxis（过敏性休克）"）。**禁止碎片硬拼**。
- **英文解析** explanationEn：说清为什么对、为什么其它三个错（参考原 rationaleZh 但要扩写成完整解析）。
- **中文解析** explanationZh：同上，自然通顺。
- **sourceRef**：能定位到 BC 考纲的写 `BC Guidelines p.NN`；确实属于 CPCF 框架/通用职业素养、考纲无对应的写 `CPCF <competency>`（如 `CPCF E2`）。**不许编页码**。
- **population 修正**：题目讲的是患者才标患者类型；讲从业者自身/无患者的标 `unclassified`。
- cognitive 映射：Knowledge→knowledge，Application→application，Critical Thinking→critical

## 输出
写 `tools/audit500/output-N.json`：
```json
{"meta":{"part":"cpcf500-N","source":"external CPCF-500 bank, audited","licence":"pcp","count":<保留数>},
 "verdicts":[{"id":123,"verdict":"delete","reason":"命中标准N+一句话"}],
 "questions":[{
   "id":"c500-123","licence":"pcp","cpcfArea":"H","competency":"H2",
   "cognitive":"knowledge|application|critical","population":"adult|pediatric|geriatric|neonatal|unclassified",
   "topic":"<小写连字符>","difficulty":"foundation|intermediate|advanced",
   "questionEn":"","questionZh":"","options":[{"key":"A","en":"","zh":""},{"key":"B"},{"key":"C"},{"key":"D"}],
   "answer":"B","explanationEn":"","explanationZh":"","sourceRef":"BC Guidelines p.49","verified":true
 }]}
```
`verdicts` 要覆盖全部 100 道（keep 的只写 id+verdict 即可）。

## 防中断
每审完 25 道就写盘一次（保持 JSON 合法、meta.count 更新），再继续追加。

## 交付
python 验证 JSON 合法后，返回：keep/delete 数量、delete 原因分布、以及你认为**最值得保留的 3 道题**和**最典型的 3 道被删题**（各一句话说明）。
