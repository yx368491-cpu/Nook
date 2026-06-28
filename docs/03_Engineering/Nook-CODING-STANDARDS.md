# Nook · Coding Standards v1.0 (Stage 13)

> **Stage 13 · CODING STANDARDS — Frozen for Nook v1.0**
> 文档生成日：2026-06-27 · 关联：`Nook-SPEC v1.0.1`（SoT）· `Nook-PROJECT-STRUCTURE.md v1.0`（目录结构）· `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md`（架构）· `../02_Architecture/Nook-API-DESIGN-v1.0.md`（API 契约）· `DECISIONS.md`（ADR）
> 性质：**唯一可信的编码规范来源**（Single Source of Truth for Code）。适用于所有开发者 + 所有 AI Coding Agent（Buffy / Claude Code / GPT / Gemini / Cursor）。
> 后续所有代码必须遵循本规范。任何与本规范矛盾的代码 → 视为不合格。

---

## 0. 元规则

### 0.1 文档层级

| 层 | 文档 | 与本文关系 |
|---|---|---|
| **产品需求** | `../01_Product/Nook-SPEC.md` v1.0.1 | 定义「做什么」——本文不重复 |
| **架构** | `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md` | 定义「如何搭」——本文引用但不重复 |
| **目录结构** | `Nook-PROJECT-STRUCTURE.md` v1.0 | 定义「放哪里」——本文是对其的编码补充 |
| **ADR** | `DECISIONS.md` + `docs/adr/` | 定义「为什么」——本文不重复 |
| **编码规范** | **本文** | 定义「怎么写」—— 唯一编码规范 |

### 0.2 适用范围

- ✅ `src/` 全部 TypeScript / TSX 代码
- ✅ `supabase/functions/` Edge Function TypeScript 代码
- ✅ `scripts/` 工具脚本
- ✅ `tests/` 全部测试文件
- ✅ `supabase/migrations/` SQL（命名规范部分）
- ❌ `spec/` 文档（不受本文约束）

### 0.3 变更日志

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-27 | v1.0 | 初版。基于 Nook 全部已冻结文档生成 |

---

## 一、总体原则（General Principles）

| # | 原则 | 含义 | 反映在 |
|---|---|---|---|
| **P-01** | **Readability First** | 代码先被人类阅读，再被机器执行。命名 > 注释 > 复杂逻辑 | 所有命名、组件拆分 |
| **P-02** | **Consistency First** | 风格、命名、结构处处一致。不要在同一文件混用多种风格 | 本文件全部规则 |
| **P-03** | **Simplicity First** | 选最简单的方案，不做过度抽象。不需要设计模式的地方不要用 | React 组件、hooks 设计 |
| **P-04** | **Type Safety First** | 用 TypeScript 的类型系统表达不变性。禁止 `any` | § 三 TypeScript 规范 |
| **P-05** | **DRY（Don't Repeat Yourself）** | 重复 3 次以上的逻辑 → 提取 | Feature services + shared 层 |
| **P-06** | **KISS（Keep It Simple, Stupid）** | 每个函数/组件只做一件事 | 组件拆分、hook 设计 |
| **P-07** | **SOLID（单一职责 / 开闭 / 替换 / 接口隔离 / 依赖反转）** | 模块间低耦合，高内聚 | Import Rules、Feature isolation |
| **P-08** | **Convention over Configuration** | 约定俗成的目录/命名规则，不需要额外配置 | 命名规范、Import 路径 |

### 1.1 AI Coding Agent 行为准则

本规范同样适用于所有 AI Coding Agent。AI 输出代码时必须：

1. **严格遵守命名规范**（不可发明新风格）
2. **不硬编码任何值**（颜色/文本/间距 → Design Tokens + i18n）
3. **任何文件修改后**检查 Import、类型、空状态、错误状态
4. **不创建未在 PROJECT-STRUCTURE 中规划的目录**
5. **不修改已冻结的 Spec / Architecture / ADR**

---

## 二、命名规范（Naming Convention）

### 2.1 文件命名

| 类型 | 规范 | 示例 | 例外 |
|---|---|---|---|
| React 组件 | `PascalCase.tsx` | `Button.tsx`, `MessageList.tsx` | — |
| 页面组件 | `PascalCase.tsx` | `HomePage.tsx`, `SettingsAdminPage.tsx` | — |
| React hooks | `use<CamelCase>.ts` | `useLogin.ts`, `useSendMessage.ts` | 不含 JSX 时用 `.ts` |
| 服务/API 封装 | `camelCase.ts` | `messages.ts`, `compressImage.ts` | — |
| 类型定义 | `camelCase.ts` | `domain.ts`, `errors.ts` | — |
| 常量 | `camelCase.ts` | `limits.ts`, `time.ts` | — |
| Zustand store | `use<CamelCase>.ts` | `useChat.ts`, `useUI.ts` | 因为是 hook 形式 |
| 单元测试 | `<name>.test.ts(x)` | `Button.test.tsx`, `useLogin.test.ts` | — |
| E2E 测试 | `<domain>.spec.ts` | `auth.spec.ts`, `chat.spec.ts` | — |
| DB migration | `NNNN_<slug>.sql` | `0001_init.sql`, `0002_rls.sql` | 4 位数字前缀 |
| Edge Function | `kebab-name/` | `admin-create-invite/` | 目录名即为函数名 |
| 配置文件 | `camelCase.ext` | `vite.config.ts`, `tailwind.config.ts` | — |

