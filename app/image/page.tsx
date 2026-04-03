'use client';
import React from 'react';
import Navbar from '../../components/Navbar';

export default function ImageDashboard() {
  return (
    <div className="min-h-screen bg-[var(--bg)] pl-[48px] pt-[64px] pb-[120px] relative">
      <Navbar />
      {/* Left Sidebar */}
      <aside className="fixed top-[64px] left-0 bottom-0 w-[48px] bg-[#0a0a0a] border-r border-white/[0.06] z-40 flex flex-col items-center py-6 gap-6">
        {/* History Icon */}
        <button className="text-[#555] hover:text-[var(--accent)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
        {/* Community Icon */}
        <button className="text-[#555] hover:text-[var(--accent)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </button>
      </aside>

      {/* Main Canvas Area (Masonry Grid) */}
      <main className="max-w-[1600px] mx-auto w-full px-6 pt-6 relative z-10">
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {[
            'aspect-[9/16]', 'aspect-square', 'aspect-video', 'aspect-[4/5]',
            'aspect-[16/9]', 'aspect-[4/3]', 'aspect-[9/16]', 'aspect-square'
          ].map((aspect, i) => (
            <div key={i} className={`relative rounded-xl overflow-hidden bg-gradient-to-br from-[#161616] to-[#0f0f0f] border border-white/[0.06] hover:border-white/10 group break-inside-avoid ${aspect} shadow-lg transition-colors`}>
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent w-[200%] animate-[shimmer_2.5s_ease_infinite]"></div>
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-start justify-end p-3 gap-2 backdrop-blur-[2px]">
                {/* Download Icon */}
                <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-[var(--accent)] flex items-center justify-center text-white backdrop-blur-md transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
                {/* Heart Icon */}
                <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-[var(--accent)] flex items-center justify-center text-white backdrop-blur-md transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Prompt Bar */}
      <div className="fixed bottom-0 left-[48px] right-0 z-50 px-4 md:px-8 pb-8 pointer-events-none">
        <div className="w-full max-w-4xl mx-auto rounded-t-2xl rounded-b-xl border-t border-l border-r border-white/[0.08] shadow-2xl overflow-hidden pointer-events-auto" style={{ backgroundColor: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(16px)' }}>
          {/* Top Row: Input */}
          <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 border-b border-white/[0.06]">
            {/* Add Button */}
            <button className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#080808] border border-white/[0.04] text-[#888] hover:text-white hover:border-white/20 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            
            {/* Text Input */}
            <input 
              type="text" 
              placeholder="Describe the image you imagine..." 
              className="flex-1 bg-transparent border-none outline-none text-white font-dm text-lg placeholder:text-[#555]"
            />
            
            {/* Generate Button */}
            <button className="px-7 py-3.5 bg-[var(--accent)] text-black font-dm font-[700] rounded-xl flex items-center justify-center gap-2 hover:bg-[var(--accent2)] hover:shadow-[0_0_20px_rgba(255,51,119,0.3)] transition-all flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              Generate
            </button>
          </div>

          {/* Bottom Row: Settings */}
          <div className="px-5 py-3 flex flex-wrap items-center gap-3">
            {[
              { label: 'Flux Pro ▾', active: false },
              { label: '1:1', active: false },
              { label: '2K', active: false },
              { label: '— 1/4 +', active: false },
              { divider: true },
              { label: 'Style', active: false }
            ].map((pill, idx) => (
              pill.divider ? (
                <div key={idx} className="w-[1px] h-4 bg-white/10 mx-1"></div>
              ) : (
                <button key={idx} className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-[#888] font-dm text-xs hover:bg-white/10 hover:text-white transition-colors">
                  {pill.label}
                </button>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
