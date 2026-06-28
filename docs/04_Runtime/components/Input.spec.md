# Nook · Input v1.0 · Spec

> Nook 输入组件 = 一个 `Input` 原子 + 一个 `Composer` 复合。
> 数据来源：`../../01_Product/Nook-DESIGN.md § 7` + `Nook-DESIGN-TOKENS.ts` + `../../01_Product/Nook-PRODUCT.md M3 / S3 / S5`。

---

## 0. 设计直觉

聊天里**粘得最久的元素是 composer**——不是 sidebar，不是 settings。所以 Input 的核心任务是：**让 composer 写得舒服**。其他场景（搜索、表单、密码）是次线，但必须用同一组件复用 token 纪律。

---

## 1. `Input` → 类型签名



```ts
import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

/** 用途语义（四选一，决定整体形态） */
export type InputVariant = 'form' | 'search' | 'composer' | 'password';

/** 尺寸 */
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>,
  'size'                  // 防止与 InputSize 冲突
> {
  variant?: InputVariant;             // 默认 'form'
  size?:    InputSize;                // 默认 'md'

  leadingIcon?:  ReactNode;           // 搜索 / 表单前置
  trailingIcon?: ReactNode;           // 密码 toggle / clear

  /** 仅 composer：发送按钮，受控 boolean 切换 disabled → enabled（accent） */
  sendAffordance?: boolean;

  /** 错误态：stretch ring + signal-error + 错误文案 slot */
  error?:  string | null;
  /** 提示态：仅提示色，不阻碍 */
  hint?:   string | null;

  /** shadcn asChild 兼容 */
  asChild?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  /* 实现节略 */
});
Input.displayName = 'Nook.Input';
```



> ⚠️ `variant='composer'` 时**自动**切换为 `<textarea>`，其余变体仍是 `<input>`。

---

## 2. variant 形态表

| variant | 高度 | 背景 | 描边 | 圆角 | 阴影 |
|---|---|---|---|---|---|
| `form` | sm/md/lg (32/40/44) | `var(--color-canvas-default)` | `1px var(--color-hairline-default)` | `var(--radius-md)` = 8 | 无 |
| `search` | md (40) | 同 form | 同 form | 同 form | 无 |
| `composer` | min 44, max 144（自长高） | `var(--color-surface-2)` | `1px var(--color-hairline-default)` → focus `1px var(--color-accent-soft-ring)` | `var(--radius-xl)` = 16 | `var(--shadow-2)` |
| `password` | sm/md/lg | 同 form | 同 form | 同 form | 无 |

### 2.1 focus 行为（统一）



```
focus → 描边色 transition 到 var(--color-hairline-strong)
     → 背景 transition 到 var(--color-surface-1)
     → 持续 var(--transition-hover)  (120 ms ease-out)
focus-visible:
     → outline: 2px solid var(--color-accent-soft-ring)
     → outline-offset: 3px
```



### 2.2 error 行为



```
error 非空时：
- 描边色 → var(--color-signal-error)
- 提示文案（caption 字号，error 色）显示在 field 下方
- focus-visible 仍维持（a11y 需要）
```



### 2.3 composer 行为（特殊）

- 渲染 `<textarea>`，padding `var(--space-sm)` / `var(--space-md)` = 12/16
- 自带 `rows=1`，输入长文本时自动长高到 `min(144px, 内容高度)`；超过则内部 scroll
- 字体：var(`--font-size-body-lg`) / 400 / 1.55
- placeholder: `var(--color-ink-subtle)` "说点什么…"
- ENTER 直接触发 `onSend`；shift+enter 换行
- 无 native autosize 库依赖（手写 resize observer 即可）
- 输入时若 `sendAffordance` 启用：右侧尾随 `<Composer.Send>` slot

---

## 3. size × variant × 触达合规

| size \ variant | form / search / password | composer |
|---|---|---|
| `sm` = 32 px | 内嵌（列表内） | 不允许 |
| `md` = 40 px | 表单默认 | **不允许**（composer 强制 ≥ 44） |
| `lg` = 44 px | **触达合规**（移动端 form 入口） | **强制**：composer 默认 |