### 2.2 变量命名

| 类型 | 规范 | 正例 | 反例 |
|---|---|---|---|
| 普通变量 | `camelCase` | `const userName = ...` | `const user_name = ...` |
| Boolean | `is*` / `has*` / `can*` / `should*` | `isLoading`, `hasError`, `canSend` | `loading`, `error` |
| Array | 复数名词 | `messages`, `friends`, `conversations` | `messageArr`, `msgList` |
| Map | `*Map` | `presenceMap`, `reactionMap` | `presences` |
| Set | `*Set` | `selectedIds`, `processedSet` | — |
| Enum | `PascalCase` | `MessageKind`, `ConversationKind` | `MESSAGE_KIND` |
| Enum 值 | `PascalCase` | `MessageKind.Text`, `MemberRole.Owner` | `TEXT`, `owner_role` |
| 常量（const） | `UPPER_SNAKE` | `MAX_FILE_SIZE_BYTES`, `EDIT_WINDOW_MS` | `maxFileSize`, `editWindowMs` |
| DB 变量→FE 映射 | `camelCase` | `displayName` (来自 `display_name`) | 直接暴露 `display_name` |
| Private 变量 | `_camelCase` | `_unsubscribe`, `_internalState` | — |

### 2.3 函数命名

| 类型 | 前缀/规则 | 正例 | 反例 |
|---|---|---|---|
| 获取数据 | `get*` / `fetch*` / `use*`（hook） | `getMessages()`, `useConversations()` | `messages()` |
| 创建 | `create*` | `createInvite()`, `createConversation()` | `addInvite()` |
| 更新 | `update*` / `set*` | `updateDisplayName()`, `setActiveConv()` | `changeName()` |
| 删除 | `delete*` / `remove*` | `deleteFriend()`, `removeReaction()` | `eraseFriend()` |
| 判断 | `is*` / `has*` / `can*` / `should*` | `isValidEmail()`, `canEditMessage()` | `checkValid()` |
| 事件处理 | `handle*` | `handleSend()`, `handleKeyDown()` | `onSubmit()`, `sendHandler()` |
| 异步函数 | `async` / `Promise` 返回 | `async function sendMessage()` | 不加 async |
| 转换 | `to*` / `from*` / `*To*` | `toISOString()`, `mapSupabaseError()` | — |
| API 封装 | `<module>Api.<method>` | `messagesApi.list()`, `adminApi.signup()` | — |

### 2.4 组件命名

| 层级 | 规范 | 示例 |
|---|---|---|
| **原子组件**（Design System） | 单一名词 | `Button`, `Input`, `Avatar`, `Bubble` |
| **布局组件** | 形容词 + 名词 | `AppShell`, `Sidebar`, `Modal` |
| **复合组件**（跨 feature） | 业务功能名 | `MessageList`, `Composer`, `UnreadDot` |
| **Feature 组件** | 具体角色名 | `LoginForm`, `FriendList`, `EmojiPicker` |
| **页面组件** | `<name>Page` | `HomePage`, `SettingsProfilePage` |
| **高阶组件 / Guard** | `Require*` | `RequireAuth`, `RequireOwner` |
| **HOC** | `with*` | `withErrorBoundary`, `withSuspense` |

---

## 三、TypeScript 规范

### 3.1 Interface vs Type

| 场景 | 推荐 | 理由 |
|---|---|---|
| Props 定义 | `interface` | 性能更好；自动合并 |
| API 响应形状 | `interface` | 同 Props |
| 组件 Props | `interface ComponentNameProps` | 命名约定 |
| 联合类型 | `type` | 不能用 interface |
| 工具类型 | `type` | `Pick`, `Omit` 等 |
| 函数签名 | `type` | `type Fn = (x: T) => U` |

### 3.2 禁止 any



```typescript
// ❌ 禁止
function process(data: any) { ... }

// ✅ 正确
function process<T>(data: T) { ... }
function process(data: unknown) { ... }  // 必须检查类型
```



**唯一例外**：`Record<string, unknown>` 在 jsonb payload 等通用场景。

### 3.3 Enum 使用规则



```typescript
// ✅ 推荐：const enum + string values（编译时内联，无运行时开销）
export const enum MessageKind {
  Text = 'text',
  Image = 'image',
  File = 'file',
}

// ⚠️ 或使用 as const 对象（BFF 接口类型）
export const MESSAGE_KINDS = ['text', 'image', 'file'] as const;
export type MessageKind = typeof MESSAGE_KINDS[number];
```



- 优先用 `as const` + type pattern（尤其在共享类型 `src/shared/types/` 中）。
- DB enum 和后端枚举同步使用 `const enum`（单点定义）。
- 避免 `enum` 默认数值赋值（容易导致不兼容变更）。

### 3.4 Generic 使用原则

- 通用工具函数使用 Generic（如 `mapSupabaseError<T>()`）。
- 业务逻辑中不过度抽象——单个组件用 2 个以上 Generic 就不值得。
- Generic 命名单字母（`T`, `K`, `V`）或全名（`TData`, `TError`），`T` 为首选。

### 3.5 类型推导原则



```typescript
// ✅ 让 TypeScript 推导简单类型
const userName = 'Alice';  // 自动推导为 string

// ✅ 显式标注复杂类型
const messages: Message[] = [];

// ✅ 函数返回值显式标注
function fetchMessages(): Promise<Message[]> { ... }

// ✅ 组件 Props 必须显式 interface
interface ButtonProps {
  intent: 'neutral' | 'accent' | 'danger';
  children: React.ReactNode;
}
```



