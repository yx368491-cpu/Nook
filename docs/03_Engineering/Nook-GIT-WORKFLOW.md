# Nook · Git Workflow v1.0 (Stage 14)

> **Stage 14 · GIT WORKFLOW — Frozen for Nook v1.0**
> 文档生成日：2026-06-27 · 关联：`Nook-CODING-STANDARDS.md v1.0`（编码规范）· `Nook-PROJECT-STRUCTURE.md v1.0`（目录结构）· `AI_HANDOVER.md`（开发流程）
> 性质：**唯一可信的 Git 操作规范来源**。适用于所有开发者 + 所有 AI Coding Agent。
> 后续所有 Git 操作必须遵循本规范。

---

## 0. 元规则

### 0.1 项目性质

| 属性 | 值 |
|---|---|
| 开发模式 | **AI First Development** + Vibe Coding |
| 团队规模 | 单人长期维护（当前）→ 未来可扩展至 2-5 人 |
| 部署频率 | 低（MVP 阶段：每周 1-2 次；稳定后：每月 1-2 次） |
| 主要工具 | Git CLI + GitHub + GitHub Actions CI/CD |

### 0.2 原则

| # | 原则 | 含义 |
|---|---|---|
| **G-01** | **Main 永远可部署** | main 分支始终处于可部署状态——Quality Gate PASS 后方可合并 |
| **G-02** | **一条 PR 一件事** | 不混合功能/修复/重构/文档在同一个分支中 |
| **G-03** | **提交粒度 = 逻辑单元** | 每个 commit 是一个独立的逻辑变更，不是 save point |
| **G-04** | **可追溯 > 节省空间** | 从不 rebase 已推送的 commit；保留所有历史 |
| **G-05** | **轻量 > 复杂** | 采用 GitHub Flow（非 Git Flow）——适合单人 + AI First 项目 |

### 0.3 变更日志

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-27 | v1.0 | 初版。基于 Nook v1.0 全部已冻结文档生成 |

---

## 一、Git Workflow 总览

### 1.1 选择：GitHub Flow

**本项目采用 GitHub Flow**（非 Git Flow / GitLab Flow）。



```
                    ┌──────────────────────────────────┐
                    │            main                  │
                    │   永远可部署 · 受保护分支         │
                    └──────────┬───────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   feature/auth        feature/chat         fix/typing-bug
          │                    │                    │
          │   PR + Quality     │   PR + Quality     │   PR + Quality
          │   Gate PASS        │   Gate PASS        │   Gate PASS
          └────────────────────┼────────────────────┘
                               │
                               ▼
                         Squash Merge
                      ┌──────────────────┐
                      │    main (部署)    │
                      └──────────────────┘
                               │
                               ▼
                         Tag: v0.4.0
```



**为什么不是 Git Flow？**

| 因素 | Git Flow | GitHub Flow（选中） |
|---|---|---|
| 分支数量 | develop / release / hotfix / feature / support 共 5+ | main + feature/fix/docs 共 2 类 |
| 适用场景 | 定期发布多版本产品（如移动 App） | 持续部署 Web 应用 |
| 单人 AI First | 分支管理开销 > 收益 | 轻量、直观 |
| 回滚复杂度 | 需要 revert develop → 重新 release | revert main → 重新 deploy |

**什么时候切换？** 如果未来团队 > 3 人且需要同时维护 2 个以上版本（如 v1.0 LTS + v2.0 beta），再评估 GitLab Flow。

### 1.2 分支模型速览

| 分支类型 | 用途 | 从谁创建 | 合并到谁 | 生命周期 |
|---|---|---|---|---|
| `main` | 生产就绪代码 | — | — | 永久 |
| `feature/<name>` | 新功能开发 | main | main（squash merge） | 功能完成后删除 |
| `fix/<name>` | Bug 修复 | main | main（squash merge） | 修复完成后删除 |
| `docs/<topic>` | 文档修改 | main | main（squash merge） | 修改完成后删除 |
| `experiment/<topic>` | 实验/原型 | main | 不合并（或另开 PR） | 实验结束后删除或归档 |

