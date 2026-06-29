# Nook · Known Issues

> 持续维护：所有已知问题的影响范围 + 严重程度 + 临时方案 + 修复计划。
> **不删除历史问题**——修复后标记「已解决」并保留 row。

---

## 严重程度图例

| 等级 | 定义 |
|---|---|
| 🔴 Critical | 阻塞 MVP 发版；不修复不能上线 |
| 🟠 High | 影响核心体验；6 月内必须修复 |
| 🟡 Medium | 边缘 case；不阻塞但应记录 |
| 🟢 Low | 文档 / 微优化；好调但不紧急 |

---

## FU-3 · Active Friend 重邀请边缘案例（🟡 Medium）

| 字段 | 内容 |
|---|---|
| **Bug 描述** | SPEC § 2.7 F-SEC-06 + Round-1 Q4 允许"同 email 重新注册"，但未明示："如果该 email 当前是**活跃成员**（`left_at=NULL`），其 invite token 是否仍可被使用?" |
| **影响范围** | F-AUTH-05/06 · F-SEC-06 · BF-04 · BF-14 |
| **严重程度** | 🟡 Medium — 不阻塞流程；但 owner 误操作会让"现有朋友"以"新朋友"身份呈现 |
| **临时方案** | 当前 SPEC § 2.7 的描述："占位可见后 Owner 可重新邀请同一 email → 重新注册（视为新 Friend）→ 直接加入（left_at=null）"。**问题**：未明示这种情况下原账号会发生什么。 |
| **是否已计划修复** | ✅ 已计划：v1.1+ SPEC 增补 `AC.SEC.06b`：active friend 重 register 行为为「重置 session + 同账号复用」而非"产生新朋友条目"。schema 端评估 `conversation_members.legacy_user_id` 链接 |
| **修复方负责** | Stage v1.1+ 后端 / DB 设计 |
| **状态** | 🟡 等待 v1.1+ |

---

## FU-4 · Owner 自删 → 孤儿态 Tombstone Policy（🟡 Medium）

| 字段 | 内容 |
|---|---|
| **Bug 描述** | SPEC § 4.3 提到 "Owner 自删账号 → Nook 进入孤儿态"，但未明示 tombstone 保留期、可恢复策略、数据删除时序 |
| **影响范围** | F-AUTH-生命周期 · SPEC § 4.3 · DR-01/04 |
| **严重程度** | 🟡 Medium — Owner 误操作后会导致朋友数据不可访问 |
| **临时方案** | 当前 ARCH-DESIGN § 6.4 / § 11.4 建议：自删 = Nook 死。但 v1.0 没有 Owner 自删入口（FE 未暴露），问题主要在理论层面 |
| **是否已计划修复** | ✅ 已计划：v1.1+ SPEC 增补 Nook 生命周期 Edge Function `nook-orphan-watchdog` 与 tombstone schema |
| **修复方负责** | Stage v1.1+ 后端 / DB / 隐私文档 |
| **状态** | 🟡 等待 v1.1+ |

---

## KI-1 · Supabase Storage 6-8 月容量逼近（🟡 Medium）

| 字段 | 内容 |
|---|---|
| **Bug 描述** | ARCH-DESIGN § 7.2 资源清单指出：Supabase Storage 1 GB 限 = 6-8 个月激进使用后会逼近（高清原图是主消耗） |
| **影响范围** | v1.1+ V1+ 所有阶段 |
| **严重程度** | 🟡 Medium — 不影响 v1.0；v1.1+ 必须准备应急 |
| **临时方案** | v1.0 仅监控 + CF Analytics；当 storage 趋近 600MB 时告警 |
| **是否已计划修复** | ✅ 已计划：v1.1 准备脚本 `30 天前附件迁 R2 + 仅留文字`；v1.0 不实施 |
| **修复方负责** | Stage v1.1+ 后端 / DevOps |
| **状态** | 🟡 监控中 |

---

## KI-2 · 大陆区 Chrome 无 FCM 导致 Web Push 不可用（🟢 Low — 已规避）

| 字段 | 内容 |
|---|---|
| **Bug 描述** | 国内 Chrome / Edge 浏览器无 Google FCM；Web Push 国内全失效 |
| **影响范围** | 全平台通知能力 |
| **严重程度** | 🟢 Low — **SPEC § 1.7.2 + § 2.6 F-NOTIF-03 已明确不放 Web Push**（v1.0.1 patch 同步 FU-1） |
| **临时方案** | 应用内未读小红点 + Tab title `[N] Nook_v1.0` 是唯一通知渠道（AC.12） |
| **是否已计划修复** | ❌ 不修复（产品决策：放即违背零噪音定位） |
| **修复方负责** | n/a |
| **状态** | 🟢 已规避（架构层） |

---

## KI-3 · 30 天 TTL 含 recalled 占位（🟢 Low — SPEC 决策）