### 3.6 Null / Undefined 使用规范

| 场景 | 使用 | 理由 |
|---|---|---|
| 可选字段（API 返回） | `T \| null` | API JSON 中 null 比 undefined 更明确 |
| 可选 Props | `prop?: T` | JSX 语义 |
| 可选 hook 返回值 | `T \| null` | null 明确表示「无值」 |
| 独立状态「未加载」 | `undefined` | `data === undefined` = loading |
| 状态「加载完成但无结果」 | `null` | `data === null` = empty |

### 3.7 文件组织

每个类型文件最多包含 3 类内容。超过 → 拆分为多个文件。



```
src/shared/types/
├── domain.ts    // 所有业务实体类型
├── db.ts        // Supabase gen types
└── errors.ts    // ErrorCode enum + ApiError
```



---

## 四、Import 规范

### 4.1 Import 顺序

每个文件中的 import 必须按以下顺序分组（组间空行）：



```typescript
// 1. 标准库 / Node built-in
import { ... } from 'node:...';

// 2. 第三方依赖（npm）
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 3. 项目内部 lib/ 和 shared/
import { supabase } from '@/lib/supabase';
import { type Message } from '@/shared/types';

// 4. 项目内部 components/
import { Button } from '@/components/ui/Button';

// 5. 项目内部 features/（同 feature 的相对引用）
import { useLogin } from '../hooks/useLogin';

// 6. CSS / 样式
import './styles.css';
```



### 4.2 路径别名

`tsconfig.json` 配置 `@/` → `src/`：



```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```



- Feature 内部引用同目录的内容使用**相对路径**（`../hooks/useLogin`）。
- Feature 引用 lib / shared / components 使用**绝对路径**（`@/lib/supabase`）。
- 跨 Feature 引用**禁止**（见 § 4.3）。

### 4.3 禁止引用（Import Rules 重申）

| 规则 | 描述 | CI 检查 |
|---|---|---|
| **R1** | Feature A **不可** import Feature B 的任何内容 | `import/no-restricted-paths` |
| **R2** | `lib/` **不可** import `features/` 或 `app/` | 同上 |
| **R3** | `components/` **不可** import `features/` | 同上 |
| **R4** | `shared/` **不可** import `src/` 内任何非 `shared/` 代码 | 同上 |
| **R5** | `pages/` **不可**直接调 `lib/api/`（必须经 features/services/） | Code Review |
| **R6** | **不可**从 `lib/api/` 直接调 `supabase-js` 之外的 API | Code Review |
| **R7** | **禁止**循环引用（A → B → A） | `import/no-cycle` |
| **R8** | **禁止** `index.ts` 桶文件反向引入子模块 | Code Review |

### 4.4 依赖方向（重申）



```
pages/ ← features/ ← components/ + lib/ + stores/ + hooks/ ← shared/
```



---

## 五、React 规范

### 5.1 组件组织

- 每个文件 **一个默认导出**（主要组件），**可以多个命名导出**（子组件、帮助函数）。
- 组件文件 ≤ 200 行（超长 → 拆分子组件或提取 hook）。
- 子组件紧跟在父组件同一文件中，或提取到 `components/` 目录。

### 5.2 Props



```typescript
// ✅ 规范
interface ButtonProps {
  intent: 'neutral' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// ❌ 禁止用 React.FC（Hooks + TS 不再需要）
const Button = ({ intent, size, children }: ButtonProps) => { ... };
```



- Props interface 命名：`<ComponentName>Props`。
- Props 使用 `interface`（非 `type`）。
- 所有 **boolean props** 使用 `is*` / `has*` / `should*` 命名。
- 所有 **事件 handler props** 使用 `on*` 命名。
- 不允许 `{...rest}` 透传——显式列出所有 Props。

### 5.3 Hooks



```typescript
// ✅ 规范
export function useMessages(conversationId: string) {
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messagesApi.list(conversationId),
  });

  const send = useMutation({
    mutationFn: (body: string) => messagesApi.send({ conversationId, kind: 'text', body, client_msg_id: crypto.randomUUID() }),
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    send,
  };
}
```



- Hook 文件命名：`use<Name>.ts`。
- 每个 hook **只做一件事**（单一职责）。
- Hook 返回值用对象（而非数组），方便扩展。
- 所有异步数据用 TanStack Query（不手写 `useState` + `useEffect`）。
- 所有 client state 用 Zustand（不手写 `useContext` + `useReducer`）。

### 5.4 State 管理

| State 类型 | 工具 | 存储位置 |
|---|---|---|
| 服务端数据（消息、会话、反应） | TanStack Query | `src/lib/api/*` 自动缓存 |
| 客户端 UI 状态（active conv, modal, locale） | Zustand | `src/stores/*` |
| 本地表单状态 | `useState` / React Hook Form | 组件内 |
| 在线状态 | Zustand + Realtime Presence | `src/stores/usePresence.ts` |
| 离线 outbox | Dexie | `src/lib/db/outbox.ts` |

**禁止**：
- ❌ 把服务端数据放在 Zustand 中（导致双源不一致）
- ❌ 在 `useEffect` 中手动 fetch（使用 TanStack Query）
- ❌ 在 useState 中存储派生数据（用 `useMemo` 替代）

### 5.5 Context

