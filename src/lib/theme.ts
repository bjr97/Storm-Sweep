export type ThemeName = 'dark' | 'retro'

export const ACTIVE_THEME: ThemeName =
  process.env.NEXT_PUBLIC_ACTIVE_THEME === 'retro' ? 'retro' : 'dark'

export const isRetro = ACTIVE_THEME === 'retro'

/** Returns the Tailwind class string for the active theme. */
export function themeClass(darkClass: string, retroClass: string): string {
  return isRetro ? retroClass : darkClass
}

/** Shared semantic classes that work in both themes via CSS variables. */
export const theme = {
  bg: 'bg-[var(--color-bg)]',
  surface: 'bg-[var(--color-surface)]',
  text: 'text-[var(--color-text)]',
  textMuted: 'text-[var(--color-text-muted)]',
  primary: 'text-[var(--color-primary)]',
  accent: 'text-[var(--color-accent)]',
  border: 'border-[var(--color-border)]',
  fontDisplay: 'font-[family-name:var(--font-display)]',
  fontBody: 'font-[family-name:var(--font-body)]',
  btnPrimary:
    'bg-[var(--color-primary)] text-[var(--color-bg)] hover:opacity-90',
  btnAccent:
    'bg-[var(--color-accent)] text-[var(--color-ink)] hover:opacity-90',
  btnDanger: 'bg-[var(--color-danger)] text-[var(--color-paper,#fff)]',
  card: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]',
  cardMuted:
    'border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)]',
} as const
