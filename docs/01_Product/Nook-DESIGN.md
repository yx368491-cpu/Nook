# Nook · 设计规范 v1.0

> 一份个人 + 小圈子私人聊天网站 Nook 的视觉设计文档。
> 用途：作为后续 UI 实现的设计基线（DESIGN.md 风格），暂不讨论产品功能。

---

## 0. 推荐方案与理由（在动手之前先回答"用哪一套"）

经过对 awesome-design-md-main 里 8 个真实品牌设计系统的对比研究，给你三个最具说服力的候选，再给出最终合成方案。

### 三选一对比

| 维度 | Linear | Raycast | Spotify |
|---|---|---|---|
| 暗色深度 | #010102（带蓝调的近纯黑，**私密感最强**） | #07080a（更深的工程师黑） | #121212（消费者应用黑） |
| 高级感来源 | 4 级 surface ladder + 极简 + 单色精确 | 极简的"命令面板"原生于产品 | 沉浸感 + 触感贴片 + 圆形几何 |
| 科技感来源 | "工程化留白" + 纪律感 | ss03 字体细节 + 单字 CTA | 沉重的阴影让深色 UI 立体 |
| 圆角策略 | 8 / 12 / 16 px —— **柔和但不是 pill** | 6 / 8 / 10 / 16 px | 500–9999 px pill —— **过 pill** |
| 聊天 UI 适配度 | ★★★★★（侧栏 + 气泡 + composer 都可映射） | ★★★★（composer / 输入框最像） | ★★★（沉浸 + 头像，但整体是音乐流） |
| 不适合的点 | 元素密度偏紧（需要我们主动"留呼吸"） | 几乎不用阴影（聊天需要弹层） | pill 几何太 2014（不符合"柔和圆角 · 不是 pill"） |

### 最终方案：**Linear 主 + Raycast 节目 + Spotify 深处阴影**

- **主模板 = Linear**：取它的 4 级 surface ladder、单色高纪律感、8–16 px 圆角、lavender accent 的克制使用——这是"极简 + 高级感 + 私密 + 深色优先"四个字最干净的实现。
- **次模板 A = Raycast**：取它的 Inter + `ss03`（小写 g 替换字符）、composer 输入框"半透明浮岛"语法、keycap 微语言——这是"科技感 + 精致"那一层。
- **次模板 B = Spotify**：仅取**深色 UI 的重型阴影**（`rgba(0,0,0,0.5) 0px 8px 24px`）、圆形 50% 头像几何、以及"在线状态点 / 已读回执"用绿色 #1ed760 当功能性（非装饰）信号灯——这是"年轻人气"那一层。

> 一句话：**Linear 的骨 + Raycast 的笔触 + Spotify 的暗影**。

---

## 1. 设计风格定位

### 1.1 性格（Adjectives）
- 暗夜、安静、克制、亲密，像一间只对几个朋友打开的深夜书房。
- 不是产品（不是工具），不是社区（不是广场），是**角落**——"Nook"本义。

### 1.2 三句气质描述
1. **沉下去**：UI 自己隐身，让对话浮起来。
2. **少即是满**：每一像素都该有理由；留白不是空格，是**会话的节拍**。
3. **温柔科技**：科技感来自字体细节和动画曲线，不来自霓虹和渐变。

### 1.3 视觉重量
- **整体重量：轻**（深色暗背景承担视觉重量，所以元素本身要轻）。
- **信息密度：低**（聊天不需要表格化信息密度，宁可多一行垂直空气）。
- **装饰密度：极低**（除了头像和气泡，几乎不再引入任何装饰元素）。

### 1.4 反参照（避免的样子）
- ❌ 微信绿色 + 顶部 tabbar 的"产品感"
- ❌ Telegram 蓝色飞机 + 高饱和气泡
- ❌ Slack 紫色频道 + 噪声色块
- ❌ 任何把 chat 当 OS 来设计的"面板化"思路

---

## 2. 色彩方案

### 2.1 哲学
- **坚决暗色优先**：默认即为深色，不存在"系统亮色 + 系统暗色"的二选一。
- **单色高纪律**：仅一个 brand accent（默认 lavender-blue），用得极少、极少。
- **深色 ≠ 死黑**：用 4 级 surface ladder 制造深度，绝不靠加白色边框。

