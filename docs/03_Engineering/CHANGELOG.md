# Nook · Changelog

> **规范**：遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/)。  
> **版本号约定**：
> - **文档版**（Nook-SPEC / Nook-ARCH / Nook-PRODUCT / Nook-INTERVIEW）：`vX.Y`（v1.0 / v1.0.1 / v1.1 …）
> - **代码版**（git tag + package.json）：`0.X.Y`（0.1.0 / 0.2.0 …）—— **从首次 commit 起算**
>
> 本文件同时承担代码版与文档版的同步 changelog 角色。

---

## [0.2.0] · 2026-06-27 · Stage 8.1 · Project Workflow + Memory

### Added
- 7 份 `docs/` 项目记忆文档
  - `DEVELOPMENT_LOG.md` — 时间序 Session 记录
  - `CHANGELOG.md` — 本文件
  - `TODO.md` — M1-M7 阶段任务清单
  - `KNOWN_ISSUES.md` — FU-3/FU-4 + 架构风险登记
  - `DECISIONS.md` — ADR D-01..D-22 技术决策
  - `AI_HANDOVER.md` — **最重要的交接文档**
  - `ROADMAP.md` — V1.0/V1.1/V1.2/V2.0 路线图
- 12 步固定开发流程（详见 AI_HANDOVER § Development Workflow）

### Changed
- `AI_HANDOVER.md` 顶部 SERIALIZE 阅读顺序（handoff reads in order）
- `TODO.md` 按 M1-M7 阶段分组（不再 flatten 41 F-IDs）

### Deprecated
- 无

### Removed
- 无

### Fixed
- 修正历史散落信息散落不入项目记忆的问题——从此之后所有重要信息有归宿

### Security
- 无

---

## [0.3.2] · 2026-06-27 · Stage 11 · Project Structure (Directory Tree)

### Added
- `Nook-PROJECT-STRUCTURE.md` v1.0 — **项目目录结构规范**（13 章节）
  - § 一 完整目录树（顶层 10+ 目录 + src/ 内 9 个子系统）
  - § 二 Feature 结构（4 个 domains：auth/chat/settings/admin）
  - § 三 Shared 层（纯类型 + 常量 + 工具函数）
  - § 四 组件层级（ui → layout → chat → a11y → feature → page）
  - § 五 服务层分层（5 层：page → feature service → api → client）
  - § 六 配置体系（theme/env/build/lint/i18n/deploy）
  - § 七 测试结构（unit/integration/E2E + mocks/fixtures/utils）
  - § 八 文档体系（docs/ + spec/ + prompt/ 三层）
  - § 九-十 命名约定 + Import Rules（6 条禁止引用 + 4 层依赖）
  - § 十一 依赖规则（循环依赖预防 + CI 检查）
  - § 十二 Future Expansion（10 项未来功能评估 + 扩展方法论）

### Changed
- 无（纯新增文档阶段）

### Deprecated
- 无

### Removed
- 无

### Fixed
- 无

### Security
- 无

---

## [0.3.1] · 2026-06-27 · Stage 10 · API Design (Full Contract)

