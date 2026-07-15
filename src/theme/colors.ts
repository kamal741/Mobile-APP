/**
 * @file theme/colors.ts
 * @description Semantic color tokens extracted and standardized from existing stylesheets.
 *              Structured for light theme with dark theme readiness (just swap `light` values).
 *
 * Usage:
 *   import { colors } from '@/theme';
 *   color: colors.text.primary
 */

// ─── Raw Palette (immutable base values — do not use directly in components) ──
const palette = {
  // Blues
  blue900: '#1e3a8a',
  blue800: '#1e40af',  // primary brand blue
  blue600: '#2563eb',  // mid blue (links, accents)
  blue100: '#dbeafe',  // light blue background tint
  blue50:  '#eff6ff',  // hover / selected tint

  // Greens
  green700: '#15803d',
  green600: '#16a34a',  // success / approve
  green100: '#dcfce7',  // success background tint
  green50:  '#f0fdf4',  // success surface
  green200: '#bbf7d0',  // success border

  // Ambers
  amber400: '#f59e0b',  // warning / pending accent
  amber100: '#fef3c7',  // warning background tint

  // Reds
  red500: '#ef4444',   // error / reject
  red100: '#fee2e2',   // error background tint

  // Purples
  purple600: '#9333ea',  // purple accent
  purple50:  '#faf5ff',  // purple surface
  purple200: '#e9d5ff',  // purple border

  // Yellows (notes)
  yellow200: '#fef9c3',
  yellow300: '#fde047',
  yellow900: '#713f12',

  // Neutrals
  white:    '#ffffff',
  slate50:  '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',

  // Misc
  gray700: '#374151',  // body text (between slate700 and slate800)
  gray50:  '#fafafa',  // very subtle muted surface

  // Overlay
  black40: 'rgba(0,0,0,0.4)',
  black10: 'rgba(0,0,0,0.1)',
  black05: 'rgba(0,0,0,0.05)',
} as const;

// ─── Semantic Color Tokens ─────────────────────────────────────────────────────
export const colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  primary: {
    default: palette.blue800,   // main CTAs, active states
    mid:     palette.blue600,   // links, secondary CTAs
    light:   palette.blue100,   // chip / badge backgrounds
    hover:   palette.blue50,    // selected / hover surface
  },

  // ── Feedback / Status ──────────────────────────────────────────────────────
  success: {
    default: palette.green600,
    light:   palette.green100,
    surface: palette.green50,   // success page/card background
    border:  palette.green200,  // success border tint
  },
  warning: {
    default: palette.amber400,
    light:   palette.amber100,
  },
  error: {
    default: palette.red500,
    light:   palette.red100,
  },
  info: {
    default: palette.blue600,
    light:   palette.blue100,
  },

  // ── Accent ─────────────────────────────────────────────────────────────────
  purple: {
    default: palette.purple600,
    surface: palette.purple50,
    border:  palette.purple200,
  },

  // ── Notes / Callout ────────────────────────────────────────────────────────
  note: {
    bg:     palette.yellow200,
    border: palette.yellow300,
    text:   palette.yellow900,
  },

  // ── Backgrounds ────────────────────────────────────────────────────────────
  background: {
    screen:    palette.slate50,   // top-level screen background (#f8fafc)
    surface:   palette.white,     // cards, panels, modals
    subtle:    palette.slate100,  // secondary surface / input fill (#f1f5f9)
    muted:     palette.gray50,    // very subtle muted surface (#fafafa)
    selected:  palette.blue50,    // selected / active row tint (#eff6ff)
    badge:     palette.slate100,  // badge / chip backgrounds
    cancelBtn: palette.slate100,  // cancel button fill
    overlay:   palette.black40,   // modal backdrop
  },

  // ── Text ───────────────────────────────────────────────────────────────────
  text: {
    primary:   palette.slate800,  // headings, body (#1e293b)
    secondary: palette.slate500,  // sub-labels, meta (#64748b)
    muted:     palette.slate400,  // placeholders, empty states (#94a3b8)
    dark:      palette.slate700,  // slightly emphasized secondary (#334155)
    body:      palette.gray700,   // paragraph body text (#374151)
    badge:     palette.slate600,  // badge label text (#475569)
    disabled:  palette.slate400,  // disabled inputs / labels
    inverse:   palette.white,     // text on dark backgrounds
  },

  // ── Borders & Dividers ─────────────────────────────────────────────────────
  border: {
    default: palette.slate200,  // card / input borders (#e2e8f0)
    light:   palette.slate100,  // subtle separators (#f1f5f9)
    mid:     palette.slate300,  // dividers between sections
    active:  palette.blue800,   // focused / selected border (#1e40af)
  },

  // ── Transparent Overlays ───────────────────────────────────────────────────
  overlay: {
    dark:   palette.black40,
    medium: palette.black10,
    subtle: palette.black05,
  },

  // ── Expose raw palette for one-off needs (edge cases only) ─────────────────
  palette,
} as const;

// Type export for autocomplete in consuming files
export type Colors = typeof colors;
