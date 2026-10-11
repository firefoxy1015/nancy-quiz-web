# AI Examiner（考官机器人）— 完整设计与制作方案 v1.0

> 2026-10-11。写给接手的下一位工程师/模型（计划用 Claude Opus 5.5）。本文假设你没读过本仓库任何对话记录。
> 读完本文 + 本目录下的代码，你应该能独立把剩余工作做完。所有决策理由都写在这里，不要重新发明。

---

## 0. 一句话

在 `firefoxy1015.github.io/nancy-quiz-web`（BC 省 EMR/PCP 急救员考证备考站，纯静态 GitHub Pages）上，加一个"和模拟考官对话做 EMALB 实操模考"的功能：考官按官方评分手册给信息、计时、扣分、出成绩单；**大模型只负责听懂考生说了什么并用剧本回话，打分由确定性引擎完成**。

当前状态：**P1 完成并本地验证通过，未部署、未推送。** 3 个考站剧本就绪，引擎 12 项金标准测试全过，端到端（真实模型）跑通，前端含语音。

---

## 1. 不可违反的项目规则（用户立的，踩了会返工）

1. **只在用户说「推」/「推送」时才 `git push`。** 本地 commit 随时可以。线上有考生在用，半成品绝不上线。
2. **改了 css/js 必须升版本串**：`index.html` 里的 `?v=N`（css + app.js）和 `src/*.js` 里所有 `?v=N` import 必须同号。目前 **v20**。只改 `data/` 时升 `src/app.js` 里的 `DATA_V`。同名模块 URL 会被缓存，不升号=用户看不到改动。
3. **PowerShell 的 `Set-Content -Encoding utf8` 会加 BOM**，git diff 会脏。写文件用 Python（`io.open(..., newline='')`）或 Write 工具。改完查 `head -c3`。
4. **bash heredoc 在这个环境里不可靠**（多段 heredoc 常报 "unexpected EOF while looking for matching"）。补丁脚本先用 Write 写到 scratchpad 再 `python` 执行。
5. **任何模型/代理的产出都必须独立复核**（用户原话"SONNET比较笨，必须检查它的工作"）：跑闸门脚本、抽查数字回源、读中文通顺度。
6. **省 token**：代理一次写 2-3 份内容、共用公共材料；代理被限额杀掉后用 SendMessage 原地唤醒（上下文还在），不要重开。
7. **浏览器里的 `confirm()` / `alert()` 不可用**（内嵌浏览器和部分手机拦截）。已改成"两步点击确认"（`armed()`），新按钮沿用。
8. 网站默认**纯英文**，中文/双语要用户点右上角按钮；考试内容本身全英文（真实考试如此），界面 chrome 双语用 `t(en, zh)` / `bi(en, zh)`。
9. EMR 赛道全站蓝色、PCP 青色（`html[data-track]` 驱动 `--accent`），新 UI 一律用 CSS 变量，不写死颜色。
10. 不做付费墙。用量保护只用"每设备每日 4 场"。

---

## 2. 官方依据（全部已数字化，别去重新解读 PDF）

| 文件 | 在哪 | 用途 |
|---|---|---|
| EMALB《Practical Examination Grading Criteria》2025-03 | `data/practical/rubric.json`（58 个评分项、三档权重、官方错误原句 EN/ZH、autoFails、附录 A 止痛规则、计时规则） | **引擎扣分的唯一依据**；所有 `errorEn` 必须是这里的原句 |
| 原文 txt | `D:\Claude\bcexam-sources\grading-criteria.txt`（39 页） | 查考官行为规范原文 |
| BC《Provincial Examination Guidelines》2026-06-15 | `D:\Claude\bcexam-sources\bc-exam-guidelines.txt`（94 页） | 协议/药物/技能标准；剧本数字回溯的语料 |
| 场景库 | `data/practical/scenarios.json`（16 通用）+ `emr-*.json`（20 EMR 专属）= 36 场 | 剧本的源材料（派遣、11 幕考官脚本、期望动作+权重、两套体征、交接范本、PCR 要点） |
| 产品计划书 | `EXAMINER-BOT-PLAN.md` | 背景、考试流程、通道实测 |

