# Nook · Roadmap

> **目的**：维护整个项目版本规划 + 主要新增功能 + 完成顺序。
> **规则**：SPEC § 1.9 表（产品视角）↔ 本文件 V-路由（工程视角）；两者一一对应。

## SPEC § 1.9 ↔ V-路由映射

| SPEC § 1.9 | V-路由 | 阶段 | 主要目标 | 时间 |
|---|---|---|---|---|
| v1.0 | **MVP** | 当前（Stage 8.1） | 文档 + 工作流 + 记忆体系 | 已完成 |
| v1.0 | **V1.0** | Stage M1-M7 | 5 个朋友"进得来、发得出、看得见" | 4-6 周个人工作量 |
| v1.1 | **V1.1** | 灵魂打磨 | Ambient · 6 emoji 反应 · Typing 精修 · Sentry 收口 | 2-3 周 |
| v1.2 | **V1.2**（亦称 V1.5） | 容器升级 | 编辑 `(edited)` · 时间分组 · 应用内未读文案 · 断网重连 | 2-3 周 |
| v2.0 | **V2.0** | 体验纵深 | E2EE + Client Crypto.subtle + 自托管可选 + 原生 App 壳 | 视需求 |

> **注**：本文件将 SPEC § 1.9 的 v1.0/v1.1/v1.2 路由映射为 V1.0/V1.1/V1.2/V2.0 工程里程碑；SPEC 中的 MVP 是"文档完工"阶段；本文件的 MVP 对应 SPEC § 1.9 的 v1.0（代码 MVP）。

---

## MVP · 文档完工（当前 · Stage 8.1 完成）

### 目标
让"未来的开发"有可执行的舞台——所有 SPEC / ARCH / WORKFLOW 冻结，所有跨文档一致。

### 主要交付
- ✅ `../01_Product/Nook-SPEC.md` v1.0 (Single Source of Truth)
- ✅ `../01_Product/Nook-SPEC.md` v1.0.1（FU-1/FU-2 docs-only patch）
- ✅ `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md`（16 章权威架构）
- ✅ `../01_Product/Nook-SPEC-FREEZE.md` / `../01_Product/Nook-SPEC-FREEZE-v1.0.1.md`
- ✅ `../01_Product/Nook-PRODUCT.md`（v1.0.1 同步）/ `../02_Architecture/Nook-ARCHITECTURE.md`（v1.0.1 同步）
- ✅ `docs/` 7 份项目记忆文档 + 12 步开发流程

### 完成日期
2026-06-27

---

## V1.0 · 代码 MVP（Stage M1-M7 · 待启动）

### 目标
让 5 个朋友能"进得来、发得出、看得见"。

### 主要新增功能
| F-ID | 功能 | M-里程碑 |
|---|---|---|
| F-AUTH-01 / 02 | 注册 / 登录 | M2 |
| F-AUTH-03 / 04 / 05 / 06 / 07 | 邀请 + 自动 1:1 + 重置密码 | M2 + M6 |
| F-AUTH-08 / 09 / 10 | display_name + 头像 + 语言 | M2 + M5 |
| F-CONV-01 / 03 / 05 | 列出会话 + 拉消息 + 加入群 | M2 + M3 |
| F-CONV-02 | 创建群（4 群硬上限） | M3 |
| F-MSG-01 / 02 / 03 / 04 / 06 / 07 / 08 | send/edit/recall/react/typing/reply | M3 + M4 |
| F-MSG-05 | 编辑 2 分钟 | M4 |
| F-MSG-09 / 10 / 11 | emoji 反应 / 30 天 TTL / 未读 | M3 + M4 |
| F-MEDIA-01 | outbox | M5 |
| F-ST-01 / 02 / 03 | Ambient / Tab title / dark | M4 + M7 |
| F-NOTIF-01 / 02 / 03 | 应用内未读 | M7 |
| F-SEC-01..06 | 隐私 / RLS / admin / Friend 删除 | M3-M6 |
| F-UI-01..05 | 响应式 / 触达 / 减动效 / PWA / 字体自托管 | M1 + M5 + M7 |
| F-I18N-01..03 | 双语 + ICU + 不翻译消息 | M1 |

### 预计完成
- 4-6 周（Owner 一个人工作量）
- Stage 顺序：M1 Foundation → M2 Auth → M3 Chat → M4 Realtime → M5 Edge Cases → M6 Admin → M7 Polish & A11y