---

## 二、Branch Strategy（分支策略）

### 2.1 `main` — 唯一长期分支

- **受保护分支**：禁止直接 push；必须通过 Pull Request。
- **准入条件**：Quality Gate PASS（§ 七）+ Code Review（单人阶段可自审）。
- **自动部署**：`main` 分支 push 时触发 GitHub Actions → `verify` → `deploy prod`。
- **永远可部署**：不允许在 main 上留下 half-baked 代码。

### 2.2 `feature/<feature-name>`

| 规范 | 值 |
|---|---|
| **命名** | `feature/<kebab-case>` |
| **示例** | `feature/auth`, `feature/chat-core`, `feature/settings-admin` |
| **从谁创建** | `main` |
| **合并到谁** | `main` (squash merge) |
| **生命周期** | 从 main 创建 → 开发 → Quality Gate → PR → 合并 → 删除 |
| **一个分支范围** | 一个 M 里程碑（如 M1 Foundation、M2 Auth Flow） |
| **不包含** | 超过 1 个 Milestone 的内容 |

### 2.3 `fix/<bug-name>`

| 规范 | 值 |
|---|---|
| **命名** | `fix/<kebab-case>` |
| **示例** | `fix/typing-broadcast`, `fix/member-cap-trigger` |
| **从谁创建** | `main` |
| **合并到谁** | `main` (squash merge) |
| **生命周期** | 创建 → 修复 → Quality Gate → PR → 合并 → 删除 |

### 2.4 `docs/<topic>`

| 规范 | 值 |
|---|---|
| **命名** | `docs/<kebab-case>` |
| **示例** | `docs/spec-changelog`, `docs/adr-021-error-handling` |
| **从谁创建** | `main` |
| **合并到谁** | `main` (squash merge) |
| **生命周期** | 创建 → 修改 → 文档 Review → 合并 → 删除 |

### 2.5 `experiment/<topic>`

| 规范 | 值 |
|---|---|
| **命名** | `experiment/<kebab-case>` |
| **示例** | `experiment/e2ee-poc`, `experiment/self-hosted-supabase` |
| **从谁创建** | `main` |
| **合并到谁** | 不合并（或评估后另开 feature PR） |
| **生命周期** | 实验结束 → 删除或归档为 tag |

### 2.6 分支命名速查

| 类型 | 格式 | 正例 | 反例 |
|---|---|---|---|
| 功能 | `feature/<kebab>` | `feature/auth` | `feature/Auth`, `feature/my_new_feature` |
| 修复 | `fix/<kebab>` | `fix/typing-broadcast` | `fix/typing_bug`, `fix/BUG001` |
| 文档 | `docs/<kebab>` | `docs/adr-021` | `docs/update`, `docs/修改spec` |
| 实验 | `experiment/<kebab>` | `experiment/e2ee-poc` | `experiment/test`, `experiment/未命名` |

---

## 三、Commit Message 规范

### 3.1 采用 Conventional Commits 2.0

**格式**：



```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```



- `<type>` — 见 § 3.2。
- `<scope>` — 可选，表示影响的模块（如 `auth`, `chat`, `api`, `db`, `docs`）。
- `<description>` — 小写开头，不超过 72 字符，**不以句号结尾**。
- `body` — 可选，详细说明「为什么」而非「做了什么」。
- `footer` — 可选，`BREAKING CHANGE: ...`、`Closes #N`、`Refs ADR-0XX`。

### 3.2 Type 使用场景

