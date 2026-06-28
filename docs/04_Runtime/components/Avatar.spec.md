# Nook · Avatar v1.0 · Spec

> 头像 = **圆身份 + 在线感**。
> 默认首字母圆（来自 `display_name`），可选上传图替换，永远 50% 圆形。
> 在线状态点（6 px accent）通过 status overlay 实现。
> 数据来源：`../../01_Product/Nook-DESIGN.md § 8.4` + `../../01_Product/Nook-INTERVIEW-spec.md § 2.1 AUTH-9 / § 2.5 ST-1`。

---

## 0. 三条铁律

1. **永远 50% 圆**——Nook 不允许方形头像、异形头像（hexagon / dog-ear）。这是品牌纪律。
2. **永远有 fallback**——即便 name 空 / 图片加载失败 / 朋友尚未上传头像：第一性来源必须是首字母 + 一致背景色（按 `name` 哈希定 accent 略变化）。
3. **状态点是小火炉，不是警报灯**——6 px 大小、呼吸动画是 ambient，不闪烁、不变红、不变色。

---

## 1. 类型签名



```ts
import type { ImgHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

/** 尺寸档（与 token size.avatar 对齐） */
export type AvatarSize = 'sm' | 'md' | 'lg';

/** 在线状态 */
export type AvatarStatus = 'online' | 'offline';

/** 头像内容优先级：src > initials(name) > initial('' fallback) */
export interface AvatarProps extends Omit<
  ImgHTMLAttributes<HTMLSpanElement>,
  'src'
> {
  name?:     string;               // 用于计算 initials、占位背景色
  initials?: string;               // 显式覆盖（v1.0 罕见使用，Nook 通常让 name 派生）
  src?:      string | null;        // 上传后的头像图（null/false/缺 → 显示首字母）
  size?:     AvatarSize;           // 默认 'md'
  status?:   AvatarStatus;         // 不传 = 不画状态点
  pulse?:    boolean;              // 仅 status='online' 时启用 ambient 呼吸
  withName?: boolean;              // 切到"avatar + 名字"复合（用于群成员列表）
  children?: ReactNode;            // 用 withName 时这里是 name slot
  /** 同 Button 规则 */
  className?: string;
  asChild?: boolean;
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>((props, ref) => {
  /* 实现节略 */
});
Avatar.displayName = 'Nook.Avatar';
```



---

## 2. 三级回退链（视觉忠实度从高到低）



```
1. src is truthy && image load success → render <img src={src} ...> (圆形 clip)
2. 否则                         → 算 initials(name):
                                     - name 长度 1 → name[0]
                                     - name 长度 2-3 → 全部字符（中文取首字 schema 扩展）
                                     - 含空格（如 "张三 Zoey"）→ 取 split[0][0] + split[1][0]
                                     - 全空或 null → '·'
                                 → 计算 hash(name) → paletteAccentSoftBg 的色相扰动 ±10°
3. initials 字号 'sm' = 11 / 'md' = 13 / 'lg' = 17，所有 weight 500，色 onAccent
```



> **Accent 扰动规则**：同一用户在不同会话看到的"占位色"是稳定一致的——这是"指纹"，不是装饰。
>
> 

```ts
> // 计算稳定 accent 扰动（v1.0 用 lightness/hue 极弱偏移，避免变成"彩色 emoji 风格"）
> const hashCode = (s: string) => [...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) | 0, 5381);
> const accentOffsetDeg = Math.abs(hashCode(name)) % 12 - 6; // ±6°
>
> // 实际样式：background = var(--color-accent-default) with hue-rotate(accentOffsetDeg)
> // ⚠️ 但 v1.0 简化：仅当 name 非空才显示（不抛 console error），name 缺则回退透明 + "·"
> ```



---

## 3. 尺寸（直接映射 token）

| size | 直径 | 字号 (initials) | 状态点 (presence dot) |
|---|---|---|---|
| `sm` | `var(--size-avatar-sm)` = 24 px | 11 (tokens.typography.size.micro) | 5 px |
| `md` | `var(--size-avatar-md)` = 32 px | 13 (meta) | 6 px |
| `lg` | `var(--size-avatar-lg)` = 48 px | 17 (h3) | 8 px |

> size=lg 的 status dot 略大是为了能在群聊成员列表中保持可读。

---

## 4. 在线状态点（presence dot 极重要的一节）

### 4.1 视觉

