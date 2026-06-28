# Nook · Architecture Design v1.0 (Stage 7)

> **Stage 7 · Architecture Design — Frozen for Nook v1.0**
> 文档生成日：2026-06-27 · 关联：`Nook-SPEC v1.0`（SoT，Stage 6 PASS） · 评审：Architecture Review Lead
> 目的：在已冻结 SPEC 基础上，**唯一**对外可指导后端 / 前端集成与部署的架构文档。
> 本文档**取代** `Nook-ARCHITECTURE.md` 作为 v1.0 的实施参考（且明确修复 Stage 6 FU-2「i18n 语种冲突」）。

---

## 0. 元规则

### 0.1 文档性质

- 本文档是 Stage 7 交付物，与 SPEC 同级冻结（v1.0 / 2026-06-27）。
- 任何后续架构变更 → 走 `v1.0.1` / `v1.1` 新版本；不得直接修改本文件。
- 与 SPEC 冲突时：SPEC 优先（依据 `Nook-SPEC § 0.1` SoT 规则）。
- 与既有 `Nook-ARCHITECTURE.md` 冲突时：本文件**优先**（并显式记录差异在 § 1.7 Reconciliation Notes）。

### 0.2 范围

| 包含 | 不包含 |
|---|---|
| 数据模型（9 张业务表 + RLS policies 全） | 详细代码 / 类方法实现 |
| 模块划分（FE / BE / Realtime / Shared） | UI Figma / Token 颜色 hex（→ Nook-DESIGN-TOKENS.ts） |
| **完整 API 契约**（REST endpoint 列表 + WS event schema） | 组件 React API（→ `prompt/components/*.spec.md`） |
| Realtime 通道拓扑与 channel 命名 | 业务文字 → 走 SPEC CAP- / F- ID |
| **RSL 完整策略**（7 张表 + SELECT/INSERT/UPDATE/DELETE 全 policy） | DevOps 脚本本身（运行文档另建 `RUNBOOK.md`） |
| 部署拓扑（DFD + 资源清单 + 免费额度边界） | Pricing 谈判 / SLA 合同 |
| 6 维技术风险 + 缓解 | 营销 / 推广 |
| SPEC ↔ Architecture F-ID 交叉索引 | 超出 SPEC § 1.7.2 的新功能 |

### 0.3 命名约定

- Migration 文件：`supabase/migrations/NNNN_<slug>.sql`（4 位序号，sorted-apply）
- Edge Function：`supabase/functions/<kebab-name>/index.ts`
- REST endpoint 命名：`/rest/v1/<table>`（Supabase auto-generated，除 Edge Function 显式定义的 `/functions/v1/<kebab-name>`）
- Realtime channel：`{kind}:{scope_id}`（如 `conversation:<uuid>` / `presence:<uuid>` / `user:<uuid>`）
- DB trigger / function：`trg_<table>_<action>` / `fn_<purpose>`

### 0.4 变更日志

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-27 | v1.0 | 初次生成。Stage 7 交付，基于 SPEC v1.0 + 既有 ARCH 14 项选型沉淀 |

---

## 1. 架构总原则（不可松动 · 据 SPEC § 9.1 + § 9.2）

| # | 原则 | 在选型中的体现 |
|---|---|---|
| **P-01** | 永久免费 > 过度设计 | 不为弹性付费；架构以"实际用量 + 10× 余量"为容量规划 |
| **P-02** | 维护成本 = 0 是设计目标 | 单厂商首选（Supabase 一体化 auth/db/realtime/storage/edge）；CF 单一 CDN+S3 |
| **P-03** | 隐形可靠 > 显性创新 | 选用了 ≥3 年的成熟方案；不追新框架 |
| **P-04** | 单一 Source of Truth | DB 是权威；Realtime 仅是通知；客户端 cache 仅是缓存 |
| **P-05** | RLS 优先于应用层鉴权 | 7 张业务表全开 RLS；前端 JS 一行不写鉴权 |
| **P-06** | 反 Never-Do 边界 | Web Push / E-mail notif / 多设备管理 / 隐身 / 已读 — 架构层硬不实现（无对应 CAP） |
| **P-07** | 不发明轮子 | Auth / Realtime / Storage / Preview deploy 全部使用现成 |

### 1.1 反架构黑名单（任何提议需先被否决）

- ❌ 不上 K8s / Docker Swarm
- ❌ 不分微服务（auth / chat / media 各一套）
- ❌ 不引入除 Supabase / Cloudflare / Sentry / LogSnag / GitHub Actions 以外的供应商
- ❌ 不上 GraphQL Federation / Apollo Server
- ❌ 不把任何消息内容送入第三方 AI / 分析服务
- ❌ 不引 Google Fonts CDN（→ 自托管 WOFF2）
- ❌ 不做 light mode 切换入口（SPEC § 1.7.2）

### 1.2 与既有 `Nook-ARCHITECTURE.md` 的差异（Reconciliation Notes）

| # | 原 ARCH 描述 | 新 ARCH-DESIGN 裁定 | 依据 |
|---|---|---|---|
| R-1 | § 2.7 i18n 语言 = 「zh-CN / en / ja-JP（3 语）」 | **v1.0 仅双语 = zh-CN + en**；架构层仍按 dynamic locales design，ja-JP 等 v1.1+ 加 | SPEC § 1.8 F-I18N-01 + Stage 6 FU-2 |
| R-2 | § 1 部署图提到 Web Push 触发 Edge Function | **删除 send-push Edge Function**（SPEC § 1.7.2 / § 2.6 F-NOTIF-03 强禁） | Stage 6 FU-1 + SPEC § 2.6 |
| R-3 | § 3 schema 缺 `conversation_members.role` / `left_at` | 完整化（含两级索引；详见 § 4.4） | SPEC § 7 DR-03 + § 2.4 角色定义 |
| R-4 | § 3 schema 缺 `messages.client_msg_id` 字段 | 必加（offline dedupe；唯一 partial index） | SPEC § 2.4 F-MEDIA-01 + BF-15 |
| R-5 | § 3 schema 缺全局 conversations count cap trigger | 必加（4 群硬上限） | SPEC § 2.2 F-CONV-02 + INTERVIEW § 2.2 |
| R-6 | 没显式列每张表的 RLS SELECT/INSERT/UPDATE/DELETE 策略 | 全文穷举（见 § 5.3） | SPEC § 2.7 F-SEC-03 + AC.AC.rls |
| R-7 | API 仅列 14 项，没有映射到 endpoint | 25 CAP → 完整 endpoint + WS event schema（见 § 6） | SPEC § 8 |
| R-8 | 没明列 Edge Functions 用 edge cases（仅 send-push, cleanup） | 5 个 Edge Function 明列职责（见 § 3.4） | BF-04 / BF-13 / BF-14 / F-MSG-10 + SPEC § 1.7.2 |

---

## 2. 高层架构（High-Level Architecture）

### 2.1 文字 DFD（自上而下）



```
                          ┌──────────────────────────────────────┐
                          │   Browser (PC / Mobile PWA)          │
   Users (≤ 20 好友)        │  - React 18 SPA + Vite + TS         │
   ───────────────────────▶ │  - Zustand (client state)           │
                          │  - TanStack Query v5 (server state)   │
                          │  - Dexie (IndexedDB cache + outbox)  │
                          │  - Workbox (SW + bg sync)            │
                          │  - i18next (zh-CN / en 双语)         │
                          │  - 4 原子组件 (Button/Input/Avatar/  │
                          │    Bubble · from components/*.spec)  │
                          └──────┬───────────────────────────────┘
                          HTTPS  │
                          WSS    │
                                 ▼
                          ┌──────────────────────────────────────┐
                          │   Cloudflare Pages (CDN + WAF +SSL)  │
                          │   全球边缘 · 永久免费 · 自动 HTTPS    │
                          └──────┬───────────────────────────────┘
                                 │ HTTPS / WSS
                                 ▼
                          ┌──────────────────────────────────────┐
                          │   Supabase Cloud (Free Tier)         │
                          │  ┌─────────┐ ┌─────────┐ ┌─────────┐ │
                          │  │Postgres │ │Realtime │ │  Auth   │ │
                          │  │  15 +   │ │ (WS)    │ │ (GoTrue)│ │
                          │  │ RLS ON  │ │Presence │ │  JWT    │ │
                          │  └────┬────┘ └────┬────┘ └────┬────┘ │
                          │  ┌────┴────┐ ┌────┴────┐             │
                          │  │ Storage │ │  Edge   │             │
                          │  │ (signed │ │Functions│             │
                          │  │  URL)   │ │  (Deno) │             │
                          │  └─────────┘ └─────────┘             │
                          │  ┌─────────────────────────────────┐ │
                          │  │ pg_cron (Daily Jobs)            │ │
                          │  │  - 03:00 messages.ttl           │ │
                          │  │  - 04:00 invites.expire         │ │
                          │  │  - 04:30 orphans cleanup        │ │
                          │  └─────────────────────────────────┘ │
                          └──────┬───────────────────────────────┘
                                 │ out→ AWS region
                                 ▼
                          ┌──────────────────────────────────────┐
                          │   Cloudflare R2 (兜底存储 · 10GB)   │
                          │   v1.0 通常不触发；v1.1 大附件迁移用 │
                          └──────────────────────────────────────┘
                          ┌──────────────────────────────────────┐
                          │   Service Hub (Free Tier)            │
                          │  - Sentry (errors / perf)            │
                          │  - LogSnag (structured events)       │
                          │  - GitHub Actions (CI/CD)            │
                          │  - Cloudflare Analytics (traffic)    │
                          └──────────────────────────────────────┘
```



