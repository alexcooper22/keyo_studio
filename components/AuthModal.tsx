'use client';
import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.75)] backdrop-blur-[4px] p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-[#1a1a1a] border border-white/10 hover:bg-white/10 text-[#666] hover:text-white transition-all text-xl shadow-lg"
          onClick={onClose}
        >
          ×
        </button>

        {mode === 'signin' ? (
          <SignIn
            routing="path"
            path="/sign-in"
            afterSignInUrl="/"
            signUpUrl="/sign-up"
            appearance={{
              variables: {
                colorPrimary: '#ff3377',
                colorBackground: '#0f0f0f',
                colorText: '#f0f0f0',
                colorInputBackground: '#111111',
                colorInputText: '#f0f0f0',
                borderRadius: '0.75rem',
              },
              elements: {
                rootBox: 'shadow-2xl',
                card: 'bg-[#0f0f0f] border border-white/[0.08] shadow-2xl',
                formButtonPrimary: 'bg-[#ff3377] hover:brightness-110 font-dm font-semibold',
                footerActionLink: 'text-[#ff3377]',
              },
            }}
          />
        ) : (
          <SignUp
            routing="path"
            path="/sign-up"
            afterSignUpUrl="/"
            signInUrl="/sign-in"
            appearance={{
              variables: {
                colorPrimary: '#ff3377',
                colorBackground: '#0f0f0f',
                colorText: '#f0f0f0',
                colorInputBackground: '#111111',
                colorInputText: '#f0f0f0',
                borderRadius: '0.75rem',
              },
              elements: {
                rootBox: 'shadow-2xl',
                card: 'bg-[#0f0f0f] border border-white/[0.08] shadow-2xl',
                formButtonPrimary: 'bg-[#ff3377] hover:brightness-110 font-dm font-semibold',
                footerActionLink: 'text-[#ff3377]',
              },
            }}
          />
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setMode('signin')}
            className={`px-4 py-1.5 rounded-lg text-sm font-dm transition-all ${mode === 'signin' ? 'bg-[#ff3377] text-black font-semibold' : 'text-[#666] hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`px-4 py-1.5 rounded-lg text-sm font-dm transition-all ${mode === 'signup' ? 'bg-[#ff3377] text-black font-semibold' : 'text-[#666] hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
