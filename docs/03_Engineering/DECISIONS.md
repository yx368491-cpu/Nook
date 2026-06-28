# Nook · Decisions (ADR-lite)

> **架构决策记录 (Architecture Decision Records)** — 8-12 项 ADR 风格技术决策。
> **规则**：
> - 每条决策一旦写入即"冻结"——不得直接覆盖历史。
> - 修改决策必须**新增一条**记录（标记 supersedes / amends）。
> - 影响范围 / 决策日期不可改。

## 决策摘要（一张表 · 给快速查阅）

| ID | 状态 | 决策 |
|---|---|---|
| D-01 | ✅ Accepted | SPEC = Single Source of Truth |
| D-02 | ✅ Accepted | i18n v1.0 仅双语（zh-CN + en） |
| D-03 | ✅ Accepted | 永不放 Web Push / 系统通知 / Email 推送 |
| D-04 | ✅ Accepted | F-MSG-07 列级软隐藏（不物理 DELETE） |
| D-05 | ✅ Accepted | `fn_unread_counts` 基于 `conversation_members.last_read_at` 游标 |
| D-06 | ✅ Accepted | 4 群硬上限 + 8 成员硬上限 = DB trigger + UI 双重 |
| D-07 | ✅ Accepted | 编辑 2 分钟窗口 = DB trigger + UI disabled |
| D-08 | ✅ Accepted | 30 天 TTL 同步清理 messages + attachments + storage.objects |
| D-09 | ✅ Accepted | 前端：React 18 + Vite + TS（不选 Next.js） |
| D-10 | ✅ Accepted | 后端：Supabase 一体化（Postgres + Auth + Realtime + Storage + Edge Functions）|
| D-11 | ✅ Accepted | 实时：Supabase Realtime（WS + Presence）|
| D-12 | ✅ Accepted | 鉴权：Supabase Auth + 自建 invite-token（24h 过期）|
| D-13 | ✅ Accepted | 状态管理：Zustand（client）+ TanStack Query v5（server）|
| D-14 | ✅ Accepted | 缓存：Dexie (IndexedDB) + outbox + client_msg_id dedupe |
| D-15 | ✅ Accepted | 部署：Cloudflare Pages（FE）+ Supabase Cloud（BE）+ R2 fallback |
| D-16 | ✅ Accepted | CI/CD：GitHub Actions |
| D-17 | ✅ Accepted | 监控：Sentry free（5k err/月）+ LogSnag free（1k ev/月）|
| D-18 | ✅ Accepted | 字体来源：**自托管 Inter + JetBrains Mono WOFF2**（绝不引 Google CDN）|
| D-19 | ✅ Accepted | Edge Function 总数：5 个（admin-bootstrap / friend-signup / admin-create-invite / admin-reset-password / admin-delete-friend / cleanup-storage-orphans）|
| D-20 | ✅ Accepted | pg_cron 任务：3 个（J-01 消息清理 03:00 · J-02 邀请 04:00 · J-03 orphans 04:30）|
| D-21 | ✅ Accepted | RLS：7 张业务表全开 + SELECT/INSERT/UPDATE/DELETE policy 穷举（§ 5 ARCH-DESIGN）|
| D-22 | ✅ Accepted | methods to read project memory：**AI_HANDOVER.md → DEVELOPMENT_LOG → TODO → SPEC/ARCH** |

---

## 详细 ADR

### D-01 · SPEC = Single Source of Truth

- **日期**：2026-06-27
- **决策**：`../01_Product/Nook-SPEC.md` 是唯一可信的需求来源；与 SPEC 冲突的所有代码 / 文档 → 视为 bug。
- **理由**：避免多份文档各自更新造成"我说的是 / 你说的是"语义漂移；保证开发期有明确锚点。
- **影响**：所有 v1.x 阶段的开发 / 测试 / 部署必须以本 Spec 为准；源文档（PRODUCT / ARCH 等）提供补充但不替代。
- **可逆性**：极低（属于产品元规则）
- **替代方案**：考虑"多份 spec 各自独立 + 校验脚本"；因产品规模小，多版本规则收益 < 维护成本。

### D-02 · i18n v1.0 仅双语（zh-CN + en）

