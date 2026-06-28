# Nook · Design Tokens v1.0

> 项目中**唯一可信**的设计数据源（Single Source of Truth）。
> 业务代码、UI 组件、动画、布局都**只引用**这里的 Token；写死任何颜色 / 圆角 / 阴影 / 字体 / 动画值，都视为 bug。
>
> 设计语言来源：`../01_Product/Nook-DESIGN.md`（不可修改）。
> 本文件**只翻译**，不重新设计任何视觉风格。

---

## 0. 命名规范（Naming Convention）

### 0.1 通用规则

| 规则 | 说明 |
|---|---|
| **全部小写** | CSS 自定义属性是大小写不敏感的，统一小写。 |
| **kebab-case** | 仅在 `-` 分隔。 |
| **维度优先** | 第一个 token 段是**类别**（如 `color`、`space`、`shadow`）。 |
| **角色次之** | 第二个 token 段是**角色**（如 `canvas`、`surface`、`accent`）。 |
| **变体最后** | 第三个 token 段是**变体**（如 `default`、`hover`、`press`）。 |
| **语义优先于字面** | 优先用 `chat-bubble-self` 而不是 `bg-1`。 |
| **语义别名优先** | 把"作用"放在 token 名里；具体值由文件统一控制，**不暴露**原始值。 |

### 0.2 三种格式的统一形式

| 格式 | 形式 | 示例 |
|---|---|---|
| **CSS Variables** | `--{category}-{role}-{variant}` | `--color-canvas-default`, `--space-md` |
| **TypeScript** | `tokens.{category}.{role}.{variant}`（嵌套对象） | `tokens.color.canvas.default`, `tokens.space.md` |
| **W3C JSON** | `{ "{category}": { "{role}": { "$value": ..., "$type": ... } } }` | `color.canvas.default.$value` |

> 关键：**同一份数据，三种格式表达**。任何一处修改，其余两份必须同步。

### 0.3 别名（Aliases）

> 业务侧优先引用**语义别名**，不引用**字面值**。

| 语义别名 | 指向 | 为什么用别名 |
|---|---|---|
| `color.chat.selfbg` | `color.accent.default` | "自身气泡背景"是高频语义，但具体色值可能 v1.1 换色。 |
| `color.chat.friend-bg` | `color.surface[1]` | 同上。 |
| `color.chat.status-online` | `color.accent.default` | 在线呼吸点的"光"。 |
| `chat.bubble.self.radius` | 自有气泡的 `radius.xl * 4` 复合值 | "飞机翼"几何固定。 |
| `chat.bubble.friend.radius` | 同上的另一组合 | 同上。 |
| `motion.duration.hover` | `motion.duration.fast` | hover 是高频动效。 |
| `motion.duration.messageenter` | `motion.duration.base` | 消息进入动效。 |

---

## 1. 分类结构（Classification Tree）



