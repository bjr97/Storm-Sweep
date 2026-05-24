import { SiteShell } from '@/components/layout/SiteShell'

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.ReactElement {
  return <SiteShell>{children}</SiteShell>
}
