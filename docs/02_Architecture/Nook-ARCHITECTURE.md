# Nook · 技术架构 v1.0

> 在 `../01_Product/Nook-DESIGN.md`（视觉）+ `../01_Product/Nook-PRODUCT.md`（产品边界）已经锁定的前提下，给出完整的运行架构。
> **目标**：`整个项目永久免费部署` + `维护成本最低`。
> **范围**：覆盖前端框架 / 后端框架 / 数据库 / 实时通信 / 认证 / 对象存储 / 国际化 / 状态管理 / 消息缓存 / 图片压缩 / 部署平台 / CI/CD / 日志方案 / 监控方案，这 14 项。
> **不写代码**，仅做架构与选型裁决。

---

## 0. 总原则（三条不可松动）

| 原则 | 含义 | 在选型中的体现 |
|---|---|---|
| **永久免费 > 过度设计** | 不为"将来扩展"花一分钱或一小时 | 不上 K8s / 不上 GraphQL / 不上微服务 |
| **维护成本 = 0 是设计目标，不是终极状态** | 选最少"持续人工成本"的服务组合；少一份 dashboard 是一份 | 单厂商尽可能包揽 auth / db / realtime / storage |
| **隐形可靠 > 显性创新** | 用"成熟、用了 5 年的方案"，拒绝尝鲜 | 不追逐新框架；不自我感动 |

任何一项选型如果不满足以上 3 条，**砍**。

---

## 1. 总体架构（一段话图）



```
                        ┌─────────────────────────────────────┐
                        │   Cloudflare Pages (免费·永久)     │
                        │   全球边缘 CDN · 无带宽上限        │
   Users (PC / Mobile)  │   React 18 + Vite + TypeScript      │   ← 你的 SPA
   ─────────────────────▶   PWA · Service Worker · IndexedDB │
                        │   Tailwind v3 · Radix Primitives   │
                        └─────────┬───────────────────────────┘
                                  │ HTTPS / WSS
                                  ▼
                        ┌─────────────────────────────────────┐
                        │   Supabase (免费层)                 │
                        │   ┌──────────┐ ┌─────────┐ ┌──────┐ │
                        │   │ Postgres │ │ Realtime│ │ Auth │ │
                        │   │  (RLS)   │ │ (WS)    │ │ JWT  │ │
                        │   └──────────┘ └─────────┘ └──────┘ │
                        │   ┌────────────────────────────────┐│
                        │   │ Storage (文件 / 图片)         ││
                        │   └────────────────────────────────┘│
                        │   ┌────────────────────────────────┐│
                        │   │ Edge Functions (Deno)         ││
                        │   │ (阅后即焚 / Web Push 触发)      ││
                        │   └────────────────────────────────┘│
                        └─────────────────────────────────────┘
                                  │
                                  ▼
                        ┌─────────────────────────────────────┐
                        │   Cloudflare R2 (兜底大文件 · 免费)│
                        │   10 GB 存储 / 1M 操作/月           │
                        └─────────────────────────────────────┘
```



**主策略 = "Supabase 中心 + Cloudflare 边"**：
- **Supabase** 担任"auth + db + realtime + storage + edge"的 4-in-1 角色 → 单一 dashboard、单一 RBAC、单一文档。这是"最低维护成本"的本质来源。
- **Cloudflare Pages** 担任"前端 CDN"角色 → 无限带宽、全球边缘、自动 HTTPS、永久免费层。
- **Cloudflare R2** 作为可选"超容量对象存储"备用（Supabase Storage 满了之后丢到这里）。

**为什么不是 Cloudflare 单一栈**：CF DO + D1 + Workers 能做 chat，但需要手写 auth、手写 realtime 协议、手写 RLS。维护成本反而比 Supabase 高一个数量级。Supabase 用现成的 RLS（行级安全）替你做了 90% 的访问控制。

**为什么不是 Vercel + Serverless 多厂商**：多供应商意味着多 dashboard、多 serverless 限速、多上下文切换。Supabase + CF Pages 两家足够。

---

## 2. 14 项选型裁决（每项"选什么 + 为什么 + 为什么不是 X"）

### 2.1 前端框架 → **React 18 + Vite + TypeScript + React Router**

