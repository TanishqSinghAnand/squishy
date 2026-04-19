'use client'

import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Replace these values with your real AdSense publisher ID and slot IDs.
// Get them from: https://adsense.google.com → Ads → By ad unit
// ─────────────────────────────────────────────────────────────────────────────
export const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX'   // ← your publisher ID

// Ad slot IDs — create one "Display ad" per placement in your AdSense dashboard
export const AD_SLOTS = {
  belowHero:      '1111111111',  // Leaderboard / horizontal banner (728×90 or responsive)
  contentMiddle:  '2222222222',  // Rectangle (336×280 or responsive)
  footer:         '3333333333',  // Leaderboard / horizontal banner (728×90 or responsive)
} as const

type SlotKey = keyof typeof AD_SLOTS

interface AdSlotProps {
  slot: SlotKey
  /** Tailwind / inline style wrapper class */
  className?: string
  style?: React.CSSProperties
  /** ad format — default 'auto' (responsive) */
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical'
}

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

export function AdSlot({ slot, className, style, format = 'auto' }: AdSlotProps) {
  const ref = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    // Guard: only push once per mount; skip in non-browser / test envs
    if (pushed.current) return
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
      pushed.current = true
    } catch (e) {
      // AdSense not loaded yet — script will pick it up on its own
    }
  }, [])

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...style,
      }}
      aria-label="Advertisement"
    >
      <ins
        ref={ref}
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
