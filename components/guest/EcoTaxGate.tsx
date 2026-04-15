'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'

interface EcoTaxGateProps {
  token: string
  amountCents: number
  currency: string
  propertyName: string
  nights: number
}

export function EcoTaxGate({ token, amountCents, currency, propertyName, nights }: EcoTaxGateProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/guest/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to initiate payment.'); return }
      window.location.href = data.checkoutUrl
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.1, 0.64, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-haven-gold/10 border border-haven-gold/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🌿</span>
        </div>
        <div>
          <h2 className="text-haven-text font-semibold text-base">Eco Tourism Tax</h2>
          <p className="text-haven-muted text-xs mt-0.5">Required to unlock your property access</p>
        </div>
      </div>

      {/* Amount card */}
      <div className="rounded-3xl border border-haven-gold/25 bg-haven-gold/5 p-6 text-center mb-5">
        <p className="text-haven-muted/60 text-[10px] uppercase tracking-widest mb-2">Amount Due</p>
        <p className="font-display text-5xl font-semibold text-haven-gold leading-none">
          {formatCurrency(amountCents, currency)}
        </p>
        <p className="text-haven-muted/50 text-xs mt-3">
          {propertyName} &middot; {nights} night{nights !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Trust bullets */}
      <div className="space-y-2.5 mb-6">
        {[
          { icon: '⚖️', text: 'Mandatory local regulation for short-term rentals' },
          { icon: '🔒', text: 'Secure checkout powered by Stripe' },
          { icon: '✓',  text: 'One-time charge covering your entire stay' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-start gap-3">
            <span className="text-sm w-5 flex-shrink-0 text-center">{icon}</span>
            <p className="text-haven-muted text-sm leading-snug">{text}</p>
          </div>
        ))}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-haven-error/10 border border-haven-error/30 rounded-2xl px-4 py-3 mb-4"
        >
          <p className="text-haven-error text-sm">{error}</p>
        </motion.div>
      )}

      <Button fullWidth size="lg" loading={loading} onClick={handlePay}>
        Pay {formatCurrency(amountCents, currency)} Securely
      </Button>

      <p className="text-haven-muted/35 text-xs text-center mt-3 leading-relaxed">
        You&apos;ll be redirected to Stripe. Your card details are never stored by us.
      </p>
    </motion.div>
  )
}