| 项 | 选择 | 备选 | 裁决理由 |
|---|---|---|---|
| UI 库 | **React 18** | Solid / Preact / Svelte / Vue | React 在 chat 场景生态最成熟（键盘事件、表单、移动适配都有最佳实践）。Supabase JS SDK 优先适配 React。 |
| 构建工具 | **Vite 5** | Next.js / Astro / Remix | Next.js 强制 SSR，但 Nook 是高度交互的 chat SPA，不需要 SSR；Vite SPA 部署到 Cloudflare Pages 更轻。 |
| 语言 | **TypeScript** | JavaScript | SSE / Realtime 协议、消息附件的 schema 极易出错；TS 把这些错误推到编译期。 |
| 路由 | **React Router v6** | TanStack Router | TanStack Router 更"现代"但生态仍在追赶；React Router 兼容性最好，文档多。 |
| Hydration 策略 | **纯 SPA + PWA** | SSR / SSG / ISR | 无 SEO 价值（需要登录态），SSR 只加复杂度。 |

**不选 Next.js 的具体原因**：Next.js 的 App Router 适合复杂页面聚合，chat 是单一深度交互页，Vite SPA 在 dev 启动时间、HMR 速度、产物体积都更好。

---

### 2.2 后端框架 → **Supabase + Edge Functions (Deno)**

**不是传统后端框架**（如 Express / NestJS / FastAPI / Spring / Rails）。Supabase = 后端即服务（BaaS），把"auth / db / realtime / storage / scheduled jobs"打包给你。维护成本最低。

| 子能力 | 用什么 | 为什么 |
|---|---|---|
| 数据库 | **Postgres 15** | ACID、行级安全（RLS）、关系查询是 chat 的天然结构 |
| Auth | **Supabase Auth (GoTrue)** | 自带 JWT、magic-link、refresh token，与 RLS 原生集成 |
| Realtime | **Supabase Realtime** | Postgres logical replication 推到 WebSocket，零自写 |
| 文件 | **Supabase Storage** | 直传 + 签名 URL，与 RLS 集成 |
| 调度 | **pg_cron + Edge Functions** | 阅后即焚、定时清理、定时统计，不需 K8s cron |
| 推送触发 | ❌ 不需要 | SPEC § 1.7.2 + § 2.6 F-NOTIF-03 强禁 Web Push；v1.0 仅应用内未读小红点 + Tab title。 |

**Edge Functions 用 Deno 运行时**：不需装 Node / 不需 Dockerfile，Supabase 直接给你部署 URL。Deno 标准化后 TS 性能逼近 Go。

**不选 Firebase**：Firestore 是 NoSQL，社交查询 / 关系映射硬伤。**不选 Pocketbase**：单台服务器，自托管会重启就崩。

---

### 2.3 数据库 → **Supabase Postgres 15**

| 项 | 说明 |
|---|---|
| 类型 | 关系型 |
| 版本 | Postgres 15 |
| 免费限额 | 500 MB 数据库、2 GB 带宽/月、足够 6–12 个月的 chat 数据 |
| 关键能力 | **Row Level Security (RLS)** ← 这一个就值回票价 |
| 索引策略 | `messages(conversation_id, created_at desc)`, `conversation_members(user_id)` 等 |

**为什么不是 SQLite / D1**：chat 本质是多对多关系（用户 × 会话 × 消息 × 附件），SQLite 没有原生多端写入冲突解决，CF D1 写入限速严格（5 GB/day 写入额）。Postgres 是 chat 的**天然**选择。

**为什么不是 MongoDB / DynamoDB**：消息对话本质是"按 conversation_id 顺序取 50 条"这种**索引化读**，关系型强过文档型。

**为什么不是 Neon / PlanetScale**：同样是 Postgres，但 Neon 单独算存储、Planetscale 在 2023 年底改了免费政策。Supabase 是 Postgres + Realtime 一体，省去"再加一个连接器"。

**关键设计：RLS 而非"应用层鉴权"**：


```sql
-- 例：只允许"会话成员"读 messages
create policy "Members read messages" on messages
  for select using (
    conversation_id in (
      select conversation_id from conversation_members
      where user_id = auth.uid()
    )
  );
```


把授权逻辑放在数据库层，前端 JS 一行都不写鉴权，黑客就算绕过前端也读不到不该读的列。

---

### 2.4 实时通信 → **Supabase Realtime（基于 Postgres 逻辑复制）**

| 维度 | 内容 |
|---|---|
| 协议 | WebSocket（WSS） |
| 触发源 | Postgres logical replication（`wal2json`），插入消息自动推送 |
| 限额（免费层） | 200 并发连接、2M 消息/月 |
| 我们的用量 | 15 个用户 × 平均 2 个设备 = 30 并发 × 日均 60 条消息 = 1800/月 << 2M 限 |

