'use client';

import React, { useState, useRef } from 'react';
import Navbar from '../../components/Navbar';

export default function AudioPage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bars = [20,40,60,30,80,50,90,40,70,55,85,35,65,75,45,95,25,60,80,50,70,40,85,30,60,90,45,75,55,80];

  return (
    <>
      <Navbar />
      <main className="min-h-screen" style={{ paddingTop: '64px', background: '#080808' }}>

        {/* Hero */}
        <div className="relative flex flex-col items-center justify-center text-center" style={{ height: 'calc(100vh - 200px)', padding: '0 20px' }}>
          {/* Wave background */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end gap-[3px] px-8" style={{ height: '120px', opacity: 0.12 }}>
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: '#532fcf' }} />
            ))}
          </div>

          <p style={{ fontSize: '11px', color: '#532fcf', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 600 }}>
            Audio Generation
          </p>
          <h1 style={{ fontSize: '48px', fontWeight: 300, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '12px', fontFamily: 'var(--font-clash)' }}>
            Bring your scene<br />to life with sound
          </h1>
          <p style={{ fontSize: '14px', color: '#444' }}>
            Generate music, voiceovers and sound effects with AI
          </p>
        </div>

        {/* Prompt bar - Adapted from Image Page */}
        <div className="fixed bottom-0 left-0 right-0 z-50 px-2 md:px-8 pb-3 md:pb-8 pointer-events-none">
          <div className="w-full max-w-4xl mx-auto rounded-t-2xl rounded-b-xl border-t border-l border-r border-white/[0.08] shadow-2xl overflow-hidden pointer-events-auto" style={{ backgroundColor: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(16px)' }}>
            
            {/* Top Row: Input */}
            <div className="p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 border-b border-white/[0.06]">
              <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#080808] border border-white/[0.04] text-[#888]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                style={{
                  minHeight: '44px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
                className="flex-1 bg-transparent border-none outline-none text-white font-dm text-sm placeholder:text-[#555] resize-none py-2"
              />
              <div className="flex flex-col gap-1.5 items-center">
                <button 
                  className="px-4 md:px-7 py-3 md:py-3.5 bg-[#532fcf] text-white font-dm font-[700] rounded-xl flex items-center justify-center gap-2 hover:bg-[#633fdf] transition-all flex-shrink-0"
                >
                  ⚡ Generate
                </button>
              </div>
            </div>

            {/* Bottom Row: Settings */}
            <div className="px-4 md:px-5 py-2 md:py-3 flex flex-wrap items-center gap-2 md:gap-3">
              <div className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 font-dm text-[11px] md:text-xs text-[#888] flex items-center gap-1.5">
                <span className="text-[#532fcf]">●</span> ElevenLabs v3
              </div>
              <div className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 font-dm text-[11px] md:text-xs text-[#888] flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
                🎵 Music
              </div>
              <div className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 font-dm text-[11px] md:text-xs text-[#888] flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
                🎤 Voiceover
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
