# Nook · Architecture Decision Records (ADR)

> **目录**: `docs/adr/`  
> **维护规则**：每个 ADR 一旦 Accepted 即「冻结」——不可直接修改原文。如需修订，将原 ADR 状态改为 `Superseded` 并创建新 ADR。  
> **编号约定**：`ADR-NNN`（从 001 开始，永不重复）。  
> **状态**：`Proposed` → `Accepted` → `Superseded` → `Deprecated`

---

## ADR 清单

| ADR | 标题 | 状态 | 日期 |
|-----|------|------|------|
| 001 | SPEC = Single Source of Truth | ✅ Accepted | 2026-06-27 |
| 002 | i18n 双语 zh-CN + en | ✅ Accepted | 2026-06-27 |
| 003 | 永不放 Web Push / 系统通知 / Email 推送 | ✅ Accepted | 2026-06-27 |
| 004 | F-MSG-07 列级软隐藏（不物理 DELETE） | ✅ Accepted | 2026-06-27 |
| 005 | unread_counts 基于 conversation_members.last_read_at 游标 | ✅ Accepted | 2026-06-27 |
| 006 | 4 群 + 8 成员硬上限 = DB trigger + UI 双重 | ✅ Accepted | 2026-06-27 |
| 007 | 编辑 2 分钟窗口 = DB trigger + UI disabled | ✅ Accepted | 2026-06-27 |
| 008 | 30 天 TTL 同步清理 messages + attachments + storage.objects | ✅ Accepted | 2026-06-27 |
| 009 | 前端选型 React 18 + Vite + TypeScript | ✅ Accepted | 2026-06-27 |
| 010 | 后端 Supabase 一体化 | ✅ Accepted | 2026-06-27 |
| 011 | 实时通信 Supabase Realtime (WS + Presence) | ✅ Accepted | 2026-06-27 |
| 012 | 认证方案 Supabase Auth + 自建 invite-token | ✅ Accepted | 2026-06-27 |
| 013 | 状态管理 Zustand (client) + TanStack Query v5 (server) | ✅ Accepted | 2026-06-27 |
| 014 | 本地缓存 Dexie (IndexedDB) + outbox + client_msg_id dedupe | ✅ Accepted | 2026-06-27 |
| 015 | 部署 Cloudflare Pages (FE) + Supabase Cloud (BE) + R2 fallback | ✅ Accepted | 2026-06-27 |
| 016 | CI/CD GitHub Actions | ✅ Accepted | 2026-06-27 |
| 017 | 监控 Sentry free + LogSnag free | ✅ Accepted | 2026-06-27 |
| 018 | 自托管 Inter + JetBrains Mono WOFF2（绝不 Google CDN） | ✅ Accepted | 2026-06-27 |
| 019 | 错误处理统一格式 + 映射 | ✅ Accepted | 2026-06-27 |
| 020 | 测试策略（Unit + Integration + E2E） | ✅ Accepted | 2026-06-27 |

---

## Superseded / Deprecated

| ADR | 标题 | 新 ADR | 日期 |
|-----|------|--------|------|
| — | 暂无 | — | — |

---

*Nook ADR · 2026-06-27 · v1.0*
