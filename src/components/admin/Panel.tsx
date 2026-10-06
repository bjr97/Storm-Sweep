import { cn } from '@/lib/utils'

type PanelProps = {
  title: string
  subtitle?: string
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}

export function Panel({ title, subtitle, className, bodyClassName, children }: PanelProps): React.ReactElement {
  return (
    <section className={cn('overflow-hidden rounded-xl border border-white/[0.07] bg-[#1C1C1F]', className)}>
      <header className="flex items-baseline justify-between gap-3 border-b border-white/[0.07] px-[18px] pb-3 pt-4">
        <h2 className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-[0.08em] text-[#F0F0F0]">
          {title}
        </h2>
        {subtitle ? <p className="text-[11px] text-[#8A8A8F]">{subtitle}</p> : null}
      </header>
      <div className={cn('px-[18px] py-4', bodyClassName)}>{children}</div>
    </section>
  )
}

export function EmptyState({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="py-6 text-center text-[13px] italic text-[#8A8A8F]">{children}</p>
}
