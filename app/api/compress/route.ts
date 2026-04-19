import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { checkRateLimit } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

// ─── Compression logic ────────────────────────────────────────────────────────

async function compressToTargetSize(
  inputBuffer: Buffer,
  format: 'jpeg' | 'png' | 'webp',
  targetBytes: number,
): Promise<{ buffer: Buffer; quality: number; iterations: number }> {
  if (format === 'png') {
    let lo = 0, hi = 9, bestBuffer = inputBuffer, bestLevel = 0
    for (let i = 0; i < 10; i++) {
      const level = Math.floor((lo + hi) / 2)
      const buf = await sharp(inputBuffer).png({ compressionLevel: level, adaptiveFiltering: true }).toBuffer()
      if (buf.length <= targetBytes) { bestBuffer = buf; bestLevel = level; hi = level - 1 }
      else lo = level + 1
      if (lo > hi) break
    }
    if (bestBuffer.length > targetBytes) {
      const meta = await sharp(inputBuffer).metadata()
      for (let iter = 0; iter < 12; iter++) {
        const scale = Math.sqrt(targetBytes / bestBuffer.length) * 0.95
        const w = Math.max(1, Math.round((meta.width || 100) * scale))
        const h = Math.max(1, Math.round((meta.height || 100) * scale))
        bestBuffer = await sharp(inputBuffer).resize(w, h, { fit: 'inside' }).png({ compressionLevel: 9 }).toBuffer()
        if (bestBuffer.length <= targetBytes) break
      }
    }
    return { buffer: bestBuffer, quality: bestLevel, iterations: 10 }
  }

  let lo = 1, hi = 95, bestBuffer = inputBuffer, bestQuality = 1, iterations = 0
  while (lo <= hi) {
    iterations++
    const mid = Math.floor((lo + hi) / 2)
    const buf = format === 'webp'
      ? await sharp(inputBuffer).webp({ quality: mid }).toBuffer()
      : await sharp(inputBuffer).jpeg({ quality: mid, mozjpeg: true }).toBuffer()
    if (buf.length <= targetBytes) { bestBuffer = buf; bestQuality = mid; lo = mid + 1 }
    else hi = mid - 1
  }

  if (bestBuffer.length > targetBytes || bestQuality === 1) {
    const meta = await sharp(inputBuffer).metadata()
    let tryBuf = await sharp(inputBuffer).jpeg({ quality: 1, mozjpeg: true }).toBuffer()
    if (tryBuf.length > targetBytes) {
      let scale = 0.9
      for (let i = 0; i < 15; i++) {
        const w = Math.max(1, Math.round((meta.width || 100) * scale))
        const h = Math.max(1, Math.round((meta.height || 100) * scale))
        const resized = sharp(inputBuffer).resize(w, h, { fit: 'inside' })
        tryBuf = format === 'webp'
          ? await resized.webp({ quality: 20 }).toBuffer()
          : await resized.jpeg({ quality: 20, mozjpeg: true }).toBuffer()
        if (tryBuf.length <= targetBytes) { bestBuffer = tryBuf; break }
        scale *= 0.85
      }
    } else {
      bestBuffer = tryBuf; bestQuality = 1
    }
  }
  return { buffer: bestBuffer, quality: bestQuality, iterations }
}

// ─── POST /api/compress ───────────────────────────────────────────────────────
// Returns the compressed image BINARY directly in the response body.
// The client receives it as a blob, creates a local object URL, and
// auto-downloads it — no separate /api/download round-trip needed.
// This is the only approach that works on serverless platforms (Vercel)
// where /tmp files do not persist between function invocations.

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'

  const rl = await checkRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please wait ${rl.resetInSeconds} seconds.` },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const targetKB = parseInt(formData.get('targetKB') as string || '100')
    const outputFormat = (formData.get('outputFormat') as string || 'auto') as 'auto' | 'jpeg' | 'png' | 'webp'

    if (!file)
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    if (!file.type.startsWith('image/'))
      return NextResponse.json(
        { error: 'Only image files are accepted (PNG, JPEG, WebP, GIF, BMP, TIFF).' },
        { status: 415 }
      )

    if (file.size > MAX_BYTES)
      return NextResponse.json(
        { error: `File too large. Max 50 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.` },
        { status: 413 }
      )

    if (isNaN(targetKB) || targetKB < 1 || targetKB > 50000)
      return NextResponse.json(
        { error: 'Target size must be between 1 KB and 50,000 KB.' },
        { status: 400 }
      )

    const inputBuffer = Buffer.from(await file.arrayBuffer())
    const originalSizeKB = Math.round(inputBuffer.length / 1024)
    const targetBytes = targetKB * 1024

    const mime = file.type.toLowerCase()
    let format: 'jpeg' | 'png' | 'webp'
    if (outputFormat === 'auto') {
      if (mime.includes('png')) format = 'png'
      else if (mime.includes('webp')) format = 'webp'
      else format = 'jpeg'
    } else {
      format = outputFormat
    }

    const meta = await sharp(inputBuffer).metadata()
    const { buffer, quality, iterations } = await compressToTargetSize(inputBuffer, format, targetBytes)

    const finalSizeKB = Math.round(buffer.length / 1024)
    const compressionRatio = ((1 - buffer.length / inputBuffer.length) * 100).toFixed(1)

    const mimeMap: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
    const extMap: Record<string, string>  = { jpeg: 'jpg', png: 'png', webp: 'webp' }
    const originalName = file.name.replace(/\.[^.]+$/, '')
    const downloadName = `${originalName}_squished.${extMap[format]}`

    // Return compressed binary directly — works on serverless (no /tmp persistence needed)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeMap[format],
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, no-store',
        // Metadata passed via headers so the client can display stats
        'X-Original-Size': String(originalSizeKB),
        'X-Final-Size': String(finalSizeKB),
        'X-Compression-Ratio': compressionRatio,
        'X-Quality': String(quality),
        'X-Iterations': String(iterations),
        'X-Width': String(meta.width || 0),
        'X-Height': String(meta.height || 0),
        'X-Format': format,
        'X-Download-Name': downloadName,
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    })
  } catch (err: any) {
    console.error('[squish] Compression error:', err)
    return NextResponse.json(
      { error: 'Compression failed. The file may be corrupted or in an unsupported format.' },
      { status: 500 }
    )
  }
}