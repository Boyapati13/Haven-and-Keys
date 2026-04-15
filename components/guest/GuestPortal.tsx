'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookingHeader } from './BookingHeader'
import { EcoTaxGate } from './EcoTaxGate'
import { IDUploadGate } from './IDUploadGate'
import { AccessReveal } from './AccessReveal'
import { UpsellMarketplace } from './UpsellMarketplace'
import type { SanitizedBookingResponse } from '@/types'

interface GuestPortalProps {
  token: string
  initialBooking: SanitizedBookingResponse
  defaultTab?: 'checkin' | 'concierge'
  onRefresh: () => Promise<void>
}

type Tab = 'checkin' | 'concierge'

const STEPS = [
  { key: 'payment', label: 'Eco Tax',    icon: '💳' },
  { key: 'id',      label: 'Verify ID',  icon: '🪪' },
  { key: 'unlock',  label: 'Get Access', icon: '🔓' },
]

export function GuestPortal({ token, initialBooking, defaultTab = 'checkin', onRefresh }: GuestPortalProps) {
  const [booking,    setBooking]    = useState(initialBooking)
  const [activeTab,  setActiveTab]  = useState<Tab>(defaultTab)
  const [refreshing, setRefreshing] = useState(false)

  const { booking: b, property } = booking
  const isPaid     = ['paid', 'verified', 'checked_in', 'checked_out'].includes(b.status)
  const isVerified = ['verified', 'checked_in', 'checked_out'].includes(b.status)
  const currentStep = !isPaid ? 0 : !isVerified ? 1 : 2

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }, [onRefresh])

  return (
    <div className="min-h-screen bg-haven-bg flex flex-col max-w-md mx-auto relative">
      {/* Hero + booking info */}
      <BookingHeader booking={booking} />

      {/* ── Progress stepper (pre-verified only) ─────────────────────────── */}
      <AnimatePresence>
        {!isVerified && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="px-5 pt-2 pb-1"
          >
            <div className="flex items-center">
              {STEPS.map((step, i) => {
                const done   = i < currentStep
                const active = i === currentStep
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center min-w-0">
                      <div
                        className={[
                          'w-10 h-10 rounded-full flex items-center justify-center text-base transition-all duration-500 border',
                          done   ? 'bg-haven-success/15 border-haven-success/40 text-haven-success'  : '',
                          active ? 'bg-haven-gold/15 border-haven-gold/50 shadow-gold-glow-sm'       : '',
                          !done && !active ? 'bg-haven-surface border-haven-border opacity-40'       : '',
                        ].join(' ')}
                      >
                        {done ? '✓' : step.icon}
                      </div>
                      <span
                        className={[
                          'text-[10px] mt-1 font-medium tracking-wide transition-colors duration-300',
                          done   ? 'text-haven-success'      : '',
                          active ? 'text-haven-gold'         : '',
                          !done && !active ? 'text-haven-muted/30' : '',
                        ].join(' ')}
                      >
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={[
                          'flex-1 h-px mx-3 mb-5 transition-all duration-500',
                          done ? 'bg-haven-success/30' : 'bg-haven-border',
                        ].join(' ')}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab bar (post-verified only) ─────────────────────────────────── */}
      <AnimatePresence>
        {isVerified && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-5 my-3 p-1 bg-haven-surface rounded-2xl border border-haven-border flex gap-1"
          >
            {([
              { id: 'checkin',   label: 'My Stay',   icon: '🏠' },
              { id: 'concierge', label: 'Concierge', icon: '🛎' },
            ] as { id: Tab; label: string; icon: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  activeTab === tab.id
                    ? 'bg-haven-gold/15 text-haven-gold border border-haven-gold/25 shadow-gold-glow-sm'
                    : 'text-haven-muted hover:text-haven-text',
                ].join(' ')}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-none">
        <AnimatePresence mode="wait">
          {/* Check-in flow */}
          {activeTab === 'checkin' && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22 }}
              className="px-5 pt-2 pb-10 space-y-4"
            >
              {!isPaid && (
                <EcoTaxGate
                  token={token}
                  amountCents={property.eco_tax_amount_cents}
                  currency={property.eco_tax_currency}
                  propertyName={property.name}
                  nights={b.nights}
                />
              )}
              {isPaid && !isVerified && (
                <IDUploadGate token={token} onVerified={handleRefresh} />
              )}
              {isVerified && <AccessReveal token={token} />}
            </motion.div>
          )}

          {/* Concierge marketplace */}
          {activeTab === 'concierge' && isVerified && (
            <motion.div
              key="concierge"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
              className="pt-2 pb-10"
            >
              <UpsellMarketplace token={token} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-haven-border flex items-center justify-between bg-haven-bg">
        <p className="text-haven-muted/30 text-xs">
          Powered by <span className="text-haven-gold/40">HavenKey</span>
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-haven-muted/40 text-xs hover:text-haven-muted transition-colors disabled:opacity-30"
        >
          {refreshing ? 'Refreshing…' : 'Refresh status'}
        </button>
      </div>
    </div>
  )
}
