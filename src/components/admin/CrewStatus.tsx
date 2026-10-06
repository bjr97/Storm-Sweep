import { EmptyState } from '@/components/admin/Panel'
import type { CrewMember } from '@/lib/admin/dashboard'
import { cn } from '@/lib/utils'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function CrewStatus({ crew }: { crew: CrewMember[] }): React.ReactElement {
  if (crew.length === 0) {
    return (
      <EmptyState>
        No approved Sweepers yet. Applicants appear in the queue once they apply at /sweepers/apply.
      </EmptyState>
    )
  }

  return (
    <ul>
      {crew.map((member) => {
        const onJob = member.currentJob !== null
        return (
          <li key={member.id} className="flex items-center gap-3 border-b border-white/[0.07] py-3 last:border-b-0">
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky to-sky-dark font-[family-name:var(--font-bebas)] text-[13px] tracking-wider text-white">
              {initials(member.name)}
              <span
                className={cn(
                  'absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[#1C1C1F]',
                  onJob ? 'bg-[#2ECC71]' : 'bg-[#5A5A5F]'
                )}
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#F0F0F0]">{member.name}</p>
              <p className="truncate text-[11px] text-[#8A8A8F]">
                {onJob
                  ? `On job · ${member.currentJob}`
                  : member.jobsToday > 0
                    ? `${member.jobsToday} job${member.jobsToday === 1 ? '' : 's'} today`
                    : 'No jobs today'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-[family-name:var(--font-bebas)] text-xl leading-none text-white">
                {member.jobsThisWeek}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8F]">This wk</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
