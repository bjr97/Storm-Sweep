import { requireRole } from '@/lib/auth/requireRole'
import { IRS_1099_THRESHOLD_CENTS } from '@/lib/sweepers/earnings'
import { tenNinetyNineRows } from '@/lib/sweepers/payouts'

// CSV of payments made to each Sweeper in a calendar year (1099-NEC prep).
export const dynamic = 'force-dynamic'

const cell = (v: string | number): string => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const year = Number(new URL(req.url).searchParams.get('year'))
    if (!Number.isInteger(year) || year < 2024 || year > 2100) return Response.json({ error: 'Invalid year' }, { status: 400 })

    const rows = await tenNinetyNineRows(year)
    const lines = [
      ['Sweeper', 'Email', 'Phone', `Total paid ${year} (USD)`, 'Payouts', '1099-NEC required ($600+)', 'W-9 on file'].map(cell).join(','),
      ...rows.map((r) =>
        [r.name, r.email, r.phone, (r.total / 100).toFixed(2), r.payouts, r.total >= IRS_1099_THRESHOLD_CENTS ? 'Yes' : 'No', r.w9 ? 'Yes' : 'No'].map(cell).join(',')
      ),
    ]
    return new Response(`${lines.join('\r\n')}\r\n`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="storm-sweep-1099-${year}.csv"`,
      },
    })
  } catch (error) {
    console.error('[admin/payouts/1099]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
