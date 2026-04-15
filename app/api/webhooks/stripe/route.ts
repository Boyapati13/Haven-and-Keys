import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody   = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  // ── 1. Verify Stripe webhook signature ────────────────────────────────────
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.warn('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServerClient()

  // ── 2. Idempotency check ──────────────────────────────────────────────────
  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('source', 'stripe')
    .eq('external_event_id', event.id)
    .maybeSingle()

  if (existingEvent) {
    return NextResponse.json({ received: true, action: 'duplicate' })
  }

  // ── 3. Record the event ───────────────────────────────────────────────────
  const { error: insertError } = await supabase.from('webhook_events').insert({
    source: 'stripe',
    external_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
  })

  if (insertError && insertError.code !== '23505') {
    console.error('[Stripe Webhook] Failed to record event:', insertError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // ── 4. Route to handler ───────────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, supabase)
        break
      default:
        // Unhandled event types — acknowledged but not processed
        break
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Handler error for ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ── Handler: checkout.session.completed ──────────────────────────────────────
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createServerClient>
) {
  const { booking_id, type, upsell_order_id } = session.metadata ?? {}

  if (!booking_id) {
    console.warn('[Stripe Webhook] checkout.session.completed missing booking_id metadata')
    return
  }

  // Update the transaction record
  await supabase
    .from('transactions')
    .update({
      status: 'succeeded',
      stripe_payment_intent_id: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
      stripe_metadata: session as unknown as Record<string, unknown>,
    })
    .eq('stripe_checkout_session_id', session.id)

  if (type === 'eco_tax') {
    // Advance booking from 'unpaid' → 'paid'
    // The DB trigger will then advance to 'verified' if id_uploaded is already true
    await supabase
      .from('bookings')
      .update({
        status: 'paid',
        eco_tax_paid_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .eq('status', 'unpaid')  // Guard: only advance from unpaid state

    console.info(`[Stripe Webhook] Eco tax paid for booking ${booking_id}`)
  } else if (type === 'upsell' && upsell_order_id) {
    console.info(`[Stripe Webhook] Upsell paid: order ${upsell_order_id} for booking ${booking_id}`)
  }
}

// ── Handler: payment_intent.payment_failed ────────────────────────────────────
async function handlePaymentFailed(
  intent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createServerClient>
) {
  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      failed_reason: intent.last_payment_error?.message ?? 'Unknown error',
    })
    .eq('stripe_payment_intent_id', intent.id)

  console.warn(`[Stripe Webhook] Payment failed for intent ${intent.id}`)
}