### 2.2 全局色板

#### Canvas 层（页面级背景）
| Token | Hex | 用途 |
|---|---|---|
| `--canvas` | `#0F1115` | 默认深色 canvas（比 Linear 的 `#010102` 略暖 + 略浅，避免长聊后疲劳） |
| `--canvas-deep` | `#08090C` | 极端沉浸区，如侧栏背景、模态背后 |
| `--canvas-soft` | `#14171D` | 极淡的次级背景（"另一只眼能看到的层次"） |

#### Surface 层（卡片/气泡/浮岛）
| Token | Hex | 用途 |
|---|---|---|
| `--surface-1` | `#181B22` | 浮起 1 级：消息列表卡片、对方气泡 |
| `--surface-2` | `#20242C` | 浮起 2 级：composer 浮岛、聚焦的状态条 |
| `--surface-3` | `#262B35` | 浮起 3 级：模态、抽屉 |
| `--surface-4` | `#2E3440` | 浮起 4 级：最高的浮层（极小面积） |

#### Ink 层（文字）
| Token | Hex | 用途 |
|---|---|---|
| `--ink` | `#F2F4F8` | 标题、消息正文、按钮文字 |
| `--ink-muted` | `#B7BDC8` | 次要文字、时间戳、未读 badge |
| `--ink-subtle` | `#7A8290` | 三级文字、placeholder、禁用 |
| `--ink-faint` | `#525864` | 极弱提示、分隔符 |

#### Hairline（分隔与描边）
| Token | Hex | 用途 |
|---|---|---|
| `--hairline` | `rgba(255,255,255,0.06)` | 1 px 弱分隔（几乎看不到，靠 surface 对比分层） |
| `--hairline-soft` | `rgba(255,255,255,0.10)` | 聚焦描边 |
| `--hairline-strong` | `rgba(255,255,255,0.16)` | 罕见使用，几乎只在 focus-ring |

### 2.3 主色（Brand Accent）

> 默认 `Lavender Blue`。理由：年轻人气、沉静不刺眼、对暗色背景最温柔的"光"。
> 单一 accent 是品牌纪律的一部分；如果你的朋友更喜欢"绿/粉"，可在 v1.1 切换 single source-of-truth 的变量。

| Token | Hex | 用途 |
|---|---|---|
| `--accent` | `#7B85F0` | 自身的消息气泡底色 tone-up 用色、send button、在线状态点 |
| `--accent-hover` | `#919BFF` | primary 按钮 hover |
| `--accent-press` | `#5E68D2` | primary 按钮按下（更深） |
| `--accent-soft-bg` | `rgba(123,133,240,0.16)` | 选中/active 项的背景 |
| `--accent-soft-ring` | `rgba(123,133,240,0.35)` | focus ring |
| `--on-accent` | `#FFFFFF` | 文字在 accent 上的颜色 |

### 2.4 Signal Color（功能性极弱信号）
| Token | Hex | 用途 |
|---|---|---|
| `--success` | `#34D399` | 已送达、已读状态点（**功能用**，Spotify 遗产） |
| `--success-soft` | `rgba(52,211,153,0.18)` | 已读徽章背景 |
| `--warning` | `#F0B45A` | 仅在错误 / 网络抖动出现 |
| `--error` | `#F06F7B` | 仅在发送失败 |
| `--info` | `#7AB8F0` | 仅在系统消息 |

> **重点**：success / warning / error / info **只在状态语义出现**，绝不做品牌色或按钮色。它们是"信号灯"不是"装饰"。

### 2.5 不允许出现的规则
- ❌ 大面积彩色背景（最多 ≤ 5% 画布被染色）
- ❌ 渐变 hero banner（聊天不需要 banner）
- ❌ 任何直径 > 12 px 的彩色圆点（除了头像）

---

## 3. 字体方案

### 3.1 字体家族



```
主字体（Sans）：
  font-family: "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-feature-settings: "calt", "kern", "liga", "ss03";
  // ⭐ 必须开启 ss03：年轻科技感的来源是这一个字符的替换
等宽（仅技术场景出现，比如代码消息片段）：
  font-family: "JetBrains Mono", ui-monospace, monospace;
```



