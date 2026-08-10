# 章节精读 2.0 — 重写计划（Canadian Edition）

> 2026-08-09 定稿。目标：让读不完 4700 页原书的考生，靠这个板块把每章的可考知识点学到位。
> 🔒 **部署冻结**：本计划全部工作在本地完成，验收通过前禁止 `git push`（线上有考生正在使用）。

## 背景发现（为什么重做）

1. **现网站第 40-53 章是美国版章序**，与用户手中的 Canadian Edition 后 15 章 14 处对不上。
   加拿大版独有/错位章：40 Behavioural、41 Gynecologic、42 Obstetrics、43 Neonatology、
   44 Pediatrics、45 Geriatrics、46 Abuse、47 Special Needs、48 Chronic Care、49 EVO、
   50 Medical Incident Command、51 Terrorism/CBRNE、52 Rescue、53 Hazmat、54 Crime Scene。
   Behavioural 和 Abuse 两个高考点章现网站不存在。
2. 现精读每章仅 ~17 条概念性要点，无数值/表格/分节，撑不起"替代读书"。
3. 真书可挖资产：每章开头 NOCP 能力编码（对齐 COPR）；PDF 自带 597 条 section 目录；
   "At the Scene" 实战框；章末 "YOU are the Paramedic" 案例。

## 每章 8 板块 schema（data/study/chapters2/chNN.json）

```json
{"id":"ch21","n":21,"titleEn":"","titleZh":"","group":"shock","examWeight":3,
 "whyEn":"","whyZh":"",                          // ① 章节定位：考什么、值多少时间
 "competencies":{"areas":["Area 4: ..."],"codes":["4.3.a"]},  // ② NOCP 映射（章首提取）
 "sections":[{"titleEn":"","titleZh":"","points":[{"en":"","zh":"","hard":true}]}], // ③ 知识地图（按真书 section）
 "hardNumbers":[{"itemEn":"","itemZh":"","value":""}],   // ④ 硬数字表
 "atScene":[{"en":"","zh":""}],                  // ⑤ 实战要点（At the Scene 改写）
 "confusions":[{"en":"","zh":""}],               // ⑥ 常见误区（保留旧真内容+补充）
 "mnemonics":[{"name":"","en":"","zh":""}],      // ⑦ 记忆钩子
 "selfCheck":[{"qEn":"","qZh":"","aEn":"","aZh":""}],     // ⑧ 快测自查
 "bcAlerts":[{"topicEn":"","topicZh":"","bookEn":"","bookZh":"","bcEn":"","bcZh":"","ref":""}], // 🔺BC 差异
 "sourcePages":"1738-1812"}
```

索引 `data/study/chapters2/index.json`：{id,n,titleEn,titleZh,group,examWeight,status}。
章节文件按需加载（54 章全量约 2MB，拆文件保页面轻）。

## 质量红线

- 每条要点必须**可考**：含数值/判据/顺序/禁忌，禁止概念空话（"X 很重要"=废条）
- 临床大章 60-120 条要点 + 硬数字 ≥8；运营/职业章 30-60 条酌减
- 中文原生撰写，禁直译腔、禁碎片拼接
- **版权安全线（公开站）**：全部改写压缩，任意连续 30 词不得与原文匹配；不搬书图；
  原文提取件只存 `D:\Claude\bcexam-sources\nancy-chapters\`（仓库外），永不入库
- 教材 vs BC 考纲冲突：以考纲为准并写进 bcAlerts（已知差异：新生儿四步阶梯、硝酸甘油
  SBP>110、COPD 高流量氧、FBAO、液体复苏 20mL/kg 上限 2L、TXA 2g/1min）

## 管线

- **Phase 0** 修 40-54 章标题错位（并入新索引，一次到位）
- **Phase A** `tools/extract-chapter.py`：按 PDF 目录切 54 章 → section 切片 + 章首能力编码
  → `bcexam-sources/nancy-chapters/chNN/`（manifest + 分节 txt）
- **Phase B** 每章一个 agent 重写（大章 13/30/44 拆 2-3 份再合并）。批次：
  - 批1（管线验证+高优先）：21 出血休克、17 患者评估、25 脊柱、29 呼吸、42 产科、43 新生儿
  - 批2（monster+高优先）：13 气道(358p,拆3)、30 心血管(280p,拆3)、44 儿科(172p,拆2)
  - 批3：45 老年、36 中毒、38 环境、21 后续高权重临床章
  - 批4-6：其余临床章 → 职业/运营章 → 新章(40/46/48)
- **Phase C** 每批五关验收：①数值抽 5 回原书核对 ②BC 冲突扫描 ③30 词抄袭窗口
  ④中文罕见字扫描 ⑤模板化检测（标题填空率+互异度）→ `tools/verify-chapters2.py`
- **Phase D** UI：分节手风琴、硬数字表样式、BC 警示框、已读进度、搜索扩展到要点。
  v2 缺章时回退旧 chapters.json 内容——**任何中间态都不许出现空板块**

## 部署

全部批次验收完 → 本地全站过一遍 → bump 版本串 → 一次性 push。中途绝不部署半成品。
