'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import type { AccessRevealResponse } from '@/types'

interface AccessRevealProps {
  token: string
}

export function AccessReveal({ token }: AccessRevealProps) {
  const [data,    setData]    = useState<AccessRevealResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/guest/access?token=${token}`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? 'Failed to load access information.')
          return
        }
        setData(json as AccessRevealResponse)
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* clipboard not available */ }
  }

  if (loading) {
    return <LoadingScreen message="Unlocking your access..." />
  }

  if (error || !data) {
    return (
      <div className="px-5 py-4">
        <Card>
          <p className="text-haven-error text-sm text-center">{error ?? 'Unable to load access details.'}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-5 space-y-4 pb-8">
      {/* Unlock celebration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="text-center py-6"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-5xl mb-3 inline-block"
        >
          🔓
        </motion.div>
        <h2 className="font-display text-2xl text-gold-shimmer">Access Unlocked</h2>
        <p className="text-haven-muted text-sm mt-1">Welcome to your home away from home</p>
      </motion.div>

      {/* Property Address */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card variant="gold" glow>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-haven-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📍</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-haven-muted/70 text-[10px] uppercase tracking-wider mb-1">Property Address</p>
                <p className="text-haven-text font-medium text-sm leading-relaxed">{data.address}</p>
              </div>
              <button
                onClick={() => copyToClipboard(data.address, 'address')}
                className="text-haven-muted hover:text-haven-gold transition-colors flex-shrink-0"
                aria-label="Copy address"
              >
                {copied === 'address' ? (
                  <span className="text-haven-success text-xs">✓</span>
                ) : (
                  <span className="text-sm">⎘</span>
                )}
              </button>
            </div>

            {/* Google Maps button */}
            <a
              href={data.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-haven-gold/10 border border-haven-gold/30 text-haven-gold text-sm font-medium hover:bg-haven-gold/20 transition-colors"
            >
              <span>🗺</span>
              Open in Google Maps
            </a>
          </Card>
        </motion.div>

        {/* Entry Code */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-haven-gold/10 border border-haven-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🔑</span>
              </div>
              <p className="text-haven-muted/70 text-xs uppercase tracking-wider">Entry Code</p>
            </div>
            <div className="flex items-center justify-between bg-haven-bg rounded-2xl px-5 py-4">
              <p className="font-mono text-3xl text-haven-gold tracking-[0.3em] font-semibold select-all">
                {data.entry_code}
              </p>
              <button
                onClick={() => copyToClipboard(data.entry_code, 'code')}
                className="text-haven-muted hover:text-haven-gold transition-colors ml-3"
                aria-label="Copy entry code"
              >
                {copied === 'code' ? (
                  <span className="text-haven-success text-xs font-medium">Copied!</span>
                ) : (
                  <span className="text-sm">⎘</span>
                )}
              </button>
            </div>
          </Card>
        </motion.div>

        {/* WiFi */}
        {data.wifi && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-haven-gold/10 border border-haven-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📶</span>
                </div>
                <p className="text-haven-muted/70 text-xs uppercase tracking-wider">WiFi Credentials</p>
              </div>
              <div className="space-y-3">
                <CredentialRow
                  label="Network"
                  value={data.wifi.ssid}
                  copied={copied === 'wifi_ssid'}
                  onCopy={() => copyToClipboard(data.wifi!.ssid, 'wifi_ssid')}
                />
                <CredentialRow
                  label="Password"
                  value={data.wifi.password}
                  copied={copied === 'wifi_pw'}
                  onCopy={() => copyToClipboard(data.wifi!.password, 'wifi_pw')}
                  mono
                />
              </div>
            </Card>
          </motion.div>
        )}

        {/* House Rules */}
        {data.house_rules_md && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
          >
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-haven-gold/10 border border-haven-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📋</span>
                </div>
                <p className="font-semibold text-haven-text text-sm">House Rules</p>
              </div>
              <div className="text-haven-muted text-sm leading-relaxed whitespace-pre-line">
                {data.house_rules_md}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
  mono = false,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between bg-haven-bg rounded-xl px-4 py-3">
      <div className="min-w-0">
        <p className="text-haven-muted/60 text-[10px] uppercase tracking-wider">{label}</p>
        <p className={`text-haven-text text-sm truncate mt-0.5 ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
      <button
        onClick={onCopy}
        className="text-haven-muted hover:text-haven-gold transition-colors ml-3 flex-shrink-0"
      >
        {copied ? (
          <span className="text-haven-success text-xs font-medium">✓</span>
        ) : (
          <span className="text-sm">⎘</span>
        )}
      </button>
    </div>
  )
}
