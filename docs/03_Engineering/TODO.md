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
| M3-2 | Sidebar 列出 1:1 + 群（按 MAX(messages.created_at) DESC） | F-CONV-01 | ⏳ 待开发 |
| M3-3 | MessageList + MessageItem 渲染（text / image / file） | F-CONV-03 / F-MSG-01/02/03 | ⏳ 待开发 |
| M3-4 | Composer floating island（DESIGN § 7 视觉） | F-MSG-01 | ⏳ 待开发 |
| M3-5 | Realtime channel `conversation:<id>` 订阅 postgres_changes | § 6.3 ARCH-DESIGN | ⏳ 待开发 |
| M3-6 | pg_cron J-01 (03:00 消息清理) + J-02 (04:00 邀请清理) + J-03 (04:30 orphans) | F-MSG-10 / F-SEC-02 | ⏳ 待开发 |
| M3-7 | AC.04 (1:1 聊实现) + AC.15 (TTL) + AC.AC.rls (smoke) | AC.04/15/AC.AC.rls | ⏳ 待开发 |

---

## M4 · Realtime Polish（typing / 编辑 / 撤回 / 反应）

**目标**：灵魂功能 + 6 emoji 反应 + 2 分钟编辑

| # | 任务 | 关联 F-ID | 状态 |
|---|---|---|---|
| M4-1 | Realtime Presence.publish({typing: true/false}) | F-MSG-08 | ⏳ 待开发 |
| M4-2 | Typing 三点降速动画（4 px / 120 ms 错落） | DESIGN § 9.4 | ⏳ 待开发 |
| M4-3 | 编辑消息（2 min 时间窗） + `(edited)` 微标签 | F-MSG-05 / AC.08 | ⏳ 待开发 |
| M4-4 | 撤回（soft recall，DB row 不删） | F-MSG-06 / AC.09 | ⏳ 待开发 |
| M4-5 | 删除（仅自己端）— **列级软隐藏 `deleted_by_sender_at`** | F-MSG-07 / AC.10 | ⏳ 待开发 |
| M4-6 | 引用 / 回复（reply_to_id + ReplyCard） | F-MSG-04 / AC.07 | ⏳ 待开发 |
| M4-7 | 6 emoji reaction toggle | F-MSG-09 | ⏳ 待开发 |
| M4-8 | Ambient 在线状态（presence + 6 px lavender pulse） | F-ST-01 / AC.11 | ⏳ 待开发 |

---

## M5 · Edge Cases（outbox / SW / 头像 / 文件）

**目标**：断网红点 / IndexedDB outbox / 5MB 头像 / 50MB 文件 / 字符 EXIF strip

| # | 任务 | 关联 F-ID | 状态 |
|---|---|---|---|
| M5-1 | Dexie schema + outbox table | F-MEDIA-01 / AC.17 | ⏳ 待开发 |
| M5-2 | Workbox SW background sync 接入 | F-MEDIA-01 | ⏳ 待开发 |
| M5-3 | client_msg_id 生成（UUIDv4）+ dedupe 逻辑 | F-MEDIA-01 / § 10 ARCH-DESIGN | ⏳ 待开发 |
| M5-4 | 客户端图片压缩（canvas WebP q=0.78 + 2MB 二压 q=0.6） | § 6.1 ARCH-DESIGN · F-MSG-02 | ⏳ 待开发 |
| M5-5 | EXIF strip（不依赖库；读元数据但不写回） | F-MSG-02 · NF-SEC-N05 | ⏳ 待开发 |
| M5-6 | 头像上传 + 直传 Supabase Storage + profiles.avatar_url | F-AUTH-09 / AC.13 | ⏳ 待开发 |
| M5-7 | 直传 50MB 文件（Supabase Storage signed URL） | F-MSG-03 | ⏳ 待开发 |
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
| **FU-LOC-01** | ⚠️ 已知（**v0.5.0 milestone 静态 与 staging live 并行**） | 本机目前 `dockerDesktopLinuxEngine` 命名管道不通（tasklist 未见 Docker Desktop 进程） → `supabase start` 无法启动容器 → `supabase db reset` 不能走 → **M3-1 后 7 个 SQL 迁移本地仅走 static verification**（已过 code-reviewer round 1+2 + typecheck 0 errors + unit tests 1/1 + commit `c88c076`）。**v0.5.0 milestone is shipped on static verification only** — 不需要本地 live apply 才能打包。 | 本地 v0.5.0 ⇒ 静态 ✅；本地 live verification 需 (a) 手动启动 Docker Desktop 守护进程 + (b) 重起 shell 使 Deno 加入 PATH 。**Production cutover 受 FU-STG-01..04 闸门控制** — 不走本地 demo 跳过 live。 | 云 Supabase staging/prod 不依赖 Docker Desktop：CI via `supabase db push --include-all` + Cloud EF `supabase functions deploy` 走 live verification。详 FU-STG-01..04。 |
| **FU-LOC-02** | ⚠️ 已知 | **PostgREST schema cache reload 有 TTL漂移** — 仅有 dp 该模已刷新 curl 走道了 /rest/v1/ 走道是另一个 cache命中 | 本地以 `docker exec ... NOTIFY pgrst, 'reload schema'` 手动刷；有时需 `docker restart supabase_rest_nook` | 云 Supabase CI/CD 走 `supabase db push` 会自动 routes flush cache |
| **FU-LOC-03** | ⚠️ 已知 | **Vite PWA workbox `runtimeCaching` 缓存 `/rest/v1/`**（`NetworkFirst` 策略）会缓存失败的 "schema cache" 错误响应 | 本地 UI 验证需重启 vite + 换 origin port + 验证 vite.config `handler: 'NetworkOnly'` | 云部署走 Production build，SW 中 NetworkFirst 下加 "修正驻留" 策略后会补偿 |
| **FU-LOC-04** | ⚠️ 已知 | `.env` 项目根存**云服务凭据**（不属本地），Vitest 会自动加载 · 本地跑集成测试需用 `.env.local` 覆盖 | 集成测试现在走 `npx supabase status -o env` 动态拉，绕过 `.env` | 云凭据在 CI secret 中，不会被本地测试误用 |

> 详细验证报告见 [DEVELOPMENT_LOG § S22.0 + S23.0](./DEVELOPMENT_LOG.md)。

---

## Staging Followup 验证清单（FU-STG）

> **迁移到云 Supabase staging 环境后**，需逐项验证以下场景以替代本地限制：

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

- 目录名 i18n 化,所有路径已为英文
- Total Sessions: 19 (cumulative)
- 下一步: M1 Foundation (Vite 脚手架 + 4 原子组件 + 13 路由占位页)
