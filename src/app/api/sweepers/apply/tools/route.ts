import { createServiceClient } from '@/lib/supabase/server'
import { TOOL_PHOTO_KEYS } from '@/lib/sweepers/constants'
import { isValidToolKey, parseToolPhotos, allToolsUploaded } from '@/lib/sweepers/utils'

const MAX_FILE_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])

export async function POST(req: Request): Promise<Response> {
  try {
    const formData = await req.formData()
    const applicantId = formData.get('applicantId')
    const toolKey = formData.get('toolKey')
    const file = formData.get('file')

    if (typeof applicantId !== 'string' || typeof toolKey !== 'string') {
      return Response.json({ error: 'applicantId and toolKey are required' }, { status: 400 })
    }

    if (!isValidToolKey(toolKey)) {
      return Response.json({ error: 'Invalid tool key' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return Response.json({ error: 'File is required' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: 'Only JPEG, PNG, WebP, or HEIC images are allowed' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_BYTES) {
      return Response.json({ error: 'File must be under 8MB' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: applicant, error: fetchError } = await supabase
      .from('sweeper_applicants')
      .select('id, status, tool_photos')
      .eq('id', applicantId)
      .single()

    if (fetchError || !applicant) {
      return Response.json({ error: 'Application not found' }, { status: 404 })
    }

    if (applicant.status !== 'pending') {
      return Response.json({ error: 'Application is no longer editable' }, { status: 409 })
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const storagePath = `${applicantId}/${toolKey}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('applicant-tools')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('[sweepers/apply/tools]', uploadError)
      return Response.json({ error: 'Failed to upload photo' }, { status: 500 })
    }

    const currentPhotos = parseToolPhotos(applicant.tool_photos)
    const updatedPhotos = { ...currentPhotos, [toolKey]: storagePath }
    const verified = allToolsUploaded(updatedPhotos)

    const { data: updated, error: updateError } = await supabase
      .from('sweeper_applicants')
      .update({
        tool_photos: updatedPhotos,
        all_tools_verified: verified,
      })
      .eq('id', applicantId)
      .select('tool_photos, all_tools_verified')
      .single()

    if (updateError || !updated) {
      console.error('[sweepers/apply/tools]', updateError)
      return Response.json({ error: 'Failed to update application' }, { status: 500 })
    }

    const photos = parseToolPhotos(updated.tool_photos)

    return Response.json({
      data: {
        toolKey,
        storagePath,
        toolPhotos: photos,
        uploadedCount: TOOL_PHOTO_KEYS.filter((k) => photos[k]).length,
        totalRequired: TOOL_PHOTO_KEYS.length,
        allToolsVerified: updated.all_tools_verified,
      },
      message: 'Photo uploaded',
    })
  } catch (error) {
    console.error('[sweepers/apply/tools]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url)
    const applicantId = searchParams.get('applicantId')

    if (!applicantId) {
      return Response.json({ error: 'applicantId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: applicant, error } = await supabase
      .from('sweeper_applicants')
      .select('tool_photos, all_tools_verified')
      .eq('id', applicantId)
      .single()

    if (error || !applicant) {
      return Response.json({ error: 'Application not found' }, { status: 404 })
    }

    const photos = parseToolPhotos(applicant.tool_photos)

    return Response.json({
      data: {
        toolPhotos: photos,
        uploadedCount: TOOL_PHOTO_KEYS.filter((k) => photos[k]).length,
        totalRequired: TOOL_PHOTO_KEYS.length,
        allToolsVerified: applicant.all_tools_verified,
      },
    })
  } catch (error) {
    console.error('[sweepers/apply/tools GET]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
