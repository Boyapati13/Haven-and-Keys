import twilio from 'twilio'

let _client: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!_client) {
    const sid   = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    if (!sid || !token) throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN')
    _client = twilio(sid, token)
  }
  return _client
}

/**
 * Sends the magic link to a guest via WhatsApp using a Twilio Content Template.
 * The template should include the {{1}} variable mapped to the guest's name
 * and {{2}} mapped to the magic link URL.
 */
export async function sendMagicLinkWhatsApp({
  toPhone,
  guestFirstName,
  magicLinkUrl,
  propertyName,
}: {
  toPhone: string
  guestFirstName: string
  magicLinkUrl: string
  propertyName: string
}): Promise<string> {
  const client      = getClient()
  const from        = process.env.TWILIO_WHATSAPP_FROM!
  const contentSid  = process.env.TWILIO_CONTENT_SID

  // If a Content Template SID is configured, use the branded template
  if (contentSid) {
    const message = await client.messages.create({
      from,
      to: `whatsapp:${toPhone}`,
      contentSid,
      contentVariables: JSON.stringify({
        '1': guestFirstName,
        '2': propertyName,
        '3': magicLinkUrl,
      }),
    })
    return message.sid
  }

  // Fallback: plain text message (for development/sandbox)
  const body = [
    `Hello ${guestFirstName}! Welcome to ${propertyName} 🏡`,
    ``,
    `Complete your guest check-in here:`,
    `${magicLinkUrl}`,
    ``,
    `This link is personal to you and expires at checkout. Please do not share it.`,
    ``,
    `— Haven and Keys`,
  ].join('\n')

  const message = await client.messages.create({
    from,
    to: `whatsapp:${toPhone}`,
    body,
  })
  return message.sid
}
