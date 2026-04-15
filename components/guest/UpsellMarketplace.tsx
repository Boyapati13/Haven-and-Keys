'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

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
  late_checkout:  '🌙',
  transport:      '🚗',
  cleaning:       '🧹',
  experience:     '✨',
  provisioning:   '🛒',
  other:          '⭐',
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function UpsellMarketplace({ token }: UpsellMarketplaceProps) {
  const [services,  setServices]  = useState<UpsellService[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    async function fetchServices() {
      try {
        const res  = await fetch(`/api/upsells?token=${token}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Could not load concierge services.')
          return
        }
        setServices(data.services ?? [])
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [token])

  async function handlePurchase(serviceId: string) {
    setPurchasing(serviceId)
    try {
      const res  = await fetch('/api/upsells/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, upsell_service_id: serviceId, quantity: 1 }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Could not process your request.')
        return
      }
      window.location.href = data.checkoutUrl
    } catch {
      alert('A network error occurred. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="px-5 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-haven-surface rounded-3xl animate-pulse border border-haven-border" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-5">
        <Card>
          <p className="text-haven-error text-sm text-center">{error}</p>
        </Card>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="px-5">
        <Card>
          <div className="text-center py-4">
            <span className="text-4xl block mb-3">🛎️</span>
            <p className="text-haven-muted text-sm">No concierge services available for your stay.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-5 space-y-3 pb-8">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-haven-muted text-xs uppercase tracking-widest px-1"
      >
        Available Services
      </motion.p>

      {services.map((service, i) => (
        <motion.div
          key={service.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
        >
          <Card className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-haven-gold/10 border border-haven-gold/15 flex items-center justify-center flex-shrink-0 text-xl">
              {CATEGORY_ICONS[service.category] ?? '⭐'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-haven-text font-semibold text-sm leading-tight">{service.name}</p>
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
                    Purchased · {service.purchased_quantity}×
                  </span>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={purchasing === service.id}
                  disabled={!service.is_purchasable}
                  onClick={() => handlePurchase(service.id)}
                >
                  {service.is_purchasable ? 'Add to Stay' : 'Unavailable'}
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
