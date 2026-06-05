import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'privacy' });
  return {
    title: t('title'),
    description: 'Learn how Keyo Studio collects, uses, and protects your personal data.',
    alternates: { canonical: `/${params.locale}/privacy` },
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'privacy' });
  const sections = t.raw('sections') as Array<{ title: string; body: string }>;

  return (
    <>
      <Navbar />
      <main className="pb-20 md:pb-0" style={{ paddingTop: '60px', background: 'var(--bg)', minHeight: '100vh' }}>

        <div style={{ padding: '48px clamp(16px,6vw,80px) 36px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <div className="inline-flex items-center gap-1.5 mb-4" style={{
              background: 'rgba(83,47,207,0.1)',
              border: '0.5px solid rgba(83,47,207,0.25)',
              borderRadius: '20px', padding: '3px 10px',
            }}>
              <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '8px' }}>✦</span>
              <span className="font-dm" style={{ color: 'rgba(120,80,255,0.65)', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>{t('badge')}</span>
            </div>
            <h1 className="font-clash" style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 10px' }}>
              {t('title')}
            </h1>
            <p className="font-dm" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              {t('lastUpdated')}
            </p>
          </div>
        </div>

        <div style={{ padding: '40px clamp(16px,6vw,80px) 80px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <p className="font-dm" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.8', marginBottom: '36px' }}>
              {t('intro')}
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
