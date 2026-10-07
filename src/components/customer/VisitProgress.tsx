import { Check } from 'lucide-react'

import type { VisitStep } from '@/lib/customer/rules'
import { cn } from '@/lib/utils'

/** Horizontal step tracker; labels collapse to dots on narrow phones. */
export function VisitProgress({ steps }: { steps: VisitStep[] }): React.ReactElement {
  const current = steps.findIndex((s) => !s.done)
  return (
    <ol className="flex items-start" aria-label="Visit progress">
      {steps.map((step, i) => (
        <li key={step.key} className="flex flex-1 flex-col items-center text-center" aria-current={i === current ? 'step' : undefined}>
          <div className="flex w-full items-center">
            <span className={cn('h-0.5 flex-1', i === 0 ? 'invisible' : steps[i - 1].done ? 'bg-sky' : 'bg-black/10')} />
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold',
                step.done ? 'border-sky bg-sky text-white' : i === current ? 'border-sky bg-white text-sky' : 'border-black/15 bg-white text-black/30'
              )}
            >
              {step.done ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn('h-0.5 flex-1', i === steps.length - 1 ? 'invisible' : step.done ? 'bg-sky' : 'bg-black/10')} />
          </div>
          <span className={cn('mt-1 hidden text-[11px] font-semibold sm:block', step.done || i === current ? 'text-shelter' : 'text-[#9A9A9F]')}>
            {step.label}
          </span>
          <span className="sr-only">{step.done ? ' (done)' : i === current ? ' (next)' : ''}</span>
        </li>
      ))}
    </ol>
  )
}