**尽量不用 Context**。Nook 只有 2 个场景使用：
1. 路由守卫 `<RequireAuth>` 注入 auth 上下文。
2. 设计 Token CSS 变量注入（`tokens.css` — 不通过 Context）。

Zustand store 可以作为全局状态的更简单替代。

### 5.6 Side Effects

- Side effect 放在 `useEffect` 中（或 custom hook 封装）。
- Effect 必须显式标注依赖项（禁止 lint disable comment）。
- 订阅/取消订阅模式必须返回 cleanup function。



```typescript
useEffect(() => {
  const channel = subscribeToConversation(convId);
  return () => channel.unsubscribe();
}, [convId]);
```



### 5.7 Composition

- 优先组合而非继承。
- Component composition over configuration——使用 `children` + render props 构建灵活 UI。
- 复合组件和原子组件的边界见 `Nook-PROJECT-STRUCTURE.md § 四`。

---

## 六、错误处理规范

### 6.1 异常抛出

- 业务规则错误（如编辑超时、群满）由 DB trigger 抛 `exception` → 客户端 `mapSupabaseError()` 映射。
- Edge Function 内使用 `try-catch` 包裹所有 DB 操作，返回统一 `ApiError` 格式。
- 不允许在客户端抛出非 ApiError 格式的异常。

### 6.2 异常捕获

| 层 | 捕获机制 | 处理方式 |
|---|---|---|
| API 封装（lib/api/） | `try-catch` + `mapSupabaseError()` | 返回 `ApiError` |
| Feature service（features/*/services/） | `try-catch` | 做业务决策（重试/回退） |
| 页面组件 | TanStack Query `onError` | 显示 toast / inline error |
| 顶层 | `<ErrorBoundary>` + Sentry | 记录异常 + 显示错误页 |

### 6.3 日志



```typescript
// 开发环境：console（走 LogSnag 结构化事件，不写 message body）
console.error('[auth] login failed', { userId, errorCode });

// 生产环境：Sentry 仅上报 user_id + error_code
Sentry.captureException(error, { tags: { errorCode: 'E_AUTH_INVALID_CREDENTIALS' } });

// 绝对禁止：
// console.log(messageBody);
// Sentry.setContext('message', { body: message.body });
```



### 6.4 用户提示

| 场景 | 提示方式 | 示例 |
|---|---|---|
| 操作成功 | Toast（accent 色，2s 自动关闭） | 「邀请已创建」 |
| 操作失败 | Toast（error 色，5s / 手动关闭） | 「群已达4个上限」 |
| 校验错误 | Inline error（表单下方） | 「密码至少8个字符」 |
| 网络错误 | Toast + 重连指示 | 「网络已断开，正在重连...」 |
| 500 错误 | `<ErrorPage>` | 「出了点问题，请稍后重试」 |

### 6.5 重试策略

| 场景 | 重试方式 | 最大次数 |
|---|---|---|
| 消息发送失败（离线） | Outbox + SW background sync | 无限（直到成功） |
| 消息发送失败（服务端 5xx） | 手动重试 | 3 次 |
| 图片上传失败 | 手动重试 | 3 次 |
| Realtime 断连 | supabase-js 自动 | 无限 |

### 6.6 边界处理

- **Loading state**：每个数据请求必须有 loading indicator（TanStack Query `isLoading`）。
- **Empty state**：每个列表必须考虑空数据（显示引导/提示）。
- **Error state**：每个 mutation 必须有错误处理（onError / try-catch）。
- **Success state**：成功操作后必须有反馈（toast / in-line）。
- **Optimistic state**：发送消息先本地展示（乐观更新），服务端确认后替换。

---

## 七、国际化规范（i18n）

### 7.1 原则

| 规则 | 描述 |
|---|---|
| **禁止硬编码 UI 文本** | 所有用户可见文案走 i18next key |
| **消息原文不翻译** | display_name / message body / attachment filename 不翻（F-I18N-03） |
| **双语全覆盖** | zh-CN + en 完整覆盖（AC.AC.i18n） |
| **ICU MessageFormat** | 支持 plural / select（AC.AC.i18n.plural） |

### 7.2 Key 命名



```
<domain>.<component>.<description>
```



| 示例 Key | 中文 | English |
|---|---|---|
| `chat.composer.placeholder` | 「说点什么...」 | 「Say something...」 |
| `chat.message.edited` | 「(已编辑)」 | 「(edited)」 |
| `chat.message.recalled` | 「此消息已撤回」 | 「This message has been withdrawn」 |
| `invite.created.success` | 「邀请已创建」 | 「Invite created」 |
| `error.auth.unauthorized` | 「请先登录」 | 「Please sign in」 |
| `error.res.groupLimit` | 「已达 4 群上限」 | 「Reached the 4-group limit」 |
| `unread.count` | `{count, plural, =0 {无未读} one {1 条} other {# 条}}` | `{count, plural, =0 {no unread} one {1} other {#}}` |

### 7.3 语言文件组织



```
src/lib/i18n/locales/
├── zh-CN/
│   └── translation.json
└── en/
    └── translation.json
```



- 两个文件保持**完全相同的 key 结构**。
- 新增 key 必须同时添加到两个文件。

### 7.4 代码规范



```typescript
// ✅ 正确
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
return <Button>{t('chat.composer.placeholder')}</Button>;

// ❌ 禁止
return <Button>说点什么...</Button>;
return <Button>Say something...</Button>;
```



---

## 八、主题规范（Theme）

### 8.1 原则

| 规则 | 描述 |
|---|---|
| **禁止硬编码颜色** | 所有颜色 / 圆角 / 字体 / 阴影 / 间距走 Design Tokens |
| **单源 Design Tokens** | `tokens/index.ts` 是唯一颜色来源 |
| **Tailwind + CSS 变量** | `tailwind.config.ts` 注入 token → 业务代码用 Tailwind class |
| **纯 CSS 后备** | 特殊场景用 CSS `var(--token-name)` |

### 8.2 业务代码规范



```typescript
// ✅ 正确：Tailwind class
<Button className="bg-accent-solid text-on-accent rounded-lg" />

// ✅ 正确：CSS 变量（特殊情况）
const style = { backgroundColor: 'var(--color-accent-solid)' };

// ❌ 禁止
<Button style={{ backgroundColor: '#6EE7B7', borderRadius: '8px' }} />
<Button className="text-[#6EE7B7]" />
```



### 8.3 不可硬编码清单

| 样式属性 | 来源 | 业务代码方式 |
|---|---|---|
| 颜色 | `tokens/index.ts` | Tailwind class / `var(--color-*)` |
| 圆角 | `tokens/index.ts` | Tailwind class / `var(--radius-*)` |
| 字体 | `public/fonts/` 自托管 | Tailwind `font-inter` / `font-mono` |
| 阴影 | `tokens/index.ts` | Tailwind `shadow-*` / `var(--shadow-*)` |
| 间距 | Tailwind 内置 | Tailwind `p-*` / `m-*` / `gap-*` |
| 字号 | Tailwind 内置 | Tailwind `text-*` |
| 动画持续 | CSS `var(--duration-*)` | 支持 `prefers-reduced-motion` |
| 断点 | Tailwind `sm/md/lg/xl` | Tailwind responsive prefix |

### 8.4 Dark Theme 强制

- `:root { color-scheme: dark }` 全局强制。
- **禁止** light mode 切换入口（SPEC § 1.7.2）。
- 颜色 token 全部深色设计，不存在「light token」值。

---

## 九、注释规范

### 9.1 必须注释的场景

| 场景 | 注释类型 | 示例 |
|---|---|---|
| **公开 API 函数** | JSDoc | `/** 拉取指定会话的消息列表 */` |
| **复杂业务逻辑** | 行注释 | `// 为什么这里不防重覆：client_msg_id 已在 DB unique` |
| **ADR / 决策原因** | 行注释 | `// ADR-004: 列级软隐藏而非 DELETE` |
| **TODO / FIXME** | 标注 | `// TODO(v1.1): 加 pagination` |
| **类型定义** | 行注释 | `// deleted_by_sender_at: 仅发送者端软隐藏` |
| **特殊行为** | 行注释 | `// 故意不 catch：让 Sentry 捕获未处理异常` |

