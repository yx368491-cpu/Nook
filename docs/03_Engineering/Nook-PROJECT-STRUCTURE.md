# Nook · Project Structure v1.0 (Stage 11)

> **Stage 11 · PROJECT STRUCTURE — Frozen for Nook v1.0**
> 文档生成日：2026-06-27 · 关联：`Nook-SPEC v1.0.1`（SoT）· `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md`（架构）· `../02_Architecture/Nook-DATA-MODEL.md v1.0.1`（数据模型）· `../02_Architecture/Nook-API-DESIGN-v1.0.md`（API 契约）
> 性质：**项目目录结构规范** — 定义完整的目录树、功能模块划分、共享层边界、组件层级、服务层职责、测试结构、命名约定、引用依赖规则。
> 本文档不创建实际目录或代码。

---

## 0. 元规则

### 0.1 文档性质

- 本文档是 Stage 11 交付物，与 SPEC / ARCH-DESIGN / API-DESIGN 同级冻结。
- 本文档定义**唯一**的项目目录组织规范。后续所有代码必须遵循该结构。
- 除非经过新的 Stage 评审，**不得随意新增顶层目录**。

### 0.2 与既有 `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 3.1` 的关系

ARCH-DESIGN § 3.1 给出了前端模块的**示意性**目录树（`src/` 下的 app/components/lib/stores/types）。本文将其**细化、冻结**为正式规范，从示意图变为强制执行的结构。

### 0.3 变更日志

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-27 | v1.0 | 初版。基于 SPEC v1.0.1 + ARCH-DESIGN v1.0 + API-DESIGN v1.0 + DATA-MODEL v1.0.1 生成 |

---

## 一、整体目录结构 (Directory Tree)



