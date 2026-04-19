import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Squish handles your images and data.',
}

const LAST_UPDATED = 'January 2025'
const CONTACT = 'privacy@imagesquish.com'

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 8 }}>
        Privacy Policy
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 40 }}>Last updated: {LAST_UPDATED}</p>

      {[
        {
          title: '1. What data we collect',
          body: `When you compress an image, the file is transmitted over HTTPS to our servers for processing. We do not collect any personally identifiable information. We do not require registration, login, or any account to use Squish. Anonymous usage metrics (e.g. request counts) may be collected for operational purposes.`,
        },
        {
          title: '2. How your images are handled',
          body: `Images are loaded into server memory for compression and then written to an isolated temporary directory. Each file is associated with a unique random ID. Files are permanently and automatically deleted from our servers no later than 10 minutes after the compression request is completed. We do not access, view, analyse, or share the contents of your images.`,
        },
        {
          title: '3. Automatic deletion',
          body: `Our system runs an automated cleanup job every 5 minutes that removes any temporary files older than 10 minutes. Additionally, each file has an individual deletion timer set at the time of compression. Files cannot be recovered after deletion.`,
        },
        {
          title: '4. Cookies and tracking',
          body: `Squish uses a session cookie solely to remember your privacy notice acknowledgement. This cookie contains no personal data and is not used for advertising tracking. Google AdSense, which powers ads on this site, may set its own cookies in accordance with Google's Privacy Policy (policies.google.com/privacy). You can opt out of personalised ads via Google's Ad Settings.`,
        },
        {
          title: '5. Third-party services',
          body: `We use Sharp (an open-source image processing library) for compression — processing happens on our own infrastructure. Google AdSense is used for advertising. We do not sell or share your data with any other third parties.`,
        },
        {
          title: '6. Data retention',
          body: `Uploaded image files: deleted automatically after 10 minutes. Server access logs: retained for up to 30 days for security and abuse prevention, then deleted. No other personal data is stored.`,
        },
        {
          title: '7. Children\'s privacy',
          body: `Squish is not directed at children under 13. We do not knowingly collect data from children. If you believe a child has uploaded content to our service, contact us and we will take prompt action.`,
        },
        {
          title: '8. Changes to this policy',
          body: `We may update this policy from time to time. Material changes will be indicated by a new "Last updated" date at the top of this page. Continued use of the service after changes constitutes acceptance of the revised policy.`,
        },
        {
          title: '9. Contact',
          body: `For privacy-related questions or requests, contact us at ${CONTACT}.`,
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
