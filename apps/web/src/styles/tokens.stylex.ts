import * as stylex from '@stylexjs/stylex';

export const colors = stylex.defineVars({
  bgOuter: 'var(--color-bg-outer)',
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surface2: 'var(--color-surface-2)',
  surfaceRaised: 'var(--color-surface-raised)',
  border: 'var(--color-border)',
  borderSoft: 'var(--color-border-soft)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textDeep: 'var(--color-text-deep)',
  fgOnAccent: 'var(--color-fg-on-accent)',
  accent: 'var(--color-accent)',
  accentBright: 'var(--color-accent-bright)',
  accentHover: 'var(--color-accent-hover)',
  accentSoft: 'var(--color-accent-soft)',
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  warm: 'var(--color-warm)',
  success: 'var(--color-success)',
});

export const spacing = stylex.defineVars({
  s1: 'var(--space-1)',
  s2: 'var(--space-2)',
  s3: 'var(--space-3)',
  s4: 'var(--space-4)',
  s5: 'var(--space-5)',
  s6: 'var(--space-6)',
  s8: 'var(--space-8)',
  s10: 'var(--space-10)',
  s12: 'var(--space-12)',
});

export const radii = stylex.defineVars({
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  full: 'var(--radius-full)',
});

export const font = stylex.defineVars({
  xs: 'var(--font-size-xs)',
  sm: 'var(--font-size-sm)',
  md: 'var(--font-size-md)',
  lg: 'var(--font-size-lg)',
  xl: 'var(--font-size-xl)',
  xxl: 'var(--font-size-2xl)',
  sans: 'var(--font-sans)',
  display: 'var(--font-display)',
  mono: 'var(--font-mono)',
});
