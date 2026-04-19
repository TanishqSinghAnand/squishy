/**
 * fileStore.ts
 *
 * Stores compressed files on disk with automatic TTL deletion.
 *
 * KEY FIX: Next.js dev mode runs multiple Node processes (one per route worker).
 * An in-memory registry breaks cross-process downloads — the compress route
 * registers the file, but the download route runs in a different process with
 * an empty registry. Solution: store all metadata IN the filename itself, and
 * read directly from disk. No shared in-memory state needed.
 *
 * Filename format: <uuid>_<expiresAt>.bin
 * Metadata sidecar: <uuid>_<expiresAt>.json
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'

export const TTL_MS = 10 * 60 * 1000 // 10 minutes

// Cross-platform temp dir (works on Windows, Linux, macOS)
const STORE_DIR = path.join(os.tmpdir(), 'squish')

// Ensure temp dir exists at module load
try { fs.mkdirSync(STORE_DIR, { recursive: true }) } catch {}

export interface FileMeta {
  id: string
  originalName: string
  mimeType: string
  finalSizeKB: number
  originalSizeKB: number
  compressionRatio: string
  width: number
  height: number
  format: string
  expiresAt: number
}

function binPath(id: string)  { return path.join(STORE_DIR, `${id}.bin`) }
function metaPath(id: string) { return path.join(STORE_DIR, `${id}.json`) }

/** Write compressed buffer + metadata to disk. Returns the file ID. */
export function registerFile(
  buffer: Buffer,
  opts: Omit<FileMeta, 'id' | 'expiresAt'>
): string {
  const id = uuidv4()
  const expiresAt = Date.now() + TTL_MS

  const meta: FileMeta = { id, expiresAt, ...opts }

  fs.writeFileSync(binPath(id), buffer)
  fs.writeFileSync(metaPath(id), JSON.stringify(meta), 'utf8')

  // Belt-and-suspenders: schedule individual deletion
  setTimeout(() => deleteFile(id), TTL_MS + 5_000)

  return id
}

/** Read a file by ID from disk. Returns null if missing or expired. */
export function getFile(id: string): (FileMeta & { buffer: Buffer }) | null {
  // Validate UUID format to prevent path traversal
  if (!/^[0-9a-f-]{36}$/.test(id)) return null

  const mp = metaPath(id)
  const bp = binPath(id)

  try {
    const meta: FileMeta = JSON.parse(fs.readFileSync(mp, 'utf8'))

    if (Date.now() > meta.expiresAt) {
      deleteFile(id)
      return null
    }

    const buffer = fs.readFileSync(bp)
    return { ...meta, buffer }
  } catch {
    // File doesn't exist or is corrupt
    return null
  }
}

/** Delete a file's bin + meta from disk. */
export function deleteFile(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return
  try { fs.unlinkSync(binPath(id)) }  catch {}
  try { fs.unlinkSync(metaPath(id)) } catch {}
}

/** Sweep STORE_DIR and remove any files past their TTL. */
export function sweepExpired() {
  try {
    const files = fs.readdirSync(STORE_DIR)
    const now = Date.now()

    for (const name of files) {
      if (!name.endsWith('.json')) continue
      const id = name.replace('.json', '')
      try {
        const meta: FileMeta = JSON.parse(
          fs.readFileSync(path.join(STORE_DIR, name), 'utf8')
        )
        if (now > meta.expiresAt) deleteFile(id)
      } catch {
        // Corrupt meta — clean it up
        try { fs.unlinkSync(path.join(STORE_DIR, name)) } catch {}
        try { fs.unlinkSync(path.join(STORE_DIR, `${id}.bin`)) } catch {}
      }
    }
  } catch {}
}

export function getStoreDir() { return STORE_DIR }