考试流程要点：1 内科 + 1 创伤，各 40 分钟硬停；RTC 15 分钟内打包（"on the cot with straps secured"）、非 RTC 30 分钟；场后 5 分钟 PCR；100% 起扣、70% 及格；考官只评不教。

---

## 3. 架构

```
浏览器（静态站，GitHub Pages）                        服务端（FastAPI，Render，无状态）
┌──────────────────────────────┐   HTTPS/JSON    ┌───────────────────────────────┐
│ src/examiner.js              │ ──────────────▶ │ main.py   路由/CORS/日限额      │
│  hub → brief → live → pcr    │                 │ engine.py 事件合并+计时+扣分    │
│  → result                    │ ◀────────────── │ prompts.py 系统提示+tool schema │
│ 整场 run 存 localStorage     │                 │ llm.py    通道（cc-vibe→官方）  │
│ 语音：SpeechRecognition/TTS  │                 │ sheets/*.json 剧本（考生看不到）│
└──────────────────────────────┘                 └───────────────────────────────┘
```

**无状态**：浏览器每次调用都带上整场 `log`（对话）和 `events`（已记录事件），服务端重建上下文。刷新/断网不丢；服务端不存任何会话。

### 3.1 文件地图（`examiner-server/`）

| 文件 | 职责 | 行数级别 |
|---|---|---|
| `main.py` | `/health`、`GET /api/examiner/scenarios`、`POST /api/examiner/start|turn|finish`；CORS 白名单；每设备日限额（内存，按日期清零）；事件归一化；体征由引擎拼句 | ~230 |
| `engine.py` | 剧本加载；体征组推导；解锁条件；状态变化；`merge_events`；`format_vital`；`score()` 评分表 | ~330 |
| `prompts.py` | 考官规范（系统提示）；`examiner_turn` / `closing_review` / `write_feedback` 三个 tool schema；收尾评审提示 | ~190 |
| `llm.py` | Anthropic SDK 客户端，`base_url` 指向 cc-vibe；官方 API 备用；通道熔断；`tool_call()` 带一次"必须调工具"重试 | ~60 |
| `sheets/<id>.json` | 剧本（见 §5）；`*.skeleton.json` 是生成器产物，可删 | 40-45 KB/份 |
| `tools/build_skeleton.py` | 从场景 JSON 生成剧本骨架 | |
| `tools/verify_sheet.py` | 剧本五道闸门（schema/触发线索/官方原句/数字回溯/一致性） | |
| `tools/e2e_candidate.py` | 脚本化考生走完整场，打印对话、事件、成绩表（花真实模型调用） | |
| `tests/test_engine.py` | 引擎金标准测试（不碰模型、不碰磁盘剧本） | 12 个 |
| `SHEET-SCHEMA.md` | 剧本字段定义 + 作者规则 | |
| `render.yaml` / `requirements.txt` / `README.md` | 部署 | |

前端：`src/examiner.js`（~330 行）；路由在 `src/app.js`（`examiner`、`examiner-run`）；入口卡在 `src/scenario.js` 实操营首页；样式在 `styles.css` 末尾 `/* AI examiner */` 段。

---

## 4. 模型通道（实测事实，2026-10-11）

主通道 **cc-vibe**（用户包月）：`base_url=https://cc-vibe.com`，`x-api-key`，Anthropic 原生 `/v1/messages`。目录 13 个全是 Claude（Opus 5.5 / Sonnet 5.5 / Fable 5.1 / Haiku 4.5…）。

