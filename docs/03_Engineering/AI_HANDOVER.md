# Nook · AI Handover

> ⚠️ **本文件是整个项目最重要的文档之一**——任何新的 AI 接手 Nook 都**必须**先读本文件。
> 由 Buffy 维护；任何 Stage 完成后**必须**更新本文件最新状态。

---

## 📖 阅读顺序（接手 Nook 项目必读）

按以下顺序逐项阅读；缺任一会大幅降低接手效率：

1. **📘 本文件**（`AI_HANDOVER.md`）— 项目概况 + 当前技术状态 + 当前开发重点 + 注意事项
2. **📜 `DEVELOPMENT_LOG.md`** — 最近 1-2 个 Session 的开发日志，理解完整上下文
3. **✅ `TODO.md`** — M1-M7 阶段任务清单；当前进度
4. **🎯 `../01_Product/Nook-SPEC.md`** § 1-3（项目概述 + 功能需求 + 数据需求）→ § 9（约束）→ § 10（AC）
5. **🏛️ `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md`** § 4（schema）→ § 5（RLS）→ § 6（API 契约）→ § 7（部署）
6. **⚠️ `KNOWN_ISSUES.md`** — 当前未决议 + FU-3/FU-4 deferred + 架构风险
7. **🗺️ `ROADMAP.md`** — V1.0/V1.1/V1.2/V2.0 规划
8. **📋 `DECISIONS.md`** — 22 项 ADR 决策（不要再发明相同决策）
9. **📝 `CHANGELOG.md`** — 版本号约定 + 历史

## 项目概况

| 字段 | 值 |
|---|---|
| **产品名称** | `Nook v1.0` |
| **项目描述** | 「深夜书房」一词为一间好友小房子，屏蔽互联网社交噪音的私人聊天网站（A Digital Sanctuary） |
| **当前阶段** | M2 · Auth Flow ✅ Done (v0.5.0 tagged 2026-06-28) → **M3-1 DB Schema Migration ✅ Done (S26.0)** → **M3-2 Sidebar ✅ (75d7300)** + **M3-3 MessageList ✅ (70d6e41)** · M3-4 Composer 待启动 · **本机 Docker 已永久废弃 (S29.0 · KI-9)** · 验证链仅 static-only |
| **当前文档版本** | `v1.0.1`（2026-06-27）— 含 docs-only patch Sync + 全部 15 设计阶段冻结 |
| **代码版本** | `v0.5.0 + M3-1 delta + M3-2 (75d7300) + M3-3 (70d6e41)` |
| **目标用户** | Owner（1）+ Friend（≤ 20 社交目标） |
| **MVP 节拍** | 4-6 周个人工作量 |
| **产品定位** | "少数密友的数字避难所"（不商业化 / 不规模化） |
| **Next session** | M3-4 Composer (floating island + image/file attach buttons) — 依赖 M3-3 的 Image/file plumbing 接口（M5-7 实际下载 deferred） |
| **本机环境（S29.0 后）** | Docker Desktop 已永久删除。本机 validation 仅 static。Live verification 仅在云 staging/prod 走 `supabase db push` + `supabase functions deploy`。 |

---

## 当前技术状态

### 已冻结（不可修改）
- ✅ `../01_Product/Nook-SPEC.md` `v1.0` · Live SoT — 41 F-ID + 18 BF + 28 AC
- ✅ `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md` v1.0 — 16 章权威架构
- ✅ `../01_Product/Nook-SPEC-FREEZE.md` / `../01_Product/Nook-SPEC-FREEZE-v1.0.1.md`
- ✅ `../01_Product/Nook-PRODUCT.md`（v1.0.1 patch FU-1 done）· `../02_Architecture/Nook-ARCHITECTURE.md`（v1.0.1 patch FU-2 done）

### 已确定的技术方案（D-09..D-17）
| 层 | 选型 |
|---|---|
| 前端 | React 18 + Vite + TS + Tailwind + Zustand + TanStack Query v5 + i18next + Dexie |
| 部署 | Cloudflare Pages（FE）+ Supabase Cloud（BE）+ R2 fallback |
| 后端 | Supabase 一体化（Postgres + Auth + Realtime + Storage + Edge Functions） |
| 数据库 | Postgres 15 + RLS 7 表（migration suite 0001..0008） |
| 实时 | Supabase Realtime（WS + Presence）+ pg_cron 3 tasks |
| Auth | Supabase Auth + 自建 invite-token（24h 一次性） |
| 监控 | Sentry free + LogSnag free |
| CI/CD | GitHub Actions |
| 字体 | 自托管 Inter + JetBrains Mono WOFF2（绝不 Google CDN） |