### 关键技术指标
- 实盘编译 / lint / typecheck / test 全绿
- LCP ≤ 1.5s（Lighthouse CI）
- RLS 跨用户读 0 行（smoke test）
- 30 天 TTL 实测通过
- 4 群 + 8 成员 + 2 分钟编辑 trigger 实测

---

## V1.1 · 灵魂打磨（v1.1）

### 目标
让 Nook 不仅是"能用"，而是"想用"——灵魂功能精修。

### 主要新增功能
| F-ID | 功能 | 来源 |
|---|---|---|
| S1 | Ambient 在场状态呼吸光点细化 | Nook-PRODUCT § 4 S1 |
| S2 | 6 emoji 反应动画精修 | Nook-PRODUCT § 4 S2 |
| S3 | 编辑 `(edited)` 微标签动画 | Nook-PRODUCT § 4 S3 |
| S4 | 断网重连 status light（color not red） | Nook-PRODUCT § 4 S4 |

### 主要技术改进
- Sentry 规则收敛（NF-MON-N01）
- prefetch / lazy load 优化
- Realtime presence 心跳节流

### 预计完成
- 2-3 周

---

## V1.2 · 容器升级（亦称 V1.5 in user request context）

### 目标
让 Nook 可以承载更多朋友 + 更长时段聊天。

### 主要新增功能
| F-ID | 功能 | 来源 |
|---|---|---|
| S5 | 消息时间分组（今天 / 昨天 / 本周） | Nook-PRODUCT § 4 S5 |
| S6 | 空状态 onboarding 优化 | Nook-PRODUCT § 4 S6 |
| S7 | 设置抽屉细节（深色强度 / 通知开关） | Nook-PRODUCT § 4 S7 |
| **FU-3 补修复** | active friend 重邀请边缘 | 推迟项 → 解锁 |
| **FU-4 补修复** | Owner 自删 tombstone + 孤儿态 | 推迟项 → 解锁 |
| **KI-1 应急** | 30 天前附件迁 R2 + 仅留文字 | ARCH § 7.2 警报脚本 |

### 预计完成
- 2-3 周

---

## V2.0 · 体验纵深（视需求）

### 目标
如果朋友提了"我担心消息安全" / "想要原生 App" → v2.0

### 主要新增功能
| F-ID | 功能 | 说明 |
|---|---|---|
| F8 | 端到端加密（E2EE） | Client Crypto.subtle + 自签名 EC key |
| F7 | iOS / Android 原生 App 壳 | 若 PWA 体验不佳 |
| — | 多设备同时在线冲突解决 | 当前策略：last-write-wins（注：v1.0 未启用 multi-device sessions）|
| 自管可选 | 自托管 Supabase | 中长期 KI-4 风险对冲 |
| 数据导出 | GDPR / 数据所有权 | 自托管用户主张 |

### 预计触发
- 朋友显式请求（目前千万不必）
- KI-4 实际发生（Supabase 单厂商故障）

---

## 路线图（甘特图式节奏）



```
S0  ── S6 ── S7 ── S8.0 ── S8.1 ── (M1-M7) ── (V1.1) ── (V1.2) ── [V2.0?]
 │     │     │     │        │         │            │           │
 │     │     │     │        │         │            │           │
 ❰ 文档冻结区间 ❱  ┊         ┊            ┊           ┊
                  ┊         ┊            ┊           ┊
                  ❰ 代码完工 ❱  ❰灵魂打磨❱  ❰容器升级❱
                                                      
                 4-6 周     2-3 周     2-3 周    视需求
```



---

## SPEC § 1.9 vs 本文件 vs Nook-ROADMAP 三角校验

| 字段 | SPEC § 1.9 表 | 本文件 V-路由 | 状态 |
|---|---|---|---|
| 第 1 行 | v1.0 · MVP | V1.0 · 4-6 周个人 MVP | ✅ 对齐 |
| 第 2 行 | v1.1 · 灵魂打磨 | V1.1 · 2-3 周 | ✅ 对齐 |
| 第 3 行 | v1.2 · 容器升级 | V1.2 · 2-3 周 | ✅ 对齐 |
| 第 4 行 | v2.0 · 体验纵深 | V2.0 · 视需求 | ✅ 对齐 |

---

## 决策 / 风险

- **MVP 阶段不能动 ADR**（D-01..D-22）。
- **V1.1+ 决策修订走 DECISIONS.md Amendments**。
- **V2.0 是可选**；不绑死承诺。

---

 — END —
