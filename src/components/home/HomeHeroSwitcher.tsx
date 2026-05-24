'use client'

import { DarkHero, RetroHero } from '@/components/home/HomeHero'
import { useIsRetro } from '@/hooks/useTheme'

export function HomeHero(): React.ReactElement {
  const isRetro = useIsRetro()
  return isRetro ? <RetroHero /> : <DarkHero />
}
