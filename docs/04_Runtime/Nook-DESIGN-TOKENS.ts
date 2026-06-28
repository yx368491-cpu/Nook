/**
 * ============================================================
 * Nook · Design Tokens v1.0 (TypeScript)
 * ----------------------------------------------------------
 * 唯一可信的设计数据源（Single Source of Truth）。
 * 业务代码 / UI 组件 / 动画 / 布局 只能引用本文件导出的对象。
 * 字面值（颜色 / 阴影 / 圆角 / 间距 等）禁止写死在业务代码里。
 *
 * 数据来源：../01_Product/Nook-DESIGN.md（不可改）。本文件不重新设计视觉。
 * 配套文件：Nook-DESIGN-TOKENS.md / .css / .json（4 个文件严格等价）。
 * ============================================================
 */

export type HexColor = `#${string}`;
export type RGBAColor = `rgba(${number}, ${number}, ${number}, ${number})`;
export type Color = HexColor | RGBAColor;
export type Px = `${number}px`;
export type Percent = `${number}%`;
export type FontFamily = string;
export type BoxShadow = string;
export type Bezier = `cubic-bezier(${string})`;
export type Transition = string;


/* ----------------------------------------------------------
 * Color palette — all hex / rgba literal values declared once
 * Other color objects reference these.
 * ---------------------------------------------------------- */
export const palette = {
  /* canvas */
  canvasDefault:  '#0F1115',
  canvasDeep:     '#08090C',
  canvasSoft:     '#14171D',
  /* surface */
  surface1: '#181B22',
  surface2: '#20242C',
  surface3: '#262B35',
  surface4: '#2E3440',
  /* ink */
  inkDefault: '#F2F4F8',
  inkMuted:   '#B7BDC8',
  inkSubtle:  '#7A8290',
  inkFaint:   '#525864',
  /* accent */
  accentDefault:  '#7B85F0',
  accentHover:    '#919BFF',
  accentPress:    '#5E68D2',
  accentSoftBg:   'rgba(123, 133, 240, 0.16)',
  accentSoftRing: 'rgba(123, 133, 240, 0.35)',
  accentOn:       '#FFFFFF',
  /* hairline */
  hairlineDefault: 'rgba(255, 255, 255, 0.06)',
  hairlineSoft:    'rgba(255, 255, 255, 0.10)',
  hairlineStrong:  'rgba(255, 255, 255, 0.16)',
  /* signal */
  success:      '#34D399',
  successSoft:  'rgba(52, 211, 153, 0.18)',
  warning:      '#F0B45A',
  warningSoft:  'rgba(240, 180, 90, 0.18)',
  error:        '#F06F7B',
  errorSoft:    'rgba(240, 111, 123, 0.18)',
  info:         '#7AB8F0',
  infoSoft:     'rgba(122, 184, 240, 0.18)',
  /* overlay */
  overlayDrawerBack: 'rgba(0, 0, 0, 0.50)',
} as const;


/* ----------------------------------------------------------
 * Colors — semantic API (business uses these)
 * Each entry either:
 *   - references palette.* (single source)
 *   - or repeats for chat-specific semantics with explicit comment
 * ---------------------------------------------------------- */
export const colors = {
  canvas: {
    default: palette.canvasDefault,
    deep:    palette.canvasDeep,
    soft:    palette.canvasSoft,
  },
  surface: {
    1: palette.surface1,
    2: palette.surface2,
    3: palette.surface3,
    4: palette.surface4,
  },
  ink: {
    default:     palette.inkDefault,
    muted:       palette.inkMuted,
    subtle:      palette.inkSubtle,
    faint:       palette.inkFaint,
    placeholder: palette.inkSubtle,  // alias of subtle
  },
  accent: {
    default:  palette.accentDefault,
    hover:    palette.accentHover,
    press:    palette.accentPress,
    softBg:   palette.accentSoftBg,
    softRing: palette.accentSoftRing,
    on:       palette.accentOn,
  },
  hairline: {
    default: palette.hairlineDefault,
    soft:    palette.hairlineSoft,
    strong:  palette.hairlineStrong,
  },
  signal: {
    success:      palette.success,
    successSoft:  palette.successSoft,
    warning:      palette.warning,
    warningSoft:  palette.warningSoft,
    error:        palette.error,
    errorSoft:    palette.errorSoft,
    info:         palette.info,
    infoSoft:     palette.infoSoft,
  },
  chat: {
    selfBg:          palette.accentDefault,  // alias of accent.default
    selfText:        palette.accentOn,        // alias of accent.on
    friendBg:        palette.surface1,        // alias of surface.1
    friendText:      palette.inkDefault,      // alias of ink.default
    statusOnline:    palette.accentDefault,   // alias of accent.default
    statusOffline:   palette.inkFaint,        // alias of ink.faint
    typingIndicator: palette.inkMuted,        // alias of ink.muted
    codeBg:          palette.surface3,        // alias of surface.3
    codeFg:          palette.inkDefault,      // alias of ink.default
  },
  overlay: {
    drawerBack: palette.overlayDrawerBack,
  },
} as const;


