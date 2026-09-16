/**
 * ============================================================
 * KOTC Design System – Neon Court
 * ============================================================
 *
 * Fuente de verdad para todos los design tokens del proyecto.
 *
 * Las CSS variables en `app/globals.css` se deben mantener
 * sincronizadas con los valores de este archivo.
 *
 * Para cambiar la paleta edita los valores de `darkTokens` aquí
 * y luego actualiza las mismas variables en app/globals.css.
 *
 * Solo existe modo oscuro — no hay theme claro ni toggle.
 * ============================================================
 */

// ── Types ──────────────────────────────────────────────────

export type ThemeMode = 'dark';

export interface ColorTokens {
  // Surfaces — niveles de profundidad (lowest = más oscuro/claro)
  surface: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceVariant: string;
  surfaceTint: string;

  // Text / on-surface
  onSurface: string;
  onSurfaceVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;

  // Primary — Azul Eléctrico (dark) / Deep Pro Blue (light)
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  inversePrimary: string;

  // Secondary — Tokens MD3 del amarillo
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Accent — Atajo semántico para el Amarillo CTA de la marca
  accent: string;
  onAccent: string;
  accentDim: string;

  // Tertiary — Cool Gray
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Error
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Outline
  outline: string;
  outlineVariant: string;

  // Estado de canchas (game-specific)
  statusLibre: string;
  statusRival: string;
  statusKing: string;
  statusPurple: string;
}

export interface RadiusTokens {
  /** 2px  — badges, chips pequeños */
  sm: string;
  /** 4px  — botones, inputs (DEFAULT del diseño) */
  base: string;
  /** 6px  — elementos medianos */
  md: string;
  /** 8px  — cards */
  lg: string;
  /** 12px — contenedores grandes, modals */
  xl: string;
  /** pill */
  full: string;
}

export interface SpacingTokens {
  /** 4px */
  xs: string;
  /** 8px — unidad base del grid */
  base: string;
  /** 12px */
  sm: string;
  /** 24px — gutter de columna */
  md: string;
  /** 40px */
  lg: string;
  /** 64px */
  xl: string;
  /** 24px — gutter de columna */
  gutter: string;
  /** margen lateral (desktop: 48px, mobile: 16px) */
  margin: string;
  /** ancho máximo del contenedor */
  containerMax: string;
}

export interface TypographyScale {
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
}

export interface TypographyTokens {
  fontFamily: string;
  /** 64px / 800 — hero headlines */
  displayXl: TypographyScale;
  /** 48px / 800 — page titles */
  displayLg: TypographyScale;
  /** 40px / 700 — section titles (desktop) */
  headlineLg: TypographyScale;
  /** 32px / 700 — section titles (mobile) */
  headlineLgMobile: TypographyScale;
  /** 24px / 700 — card titles */
  headlineMd: TypographyScale;
  /** 18px / 400 — body text large */
  bodyLg: TypographyScale;
  /** 16px / 400 — body text default */
  bodyMd: TypographyScale;
  /** 14px / 600 — labels, uppercase */
  labelBold: TypographyScale;
  /** 24px / 800 — stats/números de marcador */
  statsNumber: TypographyScale;
}

export interface DesignTokens {
  name: string;
  mode: ThemeMode;
  colors: ColorTokens;
  typography: TypographyTokens;
  radius: RadiusTokens;
  spacing: SpacingTokens;
}

// ── Dark Theme — Neon Court (único tema) ──────────────────

export const darkTokens: DesignTokens = {
  name: 'Neon Court',
  mode: 'dark',

  colors: {
    // Surfaces (negro puro, profundidad por brillo)
    surface:                   '#0a0a0a',
    surfaceDim:                '#0a0a0a',
    surfaceBright:             '#242424',
    surfaceContainerLowest:    '#000000',
    surfaceContainerLow:       '#141414',
    surfaceContainer:          '#1c1c1c',
    surfaceContainerHigh:      '#242424',
    surfaceContainerHighest:   '#2c2c2c',
    surfaceVariant:            '#242424',
    surfaceTint:               '#b6c4ff',

    // Text
    onSurface:                 '#ffffff',
    onSurfaceVariant:          '#c0c2b8',
    inverseSurface:            '#ffffff',
    inverseOnSurface:          '#1c1c1c',

    // Primary — Azul Eléctrico
    primary:                   '#b6c4ff',
    onPrimary:                 '#05297a',
    primaryContainer:          '#1e3a8a',
    onPrimaryContainer:        '#90a8ff',
    inversePrimary:            '#4059aa',

    // Secondary — Verde lima (= accent)
    secondary:                 '#d5ff40',
    onSecondary:               '#0a0a0a',
    secondaryContainer:        '#9acd32',
    onSecondaryContainer:      '#0a0a0a',

    // Accent — Verde lima CTA de la marca
    accent:                    '#d5ff40',
    onAccent:                  '#0a0a0a',
    accentDim:                 '#d5ff4026',   // ~15% opacidad

    // Tertiary — Cool Gray
    tertiary:                  '#c6c6c7',
    onTertiary:                '#2f3131',
    tertiaryContainer:         '#3e4041',
    onTertiaryContainer:       '#abacac',

    // Error
    error:                     '#ffb4ab',
    onError:                   '#690005',
    errorContainer:            '#93000a',
    onErrorContainer:          '#ffdad6',

    // Outline
    outline:                   '#9c9c94',
    outlineVariant:            '#2a2a2a',

    // Game status
    statusLibre:               '#4ade80',
    statusRival:               '#f87171',
    statusKing:                '#d5ff40',
    statusPurple:              '#a78bfa',
  },

  typography: {
    fontFamily: "'Poppins', system-ui, sans-serif",
    displayXl: {
      fontSize: '64px', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-0.02em',
    },
    displayLg: {
      fontSize: '48px', fontWeight: '800', lineHeight: '1.15', letterSpacing: '-0.02em',
    },
    headlineLg: {
      fontSize: '40px', fontWeight: '700', lineHeight: '1.2', letterSpacing: '-0.01em',
    },
    headlineLgMobile: {
      fontSize: '32px', fontWeight: '700', lineHeight: '1.2',
    },
    headlineMd: {
      fontSize: '24px', fontWeight: '700', lineHeight: '1.3',
    },
    bodyLg: {
      fontSize: '18px', fontWeight: '400', lineHeight: '1.6',
    },
    bodyMd: {
      fontSize: '16px', fontWeight: '400', lineHeight: '1.5',
    },
    labelBold: {
      fontSize: '14px', fontWeight: '600', lineHeight: '1.4', letterSpacing: '0.05em',
    },
    statsNumber: {
      fontSize: '24px', fontWeight: '800', lineHeight: '1',
    },
  },

  radius: {
    sm:   '0.125rem',   // 2px
    base: '0.25rem',    // 4px
    md:   '0.375rem',   // 6px
    lg:   '0.625rem',   // 10px
    xl:   '1rem',       // 16px
    full: '9999px',
  },

  spacing: {
    xs:           '4px',
    base:         '8px',
    sm:           '12px',
    md:           '24px',
    lg:           '40px',
    xl:           '64px',
    gutter:       '24px',
    margin:       '48px',
    containerMax: '1280px',
  },
};

// ── Exports ────────────────────────────────────────────────

export const tokens: DesignTokens = darkTokens;

export default tokens;