```
tokens
├── color
│   ├── canvas          （页面级背景）
│   │   ├── default
│   │   ├── deep
│   │   └── soft
│   ├── surface         （卡片 / 气泡 / 浮岛，4 级 ladder）
│   │   ├── 1
│   │   ├── 2
│   │   ├── 3
│   │   └── 4
│   ├── ink             （文字，4 级）
│   │   ├── default
│   │   ├── muted
│   │   ├── subtle
│   │   ├── faint
│   │   └── placeholder ← 复用 subtle
│   ├── accent          （品牌 accent，6 个变体）
│   │   ├── default
│   │   ├── hover
│   │   ├── press
│   │   ├── soft-bg
│   │   ├── soft-ring
│   │   └── on           ← 文字在 accent 上的颜色
│   ├── hairline        （描边，3 级）
│   │   ├── default
│   │   ├── soft
│   │   └── strong
│   ├── signal          （功能性信号灯）
│   │   ├── success
│   │   ├── success-soft
│   │   ├── warning
│   │   ├── warning-soft
│   │   ├── error
│   │   ├── error-soft
│   │   ├── info
│   │   └── info-soft
│   ├── chat            （chat 语义别名）
│   │   ├── self-bg           ← color.accent.default
│   │   ├── self-text         ← color.accent.on
│   │   ├── friend-bg         ← color.surface[1]
│   │   ├── friend-text       ← color.ink.default
│   │   ├── status-online     ← color.accent.default
│   │   ├── status-offline    ← color.ink.faint
│   │   ├── typing-indicator  ← color.ink.muted
│   │   ├── code-bg           ← color.surface[3]
│   │   └── code-fg           ← color.ink.default
│   └── overlay         （特殊遮罩）
│       └── drawer-back   ← pitch black 50% α
├── typography
│   ├── family
│   │   ├── sans
│   │   └── mono
│   ├── feature-settings       ← font-feature-settings 字符串
│   │   ├── default
│   │   └── numeric            ← tabular-nums
│   ├── size
│   │   ├── display   / 32
│   │   ├── h1        / 24
│   │   ├── h2        / 20
│   │   ├── h3        / 17
│   │   ├── body-lg   / 16  ← 聊天正文
│   │   ├── body      / 14
│   │   ├── meta      / 13
│   │   ├── caption   / 12
│   │   └── micro     / 11
│   ├── weight
│   │   ├── regular     / 400
│   │   ├── medium      / 500
│   │   └── semibold    / 600   ← 没有 700/800
│   ├── leading           ← line-height
│   │   ├── tight       / 1.15
│   │   ├── compact     / 1.25
│   │   ├── base        / 1.40
│   │   ├── relaxed     / 1.50
│   │   ├── chill       / 1.55
│   │   └── loose       / 1.60
│   ├── tracking          ← letter-spacing（px）
│   │   ├── display     / -0.8
│   │   ├── h1          / -0.5
│   │   ├── h2          / -0.3
│   │   ├── h3          / -0.2
│   │   ├── normal      / 0
│   │   ├── chinese     / 0.02em   ← 中文呼吸
│   │   └── button      / 0.2      ← 0.2 px
│   ├── chat-message     ← 语义：聊天正文（= body-lg + chill）
│   ├── button-label     ← 14 / 500 / 1.0 / 0.2
│   └── code             ← 14 mono / 400 / 1.60
├── spacing
│   └── 9 阶：2xs / xs / sm / md / lg / xl / 2xl / 3xl / 4xl
├── radius
│   ├── xs / 4
│   ├── sm / 6
│   ├── md / 8
│   ├── lg / 12          ← 圆角主力
│   ├── xl / 16          ← composer / 大圆角
│   ├── pill / 9999
│   └── circle / 50%
├── shadow
│   ├── 1 / 卡片微弱
│   ├── 2 / popover、composer 浮岛、emoji picker
│   ├── 3 / 抽屉 / 模态
│   └── 4 / 最大浮层（极少用）
├── border
│   ├── width
│   │   ├── hairline / 1px
│   │   ├── thick / 2px
│   │   └── focus-ring / 2px（含 3px offset）
│   ├── style
│   │   └── default / solid
│   ├── radius         ← 复用 radius.* 即可；不重复定义
│   └── color
│       ├── border-default ← color.hairline.default
│       ├── border-strong  ← color.hairline.strong
│       └── divider        ← color.hairline.default
├── motion
│   ├── duration
│   │   ├── instant / 60ms
│   │   ├── fast    / 120ms   ← hover、focus
│   │   ├── base    / 180ms   ← 消息进入、抽屉滑入
│   │   ├── slow    / 280ms   ← 极少
│   │   └── ambient / 1200ms  ← typing 三点、breathing
│   ├── easing
│   │   ├── default  / cubic-bezier(0.20, 0.80, 0.40, 1.00)  ← out-expo 温柔
│   │   ├── out      / cubic-bezier(0.00, 0.00, 0.20, 1.00)
│   │   ├── in       / cubic-bezier(0.40, 0.00, 0.80, 0.20)
│   │   └── in-out   / cubic-bezier(0.40, 0.00, 0.20, 1.00)
│   └── transition
│       ├── hover          ← duration.fast + easing.out
│       ├── click          ← duration.fast + easing.in
│       ├── modal          ← duration.base + easing.out
│       ├── toast          ← duration.base + easing.out
│       ├── chat-bubble-enter ← duration.base + easing.out (translateY)
│       └── page-transition    ← duration.base + easing.out
├── opacity
│   ├── disabled / 0.5
│   ├── overlay  / 0.5   ← 抽屉背板
│   ├── hover    / 0.08
│   ├── pressed  / 0.16
│   └── loading  / 0.6
├── z-index
│   ├── base      / 0
│   ├── raised    / 1  ← surface ladder 隐含
│   ├── sticky    / 10  ← 顶栏
│   ├── dropdown  / 100
│   ├── overlay   / 200  ← 抽屉背板
│   ├── modal     / 300
│   ├── toast     / 400
│   ├── tooltip   / 500
│   └── loading   / 600
├── breakpoint
│   ├── mobile        / 480px
│   ├── tablet        / 768px
│   ├── laptop        / 1024px
│   ├── desktop       / 1280px
│   └── large-desktop / 1440px
├── size
│   ├── button
│   │   ├── sm  / 32
│   │   ├── md  / 36
│   │   └── lg  / 44
│   ├── input
│   │   ├── sm  / 32
│   │   ├── md  / 40
│   │   └── lg  / 44
│   ├── avatar
│   │   ├── sm  / 24
│   │   ├── md  / 32
│   │   └── lg  / 48
│   ├── icon
│   │   ├── sm  / 16
│   │   ├── md  / 20
│   │   └── lg  / 24
│   ├── navbar-height    / 56
│   ├── sidebar-width    / 320
│   ├── chat-content-width / 960
│   ├── chat-bubble-max-width / 72%
│   └── image-max-width  / 480
├── layout
│   ├── page-max-width / 1440
│   ├── sidebar-width  / 320
│   ├── chat-width     / 960
│   ├── container-padding / 24
│   ├── grid-columns   / 12
│   ├── grid-gap       / 24
│   └── section-gap    / 96
└── icon
    ├── size-default / 20
    ├── size-sm      / 16
    ├── size-lg      / 24
    ├── stroke-width / 1.5
    └── radius       / 2（图标本身小圆角，避免完全 square）
```



