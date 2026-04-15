import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_DOC_TYPES   = new Set(['passport', 'drivers_license', 'national_id', 'other'])

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Parse multipart form ───────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
  }

  const token   = formData.get('token') as string | null
  const docType = formData.get('doc_type') as string | null
  const file    = formData.get('file') as File | null

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }
  if (!docType || !ALLOWED_DOC_TYPES.has(docType)) {
    return NextResponse.json(
      { error: 'Invalid doc_type. Must be: passport, drivers_license, national_id, or other' },
      { status: 400 }
    )
  }
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // ── Validate file ─────────────────────────────────────────────────────────
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF' },
      { status: 422 }
    )
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 422 })
  }

  const supabase = createServerClient()

  // ── Validate token ────────────────────────────────────────────────────────
  const { data: magicToken } = await supabase
    .from('magic_tokens')
    .select('booking_id, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle()

  if (!magicToken || magicToken.revoked_at || new Date(magicToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  // ── Fetch booking ─────────────────────────────────────────────────────────
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, id_uploaded')
    .eq('id', magicToken.booking_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Guard: ID upload only allowed when eco tax is paid
  if (!['paid', 'verified'].includes(booking.status)) {
    return NextResponse.json(
      {
        error: 'Eco tax must be paid before uploading ID',
        current_status: booking.status,
      },
      { status: 409 }
    )
  }

  if (booking.id_uploaded) {
    return NextResponse.json(
      { message: 'ID already uploaded', status: 'verified' },
      { status: 200 }
    )
  }

  // ── Upload to Supabase Storage (private bucket) ───────────────────────────
  const extension  = file.name.split('.').pop() ?? 'bin'
  const objectPath = `${booking.id}/${randomUUID()}.${extension}`
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('id-vault')
    .upload(objectPath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('[Upload ID] Storage upload failed:', uploadError)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }

  // ── Record document metadata ──────────────────────────────────────────────
  const { error: docInsertError } = await supabase.from('id_documents').insert({
    booking_id: booking.id,
    doc_type: docType,
    storage_path: objectPath,
    file_size_bytes: file.size,
    mime_type: file.type,
  })

  if (docInsertError) {
    console.error('[Upload ID] Failed to insert id_document record:', docInsertError)
    // Don't fail the user — the file is safely uploaded
  }

  // ── Update booking: id_uploaded = true ───────────────────────────────────
  // The DB trigger will auto-advance to 'verified' if status is 'paid'
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({ id_uploaded: true })
    .eq('id', booking.id)
    .select('status')
    .single()

  if (updateError) {
    console.error('[Upload ID] Failed to update booking:', updateError)
    return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    status: updatedBooking?.status ?? 'verified',
  })
}
