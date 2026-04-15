'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'

interface UpsellService {
  id: string
  category: string
  name: string
  description: string | null
  price_cents: number
  currency: string
  image_url: string | null
  max_per_booking: number
  purchased_quantity: number
  is_purchasable: boolean
}

interface UpsellMarketplaceProps {
  token: string
}

const CATEGORY_ICONS: Record<string, string> = {
  late_checkout: '🌙',
  transport:     '🚗',
  cleaning:      '🧹',
  experience:    '✨',
  provisioning:  '🛒',
  other:         '⭐',
}

const CATEGORY_LABELS: Record<string, string> = {
  late_checkout: 'Late Check-out',
  transport:     'Transport',
  cleaning:      'Cleaning',
  experience:    'Experience',
  provisioning:  'Provisions',
  other:         'Services',
}

export function UpsellMarketplace({ token }: UpsellMarketplaceProps) {
  const [services,   setServices]   = useState<UpsellService[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/upsells?token=${token}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setServices(d.services ?? [])
      })
      .catch(() => setError('Failed to load services.'))
      .finally(() => setLoading(false))
  }, [token])

  async function purchase(serviceId: string) {
    setPurchasing(serviceId)
    try {
      const res  = await fetch('/api/upsells/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, upsell_service_id: serviceId, quantity: 1 }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? 'Could not process request.'); return }
      window.location.href = data.checkoutUrl
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="px-5 space-y-3 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-haven-surface rounded-3xl animate-pulse border border-haven-border" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-5 pt-2">
        <div className="rounded-3xl bg-haven-surface border border-haven-border p-6 text-center">
          <p className="text-haven-error text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="px-5 pt-2">
        <div className="rounded-3xl bg-haven-surface border border-haven-border p-8 text-center">
          <span className="text-4xl block mb-3">🛎</span>
          <p className="text-haven-text font-semibold text-sm mb-1">No services available</p>
          <p className="text-haven-muted text-xs">Concierge services for this property are coming soon.</p>
        </div>
      </div>
    )
  }

  // Group by category
  const grouped = services.reduce<Record<string, UpsellService[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})

  return (
    <div className="px-5 space-y-6">
      {Object.entries(grouped).map(([category, items], groupIdx) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIdx * 0.08, duration: 0.4 }}
        >
          {/* Category header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{CATEGORY_ICONS[category] ?? '⭐'}</span>
            <p className="text-[10px] uppercase tracking-widest text-haven-muted/60 font-medium">
              {CATEGORY_LABELS[category] ?? category}
            </p>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {items.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIdx * 0.08 + i * 0.06, duration: 0.35 }}
                  className="rounded-3xl bg-haven-surface border border-haven-border p-5 flex items-start gap-4"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-haven-gold/10 border border-haven-gold/15 flex items-center justify-center flex-shrink-0 text-xl">
                    {CATEGORY_ICONS[service.category] ?? '⭐'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-haven-text font-semibold text-sm leading-snug">
                        {service.name}
                      </p>
                      <p className="text-haven-gold font-semibold text-sm flex-shrink-0">
                        {formatCurrency(service.price_cents, service.currency)}
                      </p>
                    </div>
                    {service.description && (
                      <p className="text-haven-muted text-xs leading-relaxed mb-3 line-clamp-2">
                        {service.description}
                      </p>
                    )}

                    {service.purchased_quantity > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-haven-success" />
                        <span className="text-haven-success text-xs font-medium">
                          Added to your stay
                          {service.purchased_quantity > 1 && ` ×${service.purchased_quantity}`}
                        </span>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={purchasing === service.id}
                        disabled={!service.is_purchasable}
                        onClick={() => purchase(service.id)}
                      >
                        {service.is_purchasable ? 'Add to Stay' : 'Max reached'}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