**为什么不用 Pusher / Ably**：Supabase Realtime 已含在套餐里；外加 Pusher 就要多一份 vendor、key、监控。

**为什么不用长轮询 / SSE**：长轮询延迟 > 1s，破坏 Typing 体验；SSE 单向，typing/已读是双向场景不合适。

**为什么不用 Cloudflare Durable Objects 自己写**：DOs 的 WebSocket Hibernation API 学习曲线陡；对于 30 个连接的场景，"自建" 维护成本远大于"用现成"。

**为什么不用 Socket.IO**：要自托管 Node 进程，免费层找不到永远在线的服务，与 Supabase 的免费层不匹配。

**关键技术点**：Typing 三点动效用 **Supabase Realtime Presence**（不写库，纯内存广播），零存储成本。

---

### 2.5 认证方案 → **Supabase Auth + 自建 invite-token + WebAuthn (v1.1)**

| 层 | 用什么 | 说明 |
|---|---|---|
| 用户体系 | Supabase Auth (JWT) | 默认用 email + password，朋友层拉一次就够 |
| 入门票据 | **invite token（一次性）** | 新朋友通过 `https://nook.app/invite/<token>` 一次性链接注册；24 h 过期，使用即焚 |
| 会话态 | HttpOnly Secure Cookie 内的 JWT | 防 XSS 偷 token |
| 多设备 | 同账号多端实时同步 | JWT refresh token 走 Supabase 默认流程 |
| **v1.1** 升级 | WebAuthn (Passkey) | 朋友群都是技术向，passkey 完美匹配"科技感" |

**为什么不只用 magic-link**：magic-link 在中国大陆邮箱（QQ 邮箱、Outlook、Gmail）有送达波动，遇到垃圾箱会让朋友第一次就进不来。**E-mail + password + invite-token 三件套**比 magic-link 更稳。

**不发明轮子**：Auth 永远不要自写（哈希、salt、JWT 签发）。Supabase 的 GoTrue 已经是生产级的。

**为什么不接第三方 OAuth（Google / GitHub）**：朋友里可能有人没 GitHub 账号；为了进入 Nook 多走一个第三方登录是干扰。**邀请制是入口唯一性**，不能被 OAuth 稀释。

---

### 2.6 对象存储 → **Supabase Storage（主） + Cloudflare R2（兜底）**

| 阶段 | 存哪里 | 大小限制 |
|---|---|---|
| 普通图片 / 文件 ≤ 50 MB | Supabase Storage | 默认 50 MB 单文件 |
| 大文件 > 50 MB | **Cloudflare R2** | 10 GB 永久免费，每 GB 仅 outbound 收 $0.015 |
| 数据在哪 | `attachments.storage_path` 字段记录 | RLS 锁定只允许 conversation 成员读 |

**为什么不是纯 AWS S3**：S3 free tier 12 个月过期；R2 没有 egress 费用（重要的免费条件）。

**为什么不是 Imgur / Cloudinary**：图床第三方不可控，文件 3 年后可能被删；自托管 = 隐私可控。

**关键决策**：**先全部走 Supabase Storage，超过 R2 再迁**。这是 v1 阶段的简化。生产环境再扩容。

---

### 2.7 国际化（i18n）→ **react-i18next + i18next + ICU MessageFormat**

| Token | 内容 |
|---|---|
| 语言 | **zh-CN + en**（v1.0 双语，与 SPEC § 1.8 / INTERVIEW § 2.9 I18N-1 对齐；ja-JP 在 v1.1+ 返反馈后加） |
| 框架 | react-i18next |
| 格式 | ICU MessageFormat（支持复数、变量） |
| 持久化 | localStorage 记住语言选择 |
| 否定式 default | 浏览器语言 → zh-CN |

**为什么不是 next-intl**：我们不上 Next.js。
**为什么不是在 URL 里加 `/zh/` 前缀**：纯 SPA 用 URL prefix 反而绕。
**为什么不内置中英文硬切换按钮**：v1.0 直接跟随浏览器，需要时再加；少一个 UI 元素。

> 仅"消息正文"不做翻译（用户输入什么就是什么）。

---

### 2.8 状态管理 → **Zustand（客户端态） + TanStack Query v5（服务端态）**