---

## 2. Color Tokens（完整表）

> 严格遵循 `../01_Product/Nook-DESIGN.md § 2`。下方所有 hex 值与原文一致。

### 2.1 Canvas（页面级背景）

| Token | Hex | 用途 |
|---|---|---|
| `color.canvas.default` | `#0F1115` | 默认深色 canvas |
| `color.canvas.deep` | `#08090C` | 极端沉浸（侧栏背景、模态背后） |
| `color.canvas.soft` | `#14171D` | 极淡次级背景 |

### 2.2 Surface（4 级 layer）

| Token | Hex | 用途 |
|---|---|---|
| `color.surface.1` | `#181B22` | 浮起 1 级（列表卡片 / 对方气泡） |
| `color.surface.2` | `#20242C` | 浮起 2 级（composer 浮岛 / focus 状态条） |
| `color.surface.3` | `#262B35` | 浮起 3 级（模态 / 抽屉） |
| `color.surface.4` | `#2E3440` | 浮起 4 级（极少用） |

### 2.3 Ink（4 级文字）

| Token | Hex | 用途 |
|---|---|---|
| `color.ink.default` | `#F2F4F8` | 标题 / 消息正文 / 按钮文字 |
| `color.ink.muted` | `#B7BDC8` | 次要文字 / 时间戳 / 未读 badge |
| `color.ink.subtle` | `#7A8290` | 三级文字 / placeholder |
| `color.ink.faint` | `#525864` | 极弱提示 / 分隔符 |

> `color.ink.placeholder` = `color.ink.subtle`（语义别名，**不另设值**）。

### 2.4 Accent（品牌 accent）

| Token | Hex | 用途 |
|---|---|---|
| `color.accent.default` | `#7B85F0` | 主色（自身气泡 / send / 在线点） |
| `color.accent.hover` | `#919BFF` | primary 按钮 hover |
| `color.accent.press` | `#5E68D2` | primary 按钮按下 |
| `color.accent.softbg` | `rgba(123,133,240,0.16)` | selected / active 项背景 |
| `color.accent.softring` | `rgba(123,133,240,0.35)` | focus ring |
| `color.accent.on` | `#FFFFFF` | 在 accent 上的文字色 |

### 2.5 Hairline

| Token | Hex | 用途 |
|---|---|---|
| `color.hairline.default` | `rgba(255,255,255,0.06)` | 1px 弱分隔 |
| `color.hairline.soft` | `rgba(255,255,255,0.10)` | 聚焦描边 |
| `color.hairline.strong` | `rgba(255,255,255,0.16)` | focus ring 描边 |

### 2.6 Signal（功能性信号）

| Token | Hex | 用途 |
|---|---|---|
| `color.signal.success` | `#34D399` | 已送达 / 已读回执点 |
| `color.signal.success-soft` | `rgba(52,211,153,0.18)` | 已读徽章背景 |
| `color.signal.warning` | `#F0B45A` | 网络抖动 |
| `color.signal.warning-soft` | `rgba(240,180,90,0.18)` | 警告徽章背景 |
| `color.signal.error` | `#F06F7B` | 发送失败 |
| `color.signal.error-soft` | `rgba(240,111,123,0.18)` | 失败徽章背景 |
| `color.signal.info` | `#7AB8F0` | 系统消息 |
| `color.signal.info-soft` | `rgba(122,184,240,0.18)` | info 徽章背景 |

### 2.7 Chat 语义别名

| Token | 等价于 |
|---|---|
| `color.chat.selfbg` | `color.accent.default` |
| `color.chat.selftext` | `color.accent.on` |
| `color.chat.friendbg` | `color.surface.1` |
| `color.chat.friendtext` | `color.ink.default` |
| `color.chat.status-online` | `color.accent.default` |
| `color.chat.status-offline` | `color.ink.faint` |
| `color.chat.typingindicator` | `color.ink.muted` |
| `color.chat.codebg` | `color.surface.3` |
| `color.chat.codefg` | `color.ink.default` |

### 2.8 Overlay

| Token | Hex |
|---|---|
| `color.overlay.drawer-back` | `rgba(0,0,0,0.50)` |

---

## 3. Typography Tokens（完整表）

### 3.1 Family

| Token | 值 |
|---|---|
| `typography.family.sans` | `"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif` |
| `typography.family.mono` | `"JetBrains Mono", ui-monospace, monospace` |