| 能力 | 结果 | 设计后果 |
|---|---|---|
| tool_use + `strict: true` | ✅ 透传，枚举约束生效 | **所有结构化输出走 tool 定义** |
| `output_config.format` | ❌ 被剥 | 不用 |
| 对话中途 `role: system` | ❌ 被丢 | 引擎指令以 `[ENGINE] …` 前缀写进 user 轮 |
| 流式 SSE | ✅ | 未来语音边生成边念可用 |
| 长系统提示（5.5K token） | ✅ 不截断 | 剧本放 system |
| prompt caching 账单字段 | ⚠️ 数字不反映我们的内容 | 包月，不关心 |
| 身份注入 | ⚠️ 中转站注入 Claude Code 身份；Haiku 曾拒绝扮演考官；Opus 5.5 守得住 | 提示词写"运行模拟层"而非"假装是考官"；用 Opus 5.5 |
| 模型自编 | ⚠️ 会报没给的时间、多报体征分量 | **体征和时间由引擎拼句**；系统提示禁止模型说体征数值和时间 |
| 速度 | 每轮约 17 秒（Opus 5.5，effort 默认 medium） | 语音场景偏慢；待试 `output_config.effort: low`（可能被剥） |

备用通道：官方 Anthropic API（`ANTHROPIC_API_KEY` 存在即启用，`llm.CHANNELS` 顺序）。

Key 只放环境变量（`CCVIBE_API_KEY`），**永远不写进文件和 git**。

---

## 5. 剧本（Simulation Sheet）

完整字段见 `SHEET-SCHEMA.md`。核心思想：**剧本是模型能知道的全部事实**；不在剧本里的，模型必须说 "No further information available"。

关键字段：
- `expected[]`：从场景复制的期望动作（itemId / weight / phase / licence / actionEn / triggers），引擎自动编号 `E01…`；**权重不要改**。
- `vitalsSets[]`：结构化体征（pulse.rate/rhythm/strength，resp.rate/depth/character …），带 `unlock` 条件（`always | elapsedMs | afterEvent(+count) | anyOf | allOf`）。**模型每轮只看到当前解锁的那一组**，数值由引擎播报。
- `stateChanges[]`：条件（`elapsedMs` / `missingEvent` / `afterEvent`）→ 考官台词 + `vitalsPatch`（触发后覆盖体征）。
- `specialEvents[]`：场景专属的"坏事"（松止血带、让患者走路…），模型可报告，规则可引用。
- `drugs[]`：可给的药（key / 别名 / 剂量 / licence）。事件名 `drug:<key>`。
- `majorMoves[]`：大动作（`move:<key>`），每次之后必须复评 ABC-I。
- `protocolRules[]`：引擎规则。`check ∈ {present, absent, ordered, max_count, before_each, within_after}`；`deduct.errorEn` **必须是 rubric.json 原句**（验收脚本逐字核对）。
- `painManagement`：附录 A 止痛逻辑的声明（引擎内置实现）。
- `notificationFacts / handoffFacts / pcrFacts`：收尾评审的对照事实。

### 5.1 生产管线（已跑通，用于剩余 33 场）

```
python examiner-server/tools/build_skeleton.py <id>        # 骨架
→ 代理（Fable 或 Opus）填 sheets/<id>.json                   # 每填一组字段就写盘
→ python examiner-server/tools/verify_sheet.py <id>        # 五闸 PASS、untraced 数字逐个解释
→ 人工抽查：病史是否患者口吻、协议规则是否覆盖 criticalPitfalls、数字回源
→ 服务端自动列出（/api/examiner/scenarios 扫 sheets/ 目录）
```

代理提示词模板见本次会话记录（要点：读 SHEET-SCHEMA + 骨架 + rubric.json；只用骨架里 `_phaseScripts` 的原文转写；没写的给阴性答案不编阳性；errorEn 逐字复制；自跑验收到 PASS）。一个代理一份剧本约 17-19 万 token、10 分钟。

---

## 6. 一轮对话的生命周期（`POST /turn`）