| 层 | 工具 | 用途 | 不选原因 |
|---|---|---|---|
| Client state（UI/会话） | **Zustand** | 当前会话 ID、draft、composer 状态、当前在线朋友 | Redux 模板太重；Jotai 也行但 Zustand 心智更简单 |
| Server state（远程数据） | **TanStack Query v5** | 消息列表、好友列表、邀请列表、查询缓存、失效 | 写手写 `useEffect + setState` 是 chat 大忌（revalidate、双端一致性、垃圾回收全错）。SWR 也不错但 TanStack Query 调试工具更好 |
| Realtime state | **Supabase Realtime subscription** + Zustand mirror | typing / online status / 新消息推送 | 不需要额外的 Redux / MobX |
| Form state | **React Hook Form + Zod** | 注册、登录、设置 | Zod 顺便给所有 API 边界做运行时校验 |

**为什么不选 Redux Toolkit**：15 朋友产品就上一套切片 + thunk + selector 是过度工程。
**为什么不全部塞 Context**：任何稍复杂的 chat 都会触发 Context"反复 hydrate"问题。

---

### 2.9 消息缓存 → **IndexedDB（Dexie 封装）+ 后端 Postgres 兜底 + Service Worker（Workbox）**

分三层：



```
Hot in-memory:    最近 100 条消息（Zustand 内存）
                  ↓ evict 触发
Warm IndexedDB:   最近 1000 条（按 conversation_id 切片，Dexie）
                  ↓ 用户打开会话时 hydrate
Cold server:      Supabase Postgres，永远权威
```



1. **进入会话时**：TanStack Query → Postgres 拉最近 50 条 → Zustand hydration；Realtime 推新消息直接 append。
2. **滑动到顶分页**：TanStack Query → Postgres 拉更早的 50 条 → IndexedDB 缓存。
3. **离线 / 网络差**：Service Worker 拦截 → 直接读 IndexedDB。
4. **断网时发消息**：放 IndexedDB outbox 队列 → 网络回来后批量 sync。

**为什么不是 localStorage**：5 MB 限制，且同步阻塞主线程，chat 这种"小写多"场景会卡。
**为什么不上 Redis**：免费层难找永久免费的，Supabase 自带 Realtime 干这事。

**为什么 IndexedDB 不用 raw API**：Dexie 的 schema 版本管理 / 索引 / 事务比裸 IDB 简单 10 倍。体量 ~10 KB。

---

### 2.10 图片压缩 → **客户端 canvas + `createImageBitmap`**

在上传**前**完成压缩，**不让服务端压缩**。



```ts
// 逻辑：客户端读 File → bitmap → canvas 缩放到 2560×2560/1080 → toBlob(0.78) → upload
```



| 参数 | 值 | 理由 |
|---|---|---|
| 上限宽边 | 2560 px | 2K 显示器够，朋友发原图不需要 4K |
| 上限高边 | 2560 px | 手机长图（截图、聊天记录）防爆 |
| 输出格式 | WebP（fallback JPEG） | 体积 -30% 同质量 |
| 质量参数 | q=0.78 | File size 大概 200-400 KB |
| WebP 不可用 | 回落 JPEG（q=0.85） | Safari < 14 兼容 |

**为什么不用 Sharp / Imagemin 在服务端**：服务端免费层 CPU 时间宝贵；带宽出口也是钱。
**为什么不用 Cloudflare Images**：CF Images 部分免费，但要商业计划才送 Cloudflare Images。

**大小兜底**：压缩后仍 > 2 MB 强制 `q=0.6` 二压。

---

### 2.11 部署平台 → **Cloudflare Pages（前端）+ Supabase Cloud（后端）**

| 服务 | 部署目标 | 永久免费额度 |
|---|---|---|
| 前端（React SPA） | Cloudflare Pages | **无带宽上限**、无网站数限制 |
| 后端（Postgres + Auth + Realtime + Storage） | Supabase Cloud | 500 MB DB、1 GB Storage、2 GB 带宽/月、5 GB Edge Function |
| 大文件兜底 | Cloudflare R2 | 10 GB Storage、1M 操作/月 |

**为什么不是 Vercel**：Vercel 商业计划对 Serverless 收费紧；Hobby 计划对 Edge Middlware 调用次数限额严格。
**为什么不自建 VPS（搬瓦工 / CloudCone）**：Flys 永久免费但不可控；自建 VPS 维护 = 维护成本高。
**为什么不用 Netlify**：Netlify Functions 限严重（125k req/月），且 Functions 冷启动严重。

**Cloudflare Pages 福利**：
- 自动 HTTPS（universal SSL）
- 全球边缘（300+ PoP）
- 自动 Git 集成（push 触发部署）
- 预览部署（PR 自动生成 *.pages.dev URL）

