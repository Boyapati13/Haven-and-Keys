'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface EcoTaxGateProps {
  token: string
  amountCents: number
  currency: string
  propertyName: string
  nights: number
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function EcoTaxGate({
  token,
  amountCents,
  currency,
  propertyName,
  nights,
}: EcoTaxGateProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handlePayment() {
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('/api/guest/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to initiate payment. Please try again.')
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl
    } catch {
      setError('A network error occurred. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card>
        <CardHeader
          title="Eco Tourism Tax"
          subtitle="Required before accessing your property details"
          icon={<span className="text-haven-gold text-lg">🌿</span>}
        />

        {/* Amount display */}
        <div className="glass-gold rounded-2xl p-5 mb-5 text-center">
          <p className="text-haven-muted text-xs uppercase tracking-wider mb-1">Amount Due</p>
          <p className="font-display text-4xl text-haven-gold font-semibold">
            {formatCurrency(amountCents, currency)}
          </p>
          <p className="text-haven-muted/70 text-xs mt-1">
            {propertyName} · {nights} night{nights !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Info */}
        <div className="space-y-2 mb-6">
          {[
            'Mandatory local regulation for short-term rentals',
            'Secure payment powered by Stripe',
            'One-time charge for your entire stay',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <span className="text-haven-success text-sm mt-0.5 flex-shrink-0">✓</span>
              <p className="text-haven-muted text-sm">{item}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-haven-error/10 border border-haven-error/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-haven-error text-sm">{error}</p>
          </div>
        )}

        <Button
          fullWidth
          size="lg"
          loading={loading}
          onClick={handlePayment}
        >
          Pay {formatCurrency(amountCents, currency)} Securely
        </Button>

        <p className="text-haven-muted/50 text-xs text-center mt-3">
          You will be redirected to Stripe. Your card details are never stored by us.
        </p>
      </Card>
    </motion.div>
  )
}