/* ----------------------------------------------------------
 * Typography — family, sizes, weights, leading, tracking,
 * and full preset compositions.
 * ---------------------------------------------------------- */
export const typography = {
  family: {
    sans: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  feature: {
    default: '"calt", "kern", "liga", "ss03"',  // ⭐ ss03 is the "tech" switch
    numeric: 'tabular-nums',
  },
  size: {
    display: 32,
    h1:      24,
    h2:      20,
    h3:      17,
    bodyLg:  16,
    body:    14,
    meta:    13,
    caption: 12,
    micro:   11,
  },
  weight: {
    regular:  400,
    medium:   500,
    semibold: 600,
  } as const,
  leading: {
    tight:   1.15,
    compact: 1.25,
    base:    1.40,
    relaxed: 1.50,
    chill:   1.55,
    loose:   1.60,
  } as const,
  tracking: {
    display: -0.8,
    h1:      -0.5,
    h2:      -0.3,
    h3:      -0.2,
    normal:  0,
    button:  0.2,
  },
  /* Composite presets for direct use in styles */
  preset: {
    display:     { size: 32, weight: 600, lineHeight: 1.15, letterSpacing: -0.8, family: 'sans' as const },
    h1:          { size: 24, weight: 600, lineHeight: 1.25, letterSpacing: -0.5, family: 'sans' as const },
    h2:          { size: 20, weight: 600, lineHeight: 1.30, letterSpacing: -0.3, family: 'sans' as const },
    h3:          { size: 17, weight: 600, lineHeight: 1.35, letterSpacing: -0.2, family: 'sans' as const },
    bodyLg:      { size: 16, weight: 400, lineHeight: 1.55, letterSpacing:  0,   family: 'sans' as const },
    body:        { size: 14, weight: 400, lineHeight: 1.50, letterSpacing:  0,   family: 'sans' as const },
    meta:        { size: 13, weight: 500, lineHeight: 1.40, letterSpacing:  0,   family: 'sans' as const },
    caption:     { size: 12, weight: 500, lineHeight: 1.40, letterSpacing:  0,   family: 'sans' as const },
    micro:       { size: 11, weight: 600, lineHeight: 1.30, letterSpacing:  0,   family: 'sans' as const },
    button:      { size: 14, weight: 500, lineHeight: 1.00, letterSpacing:  0.2, family: 'sans' as const },
    code:        { size: 14, weight: 400, lineHeight: 1.60, letterSpacing:  0,   family: 'mono' as const },
    chatMessage: { size: 16, weight: 400, lineHeight: 1.55, letterSpacing:  0,   family: 'sans' as const },
  },
} as const;


/* ----------------------------------------------------------
 * Spacing — 4px base, 10 阶
 * ---------------------------------------------------------- */
export const spacing = {
  '2xs':    4,
  xs:       8,
  sm:      12,
  md:      16,
  lg:      20,
  xl:      24,
  '2xl':   32,
  '3xl':   40,
  '4xl':   64,
  section: 96,
} as const;


/* ----------------------------------------------------------
 * Radius
 * ---------------------------------------------------------- */
export const radius = {
  xs:     4,
  sm:     6,
  md:     8,
  lg:    12,   /* 圆角主力 */
  xl:    16,
  pill:  9999,
  circle: '50%',
} as const;


/* ----------------------------------------------------------
 * Chat bubble — asymmetric "airplane-wing" / "cat-tongue"
 * Format: [top-left, top-right, bottom-right, bottom-left]
 *
 * The "soft corner" = 12 px (其余三角 16 px) sits at the *bottom* edge
 * facing the center of the conversation:
 *   - self   → BL (right-aligned bubble, soft corner faces inward-left)
 *   - friend → BR (left-aligned  bubble, soft corner faces inward-right)
 * Both align with ../01_Product/Nook-DESIGN.md §8.1.
 * ---------------------------------------------------------- */
export const chatBubble = {
  self:   [16, 16, 16, 12] as const,  // own msg: BL is the soft corner (faces center)
  friend: [16, 16, 12, 16] as const,  // incoming: BR is the soft corner (faces center)
} as const;


/* ----------------------------------------------------------
 * Shadow — heavy, dark-UI-tuned
 * ---------------------------------------------------------- */
export const shadow = {
  1: '0 1px 2px rgba(0, 0, 0, 0.20)',
  2: '0 4px 12px rgba(0, 0, 0, 0.32)',
  3: '0 8px 24px rgba(0, 0, 0, 0.50)',
  4: '0 16px 48px rgba(0, 0, 0, 0.60)',
} as const;


/* ----------------------------------------------------------
 * Border
 * ---------------------------------------------------------- */
export const border = {
  width: {
    hairline:  1,
    thick:     2,
    focusRing: 2,
  } as const,
  style: {
    default: 'solid' as const,
  },
  color: {
    default: palette.hairlineDefault,
    strong:  palette.hairlineStrong,
  },
} as const;


/* ----------------------------------------------------------
 * Motion — duration, easing, composite transitions
 * ---------------------------------------------------------- */
export const motion = {
  duration: {
    instant: 60,
    fast:    120,
    base:    180,
    slow:    280,
    ambient: 1200,
  } as const,
  easing: {
    default: 'cubic-bezier(0.20, 0.80, 0.40, 1.00)',  /* gentle out-expo */
    out:     'cubic-bezier(0.00, 0.00, 0.20, 1.00)',
    in:      'cubic-bezier(0.40, 0.00, 0.80, 0.20)',
    inOut:   'cubic-bezier(0.40, 0.00, 0.20, 1.00)',
  },
  transition: {
    hover:           '120ms cubic-bezier(0.00, 0.00, 0.20, 1.00)',
    click:           '120ms cubic-bezier(0.40, 0.00, 0.80, 0.20)',
    modal:           '180ms cubic-bezier(0.00, 0.00, 0.20, 1.00)',
    toast:           '180ms cubic-bezier(0.00, 0.00, 0.20, 1.00)',
    chatBubbleEnter: '180ms cubic-bezier(0.00, 0.00, 0.20, 1.00)',
    pageTransition:  '180ms cubic-bezier(0.00, 0.00, 0.20, 1.00)',
  },
} as const;


/* ----------------------------------------------------------
 * Opacity
 * ---------------------------------------------------------- */
export const opacity = {
  disabled: 0.5,
  overlay:  0.5,
  hover:    0.08,
  pressed:  0.16,
  loading:  0.6,
} as const;


/* ----------------------------------------------------------
 * Z-Index
 * ---------------------------------------------------------- */
export const zIndex = {
  base:     0,
  raised:   1,
  sticky:   10,
  dropdown: 100,
  overlay:  200,
  modal:    300,
  toast:    400,
  tooltip:  500,
  loading:  600,
} as const;


/* ----------------------------------------------------------
 * Breakpoint
 * ---------------------------------------------------------- */
export const breakpoint = {
  mobile: 480,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  largeDesktop: 1440,
} as const;


/* ----------------------------------------------------------
 * Size — components
 * ---------------------------------------------------------- */
export const size = {
  button: { sm: 32, md: 36, lg: 44 } as const,
  input:  { sm: 32, md: 40, lg: 44 } as const,
  avatar: { sm: 24, md: 32, lg: 48 } as const,
  icon:   { sm: 16, md: 20, lg: 24 } as const,
  navbarHeight:     56,
  sidebarWidth:     320,
  chatContentWidth: 960,
  imageMaxWidth:    480,
} as const;


/* ----------------------------------------------------------
 * Layout
 * ---------------------------------------------------------- */
export const layout = {
  pageMaxWidth:     1440,
  sidebarWidth:     size.sidebarWidth,
  chatWidth:        size.chatContentWidth,
  containerPadding: spacing.xl,
  gridColumns:      12,
  gridGap:          spacing.xl,
  sectionGap:       spacing.section,
} as const;


/* ----------------------------------------------------------
 * Icon
 * ---------------------------------------------------------- */
export const icon = {
  size:        { default: 20, sm: 16, lg: 24 } as const,
  strokeWidth: 1.5,
  radius:      2,
} as const;


/* ----------------------------------------------------------
 * Master export — preferred import for business code
 * ---------------------------------------------------------- */
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


/* ----------------------------------------------------------
 * Type exports — derived from token objects
 * ---------------------------------------------------------- */
export type Palette = typeof palette;
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type ChatBubble = typeof chatBubble;
export type Shadow = typeof shadow;
export type Border = typeof border;
export type Motion = typeof motion;
export type Opacity = typeof opacity;
export type ZIndex = typeof zIndex;
export type Breakpoint = typeof breakpoint;
export type Size = typeof size;
export type Layout = typeof layout;
export type Icon = typeof icon;
export type Tokens = typeof tokens;