1. 客户端发：`scenarioId, track, elapsedMs, text, log[], events[], fired[]`。
2. 服务端：解锁体征组（含已触发状态变化的 patch）→ 算到期的状态变化 → 拼 `[ENGINE] time | vitals set N | STATE CHANGE … | TIME IS UP …` 注记。
3. 重建消息：候选人每句 = user（带时间戳），考官/患者/搭档台词 = assistant 文本（**不回放 tool_use 块**，所以历史里没有悬空的 tool 调用）。
4. 调模型，要求调用 `examiner_turn` 工具：`say[] / events[] / flags[]`。不调工具则加一句 `[ENGINE] You must respond by calling …` 重试一次；仍失败或 `refusal` → 返回 "Please repeat that." 并打 flag。
5. `_normalize_events`：type→事件名（`drug:`/`move:`/special/`transport:`），过滤未知 key / eid。
6. `engine.merge_events`：**每个事件按 quote 定位到它真正出自的考生发言**（模型爱重报旧动作），同名同时刻的丢弃，体征 45 秒内重复的丢弃，已得分的 eid 不重复记。返回新事件 + 本轮新测的体征。
7. 体征：引擎用 `format_vital()` 按考生要的分量拼句（"Pulse: rate 92 — rate only."）；模型说出的体征数字行被 `_strip_vital_numbers` 删掉。
8. 返回 `say, events, fired, engineLines, flags`。客户端追加到 log/events，语音播报。

### 6.1 收尾（`POST /finish`）

1. 引擎先算一遍（知道哪些项已到顶档）。
2. 模型调 `closing_review`：通报/交接缺了哪些官方要素（"缺"=完全没提）、PCR 缺字段/与事实矛盾、`quality[]`（≤3 条，只能从 QUALITY_CATALOGUE 的官方原句里选，必须引用考生原话）。
3. 引擎 `score(..., closing, quality)` 出成绩表（见 §7）。
4. 模型调 `write_feedback`：考官口头反馈（陈述式，120-180 词）+ 教练复盘 EN/ZH。

---

## 7. 评分引擎规则（`engine.score`）

| 步骤 | 规则 | 官方依据 |
|---|---|---|
| 1 期望动作缺失 | 每个 `expected` 没有对应事件（eid 或同 itemId）→ 按其 weight 扣；**协议/技能/转运类封顶 25**（`PRESENCE_CAP`），100 只由规则触发；`overall-call-management / overall-patient-care / notification / hand-off / documentation` 不按缺失扣（分别由收尾评审和模型判断） | 评分表各项"Fails to…" |
| 2 体征组计时 | 一组（BP+脉搏+呼吸）>3 分钟 → OCM 15；两组间隔：危重 >9 分钟 15 / 7-8 分钟 10，稳定 >19 / 17-18 | p.35 注 |
| 3 转运 | 无判定或判错 → 25；打包（`move:load` 或 `lift-to-cot`）超 15/30 分钟 → 25 | p.19 |
| 4 持续复评 | 每个 `move:*` 后 3 分钟内无 `ongoing-abc-i` → 15（场景结束前 60 秒内的动作豁免）；从未复评 → 15 | p.37 |
| 5 剧本规则 | `protocolRules` 逐条 | 剧本 |
| 6 附录 A | PCP：给了口服未给 Entonox 25；只给 Entonox 10；复位后才给 Entonox 100…；EMR：该给 Entonox 未给且已复位 100 | p.39 |
| 7 收尾 | 通报缺失 5（危重）/3；交接缺关键要素 3、缺 ≥5 项 5；PCR 未交 5、缺 ≥3 字段或矛盾 3、缺 1-2 字段 1 | p.38 |
| 8 模型主观项 | 只接受 rubric 原句 + 合法权重；不会抬高引擎已定档次 | |
| 汇总 | 每项取最高一档；系统问诊、体检各封顶 15；任一 100 → autofail（score 0，场景仍走完） | p.9, p.26-27 |

成绩表行：`{itemId, nameEn/Zh, section, weight, errorEn/Zh, evidence{t, quote}, source: engine|examiner-judgement}`。

---