### 3.2 Feature Settings

| Token | 值 |
|---|---|
| `typography.feature.default` | `"calt", "kern", "liga", "ss03"` |
| `typography.feature.numeric` | `tabular-nums` |

### 3.3 Size（9 阶）

| Token | Size |
|---|---|
| `typography.size.display` | 32 |
| `typography.size.h1` | 24 |
| `typography.size.h2` | 20 |
| `typography.size.h3` | 17 |
| `typography.size.body-lg` | 16 |
| `typography.size.body` | 14 |
| `typography.size.meta` | 13 |
| `typography.size.caption` | 12 |
| `typography.size.micro` | 11 |

### 3.4 Weight（仅 3 阶）

| Token | Weight |
|---|---|
| `typography.weight.regular` | 400 |
| `typography.weight.medium` | 500 |
| `typography.weight.semibold` | 600 |

### 3.5 Leading（line-height）

| Token | LH |
|---|---|
| `typography.leading.tight` | 1.15 |
| `typography.leading.compact` | 1.25 |
| `typography.leading.base` | 1.40 |
| `typography.leading.relaxed` | 1.50 |
| `typography.leading.chill` | 1.55 |
| `typography.leading.loose` | 1.60 |

### 3.6 Tracking（letter-spacing）

| Token | PX |
|---|---|
| `typography.tracking.display` | -0.8 |
| `typography.tracking.h1` | -0.5 |
| `typography.tracking.h2` | -0.3 |
| `typography.tracking.h3` | -0.2 |
| `typography.tracking.normal` | 0 |
| `typography.tracking.button` | 0.2 |
| `typography.tracking.chinese` | `0.02em` |

### 3.7 复合字体 Preset

> 业务侧如果想引用**完整一套**字体设置，使用 preset 组合。

| Preset Token | Size / Weight / LH / Tracking |
|---|---|
| `typography.preset.display` | 32 / 600 / 1.15 / -0.8 px |
| `typography.preset.h1` | 24 / 600 / 1.25 / -0.5 px |
| `typography.preset.h2` | 20 / 600 / 1.30 / -0.3 px |
| `typography.preset.h3` | 17 / 600 / 1.35 / -0.2 px |
| `typography.preset.body-lg` | 16 / 400 / 1.55 / 0 px |
| `typography.preset.body` | 14 / 400 / 1.50 / 0 px |
| `typography.preset.meta` | 13 / 500 / 1.40 / 0 px |
| `typography.preset.caption` | 12 / 500 / 1.40 / 0 px |
| `typography.preset.micro` | 11 / 600 / 1.30 / 0 px |
| `typography.preset.button` | 14 / 500 / 1.00 / 0.2 px |
| `typography.preset.button-label` | 14 / 500 / 1.00 / 0.2 px |
| `typography.preset.code` | 14 / 400 / 1.60 / 0 px (mono) |
| `typography.preset.chat-message` | 16 / 400 / 1.55 / 0 px |

---

## 4. Spacing Tokens

| Token | PX |
|---|---|
| `spacing.2xs` | 4 |
| `spacing.xs` | 8 |
| `spacing.sm` | 12 |
| `spacing.md` | 16 |
| `spacing.lg` | 20 |
| `spacing.xl` | 24 |
| `spacing.2xl` | 32 |
| `spacing.3xl` | 40 |
| `spacing.4xl` | 64 |
| `spacing.section` | 96 |

> 基础单位 4px。所有 spacing token 是 4 的倍数。

---

## 5. Radius Tokens

| Token | 值 | CSS | 用途 |
|---|---|---|---|
| `radius.xs` | 4 | 4px | 小圆角（badge 边） |
| `radius.sm` | 6 | 6px | 小内嵌（inline tag、keycap） |
| `radius.md` | 8 | 8px | 按钮 / 输入框 / search bar |
| `radius.lg` | 12 | 12px | **圆角主力**（卡片 / 按钮 / composer 引用块） |
| `radius.xl` | 16 | 16px | composer / 大圆角矩形 |
| `radius.pill` | 9999 | 9999px | pill（极少） |
| `radius.circle` | 50% | 50% | 头像 / icon 按钮 |
| `chat.bubble.self.radius` | (tl 16 tr 16 br 16 bl 12) | `16px 16px 16px 12px` | 自有气泡 |
| `chat.bubble.friend.radius` | (tl 16 tr 16 br 12 bl 16) | `16px 16px 12px 16px` | 对方气泡 |

---

## 6. Shadow Tokens

| Token | 值 |
|---|---|
| `shadow.1` | `0 1px 2px rgba(0,0,0,0.20)` |
| `shadow.2` | `0 4px 12px rgba(0,0,0,0.32)` |
| `shadow.3` | `0 8px 24px rgba(0,0,0,0.50)` |
| `shadow.4` | `0 16px 48px rgba(0,0,0,0.60)` |

