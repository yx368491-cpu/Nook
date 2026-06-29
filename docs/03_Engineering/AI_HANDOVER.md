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
| **当前阶段** | M2 · Auth Flow ✅ Done (v0.5.0 tagged 2026-06-28) → **M3-1 DB Schema Migration ✅ Done (S26.0)** → **M3 → M4 Chat Core 全段 ✅ Done (S32.0)** · M3-2 → M4-7.1 共 11 milestone + RT closure + polish · **本机 Docker 已永久废弃 (S29.0 · KI-9)** · 验证链仅 static-only |
| **当前文档版本** | `v1.0.1`（2026-06-27）— 含 docs-only patch Sync + 全部 15 设计阶段冻结 |
| **代码版本** | `v0.5.0 + M3-1 (c88c076) + M3-2 (75d7300) + M3-3 (70d6e41) + M3-4 (0fa9cbd) + M3-5 (d1915f2) + M4-1/2 (d39dbbe) + M4-3 (9fa1968) + M4-4 (ea2f2ef) + M4-5 (7f2b47a) + M4-6 (33e4179 + fixup 6eaa861) + M4-7 (0111398 + RT closure 075b4b1 + 540165a) + M4-7.1 polish (7e3ec3f) + M4-8 (d320483) + M5-1 (dadcb01) + M5-2 (bf52d90) + M5-3 bundled per S40.0 + M5-4 (d6c0ae2) + M5-5 (5e7fab3) + M5-6 (75c286e) · S40.0 batch · annotated tag `v0.5.0+M5.6` · + **M5-7 (6e593f2) · S41.0 docs sync · annotated tag `v0.5.0+M5.7`**` |
| **目标用户** | Owner（1）+ Friend（≤ 20 社交目标） |
| **MVP 节拍** | 4-6 周个人工作量 |
| **产品定位** | "少数密友的数字避难所"（不商业化 / 不规模化） |
| **Next session** | **M6 admin work** — M5-7 50MB upload progress bar (S41.0 · F-MSG-03) ship 走了 · M5-* 全 7 milestone complete（M5-1..M5-3 bundled · M5-4 image-pipeline · M5-5 EXIF read-not-write · M5-6 avatar upload · M5-7 50MB UI progress + cancel + drag-drop）· M6 = admin bootstrap EF + invite/create/reset-password/delete-friend UI + `confirm` modal + admin Routes + `/settings/admin` page · **Deferred v1.1+**: M5-4-compress canvas WebP compression (R-30 原图保真 作为 opt-in quota-friendly) · M5-2.1 manual retry button + outbox in-app toast (in-app button) · push-notification cross-device sync · Sentry DSN / LogSnag token env-set · M5-1.1 quota UI |
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
| ✅ 已完成 | M3-1 · DB Schema Migration | **7 SQL migration files (0001..0008)** · 9 表 + 7 RLS + 3 trigger + 3 pg_cron + 2 storage bucket + 2 RPC (S26.0) |
| ✅ 已完成 | M3-2 · Sidebar | conv 列表 + unread + 1:1/group mix (commit `75d7300`) |
| ✅ 已完成 | M3-3 · MessageList + MessageItem | virtualized + day separators + paginated (commit `70d6e41`) |
| ✅ 已完成 | M3-4 · Composer | floating-island input + send glue + image/file plumbing (commit `0fa9cbd`) |
| ✅ 已完成 | M3-5 · Realtime channels | live append + stick-to-bottom + 5 channel 命名约定 (commit `d1915f2`) |
| ✅ 已完成 | M4-1 · Typing broadcast | useTypingBroadcast (commit `d39dbbe`) |
| ✅ 已完成 | M4-2 · Three-dot typing animation | CSS keyframes + useTypingReceivers (commit `d39dbbe`) |
| ✅ 已完成 | M4-3 · 2-min edit + (edited) micro-tag | DB edit_window trigger + UI disabled + (edited) label (commit `9fa1968`) |
| ✅ 已完成 | M4-4 · Soft message recall | `messages.recalled_at` + 列级 GRANT (commit `ea2f2ef`) |
| ✅ 已完成 | M4-5 · Sender-only soft delete | `messages.deleted_by_sender_at` 列级 GRANT + 列级 RLS (commit `7f2b47a`) |
| ✅ 已完成 | M4-6 · Reply threading | parent_id FK + closure + reply UI (commit `33e4179` + followup `6eaa861`) |
| ✅ 已完成 | M4-7 · 6 emoji reactions (F-MSG-09 / CAP-15) | fn_add_reaction + fn_remove_reaction + bucketReactions + EmojiPicker + onReactionEvent RT gate · RT closure `075b4b1` + `540165a` REPLICA IDENTITY FULL + publication membership (commit `0111398`) |
| ✅ 已完成 | M4-7.1 · viewport-flip + regex polish | EmojiPicker 自适应翻转(`top→bottom` 8px margin gate) + `mapReactionErrorCode` `(?![a-z])` forward-proof regex (commit `7e3ec3f`) |
| ✅ 已完成 | M4-8 · Ambient 在线状态 (F-ST-01 / AC.11) | useConversationPresence 双写 receiver · ChatPanel 头部 6 px lavender pulse dot · 9 unit tests (commit `d320483` · S33.0) |
| ✅ 已完成 | M5-1 · Dexie + outbox foundation (F-MEDIA-01 / AC.17) | Dexie v1 schema + state machine (`MAX_ATTEMPTS=5` + `SENT_GRACE_MS=30min`) + UUID v4 helper + useOutbox read-only observer · 65/65 vitest · 96/96 full suite · 0 new tsc errors (commit `dadcb01` · S34.0) |
| ✅ 已完成 | M5-2 · Workbox SW bg sync + useSendMessage outbox rewire (F-MEDIA-01 / AC.17) | vite-plugin-pwa Workbox BG sync `nook-messages-queue` (7d retention · 5 retries) + registerServiceWorkerOnce 3-gate (PROD/env/navigator) + Composer 黄色点 + reconnecting strip + useSendMessage outbox rewire · 11/11 vitest + 159/159 full suite + 0 new tsc errors (commit `bf52d90` · S35.0). Note: M5-3 (client_msg_id dedupe live verify + process startup rehydrate in-flight outbox rows) reassigned into M5-2 commit per S40.0 scope recombination. |
| ✅ 已完成 | M5-4 · offline-first image attachment pipeline (F-MSG-02 / F-MEDIA-01 / NF-STAB-N03) | Dexie v2 attachments cache (200 MB / 30 d LRU/TTL/quota) + blob-first upload pipeline (quota preflight 110% margin) + Workbox CacheFirst GET /storage/v1/object/sign/* + Workbox NetworkOnly+BGsync POST · 17/17 vitest + 197/197 full suite + 0 new tsc errors (commit `d6c0ae2` · S37.0) |
| ✅ 已完成 | M5-5 · EXIF read-not-write + informational warning (F-MSG-02 / NF-SEC-N05) | pure module JPEG APP1 walker (no library) + read-not-write per R-30 image-no-compression policy + 6s warning toast · 8/8 vitest + 205/205 full suite + 0 new tsc errors (commit `5e7fab3` · S38.0). Note: Composer.tsx EXIF warning code + i18n chat.exifWarning.* keys bundled into M5-2 commit due to file entanglement. |
| ✅ 已完成 | M5-6 · avatar upload UI + reactive store (F-AUTH-09 / AC.13 / CAP-17) | src/lib/api/profile.ts 4 validation codes + AvatarPicker data-testid × 6 + useAuth 3 actions + profiles.avatar_url reactive rewire · 30/30 vitest + 235/235 full suite + 0 new tsc errors (commit `75c286e` · S39.0). PATCH profiles.avatar_url:null FIRST then best-effort storage purge (race-safe fallback) |
| ✅ 已完成 | M5-7 · 50MB upload progress bar + cancel + drag-drop (F-MSG-03) | `chat.ts` UploadAttachmentOptions + AttachmentUploadError + uploadAttachmentBytes XHR helper + opts passthrough + `useFileUploadProgress` AbortController hook + `<UploadProgressBar>` role=progressbar + `<AttachmentDropZone>` pointer-events-none overlay + Composer.dispatchFile finally reset + CANCELLED swallow + tokens.css @keyframes progress-fade-in + i18n × 2 lang `chat.upload.{progress,progressAria,cancelAria}` + `chat.dropZone.{title,hint}` · **18/18 vitest M5-7 specs** + **253/253 full unit suite** + 0 new tsc errors + reviewer ship-ready after 1 should-fix (zh-CN `{{percent}}` double-brace fix) (commit `6e593f2` · S41.0) |
| 🟢 下一步 | **M6 · Admin work (settings/admin + 邀请 + 重置密码 + 删除 friend)** | M5-* 全 7 milestone complete · M6-1 `/settings/admin` route + AdminGuard + M6-2 EF `admin-create-invite` + M6-3 `/invite/new` UI (target=any/target=conversation) + M6-4 EF `admin-reset-password` + M6-5 EF `admin-delete-friend` (原子 batch left_at UPDATE) + M6-6 `confirm` modal + M6-7 复制 URL 复制 · F-SEC-04 / CAP-03 / F-AUTH-03/04/07 / CAP-19/20 / F-SEC-06 / AC.02/16/18 |

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
- **M3 → M4 · Chat Core ✅ Done (S32.0)** — M3-2 Sidebar · M3-3 MessageList · M3-4 Composer · M3-5 Realtime channels · M4-1 Typing · M4-2 三点动画 · M4-3 2-min edit · M4-4 soft recall · M4-5 sender-only soft delete · M4-6 reply threading · M4-7 6 emoji reactions (with RT closure) · M4-7.1 polish = 11 个 milestone 全 ship · Next = M4-8 Ambient
- M1 Foundation Bootstrap 全部完成 (v0.4.0)
- M2-3 friend-signup EF 自动化集成测试已就绪（14 scenarios · 本机 static-only 跳 11 项 live；S29.0 后 run at staging CI）
- M2-4 `/invite/:token` 邀请落地页已实现（RPC + hooks + 组件 + 页面）
- M2-3 EF `email_exists → 409` 错误映射已修复（S24.0）
- M3-2 Sidebar 已 ship (commit `75d7300`)
- M3-3 MessageList + MessageItem 已 ship (commit `70d6e41`)
- M3-4 Composer 已 ship (commit `0fa9cbd`) — floating-island + send glue
- M3-5 Realtime channels 已 ship (commit `d1915f2`)
- M4-1 typing broadcast 已 ship (commit `d39dbbe` + M4-2 三点动画合并 commit)
- M4-3 2-min edit + (edited) tag 已 ship (commit `9fa1968`)
- M4-4 soft recall 已 ship (commit `ea2f2ef`)
- M4-5 sender-only soft delete 已 ship (commit `7f2b47a`)
- M4-6 reply threading 已 ship (commit `33e4179` + fixup `6eaa861`)
- M4-7 6 emoji reactions 已 ship (commit `0111398` + RT closure `075b4b1` + `540165a`) — F-MSG-09 / CAP-15 / AC.07 ✅
- M4-7.1 viewport-flip + regex polish 已 ship (commit `7e3ec3f`)
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
| M3-4 · Composer | ✅ 已完成 (0fa9cbd) — floating-island input + send glue + image/file plumbing |
| M3-5 · Realtime channels | ✅ 已完成 (d1915f2) — live append + stick-to-bottom + 5 channel 命名约定 |
| M4-1 + M4-2 | ✅ 已完成 (d39dbbe) — useTypingBroadcast hook + 三点动画 keyframes + useTypingReceivers mocks |
| M4-3 · 2-min edit window + (edited) micro-tag | ✅ 已完成 (9fa1968) — DB edit_window trigger (BEFORE UPDATE) + UI disabled + micro-label 动画 |
| M4-4 · Soft message recall | ✅ 已完成 (ea2f2ef) — `messages.recalled_at` 列级 GRANT + 列级 RLS (修订 F-MSG-07 取发人 ≠ 作品中其他朋友的可见性) |
| M4-5 · Sender-only soft delete | ✅ 已完成 (7f2b47a) — `messages.deleted_by_sender_at` 列级 GRANT + 列级 RLS (F-MSG-07 本人隱藏其他端仍可见) |
| M4-6 · Reply threading | ✅ 已完成 (33e4179 + fixup 6eaa861) — parent_id FK + closure + F-MSG-04 AC.07 UI |
| M4-7 · 6 emoji reactions (F-MSG-09 / CAP-15) | ✅ 已完成 (0111398 + RT closure 075b4b1 + 540165a) — fn_add_reaction + fn_remove_reaction 五层 guard · bucketReactions · EmojiPicker · onReactionEvent 自-actor gate · REPLICA IDENTITY FULL + publication |
| M4-7.1 · viewport-flip + regex polish | ✅ 已完成 (7e3ec3f) — EmojiPicker `top→bottom` 自适应翻转 (FLIP_MARGIN_PX=8) + `mapReactionErrorCode` `(?![a-z])` forward-proof regex |
| **M4-8 · Ambient 在线状态 (F-ST-01 / AC.11)** | ✅ 已完成 (commit `ac3e8f0`) — `useConversationPresence` 双写 (online + typing) receiver · `usePresence` store 重构 per-conv Map · ChatPanel 头部 6 px lavender pulse dot · 9 unit tests (self-actor gate per M4-7 closure 教训) · delete 旧 `useTypingReceivers` + 5 处 upstream JSDoc sync |
| **M5-1 · Dexie + outbox foundation (F-MEDIA-01 / AC.17)** | ✅ 已完成 (S34.0 · 未 commit) — `src/lib/db/{schema, outbox, client_msg_id}.ts` (Dexie v1 db singleton + state machine + UUID v4 helper) + `src/hooks/useOutbox.ts` (read-only `useLiveQuery` observer + bucketed `{pending, sent, failed, total}` api) · 65/65 vitest + 96/96 full unit suite + 0 new tsc errors + 0 critical reviewer blockers · **foundation only** (上层 wire + SW bg sync defer M5-2) |
| **M5-2 · Workbox SW bg sync + useSendMessage outbox rewire (F-MEDIA-01 / AC.17)** | ✅ 已完成 (commit `bf52d90` · S35.0 · 本机 static-only) — `vite.config.ts` vite-plugin-pwa Workbox BG sync `nook-messages-queue` (7d retention · 5 retries) · `src/hooks/useServiceWorker.ts` plain `registerServiceWorkerOnce()` (refactor from hook) + module-level singleton + PROD/env flag/navigator triple-gate · `src/main.tsx` boot invoke · `src/hooks/useSendMessage.ts` outbox rewire (enqueue/markSent/markFailed fire-and-forget) + `extractErrorMessage` helper (handles Supabase `{code, message}` payload past `Error`-instance) · `src/components/chat/Composer.tsx` 黄色点 + reconnecting strip + canonical `generateClientMsgId` · `src/lib/i18n/locales/{en,zh-CN}/translation.json` `chat.outbox.{pending, pendingCount_one, pendingCount_other, reconnecting}` × 2 lang · `package.json` + `workbox-window@^7` + `vite-plugin-pwa@^0.x` · **11/11 vitest M5-2 specs + 159/159 full unit suite + 0 new tsc errors + 0 critical reviewer blockers** · 6 in-session fix · **M5-3 (client_msg_id dedupe live verify + process startup rehydrate in-flight outbox rows) bundled into M5-2 commit per S40.0 scope recombination** · M5-2.1 followup = manual 「点按钮重试」 + outbox in-app toast (detail scope, deferred v1.1+) |
| **M5-4 · offline-first image attachment pipeline (F-MSG-02 / F-MEDIA-01 / NF-STAB-N03)** | ✅ 已完成 (commit `d6c0ae2` · S37.0 · 本机 static-only) — Dexie v2 attachments cache (PK=`&id` + 索引 `conversationId, lastAccessedAt, expiresAt, [conversationId+lastAccessedAt]` · 200 MB / 30 d · 110% quota preflight before `persistAttachmentBlobLocally` 防 `QuotaExceededError`) + blob-first upload pipeline (uploadAttachment convId-for-mirror-key + quota preflight `lruPurgeUntilUnder(MAX/2)`) + Workbox `CacheFirst` GET `/storage/v1/object/sign/*` (200 entries / 30 d / 200 MB) + Workbox `NetworkOnly + BackgroundSyncPlugin('nook-messages-queue', 7d/5 retries)` POST · `<AttachmentImage>` blob hydrate via cache before signed-URL fallback + touch on hydrate success maintains LRU chain · 17/17 vitest M5-4 specs + 197/197 full unit suite + 0 new tsc errors + 0 critical reviewer blockers · M5-4-compress (canvas WebP compression) deferred v1.1+ |
| **M5-5 · EXIF read-not-write + informational warning (F-MSG-02 / NF-SEC-N05)** | ✅ 已完成 (commit `5e7fab3` · S38.0 · 本机 static-only) — `src/lib/storage/exif.ts` pure module JPEG APP1 walker (no library) · `ExifDetectionResult = { hasExif, sources: ['jpeg_app1'] }` · `detectExif(file): Promise<ExifDetectionResult>` (module self-resolves all errors to BF E3 `{ hasExif: false, sources: [] }`) · constants `JPEG_SOI/JPEG_APP1_MARKER(0xE1)/EXIF_MAGIC[6]/EXIF_SCAN_BYTES(64KB)/JPEG_STANDALONE_MARKERS Set/JPEG_SOS_MARKER(0xDA)` · 8/8 vitest M5-5 specs + 205/205 full unit suite + 0 new tsc errors + 0 critical reviewer blockers · **SPEC 调解**: R-30 image-no-compression + user request + BF E3 fail-soft converge on read-not-write informational model (user retains agency) · format coverage v1.0 = JPEG only (HEIC/PNG/TIFF/WebP deferred v1.1+) · Composer.tsx EXIF warning code + i18n chat.exifWarning.* keys bundled into M5-2 commit due to file entanglement |
| **M5-6 · avatar upload UI + reactive store (F-AUTH-09 / AC.13 / CAP-17)** | ✅ 已完成 (commit `75c286e` · S39.0) — `src/lib/api/profile.ts` (NEW · ~190 行) `validateAvatarFile` × 4 codes + `buildAvatarObjectPath(uid/file/now)` + `resolveAvatarPublicUrl` + `uploadAvatar/deleteAvatar/updateProfile` · `src/components/settings/AvatarPicker.tsx` (NEW · ~210 行) 4 buttons (Pick/Remove/Save/Cancel) + M5-5 detectExif warning reuse + 6 data-testids · `src/stores/useAuth.ts` extended with `isUploadingAvatar` + 3 actions · `src/app/pages/SettingsProfilePage.tsx` 重写 (~75 行) · i18n × 2 lang `settings.profile = {name, saved}` + `settings.avatar.*` (12 keys) · 30/30 vitest M5-6 specs + 235/235 full unit suite + 0 new tsc errors + reviewer ship-ready (round-3 LGTM after 5 critical findings fix) · **PATCH `profiles.avatar_url: null` FIRST then best-effort storage purge** (race-safe fallback so Avatar consumers see initials immediately) |
| **M5-7 · 50MB upload progress bar + cancel + drag-drop (F-MSG-03)** | ✅ 已完成 (commit `6e593f2` · S41.0 · 本机 static-only) — `src/lib/api/chat.ts` UploadAttachmentOptions interface (`onProgress?: (loaded, total) => void` + `signal?: AbortSignal`) + AttachmentUploadError class (code: STORAGE_ERROR / NETWORK_ERROR / CANCELLED / AUTH_MISSING) + uploadAttachmentBytes XHR helper (POST `${env.supabaseUrl}/storage/v1/object/attachments/<path>` · Bearer auth from `supabase.auth.getSession()` snapshot · `xhr.upload.onprogress` → UI · `signal.addEventListener('abort')` bridges `xhr.abort()` · signal.aborted===true short-circuit throws CANCELLED BEFORE XHR construct · `{ once: true }` abort listener for cleanup idempotency) + uploadAttachment + sendAttachmentMessage extended opts passthrough (SDK path register when opts absent) · `src/hooks/useFileUploadProgress.ts` (NEW) AbortController + state + cancel/reset + unmount cleanup · `src/components/chat/UploadProgressBar.tsx` (NEW) role=progressbar + aria-valuen{now/min/max} + cancel button + data-testid × 2 · `src/components/chat/AttachmentDropZone.tsx` (NEW) pointer-events-none dashed-soft overlay + icon + title + hint · `Composer.tsx` dispatchFile M5-7 wiring: startUpload(file)→{onProgress,signal}→mutateAsync→finally resetUpload · **CANCELLED swallow in catch BEFORE existing error-mapping cascade** (user-intentional abort ≠ failure) + i18n × 2 lang chat.upload.{progress,progressAria,cancelAria} + chat.dropZone.{title,hint} + tokens.css @keyframes progress-fade-in 120ms ease-out + 18/18 vitest M5-7 specs + 253/253 full unit suite + 0 new tsc errors + reviewer round-1 ship-ready after 1 should-fix (zh-CN progressAria single-brace `{percent}` → double-brace `{{percent}}` for i18next interpolation) + 2 cosmetic nits (settled-guard in uploadAttachmentBytes + cancelUpload dep array — followup note) · **special noteworthy**: M5-7.0 commits 6e593f2 chained after 75c286e (M5-6) && v0.5.0+M5.6 (annotated tag from S40.0) remains stable pointing at 75c286e, S41.0 promotes a new annotated tag **v0.5.0+M5.7** at 6e593f2 |
| **Docker 架构决策 + S40.0 docs sync + version tag + S41.0 docs sync** | 🟢 **v0.5.0+M5.7** annotated tag pushed at commit `6e593f2` (S41.0 · 2026-06-29) — M5-7 ship adds XHR-direct upload path · `v0.5.0+M5.6` (S40.0) preserved unchanged as M5-* 中点 marker. Total M5-* milestone batch = 7 commits (M5-1 foundation / M5-2 SW bg sync / M5-3 client_msg_id+bundled / M5-4 image pipeline / M5-5 EXIF read-not-write / M5-6 avatar / M5-7 50MB UI). Next session pivot: M6 admin work (admin-bootstrap EF + invite UI + reset-password EF + delete-friend EF + `confirm` modal + admin Routes). |

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

---

## S34.0 Update · 2026-06-28 · M5-1 Dexie + outbox foundation

**里程碑**: M5-1 = AC.17 离线 / 弱网 message replay 链路的 **数据层 foundation**。Ship 4 source files + 4 test files + 1 devDep + 2 runtimeDeps + 5 i18n keys × 2 lang。

**严格 scope discipline**:
- ✅ M5-1 ships = Dexie v1 schema · outbox state machine · pure reducers · Dexie mutators · UUID v4 helper · useOutbox read-only observer · useTotalOutboxCount · useOutboxManualRefresh (M5-2 reserved)
- ❌ 不改 Composer.tsx useSendMessage 接入 outbox → **M5-2**
- ❌ 不注册 Service Worker / bg sync replay → **M5-2**
- ❌ 不把 outbox wire 到 UI Composer 黄点 → **M5-2**
- ❌ 不加 Blob attach for outbox kind='image'/'file' → **M5-4 / M5-5 / M5-7**
- ❌ 不加 Dexie warm messages cache (DR-10 1000-row FIFO 列) → **M5-5**

**代码增量**:
```
src/lib/db/client_msg_id.ts                       +30   NEW
src/lib/db/schema.ts                              +90   NEW
src/lib/db/outbox.ts                              +240  NEW
src/hooks/useOutbox.ts                            +130  NEW
tests/setup.ts                                    +1    fake-indexeddb
src/lib/db/client_msg_id.test.ts                  +60   NEW
src/lib/db/schema.test.ts                         +160  NEW
src/lib/db/outbox.test.ts                         +540  NEW (22 cases)
src/hooks/useOutbox.test.tsx                      +260  NEW (13 cases)
src/lib/i18n/locales/{en,zh-CN}/translation.json  +10   5 keys × 2
package.json                                      +3 deps
```

**验证** (本机 static-only · per KI-9):
- vitest **65/65 pass** in M5-1 specs (45 new + 20 carryover)
- vitest **96/96 pass** in full unit suite (12 files · M5-1 +17 net · **0 regression**)
- tsc **0 new errors** in 4 modified files (17 pre-existing unchanged)
- code-reviewer-minimax-m3 **0 critical blockers** (9 polish suggestions 记录不动 · M5-1.1 polish pass 补)

**验证 chain 本机 live verify = 0**: 按 **S29.0 / KI-9 Docker 永久废弃** 决策，本机无任何 `supabase db reset` / `supabase functions serve` / `docker` 路径走 · 仅云 staging/prod path 上以 `supabase db push --include-all --project-ref <cloud>` 施加 M5-1 后的 M5-2 EF migration 后 provokes 端到端 live verification。

**Next session=M5-2**: Workbox SW bg sync + useSendMessage rewire + Composer outbox yellow-dot UI wire · 实际这是 M5-1 的 partner layer · M5-1 foundation + M5-2 application glue = AC.17 完全验收。

**不变**: 22 项 ADR (D-01..D-22) · KI-9 (Docker 永久废弃 · 本机 static-only) · KI-1 (Storage 6-8月) · FU-3 (active friend 重邀请 v1.1+) · FU-4 (Owner 自删 v1.1+) · KI-4 (Supabase 单厂商) · KI-8 (远端仓库 待创建 repo)

## S32.0 Update · 2026-06-28 · M3 → M4-7 Chat Core 全段 ship + 项目记忆 resync

**里程碑跨度**: S29.0（本机 Docker 永久废弃 · 架构决策）→ S30.0（M4-7 加 RT closure ship · `0111398` + `075b4b1` + `540165a`）→ S31.0（M4-7.1 polish · `7e3ec3f` viewport-flip + `(?![a-z])` forward-proof regex）→ S32.0（项目记忆 resync · 本文件）。

**11 milestone chronology**:

| M | 描述 | commit | F-ID | spec |
|---|---|---|---|---|
| M3-2 | Sidebar | `75d7300` | F-CONV-01/03/05 | AC.00 |
| M3-3 | MessageList + MessageItem | `70d6e41` | F-MSG-01 | AC.02 |
| M3-4 | Composer floating-island | `0fa9cbd` | F-MSG-01/attachment plumbing | AC.03 |
| M3-5 | Realtime channels | `d1915f2` | F-MSG-01 live append | AC.06 |
| M4-1 + M4-2 | Typing hook + 三点动画 | `d39dbbe` | F-MSG-08 | AC.05 |
| M4-3 | 2-min edit + (edited) tag | `9fa1968` | F-MSG-05 | AC.04 |
| M4-4 | Soft recall | `ea2f2ef` | F-MSG-06 | AC.04 |
| M4-5 | Sender-only soft delete | `7f2b47a` | F-MSG-07 | AC.10 |
| M4-6 | Reply threading | `33e4179` + `6eaa861` | F-MSG-04 | AC.07 |
| M4-7 | 6 emoji reactions | `0111398` + `075b4b1` + `540165a` | F-MSG-09 | AC.07 |
| M4-7.1 | viewport-flip + regex polish | `7e3ec3f` | (M4-7 polish) | — |

**RT-layer closure**（3 commits):
- `075b4b1` self-actor gate: onReactionEvent 跳过 `new.user_id === session.user.id` · 防自己的 INSERT 推送被自己的 store 重叠处理
- `540165a` REPLICA IDENTITY FULL: messages.reactions 表列进 publication + FK on reactions.message_id = messages.id 加 SET NULL （迁移 0016 补加）
- 3 三点 anim 测试与 M4-7 ship 后 hook mocks 同步 · useAddReaction + useRemoveReaction 2 hook + 28 unit tests ship

**验证链**（本机 static-only · S29.0 后）:
- `git show --stat` 出 `75d7300` ... `7e3ec3f`  11 milestone · 4 docs-only · tsc src/ 0 new errors · vitest 82/82 · integration 0 live run · code-reviewer-minimax-m3 多轮 iter 全 LGTM

**决策**: 无新增 ADR · viewport-flip + (?![a-z]) 都是 tactical EF hardening · DECISIONS.md 不变

**本文件 resync 点**:
- ☑ "项目概况"表 · 当前阶段 / 代码版本 / Next session 三 cell 全 update（代码版本 加 11 后缀 commit hash）
- ☑ "⚠️ 重要 · 下次开发从哪里开始" · 加 9 行（M3-4 · M3-5 · M4-1 .. M4-7.1） · Next 改 M4-8 Ambient
- ☑ "下一位 AI 接手须知" · M3-M4-7 全 list 化 + commit hash
- ☑ "阶段状态" table · 加 9 行（M3-4 · M3-5 · M4-1 + M4-2 · M4-3 · M4-4 · M4-5 · M4-6 · M4-7 · M4-7.1）


**不变**: 22 项 ADR (D-01..D-22) · KI-9 (Docker 永久废弃 · 本机 static-only) · KI-1 (Storage 6-8月) · FU-3 (active friend 重邀请 v1.1+) · FU-4 (Owner 自删 v1.1+) · KI-4 (Supabase 单厂商) · KI-8 (远端仓库 待创建 repo)