### 9.2 禁止注释的场景

| 场景 | 原因 | 替代 |
|---|---|---|
| **自解释代码** | 增加噪音 | 优化命名 |
| **坏代码** | 掩盖问题 | 重构 |
| **版本历史** | Git blame 已有 | 删掉 |
| **关闭 linter** | 除非绝对必要 | 重构绕过 lint |
| **大段版权声明** | 冗余 | 文件头部一行 `// Nook v1.0` |

### 9.3 JSDoc 规范



```typescript
/**
 * 发送文字消息
 * @param conversationId - 目标会话 UUID
 * @param body - 消息正文（1-4000 字符）
 * @param replyToId - 可选，引用的消息 ID
 * @returns 创建后的 Message 对象
 * @throws {E_VAL_EDIT_WINDOW_EXPIRED} 超 2 分钟编辑会失败
 */
async function sendMessage(
  conversationId: string,
  body: string,
  replyToId?: string
): Promise<Message> { ... }
```



---

## 十、测试规范

### 10.1 测试层级（ADR-020）

| 层级 | 工具 | 范围 | 运行时机 |
|---|---|---|---|
| **Unit** | Vitest + Testing Library | 原子组件、hooks、store、pure functions | 每次 commit |
| **Integration** | Vitest + Supabase local | API 端点、RLS policy、Realtime | PR CI |
| **E2E** | Playwright | 关键业务流程（BF-01 ~ BF-15） | PR CI + 部署前 |

### 10.2 测试文件位置



```
tests/
├── unit/
│   ├── components/   →  <Name>.test.tsx
│   ├── hooks/        →  use<hookName>.test.ts
│   ├── services/     →  <serviceName>.test.ts
│   └── stores/       →  use<StoreName>.test.ts
├── integration/
│   ├── api/          →  <endpoint>.test.ts
│   └── realtime/     →  <channel>.test.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── chat.spec.ts
│   ├── invite.spec.ts
│   ├── admin.spec.ts
│   └── responsive.spec.ts
```



### 10.3 覆盖原则

| 类型 | 最低覆盖率 | 优先覆盖 |
|---|---|---|
| **Unit** | 80%（核心逻辑 90%+） | 组件 prop 组合、hooks 状态转换、错误路径 |
| **Integration** | 关键 endpoint 100% | RLS policy、message CRUD、reaction toggle |
| **E2E** | 100% 关键流 | BF-01 ~ BF-15 每条流至少 1 条 E2E |

### 10.4 Mock 规范

- **Supabase client mock**：使用 `tests/mocks/supabase.ts` 中的工厂函数。
- **Realtime mock**：使用 Vitest `vi.fn()` 模拟 channel。
- **API 返回 mock**：使用 `tests/mocks/factories.ts` 中的实体工厂创建测试数据。
- **禁止** mock 超过 2 层（如 mock fetch → mock supabase → mock Realtime → 失去测试意义）。