```
nook/
│
├── docs/                           # 项目记忆体系（7 份文档）
│   ├── AI_HANDOVER.md              #   最重要的交接文档
│   ├── DEVELOPMENT_LOG.md          #   时间序 Session 记录
│   ├── CHANGELOG.md                #   Keep a Changelog 版本变更
│   ├── TODO.md                     #   M1-M7 阶段任务清单
│   ├── KNOWN_ISSUES.md             #   已知问题登记
│   ├── DECISIONS.md                #   22 项 ADR 决策记录
│   └── ROADMAP.md                  #   版本路线图
│
├── spec/                           # 已冻结的 Specification 体系（SoT）
│   ├── Nook-SPEC.md                #   Single Source of Truth（v1.0.1）
│   ├── Nook-PRODUCT.md             #   产品定位 + 反模式 + 功能分级
│   ├── Nook-ARCHITECTURE.md        #   技术选型（v1.0.1 patched）
│   ├── Nook-INTERVIEW-spec.md      #   6 轮 Interview 决定
│   ├── Nook-DESIGN.md              #   视觉语言 + tokens + 动效
│   ├── Nook-DATA-MODEL.md          #   纯业务数据模型（v1.0.1）
│   ├── Nook-ARCH-DESIGN-v1.0.md    #   权威架构设计（Stage 7）
│   ├── Nook-API-DESIGN-v1.0.md     #   完整 API 契约（Stage 10）
│   ├── Nook-PROJECT-STRUCTURE.md   #   本文件（Stage 11）
│   ├── Nook-SPEC-FREEZE.md         #   v1.0 冻结记录
│   └── Nook-SPEC-FREEZE-v1.0.1.md  #   v1.0.1 patch 同步记录
│
├── public/                         # 静态资源（直供 CF Pages）
│   ├── fonts/                      #   自托管 WOFF2 字体（Inter + JetBrains Mono）
│   ├── icons/                      #   PWA icon set（192/512/1024 px）
│   ├── manifest.json               #   PWA manifest
│   ├── sw.js                       #   Service Worker（Workbox 生成）
│   ├── robots.txt
│   └── favicon.ico
│
├── src/                            # 前端源码（React SPA）
│   ├── main.tsx                    #   Entry · hydration
│   ├── App.tsx                     #   路由根
│   │
│   ├── app/                        #   应用层：路由 + 页面
│   │   ├── routes.tsx              #     路由表（13 路由）
│   │   ├── pages/                  #     页面级组件
│   │   │   ├── WelcomePage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── InviteNewPage.tsx
│   │   │   ├── InviteAcceptPage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── SettingsProfilePage.tsx
│   │   │   ├── SettingsAdminPage.tsx
│   │   │   ├── GroupSettingsPage.tsx
│   │   │   ├── NotFoundPage.tsx
│   │   │   └── ErrorPage.tsx
│   │   └── guards/                 #     路由守卫
│   │       ├── RequireAuth.tsx
│   │       └── RequireOwner.tsx
│   │
│   ├── features/                   #   功能模块（Feature-based）
│   │   ├── auth/                   #     认证域
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── chat/                   #     聊天域
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── settings/               #     设置域
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   └── admin/                  #     Owner 管理域
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/
│   │       └── types/
│   │
│   ├── components/                 #   跨功能复用 UI 组件
│   │   ├── ui/                     #     4 原子组件（来自 components/*.spec）
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── Bubble.tsx
│   │   ├── layout/                 #     布局组件
│   │   │   ├── Sidebar.tsx
│   │   │   ├── AppShell.tsx
│   │   │   └── Modal.tsx
│   │   ├── chat/                   #     聊天复合组件（跨 features/chat + features/admin）
│   │   │   ├── Composer.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   ├── ReplyCard.tsx
│   │   │   └── UnreadDot.tsx
│   │   └── a11y/                   #     可访问性组件
│   │       ├── MotionReduced.tsx
│   │       └── FocusTrap.tsx
│   │
│   ├── lib/                        #   核心基础设施
│   │   ├── api/                    #     API 封装
│   │   │   ├── messages.ts
│   │   │   ├── conversations.ts
│   │   │   ├── reactions.ts
│   │   │   ├── invites.ts
│   │   │   ├── admin.ts
│   │   │   ├── profile.ts
│   │   │   └── errors.ts           #     mapSupabaseError()
│   │   ├── realtime/               #     Realtime 订阅 hooks
│   │   │   ├── useMessagesChannel.ts
│   │   │   ├── usePresenceChannel.ts
│   │   │   ├── useUserChannel.ts
│   │   │   └── useTypingPublisher.ts
│   │   ├── db/                     #     Dexie 本地数据库
│   │   │   ├── schema.ts
│   │   │   ├── cache.ts
│   │   │   └── outbox.ts
│   │   ├── storage/                #     存储相关
│   │   │   ├── compressor.ts
│   │   │   ├── exif.ts
│   │   │   └── uploader.ts
│   │   ├── i18n/                   #     国际化
│   │   │   ├── index.ts
│   │   │   └── locales/
│   │   │       ├── zh-CN/
│   │   │       │   └── translation.json
│   │   │       └── en/
│   │   │           └── translation.json
│   │   ├── auth/                   #     Auth 辅助
│   │   │   ├── session.ts
│   │   │   └── guards.tsx
│   │   └── supabase.ts             #     Supabase client 单例
│   │
│   ├── stores/                     #   Zustand 全局状态
│   │   ├── useChat.ts
│   │   ├── useUI.ts
│   │   ├── useAuth.ts
│   │   └── usePresence.ts
│   │
│   ├── shared/                     #   FE + BE 共享类型/常量
│   │   ├── types/
│   │   │   ├── domain.ts           #     Message, Conversation, Profile 等
│   │   │   ├── db.ts               #     Supabase gen types
│   │   │   └── errors.ts           #     ErrorCode enum
│   │   └── constants/
│   │       ├── limits.ts
│   │       ├── time.ts
│   │       └── locale.ts
│   │
│   ├── hooks/                      #   全局通用 hooks
│   │   ├── useMediaQuery.ts
│   │   ├── useClickOutside.ts
│   │   └── useDocumentTitle.ts
│   │
│   ├── config/                     #   运行时配置
│   │   ├── env.ts                  #     环境变量（VITE_*）
│   │   └── constants.ts            #     应用级常量
│   │
│   └── styles/                     #   样式文件
│       ├── index.css               #     全局 CSS
│       └── tokens.css              #     Design Token CSS 变量注入
│
├── supabase/                       # 后端（Postgres + Edge Functions）
│   ├── config.toml                 #   Supabase 项目配置
│   ├── migrations/                 #   Drizzle migrations（排序应用）
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls.sql
│   │   ├── 0003_triggers.sql
│   │   ├── 0004_pg_cron.sql
│   │   ├── 0005_storage.sql
│   │   └── 0006_seed.sql
│   └── functions/                  #   Deno Edge Functions
│       ├── _shared/                #     EF 共享代码
│       │   ├── auth.ts
│       │   └── response.ts
│       ├── friend-signup/
│       │   └── index.ts
│       ├── admin-create-invite/
│       │   └── index.ts
│       ├── admin-reset-password/
│       │   └── index.ts
│       ├── admin-delete-friend/
│       │   └── index.ts
│       ├── admin-bootstrap/
│       │   └── index.ts
│       └── cleanup-storage-orphans/
│           └── index.ts
│
├── scripts/                        # 工具脚本
│   ├── test-rls.ts                 #   RLS 穿透测试
│   ├── seed-test-data.ts           #   测试数据填充
│   └── migrate-attachments-to-r2.ts #   v1.1 附件迁移脚本（模板）
│
├── tests/                          # 测试
│   ├── unit/                       #   单元测试
│   ├── integration/                #   集成测试
│   ├── e2e/                        #   Playwright E2E
│   │   ├── auth.spec.ts
│   │   ├── chat.spec.ts
│   │   └── admin.spec.ts
│   ├── mocks/                      #     Mock 数据 / 函数
│   │   ├── factories.ts
│   │   └── handlers.ts
│   ├── fixtures/                   #     测试夹具（JSON/图片）
│   └── utils/                      #     测试工具
│       ├── test-client.ts          #       Supabase test client factory
│       └── setup.ts                #       Vitest setup
│
├── tokens/                         # Design Tokens（与 prompt/ 下的 tokens 同步）
│   ├── index.ts
│   └── README.md
│
├── .github/                        # CI/CD
│   └── workflows/
│       └── ci.yml                  #   GitHub Actions CI
│
├── .vscode/                        # IDE 配置
│   ├── settings.json
│   └── extensions.json
│
├── prompt/                         # 原始 prompt 文件（项目历史存档）
│   ├── components/
│   │   ├── Button.spec.md
│   │   ├── Input.spec.md
│   │   ├── Avatar.spec.md
│   │   └── Bubble.spec.md
│   ├── tokens/
│   │   ├── index.ts
│   │   └── README.md
│   ├── Nook-DESIGN-TOKENS.ts
│   ├── Nook-DESIGN-TOKENS.css
│   ├── Nook-DESIGN-TOKENS.json
│   ├── Nook-DESIGN-TOKENS.md
│   ├── DATABASE_DESIGN.txt
│   ├── PROJECT_STRUCTURE.txt
│   ├── PROJECT_WORKFLOW.txt
│   └── SPEC review.txt
│
├── .env.example                    # 环境变量模板
├── .gitignore
├── .prettierrc
├── .eslintrc.cjs
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── package.json
├── wrangler.toml
└── README.md
```



