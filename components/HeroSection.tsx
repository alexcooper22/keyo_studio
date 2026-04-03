'use client';
import React from 'react';

export default function HeroSection() {
  return (
    <section className="pt-[92px] md:pt-[88px] pb-16 flex flex-col items-center text-center px-4 relative overflow-hidden">
      {/* Radial glow background */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--accent)]/10 blur-[120px] rounded-full -z-10 hidden md:block pointer-events-none" />

      {/* Eyebrow Pill */}
      <div className="animate-fadeUp flex items-center gap-2 border border-[var(--accent)]/30 rounded-full px-3 py-1.5 mb-6 bg-[var(--bg)]/50 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" style={{ animation: 'pulse-dot 2s ease infinite' }} />
        <span className="font-dm text-sm text-[#f0f0f0]">AI Creative Platform</span>
      </div>

      {/* H1 Headline */}
      <h1 className="animate-fadeUp delay-100 font-syne font-[800] text-[clamp(32px,8vw,68px)] leading-tight tracking-tight text-white mb-6">
        Create anything with <span className="text-[var(--accent)]">AI.</span>
      </h1>

      {/* Subtitle */}
      <p className="animate-fadeUp delay-200 font-dm font-[300] text-[var(--muted2)] text-[14px] md:text-lg px-4 md:px-0 max-w-[440px] mb-8">
        Generate texts, images, and videos with top-tier AI models all in one powerful workspace. Perfect for creators and businesses.
      </p>

      {/* CTA Buttons */}
      <div className="animate-fadeUp delay-300 flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
        <button className="bg-[var(--accent)] text-black font-dm font-[500] px-6 py-3 rounded-lg hover:scale-105 transition-transform duration-200 w-full md:w-auto max-w-[280px] md:max-w-none">
          Start creating
        </button>
        <button className="border border-white/20 text-white font-dm font-[500] px-6 py-3 rounded-lg hover:bg-white/5 transition-colors duration-200 w-full md:w-auto max-w-[280px] md:max-w-none">
          See examples
        </button>
      </div>
    </section>
  );
}