## 8. 前端（`src/examiner.js`）

状态机 `run.phase: brief → live → pcr → result`，整个 `run` 存 `S.examinerRun`（刷新可续）；结束后进 `S.examinerHistory`。

- **brief**：派遣、器材、搭档、赛道提示、今日剩余场次；Begin 开始计时。
- **live**：40 分钟倒计时；判定 RTC 后出现打包倒计时；"距上次体征"变色（7/9 分钟）；对话气泡四色；输入框 + 🎤；"Hand-off done → write PCR" 两步确认。
- **语音**：`SpeechRecognition`（`en-CA`，非连续，一句一次）；识别稿进输入框，**3 秒倒计时后自动发送，点输入框即取消**（给改错的机会）；`speechSynthesis` 念考官/患者/搭档台词（患者音调低、搭档高）；考生开口时打断朗读。无麦克风的浏览器自动隐藏 🎤。
- **pcr**：5 分钟倒计时、9 个字段、到时自动提交。
- **result**：总分/PASS/FAIL/自动不及格横幅；按 section 分组的扣分表（官方原句 EN+ZH、证据原话+时间、"考官判断"标签）；时间线；考官口头反馈（可朗读）；教练复盘（折叠，明确标注真实考试没有）。
- API 地址：localhost 开发指向 `http://localhost:8787`，生产指向 `https://bcprep-examiner.onrender.com`（部署后若域名不同，改 `examiner.js` 顶部或在浏览器 `localStorage.setItem('bcprep2.examinerApi', url)` 覆盖）。

---

## 9. 测试

- 单元：`python -m pytest -q examiner-server/tests/test_engine.py`（用绝对路径，cwd 在 Windows 下不稳）。12 个用例：完美脚本 100 分、EMR 忽略 PCP 项、漏颈椎自动不及格、体征超时与大间隔、RTC 打包超时/分级错、动作后未复评、附录 A、收尾扣分、主观项只认原句、"rate only"、事件去重、协议缺失封顶。
- 端到端：`python examiner-server/tools/e2e_candidate.py md-02 pcp`（本地服务需先起：`$env:CCVIBE_API_KEY='…'; uvicorn main:app --port 8787`）。第一次跑发现并修掉了 3 个真问题：模型重报旧事件（→ `merge_events`）、"没口述上限"被当 100（→ `PRESENCE_CAP`）、收尾评审把"不完整"当"缺失"（→ 提示词）。
- 浏览器：本地 `.claude/launch.json` 的 `bcprep` 预览（端口 8765），已验证 hub → brief → live（一轮真实对话）→ 两步确认 → PCR → result。

**每次改引擎或提示词后，三样都要跑。**

---

## 10. 部署（待用户说推）

1. Render 新建 Blueprint，指向本仓库 `examiner-server/render.yaml`；在 Dashboard 设 `CCVIBE_API_KEY`（不要写进 yaml）。
2. 服务起来后 `GET /health` 应列出 3 个剧本和通道 `["cc-vibe"]`。
3. 若 Render 分配的域名不是 `bcprep-examiner.onrender.com`，改 `src/examiner.js` 的 API 常量并升版本串。
4. Render 免费层会休眠，首次请求慢 30-60 秒；前端 brief 阶段已有 loading 文案，可考虑在 hub 页预热（`fetch('/health')`）。
5. `git push`（只在用户说推时）→ GitHub Pages 自动部署前端。

---

## 11. 已知问题与待办（按优先级）