### 2.2 技术栈裁剪（仅 v1.0 引入）

| 层 | 选型 | 不可替代理由 |
|---|---|---|
| **前端框架** | React 18 + Vite 5 + TS | chat SPA 不需 SSR；Vite 启动/HMR 最佳 |
| **路由** | React Router v6 | 文档多、生态稳定 |
| **客户端态** | Zustand | 模板轻量；chat 体量不需要 Redux |
| **服务端态** | TanStack Query v5 | 缓存、revalidate、devtools 一体 |
| **本地缓存** | Dexie (IndexedDB) | 比 raw IDB 简单 10×，schema 迁移友好 |
| **Realtime 客户端** | @supabase/supabase-js v2 | 官方 SDK 原生支持 RLS-pass Req |
| **表单** | React Hook Form + Zod | Zod 顺便给 API 边界做运行时校验 |
| **国际化** | i18next + react-i18next (ICU) | SPEC § 2.9 I18N-2 |
| **样式** | Tailwind v3 + Nook-DESIGN-TOKENS.ts 注入 | 业务代码 0 写 hex |
| **PWA** | Vite PWA plugin + Workbox | manifest + SW 一致体验 |
| **后端运行时** | Deno (Supabase Edge Functions) | TS-native；无 Docker；冷启快 |
| **DB** | Supabase Postgres 15 (RLS ON) | chat 多对多关系天然 |
| **认证** | Supabase Auth (GoTrue) + 自建 invite-token | 已有 production-grade；e-mail+pwd 双重 |
| **对象存储** | Supabase Storage → R2 fallback | R2 无 egress；50MB 单文件 |
| **实时通信** | Supabase Realtime (WS + Presence) | 200 并发免费；含 presence 不写库 |
| **部署** | Cloudflare Pages (FE) + Supabase Cloud (BE) | 双免费层；dashboard 单一 |
| **CI/CD** | GitHub Actions | 2000 min/月免费 |
| **前端监控** | Sentry free (5k err/月) | PII 默认关 |
| **前端事件** | LogSnag free (1k ev/月) | 结构化；不含 message body |
| **字体** | Inter / JetBrains Mono WOFF2 自托管 | SPEC UI-5 硬禁 Google Fonts |

---

## 3. 模块划分（Module Breakdown）

### 3.1 Frontend（`src/`）— React SPA



```
src/
├── main.tsx                          # Entry · hydration
├── App.tsx                           # 路由根
├── app/
│   ├── routes.tsx                    # 路由表 (SPEC § 5.1 给 13 路由)
│   └── pages/
│       ├── WelcomePage.tsx           # /welcome             [SPEC § 5.2]
│       ├── RegisterPage.tsx          # /welcome/register
│       ├── LoginPage.tsx             # /login
│       ├── InviteNewPage.tsx         # /invite/new          (Owner only)
│       ├── InviteAcceptPage.tsx      # /invite/:token
│       ├── HomePage.tsx              # /home                (核心 SPA)
│       ├── SettingsPage.tsx          # /settings
│       ├── SettingsProfilePage.tsx   # /settings/profile
│       ├── SettingsAdminPage.tsx     # /settings/admin      (Owner only)
│       ├── GroupSettingsPage.tsx     # /group/:id/settings  (Owner only)
│       ├── NotFoundPage.tsx          # /404
│       └── ErrorPage.tsx             # /error
├── components/
│   ├── ui/                           # 4 原子组件 (from components/*.spec)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Avatar.tsx
│   │   └── Bubble.tsx
│   ├── chat/                         # 复合组件 (chat 域)
│   │   ├── Sidebar.tsx
│   │   ├── Composer.tsx              # 含 typing presence / outbox
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx           # 含 react/edit/recall/reply/react
│   │   ├── ReplyCard.tsx
│   │   └── UnreadDot.tsx
│   ├── settings/                     # 设置域复合组件
│   ├── modals/                       # ConfimModal / ResetPwdModal / DeleteFriendModal
│   └── a11y/
│       └── MotionReduced.tsx
├── lib/
│   ├── supabase.ts                   # Supabase client 单例 (含 auth state listener)
│   ├── api/                          # 类型安全的 API 封装 (FE→BE)
│   │   ├── messages.ts               # CAP-06, 09, 12, 13, 14
│   │   ├── conversations.ts          # CAP-05, 22, 23
│   │   ├── reactions.ts              # CAP-15
│   │   ├── invites.ts                # CAP-03 (client→EF)
│   │   ├── admin.ts                  # CAP-19, 20 (client→EF)
│   │   └── profile.ts                # CAP-16, 17, 18
│   ├── realtime/                     # Realtime subscription hooks
│   │   ├── useMessagesChannel.ts
│   │   ├── usePresenceChannel.ts
│   │   ├── useUserChannel.ts
│   │   └── useTypingPublisher.ts
│   ├── db/                           # Dexie schema
│   │   ├── schema.ts
│   │   ├── cache.ts                  # read-through
│   │   └── outbox.ts                 # offline queue
│   ├── storage/                      # 图片压缩 + EXIF strip
│   │   ├── compressor.ts             # canvas → WebP q=0.78 / fallback JPEG
│   │   ├── exif.ts                   # 读元数据但不写回
│   │   └── uploader.ts               # 直传 Supabase Storage signed URL
│   ├── i18n/
│   │   ├── index.ts                  # init react-i18next
│   │   └── locales/{zh-CN,en}/       # SPEC § 1.8 双语
│   └── auth/
│       ├── session.ts                # JWT refresh
│       └── guards.tsx                # <RequireOwner> / <RequireAuth>
├── stores/                           # Zustand stores
│   ├── useChat.ts                    # active conv / draft / composer
│   ├── useUI.ts                      # sidebar collapsed / modals / locale
│   ├── useAuth.ts                    # current user / role
│   └── usePresence.ts                # 在线朋友 dict
└── types/                            # 由 DB schema 推导的 TS 类型
```



**模块内禁止**：业务逻辑不得直接 import `supabase-js`；必须经 `lib/api/*` → 服务端 → 失败量化。

### 3.2 Realtime 通道（FE 订阅拓扑）

| Channel 名 | 订阅者 | 触发类型 | 用途 |
|---|---|---|---|
| `conversation:${conversation_id}` | 该会话所有成员 | Postgres INSERT/UPDATE on messages / reactions | 新消息、reaction 计数、撤回渲染、编辑 (edited) |
| `presence:${conversation_id}` | 该会话所有成员 | Realtime Presence | typing + 在场（呼吸光点） |
| `user:${user_id}` | 仅自己 | Postgres INSERT/UPDATE on invites / conversation_members / profiles | 朋友加入、新群、邀请到期、unread |
| `admin:owner` | 仅 Owner | Postgres INSERT on invites + Edge Function admin emit | 邀请状态 overview |

**为何按 conversation_id 拆分 channel**：≤ 8 人/会话 × ≤ 4 群 + 与每 friend 1:1 = ≤ 19 channels/user，Supabase Realtime 限 200 并发连接根本不是瓶颈。

### 3.3 Backend（`supabase/`）— Postgres + Edge Functions



```
supabase/
├── config.toml
├── migrations/                       # 排序应用
│   ├── 0001_init.sql                 # 9 张业务表 + sequences + FK
│   ├── 0002_rls.sql                  # 7 张表全开 RLS + 所有 policies
│   ├── 0003_triggers.sql             # conv_4cap / member_8cap / edited_2min
│   ├── 0004_pg_cron.sql              # messgae_ttl / invite_ttl / orphan cleanup
│   ├── 0005_storage.sql              # attachments bucket + RLS
│   └── 0006_seed.sql                # 0-row seed (no demo data)
└── functions/                        # Deno Edge Functions
    ├── admin-create-invite/
    │   └── index.ts                  # CAP-03: gen 24-byte token + INSERT
    ├── admin-reset-password/
    │   └── index.ts                  # CAP-19: supabase.auth.admin.updateUserById
    ├── admin-delete-friend/
    │   └── index.ts                  # CAP-20: 原子批量 left_at
    ├── cleanup-storage-orphans/
    │   └── index.ts                  # daily: findings storage objs w/o DB row → DELETE
    └── admin-bootstrap/
        └── index.ts                  # one-time 健康检查 (deploy 后)
```



**为什么 Edge Functions 而非传统 backend server**：
- Edge Functions 由 Supabase 部署 URL 直接调用，无 Dockerfile / 无 cert / 无 domain。
- 维护成本 = 0（dashboard 部署 + 看 logs）。
- 5 个 EF 的共同模式：仅 owner 可调用（从 request JWT 解析 role）；service_role key 仅 EF 持有；client JWT 仅 EF 验证。

### 3.4 Edge Functions × CAP 映射

| Edge Function | CAP 覆盖 | 入参 | 出参 | 触发方 |
|---|---|---|---|---|
| `admin-create-invite` | CAP-03 | `{ target_kind, target_conversation_id? }` | `{ invite: { token, url, expires_at } }` | `/invite/new` (Owner) |
| `admin-reset-password` | CAP-19 | `{ friend_auth_id, new_password }` | `{ success: true }` | `/settings/admin/:id/reset` (Owner) |
| `admin-delete-friend` | CAP-20 | `{ friend_auth_id }` | `{ affected_conversations: number }` | `/settings/admin/:id/delete` (Owner) |
| `cleanup-storage-orphans` | (内部) | n/a | `{ deleted_objects: number }` | pg_cron `04:30` |
| `admin-bootstrap` | (内部) | n/a | `{ db_init: 'OK', rls_count: N }` | Deploy 后 / GitHub Action smoke test |