### 10.5 Fixture 规范

- 图片 fixture（1x1.png, 10MB.jpg）放在 `tests/fixtures/images/`。
- 样例行数据放在 `tests/fixtures/sample-messages.json`。
- 测试夹具不包含任何实际用户数据。

---

## 十一、禁止事项（Anti-patterns）

| # | 禁止项 | 原因 | 替代 |
|---|---|---|---|
| **A-01** | `any` 类型 | 破坏类型安全 | `unknown` + 类型守卫 |
| **A-02** | Magic Number | 不可读、难维护 | `MAX_FILE_SIZE_BYTES` 常量 |
| **A-03** | Magic String | 同 Magic Number | i18n key / enum / const |
| **A-04** | 硬编码颜色 | 破坏 Theme 统一性 | Tailwind class / `var(--color-*)` |
| **A-05** | 硬编码 UI 文本 | 破坏 i18n | i18next key `t('...')` |
| **A-06** | 重复代码（3 次+） | 维护成本倍增 | 提取函数/组件/hook |
| **A-07** | 跨层引用（lib → features） | 模块耦合 | 通过 store / shared 间接 |
| **A-08** | 跨 Feature 引用 | Feature 边界破坏 | 通过 store 间接通信 |
| **A-09** | 未使用 Design Tokens | 风格不一致 | `tokens/index.ts` + Tailwind |
| **A-10** | 未使用国际化 | i18n 不完整 | `t('key')` 替代硬编码 |
| **A-11** | 未更新开发文档 | 信息衰减 | 开发后更新 docs/ |
| **A-12** | `...rest` 透传 Props | 不可追踪 | 显式列出所有 Props |
| **A-13** | `useEffect` 手动 fetch | 状态管理混乱 | TanStack Query |
| **A-14** | `any` 类型断言 | 同 A-01 | 类型守卫 |
| **A-15** | 大文件（>300 行） | 可读性差 | 拆组分、提取 hook |
| **A-16** | 循环依赖 | 构建崩溃 | `import/no-cycle` CI 检查 |
| **A-17** | `console.log` 在生产 | 信息泄漏 | LogSnag / Sentry |
| **A-18** | 裸 `try-catch` 吞错误 | 隐藏 bug | 至少 log + rethrow |
| **A-19** | 非 LTS 依赖 | 供应链风险 | React 18 / Vite 5 / TS 5 |
| **A-20** | 同步 API 在主线程 | UI 卡顿 | async / worker / SW |
| **A-21** | edit / recall 窗口漏检查 | 绕过产品约束 | trigger + UI disabled 双层 |
| **A-22** | 直接写 DB 而非经过 EF | 绕过 RLS + 审计 | admin-* EF 封裝 |

---

## 十二、AI Coding Protocol（AI 开发协议）

> 本协议适用于**所有** AI Coding Agent（Buffy / Claude Code / GPT / Gemini / Cursor）。

### 12.1 开发前（Pre-Development）

**必须自动阅读**：

1. `AI_HANDOVER.md` — 项目概况 + 当前技术状态
2. `DEVELOPMENT_LOG.md` — 最近 1-2 个 Session
3. `TODO.md` — 当前阶段活跃任务
4. `../01_Product/Nook-SPEC.md § 1-3` — 概述 + 功能 + 数据需求
5. `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 4-7` — schema + RLS + API + 部署
6. `KNOWN_ISSUES.md` — 当前风险

**输出确认**（token 前必须生成）：

- 当前项目状态总结
- 当前开发阶段和目标
- 当前主要风险

### 12.2 开发中（During Development）

**不得修改**：

- ❌ `../01_Product/Nook-SPEC.md`（已冻结 v1.0/v1.0.1）
- ❌ `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md`（已冻结）
- ❌ `Nook-PROJECT-STRUCTURE.md`（已冻结）
- ❌ `DECISIONS.md`（ADR —— 新增不覆盖）
- ❌ `tokens/` Design Tokens（已冻结）

**冲突处理**：

1. **立即停止**当前操作
2. 向 Project Lead 报告冲突详情
3. 等待显式确认后再继续

### 12.3 开发完成后（Post-Development）

**必须更新**：

- ✅ `DEVELOPMENT_LOG.md`（追加新 Session 条目）
- ✅ `TODO.md`（更新任务状态）
- ✅ `AI_HANDOVER.md`（更新当前阶段 + 技术状态）
- ✅ `CHANGELOG.md`（新版本条目）

**如适用**：

- ✅ `KNOWN_ISSUES.md`（发现新 issue 时）
- ✅ `DECISIONS.md`（新 ADR 时）

**必须输出**：

- 本次开发总结（1-2 段文本）
- Quality Gate 结果（PASS / FAILED）

### 12.4 AI 自检（AI Self Review）

完成开发后，AI 必须在最终输出前进行自检：

| 检查项 | 通过条件 |
|---|---|
| 代码符合本 Coding Standards | 命名、格式、Import、组件 无违规 |
| 不违反 Architecture | 未引用已禁功能、未绕过 EF |
| 不违反 ADR | 未推翻已冻结决策 |
| 不违反 Project Structure | 未创建未规划顶层目录 |
| 不违反 Design Tokens | 无硬编码颜色/间距/字体 |
| 国际化无遗漏 | 新 UI 文本走 i18n |
| Theme 无遗漏 | 新元素使用 Design Tokens |
| 错误处理无遗漏 | loading/empty/error/success 态齐全 |
| 响应式无遗漏 | ≥ 1024px + < 1024px 两种布局 |
| 文档更新无遗漏 | DEVELOPMENT_LOG / TODO / AI_HANDOVER 已更新 |