---

## 二、Feature Structure（功能模块）

### 2.1 模块划分原则

Nook v1.0 采用 **Feature-based organization**。每个功能模块（`src/features/<domain>/`）是垂直切分：包含自己的组件、hooks、服务和类型。

**禁止**：
- Feature A 直接引用 Feature B 的内部代码
- 业务逻辑跨模块 import

**允许**：
- 所有 Feature 引用 `src/shared/` + `src/lib/` + `src/components/`
- Feature 间通过 `stores/`（Zustand）间接通信

### 2.2 功能模块定义



```
src/features/
├── auth/                      # 认证域（Owner 注册/登录/Friend 邀请注册）
│   ├── components/            #   该域专属 UI 组件
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── InviteLanding.tsx
│   │   └── PasswordResetForm.tsx
│   ├── hooks/                 #   该域专属 hooks
│   │   ├── useLogin.ts
│   │   ├── useRegister.ts
│   │   └── useInviteValidation.ts
│   ├── services/              #   该域专属服务（调 lib/api/* 封装）
│   │   └── authService.ts
│   └── types/                 #   该域专属类型
│       └── index.ts
│
├── chat/                      # 聊天域（核心 SPA）
│   ├── components/
│   │   ├── ConversationList.tsx
│   │   ├── ConversationItem.tsx
│   │   ├── MessageGroup.tsx
│   │   ├── EmojiPicker.tsx
│   │   ├── MessageMenu.tsx
│   │   └── EmptyState.tsx
│   ├── hooks/
│   │   ├── useConversations.ts
│   │   ├── useMessages.ts
│   │   ├── useSendMessage.ts
│   │   └── useUnreadCount.ts
│   ├── services/
│   │   └── chatService.ts
│   └── types/
│       └── index.ts
│
├── settings/                  # 设置域
│   ├── components/
│   │   ├── ProfileForm.tsx
│   │   ├── AvatarUploader.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   └── GroupRenameForm.tsx
│   ├── hooks/
│   │   ├── useProfileUpdate.ts
│   │   └── useAvatarUpload.ts
│   ├── services/
│   │   └── profileService.ts
│   └── types/
│       └── index.ts
│
└── admin/                     # Owner 管理域
    ├── components/
    │   ├── FriendList.tsx
    │   ├── FriendRow.tsx
    │   ├── InvitePanel.tsx
    │   ├── ConfirmDeleteModal.tsx
    │   └── ResetPasswordModal.tsx
    ├── hooks/
    │   ├── useInvite.ts
    │   ├── useResetPassword.ts
    │   └── useDeleteFriend.ts
    ├── services/
    │   └── adminService.ts
    └── types/
        └── index.ts
```



### 2.3 每个模块的内部目录结构说明

| 子目录 | 用途 | 注意事项 |
|---|---|---|
| `components/` | 仅该功能域使用的 UI 组件 | 可被页面级组件（`app/pages/`）直接导入 |
| `hooks/` | 该域专属的 React hooks | 封装业务逻辑 + API 调用 |
| `services/` | 该域的服务层（调 `src/lib/api/*` 的接口） | 不可引入其他 feature 的 service |
| `types/` | 该域的 TypeScript 类型 / 接口 | 仅该域使用 |

---

## 三、Shared Layer（共享层）

