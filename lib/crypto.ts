import { randomBytes, createHmac, timingSafeEqual } from 'crypto'

/**
 * Generates a cryptographically secure magic token.
 * 32 random bytes encoded as a 64-character hex string.
 * Resistant to URL-guessing attacks: 2^256 possible values.
 */
export function generateMagicToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Verifies a Hostaway HMAC-SHA256 webhook signature.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param rawBody   - The raw, unparsed request body as a string
 * @param signature - The value of the X-Hostaway-Signature header
 * @param secret    - Your Hostaway webhook secret
 */
export function verifyHostawaySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex')

    const expectedBuf = Buffer.from(expected, 'hex')
    const actualBuf   = Buffer.from(signature, 'hex')

    if (expectedBuf.length !== actualBuf.length) return false
    return timingSafeEqual(expectedBuf, actualBuf)
  } catch {
    return false
  }
}

/**
 * Sanitizes a phone number to E.164 format.
 * Handles common formats: 07911123456, +447911123456, 447911123456
 * This is a basic sanitizer — use a dedicated library (libphonenumber-js)
 * for production-grade validation across all locales.
 */
export function sanitizePhoneToE164(raw: string, defaultCountryCode = '+1'): string {
  const digits = raw.replace(/\D/g, '')

  // Already has country code (most international numbers are 11-15 digits)
  if (digits.length >= 11) {
    return `+${digits}`
  }

  // UK mobile: 07xxx → +447xxx
  if (digits.startsWith('07') && digits.length === 11) {
    return `+44${digits.slice(1)}`
  }

  // Fallback: prepend default country code
  return `${defaultCountryCode}${digits}`
}
