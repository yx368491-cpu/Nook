# Nook · Button v1.0 · Spec

> Nook 唯一的按钮规范。所有点击交互都通过这一个组件表达。
> 数据来源：`../../01_Product/Nook-DESIGN.md § 5` + `Nook-DESIGN-TOKENS.ts`。

---

## 0. 设计直觉

按钮在 Nook 里是**稀有品**——一屏内最多 1 个 primary。一屏内主操作按钮永远不超过 1 个（参见 `../../01_Product/Nook-DESIGN.md § 10.1#1`）。所以按钮 API 必须**让"什么时候不该用"自然浮出来**。

---

## 1. 类型签名（TypeScript · pseudo-code）



```ts
import type { ButtonHTMLAttributes, ReactNode, ElementRef } from 'react';
import { forwardRef } from 'react';

/** 视觉权重（三选一） */
export type ButtonIntent = 'accent' | 'neutral' | 'danger';

/** 几何形状（二选一） */
export type ButtonShape  = 'rect' | 'icon';

/** 尺寸（三选一） */
export type ButtonSize   = 'sm' | 'md' | 'lg';

/**
 * Button — 唯一按钮组件
 *
 * - intent × shape × size 三轴矩阵
 * - loading 状态自动转换 EXIT 行为
 * - iconOnly 自动把 shape 切为 'icon'
 */
export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  intent?: ButtonIntent;                      // 默认 'accent'
  shape?:  ButtonShape;                       // 默认 'rect'；iconOnly=true 时强制 'icon'
  size?:   ButtonSize;                        // 默认 'md'

  /** 当为 true 时强制 shape='icon' 且需要 aria-label；children 必须是 icon */
  iconOnly?: boolean;

  /** 文字或图标：rect 时是 string/ReactNode，icon 时是单个 icon ReactNode */
  children: ReactNode;

  /** 加载态：渲染禁用 + 旋转 spinner + aria-busy */
  loading?: boolean;

  /** 让按钮把样式传给 <Slot> 子元素（兼容 shadcn asChild 模式） */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => { /* 实现节略 */ }
);
Button.displayName = 'Nook.Button';
```



> ❌ **不要** 联合 `variant="primary" | "secondary" | "ghost" | "icon"` 这样的 1D 变体——intent 与 shape 正交，必须解开。

---

## 2. intent × shape 视觉矩阵

| intent  | shape=rect                            | shape=icon                                       |
|---------|---------------------------------------|--------------------------------------------------|
| accent  | 实心 accent 填充 + onAccent 文字 · 12px 圆角矩形 | accent-soft-bg 圆背景 + accent 描边图标           |
| neutral | hairline 描边 + ink 文字 · 12px 圆角矩形    | 透明背景 + surface-1 hover；无边框           |
| danger  | 透明 + 红色文字 + hairline-strong 描边 | 透明 + errorSoft 圆 hover + error 描边图标    |

> `intent='accent' shape='rect'` 是唯一"压按钮感"的组合；其它都是"放按钮感"的——这与 `../../01_Product/Nook-PRODUCT.md` 第 4 个决策问题"做得不够完美会破坏美学吗"的判断一致。

---

## 3. 尺寸矩阵

| size | 高度 | padding-x | 字号 (presets.button) | 用在哪 |
|---|---|---|---|---|
| `sm` | `var(--size-button-sm)` = 32 | `var(--space-sm)` = 12 | 14 / 500 / 1.0 / +0.2 px | 列表项的内嵌、tab |
| `md` | `var(--size-button-md)` = 36 | `var(--space-md)` = 16 | 14 / 500 / 1.0 / +0.2 px | **默认** |
| `lg` | `var(--size-button-lg)` = 44 | `var(--space-lg)` = 20 | 14 / 500 / 1.0 / +0.2 px | send 主操作、底部主操作（≥ 44 px 触达保证） |

> icon size 同上：sm/md/lg 映射到 `tokens.icon.size.sm/md/lg` = 16/20/24 px。

---

## 4. 状态机

| 状态 | 仅 intent=accent + rect | 通用 |
|---|---|---|
| default | bg=`--color-accent-default`，text=`--color-accent-on` | 见各 intent 表格 |
| hover | bg=`--color-accent-hover`，transition = `var(--transition-hover)` = 120 ms ease-out | rect: bg/surface-1; icon: bg/surface-1 |
| press | bg=`--color-accent-press`，**transform: scale(0.97)**（120 ms ease-in 结束） | 同上 |
| focus-visible | **2 px `--color-accent-soft-ring` outline + 3 px outline-offset** | 同上 |
| disabled | bg=`--color-surface-2`，text=`--color-ink-subtle`，`opacity: var(--opacity-disabled)`，禁用 hover/press | 同上 |
| loading | 同 disabled，但 spinner 取代 children；`aria-busy="true"` | 同上 |

> ⚠️ 设计规则：**所有 hover 永远不动 transform scale**（Nook-DESIGN § 9.4）；只有 press 时才有 `scale(0.97)`，且仅 accent+rect 一种组合可信。其他形状的 press 是 color shift 而非 scale。

---

## 5. loading spinner

