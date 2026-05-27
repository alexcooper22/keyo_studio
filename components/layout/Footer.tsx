import React from 'react';
import Link from 'next/link';

const socials = [
  {
    label: 'X',
    href: 'https://x.com',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com',
    path: 'M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12z',
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com',
    path: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34l-.01-8.83a8.18 8.18 0 0 0 4.78 1.52V4.56a4.85 4.85 0 0 1-1-.13z',
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 23.2 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
];

const footerLinks: Record<string, string[]> = {
  Product: ['Image', 'Video', 'Audio', 'Pricing'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy', 'Terms', 'Cookies'],
};

export default function Footer() {
  return (
    <footer style={{ background: 'var(--accent)', padding: '48px 48px 32px' }}>
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12" style={{ marginBottom: '28px' }}>
          <div>
            <p className="font-syne font-[800] text-white" style={{ fontSize: '18px', marginBottom: '10px' }}>
              keyo.studio
            </p>
            <p className="font-dm" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', lineHeight: '1.7', marginBottom: '16px', maxWidth: '200px' }}>
              Generate images, videos and audio with the world&apos;s best AI models all in one place.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex items-center justify-center transition-opacity duration-200 hover:opacity-70"
                  style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.15)', borderRadius: '6px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {(Object.entries(footerLinks) as [string, string[]][]).map(([col, links]) => (
            <div key={col}>
              <p className="font-dm font-[600] text-white" style={{ fontSize: '12px', marginBottom: '12px', opacity: 0.9 }}>
                {col}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {links.map((l) => (
                  <li key={l}>
                    <Link
                      href={`/${l.toLowerCase()}`}
                      className="font-dm hover:text-white transition-colors duration-200"
                      style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
                    >
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col md:flex-row items-center justify-between gap-2"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.2)', paddingTop: '16px' }}
        >
          <p className="font-dm" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            © 2026 keyo.studio. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {['Privacy', 'Terms', 'Cookies'].map((l, i) => (
              <React.Fragment key={l}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>·</span>}
                <Link
                  href={`/${l.toLowerCase()}`}
                  className="font-dm hover:text-white transition-colors duration-200"
                  style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}
                >
                  {l}
                </Link>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
