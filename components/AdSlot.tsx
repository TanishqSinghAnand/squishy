'use client'

import { useEffect, useRef } from 'react'

// ─── Values are read from environment variables ───────────────────────────────
// Set these in:
//   Local dev  → .env.local
//   Vercel     → Project Settings → Environment Variables
//
// NEXT_PUBLIC_ADSENSE_CLIENT   = ca-pub-XXXXXXXXXXXXXXXX
// NEXT_PUBLIC_AD_SLOT_HERO     = 1111111111
// NEXT_PUBLIC_AD_SLOT_MIDDLE   = 2222222222
// NEXT_PUBLIC_AD_SLOT_FOOTER   = 3333333333
// ─────────────────────────────────────────────────────────────────────────────

export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? ''

export const AD_SLOTS = {
  belowHero:    process.env.NEXT_PUBLIC_AD_SLOT_HERO   ?? '',
  contentMiddle: process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE ?? '',
  footer:       process.env.NEXT_PUBLIC_AD_SLOT_FOOTER  ?? '',
} as const

type SlotKey = keyof typeof AD_SLOTS

interface AdSlotProps {
  slot: SlotKey
  className?: string
  style?: React.CSSProperties
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical'
}

declare global {
  interface Window { adsbygoogle: unknown[] }
}

export function AdSlot({ slot, className, style, format = 'auto' }: AdSlotProps) {
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    // Don't push if env vars aren't configured yet
    if (!ADSENSE_CLIENT || !AD_SLOTS[slot]) return
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
      pushed.current = true
    } catch {}
  }, [slot])

  // Don't render anything if env vars are missing (e.g. local dev without .env.local)
  if (!ADSENSE_CLIENT || !AD_SLOTS[slot]) return null

  return (
    <div
      className={className}
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', ...style }}
      aria-label="Advertisement"
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={AD_SLOTS[slot]}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}