> composer 选 sm/md 时 TS 报错（lint 兜底运行不 throw）。composer.size 默认 lg。

---

## 4. `Composer` → 复合组件



```ts
// Composer 是复合组件。导出模式：单文件 + 子组件 dot export。

export const Composer = Object.assign(ComposerRoot, {
  Field:    ComposerField,      // 实际包一个 Input variant='composer'
  Attach:   ComposerAttach,    // 文件 attach trigger
  Send:     ComposerSend,      // accent Button
  Reply:    ComposerReply,     // 引用预览卡（surface-2 圆角 12 px）
  Typing:   ComposerTypingDot, // 三点 降速动画（颜色 --ink-muted，半径 4 px）
});

Composer.Field.displayName   = 'Nook.Composer.Field';
Composer.Attach.displayName  = 'Nook.Composer.Attach';
Composer.Send.displayName    = 'Nook.Composer.Send';
Composer.Reply.displayName   = 'Nook.Composer.Reply';
Composer.Typing.displayName  = 'Nook.Composer.Typing';

export interface ComposerProps {
  children: ReactNode;                           // 任意顺序组合 Field/Attach/Send/Reply
  className?: string;
}

export interface ComposerReplyProps {
  to: { senderName: string; preview: string };    // （参考 Nook-PRODUCT M4）
  onCancel?: () => void;                          // 关闭按钮 onClick
}
```



> 复合组件**不通过 Context** 在 Field 与 Send 之间通信——Send 启用 disabled 由 `draft.length > 0` 显式传入，避免接口表面认知负担。

### 4.1 Composer 默认几何

- 距底 `var(--space-xl)` = 24 px；左右各 `var(--space-xl)` = 24 px（桌面）
- 移动端（< 768 px）：**贴底**，仅保留 `var(--space-xs)` = 8 px 边距
- z-index: `var(--z-raised)` = 1（仅 sidebar 在它上层）
- 进入动画：从下 translateY(8px → 0)，fade opacity 0 → 1，时长 `var(--transition-modal)` = 180 ms ease-out

### 4.2 Composer.Send 细节

- **不**直接是 Button，`Send` 内部固定 `intent='accent'` + `shape='icon'` + `size='md'` + `iconOnly` 占 44 × 44 px
- disabled：bg `var(--color-surface-2)`，text `var(--color-ink-subtle)`
- enabled：bg `var(--color-accent-default)`，text `var(--color-accent-on)`，hover `var(--color-accent-hover)`，press `var(--color-accent-press)`
- aria-label: "发送消息"
- typing 状态在三点点亮时不显示 Send（极小 gutter；除非 draft 非空才显示）；draft 非空 → typing 隐藏，Send 显示

### 4.2.1 父子接线约定（Field ⇄ Send）

`Composer.Field` 与 `Composer.Send` 不通过 Context 通信（README §2 已声明 v1.0 不用 Context）。父组件必须自行持有 draft 状态：



```tsx
import { useState } from 'react';
import { Composer } from '@/components/Composer';

function ChatComposer({ onSendMessage, trackTyping }) {
  const [draft, setDraft] = useState('');

  return (
    <Composer>
      <Composer.Field
        value={draft}
        onChange={(v) => { setDraft(v); trackTyping(v.length > 0); }}
        onSend={(text) => { onSendMessage(text); setDraft(''); }}
      />
      <Composer.Send
        enabled={draft.trim().length > 0}
        onClick={() => {
          if (!draft.trim()) return;
          onSendMessage(draft);
          setDraft('');
        }}
      />
    </Composer>
  );
}
```



> ⚠️ Field 与 Send 各自持 `onSend` / `onClick`：ENTER 在 Field 触发 onSend；click 在 Send 触发 onClick。**两者都应在触发后清 draft**——Composer.Field 是受控组件（外部 state 即真理），若不清空会出现 draft 与 Field 内部 textarea 值分离的 race。

### 4.3 Composer.Reply 细节

引用卡：

