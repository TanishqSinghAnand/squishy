import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing the use of Squish image compressor.',
}

const LAST_UPDATED = 'January 2025'
const CONTACT = 'legal@imagesquish.com'

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 8 }}>
        Terms of Service
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 40 }}>Last updated: {LAST_UPDATED}</p>

      {[
        {
          title: '1. Acceptance of terms',
          body: `By uploading an image or otherwise using Squish ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.`,
        },
        {
          title: '2. Permitted use',
          body: `You may use Squish solely for lawful personal or commercial image compression. You must not upload images that: (a) you do not own or have the right to process; (b) contain illegal content including CSAM; (c) contain malware or are designed to harm the service or its infrastructure.`,
        },
        {
          title: '3. Your content',
          body: `You retain all ownership rights to images you upload. By uploading an image you grant Squish a limited, temporary, non-exclusive licence to process it for the sole purpose of performing the requested compression. This licence terminates when the file is deleted (within 10 minutes of compression).`,
        },
        {
          title: '4. Automatic file deletion',
          body: `All uploaded and compressed files are permanently deleted from our servers within 10 minutes of the compression request. You are responsible for downloading your compressed file within this window. We are not liable for any loss arising from failure to download before expiry.`,
        },
        {
          title: '5. File size and rate limits',
          body: `Individual files must not exceed 50 MB. We apply rate limiting (20 requests per minute per IP address) to ensure fair use for all users. Systematic or automated abuse of the service is prohibited.`,
        },
        {
          title: '6. No warranty',
          body: `The Service is provided "as is" without warranty of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that compressed images will meet specific quality expectations. Image compression inherently involves quality trade-offs.`,
        },
        {
          title: '7. Limitation of liability',
          body: `To the fullest extent permitted by law, Squish and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of data or loss of image quality.`,
        },
        {
          title: '8. Advertising',
          body: `The Service is free to use and is supported by Google AdSense advertisements. Ads are displayed in non-intrusive positions and do not affect the compression functionality. Ad content is governed by Google's policies.`,
        },
        {
          title: '9. Modifications',
          body: `We reserve the right to modify or discontinue the Service at any time without notice. We may update these Terms at any time; continued use after changes constitutes acceptance.`,
        },
        {
          title: '10. Governing law',
          body: `These Terms are governed by applicable law. Any disputes shall be resolved in the applicable jurisdiction. If any provision is found unenforceable, the remainder of the Terms continues in full effect.`,
        },
        {
          title: '11. Contact',
          body: `For legal matters, contact us at ${CONTACT}.`,
        },
      ].map(section => (
        <section key={section.title} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{section.title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75 }}>{section.body}</p>
        </section>
      ))}

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <a href="/" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>← Back to Squish</a>
      </div>
    </main>
  )
}