---

### 2.12 CI/CD → **GitHub Actions**



```yaml
# 工作流（伪代码）
on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    - npm ci
    - npm run typecheck   # tsc --noEmit
    - npm run lint        # eslint
    - npm run test        # vitest
  deploy:
    if: branch == main
    - npx wrangler pages deploy dist/
```



| 步骤 | 工具 | 触发 |
|---|---|---|
| 类型检查 | TypeScript `tsc --noEmit` | 每个 PR |
| Lint | ESLint v9 + Prettier | 每个 PR |
| 单元测试 | Vitest | 每个 PR |
| E2E（v1.1+） | Playwright | 手动触发 |
| 部署前端 | `wrangler pages deploy` | push 到 main |
| 部署 Edge Functions | `supabase functions deploy` | 手动（变化频次低） |
| 部署 DB migration | `supabase db push` | 手动（schema 变更是大事件） |

**免费额度**：GitHub Actions 在 private repo 免费 2000 分钟/月，足够 5 分钟以内 CI。

**为什么不直接用 Cloudflare Pages Git Integration**：它能做"自动部署"，但**不做 lint/typecheck**。我们的策略是 PR 合并前必须过测试，部署只是结果。

---

### 2.13 日志方案 → **console + LogSnag（远程事件）+ Supabase logs（后端）**

| 层 | 工具 | 保留期 | 隐私 |
|---|---|---|---|
| 前端 console | 浏览器 DevTools | 仅本地 | — |
| 前端远程事件 | **LogSnag 免费层**（1k 事件/月） | 30 天 | 不含消息内容，只含结构化事件 |
| 后端 | Supabase Logs (pg + functions) | 默认 7 天 | Supabase 自带 |
| 后端结构化 | Supabase 表 `app_events` | 自定 | 3–6 个月滚动 |

**前端事件类型（结构化、不含内容）**：


```jsonc
{
  "event": "message_sent",
  "conversation_id_hash": "xxx", // 哈希，不是明文
  "kind": "text",
  "ts": 1234567890
}
```



**为什么不是 Datadog / CloudWatch**：贵，且与我们的"低维护"原则违背。
**为什么不是 ELK / Loki**：10 个朋友的产品上 ELK 性价比为零。
**为什么不用 Sentry 当日志**：Sentry 是异常监控，不是事件流；混用语义不清。

**红线**：**绝不写消息内容到日志**。日志只能含 id / hash / 类别。

---

### 2.14 监控方案 → **Sentry 免费层 + Cloudflare Analytics + Supabase 监控**

| 维度 | 工具 | 免费额度 |
|---|---|---|
| 前端错误 | **Sentry 免费层** | 5k 错误/月、5k 性能 trace/月 |
| 前端性能 | Sentry Performance | 同上（trace） |
| 后端异常 | Sentry (Cloudflare Workers 集成) | 同上 |
| 流量 | Cloudflare Analytics | 永久免费 |
| 后端健康 | Supabase Dashboard | 永久免费 |

**Sentry 配置红线**：
- 关 Sentry Default PII（个人身份信息）。
- 消息内容不入 Sentry。
- attachStacktrace 默认关。
- 在 dev / preview 环境关 Sentry。

**为什么不是 Uptime Robot**：免费层有，但是写"我的 Nook 当下是否在线"的需求没有。一个人 + 几个朋友，你手机的浏览器已经能告诉你 Nook 是否在线。

---

## 3. 数据模型（Postgres Schema 概览）

> v1.0 最小化字段，schema 由 supabase/migrations/0001_init.sql 单独定义。



