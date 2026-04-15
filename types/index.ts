// ─── Booking State Machine ───────────────────────────────────────────────────

export type BookingStatus =
  | 'pending'       // Magic link sent, guest not yet visited
  | 'unpaid'        // Guest opened portal; eco tax outstanding
  | 'paid'          // Eco tax confirmed; awaiting ID upload
  | 'verified'      // paid + id_uploaded → ACCESS UNLOCKED
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'

export type TransactionType   = 'eco_tax' | 'upsell'
export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'
export type UpsellCategory    = 'late_checkout' | 'transport' | 'cleaning' | 'experience' | 'provisioning' | 'other'
export type DocType           = 'passport' | 'drivers_license' | 'national_id' | 'other'
export type WebhookSource     = 'hostaway' | 'stripe'

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface Property {
  id: string
  name: string
  hostaway_listing_id: string
  // Encrypted fields (never returned raw to client)
  address_encrypted: string
  lat_encrypted: string
  lng_encrypted: string
  entry_code_encrypted: string
  wifi_ssid_encrypted: string | null
  wifi_password_encrypted: string | null
  house_rules_md: string | null
  hero_image_url: string | null
  welcome_message: string | null
  eco_tax_amount_cents: number
  eco_tax_currency: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Guest {
  id: string
  hostaway_guest_id: string | null
  full_name: string
  email: string | null
  phone_e164: string
  nationality: string | null
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  property_id: string
  guest_id: string
  hostaway_reservation_id: string
  status: BookingStatus
  id_uploaded: boolean
  check_in_date: string
  check_out_date: string
  num_guests: number
  nights: number
  eco_tax_amount_cents: number
  eco_tax_currency: string
  eco_tax_paid_at: string | null
  magic_link_sent_at: string | null
  twilio_message_sid: string | null
  portal_first_accessed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

export interface MagicToken {
  id: string
  booking_id: string
  token: string
  expires_at: string
  revoked_at: string | null
  last_used_at: string | null
  use_count: number
  created_at: string
}

export interface Transaction {
  id: string
  booking_id: string
  type: TransactionType
  status: TransactionStatus
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  amount_cents: number
  currency: string
  upsell_order_id: string | null
  stripe_metadata: Record<string, unknown> | null
  failed_reason: string | null
  created_at: string
  updated_at: string
}

export interface UpsellService {
  id: string
  property_id: string
  category: UpsellCategory
  name: string
  description: string | null
  price_cents: number
  currency: string
  image_url: string | null
  is_available: boolean
  sort_order: number
  max_per_booking: number
  created_at: string
  updated_at: string
}

export interface UpsellOrder {
  id: string
  booking_id: string
  upsell_service_id: string
  quantity: number
  unit_price_cents: number
  total_cents: number
  currency: string
  notes: string | null
  fulfilled_at: string | null
  created_at: string
}

export interface IdDocument {
  id: string
  booking_id: string
  doc_type: DocType
  storage_path: string
  file_size_bytes: number | null
  mime_type: string | null
  uploaded_at: string
  reviewed_at: string | null
  reviewer_notes: string | null
  is_rejected: boolean
}

// ─── API Response Types (client-safe, no sensitive data) ─────────────────────

export interface SanitizedBookingResponse {
  booking: {
    id: string
    status: BookingStatus
    id_uploaded: boolean
    check_in_date: string
    check_out_date: string
    num_guests: number
    nights: number
    eco_tax_amount_cents: number
    eco_tax_currency: string
  }
  property: {
    name: string
    hero_image_url: string | null
    welcome_message: string | null
    eco_tax_amount_cents: number
    eco_tax_currency: string
  }
  guest: {
    first_name: string
  }
}

export interface AccessRevealResponse {
  address: string
  google_maps_url: string
  entry_code: string
  wifi: {
    ssid: string
    password: string
  } | null
  house_rules_md: string | null
}

export interface StatusResponse {
  status: BookingStatus
  id_uploaded: boolean
  missing: Array<'payment' | 'id_upload'>
}

// ─── Webhook Payload Types ────────────────────────────────────────────────────

export interface HostawayReservationPayload {
  event: string
  data: {
    reservationId: string | number
    guestId: string | number
    listingId: string | number
    listingMapId?: string | number
    guestName: string
    guestEmail?: string
    phone?: string
    numberOfGuests: number
    arrivalDate: string   // YYYY-MM-DD
    departureDate: string // YYYY-MM-DD
    channelName?: string
  }
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export type GuestPortalView = 'loading' | 'error' | 'payment' | 'id_upload' | 'verified' | 'concierge'
