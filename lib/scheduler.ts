/**
 * scheduler.ts
 *
 * Starts a node-cron job that sweeps expired temp files every 5 minutes.
 * Uses a module-level singleton so it only registers once even if the module
 * is imported multiple times (Next.js hot-reload safe).
 *
 * Import this at the top of any API route that uses fileStore.
 */

import cron from 'node-cron'
import { sweepExpired } from './fileStore'

declare global {
  // eslint-disable-next-line no-var
  var __squishCronStarted: boolean | undefined
}

export function ensureCron() {
  if (global.__squishCronStarted) return
  global.__squishCronStarted = true

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    try {
      sweepExpired()
    } catch (err) {
      console.error('[squish] cron sweep error:', err)
    }
  })

  // Also run an immediate sweep on startup to clear any stale files
  sweepExpired()

  console.log('[squish] File cleanup cron started (every 5 min)')
}
