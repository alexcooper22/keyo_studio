'use client';
import React from 'react';

export default function FeatureCards() {
  return (
<section className="px-4 md:px-6 max-w-7xl mx-auto w-full mb-16 flex flex-col gap-4 z-10 relative">
      {/* Row 1: 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Text */}
        <div className="animate-fadeUp delay-100 bg-[var(--bg2)] rounded-2xl border border-white/[0.06] hover:border-[var(--accent)]/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ease-in-out p-6 flex flex-col h-[280px]">
          <div className="flex justify-between items-start mb-auto">
            <h3 className="font-syne font-[800] text-xl text-white">Text</h3>
            <div className="flex gap-1">
              <span className="text-[10px] font-dm font-[500] text-[var(--accent2)] border border-[rgba(128,255,229,0.3)] bg-[rgba(128,255,229,0.08)] px-2 py-1 rounded">COPY</span>
              <span className="text-[10px] font-dm font-[500] text-[var(--accent2)] border border-[rgba(128,255,229,0.3)] bg-[rgba(128,255,229,0.08)] px-2 py-1 rounded">POST</span>
              <span className="text-[10px] font-dm font-[500] text-[var(--accent2)] border border-[rgba(128,255,229,0.3)] bg-[rgba(128,255,229,0.08)] px-2 py-1 rounded">SCRIPT</span>
            </div>
          </div>
          <div className="bg-[#080808] rounded-xl p-4 mt-6 border border-white/[0.04]">
            <div className="w-[90%] h-2 bg-white/20 rounded mb-3"></div>
            <div className="w-[70%] h-2 bg-white/10 rounded mb-3"></div>
            <div className="w-[85%] h-2 bg-white/10 rounded mb-3"></div>
            <div className="flex items-center gap-1">
              <div className="w-[50%] h-2 bg-white/10 rounded"></div>
              <span className="w-1 h-3.5 bg-[var(--accent)] animate-[blink_1s_step-end_infinite]"></span>
            </div>
          </div>
        </div>

        {/* Card 2: Image */}
        <div className="animate-fadeUp delay-200 bg-[var(--bg2)] rounded-2xl border border-white/[0.06] hover:border-[var(--accent)]/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ease-in-out p-6 flex flex-col h-[280px] overflow-hidden relative">
          <div className="relative z-10 flex justify-between items-start mb-auto">
            <h3 className="font-syne font-[800] text-xl text-white">Image</h3>
          </div>
          {/* Abstract shapes */}
          <div className="absolute top-0 left-0 w-[80px] h-[80px] bg-[var(--accent)]/15 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 right-4 w-16 h-16 bg-[var(--teal)]/10 rounded-full blur-xl"></div>
          
          <div className="bg-[#080808]/80 backdrop-blur-md rounded-xl p-3 mt-6 border border-white/[0.04] flex flex-col gap-2 relative z-10">
            <div className="w-full h-20 bg-gradient-to-br from-[var(--purple)]/40 to-[var(--teal)]/40 rounded-lg mb-1"></div>
            <div className="w-3/4 h-1.5 bg-white/20 rounded"></div>
            <div className="w-1/2 h-1.5 bg-white/10 rounded"></div>
          </div>
        </div>

        {/* Card 3: Video */}
        <div className="animate-fadeUp delay-300 bg-[var(--bg2)] rounded-2xl border border-white/[0.06] hover:border-[var(--accent)]/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ease-in-out p-6 flex flex-col h-[280px]">
          <div className="flex justify-between items-start mb-auto relative z-10">
            <h3 className="font-syne font-[800] text-xl text-white">Video</h3>
            <span className="text-[10px] font-dm font-[500] bg-white/10 text-white px-2 py-1 rounded">4K</span>
          </div>
          <div className="bg-[#080808] rounded-xl flex items-center justify-center h-32 mt-6 border border-white/[0.04] relative group cursor-pointer overflow-hidden">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-[var(--accent)] transition-colors relative z-10">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white group-hover:border-l-black border-b-[6px] border-b-transparent ml-1 transition-colors"></div>
            </div>
            
            {/* Tags Bottom Left */}
            <div className="absolute bottom-4 left-3 flex gap-1 z-10">
              <span className="text-[8px] font-dm font-[500] bg-black/50 text-white/70 px-1.5 py-0.5 rounded">KLING</span>
              <span className="text-[8px] font-dm font-[500] bg-black/50 text-white/70 px-1.5 py-0.5 rounded">RUNWAY</span>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <div className="h-1 bg-[var(--accent)]" style={{ width: '38%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Card 4: Audio */}
        <div className="animate-fadeUp delay-400 bg-[var(--bg2)] rounded-2xl border border-white/[0.06] hover:border-[var(--accent)]/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ease-in-out p-6 flex flex-col md:flex-row items-center gap-6 overflow-hidden">
          <div className="flex-1 w-full">
            <h3 className="font-syne font-[800] text-xl text-[var(--red)] mb-2">Audio</h3>
            <p className="font-dm text-sm text-[var(--muted2)]">Generate voices, sound effects, and music.</p>
          </div>
          <div className="w-full md:w-1/2 h-20 flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div 
                key={i} 
                className="w-2 bg-[var(--red)] rounded-full animate-[pulse-dot_1s_ease_infinite]" 
                style={{ 
                  height: `${20 + Math.random() * 80}%`,
                  animationDelay: `${i * 100}ms`
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Card 5: Edit */}
        <div className="animate-fadeUp delay-[500ms] bg-[var(--bg2)] rounded-2xl border border-white/[0.06] hover:border-[var(--accent)]/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ease-in-out p-6 flex flex-col md:flex-row items-center gap-6 overflow-hidden relative">
          <div className="relative z-10 flex-1 w-full">
            <h3 className="font-syne font-[800] text-xl text-[var(--teal)] mb-2">Edit</h3>
            <p className="font-dm text-sm text-[var(--muted2)]">Enhance, upsize, and modify anything.</p>
          </div>
          <div className="w-full md:w-1/2 h-24 bg-[#080808] rounded-xl border border-white/[0.04] relative overflow-hidden flex items-center justify-center">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--teal)]/20 to-transparent w-[200%] animate-[shimmer_2.2s_ease_infinite]"></div>
            <div className="text-[var(--teal)] font-syne font-[800] tracking-widest text-lg relative z-10 opacity-80">MAGIC</div>
          </div>
        </div>
      </div>
    </section>
  );
}