---

## 十三、配置规划（Configuration Planning）

> **本阶段仅规划，不创建配置文件**。以下为 M1 Foundation 启动时需创建的配置文件清单。

### 13.1 必需配置文件（Required）

| 文件 | 职责 | 创建阶段 | 注意事项 |
|---|---|---|---|
| `tsconfig.json` | TypeScript 编译配置（strict 模式 + `@/` 路径别名） | M1 | `strict: true`, `noUncheckedIndexedAccess: true` |
| `tsconfig.node.json` | Node 侧 TS 配置（Vite config） | M1 | extends tsconfig.json |
| `.eslintrc.cjs` | ESLint 配置（TS + React + import 规则） | M1 | 开启 `import/no-restricted-paths`, `import/no-cycle` |
| `.prettierrc` | Prettier 格式化配置（单引号、2 空格、尾逗号） | M1 | 和 ESLint `--fix` 配合 |
| `vite.config.ts` | Vite 配置（React plugin + path alias + PWA plugin） | M1 | 配置 `@/` → `src/` |
| `tailwind.config.ts` | Tailwind 配置（Design Tokens 注入） | M1 | 引用 `tokens/index.ts` |
| `package.json` | npm 包配置（scripts：dev/build/typecheck/lint/test） | M1 | scripts 见 § 13.3 |
| `.gitignore` | Git ignore 配置 | M1 | 排除 node_modules / dist / .env / .wrangler |
| `.env.example` | 环境变量模板 | M1 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 等 |
| `wrangler.toml` | Cloudflare Pages 部署配置 | M1 | `pages_build_output_dir = "dist"` |
| `supabase/config.toml` | Supabase 项目配置 | M3 | 含 DB URL / API Keys / 函数部署 |

### 13.2 可选配置文件（Optional）

| 文件 | 建议 | 职责 | 理由 |
|---|---|---|---|
| `.editorconfig` | ✅ 启用 | 跨编辑器基础格式（缩进、编码） | 小型项目可选，但推荐 |
| `.vscode/settings.json` | ✅ 启用 | VS Code 推荐设置（format on save, TS strict） | 提高团队开发效率 |
| `.vscode/extensions.json` | ✅ 启用 | 推荐扩展列表 | 新开发者一键安装 |
| `commitlint.config.js` | ❌ 不启用 | Commit 消息规范 | 单人 MVP 阶段收益不高 |
| `.husky/pre-commit` | ❌ 不启用 | pre-commit lint-staged | v1.0 单人阶段可跳过 |
| `lint-staged.config.js` | ❌ 不启用 | lint-staged 配置 | 同 Husky |
| `.github/workflows/ci.yml` | ✅ 启用 | CI/CD 流水线 | 见 ARCH-DESIGN § 7.5 |
| `playwright.config.ts` | ✅ 启用 | E2E 测试配置 | M7 实施 |
| `.nvmrc` | ❌ 不启用 | Node 版本固定 | 项目兼容 Node 18+ 即可 |

### 13.3 Package Scripts 规划



```jsonc
{
  "scripts": {
    "dev": "vite",                          // 开发服务器
    "build": "tsc --noEmit && vite build",  // 生产构建
    "preview": "vite preview",              // 预览构建产物
    "typecheck": "tsc --noEmit",            // CI: 类型检查
    "lint": "eslint 'src/**/*.{ts,tsx}' --fix", // CI: lint
    "format": "prettier --write 'src/**/*.{ts,tsx}'", // 格式化
    "test": "vitest run",                   // CI: 单元测试
    "test:watch": "vitest",                 // 开发: 热重载测试
    "test:e2e": "playwright test",          // CI: E2E
    "test:e2e:ui": "playwright test --ui",  // 开发: E2E UI 模式
    "deploy:fe": "wrangler pages deploy dist --project-name=nook",  // FE 部署
    "deploy:ef": "supabase functions deploy",  // EF 部署（参数见 wrangler）
    "supabase:start": "supabase start",     // 本地 Supabase
    "supabase:stop": "supabase stop",       // 停止本地
    "supabase:db:push": "supabase db push", // 应用 migrations
    "supabase:gen:types": "supabase gen types typescript --local > src/types/db.ts", // 类型生成
  }
}
```



### 13.4 npm 依赖规划（M1 Foundation）



```jsonc
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.x",
    "zustand": "^4.x",
    "@tanstack/react-query": "^5.x",
    "i18next": "^23.x",
    "react-i18next": "^14.x",
    "dexie": "^4.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@supabase/supabase-js": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x",
    "eslint": "^8.x",
    "@typescript-eslint/eslint-plugin": "^7.x",
    "@typescript-eslint/parser": "^7.x",
    "eslint-plugin-import": "^2.x",
    "prettier": "^3.x",
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "jsdom": "^24.x",
    "playwright": "^1.x",
    "@playwright/test": "^1.x",
    "vite-plugin-pwa": "^0.x",
    "workbox-window": "^7.x",
    "supabase": "^1.x"  // Supabase CLI
  }
}
```



---

## 十四、Quality Gate（质量门禁）

> 任何功能、模块或 Milestone 完成后，必须通过 Quality Gate。未通过不得标记完成。

