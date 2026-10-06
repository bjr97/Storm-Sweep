type AdminTopbarProps = { title: string; subtitle?: string; children?: React.ReactNode }

export function AdminTopbar({ title, subtitle, children }: AdminTopbarProps): React.ReactElement {
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/[0.07] bg-[#141416] px-4 py-2 sm:px-7">
      <h1 className="font-[family-name:var(--font-bebas)] text-[22px] tracking-wide text-white">{title}</h1>
      {subtitle ? <p className="text-xs font-medium text-[#8A8A8F]">{subtitle}</p> : null}
      {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
    </header>
  )
}
