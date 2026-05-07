import * as stylex from '@stylexjs/stylex';

export const colors = stylex.defineVars({
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surfaceRaised: 'var(--color-surface-raised)',
  border: 'var(--color-border)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  fgOnAccent: 'var(--color-fg-on-accent)',
  accent: 'var(--color-accent)',
  accentHover: 'var(--color-accent-hover)',
  danger: 'var(--color-danger)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
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
});
