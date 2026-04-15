'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatStayDate } from '@/lib/utils'
import type { SanitizedBookingResponse } from '@/types'

interface BookingHeaderProps {
  booking: SanitizedBookingResponse
}

export function BookingHeader({ booking }: BookingHeaderProps) {
  const { booking: b, property, guest } = booking

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
    >
      {/* Hero image */}
      <div className="relative w-full h-56 overflow-hidden">
        {property.hero_image_url ? (
          <Image
            src={property.hero_image_url}
            alt={property.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-haven-surface via-haven-bg to-[#0D0C0A]" />
        )}

        {/* Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-haven-bg via-haven-bg/50 to-transparent" />

        {/* Brand */}
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-xs text-gold-shimmer tracking-[0.3em] uppercase"
          >
            HavenKey
          </motion.p>
          <StatusBadge status={b.status} />
        </div>
      </div>

      {/* Info block */}
      <div className="px-5 pt-4 pb-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="font-display text-[1.65rem] leading-tight text-haven-text">
            Welcome, {guest.first_name}
          </h1>
          <p className="text-haven-gold text-sm font-medium mt-0.5">{property.name}</p>

          {property.welcome_message && (
            <p className="text-haven-muted text-sm mt-3 leading-relaxed border-l-2 border-haven-gold/25 pl-3">
              {property.welcome_message}
            </p>
          )}

          {/* Stay meta row */}
          <div className="flex items-stretch gap-3 mt-4">
            <StayPill label="Check-in"  value={formatStayDate(b.check_in_date)} />
            <div className="w-px bg-haven-border self-stretch" />
            <StayPill label="Check-out" value={formatStayDate(b.check_out_date)} />
            <div className="w-px bg-haven-border self-stretch" />
            <StayPill
              label="Guests"
              value={`${b.num_guests} ${b.num_guests === 1 ? 'guest' : 'guests'}`}
            />
          </div>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-haven-border" />
    </motion.header>
  )
}

function StayPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-haven-muted/50 mb-0.5">{label}</p>
      <p className="text-haven-text text-xs font-medium truncate">{value}</p>
    </div>
  )
}
