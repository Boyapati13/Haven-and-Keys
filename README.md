# HavenKey Concierge

A fully automated, branded **Guest Experience & Compliance Platform** for Haven and Keys luxury short-term rentals. Functions as a "Digital Sentry" — property access details are cryptographically locked until guests complete compliance requirements (Eco Tax payment + ID verification).

## Architecture

```
Hostaway PMS ──webhook──► Next.js API ──► Supabase (state machine)
                                    └──► Twilio (WhatsApp magic link)

Guest opens link
  └──► Pay Eco Tax (Stripe Checkout)
  └──► Upload ID (Supabase Storage / private)
  └──► Access Unlocked (AES-256 decrypted server-side)
  └──► Upsell Marketplace (Stripe Checkout per service)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Framer Motion |
| Backend | Next.js API Routes (Event-Driven) |
| Database | Supabase (PostgreSQL + Storage) |
| Payments | Stripe Checkout |
| Messaging | Twilio WhatsApp API |
| PMS | Hostaway Webhooks |

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── webhooks/hostaway/    # Reservation ingestion (HMAC verified)
│   │   ├── webhooks/stripe/      # Payment confirmation
│   │   ├── guest/booking/        # Sanitized booking data (no secrets)
│   │   ├── guest/initiate-payment/
│   │   ├── guest/upload-id/
│   │   ├── guest/access/         # Decrypted access data (verified only)
│   │   ├── guest/status/
│   │   └── upsells/
│   └── welcome/                  # Guest portal (token-gated SPA)
├── components/
│   ├── guest/                    # Portal UI: Header, Gates, Reveal, Marketplace
│   └── ui/                       # Button, Card, LoadingScreen, StatusBadge
├── lib/
│   ├── supabase/                 # Server + client Supabase clients
│   ├── stripe.ts                 # Checkout session factories
│   ├── twilio.ts                 # WhatsApp dispatch
│   ├── crypto.ts                 # Token generation, HMAC verification
│   └── encryption.ts             # AES-256-GCM encrypt/decrypt
├── supabase/migrations/          # Full SQL schema with state-machine triggers
└── types/index.ts
```

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/Boyapati13/Haven-and-Keys.git
cd Haven-and-Keys
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`. See `.env.example` for the full list.

**Generate your encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Supabase

1. Create a new Supabase project
2. Run migrations in order via the Supabase SQL editor or CLI:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_helpers.sql`
3. Create the private `id-vault` storage bucket:
   ```sql
   INSERT INTO storage.buckets (id, name, public) VALUES ('id-vault', 'id-vault', FALSE);
   ```

### 4. Stripe

1. Configure a Webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
2. Subscribe to: `checkout.session.completed`, `payment_intent.payment_failed`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Twilio

1. Set up a WhatsApp Sender (sandbox or approved number)
2. Optionally create a Content Template for the branded message
3. Set `TWILIO_WHATSAPP_FROM` and optionally `TWILIO_CONTENT_SID`

### 6. Hostaway

1. Hostaway → Settings → Webhooks → Add URL: `https://yourdomain.com/api/webhooks/hostaway`
2. Subscribe to `reservation.created`
3. Copy the HMAC secret to `HOSTAWAY_WEBHOOK_SECRET`

### 7. Run

```bash
npm run dev
```

## Security Architecture

| Threat | Mitigation |
|--------|-----------|
| URL guessing | 64-char hex token = 2^256 space |
| Duplicate webhook processing | `webhook_events` UNIQUE(source, event_id) |
| Premature access reveal | Server-side hard assert: `status === 'verified'` |
| DB breach | AES-256-GCM application-layer encryption |
| Client intercepting secrets | Decryption only in server memory, never in client JS |
| File upload abuse | MIME validation, 10MB limit, private bucket |

## Booking State Machine

```
pending ──(portal opened)──► unpaid
unpaid  ──(stripe paid)────► paid
paid    ──(ID uploaded)────► verified  ← ACCESS UNLOCKED
```

The `verified` transition is enforced by a PostgreSQL trigger — not scattered application code.

## Adding a Property

Encrypt each sensitive field before inserting into the database:

```typescript
import { encrypt } from '@/lib/encryption'

const row = {
  name: 'Villa Azura, Mykonos',
  hostaway_listing_id: 'your-listing-id',
  address_encrypted:        encrypt('123 Cliff Road, Mykonos Town'),
  lat_encrypted:            encrypt('37.4467'),
  lng_encrypted:            encrypt('25.3289'),
  entry_code_encrypted:     encrypt('4829'),
  wifi_ssid_encrypted:      encrypt('VillaAzura_Guest'),
  wifi_password_encrypted:  encrypt('Welcome2025!'),
  eco_tax_amount_cents:     1500,
  eco_tax_currency:         'eur',
}
```
