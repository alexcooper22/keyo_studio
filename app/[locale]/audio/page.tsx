'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';

const bars = [20,40,60,30,80,50,90,40,70,55,85,35,65,75,45,95,25,60,80,50,70,40,85,30,60,90,45,75,55,80];

export default function AudioPage() {
  const [prompt, setPrompt] = useState('');

  return (
    <>
      <Navbar />
      <main className="font-dm min-h-screen" style={{ paddingTop: '60px', background: 'var(--bg)' }}>

        {/* ── Hero ── */}
        <div className="relative flex flex-col items-center justify-center text-center" style={{ height: 'calc(100vh - 245px)', padding: '0 clamp(16px, 5vw, 32px)', overflow: 'hidden' }}>

          {/* Dot grid */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(120,80,255,0.11) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 30%, black 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 30%, black 20%, transparent 100%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Glow orb */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: '10%', left: '50%',
            width: '700px', height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(83,47,207,0.18) 0%, rgba(60,30,180,0.07) 45%, transparent 68%)',
            transform: 'translateX(-50%)',
            borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Top shimmer */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.4), transparent)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Waveform — bottom decoration */}
          <div aria-hidden="true" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', display: 'flex', alignItems: 'flex-end', gap: '3px', padding: '0 40px', opacity: 0.08, zIndex: 0 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, borderRadius: '3px 3px 0 0', height: `${h}%`, background: 'linear-gradient(to top, rgba(83,47,207,0.8), rgba(140,80,255,0.4))' }} />
            ))}
          </div>

          <div className="relative" style={{ zIndex: 1 }}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2" style={{
              background: 'rgba(83,47,207,0.1)',
              border: '0.5px solid rgba(83,47,207,0.3)',
              borderRadius: '20px',
              padding: '4px 12px',
              marginBottom: '20px',
            }}>
              <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '9px' }}>✦</span>
              <span className="font-dm" style={{ color: 'rgba(120,80,255,0.7)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Audio Generation
              </span>
            </div>

            <h1 className="font-clash" style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: '14px',
              color: '#fff',
            }}>
              Bring your scene<br />
              to life with{' '}
              <span style={{
                background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                sound
              </span>
            </h1>

            <p className="font-dm" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.32)', lineHeight: 1.7 }}>
              Generate music, voiceovers and sound effects with AI
            </p>
          </div>
        </div>

        {/* ── Prompt bar ── */}
        <div className="fixed bottom-[65px] md:bottom-0 left-0 right-0 z-50 px-2 md:px-8 pb-2 md:pb-8 pointer-events-none">
          <div
            className="w-full max-w-4xl mx-auto rounded-t-2xl rounded-b-xl border-t border-l border-r border-white/[0.08] shadow-2xl overflow-hidden pointer-events-auto"
            style={{ backgroundColor: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          >
            <div className="p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 border-b border-white/[0.06]">
              <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center rounded-xl border border-white/[0.04] text-text-secondary" style={{ background: 'var(--bg)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onInput={(e) => {
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                }}
                placeholder="Describe the sound you imagine..."
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
                className="flex-1 bg-transparent border-none outline-none text-white font-dm text-sm placeholder:text-text-secondary resize-none py-2"
              />
              <button
                className="flex items-center justify-center gap-2 transition-all flex-shrink-0"
                style={{
                  padding: '12px 22px',
                  background: 'linear-gradient(135deg, #532fcf 0%, #7c5cf0 100%)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  fontFamily: 'var(--font-clash)',
                  color: '#fff',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(83,47,207,0.45), 0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                <span style={{ fontSize: '10px', color: 'rgba(200,170,255,0.9)' }}>✦</span>
                Generate
              </button>
            </div>

            <div className="px-4 md:px-5 py-2 md:py-3 flex flex-wrap items-center gap-2 md:gap-3">
              <div className="px-3 py-1 rounded-full border font-dm text-[11px] md:text-xs flex items-center gap-1.5" style={{ background: 'rgba(83,47,207,0.08)', border: '0.5px solid rgba(83,47,207,0.2)', color: 'rgba(120,80,255,0.8)' }}>
                <span style={{ fontSize: '8px' }}>✦</span> ElevenLabs v3
              </div>
              <button className="px-3 py-1 rounded-full border border-white/10 font-dm text-[11px] md:text-xs text-text-secondary flex items-center gap-1.5 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
                🎵 Music
              </button>
              <button className="px-3 py-1 rounded-full border border-white/10 font-dm text-[11px] md:text-xs text-text-secondary flex items-center gap-1.5 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
                🎤 Voiceover
              </button>
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