| 语义别名 | 等价于 | 用途 |
|---|---|---|
| `shadow.card` | `shadow.1` | 卡片微弱浮起 |
| `shadow.popup` | `shadow.2` | popover / emoji picker / composer 浮岛 |
| `shadow.modal` | `shadow.3` | 抽屉 / 模态底层浮层 |
| `shadow.floating` | `shadow.3` | 同上 |
| `shadow.hover` | `shadow.1` | hover 极弱浮起 |
| `shadow.focusring` | `0 0 0 2px var(--color-accent-soft-ring)` | focus ring（特殊，组合） |

---

## 7. Border Tokens

| Token | 值 |
|---|---|
| `border.width.hairline` | 1px |
| `border.width.thick` | 2px |
| `border.width.focusring` | 2px |
| `border.style.default` | `solid` |
| `border.color.default` | `var(--color-hairline-default)` |
| `border.color.strong` | `var(--color-hairline-strong)` |
| `border.divider` | `1px solid var(--color-hairline-default)` |

---

## 8. Motion Tokens

### 8.1 Duration

| Token | ms |
|---|---|
| `motion.duration.instant` | 60 |
| `motion.duration.fast` | 120 |
| `motion.duration.base` | 180 |
| `motion.duration.slow` | 280 |
| `motion.duration.ambient` | 1200 |

### 8.2 Easing

| Token | 值 |
|---|---|
| `motion.easing.default` | `cubic-bezier(0.20, 0.80, 0.40, 1.00)` |
| `motion.easing.out` | `cubic-bezier(0.00, 0.00, 0.20, 1.00)` |
| `motion.easing.in` | `cubic-bezier(0.40, 0.00, 0.80, 0.20)` |
| `motion.easing.in-out` | `cubic-bezier(0.40, 0.00, 0.20, 1.00)` |

### 8.3 Transition Presets（命名好的复合 transition）

| Token | 复合 |
|---|---|
| `motion.transition.hover` | `120ms cubic-bezier(0.00, 0.00, 0.20, 1.00)` |
| `motion.transition.click` | `120ms cubic-bezier(0.40, 0.00, 0.80, 0.20)` |
| `motion.transition.modal` | `180ms cubic-bezier(0.00, 0.00, 0.20, 1.00)` |
| `motion.transition.toast` | `180ms cubic-bezier(0.00, 0.00, 0.20, 1.00)` |
| `motion.transition.chat-bubble-enter` | `180ms cubic-bezier(0.00, 0.00, 0.20, 1.00)` |
| `motion.transition.page-transition` | `180ms cubic-bezier(0.00, 0.00, 0.20, 1.00)` |

> **prefers-reduced-motion** 兼容：所有上述 transition 在该媒体查询下，将 `0ms` 替换 180/120ms（详见降级实现，**不属于 token**）。

---

## 9. Opacity Tokens

| Token | 值 |
|---|---|
| `opacity.disabled` | 0.5 |
| `opacity.overlay` | 0.5 |
| `opacity.hover` | 0.08 |
| `opacity.pressed` | 0.16 |
| `opacity.loading` | 0.6 |
| `opacity.unread-badge` | 1.0（即不透明；但背景用 soft-bg） |

---

## 10. Z-Index Tokens

| Token | 值 |
|---|---|
| `z.base` | 0 |
| `z.raised` | 1 |
| `z.sticky` | 10 |
| `z.dropdown` | 100 |
| `z.overlay` | 200 |
| `z.modal` | 300 |
| `z.toast` | 400 |
| `z.tooltip` | 500 |
| `z.loading` | 600 |

---

## 11. Breakpoint Tokens

| Token | PX |
|---|---|
| `breakpoint.mobile` | 480 |
| `breakpoint.tablet` | 768 |
| `breakpoint.laptop` | 1024 |
| `breakpoint.desktop` | 1280 |
| `breakpoint.large-desktop` | 1440 |

> mobile-means: `< 480`；tablet: `480–767`；laptop: `768–1023`；desktop: `1024–1279`；large-desktop: `≥ 1280`。
> 与 ../01_Product/Nook-DESIGN.md 一致。

---

## 12. Size Tokens

### 12.1 Button

| Token | Height | Padding |
|---|---|---|
| `size.button.sm` | 32 | 0 / 12 |
| `size.button.md` | 36 | 0 / 16 |
| `size.button.lg` | 44 | 0 / 20 |

### 12.2 Input

| Token | Height |
|---|---|
| `size.input.sm` | 32 |
| `size.input.md` | 40 |
| `size.input.lg` | 44 |

### 12.3 Avatar

| Token | Diameter |
|---|---|
| `size.avatar.sm` | 24 |
| `size.avatar.md` | 32 |
| `size.avatar.lg` | 48 |

### 12.4 Icon

