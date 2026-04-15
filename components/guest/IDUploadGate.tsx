'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DocType } from '@/types'

interface IDUploadGateProps {
  token: string
  onVerified: () => void
}

const DOC_TYPES: { value: DocType; label: string; icon: string }[] = [
  { value: 'passport',        label: 'Passport',          icon: '🛂' },
  { value: 'drivers_license', label: "Driver's License",  icon: '🪪' },
  { value: 'national_id',     label: 'National ID',       icon: '🪪' },
]

export function IDUploadGate({ token, onVerified }: IDUploadGateProps) {
  const [docType,   setDocType]   = useState<DocType>('passport')
  const [file,      setFile]      = useState<File | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setError(null)

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
      'image/jpeg':       ['.jpg', '.jpeg'],
      'image/png':        ['.png'],
      'image/webp':       ['.webp'],
      'application/pdf':  ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0]?.code
      if (reason === 'file-too-large') setError('File is too large. Maximum size is 10MB.')
      else setError('Invalid file type. Please upload a JPEG, PNG, WebP, or PDF.')
    },
  })

  async function handleUpload() {
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

      if (!res.ok) {
        setError(data.error ?? 'Upload failed. Please try again.')
        return
      }

      onVerified()
    } catch {
      setError('A network error occurred. Please check your connection.')
    } finally {
      setUploading(false)
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
          title="Identity Verification"
          subtitle="Upload a valid ID to unlock your property access"
          icon={<span className="text-haven-gold text-lg">🪪</span>}
        />

        {/* Doc type selector */}
        <div className="flex gap-2 mb-5">
          {DOC_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setDocType(type.value)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium transition-all duration-200 border ${
                docType === type.value
                  ? 'border-haven-gold bg-haven-gold/10 text-haven-gold'
                  : 'border-haven-border bg-transparent text-haven-muted hover:border-haven-gold/30'
              }`}
            >
              <span className="block text-base mb-0.5">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-6 text-center mb-5 ${
            isDragActive
              ? 'border-haven-gold bg-haven-gold/10'
              : file
              ? 'border-haven-success/50 bg-haven-success/5'
              : 'border-haven-border hover:border-haven-gold/30 bg-haven-surface'
          }`}
        >
          <input {...getInputProps()} />

          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="ID preview"
                  className="max-h-32 rounded-xl object-contain mx-auto"
                />
                <p className="text-haven-success text-xs font-medium">{file?.name}</p>
                <p className="text-haven-muted/60 text-xs">Tap to replace</p>
              </motion.div>
            ) : file ? (
              <motion.div
                key="file"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-4xl">📄</span>
                <p className="text-haven-success text-sm font-medium">{file.name}</p>
                <p className="text-haven-muted/60 text-xs">Tap to replace</p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-4xl">📷</span>
                <p className="text-haven-text text-sm font-medium">
                  {isDragActive ? 'Drop your document here' : 'Tap to upload your ID'}
                </p>
                <p className="text-haven-muted/60 text-xs">JPEG, PNG, WebP or PDF · Max 10MB</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <div className="bg-haven-error/10 border border-haven-error/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-haven-error text-sm">{error}</p>
          </div>
        )}

        <Button
          fullWidth
          size="lg"
          loading={uploading}
          disabled={!file}
          onClick={handleUpload}
        >
          Submit ID & Unlock Access
        </Button>

        <p className="text-haven-muted/50 text-xs text-center mt-3 leading-relaxed">
          Your document is encrypted and stored securely. It is only accessible to the property host and is deleted after your stay.
        </p>
      </Card>
    </motion.div>
  )
}
