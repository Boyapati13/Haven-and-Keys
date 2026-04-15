-- ============================================================
-- Helper Functions
-- ============================================================

-- Increment magic_tokens.use_count atomically
CREATE OR REPLACE FUNCTION increment_token_use_count(token_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE magic_tokens
  SET    use_count = use_count + 1,
         last_used_at = NOW()
  WHERE  id = token_id;
END;
$$;

-- Seed: example property (for development)
-- Replace encrypted values with actual AES-256-GCM encrypted strings from your app
-- INSERT INTO properties (
--   name, hostaway_listing_id,
--   address_encrypted, lat_encrypted, lng_encrypted,
--   entry_code_encrypted, wifi_ssid_encrypted, wifi_password_encrypted,
--   house_rules_md, welcome_message, eco_tax_amount_cents, eco_tax_currency
-- ) VALUES (
--   'Villa Azura, Mykonos',
--   'hostaway-listing-001',
--   '<encrypted_address>',
--   '<encrypted_lat>',
--   '<encrypted_lng>',
--   '<encrypted_entry_code>',
--   '<encrypted_wifi_ssid>',
--   '<encrypted_wifi_password>',
--   E'• No smoking inside\n• Quiet hours: 10pm–8am\n• No parties or events\n• Respect the neighbours',
--   'We hope you enjoy your stay. Feel free to reach out if you need anything.',
--   1500,
--   'eur'
-- );
