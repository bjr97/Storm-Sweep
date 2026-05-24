'use client'

import { useEffect, useState } from 'react'

import { ACTIVE_THEME, type ThemeName } from '@/lib/theme'

function readThemeFromDom(): ThemeName {
  if (typeof document === 'undefined') return ACTIVE_THEME
  const value = document.documentElement.getAttribute('data-theme')
  return value === 'retro' ? 'retro' : 'dark'
}

export function useTheme(): ThemeName {
  const [theme, setTheme] = useState<ThemeName>(ACTIVE_THEME)

  useEffect(() => {
    const stored = localStorage.getItem('dev-theme') as ThemeName | null
    if (stored === 'dark' || stored === 'retro') {
      document.documentElement.setAttribute('data-theme', stored)
    }

    setTheme(readThemeFromDom())

    const observer = new MutationObserver(() => {
      setTheme(readThemeFromDom())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  return theme
}

export function useIsRetro(): boolean {
  return useTheme() === 'retro'
}
