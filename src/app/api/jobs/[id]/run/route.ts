import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { MEDIA_KINDS, SELLABLE_UPGRADE_IDS } from '@/lib/sweepers/jobRun'
import {
  completeJob,
  createMediaUpload,
  deleteMedia,
  markArrived,
  markEnRoute,
  recordSignature,
  registerMedia,
  removeUpgrade,
  reportIssue,
  sellUpgrade,
  setChecklistItem,
} from '@/lib/sweepers/jobRunServer'

// Sweeper on-site actions for one job. Ownership is enforced in jobRunServer.
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('en_route') }),
  z.object({
    action: z.literal('arrive'),
    position: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy: z.number().min(0).max(100_000),
      })
      .nullable(),
  }),
  z.object({ action: z.literal('checklist'), itemId: z.string().min(1).max(40), done: z.boolean() }),
  z.object({
    action: z.literal('upload_url'),
    kind: z.enum(MEDIA_KINDS),
    contentType: z.string().max(40),
  }),
  z.object({
    action: z.literal('register_media'),
    kind: z.enum(MEDIA_KINDS),
    path: z.string().min(1).max(200),
    checklistItem: z.string().max(40).nullable(),
  }),
  z.object({ action: z.literal('delete_media'), mediaId: z.string().uuid() }),
  z.object({
    action: z.literal('report_issue'),
    kind: z.enum(['standing_water', 'structural', 'mold', 'pests', 'access', 'other']),
    note: z.string().trim().max(500).nullable(),
    photoPath: z.string().max(200).nullable(),
  }),
  z.object({
    action: z.literal('sell_upgrade'),
    addonId: z.enum(SELLABLE_UPGRADE_IDS),
    initials: z.string().trim().min(2, 'Customer initials required').max(4),
  }),
  z.object({ action: z.literal('remove_upgrade'), upgradeId: z.string().uuid() }),
  z.object({ action: z.literal('sign'), name: z.string().trim().min(2).max(80), path: z.string().min(1).max(200) }),
  z.object({ action: z.literal('complete') }),
])

const paramsSchema = z.object({ id: z.string().uuid() })

export async function POST(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('sweeper')
    if (!auth.authorized) {
      return Response.json({ error: 'Not authorized' }, { status: auth.status })
    }
    const parsedParams = paramsSchema.safeParse(params)
    const parsed = actionSchema.safeParse(await req.json())
    if (!parsedParams.success || !parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.success ? undefined : parsed.error.flatten() },
        { status: 400 }
      )
    }
    const me = auth.userId
    const jobId = parsedParams.data.id
    const a = parsed.data

    const result = await (async () => {
      switch (a.action) {
        case 'en_route':
          return markEnRoute(me, jobId)
        case 'arrive':
          return markArrived(me, jobId, a.position)
        case 'checklist':
          return setChecklistItem(me, jobId, a.itemId, a.done)
        case 'upload_url':
          return createMediaUpload(me, jobId, a.kind, a.contentType)
        case 'register_media':
          return registerMedia(me, jobId, a.kind, a.path, a.checklistItem)
        case 'delete_media':
          return deleteMedia(me, jobId, a.mediaId)
        case 'report_issue':
          return reportIssue(me, jobId, { kind: a.kind, note: a.note || null, photoPath: a.photoPath })
        case 'sell_upgrade':
          return sellUpgrade(me, jobId, a.addonId, a.initials.toUpperCase())
        case 'remove_upgrade':
          return removeUpgrade(me, jobId, a.upgradeId)
        case 'sign':
          return recordSignature(me, jobId, a.name, a.path)
        case 'complete':
          return completeJob(me, jobId)
      }
    })()

    if ('error' in result) {
      return Response.json({ error: result.error, code: result.code }, { status: result.status })
    }
    return Response.json({ data: result })
  } catch (error) {
    console.error('[jobs/run]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
