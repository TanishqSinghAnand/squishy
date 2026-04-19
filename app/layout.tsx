import type { Metadata } from 'next'
import { ADSENSE_CLIENT } from '@/components/AdSlot'
import './globals.css'

const BASE_URL = 'https://squishy.technyteams.in' 
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Image Compressor – Compress Images to Exact KB Size | Squish',
    template: '%s | Squish Image Compressor',
  },
  description:
    'Free online image compressor. Compress PNG, JPEG, WebP images to any target file size like 50KB, 100KB, 200KB without losing quality. Fast, private, no upload limits.',
  keywords: [
    'image compressor',
    'compress image to specific size',
    'reduce image file size',
    'compress image to 50kb',
    'compress image to 100kb',
    'compress jpeg online',
    'compress png online',
    'compress webp',
    'image size reducer',
    'photo compressor',
    'online image optimizer',
    'reduce photo size kb',
    'image file size reducer free',
  ],
  authors: [{ name: 'Squish' }],
  creator: 'Squish',
  publisher: 'Squish',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Squish Image Compressor',
    title: 'Compress Images to Any File Size – Free Online Tool',
    description:
      'Set a target KB size and Squish compresses your PNG, JPEG, or WebP image to exactly that. No sign-up, no watermarks, 100% free.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Squish – Free Image Compressor to Exact KB Size',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compress Images to Any KB Size – Squish',
    description:
      'Free image compressor. Set a target file size in KB and compress PNG, JPEG, WebP instantly.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: BASE_URL,
  },
  category: 'technology',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${BASE_URL}/#webapp`,
        name: 'Squish Image Compressor',
        url: BASE_URL,
        description:
          'Free online image compressor that reduces PNG, JPEG, and WebP images to a specific target file size in KB.',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: [
          'Compress image to specific KB size',
          'Supports PNG, JPEG, WebP, GIF, BMP, TIFF',
          'Batch image compression',
          'No file upload limits',
          'No registration required',
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How do I compress an image to a specific file size?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Upload your image on Squish, set your desired target size in KB (e.g. 100KB), choose your output format, and click Compress. Our algorithm automatically finds the right quality setting to hit your target.',
            },
          },
          {
            '@type': 'Question',
            name: 'What image formats does Squish support?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Squish supports PNG, JPEG, WebP, GIF, BMP, and TIFF as input formats. You can output as JPEG, PNG, or WebP.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is Squish free to use?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, Squish is completely free. No sign-up, no watermarks, and no file size limits.',
            },
          },
          {
            '@type': 'Question',
            name: 'Are my images stored or shared?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. Images are processed server-side in memory and are never stored or shared. Files are discarded immediately after compression.',
            },
          },
        ],
      },
    ],
  }

  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={BASE_URL} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google AdSense — plain script in <head> avoids next/script data-nscript warning */}
        {/* These 400 errors on localhost are normal — ads only load on a live domain */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
