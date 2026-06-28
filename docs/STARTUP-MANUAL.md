# Nook v1.0 · Project Startup Manual

> **完整项目启动手册** — 把全部 16 个设计/文档阶段 + 55 Task + 30 项 Bootstrap Checklist + 6 类 Bootstrap Risks + AI 12 步执行流程，整合到一份**自包含、可独立阅读、可直接转 PDF** 的统一文档。
> **生成日**：2026-06-27 · **Nook 版本**：v1.0.1（SoT）/ `v0.3.7`（文档版）/ 代码首次 commit 待定 · **下一里程碑**：M1 Foundation（`v0.4.0`）

---

## Table of Contents

1. [项目总览（Project Overview）](#一-项目总览project-overview)
2. [技术栈速览（Tech Stack at a Glance）](#二-技术栈速览tech-stack-at-a-glance)
3. [16 个设计阶段交付物清单（Deliverables Index）](#三-16-个设计阶段交付物清单deliverables-index)
4. [架构基因 7 原则（Architecture DNA）](#四-架构基因-7-原则architecture-dna)
5. [22 项 ADR 一览（Decisions Summary）](#五-22-项-adr-一览decisions-summary)
6. [数据模型摘要（Data Model Summary）](#六-数据模型摘要data-model-summary)
7. [API 契约摘要（API Contract Summary）](#七-api-契约摘要api-contract-summary)
8. [项目目录结构（Project Structure）](#八-项目目录结构project-structure)
9. [编码规范要点（Coding Standards）](#九-编码规范要点coding-standards)
10. [Git 工作流要点（Git Workflow）](#十-git-工作流要点git-workflow)
11. [55 Task 工作拆分速览（Work Breakdown）](#十一-55-task-工作拆分速览work-breakdown)
12. [AI 12 步开发流水线（AI Workflow）](#十二-ai-12-步开发流水线ai-workflow)
13. **Bootstrap Plan 10 步流程**
14. **30 项 Bootstrap Checklist**
15. **6 类 Bootstrap Risks**
16. **路线图（Roadmap）**
17. **已知问题（Known Issues）**
18. **附录（Appendix）**

---

## 一、项目总览（Project Overview）

### 1.1 产品定位

> **"少数密友的数字避难所"（A Digital Sanctuary）**
>
> 不是产品，不是工具，不是社区，不是另一个微信。是「深夜书房」——屏蔽整个互联网社交噪音、与外界隔绝的一间小房间。

| 项 | 值 |
|---|---|
| **正式产品名称** | Nook v1.0 |
| **核心价值** | "零噪音的信息获取权"——100% 信噪比 |
| **目标用户** | 1 Owner + ≤ 20 个密友（5–15 健康区间） |
| **核心场景** | UC-A 深夜无感灌水 · UC-B 高清原图流 · UC-C **赛博陪伴** |
| **不做什么** | 已读 / 语音 / 视频 / 朋友圈 / 群公告 / 红包 / 多设备 / Web Push / light mode / 隐身 |
| **使用场景** | 私人聊天网站；跨端 PC + 移动 PWA；不商业化 / 不规模化 / 不上市 |
| **当前版本** | **v1.0.1**（docs-only patch + 16 个设计阶段全部冻结）|

### 1.2 关键 MVP 节拍

| 节奏 | 时长 | 说明 |
|---|---|---|
| **MVP（V1.0 · M1-M7）** | **4–6 周** 个人工作量 | 5 个朋友「进得来、发得出、看得见」|
| **V1.1** 灵魂打磨 | 2–3 周 | Ambient · 6 emoji 反应 · Typing 精修 · Sentry 收口 |
| **V1.2** 容器升级 | 2–3 周 | `(edited)` 印记 · 时间分组 · 断网重连 |
| **V2.0** 体验纵深 | 视需求 | E2EE + 自托管 + 原生 App 壳（不绑死承诺）|

---

## 二、技术栈速览（Tech Stack at a Glance）

### 2.1 前端（FE）

| 层 | 选型 | 不可替代理由 |
|---|---|---|
| 框架 | **React 18.3** | chat SPA 不需 SSR |
| 构建 | **Vite 5** | dev/HMR/产物体积最佳 |
| 语言 | **TypeScript 5** strict | 类型安全 |
| 路由 | **React Router 6** | 生态稳定 |
| Client State | **Zustand** | chat 体量不需要 Redux |
| Server State | **TanStack Query 5** | cache/revalidate/devtools 一体 |
| Form | **React Hook Form + Zod** | Zod 顺便给 API 边界做运行时校验 |
| 本地缓存 | **Dexie 4**（IndexedDB）| 比 raw IDB 简单 10× |
| 样式 | **Tailwind v3 + Design Tokens** | 业务代码 0 写 hex |
| i18n | **i18next + react-i18next**（ICU）| F-I18N-01/02 |
| PWA | **Vite-plugin-pwa + Workbox** | manifest + SW |
| 测试 | **Vitest + Testing Library + Playwright** | ADR-020 |

### 2.2 后端（BE）

| 层 | 选型 | 不可替代理由 |
|---|---|---|
| 运行时 | **Deno**（Supabase Edge Functions）| TS-native · 无 Docker |
| 数据库 | **Postgres 15 + RLS 全表** | 多对多关系天然 |
| 实时 | **Supabase Realtime** + Presence | 含在 free tier；零自写 WS |
| 认证 | **Supabase Auth + invite-token** | magic-link 国内不稳；Oauth 稀释 invite 唯一性 |
| 对象存储 | **Supabase Storage + R2 fallback** | R2 无 egress；50MB 单文件 |
| 调度 | **pg_cron** | 30 天消息清 · 邀请过期 · orphan 清理 |

### 2.3 部署 / 监控 / 字体

| 层 | 选型 | 免费额度 |
|---|---|---|
| FE 部署 | **Cloudflare Pages** | 无带宽 |
| BE | **Supabase Cloud free** | 500MB DB / 1GB Storage / 2GB/mo 流量 |
| 兜底存储 | **Cloudflare R2** | 10GB / 1M ops/月 |
| CI/CD | **GitHub Actions** | 2000 min/月 |
| 监控 | **Sentry free**（5k err/月 · 关 PII）| PII 默认 off |
| 事件 | **LogSnag free**（1k ev/月）| 不含 message body |
| 字体 | **自托管 Inter + JetBrains Mono WOFF2** | 永不复用 Google Fonts CDN |

---

## 三、16 个设计阶段交付物清单（Deliverables Index）

> 全部 16 个 Stage 的交付物 + 状态 + 关键产出。详细依赖见 `03_Engineering/Nook-WORK-BREAKDOWN.md § 11`。

| # | Stage | 交付物 | 行数 | 状态 | Session |
|---|---|---|---|---|---|
| 1 | Spec Freeze | `01_Product/Nook-SPEC.md` v1.0.1 | ~1400 | ✅ Frozen | S6.0 |
| 2 | Architecture | `02_Architecture/Nook-ARCH-DESIGN-v1.0.md` · `01_Product/Nook-SPEC-FREEZE.md` | ~1700 | ✅ Frozen | S7.0 |
| 3 | v1.0.1 Patch | `01_Product/Nook-SPEC-FREEZE-v1.0.1.md` · `01_Product/Nook-PRODUCT.md` (patch) · `02_Architecture/Nook-ARCHITECTURE.md` (patch) | ~600 | ✅ Frozen | S8.0 |
| 4 | Workflow | `03_Engineering/AI_HANDOVER.md` · `03_Engineering/DEVELOPMENT_LOG.md` · `03_Engineering/CHANGELOG.md` · `03_Engineering/TODO.md` · `03_Engineering/KNOWN_ISSUES.md` · `03_Engineering/DECISIONS.md` · `03_Engineering/ROADMAP.md` | ~2500 | ✅ Frozen | S8.1 |
| 5 | Database Design | `02_Architecture/Nook-DATA-MODEL.md` v1.0.1 | ~800 | ✅ Frozen | S9.0 |
| 6 | API Design | `02_Architecture/Nook-API-DESIGN-v1.0.md` | ~650 | ✅ Frozen | S10.0 |
| 7 | Project Structure | `03_Engineering/Nook-PROJECT-STRUCTURE.md` v1.0 | ~450 | ✅ Frozen | S11.0 |
| 8 | ADR | `02_Architecture/adr/ADR-001.md` ~ `02_Architecture/adr/ADR-020.md` · `02_Architecture/adr/README.md` | ~20 files | ✅ Frozen | S12.0 |
| 9 | Coding Standards | `03_Engineering/Nook-CODING-STANDARDS.md` v1.0 | ~500 | ✅ Frozen | S13.0 |
| 10 | Git Workflow | `03_Engineering/Nook-GIT-WORKFLOW.md` v1.0 | ~350 | ✅ Frozen | S14.0 |
| 11 | Work Breakdown | `03_Engineering/Nook-WORK-BREAKDOWN.md` v1.0 | ~800 | ✅ Frozen | S15.0 |
| 12 | Bootstrap Plan | `03_Engineering/Nook-PROJECT-BOOTSTRAP-PLAN.md` v1.0 | ~900 | ✅ Frozen | S16.0 |
| 13 | **Startup Manual** | `STARTUP-MANUAL.md`（本文 · 集成手册）| 本文件 | ✅ Frozen | 当前 |
| **总计** | 16 | **22 文件** | **~10000+ 行** | | S6-S16 |

### 3.1 交付物分类统计

| 类别 | 数 | 行数 |
|---|---|---|
| 单一可信源（SoT）| 5 (SPEC / PRODUCT / DESIGN / INTERVIEW / ARCHITECTURE legacy)| ~3000 |
| 权威架构 / 设计 | 6 (ARCH-DESIGN / DATA-MODEL / API-DESIGN / PROJECT-STRUCTURE / CODING-STANDARDS / WORK-BREAKDOWN)| ~4500 |
| 项目记忆 | 7 (docs/AI_HANDOVER + 6 其他)| ~2500 |
| ADR | 21 (20 ADR + 1 README)| ~2500 |
| 启动配套 | 4 (GIT-WORKFLOW / BOOTSTRAP-PLAN / SPEC-FREEZE ×2 / MANUAL)| ~2400 |

---

## 四、架构基因 7 原则（Architecture DNA）

> 不可松动的架构设计基石。详见 `02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 1`。

| # | 原则 | 体现 |
|---|---|---|
| **P-01** | **永久免费 > 过度设计** | 架构以"实际用量 + 10× 余量"为容量规划 |
| **P-02** | **维护成本 = 0 是设计目标** | 单厂商首选（Supabase 一体化）|
| **P-03** | **隐形可靠 > 显性创新** | 选用了 ≥3 年的成熟方案；不追新框架 |
| **P-04** | **单一 Source of Truth** | DB 是权威；Realtime 仅是通知 |
| **P-05** | **RLS 优先于应用层鉴权** | 7 张业务表全开 RLS |
| **P-06** | **反 Never-Do 边界** | Web Push / E-mail notif / 多设备 — 架构层硬不实现 |
| **P-07** | **不发明轮子** | Auth / Realtime / Storage 全部使用现成 |

### 黑名单（任何提议需先被否决）

- ❌ 不上 K8s / Docker Swarm / 微服务 / GraphQL Federation
- ❌ 不引除 Supabase / Cloudflare / Sentry / LogSnag / GitHub Actions 以外的供应商
- ❌ 不把任何消息内容送入第三方 AI / 分析服务
- ❌ 不引 Google Fonts CDN
- ❌ 不做 light mode 切换入口（SPEC § 1.7.2）

---

## 五、22 项 ADR 一览（Decisions Summary）

> 总计 22 项决策（D-01..D-22）+ 20 项完整 ADR。详见 `docs/adr/` + `03_Engineering/DECISIONS.md`。

| ID | ★ | 决策 |
|---|---|---|
| D-01 | ⭐ | **SPEC = Single Source of Truth** — 与 SPEC 冲突的所有代码/文档 = bug |
| D-02 | ⭐ | **i18n v1.0 仅双语（zh-CN + en）** — ja-JP 等 v1.1+ |
| D-03 | ⭐⭐ | **永不放 Web Push / 系统通知 / Email 推送** — Never-Do |
| D-04 | ⭐ | **F-MSG-07 列级软隐藏（`deleted_by_sender_at`）** — 不物理 DELETE |
| D-05 | ⭐ | **未读计数基于 `last_read_at` 游标** — 非 24h 滑动窗口 |
| D-06 | ⭐⭐ | **4 群 + 8 成员硬上限 = DB trigger + UI disabled** |
| D-07 | ⭐ | **编辑 2 分钟窗口 = DB trigger** |
| D-08 | ⭐ | **30 天 TTL 同步清理 messages + attachments + storage.objects** |
| D-09 | | 前端：React 18 + Vite + TS（不选 Next.js）|
| D-10 | ⭐⭐ | 后端：Supabase 一体化（Postgres + Auth + Realtime + Storage + EF）|
| D-11 | | 实时：Supabase Realtime（WS + Presence）+ 0 自写 WS 协议 |
| D-12 | | 鉴权：Supabase Auth + 自建 invite-token（24h 过期）|
| D-13 | | 状态管理：Zustand（client）+ TanStack Query v5（server）|
| D-14 | ⭐ | 缓存：Dexie（IndexedDB）+ outbox + client_msg_id dedupe |
| D-15 | | 部署：Cloudflare Pages + Supabase Cloud + R2 fallback |
| D-16 | | CI/CD：GitHub Actions |
| D-17 | | 监控：Sentry free（5k err/月）+ LogSnag free（1k ev/月）|
| D-18 | ⭐⭐ | **字体来源：自托管 Inter + JetBrains Mono WOFF2**（绝不引 Google CDN）|
| D-19 | | **Edge Function 数 = 6**（admin-bootstrap / friend-signup / admin-create-invite / admin-reset-password / admin-delete-friend / cleanup-storage-orphans）|
| D-20 | | **pg_cron 数 = 3**（J-01 消息 / J-02 邀请 / J-03 orphans）|
| D-21 | ⭐⭐ | **RLS：7 张业务表全开 + I/U/D policy 穷举** |
| D-22 | | **AI 接手阅读顺序 = Project Memory** |

⭐ = 关键决策 · ⭐⭐ = 绝对不能改

---

## 六、数据模型摘要（Data Model Summary）

> **纯业务**模型（无 SQL）。详见 `02_Architecture/Nook-DATA-MODEL.md`。

### 6.1 13 个业务实体

| Entity | 持久？ | 30 天清？ | 关键字段 |
|---|---|---|---|
| **User**（auth.users）| ✅ 永久 | ❌ | id / email / encrypted_pwd |
| **Profile**（public.profiles）| ✅ 永久 | ❌ | display_name / avatar_url / role ∈ {owner, friend} |
| **Conversation** | ✅ 永久 | ❌ | id / kind ∈ {one_to_one, group} / name / avatar_url |
| **ConversationMember** | ✅ 永久 | ❌ | user_id / conversation_id / role ∈ {owner, member} / joined_at / **left_at** / last_read_at |
| **Message** | ✅ | ⚠️ 30 天 | conversation_id / sender_id / kind ∈ {text, image, file} / body / attachment_id / reply_to_id / edited_at / recalled_at / **deleted_by_sender_at** / client_msg_id |
| **Attachment** | ✅ | ⚠️ 30 天 | storage_path / mime / size_bytes ≤ 50 MB / width / height / uploaded_by |
| **Reaction** | ✅ | ⚠️ 30 天 | message_id / user_id / emoji ∈ {👍❤️😂👀🔥🙏} PK |
| **Invite** | ✅ 24h | ⚠️ 过期 | token ≥ 24 byte / created_by / target_kind / expires_at / used_by / used_at |
| **TypingStatus** | ❌ 不存表 | — | Realtime Presence（内存，仅连接期）|
| **DexieCache**（IndexedDB）| ❌ 客户端 | — | 1000 条最近消息 / outbox |
| **AppEvent**（结构化日志）| ✅ 7 天 | ⚠️ 滚动 | kind / ts / idempotency_key / meta_jsonb |
| **LanguagePref**（localStorage）| ✅ 永不过期 | — | zh-CN / en |
| **DisplayTheme** | ✅ 永不过期 | — | dark 强制（不存 light toggle）|

> **永不做清单（Never-Exist）**：Device · DeviceSession · ReadReceipt · PushSubscription · Notification · EmailQueue · VoiceMessage · VideoMessage · Payment · Poll · MomentsPost · Story · Announcement · ChatTheme

### 6.2 35 条业务规则（R-1..R-35）

5 大类硬约束：

1. **角色权限**（R-1..R-10）— Owner 单点永久 / Friend ≤ 20
2. **会话约束**（R-11..R-18）— 4 群 / 每群 ≤ 8 / 1:1 不计入
3. **消息约束**（R-19..R-23）— 编辑 2 分钟 / 撤回软标记 / 删除列级软隐藏
4. **邀请约束**（R-24..R-29）— 24h 一次性 + friend 重邀请 edge case
5. **附件约束**（R-30..R-35）— ≤ 50 MB / EXIF strip / MIME 白名单

### 6.3 5 级隐私分类

| Level | 示例数据 | 保护策略 |
|---|---|---|
| **Public** | 朋友 display_name / 头像 | RLS 守可见 |
| **Internal** | 1:1 / 群会话存在 | RLS 同会话可见 |
| **Private** | conversation_members.role / 撤回标记 | sender + 同会话 + admin |
| **Sensitive** | email / language / last_seen_at | 仅 owner + 自己可见 |
| **Confidential** | messages.deleted_by_sender_at | **列级 GRANT**——sender 仅可改自己的 |

### 6.4 30 天 TTL 编排



```sql
-- pg_cron J-01 (每日 03:00 UTC): messages + attachments 同步清理
WITH del AS (
  DELETE FROM messages
  WHERE created_at < now() - '30 days'
  RETURNING attachment_id
)
DELETE FROM attachments WHERE id IN (SELECT attachment_id FROM del);
```



**关键决策（SPEC § 7 DR-05）**：30 天清的 pg_cron **包括** recalled_at 不为 null 的消息（即已撤回占位也会被硬删）—— 这是 SPEC 决策，30 天是硬上限，无论任何标记。

---

## 七、API 契约摘要（API Contract Summary）

> 25 CAP 100% 覆盖。详见 `02_Architecture/Nook-API-DESIGN-v1.0.md`。

### 7.1 端点分类

| 端点类型 | 数 | 来源 |
|---|---|---|
| **REST**（Supabase auto-generated）| 14 endpoint | 7 业务表 CRUD |
| **Edge Functions**（Deno）| 6 handler | admin / friend (含 1 internal cron) |
| **Realtime**（WSS）| 7 channel | postgres_changes + Presence |

### 7.2 4 类错误码（统一格式）

| 前缀 | 含义 | 示例 |
|---|---|---|
| **E_AUTH** | 认证 / 授权 | UNAUTHORIZED · FORBIDDEN · INVALID_CREDENTIALS · SESSION_EXPIRED |
| **E_VAL** | 校验（限制、约束）| EDIT_WINDOW_EXPIRED · GROUP_LIMIT_REACHED · MEMBER_LIMIT_REACHED · FILE_TOO_LARGE · INVALID_EMAIL |
| **E_RES** | 资源（找不到 / 冲突 / 过期）| NOT_FOUND · ALREADY_USED · INVITE_EXPIRED · ALREADY_MEMBER |
| **E_SYS** | 系统（内部 / 限速 / 维护）| INTERNAL · RATE_LIMIT · DB_ERROR · STORAGE_FULL |

### 7.3 Edge Functions

| EF | 作用 | 触发 |
|---|---|---|
| **`admin-bootstrap`** | 写 profiles(role='owner') | Owner 首次注册 |
| **`friend-signup`** | signUp + profiles + invite.used_by + 自动 1:1 conv | Friend 接受 invite |
| **`admin-create-invite`** | gen_random_bytes(24) token + INSERT invites | /invite/new |
| **`admin-reset-password`** | supabase.auth.admin.updateUserById | /settings/admin/:id/reset (Owner) |
| **`admin-delete-friend`** | 原子批量 left_at UPDATE | /settings/admin/:id/delete (Owner) |
| **`cleanup-storage-orphans`** | 扫 storage_objects 不在 attachments → DELETE | pg_cron J-03 |

### 7.4 Realtime 通道

| Channel | 用途 |
|---|---|
| `conversation:<id>` | 新消息 / edited / recalled / reactions |
| `presence:<id>` | Typing + Ambient 光点 |
| `user:<self.id>` | 自己 friends 加入 / 改名 / 换头像 |
| `admin:owner` | Owner 端 invite 状态 overview |

---

## 八、项目目录结构（Project Structure）

> 顶层 10+ 目录。详见 `03_Engineering/Nook-PROJECT-STRUCTURE.md`。



```
nook/
├── docs/                  # 7 份项目记忆 + adr/
│   ├── AI_HANDOVER.md     # ⭐ 最重要 — 接手必读
│   ├── DEVELOPMENT_LOG.md
│   ├── CHANGELOG.md
│   ├── TODO.md
│   ├── KNOWN_ISSUES.md
│   ├── DECISIONS.md
│   ├── ROADMAP.md
│   └── adr/              # 20 项 ADR + README
├── spec/                  # 16 份权威文档（本手册 + 全部 Stage 产出）
├── public/                # 自托管字体 + PWA icons + manifest
├── src/                   # 前端源码
│   ├── main.tsx · App.tsx
│   ├── app/              # 路由（13 路由 · 2 guards） + 页面
│   ├── features/         # 4 个 domain：auth · chat · settings · admin
│   │   (每个 = components + hooks + services + types)
│   ├── components/
│   │   ├── ui/           # 4 原子组件（Button · Input · Avatar · Bubble）
│   │   ├── layout/       # Sidebar · AppShell · Modal
│   │   ├── chat/         # Composer · MessageList · MessageItem · ReplyCard · UnreadDot
│   │   └── a11y/         # MotionReduced · FocusTrap
│   ├── lib/              # 基础设施
│   │   ├── api/          # messages · conversations · reactions · invites · admin · profile · errors
│   │   ├── realtime/     # 4 channel hooks
│   │   ├── db/           # Dexie
│   │   ├── storage/      # compressor · exif · uploader
│   │   ├── i18n/         # locales/{zh-CN,en}
│   │   ├── auth/         # session · guards
│   │   └── supabase.ts   # singleton
│   ├── stores/           # 4 Zustand stores
│   ├── shared/           # 类型 + 常量（FE + BE 共享）
│   ├── hooks/ · config/ · styles/
│   ├── app/pages/        # 13 占位页
│   └── styles/           # tailwind directives + tokens.css
├── supabase/              # 后端
│   ├── config.toml
│   ├── migrations/       # 6 SQL (0001-0006)
│   └── functions/        # 6 Deno EF + _shared/auth.ts
├── scripts/ · tests/ · tokens/
├── .github/workflows/ci.yml
├── 11 个根 config（tsconfig ×2 · vite · tailwind · wrangler · supabase/config 等）
└── .env.example · .gitignore · README.md
```



### 8.1 Import Rules（6 条禁止）

| 规则 | 描述 |
|---|---|
| R1 | Feature A 不可 import Feature B |
| R2 | `lib/` 不可 import `features/` 或 `app/` |
| R3 | `components/` 不可 import `features/` |
| R4 | `shared/` 不可 import `src/` 内任何非 shared 代码 |
| R5 | `pages/` 不可直接调 `lib/api/`（必须经 features/services）|
| R6 | `lib/api/` 不可调 `supabase-js` 之外的 API |

---

## 九、编码规范要点（Coding Standards）

> 14 章节全规范。详见 `03_Engineering/Nook-CODING-STANDARDS.md`。

### 9.1 8 条总体原则

P-01 Readability First · P-02 Consistency First · P-03 Simplicity First · P-04 Type Safety First · P-05 DRY · P-06 KISS · P-07 SOLID · P-08 Convention over Configuration

### 9.2 22 项 Anti-patterns（硬禁）

| # | Anti-patterns |
|---|---|
| A-01..A-22 | 详见 Coding Standards：禁 any / magic number / magic string / 硬编码颜色 / 硬编码文本 / 重复代码 / 跨层引用 / 跨 Feature 引用 / 未用 Tokens / 未用 i18n / 未更新文档 / ...rest 透传 / 手动 fetch / 显式 any / 大文件 / 循环依赖 / 生产 console / 吞错误 / 非 LTS / 同步 IO / 漏编辑窗口检查 / 绕过 EF |

### 9.3 3 级 Quality Gate

| Level | 检查项 |
|---|---|
| **L1 Code Quality** | TS 0 error · ESLint 0 error/warning · Build 0 error · 无未用变量 · 无重复 · Import 顺序 · 命名 · 无 any · 无硬编码颜色 · 无硬编码文本 · 用 Tokens · 用 i18n · 用 Theme |
| **L2 Feature Quality** | 功能符合 SPEC · UI 符合 DESIGN · Mobile 正常 · Desktop 正常 · Loading/Empty/Error/Success · 中文/英文切换 · Dark Mode · Lighthouse LCP ≤ 1.5s |
| **L3 Engineering Quality** | DEVELOPMENT_LOG / TODO / AI_HANDOVER 已更新 · CHANGELOG 新版更新 · KNOWN_ISSUES / DECISIONS 视适用 |

---

## 十、Git 工作流要点（Git Workflow）

> GitHub Flow（非 Git Flow / GitLab Flow）。详见 `03_Engineering/Nook-GIT-WORKFLOW.md`。

### 10.1 分支策略

| 分支 | 用途 | 来源 | 合并到 |
|---|---|---|---|
| `main` | 生产就绪 · 受保护 | — | — |
| `feature/<name>` | 新功能 | main | main（squash merge）|
| `fix/<name>` | Bug 修复 | main | main（squash merge）|
| `docs/<topic>` | 文档修改 | main | main（squash merge）|
| `experiment/<topic>` | 实验/原型 | main | 不合并（或另开 PR）|

### 10.2 Conventional Commits



```
<type>(<scope>): <description>
[body · why]
[footer · Refs ADR-0XX / Closes #N]
```



11 种 type：feat · fix · refactor · docs · style · test · chore · perf · ci · build

### 10.3 版本节奏（SemVer）

| 版本 | 触发 | Tag |
|---|---|---|
| `0.4.0` | M1 Done | v0.4.0 |
| `0.5.0` | M2 Done | v0.5.0 |
| `0.6.0` | M3 Done | v0.6.0 |
| `0.7.0` | M4 Done | v0.7.0 |
| `0.8.0` | M5 Done | v0.8.0 |
| `0.9.0` | M6 Done | v0.9.0 |
| `1.0.0` | M7 Done（v1.0 正式发布）| v1.0.0 |
| `1.1.0` | 灵魂打磨 | v1.1.0 |
| `1.2.0` | 容器升级 | v1.2.0 |
| `2.0.0` | E2EE / 自管 | v2.0.0 |

---

## 十一、55 Task 工作拆分速览（Work Breakdown）

> M1-M7 共 55 个 Task · 8 Epic · 4-6 周个人工作量。详见 `03_Engineering/Nook-WORK-BREAKDOWN.md`。

### 11.1 8 Epic ↔ M 映射

| Epic | M | 任务数 | 描述 |
|---|---|---|---|
| **E-INFRA** | M1 | 6 | 脚手架 · Tokens · i18n · Routes · 4 atoms · CI |
| **E-AUTH** | M2 | 7 | 注册 · 登录 · 邀请 · 自动 1:1 · Profile · Auth E2E |
| **E-CONV** + **E-MSG Core** | M3 | 8 | DB schema · Sidebar · MessageList · Composer · Realtime · pg_cron · Chat E2E |
| **E-MSG Polish** | M4 | 8 | Typing · Edit · Recall · Delete · Reply · Reactions · Presence · E2E |
| **E-Storage** | M5 | 9 | Dexie · SW · dedupe · Img compress · EXIF · Avatar · File upload · Storage RLS · Edge E2E |
| **E-ADMIN** | M6 | 7 | Settings · 3 EF · Invite UI · Reset Pwd · Delete · Atomic EF · Admin E2E |
| **E-POLISH** + **E-NOTIF** | M7 | 10 | Reduced motion · Focus · 44 px · Responsive · Unread · Tab title · PWA · Fonts · Lighthouse · All AC |

### 11.2 M1 · Foundation（6 Tasks）

| Task | 核心 |
|---|---|
| **T-M1-01** | Vite + React 18 + TS 脚手架 |
| **T-M1-02** | Tailwind + Design Tokens 注入 |
| **T-M1-03** | i18next 初始化 + 双语 JSON |
| **T-M1-04** | React Router + 13 路由 + Guards |
| **T-M1-05** | 4 原子组件（Button · Input · Avatar · Bubble）|
| **T-M1-06** | CI + 自托管字体 + 全局 Dark |

### 11.3 M2 · Auth Flow（7 Tasks）

| Task | 核心 |
|---|---|
| **T-M2-01** | Owner 注册页 + admin-bootstrap EF |
| **T-M2-02** | Owner 登录页 |
| **T-M2-03** | Owner 创建 Invite UI + admin-create-invite EF |
| **T-M2-04** | Friend invite 注册落页 |
| **T-M2-05** | friend-signup EF（自动 1:1）|
| **T-M2-06** | 修改 display_name + 语言切换 |
| **T-M2-07** | Auth E2E 测试（AC.01/02/03）|

### 11.4 M3 · Chat Core（8 Tasks）

| Task | 核心 |
|---|---|
| **T-M3-01** | 6 个 SQL Migration |
| **T-M3-02** | Supabase client 初始化 |
| **T-M3-03** | 侧栏会话列表 |
| **T-M3-04** | 消息列表 + Bubble 渲染 |
| **T-M3-05** | Composer floating island |
| **T-M3-06** | Realtime channel 订阅 |
| **T-M3-07** | pg_cron 3 个 job |
| **T-M3-08** | Chat E2E + RLS smoke |

### 11.5 M4 · Realtime Polish（8 Tasks）

| Task | 核心 |
|---|---|
| **T-M4-01** | Typing 三点动画（4 px / 120 ms 错落）|
| **T-M4-02** | 编辑消息（2 分钟窗 + `(edited)` 微标签）|
| **T-M4-03** | 撤回（soft recall）|
| **T-M4-04** | 删除（列级软隐藏 `deleted_by_sender_at`）|
| **T-M4-05** | 引用 / 回复（ReplyCard）|
| **T-M4-06** | 6 emoji 反应 toggle |
| **T-M4-07** | Ambient 在场状态 |
| **T-M4-08** | Realtime E2E |

### 11.6 M5 · Edge Cases（9 Tasks）

| Task | 核心 |
|---|---|
| **T-M5-01** | Dexie schema + outbox table |
| **T-M5-02** | Workbox Service Worker + bg sync |
| **T-M5-03** | client_msg_id + dedupe |
| **T-M5-04** | 图片压缩（canvas WebP + 二压 q=0.6）|
| **T-M5-05** | EXIF strip（不依赖第三方库）|
| **T-M5-06** | 头像上传 + Storage（含列级 GRANT）|
| **T-M5-07** | 50MB 文件直传 |
| **T-M5-08** | Storage RLS bucket policy |
| **T-M5-09** | Edge Cases E2E |

### 11.7 M6 · Admin（7 Tasks）

| Task | 核心 |
|---|---|
| **T-M6-01** | Settings 路由 + AdminGuard |
| **T-M6-02** | EF admin-create-invite |
| **T-M6-03** | /invite/new UI 增强 |
| **T-M6-04** | EF + UI 重置 Friend 密码 |
| **T-M6-05** | EF + UI 删除 Friend |
| **T-M6-06** | admin-delete-friend EF 原子操作 |
| **T-M6-07** | Admin E2E |

### 11.8 M7 · Polish & A11y（10 Tasks）

| Task | 核心 |
|---|---|
| **T-M7-01** | `prefers-reduced-motion` 兼容 |
| **T-M7-02** | focus-visible + 键盘导航 |
| **T-M7-03** | 触达目标 ≥ 44 px |
| **T-M7-04** | PC/Mobile 流式适配（drawer 模式）|
| **T-M7-05** | 应用内未读小红点（accent-soft-bg chip）|
| **T-M7-06** | Tab title `[N]` 前缀 |
| **T-M7-07** | PWA manifest + install banner |
| **T-M7-08** | 自托管字体验证 |
| **T-M7-09** | Lighthouse CI + 性能验证 |
| **T-M7-10** | 全 AC 验收 + AC.AC.naming 审计 |

### 11.9 串行依赖图（Mermaid）



```
M1 ──→ M2 ──→ M3 ──→ M4 ──→ M5 ──→ M6 ──→ M7
v0.4.0 v0.5.0 v0.6.0 v0.7.0 v0.8.0 v0.9.0 v1.0.0
```



---

## 十二、AI 12 步开发流水线（AI Workflow）

> 每个 Coding Session 必走 12 步；详见 `03_Engineering/Nook-CODING-STANDARDS.md § 十二` + `03_Engineering/AI_HANDOVER.md § Development Workflow`。



```
Step 1  ──  阅读 docs/AI_HANDOVER.md  ⭐ 最重要 — 接手必读
Step 2  ──  阅读 docs/DEVELOPMENT_LOG.md（最近 1-2 Session）
Step 3  ──  阅读 docs/TODO.md（活跃 Task）
Step 4  ──  确认当前开发目标（与 Project Lead 对齐）
Step 5  ──  开始开发（按 SPEC F-ID + ARCH § 章节）
Step 6  ──  完成功能
Step 7  ──  更新 docs/DEVELOPMENT_LOG.md（追加 Session）
Step 8  ──  更新 docs/CHANGELOG.md（新版本条目）
Step 9  ──  更新 docs/TODO.md（Task 状态 → Done）
Step 10 ──  更新 docs/KNOWN_ISSUES.md（如适用）
Step 11 ──  更新 docs/AI_HANDOVER.md（技术状态 + 重点）
Step 12 ──  输出本次开发总结（1 段文本给 Project Lead）
```



### 12.1 AI 11 项禁止

1. ❌ 每次 Session 跨多个 Task
2. ❌ 跨 Milestone 跨多个
3. ❌ 同时开发多个 Feature
4. ❌ 提前开发依赖未完成的 Task
5. ❌ 开发前不阅读 AI_HANDOVER / TODO
6. ❌ 开发后不更新 3 份 docs
7. ❌ 修改已冻结文档
8. ❌ 跳过 Quality Gate 直接 Done
9. ❌ 绕过列级 GRANT 直接 UPDATE messages
10. ❌ 提交含 `console.log` 生产代码
11. ❌ 提交未通过 typecheck / lint 的代码

### 12.2 AI Self Review 10 项

| 检查项 | 来源 |
|---|---|
| 代码符合 Coding Standards | A-01 to A-22 |
| 未违反 Architecture | P-01 to P-07 + 黑名单 |
| 未违反 ADR | D-01 to D-22 |
| 未违反 Project Structure | 6 Import Rules |
| 未违反 Design Tokens | 颜色 / 间距 / 字体 |
| 国际化无遗漏 | F-I18N-01..03 |
| Theme 无遗漏 | AC.AC.dark |
| 错误处理无遗漏 | loading / empty / error / success |
| 响应式无遗漏 | 1024 / 768 / 480 |
| 文档更新无遗漏 | 12 步流水线 |

---

## 十三、Bootstrap Plan 10 步流程

> **本节是 Stage 17 启动 M1 Foundation 的核心指南**。详见 `03_Engineering/Nook-PROJECT-BOOTSTRAP-PLAN.md`。

| Step | 操作 | 时长 |
|---|---|---|
| **1** | **Platform Pre-requisite**（Project Lead 手动）— 创建 GitHub repo `nook` + Supabase project + 启用 pg_cron + 提供 .env | 由 Project Lead 完成 |
| **2** | **Local Project Creation** — `npm create vite@latest nook -- --template react-ts` | 10 min |
| **3** | **Initial Commit Setup** — `git init` + 首次 commit（scaffold baseline）| 5 min |
| **4** | **Configuration Files**（11 必需 + 4 推荐）— tsconfig / eslint / prettier / vite / tailwind / gitignore / env / wrangler / supabase / ci / editorconfig / vscode | 30 min |
| **5** | **Dependency Installation**（4 组：runtime 11 + dev 12 + recommended 10 + supabase CLI 1）| 10 min |
| **6** | **Directory Initialization**（src/main.tsx + src/App.tsx + 4 原子组件 stub + 40+ 目录占位 + README）| 15 min |
| **7** | **Token + Theme Injection**（tailwind.config.ts ↔ tokens/index.ts + Vite alias `@/` → `src/` + global dark CSS）| 10 min |
| **8** | **4 Atomic Components**（Button · Input · Avatar · Bubble）— 与 components/*.spec.md 对齐 + unit tests ≥ 80% | 60 min |
| **9** | **i18n + Routes + Guards**（locales 双语 + 13 路由 + RequireAuth + RequireOwner）| 45 min |
| **10** | **CI + Dark + Fonts + Verification**（.github/workflows/ci.yml + 全球 dark + public/fonts/*.woff2 + 8 项验证）| 30 min |
| | **总 AI 编程时间** | **~4 hours** |

### 13.1 Step 1 · 平台预创建（Project Lead 必做）

1. 创建 GitHub repo `nook`（empty · 无 README）
2. 创建 Supabase project → 拿到 `Project URL` + `ANON_KEY` + `SERVICE_ROLE_KEY`
3. Supabase Dashboard → Database → Extensions → **启用 `pg_cron`**
4. 把 `.env.real` 真实值交付给 AI（**不**入 git）

### 13.2 Step 3 · 首次 Commit 内容

| 类别 | 文件数 |
|---|---|
| 根 configs（含 src/main.tsx · App.tsx）| 30+ |
| 11 必需配置文件 | 11 |
| 4 推荐配置 | 4 |
| src/ 内目录 + 占位 | 40+ |
| spec/ + docs/ 复制 | 23 |
| **首次 commit message** | `feat(m1): bootstrap Nook v1.0 Foundation` |

### 13.3 Step 4 · 11 必需 + 4 推荐配置

| # | File | 职责 |
|---|---|---|
| 1 | `package.json` | npm scripts · deps（见 § 13.4）|
| 2 | `tsconfig.json` | strict + path alias `@/` |
| 3 | `tsconfig.node.json` | Node-side TS（Vite config）|
| 4 | `vite.config.ts` | React + PWA plugin + alias |
| 5 | `tailwind.config.ts` | Tokens 注入 + dark mode = class |
| 6 | `postcss.config.js` | tailwind + autoprefixer |
| 7 | `.eslintrc.cjs` | import/no-restricted-paths + no-explicit-any 等 |
| 8 | `.prettierrc` | format + tailwind plugin |
| 9 | `.gitignore` | node_modules / dist / .env / coverage 等 |
| 10 | `.env.example` | 5 个 VITE_* 变量 |
| 11 | `wrangler.toml` | CF Pages 部署 |
| 12 | `supabase/config.toml` | Supabase project config |
| 13 | `.editorconfig` | (推荐) 跨编辑器基础格式 |
| 14 | `.vscode/settings.json` | (推荐) format on save + TS strict |
| 15 | `.vscode/extensions.json` | (推荐) 团队扩展推荐 |

### 13.4 33 项依赖（4 组）

#### Runtime (11)

`react@^18.3` · `react-dom@^18.3` · `react-router-dom@^6` · `zustand@^4` · `@tanstack/react-query@^5` · `i18next@^23` · `react-i18next@^14` · `dexie@^4` · `react-hook-form@^7` · `zod@^3` · `@supabase/supabase-js@^2`

#### Dev (12)

`typescript@^5` · `@types/react@^18` · `@types/react-dom@^18` · `vite@^5` · `@vitejs/plugin-react@^4` · `tailwindcss@^3` · `autoprefixer@^10` · `postcss@^8` · `eslint@^8` · `@typescript-eslint/parser@^7` · `@typescript-eslint/eslint-plugin@^7` · `eslint-plugin-react@^7`

#### Recommended (10)

`eslint-plugin-react-hooks@^4` · `eslint-plugin-import@^2` · `prettier@^3` · `vitest@^1` · `@testing-library/react@^14` · `@testing-library/jest-dom@^6` · `jsdom@^24` · `@playwright/test@^1` · `vite-plugin-pwa@^0` · `workbox-window@^7`

#### Supabase CLI (1)

`supabase@^1` (devDep)

### 13.5 Step 10 · 8 项最终验证

| 验证 | 工具 |
|---|---|
| TypeScript 0 error | `npm run typecheck` |
| ESLint 0 error | `npm run lint` |
| Prettier 0 error | `npm run format:check` |
| Unit test pass | `npm run test` |
| Build 0 error | `npm run build` |
| Dev server 可达 | `npm run dev` |
| Dark theme 强制 | DevTools 切 Light 系统偏好 |
| Fonts 自托管 | DevTools Network 验证无 google fonts 请求 |

---

## 十四、30 项 Bootstrap Checklist

> **逐条验证**：全部 ✅ 才算 Bootstrap 完成。每个 Stage 内已标注对应 `T-M1-XX`。

### 14.1 Step 1 · Platform Pre-requisite（4 项）

- [ ] **B-1.1** GitHub repo `nook` 创建（empty · 无 README）
- [ ] **B-1.2** Supabase project 创建 → 拿到 URL + ANON_KEY + SERVICE_ROLE_KEY
- [ ] **B-1.3** Supabase pg_cron extension 启用
- [ ] **B-1.4** `.env.real` 真实值交付给 AI（不入 git）

### 14.2 Step 2-3 · Vite + Initial Commit（6 项）

- [ ] **B-2.1** Vite + React-TS 脚手架创建（`nook/` 目录）— ⬜ T-M1-01
- [ ] **B-2.2** 默认 scaffold 清理（删除 Vite 默认 App.tsx / *.css，已被覆盖）
- [ ] **B-3.1** `git init` + `git remote add origin` 完成
- [ ] **B-3.2** `git checkout -b main` 完成（默认）
- [ ] **B-3.3** 首次 commit 内容清单 100% 包含（见 § 13.2）
- [ ] **B-3.4** `git push -u origin main` 完成

### 14.3 Step 4 · 11 必需 + 4 推荐配置（15 项）

- [ ] **B-4.1** `package.json`：含 scripts (§ 13.4) + 33 项 deps + `@/` 路径别名 ⬜ T-M1-01
- [ ] **B-4.2** `tsconfig.json`：`strict: true` + `noUncheckedIndexedAccess: true` + `paths: { "@/*": ["./src/*"] }` ⬜ T-M1-01
- [ ] **B-4.3** `tsconfig.node.json`：extends tsconfig.json + Node JSX ⬜ T-M1-01
- [ ] **B-4.4** `vite.config.ts`：React plugin + PWA plugin + `@/` alias + 构建优化 ⬜ T-M1-01
- [ ] **B-4.5** `tailwind.config.ts` + `postcss.config.js`：tokens 注入 + dark mode ⬜ T-M1-02
- [ ] **B-4.6** `.eslintrc.cjs`：`@typescript-eslint/no-explicit-any: error` + `import/no-restricted-paths: error` ⬜ T-M1-01
- [ ] **B-4.7** `.prettierrc` + `.editorconfig` (推荐)：singleQuote + 2 spaces + LF ⬜ T-M1-01
- [ ] **B-4.8** `.gitignore`：node_modules / dist / .env / coverage 等 ⬜ T-M1-01
- [ ] **B-4.9** `.env.example` + `.env` (real)：5 个 VITE_* 变量 ⬜ T-M1-01
- [ ] **B-4.10** `wrangler.toml`：`pages_build_output_dir = "./dist"` ⬜ T-M1-01
- [ ] **B-4.11** `supabase/config.toml`：DB port + auth site_url + verify_jwt + pg_cron ⬜ T-M1-01
- [ ] **B-4.12** `.github/workflows/ci.yml`：typecheck + lint + format + test + build + Lighthouse ⬜ T-M1-06
- [ ] **B-4.13** `.vscode/settings.json` (推荐)：format on save + TS strict
- [ ] **B-4.14** `.vscode/extensions.json` (推荐)：dbaeumer.vscode-eslint + esbenp.prettier-vscode 等
- [ ] **B-4.15** `README.md`：含 5 个 Quick Links + Quick Start + Project Memory + License

### 14.4 Step 5 · 33 项依赖（4 项）

- [ ] **B-5.1** Runtime 11 项安装 ⬜ T-M1-01
- [ ] **B-5.2** Dev 12 项安装 ⬜ T-M1-01
- [ ] **B-5.3** Recommended 10 项安装 ⬜ T-M1-01
- [ ] **B-5.4** Supabase CLI 1 项安装（M3 真正使用）⬜ T-M1-01

### 14.5 Step 6-9 · 4 原子组件 + i18n + Routes（5 项）

- [ ] **B-8.1** `Button.tsx` 实现 + 完全对齐 `prompt/components/Button.spec.md` ⬜ T-M1-05
- [ ] **B-8.2** `Input.tsx` 实现 + 对齐 `Input.spec.md` ⬜ T-M1-05
- [ ] **B-8.3** `Avatar.tsx` 实现 + 对齐 `Avatar.spec.md` ⬜ T-M1-05
- [ ] **B-8.4** `Bubble.tsx` 实现 + 对齐 `Bubble.spec.md` ⬜ T-M1-05
- [ ] **B-9.1** i18next 初始化 + 双语 JSON + 13 路由 + 2 guards ⬜ T-M1-03 + T-M1-04

### 14.6 Final Verification（10 项）

- [ ] **B-V.1** `npm run typecheck` 0 error
- [ ] **B-V.2** `npm run lint` 0 error / warning
- [ ] **B-V.3** `npm run format:check` 0 error
- [ ] **B-V.4** `npm run test` pass
- [ ] **B-V.5** `npm run build` 0 error，含 dist/ 输出
- [ ] **B-V.6** `npm run dev` → 浏览器打开 `http://localhost:5173` 深色渲染
- [ ] **B-V.7** 13 路由全部可达（占位 OK）
- [ ] **B-V.8** Dark theme 强制（系统偏好 Light → 仍 dark）
- [ ] **B-V.9** Fonts 自托管（断网后字体正常，无 fonts.googleapis.com 请求）
- [ ] **B-V.10** i18n 切换 zh-CN / en → UI 文案即时刷新

### 14.7 总计：**30 项**（含 13 项硬性 + 4 项推荐）

> **Bootstrap 完成 = M1 Foundation Done = git tag `v0.4.0`**。

---

## 十五、6 类 Bootstrap Risks

> 全部 6 类 + RAG + 缓解策略。详见 `03_Engineering/Nook-PROJECT-BOOTSTRAP-PLAN.md § 十`。

### 风险矩阵（RAG Heat Map）

| 风险 | 概率 | 影响 | 等级 | 关键缓解 |
|---|---|---|---|---|
| **R-BS-01** ANON_KEY 泄露 | Med | Med | 🟡 | `.env` 不入 git + RLS 兜底 + verify_jwt 默认开 |
| **R-BS-02** 字体自托管失败 | Low | **High** | 🟡 | 从 rsms.me / JetBrains 官网下载；devOptions.enabled=false |
| **R-BS-03** Tailwind tokens 注入失败 | Med | **High** | 🟡 | 显式 `import tokens` + AC.AC.naming grep 验证 |
| **R-BS-04** path alias 不生效 | Low | **High** | 🟡 | tsconfig `paths` + vite `resolve.alias` + ESLint resolver 三处一致 |
| **R-BS-05** CI token 权限不足 | Low | Med | 🟣 | M1 阶段 CI 只 verify（不 deploy）|
| **R-BS-06** Service Worker dev 干扰 | Med | Med | 🟣 | `registerType: 'autoUpdate'` + devOptions.enabled=false |

### 15.1 Critical 2 项（必检）

#### **R-BS-04** Path alias 不生效 → M1 Build 直接失败

**Why Critical**：TypeScript 严格模式 + Vite alias 必须完全一致；不一致 → 100+ 个 import error。

**必检命令**（Step 4 完成后立即跑）：



```bash
npm run typecheck    # 必 0 error
npm run build        # 必 exit 0
```



**验证矩阵**：

| 验证项 | 工具 | 通过条件 |
|---|---|---|
| TS 配置 | `npm run typecheck` | 0 error |
| ESLint resolver | `npm run lint` | 0 error |
| Vite alias | `npm run build` | 0 error |

#### **R-BS-02** 字体自托管失败 → AC.AC.fonts 不通过

**Why Critical**：SPEC UI-5 + AC.AC.fonts 硬禁 Google Fonts；字体缺失是断网时立即可见。

**必检命令**（Step 10 完成后立即跑）：



```bash
# 1. 字体文件存在检查
ls public/fonts/inter/*.woff2
ls public/fonts/jetbrains-mono/*.woff2

# 2. DevTools Network 检查
#    打开浏览器 → F12 → Network → 过滤 .woff2 → 确认 sources = localhost

# 3. 断网测试
#    关闭网络 → 刷新页面 → 字体仍渲染正确
```



**每个字体 2 个权重**：

- Inter: 400 (Regular) + 600 (SemiBold)
- JetBrains Mono: 400 (Regular) + 700 (Bold)

### 15.2 验证矩阵（完整）

| 验证项 | 工具 | 通过条件 |
|---|---|---|
| TS 严格 0 error | `npm run typecheck` | exit 0 |
| ESLint 0 error | `npm run lint` | 0 error + warning |
| Prettier 0 error | `npm run format:check` | 无 diff |
| Build 成功 | `npm run build` | exit 0，含 dist/ |
| Unit test 通过 | `npm run test` | pass |
| 4 原子组件渲染 | `npm run dev` + 浏览器 | prop variants 正常 |
| 13 路由可达 | `curl http://localhost:5173/<route>` | 200 或路由占位 |
| i18n 切换 | 手动切换 zh-CN / en | UI 文案即时刷新 |
| Dark theme | 系统偏好 Light | Nook 仍 dark |
| 字体自托管 | DevTools Network | 无 Google fonts 请求 |

---

## 十六、路线图（Roadmap）

### 16.1 版本节拍

| 版本 | 节拍 | 主要目标 | 起步 |
|---|---|---|---|
| **MVP · Stage 8.1 已完成** | 文档完工 | 6 个文档冻结 + 工作流 + 记忆 | 2026-06-25 → 2026-06-27 |
| **V1.0 (M1-M7)** | 4–6 周 | 5 个朋友「进得来、发得出、看得见」 | 2026-06-27 → 当前 |
| **V1.1** | 2–3 周 | Ambient · 6 emoji 反应 · Typing 精修 · Sentry 收口 | V1.0 后 |
| **V1.2** | 2–3 周 | `(edited)` 印记 · 时间分组 · 应用内未读文案 · 断网重连 | V1.1 后 |
| **V2.0** | 视需求 | E2EE + 自托管可选 + 原生 App 壳 | 朋友显式请求 / KI-4 实际发生 |

### 16.2 v1.0 阶段任务清单（M1-M7 · 55 Task）



```
M1 Foundation ──→ M2 Auth Flow ──→ M3 Chat Core ──→ M4 Realtime
     (6)              (7)              (8)              (8)
     v0.4.0           v0.5.0           v0.6.0           v0.7.0
                                                       │
                                                       ▼
                       M5 Edge Cases ──→ M6 Admin ──→ M7 Polish & A11y
                            (9)           (7)            (10)
                            v0.8.0        v0.9.0         v1.0.0
```



---

## 十七、已知问题（Known Issues）

> 7 项 KI + 4 项 deferred FU。详见 `03_Engineering/KNOWN_ISSUES.md`。

### 17.1 7 KI

| ID | 等级 | 描述 | 修复 |
|---|---|---|---|
| **KI-1** | 🟡 | Supabase Storage 6-8 月逼近 | v1.1 准备迁 R2 |
| **KI-2** | 🟢 | Web Push 在大陆 Chrome 无 FCM | **已规避**（永不放 push）|
| **KI-3** | 🟢 | 30 天 TTL 含已撤回占位 | SPEC § 7 决策 |
| **KI-4** | 🟠 | Supabase 单厂商故障风险 | v2.0+ 自托管可选 |
| **KI-5** | 🟢 | Owner 自删入口未在 v1.0 暴露 | 设计如此 |
| **KI-6** | 🟢 | Light mode 强禁 | Never-Do |
| **KI-7** | 🟢 | Friend 重邀请产生新 user_id | 设计如此 |

### 17.2 4 FU Deferred（v1.1+ 决策）

| ID | 描述 | 解锁 |
|---|---|---|
| **FU-1** | Web Push 永远不放 | v1.0.1 patch 已删 |
| **FU-2** | 多语 (ja-JP+) | 加 i18n locale 即可 |
| **FU-3** | Active friend 重邀请边缘 | v1.1+ 加 `AC.SEC.06b` |
| **FU-4** | Owner 自删 tombstone + 孤儿态 | v1.1+ 加 Edge Function |

---

## 十八、附录（Appendix）

### 18.1 F-ID 索引（41 个 · 9 大域）

| 域 | F-ID |
|---|---|
| **AUTH** (10) | F-AUTH-01..10 |
| **CONV** (5) | F-CONV-01..05 |
| **MSG** (11) | F-MSG-01..11 |
| **MEDIA** (1) | F-MEDIA-01 |
| **ST** (3) | F-ST-01..03 |
| **NOTIF** (3) | F-NOTIF-01..03 |
| **SEC** (6) | F-SEC-01..06 |
| **UI** (5) | F-UI-01..05 |
| **I18N** (3) | F-I18N-01..03 |
| **总计** | **41 F-ID** |

### 18.2 AC 验收标准（28 条）

| AC | 覆盖 |
|---|---|
| AC.01-03 | 注册 / 登录 + Friend 加入 |
| AC.04-17 | 1:1 聊 / Typing / display_name / 引用 / 编辑 / 撤回 / 删除 / 在场 / 未读 / 头像 / 群 8 / TTL / 重置密码 / 离线 |
| AC.18 | 删 friend 输 confirm |
| AC.AC.rls | RLS 全表 |
| AC.AC.motion | reduced-motion |
| AC.AC.pwa | PWA 可安装 |
| AC.AC.fonts | 字体自托管 |
| AC.AC.i18n | 双语 + ICU plural |
| AC.AC.naming | 0 业务代码裸 hex |
| AC.AC.perf | LCP ≤ 1.5s |
| AC.AC.dark | 全路由深色 |
| AC.AC.responsive | 4 断点不崩 |
| AC.AC.i18n.lite | UI 字符串 i18n 覆盖率 |
| AC.AC.30day.cap | 30 天消息非永久 |

### 18.3 术语表（Glossary）

| 术语 | 含义 |
|---|---|
| **SoT** | Single Source of Truth（单一可信源）= `01_Product/Nook-SPEC.md` |
| **ADR** | Architecture Decision Record（架构决策记录）|
| **CAP** | API Capability（接口能力）|
| **F-ID** | Functional ID（功能 ID）= `F-<DOMAIN>-<NN>` |
| **AC** | Acceptance Criteria（验收标准）|
| **BF** | Business Flow（业务流程）|
| **DR** | Data Requirement（数据需求）|
| **DoR** | Definition of Ready（开发前就绪）|
| **DoD** | Definition of Done（完成定义）|
| **M1-M7** | Foundation → Auth → Chat → Realtime → Edge Cases → Admin → Polish |
| **WBS** | Work Breakdown Structure（工作拆分结构）|
| **RLS** | Row Level Security（行级安全）|
| **pg_cron** | Postgres 内置定时调度 |
| **EF** | Edge Function（边缘函数，Deno runtime）|
| **TTV** | Time To First Byte |
| **LCP** | Largest Contentful Paint（最大内容绘制）|

### 18.4 文档索引（22 文件 · 23 spec/adr）

| 类别 | File | 路径 |
|---|---|---|
| **SoT（5）** | | |
| | 01_Product/Nook-SPEC.md v1.0.1 | spec/ |
| | 01_Product/Nook-PRODUCT.md | prompt/ |
| | 01_Product/Nook-DESIGN.md + tokens | prompt/ |
| | 02_Architecture/Nook-ARCHITECTURE.md（legacy） | spec/ |
| | 01_Product/Nook-INTERVIEW-spec.md | prompt/ |
| **权威架构/设计（6）** | | |
| | 02_Architecture/Nook-ARCH-DESIGN-v1.0.md | spec/ |
| | 02_Architecture/Nook-DATA-MODEL.md v1.0.1 | spec/ |
| | 02_Architecture/Nook-API-DESIGN-v1.0.md | spec/ |
| | 03_Engineering/Nook-PROJECT-STRUCTURE.md | spec/ |
| | 03_Engineering/Nook-CODING-STANDARDS.md | spec/ |
| | 03_Engineering/Nook-WORK-BREAKDOWN.md | spec/ |
| **项目记忆（7）** | | |
| | 03_Engineering/AI_HANDOVER.md | docs/ |
| | 03_Engineering/DEVELOPMENT_LOG.md | docs/ |
| | 03_Engineering/CHANGELOG.md | docs/ |
| | 03_Engineering/TODO.md | docs/ |
| | 03_Engineering/KNOWN_ISSUES.md | docs/ |
| | 03_Engineering/DECISIONS.md | docs/ |
| | 03_Engineering/ROADMAP.md | docs/ |
| **ADR（20+1）** | | |
| | README + ADR-001..020 | docs/adr/ |
| **规范配套（4）** | | |
| | 03_Engineering/Nook-GIT-WORKFLOW.md | spec/ |
| | 03_Engineering/Nook-PROJECT-BOOTSTRAP-PLAN.md | spec/ |
| | 01_Product/Nook-SPEC-FREEZE.md / 01_Product/Nook-SPEC-FREEZE-v1.0.1.md | spec/ |
| | STARTUP-MANUAL.md（本文 ⭐）| spec/ |
| **原始存档（5）** | | |
| | Nook-DESIGN-TOKENS.{ts,css,json,md} | spec/ |
| | 4 组件 .spec.md | prompt/components/ |

### 18.5 关键数字一览

| 数字 | 值 | 说明 |
|---|---|---|
| F-ID 数 | 41 | 9 大功能域 |
| BF-ID 数 | 18 | 业务流程 |
| AC 数 | 28 | 验收标准 |
| CAP 数 | 25 | API 能力 |
| DR 数 | 11 | 数据需求 |
| ADR 数 | 22 | 决策记录 |
| 路由数 | 13 | 页面规格 |
| 实体数 | 13 | 业务模型 |
| Edge Functions | 6 | 含 1 internal cron |
| pg_cron Jobs | 3 | daily jobs |
| 4 原子组件 | Button / Input / Avatar / Bubble | Design System |
| Epic 数 | 8 | 业务域 |
| Milestone 数 | 7 | M1-M7 |
| **Task 数** | **55** | WBS |
| Checklist 项数 | 30 | 验证项 |
| Risk 数 | 6 | Bootstrap |
| Spec v 版本 | **v1.0.1** | 含 FU-1/FU-2 patch |
| 代码 v 版本 | `0.3.7` (文档阶段) → `v0.4.0` (M1) → `v1.0.0` (M7) | semver |
| 总 Session 数 | 17 | S0.0 → S16.0 → 当前 |

### 18.6 Never-Do 硬边界（产品决策 · 永不延期）

> 任何"主流 IM 有，Nook 没"的功能进入 SPEC 前必须过 `Nook-PRODUCT § 2` 反模式清单。

- ❌ **已读回执**（v1.0 引入 = 背叛"无压力"核心价值）
- ❌ **语音消息 / 语音通话 / 视频通话**（产品定位纯文字）
- ❌ **Sticker Market / 表情包商店**（品牌失守）
- ❌ **朋友圈 / 动态墙 / 个人主页**（社交媒体不是 Nook）
- ❌ **群公告 / 群待办 / 群管理工具**（拒绝组织化）
- ❌ **加好友二维码 / 通讯录导入**（邀请制是入口）
- ❌ **多设备登录管理 / 设备列表**（单设备情感强制）
- ❌ **红包 / 支付**（商业化）
- ❌ **白天模式 / 换肤 / light mode 切换**（深色 = 进入黑夜心智）
- ❌ **Web Push / 系统通知 / Email 通知**（零噪音定位）
- ❌ **Email 验证邮件 / Email 通知邮件**（无邮件基础设施）
- ❌ **隐身模式**（请打开，不要回避）
- ❌ **"最后在线时间"显示**（不评论在场度）

---

## 19 · 1 页速查卡（One-Page Cheat Sheet）

> 印刷 / 贴墙 用。**核心信息密度最大化**。

### 19.1 Nook v1.0 一页速查



```
┌─────────────────────────────────────────────────────────────┐
│   Nook v1.0 · 你的朋友和你之间的私人小房子                    │
│   ─────────────────────────────────────────────────────────  │
│   4-6 周单人 MVP  |  Owner + ≤ 20 密友  |  永久免费 3 层部署  │
└─────────────────────────────────────────────────────────────┘

   Stack (32 deps)
   ──────────────────────────────────────────────────
   FE  │ React 18 · Vite 5 · TS · Tailwind · i18next
   BE  │ Postgres 15 (RLS) · Supabase Auth · Realtime
       │ Storage · Edge Functions (Deno) · pg_cron
   Ops │ CF Pages + Supabase + R2 fallback
   Tools│ Sentry (PII off) · LogSnag · GitHub Actions
   Fonts│ 自托管 Inter + JetBrains Mono WOFF2 (no Google)

   Never-Do (13)
   ──────────────────────────────────────────────────
   ❌已读 · ❌语音/视频 · ❌表情包 · ❌朋友圈 · ❌群公告
   ❌二维码加好友 · ❌多设备 · ❌红包 · ❌Light mode
   ❌Web Push · ❌邮件 · ❌隐身 · ❌最后在线时间

   7 Milestone · 55 Task
   ──────────────────────────────────────────────────
   M1 Foundation (6) ─→ M2 Auth (7) ─→ M3 Chat (8)
   ─→ M4 Realtime (8) ─→ M5 Edge (9) ─→ M6 Admin (7)
   ─→ M7 Polish & A11y (10) ─→ v1.0.0 ✅

   Bootstrap · 10 Step
   ──────────────────────────────────────────────────
   1. Project Lead: GitHub repo + Supabase project
   2. `npm create vite@latest nook -- --template react-ts`
   3. `git init` + initial commit (30+ files)
   4. 11 configs (tsconfig/vite/eslint/tailwind/wrangler/...)
   5. `npm install` (33 deps)
   6. 40+ directories in src/
   7. Tailwind tokens injection
   8. 4 atomic components (Button/Input/Avatar/Bubble)
   9. i18n + 13 routes + 2 guards
  10. CI + dark + fonts + 8 verifications

   Quality Gate 3 Levels
   ──────────────────────────────────────────────────
   L1 Code Quality   │ ts/lint/format/test/build 0 error
   L2 Feature Quality│ 符合 SPEC + UI + 4断点 + LCP ≤ 1.5s
   L3 Engineering    │ docs/ 5 docs updated

   AI 12 Step Pipeline
   ──────────────────────────────────────────────────
   AI_HANDOVER → DEV_LOG → TODO → 目标确认 → 开发
   → 完成 → 5 docs 更新 → 总结
```



---

## 结束语

本文档是把 Nook v1.0 全部 16 个设计/文档阶段 + 55 Task + 30 Bootstrap Checklist + 6 Risks + AI 12 步 流水线整合为一份**自包含**手册。当 Nook v1.0 真正完成 M1-M7 代码开发时，本手册本身的 `v1.0` Work Complete 标记将转为 Confirmed。

**使用建议**：

- 📖 **重新接手 Nook**：读 § 一 → § 三（16 阶段清单）→ § 五（ADR 一览）→ § 十一（55 Task 速览）
- 🚀 **Bootstrap 新项目**：读 § 十三（10 步）→ § 十四（30 Checklist 逐条）
- ✅ **Quality Review**：读 § 十五（6 Risks）→ § 二十（Never-Do）+ § 九（L1/L2/L3 Quality Gate）
- 🧭 **路线决策**：读 § 十六（路线图）→ § 十七（KI / FU）

---

> **END · Nook v1.0 Project Startup Manual** · 2026-06-27 · Frozen
> Stub: Stored at `STARTUP-MANUAL.md` (Markdown). To produce PDF: install MiKTeX or wkhtmltopdf, then `pandoc STARTUP-MANUAL.md -o manual.pdf`.