| Type | 用途 | 示例 description |
|---|---|---|
| `feat` | 新功能（对应 SPEC F-ID 或 AC） | `feat(auth): implement owner registration flow` |
| `fix` | Bug 修复（对应 KNOWN_ISSUES KI-ID） | `fix(chat): correct typing broadcast timeout` |
| `refactor` | 重构（不改变外部行为） | `refactor(api): extract mapSupabaseError helper` |
| `docs` | 文档修改（spec / architecture / adr / coding standards） | `docs(spec): sync FU-2 i18n bilingual description` |
| `style` | 格式/风格修改（不改变逻辑） | `style: apply prettier formatting to all src/ files` |
| `test` | 添加或修改测试 | `test(auth): add E2E for invite signup flow` |
| `chore` | 构建/依赖/工具修改 | `chore(deps): upgrade @tanstack/react-query to v5.40` |
| `perf` | 性能优化 | `perf(chat): add virtual scroll for message list` |
| `ci` | CI/CD 配置修改 | `ci: add RLS smoke test to CI pipeline` |
| `build` | 构建系统修改（vite / wrangler / tsconfig） | `build: configure vite path alias for @/` |

### 3.3 规范速查

| 规则 | 说明 | 正例 | 反例 |
|---|---|---|---|
| 72 字符限制 | description 不超过 72 字符 | `feat(auth): add owner registration flow` | `feat(auth): add owner registration flow with email validation and password strength check` (超 72) |
| 小写开头 | description 首字母小写 | `fix: correct typing indicator delay` | `Fix: Correct typing indicator delay` |
| 主体解释「为什么」 | body 写动机，非 diff 清单 | `必填字段校验由后端统一处理，前端不再重复校验逻辑。` | `修改了 validate.ts 中的函数。` |
| 引用 issue/ADR | footer 标注 | `Refs ADR-004`, `Closes #12` | — |
| 一个 commit 一个 scope | 不混合两个 domain | `feat(auth)` + `feat(chat)` 应分开 commit | 同个 commit 跨 domain |

### 3.4 禁止的 Commit 信息



```
❌ "update"
❌ "fix bugs"
❌ "asdf"
❌ "WIP"
❌ "合并代码"
❌ "final version"
❌ "改了某某文件"
```



---

## 四、Merge Rules（合并规则）

### 4.1 合并前必须满足（Quality Gate）

| 检查项 | 工具 | 单人模式 | 多人模式 |
|---|---|---|---|
| TypeScript 无错误 | `tsc --noEmit` | ✅ | ✅ |
| ESLint 无错误 | `eslint` | ✅ | ✅ |
| Build 成功 | `vite build` | ✅ | ✅ |
| Unit Test 通过 | `vitest run` | ✅ | ✅ |
| E2E Test 通过 | `playwright test` | ✅ | ✅ |
| 文档已更新 | 手动检查 | ✅ | ✅ |
| 代码 Review | AI 自检 | ✅ | ✅（需人工） |

### 4.2 合并策略

| 场景 | 策略 | 原因 |
|---|---|---|
| **feature 到 main** | Squash merge | 保持 main 历史线性、干净；一个 feature 一个 commit |
| **fix 到 main** | Squash merge | 同上 |
| **docs 到 main** | Squash merge | 同上 |
| **main 到 feature** | Regular merge（no ff） | 方便 feature 分支同步最新 main |
| **experiment → 废弃** | 直接删除分支 | 不需要合并回 main |

### 4.3 不得直接绕过质量检查



```
❌ git push origin main  （直接往 main 推送——禁止）
❌ 跳过 lint 提交        （CI 会拦截——仍禁止）
❌ CI 失败时合并 PR      （禁止——必须先修复）
```



### 4.4 PR 模板（未来多人）



```markdown
## 描述

[为什么需要这个变更？关联哪个 F-ID / AC / KI？]

## 类型

- [ ] feat（新功能）
- [ ] fix（Bug 修复）
- [ ] docs（文档）
- [ ] refactor（重构）
- [ ] test（测试）
- [ ] chore（工具/依赖）

## Quality Gate

- [ ] TypeScript 无错误
- [ ] ESLint 无错误
- [ ] Build 成功
- [ ] Unit Test 通过
- [ ] 文档已更新（DEVELOPMENT_LOG / TODO / AI_HANDOVER）
- [ ] 无违反 Coding Standards
```



---

## 五、Release Strategy（版本发布）

### 5.1 版本号格式

**代码版**（`package.json` / git tag）：`semver` — `X.Y.Z`

