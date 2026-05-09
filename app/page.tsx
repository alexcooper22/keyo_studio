'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

/* ─── Static gallery placeholders ───────────────────── */
const galleryImages = [
  { id: 1, prompt: 'portrait of a young woman, natural window light, Canon 50mm', gradient: 'linear-gradient(160deg, #3a2a5a, #1a1240)' },
  { id: 2, prompt: 'Tokyo street at night, rain, neon lights, shallow depth', gradient: 'linear-gradient(160deg, #2a3545, #0f1a2e)' },
  { id: 3, prompt: 'studio portrait, dramatic lighting, 85mm lens', gradient: 'linear-gradient(160deg, #3a2a2a, #1a1010)' },
  { id: 4, prompt: 'botanical garden, soft golden light, film grain', gradient: 'linear-gradient(160deg, #2a3a2a, #101a10)' },
  { id: 5, prompt: 'candid street portrait, natural light, film look', gradient: 'linear-gradient(160deg, #3a2a3a, #1a0f20)' },
  { id: 6, prompt: 'night city reflections, long exposure, moody', gradient: 'linear-gradient(160deg, #2a2a3a, #0f1020)' },
];

/* ─── Social icon paths ──────────────────────────────── */
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
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
];

/* ─── Footer column links ────────────────────────────── */
const footerLinks = {
  Product: ['Image', 'Video', 'Audio', 'Pricing'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy', 'Terms', 'Cookies'],
};

/* ─── Audio wave animation bars ─────────────────────── */
function AudioWave() {
  const bars = [0.4, 0.75, 1, 0.6, 0.85, 0.5, 0.9, 0.65];
  return (
    <div className="flex items-end gap-[3px] h-[32px]">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            height: `${h * 100}%`,
            background: 'rgba(255,255,255,0.25)',
            animation: `waveBar ${0.8 + i * 0.1}s ease-in-out ${i * 0.08}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function Home() {

  return (
    <>
      <Navbar />

      {/* Page wrapper — top padding accounts for fixed navbar + mobile sub-nav */}
      <main className="min-h-screen font-dm" style={{ paddingTop: '70px', background: '#080808' }}>
        <div className="w-full" style={{ padding: '16px' }}>

          {/* ══════════════════════════════════════
              HERO BLOCK
          ══════════════════════════════════════ */}
          <section
            className="w-full flex flex-col items-center justify-center text-center animate-fadeUp"
            style={{
              borderRadius: '14px',
              height: '280px',
              background: 'linear-gradient(135deg, #1a1535 0%, #0f1520 40%, #151025 70%, #0d0d0d 100%)',
              marginBottom: '16px',
            }}
          >
            <h1
              className="font-[300] text-white"
              style={{ fontSize: '30px', letterSpacing: '-0.02em', marginBottom: '8px', fontFamily: 'var(--font-clash)' }}
            >
              Welcome to keyo.studio
            </h1>
            <p
              className="font-dm"
              style={{ fontSize: '12px', color: '#444', maxWidth: '340px', lineHeight: '1.6' }}
            >
              Generate images, videos and audio with top AI models
            </p>
          </section>

          {/* ══════════════════════════════════════
              TOOL CARDS — 3 columns
          ══════════════════════════════════════ */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fadeUp delay-100"
            style={{ marginBottom: '16px' }}
          >
            {/* Image card */}
            <Link href="/image" className="group block" style={{ borderRadius: '12px', background: '#111', border: '0.5px solid #1e1e1e', overflow: 'hidden', textDecoration: 'none' }}>
              <div
                style={{
                  height: '200px',
                  background: 'linear-gradient(160deg, #2a1f4a, #1a1535)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {/* Decorative shapes */}
                <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(83,47,207,0.35)', top: 20, left: 30, filter: 'blur(20px)' }} />
                <div style={{ position: 'absolute', width: 60, height: 60, borderRadius: '50%', background: 'rgba(120,80,255,0.2)', bottom: 10, right: 24, filter: 'blur(14px)' }} />
                {/* Image icon */}
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                {/* Badge */}
                <span
                  style={{
                    position: 'absolute', top: 10, left: 10,
                    background: '#532fcf', color: '#fff',
                    fontSize: '10px', fontWeight: 600,
                    padding: '2px 8px', borderRadius: '4px',
                    fontFamily: 'inherit',
                  }}
                >
                  Image
                </span>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#fff', margin: 0, fontFamily: 'var(--font-clash)' }}>Image</p>

              </div>
            </Link>

            {/* Video card */}
            <Link href="/video" className="group block" style={{ borderRadius: '12px', background: '#111', border: '0.5px solid #1e1e1e', overflow: 'hidden', textDecoration: 'none' }}>
              <div
                style={{
                  height: '200px',
                  background: 'linear-gradient(160deg, #1a2535, #0f1520)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', width: 90, height: 60, borderRadius: '50%', background: 'rgba(30,80,150,0.3)', top: 15, left: 20, filter: 'blur(18px)' }} />
                {/* Play button */}
                <div
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)" stroke="none">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
                <span
                  style={{
                    position: 'absolute', top: 10, left: 10,
                    background: '#1a3a5c', color: '#7ab3e8',
                    fontSize: '10px', fontWeight: 600,
                    padding: '2px 8px', borderRadius: '4px',
                  }}
                >
                  Video
                </span>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#fff', margin: 0, fontFamily: 'var(--font-clash)' }}>Video</p>

              </div>
            </Link>

            {/* Audio card */}
            <Link href="/audio" className="group block" style={{ borderRadius: '12px', background: '#111', border: '0.5px solid #1e1e1e', overflow: 'hidden', textDecoration: 'none' }}>
              <div
                style={{
                  height: '200px',
                  background: 'linear-gradient(160deg, #2a1f2a, #1f1525)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', width: 80, height: 50, borderRadius: '50%', background: 'rgba(100,40,100,0.3)', bottom: 10, right: 20, filter: 'blur(18px)' }} />
                <AudioWave />
                <span
                  style={{
                    position: 'absolute', top: 10, left: 10,
                    background: '#2a1f2a', color: '#d060d0',
                    fontSize: '10px', fontWeight: 600,
                    padding: '2px 8px', borderRadius: '4px',
                    border: '0.5px solid #4a2f4a',
                  }}
                >
                  Audio
                </span>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#fff', margin: 0, fontFamily: 'var(--font-clash)' }}>Audio</p>

              </div>
            </Link>
          </div>

          {/* ══════════════════════════════════════
              COMMUNITY GALLERY
          ══════════════════════════════════════ */}
          <section
            className="animate-fadeUp delay-200"
            style={{
              background: '#111',
              border: '0.5px solid #1e1e1e',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            {/* Gallery header */}
            <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
              <div>
                <p className="font-[600] text-white" style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-clash)' }}>
                  Community Gallery
                </p>
                <p className="font-dm" style={{ fontSize: '11px', color: '#555', margin: '2px 0 0' }}>
                  Created by our users
                </p>
              </div>
              <Link
                href="/explore"
                className="font-dm font-[500] hover:text-white transition-colors duration-200"
                style={{ fontSize: '12px', color: '#532fcf' }}
              >
                See all ›
              </Link>
            </div>

            {/* Static placeholder gallery grid */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {galleryImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative overflow-hidden"
                  style={{ aspectRatio: '3/4', borderRadius: '8px', cursor: 'pointer', background: img.gradient }}
                >
                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end"
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)',
                      borderRadius: '8px',
                      padding: '10px 8px 8px',
                    }}
                  >
                    <p
                      className="font-dm text-white"
                      style={{ fontSize: '9px', lineHeight: '1.4', opacity: 0.8, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {img.prompt}
                    </p>
                    <button
                      className="font-dm font-[600] text-white w-full"
                      style={{
                        fontSize: '9px',
                        background: '#532fcf',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                      }}
                    >
                      ✦ Try prompt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ══════════════════════════════════════
            FOOTER
        ══════════════════════════════════════ */}
          <footer
            style={{ background: '#532fcf', padding: '48px 48px 32px', marginTop: '12px' }}
          >
          <div className="w-full">
            {/* Top grid: logo col + 3 link cols */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12" style={{ marginBottom: '28px' }}>

              {/* Logo + description + socials */}
              <div>
                <p className="font-syne font-[800] text-white" style={{ fontSize: '18px', marginBottom: '10px' }}>
                  keyo.studio
                </p>
                <p className="font-dm" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', lineHeight: '1.7', marginBottom: '16px', maxWidth: '200px' }}>
                  Generate images, videos and audio with the world&apos;s best AI models all in one place.
                </p>
                {/* Social icons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="flex items-center justify-center transition-opacity duration-200 hover:opacity-70"
                      style={{
                        width: 30, height: 30,
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
                        <path d={s.path} />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>

              {/* Link columns */}
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

            {/* Bottom bar */}
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
      </main>
    </>
  );
}