```sql
-- 1. users（与 auth.users 1:1）
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. invites
create table public.invites (
  token text primary key default encode(gen_random_bytes(24), 'hex'),
  created_by uuid references public.users(id) not null,
  conversation_id uuid,  -- 可选，绑定到某一群
  expires_at timestamptz not null default (now() + '24 hours'),
  used_by uuid,
  used_at timestamptz
);

-- 3. conversations
create type conversation_kind as enum ('one_to_one', 'group');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind conversation_kind not null,
  name text,                       -- 群名；1:1 为 null
  created_by uuid not null references public.users(id),
  created_at timestamptz default now()
);

-- 4. conversation_members
create table public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- 5. messages
create type message_kind as enum ('text', 'image', 'file');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  kind message_kind not null default 'text',
  body text,                       -- 文本消息正文
  attachment_id uuid,              -- 见 attachments 表
  reply_to_id uuid references public.messages(id),  -- 引用
  edited_at timestamptz,
  recalled_at timestamptz,         -- 软撤回
  created_at timestamptz default now(),
  -- 消息 30 天后由 pg_cron 自动清理
);

create index messages_conv_created_idx on public.messages(conversation_id, created_at desc);

-- 6. attachments
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  mime text not null,
  size_bytes bigint not null,
  width int, height int,
  original_name text,
  created_at timestamptz default now()
);

-- 7. reactions（仅限 6 个原始 emoji；后端枚举约束）
create type reaction_emoji as enum ('👍','❤️','😂','👀','🔥','🙏');

create table public.reactions (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  emoji reaction_emoji not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id, emoji)
);

-- 8. RLS - 例
alter table public.messages enable row level security;
create policy "Members read their conv messages" on public.messages
  for select using (
    conversation_id in (
      select conversation_id from conversation_members
      where user_id = auth.uid()
    )
  );
-- 写 / 改 / 删策略同理
```



**关键决策**：
- 30 天消息清理用 `pg_cron` 定时任务（Supabase 支持）。
- `recall` 用软删除：`recalled_at is not null` → 前端渲染为"已撤回"。
- 编辑：`edited_at is not null` → 加 `(edited)` 后缀。
- **不存"已读"**：反主流 IM 的核心承诺，永久不存。

---

## 4. 项目目录结构（v1.0 落地形态）



```
nook/
├── public/                         # 静态资源、icon、manifest.json
├── src/
│   ├── main.tsx                    # 入口
│   ├── App.tsx                     # 路由根
│   ├── app/
│   │   ├── routes.tsx              # React Router 配置
│   │   ├── pages/                  # 各页面（P_home、P_chat、P_settings 等）
│   ├── components/                 # UI 组件（基于 Nook-DESIGN tokens）
│   │   ├── chat/
│   │   ├── composer/
│   │   ├── sidebar/
│   │   └── ui/                     # button、card、input 等原子组件
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client 单例
│   │   ├── api/                    # 类型安全的 API 封装
│   │   ├── realtime/               # Realtime subscription hooks
│   │   ├── db/                     # Dexie（IndexedDB）本地缓存
│   │   ├── storage/                # 图片压缩 + 直传
│   │   ├── i18n/                   # 翻译 JSON + useTranslation
│   │   └── auth/                   # invite-token 处理
│   ├── stores/                     # Zustand stores (useChat, useUI, useAuth)
│   ├── styles/
│   │   ├── tokens.css              # 把 Nook-DESIGN 翻译成 CSS vars
│   │   └── global.css              # 重置 + 字体加载
│   └── types/                      # DB schema 推导出的 TS 类型
├── supabase/
│   ├── migrations/                 # SQL 迁移
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls.sql
│   │   └── 0003_pg_cron_ttl.sql
│   ├── functions/
│   │   ├── admin-bootstrap/
│   │   ├── friend-signup/          # 走 service_role.createUser + 同诜 1:1 conv 创建
│   │   ├── admin-create-invite/    # 生成 24-byte hex token + INSERT invites
│   │   ├── admin-reset-password/
│   │   ├── admin-delete-friend/    # 原子事务 left_at 转软删
│   │   └── cleanup-storage-orphans/# pg_cron J-03 调用 · 清孤儿 storage 对象
│   └── config.toml
├── .github/
│   └── workflows/
│       ├── ci.yml                  # lint + typecheck + test
│       └── deploy.yml              # deploy to Pages + Functions
├── tailwind.config.ts              # 把 design tokens 接进 Tailwind
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```



> 没有 monorepo（NX / Turborepo）。10 个朋友的产品上 monorepo 是过度工程。

---

## 5. 关键流程（5 条最重要的运行时序）

### 5.1 注册 / 邀请流程



```
[owner] 创建邀请 token (server: Supabase)
   → 复制链接 https://nook.app/invite/<token>
   → 微信发给朋友

[friend] 点击链接
   → PWA 加载 /invite/:token 页面
   → 显示邀请人头像 + Nook 简介
   → 输入 email + password
   → 提交 → Supabase Auth 注册
   → 云端标记 invites.token.used_by = friend.id
   → 自动加入 invites.conversation_id 指定的会话（如果有）
   → 跳转到 home，显示"已加入"

[owner 的朋友列表] Realtime 推送 → 自动出现新成员
```