### P1 收尾（接手先做）
- [x] E2E 五轮迭代已做完（2026-10-11）：事件不再重报（277→51）、体征不重复播报（55→14 行）、协议缺失封顶 25/口述类 15、同句三项体征算一组、动作同句复评算数、打包/RTC/通报/交接关键词兜底、交接"缺失"以考生原话+剧本事实为准、被原话否定的主观扣分剔除（`finalize_closing`）、规则行与"没做"行同分时取规则行、给药即视为协议已启动。第五轮：17 轮 149 秒、51 事件、得分 2 且无自动不及格，剩余扣分全部是脚本故意留的缺陷。
- [ ] **写一份"干净"的 E2E 脚本**（15 分钟内打包、两组体征间隔 ≤6 分钟、做 FE 和体检、PCR 与交接一致），作为回归基线：应得 ≥85 分；现有 `e2e_candidate.py` 的脚本是故意有缺陷的。
- [ ] 教练复盘偶尔编造不存在的协议要求（例："给 ASA 前必须测血糖"）；已在提示词里限制为只谈评分表里的项，若仍出现改为把 `expected[].actionEn` 清单显式传给反馈调用并要求逐条引用。
- [ ] 模型偶尔漏记明显动作（例：说了 "Gloves and eye protection on" 没给 E04）。目前靠"同 itemId 已有事件则不扣"兜底（只对 weight<100 生效）。可做：基于 `expected[].triggers` 的本地关键词匹配（仅 weight ≤15 的项，避免误给高权重分）。
- [ ] 模型回话里的 "Noted." 过多；患者答史一次吐六个问题的答案（真实患者会一个个答）。提示词微调。
- [x] 速度实测（`tools/speed_probe.py`，2026-10-11）：Opus 5.5 每轮约 9 秒，effort default 和 low 一样（cc-vibe 多半剥掉了 effort）；**Sonnet 5.5 反而慢（20-22 秒）且无视"只报最新一句"把全部旧动作重报**——结论：逐轮也用 Opus 5.5，不换 Sonnet。延迟主要来自输出 token（约 450）；下一步可做：`events[].key` 改为可选以减少输出、或流式（`eager_input_streaming`）边生成边播报 `say`。
- [ ] 收尾评审偶尔把"PCR 漏了一个细节"报成 mismatch（应为 1% 轻微缺陷而非 3% 矛盾）；已在提示词里写明，若仍出现改为引擎只接受含 "vs" 对比的条目。

### P2 内容
- [ ] 剩余 33 场剧本（按 §5.1 管线，每代理 1 份；优先通用池 16 场，再 EMR 专属 20 场）。
- [ ] 抽签两场模考（复用 `S.practicalMock` 的思路：随机 1 内科 + 1 创伤，连考，各自成绩）。
- [ ] 结果页"和自评模式对比"、错题趋势。

### P3 打磨
- [ ] 语音：流式 TTS（边生成边念）；更自然的声线；安卓 Chrome 长句识别截断问题观察。
- [ ] 考官风格参数（严格/中性）。
- [ ] 日限额改持久化（Render 重启会清零内存计数；可用 Render 的磁盘或 SQLite）。
- [ ] `/finish` 两次模型调用合并成一次（减半延迟）。

### 不做
- 摄像头动作识别；中文考试；付费；考中提示按钮；让模型自由打分。

---

## 12. 验收标准（P1 对外可用的定义）

1. 3 个考站任一场：开考 → 20+ 轮对话 → PCR → 成绩表，全程无 5xx、无 "Please repeat that." 连续两次。
2. 金标准脚本（`e2e_candidate.py` 的 md-02 脚本）得分在 60-80 之间且扣分项全部可解释（它故意有打包超时、未做 FE/体检、交接自相矛盾）。
3. 手机 Chrome：语音一句话 → 3 秒后自动发送 → 听到考官回复。
4. 同一设备第 5 场返回 429 并有中文提示。

---

## 13. 本次会话留下的痕迹（供对照）

- 本地提交记录：`git log --oneline` 看 `LOCAL ONLY` 标记的提交。
- 临时文件：`C:\Users\Firefoxy\AppData\Local\Temp\claude\D--Claude\<session>\scratchpad\`（E2E 输出、补丁脚本）。
- 用户记忆文件：`C:\Users\Firefoxy\.claude\projects\D--Claude\memory\nancy-quiz-web-project.md`、`astro-llm-channel.md`（cc-vibe 实测脾气）。
