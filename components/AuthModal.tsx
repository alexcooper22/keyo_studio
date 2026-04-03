'use client';
import React from 'react';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.75)] backdrop-blur-[4px] p-4 transition-all duration-300"
      onClick={onClose}
    >
      <div 
        className="w-[440px] bg-[#0f0f0f] border border-white/[0.08] rounded-2xl p-10 relative overflow-hidden flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE BUTTON */}
        <button 
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/10 text-[#666] hover:text-white transition-all text-xl"
          onClick={onClose}
        >
          ×
        </button>

        {/* MODAL HEADER */}
        <div className="w-11 h-11 bg-[var(--accent)] rounded-full flex items-center justify-center font-syne font-[700] text-black text-xl mb-4">
          K
        </div>
        <h2 className="font-syne font-[700] text-[22px] text-white text-center">Welcome to Keyo</h2>
        <p className="font-dm text-[13px] text-[#555] text-center mt-1">Sign up and generate for free</p>

        {/* SOCIAL BUTTONS */}
        <div className="w-full flex flex-col gap-2.5 mt-8">
          {/* Google Button */}
          <button className="h-12 bg-[#141414] border border-white/[0.08] rounded-lg flex items-center justify-center gap-3 hover:bg-[#1a1a1a] transition-all duration-200">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18c-.77 1.56-1.21 3.31-1.21 5.14 0 1.83.44 3.58 1.21 5.14l3.66-2.51z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span className="font-dm text-[13px] text-[#f0f0f0]">Continue with Google</span>
          </button>

          {/* Apple Button */}
          <button className="h-12 bg-[#141414] border border-white/[0.08] rounded-lg flex items-center justify-center gap-3 hover:bg-[#1a1a1a] transition-all duration-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.96.95-2.17 2.37-3.66 2.37-1.42 0-1.87-.89-3.57-.89-1.69 0-2.2.87-3.57.89-1.44.02-2.81-1.57-3.78-2.54-1.98-1.98-3.41-5.59-1.37-9.1.99-1.74 2.8-2.85 4.77-2.87 1.48-.02 2.89 1 3.82 1 .91 0 2.65-1.22 4.41-1.04.74.03 2.81.3 4.14 2.24-4.88 2.86-4.11 9.17.65 11.23-.74 1.83-2.01 3.98-2.9 4.9zM12.03 5.4c-.06-1.63 1.27-3.15 2.81-4.06.15 1.77-1.44 3.4-2.81 4.06z" />
            </svg>
            <span className="font-dm text-[13px] text-[#f0f0f0]">Continue with Apple</span>
          </button>

          {/* Email Button */}
          <button className="h-12 bg-[#141414] border border-white/[0.08] rounded-lg flex items-center justify-center gap-3 hover:bg-[#1a1a1a] transition-all duration-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span className="font-dm text-[13px] text-[#f0f0f0]">Continue with Email</span>
          </button>
        </div>

        {/* DIVIDER */}
        <div className="flex items-center gap-3 w-full my-6">
          <div className="flex-1 h-[1px] bg-white/[0.06]"></div>
          <span className="font-dm text-[11px] text-[#333]">OR</span>
          <div className="flex-1 h-[1px] bg-white/[0.06]"></div>
        </div>

        {/* TERMS TEXT */}
        <p className="font-dm text-[11px] text-[#333] text-center leading-relaxed max-w-[280px]">
          By continuing, I agree to the{' '}
          <button className="text-[#555] hover:text-[var(--accent)] transition-colors">Terms of Service</button>
          {' '}and{' '}
          <button className="text-[#555] hover:text-[var(--accent)] transition-colors">Privacy Policy</button>
        </p>
      </div>
    </div>
  );
}