**权限模型**：每个 EF 在 `supabase/functions/_shared/auth.ts` 中：
1. 解析 client JWT → 取出 `auth.uid`
2. 查 `profiles.role` → 必须 `'owner'`
3. 用 `SERVICE_ROLE_KEY` 走 DB / Auth API

### 3.5 Shared 模块（`shared/` · FE + BE 同步类型）



```
shared/
├── types/
│   ├── db.ts                         # 从 supabase gen types 自动生成
│   ├── domain.ts                     # Message, Conversation, Profile, Invite
│   └── errors.ts                     # ErrorCode enum
├── constants/
│   ├── limits.ts                     # MAX_FILE_SIZE_MB = 50 / MAX_AVATAR_MB = 5 / …
│   ├── time.ts                       # EDIT_WINDOW_MS = 120_000
│   └── locale.ts                     # SUPPORTED_LOCALES = ['zh-CN', 'en']
└── runtime/                          # 端运行的同一份常量
```



> 注：v1.0 不分 monorepo；`shared/` 默认在 `src/shared/` 导出；supabase gen types 输出到 `src/types/db.ts`。v1.1+ 才考虑 nx/turbo。

---

## 4. 数据模型（Data Model · Final Schema）

> **本节是实施权威。任何与本文档不一致的 SQL → 视为 bug。**

### 4.1 Schema 总览



```
                            ┌─────────────┐
                            │ auth.users  │  ← Supabase Auth 自管
                            └──────┬──────┘
                                   │ 1:1 (FK cascade)
                                   ▼
                            ┌─────────────┐
                            │  profiles   │  ← display_name / avatar_url / role / created_at
                            └──────┬──────┘
                                   ▲
                invite 重启用 ──── │ ───── owner 写 all FK by_cascade
                                   │
              ┌────────────────────┼─────────────────────┐
              │                    │                     │
       ┌──────┴─────┐       ┌──────┴──────┐       ┌──────┴──────┐
       │  invites   │       │conversations│       │  reactions  │  (PK: msg×user×emoji)
       └────────────┘       └──────┬──────┘       └──────▲──────┘
                                   │                     │
                                   ▼ 1:N                 │
                          ┌──────────────────┐           │
                          │conversation_     │           │
                          │    members       │           │
                          └────────┬─────────┘           │
                                   │ 1:N                 │
                                   ▼                     │
                            ┌────────────┐              │
                            │  messages  │ ────────────┘
                            └──────┬─────┘
                                   │ 1:1
                                   ▼
                          ┌────────────────┐
                          │  attachments   │ ──→ Storage objects (signed URL)
                          └────────────────┘
```



### 4.2 物理表（DDL 概览）

> DDL 完整版落地在 `supabase/migrations/0001_init.sql`。



```sql
-- ====================================================================
-- extensions
-- ====================================================================
create extension if not exists "pgcrypto";   -- gen_random_bytes
create extension if not exists "pg_cron";    -- scheduling (Supabase 启用)

-- ====================================================================
-- profiles (1:1 with auth.users)
-- ====================================================================
create type user_role as enum ('owner', 'friend');

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  avatar_url    text,
  role          user_role not null,
  created_at    timestamptz not null default now()
);

-- 自动 trigger: auth.users INSERT → 自动 INSERT profiles('owner' 占位)
create function fn_profiles_on_signup() returns trigger language plpgsql security definer as $$
begin
  -- 注意：role 初始为 NULL；前端 register 表单按 review 后决定
  -- 但 Nook v1.0 不接受陌生注册：朋友必须经 invite（BF-04），
  -- Owner 注册时通过 UI 强制 role='owner' 写入（在 trigger 内用 metadata）
  -- 此处仅占位；register 阶段 EF 写入完整 profile
  return new;
end $$;

-- 注：实际 final 落地为 EF admin-bootstrap + register page 联合写入

-- ====================================================================
-- invites
-- ====================================================================
create type invite_target_kind as enum ('any', 'conversation');

create table public.invites (
  token                   text primary key default encode(gen_random_bytes(24), 'hex'),
  created_by              uuid not null references public.profiles(id) on delete cascade,
  target_kind             invite_target_kind not null,
  target_conversation_id  uuid references public.conversations(id) on delete cascade,
  expires_at              timestamptz not null default (now() + interval '24 hours'),
  used_by                 uuid references public.profiles(id) on delete set null,
  used_at                 timestamptz,
  created_at              timestamptz not null default now(),
  -- 校验：要么 token 一次性使用后失效 (used_at null OR >24h 已过期)
  -- 强约束：target='conversation' 时必须给 target_conversation_id
  check (
    (target_kind = 'any' and target_conversation_id is null) or
    (target_kind = 'conversation' and target_conversation_id is not null)
  )
);
create index invites_expires_idx on public.invites(expires_at) where used_at is null;

-- ====================================================================
-- conversations
-- ====================================================================
create type conversation_kind as enum ('one_to_one', 'group');

create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  kind        conversation_kind not null,
  name        text check (name is null or char_length(name) <= 40),
  avatar_url  text,                                          -- 仅 group 可选 (SPEC DR-04)
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index conversations_created_by_idx on public.conversations(created_by);

-- ====================================================================
-- conversation_members
-- ====================================================================
create type member_role as enum ('owner', 'member');

create table public.conversation_members (
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  role             member_role not null default 'member',
  joined_at        timestamptz not null default now(),
  left_at          timestamptz,
  last_read_at     timestamptz not null default now(),       -- CAP-21 未读计数游标
  primary key (conversation_id, user_id)
);
create index conversation_members_active_idx
  on public.conversation_members(user_id, conversation_id)
  where left_at is null;
create index conversation_members_conv_active_idx
  on public.conversation_members(conversation_id)
  where left_at is null;   -- 用于 FK 反查 + 8-cap 触发

-- ====================================================================
-- messages
-- ====================================================================
create type message_kind as enum ('text', 'image', 'file');

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  kind             message_kind not null default 'text',
  body             text,                                          -- text 内容
  attachment_id    uuid references public.attachments(id) on delete set null,
  reply_to_id      uuid references public.messages(id) on delete set null,
  client_msg_id        uuid,                                          -- offline dedupe (partial unique)
  edited_at            timestamptz,
  recalled_at          timestamptz,
  deleted_by_sender_at timestamptz,                                 -- F-MSG-07 soft-hide；Sender 端 UI 看占位，其他端仍可见 (AC.10)
  created_at           timestamptz not null default now(),
  check (
    (kind = 'text' and body is not null and attachment_id is null) or
    (kind in ('image', 'file') and attachment_id is not null)
  )
);
create index messages_conv_created_idx
  on public.messages(conversation_id, created_at desc);
create unique index messages_client_msg_id_unique_idx
  on public.messages(client_msg_id, conversation_id)
  where client_msg_id is not null;  -- 仅本会话内去重

-- ====================================================================
-- attachments
-- ====================================================================
create table public.attachments (
  id             uuid primary key default gen_random_uuid(),
  storage_path   text not null,                          -- 'user-uploads/<uuid>'
  mime           text not null,
  size_bytes     bigint not null check (size_bytes > 0 and size_bytes <= 50 * 1024 * 1024),
  width          int,                                    -- 仅 image
  height         int,
  original_name  text,
  uploaded_by    uuid not null references public.profiles(id),
  created_at     timestamptz not null default now()
);
create index attachments_uploaded_idx on public.attachments(uploaded_by);

-- ====================================================================
-- reactions (仅 6 个 emoji enum)
-- ====================================================================
create type reaction_emoji as enum ('👍','❤️','😂','👀','🔥','🙏');

create table public.reactions (
  message_id  uuid not null references public.messages(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  emoji       reaction_emoji not null,
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index reactions_message_idx on public.reactions(message_id);
```



### 4.3 触发器（Triggers · 硬约束）



```sql
-- ====================================================================
-- 三条硬约束 trigger
-- ====================================================================

-- (T-01) 4 群硬上限 (SPEC § 2.2 F-CONV-02)
create function fn_check_conv_cap() returns trigger language plpgsql as $$
declare cnt int;
begin
  -- 只数 group (SPEC § 2.2 F-CONV-02)；1:1 自动创建不计硬上限
  select count(*) into cnt from public.conversations where kind = 'group';
  if cnt >= 4 then
    raise exception 'CONV_HARD_CAP' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger trg_conversations_cap
  before insert on public.conversations
  for each row execute function fn_check_conv_cap();

-- (T-02) 每群 8 成员上限 (SPEC § 2.2 F-CONV-05 / CONV-4)
create function fn_check_member_cap() returns trigger language plpgsql as $$
declare cnt int;
begin
  select count(*) into cnt
  from public.conversation_members
  where conversation_id = NEW.conversation_id and left_at is null;
  if cnt >= 8 then
    raise exception 'MEMBER_HARD_CAP' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger trg_conversation_members_cap
  before insert on public.conversation_members
  for each row execute function fn_check_member_cap();

-- (T-03) 编辑 2 分钟窗口 (SPEC § 2.3 F-MSG-05)
create function fn_check_edit_window() returns trigger language plpgsql as $$
begin
  if (TG_OP = 'UPDATE' and NEW.body is distinct from OLD.body) then
    if OLD.created_at < now() - interval '2 minutes' then
      raise exception 'EDIT_WINDOW_EXPIRED' using errcode = 'P0001';
    end if;
    NEW.edited_at := now();
  end if;
  return NEW;
end $$;

create trigger trg_messages_edit_window
  before update on public.messages
  for each row execute function fn_check_edit_window();
```



### 4.4 索引策略

