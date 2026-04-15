import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

/**
 * Creates a Stripe Checkout Session for the mandatory Eco Tax.
 */
export async function createEcoTaxCheckoutSession({
  bookingId,
  token,
  amountCents,
  currency,
  guestEmail,
  propertyName,
  checkInDate,
}: {
  bookingId: string
  token: string
  amountCents: number
  currency: string
  guestEmail?: string | null
  propertyName: string
  checkInDate: string
}): Promise<Stripe.Checkout.Session> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: guestEmail ?? undefined,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: {
            name: `Eco Tourism Tax — ${propertyName}`,
            description: `Mandatory local eco tax for your stay starting ${checkInDate}`,
            images: [],
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: bookingId,
      token,
      type: 'eco_tax',
    },
    payment_intent_data: {
      metadata: {
        booking_id: bookingId,
        type: 'eco_tax',
      },
    },
    success_url: `${appUrl}/welcome?token=${token}&payment=success`,
    cancel_url:  `${appUrl}/welcome?token=${token}`,
  })
}

/**
 * Creates a Stripe Checkout Session for an upsell service purchase.
 */
export async function createUpsellCheckoutSession({
  bookingId,
  upsellOrderId,
  token,
  amountCents,
  currency,
  serviceName,
  serviceDescription,
  guestEmail,
}: {
  bookingId: string
  upsellOrderId: string
  token: string
  amountCents: number
  currency: string
  serviceName: string
  serviceDescription?: string | null
  guestEmail?: string | null
}): Promise<Stripe.Checkout.Session> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: guestEmail ?? undefined,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: {
            name: serviceName,
            description: serviceDescription ?? undefined,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: bookingId,
      upsell_order_id: upsellOrderId,
      token,
      type: 'upsell',
    },
    payment_intent_data: {
      metadata: {
        booking_id: bookingId,
        upsell_order_id: upsellOrderId,
        type: 'upsell',
      },
    },
    success_url: `${appUrl}/welcome?token=${token}&tab=concierge&upsell=success`,
    cancel_url:  `${appUrl}/welcome?token=${token}&tab=concierge`,
  })
}
