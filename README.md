# Squish — Precision Image Compressor

A full-stack Next.js application that compresses images to a specific target file size using binary search + Sharp.

## Features

- 🎯 **Target any file size** — set exact KB target (e.g. 50KB, 100KB, 500KB)
- 🖼️ **Multiple formats** — PNG, JPEG, WEBP, GIF, BMP, TIFF input support
- 🔄 **Format conversion** — output as JPEG, PNG, or WebP
- 📦 **Batch processing** — compress multiple images at once (3 concurrent)
- 📊 **Live stats** — see compression ratio, quality, and savings per image
- ⬇️ **Download all** — bulk download compressed images

## How It Works

The API uses **binary search** to find the optimal quality/compression setting:
1. For JPEG/WebP: binary search over quality (1–95) to hit the target byte count
2. For PNG: binary search over compression level (0–9)
3. If quality=1 is still too large, it progressively resizes the image down

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 14** (App Router)
- **Sharp** — high-performance image processing
- **React Dropzone** — drag & drop file uploads
- **Tailwind CSS** — styling

## API Reference

`POST /api/compress`

**Form Data:**
- `file` — Image file
- `targetKB` — Target size in kilobytes (1–50000)
- `outputFormat` — `auto` | `jpeg` | `png` | `webp`

**Response Headers:**
- `X-Original-Size` — Original size in KB
- `X-Final-Size` — Final size in KB
- `X-Compression-Ratio` — Savings percentage
- `X-Quality` — Quality/compression level used
- `X-Width`, `X-Height` — Image dimensions
- `X-Format` — Output format used