- **日期**：2026-06-27
- **修正历史**：v1.0.1 docs-only patch（FU-2 sync）
- **决策**：v1.0 上线仅双语；ja-JP / 其他语言在 v1.1+ 用户量增长后加。
- **理由**：v1.0 不为"未来"付维护成本；产品定位 20 岁左右、私人朋友圈层、双语已覆盖核心场景。
- **影响**：M1-3 i18next locales 只有 2 个 JSON；REACT-I18N fallback zh-CN；UI 文案 100% 走 key。
- **可逆性**：低（加语言是 +1 文件，但需全 UI 文案审核）

### D-03 · 永不放 Web Push / 系统通知 / Email 推送

- **日期**：2026-06-27
- **修正历史**：v1.0.1 docs-only patch（FU-1 sync）
- **决策**：v1.0 不放 Web Push / 系统通知 / Email 推送。所有"在 / 不在场"提示仅走 F-NOTIF-01 应用内未读小红点 + F-ST-02 Tab title。
- **理由**：产品定位"零噪音信息获取权"——所有推送都是 IG 和 Twitter 的"被迫打搅"功能；Nook 应依赖用户主动打开 + 应用内未读。
- **影响**：删 send-push Edge Function；删 Nook-PRODUCT § 4 M12；arch 仅留 integers。
- **可逆性**：**不可逆**（Never-Do · SPEC § 1.7.2）

### D-04 · F-MSG-07 列级软隐藏（不物理 DELETE）

- **日期**：2026-06-27
- **决策**：F-MSG-07（本地删除）实现为：
  - DB 列 `messages.deleted_by_sender_at timestamptz NULL`
  - 列级 GRANT：`revoke update on messages from authenticated; grant update (body, deleted_by_sender_at) on messages to authenticated;`
  - 客户端 UI：sender 看到 "已删除"占位；其他朋友仍看原 row
- **理由**：SPEC AC.10 明确"仅自己端消失，其他朋友端仍可见"。物理 DELETE 违反此约束。
- **影响**：messages 表新增一列；EF admin-delete-friend 不触发此列。
- **可逆性**：中（可加 `deleted_by_all_at` 升级，但要改 RLS）

### D-05 · `fn_unread_counts` 基于 `conversation_members.last_read_at`

- **日期**：2026-06-27
- **决策**：未读计数采用 cursor-based 游标而非"today 24h 滑动窗口"简化方案。
- **理由**：前者是真实未读；后者会算错"读历史 vs. 读新消息"。
- **影响**：
  - 新列 `conversation_members.last_read_at timestamptz default now()`
  - RPC `fn_mark_conversation_read(p_conv uuid)` 客户端进入会话时调用
  - RPC `fn_unread_counts(p_user uuid)` 使用游标计算
- **可逆性**：中（改 algorithm 即可）

### D-06 · 4 群 + 8 成员硬上限（DB trigger + UI 双重）

- **日期**：2026-06-27
- **修正历史**：7/6 update by thinker（T-01 改 `WHERE kind='group'`）
- **决策**：
  - 用 DB trigger BEFORE INSERT 守 4 群（仅 group）+ 8 成员（per conv active）
  - UI 端按钮 disabled + tooltip
- **理由**：DB-authoritative 防线不被绕过；UI 体验更平滑。
- **影响**：T-01/T-02 trigger；2-min 编辑窗口 trigger 也归本决策（D-07）
- **可逆性**：高（任意时刻改）

### D-07 · 编辑 2 分钟窗口（DB trigger）

- **日期**：2026-06-27
- **决策**：`trg_messages_edit_window` BEFORE UPDATE 检测 `OLD.created_at < now() - 2 minutes` 时 raise exception。
- **理由**：DB-authoritative；前端不可绕过；UI `disabled` 是体验层。
- **影响**：message UPDATE 走这条 trigger；其他列不在 trigger 守内。
- **可逆性**：高

### D-08 · 30 天 TTL 同步清理 messages + attachments + storage.objects

- **日期**：2026-06-27
- **修正历史**：SPEC § 7 DR-05 § 7 决策：30 天清包括 recalled 占位
- **决策**：pg_cron J-01（每日 03:00 UTC）：
  

