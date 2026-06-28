# tokens/

> Nook 的**唯一 token 入口**。业务代码只在这里 import，永远不要直接打开 `Nook-DESIGN-TOKENS.ts` / `.css` / `.json` / `.md` 找值。

---

## 用法（4 种合法 import 结构）



```ts
// 1. Aggregate —— 最常用
import { tokens } from '@/tokens';
const primary   = tokens.colors.accent.default;     // '#7B85F0'
const canvasBg  = tokens.colors.canvas.default;      // '#0F1115'
const sp        = tokens.spacing.md;                  // 16
const dur       = tokens.motion.duration.base;        // 180

// 2. 单 namespace
import { colors, typography, spacing, radius } from '@/tokens';
const bubbleRadius = radius.lg;                       // 12

// 3. 单 token
import { chatBubble } from '@/tokens';
const selfBubble = chatBubble.self;                   // [16, 16, 16, 12]

// 4. 仅类型（编译期）
import type { Tokens, Colors, Typography } from '@/tokens';
function setBg(c: Colors['canvas']['default']) { /* ... */ }
```



默认导出与 `tokens` 一致：



```ts
import tokens from '@/tokens';
tokens.colors.canvas.default; // 等价于上一行
```



---

## 文件清单

| 文件 | 角色 |
|---|---|
| `index.ts` | **唯一 barrel**。re-export 全部命名空间 + 类型 + `tokens` aggregate |

> 没有 `palette.ts`、`colors.ts` 等分裂文件 —— **不需要**。
> 拆文件会让 tree-shaking 复杂化，且**与设计纯粹度不匹配**（token 是**单一数据源**，不应被人在多个文件里断章取义）。

---

## 与上游的关系



```
prompt/Nook-DESIGN-TOKENS.ts   ←  字面值的唯一维护点（Single Source of Truth）
       │  re-export (this file)
       ▼
prompt/tokens/index.ts         ←  业务侧的入口
       │  import { tokens } from '@/tokens'
       ▼
   组件代码 / 业务代码
```



任何 token 字段调整：
1. 编辑 `prompt/Nook-DESIGN-TOKENS.ts`（palette 单源 → 语义层自动跟随）
2. 同步 `prompt/Nook-DESIGN-TOKENS.css` 与 `Nook-DESIGN-TOKENS.json`
3. **不需要**改 `tokens/index.ts`

> `tokens/index.ts` 只在 **加新 token 类别** 时才需要扩展（例如 v1.1 加 `chart` 命名空间）。

---

## 与未来 `tsconfig.json` path alias 的关系

`@/tokens` 是**预期 alias**（项目 scaffold 时配置）：



```jsonc
// tsconfig.json （待后续阶段设置）
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/tokens": ["prompt/tokens"],
      "@/tokens/*": ["prompt/tokens/*"]
    }
  }
}
```



> 本阶段**只产出** `prompt/tokens/` 目录 + barrel；不生成 `tsconfig.json`。
> 那是 build-system 阶段的事。

---

## 反模式

| ❌ 不应该 | ✅ 改用 |
|---|---|
| `import { colors } from '../../../prompt/Nook-DESIGN-TOKENS'` | `import { colors } from '@/tokens'` |
| `import tokens from '../Nook-DESIGN-TOKENS.ts'` | `import tokens from '@/tokens'` （或命名导入） |
| 在业务代码内重新 `export * from ...` | 一律在 `tokens/index.ts` 维护单一 barrel |
| 加 `tokens/acme-feature.ts` 子文件分散 token | 保持单一 barrel；改上游文件即可 |

---

## 与 CSS Variables 的关系

业务侧引用 token 有两种等价路径，按场景选择：



```ts
// TS / JS 代码中：直接用 tokens 对象（零开销）
import { colors } from '@/tokens';
const fg = colors.ink.default;            // '#F2F4F8'

// CSS / Tailwind class：必须 var(--*)
import '../Nook-DESIGN-TOKENS.css';
someButton.style.color = 'var(--color-ink-default)';
// 或在 .css 文件里：color: var(--color-ink-default);
```



两份**严格等价**，修改上游 → 两边自动跟随。

— END —