### 3.1 共享层包含



```typescript
// src/shared/ — FE + BE 共享（v1.0 不分 monorepo，shared/ 在 src/ 内导出）
shared/
├── types/
│   ├── domain.ts           // 核心业务类型：Message, Conversation, Profile, Invite, Reaction, Attachment
│   ├── db.ts               // supabase gen types 自动生成（对应 DB schema）
│   └── errors.ts           // ErrorCode enum + ApiError 接口
└── constants/
    ├── limits.ts           // MAX_FILE_SIZE_MB = 50, MAX_AVATAR_MB = 5, MAX_DISPLAY_NAME_LENGTH = 32 ...
    ├── time.ts             // EDIT_WINDOW_MS = 120_000, TYPING_TIMEOUT_MS = 5000 ...
    └── locale.ts           // SUPPORTED_LOCALES = ['zh-CN', 'en']
```



### 3.2 共享层边界规则

| ✅ Shared 中可以放 | ❌ Shared 中禁止放 |
|---|---|
| 纯类型定义（interface / type） | React 组件 |
| 纯常量（不会变的枚举、限制值） | React hooks |
| 工具函数（pure functions, 无副作用） | 业务逻辑 |
| ErrorCode 枚举 + HTTP 映射 | 状态管理（Zustand store） |
| Supabase 生成的类型 | API 调用代码 |
| 跨模块使用的配置值 | 任何 import `supabase-js` 的代码 |

### 3.3 判断标准

> **一句话测试**：如果删除某段代码后，某个 Feature 模块就不再编译，那这段代码属于该 Feature —— 不应进入 Shared。

---

## 四、Component Structure（组件结构）

### 4.1 组件层级



```
src/components/
├── ui/                 # 原子组件（Design System 级）
│   ├── Button.tsx      #   唯一入口：components/Button.spec.md
│   ├── Input.tsx       #   唯一入口：components/Input.spec.md
│   ├── Avatar.tsx      #   唯一入口：components/Avatar.spec.md
│   └── Bubble.tsx      #   唯一入口：components/Bubble.spec.md
│
├── layout/             # 布局组件（全应用复用）
│   ├── AppShell.tsx    #   整体布局框架（侧栏 + 聊天区 + header）
│   ├── Sidebar.tsx     #   侧栏容器
│   └── Modal.tsx       #   通用弹窗容器
│
├── chat/               # 聊天复合组件（跨 features/chat + features/admin 复用）
│   ├── Composer.tsx    #   消息输入区（含 typing presence / outbox 状态）
│   ├── MessageList.tsx #   消息列表（virtual scroll）
│   ├── MessageItem.tsx #   单条消息（含反应/编辑/撤回/回复）
│   ├── ReplyCard.tsx   #   引用卡
│   └── UnreadDot.tsx   #   未读小红点
│
└── a11y/               # 可访问性组件
    ├── MotionReduced.tsx #   减动效监听
    └── FocusTrap.tsx     #   焦点陷阱（modal）
```



### 4.2 组件归属判断

| 层级 | 复用范围 | 示例 |
|---|---|---|
| **`components/ui/`** | 全局（应用任何地方） | Button, Input, Avatar, Bubble |
| **`components/layout/`** | 全局（多个页面共用布局） | AppShell, Sidebar, Modal |
| **`components/chat/`** | chat + admin 模块共用 | Composer（在 chat 页面 + settings 页面都可能用到）|
| **`components/a11y/`** | 全局 | MotionReduced, FocusTrap |
| **`features/<domain>/components/`** | 仅该功能域 | LoginForm, FriendList, EmojiPicker |

**规则**：如果一个组件被超过 1 个 feature module 引用，提升到 `src/components/` 下的对应子目录。

### 4.3 4 原子组件的特殊地位

4 个原子组件（Button / Input / Avatar / Bubble）的 API **完全由 `prompt/components/*.spec.md` 定义**。
- 实现代码在 `src/components/ui/<Name>.tsx`
- 必须严格遵循 `.spec.md` 中的 prop 签名、variant 命名、intent 枚举
- 任何偏离必须通过 SPEC 变更流程

---

## 五、Service Structure（服务层）

### 5.1 服务层分层



```
                ┌──────────────────────────────┐
                │    app/pages/ (页面组件)      │
                │ 读: store, 写: feature hooks   │
                └──────────┬───────────────────┘
                           │
                ┌──────────▼───────────────────┐
                │ features/<domain>/services/   │
                │  业务编排（调用 lib/api）       │
                └──────────┬───────────────────┘
                           │
                ┌──────────▼───────────────────┐
                │      lib/api/ (API 封装)      │
                │  调 supabase-js REST/EF/RPC   │
                └──────────┬───────────────────┘
                           │
                ┌──────────▼───────────────────┐
                │    lib/supabase.ts (client)   │
                │   supabase-js 单例 + JWT 管理  │
                └──────────────────────────────┘
```



