import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyHostawaySignature, generateMagicToken, sanitizePhoneToE164 } from '@/lib/crypto'
import { sendMagicLinkWhatsApp } from '@/lib/twilio'
import type { HostawayReservationPayload } from '@/types'

// CRITICAL: Disable Next.js body parsing so we receive the raw body
// needed for HMAC signature verification
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now()
  const rawBody = await req.text()

  // ── 1. Verify HMAC signature ──────────────────────────────────────────────
  const signature = req.headers.get('x-hostaway-signature') ?? ''
  const secret    = process.env.HOSTAWAY_WEBHOOK_SECRET ?? ''

  if (!verifyHostawaySignature(rawBody, signature, secret)) {
    console.warn('[Hostaway Webhook] Invalid HMAC signature')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: HostawayReservationPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  // We only handle reservation.created for now
  if (payload.event !== 'reservation.created') {
    return NextResponse.json({ received: true, action: 'ignored', event: payload.event })
  }

  const { data } = payload
  const externalEventId = String(data.reservationId)

  const supabase = createServerClient()

  // ── 2. Idempotency check ──────────────────────────────────────────────────
  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('source', 'hostaway')
    .eq('external_event_id', externalEventId)
    .maybeSingle()

  if (existingEvent) {
    console.info(`[Hostaway Webhook] Duplicate event ${externalEventId} — skipping`)
    return NextResponse.json({ received: true, action: 'duplicate' })
  }

  // ── 3. Record the webhook event (locks the idempotency key) ──────────────
  const { error: webhookInsertError } = await supabase
    .from('webhook_events')
    .insert({
      source: 'hostaway',
      external_event_id: externalEventId,
      event_type: payload.event,
      payload: payload as unknown as Record<string, unknown>,
    })

  if (webhookInsertError) {
    // Race condition: another request just inserted — safe to ignore
    if (webhookInsertError.code === '23505') {
      return NextResponse.json({ received: true, action: 'duplicate' })
    }
    console.error('[Hostaway Webhook] Failed to insert webhook event:', webhookInsertError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  try {
    // ── 4. Resolve the property by hostaway_listing_id ────────────────────
    const listingId = String(data.listingMapId ?? data.listingId)
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, name, eco_tax_amount_cents, eco_tax_currency')
      .eq('hostaway_listing_id', listingId)
      .eq('is_active', true)
      .single()

    if (propError || !property) {
      console.error(`[Hostaway Webhook] Property not found for listing ID: ${listingId}`)
      return NextResponse.json({ error: 'Property not configured' }, { status: 422 })
    }

    // ── 5. Upsert guest ───────────────────────────────────────────────────
    const phone = sanitizePhoneToE164(data.phone ?? '', '+1')
    const nameParts = data.guestName.trim().split(' ')

    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .upsert(
        {
          hostaway_guest_id: String(data.guestId),
          full_name: data.guestName,
          email: data.guestEmail ?? null,
          phone_e164: phone,
        },
        {
          onConflict: 'hostaway_guest_id',
          ignoreDuplicates: false,
        }
      )
      .select('id, full_name, phone_e164')
      .single()

    if (guestError || !guest) {
      console.error('[Hostaway Webhook] Failed to upsert guest:', guestError)
      return NextResponse.json({ error: 'Failed to create guest record' }, { status: 500 })
    }

    // ── 6. Create booking ─────────────────────────────────────────────────
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        property_id: property.id,
        guest_id: guest.id,
        hostaway_reservation_id: externalEventId,
        status: 'pending',
        check_in_date: data.arrivalDate,
        check_out_date: data.departureDate,
        num_guests: data.numberOfGuests,
        eco_tax_amount_cents: property.eco_tax_amount_cents,
        eco_tax_currency: property.eco_tax_currency,
      })
      .select('id, check_in_date, check_out_date')
      .single()

    if (bookingError || !booking) {
      console.error('[Hostaway Webhook] Failed to create booking:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // ── 7. Generate magic token ───────────────────────────────────────────
    const token = generateMagicToken()
    // Token expires at checkout date + 12 hours
    const expiresAt = new Date(`${booking.check_out_date}T12:00:00Z`).toISOString()

    const { error: tokenError } = await supabase.from('magic_tokens').insert({
      booking_id: booking.id,
      token,
      expires_at: expiresAt,
    })

    if (tokenError) {
      console.error('[Hostaway Webhook] Failed to create magic token:', tokenError)
      return NextResponse.json({ error: 'Failed to generate access token' }, { status: 500 })
    }

    // ── 8. Dispatch WhatsApp via Twilio ───────────────────────────────────
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const magicLink   = `${appUrl}/welcome?token=${token}`
    const firstName   = nameParts[0]

    let twilioSid: string | null = null
    try {
      twilioSid = await sendMagicLinkWhatsApp({
        toPhone: guest.phone_e164,
        guestFirstName: firstName,
        magicLinkUrl: magicLink,
        propertyName: property.name,
      })
    } catch (twilioError) {
      // Log but don't fail — the booking is created, link can be resent manually
      console.error('[Hostaway Webhook] Twilio dispatch failed:', twilioError)
    }

    // ── 9. Update booking with send confirmation ──────────────────────────
    await supabase
      .from('bookings')
      .update({
        magic_link_sent_at: new Date().toISOString(),
        twilio_message_sid: twilioSid,
      })
      .eq('id', booking.id)

    // ── 10. Record processing time ────────────────────────────────────────
    await supabase
      .from('webhook_events')
      .update({ processing_ms: Date.now() - start })
      .eq('source', 'hostaway')
      .eq('external_event_id', externalEventId)

    console.info(`[Hostaway Webhook] Booking ${booking.id} created for guest ${guest.id} in ${Date.now() - start}ms`)

    return NextResponse.json({
      received: true,
      action: 'processed',
      booking_id: booking.id,
    })

  } catch (err) {
    console.error('[Hostaway Webhook] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
