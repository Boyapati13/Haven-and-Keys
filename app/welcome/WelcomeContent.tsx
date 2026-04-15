'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { GuestPortal } from '@/components/guest/GuestPortal'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import type { SanitizedBookingResponse, BookingStatus } from '@/types'

export function WelcomeContent() {
  const searchParams = useSearchParams()
  const token        = searchParams.get('token')
  const paymentParam = searchParams.get('payment')
  const tabParam     = searchParams.get('tab')

  const [booking,  setBooking]  = useState<SanitizedBookingResponse | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [polling,  setPolling]  = useState(false)

  const fetchBooking = useCallback(async () => {
    if (!token) {
      setError('No check-in link detected. Please use the link sent to your WhatsApp.')
      setLoading(false)
      return
    }
    try {
      const res  = await fetch(`/api/guest/booking?token=${token}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Unable to load your booking.')
        return
      }
      setBooking(data as SanitizedBookingResponse)
    } catch {
      setError('A network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  /**
   * After Stripe redirects back with ?payment=success, we poll /api/guest/status
   * until the Stripe webhook has landed and advanced the booking state.
   */
  const pollAfterPayment = useCallback(async () => {
    if (!token) return
    setPolling(true)

    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 2500))
      try {
        const res  = await fetch(`/api/guest/status?token=${token}`, { cache: 'no-store' })
        const data = await res.json()
        if (res.ok && (data.status as BookingStatus) !== 'unpaid') {
          setPolling(false)
          await fetchBooking()
          return
        }
      } catch { /* continue polling */ }
    }

    setPolling(false)
    await fetchBooking()
  }, [token, fetchBooking])

  useEffect(() => {
    if (paymentParam === 'success') {
      pollAfterPayment()
    } else {
      fetchBooking()
    }
  }, [fetchBooking, pollAfterPayment, paymentParam])

  if (loading || polling) {
    return (
      <LoadingScreen
        message={polling ? 'Confirming your payment...' : 'Preparing your experience...'}
      />
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-haven-bg flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="max-w-sm w-full"
        >
          {/* Lock icon */}
          <div className="w-20 h-20 rounded-full border border-haven-border bg-haven-surface flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl">🔒</span>
          </div>

          <h1 className="font-display text-2xl text-haven-text mb-3">Link Unavailable</h1>
          <p className="text-haven-muted text-sm leading-relaxed">
            {error ?? 'This link could not be found. Please use the original link sent to your WhatsApp.'}
          </p>

          <div className="mt-10 pt-6 border-t border-haven-border">
            <p className="text-haven-muted/40 text-xs">
              Having trouble?{' '}
              <span className="text-haven-gold/60">Contact your host directly.</span>
            </p>
            <p className="text-haven-muted/30 text-[10px] mt-2">Powered by HavenKey Concierge</p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <GuestPortal
      token={token!}
      initialBooking={booking}
      defaultTab={tabParam === 'concierge' ? 'concierge' : 'checkin'}
      onRefresh={fetchBooking}
    />
  )
}
