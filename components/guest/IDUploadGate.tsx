'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Button } from '@/components/ui/Button'
import type { DocType } from '@/types'

interface IDUploadGateProps {
  token: string
  onVerified: () => Promise<void>
}

const DOC_TYPES: { value: DocType; label: string; icon: string }[] = [
  { value: 'passport',        label: 'Passport',        icon: '🛂' },
  { value: 'drivers_license', label: "Driver's License", icon: '🚗' },
  { value: 'national_id',     label: 'National ID',      icon: '🪪' },
]

export function IDUploadGate({ token, onVerified }: IDUploadGateProps) {
  const [docType,   setDocType]   = useState<DocType>('passport')
  const [file,      setFile]      = useState<File | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setError(null)
    if (rejected.length > 0) {
      const code = rejected[0]?.errors[0]?.code as string | undefined
      setError(
        code === 'file-too-large'
          ? 'File too large — maximum 10 MB.'
          : 'Invalid file type. Please upload JPEG, PNG, WebP, or PDF.'
      )
      return
    }
    const f = accepted[0]
    if (!f) return
    setFile(f)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png':  ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  })

  async function handleSubmit() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('token',    token)
      form.append('doc_type', docType)
      form.append('file',     file)
      const res  = await fetch('/api/guest/upload-id', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Upload failed. Please try again.'); return }
      await onVerified()
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setUploading(false)
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
          <span className="text-xl">🪪</span>
        </div>
        <div>
          <h2 className="text-haven-text font-semibold text-base">Identity Verification</h2>
          <p className="text-haven-muted text-xs mt-0.5">Upload a valid ID to unlock property access</p>
        </div>
      </div>

      {/* Doc type selector */}
      <div className="flex gap-2 mb-5">
        {DOC_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setDocType(t.value)}
            className={[
              'flex-1 py-3 px-2 rounded-2xl text-xs font-medium border transition-all duration-200 flex flex-col items-center gap-1',
              docType === t.value
                ? 'border-haven-gold/50 bg-haven-gold/10 text-haven-gold'
                : 'border-haven-border bg-haven-surface text-haven-muted hover:border-haven-gold/25',
            ].join(' ')}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={[
          'rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-200 mb-5',
          'flex flex-col items-center justify-center text-center py-8 px-6 min-h-[160px]',
          isDragActive
            ? 'border-haven-gold bg-haven-gold/10'
            : file
            ? 'border-haven-success/40 bg-haven-success/5'
            : 'border-haven-border bg-haven-surface hover:border-haven-gold/30',
        ].join(' ')}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="ID preview" className="max-h-28 rounded-xl object-contain" />
              <p className="text-haven-success text-xs font-medium">{file?.name}</p>
              <p className="text-haven-muted/50 text-[10px]">Tap to replace</p>
            </motion.div>
          ) : file ? (
            <motion.div key="pdf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
              <span className="text-4xl">📄</span>
              <p className="text-haven-success text-sm font-medium">{file.name}</p>
              <p className="text-haven-muted/50 text-[10px]">Tap to replace</p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
              <span className="text-4xl">{isDragActive ? '📂' : '📷'}</span>
              <p className="text-haven-text text-sm font-medium">
                {isDragActive ? 'Drop document here' : 'Tap to upload your ID'}
              </p>
              <p className="text-haven-muted/50 text-xs">JPEG · PNG · WebP · PDF &middot; Max 10 MB</p>
            </motion.div>
          )}
        </AnimatePresence>
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

      <Button fullWidth size="lg" loading={uploading} disabled={!file} onClick={handleSubmit}>
        Submit ID &amp; Unlock Access
      </Button>

      <p className="text-haven-muted/35 text-xs text-center mt-3 leading-relaxed">
        Your document is encrypted at rest and accessible only to the property host.
        It is deleted after your stay.
      </p>
    </motion.div>
  )
}
