# Nook · Components v1.0 · Spec Index

> 4 个原子组件的 React API 规范。本目录**只有规范，没有代码**。
> 实现者在写代码前先看本 README，再打开对应组件的 `.spec.md`。

---

## 0. 目录约定



```
prompt/components/
├── README.md         ← 本文件（顶层约定）
├── Button.spec.md    ← 按钮
├── Input.spec.md     ← 输入 + Composer 复合
├── Bubble.spec.md    ← 聊天气泡
└── Avatar.spec.md    ← 头像 + 在线状态点
```



> 一律 `.spec.md` 后缀，避免误读为代码文件。生成 `.tsx` 实现一定**放在仓库根的 `src/components/`**，**不在本目录**。

---

## 1. 全部组件共享的硬规则

### 1.1 Token 纪律（唯一可信数据源）

所有视觉属性必须通过 `@/tokens` 引用，**禁止硬编码**：

| 类别 | 来源 |
|---|---|
| 颜色 | `tokens.colors.*` 或 CSS var `--color-*`（仅在 `style={{}}` 内） |
| 字号 / 字重 / 行高 / 字间距 | `tokens.typography.preset.*` |
| 间距 | `tokens.spacing.*` 或 `--space-*` |
| 圆角 | `tokens.radius.*` 或 `--radius-*` |
| 阴影 | `tokens.shadow.*` |
| 时长 / 缓动 | `tokens.motion.*` |

> 业务代码不允许 `style={{ color: '#7B85F0' }}` 这种用法。允许 `style={{ color: 'var(--chat-bubble-self-radius)' }}` 这种 token 应用。

### 1.2 暗色 baked-in

v1.0 无 light mode。组件不接受 `tone` / `theme` / `mode` / `variant-dark` 等 prop。Canvas 是 dark 唯一默认。

### 1.3 减动效（prefers-reduced-motion）

全局 CSS 已通过 `@media (prefers-reduced-motion: reduce)` 把 `--duration-*` 全部降为 `0ms`。组件**不需要**额外写 motion 库或 hook；只要引用 `--duration-fast` / `--duration-base`，用户系统设置即可生效。

### 1.4 可达性（a11y）· 每个组件必须满足

依据 `../../01_Product/Nook-DESIGN.md § 5.4` 与 `§ 10.5`：

- `focus-visible` 时显式 `2px solid var(--color-accent-soft-ring)`，`outline-offset: 3px`。**不使用浏览器默认 `outline`**。
- 所有交互元素最小 `44 × 44 px`（移动端触达约束）。
- Icon-only 组件 / Button 必须有 `aria-label` 或 `<label>` 关联。
- 异步 / 加载状态使用 `aria-busy="true"`。
- 键盘可达：Tab / Enter / Space / Esc 行为必须文档化在 .spec 里。

### 1.4.1 字体加载（实施关键 · 别漏）

所有 UI 组件都假设根 `font-family` 已经引用 Inter；CSS 必须包含：



```css
@font-face {
  font-family: 'Inter';
  src: local('Inter Regular'), url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
/* 500 / 600 / 斜体 各一份；中文不需要 */

/* 根上开启 ss03（科技感来源） */
:root {
  font-family: var(--font-family-sans);                    /* = "Inter", ... */
  font-feature-settings: var(--font-feature-default);      /* 含 'ss03' */
}
```



> ⚠️ **绝不走 Google Fonts CDN**——依据 `../../01_Product/Nook-INTERVIEW-spec.md § 2.8 UI-5`（大陆网络环境约束）。
>
> 字体文件落仓 `public/fonts/`，构建期静态复制。**`ss03` 缺失即视觉损失极大**——它是 Nook "科技感" 唯一肉眼可见的特征（`g` 字符的 single-story 替换）。

### 1.5 TypeScript 严格性

- Props 用 `interface`（导出），不是 `type`。
- 字面量联合 `'primary' | 'secondary'`，**不用 `enum`**。
- 与 shadcn/ui API 兼容：`ComponentPropsWithoutRef<'button'>` + `React.forwardRef<Ref, Props>`。
- 不导出 implementation detail（内部 hook、context 都 module-private）。

### 1.6 命名约定

| 对象 | 风格 | 例 |
|---|---|---|
| 文件名（.tsx） | PascalCase | `Button.tsx` |
| 默认 export | **不用** | — |
| 命名 export | PascalCase | `export const Button` |
| Props 接口 | PascalCase + `Props` 后缀 | `ButtonProps` |
| 子组件（Slot） | PascalCase + 类型描述 | `Composer.Send` 或单独 export |

> 不需要 `NookButton` 前缀——默认导入已是 unique。

### 1.7 样式转发（className / style / data-*）

每个组件必须：



```ts
export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  // 自己的语义 props
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(/* 内部用 cva 生成的类 */, className)}
      {...props}
    />
  ),
);
```



要求：

- **内部 className 必在前**，`props.className` 必在后——保持外部覆盖优先级。
- 使用 `cn()`（`clsx` + `tailwind-merge`），允许外部 `className` 覆盖内部 utility。
- `data-testid` 直接转发到根元素（用户传入即生效，组件自己不写测试 id）。

### 1.8 变体 api 风格（2D 矩阵 · 不做一维 variant 链）

Nook 不使用「variant 主链」做 N 个变体（那种实现会 inflate prop 表）。**鉴借 Linear**：



