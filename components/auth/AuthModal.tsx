'use client';
import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';

interface AuthModalProps {
  onClose: () => void;
}

const clerkAppearance = {
  variables: {
    colorPrimary: '#532fcf',
    colorBackground: '#0f0f0f',
    colorText: '#f0f0f0',
    colorInputBackground: '#111111',
    colorInputText: '#f0f0f0',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'shadow-2xl w-full',
    card: 'bg-[#0f0f0f] border border-white/[0.08] shadow-2xl w-full',
    formButtonPrimary: 'bg-accent hover:brightness-110 font-dm font-semibold',
    footerActionLink: 'text-accent',
  },
};

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start md:items-center justify-center bg-[rgba(0,0,0,0.80)] backdrop-blur-[6px] overflow-y-auto"
      style={{ padding: '16px 12px calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center w-full my-auto"
        style={{ maxWidth: '400px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute z-10 flex items-center justify-center bg-[#1a1a1a] border border-white/10 hover:bg-white/10 text-[#666] hover:text-white transition-all shadow-lg"
          style={{ top: '-10px', right: '-6px', width: '28px', height: '28px', borderRadius: '50%', fontSize: '18px', lineHeight: 1 }}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setMode('signin')}
            className="font-dm text-sm transition-all"
            style={{
              padding: '6px 18px',
              borderRadius: '9px',
              fontWeight: mode === 'signin' ? 600 : 400,
              background: mode === 'signin' ? 'linear-gradient(135deg, #532fcf 0%, #7c5cf0 100%)' : 'transparent',
              color: mode === 'signin' ? '#fff' : 'rgba(255,255,255,0.4)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: mode === 'signin' ? '0 0 12px rgba(83,47,207,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className="font-dm text-sm transition-all"
            style={{
              padding: '6px 18px',
              borderRadius: '9px',
              fontWeight: mode === 'signup' ? 600 : 400,
              background: mode === 'signup' ? 'linear-gradient(135deg, #532fcf 0%, #7c5cf0 100%)' : 'transparent',
              color: mode === 'signup' ? '#fff' : 'rgba(255,255,255,0.4)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: mode === 'signup' ? '0 0 12px rgba(83,47,207,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Clerk component */}
        <div className="w-full">
          {mode === 'signin' ? (
            <SignIn routing="hash" fallbackRedirectUrl="/" appearance={clerkAppearance} />
          ) : (
            <SignUp routing="hash" fallbackRedirectUrl="/" appearance={clerkAppearance} />
          )}
        </div>
      </div>
    </div>
  );
}
