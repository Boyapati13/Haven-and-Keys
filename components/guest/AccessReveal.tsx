'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import type { AccessRevealResponse } from '@/types'

interface AccessRevealProps {
  token: string
}

const cardVariants = {
  hidden:  { opacity: 0, y: 32, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: 0.35 + i * 0.14, duration: 0.55, ease: [0.34, 1.1, 0.64, 1] },
  }),
}

export function AccessReveal({ token }: AccessRevealProps) {
  const [data,    setData]    = useState<AccessRevealResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/guest/access?token=${token}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d as AccessRevealResponse)
      })
      .catch(() => setError('Failed to load access details.'))
      .finally(() => setLoading(false))
  }, [token])

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2500)
    } catch { /* clipboard unavailable */ }
  }

  if (loading) return <LoadingScreen message="Unlocking your access…" />
  if (error || !data) {
    return (
      <div className="rounded-3xl bg-haven-surface border border-haven-border p-6 text-center">
        <p className="text-haven-error text-sm">{error ?? 'Unable to load access details.'}</p>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <div className="space-y-4">
        {/* ── Unlock celebration ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="text-center py-6"
        >
          <div className="relative inline-flex items-center justify-center">
            {/* Gold glow ring */}
            <motion.div
              className="absolute w-24 h-24 rounded-full bg-haven-gold/10"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              className="relative text-5xl block"
              animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
              transition={{ delay: 0.4, duration: 0.7 }}
            >
              🔓
            </motion.span>
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="font-display text-2xl text-gold-shimmer mt-4"
          >
            Access Unlocked
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-haven-muted text-sm mt-1"
          >
            Welcome to your home away from home
          </motion.p>
        </motion.div>

        {/* ── Address ──────────────────────────────────────────────────── */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-3xl border border-haven-gold/25 bg-haven-gold/5 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-haven-gold/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📍</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-haven-muted/60 mb-1">Property Address</p>
              <p className="text-haven-text text-sm font-medium leading-relaxed">{data.address}</p>
            </div>
            <CopyButton text={data.address} id="address" copied={copied} onCopy={copy} />
          </div>

          <a
            href={data.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-haven-gold/15 border border-haven-gold/30 text-haven-gold text-sm font-medium active:scale-[0.98] transition-transform"
          >
            <span>🗺</span>
            Open in Google Maps
          </a>
        </motion.div>

        {/* ── Entry Code ───────────────────────────────────────────────── */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-3xl bg-haven-surface border border-haven-border p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-haven-gold/10 border border-haven-gold/20 flex items-center justify-center">
              <span className="text-lg">🔑</span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-haven-muted/60">Entry Code</p>
          </div>
          <div className="bg-haven-bg rounded-2xl px-5 py-4 flex items-center justify-between">
            <span className="font-mono text-3xl text-haven-gold tracking-[0.35em] select-all">
              {data.entry_code}
            </span>
            <CopyButton text={data.entry_code} id="code" copied={copied} onCopy={copy} large />
          </div>
        </motion.div>

        {/* ── WiFi ─────────────────────────────────────────────────────── */}
        {data.wifi && (
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-3xl bg-haven-surface border border-haven-border p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-haven-gold/10 border border-haven-gold/20 flex items-center justify-center">
                <span className="text-lg">📶</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-haven-muted/60">WiFi Credentials</p>
            </div>
            <div className="space-y-2">
              <CredRow label="Network"  value={data.wifi.ssid}     id="ssid" copied={copied} onCopy={copy} />
              <CredRow label="Password" value={data.wifi.password} id="wifi" copied={copied} onCopy={copy} mono />
            </div>
          </motion.div>
        )}

        {/* ── House Rules ──────────────────────────────────────────────── */}
        {data.house_rules_md && (
          <motion.div
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-3xl bg-haven-surface border border-haven-border p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-haven-gold/10 border border-haven-gold/20 flex items-center justify-center">
                <span className="text-lg">📋</span>
              </div>
              <p className="font-semibold text-haven-text text-sm">House Rules</p>
            </div>
            <div className="text-haven-muted text-sm leading-relaxed whitespace-pre-line">
              {data.house_rules_md}
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CopyButton({
  text, id, copied, onCopy, large = false,
}: {
  text: string; id: string; copied: string | null
  onCopy: (t: string, k: string) => void; large?: boolean
}) {
  const done = copied === id
  return (
    <button
      onClick={() => onCopy(text, id)}
      aria-label="Copy"
      className={[
        'flex-shrink-0 transition-colors',
        done ? 'text-haven-success' : 'text-haven-muted/50 hover:text-haven-gold',
        large ? 'text-xl' : 'text-sm',
      ].join(' ')}
    >
      {done ? '✓' : '⎘'}
    </button>
  )
}

function CredRow({
  label, value, id, copied, onCopy, mono = false,
}: {
  label: string; value: string; id: string
  copied: string | null; onCopy: (t: string, k: string) => void; mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between bg-haven-bg rounded-xl px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-haven-muted/50">{label}</p>
        <p className={['text-haven-text text-sm truncate mt-0.5', mono ? 'font-mono' : ''].join(' ')}>
          {value}
        </p>
      </div>
      <CopyButton text={value} id={id} copied={copied} onCopy={onCopy} />
    </div>
  )
}