| status | dot 颜色 | dot 行为 |
|---|---|---|
| `online` | `var(--color-chat-status-online)` = `--color-accent-default` (#7B85F0) | 静态 + 可选 pulse（仅 status='online' + pulse=true） |
| `offline` | `var(--color-chat-status-offline)` = `--color-ink-faint` (#525864) | 静态 |
| 不传 | 不渲染 dot | — |

### 4.2 位置

dot 永远贴在头像 **bottom-right**，内偏 1 px（让环看起来"打磨过"）：



```css
.presence-dot {
  position: absolute;
  bottom: -1px;
  right:  -1px;
  border-radius: var(--radius-circle);
  /* 让 dot 周围有一圈 2px canvas 颜色，营造"切割" */
  outline: 2px solid var(--color-canvas-default);
}
```



> 外圈 outline 颜色 = 父背景；因为 Nook 是暗色 baked-in，统一为 canvas。这样 dot 在 hover / 选中态不会"穿透"。

### 4.3 pulse（呼吸光晕 · 仅 online 启用）



```css
.status-dot--online.is-pulse {
  animation: ambient-pulse var(--duration-ambient) ease-in-out infinite;
}
@keyframes ambient-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 var(--color-accent-soft-ring);  /* 透明 */
  }
50% {
  /* pulseReach=4px 是 pulse 动画的振幅（ring 相对 dot 半径的最大扩张）。
     当前为字面值；若要 token 化须先在 Nook-DESIGN-TOKENS.ts 加 size.avatar.pulseReach=4，
     此处保持字面值 + 注释，避免 component 实现期偷偷抽 token。 */
  box-shadow: 0 0 0 4px var(--color-accent-soft-bg);    /* 16% alpha 圆环 */
}
}
```



> pulse 是 Nook 唯一允许的 "ambient" 动效（Nook-DESIGN § 9.5）。**必须** 在设置里有开关（pro 选项："极简模式"——v1.1+），v1.0 默认 pulse = true，组件接受 `pulse={false}` 显式关闭。

---

## 5. withName 模式（复合：头像 + 名字 to the right）



```ts
export interface AvatarWithNameProps extends AvatarProps {
  children: ReactNode;     // 必填：名字 + 可选副标题 slot
  align?:    'start' | 'center';  // 垂直对齐
}

// 用法（v1.0 group member list / sidebar 等）：
<Avatar name={friend.displayName} src={friend.avatarUrl} status={friend.online ? 'online' : undefined} size="md">
  <div>
    <div style={{ font: 'var(--font-size-body)' }}>{friend.displayName}</div>
    <div style={{ font: 'var(--font-size-caption)', color: 'var(--color-ink-muted)' }}>
      最近活跃 · {lastSeen}
    </div>
  </div>
</Avatar>
```



> ⚠️ 与 `../../01_Product/Nook-PRODUCT.md § 2` 反模式一致：**不显示"最后在线时间"**（Interview § 2.5 ST-4）。
> 注 5 中的 "最近活跃 · {lastSeen}" 仅用于群成员管理侧栏，**主会话侧栏不可用**。

---

## 6. 与 Nook-PRODUCT 反模式 / Interview 决策对齐

| 决策 | 兑现 |
|---|---|
| 默认首字母圆，注册时不上传 | src 默认 null → 显示首字母 |
| 设置页可后补上传 | 上传成功后存 `profiles.avatar_url`，再次渲染 Avatar 时 src 走真图 |
| **永远 50% 圆**、**不变形** | border-radius: var(--radius-circle) hard-coded |
| **无"隐身模式"**（Interview § 2.5 ST-5） | status 只接受 'online' \| 'offline'，不接受 'hidden' |
| **无"最后在线时间"**（Interview § 2.5 ST-4） | withName 仅限群成员管理 layout；禁止 "minute ago" / "2 hours ago" 文本 |

---

## 7. 可达性

| 项 | 规则 |
|---|---|
| role | 默认 `role="img"`（单独的图像 entity） |
| aria-label | 当 src 有：alt 优先；否则 `${name} 的头像`（Chinese） |
| status dot | 不暴露为独立 role；包含在 aria-label 中 "在线" / "离线" |
| withName | 自动 role="group"，含 name 时 aria-label = `name` |
| 键盘 | Avatar 本身**不**可点击——它是身份 chip；如要 click（如打开个人资料）请父包 `<button>` |

---

## 8. 反模式（写了不通过）

- ❌ 不接受 `shape="square" | "rounded"`——永远 50% circle
- ❌ 不接受 `status="away" | "busy" | "dnd"`——Nook 没有 away 概念
- ❌ 不接受 `placeholder="点击上传"`——上传交互在 settings 页，不在 Avatar 自身
- ❌ 不写 `gradient` bool / 颜色变体——首字母背景只用单色 + 极弱 hue 扰动
- ❌ 不自管图片 onError fallback——v1.0 用 alt 显示 initials，外部用 `onError`
- ❌ 不支持 stacking（多个 Avatar 重叠成 "5+"）——本组件 v1.0 不出，留 `AvatarStack` v1.1

---

## 9. Token 反查表



```ts
const avatarTokens = {
  size: {
    sm: { px: 'var(--size-avatar-sm)', font: 'var(--font-size-micro)' },
    md: { px: 'var(--size-avatar-md)', font: 'var(--font-size-meta)' },
    lg: { px: 'var(--size-avatar-lg)', font: 'var(--font-size-h3)' },
  },
  radius: 'var(--radius-circle)',             // 50%
  bg:     'var(--color-accent-default)',      // 默认 accent
  bgFallback: 'var(--color-surface-3)',       // name 空时
  fg:     'var(--color-accent-on)',          // initials 字体色
  status: {
    online:  'var(--color-chat-status-online)',   // dot 色
    offline: 'var(--color-chat-status-offline)',
    outline: 'var(--color-canvas-default)',  // dot 切割环
    pulseRing: 'var(--color-accent-soft-bg)', // pulse 动画 ring
  },
  pulse: { duration: 'var(--duration-ambient)', easing: 'ease-in-out' },
};
```



---

## 10. 测试清单

- [ ] src 真值 → 渲染 `<img>`
- [ ] src 假值 + name='张三' → 显示 "张"
- [ ] name 全空 → 显示 "·" 占位
- [ ] 头像始终 50% 圆（在不同 size 下）
- [ ] status='online' pulse=true → 渲染 box-shadow 呼吸
- [ ] status='offline' → 渲染暗 dot，无脉冲
- [ ] status 不传 → 无 dot
- [ ] withName=true → 渲染 group；name 在右侧
- [ ] prefers-reduced-motion 下 pulse 改静态 box-shadow
- [ ] aria-label 含 status 时说"在线" / "离线"

---

— END —