| 字段 | 内容 |
|---|---|
| **Bug 描述** | SPEC § 7 DR-05 § 7 明确：30 天清的 pg_cron 会**包括** recalled_at 不为 null 的消息（即已撤回占位也会被硬删） |
| **影响范围** | 30 天以后所有消息（含已撤回）；30 天 内无影响 |
| **严重程度** | 🟢 Low — SPEC 明确决策（与 INTERVIEW § 5 不冲突） |
| **临时方案** | 无需——产品上接受 |
| **是否已计划修复** | v1.1+ 可重新评估：30 天含 recalled vs. 单独保留 recalled ×49 天（成本效益再算） |
| **修复方负责** | stage v1.1+ 后端 |
| **状态** | 🟢 已决策 |

---

## KI-4 · Supabase 单厂商故障风险（🟠 High — 长期）

| 字段 | 内容 |
|---|---|
| **Bug 描述** | ARCH-DESIGN § 11.4 识别：Supabase 挂了 = Nook 整体挂（auth/db/realtime/storage 全依赖） |
| **影响范围** | 全栈；严重时全线不可用 |
| **严重程度** | 🟠 High — 概率低但影响 critical |
| **临时方案** | 监控 Sentry + Supabase status；定期备份 DB（v1.0 daily 快照即可） |
| **是否已计划修复** | ✅ 已计划：v2.0+ 自托管可选（CF DO + 自管 Postgres + 自签 EC key）作为逃生路径 |
| **修复方负责** | Stage v2.0+ 架构迁移 |
| **状态** | 🟠 长期监控 |

---

## KI-5 · Owner self-delete 入口未在 v1.0 暴露（🟢 Low — 设计如此）

| 字段 | 内容 |
|---|---|
| **Bug 描述** | v1.0 UI 没有 "delete my account" 按钮 |
| **影响范围** | Owner 账号永久 |
| **严重程度** | 🟢 Low — SPEC § 1.7 + DR-01 "v1.0 不暴露给 Owner 自删" |
| **临时方案** | 通过 supabase dashboard 直接清除（开发 / 紧急情况手动） |
| **是否已计划修复** | v1.1+ Owner admin 区可加此入口 + FU-4 tombstone policy |
| **修复方负责** | Stage v1.1+ admin UI |
| **状态** | 🟢 已决策 |

---

## KI-6 · Light mode 强禁（🟢 Low — 设计如此）

| 字段 | 内容 |
|---|---|
| **Bug 描述** | SPEC § 1.7.2 + N9 不允许 light mode 切换 |
| **影响范围** | 白天的可见性（强光环境） |
| **严重程度** | 🟢 Low — 产品决策（深色 = 进入黑夜的心智） |
| **临时方案** | 无——强制 dark |
| **是否已计划修复** | ❌ 永不修复（Never-Do） |
| **修复方负责** | n/a |
| **状态** | 🟢 已禁止 |

---

## KI-7 · Friend 通过 invite 重注册产生"新 user_id"语义模糊（🟢 Low）

| 字段 | 内容 |
|---|---|
| **Bug 描述** | F-SEC-06 重邀请：同 email 重新注册 = 新 auth.users.id，与原 friend 的 left_at 标记共存 |
| **影响范围** | 历史消息署名 / "本人"语义 |
| **严重程度** | 🟢 Low — 设计如此（Round-1 Q4 决定）；对 v1.0 体验无负面 |
| **临时方案** | display_name 不变；朋友列表视觉连续 |
| **是否已计划修复** | v1.1+ FU-3 边缘案例补遗（同 FU-3 处理） |
| **修复方负责** | Stage v1.1+ |
| **状态** | 🟢 设计如此 |

---

## KI-8 · v0.5.0 远端仓库推送 · 待启动 (🟢 Low)

| 字段 | 内容 |
|---|---|
| **Bug 描述** | v0.5.0 git commit + annotated tag 仅本地完成；远端仓库（如 GitHub）尚未推送 |
| **影响范围** | v1.0 之前工作全部仅本地备份；本地磁盘损坏 = 不可恢复；CI/CD 未能挂钩 |
| **严重程度** | 🟢 Low — 本地单开发阶段；功能不受影响 |
| **临时方案** | `git init` + annotated tag `v0.5.0` 已就绪；待 GitHub 仓库创建 → `git remote add origin <url>` + `git push origin main --tags` |
| **是否已计划修复** | ⏳ 待 Project Lead 创建 GitHub org/repo |
| **修复方负责** | Project Lead（创建 repo）+ AI 协助 push 命令 |
| **状态** | 🟢 本地点完成，**等待远端仓库创建** |

---

## KI-10 · VITE_ENABLE_SW deploy opt-in flag · emergency rollback 机制 (🟢 Low · S35.0)

