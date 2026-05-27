import type { Metadata } from 'next';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the Terms of Service for Keyo Studio, the AI creative platform for images, video, and audio.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using Keyo Studio ("the Service"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not access the Service. These terms apply to all users, including visitors, registered accounts, and paying subscribers.`,
  },
  {
    title: '2. Eligibility',
    body: `You must be at least 16 years old to use Keyo Studio. By creating an account, you represent that you meet this requirement and that all information you provide is accurate and current. We reserve the right to terminate accounts that we believe are operated by minors.`,
  },
  {
    title: '3. Account Responsibilities',
    body: `You are responsible for safeguarding your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorised use. We are not liable for any losses arising from your failure to keep your credentials secure.`,
  },
  {
    title: '4. Permitted Use',
    body: `Keyo Studio is provided for lawful creative and professional use only. You may use the Service to generate images, videos, and audio for personal or commercial purposes, subject to credit limits and applicable plan restrictions. You may not use the Service to generate illegal, harmful, deceptive, or rights-infringing content.`,
  },
  {
    title: '5. Prohibited Content',
    body: `You may not use Keyo Studio to generate content that: (a) depicts or promotes illegal activities; (b) contains sexual content involving minors; (c) infringes any intellectual property rights; (d) is used to deceive, defraud, or harass individuals; or (e) violates the usage policies of underlying AI model providers. Violations may result in immediate account termination.`,
  },
  {
    title: '6. Ownership of Generated Content',
    body: `Subject to compliance with these Terms, you retain ownership of content you generate using the Service. We do not claim rights over your outputs. However, you grant us a limited licence to store and process your prompts and outputs for the purpose of delivering the Service and improving model quality.`,
  },
  {
    title: '7. Subscriptions and Payments',
    body: `Paid plans are billed on a recurring basis as described at checkout. All fees are non-refundable except as required by law or as explicitly stated in our refund policy. We reserve the right to change pricing with 30 days' notice. Continued use of the Service after a price change constitutes acceptance.`,
  },
  {
    title: '8. Service Availability',
    body: `We aim to provide a reliable service but do not guarantee uninterrupted access. We may modify, suspend, or discontinue features at any time with reasonable notice. We are not liable for any downtime, data loss, or interruption caused by circumstances beyond our reasonable control.`,
  },
  {
    title: '9. Intellectual Property',
    body: `The Keyo Studio platform, including its design, code, branding, and underlying AI pipeline infrastructure, is owned by us and protected by intellectual property law. You may not copy, reverse-engineer, resell, or create derivative works of the platform itself without our written consent.`,
  },
  {
    title: '10. Disclaimers and Limitation of Liability',
    body: `The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we disclaim all implied warranties. Our total liability for any claim arising from these Terms shall not exceed the amount you paid us in the 12 months preceding the claim.`,
  },
  {
    title: '11. Termination',
    body: `We may suspend or terminate your account at any time for violation of these Terms or for any other reason with reasonable notice. You may terminate your account at any time through account settings. Provisions that by their nature should survive termination shall do so.`,
  },
  {
    title: '12. Governing Law',
    body: `These Terms are governed by applicable law. Any disputes shall be resolved in the competent courts of the jurisdiction in which Keyo Studio operates. If any provision of these Terms is found unenforceable, the remaining provisions continue in full force.`,
  },
  {
    title: '13. Changes to Terms',
    body: `We may revise these Terms from time to time. We will provide at least 14 days' notice of material changes via email or in-app notification. Continued use of the Service after the effective date constitutes your acceptance of the revised Terms.`,
  },
  {
    title: '14. Contact',
    body: `For questions about these Terms, contact us at legal@keyo.studio.`,
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pb-20 md:pb-0" style={{ paddingTop: '60px', background: 'var(--bg)', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '48px clamp(16px,6vw,80px) 36px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <div className="inline-flex items-center gap-1.5 mb-4" style={{
              background: 'rgba(83,47,207,0.1)',
              border: '0.5px solid rgba(83,47,207,0.25)',
              borderRadius: '20px', padding: '3px 10px',
            }}>
              <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '8px' }}>✦</span>
              <span className="font-dm" style={{ color: 'rgba(120,80,255,0.65)', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Legal</span>
            </div>
            <h1 className="font-clash" style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 10px' }}>
              Terms of Service
            </h1>
            <p className="font-dm" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              Last updated: January 1, 2026
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '40px clamp(16px,6vw,80px) 80px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <p className="font-dm" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.8', marginBottom: '36px' }}>
              Please read these Terms of Service carefully before using Keyo Studio. These terms form a binding legal agreement between you and Keyo Studio regarding your use of our AI creative platform.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {sections.map((s) => (
                <div key={s.title}>
                  <h2 className="font-clash" style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em', marginBottom: '10px' }}>
                    {s.title}
                  </h2>
                  <p className="font-dm" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.8', margin: 0 }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </>
  );
}
