'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { AdSlot } from '@/components/AdSlot'
import { PrivacyBanner, QualityWarning, FormatWarning, ProcessingNotice, FileSizeWarning } from '@/components/Warnings'

interface FileResult {
  id: string
  file: File
  preview: string
  status: 'idle' | 'compressing' | 'done' | 'error'
  originalSize: number
  finalSize?: number
  compressionRatio?: string
  quality?: number
  width?: number
  height?: number
  format?: string
  downloadUrl?: string   // local blob URL — auto-revoked after download
  downloadName?: string
  error?: string
}

const PRESETS = [50, 100, 200, 500, 1000, 2000]
const FORMATS = [
  { value: 'auto', label: 'Auto' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png',  label: 'PNG'  },
  { value: 'webp', label: 'WebP' },
]
const MAX_FILE_MB = 50

function fmtKB(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
}

function triggerDownload(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M3 8l3.5 3.5L13 4.5" />
    </svg>
  )
}

function FileRow({ item, targetKB, outputFormat, onRemove }: {
  item: FileResult
  targetKB: number
  outputFormat: string
  onRemove: () => void
}) {
  return (
    <div className="card fade-up" style={{ padding: '14px 16px', animationFillMode: 'both' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Thumbnail */}
        <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--surface2)', border: '1px solid var(--border)', position: 'relative' }}>
          {item.preview && <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          {item.status === 'compressing' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          )}
          {item.status === 'done' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(240,253,244,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <CheckIcon />
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.file.name}
            </p>
            <button onClick={onRemove} aria-label="Remove file" style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
              <svg viewBox="0 0 12 12" width="10" height="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11"/></svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7, alignItems: 'center' }}>
            <span className="badge badge-default">{fmtKB(item.originalSize)}</span>
            {item.width ? <span className="badge badge-default">{item.width}×{item.height}</span> : null}
            {item.format ? <span className="badge badge-default">{item.format.toUpperCase()}</span> : null}
            {item.status === 'done' && item.finalSize !== undefined && (
              <>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>
                <span className="badge badge-green">{fmtKB(item.finalSize)}</span>
                {item.compressionRatio && parseFloat(item.compressionRatio) > 0 && (
                  <span className="badge badge-green">−{item.compressionRatio}%</span>
                )}
              </>
            )}
            {item.status === 'error' && <span className="badge badge-red">{item.error || 'Failed'}</span>}
          </div>

          {item.file.size / 1024 / 1024 > MAX_FILE_MB && <FileSizeWarning fileSizeMB={item.file.size / 1024 / 1024} />}
          {item.status !== 'error' && <QualityWarning originalKB={item.originalSize} targetKB={targetKB} quality={item.quality} />}
          <FormatWarning inputMime={item.file.type} outputFormat={outputFormat} />
          {item.status === 'compressing' && <div style={{ marginTop: 8 }}><ProcessingNotice /></div>}

          {/* Download button (manual re-download after auto-download) */}
          {item.status === 'done' && item.downloadUrl && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <a
                href={item.downloadUrl}
                download={item.downloadName}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
              >
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 2v8M5 7l3 3 3-3M2 12h12"/>
                </svg>
                Download again
              </a>
              <span style={{ fontSize: 11.5, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 6l2.5 2.5L10 3"/></svg>
                Downloaded automatically
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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
        error: r.errors[0]?.code === 'file-too-large' ? `Too large (max ${MAX_FILE_MB} MB)` : r.errors[0]?.message || 'Rejected',
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

    if (!res.ok) {
      const data = await res.json()
      return { ...item, status: 'error', error: data.error || 'Compression failed' }
    }

    // Response IS the compressed binary — convert to blob URL
    const blob = await res.blob()
    const downloadUrl = URL.createObjectURL(blob)
    const downloadName = res.headers.get('X-Download-Name') || `${item.file.name}_squished`

    // AUTO-DOWNLOAD immediately
    triggerDownload(downloadUrl, downloadName)

    return {
      ...item,
      status: 'done',
      finalSize: parseInt(res.headers.get('X-Final-Size') || '0'),
      compressionRatio: res.headers.get('X-Compression-Ratio') || '0',
      quality: parseInt(res.headers.get('X-Quality') || '0'),
      width: parseInt(res.headers.get('X-Width') || '0'),
      height: parseInt(res.headers.get('X-Height') || '0'),
      format: res.headers.get('X-Format') || '',
      downloadUrl,
      downloadName,
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
    files.filter(f => f.status === 'done' && f.downloadUrl).forEach(f => {
      triggerDownload(f.downloadUrl!, f.downloadName!)
    })
  }

  const setKB = (v: number) => { setTargetKB(v); setInputVal(String(v)) }

  const idleCount = files.filter(f => f.status === 'idle' || f.status === 'error').length
  const doneCount = files.filter(f => f.status === 'done').length
  const doneFiles = files.filter(f => f.status === 'done')
  const totalSaved = doneFiles.reduce((a, f) => a + f.originalSize - (f.finalSize || 0), 0)

  return (
    <>
      <PrivacyBanner />

      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
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
        <nav aria-label="Supported formats" style={{ fontSize: 12, color: 'var(--muted)' }}>PNG · JPEG · WebP · GIF · BMP · TIFF</nav>
      </header>

      <main>
        <section aria-labelledby="hero-heading" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '48px 24px 40px', textAlign: 'center' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h1 id="hero-heading" style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2, fontFamily: "'Instrument Serif', serif" }}>
              Compress images to <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>any file size</em>
            </h1>
            <p style={{ marginTop: 12, fontSize: 15, color: 'var(--text2)', lineHeight: 1.6 }}>
              Set a target in KB and we'll compress your image to exactly that. Free, private, auto-downloaded instantly.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              {['Auto-download', 'No watermarks', 'No registration', 'Batch compress'].map(t => (
                <span key={t} className="badge badge-default">{t}</span>
              ))}
            </div>
          </div>
        </section>

        <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 24px' }}>
          <AdSlot slot="belowHero" format="horizontal" style={{ maxWidth: 980, margin: '0 auto', minHeight: 90 }} />
        </div>

        <section aria-label="Image compression tool" style={{ maxWidth: 980, margin: '0 auto', padding: '32px 20px', display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

          <aside aria-label="Compression settings" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <p className="section-label" style={{ marginBottom: 14 }}>Target File Size</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" value={inputVal} min={1} max={50000} aria-label="Target file size in KB" className="input-field" style={{ fontSize: 22, fontWeight: 600, color: 'var(--accent)', padding: '10px 14px' }}
                  onChange={e => { setInputVal(e.target.value); const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 50000) setTargetKB(v) }} />
                <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>KB</span>
              </div>
              <input type="range" min={10} max={5000} step={10} value={Math.min(targetKB, 5000)} onChange={e => setKB(+e.target.value)} style={{ marginTop: 14 }} />
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

            <div className="card" style={{ padding: 20 }}>
              <p className="section-label" style={{ marginBottom: 14 }}>Output Format</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                {FORMATS.map(f => (
                  <button key={f.value} onClick={() => setFormat(f.value)} className={`preset-btn${format === f.value ? ' active' : ''}`}>{f.label}</button>
                ))}
              </div>
              {format === 'auto' && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Keeps the original format when possible.</p>}
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M8 2L3 4.5v4C3 11.5 5.5 14 8 15c2.5-1 5-3.5 5-6.5v-4L8 2z"/>
              </svg>
              <span><strong style={{ color: 'var(--text)' }}>Privacy guaranteed.</strong> Files are processed in memory and never stored on our servers. Your image is returned directly to your browser.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <button onClick={handleCompress} disabled={idleCount === 0 || compressing} className="btn-primary" style={{ width: '100%', padding: '11px 20px', fontSize: 14 }}>
                {compressing ? (
                  <><div className="spinner" style={{ borderTopColor: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.25)' }} /> Compressing…</>
                ) : (
                  <><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2v8M5 7l3 3 3-3M2 12h12"/></svg>
                  Compress {idleCount > 0 ? `${idleCount} ` : ''}Image{idleCount !== 1 ? 's' : ''}</>
                )}
              </button>
              {doneCount > 0 && <button onClick={handleDownloadAll} className="btn-secondary" style={{ width: '100%' }}>Download All Again ({doneCount})</button>}
              {files.length > 0 && <button onClick={() => setFiles([])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', padding: '4px 0', fontFamily: 'inherit' }}>Clear all</button>}
            </div>

            {doneCount > 0 && (
              <div className="card" style={{ padding: 18 }}>
                <p className="section-label" style={{ marginBottom: 12 }}>Session Results</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['Images compressed', doneCount],
                    ['Total original', fmtKB(doneFiles.reduce((a, f) => a + f.originalSize, 0))],
                    ['Total compressed', fmtKB(doneFiles.reduce((a, f) => a + (f.finalSize || 0), 0))],
                    ['Total saved', fmtKB(totalSaved)],
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div {...getRootProps()} role="button" aria-label="Upload images" className={`drop-zone${isDragActive ? ' active' : ''}`} style={{ padding: '40px 24px', textAlign: 'center' }}>
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
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>PNG, JPEG, WebP, GIF, BMP, TIFF · Max {MAX_FILE_MB} MB</p>
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
                    <FileRow item={item} targetKB={targetKB} outputFormat={format} onRemove={() => setFiles(prev => prev.filter(f => f.id !== item.id))} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="how-heading" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '56px 24px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <h2 id="how-heading" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 32, textAlign: 'center' }}>
              How to compress an image to a specific file size
            </h2>
            <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, listStyle: 'none' }}>
              {[
                { n: '1', title: 'Upload your image', desc: 'Drag and drop or click to select PNG, JPEG, WebP, GIF, BMP, or TIFF files. Max 50 MB each.' },
                { n: '2', title: 'Set a target size', desc: 'Type a KB value or pick a preset like 50 KB, 100 KB, or 500 KB.' },
                { n: '3', title: 'Click Compress', desc: 'Our algorithm finds the ideal quality to hit your target precisely.' },
                { n: '4', title: 'Auto-downloaded', desc: 'Your compressed file downloads automatically. No waiting, no separate download step.' },
              ].map(s => (
                <li key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div style={{ padding: '0 24px 16px' }}>
          <AdSlot slot="contentMiddle" format="rectangle" style={{ maxWidth: 680, margin: '0 auto', minHeight: 250 }} />
        </div>

        <section aria-labelledby="faq-heading" style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 56px' }}>
          <h2 id="faq-heading" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 32, textAlign: 'center' }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { q: 'How does Squish compress images to an exact file size?', a: 'Squish uses a binary search algorithm over JPEG/WebP quality settings (or PNG compression levels) to find the exact setting that produces a file at or just below your target size. If the image is too large even at minimum quality, it progressively resizes the dimensions.' },
              { q: 'Are my images private and secure?', a: 'Yes. Images are uploaded over HTTPS, compressed entirely in server memory, and returned directly to your browser. We never write your file to disk or store it anywhere.' },
              { q: 'Why does the file download automatically?', a: 'As soon as compression finishes, your file is sent directly from the server to your browser and auto-downloaded. This is faster and more private than storing a file and making you click a separate link.' },
              { q: 'What image formats are supported?', a: 'PNG, JPEG, WebP, GIF, BMP, and TIFF as input. Output can be JPEG, PNG, or WebP.' },
              { q: 'Is there a file size limit?', a: 'Each file must be under 50 MB. No limit on how many images you compress in a session.' },
              { q: 'Does compressing reduce image quality?', a: 'Compression always involves some trade-off. Squish finds the highest quality that fits the target. A warning is shown when significant quality loss is expected.' },
            ].map((item, i) => (
              <details key={i} style={{ borderTop: '1px solid var(--border)', padding: '18px 0' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 500, fontSize: 14, color: 'var(--text)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  {item.q}
                  <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M2 4l4 4 4-4"/></svg>
                </summary>
                <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{item.a}</p>
              </details>
            ))}
            <div style={{ borderTop: '1px solid var(--border)' }} />
          </div>
        </section>
      </main>

      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
        <AdSlot slot="footer" format="horizontal" style={{ maxWidth: 980, margin: '0 auto', minHeight: 90 }} />
      </div>

      <footer aria-label="Site footer" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          © {new Date().getFullYear()} Squish · Free image compressor ·{' '}
          <a href="/privacy" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>Privacy</a> ·{' '}
          <a href="/terms" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>Terms</a>
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Powered by Sharp · Next.js</p>
      </footer>
    </>
  )
}