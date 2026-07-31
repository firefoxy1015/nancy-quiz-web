# BC EMR/PCP Exam Prep · BC 省急救员考证备考系统

**[▶ Open the site 打开网站](https://firefoxy1015.github.io/nancy-quiz-web/)**

A bilingual (English / 中文) study system for the three exams that stand between you and a British Columbia paramedic licence — built from the current official documents, not from a generic US EMT textbook.

一个中英双语的备考系统，覆盖 BC 省急救员拿牌必过的三关考试。全部内容依据 **2026 年现行官方文件**结构化，不是照搬美国教材。

---

## What it covers 覆盖什么

| | EMR | PCP |
|---|---|---|
| **Written 笔试** | EMALB's own online exam · 200 Q · 2.5 h · **75 % to pass** | **COPR** national exam · 200 Q (180 scored) · two 120-min parts · standard score |
| **Jurisprudence 法规考** | EMALB · 25 Q · no time limit · **80 % to pass** | same 同上 |
| **Practical 实操考** | 1 medical + 1 trauma · 40 min each · deduction-based, **70 % to pass** | same 同上 |

> ⚠️ A common mix-up: **the EMR written exam is EMALB's own exam, not the COPR exam.** Only PCP (and ACP) candidates write COPR in BC.
> 常见误解：**EMR 笔试是 EMALB 自己出的，不是 COPR 统考**；BC 只有 PCP/ACP 才考 COPR。

---

## Features 功能

**📝 Written camp 笔试营**
- Practice mode with instant bilingual explanations, filterable by topic and competency area
- Full mock exams that replicate the real format — for PCP that means blueprint-weighted sampling (Area H ≈ 70 %), two 120-minute parts, a 10-minute break you can't undo, and a COPR-style red/yellow/green competency report at the end
- Wrong-answer book that only clears a question once you get it right

**🚑 Practical camp 实操营**
- Scenario simulator: run a call phase by phase (dispatch → scene → primary survey → transport decision → history → vitals → functional enquiry → head-to-toe → interventions → ongoing → handoff)
- Self-check lists carry the **real examiner deduction weights** from the official grading criteria, so your score moves the way the examiner's pen moves
- Live 40-minute exam clock plus the RTC 15-minute / non-RTC 30-minute packaging countdown
- PCR writing practice and a model hand-off report to compare against
- **Auto-fail flashcards**: every 100 %-deduction action from the official rubric

**⚖️ Jurisprudence camp 法规营**
- Bilingual notes on the Emergency Health Services Act, the EMA Regulation (including the Schedule 1 / Schedule 2 scope-of-practice split), conduct, records and continuing competence
- Every practice question cites the specific section it comes from

**📖 Study library 学习内容库**
- The official patient assessment model, 13 protocols, 32 treatment topics, 18 drug monographs (each tagged EMR / PCP), 145 abbreviations, GCS, history mnemonics
- Everything carries a source page reference back to the official PDF

---

## Sources 内容依据

All clinical and procedural content is structured from these documents (verified 2026-07-25):

| Document | Version |
|---|---|
| [BC Provincial Examination Guidelines](https://www2.gov.bc.ca/assets/gov/health/about-bc-s-health-care-system/heath-care-partners/colleges-board-and-commissions/emergency-medical-assistants-licensing-board/britishcolumbiaprovincialexaminationguidelines.pdf) (94 pp) | current to June 15, 2026 |
| [EMALB Practical Examination Grading Criteria](https://www2.gov.bc.ca/assets/gov/health/about-bc-s-health-care-system/heath-care-partners/colleges-board-and-commissions/emergency-medical-assistants-licensing-board/emalbpracticalexaminationgradingcriteria.pdf) (39 pp) | March 2025 |
| [COPR Entry to Practice Examinations Handbook](https://copr.ca/wp-content/uploads/2025/07/Examination-Handbook.pdf) | July 9, 2026 |
| [COPR PCP / EMR Examination Blueprints](https://copr.ca/examinations-emr-pcp-acp/blueprints/) + Canadian Paramedic Competence Framework | 2024 / rev. 2025 |
| [EMA Regulation B.C. Reg. 210/2010](https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/210_2010) · Emergency Health Services Act RSBC 1996 c.182 | current |

The grading criteria state that examiners may not mark against any other agency's standards — so where a textbook (including Nancy Caroline) differs from the BC guidelines, **this site follows the BC guidelines.**

---

## ⚠️ Disclaimer 免责声明

This is an **unofficial** study tool with no affiliation to EMALB, COPR, or any training institution. All practice questions and scenarios are original material modeled on publicly available official documents — they are not real exam questions. Official rules change; always verify against [EMALB](https://www2.gov.bc.ca/gov/content/health/about-bc-s-health-care-system/partners/colleges-boards-and-commissions/emergency-medical-assistants-licensing-board) and [COPR](https://copr.ca) before booking or relying on anything here.

本站为**非官方**备考工具，与 EMALB、COPR 及任何培训机构无关联。所有练习题和场景均为依据公开官方文件自研的模拟内容，**不是真题**。官方规定会变，报名和备考前请以 EMALB 和 COPR 官网为准。

A website can train decision-making, sequencing, timing and deduction awareness. It cannot train your hands — BVM technique, bandaging and spinal rolls need real equipment and real practice.
网站能练决策、流程、时间感和扣分意识，但练不了手上功夫——BVM、包扎、脊柱滚动必须用真实器材线下实练。

---

## Running locally 本地运行

Static site, no build step:

```bash
python -m http.server 8765
```

Then open http://localhost:8765

Validate the content files:

```bash
python tools/validate.py
```

## Repo layout 目录结构

```
index.html · styles.css · src/        app shell, exam engine, scenario player, study library
data/meta/                            exam rules + COPR blueprint
data/written/                         question banks (parts/ + index.json manifest)
data/practical/                       grading rubric + scenarios
data/jurisprudence/                   legislation notes + question bank
data/study/                           assessment model, protocols, treatments, drugs, reference
tools/validate.py                     schema / blueprint / bilingual validation
v1/                                   archived first version (Nancy Caroline quiz site)
PLAN.md · HANDOFF.md                  product plan & execution handbook
```
