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

// Progress steps shown above the main content
const STEPS = [
  { id: 'payment', label: 'Pay Tax',     icon: '💳' },
  { id: 'id',      label: 'Verify ID',   icon: '🪪' },
  { id: 'unlock',  label: 'Get Access',  icon: '🔓' },
]

export function GuestPortal({ token, initialBooking, defaultTab = 'checkin', onRefresh }: GuestPortalProps) {
  const [booking,    setBooking]    = useState(initialBooking)
  const [activeTab,  setActiveTab]  = useState<Tab>(defaultTab)
  const [refreshing, setRefreshing] = useState(false)

  const { booking: b, property } = booking
  const isPaid     = ['paid', 'verified', 'checked_in', 'checked_out'].includes(b.status)
  const isVerified = b.status === 'verified' || b.status === 'checked_in' || b.status === 'checked_out'

  const currentStep = !isPaid ? 0 : !isVerified ? 1 : 2

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }, [onRefresh])

  const handleIdVerified = useCallback(async () => {
    await handleRefresh()
  }, [handleRefresh])

  return (
    <div className="min-h-screen bg-haven-bg flex flex-col max-w-md mx-auto">
      {/* Header */}
      <BookingHeader booking={booking} />

      {/* Progress indicator */}
      {!isVerified && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="px-5 py-4"
        >
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const isComplete = i < currentStep
              const isActive   = i === currentStep
              return (
                <div key={step.id} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                        isComplete
                          ? 'bg-haven-success/20 border border-haven-success/50'
                          : isActive
                          ? 'bg-haven-gold/20 border border-haven-gold/50 animate-pulse-gold'
                          : 'bg-haven-surface border border-haven-border'
                      }`}
                    >
                      {isComplete ? (
                        <span className="text-haven-success text-xs">✓</span>
                      ) : (
                        <span>{step.icon}</span>
                      )}
                    </div>
                    <p
                      className={`text-[10px] mt-1 font-medium ${
                        isActive ? 'text-haven-gold' : isComplete ? 'text-haven-success' : 'text-haven-muted/40'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 mb-4 transition-colors duration-300 ${
                        i < currentStep ? 'bg-haven-success/40' : 'bg-haven-border'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Tab bar — shown after verification */}
      {isVerified && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-1 mx-5 my-4 p-1 bg-haven-surface rounded-2xl border border-haven-border"
        >
          {([
            { id: 'checkin',   label: 'My Stay',    icon: '🔓' },
            { id: 'concierge', label: 'Concierge',  icon: '🛎️' },
          ] as { id: Tab; label: string; icon: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-haven-gold/15 text-haven-gold border border-haven-gold/20'
                  : 'text-haven-muted hover:text-haven-text'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'checkin' && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="px-5 space-y-4 pb-8"
            >
              {/* Step content */}
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
                <IDUploadGate
                  token={token}
                  onVerified={handleIdVerified}
                />
              )}

              {isVerified && <AccessReveal token={token} />}
            </motion.div>
          )}

          {activeTab === 'concierge' && isVerified && (
            <motion.div
              key="concierge"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <UpsellMarketplace token={token} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-haven-border flex items-center justify-between">
        <p className="text-haven-muted/40 text-xs">
          Powered by <span className="text-haven-gold/50">HavenKey</span>
        </p>
        {refreshing ? (
          <span className="text-haven-muted/40 text-xs">Refreshing...</span>
        ) : (
          <button
            onClick={handleRefresh}
            className="text-haven-muted/40 text-xs hover:text-haven-muted transition-colors"
          >
            Refresh status
          </button>
        )}
      </div>
    </div>
  )
}