| 段 | 含义 | 示例 |
|---|---|---|
| **X（Major）** | 里程碑完成（M3 Chat MVP / M4 Realtime Polish / 正式 v1.0） | `1.0.0` |
| **Y（Minor）** | 每完成一个 M 阶段（M1 / M2 / M5 / M6 / M7） | `0.4.0` → `0.5.0` |
| **Z（Patch）** | Bug 修复 / 文档修改 / 小调整 | `0.4.1` |

### 5.2 发布节奏

| 阶段 | 代码版本 | 文档版 | 触发条件 |
|---|---|---|---|
| **M1 Foundation** | `0.4.0` | v1.0.1 | 脚手架 + 4 原子组件 + 13 路由 + CI |
| **M2 Auth Flow** | `0.5.0` | v1.0.1 | 注册/登录/邀请落地完整 |
| **M3 Chat Core** | `0.6.0` | v1.0.1 | 消息 CRUD + Realtime + 30 天 TTL |
| **M4 Realtime Polish** | `0.7.0` | v1.0.1 | Typing / 编辑 / 撤回 / 反应 |
| **M5 Edge Cases** | `0.8.0` | v1.0.1 | Outbox + SW + 头像 + 文件 |
| **M6 Admin** | `0.9.0` | v1.0.1 | Settings/Admin + 5 个 EF |
| **M7 Polish & A11y** | `1.0.0` | **v1.0** | 正式发布 |
| **v1.1 灵魂打磨** | `1.1.0` | v1.1 | Post-MVP 体验优化 |
| **v1.2 容器升级** | `1.2.0` | v1.2 | 编辑印记 / 时间分组 / 断网重连 |

### 5.3 什么时候发布新版本

1. **Minor（0.X.0）**：一个 M 阶段完成并合并到 main 后 → git tag + CHANGELOG 更新。
2. **Patch（0.X.Z）**：一个 Bug 修复合并后 → git tag + KNOWN_ISSUES 标记已修复。
3. **Major（1.0.0）**：M7 完成，所有 AC 通过 → 正式 v1.0 发布。

### 5.4 什么时候不发布

- ❌ 功能未完成（half-baked）时不发布。
- ❌ Quality Gate FAILED 时不发布。
- ❌ 文档未同步时不发布。

---

## 六、Tag Strategy（标签策略）

### 6.1 Tag 命名

| 类型 | 格式 | 示例 |
|---|---|---|
| **Release** | `v<semver>` | `v0.4.0`, `v1.0.0`, `v1.1.0` |
| **Release Candidate** | `v<semver>-rc.<N>` | `v1.0.0-rc.1`（Major 发布前预发布） |
| **Beta** | `v<semver>-beta.<N>` | `v0.4.0-beta.1`（新功能尝鲜） |
| **实验/归档** | `experiment/<topic>` | `experiment/e2ee-poc`（不合并，归档用） |

### 6.2 使用原则

| 规则 | 说明 |
|---|---|
| **Release 标签** | 合并到 main 且 CHANGELOG 更新后，从 main 创建 annotated tag |
| **Beta 标签** | M 阶段中途 checkpoint（可选，单人可不做） |
| **RC 标签** | Major 版本发布前 1 周创建，供 owner 试用验收 |
| **实验标签** | experiment 分支不合并时，打 tag 归档后删除分支 |
| **删除标签** | ❌ 不删除已 push 的 release tag（历史不可篡改） |

### 6.3 Tag 命令约定



```bash
# 创建 annotated tag（推荐 —— 含 author / date / message）
git tag -a v0.4.0 -m "M1 Foundation: Vite + React + 4 atomic components + CI"

# 推送 tag
git push origin v0.4.0
```



---

## 七、Rollback Strategy（回滚策略）

### 7.1 回滚场景

| 场景 | 回滚方式 | 优先级 |
|---|---|---|
| **上线后立即发现 Bug（< 1h）** | `git revert <merge-commit>` → 创建新 PR | 🔴 高 |
| **上线后数小时发现 Bug** | `git revert <merge-commit>` → 创建 fix 分支修复 | 🟡 中 |
| **上线后发现数据问题（如 TTL 误删）** | 从 DB 备份恢复 + `git revert` 代码 | 🔴 高 |
| **误合并 feature 分支** | `git revert <merge-commit>` | 🟡 中 |
| **本地开发中断/混乱** | `git reset --hard origin/main`（**仅本地**） | 🟢 低 |

