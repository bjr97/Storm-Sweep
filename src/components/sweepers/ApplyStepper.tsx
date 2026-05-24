import Link from 'next/link'

import { cn } from '@/lib/utils'

const STEPS = [
  { label: 'Application', href: '/sweepers/apply' },
  { label: 'Tool Photos', href: '/sweepers/apply/tools' },
  { label: 'Agreement', href: '/sweepers/apply/agreement' },
  { label: 'Confirmation', href: '/sweepers/apply/confirmation' },
] as const

export function ApplyStepper({
  currentStep,
}: {
  currentStep: 1 | 2 | 3 | 4
}): React.ReactElement {
  return (
    <nav aria-label="Application progress" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 sm:gap-4">
        {STEPS.map((step, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3 | 4
          const isActive = stepNumber === currentStep
          const isComplete = stepNumber < currentStep

          return (
            <li key={step.href} className="flex items-center gap-2">
              {index > 0 ? (
                <span className="hidden text-muted-foreground sm:inline" aria-hidden="true">
                  →
                </span>
              ) : null}
              <Link
                href={step.href}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 font-[family-name:var(--font-barlow-condensed)] text-xs font-semibold uppercase tracking-wide transition-colors sm:text-sm',
                  isActive && 'bg-sky-DEFAULT text-white',
                  isComplete && !isActive && 'bg-sky-DEFAULT/10 text-sky-dark',
                  !isActive && !isComplete && 'bg-black/5 text-muted-foreground'
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs',
                    isActive && 'bg-white/20',
                    isComplete && !isActive && 'bg-sky-DEFAULT/20',
                    !isActive && !isComplete && 'bg-black/10'
                  )}
                >
                  {stepNumber}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