| Token | Diameter |
|---|---|
| `size.icon.sm` | 16 |
| `size.icon.md` | 20 |
| `size.icon.lg` | 24 |

### 12.5 Layout

| Token | 值 |
|---|---|
| `size.navbar-height` | 56 |
| `size.sidebar-width` | 320 |
| `size.chat-content-width` | 960 |
| `size.chat-bubble-max-width` | 72%（容器百分比） |
| `size.image-max-width` | 480 |

---

## 13. Layout Tokens

| Token | 值 |
|---|---|
| `layout.page-max-width` | 1440（对应 breakpoint.large-desktop） |
| `layout.sidebar-width` | 320（= size.sidebar-width，复制引用） |
| `layout.chat-width` | 960 |
| `layout.container-padding` | 24 |
| `layout.grid-columns` | 12 |
| `layout.grid-gap` | 24 |
| `layout.section-gap` | 96 |

> **避免重复定义**：`layout.sidebar-width` 直接读 `size.sidebar-width`，不在两个地方维护两份。

---

## 14. Icon Tokens

| Token | 值 |
|---|---|
| `icon.size.default` | 20 |
| `icon.size.sm` | 16 |
| `icon.size.lg` | 24 |
| `icon.stroke-width` | 1.5 |
| `icon.radius` | 2（小圆角避免完全 square，与 button 圆角区分） |

---

## 15. 完整 Token 数值清单（速查）

> 下面这张表是**所有 token 的字面值**，业务代码不引用本表，而是引用 token 名。
> 本表只用于对照、迁移、theme 切换。

### 15.1 Color 字面值



```text
color.canvas.default        = #0F1115
color.canvas.deep           = #08090C
color.canvas.soft           = #14171D
color.surface.1             = #181B22
color.surface.2             = #20242C
color.surface.3             = #262B35
color.surface.4             = #2E3440
color.ink.default           = #F2F4F8
color.ink.muted             = #B7BDC8
color.ink.subtle            = #7A8290
color.ink.faint             = #525864
color.accent.default        = #7B85F0
color.accent.hover          = #919BFF
color.accent.press          = #5E68D2
color.accent.softbg         = rgba(123,133,240,0.16)
color.accent.softring       = rgba(123,133,240,0.35)
color.accent.on             = #FFFFFF
color.hairline.default      = rgba(255,255,255,0.06)
color.hairline.soft         = rgba(255,255,255,0.10)
color.hairline.strong       = rgba(255,255,255,0.16)
color.signal.success        = #34D399
color.signal.success-soft   = rgba(52,211,153,0.18)
color.signal.warning        = #F0B45A
color.signal.warning-soft   = rgba(240,180,90,0.18)
color.signal.error          = #F06F7B
color.signal.error-soft     = rgba(240,111,123,0.18)
color.signal.info           = #7AB8F0
color.signal.info-soft      = rgba(122,184,240,0.18)
color.overlay.drawer-back   = rgba(0,0,0,0.50)
```



### 15.2 Shadow 字面值



```text
shadow.1 = 0 1px 2px rgba(0,0,0,0.20)
shadow.2 = 0 4px 12px rgba(0,0,0,0.32)
shadow.3 = 0 8px 24px rgba(0,0,0,0.50)
shadow.4 = 0 16px 48px rgba(0,0,0,0.60)
```



### 15.3 Spacing / Radius / Size（px 整数）



```text
spacing.2xs  = 4      spacing.xs  = 8       spacing.sm  = 12
spacing.md   = 16     spacing.lg  = 20      spacing.xl  = 24
spacing.2xl  = 32     spacing.3xl = 40      spacing.4xl = 64
spacing.section = 96

radius.xs    = 4      radius.sm   = 6       radius.md   = 8
radius.lg    = 12     radius.xl   = 16      radius.pill = 9999
radius.circle = 50%

size.button.sm  = 32   size.button.md  = 36   size.button.lg  = 44
size.input.sm   = 32   size.input.md   = 40   size.input.lg   = 44
size.avatar.sm  = 24   size.avatar.md  = 32   size.avatar.lg  = 48
size.icon.sm    = 16   size.icon.md    = 20   size.icon.lg    = 24
size.navbar-height    = 56
size.sidebar-width    = 320
size.chat-content-width = 960
size.image-max-width  = 480
```



### 15.4 Timeline / Easing / Opacity / Z-Index



```text
motion.duration.instant = 60ms      motion.duration.fast    = 120ms
motion.duration.base    = 180ms     motion.duration.slow    = 280ms
motion.duration.ambient = 1200ms

motion.easing.default = cubic-bezier(0.20, 0.80, 0.40, 1.00)
motion.easing.out     = cubic-bezier(0.00, 0.00, 0.20, 1.00)
motion.easing.in      = cubic-bezier(0.40, 0.00, 0.80, 0.20)
motion.easing.in-out  = cubic-bezier(0.40, 0.00, 0.20, 1.00)

opacity.disabled = 0.5     opacity.overlay = 0.5
opacity.hover    = 0.08    opacity.pressed = 0.16
opacity.loading  = 0.6

z.base=0  z.raised=1  z.sticky=10  z.dropdown=100  z.overlay=200
z.modal=300  z.toast=400  z.tooltip=500  z.loading=600

breakpoint.mobile=480  breakpoint.tablet=768  breakpoint.laptop=1024
breakpoint.desktop=1280  breakpoint.large-desktop=1440
```