### 5.2 各服务职责

| 层 | 目录 | 职责 | 禁止 |
|---|---|---|---|
| **页面层** | `app/pages/` | 组装 feature 组件 + 接收路由 params | 直接调 API / 写业务逻辑 |
| **Feature 服务** | `features/*/services/` | 业务编排（调度多个 API 调用 + error handling） | 直接 import `supabase-js` |
| **API 封装** | `lib/api/` | 类型安全的 API 调用（每个函数对应 1 个 endpoint） | 做业务决策 |
| **Auth** | `lib/auth/` | session 管理 / 路由守卫 | — |
| **Realtime** | `lib/realtime/` | Realtime channel 创建 / 订阅 hooks | 调 REST API |
| **DB (Dexie)** | `lib/db/` | IndexedDB schema / cache / outbox | 直接修改 Postgres |
| **Storage** | `lib/storage/` | 图片压缩 / EXIF strip / 直传 | — |
| **i18n** | `lib/i18n/` | i18next 初始化 + 语言切换 | — |
| **Supabase client** | `lib/supabase.ts` | 单例创建 + auth state listener | 业务逻辑 |

### 5.3 API 封装层映射（lib/api/* → API-DESIGN）

| 文件 | 对应端点 |
|---|---|
| `lib/api/messages.ts` | GET/POST/PATCH `/rest/v1/messages` + client_msg_id dedupe |
| `lib/api/conversations.ts` | GET `/rest/v1/conversations`, GET `/rest/v1/conversation_members`, PATCH conversations, RPC unread/mark_read |
| `lib/api/reactions.ts` | POST/DELETE `/rest/v1/reactions` |
| `lib/api/invites.ts` | POST `/functions/v1/admin-create-invite`, GET invite detail |
| `lib/api/admin.ts` | POST `/functions/v1/friend-signup`, `/admin-reset-password`, `/admin-delete-friend` |
| `lib/api/profile.ts` | PATCH `/rest/v1/profiles`, POST Storage `/avatars/` |
| `lib/api/errors.ts` | `mapSupabaseError()` 错误统一映射 |

---

## 六、Configuration Structure（配置）

| 配置类 | 文件 | 用途 |
|---|---|---|
| **Theme / Design Tokens** | `tokens/index.ts` → Tailwind `tailwind.config.ts` | 设计 token 注入 |
| **环境变量** | `.env.example` + `src/config/env.ts` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN` 等 |
| **构建** | `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json` | Vite + TypeScript 配置 |
| **格式/规范** | `.prettierrc`, `.eslintrc.cjs` | 代码格式 + lint |
| **i18n** | `src/lib/i18n/locales/{zh-CN,en}/translation.json` | 翻译资源 |
| **部署 (FE)** | `wrangler.toml` | Cloudflare Pages 部署 |
| **部署 (BE)** | `supabase/config.toml` | Supabase 项目配置 |
| **CI/CD** | `.github/workflows/ci.yml` | GitHub Actions |
| **运行时常量** | `src/config/constants.ts` | 不参与 i18n 的应用级常量（如 APP_VERSION） |

**配置加载顺序**：
1. `.env` → `src/config/env.ts`（Vite 编译时注入）
2. `tailwind.config.ts` ← `tokens/index.ts`
3. `vite.config.ts` ← 环境变量
4. 运行时 `src/config/constants.ts`（硬编码，不依赖环境）

---

## 七、Testing Structure（测试）

### 7.1 目录结构



```
tests/
├── unit/                       # 单元测试（Vitest）
│   ├── components/             #   组件测试
│   ├── hooks/                  #   hooks 测试
│   ├── services/               #   服务/API 封装测试
│   └── stores/                 #   Zustand store 测试
│
├── integration/                # 集成测试（Vitest + Supabase local）
│   ├── api/                    #   API 端点集成（用测试 Supabase project）
│   └── realtime/               #   Realtime 通道集成
│
├── e2e/                        # E2E 测试（Playwright）
│   ├── auth.spec.ts            #   注册/登录/注册页
│   ├── chat.spec.ts            #   发送消息/接收/编辑/撤回/反应
│   ├── invite.spec.ts          #   创建 invite/接受 invite
│   ├── admin.spec.ts           #   Owner 管理/重置密码/删除 friend
│   └── responsive.spec.ts     #   响应式断点
│
├── mocks/                      # 测试 mock
│   ├── factories.ts            #   实体生成工厂（fake User, Message 等）
│   ├── handlers.ts             #   MSW 请求处理器（模拟 Supabase）
│   └── supabase.ts             #   supabase client mock
│
├── fixtures/                   # 测试夹具
│   ├── images/                 #   测试图片（1x1.png, 10MB.jpg）
│   ├── test-invite-token.json  #   样例 invite token
│   └── sample-messages.json    #   样例消息数据
│
└── utils/                      # 测试工具
    ├── test-client.ts          #   创建测试 supabase client
    ├── setup.ts                #   Vitest 全局 setup
    └── render-with-providers.tsx #  React 测试渲染辅助