```sql
  with del as (delete from messages where created_at < now() - '30 days' returning attachment_id)
  delete from attachments where id in (select attachment_id from del);
  ```


  EF `cleanup-storage-orphans` J-03（每日 04:30）扫 storage.objects 不在 attachments → DELETE。
- **理由**：v1.0 协议 = 不沉淀无限历史；30 天后物理不可恢复。
- **影响**：所有消息 30 天后不可恢复；已撤回占位同样被硬删。
- **可逆性**：低（迁移到 60/90 天需保留近 30 天已删消息的备份）

### D-09 · 前端选 React 18 + Vite + TS

- **日期**：2026-06-27
- **决策**：React 18 + Vite 5 + TypeScript（不选 Next.js / Astro / Remix）
- **理由**：
  - chat SPA 不需 SSR
  - Vite dev/HMR/产物体积最佳
  - Supabase SDK 优先适配 React
  - 单 repo 不上 monorepo
- **影响**：M1 起所有前端代码按 SPA 写。
- **可逆性**：中（迁移成本大，但不需"立即"做）

### D-10 · 后端 Supabase 一体化

- **日期**：2026-06-27
- **决策**：Postgres 15 + Auth (GoTrue) + Realtime + Storage + Edge Functions (Deno) + pg_cron — 一家供应商承担后端。
- **理由**：单 dashboard 单 RBAC 单 billing；维护成本 0
- **影响**：
  - 单厂商故障 = 全栈停（KI-4）
  - 不会引入 Pusher / Ably / Firebase / Pocketbase
- **可逆性**：低（迁移成本大；v2.0+ 才有自托管选项）

### D-11 · Realtime = Supabase Realtime（WS + Presence）

- **日期**：2026-06-27
- **决策**：200 并发连接免费；含 Presence 不写库；零自写 WS 协议
- **理由**：含在套餐里；presence 干 typing + 在线状态零成本
- **影响**：5 个 Realtime channel 命名约定（§ 3.2 ARCH-DESIGN）
- **可逆性**：中

### D-12 · Auth = Supabase Auth + 自建 invite-token

- **日期**：2026-06-27
- **决策**：email + password + invite-token 一次性 24h 链接。
- **理由**：magic-link 国内送达不稳；OAuth 稀释 Invite-only 入口唯一性
- **影响**：
  - invitations 表 + 24h expires_at pg_cron 清理
  - EF friend-signup 一站式 signUp + profile + 1:1 conv
- **可逆性**：高

### D-13 · 状态管理 Zustand + TanStack Query v5

- **日期**：2026-06-27
- **决策**：client state 用 Zustand（轻量）；server state 用 TanStack Query（cache/revalidate/devtools 一体）
- **理由**：15 朋友级不需要 Redux；手写 useEffect + setState 是 chat 大忌
- **影响**：`src/stores/` + `src/lib/api/` 必须严格分离
- **可逆性**：中

### D-14 · Dexie（IndexedDB） + outbox + client_msg_id

- **日期**：2026-06-27
- **决策**：3 层缓存（hot in-mem 100 → warm IndexedDB 1000 → cold Postgres）；outbox 离线条目；client_msg_id 唯一 dedupe
- **理由**：
  - Dexie 比 raw IDB 简单 10×（schema 版本管理）
  - outbox 让弱网无感
  - client_msg_id 让本地 optimistic 与 server 推送精准合并
- **影响**：M5 实施；Realtime 推送 vs 本地 optimistic dedupe
- **可逆性**：低

### D-15 · 部署 CF Pages + Supabase + R2

- **日期**：2026-06-27
- **决策**：永久免费 3 层 — FE / BE / 兜底存储
- **理由**：
  - CF Pages 无带宽上限
  - Supabase + CF 单一 dashboard
  - 多供应商 = 多 dashboard
- **影响**：避开 Vercel 严格 Hobby 限 + Netlify 冷启动
- **可逆性**：中

### D-16 · CI/CD = GitHub Actions

- **日期**：2026-06-27
- **决策**：PR → `verify`（typecheck/lint/test）→ main → `deploy prod`（wrangler + supabase deploy）
- **理由**：2000 min/月免费；与 GitHub 内置
- **影响**：每个 PR 必过；CD 手动审批 db push
- **可逆性**：高（迁 GitLab CI 也行）