### 15.5 Typography 字面值



```text
typography.family.sans  = "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif
typography.family.mono  = "JetBrains Mono", ui-monospace, monospace
typography.feature.default = "calt", "kern", "liga", "ss03"
typography.feature.numeric = tabular-nums

typography.size.display=32  h1=24  h2=20  h3=17
typography.size.body-lg=16  body=14  meta=13  caption=12  micro=11
typography.weight.regular=400  medium=500  semibold=600
typography.leading.tight=1.15  compact=1.25  base=1.40
typography.leading.relaxed=1.50  chill=1.55  loose=1.60
typography.tracking.display=-0.8  h1=-0.5  h2=-0.3  h3=-0.2  normal=0  button=0.2

typography.preset.display = 32/600/1.15/-0.8
typography.preset.h1      = 24/600/1.25/-0.5
typography.preset.h2      = 20/600/1.30/-0.3
typography.preset.h3      = 17/600/1.35/-0.2
typography.preset.body-lg = 16/400/1.55/0     ← 聊天正文
typography.preset.body    = 14/400/1.50/0
typography.preset.meta    = 13/500/1.40/0
typography.preset.caption = 12/500/1.40/0
typography.preset.micro   = 11/600/1.30/0
typography.preset.button-label = 14/500/1.00/0.2
typography.preset.code    = 14/400/1.60/0 (mono)
typography.preset.chat-message = 16/400/1.55/0   (alias of body-lg)
```



---

## 16. 使用规则（业务侧）

### 16.1 ✓ 应该



```ts
// good
const buttonStyle = {
  background: 'var(--color-accent-default)',
  padding: `0 ${token.space.md}px`,
  height: token.size.button.md,
  borderRadius: token.radius.md,
  transition: token.motion.transition.hover
};
```



### 16.2 ✗ 不应该



```ts
// BAD - hardcoded
const buttonStyle = {
  background: '#7B85F0',                 // ❌ 用 hex
  padding: '0 16px',                     // ❌ 用 px
  height: 36,                            // ❌ 用数字
  transition: '120ms ease-out'           // ❌ 用字符串
};

// BAD - semantic drift
background: 'var(--color-surface-1)'    // for self-bubble  ❌ 应是 chat-self-bg
```



### 16.3 必须经过的主题切换示例



```ts
// 想换主色，仅需改 theme 文件
tokens.color.accent.default = '#34D399';  // 改成绿
// 所有引用 color.accent.default / color.chat.selfbg / color.chat.status-online 全部跟随
```



---

## 17. 反模式清单（业务侧开发时避免）

| 反模式 | 正确做法 |
|---|---|
| ❌ 写 `#7B85F0` 字面值 | ✅ 引用 `colors.accent.default` |
| ❌ 写 `padding: 12px` | ✅ `padding: token.space.sm` |
| ❌ `transition: '120ms ease-out'` | ✅ `transition: token.motion.transition.hover` |
| ❌ `border-radius: 10px`（不在 token 阶内） | ✅ 仅用 4 / 6 / 8 / 12 / 16 / 50% / 9999 |
| ❌ 引入第二 brand color | ✅ 永远只引用 `colors.accent.*` |
| ❌ 自定义 `font-feature-settings` | ✅ 仅用 `typography.feature.default` |
| ❌ 写 `font-family` 在业务 style 里 | ✅ 用 `typography.family.sans` |
| ❌ 写 `box-shadow: 0 0 0 1px #fff` | ✅ `border.width.hairline` 或 `shadow.1` |

---

## 18. 后续主题扩展（未来用，本 Token 不实现）

未来若想加 v1.1 的"主题切换"，**只换以下值**，其他全部联动：

| 主题 | 替换值 |
|---|---|
| 浅色模式（**不做**，仅占位） | `color.*` 全面反转 |
| 朋友版绿色 accent | `color.accent.default = '#34D399'` |
| 朋友版粉色 accent | `color.accent.default = '#FF64C8'` |

> 主题切换是 token 系统的演进方向，但不进 v1.0。

---

## 19. 文件清单

- `Nook-DESIGN-TOKENS.md`（本文）
- `Nook-DESIGN-TOKENS.json`（W3C Design Tokens JSON 格式，全量数据）
- `Nook-DESIGN-TOKENS.css`（CSS Variables，可直接被业务 inline 引用或 import）
- `Nook-DESIGN-TOKENS.ts`（TypeScript tokens，含类型 + 嵌套对象）

