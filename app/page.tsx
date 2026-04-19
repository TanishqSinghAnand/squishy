'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { AdSlot } from '@/components/AdSlot'
import {
  PrivacyBanner,
  ExpiryCountdown,
  QualityWarning,
  FormatWarning,
  ProcessingNotice,
  FileSizeWarning,
} from '@/components/Warnings'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileResult {
  id: string
  file: File
  preview: string
  status: 'idle' | 'compressing' | 'done' | 'error'
  originalSize: number   // KB
  // populated after compression:
  fileId?: string
  expiresAt?: number     // epoch ms
  finalSize?: number
  compressionRatio?: string
  quality?: number
  width?: number
  height?: number
  format?: string
  downloadName?: string
  expired?: boolean
  error?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [50, 100, 200, 500, 1000, 2000]
const FORMATS = [
  { value: 'auto', label: 'Auto' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png',  label: 'PNG'  },
  { value: 'webp', label: 'WebP' },
]
const MAX_FILE_MB = 50

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKB(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M3 8l3.5 3.5L13 4.5" />
    </svg>
  )
}

function FileRow({
  item,
  targetKB,
  outputFormat,
  onRemove,
  onExpired,
}: {
  item: FileResult
  targetKB: number
  outputFormat: string
  onRemove: () => void
  onExpired: () => void
}) {
  const fileMB = item.file.size / 1024 / 1024

  const downloadUrl = item.fileId
    ? `/api/download?id=${item.fileId}`
    : undefined

  return (
    <div className="card fade-up" style={{ padding: '14px 16px', animationFillMode: 'both' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Thumbnail */}
        <div style={{
          width: 56, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
          background: 'var(--surface2)', border: '1px solid var(--border)', position: 'relative',
        }}>
          <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {item.status === 'compressing' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          )}
          {item.status === 'done' && !item.expired && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(240,253,244,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <CheckIcon />
            </div>
          )}
          {item.expired && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(254,242,242,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)' }}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Filename + remove */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.file.name}
            </p>
            <button
              onClick={onRemove}
              aria-label="Remove file"
              style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}
            >
              <svg viewBox="0 0 12 12" width="10" height="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11"/></svg>
            </button>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7, alignItems: 'center' }}>
            <span className="badge badge-default">{fmtKB(item.originalSize)}</span>
            {item.width ? <span className="badge badge-default">{item.width}×{item.height}</span> : null}
            {item.format ? <span className="badge badge-default">{item.format.toUpperCase()}</span> : null}

            {item.status === 'done' && !item.expired && item.finalSize !== undefined && (
              <>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>
                <span className="badge badge-green">{fmtKB(item.finalSize)}</span>
                {item.compressionRatio && parseFloat(item.compressionRatio) > 0 && (
                  <span className="badge badge-green">−{item.compressionRatio}%</span>
                )}
              </>
            )}
            {item.status === 'error' && (
              <span className="badge badge-red">{item.error || 'Compression failed'}</span>
            )}
          </div>

          {/* File-size warning */}
          {fileMB > MAX_FILE_MB && <FileSizeWarning fileSizeMB={fileMB} />}

          {/* Quality degradation warning (shown before/after compression) */}
          {item.status !== 'error' && (
            <QualityWarning
              originalKB={item.originalSize}
              targetKB={targetKB}
              quality={item.quality}
            />
          )}

          {/* Format conversion note */}
          <FormatWarning inputMime={item.file.type} outputFormat={outputFormat} />

          {/* Processing notice */}
          {item.status === 'compressing' && <div style={{ marginTop: 8 }}><ProcessingNotice /></div>}

          {/* Download + expiry */}
          {item.status === 'done' && !item.expired && downloadUrl && item.expiresAt && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <a
                href={downloadUrl}
                download={item.downloadName}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
              >
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 2v8M5 7l3 3 3-3M2 12h12"/>
                </svg>
                Download
              </a>
              <ExpiryCountdown expiresAt={item.expiresAt} onExpired={onExpired} />
            </div>
          )}

          {item.expired && (
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--error)' }}>
              File deleted from our servers. Re-compress to download again.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [files, setFiles]       = useState<FileResult[]>([])
  const [targetKB, setTargetKB] = useState(100)
  const [inputVal, setInputVal] = useState('100')
  const [format, setFormat]     = useState('auto')
  const [compressing, setComp]  = useState(false)
  const counter = useRef(0)

  const onDrop = useCallback((accepted: File[]) => {
    const items: FileResult[] = accepted.map(f => ({
      id: `f-${counter.current++}`,
      file: f,
      preview: URL.createObjectURL(f),
      status: 'idle',
      originalSize: Math.round(f.size / 1024),
    }))
    setFiles(prev => [...prev, ...items])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif', '.avif'] },
    multiple: true,
    maxSize: MAX_FILE_MB * 1024 * 1024,
    onDropRejected: (rejections) => {
      const items: FileResult[] = rejections.map(r => ({
        id: `f-${counter.current++}`,
        file: r.file,
        preview: '',
        status: 'error',
        originalSize: Math.round(r.file.size / 1024),
        error: r.errors[0]?.code === 'file-too-large'
          ? `File too large (max ${MAX_FILE_MB} MB)`
          : r.errors[0]?.message || 'Rejected',
      }))
      setFiles(prev => [...prev, ...items])
    },
  })

  const compressOne = async (item: FileResult): Promise<FileResult> => {
    const fd = new FormData()
    fd.append('file', item.file)
    fd.append('targetKB', targetKB.toString())
    fd.append('outputFormat', format)

    const res = await fetch('/api/compress', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      return { ...item, status: 'error', error: data.error || 'Compression failed' }
    }

    return {
      ...item,
      status: 'done',
      fileId: data.fileId,
      expiresAt: data.expiresAt,
      finalSize: data.finalSizeKB,
      compressionRatio: data.compressionRatio,
      quality: data.quality,
      width: data.width,
      height: data.height,
      format: data.format,
      downloadName: data.downloadName,
    }
  }

  const handleCompress = async () => {
    const pending = files.filter(f => f.status === 'idle' || f.status === 'error')
    if (!pending.length) return
    setComp(true)
    setFiles(prev => prev.map(f => pending.find(p => p.id === f.id) ? { ...f, status: 'compressing', error: undefined } : f))
    for (let i = 0; i < pending.length; i += 3) {
      const chunk = pending.slice(i, i + 3)
      const results = await Promise.all(chunk.map(compressOne))
      setFiles(prev => prev.map(f => results.find(r => r.id === f.id) || f))
    }
    setComp(false)
  }

  const handleDownloadAll = () => {
    files.filter(f => f.status === 'done' && !f.expired && f.fileId).forEach(f => {
      const a = document.createElement('a')
      a.href = `/api/download?id=${f.fileId}`
      a.download = f.downloadName || 'compressed'
      a.click()
    })
  }

  const markExpired = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, expired: true } : f))
  }

  const setKB = (v: number) => { setTargetKB(v); setInputVal(String(v)) }

  const idleCount = files.filter(f => f.status === 'idle' || f.status === 'error').length
  const doneCount = files.filter(f => f.status === 'done' && !f.expired).length
  const doneFiles = files.filter(f => f.status === 'done')
  const totalSaved = doneFiles.reduce((a, f) => a + f.originalSize - (f.finalSize || 0), 0)

  return (
    <>
      {/* Privacy consent banner */}
      <PrivacyBanner />

      {/* ── HEADER ── */}
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/>
              <rect x="11" y="3" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="3" y="11" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white" opacity="0.3"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Squish</span>
        </a>
        <nav aria-label="Supported formats" style={{ fontSize: 12, color: 'var(--muted)' }}>
          PNG · JPEG · WebP · GIF · BMP · TIFF
        </nav>
      </header>

      <main>
        {/* ── HERO ── */}
        <section aria-labelledby="hero-heading" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '48px 24px 40px', textAlign: 'center' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h1 id="hero-heading" style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2, fontFamily: "'Instrument Serif', serif" }}>
              Compress images to{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>any file size</em>
            </h1>
            <p style={{ marginTop: 12, fontSize: 15, color: 'var(--text2)', lineHeight: 1.6 }}>
              Set a target in KB — like 50 KB or 100 KB — and we'll compress your image to exactly that.
              Free, private, no sign-up. Files auto-deleted in 10 minutes.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              {['No watermarks', 'No registration', 'Auto-deleted in 10 min', 'Batch compress'].map(t => (
                <span key={t} className="badge badge-default">{t}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── AD: Below Hero ── */}
        <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 24px' }}>
          <AdSlot slot="belowHero" format="horizontal" style={{ maxWidth: 980, margin: '0 auto', minHeight: 90 }} />
        </div>

        {/* ── TOOL ── */}
        <section aria-label="Image compression tool" style={{ maxWidth: 980, margin: '0 auto', padding: '32px 20px', display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

          {/* LEFT: Settings */}
          <aside aria-label="Compression settings" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Target size */}
            <div className="card" style={{ padding: 20 }}>
              <p className="section-label" style={{ marginBottom: 14 }}>Target File Size</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" value={inputVal} min={1} max={50000}
                  aria-label="Target file size in kilobytes"
                  className="input-field"
                  style={{ fontSize: 22, fontWeight: 600, color: 'var(--accent)', padding: '10px 14px' }}
                  onChange={e => {
                    setInputVal(e.target.value)
                    const v = parseInt(e.target.value)
                    if (!isNaN(v) && v >= 1 && v <= 50000) setTargetKB(v)
                  }}
                />
                <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500, whiteSpace: 'nowrap' }}>KB</span>
              </div>
              <input type="range" min={10} max={5000} step={10} value={Math.min(targetKB, 5000)}
                aria-label="Adjust target size" onChange={e => setKB(+e.target.value)} style={{ marginTop: 14 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                <span>10 KB</span><span>5 MB</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginTop: 16 }}>
                {PRESETS.map(p => (
                  <button key={p} onClick={() => setKB(p)} className={`preset-btn${targetKB === p ? ' active' : ''}`}>
                    {p >= 1000 ? `${p / 1024}MB` : `${p}KB`}
                  </button>
                ))}
              </div>
            </div>

            {/* Output format */}
            <div className="card" style={{ padding: 20 }}>
              <p className="section-label" style={{ marginBottom: 14 }}>Output Format</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                {FORMATS.map(f => (
                  <button key={f.value} onClick={() => setFormat(f.value)} className={`preset-btn${format === f.value ? ' active' : ''}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              {format === 'auto' && (
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Keeps the original format when possible.</p>
              )}
            </div>

            {/* Privacy notice (static inline) */}
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--text2)', lineHeight: 1.6,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M8 2L3 4.5v4C3 11.5 5.5 14 8 15c2.5-1 5-3.5 5-6.5v-4L8 2z"/>
              </svg>
              <span>
                <strong style={{ color: 'var(--text)' }}>Privacy guaranteed.</strong> Files are processed in memory, stored temporarily, and{' '}
                <strong>auto-deleted after 10 minutes</strong>. We never access or retain your images.
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <button onClick={handleCompress} disabled={idleCount === 0 || compressing} className="btn-primary" style={{ width: '100%', padding: '11px 20px', fontSize: 14 }}>
                {compressing ? (
                  <><div className="spinner" style={{ borderTopColor: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.25)' }} /> Compressing…</>
                ) : (
                  <>
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M8 2v8M5 7l3 3 3-3M2 12h12"/>
                    </svg>
                    Compress {idleCount > 0 ? `${idleCount} ` : ''}Image{idleCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
              {doneCount > 0 && (
                <button onClick={handleDownloadAll} className="btn-secondary" style={{ width: '100%' }}>
                  Download All ({doneCount})
                </button>
              )}
              {files.length > 0 && (
                <button onClick={() => setFiles([])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', padding: '4px 0', fontFamily: 'inherit' }}>
                  Clear all
                </button>
              )}
            </div>

            {/* Session stats */}
            {doneCount > 0 && (
              <div className="card" style={{ padding: 18 }}>
                <p className="section-label" style={{ marginBottom: 12 }}>Session Results</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['Images compressed', doneCount],
                    ['Total original',    fmtKB(doneFiles.reduce((a, f) => a + f.originalSize, 0))],
                    ['Total compressed',  fmtKB(doneFiles.reduce((a, f) => a + (f.finalSize || 0), 0))],
                    ['Total saved',       fmtKB(totalSaved)],
                  ].map(([label, value]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text2)' }}>{label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* RIGHT: Drop zone + file list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              {...getRootProps()}
              role="button"
              aria-label="Upload images by clicking or dragging and dropping"
              className={`drop-zone${isDragActive ? ' active' : ''}`}
              style={{ padding: '40px 24px', textAlign: 'center' }}
            >
              <input {...getInputProps()} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={isDragActive ? 'var(--accent)' : 'var(--muted)'} strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontWeight: 500, color: isDragActive ? 'var(--accent)' : 'var(--text)', fontSize: 14 }}>
                    {isDragActive ? 'Drop files here' : 'Click to upload or drag & drop'}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    PNG, JPEG, WebP, GIF, BMP, TIFF · Max {MAX_FILE_MB} MB per file
                  </p>
                </div>
              </div>
            </div>

            {files.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Upload images above to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {files.map((item, i) => (
                  <div key={item.id} style={{ animationDelay: `${i * 40}ms` }}>
                    <FileRow
                      item={item}
                      targetKB={targetKB}
                      outputFormat={format}
                      onRemove={() => setFiles(prev => prev.filter(f => f.id !== item.id))}
                      onExpired={() => markExpired(item.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section aria-labelledby="how-heading" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '56px 24px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <h2 id="how-heading" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 32, textAlign: 'center' }}>
              How to compress an image to a specific file size
            </h2>
            <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, listStyle: 'none' }}>
              {[
                { n: '1', title: 'Upload your image', desc: 'Drag and drop or click to select PNG, JPEG, WebP, GIF, BMP, or TIFF files. Max 50 MB each.' },
                { n: '2', title: 'Set a target size', desc: 'Type a KB value or pick a preset like 50 KB, 100 KB, or 500 KB.' },
                { n: '3', title: 'Click Compress', desc: 'Our algorithm finds the ideal quality to hit your target precisely and securely.' },
                { n: '4', title: 'Download within 10 min', desc: 'Save your files. They are automatically and permanently deleted from our servers after 10 minutes.' },
              ].map(s => (
                <li key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.n}
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── AD: Between sections ── */}
        <div style={{ padding: '0 24px 16px' }}>
          <AdSlot slot="contentMiddle" format="rectangle" style={{ maxWidth: 680, margin: '0 auto', minHeight: 250 }} />
        </div>

        {/* ── FAQ ── */}
        <section aria-labelledby="faq-heading" style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 56px' }}>
          <h2 id="faq-heading" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 32, textAlign: 'center' }}>
            Frequently asked questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { q: 'How does Squish compress images to an exact file size?', a: 'Squish uses a binary search algorithm over JPEG/WebP quality settings (or PNG compression levels) to find the exact setting that produces a file at or just below your target size. If the image is too large even at minimum quality, it progressively resizes the dimensions until the target is met.' },
              { q: 'Are my images private and secure?', a: 'Yes. Images are uploaded over HTTPS, processed in server memory, then written to a temporary location and deleted permanently after 10 minutes. We never view, share, or retain your files beyond that window.' },
              { q: 'Why are files deleted after 10 minutes?', a: 'To protect your privacy. Temporary storage allows you to download your file after compression without it persisting on our servers any longer than necessary. The 10-minute window is generous enough for any reasonable download, and the countdown is shown clearly on screen.' },
              { q: 'What image formats are supported?', a: 'You can upload PNG, JPEG, WebP, GIF, BMP, and TIFF images. Output can be JPEG, PNG, or WebP — or set to Auto to keep the original format.' },
              { q: 'Is there a file size or image count limit?', a: 'Each file must be under 50 MB. There is no limit on how many images you compress. Batch mode processes up to 3 images concurrently.' },
              { q: 'Does compressing reduce image quality?', a: 'Compression always involves some quality trade-off. Squish finds the highest quality that still fits the target, minimising visible degradation. A warning is shown when the target is significantly smaller than the original, so you can make an informed choice.' },
              { q: 'Does converting PNG to JPEG affect transparency?', a: 'Yes. JPEG does not support transparency. If you convert a PNG with a transparent background to JPEG, the transparent areas will become white. A warning is displayed when this conversion is detected.' },
            ].map((item, i) => (
              <details key={i} style={{ borderTop: '1px solid var(--border)', padding: '18px 0' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 500, fontSize: 14, color: 'var(--text)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  {item.q}
                  <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <path d="M2 4l4 4 4-4"/>
                  </svg>
                </summary>
                <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{item.a}</p>
              </details>
            ))}
            <div style={{ borderTop: '1px solid var(--border)' }} />
          </div>
        </section>
      </main>

      {/* ── AD: Above Footer ── */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
        <AdSlot slot="footer" format="horizontal" style={{ maxWidth: 980, margin: '0 auto', minHeight: 90 }} />
      </div>

      {/* ── FOOTER ── */}
      <footer aria-label="Site footer" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          © {new Date().getFullYear()} Squish · Free image compressor ·{' '}
          <a href="/privacy" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>Privacy</a>
          {' '}·{' '}
          <a href="/terms" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>Terms</a>
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Powered by Sharp · Next.js · Files auto-deleted after 10 min
        </p>
      </footer>
    </>
  )
}