### 7.2 回滚流程



```mermaid
sequenceDiagram
    participant Dev as 开发者/AI
    participant Main as main
    participant GH as GitHub

    Note over Dev: 发现 main 上的严重 Bug
    Dev->>Main: git revert <merge-commit>
    Dev->>Main: 解决冲突（如有）→ git commit
    Dev->>GH: git push origin main
    Note over GH: CI 自动运行
    GH->>GH: 部署修复后的 main
    Dev->>Dev: 创建新的 fix/<bug> 分支
    Dev->>Dev: 彻底修复根本原因
    Dev->>Main: PR → Squash merge
```



### 7.3 禁止回滚的场景

| 场景 | 禁止原因 | 替代方案 |
|---|---|---|
| **DB migration 已应用** | `revert` 代码不恢复 DB 状态 | 创建新的 migration 回滚 |
| **已有多人基于此 commit 开发** | revert 会造成同步混乱 | 创建 fix 分支而非 revert |
| **超过 7 天的老版本** | revert 复杂度 > 收益 | cherry-pick 关键修复到新分支 |
| **文档修改** | revert 文档 = 丢失历史 | 新 commit 修正 |

### 7.4 紧急情况：Revert + Revert

如果 revert 后又需要恢复原始功能：

1. 创建 fix 分支 → 在原始代码基础上修复 bug → 正常 PR 流程。
2. 绝不通过 `git revert <revert-commit>` 来恢复（这会还原旧代码 + bug）。
3. 正确做法：`cherry-pick <original-commit>` 到新分支 → 在上方修复 → PR。

---

## 八、AI Git Workflow

### 8.1 每次开发任务流程



```
┌─────────────────────────────────────────────────────────┐
│               AI Git Protocol · 9 步流水线              │
├─────────────────────────────────────────────────────────┤
│  1. 读取 PROJECT_CONTEXT.md（如存在，否则 AI_HANDOVER） │
│  2. 读取 AI_HANDOVER.md（项目概况 + 当前状态）         │
│  3. 读取 DEVELOPMENT_LOG.md（最近 Session 上下文）       │
│  4. 读取 TODO.md（当前阶段活跃任务 + 优先级）           │
│  5. 开始开发（按 SPEC F-ID + AC + ARCH-DESIGN）         │
│  6. 完成 Quality Gate（§ Nook-CODING-STANDARDS § 十四） │
│  7. 更新项目文档（DEVELOPMENT_LOG / TODO / AI_HANDOVER） │
│  8. 准备 Commit（Conventional Commits 格式）            │
│  9. Merge 到 main（PR → Squash Merge → 删除分支）       │
└─────────────────────────────────────────────────────────┘
```



**不得跳过任何步骤。**

### 8.2 AI 禁止行为

| 行为 | 禁止原因 |
|---|---|
| ❌ 直接 push 到 `main` | 绕过 Quality Gate |
| ❌ 跳过 Quality Gate | 代码质量不达标 |
| ❌ 提交未完成代码 | main 永远可部署 |
| ❌ 提交违反 Coding Standards 的代码 | 一致性破坏 |
| ❌ 修改已冻结的 Spec / Architecture / ADR | 冻结不可逆 |
| ❌ 一个 commit 跨多个 domain（如 feat + fix + docs） | 历史可追溯性破坏 |
| ❌ 提交含 `console.log` / `debugger` 的代码 | 生产噪音 |
| ❌ `git rebase` 已推送的 commit | 历史丢失 |

### 8.3 AI 遇到冲突时

1. **立即停止**当前 Git 操作。
2. 读取冲突文件 → 理解冲突原因。
3. 如涉及已冻结文件 → **不修改**，汇报给 Project Lead。
4. 如属正常代码冲突 → 手动解决后完成 merge。