- 背景 `var(--color-surface-2)`，圆角 `var(--radius-lg)` = 12 px
- 左边一根 2 px `var(--color-accent-default)` 指示线
- 内容：sender 名（meta 字号，ink-muted）+ 单行 truncate 被引用消息（body-lg 字号，ink-default）
- 右侧 Cancel icon button（circle radius）：hover bg `var(--color-surface-3)`
- 距 composer 上方 `var(--space-xs)` 紧贴

### 4.4 Composer.Typing 细节

- 三点圆 `r=4px`，颜色 `var(--color-chat-typing-indicator)` = `--color-ink-muted`
- 动画：每点 400 ms 周期，120 ms 错落（cycle 1200 ms 整体）
- 位置：Composer 顶部空状态（draft 为空且对方正在打字）；和 Reply 不同时出现（后者优先级高）

---

## 5. 受控 / 状态机

Input v1.0 **只支持受控**——外部必须有 `value` + `onChange`。不做无受控实现以避免表单 reset 与多人协作时的 race condition。



```
状态          → 渲染
default      →  描边 hairline,  bg canvas
focus        →  描边 strong,    bg surface-1,  shadow-1
focus + error→  描边 error,      bg canvas
disabled     →  bg surface-2,  text subtle,  opacity 0.5
loading      →  spinner 在 trailingIcon 位置
```



---

## 6. 可达性（a11y）

| 项 | 规则 |
|---|---|
| label 关联 | 必须有 `<label>` 关联（form / search / password）；composer 因为有 placeholder + aria-label="消息输入框"，允许无 label |
| aria-busy | loading 时 |
| aria-invalid | error 非空时 |
| 键盘 | Enter 在 form variant 触发 `onSubmit`；Enter 在 composer 触发 `onSend`；shift+enter 永远换行 |
| 触达 | composer/size=lg 满足 44 px；所有 form 均 ≥ sm=32 px 满足触达 |
| Tab 焦点 | composer textarea 在 typing 三点动画中仍可 focus |

> ⚠️ 注意：手机端 PWA 键盘弹起时 Composer **必须**保持 focus，**不能**因 INS 状态变化 scroll 走。

---

## 7. 反模式

- ❌ 不写 `variant='inline-search-with-icon'`（'search' 已经包含 leading icon slot）
- ❌ composer 不允许 `size='sm'` 或 `'md'`
- ❌ 不允许把 Composer 子组件在 Composer 之外单独使用（type-level import 时 runtime warning；不 throw）
- ❌ Composer 不暴露内部的 `Input` 引用（forwardRef 只到自身根 div）
- ❌ password 的 "show/hide" toggle 必须是 trailingIcon slot，不内置状态机（v1.0 简化）

---

## 8. Token 反查表



```ts
const inputTokens = {
  form:      { bg: 'var(--color-canvas-default)', border: 'var(--color-hairline-default)', focusBorder: 'var(--color-hairline-strong)' },
  search:    /* 同 form */,
  password:  /* 同 form */,
  composer:  {
    bg: 'var(--color-surface-2)',
    border: 'var(--color-hairline-default)',
    focusBorder: 'var(--color-accent-soft-ring)',
    shadow: 'var(--shadow-2)',
    radius: 'var(--radius-xl)',
    font: 'var(--font-size-body-lg)',
    line: 'var(--leading-chill)',
    transition: 'var(--transition-modal)',
  },
  state: {
    error:   'var(--color-signal-error)',
    errorSoft: 'var(--color-signal-error-soft)',
    focusRing: 'var(--color-accent-soft-ring)',
  },
};
```



---

## 9. 测试清单

- [ ] controlled value 正确显示
- [ ] form 输入回车触发 onSubmit（如果表单内有）
- [ ] composer 输入回车触发 onSend，shift+enter 换行
- [ ] composer 自长高至 144 px 后变 scroll-internal
- [ ] error prop 显示 + aria-invalid 设置
- [ ] focus 时 border transition 120 ms
- [ ] mobile break (< 768 px) 五 Composer 贴底
- [ ] prefers-reduced-motion 时 composer 入场改为 0 ms
- [ ] Send 在 draft 为空时 disabled、aria-disabled
- [ ] 密码 input 的 trailingIcon slot 渲染正确

---

— END —
