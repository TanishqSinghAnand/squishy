'use client'

import { useState, useEffect } from 'react'

// ─── Privacy Consent Banner ───────────────────────────────────────────────────

export function PrivacyBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if not already acknowledged in this session
    const ack = sessionStorage.getItem('squish-privacy-ack')
    if (!ack) setVisible(true)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem('squish-privacy-ack', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="banner"
      aria-live="polite"
      style={{
        background: '#1e293b',
        color: '#e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0, flex: 1, minWidth: 260 }}>
        <strong style={{ color: '#fff' }}>Your privacy:</strong>{' '}
        Images are processed on our server and{' '}
        <strong style={{ color: '#93c5fd' }}>permanently deleted after 10 minutes</strong>.
        We never store, share, or view your files.
        By using Squish you agree to our{' '}
        <a href="/privacy" style={{ color: '#93c5fd', textDecoration: 'underline' }}>Privacy Policy</a>
        {' '}and{' '}
        <a href="/terms" style={{ color: '#93c5fd', textDecoration: 'underline' }}>Terms of Service</a>.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss privacy notice"
        style={{
          background: '#3b82f6', color: '#fff', border: 'none',
          borderRadius: 6, padding: '6px 16px', fontSize: 13,
          fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          fontFamily: 'inherit',
        }}
      >
        Got it
      </button>
    </div>
  )
}

// ─── File Expiry Countdown ────────────────────────────────────────────────────

interface ExpiryCountdownProps {
  expiresAt: number   // epoch ms
  onExpired: () => void
}

export function ExpiryCountdown({ expiresAt, onExpired }: ExpiryCountdownProps) {
  const [secsLeft, setSecsLeft] = useState(() => Math.max(0, Math.round((expiresAt - Date.now()) / 1000)))

  useEffect(() => {
    if (secsLeft <= 0) { onExpired(); return }
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((expiresAt - Date.now()) / 1000))
      setSecsLeft(s)
      if (s <= 0) { clearInterval(t); onExpired() }
    }, 1000)
    return () => clearInterval(t)
  }, [expiresAt, onExpired])

  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const isUrgent = secsLeft <= 60
  const isExpired = secsLeft === 0

  if (isExpired) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11.5, color: 'var(--error)', fontWeight: 500,
      }}>
        <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor">
          <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6 3.5v3M6 8.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Expired — please re-compress
      </span>
    )
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11.5, fontWeight: 500,
      color: isUrgent ? 'var(--error)' : 'var(--text2)',
    }}>
      <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="6" cy="6" r="5"/>
        <path d="M6 3v3l2 1"/>
      </svg>
      File deleted in {mins}:{String(secs).padStart(2, '0')}
    </span>
  )
}

// ─── Quality Degradation Warning ──────────────────────────────────────────────

interface QualityWarningProps {
  originalKB: number
  targetKB: number
  quality?: number
}

export function QualityWarning({ originalKB, targetKB, quality }: QualityWarningProps) {
  const ratio = targetKB / originalKB

  if (ratio >= 0.7) return null // Minor compression, no warning needed

  const isExtreme = ratio < 0.1 || (quality !== undefined && quality <= 5)
  const isHigh = ratio < 0.3

  if (!isExtreme && !isHigh) return null

  return (
    <div
      role="alert"
      style={{
        display: 'flex', gap: 8, alignItems: 'flex-start',
        padding: '10px 12px', borderRadius: 7,
        background: isExtreme ? 'var(--error-light)' : '#fffbeb',
        border: `1px solid ${isExtreme ? '#fecaca' : '#fde68a'}`,
        fontSize: 12.5, lineHeight: 1.5,
        color: isExtreme ? 'var(--error)' : '#92400e',
        marginTop: 8,
      }}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
        <path d="M8 2L1.5 13.5h13L8 2z"/>
        <path d="M8 6v3.5M8 11h.01"/>
      </svg>
      <span>
        {isExtreme
          ? <><strong>Significant quality loss expected.</strong> You&apos;re compressing to {Math.round(ratio * 100)}% of the original size. The image may appear blurry or pixelated.</>
          : <><strong>Noticeable quality reduction.</strong> The target is significantly smaller than the original. Some detail may be lost.</>
        }
      </span>
    </div>
  )
}

// ─── Format Warning (PNG to JPEG lossy) ──────────────────────────────────────

interface FormatWarningProps {
  inputMime: string
  outputFormat: string
}

export function FormatWarning({ inputMime, outputFormat }: FormatWarningProps) {
  const isLossyConversion =
    (inputMime.includes('png') && outputFormat === 'jpeg') ||
    (inputMime.includes('png') && outputFormat === 'jpeg')

  if (!isLossyConversion) return null

  return (
    <div
      role="note"
      style={{
        display: 'flex', gap: 8, alignItems: 'flex-start',
        padding: '8px 12px', borderRadius: 7,
        background: '#eff6ff', border: '1px solid #bfdbfe',
        fontSize: 12, color: '#1e40af', marginTop: 6,
      }}
    >
      <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 5v4M8 10.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      Converting PNG → JPEG removes the transparency channel. Transparent areas will become white.
    </div>
  )
}

// ─── Processing Notice (shown while compressing) ──────────────────────────────

export function ProcessingNotice() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '9px 12px', borderRadius: 7,
        background: 'var(--accent-light)', border: '1px solid #bfdbfe',
        fontSize: 12.5, color: 'var(--accent)',
      }}
    >
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="8" cy="8" r="6"/>
        <path d="M8 5v3l2 1"/>
      </svg>
      Your image is being processed securely. It will be auto-deleted in 10 minutes.
    </div>
  )
}

// ─── File Size Warning (>50MB) ────────────────────────────────────────────────

interface FileSizeWarningProps {
  fileSizeMB: number
}

export function FileSizeWarning({ fileSizeMB }: FileSizeWarningProps) {
  if (fileSizeMB <= 50) return null

  return (
    <div
      role="alert"
      style={{
        display: 'flex', gap: 8, alignItems: 'flex-start',
        padding: '9px 12px', borderRadius: 7,
        background: 'var(--error-light)', border: '1px solid #fecaca',
        fontSize: 12.5, color: 'var(--error)',
      }}
    >
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
        <path d="M8 2L1.5 13.5h13L8 2z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 6v3.5M8 11h.01" strokeLinecap="round"/>
      </svg>
      File exceeds the 50 MB upload limit ({fileSizeMB.toFixed(1)} MB).
    </div>
  )
}
