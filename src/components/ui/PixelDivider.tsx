export function PixelDivider(): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className="h-[8px] border-y-[3px] border-[var(--color-ink)]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(90deg, var(--color-primary) 0px, var(--color-primary) 8px, var(--color-accent) 8px, var(--color-accent) 16px, var(--color-paper, #FFF9E0) 16px, var(--color-paper, #FFF9E0) 24px)',
      }}
    />
  )
}
