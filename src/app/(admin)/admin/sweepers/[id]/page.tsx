import { ArrowLeft, ExternalLink, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { ApplicantDecision } from '@/components/admin/ApplicantDecision'
import { Panel } from '@/components/admin/Panel'
import { ToolPhotoGallery } from '@/components/admin/ToolPhotoGallery'
import { getApplicant } from '@/lib/admin/applicants'
import { formatBusinessDate } from '@/lib/admin/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Applicant · Storm Sweep Admin' }

const AVAILABILITY: Record<string, string> = { weekdays: 'Weekdays', weekends: 'Weekends', both: 'Weekdays + weekends' }

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex justify-between gap-4 border-b border-white/[0.07] py-2 text-[13px] last:border-b-0">
      <dt className="shrink-0 text-[#8A8A8F]">{label}</dt>
      <dd className="min-w-0 text-right text-[#F0F0F0]">{children}</dd>
    </div>
  )
}

export default async function AdminApplicantPage({ params }: { params: { id: string } }): Promise<React.ReactElement> {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound()
  const detail = await getApplicant(params.id)
  if (!detail) notFound()
  const { applicant: a, tools, readyToApprove, blockers } = detail
  const uploaded = tools.filter((t) => t.uploaded).length

  return (
    <>
      <AdminTopbar title={a.full_name} subtitle={`Applied ${formatBusinessDate(new Date(a.applied_at), { month: 'short', day: 'numeric', year: 'numeric' })} · ${a.status}`} />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <Link href="/admin/sweepers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-light hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> All applicants
        </Link>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Panel title="Tool photos" subtitle={`${uploaded}/${tools.length} uploaded · click to enlarge`}>
              <ToolPhotoGallery tools={tools} />
            </Panel>

            <Panel title="Application">
              <dl>
                <Row label="Availability">{AVAILABILITY[a.availability] ?? a.availability}</Row>
                <Row label="Own vehicle">{a.has_vehicle ? 'Yes' : <span className="text-[#F0B27A]">No</span>}</Row>
                <Row label="Heard about us">{a.heard_about ?? '—'}</Row>
                <Row label="Experience">
                  {a.experience_notes ? <span className="whitespace-pre-wrap">{a.experience_notes}</span> : '—'}
                </Row>
              </dl>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Decision">
              <ApplicantDecision
                applicantId={a.id}
                applicantName={a.full_name}
                readyToApprove={readyToApprove}
                blockers={blockers}
                isPending={a.status === 'pending'}
              />
            </Panel>

            <Panel title="Contact">
              <div className="space-y-1.5 text-[13px]">
                <a href={`tel:${a.phone}`} className="flex items-center gap-2 text-sky-light hover:underline">
                  <Phone className="size-3.5" aria-hidden="true" /> {a.phone}
                </a>
                <a href={`mailto:${a.email}`} className="flex items-center gap-2 break-all text-sky-light hover:underline">
                  <Mail className="size-3.5 shrink-0" aria-hidden="true" /> {a.email}
                </a>
              </div>
            </Panel>

            <Panel title="IC agreement">
              <dl>
                <Row label="Signed">{a.agreement_signed ? 'Yes' : <span className="text-[#F0B27A]">Not yet</span>}</Row>
                {a.agreement_pdf_path ? (
                  <Row label="Document">
                    <a href={a.agreement_pdf_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-light hover:underline">
                      View signed copy <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </Row>
                ) : null}
                {a.approved_at ? (
                  <Row label="Approved">{formatBusinessDate(new Date(a.approved_at), { month: 'short', day: 'numeric', year: 'numeric' })}</Row>
                ) : null}
                {a.admin_notes ? <Row label="Admin notes">{a.admin_notes}</Row> : null}
              </dl>
            </Panel>
          </div>
        </div>
      </main>
    </>
  )
}