```ts
intent:  'accent' | 'neutral' | 'danger'   // 视觉权重
shape:   'rect'   | 'icon'                  // 几何形状
size:    'sm'     | 'md' | 'lg'             // 尺寸
```



这构成 `3 × 2 × 3 = 18` 个组合。组件内部用 **cva**（class-variance-authority）拼装，不写 18 个 if-else。

> ❌ 不做 `variant="primary" | "secondary" | "ghost" | "icon"` 这种把意图和形状揉成一维的 API。
> ❌ 不做 `tone="blue" | "red"` 颜色手动选择——意图判别，微妙见 `intent`。"danger" 只给真正的不可逆动作（删除账号、退出群）。

---

## 2. 组件依赖图



```
            ┌──────────┐
            │  Button  │ (唯一原子按钮)
            └─────┬────┘
                  │
            ┌─────▼────┐
            │  Input   │ (incl. /composer 变体)
            └─────┬────┘
                  │
   ┌──────────────┼──────────────┐
   │              │              │
┌──▼────┐    ┌────▼────┐    ┌────▼─────┐
│ Avatar │   │  Bubble │    │ Composer │ (复合, uses Input+Button+ReplyCard)
└────────┘   └─────────┘    └──────────┘
```



依赖关系：

- **Button** 是 `Input`、`Composer` 的子元素。
- **Avatar** 是 `Bubble` 的兄弟元素（父布局读到），也可能出现在 `ListItem` / `GroupMemberList`。
- **Bubble** 只管气泡形状 + 内容，**不做消息行 layout**（行 layout 在父 `Message` 或 `MessageList`）。
- **Composer** 是复合组件 = `Composer.Field` (即 Input variant=composer) + `Composer.Actions` + 可选 `Composer.Reply`。

> 复合但不通过 React Context 跨组件通信（v1.0 不用 Context，prop drilling 一层就够）。

---

## 3. 4 个常见组合写法（实现期参考）

### 3.1 单独一个 send 按钮



```tsx
<Button intent="accent" size="lg" shape="rect" type="submit">发送</Button>
```



### 3.2 聊天 Composer 行（含引用）



```tsx
<Composer>
  {replyTo && (
    <Composer.Reply to={replyTo} onCancel={() => setReplyTo(null)} />
  )}
  <Composer.Field
    placeholder="说点什么…"
    value={draft}
    onChange={(v) => { setDraft(v); trackTyping(); }}
    onSend={handleSend}
    onAttach={handleFile}
    onPaste={(files) => upload(files)}
  />
</Composer>
```



### 3.3 一条朋友消息



```tsx
<MessageRow kind="incoming" sender={sender}>
  {/* 父控制头像位置：仅"组中第一条"显示 */}
  {isFirstOfGroup && (
    <Avatar name={sender.displayName} status={sender.online ? 'online' : undefined} size="md" />
  )}
  <Bubble kind="friend" isConsecutive={!isFirstOfGroup}>
    {replyTo && <Bubble.ReplyTo to={replyTo} />}
    <Bubble.Text>{message.body}</Bubble.Text>
    {message.attachment?.kind === 'image' && <Bubble.Image {...message.attachment} />}
    {message.attachment?.kind === 'file'  && <Bubble.File  {...message.attachment} />}
    {message.reactions.length > 0 && <Bubble.Reactions items={message.reactions} />}
  </Bubble>
</MessageRow>
```



### 3.4 侧栏用户项



```tsx
<ListItem>
  <Avatar name={friend.displayName} status={friend.online ? 'online' : undefined} pulse={friend.online} size="md" />
  <div>
    <ListItem.Title>{friend.displayName}</ListItem.Title>
    <ListItem.Subtitle>{lastMessagePreview}</ListItem.Subtitle>
  </div>
  <ListItem.Trailing>
    {unreadCount > 0 && <UnreadDot count={unreadCount} />}
  </ListItem.Trailing>
</ListItem>
```



> `UnreadDot` 不在 4 个组件 spec 中（属于 UI-1 后续衍生）。本 README 不展开。

---

## 4. v1.0 故意不做的（避免 over-engineering）

| 不做 | 替代做法 | 备注 |
|---|---|---|
| Compound 深嵌套（> 2 层） | prop 扁平化 | `Composer.Field` 而不是 `Composer.Field.Slot` |
| `useButton()` headless hook | 直接 forwardRef | Radix 兼容留 v1.1 |
| controlled / uncontrolled 双支持 | 统一 controlled | v1.0 都是外部 state |
| E2EE 加密 badge 实际渲染 | 留 `data-encrypted` 属性 hook 位即可 | 见 Nook-INTERVIEW § 2.7 |
| forced-colors / high-contrast | 暂不支持 | v1.1 |
| RTL | 仅 LTR | 私人产品里没人 RTL |
| Storybook | 静态 `/preview` 页即可 | 一个 HTML 文件穷举 4 组件状态 |

---

## 5. 一处给"未来的你"的话

> 这 4 个组件不是"基础库"。它们是"私人产品里的尺寸"。
> 如果某天你觉得 `Button` 该有第 7 种 `intent`、`Input` 该支持 rich-text——先回头读 `../../01_Product/Nook-PRODUCT.md § 2` 的反模式清单，几乎一定是个不该做的功能。

---

— END —