| Index | 用途 | 备注 |
|---|---|---|
| `messages_conv_created_desc` | `GET conversations/:id/messages?limit=50` | 默认排序 |
| `messages_client_msg_id` (unique partial) | offline outbox dedupe | 仅本会话内 |
| `conversation_members_active` (filter left_at null) | "我是哪些 1:1 / 群的活跃成员" | FK 反向 |
| `conversation_members_conv_active` (filter left_at null) | 8-cap trigger 反查 + 渲染群成员列表 | |
| `invites_expires` (filter used_at null) | pg_cron 找过期邀请 | |
| `attachments_uploaded` | cleanup 找自己的 attachments | |

### 4.5 `pg_cron` 编排



```sql
-- 0004_pg_cron.sql
-- (J-01) 每日 03:00 UTC: 30 天消息清理 (F-MSG-10)
select cron.schedule('messages_ttl', '0 3 * * *', $$
  with del as (
    delete from public.messages
    where created_at < now() - interval '30 days'
    returning attachment_id
  )
  delete from public.attachments where id in (select attachment_id from del);
$$);

-- (J-02) 每日 04:00 UTC: 邀请清理 (F-SEC-02)
select cron.schedule('invites_ttl', '0 4 * * *', $$
  delete from public.invites
  where (expires_at < now()) or (used_at is not null and used_at < now() - interval '1 day');
$$);

-- (J-03) 每日 04:30 UTC: 调 Edge Function → 清 storage orphan
select cron.schedule('cleanup_orphans', '30 4 * * *', $$
  select net.http_post(
    url := current_setting('app.functions_url') || '/cleanup-storage-orphans',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_key'))
  );
$$);
```



### 4.6 数据生命周期（Lifecycle Summary）

| Data | TTL / Lifecycle | 物理删除方 |
|---|---|---|
| messages (含 text/image/file) | 30 天 → hard delete + cascade attachments + storage obj | pg_cron J-01 |
| attachments | 同上（与 messages 原子删） | pg_cron J-01 |
| reactions | 与 message 同步 cascade（F-ON-DELETE） | 同上 |
| storage.objects (R2/Storage) | 同 attachments；orphan 由 J-03 兜底 | pg_cron J-01 + J-03 |
| invites | 24h 过期 OR 用过 1d 后 → hard delete | pg_cron J-02 |
| profiles | **永久**（与 auth.users cascade） | 不删 |
| conversations | **永久**（哪怕所有成员 left） | 不删 |
| conversation_members.left_at 标记 | **永久**（F-SEC-06 软删） | 不改 |
| Dexie cache / outbox | 与登录态挂钩；(clear browser) 即清 | 用户 |

---

## 5. RLS 策略（Exhaustive Policies · F-SEC-03 · AC.AC.rls）

> ⚠️ ALL 7 张业务表的 RLS 策略如下。`<R>` 标 = Read policy；`<IUD>` = Insert/Update/Delete。

### 5.1 `profiles`



```sql
alter table public.profiles enable row level security;

-- <R> 任何自己会话里的朋友都能看我的 display_name + avatar
create policy profiles_read_same_conv on public.profiles
  for select using (
    exists (
      select 1 from public.conversation_members me
      join public.conversation_members them
        on me.conversation_id = them.conversation_id
      where me.user_id = auth.uid()
        and them.user_id = profiles.id
        and me.left_at is null
        and them.left_at is null
    )
    or id = auth.uid()                                      -- 永远能看自己
  );

-- <I> 仅 service_role / EF 可 INSERT（register 时）
create policy profiles_insert_service on public.profiles
  for insert with check (auth.uid() = id);                  -- 仅允许 self-register

-- <U> 自己也：display_name + avatar_url
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
             with check (id = auth.uid());

-- <D> ❌ 永远禁止（业务层）
```



### 5.2 `invites`



```sql
alter table public.invites enable row level security;

-- <R> Owner 看自己所有 invite；朋友看不见 invite 列表
create policy invites_read_owner on public.invites
  for select using (created_by = auth.uid());

-- <I> 仅 Owner；token 在 EF 由 gen_random_bytes 生成；client 只声明 metadata
create policy invites_insert_owner on public.invites
  for insert with check (created_by = auth.uid());

-- <U> 仅 service_role / EF 标 used_by/used_at
create policy invites_update_system on public.invites
  for update using (created_by = auth.uid() or auth.uid() is null);

-- <D> ❌ 业务层禁止；pg_cron J-02 物理清
```



### 5.3 `conversations`



```sql
alter table public.conversations enable row level security;

-- <R> 任一会话成员能看对话元数据
create policy conversations_read_member on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = conversations.id
        and user_id = auth.uid()
        and left_at is null
    )
  );

-- <I> 仅 Owner（用 EF 或直接 RLS）
create policy conversations_insert_owner on public.conversations
  for insert with check (created_by = auth.uid() and exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  ));

-- <U> 仅 Owner（重命名）
create policy conversations_update_owner on public.conversations
  for update using (created_by = auth.uid())
             with check (created_by = auth.uid());

-- <D> ❌ 业务层禁止（虽然不可达；管理员手清用 EF）
```



### 5.4 `conversation_members`



```sql
alter table public.conversation_members enable row level security;

-- <R> 同一 conv 的任一现成员
create policy members_read_same_conv on public.conversation_members
  for select using (
    exists (
      select 1 from public.conversation_members me
      where me.conversation_id = conversation_members.conversation_id
        and me.user_id = auth.uid()
        and me.left_at is null
    )
  );

-- <I> Owner 加朋友入群；或者邀请注册时 EF 代理
create policy members_insert_owner on public.conversation_members
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.created_by = auth.uid()
    )
    or auth.uid() = user_id    -- invite 自动拉自己（仅 EF 能更好地处理；UI 通常走 EF 服务端）
  );

-- <U> Owner 标 left_at 删除朋友；自己标 left_at 离开（v1.0 ❌ 未启用）
create policy members_update_owner on public.conversation_members
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.created_by = auth.uid()
    )
    or user_id = auth.uid()
  );

-- <D> ❌ 仅 service_role；业务不允许
```



### 5.5 `messages`



```sql
alter table public.messages enable row level security;

-- <R> 同一 conv 成员
create policy messages_read_member on public.messages
  for select using (
    exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id
        and m.user_id = auth.uid()
        and m.left_at is null
    )
  );

-- <I> sender 必须是自己 + 是 conv 成员
create policy messages_insert_self on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id
        and m.user_id = auth.uid()
        and m.left_at is null
    )
  );

-- <U> 仅 sender；列细分佢防御：
--       body            → trg_messages_edit_window 守 2 分钟编辑窗
--       deleted_by_sender_at → sender 任意时刻可 SET（本地隐藏，F-MSG-07）
--       其他列          → 列级 GRANT 不可设
revoke update on public.messages from authenticated;
grant update (body, deleted_by_sender_at) on public.messages to authenticated;

create policy messages_update_sender on public.messages
  for update using (sender_id = auth.uid())
             with check (sender_id = auth.uid());

-- <D> ❌ 业务层禁止物理 DELETE。SPEC AC.10：「仅自己端消失，朋友端仍可见」。
--    F-MSG-07 实现列级软隐藏 (deleted_by_sender_at, 上文)；其他朋友 UI 仍看原 row。
```



> **关键决策**：F-MSG-07（删除消息本地版）走 RLS 的 DELETE policy，物理删 row 而非 recalled_at 软标。这意味着 **删除是物理不可逆**。SPEC § 7 DR-05 已规定（参考 SPEC § 2.3 F-MSG-07："仅自己端消失，DB row 真删"）。

### 5.6 `attachments`



```sql
alter table public.attachments enable row level security;

-- <R> 通过 messages 反查：attachment 被引用到的消息所在 conv 的成员
create policy attachments_read_via_message on public.attachments
  for select using (
    exists (
      select 1
      from public.messages m
      join public.conversation_members cm
        on cm.conversation_id = m.conversation_id
      where m.attachment_id = attachments.id
        and cm.user_id = auth.uid()
        and cm.left_at is null
    )
  );

-- <I> 自己上传
create policy attachments_insert_self on public.attachments
  for insert with check (uploaded_by = auth.uid());

-- <U> ❌ 通常不允许修改 mime/size_bytes
-- <D> 自己上传的；或者随 messages cascade 删除
create policy attachments_delete_self on public.attachments
  for delete using (uploaded_by = auth.uid());
```



### 5.7 `reactions`



```sql
alter table public.reactions enable row level security;

-- <R> 同一 conv 成员
create policy reactions_read_member on public.reactions
  for select using (
    exists (
      select 1 from public.messages m
      join public.conversation_members cm
        on cm.conversation_id = m.conversation_id
      where m.id = reactions.message_id
        and cm.user_id = auth.uid()
        and cm.left_at is null
    )
  );

-- <I> 仅自己 + 消息所在 conv 是成员
create policy reactions_insert_self on public.reactions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      join public.conversation_members cm
        on cm.conversation_id = m.conversation_id
      where m.id = reactions.message_id
        and cm.user_id = auth.uid()
        and cm.left_at is null
    )
  );

-- <D> 仅自己（toggle 反悔）
create policy reactions_delete_self on public.reactions
  for delete using (user_id = auth.uid());
```



### 5.8 RLS 完整性总结（对照 SPEC AC.AC.rls）