| 字段 | 内容 |
|---|---|
| **描述** | M5-2 Workbox SW bg sync ship 后 · Nook 接受 `VITE_ENABLE_SW` env flag (deploy-time opt-in enables `registerServiceWorkerOnce()` 而挥 SW register)。`enableSw = isTruthyEnvFlag('VITE_ENABLE_SW')` 解析 = `true` when `"true"` or `"1"` · default `false`(dev + staging 走老路径,prod deploy 强 opt-in 后 SW 装货)。 |
| **影响范围** | prod 部署 后 · `VITE_ENABLE_SW=false` 走 → `registerServiceWorkerOnce()` 是 noop · 保留外接走会話 cache path (warm tier) · 不会 queue-ack-ful 外入 dexie outbox 期待 Workbox bg sync replay。退款 `env flag = false` 后 dark-row column not surface。 |
| **临时方案** | Deploy 时 · 可以 `VITE_ENABLE_SW=false` 上云 · 后退全面 unregister。 ʼ̄ Vite PWA出的 dist/sw.js 返 down · 即時 Completion to `vite build` 跑 Vite PWA Plugin -  · unregister()` 提Platform transitionRecovery API)。 |
| **严重程度** | 🟢 Low ·  早期逃生路径  · 后晚 tool·其实 622 Host clean ·后续无 |
| **是否已计划修复** | 跨1项目 · 后后 Communication Platform conflicts 。 v1.0 加 + v1.1+ finetune 嵌套 applied |
| **修复方负责** | v1.0 Platform Ops · Project Lead deploy |
| **状态** | 🟢 生效 +iDeploy opt-in |

## KI-9 · Docker 已永久删除 · 架构决策 (🟢 Low · S29.0)

**字段** | **内容**
---|---
**决策描述** | 2026-06-28 · Project Lead 决定：删除本机 Docker Desktop · **今后不再做任何 docker 测试**。记录原话："docker已删除，以后不需要做任何docker测试"。
**影响范围** | 本地验证链全景：①所有 local Supabase Docker Compose 容器路径 (Postgres + PostgREST + GoTrue + Realtime + Storage + Studio + Edge Functions)；②本地集成测试 (vitest integration suite 需要 live `supabase start`)；③本地 EF serve (`supabase functions serve`)；④本地 PostgREST schema cache reload (FU-LOC-02 的修复手段)。
**严重程度** | 🟢 Low · **架构决策** · 不是遗留问题。本机不再预计本地 live verification。
**临时方案** | **所有 v0.5.0+ 里程碑仅 static-only ship** : 本机验证 = code-reviewer-minimax-m3 多轮评审 + `npx tsc --noEmit` 0 errors + `npx vitest run` unit tests pass + git conventional commit + worktree clean。**live verification 仅在上线前云 staging/prod 走**：`supabase db push --include-all --project-ref <cloud>` + `supabase functions deploy <name> --project-ref <cloud>`。
**是否已计划修复** | 🚫 **永不修复** — 设计决策。Docker 从本机离开后 · 任何 task 都需从「本机验证链」中零思考剔除。如需本地 ephemeral DB · v2.0+ 决策。
**修复方负责** | 架构决策已记；后续确保所有本地脚本 / AI prompt 不再依赖 `supabase start` · `docker` 命令
**状态** | 🟢 **决策已生效**
**连锁 · TODO.md** | FU-LOC-01 升级为架构决策 🟢（从 ⚠️）；FU-LOC-02 标记 🟢 已废弃。
**连锁 · AI_HANDOVER** | 「下一位 AI 接手须知」 · 「阶段状态」 表 增补 1 行。
**连锁 · CHANGELOG** | `[Unreleased]` 新增 S29.0 annotation section。
**连锁 · DEVELOPMENT_LOG** | S29.0 entry 原话保留。

---

## 历史已修复（保留 row · 不删除）

| ID | 描述 | 修复 Session | 修复方式 |
|---|---|---|---|
| FIX-1 | M-arch `count(*) into cnt from conversations` 不区分 kind（含 1:1） | S7.0 | 改 `WHERE kind='group'`（FU-2 dependency） |
| FIX-2 | F-MSG-07 设计为物理 DELETE，违反 AC.10「朋友端仍可见」 | S7.0 | 改列级 GRANT + `deleted_by_sender_at` 软隐藏 |
| FIX-3 | ARCH § 2.7 i18n 写 3 语（zh-CN/en/ja-JP），与 SPEC 双语冲突 | S8.0 | v1.0.1 patch 改双语 |
| FIX-4 | ARCH PRODUCT 把 Web Push 标 MUST，与 SPEC 强禁冲突 | S8.0 | v1.0.1 patch 删除 M12 + 迁 NEVER N0 |
| FIX-5 | SPEC 没显式 4-cap / 8-cap / edited_2min 三条 trigger | S7.0 | ARCH-DESIGN § 4.3 显式列 3 trigger |
| FIX-6 | SPEC § 8 CAP-21 unread 缺游标 | S7.0 | ARCH-DESIGN § 6.1 改 `last_read_at` 游标 + 新 `fn_mark_conversation_read` RPC |
| FIX-7 | SPEC / ARCH 没显式 RLS SELECT/INSERT/UPDATE/DELETE 完整策略 | S7.0 | ARCH-DESIGN § 5 全穷举 7 表 |

---

— END —