---

## 九、Git Ignore Planning

> **本阶段仅规划，不生成 `.gitignore` 内容**。M1 Foundation 时创建。

### 9.1 必须忽略（Must Ignore）

| 类别 | 内容 |
|---|---|
| **依赖** | `node_modules/` |
| **构建产物** | `dist/`, `build/`, `.wrangler/` |
| **环境变量** | `.env`, `.env.local`, `.env.production`（保留 `.env.example` 为模板） |
| **IDE 配置** | `.idea/`, `*.swp`, `*.swo`, `.DS_Store`, `Thumbs.db` |
| **日志** | `*.log`, `npm-debug.log*` |
| **OS 文件** | `.DS_Store`, `Thumbs.db`, `desktop.ini` |
| **Supabase 本地** | `supabase/.temp/`, `supabase/.branches/` |
| **测试缓存** | `coverage/`, `.nyc_output/` |
| **Playwright** | `test-results/`, `playwright-report/` |

### 9.2 必须提交（Must Commit）

| 类别 | 内容 |
|---|---|
| **源码** | `src/` 下所有 `.ts`, `.tsx`, `.css` 文件 |
| **配置** | `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `.eslintrc.cjs`, `.prettierrc`, `wrangler.toml` |
| **CI/CD** | `.github/workflows/*.yml` |
| **基础设施** | `supabase/migrations/*.sql`, `supabase/config.toml`, `supabase/functions/**/*.ts` |
| **字体** | `public/fonts/*.woff2` |
| **公共资源** | `public/*.json`, `public/*.ico` |
| **文档** | `spec/*.md`, `docs/*.md`, `docs/adr/*.md`, `prompt/*`（历史存档） |
| **设计 token** | `tokens/*.ts`, `tokens/*.json` |
| **测试** | `tests/` 下所有文件 |
| **工具脚本** | `scripts/*.ts` |
| **环境模板** | `.env.example` |
| **根配置** | `package.json`, `.gitignore`, `README.md` |

### 9.3 视情况决定

| 文件 | 决策 | 理由 |
|---|---|---|
| `.vscode/settings.json` | ✅ 提交 | 统一开发者体验 |
| `.vscode/extensions.json` | ✅ 提交 | 推荐扩展 |
| `.editorconfig` | ✅ 提交 | 跨编辑器基础格式 |
| `*.tsbuildinfo` | ❌ 忽略 | 本地增量编译缓存 |

---

## 十、版本管理策略（Version Management）

### 10.1 SemVer 规则（用于代码版）

| 升级 | 场景 | 示例 |
|---|---|---|
| **Major（X）** | 不兼容 API 变更 / 里程碑完成 | `0.9.0` → `1.0.0`（M7 完成） |
| **Minor（Y）** | 新增功能（向后兼容） | `0.4.0` → `0.5.0`（M2 完成） |
| **Patch（Z）** | Bug 修复 / 文档修改 | `0.4.0` → `0.4.1`（修复 typing bug） |

### 10.2 代码版 vs 文档版

| 版本 | 用途 | 文件位置 | 更新频率 |
|---|---|---|---|
| **代码版**（`package.json` version） | Git tag + CHANGELOG + 部署 | `package.json` | 每次 M 完成 / 每次 fix merge |
| **文档版**（SPEC / ARCH 版本） | 需求追踪 + 发布说明 | `../01_Product/Nook-SPEC.md § 0.4` | 重大需求变更时（v1.0 → v1.1） |

### 10.3 升级流程



```
Minor 升级（M 阶段完成）:
  1. M<N> 所有 Quality Gate PASS
  2. CHANGELOG 更新 [0.X.0]
  3. package.json version 更新
  4. git tag -a v0.X.0
  5. git push origin main --tags

Patch 升级（Bug 修复）:
  1. fix 分支 → Quality Gate → PR → merge
  2. CHANGELOG 更新 [0.X.Z]
  3. package.json version 更新
  4. git tag -a v0.X.Z
  5. git push origin main --tags
```



---

## 十一、协作规范（Future Collaboration）

> 当前单人开发，以下规范为未来 2-5 人团队预留。

### 11.1 多人协作扩展点

| 当前（单人） | 未来（团队） | 变更 |
|---|---|---|
| AI 自检 | **Code Review**（至少 1 人） | PR 模板添加 Reviewer 字段 |
| 直接 squash merge | **Squash merge + Approve** | 分支保护规则添加「需要至少 1 个 approve」|
| AI 直接推 tag | **Release Manager 负责** | 指定一名 release manager 打 tag |
| CHANGELOG AI 维护 | **所有开发者更新** | PR 模板必须包含 changelog 改动 |
| 单人 branch 管理 | **多人 feature 分支 + 命名空间** | 按开发者前缀：`<name>/feature/xxx` |

### 11.2 Code Review Checklist（未来多人用）



```
□ 功能符合 SPEC（F-ID / AC 对应）
□ 命名符合 Coding Standards
□ TypeScript strict 模式无错误
□ 不违反 Import Rules（无跨层/跨 feature 引用）
□ 不违反 Architecture（非绕过 EF / RLS）
□ 所有 UI 文本走 i18n
□ 所有颜色/间距用 Design Tokens
□ Loading / Empty / Error / Success 态齐全
□ 响应式（≥ 1024 + < 768）
□ 无硬编码值
□ 文档已更新（DEVELOPMENT_LOG / TODO / AI_HANDOVER）
□ 测试覆盖（Unit 80%+ / E2E 关键流）
```



### 11.3 未来保护分支规则



```yaml
# GitHub 分支保护规则（main）
- 要求 PR 合并（禁止直接 push）
- 要求至少 1 个 approve（团队模式）
- 要求 status checks 通过（CI / Quality Gate）
- 要求 conversation 全部 resolve
- 允许 force push: ❌（禁止）
```



### 11.4 从单人切换到团队的演进路径

1. 仍使用 GitHub Flow（不改为 Git Flow）。
2. 添加 GitHub 分支保护规则。
3. 逐步从 AI 自检过渡到 Peer Review。
4. 引入 PR 模板 + Review Checklist。
5. 指定 Release Manager + 发布日历。

---

## 十二、Stage 14 · Definition of Done

- ✅ § 一 Git Workflow 总览（GitHub Flow 选中 + 原因 + 分支模型速查）
- ✅ § 二 Branch Strategy（main / feature / fix / docs / experiment 完整定义）
- ✅ § 三 Commit Message 规范（Conventional Commits · 11 种 type · 72 字符限制 · 禁止清单）
- ✅ § 四 Merge Rules（Quality Gate 7 项 · Squash merge 策略 · 禁止直接 push）
- ✅ § 五 Release Strategy（SemVer · 0.4.0 → 1.0.0 节奏 · 发布条件）
- ✅ § 六 Tag Strategy（v<semver> · RC · Beta · 归档 · 使用原则）
- ✅ § 七 Rollback Strategy（`git revert` 流程 · 4 种禁止场景 · Revert+Revert 陷阱）
- ✅ § 八 AI Git Workflow（9 步流水线 · 8 项禁止行为 · 冲突处理）
- ✅ § 九 Git Ignore Planning（Must Ignore · Must Commit · 视情况 3 类清单）
- ✅ § 十 版本管理策略（SemVer · 代码版 vs 文档版 · 升级流程）
- ✅ § 十一 协作规范（Future · Code Review Checklist · 演进路径）
- ✅ ❌ 不初始化 Git / 不创建分支 / 不生成 .gitignore / 不写入任何文件系统
- ✅ ❌ 不修改 Spec / Architecture / ADR / Coding Standards

---

*End of Nook Git Workflow v1.0 — 2026-06-27 · Stage 14 · Frozen*

---

<a id="proxy-setup"></a>

## 十三、Network Configuration / Proxy Setup (clash-verge)

> **Doc status**: v1.0.x patch — 上为 Section 十二 (Stage 14 DoD) 原结句，Project Lead 2026-07-01 主动追記。限限于 internet 网络环境侧问题，不动 Git workflow 本体。

### 13.1 背景

中国大陆访问 GitHub HTTPS 时常因 GFW 阻断而失败（`Connection was reset` 或 `Failed to connect to github.com:443`），导致 `git push` / `git pull` / `gh` 走不到远端。项目主开发员当前部署使用 **Clash Verge / mihomo 类**代理软件，HTTP/HTTPS 代理端口默认为 **7897**（可以在 Clash Verge 设置页 ⇒ 系统代理 中确认）。

originating 缘起：M8-0.1 docs 三次重试 push 均 `Could not connect to github.com port 443`，为本机到远端纯网络阻断（路由层）。启 Proxy 后 `curl --max-time 15 https://github.com/` 从 timeout 0.0xs 转为 HTTP 200 in 0.20s。

### 13.2 配置命令

```bash
# 仓储级别（推荐，不影响其他项目）
git config --local http.proxy http://127.0.0.1:7897
git config --local https.proxy http://127.0.0.1:7897

# 全局（如果多个项目都需绕过）
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897

# 仅 GitHub 域名（粒度更细，non-GitHub 流量不代理）
git config --local http.https://github.com.proxy http://127.0.0.1:7897
git config --local https.https://github.com.proxy http://127.0.0.1:7897

# 取消代理
git config --local --unset http.proxy
git config --local --unset https.proxy
```

### 13.3 验证

```bash
# 1. 代理端口连通测试
curl -x http://127.0.0.1:7897 -o /dev/null -s \
  -w 'github.com via proxy: HTTP %{http_code} | time %{time_total}s\n' \
  --max-time 15 https://github.com/
# 期望：HTTP 200 | time 0.20..3.0s（未代理时为 timeout 或 0.0xs）

# 2. 验证 git 已读到 proxy
cd path/to/Nook && git config --get http.proxy
# 期望：http://127.0.0.1:7897

# 3. 实推一次
cd path/to/Nook && git push origin main
# 期望看到：To https://github.com/yx368491-cpu/Nook.git ... => refs/heads/main
```

### 13.4 与现有决策的一致性

- **F-SEC-06** / **D-03**：本配置走 HTTP 网络层代理，不影响 git protocol 层加密（push 流量仍走 TLS in tunnel），不违反 secret/key 安全约束。
- **D-15** 部署架构：CF Pages 部署链路不依赖代理（CF CDN 跨过 GFW），无需为生产 CI 配代理。
- **GitHub Actions CI**：CI runner 在 GitHub提供的 云虚拟环境里，不在中国网络上，不需配置代理。

### 13.5 故障排查

| 症状 | 原因 | 解决 |
|---|---|---|
| `fatal: unable to access ... Connection was reset` | 真直连 443 航 GFW reset | 确认代理运行 + 端口正确：检查 Clash Verge 是否启用系统代理 + 端口 7897 |
| `Failed to connect to 127.0.0.1:7897` (port closed) | 本机代理服务未启动 / 端口 misconfig | 启动 Clash Verge / 检查 `netstat -ano \| grep 7897` 是否正听 |
| `407 Proxy Authentication Required` | Clash Verge 启用了 authentication | 在 git proxy URL 中加入账号密码：`http://user:pass@127.0.0.1:7897`（password 会被 git config 记录于 .git/config，可能不希望） |
| `could not read Username for 'https://github.com'` | proxy 转发后仍需 auth Token | `gh auth login` 后用 `gh repo sync` 路径 / 或使用 Personal Access Token |
| curl / push 仍 0.20s timeout 而未 proxy | 环境变量 也在覆盖 git config | 检查 `env \| grep -i proxy` （HTTPS_PROXY / http_proxy / NO_PROXY）会覆盖 git config |

### 13.6 变更历史

| 日期 | 内容 |
|---|---|
| 2026-07-01 | 初版 · 源于 M8-0.1 push 失败三次后才走 Clash Verge (port 7897) 穿透成功后的记录。限文档冻结 patch，不改任何 workflow 本体决策。 |
