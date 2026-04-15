import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { StatusResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * Lightweight polling endpoint for the UI state machine.
 * Called after payment redirect return and after ID upload to refresh UI state.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token')

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: magicToken } = await supabase
    .from('magic_tokens')
    .select('booking_id, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle()

  if (!magicToken || magicToken.revoked_at || new Date(magicToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('status, id_uploaded')
    .eq('id', magicToken.booking_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const missing: Array<'payment' | 'id_upload'> = []
  if (!['paid', 'verified', 'checked_in', 'checked_out'].includes(booking.status)) {
    missing.push('payment')
  }
  if (!booking.id_uploaded) {
    missing.push('id_upload')
  }

  const response: StatusResponse = {
    status: booking.status,
    id_uploaded: booking.id_uploaded,
    missing,
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
