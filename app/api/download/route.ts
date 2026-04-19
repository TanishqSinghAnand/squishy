/**
 * GET /api/download?id=<fileId>
 *
 * Serves a previously compressed file from temporary storage.
 * The file is deleted 10 minutes after it was created (via fileStore TTL).
 * Returns 404 if the file has already expired or never existed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFile } from '@/lib/fileStore'
import { ensureCron } from '@/lib/scheduler'

export const runtime = 'nodejs'

ensureCron()

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')

  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid or missing file ID.' }, { status: 400 })
  }

  const entry = getFile(id)

  if (!entry) {
    return NextResponse.json(
      {
        error: 'File not found or has expired.',
        hint: 'Files are automatically deleted 10 minutes after compression. Please compress your image again.',
      },
      { status: 404 }
    )
  }

  return new NextResponse(entry.buffer, {
    headers: {
      'Content-Type': entry.mimeType,
      'Content-Disposition': `attachment; filename="${entry.originalName}"`,
      'Content-Length': String(entry.buffer.length),
      'Cache-Control': 'private, no-store',
      'X-Expires-At': String(entry.expiresAt),
    },
  })
}