### D-17 · Sentry free + LogSnag free

- **日期**：2026-06-27
- **决策**：单一性能监控 + 远程事件
- **理由**：Sentry = 异常 + performance；LogSnag = 结构化事件；两者语义不混
- **影响**：默认关 PII attachStacktrace；message body 不入任何 log
- **可逆性**：高

### D-18 · 自托管 Inter + JetBrains Mono WOFF2

- **日期**：2026-06-27
- **决策**：`public/fonts/*.woff2` 自托管，**绝不引 Google CDN**
- **理由**：国内 GFW 不稳 Google CDN；自托管是永久方案
- **影响**：M1-7 public/fonts/ 放 2 个 WOFF2；CSS `@font-face` 指本地
- **可逆性**：中（迁移其他 CDN 也行，但永远不允许 Google）

### D-19 · Edge Function 数 = 5 个

- **日期**：2026-06-27
- **决策**：
  1. `admin-bootstrap`（CAP-01 owner 注册写 profiles）
  2. `friend-signup`（CAP-04 friend 一站式）
  3. `admin-create-invite`（CAP-03）
  4. `admin-reset-password`（CAP-19）
  5. `admin-delete-friend`（CAP-20）
  6. `cleanup-storage-orphans`（cron + internal）
- **理由**：service_role key 的所有跨表操作均集中此处；不在 client 直走
- **影响**：每个 EF 在 `_shared/auth.ts` 验证 owner role
- **可逆性**：中

### D-20 · pg_cron 数 = 3 个

- **日期**：2026-06-27
- **决策**：
  - J-01 每日 03:00 UTC：messages TTL
  - J-02 每日 04:00 UTC：invites 过期 + 已用超 1d 硬删
  - J-03 每日 04:30 UTC：cleanup-storage-orphans EF 调用
- **理由**：低谷时段；批次处理避免 lock contention
- **影响**：Sentry 监控 cron 失败；监控 >= 1000/日删量
- **可逆性**：高

### D-21 · RLS 7 张业务表全开 + I/U/D policy 穷举

- **日期**：2026-06-27
- **决策**：架构层"前端一行不写鉴权"= RLS 全开
- **理由**：auth.uid() + auth.jwt() + role 守门；DB-authoritative；client tamper-resistance
- **影响**：每张表 1+ SELECT policy + 需要时 UPDATE/DELETE；列级 GRANT 加 F-MSG-07；消息 UPDATE 格 granted (body, deleted_by_sender_at) only
- **可逆性**：高（任意加 policy）

### D-22 · 阅读顺序 = Project Memory

- **日期**：2026-06-27
- **决策**：新 AI 接手的固定阅读顺序
  1. `AI_HANDOVER.md`（即本文档，重要）
  2. `DEVELOPMENT_LOG.md` 最近 1-2 个 Session
  3. `TODO.md` 当前阶段活跃任务
  4. `../01_Product/Nook-SPEC.md § 1-3`（概述 + 功能 + 数据需求）
  5. `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 4 / 5 / 6 / 7`（schema + RLS + API + 部署）
  6. `KNOWN_ISSUES.md`（当前风险）
- **理由**：接手成本最小；不会漏掉 v1.0.1 patches
- **影响**：替换 AI 时不丢失状态
- **可逆性**：高

---

## 已废止 / 修订决策（保留 row）

| 状态 | 原决策 | 修订为 | 日期 | 触发依据 |
|---|---|---|---|---|
| ❌ Amended | FU-2 旧版 i18n 3 语（zh-CN/en/ja-JP，源自 ARCH § 2.7）| ✅ D-02 双语 zh-CN + en | 2026-06-27 | v1.0.1 patch |
| ❌ Amended | FU-1 Web Push MUST 列于 PRODUCT § 4 M12 | ✅ D-03 永不放 | 2026-06-27 | v1.0.1 patch |
| ❌ Amended | F-MSG-07 物理 DELETE 旧设计 | ✅ D-04 列级软隐藏 | 2026-06-27 | thinker 反馈 |

---

— END —
