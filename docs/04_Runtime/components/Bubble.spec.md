# Nook · Bubble v1.0 · Spec

> 聊天气泡 = **形状 + 内容**，**不是**消息行 layout。
> 行 layout（头像位置、时间戳位置、未读回执）在父 `<MessageRow>` 决定。
> 数据来源：`../../01_Product/Nook-DESIGN.md § 8` + token `chatBubble`。

---

## 0. 一条铁律

> Bubble **不知道** 头像是不是存在、时间该不该出现、这是不是组的最后一条。
> Bubble 只知道：**"我是一段文字 / 一张图 / 一个文件，我要变成一个气泡"**。
> 一切"我是不是父行的最后一条"由 `MessageRow` / `MessageList` 提供 prop。

这个边界划分是 API 稳定的根源——任何"动态气泡高度 / 多气泡 stack"问题都在父里解决；Bubble 自己永远不变。

---

## 1. 类型签名



```ts
import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

/** 谁发的——决定 corner radius + 背景 + 文字色 + 位置 */
export type BubbleKind = 'self' | 'friend';

/** 内容类型 token（与 schema `message_kind` 对齐） */
export type BubbleAttachment =
  | { kind: 'image'; src: string; width: number; height: number; blurhash?: string }
  | { kind: 'file';  name: string; sizeBytes: number; url: string };

export interface BubbleProps extends HTMLAttributes<HTMLDivElement> {
  kind:        BubbleKind;            // 必填：决定 corner radius
  isConsecutive?: boolean;            // 同发送者连续消息：和上一条合并视觉
  children:    ReactNode;             // 实际渲染的子内容（必须用 <Bubble.X> 之一）
  /** 未来 E2EE 状态挂载点（v1.0 不渲染，但保留 attribute） */
  'data-encrypted'?: 'none' | 'pending' | 'ready';
}

export const Bubble = forwardRef<HTMLDivElement, BubbleProps>((props, ref) => {
  /* 实现节略 */
});
Bubble.displayName = 'Nook.Bubble';
```



> 注意 `kind='self' | 'friend'` 是**必填**，不带默认——因为说话者不同，气泡的"政治立场"就不同。

---

## 2. 几何与背景（**最严苛的一节**）

### 2.1 圆角（★ 直接读 token `chatBubble`）



```
self   → border-radius: var(--chat-bubble-self-radius)     // = 16px 16px 16px 12px
friend → border-radius: var(--chat-bubble-friend-radius)   // = 16px 16px 12px 16px
```



> 顺序是 CSS 标准 `[topLeft, topRight, bottomRight, bottomLeft]`。
> self 的"软角"在 **bottom-left**（气泡靠右 → 软角朝会话中心），friend 的"软角"在 **bottom-right**（气泡靠左 → 软角朝会话中心）——这是与 `../../01_Product/Nook-DESIGN.md §8.1` 完全一致的"软角朝向中心"隐喻。
>
> ⚠️ **上游注释陷阱**：`Nook-DESIGN-TOKENS.ts` 里 `chatBubble.self` 的注释写着 "own msg: BR is the soft corner"（friend 反之），但**数值本身正确**：self 数组中 BR=16，BL=12。**永远以 `../../01_Product/Nook-DESIGN.md §8.1` 的 prose + token 数值 为真理，不要照注释改实现**——否则你会得到方向完全相反的形状。

### 2.2 背景 / 文字色