```



### 7.2 测试策略

| 类型 | 工具 | 覆盖范围 | 频率 |
|---|---|---|---|
| **Unit** | Vitest + Testing Library | 原子组件、hooks、store、pure functions | 每次 commit |
| **Integration** | Vitest + Supabase local | API endpoint 调用（mock Supabase local） | PR CI |
| **E2E** | Playwright | 关键业务流程（BF-01 ~ BF-15） | PR CI + main 部署前 |

### 7.3 测试文件命名规范

- 组件测试：`<ComponentName>.test.tsx`
- Hook 测试：`use<hookName>.test.ts`
- Service 测试：`<serviceName>.test.ts`
- E2E 测试：`<domain>.spec.ts`
- Mock 文件：`<mocked-domain>.ts`（如 `handlers.ts`, `factories.ts`）

---

## 八、Documentation Structure（文档）

### 8.1 文档体系



```
docs/                           # 项目记忆（7 份核心文档）
├── AI_HANDOVER.md              #   ⭐ 最重要 — 新 AI 接手必读
├── DEVELOPMENT_LOG.md          #   时间序 Session 记录
├── CHANGELOG.md                #   Keep a Changelog 版本变更
├── TODO.md                     #   M1-M7 阶段任务清单
├── KNOWN_ISSUES.md             #   已知问题登记
├── DECISIONS.md                #   22 项 ADR 决策记录
└── ROADMAP.md                  #   版本路线图

spec/                           # 冻结的 Specification 体系（SoT）
├── Nook-SPEC.md                #   Single Source of Truth
├── Nook-ARCH-DESIGN-v1.0.md    #   架构设计
├── Nook-API-DESIGN-v1.0.md     #   API 契约
├── Nook-PROJECT-STRUCTURE.md   #   本文件（目录结构）
（...其他 SoT 文档）