### 5.2 发送消息（核心动效体验）



```
[user] 在 composer 输入 (Zustand: hasContent=true)
   → 每个 keystroke → Supabase Realtime Presence channel('typing')
     → 朋友的 UI 收到 typing=true
   → 朋友侧栏头像旁出现"三点降速"动画（120 ms 错落）

[user] 按 Enter
   → TanStack Query mutation
   → POST messages (Supabase 自动校验 RLS: sender = auth.uid)
   → Postgres insert → 触发 realtime
   → 自己侧 Realtime append to buffer (no network round trip perceived)
   → 其他人侧 Realtime append to buffer + 动效 (translateY(8 → 0), 180ms)

[backend] pg_notify OR realtime push → 触发 Edge Function send-push
   → 对所有未在线成员调 Web Push API
```



### 5.3 跨端同步（PC → 手机）



```
[PC 已登录] user_id = A
   → 浏览器 tab 1 写入消息
   → Realtime broadcast to Postgres logical replication
   → Supabase Realtime 推送给所有订阅者（含手机 PWA）
   → 手机 PWA background service worker 唤起 → push 通知
   → 用户点开 → 进入会话 → Pull 最新消息 (TanStack Query)
```



### 5.4 离线模式



```
[网络断开] user A
   → Composer 仍可输入（Zustand 内存）
   → "发送" → 进 IndexedDB outbox 队列（不报错，标记 pending）
   → UI 立即显示在本地（带"未发送"小点）
   → 网络恢复 → Service Worker 触发 background sync
   → Dexie outbox 逐条 replay → Supabase API
   → 服务端 Realtime 推送回来的同一条消息 → 与本地 dedupe（按 client_msg_id）
```



### 5.5 30 天消息清理



```
[pg_cron 每日 03:00] cleanup-messages
   → delete from messages where created_at < now() - '30 days'
   → delete from attachments where id in (上述关联)
   → delete from storage objects (Supabase Storage API)
```



---

## 6. 免费额度边界（何时会爆，我们怎么应对）

| 资源 | 限额 | 我们 v1.0 实际用量 | 何时爆 | 应急 |
|---|---|---|---|---|
| Supabase DB | 500 MB | 约 30 MB（300 条/会话 × 4 个会话 × 30 天） | ~12 个月 | 升级 Pro $25/月，停服付费 |
| Supabase Storage | 1 GB | 80%（高清原图是主消耗） | ~6–8 个月激进使用 | 把旧附件迁到 R2；或降为 1920px |
| Supabase 带宽 | 2 GB/月 | ~300 MB（10 个活跃用户× 30 MB） | 不爆 | 监控面板看 |
| Supabase Edge Functions | 500k 调用/月 | 仅 Web Push + cleanup，< 5k/月 | 不会爆 | — |
| Cloudflare Pages | 无限制 | — | 不会爆 | — |
| Cloudflare R2 | 10 GB | 0（v1 不会迁过去） | 不会爆 | — |
| Sentry | 5k 错误/月 | < 100/月 | 不会爆 | — |
| GitHub Actions | 2000 min/月 | ~50 min/月 | 不会爆 | — |
| LogSnag | 1k 事件/月 | ~300/月 | 不爆 | 改 console only |

**关键警报**：Supabase Storage 是 v1 唯一可能 6–8 个月内逼近的资源。**v1.1 阶段准备"30 天前附件迁 R2 + 只留文字"的瘦身脚本**。

---

## 7. China-specific 备注（重要）

> 用户及朋友大概率在中国大陆，给出可观察的现实压力。

| 服务 | 国内访问 | 备选方案 |
|---|---|---|
| Cloudflare Pages | ⚠️ 良好（CF 在国内有合作 PoP 但不是顶级） | 备：Vercel 同等用 |
| Cloudflare R2 | ⚠️ Upload 慢，Download 受 GFW 影响 | 备：阿里云 OSS / 腾讯 COS（但收费） |
| Supabase Cloud | ⚠️ 主要 AWS region，跨国延迟 100–250 ms | **备：自托管 Supabase 到一台香港 / 日本 VPS**。但这就失去"零维护" |
| 推送能力 | **N/A — v1.0 不放 Web Push (SPEC § 1.7.2 强禁)** | —— 被推到 NEVER（“唯一候性”是应用内未读小红点） —— |
| Google 字体 | ❌ 不稳定 | 备：把 Inter 字体文件自托管到 R2（v1.0 必做） |
| Sentry | ✅ 良好 | — |
| GitHub Actions | ⚠️ 时有干扰 | 备：用 GitLab CI 国内版 |