| kind | background | color |
|---|---|---|
| `self`   | `var(--color-chat-self-bg)` = `--color-accent-default` (#7B85F0) | `var(--color-chat-self-text)` = `--color-accent-on` (#FFFFFF) |
| `friend` | `var(--color-chat-friend-bg)` = `--color-surface-1` (#181B22) | `var(--color-chat-friend-text)` = `--color-ink-default` (#F2F4F8) |

> Bubble 内部 **不画描边**——靠 surface-1 vs canvas 的 1 阶 ladder 差 + 11% 圆角营造层次（Nook-DESIGN § 6.3）。

### 2.3 padding

固定 `padding: 10px 14px`（上下 10 / 左右 14）。不因字数变化。

### 2.4 max-width

`max-width: 72%`（父容器宽度）。`min-width: 0`。

### 2.5 阴影

`shadow=false` 默认无阴影。**仅当** Bubble 在屏静止状态且 sender 把鼠标悬停，同时代 `isHover=true` 时才加 `var(--shadow-1)`——`Bubble` 不自动管理这个状态，父传 `data-hover` 即可。

---

## 3. 子组件（compound slots）



```ts
export const Bubble = Object.assign(BubbleRoot, {
  Text:      BubbleText,      // 纯文字 body
  Image:     BubbleImage,     // 单图
  File:      BubbleFile,      // 单文件
  ReplyTo:   BubbleReplyTo,   // 引用源（嵌套在 Bubble 上方）
  Reactions: BubbleReactions, // 6 emoji 反应计数（仅 friend 默认显示在气泡下方；self 默认在右上角）
});
```



### 3.1 `<Bubble.Text>`

- 字体：`var(--font-size-body-lg)` = 16 / 400 / 1.55
- 字间距：`var(--tracking-chinese)` = 0.02em **仅对中文段落生效**（CSS `lang(zh)` 选择器）
- 长文本不自动 ellipsis（让消息原文被读到）
- 行内 `<a>`：underline = 当前 kind 文字色 + 60% opacity
- 行内 `<code>`：bg `var(--color-chat-code-bg)` = `--color-surface-3`，font `tokens.typography.family.mono`，圆角 `var(--radius-sm)` = 6 px，padding 1px 4px

### 3.2 `<Bubble.Image>`

- 接受 props: `src` / `alt` / `width` / `height`（必填，避免 CLS）
- 圆角 `var(--radius-lg)` = 12 px（与气泡其余圆角一致）
- max-width：`min(100%, var(--size-image-max-width) = 480 px)`
- loading：bg `var(--color-surface-3)`，没图前渲染 skeleton box
- click：默认打开 lightbox（v1.0 暂用 `<dialog>` 原生实现，v1.1 切 Radix Dialog）

### 3.3 `<Bubble.File>`

- 卡片样式：bg `var(--color-surface-2)`，圆角 `var(--radius-md)` = 8 px，padding 8 px 12 px
- 三列：filename（截断）/ size（caption 字号）/ ⤓ icon button（download）
- size 格式：`< 1 MB ? X KB : X.X MB`（精度到 .1）

### 3.4 `<Bubble.ReplyTo>`

- 放在 `<Bubble>` 最顶部（在 Text/Image/File 之上）
- 视觉是一根左边 2 px `var(--color-accent-default)` 短线 + 单行文本 truncate
- 文本字号 caption = 12 / 500，色 ink-muted
- hover：显示完整（v1.0 用 Tooltip.js，v1.1 可换）

### 3.5 `<Bubble.Reactions>`

- 一行 emoji + 计数：最左是 emoji 字符本体，右侧 `caption` 字号数字
- 限 6 个 emoji（与 schema enum 对齐）：👍 ❤️ 😂 👀 🔥 🙏
- 已反应 emoji 高亮（accent-soft-bg + 圆角 8 px 底）
- 仅当 `items.length > 0` 渲染；位置 v1.0 默认放在 Bubble 外、由 `<MessageRow>` 决定



```ts
export type ReactionEmoji = '👍' | '❤️' | '😂' | '👀' | '🔥' | '🙏';

export interface ReactionItem {
  emoji:  ReactionEmoji;
  count:  number;                         // 后端聚合：message_id × emoji
}

export interface BubbleReactionsProps extends HTMLAttributes<HTMLDivElement> {
  items:        ReactionItem[];
  selfReacted?: ReadonlySet<ReactionEmoji>;   // 当前 user 已点的（高亮用）
  onReact?:     (emoji: ReactionEmoji) => void;  // 点击触发后端 add/toggle
  onUnreact?:   (emoji: ReactionEmoji) => void;
}
```



> ⚠️ **没有 `onOpenEmojiPicker` / `onAddReaction`**——v1.0 reaction 集是封闭 6 个，不开放自定义 emoji。Picker UI 留 `Future`。

---

## 4. 入场动画（最被注视的动效 · Nook-DESIGN § 9.4）



```css
/* Bubble default state */
opacity: 0;
transform: translateY(8px);
transition: opacity 180ms ease-out, transform 180ms ease-out;

[data-entered="true"] {
  opacity: 1;
  transform: translateY(0);
}
```



> 一次只动一条（多条时逐条 30 ms 错落，不超过 3 条同时入场——这条交给 `MessageList` 控制 stagger，Bubble 自身只接受 `data-entered` prop。
>
> prefers-reduced-motion → :root 已把 `--duration-base` 降为 0ms，组件自动 follow，无需额外代码。

---

## 5. ⚠️ 不做的事

- ❌ Bubble 内部**不**渲染头像（头像在 `<MessageRow>` 左侧按 `isFirstOfGroup` 决定）
- ❌ Bubble 内部**不**渲染时间戳（hover-revealed meta 在 `<MessageRow>` 右边）
- ❌ Bubble 内部**不**渲染已读/未读状态
- ❌ Bubble 内部**不**渲染 read-recall indicator（"已撤回" 占位）
- ❌ Bubble 内部**不**渲染系统消息（系统消息用独立 `<SystemMessage>` 组件——v1.0 不做）
- ❌ Bubble 内部**不**管理 spacing（与上一条/下一条的间距在 `MessageList` 决定；Nook 4.4 间距节奏表）
- ❌ 不允许 `<Bubble>` 没有 children（children 必须是用 `<Bubble.Text>` 等 slot 包裹的内容）

---

## 6. 可达性

| 项 | 规则 |
|---|---|
| role | 默认 `role="article"`（独立消息单元） |
| aria-label | 由父 `<MessageRow>` 提供 `aria-label="来自 Alice 的消息，2:14 PM"` |
| Image alt | `<Bubble.Image>` 的 `alt` 必填，缺则 console.error |
| keyboard | 图片 click 通过 Enter/Space 触发（v1.0 简化：仅 click，后续可 tab-stop） |
| 时间戳 | 不暴露视觉时间戳的 a11y text（v1.0 mobile 不显示时间，PC 仅 hover） |

---

## 7. Token 反查表



```ts
const bubbleTokens = {
  self: {
    bg: 'var(--color-chat-self-bg)',
    fg: 'var(--color-chat-self-text)',
    radius: 'var(--chat-bubble-self-radius)',  // 16/16/16/12
  },
  friend: {
    bg: 'var(--color-chat-friend-bg)',
    fg: 'var(--color-chat-friend-text)',
    radius: 'var(--chat-bubble-friend-radius)', // 16/16/12/16
  },
  font:  { size: 'var(--font-size-body-lg)', line: 'var(--leading-chill)' },
  /* 气泡内 padding 在 Nook-DESIGN.md §8.2 是硬编码 prose（10/14）。
     v1.0 不抽为 token；若未来 refactor，先在 Nook-DESIGN-TOKENS.ts 加 chatBubble.padding 后再使用 —
     不能在 component 实现期临时抽 token，避免 single source of truth 被悄悄分裂。 */
  pad:   { y: '10px', x: '14px' },
  maxW:  '72%',
  enter: { duration: 'var(--transition-chat-bubble-enter)', translate: '8px' },
};
```



---

## 8. 测试清单

- [ ] self kind 渲染 `chat-bubble-self-radius`
- [ ] friend kind 渲染 `chat-bubble-friend-radius`
- [ ] self 文字色 = `--color-accent-on`
- [ ] friend 文字色 = `--color-ink-default`
- [ ] max-width 72% 正确应用
- [ ] long text 不 ellipsis
- [ ] `<Bubble.Image>` 缺 alt → console.error
- [ ] 入场动画 180 ms（reduced-motion 下 0 ms）
- [ ] 连续两条 same sender 间无视觉空隙（由 MessageRow 控制 margin-top: var(--space-2xs)）

---

— END —