### 已冻结决策（不可逆）
- ❌ 永不放 Web Push / 系统通知 / Email 推送（D-03）
- ❌ 不支持 light mode 切换（D-Never-Do 9）
- ❌ 不支持已读回执 / 语音消息 / 视频通话（D-Never-Do）
- ✅ 4 群 + 8 成员 + 2 分钟编辑 + 30 天 TTL = DB trigger 守门
- ✅ F-MSG-07 = 列级软隐藏（D-04）
- ✅ **本机已无 Docker** （S29.0 / KI-9）· verification 模型 = static-only local + cloud-only live

### 当前依赖（待 M1 引入）


```jsonc
// 主依赖（M1 起引入）
"react": "^18.3.0",
"react-dom": "^18.3.0",
"react-router-dom": "^6.x",
"vite": "^5.x",
"typescript": "^5.x",
"tailwindcss": "^3.x",
"zustand": "^4.x",
"@tanstack/react-query": "^5.x",
"@tanstack/react-virtual": "^3.x",        // M3-3 引入（虚拟滚动）
"i18next": "^23.x",
"react-i18next": "^14.x",
"dexie": "^4.x",
"react-hook-form": "^7.x",
"zod": "^3.x",
"@supabase/supabase-js": "^2.x",
```


```

### 当前部署方案
- FE: Cloudflare Pages · 自动 HTTPS · 全球 CDN · 无带宽上限
- BE: Supabase Cloud free tier · 500MB DB · 1GB Storage · 2GB/mo 带宽 · 500k EF calls/mo · 200 WS 连接
- 兜底: Cloudflare R2 free · 10GB 存储
- 监控: Sentry free (5k err/mo) · LogSnag free (1k ev/mo)
- CI/CD: GitHub Actions 2000 min/mo
- **本机环境（S29.0 update · 2026-06-28）**: Docker Desktop 已永久删除。本机无法启动任何 `supabase start` / `supabase db reset` / `supabase functions serve`。Validation 模型：**static-only local + cloud-only live**。

---

## 当前开发重点

### ⚠️ 重要：下次开发从哪里开始？

| 优先级 | Stage | 行动 |
|---|---|---|
| ✅ 已完成 | M1 · Foundation | Vite 脚手架 + 13 路由占位页 + 4 原子组件 + CI (v0.4.0, S20.0) |
| ✅ 已完成 | M2 · Auth Flow | 注册/登录/邀请系统 — friend-signup EF + InviteLanding UI + 集成测试 (v0.5.0, S25.0) |
| ✅ 已完成 | **M3-1 · DB Schema Migration** | **5 NEW migration (0003..0008) + 2 existing (0001/0002) = 7 SQL files · 9 表 + 7 RLS + 3 trigger + 3 pg_cron + 2 storage bucket + 2 RPC fn · S26.0** |
| ✅ 已完成 | M3-2 · Sidebar | T-M3-02 conv 列表 + unread 计数 (commit 75d7300) |
| ✅ 已完成 | M3-3 · MessageList + MessageItem | virtualized + day separators + paginated (commit 70d6e41) |
| 🟢 下一步 | M3-4 · Composer | floating-island input + image/file attach buttons + send glue; 依赖 M3-3`MessageItem` + `AttachmentImage` plumbing |

### 本阶段（S26.0–S28.0）目标 · M3-1/M3-2/M3-3 ✅ 已完成

- **M3-1 · DB Schema Migration (S26.0)** — 7 SQL migration 文件（0001..0008）：9 表 + 7 RLS + 3 trigger + 3 pg_cron + 2 storage bucket + 2 RPC fn。 code-reviewer 多轮评审采纳。
- **M3-2 · Sidebar (75d7300)** — `useConversations` + `Sidebar` + `ConversationListItem` + `UnreadBadge` + 最新活动排序。code-reviewer 2 轮采纳。
- **M3-3 · MessageList + MessageItem (70d6e41)** — `@tanstack/react-virtual` 虚拟滚动 + cursor pagination + day separators + `AttachmentImage` signed URLs + `MessageItem` 自/他人翻转。code-reviewer 1 轮 + 大体采纳。

**验证结果**: typecheck(0 new errors) ✅ / unit tests 1+ pass ✅ / 三个 commit 工作树 clean ✅

**本机 Docker 已永久删除 (S29.0)** — **live verification 仅云 staging/prod 走**。本地 static verification = code-reviewer + typecheck + unit + git。

---

## 注意事项（**严守**）

### 🚨 不可修改（已冻结）
- ❌ `../01_Product/Nook-SPEC.md` 主体内容（`v1.0`）—— 改动必须走 `v1.x` 新版本
- ❌ `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md` 主体内容 —— 同上
- ❌ 22 项 ADR 决策（D-01..D-22）—— 改动必须新增修订条目（见 `DECISIONS.md` Amendments）

### 🚨 永不引入
- ❌ 不引除 Supabase / Cloudflare / Sentry / LogSnag / GitHub Actions 以外的供应商
- ❌ 不上 K8s / Docker Swarm / GraphQL Federation / 微服务
- ❌ 不引 Google Fonts CDN
- ❌ 不实现已读回执 / 语音消息 / 视频通话 / 朋友圈 / 红包 / 多设备管理 / 隐身
- ❌ **不重启本地 Docker / `supabase start`**（S29.0 · KI-9 · 本机已删 Docker · 反推 staging）

### 🚨 必须保持兼容
- ✅ 业务代码严禁硬编码 hex / px / 数值 —— 一切走 Nook-DESIGN-TOKENS.ts
- ✅ Icon-only Button 必须 `aria-label`
- ✅ focus-visible 必须显示 `2px var(--color-accent-soft-ring)` + `outline-offset: 3px`
- ✅ 所有触达目标 ≥ 44 × 44 px
- ✅ 强 dark theme（不引 light mode）
- ✅ 30 天 TTL **包括**已撤回占位
- ✅ prefers-reduced-motion 降为 0ms

### 🚨 已禁止 / Never-Do（产品决策）
- 任何"主流 IM 有，Nook 没"的功能进入前必须过 `Nook-PRODUCT § 2` 反模式清单

---

## 当前数据模型 & API 契约（Stage 9/10 冻结 · 引用即可）

- ✅ `../02_Architecture/Nook-DATA-MODEL.md` v1.0.1 — **纯业务数据模型**（13 实体 · 14 节）
- ✅ `../02_Architecture/Nook-API-DESIGN-v1.0.md` — **完整 API 契约**（13 章节 · 25 CAP 100% 覆盖）
- ❌ 实体反清单（Never-Exist）：Device · DeviceSession · ReadReceipt · PushSubscription · Notification · EmailQueue · VoiceMessage · VideoMessage · Payment · Poll · MomentsPost · Story · Announcement · ChatTheme 等
- ✅ F-ID 100% 覆盖（所有 41 F-ID 已回归到相应章节）
- ✅ PII 红线：email · language · last_seen_at → Sensitive；`deleted_by_sender_at` → Confidential（列级 GRANT）；AppEvent payload → Owner-only

> **约束**：任何 SQL / Drizzle ORM 落地必须先映射回 `../02_Architecture/Nook-DATA-MODEL.md`，**绝不允许脱离模型发明字段**。

---

## 当前已知问题
详见 `KNOWN_ISSUES.md`：
- 🟢 KI-9 · **Docker 已永久删除**（架构决策 · S29.0）—— 本机仅 static verification
- 🟡 FU-3 / FU-4 业务逻辑 → v1.1+
- 🟡 KI-1 Supabase Storage 6-8 月容量 → v1.1 准备迁 R2
- 🟢 KI-2 / KI-3 设计如此 / 已规避
- 🟠 KI-4 Supabase 单厂商故障 → v2.0+ 自管备选
- 🟢 KI-8 · v0.5.0 远端仓库推送待启动

---

## 开发流程（每次开发必走的 12 步）

> 本流程是项目长期连续性的核心。每次 Coding Session 结束**必须**完成 Step 6-11 的所有更新。

### 步骤
1. **阅读本文件**（AI_HANDOVER） — 了解全局 + 注意事项
2. **阅读 DEVELOPMENT_LOG** 最近 Session — 理解上下文
3. **阅读 TODO.md 活跃任务** — 当前阶段 + 优先级
4. **确认当前开发目标** — 与 Project Lead 对齐
5. **开始开发** — 按 SPEC F-ID + ARCH-DESIGN § 章节执行
6. **完成功能**
7. **更新 DEVELOPMENT_LOG** — 加新 Session 条目 S<n+1>.<m>
8. **更新 CHANGELOG** — 新版本（[0.X.Y] · Added / Changed / Fixed / Security）
9. **更新 TODO** — M<N>-<item> 状态：待 → 已完成
10. **更新 KNOWN_ISSUES** — 新发现的 bug / issue 立即登记
11. **更新本文件 AI_HANDOVER** — 当前技术状态 + 当前开发重点
12. **输出本次开发总结** — 1 段文本给 Project Lead

### 禁止跳过任何步骤

---

## 下一位 AI 接手须知

### 1. 不要"重新设计"
- 任何 SPEC / ARCH 已冻结部分**禁止修改**
- 若发现需修改，必须走 ask_user → Project Lead 显式确认 → 新增 F-ID / 修订条目

### 2. 必读顺序
- `AI_HANDOVER.md` → `DEVELOPMENT_LOG` → `TODO` → `SPEC.md § 1-3` → `ARCH-DESIGN § 4/5/6/7` → `KNOWN_ISSUES`

### 3. 当前最重要的开发任务
- **M2 · Auth Flow ✅ Done (v0.5.0, S25.0)** — M2-1~5 全部完成；M2-6 E2E via Playwright 延期至 M3 chat UI 完成后再开
- **M3 · Chat Core** — 已推进至 M3-3；M3-4 Composer (floating island) 待启动
- M1 Foundation Bootstrap 全部完成 (v0.4.0)
- M2-3 friend-signup EF 自动化集成测试已就绪（14 scenarios · 本机 static-only 跳 11 项 live；S29.0 后 run at staging CI）
- M2-4 `/invite/:token` 邀请落地页已实现（RPC + hooks + 组件 + 页面）
- M2-3 EF `email_exists → 409` 错误映射已修复（S24.0）
- M3-2 Sidebar 已 ship (commit `75d7300`)
- M3-3 MessageList + MessageItem 已 ship (commit `70d6e41`)
- **⚠️ 本机 Docker 已永久删除 (S29.0 / KI-9)** — 本机仅 static verification；任何「本地启 Postgres」提议 = 不适用 · 反推 staging
- 远端仓库推送 → 见 [`KNOWN_ISSUES.md` § KI-8`](./KNOWN_ISSUES.md#ki-8--v050-远端仓库推送--待启动--low)
- Docker 永久废弃决策 → 见 [`KNOWN_ISSUES.md` § KI-9`](./KNOWN_ISSUES.md#ki-9--docker-已永久删除--架构决策--low--s290)

### 4. 风险预警
- **🟢 KI-9**：本机 Docker 已永久删除 · **不是 bug，是架构决策**。本机不再预计 live verification。
- **🟠 KI-4**：Supabase 单厂商故障；不可绕过但 v1.0 接受
- **🟡 FU-3 / FU-4**：v1.0 不修；v1.1+ 处理
- **🟡 KI-1**：Supabase Storage 6-8 月逼近；v1.1 准备迁 R2

### 5. 决策一致性
- 22 项 ADR 已宣布（D-01..D-22）；不要重复发明也作不同决策
- 已有 ADR 的替代方案需新增修订条目（参见 `DECISIONS.md` Amendments）

### 6. 注意事项
- 业务代码不写裸 hex / px；所有走 Nook-DESIGN-TOKENS.ts
- 列级 GRANT 是默认值（不要轻易 `grant update on messages to authenticated`）
- pg_cron J-01 不会区分 recall vs active message（30 天全清含 recalled 占位）
- **本机 Docker 已永久删除 · KI-9 · S29.0**：禁止 `docker ...` / `supabase start` / `supabase db reset` / `supabase functions serve` 在本机 · 全部静态 only · live 仅云端

---

## Stage 状态

| Stage | 状态 |
|---|---|
| Stage 1-5 · 历史 | 已完成 |
| Stage 6 · SPEC Freeze | ✅ v1.0 |
| Stage 7 · Architecture Design | ✅ v1.0 |
| Stage 8.0 · v1.0.1 Patch Sync | ✅ docs-only |
| Stage 8.1 · PROJECT_WORKFLOW | ✅ 已完成 |
| Stage 9 · DATABASE_DESIGN | ✅ 已完成 |
| Stage 10 · API Design | ✅ 已完成 || Stage 11 · PROJECT STRUCTURE | ✅ 已完成 |
| Stage 12 · Architecture Decision Record (ADR) | ✅ 已完成 |
| Stage 13 · CODING STANDARDS | ✅ 已完成 |
| Stage 14 · GIT WORKFLOW | ✅ 已完成 |
| Stage 15 · WORK BREAKDOWN (WBS) | ✅ 已完成 |

| M1 · Foundation (Bootstrap Execution) | ✅ 已完成 (v0.4.0) |
| M2 · Auth Flow (M2-1~4) | ✅ 已完成 (v0.5.0) — tagged 2026-06-28 |
| M3-1 · DB Schema Migration | ✅ 已完成 (S26.0) — 7 SQL migration files (0001..0008) · 9 表 + 7 RLS + 3 trigger + 3 pg_cron + 2 storage bucket + 2 RPC |
| M3-2 · Sidebar | ✅ 已完成 (75d7300) — conv list + unread badge + 1:1/group mix |
| M3-3 · MessageList + MessageItem | ✅ 已完成 (70d6e41) — text/image 虚拟滚动 + day sep + paginated |
| **本机 Docker 架构决策** | 🟢 已生效 (S29.0 / KI-9) — 本机 Docker Desktop 已删除 · 验证链 static-only · live verification 仅云 staging/prod |

---

*End of Nook AI Handover — 2026-06-28 · v0.5.0 + M3.x · by Buffy*

## S18.0 Update · 2026-06-27

**当前状态**: 文档重组已完成;**当前开发重点**: M1 Foundation 代码开发。

**文档结构已变更**:
- 旧 `prompt/` (含 Nook-*.md 平铺 + components/ + tokens/ + docs/) → 已迁至 `E:\Vibecoding\Nook\docs\` 4 类目录
- 旧 `prompt/docs/` 7 份项目记忆 → 迁至 `docs/03_Engineering/`
- 旧 `prompt/docs/adr/` 20 ADR → 迁至 `docs/02_Architecture/adr/`
- 旧 `STARTUP-MANUAL.md` → 提权至 `docs/STARTUP-MANUAL.md`
- 旧 16+ Nook-*.md 平铺 → 已按 4 类分类

**如果下一位 AI 接手**:
- AI 冷启动: 读 `docs/STARTUP-MANUAL.md`
- 4 份项目记忆最新位置: `docs/03_Engineering/`
- ADR 权威源: `docs/02_Architecture/adr/`
- **下一位 AI 须知**: 当前树结构,直接读 STARTUP-MANUAL + AI_HANDOVER,可一次性掌握全部背景

__S18_TODO_HEADER_REPLACE__
-search-token-

## S19.0 Update · 2026-06-27 · 目录名 i18n 化

**当前目录结构 (Stage 19.0 后)**:
- `E:\Vibecoding\Nook\docs\` (顶层)
  - `01_Product/` — 产品定位 · 需求 · 视觉 · 冻结声明
  - `02_Architecture/` (含 `adr/`) — 技术选型 · 数据模型 · API · 决策记录
  - `03_Engineering/` — 编码规范 · 项目记忆
  - `04_Runtime/` (含 `components/` + `tokens/`) — 运行时资产
  - `README.md` · 顶部目录索引 (在 docs/ 根)
  - `STARTUP-MANUAL.md` · AI 启动入口 (已提权至 docs/ 根)
- `E:\Vibecoding\Nook\prompt\` — 设计输入仓库 (目前仅 `Bootstrap.txt`)

**AI 接手须知**: 路径所有 Chinese segments 已替换为 PascalCase w/ underscores (`01_Product`, `02_Architecture`, `03_Engineering`, `04_Runtime`). 中文 sub-narrative 保留在文档中 (项目语言为中英混合,不影响路径定位)。

## S29.0 Update · 2026-06-28 · 本机 Docker 永久废弃

- **决策原话**: "docker已删除，以后不需要做任何docker测试"
- **决策生效**: 本机 Docker Desktop 已删除。本机 validation 仅 static (code-reviewer + tsc + vitest + git)。
- **Live verification**: 仅云 Supabase (staging/prod)。`supabase db push --include-all` + `supabase functions deploy` 走云端。
- **禁令**: 任何 task / sub-task 提案不推 `docker` / `supabase start` / `supabase db reset` / `supabase functions serve` 在本机。
- **连锁记忆**: KI-9 · TODO.md FU-LOC-01 (升级为架构决策) + FU-LOC-02 (标记废弃) + FU-STG 表头 · CHANGELOG Unreleased S29.0 section · DEVELOPMENT_LOG S29.0 entry。
- **不变**: 云架构 / 22 项 ADR / FU-3 · FU-4 / KI-1..7 · KI-8 远端仓库推送（仍待 Project Lead 创建 repo）。
