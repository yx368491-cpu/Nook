/**
 * ============================================================
 * Nook · Tokens Barrel
 * ----------------------------------------------------------
 * 唯一导入入口。业务代码永远只在这一行 import tokens。
 *
 * 用法：
 *   import { tokens } from '@/tokens';                 // 集合
 *   import { colors, typography, spacing } from '@/tokens';  // 命名空间
 *   import type { Tokens, Colors } from '@/tokens';    // 类型
 *   import tokens from '@/tokens';                      // 默认导出 = tokens
 *
 * 与上游的关系：
 *   本文件**只做 re-export**，不重复字面值。
 *   所有字面值在 `prompt/Nook-DESIGN-TOKENS.ts` 一处维护。
 *   修改设计 token → 改那个文件；本文件改路径或加 alias 就够了。
 * ============================================================
 */

export {
  palette,
  colors,
  typography,
  spacing,
  radius,
  chatBubble,
  shadow,
  border,
  motion,
  opacity,
  zIndex,
  breakpoint,
  size,
  layout,
  icon,
} from '../Nook-DESIGN-TOKENS';

export type {
  HexColor,
  RGBAColor,
  Color,
  Px,
  Percent,
  FontFamily,
  BoxShadow,
  Bezier,
  Transition,
  Palette,
  Colors,
  Typography,
  Spacing,
  Radius,
  ChatBubble,
  Shadow,
  Border,
  Motion,
  Opacity,
  ZIndex,
  Breakpoint,
  Size,
  Layout,
  Icon,
  Tokens,
} from '../Nook-DESIGN-TOKENS';

// ----------------------------------------------------------------
// Aggregate `tokens` object  ← 满足 `import { tokens } from '@/tokens'`
// ----------------------------------------------------------------
import {
  palette,
  colors,
  typography,
  spacing,
  radius,
  chatBubble,
  shadow,
  border,
  motion,
  opacity,
  zIndex,
  breakpoint,
  size,
  layout,
  icon,
} from '../Nook-DESIGN-TOKENS';

export const tokens = {
  palette,
  colors,
  typography,
  spacing,
  radius,
  chatBubble,
  shadow,
  border,
  motion,
  opacity,
  zIndex,
  breakpoint,
  size,
  layout,
  icon,
} as const;

export default tokens;