prompt/                         # 原始 prompt 文件（项目历史存档，不修改）
```



### 8.2 文档职责矩阵

| 文档 | 谁写 | 更新频率 | 变更流程 |
|---|---|---|---|
| `AI_HANDOVER.md` | Buffy (AI) | 每个 Stage 完成后 | 只追加 |
| `DEVELOPMENT_LOG.md` | Buffy | 每个 Session 后 | 只追加 |
| `CHANGELOG.md` | Buffy | 每个版本后 | 只追加 |
| `TODO.md` | Buffy | 每完成一个 M 任务 | 更新状态 |
| `KNOWN_ISSUES.md` | Buffy | 发现新 issue 时 | 只追加 |
| `DECISIONS.md` | Buffy | 新 ADR 时 | 追加修订条目 |
| `ROADMAP.md` | Buffy | 版本计划调整时 | 更新 |
| `spec/*.md` | Buffy + Project Lead | 新版本冻结时 | 新增版本文件 |

---

## 九、Naming Convention（命名规范）

### 9.1 目录命名

| 类型 | 规范 | 示例 |
|---|---|---|
| 顶层目录 | `kebab-case` | `src/`, `supabase/`, `tests/` |
| 功能模块 | `kebab-case` | `features/chat/`, `features/settings/` |
| 组件子目录 | `kebab-case` | `components/chat/`, `components/ui/` |
| 服务子目录 | `kebab-case` | `lib/api/`, `lib/storage/` |
| 内部子目录 | `kebab-case` | `lib/i18n/locales/`, `lib/realtime/` |
| Edge Function | `kebab-case` | `admin-create-invite/`, `cleanup-storage-orphans/` |

### 9.2 文件命名

| 类型 | 规范 | 示例 |
|---|---|---|
| React 组件 | `PascalCase.tsx` | `Button.tsx`, `MessageList.tsx`, `LoginForm.tsx` |
| 页面组件 | `PascalCase.tsx` | `HomePage.tsx`, `SettingsProfilePage.tsx` |
| React hooks | `useCamelCase.ts(x)` | `useLogin.ts`, `useSendMessage.ts`, `useMessagesChannel.ts` |
| 服务/工具函数 | `camelCase.ts` | `compressImage.ts`, `mapSupabaseError.ts` |
| 类型定义 | `camelCase.ts` | `domain.ts`, `errors.ts` |
| 常量 | `camelCase.ts` | `limits.ts`, `time.ts`, `locale.ts` |
| 测试 | `<name>.test.ts(x)` | `Button.test.tsx`, `useLogin.test.ts` |
| E2E | `<name>.spec.ts` | `auth.spec.ts`, `chat.spec.ts` |
| DB migration | `NNNN_<slug>.sql` | `0001_init.sql`, `0002_rls.sql` |
| 配置文件 | `camelCase` | `vite.config.ts`, `tailwind.config.ts` |

### 9.3 命名约定速查表

| 项 | 规范 | 正例 | 反例 |
|---|---|---|---|
| 组件名 | PascalCase | `MessageItem` | `messageItem`, `message-item` |
| Hook 名 | `use` + camelCase | `useMessages` | `use-messages`, `MessagesHook` |
| 文件扩展名 (UI) | `.tsx` | — | `.ts`（含 JSX 时） |
| 文件扩展名 (纯 TS) | `.ts` | — | `.tsx`（不含 JSX 时） |
| CSS 类名 | Tailwind utility | `className="text-sm"` | 自定义 CSS class |
| Environment variable | `VITE_*` | `VITE_SUPABASE_URL` | `SUPABASE_URL` |
| 数据库列名 | `snake_case` | `display_name`, `last_read_at` | `displayName`, `lastReadAt` |
| FE 变量 (来自 DB) | 映射为驼峰 | `displayName`, `lastReadAt` | 直接暴露 `last_read_at` |
| SQL 函数 | `fn_<purpose>` | `fn_unread_counts` | `unreadCounts` |
| SQL trigger | `trg_<table>_<action>` | `trg_conversations_cap` | `checkGroupCap` |
| EF 名称 | `kebab-case` | `admin-create-invite` | `adminCreateInvite` |
| Realtime channel | `{kind}:{scope}` | `conversation:<uuid>` | `conv-${id}` |

### 9.4 组件命名规则

- **原子组件**（`components/ui/`）：单一名词 → `Button`, `Input`, `Avatar`, `Bubble`
- **布局组件**（`components/layout/`）：描述其布局角色 → `AppShell`, `Sidebar`, `Modal`
- **复合组件**（`components/chat/`）：描述其业务功能 → `MessageList`, `Composer`, `UnreadDot`
- **Feature 组件**（`features/*/components/`）：描述其页面内的具体角色 → `LoginForm`, `FriendList`, `EmojiPicker`

---

## 十、Import Rules（引用规则）

### 10.1 允许的引用方向



```
pages/ (app/pages/*.tsx)
  │
  ├──→ features/*/components/     ✅ 页面引用 feature 组件
  ├──→ components/*/              ✅ 页面引用通用组件
  └──→ features/*/hooks/          ✅ 页面引用 feature hooks

features/*/
  ├──→ components/*/              ✅ feature 引用通用组件
  ├──→ lib/api/                   ✅ feature 引用 API 封装
  ├──→ stores/                    ✅ feature 引用全局 store
  ├──→ shared/                    ✅ feature 引用共享类型/常量
  └──→ (other features/)          ❌ 禁止引用其他 feature

lib/api/
  ├──→ lib/supabase.ts            ✅ API 封装引用 supabase client
  ├──→ shared/                    ✅ 引用共享类型
  └──→ (features/)                ❌ 禁止引用 feature 代码

components/*/
  ├──→ components/ui/             ✅ 复合组件引用原子组件
  ├──→ shared/                    ✅ 引用共享类型
  ├──→ stores/ (只读store)         ✅ 只读
  └──→ features/                  ❌ 禁止引用 feature 代码

stores/
  ├──→ lib/api/                   ✅ store 调用 API
  ├──→ shared/                    ✅ 引用类型
  └──→ features/                  ❌ 禁止引用 feature 代码
```



### 10.2 禁止的引用（规则速查）

| 规则 | 描述 | 后果 |
|---|---|---|
| **R1** | Feature A 不可引用 Feature B | 循环依赖、模块耦合 |
| **R2** | `lib/` 不可引用 `features/` 或 `app/` | 下层不可知上层 |
| **R3** | `components/` 不可引用 `features/` | 组件不可知业务 |
| **R4** | `shared/` 不可引用 `src/` 内任何非 `shared/` 代码 | 共享层必须独立 |
| **R5** | `pages/` 不可直接调 `lib/api/`（必须经 features/services/）| 业务逻辑泄漏到页面 |
| **R6** | 不可从 `lib/api/` 直接调 `supabase-js` 之外的 API | 统一出口 |

### 10.3 跨模块通信

Feature 之间需要通信时，通过 `stores/`（Zustand）间接进行：



```
Feature A (user clicks send)
  → stores/useChat.ts (set pending state)
  → lib/api/messages.ts (POST message)
  → Realtime broadcast
  → stores/useChat.ts (update message state)
  → Feature B (subscribed to store, rerenders)
```



**禁止**：Feature A 直接 import Feature B 的 hook 或 service。

---

## 十一、Dependency Rules（依赖规则）

### 11.1 依赖方向



```
┌──────────────────────────────────────────────────────────────┐
│                    app/pages/ (路由/页面)                      │
│                         ↕ (通过 store)                        │
├──────────────────────────────────────────────────────────────┤
│              features/ (功能模块，相互隔离)                    │
│                          ↓                                   │
├──────────────────────────────────────────────────────────────┤
│   components/ │ lib/ │ stores/ │ hooks/ │ config/ │ styles/  │
│                          ↓                                   │
├──────────────────────────────────────────────────────────────┤
│                      shared/ (纯类型+常量)                    │
└──────────────────────────────────────────────────────────────┘
```



### 11.2 依赖层级 + 允许依赖

| 层 | 内容 | 可依赖 |
|---|---|---|
| **L4: 页面层** | `app/pages/` | L3, L2, L1 |
| **L3: 功能层** | `features/<domain>/` | L2, L1 (不可依赖其他 L3) |
| **L2: 基础设施层** | `components/`, `lib/`, `stores/`, `hooks/`, `config/`, `styles/` | L1 |
| **L1: 共享层** | `shared/` | 标准库 + npm 包（不含业务代码） |

### 11.3 循环依赖预防

- TypeScript `tsconfig.json` 中 `paths` 映射不设循环别名
- 使用 ESLint 规则 `import/no-cycle` 在 CI 中检测
- 如发现 A → B → A 路径，将共享代码提取到 L1（`shared/`）

### 11.4 边界守卫（CI 检查项）



```bash
# CI 中运行以下检查
npx eslint --rule 'import/no-restricted-paths' \
  --rule-options '{"zones":[
    {"target":"src/features","from":"src/features","except":[".*"]},
    {"target":"src/lib","from":"src/(features|app)"},
    {"target":"src/components","from":"src/(features|app)"},
    {"target":"src/shared","from":"src/(?!shared)"}
  ]}'
```



---

## 十二、Future Expansion（未来扩展）

### 12.1 未来新增功能时的目录结构影响

| 未来功能 | 是否需要新顶层目录 | 需要的结构变更 |
|---|---|---|
| **ja-JP 第三语言** | ❌ 不新增 | `lib/i18n/locales/ja-JP/translation.json` 新增 |
| **FU-3 (Friend 重邀请)** | ❌ 不新增 | `features/auth/services/` 扩展 |
| **FU-4 (Owner tombstone)** | ❌ 不新增 | `features/admin/` 扩展 |
| **全局搜索消息** | ❌ 不新增 | `features/search/` (新增 feature) |
| **E2EE** | ✅ 新增 | `lib/crypto/`（新基础设施目录） |
| **消息转发/Pin/星标** | ❌ 不新增 | `features/chat/` 扩展 |
| **原生 iOS/Android 壳** | ✅ 新增 | `native/` 顶层目录 |
| **多 Nook tenant** | ❌ 不新增 | `features/admin/` 扩展 |
| **数据导出 (GDPR)** | ❌ 不新增 | `features/settings/` 扩展 |

### 12.2 保证无需调整现有结构的策略

1. **New Feature = New Directory**：在 `src/features/` 下新增目录（如 `features/search/`），遵循相同的 `components/hooks/services/types` 子目录结构
2. **New Infrastructure = New `lib/` Subdirectory**：如 `lib/crypto/`（E2EE）、`lib/export/`（GDPR）
3. **Never add new top-level directories**：顶层仅 `docs/`, `spec/`, `public/`, `src/`, `supabase/`, `scripts/`, `tests/`, `tokens/`, `.github/`, `prompt/`, `config files`。新增功能在现有体系中扩展。

### 12.3 扩展方法论

1. 新增 feature → `src/features/<kebab-name>/`
2. 新增基础设施 → `src/lib/<kebab-name>/`
3. 所有共享类型/常量 → `src/shared/`（不要新建顶层 `types/` 目录）
4. 所有设计 token → `tokens/`（不要新建顶层 `design/` 目录）
5. 所有后端迁移 → `supabase/migrations/NNNN_<slug>.sql`
6. 所有测试 → `tests/` 下对应子目录

---

## 十三. Stage 11 · Definition of Done

- ✅ 整体目录树冻结（顶层 10+ 目录 + `src/` 内部 9 个子系统）
- ✅ Feature 结构明确（4 个 domains：auth/chat/settings/admin + 内部目录规范）
- ✅ Shared 边界定义（纯类型 + 常量 + 工具函数；禁止业务逻辑）
- ✅ 组件层级固化（ui → layout → chat → a11y → feature → page）
- ✅ 服务层 5 层分层（page → feature service → api → client）
- ✅ 配置体系统一（theme/env/build/lint/i18n/deploy）
- ✅ 测试结构完整（unit/integration/E2E + mocks/fixtures/utils）
- ✅ 文档体系清晰（docs/ + spec/ + prompt/ 三层）
- ✅ 命名约定覆盖 12 类文件 + 6 项速查
- ✅ Import Rules 6 条 + 依赖层级 4 层 + CI 检查
- ✅ Future Expansion 评估 10 项未来功能 + 扩展方法论
- ✅ 不创建实际目录或代码（纯设计文档）

---

*End of Nook Project Structure v1.0 — 2026-06-27 · Stage 11 · Frozen*