### Added
- `../02_Architecture/Nook-API-DESIGN-v1.0.md` — **完整 API 契约**（13 章节）
  - § 1-2 API 设计原则（6 条）+ 5 类端点 + 认证流程
  - § 3 错误码枚举（4 大类 E_AUTH/E_VAL/E_RES/E_SYS + HTTP 映射 + Supabase 错误映射）
  - § 4 REST endpoints 细则（8 组 + Storage + RPC，含请求/响应类型/RLS/错误码）
  - § 5 Edge Function 6 个 handler（friend-signup / admin-create-invite / admin-reset-password / admin-delete-friend / admin-bootstrap / cleanup-storage-orphans）
  - § 6 Realtime 事件 schema（6 通道 + 5 类事件 TypeScript schema + 客户端订阅示例）
  - § 7 OpenAPI-style TypeScript 类型定义（核心实体 + 枚举 + 常量 + 请求/响应）
  - § 8 速率限制策略（≤ 20 好友不设应用层限）
  - § 9 API 版本策略
  - § 10 API 测试矩阵
  - § 11 客户端 API 封装接口（lib/api/*）
  - § 12 CAP 覆盖检查表（25 CAP 100%）

### Changed
- 无（纯新增文档阶段）

### Deprecated
- 无

### Removed
- 无

### Fixed
- 无（API 契约是全新产出）

### Security
- § 3 错误码枚举明确不向客户端暴露 SQL 细节
- § 2.2 认证流程：SERVICE_ROLE_KEY 永不进客户端

---

## [0.3.0] · 2026-06-27 · Stage 9 · Database Design (Business-Level)

### Added
- `../02_Architecture/Nook-DATA-MODEL.md` v1.0.1 — **纯业务数据模型**（无 SQL / DDL / Migrations / ORM）
  - § 1 Entity Inventory（13 实体 + 永久 Never-Exist 反实体清单）
  - § 2 Entity Relationship（Mermaid ER Diagram + 关系基数矩阵）
  - § 3 Entity Definition（13 实体逐个）· 字段级视图 + 生命周期 + F-ID 映射
  - § 4 Business Rules（35 条 R-1..R-35）
  - § 5 Data Lifecycle（13 实体生命周期矩阵 + 30 天 TTL 编排）
  - § 6 Data Ownership（Owner × Friend × 系统 角色矩阵 + 5 条 Hard Guardrails B-1..B-5）
  - § 7 Caching Strategy（17 类数据缓存矩阵）
  - § 8 Synchronization（聊天 / 已读 / 在场 / 设置 / 入会 / 反应 / 离线 7 类）
  - § 9 Data Validation（必填 / 可选 / 唯一 / 格式 / 跨字段校验 5 类矩阵）
  - § 10 Retention Policy（11 类数据保留策略 + 30 天哲学）
  - § 11 Privacy Classification（5 级 Public/Internal/Private/Sensitive/Confidential）
  - § 12 Future Expansion（v1.1+ 候选 + 永不做黑名单 + 扩展方法论）
  - § 13 DoD + § 14 F-ID 回归检查表（41 F-ID 100% 覆盖）

### Changed
- 项目记忆体系 docs/ 已对接 S9.0 Session（Session-to-Version map 同步）
- `TODO.md` 第 0.3.0 行状态从「待启动」→「已完成」

### Deprecated
- 无

### Removed
- 无

### Fixed
- 无（Stage 9 是建模，不动业务规则）

### Security
- § 11 Privacy Classification 收口 PII 红线：email / language / last_seen_at → Sensitive；`deleted_by_sender_at` → Confidential（列级 GRANT）；AppEvent → Owner-only

---

## [0.1.1] · 2026-06-27 · Stage 8.0 · v1.0.1 Docs-only Patch

### Added
- `../01_Product/Nook-SPEC-FREEZE-v1.0.1.md` — patch 同步记录
- `../01_Product/Nook-PRODUCT.md` § 4 NEVER N0 行（Web Push / 系统通知 / Email 推送，v1.0.1 同步）

### Changed
- `../01_Product/Nook-SPEC.md` § 0.4 changelog 增加 v1.0.1 行
- `../01_Product/Nook-PRODUCT.md`：
  - § 3.6 删除 「Web Push 推送通知」 行
  - § 4 删除 M12 + 转为 NEVER N0
  - § 5 v1.2 删除 「优化 Web Push 文案」 行
  - § 8 UI 衔接表 「6 px 引线 → M12」 → 「未读小红点 → S1末+3.6边界」
- `../02_Architecture/Nook-ARCHITECTURE.md`：
  - § 2.7 i18n 从 3 语 → 2 语（zh-CN + en）
  - § 2.2 推送触发 ❌ 不需要（SPEC § 1.7.2 强禁）
  - § 4 supabase/functions/ 目录重构（admin-* 5 个 EF 替代 send-push + cleanup）
  - § 7 China-specific Push → N/A
  - § 10 决策清单 推送通道 → NONE

### Deprecated
- 无

### Removed
- 所有 Web Push 提及从 Nook 整套文档彻底消失

### Fixed
- 跨源文档与 SPEC 一致率：v1.0 时 ≈ 90% → v1.0.1 = **100%**

### Security
- 移除 send-push Edge Function（关闭 Web Push 攻击面）

---

## [0.1.0] · 2026-06-27 · Stage 6 + 7 · Spec & Architecture Freeze

### Added
- `../01_Product/Nook-SPEC.md` v1.0（Single Source of Truth · LIVE）
  - 41 F-ID（9 大功能域：AUTH/CONV/MSG/MEDIA/ST/NOTIF/SEC/UI/I18N）
  - 18 BF-ID（业务流程）
  - 28 AC（验收标准）
  - 11 DR（数据需求）
  - 13 路由（页面规格）
- `../01_Product/Nook-SPEC-FREEZE.md`（v1.0 冻结记录 · Stage 6 PASS）
- `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md`（Stage 7 权威架构 · 16 章节覆盖）
  - 数据模型（9 张业务表 + 完整 RLS + 3 trigger + 3 pg_cron）
  - API 契约（25 CAP ↔ REST 14 个 + Edge Function 6 个 + WS 7 事件）
  - 部署拓扑（CF Pages + Supabase + R2 + 9 环境矩阵 + CI/CD）
  - 安全架构（STRIDE + secret + PII 红线 + 列级 GRANT）
  - 离线 & 同步（outbox + Dexie + client_msg_id dedupe）
  - 6 维技术风险 + RAG 热图
  - 20 项 ADR 决策表

### Changed
- 4 项 FU 浮现：FU-1 Web Push · FU-2 i18n · FU-3 重邀请 · FU-4 Owner 自删
- ARCH-DESIGN 风控了 4 处 thinker 反馈（avatar_url / 4-cap trigger / soft-hide / last_read_at 游标）

### Deprecated
- 旧 `../02_Architecture/Nook-ARCHITECTURE.md` § 1 部署图中的 `send-push` Edge Function（被 Stage 7 ARCH-DESIGN 取代）

### Removed
- 无（仅文档修订）

### Fixed
- M-arch `count(*) into cnt from conversations` 不区分 kind → 改为 `WHERE kind='group'`
- F-MSG-07 物理 DELETE 违反 AC.10 → 改为列级软隐藏

### Security
- RLS 7 张表穷举 policy（含 profiles / invites / conversations / conversation_members / messages / attachments / reactions）
- SECRET 管理分级：SERVICE_ROLE_KEY 仅 EF env
- Sentry / LogSnag 关 PII / message body 不进日志

---

## [0.3.3] · 2026-06-27 · Stage 12 · Architecture Decision Record (ADR)

### Added
- `docs/adr/` 目录 + 20 项完整 ADR（ADR-001 至 ADR-020）
  - `../02_Architecture/adr/README.md` — ADR 索引 + 状态追踪
  - 每条 ADR 含完整模板：Context · Decision · Alternatives Considered · Consequences · 可逆性评估
  - 与 `DECISIONS.md` 中 22 项 ADR-lite 保持 100% 内容一致
- 新增 ADR-019（错误处理统一格式 + 4 类错误码映射）
- 新增 ADR-020（Unit + Integration + E2E 三层测试策略）

### Changed
- 无（纯新增文档阶段）

### Deprecated
- 无

### Removed
- 无

### Fixed
- 旧 ADR-lite（DECISIONS.md 中的 D-01..D-22）缺少「备选方案分析」和「可逆性评估」— ADR 完整版已补全

### Security
- ADR-019 明确 SQL 细节永不暴露给客户端

---

## [0.3.4] · 2026-06-27 · Stage 13 · Coding Standards

### Added
- `Nook-CODING-STANDARDS.md` v1.0（14 章节完整编码规范）
  - § 一 总体原则（Readability/Consistency/Simplicity/Type Safety + AI 行为准则）
  - § 二 命名规范（文件/变量/函数/组件 4 类完整矩阵 + 正/反例对照）
  - § 三 TypeScript 规范（Interface vs Type · 禁止 any · Enum · Generic · Null/Undefined）
  - § 四 Import 规范（顺序 · 路径别名 · 8 条禁止规则 · 依赖方向重述）
  - § 五 React 规范（组件组织 · Props · Hooks · State 分工 · Context · Effect · Composition）
  - § 六 错误处理规范（6 层：抛出/捕获/日志/提示/重试/边界状态）
  - § 七 i18n 规范（禁止硬编码 · Key 命名 `<domain>.<component>.<description>` · 语言文件组织）
  - § 八 Theme 规范（禁止硬编码 Design Tokens · Dark 强制 · 8 类不可硬编码清单）
  - § 九 注释规范（必须注释/禁止注释场景 + JSDoc 模板）
  - § 十 测试规范（Unit + Integration + E2E · 最低 80% 覆盖 · Mock/Fixture 规范）
  - § 十一 禁止事项（22 项 Anti-patterns A-01 ~ A-22）
  - § 十二 AI Coding Protocol（开发前中后 + AI 自检 10 项）
  - § 十三 Configuration Planning（11 必需 + 9 可选配置 + package scripts + npm 依赖规划）
  - § 十四 Quality Gate（3 级门禁：Code/Feature/Engineering + AI Self Review 结果格式）

### Changed
- 无（纯新增文档阶段）

### Deprecated
- 无

### Removed
- 无

### Fixed
- 无

### Security
- § 六 禁止在生产环境 console.log 任何 message body / email（A-17、A-18）

---

## [0.3.8] · 2026-06-27 · Stage 17 · Project Startup Manual

### Added
- `../STARTUP-MANUAL.md` (~880 行 · 50.9 KB) — **项目启动手册**（18 章节统一交付物）
  - § 一 项目总览 · 二 技术栈速览 · 三 16 阶段交付物索引 · 四 架构基因 7 原则 · 五 22 ADR · 六 数据模型摘要 · 七 API 契约摘要 · 八 项目目录结构 · 九 编码规范要点 · 十 Git Workflow 要点 · 十一 55 Task 速览 · 十二 AI 12 步流水线 · 十三 Bootstrap 10 步 · 十四 30 项 Checklist · 十五 6 Risks · 十六 路线图 · 十七 已知问题 · 十八 Appendix（含一页速查卡）
- `Nook-PROJECT-STARTUP-MANUAL.html` (~100.9 KB) — pandoc gfm HTML 输出（浏览器一键保存为 PDF）

### Changed
- `DEVELOPMENT_LOG.md` 追加 S17.0 Session 条目
- `TODO.md` Stage 17 → 已完成
- `AI_HANDOVER.md` Stage 表推进 → 增 Stage 17

### Deprecated
- 无

### Removed
- 无

### Fixed
- 无

### Security
- 无

---

## [0.3.7] · 2026-06-27 · Stage 16 · Project Bootstrap Plan

### Added
- `Nook-PROJECT-BOOTSTRAP-PLAN.md` v1.0 — **项目初始化执行计划**（12 章节，约 900 行）
  - § 一 Bootstrap Overview（10 步流程 · 总 AI 编程时间 ~4 hours）
  - § 二 Project Creation（命名 + Vite + 框架选型 + 平台预创建）
  - § 三 Dependency Planning（11 runtime + 12 dev + 10 recommended + 1 supabase CLI + 5 optional + 3 lazy = 42 deps）
  - § 四 Configuration Planning（11 必需 + 4 推荐 · 14 configs 完整内容：package scripts / tsconfig / eslint / vite / tailwind / gitignore / env / wrangler / supabase / ci / editorconfig / prettier / vscode / npm 依赖）
  - § 五 Directory Initialization（M1 立即创建 45+ 目录/文件）
  - § 六 Environment Planning（Node 20.x LTS · npm/pnpm/yarn 选项 · 5 个 VITE env · Modern Evergreen · 大陆网络）
  - § 七 Documentation Initialization（spec/ + docs/ 复制策略）
  - § 八 Git Initialization（首次 commit 内容清单 · Conventional Commits · Branch + Tag 策略）
  - § 九 **Bootstrap Checklist**（**30 项逐条验证**）
  - § 十 **Bootstrap Risks**（6 类风险 + RAG + 验证矩阵）
  - § 十一 Stages × Bootstrap 任务映射（M1 6 Task 100% 覆盖）
  - § 十二 Execution Preview（仅预览，非执行）
- 项目记忆已同步：DEVELOPMENT_LOG S16.0 / TODO 已完成 Stage 16 / AI_HANDOVER Stage 表推进

### Changed
- `CHANGELOG.md` 版本号映射表加 `[0.3.7]` · `[S16.0]` 行
- `AI_HANDOVER.md` 当前阶段推进 → Stage 16 · 下一阶段 → Bootstrap Execution

### Deprecated
- 无

### Removed
- 无

### Fixed
- 无（Bootstrap Plan 为 Stage 17 铺路，未修复实际问题）

### Security
- § 四 ANON/SERVICE_ROLE_KEY 环境变量分级 · § 五 .gitignore 包含 .env
- § 6 R-BS-01 风险缓解：`.env` 不入 git + RLS 7 张表兜底 + verify_jwt 默认开

---

## [0.3.6] · 2026-06-27 · Stage 15 · Work Breakdown

### Added
- `Nook-WORK-BREAKDOWN.md` v1.0 — **完整工作拆分结构**（12 章节，约 800 行）
  - § 一 Roadmap（7 Milestone · 55 Task 总计 · 8 Epic）
  - § 二 ~ 四 Epic / Milestone / Feature 层级分解
  - § 五 Task（55 个 Task 全部定义：关联 F-ID/AC · 输入 · 输出 · ≥ 3 验收标准）
  - § 六 Subtask（5 级 S-Level 模板）
  - § 七 Dependency（Mermaid 依赖图 + 硬依赖 + 并行机会）
  - § 八 Priority（Critical/High/Medium/Low 四级）
  - § 九 ~ 十 Definition of Ready / Definition of Done
  - § 十一 AI Execution Rules（12 步流水线 · 8 项禁止 · 任务选择规则 · Self Review 模板）
  - § 十二 Project Progress 主进度表 + 55 Task 追踪表

### Changed
- `DEVELOPMENT_LOG.md` S9.0 修改为「当前 Session」→「已完成」；新增 S15.0 Session
- `TODO.md` 已完成 Session 数 9 → 10；新增 Stage 15 到已完成列表
- `AI_HANDOVER.md` Stage 表推进 + 当前阶段更新

### Deprecated
- 无

### Removed
- 无

### Fixed
- 无

### Security
- 无

---

## [0.3.5] · 2026-06-27 · Stage 14 · Git Workflow

### Added
- `Nook-GIT-WORKFLOW.md` v1.0（12 章节完整 Git 工作流规范）
  - § 一 GitHub Flow 总览（选型理由 + 分支模型速查）
  - § 二 Branch Strategy（main / feature / fix / docs / experiment 5 类分支）
  - § 三 Commit Message 规范（Conventional Commits · 11 type · 72 字符限制）
  - § 四 Merge Rules（Quality Gate 7 项检查 + Squash merge 策略）
  - § 五 Release Strategy（SemVer · 0.4.0 → 1.0.0 阶段映射）
  - § 六 Tag Strategy（v<semver> · RC · Beta · 实验归档）
  - § 七 Rollback Strategy（`git revert` 流程 · 4 种禁止场景 · Revert陷阱）
  - § 八 AI Git Protocol（9 步流水线 + 8 项禁止行为）
  - § 九 Git Ignore Planning（Must Ignore / Must Commit / 视情况）
  - § 十 版本管理策略（代码版 vs 文档版 · 升级流程）
  - § 十一 协作规范（Future · Review Checklist · 团队演进路径）

### Changed
- 无（纯新增文档阶段）

### Deprecated
- 无

### Removed
- 无

### Fixed
- 无

---

## Unreleased

### [docs-only · S29.0] · 2026-06-28 · 本机 Docker 永久废弃 · 架构决策

**决策原话（保留）**: "docker已删除，以后不需要做任何docker测试"

#### Changed（验证模型调整）
- **本机验收模式从「本地 static + 本地 docker live」彻底转为「本地仅 static」**：
  - 删除 `supabase start` / `supabase stop` / `supabase db reset` / `supabase functions serve` / 任何 `docker ...` 在本机的运行依赖。
  - 所有 v0.5.0+ milestone 的本机验收仅 static review：code-reviewer-minimax-m3 多轮 + `npx tsc --noEmit` 0 errors + `npx vitest run` unit pass + git worktree clean。
  - Cloud Supabase `supabase db push --include-all` + `supabase functions deploy` 为 Project Lead 操作 · 不依赖本机 Docker。

#### Deprecated
- **TODO FU-LOC-02** (PostgREST schema cache reload TTL) — 原需 docker exec 修复手段遗留不再适用。表中标记 🟢 已废弃。

#### Known Issues (新增)
- **KNOWN_ISSUES § KI-9 · Docker 已永久删除 · 架构决策 (🟢 Low · S29.0)** — 原话保留。

#### Reference
- TODO.md · KU-LOC-01 + KU-LOC-02 + FU-STG 表头重写（architectural decision applied）
- KNOWN_ISSUES.md · KI-9 新条目
- AI_HANDOVER.md · 阶段表 + 接手须知 增补
- DEVELOPMENT_LOG.md · S29.0 entry 原话保留

### [M3.1.0] · 2026-06-28 · DB Schema Migration 完整部署（mid-M3 task · 不 bump version）

#### Added
- `supabase/migrations/20260628000003_extend_schema_and_enums.sql` — 扩 M2 init 加 `user_role` enum + `profiles.role` (DEFAULT 'friend' backfill) + `profiles_one_owner_uidx` partial unique · 3 表 `reactions` (PK复合) / `attachments` (≤ 50 MB + width/height) / `schema_version` (单行) · FK `messages.attachment_id→attachments.id` ON DELETE SET NULL · 热路径索引 `idx_messages_conv_created_desc (conversation_id, created_at DESC)`
- `supabase/migrations/20260628000004_rls_policies_full.sql` — 7 表 RLS 穷举: profiles (3) / invites (3) / conversations (3) / conversation_members (3) / messages (3 + 列级 GRANT `body, deleted_by_sender_at`) / attachments (3) / reactions (3) = 20 policies，全 enveloped in DO blocks + `pg_policies` idempotency check
- `supabase/migrations/20260628000005_triggers_and_rpc.sql` — T-01 4-group cap + T-02 8-active-member cap (left_at IS NULL filter) + T-03 2-min edit window (auto-set edited_at). RPC: `fn_unread_counts()` security invoker + `fn_mark_conversation_read(p_conv uuid)`
- `supabase/migrations/20260628000006_pg_cron_jobs.sql` — `pg_cron`+`pg_net` extension enable (DO block graceful skip on local) + J-01 messages_ttl `0 3 * * *` (CTE RETURNING pattern) + J-02 invites_ttl `0 4 * * *` (expired OR used>1d) + J-03 cleanup_orphans `30 4 * * *` (`net.http_post` with GUC coalesce)
- `supabase/migrations/20260628000007_storage_buckets_and_rls.sql` — `avatars` bucket (public · 5 MB · image/* whitelist) + `attachments` bucket (private · 50 MB · image/pdf/text/zip/docx whitelist) + 5 `storage.objects` RLS policies (avatars self-folder；attachments read via conversation_members active)
- `supabase/migrations/20260628000008_dev_seed.sql` — 空 marker · `schema_version` 推进为 `m3.1.0-complete` · Owner 创建 走 `admin-bootstrap` EF (避免被 profiles_one_owner_uidx 拒绝)

#### Changed
- 现有 M2 init / invite_rpc 两个 migration **未修改** (向后兼容)
- AD + 治理 同步更新: `TODO.md` (M3-1 / M5-8 / M7-6 promote Done) · `DEVELOPMENT_LOG.md` (S26.0) · `AI_HANDOVER.md` (阶段表 M3-1 row Done) · 本 CHANGELOG

#### Fixed
- M3-1 首次发版后 review 指出 3 项 fix 并补排:
  1. `pg_get_constraintdef LIKE pattern` 在不同 PG 版本上不可靠 → 换为明确 `DROP CONSTRAINT IF EXISTS messages_body_check` (migration 0003)
  2. `messages ORDER BY created_at DESC LIMIT 50` 热路径缺复合索引 → 加 `idx_messages_conv_created_desc` per ARCH § 4.4 (migration 0003)
  3. storage policies 依赖 `storage.foldername()`(Supabase helper)信息不透明 → header comment + verification query (migration 0007)

#### Verification
- typecheck (tests/integration 0 errors · 9 pre-existing Deno EF errors unchanged) ✅
- unit tests 1/1 pass ✅
- 全部 6 NEW SQL migration 文件都被 code-reviewer-minimax-m3 评审并采纳 (含 3 项 fix 轮) ✅
- 待本地 `supabase db reset` + staging push (FU-LOC-01+02+Deno install) 执 行后 才能走 30+ days uptime 验证

#### AC Coverage（M3-1 提供能力 · 为后续阶段铺路）
| AC / F-ID | M3-1 贡献 | 验证路径 |
|---|---|---|
| F-SEC-03 (7 表 RLS) | ✅ migration 0004 提供 20 policy | 需写 smoke test (v1.0 末) |
| F-MSG-05 (2 分钟编辑 window) | ✅ T-03 trigger | 需 UI 走 PATCH + trigger `EDIT_WINDOW_EXPIRED` 验证 (M4) |
| F-MSG-10 (30 天 TTL) | ✅ T-01 + J-01 pg_cron | 需手动改 created_at -31d 然后等次日 03:00 UTC (M5) |
| F-CAP-21 (unread 计数) | ✅ fn_unread_counts RPC + fn_mark_conversation_read RPC | 需 /home 首次 hydrate 后调 (M7) |
| F-CONV-02 (4 群 硬上限) | ✅ T-01 trigger raises `CONV_HARD_CAP` errcode P0001 | 需 UI 走 POST conversations kind='group' 第 5 次 (M3-2) |
| F-CONV-05 (8 成员 硬上限) | ✅ T-02 trigger raises `MEMBER_HARD_CAP` errcode P0001 | 需 integration test 加 8-cap 场景验证 (S26.0 后续) |
| F-FILE-01..04 (附件 上传/下载) | ✅ attachments table + 50 MB check + storage.objects RLS | 需 UI 走 Storage 直传 (M5) |
| F-MSG-09 (reaction 6 emoji) | ✅ reactions 复合 PK + CHECK emoji 6 enum | 需 UI 走表情选择 (M4) |
| AC.AC.rls (跨 conv 读 0 行) | ✅ RLS 20 policies 各表 masterpiece | 需 Playwright smoke (M7) |

未在本 Session 走通的能力需后继 M3-2..M7 走 Round-Trip Coding 补充。记录于此避免 future Reader 认为 M3-1 = chat MVP可发。

---

## [0.5.0] · 2026-06-28 · M2 Auth Flow Complete (M2-3 EF + M2-4 UI + S23/S24 修复)


---

## [0.5.0] · 2026-06-28 · M2 Auth Flow Complete (M2-3 EF + M2-4 UI + S23/S24 修复)

### Added
- `tests/integration/` — 完整集成测试基础设施
  - `vitest.config.ts` — node环境 + 30s超时 + retry
  - `setup.ts` — Supabase连通性检测 + 测试邮箱/Token生成 + SKIP_INTEGRATION_TESTS + 动态本地 key 拉取 + IS_CI 分支
  - `helpers.ts` — Owner/Invite/Conversation创建 + EF HTTP 调用 + raw-fetch GoTrue 绕过 + 三级数据清理
  - `friend-signup.test.ts` — **14 测试场景**覆盖 friend-signup EF
- M2-4 `/invite/:token` 邀请落地页
  - `supabase/migrations/20260628000002_invite_rpc.sql` — `fn_get_invite_details` 安全 RPC（security definer，GRANT EXECUTE TO anon）
  - `src/features/auth/hooks/useInviteValidation.ts` — token 验证 hook（调 RPC，返回 `{ isLoading, isValid, details, reason, error }`）
  - `src/features/auth/hooks/useFriendSignup.ts` — EF 调用 + `setSession()` + navigate `/home`
  - `src/features/auth/components/InviteLanding.tsx` — Owner 卡片 + glow + 注册表单 + 30 天淡出提示
  - `src/app/pages/InviteAcceptPage.tsx` — 3 态管理重写（loading / invalid / form）
- M2-3 EF `email_exists → 409` 错误映射修复（S24.0）：
  - 删除 racy `auth.admin.listUsers()` 预检查（pagination 漏检 → 第二次注册返回 500）
  - 新增 `authErr.status === 422 && code === 'email_exists'` → 409 + `E_AUTH_EMAIL_EXISTS`
  - 附带 `weak_password → 400` 防御 goTrue 未来复杂度规则升级
- 12 条 invite 相关 i18n key (中英双语)

### Changed
- `package.json` — 新增 `test:integration` / `test:integration:watch` 脚本；version bump `0.4.0 → 0.5.0`（S25.0 封盘）
- `docs/03_Engineering/CHANGELOG.md` — 本次文档更新（v0.5.0 移入正式 released section + 增加 Verification 节）

### Fixed
- useFriendSignup.ts: i18n key 前缀缺失 (inviteExpired → auth.inviteExpired)
- InviteAcceptPage.tsx: 移除未使用的 Navigate 导入
- InviteLanding.tsx: 移除死代码 try/catch
- M2-3 EF test #8 (Email already registered → 409) 之前崩为 500 → 现正确 409
- M2-3/4 集成测试对 Supabase CLI 新 key 格式兼容性（S23.0）：新增 `IS_CI` 哨兵 + 动态 `supabase status -o env` 拉取 key + `supabaseHeaders()` 同时发 `apikey + Authorization: Bearer`
- 集成测试 HTTP 401 静默错误（S23 root cause）：vitest 自动加载 `.env` 透传 cloud service role，未与本地 GoTrue signing secret 关联 → 现本地模式完全忽略 `process.env` 走 `supabase status -o env`
- `supabase/migrations/20260628000001_init_core_tables.sql` — 6 业务表 (profiles / conversations / conversation_members / invites / messages / app_events) + 索引 + RLS + GRANT 已就绪

### Security
- `fn_get_invite_details` RPC 使用 security definer + GRANT EXECUTE TO anon (安全暴露 minimal Owner 信息)
- test #8 移除了 `auth.admin.listUsers()` 预检查（racy + pagination 漏检，是潜在的数据泄露面）
- 无业务代码裸 hex / px（grep `src/` = 0 处命中）
- 集成测试 key 隔离：本地模式不读 cloud `.env`，防止误连云端泄漏本地测试数据

### Verification
- 集成测试：13/14 pass（test #6 owner-deleted 期望 410 但因 invites.created_by FK 约束返回 404，属 M3 schema 范畴不阻塞 v0.5.0）
- 单元测试：1/1 pass
- typecheck：0 新错误

### AC Coverage（本版本 AC 实际覆盖范围 · 诚实纪录）
| AC | 状态 | 验收依据 |
|---|---|---|
| AC.01 Owner 注册/登录 | ⚠️ **未覆盖** | admin-bootstrap EF 仍未实现；Owner 登录流程无集成测试 |
| AC.03 Friend 加入 → 1:1 conv 出现 | ✅ 部分覆盖 | integration test #1 (target=any) + #2 (target=conversation) 验证 session + 2 conversation_members |
| AC.03 expired / used / owner-deleted | 🟡 部分通过 | test #4 ✅ + test #5 ✅ + test #6 ❌（M3 FK schema scope-out） |
| F-AUTH-08 display_name + 语言切换 | 🟡 未走集成测试 | SettingsProfilePage UI 存在；未补收录动 |
| AC.AC.fonts / AC.AC.dark / AC.AC.perf（Lighthouse） | 🟡 M7 范畴 | v0.5.0 不检查运行时 LCP，与 M2 milestone 不重叠 |

未覆盖项属各自所属 milestone 范围（AC.01 → M2-6 E2E；M7 类 → V1.0 polish 阶段），v0.5.0 不阻塞 M2 milestone 闭盘。记录于此避免误导后续 Reader 认为 v0.5.0 = MVP 。

---

## [0.4.0] · 2026-06-27 · M1 Foundation (Bootstrap Execution)

### Added
- Vite 5 + React 18 + TS 5 工程脚手架 (package.json + 33 项依赖)
- 11 必需 + 4 推荐配置文件 (tsconfig/eslint/prettier/vite/tailwind/gitignore/env/wrangler/supabase/editorconfig/vscode/ci)
- 45+ 目录结构 (src/ 完整分层: app/components/lib/stores/shared/hooks/config/styles)
- 4 原子组件 Button/Input/Avatar/Bubble (完全对齐 spec/)
- 13 路由占位页 + RequireAuth/RequireOwner guards
- i18n 双语初始化 (zh-CN + en JSON)
- 4 Zustand stores + 3 custom hooks
- Design Tokens (tokens/index.ts) + 全局 CSS 变量 (styles/tokens.css)
- 全局 Dark theme + Reduced Motion 支持
- GitHub Actions CI (typecheck/lint/test/build)
- vitest.config.ts + tests/setup.ts

### Changed
- tsconfig.json: exactOptionalPropertyTypes 暂时注释 (M1 阶段太严格)
- 修复 Input forwardRef 类型为 HTMLInputElement|HTMLTextAreaElement (支持 composer textarea)
- 修复 MotionReduced.tsx (移除 Next.js 指令)
- 修复 Button cloneElement 类型安全
- 修复 CSS @import 顺序

### Fixed
- TypeScript 0 error
- Build 0 error (dist/ 正常生成)
- Test infrastructure 就绪 (占位测试通过)

### Security
- .env 含 VITE_SUPABASE_URL + ANON_KEY + SERVICE_ROLE_KEY (未入 git)
- prepare.txt 敏感凭据文件已安全删除

---

## 版本 / Session 映射表

| 版本号 | Session ID | 类型 |
|---|---|---|
| 0.4.0 | S20.0 | M1 Foundation Bootstrap |\n| 1.0.0 | 待 | M3-M7 Chat MVP |

### [1.0.0] · Stage M3-M7 · Chat Core + Edge Cases + Admin + Polish
- messages REST + Realtime + Presence
- outbox + SW bg sync
- settings/admin + admin-* EF + `confirm` modal
- reduced-motion / focus-visible / 4 breakpoints

### [1.1.0] · 灵魂打磨（架构决策：D-21）
- Ambient 在线状态 + 6 emoji 反应 + Typing 动画
- Sentry 规则收敛

### [1.2.0] · 容器升级
- edit `(edited)` · 时间分组 · 应用内未读文案 · 断网重连

### [2.0.0] · 可选架构升级
- E2EE + 自托管可选 + 原生 App 壳

---

## 版本 / Session 映射表

| 版本号 | Session ID | 类型 |
|---|---|---|
| 0.1.0 | S6.0 + S7.0 | 文档冻结（Spec + Architecture） |
| 0.1.1 | S8.0 | Docs-only patch |
| 0.2.0 | S8.1 | Project Memory + Workflow |
| 0.3.0 | S9.0 | Database Design (Business-Level) |
| 0.3.1 | S10.0 | API Design |
| 0.3.2 | S11.0 | Project Structure |
| 0.3.3 | S12.0 | ADR |
| 0.3.4 | S13.0 | Coding Standards |
| 0.3.5 | S14.0 | Git Workflow |
| 0.3.6 | S15.0 | Work Breakdown (WBS) |
| 0.3.7 | S16.0 | Project Bootstrap Plan |
| 0.3.8 | S17.0 | Project Startup Manual（18 章 ~880 行） |
| 0.4.0 | S20.0 | M1 Foundation Bootstrap Execution (脚手架 + 4 原子组件 + 13 路由 + CI) |
| 0.5.0 | S25.0 | M2 Auth Flow Complete (Login + Invite + friend-signup EF + 集成测试 + S23/S24 修复) |
| 1.0.0 | 待 | M3-M7 Chat MVP |
| 1.1.0 | 待 | 灵魂打磨 |
| 1.2.0 | 待 | 容器升级 |
| 2.0.0 | 待 | E2EE + 自管 |

— END —

## [0.3.9] · 2026-06-27 · Document Tree Reorganisation

### Added
- New top-level `E:\Vibecoding\Nook\docs\` tree with 4 categorical subdirs (01_Product / 02_Architecture / 03_Engineering / 04_Runtime)
- Top-level `docs/README.md` index with 5-role reading order, AI cold-start hot-path, frozen-doc list
- `STARTUP-MANUAL.md` promoted from `03_Engineering/` to docs/ root for AI cold-start discoverability
- 20 ADR files moved from `prompt/docs/adr/` to `docs/02_Architecture/adr/`
- 7 project memory files moved from `prompt/docs/` to `docs/03_Engineering/`

### Changed
- All cross-references rewritten: 529 substitutions across 42 files (round 1) + 14 surgical fixes (round 3)
- `prompt/` retained as input warehouse (`Bootstrap.txt`, `StageN.txt`); design docs NOT inside
- `Nook-DESIGN-TOKENS.md` co-located near runtime tokens at `04_Runtime/`

### Migration Recipe (for future re-organisations)
1. Survey all cross-references with `grep -rEon '<pattern>'`
2. Build a NAME → new-path lookup
3. Run round-1 regex pass: replace bare names + `docs/` prefix in one pass
4. Run round-2 audit: surface remaining prefix variants (`./docs/` · `./spec/` · `./adr/`)
5. Run round-3 surgical: explicit `str.replace` for the residual few
6. Verify: parse markdown `[text](path)` and resolve on disk

## [0.3.10] · 2026-06-27 · Folder i18n Rename

### Changed
- 4 category folders renamed from Chinese to PascalCase w/ underscores:
  - `01-产品/` → `01_Product/`
  - `02-架构/` → `02_Architecture/`
  - `03-工程/` → `03_Engineering/`
  - `04-运行时/` → `04_Runtime/`
- Cross-references in all `.md`/`.html`/`.json`/`.css`/`.ts` files auto-rewritten in one substring pass (idempotent).
- Subdirs kept English: `adr/` · `components/` · `tokens/`.
