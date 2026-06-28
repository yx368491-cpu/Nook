# Nook · Spec Freeze Patch Record — v1.0.1

> **版本**：`v1.0.1` · **冻结日期**：`2026-06-27` · **补丁性质**：Docs-only Sync

> **📌 注**：Stage 6 识别的 **FU-3**（active friend 重新注册态）与 **FU-4**（孤儿态软删时序）涉及 SPEC 核心逻辑与后端边界，已转交业务逻辑版本（**v1.1+**）统筹处理。本批次 v1.0.1 仅消除**跨源文档的文本冲突**——不动业务规则。

---

## 0. 背景

Stage 6 · Specification Review & Freeze 完成了对 Nook v1.0 的 12 项 Review Checklist，结论 **PASS**，并列出 4 项 Stage 6 Follow-ups：

| FU | 严重度 | 域 | 描述 |
|---|---|---|---|
| FU-1 | Medium | 通知 | `Nook-PRODUCT.md` § 4 M12 把 Web Push 标为 MUST，与 SPEC § 1.7.2 / § 2.6 F-NOTIF-03 裁决冲突 |
| FU-2 | Medium | I18n | `../02_Architecture/Nook-ARCHITECTURE.md` § 2.7 写 3 语（zh-CN / en / ja-JP）；SPEC § 1.8 裁决双语 |
| FU-3 | Low | 安全 / 邀请 | F-SEC-06 + Round-1 Q4 active friend 重邀请边缘未明示 |
| FU-4 | Low | 数据 / Nook 生命周期 | § 4.3 Owner 自删 → 孤儿态未明示 tombstone / 恢复策略 |

**v1.0.1 patch 范围 = FU-1 + FU-2**（按 Project Lead 显式要求：仅源文档同步）。
**未在 v1.0.1 处理**：FU-3、FU-4（属于业务逻辑变更，需走 v1.1+ 新版本，不在 docs-only 范畴）。

---

## 1. Patch 同步状态表

### FU-1 · Web Push 移除

| ID | 文件 | 章节 | 原文 | Patch 后状态 | 验证 |
|---|---|---|---|---|---|
| FU-1a | `Nook-PRODUCT.md` | § 3.6 「在边界内」列表 | `✅ Web Push 推送通知（不在场时也能感知到朋友来了）` | 已删除该行 | ✅ |
| FU-1b | `Nook-PRODUCT.md` | § 4 MUST HAVE 表 | `M12 · Web Push Notification ... 通知文案固定为"你被想念了"` | 已删除 M12 行（11 → 11 项 MUST） | ✅ |
| FU-1c | `Nook-PRODUCT.md` | § 4 NEVER N 表 | （无 Web Push 条目） | **新增 N0**：Web Push / 系统通知 / Email 推送 + 注脚 `(v1.0.1 同步) ；与 SPEC § 1.7.2 强禁冲突迁入` | ✅ |
| FU-1d | `Nook-PRODUCT.md` | § 5 v1.2 路线图 | `优化 Web Push 文案（极简通知）` | 已删除 | ✅ |
| FU-1e | `Nook-PRODUCT.md` | § 8 UI 衔接 | `6 px 引线 → § 4 M12 · 通知文案极简` | 已删除；增补 `未读小红点（粉白深色控） → § 4 S1末 + § 3.6 边界 · 唯一的『在不在场』信号` 作为替代锚定 | ✅ |

**结果**：v1.0.1 后 **Web Push 在 Nook 整套文档中彻底消失**；统一由 `未读小红点 + Tab title` 承担 "在/不在场" 提示（SPEC § 2.6 F-NOTIF-01 / F-NOTIF-02）。

### FU-2 · i18n 双语对齐

