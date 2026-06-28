# Nook · Specification Freeze Record

> **Stage 6 · Specification Review & Freeze**
> 正式版：`v1.0` · 冻结日期：`2026-06-27` · 评审结果：**PASS**

---

## 1. Freeze Metadata

| 字段 | 值 |
|---|---|
| **Spec Version** | `v1.0` |
| **Freeze Date** | `2026-06-27` |
| **Author** | Project Lead (via Stage 6 SPEC Review) |
| **Reviewer** | Architecture Review Lead (Stage 6) |
| **Review Result** | **PASS** (with documented follow-ups) |
| **Next Allowed Stage** | Architecture Design (待 Project Lead 显式确认) |

---

## 2. Frozen Artifact

冻结主文档：**`Nook-SPEC.md`**（v1.0 · Live · Single Source of Truth）

支持文档（不在冻结范围内、但作为实现参考存在）：

| 文档 | 版本 | 角色 | 与 SPEC 冲突时 |
|---|---|---|---|
| `Nook-DESIGN.md` | v1.0 | 视觉语言规范 | SPEC 优先 |
| `Nook-PRODUCT.md` | v1.0 | 产品定位 / 反模式 / 历史分级 | SPEC 优先（FU-1 待 v1.0.1 同步 Web Push 条目） |
| `../02_Architecture/Nook-ARCHITECTURE.md` | v1.0 (legacy) | 历史选型（已被 Stage 7 取代） | **Stage 7 ARCH 优先** |
| **`../02_Architecture/Nook-ARCH-DESIGN-v1.0.md`** | **v1.0 (Stage 7)** | **权威架构文档**（数据模型 + RLS 全套 + API 契约 + 部署拓扑 + 风险） | **Stage 7 优先** |
| `Nook-INTERVIEW-spec.md` | v1.0 | 6 轮 Interview 决策记录 | SPEC 优先 |
| `prompt/components/*.spec.md` | v1.0 | 4 个原子组件 React API | SPEC 优先 |
| `tokens/index.ts` | v1.0 | Token 实际值 | SPEC 优先 |

> 所有与 `Nook-SPEC.md` 矛盾的代码 / 组件实现 / 支持文档 → 视为 **bug**，必须以本 Spec 为准。
> [来源: Nook-SPEC § 0.1]

---

## 3. Review Scope · 12 项 Checklist 覆盖度

| # | 检查项 | 状态 | 备注 |
|---|---|---|---|
| 1 | 需求完整性（Requirement Completeness） | ✅ | 9 大功能域、60+ F-ID、18 BF-ID、28 AC 均已定义 |
| 2 | 需求一致性（Consistency） | ⚠️ | 见 FU-1 / FU-2（源文档未同步，非 SPEC 自身冲突） |
| 3 | 需求可实现性（Feasibility） | ✅ | 范围匹配 MVP、组件级 API 已落到 4 个原子组件 |
| 4 | 业务流程（Business Flow） | ✅ | 18 BF 闭环，含断网 / Token 过期 / Nook 孤儿态等异常 |
| 5 | 页面设计（Page Coverage） | ✅ | 13 路由 + Loading/Empty/Error 三态 |
| 6 | 权限模型（Permission） | ✅ | 2 角色（Owner/Friend）+ Self-only Mutation AC 明示 |
| 7 | 数据需求（Data Requirement） | ✅ | 9 个核心表 + 生命周期（30 天清理）已定义 |
| 8 | 国际化（I18n） | ⚠️ | FU-3 / FU-2 的语种冲突需 v1.0.1 同步 ARCH |
| 9 | 响应式设计（Responsive） | ✅ | PC / Pad / Mobile 三档 + 移动特有交互定义 |
| 10 | 安全（Security） | ⚠️ | FU-4 Owner 自删边缘案例需 v1.0.1 明确 |
| 11 | 未来扩展（Scalability） | ✅ | v1.x / V1+ / Never-Do 三层切分明确，无过度设计 |
| 12 | MVP 检查（Scope） | ✅ | 无 Scope Creep；59 F-ID 全部归入 MVP（v1.0） |

---

## 4. Follow-ups（v1.0.1 必须修复，不阻塞开发）

