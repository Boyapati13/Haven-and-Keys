import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { SanitizedBookingResponse } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token')

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const supabase = createServerClient()

  // ── Validate token ────────────────────────────────────────────────────────
  const { data: magicToken, error: tokenError } = await supabase
    .from('magic_tokens')
    .select('id, booking_id, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenError || !magicToken) {
    return NextResponse.json({ error: 'Link not found or expired' }, { status: 404 })
  }

  if (magicToken.revoked_at) {
    return NextResponse.json({ error: 'This link has been revoked' }, { status: 410 })
  }

  if (new Date(magicToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
  }

  // ── Fetch booking with joins ──────────────────────────────────────────────
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      id_uploaded,
      check_in_date,
      check_out_date,
      num_guests,
      nights,
      eco_tax_amount_cents,
      eco_tax_currency,
      portal_first_accessed_at,
      properties (
        name,
        hero_image_url,
        welcome_message,
        eco_tax_amount_cents,
        eco_tax_currency
      ),
      guests (
        full_name
      )
    `)
    .eq('id', magicToken.booking_id)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // ── Side effects ──────────────────────────────────────────────────────────
  // Track first access and advance pending → unpaid
  const updates: Record<string, unknown> = {}

  if (!booking.portal_first_accessed_at) {
    updates.portal_first_accessed_at = new Date().toISOString()
  }
  if (booking.status === 'pending') {
    updates.status = 'unpaid'
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('bookings').update(updates).eq('id', booking.id)
  }

  // Update token last_used_at + increment use_count atomically via DB function
  await supabase
    .from('magic_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', magicToken.id)

  await supabase.rpc('increment_token_use_count', { token_id: magicToken.id })

  // ── Build sanitized response (NEVER include address/codes) ───────────────
  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties as { name: string; hero_image_url: string | null; welcome_message: string | null; eco_tax_amount_cents: number; eco_tax_currency: string }

  const guest = Array.isArray(booking.guests)
    ? booking.guests[0]
    : booking.guests as { full_name: string }

  const firstName = (guest?.full_name ?? 'Guest').split(' ')[0]

  const response: SanitizedBookingResponse = {
    booking: {
      id: booking.id,
      status: booking.status === 'pending' ? 'unpaid' : booking.status,
      id_uploaded: booking.id_uploaded,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      num_guests: booking.num_guests,
      nights: booking.nights,
      eco_tax_amount_cents: booking.eco_tax_amount_cents,
      eco_tax_currency: booking.eco_tax_currency,
    },
    property: {
      name: property?.name ?? '',
      hero_image_url: property?.hero_image_url ?? null,
      welcome_message: property?.welcome_message ?? null,
      eco_tax_amount_cents: property?.eco_tax_amount_cents ?? 0,
      eco_tax_currency: property?.eco_tax_currency ?? 'eur',
    },
    guest: {
      first_name: firstName,
    },
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
