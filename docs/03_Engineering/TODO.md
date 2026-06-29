# Nook · TODO

> **任务按 M1-M7 阶段分组**（取代拍 41 个 F-IDs 平铺——更高层、更易追迹）。  
> **状态机**：待开发 → 开发中 → 已完成 → 延期（转入 v1.1+）/ 已取消

---

## 状态总览

| 状态 | 数量 |
|---|---|
| ✅ 已完成（文档/设计阶段） | 14 Session（S0.0 至 S17.0） |
| ✅ 已完成（WBS 拆分） | 55 Task 全部定义（M1-M7） |
| ⏳ 待开发 | 7 Milestone（M1-M7） — M2-1~4 已完成 |
| 🚧 开发中 | 0 — M2·Auth Flow M2-1~4 完成 |
| ⏸ 延期至 v1.1+ | 见 `KNOWN_ISSUES.md` FU-3/FU-4 |
| ❌ 已取消 | 0（Never-Do 列表的功能，但仍记录不被实现） |

---

## M1 · Foundation（架构脚手架）

**目标**：Vite + React18 + TS + Tailwind + i18next 工程初始化；13 路由占位；4 原子组件；自托管字体；CI

| # | 任务 | 关联 F-ID | 状态 |
|---|---|---|---|
| M1-1 | `npm create vite@latest` + React 18 + TS template | — | ✅ 已完成 |
| M1-2 | `tailwind.config.ts` 接入 Nook-DESIGN-TOKENS.ts injection | — | ✅ 已完成 |
| M1-3 | i18next 初始化 + locales/{zh-CN, en}/ JSON（参照 AC.AC.i18n） | F-I18N-01 | ✅ 已完成 |
| M1-4 | React Router v6 配置 13 路由（占位页） | — | ✅ 已完成 |
| M1-5 | `<RequireAuth>` / `<RequireOwner>` guards | F-SEC-05 | ✅ 已完成 |
| M1-6 | 4 原子组件 Button/Input/Avatar/Bubble 实现 | — | ✅ 已完成 |
| M1-7 | public/fonts/ 自托管 Inter + JetBrains Mono WOFF2 | F-UI-05 / AC.AC.fonts | ✅ 已完成 |
| M1-8 | dark theme CSS `:root { color-scheme: dark }` | F-ST-03 / AC.AC.dark | ✅ 已完成 |
| M1-9 | GitHub Actions CI（typecheck/lint/test） | — | ✅ 已完成 |
| M1-10 | Lighthouse CI 接入 AC.AC.perf LCP ≤ 1.5s | NF-PERF-01 | ⏳ 待开发 (M7) |

---

## M2 · Auth Flow（注册/登录/邀请注册）

**目标**：Owner 注册页 + 登录页 + Friend invite accept 页