### 14.1 Level 1：Code Quality（代码质量）

| 检查项 | 通过工具 | 通过条件 |
|---|---|---|
| TypeScript 无错误 | `tsc --noEmit` | 0 errors |
| ESLint 无错误 | `eslint 'src/**/*.{ts,tsx}'` | 0 errors, 0 warnings |
| Build 成功 | `vite build` | exit 0 |
| 无未使用变量 | TypeScript `noUnusedLocals` | 0 报告 |
| 无重复代码 | Code Review / `jscpd` | < 5% 重复 |
| Import 顺序正确 | ESLint `import/order` | 无违规 |
| 命名符合规范 | Code Review | 无违规 |
| 无未经批准的 any | ESLint `@typescript-eslint/no-explicit-any` | 0 违规 |
| 无硬编码颜色 | grep `#[0-9a-f]{3,6}` in `src/`（排除 tokens） | 0 次 |
| 无硬编码 UI 文本 | grep 非 i18n 字符串 | 0 次 |
| 使用 Design Tokens | Code Review | 100% |
| 使用国际化 | Code Review | 100% UI 文本 |
| 使用统一 Theme | Code Review | 100% |

### 14.2 Level 2：Feature Quality（功能质量）

| 检查项 | 验证方式 |
|---|---|
| 功能符合 Specification | AC 逐条验收 |
| UI 符合 Design | 视觉对比 |
| Mobile 正常（< 768px） | Playwright / 手动 resize |
| Desktop 正常（≥ 1024px） | Playwright / 手动 |
| 中英文切换正常 | Playwright 切 locale |
| Dark Mode 正常 | 全路由验证 |
| 无明显性能问题 | Lighthouse CI（LCP ≤ 1.5s） |
| Loading 状态正常 | 手动验证 |
| Empty 状态正常 | 手动验证 |
| Error 状态正常 | 手动验证 |
| Success 状态正常 | 手动验证 |

> **关于 Light Mode**：Nook SPEC § 1.7.2 强制禁 light mode，此 Gate 项跳过（不适用）。

### 14.3 Level 3：Engineering Quality（工程质量）

| 检查项 | 必须 |
|---|---|
| `DEVELOPMENT_LOG.md` 已更新 | ✅ |
| `TODO.md` 已更新 | ✅ |
| `AI_HANDOVER.md` 已更新 | ✅ |
| `CHANGELOG.md` 已更新（新版本时） | ✅（可选） |
| `KNOWN_ISSUES.md` 已更新（新发现时） | ✅（可选） |
| `DECISIONS.md` 已更新（新决策时） | ✅（可选） |

### 14.4 AI 自检（AI Self Review）

完成开发后，AI 必须进行自检：

| 检查项 | 结果 |
|---|---|
| 代码符合 Coding Standards | ✅ / ❌ |
| 未违反 Architecture | ✅ / ❌ |
| 未违反 ADR | ✅ / ❌ |
| 未违反 Project Structure | ✅ / ❌ |
| 未违反 Design Tokens | ✅ / ❌ |
| 国际化无遗漏 | ✅ / ❌ |
| Theme 无遗漏 | ✅ / ❌ |
| 错误处理无遗漏 | ✅ / ❌ |
| 响应式无遗漏 | ✅ / ❌ |
| 文档更新无遗漏 | ✅ / ❌ |

### 14.5 Quality Gate Result



```
Quality Gate: ✅ PASS / ❌ FAILED

If FAILED:
- 未通过原因: [列出]
- 建议修改内容: [描述]
- 是否允许继续开发: 默认不允许
```



**只有 PASS 后，当前任务才允许标记为 Completed。**

---

## 十五、Stage 13 · Definition of Done

- ✅ § 一 总体原则（8 条 + AI 行为准则）
- ✅ § 二 命名规范（文件 / 变量 / 函数 / 组件 4 类完整矩阵）
- ✅ § 三 TypeScript 规范（Interface vs Type · any 禁止 · Enum · Generic · 推导 · Null/Undefined）
- ✅ § 四 Import 规范（顺序 · 别名 · 6 条禁止规则 · 依赖方向）
- ✅ § 五 React 规范（组件 · Props · Hooks · State · Context · Side Effects · Composition）
- ✅ § 六 错误处理规范（抛出 · 捕获 · 日志 · 提示 · 重试 · 边界状态）
- ✅ § 七 i18n 规范（禁止硬编码 · Key 命名 · 语言文件组织）
- ✅ § 八 Theme 规范（禁止硬编码 · Design Tokens 使用 · Dark 强制）
- ✅ § 九 注释规范（必须注释 · 禁止注释 · JSDoc 模板）
- ✅ § 十 测试规范（3 层测试 · 覆盖原则 · Mock · Fixture）
- ✅ § 十一 禁止事项（22 项 Anti-patterns 清单）
- ✅ § 十二 AI Coding Protocol（开发前/中/后 · 自检）
- ✅ § 十三 配置规划（必需 11 项 + 可选 9 项 + scripts + npm 依赖）
- ✅ § 十四 Quality Gate（3 级门禁 + AI 自检 + 结果输出）
- ✅ ❌ 不创建配置文件（仅规划）
- ✅ ❌ 不创建目录（仅文档）
- ✅ ❌ 不修改 Spec / Architecture / Project Structure / ADR

---

*End of Nook Coding Standards v1.0 — 2026-06-27 · Stage 13 · Frozen*
