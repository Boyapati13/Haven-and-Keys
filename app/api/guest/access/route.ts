import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import type { AccessRevealResponse } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token')

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
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
    .select('id, status, id_uploaded, property_id')
    .eq('id', magicToken.booking_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // ── THE CRITICAL GATE — hard server-side assertion ────────────────────────
  // Access data is NEVER sent to the client until both conditions are met.
  if (booking.status !== 'verified') {
    const missing: string[] = []
    if (!['paid', 'verified', 'checked_in', 'checked_out'].includes(booking.status)) {
      missing.push('payment')
    }
    if (!booking.id_uploaded) {
      missing.push('id_upload')
    }
    return NextResponse.json(
      {
        error: 'Access requirements not met',
        missing,
        status: booking.status,
      },
      { status: 403 }
    )
  }

  // ── Fetch encrypted property data ─────────────────────────────────────────
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select(`
      address_encrypted,
      lat_encrypted,
      lng_encrypted,
      entry_code_encrypted,
      wifi_ssid_encrypted,
      wifi_password_encrypted,
      house_rules_md
    `)
    .eq('id', booking.property_id)
    .single()

  if (propError || !property) {
    console.error('[Access] Failed to fetch property:', propError)
    return NextResponse.json({ error: 'Property data unavailable' }, { status: 500 })
  }

  // ── Decrypt sensitive fields in server memory ─────────────────────────────
  let address: string
  let lat: string
  let lng: string
  let entryCode: string

  try {
    address   = decrypt(property.address_encrypted)
    lat       = decrypt(property.lat_encrypted)
    lng       = decrypt(property.lng_encrypted)
    entryCode = decrypt(property.entry_code_encrypted)
  } catch (err) {
    console.error('[Access] Decryption failed:', err)
    return NextResponse.json({ error: 'Failed to decrypt property data' }, { status: 500 })
  }

  const wifi =
    property.wifi_ssid_encrypted && property.wifi_password_encrypted
      ? {
          ssid:     decrypt(property.wifi_ssid_encrypted),
          password: decrypt(property.wifi_password_encrypted),
        }
      : null

  // ── Build response ────────────────────────────────────────────────────────
  const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`

  const response: AccessRevealResponse = {
    address,
    google_maps_url: googleMapsUrl,
    entry_code: entryCode,
    wifi,
    house_rules_md: property.house_rules_md ?? null,
  }

  // CRITICAL: No caching on this response — ever
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Surrogate-Control': 'no-store',
    },
  })
}
