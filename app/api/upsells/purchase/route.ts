import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createUpsellCheckoutSession } from '@/lib/stripe'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  token:             z.string().length(64),
  upsell_service_id: z.string().uuid(),
  quantity:          z.number().int().min(1).max(10).default(1),
  notes:             z.string().max(500).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { token, upsell_service_id, quantity, notes } = parsed.data
  const supabase = createServerClient()

  // ── Validate token ─────────────────────────────────────────────────────────
  const { data: magicToken } = await supabase
    .from('magic_tokens')
    .select('booking_id, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle()

  if (!magicToken || magicToken.revoked_at || new Date(magicToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  const bookingId = magicToken.booking_id

  // ── Fetch booking + service ───────────────────────────────────────────────
  const [bookingResult, serviceResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status, property_id, guests(email)')
      .eq('id', bookingId)
      .single(),
    supabase
      .from('upsell_services')
      .select('id, name, description, price_cents, currency, is_available, max_per_booking, property_id')
      .eq('id', upsell_service_id)
      .single(),
  ])

  const booking = bookingResult.data
  const service = serviceResult.data

  if (!booking || booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (!service || !service.is_available) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 422 })
  }
  // Ensure the service belongs to the booking's property
  if (service.property_id !== booking.property_id) {
    return NextResponse.json({ error: 'Service not available for this property' }, { status: 403 })
  }

  // ── Check max_per_booking ──────────────────────────────────────────────────
  const { data: existingOrders } = await supabase
    .from('upsell_orders')
    .select('quantity')
    .eq('booking_id', bookingId)
    .eq('upsell_service_id', upsell_service_id)

  const totalExisting = (existingOrders ?? []).reduce((sum, o) => sum + o.quantity, 0)
  if (totalExisting + quantity > service.max_per_booking) {
    return NextResponse.json(
      {
        error: `Maximum ${service.max_per_booking} of this service per booking`,
        already_purchased: totalExisting,
      },
      { status: 409 }
    )
  }

  // ── Create upsell order (price snapshot) ──────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from('upsell_orders')
    .insert({
      booking_id: bookingId,
      upsell_service_id: service.id,
      quantity,
      unit_price_cents: service.price_cents,
      currency: service.currency,
      notes: notes ?? null,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('[Upsell Purchase] Failed to create order:', orderError)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  // ── Create Stripe Checkout ─────────────────────────────────────────────────
  const guest    = (Array.isArray(booking.guests) ? booking.guests[0] : booking.guests) as { email: string | null } | null
  const totalCents = service.price_cents * quantity

  const session = await createUpsellCheckoutSession({
    bookingId,
    upsellOrderId: order.id,
    token,
    amountCents: totalCents,
    currency: service.currency,
    serviceName: service.name,
    serviceDescription: service.description,
    guestEmail: guest?.email ?? null,
  })

  // ── Record transaction ─────────────────────────────────────────────────────
  await supabase.from('transactions').insert({
    booking_id: bookingId,
    type: 'upsell',
    status: 'pending',
    stripe_checkout_session_id: session.id,
    amount_cents: totalCents,
    currency: service.currency,
    upsell_order_id: order.id,
  })

  return NextResponse.json({ checkoutUrl: session.url })
}