**结论建议**：
- v1.0 假设朋友都用 **国际版浏览器**（Chrome / Edge / Safari），Supabase Cloud + CF Pages 可用。
- v1.1 准备好"国内 FCM 缺失"造成的推送静默切换为"应用内未读小红点"。
- **绝不要**把 Google Fonts 走 CDN；项目启动就把 Inter / JetBrains Mono WOFF2 自托管到 R2。

---

## 8. 何时升级 / 何时放弃这套架构

### 8.1 升级到 Pro 的触发条件
- DB → 400 MB → 准备升级 $25/月（应该至少 8–12 个月后）。
- 实时活跃用户 > 30 且每用户平均 2 设备 → Supabase Realtime 并发接近 100 → 考虑 Supabase Pro。

### 8.2 整体重做的触发条件
- 朋友规模增长到 50+（**主动拒绝**：产品定位上"不能突破 20 人"，那时 Nook 应被主动切回微信群）。
- 需要端到端（E2E）加密 → 整套改写为 CF DO + 自管 Postgres + 自签 EC key（**v2.0 路线**）。
- 出现音视频需求 → 直接拒绝（产品定位上红线）。

### 8.3 一票否决的"never do"
- ❌ 不上 K8s / Docker Swarm。
- ❌ 不上 GraphQL Federation / Apollo Server。
- ❌ 不分微服务（auth / chat / media 各一套）。
- ❌ 不把任何消息内容送入第三方 AI / 分析服务。

---

## 9. 给未来 N 个版本的演进路径

| 版本 | 架构差异 |
|---|---|
| **v1.0（MVP）** | 本文档。Supabase + CF Pages + Dexie |
| **v1.1（灵魂打磨）** | 加 Sentry 规则收敛；推 R2 备份；Edge Function 加端到端通知聚合 |
| **v1.2（容器升级）** | 加 passkey；DB schema 加 indexes for search |
| **v2.0（体验纵深）** | 自签名 EC 密钥 + 客户端 E2EE（CF DO + 客户端 Crypto.subtle）；可选切换至自托管 Supabase |

---

## 10. 决策清单（一页纸）

> 任何新选型提议，先过这张表。

| 决策 | 当前答案 | 后续替换的阈值 |
|---|---|---|
| 前端框架 | React 18 + Vite + TS | 不换（10 朋友级别永远够） |
| 后端框架 | Supabase | 朋友 > 30 一票否决 |
| 数据库 | Postgres 15 | 不换 |
| 实时通信 | Supabase Realtime | 并发逼近 100 → 升级 |
| 认证 | Supabase Auth + invite-token | 不换（v1.1 加 passkey） |
| 对象存储 | Supabase Storage → R2 | Storage 600 MB+ → 切 |
| i18n | react-i18next | v1.0 双语即够 |
| 客户端态 | Zustand | 不换 |
| 服务端态 | TanStack Query v5 | 不换 |
| 消息缓存 | Dexie (IndexedDB) | 不换 |
| 图片压缩 | 客户端 canvas | 不换 |
| 部署平台 | CF Pages + Supabase + R2 | 不换 |
| CI/CD | GitHub Actions | 不换 |
| 日志 | LogSnag + Supabase logs | 事件 > 1k/月 → 简化 |
| 监控 | Sentry free | 不换 |
| 字体来源 | **自托管 Inter / JBM** | 永远 |
| 推送通道 | **❌ NONE** (v1.0 不放 Web Push) | 永久不变；应用内小红点 + Tab title 是唯一提示 |
| 后端运行时 | Deno (Edge Functions) | 不换 |
| 关系位置 | Edge-frontend + Cloud-backend | 不换 |
| 鉴权位置 | Postgres RLS（不是应用层） | 不换 |

---

## 11. 这套架构的"灵魂承诺"

- **单一 vendor 优先**：能让一家做的，绝不让两家做。
- **保守优于激进**：成熟方案 > 新锐方案。
- **永久免费优先**：不为弹性付费；为现实流量付费。
- **隐形可靠**：用户不感知到架构在消耗 attention。
- **不发明轮子**：Auth / Realtime / Storage 全部用现成。

如果这个架构让你觉得"在打架、想拆掉换更 fancy 的"，那是产品在要求一个不同的产品。
那时回头读 `../01_Product/Nook-PRODUCT.md § 0 一句话定位` —— 它会告诉你该回去。

---

— END —
