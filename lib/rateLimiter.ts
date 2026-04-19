/**
 * rateLimiter.ts
 *
 * Simple in-process sliding-window rate limiter using rate-limiter-flexible.
 * Limits: 20 compressions per IP per minute.
 *
 * For multi-instance / serverless deployments swap the Memory store for
 * a Redis store (rate-limiter-flexible supports Redis out of the box).
 */

import { RateLimiterMemory } from 'rate-limiter-flexible'

const limiter = new RateLimiterMemory({
  points: 20,          // max requests
  duration: 60,        // per 60 seconds
  blockDuration: 60,   // block for 60 s after exhaustion
})

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    const res = await limiter.consume(ip)
    return {
      allowed: true,
      remaining: res.remainingPoints ?? 0,
      resetInSeconds: Math.ceil((res.msBeforeNext ?? 0) / 1000),
    }
  } catch (err: any) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((err.msBeforeNext ?? 60_000) / 1000),
    }
  }
}
