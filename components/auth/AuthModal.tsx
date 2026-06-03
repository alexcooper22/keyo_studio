'use client';
import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';

interface AuthModalProps {
  onClose: () => void;
}

const clerkAppearance = {
  variables: {
    colorPrimary: '#532fcf',
    colorBackground: 'transparent',
    colorText: '#f0f0f0',
    colorInputBackground: 'rgba(255,255,255,0.06)',
    colorInputText: '#f0f0f0',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full',
    card: 'bg-transparent shadow-none border-none w-full !p-0',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    header: 'hidden',
    formButtonPrimary: 'bg-accent hover:brightness-110 font-dm font-semibold',
    footerActionLink: 'text-accent',
    socialButtonsBlockButton: { color: '#ffffff !important' },
    socialButtonsBlockButtonText: { color: '#ffffff !important' },
    formFieldInput: { fontSize: '16px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', color: '#f0f0f0' },
    footer: { background: 'transparent' },
    main: { gap: '12px' },
  },
};

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-[6px] p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full overflow-hidden"
        style={{ maxWidth: '860px', borderRadius: '20px', background: '#0d0d12', border: '0.5px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-all"
          style={{ top: '14px', right: '14px', width: '30px', height: '30px', borderRadius: '50%', fontSize: '18px', lineHeight: 1 }}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {/* LEFT — form panel */}
        <div className="flex flex-col w-full md:w-[420px] flex-shrink-0 overflow-y-auto" style={{ padding: '36px 32px 32px' }}>
          {/* Logo + heading */}
          <div className="mb-6">
            <div className="font-syne font-black text-white text-2xl mb-1">
              keyo<span style={{ color: '#7c5cf0' }}>.studio</span>
            </div>
            <p className="font-dm text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {mode === 'signin' ? 'Welcome back — sign in to continue' : 'Create your account for free'}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 mb-5 p-1 rounded-xl self-start" style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="font-dm text-sm transition-all"
                style={{
                  padding: '5px 16px',
                  borderRadius: '9px',
                  fontWeight: mode === m ? 600 : 400,
                  background: mode === m ? 'linear-gradient(135deg, #532fcf 0%, #7c5cf0 100%)' : 'transparent',
                  color: mode === m ? '#fff' : 'rgba(255,255,255,0.38)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: mode === m ? '0 0 12px rgba(83,47,207,0.4)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Clerk */}
          <div className="w-full">
            {mode === 'signin' ? (
              <SignIn routing="hash" fallbackRedirectUrl="/" appearance={clerkAppearance} />
            ) : (
              <SignUp routing="hash" fallbackRedirectUrl="/" appearance={clerkAppearance} />
            )}
          </div>
        </div>

        {/* RIGHT — showcase panel (hidden on mobile) */}
        <div className="hidden md:block flex-1 relative overflow-hidden" style={{ minHeight: '560px' }}>
          <img
            src="/hero-bg.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* gradient overlay */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 100%)' }} />
          {/* top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.6), transparent)' }} />

          {/* bottom text */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full" style={{ background: 'rgba(120,80,255,0.2)', border: '0.5px solid rgba(120,80,255,0.4)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="font-dm text-xs font-medium" style={{ color: 'rgba(200,170,255,0.9)' }}>AI Creative Studio</span>
            </div>
            <h2 className="font-syne font-black text-white text-3xl leading-tight mb-2">
              Generate stunning<br />images with AI
            </h2>
            <p className="font-dm text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Powered by the latest models — Gemini, Flux, SDXL and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
