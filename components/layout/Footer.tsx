import React from 'react';
import Link from 'next/link';
import Logo from '../ui/Logo';

const socials = [
  { label: 'X', href: 'https://x.com', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  { label: 'YouTube', href: 'https://youtube.com', path: 'M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12z' },
  { label: 'Instagram', href: 'https://instagram.com', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z' },
  { label: 'TikTok', href: 'https://tiktok.com', path: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34l-.01-8.83a8.18 8.18 0 0 0 4.78 1.52V4.56a4.85 4.85 0 0 1-1-.13z' },
  { label: 'LinkedIn', href: 'https://linkedin.com', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
];

const productLinks = [
  { label: 'Image', href: '/image' },
  { label: 'Video', href: '/video' },
  { label: 'Audio', href: '/audio' },
  { label: 'Pricing', href: '/pricing' },
];

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export default function Footer() {
  return (
    <footer className="pb-20 md:pb-0" style={{ position: 'relative', background: '#080808', overflow: 'hidden' }}>

      {/* Top shimmer */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(120,80,255,0.4) 30%, rgba(83,47,207,0.7) 50%, rgba(120,80,255,0.4) 70%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Large background wordmark */}
      <div aria-hidden="true" style={{
        position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'var(--font-clash)', fontWeight: 700, fontSize: 'clamp(80px, 14vw, 160px)',
        letterSpacing: '-0.04em', whiteSpace: 'nowrap',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
      }}>
        keyo.studio
      </div>

      {/* Center glow */}
      <div style={{
        position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '300px',
        background: 'radial-gradient(ellipse at center, rgba(83,47,207,0.18) 0%, transparent 68%)',
        pointerEvents: 'none',
      }} />

      {/* Dot grid */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(120,80,255,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 70% 80% at 50% 100%, black 0%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 100%, black 0%, transparent 80%)',
        pointerEvents: 'none',
      }} />

      <div className="relative font-dm" style={{ padding: '40px 32px 28px' }}>

        {/* ── Top section: tagline ── */}
        <div className="flex flex-col items-center text-center" style={{ marginBottom: '36px' }}>
          <div className="inline-flex items-center gap-2" style={{
            background: 'rgba(83,47,207,0.1)',
            border: '0.5px solid rgba(83,47,207,0.25)',
            borderRadius: '20px', padding: '3px 10px', marginBottom: '14px',
          }}>
            <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '8px' }}>✦</span>
            <span style={{ color: 'rgba(120,80,255,0.6)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}>AI Creative Studio</span>
          </div>
          <p className="font-clash" style={{ fontSize: 'clamp(22px, 3.5vw, 38px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0, background: 'linear-gradient(135deg, #e8e0ff 0%, #c4b0ff 50%, #a080ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Create anything with AI
          </p>
        </div>

        {/* ── Middle: logo · links · socials ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 items-center md:items-stretch" style={{ marginBottom: '20px' }}>

          <div className="flex justify-center md:justify-start">
            <Logo size={16} />
          </div>

          <div className="flex items-center gap-0 justify-center">
            {productLinks.map((link, i) => (
              <React.Fragment key={link.label}>
                <Link
                  href={link.href}
                  className="font-dm transition-colors duration-200 hover:text-white"
                  style={{ fontSize: '13px', color: 'rgba(255,255,255,0.32)', textDecoration: 'none' }}
                >
                  {link.label}
                </Link>
                {i < productLinks.length - 1 && (
                  <span style={{ color: 'rgba(255,255,255,0.1)', margin: '0 10px', fontSize: '12px' }}>·</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex items-center justify-center transition-all duration-200 hover:opacity-80 hover:-translate-y-0.5"
                style={{
                  width: 28, height: 28,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.07)',
                  borderRadius: '7px', opacity: 0.4,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="none">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />

        {/* ── Bottom: copyright · legal ── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <p className="font-dm" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)', margin: 0 }}>
              © 2026 keyo.studio
            </p>
            <div className="inline-flex items-center gap-1" style={{
              background: 'rgba(83,47,207,0.08)',
              border: '0.5px solid rgba(83,47,207,0.18)',
              borderRadius: '20px', padding: '2px 8px',
            }}>
              <span style={{ color: 'rgba(120,80,255,0.7)', fontSize: '8px' }}>✦</span>
              <span style={{ color: 'rgba(120,80,255,0.5)', fontSize: '10px', fontWeight: 500 }}>Powered by AI</span>
            </div>
          </div>

          <div className="flex items-center">
            {legalLinks.map((link, i) => (
              <React.Fragment key={link.label}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.08)', fontSize: '11px', margin: '0 8px' }}>·</span>}
                <Link
                  href={link.href}
                  className="font-dm hover:text-white/40 transition-colors duration-200"
                  style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)', textDecoration: 'none' }}
                >
                  {link.label}
                </Link>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Legal entity info ── */}
        <div className="flex flex-col items-center text-center" style={{ marginTop: '14px', gap: '3px' }}>
          <p className="font-dm" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.1)', margin: 0, lineHeight: 1.6 }}>
            ФОП БОНДАР ОЛЕНА СЕРГІЇВНА · РНОКПП / ЄДРПОУ: 3403609226
          </p>
          <p className="font-dm" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.1)', margin: 0, lineHeight: 1.6 }}>
            Україна, м. Київ, вул. І. Франка 42, 02000 · +380965674504 ·{' '}
            <a href="mailto:info@ellenkeyo.com" className="hover:text-white/30 transition-colors duration-200" style={{ color: 'inherit', textDecoration: 'none' }}>
              info@ellenkeyo.com
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
}
