# Nook · 文档中心索引

> **少数密友的数字避难所 · A Digital Sanctuary**
> 没有商业目的、没有规模化、没有 24 小时在线、没有通知噪音 — 只有「你和你的少数密友」之间的纯文字对话，30 天自动淡出。
>
> 本目录是 Nook v1.0 的全部设计文档（`E:\Vibecoding\Nook\docs\`）。

---

## 🤖 如果你是 AI Agent · Context 冷启动

**⚠️ 不要逐个读本目录！** 直接读同级文件：

👉 **[`STARTUP-MANUAL.md`](./STARTUP-MANUAL.md)**

它已经汇编了所有 16 个设计阶段 + 55 个 Task + Bootstrap Checklist + 12 步 AI 流水线。读这一份就够了，掌握背景后按需回查具体文档。

---

## 📂 四类目录

| 类别 | 路径 | 职责 | 何时读 |
|---|---|---|---|
| **01_Product** | `01_Product/` | **WHAT** — 产品定位、需求规格、视觉规范、冻结声明 | 任何需求/范围/边界争议时 |
| **02_Architecture** | `02_Architecture/` | **HOW** — 技术选型、数据模型、API 契约、ADR 决策记录 | 设计/评审/排查架构争议时 |
| **03_Engineering** | `03_Engineering/` | **WORKFLOW & MEMORY** — 编码规范、Git 工作流、任务拆分、项目记忆 | 写代码、跑流程时 |
| **04_Runtime** | `04_Runtime/` | **RUNTIME ASSETS** — 组件规范、tokens（CSS/TS/JSON） | 实现 UI / 应用设计 tokens 时 |

---

## 📖 推荐阅读顺序（按角色）

### 🎯 Project Lead（产品发起人 / 决策者）
读 **5 份** 就够把握全貌：
1. `01_Product/Nook-PRODUCT.md` — 产品定位 / 反模式 / 功能分级
2. `01_Product/Nook-SPEC.md` — 41 F-ID + 28 AC 的 Live Spec
3. `02_Architecture/Nook-ARCHITECTURE.md` — 技术选型与限额
4. `03_Engineering/ROADMAP.md` — MVP → V1.0 → V2.0 节拍
5. `03_Engineering/AI_HANDOVER.md` — 一图掌握当前状态

### 🏗 Tech Lead / 系统设计者
读完 Project Lead 的 5 份后加：
6. `02_Architecture/Nook-ARCH-DESIGN-v1.0.md` — 数据模型 + RLS + API 拓扑
7. `02_Architecture/Nook-DATA-MODEL.md` — 13 实体 + 35 R-* 规则
8. `02_Architecture/Nook-API-DESIGN-v1.0.md` — 端到端契约
9. `02_Architecture/adr/README.md` — 20 项 ADR 总览

### 💻 Frontend Developer
读完 Tech Lead 的 9 份后加：
10. `03_Engineering/Nook-PROJECT-STRUCTURE.md` — 代码目录规范
11. `03_Engineering/Nook-CODING-STANDARDS.md` — 类型/命名/错误/i18n
12. `04_Runtime/components/` — 4 个原子组件规范
13. `04_Runtime/tokens/` — Design Tokens 入口

### ⚙️ Backend / DB Developer
读完 Tech Lead 的 9 份后加：
- 同 #10 / #11（共享）；并精读 `02_Architecture/Nook-ARCH-DESIGN-v1.0.md` § 4（Schema + RLS）

### 🤖 AI Coding Agent
按 **AI 12-step 流水线** 走（来自 `STARTUP-MANUAL.md`）：
1. 读 `AI_HANDOVER.md` → 2. 读 `DEVELOPMENT_LOG.md` → 3. 读 `TODO.md` → 4. 确认当前开发目标 → 5. 开始 → 6. 完成 → 7-11. 更新项目记忆 → 12. 输出总结

---

## ❄️ 5 份**冻结**文档 · 不可擅改

> 修改以下 5 份文档前必须先新增一份 ADR 说明修改理由（参见 `Nook-GIT-WORKFLOW.md § 八`）。

1. `01_Product/Nook-SPEC.md` · **Single Source of Truth** · 需求 Live Spec
2. `02_Architecture/Nook-ARCHITECTURE.md` · 技术选型 + 限额
3. `02_Architecture/Nook-ARCH-DESIGN-v1.0.md` · 数据模型 + RLS + API 拓扑
4. `02_Architecture/Nook-DATA-MODEL.md` · 业务模型 + 权限矩阵
5. `02_Architecture/Nook-API-DESIGN-v1.0.md` · 端到端 API 契约

---

## 🔍 文档速查表

### 01_Product/
- `Nook-PRODUCT.md` — 产品定位 · 反模式 · UC-A/B/C
- `Nook-INTERVIEW-spec.md` — 6 道 Interview 决定
- `Nook-SPEC.md` — **Live Spec** · 41 F-ID + 18 BF + 25 CAP + 28 AC
- `Nook-SPEC-FREEZE.md` — v1.0 freeze 记录
- `Nook-SPEC-FREEZE-v1.0.1.md` — v1.0.1 patch freeze 记录
- `Nook-DESIGN.md` — 视觉规范 · 动效 · Tokens 来源

### 02_Architecture/
- `Nook-ARCHITECTURE.md` — 冻结方案 · 技术栈 · 限额
- `Nook-ARCH-DESIGN-v1.0.md` — 数据模型 · RLS · API 拓扑 · 部署
- `Nook-DATA-MODEL.md` — 13 实体 · 35 R-* · 5 级隐私
- `Nook-API-DESIGN-v1.0.md` — REST · EF · Realtime · Errors + OpenAPI schema
- `adr/README.md` · `ADR-001.md` ~ `ADR-020.md` — 20 项技术决策记录

### 03_Engineering/
- `Nook-PROJECT-STRUCTURE.md` — 目录结构规范 · 4 features · 6 import rules
- `Nook-CODING-STANDARDS.md` — TypeScript · React · i18n · Theme · 22 anti-patterns
- `Nook-GIT-WORKFLOW.md` — GitHub Flow · Conventional Commits · AI 协议
- `Nook-WORK-BREAKDOWN.md` — 55 Task · 8 Epic · 7 Milestone · 依赖图
- `Nook-PROJECT-BOOTSTRAP-PLAN.md` — Bootstrap 10 步 · 30 Checklist · 6 Risks
- `STARTUP-MANUAL.md` *(在 docs/ 根)* — **AI 冷启动入口** · 16 阶段汇编 + 12 步流水线
- `AI_HANDOVER.md` — **AI 交接** · 当前状态 · 接手须知
- `CHANGELOG.md` — 版本变更 · Keep a Changelog 格式
- `DEVELOPMENT_LOG.md` — Session 流水 · 时间顺序
- `TODO.md` — Task 状态 · 五态分类
- `KNOWN_ISSUES.md` — 已知问题 · KI-1..7
- `DECISIONS.md` — 22 项 ADR 摘要（**权威源在 `02_Architecture/adr/`**）
- `ROADMAP.md` — MVP → V1.0 → V2.0 节奏

### 04_Runtime/
- `components/` — Avatar · Bubble · Button · Input 4 个原子组件规范
- `tokens/` — Tokens TS 入口 + README
- `Nook-DESIGN-TOKENS.md` — Tokens 文档
- `Nook-DESIGN-TOKENS.css` — Tokens CSS 变量
- `Nook-DESIGN-TOKENS.ts` — Tokens TS 类型
- `Nook-DESIGN-TOKENS.json` — Tokens JSON 中间表示

---

## 📚 术语表 (Glossary)

| 术语 | 释义 | 来源 |
|---|---|---|
| **Owner** | 注册 Nook 的人，系统中唯一的 Owner | `01_Product/Nook-PRODUCT.md` § 3.4 |
| **Friend** | 5-15 个密友，被邀请加入 | 同上 |
| **F-ID** | 功能 ID（`F-<DOMAIN>-<NN>` 如 `F-AUTH-01`） | `01_Product/Nook-SPEC.md` § 0.3 |
| **BF-NN** | 业务流 ID（`BF-<NN>`） | 同上 |
| **CAP-NN** | API 能力 ID（`CAP-<NN>`） | 同上 |
| **AC.NN** | 验收 ID（`AC.<NN>`） | 同上 |
| **ADR-NNN** | 架构决策记录（详见 `02_Architecture/adr/`） | `02_Architecture/adr/README.md` |
| **PII 红线** | email / language / last_seen_at → Sensitive | `02_Architecture/Nook-DATA-MODEL.md` § 11 |
| **30 天哲学** | 所有消息/图片/文件统一 30 天 TTL | `01_Product/Nook-SPEC.md` § 1.7.1 |
| **Sanctuary** | 与微信/Discord 不比功能完整度，比的是信噪比 | `01_Product/Nook-PRODUCT.md` § 3.1 |

---

## 🛠 维护规则

### 修改冻结文档
1. **不要直接修改** 5 份冻结文档（见上方 ❄️ 列表）
2. 写新需求 → 修改 `Nook-SPEC.md` 并新增一行 `[来源: § X.Y]` 引用
3. 写新架构 → 新建 ADR（参考 `02_Architecture/adr/README.md` 模板）
4. 写新工程规范 → 修改 `Nook-CODING-STANDARDS.md` 或 `Nook-PROJECT-STRUCTURE.md`
5. **每次修改后必须同步** 4 份项目记忆：`AI_HANDOVER.md` · `DEVELOPMENT_LOG.md` · `TODO.md` · `CHANGELOG.md`

### AI Coding 协议
详见 `STARTUP-MANUAL.md § AI 12 步流水线` 与 `Nook-GIT-WORKFLOW.md § 八`。

---

_Last updated: 2026-06-27 · Stage 18.0 文档重组后 · 4 类目录 + 21 个文件 + 20 个 ADR + 7 份项目记忆_
