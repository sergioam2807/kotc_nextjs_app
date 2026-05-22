/**
 * ============================================================
 * KOTC Design System – Pro League Asphalt
 * ============================================================
 *
 * Fuente de verdad para todos los design tokens del proyecto.
 *
 * Las CSS variables en `app/globals.css` se deben mantener
 * sincronizadas con los valores de este archivo.
 *
 * Para cambiar la paleta:
 *   1. Edita los valores aquí (darkTokens / lightTokens)
 *   2. Actualiza las mismas variables en app/globals.css
 *
 * Temas:
 *   • dark  (default) – Pro League Asphalt
 *   • light            – Pro League Asphalt Light
 *
 * Uso en runtime: añade data-theme="light" en <html> para
 * activar el tema claro sin recompilar.
 * ============================================================
 */

// ── Types ──────────────────────────────────────────────────

export type ThemeMode = 'dark' | 'light';

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

// ── Dark Theme — Pro League Asphalt ───────────────────────

export const darkTokens: DesignTokens = {
  name: 'Pro League Asphalt',
  mode: 'dark',

  colors: {
    // Surfaces (azul navy profundo)
    surface:                   '#051424',
    surfaceDim:                '#051424',
    surfaceBright:             '#2c3a4c',
    surfaceContainerLowest:    '#010f1f',
    surfaceContainerLow:       '#0d1c2d',
    surfaceContainer:          '#122131',
    surfaceContainerHigh:      '#1c2b3c',
    surfaceContainerHighest:   '#273647',
    surfaceVariant:            '#273647',
    surfaceTint:               '#b6c4ff',

    // Text
    onSurface:                 '#d4e4fa',
    onSurfaceVariant:          '#c5c5d3',
    inverseSurface:            '#d4e4fa',
    inverseOnSurface:          '#233143',

    // Primary — Azul Eléctrico
    primary:                   '#b6c4ff',
    onPrimary:                 '#05297a',
    primaryContainer:          '#1e3a8a',
    onPrimaryContainer:        '#90a8ff',
    inversePrimary:            '#4059aa',

    // Secondary — MD3 Yellow
    secondary:                 '#ffe083',
    onSecondary:               '#3c2f00',
    secondaryContainer:        '#eec200',
    onSecondaryContainer:      '#645000',

    // Accent — Amarillo CTA (= secondary en dark)
    accent:                    '#ffe083',
    onAccent:                  '#3c2f00',
    accentDim:                 '#ffe08326',   // ~15% opacidad

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
    outline:                   '#8f909d',
    outlineVariant:            '#444651',

    // Game status
    statusLibre:               '#4ade80',
    statusRival:               '#f87171',
    statusKing:                '#ffe083',
    statusPurple:              '#a78bfa',
  },

  typography: {
    fontFamily: "'Lexend', system-ui, sans-serif",
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
    lg:   '0.5rem',     // 8px
    xl:   '0.75rem',    // 12px
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

// ── Light Theme — Pro League Asphalt Light ────────────────

export const lightTokens: DesignTokens = {
  name: 'Pro League Asphalt Light',
  mode: 'light',

  colors: {
    // Surfaces (blanco y gris frío)
    surface:                   '#faf8ff',
    surfaceDim:                '#d2d9f4',
    surfaceBright:             '#faf8ff',
    surfaceContainerLowest:    '#ffffff',
    surfaceContainerLow:       '#f2f3ff',
    surfaceContainer:          '#eaedff',
    surfaceContainerHigh:      '#e2e7ff',
    surfaceContainerHighest:   '#dae2fd',
    surfaceVariant:            '#dae2fd',
    surfaceTint:               '#4059aa',

    // Text
    onSurface:                 '#131b2e',
    onSurfaceVariant:          '#444651',
    inverseSurface:            '#283044',
    inverseOnSurface:          '#eef0ff',

    // Primary — Deep Pro Blue
    primary:                   '#00236f',
    onPrimary:                 '#ffffff',
    primaryContainer:          '#1e3a8a',
    onPrimaryContainer:        '#90a8ff',
    inversePrimary:            '#b6c4ff',

    // Secondary — MD3 Yellow
    secondary:                 '#735c00',
    onSecondary:               '#ffffff',
    secondaryContainer:        '#fed01b',
    onSecondaryContainer:      '#6f5900',

    // Accent — Amarillo brillante CTA
    accent:                    '#fed01b',
    onAccent:                  '#00236f',
    accentDim:                 '#fed01b26',  // ~15% opacidad

    // Tertiary
    tertiary:                  '#1b2b3f',
    onTertiary:                '#ffffff',
    tertiaryContainer:         '#314156',
    onTertiaryContainer:       '#9dadc6',

    // Error
    error:                     '#ba1a1a',
    onError:                   '#ffffff',
    errorContainer:            '#ffdad6',
    onErrorContainer:          '#93000a',

    // Outline
    outline:                   '#757682',
    outlineVariant:            '#c5c5d3',

    // Game status
    statusLibre:               '#16a34a',
    statusRival:               '#dc2626',
    statusKing:                '#fed01b',
    statusPurple:              '#7c3aed',
  },

  typography: {
    fontFamily: "'Lexend', system-ui, sans-serif",
    displayXl: {
      fontSize: '64px', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-0.02em',
    },
    displayLg: {
      fontSize: '48px', fontWeight: '800', lineHeight: '56px', letterSpacing: '-0.02em',
    },
    headlineLg: {
      fontSize: '32px', fontWeight: '700', lineHeight: '40px', letterSpacing: '-0.01em',
    },
    headlineLgMobile: {
      fontSize: '28px', fontWeight: '700', lineHeight: '36px',
    },
    headlineMd: {
      fontSize: '24px', fontWeight: '600', lineHeight: '32px',
    },
    bodyLg: {
      fontSize: '18px', fontWeight: '400', lineHeight: '28px',
    },
    bodyMd: {
      fontSize: '16px', fontWeight: '400', lineHeight: '24px',
    },
    labelBold: {
      fontSize: '14px', fontWeight: '600', lineHeight: '20px', letterSpacing: '0.05em',
    },
    statsNumber: {
      fontSize: '24px', fontWeight: '800', lineHeight: '24px',
    },
  },

  radius: {
    sm:   '0.125rem',   // 2px
    base: '0.25rem',    // 4px
    md:   '0.375rem',   // 6px
    lg:   '0.5rem',     // 8px
    xl:   '0.75rem',    // 12px
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
    margin:       '32px',
    containerMax: '1200px',
  },
};

// ── Exports ────────────────────────────────────────────────

/**
 * Tokens activos. Cambiar a `lightTokens` para exportar el
 * tema claro como predeterminado de TS (no afecta el CSS).
 *
 * El tema visual en runtime se controla con data-theme="light"
 * en el elemento <html>.
 */
export const tokens: DesignTokens = darkTokens;

export default tokens;