> **ss03 是隐藏的"科技感开关"**：`g` 这个字符的 single-story 版本。开启前后，肉眼可感的差异在 Geist/Inter 字体本身。Linear 和 Raycast 都做了这件事。

### 3.2 字号阶梯（type scale）

| Token | Size / Weight / LH / Tracking | 用在哪 |
|---|---|---|
| `--text-display` | 32 / 600 / 1.15 / -0.8 px | 应用名" Nook " 启动屏；新会话标题 |
| `--text-h1` | 24 / 600 / 1.25 / -0.5 px | 抽屉大标题 |
| `--text-h2` | 20 / 600 / 1.30 / -0.3 px | 设置 / 关于的 section 标题 |
| `--text-h3` | 17 / 600 / 1.35 / -0.2 px | 对话列表中的会话名 |
| `--text-body-lg` | 16 / 400 / 1.55 / 0 | 消息正文（**聊天主要字号**） |
| `--text-body` | 14 / 400 / 1.50 / 0 | 次级正文、二级按钮 |
| `--text-meta` | 13 / 500 / 1.40 / 0 | 时间戳、未读计数、消息状态 |
| `--text-caption` | 12 / 500 / 1.40 / 0 | 空状态说明、emoji 反应计数 |
| `--text-micro` | 11 / 600 / 1.30 / 0 | tab 标签右上小 badge |

### 3.3 字重阶梯
- 仅使用 `400 / 500 / 600` 三档。
- `700` 不出现在聊天界面（会让"消息"看起来像"标题"，破坏亲密感）。
- `body-lg` 默认 400；想强调时改 500；不要用 600。

### 3.4 行高 / 字间距原则
- 消息正文（`--text-body-lg`）LH `1.55` 到 `1.60`，留出"中文阅读的呼吸"。
- 中英文混排时，**中文留 0.02em 字间距**，西文保持 0。
- 标题永远 `tracking` 负值（-0.2 ~ -0.8 px），让人感觉"被裁过的字"。

### 3.5 数字与 emoji
- 数字使用 `font-variant-numeric: tabular-nums`，保证时间戳整齐。
- emoji 用系统默认渲染（不要强制 emoji 字体）。

---

## 4. 间距规范

### 4.1 基础单位
`4 px` —— 所有 token 都是 4 的倍数。

### 4.2 Token 阶
| Token | 值 | 用在哪 |
|---|---|---|
| `--space-2xs` | 4 px | 元素内紧贴距（badge 内边距） |
| `--space-xs` | 8 px | 同一组元素之间的距离（消息内 emoji 之间） |
| `--space-sm` | 12 px | 短间距（按钮内左右 padding） |
| `--space-md` | 16 px | 卡片内 padding、中等间距（气泡之间的间距） |
| `--space-lg` | 20 px | 重要区块之间 |
| `--space-xl` | 24 px | section 间距；card 外边距 |
| `--space-2xl` | 32 px | 大区块之间（侧栏与主面板间距） |
| `--space-3xl` | 40 px | 极重要的呼吸空隙（空状态距顶部） |
| `--space-4xl` | 64 px | 屏内最大呼吸（聊天页面顶部登陆态距 canvas 顶） |

### 4.3 容器宽度
- **聊天窗口（PC）**：固定 `960px` 居中，左右 balance 全留给 surface 视觉留白。
- **聊天窗口（窄屏）**：100% 自适应。
- **侧栏 PC**：固定 `320px`。手机态缩为 100% drawer。

### 4.4 间距节奏（节奏感 > 一致感）
- **同一发送者连续两条消息**之间的间距：`4 px`（紧凑，让眼睛读成一组）。
- **不同发送者之间**第一条消息的间距：`16 px`（呼吸明显）。
- **日期分隔条上下**：`24 px / 24 px`。
- **无新消息时的"今天"分界线**：单条 1 px hairline，左右各 16 px 间距。

---

## 5. 按钮规范