- 半径 `10 px`，描边 `2 px`，颜色使用 `--color-accent-on` (rect accent) 或 `--color-ink-muted` (其它)。
- 旋转 `var(--duration-ambient) = 1200ms linear infinite`。
- 位置：在 rect 时为 children 全占（替换文本，不并行）；在 icon 时也和 children 替换，不要并排两个 icon。

> loading 与 disabled 共同生效时：aria-busy + cursor: not-allowed，且 click handler 不触发（onClick 在 loading 时不再调用）。

---

## 6. iconOnly + asChild 行为



```tsx
// 1. iconOnly=true 时强制 shape='icon'，children 必须是单一 SVG ReactNode
<Button intent="accent" shape="icon" iconOnly size="md" aria-label="发送">
  <SendIcon />
</Button>

// 2. asChild 把 className/style 透传给唯一子元素（Link 集成）
<Button asChild intent="accent">
  <Link to="/settings">去设置</Link>
</Button>
```



| 触发条件 | 行为 |
|---|---|
| `iconOnly=true` | shape 强制为 icon；缺 `aria-label` → TS warning 但不 throw（lint 兜底） |
| `asChild=true` | 渲染唯一 child，把 ButtonProps 全部 merge 到 child 的 props；children 是函数 child 时不 apply |
| icon shape + 大文字 children > 20 px 宽 | TS 报错（type-level 提示，运行时静默 fallback） |

---

## 7. 可达性（a11y）

| 项 | 规则 |
|---|---|
| focus | `focus-visible:outline: 2px solid var(--color-accent-soft-ring); outline-offset: 3px;` |
| iconOnly | **强制** `aria-label`（运行时缺则 console.error 并 disable click） |
| loading | `aria-busy="true"` |
| disabled | 原生 `disabled` 属性 + `aria-disabled="true"`（仍可 focus） |
| 键盘 | Enter / Space 都触发 click（浏览器 button 原生） |
| 触达 | rect/lg 高度 44 = 满足；icon/sm (32 px) **不满足 44 px**——v1 仅限有 hover 提示的关键路径使用（如侧栏小 +） |

---

## 8. 反模式（写了不通过）

- ❌ 不写 `variant="primary"` 这种把 intent 揉扁的 prop
- ❌ 不写 `loadingText="保存中"`（loading 时 children 应被 spinner 替换，不需要并行文字）
- ❌ 不写 `icon={<Icon />}` + `iconPosition="left"` 拆 prop；用 `leadingIcon` / `trailingIcon` slot（v1.1+ 再开，本文档 v1.0 不开 left/right 二选 prop）
- ❌ 不要用 `<a>` 包装 `<button>`；要么 `asChild` 要么原生 button
- ❌ 不要在 hover 里加 `transform: scale(1.04)`（Nook 显式禁止 hover 时 scale）

---

## 9. Token 反查表（实现时复制这段到 .tsx）



```ts
// 实现期直接映射（不允许直接写 hex / px）
const buttonStyles = {
  rect: {
    accent:  { bg: 'var(--color-accent-default)',  text: 'var(--color-accent-on)', hoverBg: 'var(--color-accent-hover)' , pressBg: 'var(--color-accent-press)' },
    neutral: { bg: 'transparent', text: 'var(--color-ink-default)', borderColor: 'var(--color-hairline-strong)', hoverBg: 'var(--color-surface-1)' },
    danger:  { bg: 'transparent', text: 'var(--color-signal-error)', borderColor: 'var(--color-hairline-strong)', hoverBg: 'var(--color-signal-error-soft)' },
  },
  icon: {
    accent:  { bg: 'var(--color-accent-soft-bg)', color: 'var(--color-accent-default)', borderColor: 'var(--color-accent-soft-ring)' },
    neutral: { bg: 'transparent', color: 'var(--color-ink-muted)', hoverBg: 'var(--color-surface-1)' },
    danger:  { bg: 'transparent', color: 'var(--color-signal-error)', hoverBg: 'var(--color-signal-error-soft)' },
  },
  size: {
    sm: { h: 'var(--size-button-sm)', px: 'var(--space-sm)',  font: 'var(--font-size-body)'   },
    md: { h: 'var(--size-button-md)', px: 'var(--space-md)',  font: 'var(--font-size-body)'   },
    lg: { h: 'var(--size-button-lg)', px: 'var(--space-lg)',  font: 'var(--font-size-body)'   },
  },
  radius: 'var(--radius-lg)',     // 12 px
  focusRing: 'var(--color-accent-soft-ring)',
  transition: 'var(--transition-hover)',  // 120 ms ease-out
};
```



---

## 10. 测试清单

- [ ] 点击时 `onClick` 触发一次（loading 时不触发）
- [ ] disabled 时点击不触发 `onClick`
- [ ] Enter / Space 在 button 原生 focus 状态下触发 `onClick`
- [ ] focus-visible 渲染 mock `outline: 2px solid var(--color-accent-soft-ring)`
- [ ] iconOnly + 缺 aria-label → console.error / click disabled
- [ ] asChild 时 Button 的 className / style 透传到唯一子元素
- [ ] loading 时 aria-busy 存在
- [ ] Tab 顺序：所有 intent × shape × size 都可达
- [ ] prefers-reduced-motion 时 hover/press 不 transform

---

— END —
