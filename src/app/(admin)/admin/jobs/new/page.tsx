import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { PhoneBookingForm } from '@/components/admin/PhoneBookingForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New booking · Storm Sweep Admin' }

export default function AdminNewBookingPage(): React.ReactElement {
  return (
    <>
      <AdminTopbar title="New booking" subtitle="For customers who call or text — priced the same as online" />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <Link href="/admin/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-light hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> All jobs
        </Link>
        <PhoneBookingForm />
      </main>
    </>
  )
}
