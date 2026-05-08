import * as stylex from '@stylexjs/stylex';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';

export function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env['VITE_API_URL']}/auth/google`;
  };

  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.card)}>
        <div {...stylex.props(styles.logoWrap)}>
          <span {...stylex.props(styles.mark)}>
            <span {...stylex.props(styles.markDot)} />
          </span>
          <h1 {...stylex.props(styles.logo)}>orbit</h1>
        </div>
        <p {...stylex.props(styles.tagline)}>
          A little bit of everything you care about.
        </p>
        <button {...stylex.props(styles.googleBtn)} onClick={handleGoogleLogin}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.s4,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.s6,
    padding: spacing.s10,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: '360px',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s3,
  },
  mark: {
    width: '32px',
    height: '32px',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDot: {
    width: '10px',
    height: '10px',
    borderRadius: radii.full,
    backgroundColor: colors.bg,
  },
  logo: {
    fontFamily: font.display,
    fontSize: font.xxl,
    fontWeight: 600,
    fontStyle: 'italic',
    color: colors.textPrimary,
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  tagline: {
    fontSize: font.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s3,
    padding: `${spacing.s3} ${spacing.s6}`,
    backgroundColor: '#fff',
    color: '#1f1f1f',
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.md,
    fontWeight: 600,
    width: '100%',
    justifyContent: 'center',
    transition: 'opacity 0.15s',
    ':hover': { opacity: 0.9 },
    ':active': { opacity: 0.8 },
  },
});
