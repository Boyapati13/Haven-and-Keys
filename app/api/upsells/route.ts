import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
    .select('property_id, status')
    .eq('id', magicToken.booking_id)
    .single()

  if (!booking || booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Fetch available services for this property
  const { data: services, error } = await supabase
    .from('upsell_services')
    .select('id, category, name, description, price_cents, currency, image_url, max_per_booking, sort_order')
    .eq('property_id', booking.property_id)
    .eq('is_available', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to load services' }, { status: 500 })
  }

  // Fetch already-purchased upsells for this booking so we can show purchased state in the UI
  const { data: purchasedOrders } = await supabase
    .from('upsell_orders')
    .select('upsell_service_id, quantity')
    .eq('booking_id', magicToken.booking_id)

  const purchasedMap = new Map<string, number>()
  for (const order of purchasedOrders ?? []) {
    const current = purchasedMap.get(order.upsell_service_id) ?? 0
    purchasedMap.set(order.upsell_service_id, current + order.quantity)
  }

  const enriched = (services ?? []).map((s) => ({
    ...s,
    purchased_quantity: purchasedMap.get(s.id) ?? 0,
    is_purchasable: (purchasedMap.get(s.id) ?? 0) < s.max_per_booking,
  }))

  return NextResponse.json({ services: enriched }, { headers: { 'Cache-Control': 'no-store' } })
}