| # | 任务 | 关联 F-ID | 状态 |
|---|---|---|---|
| M2-1 | `/welcome` · `/welcome/register` · `/login` UI | F-AUTH-01/02 | ✅ 已完成 |
| M2-2 | `lib/api/auth.ts` 调 signInWithPassword | F-AUTH-02 | ✅ 已完成 |
| M2-3 | EF `friend-signup` 一站式 signUp + 1:1 conv 创建（代码已实现，本地已验证通过） | F-AUTH-05/06 / CAP-04 | ✅ 已完成 |
| | → EF error mapping: `email_exists`/`weak_password` → 409+`E_AUTH_EMAIL_EXISTS` / 400+`E_VAL_INVALID_FORMAT`（[S24.0](./DEVELOPMENT_LOG.md#s240--2026-06-28--m2-3-friend-signup)]） | F-AUTH-06 | ✅ 已完成 |
| M2-3IT | M2-3 自动化集成测试（14 个场景，tests/integration/） | AC.03 / AC.01 | ✅ 已完成 |
| M2-4 | `/invite/:token` 显示邀请人 context + 注册表单 + 调 friend-signup EF | F-AUTH-05 | ✅ 已完成 |
| M2-5 | 自动 1:1 conv 创建（含 EF 自动写 conversation_members ×2） | F-AUTH-06 / BF-04 | ✅ 已完成 — friend-signup EF target=any 路径实现；integration test #1 验证 2 行 conversation_members 写入（本质：S21.0 创建 test #1 / S25.0 状态 promote→Done） |
| M2-6 | AC.01 (Owner 注册/登录) + AC.03 (Friend 加入 + 1:1 出现) E2E via Playwright | AC.01/03 | ⏳ 待开发（延期至 M3 chat UI + Sidebar 完成后再开；现状：integration tests #1+#2 覆盖 AC.03 Friend 端；**AC.01 Owner 端仍无自动化验收** —— admin-bootstrap EF 未实现 + Owner 登录流程缺测试） |

---

## M3 · Chat Core（核心 SPA）

**目标**：home 主聊天 + 消息发送/拉取/显示 + 30 天 TTL pg_cron

| # | 任务 | 关联 F-ID | 状态 |
|---|---|---|---|
| M3-1 | DB migration 6 个 SQL（init/rls/triggers/pg_cron/storage/seed） | § 4 ARCH-DESIGN | ✅ 已完成 — 5 NEW migration 文件 (0003..0008) 扩展 M2 init (0001/0002) · 9 表 + 7 表 RLS (20 policies) + 3 trigger (T-01/T-02/T-03) + 3 pg_cron job (J-01/J-02/J-03) + 2 storage bucket + 2 RPC fn (fn_unread_counts/fn_mark_conversation_read) + 1 dev seed marker · S26.0 Session |
| M3-2 | Sidebar 列出 1:1 + 群（按 MAX(messages.created_at) DESC） | F-CONV-01 | ✅ 已完成 (commit `75d7300`) |
| M3-3 | MessageList + MessageItem 渲染（text / image） | F-CONV-03 / F-MSG-01/02/03 | ✅ 已完成 — `lib/api/chat.ts` 扩 [listMessages (cursor 分页) + markConversationRead + getAttachmentSignedUrl] / `useMessages` 无限查询 + `useAttachmentUrl` 签名缓存 (55min) / `<MessageItem>` text+image（带 self/other 翻转 + edited/已删除 placeholder） / `<MessageList>` 用 `@tanstack/react-virtual` 虚拟滚动 + day separators + load-more + 自动滚到底 · ChatPanel 包装 + HomePage 接线 · S27.0 Session。文件类型占位 = M5-7；回复 / reaction = M4-6/7（接口预留） |
| M3-4 | Composer floating island（DESIGN § 7 视觉） | F-MSG-01 | ✅ 已完成 — Composer 浮岛组件（含 textarea auto-grow + image/file attach + 隐藏 file inputs + onPaste + onDrop · 1 行错误提示）+ ComposeReplyCard（surface-2 + 2px accent 左边线 + close 图标）+ useSendMessage (`useSendTextMessage` + `useSendAttachmentMessage` 乐观 UI：onMutate 注入 pending bubble 到 messages infinite cache · success 时 swap pending → server row · error 时 rollback by `client_msg_id`) + useDraftInput (localStorage debounced 400ms · key `nook_draft_<convId>`) + useChat store 扩展 `replyingTo: { id, senderName, bodyPreview } \| null` + chat.ts API 扩展 (`uploadAttachment` + `sendTextMessage` + `sendAttachmentMessage` + `ATTACHMENT_MIME_WHITELIST` + local 校验 + image dims probe) + ChatPanel footer 替代 + composer i18n keys 11 项 × 2 语言 · M5 outbox / SW / EXIF / canvas compression deferred · 文件类型 bubble 仍为 `messages.fileUnsupported` placeholder · Session TBD |
| M3-5 | Realtime channel `conversation:<id>` 订阅 postgres_changes | § 6.3 ARCH-DESIGN | ✅ 已完成 — `src/lib/realtime/conversationChannel.ts` (subscribeConversationEvents 订阅 messages INSERT/UPDATE filtered by convId + reactions INSERT/DELETE · subscribeUserEvents 订阅 conversation_members + self profile) + 两个 typed payload projection (INSERT → MessageListItem, UPDATE → Partial<MessageListItem>) + `useConversationRealtime` 在 MessageList 挂载 (cache upsert: 1. 匹 clientMsgId 替换 M3-4 pending bubble 2. 匹 server id 静默回环 3. 追加 page 0 · 同时 invalidate 侧栏) + `useUserRealtime` 在 HomePage 挂载 (members / self-profile→ invalidate conversations) + MessageList stick-to-bottom (FOLLOW_THRESHOLD_PX 200 + followMode useState + 拖到顶部 reset + 切换 conversation reset 到 true + scrollToIndex last in requestAnimationFrame) + useConversations 增加 `refetchInterval: 30_000` 心跳。typing presence + reactions toggle + peer profile fan-out = M4 范围。 |
| M3-6 | pg_cron J-01 (03:00 消息清理) + J-02 (04:00 邀请清理) + J-03 (04:30 orphans) | F-MSG-10 / F-SEC-02 | ⏳ 待开发 |
| M3-7 | AC.04 (1:1 聊实现) + AC.15 (TTL) + AC.AC.rls (smoke) | AC.04/15/AC.AC.rls | ⏳ 待开发 |

---

## M4 · Realtime Polish（typing / 编辑 / 撤回 / 反应）

**目标**：灵魂功能 + 6 emoji 反应 + 2 分钟编辑

| # | 任务 | 关联 F-ID | 状态 |
|---|---|---|---|
| M4-1 | Realtime Presence.publish({typing: true/false}) | F-MSG-08 | ✅ 已完成 — `src/lib/realtime/conversationChannel.ts` extend `subscribePresenceEvents` (`presence:<uuid>` channel · `PresenceState` payload `{user_id, online:true, typing:boolean}` · `presence.key='user_id'` dedup + onSync/join/leave handlers) + `src/hooks/useTypingBroadcast.ts` (Composer-side · 5s idle timer invoke `.track({typing:true/false})` · eager stop on blur · unmount final track) + `src/hooks/useTypingReceivers.ts` (ChatPanel-side · subscribe → onSync filter by self userId → push to Zustand `usePresence.typingUsers` map · unmount clear) + `supabase-js` channel-name dedupe so the broadcast + receive sides share one channel instance + receiver resolves names via sidebar query cache (no extra profile round-trip) |
| M4-2 | Typing 三点降速动画（4 px / 120 ms 错落） | DESIGN § 9.4 | ✅ 已完成 — `src/components/chat/TypingIndicator.tsx` render 3 6-px lavender dots · staggered 0/150/300 ms · `@keyframes typing-pulse` (opacity 0.30 ⇄ 1.00 + scale 0.85 ⇄ 1.00 · 1200 ms loop) · Tailwind `motion-safe:` prefix to skip animation under prefers-reduced-motion · multi-user copy (1 = `chat.isTyping` · 2 = `chat.typingTwo` · 3+ = `chat.typingMany` · unresolved peer = `chat.typingAnonymous`) · slot in ChatPanel header right of conversation title · `role="status"` + `aria-live="polite"` silent announcement · tokens.css append `@keyframes` (1 section) |
| M4-3 | 编辑消息（2 min 时间窗） + `(edited)` 微标签 | F-MSG-05 / AC.08 | ✅ 已完成 (commit `9fa1968` · 本机 static only · 云 DB migration 0009 `[待云 db push]`) |
| M4-4 | 撤回（soft recall，DB row 不删） | F-MSG-06 / AC.09 | ✅ 已完成 (commit `ea2f2ef` · 后续 0011 relax-kind-payload-chk followup · 本机 static only · 云 DB migration 0010 + 0011 `[待云 db push]`) |
| M4-5 | 删除（仅自己端）— **列级软隐藏 `deleted_by_sender_at`** | F-MSG-07 / AC.10 | ✅ 已完成 (commit `7f2b47a` · 本机 static only · 云 DB migration 0012 `[待云 db push]`) |
| M4-6 | 引用 / 回复（reply_to_id + ReplyCard） | F-MSG-04 / AC.07 | ✅ 已完成 (commits `33e4179` + `6eaa861` · 本机 static only · 云 DB migration 0013 [待云 db push]) |
| M4-7 | 6 emoji reaction toggle（CAP-15） | F-MSG-09 / AC.07 | ✅ 已完成 (本机 static only · 云 DB migration 0015 [待云 db push]) · M4-7 主 ship @ `0111398` + self-actor gate fixup @ `075b4b1` + realtime publication 补足 + REPLICA IDENTITY FULL `@ 540165a` + **M4-7.1 polish @ `7e3ec3f`**（EmojiPicker viewport-flip + mapReactionErrorCode `(?![a-z])` forward-proof）· 全绿色 badge · 82 unit + 20 integration + 0 新 tsc error · reviewer LGTM |
| M4-8 | Ambient 在线状态（presence + 6 px lavender pulse） | F-ST-01 / AC.11 | ✅ 已完成 — `src/hooks/useConversationPresence.ts`（重构自 M4-1 `useTypingReceivers.ts` · 单 `subscribePresenceEvents` 在 onSync 双写 `onlineUsers[convId]` 与 `typingUsers[convId]` · self-actor gate 在 receiver 层 forUserId !== selfUid · unmount `clearConv(convId)` 原子双清）+ `src/stores/usePresence.ts`（重构 `onlineUsers: Map<convId, Set<userId>>` per-conv · 旧 global Set<string> 零 consumer 安全替换）+ `src/components/chat/ChatPanel.tsx` 头部 `<Avatar status={isAnyPeerOnline ? 'online' : undefined} pulse={isAnyPeerOnline}>` · 6 px lavender 点 via `var(--color-chat-status-online)` + `ambient-pulse var(--duration-ambient) ease-in-out infinite` keyframes（M1 Avatar 已预留）+ `src/hooks/useConversationPresence.test.tsx` 9 unit tests（在线+打字双写 · online=false / empty uid drop · self-actor gate · unmount 双清 · conv switch 重 subscribe clean） + 5 处 JSDoc dangling reference cleanup in Composer / TypingIndicator / useTypingBroadcast（.ts+.test.tsx）+ delete 旧 `useTypingReceivers.ts` + `useTypingReceivers.test.tsx` · Cycle S33.0 · reviewer-minimax-m3 0 critical blockers · tsc 0 new errors · vitest 9/9 pass · 本机 static-only · live 仅云 staging |

---

## M5 · Edge Cases（outbox / SW / 头像 / 文件）

**目标**：断网红点 / IndexedDB outbox / 5MB 头像 / 50MB 文件 / 字符 EXIF strip

| # | 任务 | 关联 F-ID | 状态 |
|---|---|---|---|
| M5-1 | Dexie schema + outbox table (foundation) | F-MEDIA-01 / AC.17 | ✅ 已完成 — `src/lib/db/schema.ts` v1 Dexie singleton (`nook_outbox_v1` db · outbox table · PK=`clientMsgId` + 索引 `conversationId, state, createdAt, [state+createdAt], nextAttemptAt` + `__resetDbForTests` close+deleteIDB hook) + `src/lib/db/outbox.ts` state machine (constants `MAX_ATTEMPTS=5` · `RETRY_BACKOFF_BASE_MS=1_000` · `RETRY_BACKOFF_CAP_MS=60_000` · `SENT_GRACE_MS=30min` ; pure reducers `initOutboxRow` / `markSending` / `markSent` / `markFailed` / `backoffMsFor` 每个终结态 defensive-guard · Dexie 薄包装 `enqueue` / `applyMark*` / `purgeSentBefore` / `getOutboxRow` / `listOutboxForConversation`) + `src/lib/db/client_msg_id.ts` UUID v4 helper (`generateClientMsgId` + `isValidClientMsgId` regex · 替代 M3-4 Composer 内 16 处 inline `crypto.randomUUID()`) + `src/hooks/useOutbox.ts` read-only `useLiveQuery` observer (bucketed `{pending, sent, failed, total, isLoading}` + `useTotalOutboxCount()` 全局 + `useOutboxManualRefresh()` M5-2 预留) ; `tests/setup.ts` reactive-jsdom via `import 'fake-indexeddb/auto'` ; `package.json` 新增 `dexie@^4` + `dexie-react-hooks@^1.4.0` runtime + `fake-indexeddb@^6` devDep ; i18n `chat.outbox.{pending,sending,sent,failed,retrying}` × 2 lang · **M5-1 = foundation only**（发 hook 重写与 outbox · SW bg sync replay · UI Composer 黄点 · Attach Blob 存 outbox 均延到 M5-2/4/5/7） · Cycle S34.0 · reviewer-minimax-m3 0 critical blockers · tsc 0 new errors · vitest 65/65 pass · 本机 static-only |
| M5-2 | Workbox SW background sync 接入 | F-MEDIA-01 | ✅ 已完成 — `vite.config.ts` `vite-plugin-pwa` `generateSW` `workbox.runtimeCaching` POST-to-`/rest/v1/*` `NetworkOnly` + `BackgroundSyncPlugin('nook-messages-queue', {maxRetentionTime: 7d, maxRetries: 5})` · `src/config/env.ts` `enableSw` 解析 `VITE_ENABLE_SW` (`true`/`1` accepted · default false) · `src/hooks/useServiceWorker.ts` plain func `registerServiceWorkerOnce()` (refactor from v1 hook · main.tsx 调用 `useEffect` 触发 hook-rule 冲突报「Invalid hook call」 · plain func 净化 module-level `_registerOnce` singleton · gate 1=`import.meta.env.PROD` · gate 2=`env.enableSw` · gate 3=`navigator.serviceWorker` exists+not-nullish (triple-check 防 jsdom 边角)) + 析然 err re-firing · `src/main.tsx` boot `registerServiceWorkerOnce()` 在 ReactDOM render 前调用 · `src/hooks/useSendMessage.ts` outbox rewire (`void outbox.enqueue(input)` on onMutate · `void outbox.applyMarkSent(clientMsgId)` on onSuccess · `void outbox.applyMarkFailed(clientMsgId, extractErrorMessage(err))` on onError · 全是 fire-and-forget `.catch(console.warn)` · 乐观 cache 增增快) · `extractErrorMessage` helper handles Error / string / `{message: string}` (Supabase PostgREST {code, message, details, hint} 形状) · `src/components/chat/Composer.tsx` 跟进： replace inline `crypto.randomUUID()` 用 canonical `generateClientMsgId` · 黄色点 + reconnecting strip via `useOutbox(convId).pending/failed` buckets · `motion-safe:animate-pulse` + `aria-live=\"polite\"` + `role=status` honors `prefers-reduced-motion` · i18n `chat.outbox.{pendingCount_one, pendingCount_other, reconnecting}` × 2 lang · 1 新 runtime dep `workbox-window` + `vite-plugin-pwa` devDep · M5-2.1 followup = manual reconnect button + outbox toast notifications · Cycle S35.0 · reviewer-minimax-m3 0 critical blockers (9 polish suggestions 记录不动) · tsc 0 new errors · vitest 11/11 M5-2 pass + 159/159 全 unit suite · 本机 static-only |
| M5-3 | client_msg_id 生成（UUIDv4）+ dedupe 逻辑 | | F-MEDIA-01 | ✅ 已完成 — `vite.config.ts` `vite-plugin-pwa` `generateSW` `workbox.runtimeCaching` POST-to-`/rest/v1/*` `NetworkOnly` + `BackgroundSyncPlugin('nook-messages-queue', {maxRetentionTime: 7d, maxRetries: 5})` · `src/config/env.ts` `enableSw` 解析 `VITE_ENABLE_SW` (`true`/`1` accepted · default false) · `src/hooks/useServiceWorker.ts` plain func `registerServiceWorkerOnce()` (refactor from v1 hook · main.tsx 调用 `useEffect` 触发 hook-rule 冲突报「Invalid hook call」 · plain func 净化 module-level `_registerOnce` singleton · gate 1=`import.meta.env.PROD` · gate 2=`env.enableSw` · gate 3=`navigator.serviceWorker` exists+not-nullish (triple-check 防 jsdom 边角)) + 析然 err re-firing · `src/main.tsx` boot `registerServiceWorkerOnce()` 在 ReactDOM render 前调用 · `src/hooks/useSendMessage.ts` outbox rewire (`void outbox.enqueue(input)` on onMutate · `void outbox.applyMarkSent(clientMsgId)` on onSuccess · `void outbox.applyMarkFailed(clientMsgId, extractErrorMessage(err))` on onError · 全是 fire-and-forget `.catch(console.warn)` · 乐观 cache 增增快) · `extractErrorMessage` helper handles Error / string / `{message: string}` (Supabase PostgREST {code, message, details, hint} 形状) · `src/components/chat/Composer.tsx` 跟进： replace inline `crypto.randomUUID()` 用 canonical `generateClientMsgId` · 黄色点 + reconnecting strip via `useOutbox(convId).pending/failed` buckets · `motion-safe:animate-pulse` + `aria-live="polite"` + `role=status` honors `prefers-reduced-motion` · i18n `chat.outbox.{pendingCount_one, pendingCount_other, reconnecting}` × 2 lang · 1 新 runtime dep `workbox-window` + `vite-plugin-pwa` devDep · M5-2.1 followup = manual reconnect button + outbox toast notifications · Cycle S35.0 · reviewer-minimax-m3 0 critical blockers (9 polish suggestions 记录不动) · tsc 0 new errors · vitest 11/11 M5-2 pass + 159/159 全 unit suite · 本机 static-only |
| M5-3 | client_msg_id 生成（UUIDv4）+ dedupe 逻辑 | F-MEDIA-01 / § 10 ARCH-DESIGN | ✅ 已完成 — `src/lib/db/client_msg_id.ts` UUID v4 helper (`generateClientMsgId` wraps `crypto.randomUUID` · `isValidClientMsgId(uuid)` regex `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` variant1-guarded) · Composer.swift invalidate inline `crypto.randomUUID()` ×16 处 为 canonical helper · server-side `messages.client_msg_id` UNIQUE constraint 走 `20260628000001_init_core_tables.sql:72` partial unique index · `useSendMessage.onMutate` 调 `void outbox.enqueue(input)` with same id · SW bg sync replay path (M5-2) `nook-messages-queue` queue 上 server-side unique constraint 去重 + 本机 outbox 的 `clientMsgId` 重试 · 5 new client_msg_id unit tests + M5-2 useSendMessage test 4 用例同一 · S36.0 cycle |
| M5-4 | **M5-4-image-pipeline** — 后端 offline-first 图片 attachment pipeline (F-MSG-02 · F-MEDIA-01) | § 6 ARCH-DESIGN · NF-STAB-N03 | ✅ 已完成 — 拆 3 ship-line: ❶ **Dexie v2 schema** (src/lib/db/schema.ts) 新加 `attachments` 表 (`&id, conversationId, lastAccessedAt, expiresAt, [conversationId+lastAccessedAt]`) — v2 schema 与 v1 bypass 保留 (Dexie auto-migrate) + EntityTable<AttachmentRow, 'id'> 强类型 ❷ **Dexie blob cache module** (src/lib/db/attachments.ts) — mutators / read / LRU / TTL / quota 预领 (10 行 math haching): `putAttachmentCache` / `getAttachmentCacheRow` / `touchAttachment` (LRU touch) / `deleteAttachment` / `listCachedAttachmentsForConversation` / `getCacheUsageBytes` / `lruPurgeUntilUnder` · `purgeExpiredAttachments` · `estimateQuotaAvailable` + consts (`ATTACHMENT_CACHE_MAX_BYTES` = 200 MB · `ATTACHMENT_CACHE_MAX_AGE_MS` = 30 d · `QUOTA_SAFETY_RATIO` = 0.9) ❸ **blob-first upload pipeline** (src/lib/api/chat.ts): `uploadAttachment(file, conversationId)` 表报 convId 作本机 mirror key + after-upload call · `persistAttachmentBlobLocally` (pre-write quota preflight: `freeBytes < 110% ATTACHMENT_CACHE_MAX_BYTES` 走 `lruPurgeUntilUnder(MAX/2)` 防 `QuotaExceededError`) + 12 attachments.test.ts · 5 schema_v2.test.ts · 12 attachments-test total + 197/197 full unit suite green · Workbox CacheFirst GET `/storage/v1/object/sign/*` + 200 MB / 30 d `ExpirationPlugin` · Workbox BG sync POST `/storage/v1/object/attachments/*` (image-ship, 走 nook-messages-queue 7d/5 retries) · `<AttachmentImage>` blob hydrate via cache before signed-URL fallback + touch on hydrate success → LRU chain reacquired（不能 decompose to stale FIFO） | S37.0 cycle |
| M5-4-compress | 客户端图片压缩（canvas WebP q=0.78 + 2MB 二压 q=0.6）· **deferred from M5-4 slot to v1.1+** | § 6.1 ARCH-DESIGN · F-MSG-02 | ⏳ 待开发 — **scope recombination**: 原 M5-4 slot 上 传输 image-attachment pipeline (user request) ship · compression overlay independent pipeline 串 transitive · M5-4-compress / M5-7 50MB UI 均 deferred to v1.1+ · M5-5 EXIF (S38.0) · M5-6 avatar (S39.0) 已 ship |
| M5-5 | EXIF strip / 警告提示（不依赖库；读元数据但不写回） | F-MSG-02 · NF-SEC-N05 | ✅ 已完成 — `src/lib/storage/exif.ts` (NEW · 200 行) · pure module：JPEG APP1/`Exif\0\0'` 解析逻辑（不用库）· `ExifDetectionResult = { hasExif, sources: ['jpeg_app1'] }` · `detectExif(file: File): Promise<ExifDetectionResult>` public surface + `looksLikeJpeg` extension short-circuit (MIME jpeg 或 .jpe?g 扩展名) + `hasExifInJpegBytes` Uint8Array walker (SOI 0xFFD8 → 0xFF padding skip → marker code → standalone/SOS/BE-length 分支 → APP1+Exif magic 6-byte 比对) · constants JPEG_SOI/JPEG_APP1_MARKER(0xE1)/EXIF_MAGIC/EXIF_SCAN_BYTES(64 KB)/JPEG_STANDALONE_MARKERS Set/JPEG_SOS_MARKER(0xDA, scan terminator) · `src/lib/storage/exif.test.ts` (NEW) 8 cases（APP1+Exif magic → true; APP0-only → false; APP1+XMP magic → false; PNG/text/PDF/ZIP via extension short-circuit → false; 1-byte&0-byte 截断 JPEG defensive → false; 多段跳过考验 → true） · **SPEC 调解**: 用户需求 + DATA-MODEL R-30 ("image 不压缩, 原图保真") 击败 NF-SEC-N05 ("Client 端 EXIF strip 完成后才上传图") 字面解读 — **read-not-write 仅告知**：原图原数据上传，· `src/components/chat/Composer.tsx` 扩：warning useState parallel 到 error + `EXIF_WARNING_DISMISS_MS = 6000` const + `exifTimerRef` useRef + `dispatchFile` 中isImageMime 走 `await detectExif` · if `hasExif=true` `setWarning(t('chat.exifWarning.body'))` + 取消+重设 setTimeout 6 s · NEW `{warning && <p role="status" aria-live="polite" data-testid="composer-exif-warning" ...>svg triangle icon</p>` 涵在水班马 signal-warning tone 中 auto-dismiss · NEW 2 useEffects: (a) conversationId 切换 setWarning(null) + clear timeout (防 stale warning 跨 conv) · (b) unmount cleanup clear timeout (防 zombie timer) · dropped redundant inner `try { await detectExif } catch {}` (detectExif 模块合同自-resolves all errors to { hasExif: false }) · i18n × 2 lang `chat.exifWarning.{title,body}` · makeFakeFile test helper：test 仅 plumbing (production code untouched) · 8/8 vitest + 205/205 full unit suite · tsc 0 new errors in M5-5 files · reviewer-minimax-m3 0 critical blockers · Cycle S38.0 · 本机 static-only per KI-9
| M5-6 | 头像上传 · 直传 Supabase Storage · profiles.avatar_url rewire · 7 错误 化 路线 (F-AUTH-09 · AC.13) | § 6.1 ARCH-DESIGN · CAP-17 · bucket RLS M3-1 | ✅ 已完成 — Cycle S39.0 · 6 文件 ship: ❶ **\u0060src/lib/api/profile.ts\u0060** (NEW · ~190 行) · pure module · \u0060AVATAR_MAX_BYTES = 5 MB\u0060 + \u0060AVATAR_ALLOWED_MIMES = [png|jpeg|heic|webp]\u0060 (mirror bucket policy) + \u0060AvatarValidationError\u0060 (code: empty/too_large/unsupported_mime/unsupported_ext) · 公开: \u0060validateAvatarFile\u0060 (asserts File · preflight) · \u0060buildAvatarObjectPath(\u003cuid\u003e/\u003cuser_id\u003e/\u003cunix-ms\u003e.\u003cext\u003e)\u0060 (jpeg→jpg 等 MIME→ext mapping) · \u0060resolveAvatarPublicUrl\u0060 via supabase.storage.from('avatars').getPublicUrl() · \u0060uploadAvatar(uid, file)\u0060 (validate → purge folder best-effort → upload(contentType+upsert:true) → getPublicUrl) · \u0060deleteAvatar(uid)\u0060 (PATCH profiles.avatar_url:null **FIRST** then best-effort storage purge · 防 race 闪 broken image) · \u0060updateProfile(uid, [display_name, avatar_url])\u0060 (PATCH + .select(...).single()) ❷ **\u0060src/lib/api/profile.test.ts\u0060** (NEW) **30 vitest cases** · validateAvatarFile × 4 code path (empty/too_large/unsupported_mime/unsupported_ext) · buildAvatarObjectPath × 1 + 5 MIME/ext it.each · uploadAvatar × 6 (happy/purge/no-call-before-validation/upload-throw/list-err-tolerate/list-throw-tolerate) · deleteAvatar × 3 (PATCH-FIRST ordering via mock.invocationCallOrder · DB-error precedence · list-failure tolerate) · updateProfile × 3 (chain shape/return/avatar_url:null forward) · resolveAvatarPublicUrl × 1 · constants × 2 ❸ **\u0060src/components/settings/AvatarPicker.tsx\u0060** (NEW · ~210 行) — hidden file input (ref) · \u0060URL.createObjectURL\u0060 preview + cleanup-on-unmount · M5-5 \u0060detectExif\u0060 复用 informational warning (EXIF_WARNING_DISMISS_MS = 6000) + svg triangle icon · \u0060validateAvatarFile\u0060 preflight (switch case 详错误码 → 4 i18n keys) · Button patterns: Pick (intent=neutral) + Remove (intent=danger) + Save (intent=accent + loading) + Cancel (intent=neutral · 只在 dirty 时出现) · data-testid × 6 ❹ **\u0060src/stores/useAuth.ts\u0060** 扩: \u0060isUploadingAvatar\u0060 state + \u0060uploadAvatar(file)\u0060 / \u0060deleteAvatar()\u0060 / \u0060updateProfile({displayName})\u0060 actions · \u0060{ code: 'unauthorized' as const, message: ... }\u0060 plain throw (匹配 register SESSION_MISSING pattern) · camelCase displayName → snake_case 翻译 ❺ **\u0060src/app/pages/SettingsProfilePage.tsx\u0060** 重写 16-行 sketch → ~75 行: \u003cAvatarPicker /\u003e 头 部 + DisplayName form (Input variant=form size=lg + Button intent=accent type=submit + status msgs) ❻ **\u0060src/app/pages/SettingsPage.tsx\u0060** switch nav link \u0060t('settings.profile')\u0060 → \u0060t('settings.profile.name')\u0060 (break-fix-1) ❼ i18n × 2 lang \u0060settings.profile\u0060 改成 \u0060{name, saved}\u0060 对象 (先前只是一串 · 留 break-fix) · + \u0060settings.avatar.{sectionLabel, upload, remove, save, errors.{empty, tooLarge, unsupportedMime, unsupportedExt, uploadFailed, deleteFailed}}\u0060 · **vitest 30/30 M5-6 + 235/235 full unit suite + 0 new tsc errors in M5-6 files + reviewer ship-ready** · 本机 static-only per KI-9 · M5-4 image-compress + M5-7 50MB upload UI progress 均 deferred v1.1+ |
| M5-7 | 直传 50MB 文件（Supabase Storage signed URL） + UI 进度条 + drag-drop affordance | F-MSG-03 | ⏳ 待开发 (Next session per S40.0) |
| M5-8 | Storage RLS bucket policy（仅 conv 成员） | § 5.6 ARCH-DESIGN | ✅ 已完成 — M3-1 migration 0007 落地 avatars (public read · self write) + attachments (same-conv read via msg FK · self insert/delete) 2 bucket + 5 storage.objects policies · S26.0 |
| M5-9 | Service Worker 离线浏览历史 | NF-STAB-N04 | ⏳ 待开发 |

---

## M6 · Admin（settings/admin + 邀请 + 重置密码 + 删除）

**目标**：Owner 唯一可见的 admin 路由 + 5 个 EF 接入

| # | 任务 | 关联 F-ID | 状态 |
|---|---|---|---|
| M6-1 | `/settings` + `/settings/admin` 路由 + AdminGuard | F-SEC-04 | ⏳ 待开发 |
| M6-2 | EF `admin-create-invite`（生成 token + INSERT） | CAP-03 / F-AUTH-03/04 | ⏳ 待开发 |
| M6-3 | `/invite/new` UI（target=any / target=conversation） | F-AUTH-03/04 / AC.02 | ⏳ 待开发 |
| M6-4 | EF `admin-reset-password` | CAP-19 / F-AUTH-07 / AC.16 | ⏳ 待开发 |
| M6-5 | EF `admin-delete-friend`（原子批量 left_at UPDATE） | CAP-20 / F-SEC-06 / BF-14 | ⏳ 待开发 |
| M6-6 | `confirm` modal（输 "confirm" 字才能 enable 提交） | F-SEC-06 / AC.18 | ⏳ 待开发 |
| M6-7 | admin-create-invite UI 复制 URL 到剪贴板 + 微信分享引导 | F-AUTH-03 | ⏳ 待开发 |

---

## M7 · Polish & A11y（视觉验证 + 性能 + A11y）

**目标**：reduced-motion / 4 断点 / Lighthouse CI / 应用内未读小红点

| # | 任务 | 关联 F-ID / AC | 状态 |
|---|---|---|---|
| M7-1 | `@media (prefers-reduced-motion: reduce)` 全局降为 0ms | F-UI-03 / AC.AC.motion | ⏳ 待开发 |
| M7-2 | focus-visible `2px var(--color-accent-soft-ring)` | NF-A11Y-N02 | ⏳ 待开发 |
| M7-3 | 触达目标 ≥ 44 × 44 px | F-UI-02 / NF-A11Y-N01 | ⏳ 待开发 |
| M7-4 | PC / Mobile 流式适配（≥ 1024 / < 1024 drawer） | F-UI-01 / NF-RESP-N01 | ⏳ 待开发 |
| M7-5 | 应用内未读小红点（accent-soft-bg chip · > 9 显示 "9+"） | F-NOTIF-01 / AC.12 | ⏳ 待开发 |
| M7-6 | fn_unread_counts RPC + fn_mark_conversation_read | CAP-21/21b | ✅ 已完成 — M3-1 migration 0005 创建 2 RPC fn (security invoker · take auth.uid()) · S26.0 |
| M7-7 | Tab title `[N] Nook_v1.0` | F-ST-02 | ⏳ 待开发 |
| M7-8 | AC 表全过（AC.11 ambient · AC.12 unread · AC.AC.perf LCP · AC.AC.responsive · AC.AC.dark） | 全表 | ⏳ 待开发 |
| M7-9 | 无业务代码 0 处写裸 hex 校验（grep `src/`） | AC.AC.naming | ⏳ 待开发 |
| M7-10 | 4 原子组件 React API 与 components/*.spec.md 完全对齐 | D-08 | ⏳ 待开发 |

---

## 跨阶段横切关注

| 主题 | 关联 | 关联文档 |
|---|---|---|
| Supabase 项目创建 + Project URL / ANON_KEY 配置 | M2 启动 | docs/AI_HANDOVER § Current Tech State |
| Edge Function 部署（5 个 EF）+ SERVICE_ROLE_KEY EF env | M6 | ARCH-DESIGN § 3.4 |
| pg_cron 启用（Supabase 启用 pg_cron extension） | M3 | ARCH-DESIGN § 4.5 |
| 自托管字体 R2 / CF Pages | M1 启动 | ARCH-DESIGN § 8.3 |
| Sentry DSN + LogSnag token 配置 | M3 末 | ARCH-DESIGN § 9 |

---

## 本地验证限制（FU-LOC）

> **区别于代码限制（v1.1+）**，这些限制是 Supabase 本地开发环境 + 本机 annex 设备差异的结果，**在云 Supabase staging/production 不存在**。

| 编号 | 限制状态 | 问题描述 | 临时现状 | Staging 上预期 |
|---|---|---|---|---|
| **FU-LOC-01** | 🟢 **架构决策（Docker 已永久废弃 · S29.0 / KI-9）** | 本机 Docker Desktop 已**主动删除**（Project Lead 决策 · 原话「docker已删除，以后不需要做任何docker测试」）→ `supabase start` / `supabase db reset` / `supabase functions serve` / 本地 PostgreSQL 等**全部 live verification 路径永久不再适用**。M3-1 后 7 个 SQL 迁移 与此后任意 migration · 本机验证 仅 = static review (code-reviewer-minimax-m3 多轮 + typecheck 0 errors + unit tests 1/1 + convention commit + worktree clean)。**v0.5.0 milestone = static-only ship**；不需本地 live apply 方可包版。 | 本地 v0.5.0 / v0.5+ ⇒ 静态 ✅；live verification **仅 云 staging/prod 走**。Production cutover 受 FU-STG-01..04 闸门控制 — 本地 demo 跳过 live ＝**预期模式 = 唯一模式**。 | 云 Supabase staging/prod 不依赖本机 Docker：CI via `supabase db push --include-all` + Cloud EF `supabase functions deploy`。详 FU-STG-01..04。 |
| **FU-LOC-02** | 🟢 **已废弃（S29.0 · Docker 永久删除使问题自动不存在）** | PostgREST schema cache reload TTL 漂移 · 原需 `docker exec ... NOTIFY pgrst, 'reload schema'` 手动刷 | **遗留不再适用**：本机不再运行 PostgreSQL container · 本机无 Docker · 修复手段 本身 依赖 docker 即不复存在。云 schema 用 `/rest/v1/` 走 ✅。 | 不再跟踪。云 Supabase `db push` path 自动 routes flush cache；本表项保留仅为「类类别·不脚脚」·今后 readme 不跡跡提及。 |
| **FU-LOC-03** | ⚠️ 已知 | **Vite PWA workbox `runtimeCaching` 缓存 `/rest/v1/`**（`NetworkFirst` 策略）会缓存失败的 "schema cache" 错误响应 | 本地 UI 验证需重启 vite + 换 origin port + 验证 vite.config `handler: 'NetworkOnly'` | 云部署走 Production build，SW 中 NetworkFirst 下加 "修正驻留" 策略后会补偿 |
| **FU-LOC-04** | ⚠️ 已知 | `.env` 项目根存**云服务凭据**（不属本地），Vitest 会自动加载 · 本地跑集成测试需用 `.env.local` 覆盖 | 集成测试现在走 `npx supabase status -o env` 动态拉，绕过 `.env` | 云凭据在 CI secret 中，不会被本地测试误用 |

> 详细验证报告见 [DEVELOPMENT_LOG § S22.0 + S23.0](./DEVELOPMENT_LOG.md)。

---

## Staging Followup 验证清单（FU-STG）

> **迁移到云 Supabase staging 环境后**，需逐项验证以下场景以替代本地限制。
>
> **S29.0 架构变更后**：本地不再走任何 DB/EF live path。本表 FU-STG-01..04 为 v0.5.0/1.0 cutover **唯一** verification 途径 · 本机不增 patch 。

| 编号 | 验证项 | 本地状态 | Staging 上验收点 |
|---|---|---|---|
| **FU-STG-01** | `supabase db push --include-all` 上云成功 | 本地 `supabase db reset` 已验证 2 个迁移文件顺序应用 | 云迁移 path 自动刷新 PostgREST cache · UI 调 RPC 不需 `NOTIFY` |
| **FU-STG-02** | `supabase functions deploy friend-signup` 部署成功 | 本地未部署（Deno 未装） | EF 部署后 `supabase functions list` 中可见 · `functions/v1/friend-signup` health check 返回200 |
| **FU-STG-03** | Cloud EF 调所有 14 个集成测试场景 | 本地仅 3 纯校验 pass，其余走不通 | 在 staging CI 上 `npm run test:integration` 应 14/14 pass |
| **FU-STG-04** | 浏览器 UI 完整端到端验证（valid/expired/used/not_found/owner_deleted） | 本地浏览器仅 not_found 可画 · 其余受 schema cache 影响 | staging 现场走以下 URL：<br>· `/invite/<valid_token>` · 看到 Owner 卡片 + 注册表单<br>· `/invite/<expired_token>` · 看到 expired 错误页<br>· `/invite/<used_token>` · 看到 used 错误页<br>· `/invite/<valid_token>` 后删 owner profile → owner_deleted 错误页<br>· 提交表单 → EF 返回 201 + session · navigate(/home) |

> 需 go / no-go 决策点：以上 4 项 为 staging 验收必过项。

---

## 已完成的文档 / 设计阶段（Stage 1-10）

| Stage | 交付物 | 状态 |
|---|---|---|
| **Stage 6** | `../01_Product/Nook-SPEC.md` v1.0 + `../01_Product/Nook-SPEC-FREEZE.md` | ✅ 已完成 |
| **Stage 7** | `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md` | ✅ 已完成 |
| **Stage 8.0** | `../01_Product/Nook-SPEC-FREEZE-v1.0.1.md` + 源文档同步（FU-1 / FU-2） | ✅ 已完成 |
| **Stage 8.1** | `docs/` 7 份项目记忆 + 12 步流程 | ✅ 已完成 |
| **Stage 9** | `../02_Architecture/Nook-DATA-MODEL.md` v1.0.1（13 实体 · 14 节） | ✅ 已完成 |
| **Stage 10** | `../02_Architecture/Nook-API-DESIGN-v1.0.md`（完整 API 契约 · 13 章） | ✅ 已完成 |
| **Stage 11** | `Nook-PROJECT-STRUCTURE.md`（目录结构规范 · 13 章） | ✅ 已完成 |
| **Stage 12** | `docs/adr/` — 20 项完整 ADR（ADR-001 至 ADR-020） | ✅ 已完成 |
| **Stage 13** | `Nook-CODING-STANDARDS.md` v1.0（编码规范 · 14 章） | ✅ 已完成 |
| **Stage 14** | `Nook-GIT-WORKFLOW.md` v1.0（Git 工作流 · 12 章） | ✅ 已完成 |
| **Stage 15** | `Nook-WORK-BREAKDOWN.md` v1.0（任务拆分 · 55 Task） | ✅ 已完成 |
| **Stage 16** | `Nook-PROJECT-BOOTSTRAP-PLAN.md` v1.0（初始化计划 · 10 步流程） | ✅ 已完成 |
| **Stage 17** | `../STARTUP-MANUAL.md` v1.0（启动手册 · 18 章 880 行 · + HTML 100.9 KB） | ✅ 已完成 |

> ✅ **全部 17 个文档/设计阶段已完成**。项目已准备好进入 **Bootstrap Execution → M1 Foundation 代码开发**。

---

— END —

## Status Note
- 已完成 Session 数: 18 (含 S18.0 文档重组)
- 文档树已重组为 4 类目录,可直接进入 M1 代码开发
- 7 份 docs/* 项目记忆已迁至 `docs/03_Engineering/`

## S19.0 Note · 2026-06-27

---

## S29.0 · 2026-06-28 · 架构决策 · 本机 Docker 永久废弃

- **决策文本（原話不动保留原話）**: "docker已删除，以后不需要做任何docker测试"

- **决策本体**: Project Lead 在 2026-06-28 明确从本机除去 Docker Desktop。 **这是架构级别 的决策** · 不是一个遗留 bug。是将多个 FU-LOC（本地验证链）项之上的 final decision。删除后 · any 一切走 `docker` / `supabase start` / `supabase db reset` / `supabase functions serve` / 任何 local PostgreSQL 的路径 · 在本机 · 永久不再在 solution space 之内。

- **连锁影响 · 验证模型**:
  - 本机 Real State: 「supabase.live」 = 不存在。
  - 本机验收门槛 = static only:
    - code-reviewer-minimax-m3 多轮评审（2-3 轮 typical）
    - `npx tsc --noEmit` · 0 errors
    - `npx vitest run` · 仅 1+ unit placeholders pass（本机仅 unit · integration 不再走）
    - git worktree clean + conventional commit message
  - Live verification · **仅**走 云 Supabase staging/prod:
    - SQL migration： `supabase db push --include-all --project-ref <cloud>`
    - EF deploy：`supabase functions deploy <name> --project-ref <cloud>`
    - CI on cloud 里验 invocation · **不重不反问 · 本机永远不 live verify**。

- **KU-Family 变动**:
  - **KU-LOC-01**：原「本机 Docker 不通」→ 转 「架构决策」 → 本机永久不可能 live → status 🟢 (从 ⚠️ 升级为 🟢 · 决策生效状态)
  - **KU-LOC-02**：原「PostgREST schema cache reload TTL 漂移」 → **已废弃**（遗留修复靠 docker exec · 本机不再有 docker = 问题自动不成立）
  - **KU-LOC-03 / KU-LOC-04**：**保留**（Vite SW + .env 云凭据与 docker 无关 · 本机仍走 static only 但 Vite dev server 仍跑）
  - **FU-STG-01..04** 表头：从「云 staging CI 验收」 明示为「云 path only · 本机不验」

- **连锁修改（本次与之后 commit）**：
  - `KNOWN_ISSUES.md` · 新增 KI-9
  - `TODO.md` · KU-LOC-01 + KU-LOC-02 + KU-STG 表头重写
  - `AI_HANDOVER.md` · 「下一位 AI 接手须知」新增 · 阶段表新增 1 行
  - `CHANGELOG.md` · `[Unreleased]` 新增 S29.0 section
  - 本 `DEVELOPMENT_LOG.md` · S29.0 entry（本条）

- **不变**:
  - 云架构依旧（Supabase Cloud Free + CF Pages + R2 + Sentry + LogSnag）— 不变
  - 22 项 ADR 不变
  - FU-3 / FU-4 / KI-1..7 · 不变
  - KI-8 远端仓库推送 仍待 Project Lead 创建 repo

- **AI 接受决策后怎么做**:
  - 任何 task / sub-task 提案 · 🛑 不推「本机跑 docker」 /「本机跑 supabase start」 / 「本地启 postgres」。资源入口都是 static only。
  - 如果某机能临时需求「local DB」 · 反问 · 推到 staging · **不重不拟 ad-hoc local DB**。
  - 期望 future AI 接手 Nook · 读 S29.0 后 · 不反复问 docker status。

- **当前状态**: 🟢 决策生效（Project Lead 在本机主动删 Docker Desktop）。本次 commit 为 docs-only（BUFFY 不删任何代码 · 仅 Project Memory · 5 docs 文件同步决策）。

- **下一步计划**: M3-4 Composer floating island（未启动） · M3-2/M3-3 已 ship 不动。

- **验证结果**: docs-only commit · 不走 typecheck / 不走 tests。仅保证 5 doc 文件 内 MD 语法 readable · JSON 文件不因 i18n entry 添加坏 formatting。

- 目录名 i18n 化,所有路径已为英文
- Total Sessions: 19 (cumulative)
- 下一步: M1 Foundation (Vite 脚手架 + 4 原子组件 + 13 路由占位页)