| 表 | SELECT | INSERT | UPDATE | DELETE | 跨用户读测试 |
|---|---|---|---|---|---|
| profiles | ✅ | ✅ | ✅ self | ❌ | ❌ 应只见同 conv 之 members |
| invites | ✅ | ✅ owner | ✅ owner | ❌ | 只 owner 看 own |
| conversations | ✅ | ✅ owner | ✅ owner | ❌ | 只 members 看 |
| conversation_members | ✅ | ✅ owner | ✅ owner | ❌ | 只同 conv members |
| messages | ✅ | ✅ self | ✅ self | ✅ self | 同 conv 即可；非成员 → 0 行 |
| attachments | ✅ | ✅ self | ❌ | ✅ self | 跨用户应 0 行 |
| reactions | ✅ | ✅ self | ❌ | ✅ self | 同 conv 即可 |

**测试方式**（部署后 smoke test）：用普通 friend JWT 试着查其他 friend 的 conversations → 应 0 行（AC.AC.rls 通过）。

---

## 6. API 契约（API Contracts · SPEC § 8 全 25 CAP）

> 协议原则：
> - 业务表 CRUD **走 Supabase auto-generated REST**（`/rest/v1/<table>`）；RLS 自动鉴权。
> - 涉及 service_role（EF 内部）操作 → 走 `Edge Functions`（`/functions/v1/<name>`）。
> - 实时通道走 **Realtime WSS**（`wss://<project>.supabase.co/realtime/v1/websocket`）。
> - 所有 endpoint 走 HTTPS；WSS 走 JWT 鉴权（Realtime 已自动）。

### 6.1 REST Endpoints（Supabase auto-generated）

