'use client'

import { PixelDivider } from '@/components/ui/PixelDivider'
import { useIsRetro } from '@/hooks/useTheme'

export function SectionDivider(): React.ReactElement | null {
  const isRetro = useIsRetro()
  if (!isRetro) return null
  return <PixelDivider />
}
