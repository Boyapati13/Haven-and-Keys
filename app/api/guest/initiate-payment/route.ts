import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createEcoTaxCheckoutSession } from '@/lib/stripe'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({ token: z.string().length(64) })

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
  }

  const { token } = parsed.data
  const supabase  = createServerClient()

  // ── Validate token ─────────────────────────────────────────────────────────
  const { data: magicToken } = await supabase
    .from('magic_tokens')
    .select('booking_id, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle()

  if (!magicToken || magicToken.revoked_at || new Date(magicToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  // ── Fetch booking ──────────────────────────────────────────────────────────
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status, eco_tax_amount_cents, eco_tax_currency, check_in_date,
      guests ( email ),
      properties ( name )
    `)
    .eq('id', magicToken.booking_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Guard: only allow payment from unpaid state
  if (booking.status !== 'unpaid') {
    return NextResponse.json(
      { error: 'Payment not required', status: booking.status },
      { status: 409 }
    )
  }

  // Check for existing pending transaction to avoid duplicates
  const { data: existingTxn } = await supabase
    .from('transactions')
    .select('stripe_checkout_session_id')
    .eq('booking_id', booking.id)
    .eq('type', 'eco_tax')
    .eq('status', 'pending')
    .maybeSingle()

  if (existingTxn?.stripe_checkout_session_id) {
    // Return the existing session URL
    const { stripe } = await import('@/lib/stripe')
    const session = await stripe.checkout.sessions.retrieve(
      existingTxn.stripe_checkout_session_id
    )
    if (session.url && session.status === 'open') {
      return NextResponse.json({ checkoutUrl: session.url })
    }
  }

  // ── Create Stripe Checkout Session ─────────────────────────────────────────
  const guest    = (Array.isArray(booking.guests) ? booking.guests[0] : booking.guests) as { email: string | null } | null
  const property = (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) as { name: string } | null

  const session = await createEcoTaxCheckoutSession({
    bookingId: booking.id,
    token,
    amountCents: booking.eco_tax_amount_cents,
    currency: booking.eco_tax_currency,
    guestEmail: guest?.email ?? null,
    propertyName: property?.name ?? 'Your Property',
    checkInDate: booking.check_in_date,
  })

  // ── Record pending transaction ──────────────────────────────────────────────
  await supabase.from('transactions').insert({
    booking_id: booking.id,
    type: 'eco_tax',
    status: 'pending',
    stripe_checkout_session_id: session.id,
    amount_cents: booking.eco_tax_amount_cents,
    currency: booking.eco_tax_currency,
  })

  return NextResponse.json({ checkoutUrl: session.url })
}