> 全表都自动支持 GET/POST/PATCH/DELETE；client 用 lib/api/* 封装。

| CAP | HTTP | Path | Body / Query | Response | RLS 守门 |
|---|---|---|---|---|---|
| CAP-02 | POST | `/auth/v1/token?grant_type=password` | `{ email, password }` | `{ access_token, refresh_token, user }` | — |
| CAP-06 | GET | `/rest/v1/messages?conversation_id=eq.<id>&order=created_at.desc&limit=50` | — | `Message[]` (倒序) | conv 成员 |
| CAP-09 | POST | `/rest/v1/messages` | `{ conversation_id, sender_id, body, reply_to_id?, client_msg_id? }` | `Message` | sender=self + conv 成员 |
| CAP-12 | PATCH | `/rest/v1/messages?id=eq.<id>` | `{ body }` | `Message` (with edited_at) | sender self + 2min 内（trigger 守） |
| CAP-13 | PATCH | `/rest/v1/messages?id=eq.<id>` | `{ recalled_at: "now()" }` | `Message` | sender self |
| CAP-14 | DELETE | `/rest/v1/messages?id=eq.<id>` | — | 204 | sender self（物理删；F-MSG-07） |
| CAP-15 | POST | `/rest/v1/reactions` | `{ message_id, user_id, emoji }` | `Reaction` | self + conv 成员 |
| CAP-15 | DELETE | `/rest/v1/reactions?message_id=eq.<id>&user_id=eq.<id>&emoji=eq.<x>` | — | 204 | self |
| CAP-16 | PATCH | `/rest/v1/profiles?id=eq.<self>` | `{ display_name }` | `Profile` | self |
| CAP-17 | POST | (Storage) `/storage/v1/object/avatars/<path>` | blob | `{ Key }` | self (RLS-bucket policy) |
| CAP-17 | PATCH | `/rest/v1/profiles?id=eq.<self>` | `{ avatar_url }` | `Profile` | self |
| (gallery) | GET | `/rest/v1/conversation_members?user_id=eq.<self>&left_at=is.null` | — | `Member[]` | 自己 |
| CAP-22 | GET | `/rest/v1/conversations?select=*,conversation_members(...)&order=-last_message_at` | (via view) | `Conv[]` | 仅 self members |
| CAP-23 | GET | `/rest/v1/conversation_members?conversation_id=eq.<id>&left_at=is.null` | — | `Member[]` | 同 conv members |
| CAP-21 | POST | `/rest/v1/rpc/fn_unread_counts` | `{}` (security invoker 取 auth.uid()) | `{conversation_id, count}[]` | 自己 |
| CAP-21b | POST | `/rest/v1/rpc/fn_mark_conversation_read` | `{ p_conv: '<uuid>' }` | 204 | 自己 (active member) |

> ⚠️ CAP-21 `unread_counts` 是 RPC function，**必须**依赖 `conversation_members.last_read_at` 游标：


```sql
-- 客户端在 conv 首屏 hydrate 完成后调一次（CAP-21b）
create or replace function fn_mark_conversation_read(p_conv uuid)
returns void language sql security invoker as $$
  update public.conversation_members
  set last_read_at = greatest(last_read_at, now())
  where conversation_id = p_conv
    and user_id = auth.uid()
    and left_at is null;
$$;

-- CAP-21: 计算 unread (messages.created_at > cm.last_read_at)
create or replace function fn_unread_counts(p_user uuid)
returns table(conversation_id uuid, count int)
language sql stable security invoker as $$
  select m.conversation_id, count(*)::int
  from public.messages m
  join public.conversation_members cm
    on cm.conversation_id = m.conversation_id
   and cm.user_id = p_user
   and cm.left_at is null
  where m.created_at > cm.last_read_at - interval '1 minute'  -- 防 self echo 漏标
  group by m.conversation_id;
$$;
```



> **客户端调用契约**：
> - 进入 conv → fetch messages → `POST /rest/v1/rpc/fn_mark_conversation_read`。
> - TanStack Query 缓存 `/rest/v1/rpc/fn_unread_counts` 30 秒 invalidation；
> - Realtime user channel 可推送增量； v1.0 简化依赖 30s poll + Realtime mute/ notification。

### 6.2 Edge Function Endpoints

| CAP | HTTP | Path | Body | 责任 |
|---|---|---|---|---|
| **CAP-01** | POST | `/functions/v1/admin-bootstrap` | (owner 注册时自动触发) | 写 profiles(role='owner') |
| **CAP-04** | POST | `/functions/v1/friend-signup` | `{ invite_token, email, password, display_name }` | 校验 invite → signUp → INSERT profiles(role='friend') → 1:1 conv 创建 → 标 invite.used_by | (强烈推荐合并 5.x 命名为 friend-signup) |
| **CAP-03** | POST | `/functions/v1/admin-create-invite` | `{ target_kind, target_conversation_id? }` | 生成 token + INSERT invites + 返回 URL |
| **CAP-19** | POST | `/functions/v1/admin-reset-password` | `{ friend_auth_id, new_password }` | supabase.auth.admin.updateUserById |
| **CAP-20** | POST | `/functions/v1/admin-delete-friend` | `{ friend_auth_id }` | 原子批量 UPDATE conversation_members SET left_at |
| **(内部)** | POST | `/functions/v1/cleanup-storage-orphans` | (cron key) | 扫 storage obj 不在 attachments → DELETE |

> **重要决策**：把 `CAP-01 / CAP-04` 都走 EF 而非 direct REST signUp，好处：
> 1. service_role key 用于 cross-table 操作（写 profiles + 创建 1:1 convo + 标 invite.used_by）
> 2. 单测点；UI 不直接走 Supabase Auth SDK
> 3. 方便日后加 captcha / 风控
> 缺点：延迟比 Auth SDK 多 100ms；可接受

### 6.3 Realtime WebSocket 事件



```ts
// 客户端订阅：
const channel = supabase.channel('conversation:<uuid>')
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.<uuid>` },
      (payload) => handleNewMessage(payload.new))
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.<uuid>` },
      (payload) => handleUpdateMessage(payload.new))   // edited / recalled
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'reactions',
        filter: `message_id=in.(${msgIds.join(',')})` },
      (payload) => handleReactionChange(payload))
  .subscribe();
```



| Channel | Event | Source | Purpose |
|---|---|---|---|
| `conversation:<id>` | `postgres_changes INSERT messages` | messages 新增 | 新消息气泡入场 (180ms) |
| `conversation:<id>` | `postgres_changes UPDATE messages` | edited + recalled | `(edited)` 微标记 / 「已撤回」占位 |
| `conversation:<id>` | `postgres_changes * reactions` | reaction toggle | 计数实时 |
| `presence:<id>` | `sync` / `join` / `leave` | realtime-presence | typing + 在场光点 |
| `user:<self.id>` | `postgres_changes INSERT conversation_members` | 新加入会话 | 侧栏实时新增 |
| `user:<self.id>` | `postgres_changes UPDATE invites.used_by` | 朋友接受 invite | admin 后台实时刷新 |
| `user:<self.id>` | `postgres_changes * profiles` WHERE id IN (friends) | 朋友改名/换头像 | 侧栏 + 历史消息署名同步 |

### 6.4 Authentication

| 阶段 | 机制 |
|---|---|
| 注册 | `signUp` → `supabase.auth.signUp({ email, password, options: { data: { role, display_name } } })` → EF 内 set metadata + 写 profiles |
| 会话 | JWT (默认 1h) + refresh token (30d)；存 HttpOnly Secure Cookie 通过 SSR proxy / Supabase 默认；FE 用 `@supabase/supabase-js` 自动 refresh |
| 邀请落地 | EF `friend-signup` 一站式 signUp + metadata + membership；返回 set-cookie |
| Logout | `supabase.auth.signOut()` → 清 localStorage + Dexie 中 sensitive columns |
| Password reset | ❌ 不存在；Friend 走 `admin-reset-password`；Owner 即使自删 = Nook 死（SPEC § 9.4 决定） |

---

## 7. 部署拓扑（Deployment Topology）

### 7.1 三层部署



```
              ┌─────────────────────────────────────┐
              │   Edge Layer: Cloudflare Pages     │
              │   - 静态 SPA (dist/)                │  Auto HTTPS · 全球 PoP · 无带宽
              │   - WRangler auto deploy            │  $0 / 永久
              │   - PR Preview URL: *.pages.dev     │
              └─────────────┬───────────────────────┘
                            │ HTTPS / WSS only
                            ▼
              ┌─────────────────────────────────────┐
              │   Application: Supabase Cloud       │
              │   - Postgres 15 (RLS)               │  Free tier $0
              │   - Realtime WS                     │
              │   - Auth (GoTrue)                   │
              │   - Storage + signed URL            │
              │   - Edge Functions (Deno)           │
              │   - pg_cron jobs                    │
              └─────────────┬───────────────────────┘
                            │ AWS internal
                            ▼
              ┌─────────────────────────────────────┐
              │   Backup Layer: Cloudflare R2       │
              │   - 10 GB / 1M ops / mo · $0        │  v1.0 inactive
              └─────────────────────────────────────┘
```



### 7.2 资源清单（v1.0 实际用量预测）

| 资源 | 限额（免费层） | v1.0 实际用量 | 何时爆 |
|---|---|---|---|
| CF Pages 带宽 | 无限 | < 5 GB/月（10 用户 SPA） | 永不 |
| CF R2 | 10 GB 存储 / 1M ops/月 | 0（v1.0 不启用） | 永不 |
| Supabase DB | 500 MB | 约 30 MB（15 messages × 4 conv × 30 days ~ 30 MB） | ~12 月 |
| Supabase Storage | 1 GB | ~600 MB（10 用户 × 80 MB/days × 累积） | **6–8 月最逼近** |
| Supabase 带宽 | 2 GB/月 | ~300 MB（10 用户 × 30 MB） | 不爆 |
| Supabase Edge Function 调用 | 500k/月 | < 1k/月（仅 admin + cleanup） | 永不 |
| Supabase Realtime 连接 | 200 并发 | ≤ 30（15 用户 × 2 设备） | 永不 |
| Sentry 错误 | 5k/月 | < 100/月 | 永不 |
| LogSnag 事件 | 1k/月 | < 300/月 | 不爆 |
| GitHub Actions | 2000 min/月 | ~50 min/月 | 不爆 |

**唯一警报**：Supabase Storage 6–8 月逼近。**v1.1 准备脚本**：30 天前附件迁到 R2，只留文字消息。但 v1.0 不实施。

### 7.3 部署顺序 / Bootstrap



```bash
# 1. Supabase Project Init
supabase init                                    # 生成 config.toml
supabase start                                   # 本地 dev (Docker)
supabase db push                                 # 应用 migrations/0001~0006

# 2. Edge Functions Deploy
supabase functions deploy admin-bootstrap        # 首次部署要设 SMTP / Site URL
supabase functions deploy friend-signup
supabase functions deploy admin-create-invite
supabase functions deploy admin-reset-password
supabase functions deploy admin-delete-friend
supabase functions deploy cleanup-storage-orphans

# 3. 手动 1-time: 写 Owner profile
# 调用 admin-bootstrap EF，把 first user.role 设 'owner'

# 4. Frontend Build & Deploy
npm ci
npm run typecheck
npm run lint
npm run test
npm run build                                   # Vite 输出 dist/
wrangler pages deploy dist --project-name=nook   # 部署到 CF Pages

# 5. 验证
# Playwright E2E：注册 → 发邀请 → 接受 → 1:1 → 30 天前日期注入 → 等 cron
```



### 7.4 环境矩阵

| Env | FE URL | BE Project | DB | Notes |
|---|---|---|---|---|
| local (dev) | `localhost:5173` | dockerized Supabase | local Postgres | 热重载 vite + supabase start |
| preview (CI) | `<PR>-<hash>.pages.dev` | preview branch in Supabase | separate DB | PR review 专用 |
| staging | `staging.nook.app` | separate Supabase project | separate DB | 内部朋友试用；接入 Sentry staging |
| production | `nook.app` 或 owner-specified 域 | production Supabase | free tier + 监控 | **正式域暂未定**（INTERVIEW Round-3 暂未决域）；待 user 提供 |

### 7.5 CI / CD 流水线



```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request: { branches: [main] }
  push:         { branches: [main] }
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run typecheck                        # tsc --noEmit
      - run: npm run lint                            # eslint + prettier
      - run: npm run test                            # vitest
      - run: npx supabase db push --db-url $SUPABASE_DB_URL_TEST
      - run: npm run test:e2e                        # Playwright headless

  deploy-prod:
    needs: verify
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: npx wrangler pages deploy dist --project-name=nook --branch=main
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      - run: npx supabase functions deploy --project-ref $SUPABASE_PROJECT_REF
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SB_ACCESS_TOKEN }}
```



### 7.6 DNS / Custom Domain（待 Stage 8 决策）
- 域：`nook.app` / 子域 `<owner>.nook.app`（待 Owner 决定）
- CF Pages 自动 Let's Encrypt
- 若用 supabase.co 子域 for API URL（默认有）

---

## 8. 安全架构（Security Architecture）

### 8.1 威胁模型（STRIDE-lite）

| Threat | 缓解层 |
|---|---|
| **Spoofing**: 伪造 friend 身份 | JWT (Supabase Auth) + RLS (auth.uid()) + Owner role double-check |
| **Tampering**: 改别人消息 | RLS UPDATE policy + `sender_id=auth.uid()` 守 |
| **Repudiation**: 用户否认发消息 | `messages.sender_id` + `created_at` (DB-authoritative timestamp) |
| **Information Disclosure**: 跨用户读到别人 conv | RLS 7 张表全覆盖 + AC.AC.rls 测试 |
| **Denial of Service**: 4 群被恶意加塞 | T-01 trigger + membership cap T-02 + DB unique |
| **Elevation of Privilege**: Friend 升 Owner | `profiles.role` 只允许 INSERT 时写入 + 不可 UPDATE（端外） |
| **R2 偷看**：附件 URL 公开 | Storage bucket RLS 仅允许 conv member + 短期签名 URL |

### 8.2 RLS 穿透测试（deploy 后 smoke）



```ts
// scripts/test-rls.ts
import { createClient } from '@supabase/supabase-js';

const friendClient = createClient(URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${FRIEND_JWT}` }}});

// 应 0 行
const { data, error } = await friendClient.from('messages')
  .select('*')
  .eq('conversation_id', OTHER_CONVERSATION_ID);

if ((data?.length ?? 0) > 0) throw new Error('RLS LEAK!');
```



### 8.3 Secret / Key 管理

| Secret | 存哪里 | 用法 |
|---|---|---|
| `SUPABASE_ANON_KEY` | CF Pages env (公开) + client | RLS 保护 |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ 永不进 client；仅 EF env | EF 内 service-action |
| `CF_API_TOKEN` (CI) | GitHub Actions secrets | wrangler deploy |
| `SB_ACCESS_TOKEN` (CI) | GitHub Actions secrets | supabase deploy |
| `LOG_SNAG_TOKEN` | client + Sentry env | 结构化事件 (FE) |
| `SENTRY_DSN` | client env (公开可读) | 错误 + perf |
| `INTER_FONTS_PATH` (`/fonts/...`) | 自托管于 CF Pages 或 R2 | 不走 Google CDN |
| INTER / JetBrains Mono WOFF2 自托管 | public/fonts/ | CF Pages 直接 server |

### 8.4 PII / 隐私红线

- ❌ 永不写 message body 到任何 log（Sentry / LogSnag / Supabase logs）
- ❌ Sentry 关 PII（默认）
- ❌ Email 不向其他 friend 显示（`profiles.email` 不存；查询走 `auth.users` 仅 EF）
- ❌ EXIF 完整 strip 客户端（`lib/storage/exif.ts`）
- ✅ Sentry 关 attachStacktrace
- ✅ LogSnag 仅含 `{ event, conversation_id_hash, kind, ts }` 结构

### 8.5 密码策略

| 角色 | 长度 | 复杂度 | 改密码路径 |
|---|---|---|---|
| Owner | ≥ 8 char | 无强制特殊字符 | register 页 / 自助 signUp |
| Friend | ≥ 8 char | 无强制特殊字符 | 仅 Owner admin reset（无邮件） |

**注**：v1.0 不强 complexity，仅长度。理由：单纯长度是 NIST 推荐（"complex rule-dominated" 反而降低强度）。v1.0 不上 zxcvbn。

---

## 9. 可观测性（Observability）

### 9.1 Log 结构

| 层 | 工具 | 字段格式 | 保留期 |
|---|---|---|---|
| 前端 console | browser DevTools | `[level] tag: msg` | 仅本地 |
| 前端远程事件 | **LogSnag free** | `{ event, conversation_id_hash, kind, ts, device }` | 30 天 |
| 后端（DB） | Supabase logs | 默认 Postgres logs | 7 天 |
| 后端（EF） | Supabase Edge Function logs | stream 出 stdout | 7 天 |
| 后端结构化 | 自写 `app_events` 表 | `{ kind, ts, idempotency_key, meta_jsonb }` | 90 天滚动 |

**绝对禁止**：message body / email / display_name 进任何 log。

### 9.2 监控（Monitoring）

| 维度 | 工具 | 触发 |
|---|---|---|
| 前端错误 | Sentry free | 任何 unhandled |
| 前端 perf LCP / FID | Sentry Performance | LCP > 2.5s 报警 |
| 后端异常 | Sentry (EF integration) | 任何 throw |
| 流量 / PoP 命中率 | Cloudflare Analytics | 总览 |
| DB 连接 / 慢 query | Supabase Dashboard 内置 | pg_stat_statements |
| Cron 失败 | pg_cron → application `cron_runs` 表 + LogSnag 事件 | J-01/02/03 失败 |

### 9.3 告警红线（Email-based · Supabase 内置）

| 触发 | 路径 |
|---|---|
| `pg_cron` job 失败 → `cron_runs.status='failed'` | EF 5min 内上报 |
| Sentry issue rate spike | Sentry 默认 |
| LogSnag 事件率 spike (>1.5k/m) | LogSnag 默认 |
| `cleanup_storage_orphans` 删除 > 1000/日 | EF 上报 LogSnag |

> 全部告警通过 service 内部邮箱 / webhook（v1.0 先 free path）。SMS / Slack v1.1+ 加入。

---

## 10. 离线 & 同步策略（Offline & Sync）

### 10.1 三层缓存（Hot → Warm → Cold）



```
Hot in-memory  : Zustand · 最近 100 条 messages + 1 个 active conv draft
Warm IndexedDB : Dexie · 最近 1000 条 messages + outbox + profile cache
Cold Postgres  : 服务端权威
```



### 10.2 Outbox 流程



```ts
// Dexie schema
db.outbox: {
  client_msg_id: uuid (PK),
  conversation_id: uuid,
  type: 'text' | 'image' | 'file',
  payload: { body?, attachment_blob?, attachment_meta? },
  state: 'pending' | 'sending' | 'delivered' | 'failed',
  created_at: timestamptz,
  attempts: int
}
```



**发送流程**：
1. 用户发 → 生成 `client_msg_id = uuidv4()`
2. Optimistic append to local state
3. INSERT `outbox[client_msg_id]` state='sending'
4. try INSERT `/rest/v1/messages` with same `client_msg_id`
5. onSuccess → state='delivered' + Realtime 广播涵盖
6. onError（断网 / 5xx）→ state='failed' → Workbox SW background sync enqueue
7. SW 网络回 → 逐条 replay → onSuccess → state='delivered'

### 10.3 Dedupe（去重）

- 服务端：`messages_client_msg_id_unique_idx (conversation_id, client_msg_id)` where not null
- 客户端：相同 `client_msg_id` 的 Realtime INSERT + 本地 optimistic → 按 id 取 server-issued id 替换 optimistic

> ⚠️ 同一 `client_msg_id` 在同一 conv 内唯一；不同 conv 不冲突。这处理了"用户在不同 conv 几乎同时发"的边界。

### 10.4 Realtime 断连重连

- `supabase-js` 自动 heartbeat + reconnect
- 网络断时：app 仍可浏览历史（IndexedDB）+ Composer 可输入（落 outbox）
- 重连 < 3s 完成（SPEC NF-PERF-04）
- 重连 后 IndexedDB 缓存 vs 服务端 reconcile by `created_at` window

---

## 11. 技术风险评审（6 维 · Risk Review）

> 风险等级 = 影响 high/low × 概率 high/low。RAG：🔴 / 🟡 / 🟢

### 11.1 功能 / 正确性风险

| 风险 | 影响 | 概率 | 等级 | 缓解 |
|---|---|---|---|---|
| 4 群硬上限被绕过（service_role 写入） | high | low | 🟡 | T-01 trigger + 端外 EF 守双层 |
| 8 成员被绕过 | high | low | 🟡 | T-02 trigger |
| 编辑超过 2 分钟被改 | high | low | 🟢 | T-03 trigger（updated_at 自动 check） |
| 已撤回状态被前端伪造（重渲染 "已撤回" → "原内容") | medium | low | 🟢 | recalled_at DB-authoritative；FE 仅渲染 inert 占位 |
| Offline outbox replay 顺序错乱 | medium | medium | 🟡 | Dexie 取 FIFO；server 用 `created_at` 重排 |
| Reaction emoji 超出 6 种被插入 | high | low | 🟢 | `reaction_emoji` enum + RLS 不允许 INSERT 未知值 |

### 11.2 性能风险

| 风险 | 影响 | 概率 | 等级 | 缓解 |
|---|---|---|---|---|
| 30 天消息清理慢 lock contention | medium | medium | 🟡 | pg_cron 03:00 低峰；分批 delete by 1k chunks |
| Realtime WS 200 连接爆 | medium | low | 🟢 | ≤ 30 连接（15 user × 2 dev）；离 200 远 |
| Storage 1GB 满 | high | medium | 🟡 | v1.1 脚本迁 R2；v1.0 仅监控 |
| 大文件 50MB 加裁慢 | medium | low | 🟢 | spec 已限 50MB；上传走直传 signed URL |
| LCP > 2.5s | medium | low | 🟢 | CF Pages 边缘 + 原生字体 + service worker |

### 11.3 安全风险

| 风险 | 影响 | 概率 | 等级 | 缓解 |
|---|---|---|---|---|
| RLS 配置漏接 | critical | low | 🟡 | 部署前 smoke test（§ 5.8）+ CI 集成 |
| SERVICE_ROLE_KEY 泄露到 client | critical | low | 🟢 | 仅 EF env；client 仅持有 ANON_KEY |
| Invite token 短到暴力枚举 | medium | low | 🟢 | 24-byte hex = 48 字符；不可枚举 |
| Avatar 上传 XSS（mime 错传） | medium | low | 🟢 | bucket policy + RA only image/* + EXIF strip |
| LogSnag 含敏感 | high | low | 🟢 | 端 DL：只哈希；显式 forbidden list |
| Friend 通过 invite 重注册恢复 friend 身份（旧 friend left_at 但新 friend 是新 user_id） | low | low | 🟢 | 设计如此（Round-1 Q4） |
| Sentry 默认 PII 开 | high | low | 🟢 | 部署确认 `sendDefaultPii: false` |

### 11.4 维护风险

| 风险 | 影响 | 概率 | 等级 | 缓解 |
|---|---|---|---|---|
| Supabase 不再提供 free tier | high | low | 🟡 | 见 § 12"升级 / 放弃阈值"；可迁 R2 + 自管 |
| React 升级破坏 | medium | medium | 🟡 | React 18 LTS 锁到 1.x；avoid canary features |
| pg_cron 服务挂（Supabase 内部故障） | medium | low | 🟡 | 30 天清理仅损失"超过 30 天的数据可能延后清理"；不致命 |
| Edge Functions Deno runtime 升级 breakage | medium | low | 🟢 | Deno 稳定；测试覆盖 |
| 多处依赖的"单厂商"风险（Supabase 挂了 = Nook 整体挂） | critical | low | 🟡 | § 12 决策：换厂商需重新设计；最坏情况 → 自管 Postgres + 自建 WS |

### 11.5 合规 / 隐私风险

| 风险 | 影响 | 概率 | 等级 | 缓解 |
|---|---|---|---|---|
| 大陆区访问失败 | medium | high | 🟡 | SPEC § 9.9 + § 7：自托管字体 + accept 延迟；不阻塞登录 |
| 无 Web Push（大陆 Chrome 无 FCM） | medium | high | 🟡 | SPEC § 1.7.2 已拒 push；改用应用内 unread + tab title |
| 数据导出（GDPR） | low | v1.0 不适用 | 🟢 | v1.1+ 加 export |
| Sentry 数据出境 | low | low | 🟢 | Sentry 关 PII；不存消息内容 |

### 11.6 时间 / 工期风险

| 风险 | 影响 | 概率 | 等级 | 缓解 |
|---|---|---|---|---|
| 8 周内 14 项选型全部落地 | high | medium | 🟡 | 分阶段 M1: Schema+Auth → M2: Chat → M3: Realtime → M4: EdgeCases+Polish |
| 自托管字体下载与嵌入 WOFF2 | low | low | 🟢 | 一次手工 |
| Playwright E2E 配置 (跨域 cookies) | medium | medium | 🟡 | Time-box 1 day；不强求全 E2E |

### 11.7 综合风险矩阵（RAG Heat Map）

| | Low Impact | Medium Impact | High Impact |
|---|---|---|---|
| **Low Probability** | 🟢 RLS 没漏·Token 长度够·Sentry 关 PII | 🟣 T-01/T-02 触发器 | 🟢 React / Deno 升级 |
| **Medium Probability** | 🟢 Deno runtime 升级 | 🟡 Outbox 顺序 / pg_cron lock / React 升级 / E2E 工期 | 🟡 **唯一大文件存储满 6–8 月** |
| **High Probability** | 🟢 | 🟡 大陆 compliance + 无 Web Push | 🟡 **Supabase 单厂商故障** |

**最关键 2 项**：① Supabase 6–8 月存储满（v1.1 准备迁 R2）；② Supabase 单厂商故障（v1.2+ 自管备选）。

---

## 12. SPEC ↔ Architecture 交叉索引（Cross-Reference）

> 验证：SPEC § 2 所有 F-ID 与 § 8 所有 CAP-ID 均被本文档某一节覆盖。

| SPEC ID | 主要架构模块 | 主要表 /endpoint |
|---|---|---|
| F-AUTH-01 | § 6.2 EF `admin-bootstrap` | profiles INSERT |
| F-AUTH-02 | § 6.4 Auth: `signInWithPassword` | — |
| F-AUTH-03 | § 6.2 EF `admin-create-invite` | invites INSERT |
| F-AUTH-04 | § 6.2 EF `admin-create-invite` (target=conversation) | invites INSERT |
| F-AUTH-05 | § 6.2 EF `friend-signup` | auth.users + profiles + conv |
| F-AUTH-06 | § 6.2 EF `friend-signup` 一步含 1:1 conv 创建 | conversations + members |
| F-AUTH-07 | § 6.2 EF `admin-reset-password` | auth.admin.updateUserById |
| F-AUTH-08 | § 6.1 REST PATCH `profiles.display_name` | profiles UPDATE |
| F-AUTH-09 | § 6.1 REST Storage `avatars/<path>` + profiles UPDATE | storage + profiles |
| F-AUTH-10 | § 3.1 i18next `localStorage` | localStorage 持久 |
| F-CONV-01 | § 6.1 GET `/rest/v1/conversation_members?left_at=is.null` | members + view fn |
| F-CONV-02 | § 4.3 T-01 trigger + § 6.2 EF | conversations INSERT 4-cap |
| F-CONV-03 | § 6.1 GET `/rest/v1/messages?limit=50` + Realtime | messages |
| F-CONV-04 | § 6.1 PATCH `conversations` (owner only) | RLS UPDATE policy |
| F-CONV-05 | § 4.3 T-02 trigger + EF | members 8-cap |
| F-MSG-01 | § 6.1 POST `/rest/v1/messages` + § 4.2 client_msg_id | messages |
| F-MSG-02 | § 3.1 compressor.ts + § 6.1 Storage + POST messages | attachments + messages |
| F-MSG-03 | § 6.1 Storage + POST messages | attachments |
| F-MSG-04 | § 6.1 POST messages(reply_to_id) | messages |
| F-MSG-05 | § 4.3 T-03 trigger + PATCH messages | messages.edited_at |
| F-MSG-06 | § 6.1 PATCH messages.recalled_at | messages |
| F-MSG-07 | § 6.1 PATCH messages.deleted_by_sender_at | 列级 GRANT + RLS UPDATE sender（不动 row） |
| F-MSG-08 | § 6.3 Realtime Presence.publish({typing:true}) | presence channel |
| F-MSG-09 | § 6.1 POST/DELETE reactions | reactions |
| F-MSG-10 | § 4.5 pg_cron J-01 | messages + attachments DELETE |
| F-MSG-11 | § 6.1 RPC fn_unread_counts + § 4.2 last_read_at 游标 | 函数 + cm.last_read_at |
| F-MEDIA-01 | § 10 Outbox + client_msg_id | outbox table |
| F-ST-01 | § 6.3 Realtime presence | presence channel |
| F-ST-02 | § 6.3 Realtime user channel + document.title 监听 | tab API |
| F-ST-03 | CSS `:root { color-scheme: dark }` | styles |
| F-NOTIF-01 | 应用内 ListItem Trailing + § 6.3 unread_counts | UI + RPC |
| F-NOTIF-02 | § 10.4 PWA 重连 reconcile | § 10 |
| F-NOTIF-03 | SECTION § 6.4 / § 7 / § 11 — ❌ 不放 Web Push（SPEC § 2.6 强禁） | n/a |
| F-SEC-01 | § 5 profiles RLS + UI 不暴露 email | RLS |
| F-SEC-02 | § 4.5 J-02 cron + § 4.2 invite constraints | invites |
| F-SEC-03 | § 5 7 表 RLS | 全局 RLS |
| F-SEC-04 | § 6.2 § 3.4 EF | 服务端 |
| F-SEC-05 | § 3.1 guards.tsx | client `<RequireAuth>` |
| F-SEC-06 | § 6.2 EF `admin-delete-friend` | members UPDATE |
| F-UI-01 | § 3.1 + § 2.2 Tailwind 断点 | 4 breakpoint |
| F-UI-02 | DCSS min-w/h 44px | 全局 |
| F-UI-03 | @media reduced-motion | CSS |
| F-UI-04 | manifest + Workbox | § 2.2 |
| F-UI-05 | public/fonts/ 自托管 | § 8.3 |
| F-I18N-01 ~ 03 | § 3.1 i18next + locales 双语 | § 1.7 R-1 |

**覆盖率：本架构覆盖 SPEC § 2 全部 F-ID（41 项）+ § 8 全部 CAP（25 项）+ § 7 全部 DR（11 项）。**

---

## 13. 实施迁移 / Bootstrap 序列

### 13.1 DB Migrations（按序应用）

1. `0001_init.sql`：9 张表 + sequences + types
2. `0002_rls.sql`：7 张表 RLS + 全部 policy（第 5 章穷举）
3. `0003_triggers.sql`：T-01 / T-02 / T-03
4. `0004_pg_cron.sql`：J-01 / J-02 / J-03
5. `0005_storage.sql`：`avatars` / `attachments` bucket + RLS
6. `0006_seed.sql`：空（无 demo data）

### 13.2 Edge Functions（按序部署）

1. `admin-bootstrap`（健康检查）
2. `friend-signup`（CAP-04 + 自动 1:1 conv）
3. `admin-create-invite`（CAP-03）
4. `admin-reset-password`（CAP-19）
5. `admin-delete-friend`（CAP-20）
6. `cleanup-storage-orphans`（内部 cron-trigger）

### 13.3 Frontend 阶段交付顺序

| Stage | 重点 |
|---|---|
| M1: Foundation | 路由 + 4 原子组件 + i18n + dark theme + Tailwind tokens 注入 |
| M2: Auth Flow | welcome / register / login / invite landing / friend-signup EF |
| M3: Chat Core | home (sidebar + composer) + messages REST + Realtime |
| M4: Realtime Polish | Presence typing / reaction emoji / edit (2min) / recall |
| M5: Edge Cases | outbox / SW bg sync / 5MB avatar / 50MB file upload / outbox commit |
| M6: Admin | settings/admin + admin-* EF + `confirm` modal |
| M7: Polish & A11y | reduced-motion / focus-visible / 4 breakpoints / Lighthouse |

### 13.4 关键 Acceptance 验证（与 SPEC AC 对齐）

| AC | Stage | 测试 |
|---|---|---|
| AC.AC.rls | M3 + M5 | § 5.8 smoke + Playwright 测 |
| AC.15 TTL | M5 | 手动将某 msg 的 created_at 改 -31 天，等次日 03:00 |
| AC.AC.fonts | M7 | DevTools 网络面板：无 Google request· |
| AC.AC.motion | M7 | 浏览器偏好 reduced-motion |
| AC.AC.perf LCP ≤ 1.5s | M7 | Lighthouse CI |
| AC.AC.i18n | M1 | Playwright 切 zh-CN / en |
| AC.AC.dark | M1 | 全路由 dark only |
| AC.18 delete confirm | M6 | E2E |

---

## 14. Stage 7 · Definition of Done

- [x] 数据模型（9 表 + 7 表 RLS 全 policy）完整设计
- [x] 模块划分（FE / BE / Realtime / Shared）明列
- [x] API 契约（REST 14 个 + EF 6 个 + WS 7 个事件 schema）穷举 SPEC § 8 CAP
- [x] 部署拓扑（3 层 + 资源清单 + 9 环境矩阵 + CI/CD）确定
- [x] 安全架构（STRIDE-lite + secret + PII 红线 + 密码策略 + RLS 测试）确定
- [x] 可观测性（4 层日志 + 监控 + 告警红线）确定
- [x] 离线 & 同步（3 层缓存 + outbox + dedupe）确定
- [x] 6 维技术风险 + 风险矩阵
- [x] SPEC ↔ Architecture F-ID/CAP 完整交叉索引
- [x] 实施迁移 / Bootstrap / 分阶段交付
- [x] Stage 6 FU-1（Web Push）已删除
- [x] Stage 6 FU-2（i18n 三语→双语）已裁决同步
- [x] Stage 6 FU-3（active friend 重邀请）依靠 RLS + auth.uid() 自然规则
- [x] Stage 6 FU-4（Owner 自删孤儿态）走 § 6.2 EF `friend-signup` 自动 fallback

---

## 15. 架构决策记录（ADR-lite）

> 当后续有"我想换 X"的提议，对照这张表。

| 决策 | 答案 | 替换阈值 |
|---|---|---|
| 后端 = Supabase 一体 | ✅ | 朋友 > 30 或 storage 1GB+ → 评估 |
| DB = Postgres + RLS | ✅ | 不换 |
| 实时 = Supabase Realtime | ✅ | 并发 ≈100 → Pro |
| 认证 = Supabase Auth | ✅ | v1.1 加 passkey |
| 文件 = Storage 主 / R2 备 | ✅ | Storage 满 → 迁 R2 |
| i18n = 双语（zh-CN + en） | ✅ v1.0 | 加 ja-JP → v1.1+ |
| 客户端态 = Zustand | ✅ | 不换 |
| 服务端态 = TanStack Query v5 | ✅ | 不换 |
| 缓存 = Dexie | ✅ | 不换 |
| 图片压缩 = 客户端 canvas + WebP | ✅ | 不换 |
| 部署 = CF Pages + Supabase | ✅ | 不换 |
| CI = GitHub Actions | ✅ | 不换 |
| 日志 = LogSnag + Supabase | ✅ | > 1k/月 → 简化 |
| 监控 = Sentry | ✅ | 不换 |
| 字体来源 = 自托管 WOFF2 | ✅ | 永远 |
| 推送 = 应用内 unread | ✅ (无 Web Push) | 不换 |
| Outbox / Dedup = Dexie + client_msg_id | ✅ | 不换 |
| Friend 删除 = `admin-delete-friend` EF + 原子 | ✅ | 不换 |
| 4 群 / 8 成员硬上限 = trigger + UI 双重 | ✅ | 不换（产品定位） |
| 30 天 TTL 包含已撤回 = 决策（不特殊处理） | ✅ | v1.1+ 重新考虑 |

---

## 16. Status

> ❌ **Code Development 尚未开始**
> ✅ **Stage 7 · Architecture Design 完成**
> ⏸️ **等待 Project Lead 显式确认进入 Stage 8 · Code Development（M1 Foundation）**

---

*End of Nook Architecture Design v1.0 — 2026-06-27 · Stage 7 · Frozen*