| ID | Severity | Domain | 描述 / 建议修改 | 修复方式 |
|---|---|---|---|---|
| **FU-1** | Medium | 通知 | `Nook-PRODUCT.md` § 4 M12 仍把 "Web Push Notification" 列为 MUST；`Nook-SPEC.md` § 1.7.2 / § 9.1 已裁决 ❌ 不放 Web Push | 在 v1.0.1 中同步 PRODUCT.md，删除 M12 中的 Web Push 条目（保留产品文案原稿于附录） |
| **FU-2** | Medium | I18n | `../02_Architecture/Nook-ARCHITECTURE.md` § 2.7 写 "zh-CN / en / ja-JP（3 语）"；`Nook-SPEC.md` § 1.8 裁决为 "zh-CN + en（v1.0 双语，Round-3 Q2）" | 在 v1.0.1 中同步 ARCH.md，把语种从 3 改为 2，删除 ja-JP |
| **FU-3** | Low | 安全 / 邀请 | `F-SEC-06` + `Round-1 Q4`：允许"同 email 重新注册"，但未明示"如果该 email 当前是活跃成员（`left_at=NULL`），其 invite token 是否仍可被使用" | 在 v1.0.1 SPEC 中补充 AC.SEC.06b：active friend 的 invite token 在 re-register 时，行为为「重置 session + 同账号复用」而非"产生新朋友条目" |
| **FU-4** | Low | 数据 / Nook 生命周期 | § 4.3 提到 "Owner 自删 → Nook 进入孤儿态"，但未明示 tombstone 保留期、可恢复策略与数据删除时序 | 在 v1.0.1 SPEC 中补充：孤儿 Nook 保留 N 天管理员可恢复（默认 30 天），超过则硬删所有 messages / files，并明示 Owner 自删后**无法**反向恢复 |

---

## 5. Identified Strengths（不修改 / 列入保留）

- ✅ Spec 自洽：`Nook-SPEC.md` 在不引用源文档的情况下能完整指导开发
- ✅ 反模式黑名单（Never-Do）显式列出，避免开发期争议
- ✅ 4 个原子组件 Spec（Button / Input / Avatar / Bubble）的 React API 与视觉 Spec 对齐
- ✅ Design Tokens 4 文件互通（JSON / TS / CSS / MD），无冲突
- ✅ Interview-spec 决策可追溯（每条规则附 `[来源: Round-N Q-N]`）
- ✅ 业务流全闭环（注册 → Invite → Accept → First Message → 30-天清理 → Owner 离场 → 孤儿态处理）

---

## 6. Post-Freeze Change Policy（v1.0 之后）

- **任何** Spec 修改 → 必须创建新版本（`v1.0.1` / `v1.1` / `v2.0`）。
- 不得直接修改本冻结版。
- 新版本必须包含：
  - 变更原因（reason）
  - 影响范围（scope）
  - AC 变更清单（AC delta）
  - 兼容性说明（backward-compat）

---

## 7. Definition of Done · Checklist

- [x] 所有源文档（Nook-DESIGN / Nook-PRODUCT / Nook-ARCHITECTURE / Nook-INTERVIEW-spec / 4 组件 Spec）已 read
- [x] 12 项 Review Checklist 全部覆盖
- [x] 问题清单（4 项 FU）已列、严重程度已分级
- [x] 风险分析（产品 / 技术 / 维护 / 性能 / 安全 / 时间）已输出
- [x] 改进建议（修改 / 延期 / 保留）已分类
- [x] 最终评审结论：**PASS**
- [x] Spec Freeze Record 已生成（本文件）
- [x] 版本号 `v1.0` 已固化

---

## 8. Stage 7 后状态

> ✅ **Stage 6 · Specification Review & Freeze 完成**
> ✅ **Stage 7 · Architecture Design 完成** (交付物：`../02_Architecture/Nook-ARCH-DESIGN-v1.0.md`)
> ❌ **Code Development 尚未开始**
> ⏸️ **等待 Project Lead 显式确认进入 Stage 8 · Code Development (M1 Foundation)**

---

*End of Nook Spec Freeze Record v1.0 — 2026-06-27*