### 5.1 类型 × 圆角表
| 类型 | 形状 | 圆角 |
|---|---|---|
| Primary（图章级 CTA，如"发送"、 "开始聊天"） | 圆角矩形 | `12 px` |
| Secondary（次级动作，如"取消"） | 圆角矩形 | `12 px` |
| Ghost / Text（无背景，如"删除对话"） | — | 无圆角 |
| Icon button（图标按钮，≤ 40 px 直径） | 圆形 | `50%`（**仅这一种允许 pill/circle**） |

### 5.2 尺寸
| 尺寸 | 高度 | padding | 用在哪 |
|---|---|---|---|
| `sm` | 32 px | 0 / 12 px | 列表项的内嵌按钮、tab |
| `md` | 36 px | 0 / 16 px | 默认 |
| `lg` | 44 px | 0 / 20 px | send 按钮、底部主操作 |

### 5.3 视觉规则

**Primary（accent 蓝）**
- background: `--accent` (#7B85F0)
- color: `--on-accent`（纯白）
- hover: 背景 → `--accent-hover`，transition `120ms ease-out`
- press: 背景 → `--accent-press`，scale(0.97)，transition `80ms ease-in`
- disabled: 背景 → `--surface-2`，color → `--ink-subtle`，无 hover

**Secondary（透明 / hairline 描边）**
- background: transparent
- border: 1 px `--hairline-strong`
- color: `--ink`
- hover: 背景 → `--surface-1`，border → `--hairline-strong`
- press: 背景 → `--surface-2`

**Ghost / Text**
- color: `--ink-muted`
- hover: 背景 → 透明色，color → `--ink`
- 仅文字或文字 + icon，永远不画 box

**Icon button（圆形 50%）**
- 直径: 32 px / 40 px（中等更多）
- background: transparent
- hover: background → `--surface-1`
- press: background → `--surface-2`
- 不使用 focus ring（用 1 px hairline 替代，更冷静）

### 5.4 focus 规则（键盘可达）
- 任何 button：`focus-visible` 时给 2 px `--accent-soft-ring`，外加 3 px offset。
- **不要用浏览器默认 outline**，太吵。

---

## 6. 卡片规范

### 6.1 卡片出现的位置
- 对话列表中的每一会话（surface-1）
- 设置 / 关于 中的设置项（surface-1，hairline 分隔）
- 群聊右侧"成员卡"（surface-2）

### 6.2 通用规则
- 圆角：`12 px`（`--radius-lg`）。
- 内 padding：`16 px` 上下 / `16 px` 左右。短清单可缩到 `12 px`。
- 不画描边，靠 surface 与 canvas 的亮度差产生"浮起来"的感觉。
- 极少场景才加阴影（见 6.4）。

### 6.3 surface ladder 的运用
- 列表中的普通卡片：surface-1（与 canvas #0F1115 仅差 1 级）
- 当前选中/active：surface-2 + accent-soft-bg（左侧还需要一根 2 px accent 线条）
- hover（卡片可点击时）：surface-1 → surface-2，transition `120ms ease-out`
- 不可点的"信息卡"：停留在 surface-1，禁用 hover 提升。

### 6.4 阴影（重阴影规则）
> **Linear / Raycast 的深色 UI 几乎不用阴影**，聊天需要弹层（如设置抽屉、emoji 选板），因此借 Spotify 的深色阴影。

| 层级 | 用途 | 投影 |
|---|---|---|
| `--shadow-1` | 卡片微弱浮起（极少用）| `0 1px 2px rgba(0,0,0,0.20)` |
| `--shadow-2` | popover / emoji picker | `0 4px 12px rgba(0,0,0,0.32)` |
| `--shadow-3` | 模态底层浮层 / 抽屉 | `0 8px 24px rgba(0,0,0,0.50)` |
| `--shadow-4` | 仅用于单一 modal 的最极端 | `0 16px 48px rgba(0,0,0,0.60)` |

> 关键：**深色 UI 的阴影一定要"重"**——浅阴影在深色背景上看不见，反而像噪点。

### 6.5 内 padding 选择
- 卡片是"行" → `12 px / 16 px`（密度更高）
- 卡片是"块" → `20 px / 24 px`（内容感更强）

---

## 7. 输入框规范

### 7.1 双形态

#### 形态 A：搜索 / 命令输入（侧栏顶部、设置页）
- 高度：36 px
- background：canvas（透明）+ hairline 描边
- input field：`<input>`，padding 0 / 12 px
- placeholder 颜色：--ink-subtle
- focus：border → --hairline-strong，背景 → --surface-1，过渡 120 ms

#### 形态 B：消息 composer（聊天底部，最重要）

> 这是聊天体验里停留最久的元素，必须有"温柔"。

- 位置：**不贴底**，浮在底部，距底边 24 px，左右各 24 px。
- 形状：圆角矩形 `16 px`（**比按钮更圆，更软**）。
- 背景：`--surface-2`（比 canvas 高 2 级，营造"飘起来的岛"）。
- 描边：默认 `1 px --hairline`，focus `1 px --accent-soft-ring`。
- shadow：`--shadow-2`（让它真的"飘"在消息流之上）。
- 内容 padding：12 px / 16 px。
- 高度区间：min 44 px，max 144 px（自动长高，多行后变 scroll-internal）。
- 字体：var(--text-body-lg)。
- placeholder："说点什么…" --ink-subtle。

**action 区（composer 右下）**
- 默认态：发送按钮 disabled (surface-2，ink-subtle)
- 有内容态：发送按钮 medium（accent），shadow-none + scale(1) on press
- shift+enter 换行；enter 发送（但允许在设置里"反转"为 enter 换行 / cmd+enter 发送的开发者模式）

**typing 状态**
- 其他人在打字时，对方头像旁显示三点动效（见动画规范 9.4）。

### 7.3 消息被引用 / 回复时
- composer 上方浮一层 `--surface-2` 的"引用卡"，圆角 12 px，单行 truncate 被引用的消息。
- 关闭按钮（圆形 icon）与引用块的右侧对齐。

---

## 8. 聊天气泡规范（**最关键的一节**）

### 8.1 形状语言（"软矩形 · 非 pill · 非方块"）

Nook 不使用 iMessage 的全 pill，也不使用企业 IM 的方块。气泡是一种**只在自己一侧不封口的圆角矩形**（俗称"飞机翼 / 猫舌"）。这是 Linear、Vercel、Superhuman 等高级感产品常见的几何选择——既温柔又有逻辑。

| | 自有气泡 | 对方气泡 |
|---|---|---|
| 位置 | 靠右 | 靠左 |
| 形状 | 左下角 `12 px`，其他三角 `16 px` | 右下角 `12 px`，其他三角 `16 px` |
| 背景 | `--accent` (#7B85F0) | `--surface-1` (#181B22) |
| 文字 | `--on-accent` (#FFFFFF) | `--ink` (#F2F4F8) |
| 头像 | 不显示（极简纪律） | 显示，在气泡左侧，对齐到首行 Baseline |
| max-width | `72%` 容器宽 | `72%` 容器宽 |

> **气泡宽度策略**：72% 的"主角"——给消息呼吸余地，但又能在一屏放两条。

### 8.2 padding
- 气泡内 padding：上下 `10 px`，左右 `14 px`。
- 中文 / 西文统一这个 padding（不要因为字数而变化，会不稳定）。

### 8.3 间距节奏（与 4.4 对应）
| 情况 | 间距 |
|---|---|
| 同一发送者连续消息 | `4 px` |
| 不同发送者 / 同时刻不同人 | `12 px`（再上面 8 px 是"对话组"间隙） |
| 长间隔（同一人 10 分钟后再发） | `16 px` |
| 系统消息（"X 加入了会话"） | 居中、12 px hairline 上下、字号 caption、ink-muted |

### 8.4 头像（在对方气泡左侧）
- 直径 32 px
- 永远 50% 圆
- 不带描边
- 同一发送者的连续气泡：只第一条显示头像，中间的"占位气泡"留 32 px 空白。

### 8.5 meta 信息（时间戳 / 已读 / 状态）
- 默认**不显示**。只在 hover message 时，气泡尾端显示相对时间（13 px，ink-subtle）。
- 已读 / 发送中状态：在 PC 端 hover 时显示；移动端永远不显示（移动端空间太紧张）。
- 状态图标：
  - 发送中 → 圆点 outline，ink-subtle
  - 已发送 → 单勾，ink-subtle
  - 已读 → 单勾，success 颜色（绿点示意）

### 8.6 气泡内特殊元素
- **链接**：下划线 color = `--ink`（自身气泡 on-accent 也是 white text + 60% opacity underline）
- **行内代码片段**：`--surface-3` 背景，1 px hairline，圆角 6 px，font-family JetBrains Mono 13 px。
- **代码块**：背景 `--surface-3`，顶部圆角 12 px，复制按钮右上悬浮。
- **emoji**：用系统默认渲染；不要做 emoji 字体替换（在年轻人眼里这反而"中年感"）。
- **图片**：圆角 12 px（与气泡几何一致），最大宽 100% 容器，PC 端限制 480 px；加载完前用 surface-3 占位。

### 8.7 群聊特别规则
- 同一发送者第一条消息上方显示发送者名字（12 px，accent-soft，h4-weight）。
- 连续消息的紧密度额外 +20%。

---

## 9. 动画规范

### 9.1 哲学
- **动效是 ambient，不是 spectacle**。动效是"礼貌"的方式，不是炫耀。
- 三原则：
  1. < 200 ms（不能让人等的动效）
  2. ease-out 优先（人对外界响应是 ease-out）
  3. 不做超过 12 px 的位移（位移越大越"卡通"）

### 9.2 全局时长阶梯
| Token | 时长 | 用途 |
|---|---|---|
| `--dur-instant` | 60 ms | 极微变化（按钮、icon 内部） |
| `--dur-fast` | 120 ms | hover / focus / 选中态切换 |
| `--dur-base` | 180 ms | 消息进入、抽屉滑入 |
| `--dur-slow` | 280 ms | 罕见的、刻意放慢的强调 |
| `--dur-ambient` | 1200 ms（循环） | typing 三点、在线呼吸 |

### 9.3 缓动函数
- 默认：`cubic-bezier(0.20, 0.80, 0.40, 1.00)`（近似 ease-out-expo，更"温柔"）
- 入场：`cubic-bezier(0.00, 0.00, 0.20, 1.00)`（ease-out）
- 离场：`cubic-bezier(0.40, 0.00, 0.80, 0.20)`（ease-in）

### 9.4 具体动效规范

#### 消息进入（最重要的）
- 新消息从底部滑入：`translateY(8px) → 0`，opacity `0 → 1`
- 时长 180 ms，缓动 ease-out
- **不要做 scale 缩放进场**（会让气泡"跳"）
- 一次只动一条（多条时逐条 30 ms 错落，不超过 3 条同时入场）

#### typing 三点
- 经典三点跳，但降速：每个点 400 ms 周期，整体错开 120 ms
- 点的颜色：ink-muted，半径 4 px

#### 已读状态切换
- 单勾变 success 色：颜色 transition 180 ms ease
- **无需位置跳动**（移动端会被压扁）

#### 抽屉 / settings
- 从右侧滑入：`translateX(24px) → 0`，opacity `0 → 1`
- 背板：黑色 50% 透明度 fade-in 120 ms
- 关闭：返向动画

#### hover
- 背景色 / 描边色 transition 120 ms ease-out
- **永远不要 transform scale 在 hover 里**（chat 是阅读界面，缩放会很"跳"）

#### composer focus
- border 颜色 transition 120 ms
- shadow 由 --shadow-1 到 --shadow-2（让它"飘得更明显"）

### 9.5 ambient 动效（极少使用）
- 在线状态点呼吸光晕：1200 ms 一周期，opacity 0.5 → 1 → 0.5
- 仅在用户头像旁的 6 px 圆点上使用，别处不用。
- 是否启用呼吸光晕，应在设置里可关（pro 选项："极简模式"）。

### 9.6 减少动效偏好
- 检测 `prefers-reduced-motion: reduce`：
  - 把所有入场 / 滑入 / fade 改为 instant（0 ms），只保留必要 transition（如 opacity 用于状态表达）。
  - typing 三点改为线性呼吸光（不再跳动）。
  - 关闭所有 ambient 动效。

---

## 10. 整体视觉原则

### 10.1 五条铁律

#### 1. 大量留白 × 暗色背景
- 深色 canvas + 最小元素 = 留白本身。
- 不要靠"加 spacing"做留白，要靠"减元素"做留白。
- 一屏内主操作按钮永远不超过 1 个（send 按钮也算一个）。

#### 2. 圆角克制（柔和但不软胖）
- 不要 > 16 px 的圆角（除了头像和图标的 50%）。
- 不要 pill 按钮（除了 send 这种 hero CTA 在 PC 可选 16 px 圆角矩形）。
- 一致圆角阶：`6 / 8 / 12 / 16 / 50%`，不在中间值随意发挥。

#### 3. 装饰最小化
- 阴影：只在 popover / modal 时用，其他时间让 surface ladder 撑起层次。
- 渐变：禁用于大面积背景；仅可用于头像占位时的微彩色噪点。
- 边框：极少；优先用 surface 差。

#### 4. 暗色节奏（不要全屏一样暗）
- canvas → surface-1 → surface-2 三个层次必须区分清晰。
- 一眼看上去应该有"侧栏轻、聊天面板底、composer 浮"的层次感。
- 中度对比，避免 #000 与 #FFF 直接相邻（伤眼）。

#### 5. 响应式纪律（PC 与移动端同等重要）
- **侧栏 + 主面板** 在 PC 是双栏；移动端改成单栏 + 推入抽屉。
- composer 在移动端贴底（破例，因为屏幕小、键盘要弹），但仍保持圆角上沿 + 16 px 圆角 + 阴影 2。
- 所有交互目标 ≥ 44 px 高度（移动端触达）。
- 所有字号最小 13 px。
- **不要 PC / 移动两套设计**。要一套设计、"流式"适配。

### 10.2 快查表（实现时随时对照）

| 决策 | 答案 |
|---|---|
| 背景色 | canvas `#0F1115` |
| 主色 | accent `#7B85F0`（极克制） |
| 信号色 | success `#34D399`（功能、不装饰） |
| 字体 | Inter + ss03 |
| 主字号 | 16 px / 400 / 1.55 |
| 圆角阶 | 6 / 8 / 12 / 16 / 50% |
| 圆角主力 | 12 px |
| 按钮形状 | 12 px 圆角矩形 |
| 头像形状 | 50% |
| 气泡形状 | "飞机翼"软矩形（左/右下角 12 px） |
| 阴影 | 偏重（0.32–0.50 透明度） |
| 装饰 | 极少 |
| 渐变 | 禁用 |
| 动效时长 | ≤ 200 ms |
| 入场缓动 | ease-out |
| 减动效 | 必须尊重 prefers-reduced-motion |
| 触达尺寸 | ≥ 44 px |
| 暗色默认 | **是**，且无 light mode 备用（v1.0） |

### 10.3 反例清单（实现时必须避开）

- ❌ 用 mint / 渐变 hero banner 当页面背景
- ❌ 把 bubble 做成全 pill
- ❌ 把按钮写成 pill（除了 send 这一个，可选矩形）
- ❌ 用 `box-shadow 0 0 0 1px` 当唯一分层手段
- ❌ 引入第二 brand color
- ❌ 用彩虹的 emoji 反应面板
- ❌ 把消息正文做 bold / italic / underline 多种混杂
- ❌ 用 emoji 替换字体（会损失"原生感"）
- ❌ 出现「Powered by」、「发现更多」这种第三方公约元素——这是私人 chat，不需要

---

## 11. 后续步骤（建议 next）

1. 把这份 Nook-DESIGN.md 写成可供 AI Agent 直接读的"design system"，方便后续 build。
2. 在工程中实现设计 tokens（CSS variables / Tailwind theme）。
3. 选型技术栈（建议 React + Vite + Tailwind + shadcn/Radix 但可定制；或 Next.js App Router）。
4. 单独出一个"组件级 preview"，每节规范对应一个最小可运行 demo。
5. 用户测试：让 2–3 个朋友用一周，根据反馈把"圆角 / 字号 / 间距"做最后微调。

> 这是一个"私人 + 朋友"的项目，意味着设计可以"偏执"——你完全可以根据你自己的偏好，把某个 token 跑偏一点（例如把主色换成你喜欢的某个绿色）。设计是为人服务的，不是规范服务的。

— END —
