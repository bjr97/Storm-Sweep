'use client'

import { Check } from 'lucide-react'

import { BOOKING_STEPS } from '@/lib/booking/schemas'
import { cn } from '@/lib/utils'

type BookingProgressNavProps = {
  currentStep: number
}

export function BookingProgressNav({
  currentStep,
}: BookingProgressNavProps): React.ReactElement {
  return (
    <nav aria-label="Booking progress" className="mb-8">
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {BOOKING_STEPS.map((step, index) => {
          const isComplete = currentStep > step.id
          const isCurrent = currentStep === step.id
          return (
            <li key={step.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      isComplete || isCurrent ? 'bg-sky-DEFAULT' : 'bg-border'
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors sm:size-8',
                    isComplete
                      ? 'border-sky-DEFAULT bg-sky-DEFAULT text-white'
                      : isCurrent
                        ? 'border-sky-DEFAULT bg-white text-sky-DEFAULT'
                        : 'border-border bg-white text-muted-foreground'
                  )}
                >
                  {isComplete ? <Check className="size-3 sm:size-4" /> : step.id}
                </div>
                {index < BOOKING_STEPS.length - 1 ? (
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      currentStep > step.id ? 'bg-sky-DEFAULT' : 'bg-border'
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <span
                className={cn(
                  'hidden text-[10px] font-medium sm:block sm:text-xs',
                  isCurrent ? 'text-sky-DEFAULT' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
