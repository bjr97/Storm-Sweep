'use client'

import { useEffect, useState } from 'react'

import { ACTIVE_THEME, type ThemeName } from '@/lib/theme'

export function DevThemeToggle(): React.ReactElement | null {
  const [theme, setTheme] = useState<ThemeName>(ACTIVE_THEME)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(process.env.NODE_ENV === 'development')

    const stored = localStorage.getItem('dev-theme') as ThemeName | null
    if (stored === 'dark' || stored === 'retro') {
      document.documentElement.setAttribute('data-theme', stored)
      setTheme(stored)
    } else {
      setTheme(
        document.documentElement.getAttribute('data-theme') === 'retro'
          ? 'retro'
          : 'dark'
      )
    }
  }, [])

  if (!visible) return null

  function toggleTheme(): void {
    const next: ThemeName = theme === 'dark' ? 'retro' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('dev-theme', next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed bottom-4 right-4 z-[10000] border-2 border-[var(--color-ink)] bg-[var(--color-accent)] px-3 py-2 font-body text-sm uppercase tracking-wide text-[var(--color-ink)] shadow-[4px_4px_0_var(--color-ink)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--color-ink)]"
      aria-label={`Switch theme. Current: ${theme}`}
    >
      Theme: {theme}
    </button>
  )
}