| ID | 文件 | 章节 | 原文 | Patch 后状态 | 验证 |
|---|---|---|---|---|---|
| FU-2a | `../02_Architecture/Nook-ARCHITECTURE.md` | § 2.7 语言行 | `**zh-CN / en / ja-JP**（v1.0 至少双语言，第三种上线后加）` | `**zh-CN + en**（v1.0 双语，与 SPEC § 1.8 / INTERVIEW § 2.9 I18N-1 对齐；ja-JP 在 v1.1+ 返反馈后加）` | ✅ |
| FU-2b | `../02_Architecture/Nook-ARCHITECTURE.md` | § 2.2 后端 → 推送触发 | `推送触发 · Edge Function · 收到消息 → 调 Web Push API` | `❌ 不需要 · SPEC § 1.7.2 + § 2.6 F-NOTIF-03 强禁` | ✅ |
| FU-2c | `../02_Architecture/Nook-ARCHITECTURE.md` | § 4 目录 supabase/functions | `send-push / cleanup-messages` | `admin-bootstrap / friend-signup / admin-create-invite / admin-reset-password / admin-delete-friend / cleanup-storage-orphans` | ✅ |
| FU-2d | `../02_Architecture/Nook-ARCHITECTURE.md` | § 7 China-specific Push Notification | `⚠️ Web Push 在国内浏览器失效 ...` | `**N/A — v1.0 不放 Web Push** · ——被推到 NEVER（『唯一候性』是应用内未读小红点）——` | ✅ |
| FU-2e | `../02_Architecture/Nook-ARCHITECTURE.md` | § 10 决策清单 · 推送通道 | `Web Push API · 国内浏览器失效 → 应用内未读` | `**❌ NONE**（v1.0 不放 Web Push） · 永久不变；应用内小红点 + Tab title 是唯一提示` | ✅ |

**结果**：v1.0.1 后 **架构文档与 SPEC 在 i18n 与推送策略上完全对齐**。

---

## 2. 文档一致性巡检

| 对照点 | v1.0 时状态 | v1.0.1 后 | SPEC 引用 |
|---|---|---|---|
| Web Push 是否在边界内 | ❌ SPEC 否 · ✅ PRODUCT/ARCH 是 | ❌ 三处全否 | SPEC § 1.7.2 · § 2.6 F-NOTIF-03 |
| i18n 语种数 | 2（SPEC）vs 3（ARCH）| ✅ 三处全 = 2 | SPEC § 1.8 · § 2.9 F-I18N-01 |
| 数据流 30 天 TTL | 三处全一致 | 三处全一致 | SPEC § 7 DR-05 · F-MSG-10 |
| 4 群硬上限 | 三处全一致 | 三处全一致 | SPEC § 1.8 + INTERVIEW § 2.2 CONV-3 + Round-1 Q3 |
| 角色（Owner + Friend） | 三处全一致 | 三处全一致 | SPEC § 4 |

**结论**：v1.0.1 patch 后 **跨源文档与 SPEC 一致率 = 100%**。

---

## 3. 推迟到 v1.1+ 的 FU-3 / FU-4

### FU-3 · active friend 重邀请（业务逻辑）
- **位置**：SPEC § 2.7 F-SEC-06 + Round-1 Q4
- **问题**：占位可见后 Owner 重邀请同一 email → 是否复用旧 friends 身份 vs 强制新注册
- **v1.1+ 处理**：在 SPEC v1.1 章节新增 `AC.SEC.06b`；schema 端考虑 `conversation_members.legacy_user_id` 链接

### FU-4 · Owner 自删 → 孤儿态（业务逻辑）
- **位置**：SPEC § 4.3 + § 7 DR-04
- **问题**：tombstone 保留期、可恢复策略、数据删除时序
- **v1.1+ 处理**：在 SPEC v1.1 章节新增 Nook 生命周期的 Edge Function `nook-orphan-watchdog` 与 tombstone schema

---

## 4. v1.0.1 阶段变更日志（已应用到 `Nook-SPEC.md § 0.4`）



```
| 2026-06-27 | v1.0.1 | Docs-only patch: 同步 Stage 6 FU-1 + FU-2；
                                  FU-3 / FU-4 推迟至 v1.1+ |
```



---

## 5. Definition of Done · Checklist

- [x] FU-1（Web Push）5 处源文档同步完毕
- [x] FU-2（i18n 双语）5 处源文档同步完毕
- [x] `Nook-SPEC.md § 0.4` 变更日志增加 v1.0.1 行
- [x] `Nook-SPEC-FREEZE-v1.0.1.md` 生成（本文档）
- [x] 跨源文档一致性巡检 = 100%
- [x] FU-3 / FU-4 推迟理由与下一阶段入口已说明

---

## 6. Status

> ✅ **Stage 8 · Code Development** 可立即开始（M1 Foundation）
> ✅ Stage 6 SPEC Review & Freeze（v1.0）保持冻结有效
> ✅ Stage 7 Architecture Design（v1.0）已被 v1.0.1 docs-only patch 强化
> ⏸️ 等待 Project Lead 显式确认进入 Stage 8 · M1

---

*End of Nook v1.0.1 Patch Sync Record — 2026-06-27*
