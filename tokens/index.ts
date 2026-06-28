/**
 * Nook · Design Tokens v1.0
 * Single source of truth for all design values.
 * Business code / components MUST reference this file only.
 */

/* ---------- Color Palette ---------- */
const palette = {
  canvasDefault:  '#0F1115',
  canvasDeep:     '#08090C',
  canvasSoft:     '#14171D',
  surface1: '#181B22',
  surface2: '#20242C',
  surface3: '#262B35',
  surface4: '#2E3440',
  inkDefault: '#F2F4F8',
  inkMuted:   '#B7BDC8',
  inkSubtle:  '#7A8290',
  inkFaint:   '#525864',
  accentDefault:  '#7B85F0',
  accentHover:    '#919BFF',
  accentPress:    '#5E68D2',
  accentSoftBg:   'rgba(123, 133, 240, 0.16)',
  accentSoftRing: 'rgba(123, 133, 240, 0.35)',
  accentOn:       '#FFFFFF',
  hairlineDefault: 'rgba(255, 255, 255, 0.06)',
  hairlineSoft:    'rgba(255, 255, 255, 0.10)',
  hairlineStrong:  'rgba(255, 255, 255, 0.16)',
  success:      '#34D399',
  successSoft:  'rgba(52, 211, 153, 0.18)',
  warning:      '#F0B45A',
  warningSoft:  'rgba(240, 180, 90, 0.18)',
  error:        '#F06F7B',
  errorSoft:    'rgba(240, 111, 123, 0.18)',
  info:         '#7AB8F0',
  infoSoft:     'rgba(122, 184, 240, 0.18)',
  overlayDrawerBack: 'rgba(0, 0, 0, 0.50)',
} as const;

/* ---------- Colors (Semantic) ---------- */
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
    placeholder: palette.inkSubtle,
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
    selfBg:          palette.accentDefault,
    selfText:        palette.accentOn,
    friendBg:        palette.surface1,
    friendText:      palette.inkDefault,
    statusOnline:    palette.accentDefault,
    statusOffline:   palette.inkFaint,
    typingIndicator: palette.inkMuted,
    codeBg:          palette.surface3,
    codeFg:          palette.inkDefault,
  },
  overlay: {
    drawerBack: palette.overlayDrawerBack,
  },
} as const;

/* ---------- Typography ---------- */
export const typography = {
  family: {
    sans: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
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
  weight: { regular: 400, medium: 500, semibold: 600 } as const,
  leading: {
    tight: 1.15, compact: 1.25, base: 1.40,
    relaxed: 1.50, chill: 1.55, loose: 1.60,
  } as const,
  tracking: {
    display: -0.8, h1: -0.5, h2: -0.3, h3: -0.2, normal: 0, button: 0.2,
  },
} as const;

/* ---------- Spacing (4px base) ---------- */
export const spacing = {
  '2xs': 4, xs: 8, sm: 12, md: 16, lg: 20,
  xl: 24, '2xl': 32, '3xl': 40, '4xl': 64, section: 96,
} as const;

/* ---------- Radius ---------- */
export const radius = {
  xs: 4, sm: 6, md: 8, lg: 12, xl: 16, pill: 9999, circle: '50%',
} as const;

/* ---------- Shadows ---------- */
export const shadow = {
  1: '0 1px 2px rgba(0, 0, 0, 0.20)',
  2: '0 4px 12px rgba(0, 0, 0, 0.32)',
  3: '0 8px 24px rgba(0, 0, 0, 0.50)',
  4: '0 16px 48px rgba(0, 0, 0, 0.60)',
} as const;

/* ---------- Animation ---------- */
export const animation = {
  'ambient-pulse': 'ambient-pulse var(--duration-ambient) ease-in-out infinite',
} as const;

/* ---------- Master Export ---------- */
const tokens = { colors, typography, spacing, radius, shadow, animation };
export default tokens;