> 这 4 个文件**严格等价**：任何修改必须 4 个文件同步进行。

## 20. Tailwind Theme 配置建议（Theme extend mapping）

> **不输出实际的 `tailwind.config.ts` 文件**（按 `DESIGN TOKENS.TXT` 约束）。本节只展示"如果未来引入 Tailwind，应该把什么键 map 到什么 Nook token"。
> 任何 Tailwind 类（`bg-canvas` / `text-ink` / `rounded-lg` / `p-md` / `shadow-2` …）都通过这套映射间接引用 token，不写死值。
> **v1.0 不使用 Tailwind**（约束）；本节仅作未来参考。



```ts
// 仅为 mapping 思路示例；非真实文件。所有值仍走 CSS Variables。
{
  theme: {
    extend: {
      colors: {
        canvas:  { DEFAULT: 'var(--color-canvas-default)', deep: 'var(--color-canvas-deep)', soft: 'var(--color-canvas-soft)' },
        surface: { 1: 'var(--color-surface-1)', 2: 'var(--color-surface-2)', 3: 'var(--color-surface-3)', 4: 'var(--color-surface-4)' },
        ink:     { DEFAULT: 'var(--color-ink-default)', muted: 'var(--color-ink-muted)', subtle: 'var(--color-ink-subtle)', faint: 'var(--color-ink-faint)' },
        accent:  { DEFAULT: 'var(--color-accent-default)', hover: 'var(--color-accent-hover)', press: 'var(--color-accent-press)', 'soft-bg': 'var(--color-accent-soft-bg)', 'soft-ring': 'var(--color-accent-soft-ring)', on: 'var(--color-accent-on)' },
        hairline:{ DEFAULT: 'var(--color-hairline-default)', soft: 'var(--color-hairline-soft)', strong: 'var(--color-hairline-strong)' },
        signal:  { success: 'var(--color-signal-success)', warning: 'var(--color-signal-warning)', error: 'var(--color-signal-error)', info: 'var(--color-signal-info)' },
        chat:    { 'self-bg': 'var(--color-chat-self-bg)', 'self-text': 'var(--color-chat-self-text)', 'friend-bg': 'var(--color-chat-friend-bg)', 'friend-text': 'var(--color-chat-friend-text)', 'status-online': 'var(--color-chat-status-online)' }
      },
      spacing: {
        '2xs': 'var(--space-2xs)', xs: 'var(--space-xs)', sm: 'var(--space-sm)',
        md: 'var(--space-md)', lg: 'var(--space-lg)', xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)', '3xl': 'var(--space-3xl)', '4xl': 'var(--space-4xl)',
        section: 'var(--space-section)'
      },
      borderRadius: {
        xs: 'var(--radius-xs)', sm: 'var(--radius-sm)', md: 'var(--radius-md)',
        lg: 'var(--radius-lg)', xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)', circle: 'var(--radius-circle)',
        'bubble-self': 'var(--chat-bubble-self-radius)',
        'bubble-friend': 'var(--chat-bubble-friend-radius)'
      },
      boxShadow: {
        1: 'var(--shadow-1)', 2: 'var(--shadow-2)', 3: 'var(--shadow-3)', 4: 'var(--shadow-4)'
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      fontSize: {
        display: '32px', h1: '24px', h2: '20px', h3: '17px',
        body: '14px', 'body-lg': '16px', meta: '13px', caption: '12px', micro: '11px'
      },
      transitionDuration: {
        instant: '60ms', fast: '120ms', base: '180ms', slow: '280ms', ambient: '1200ms'
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.20, 0.80, 0.40, 1.00)',
        out: 'cubic-bezier(0.00, 0.00, 0.20, 1.00)',
        in: 'cubic-bezier(0.40, 0.00, 0.80, 0.20)',
        'in-out': 'cubic-bezier(0.40, 0.00, 0.20, 1.00)'
      },
      zIndex: { base: 0, raised: 1, sticky: 10, dropdown: 100, overlay: 200, modal: 300, toast: 400, tooltip: 500, loading: 600 }
    }
  }
}
```



> **关键约束**：所有 `var(--*)` 都源自 `Nook-DESIGN-TOKENS.css`，**绝不在 Tailwind 配置中再写一遍 hex 值**。
> 这样组件代码可使用完全 token-driven 的类名：`className="bg-canvas text-ink rounded-lg p-md shadow-2 hover:bg-surface-2 transition-hover"`。
> 注意：bubble 的不对称 `borderRadius`（16 16 16 12 / 16 16 12 16）Tailwind class 需要自定义插件，原生 `rounded-xxx` 不能覆盖 4-corner 不对称场景 —— 通常改用 CSS 变量 `--chat-bubble-self-radius` / `--chat-bubble-friend-radius` 直接引用。

— END —
