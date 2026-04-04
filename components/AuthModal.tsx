'use client';
import React from 'react';
import { SignIn } from '@clerk/nextjs';

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
        className="relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE BUTTON */}
        <button 
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-[#1a1a1a] border border-white/10 hover:bg-white/10 text-[#666] hover:text-white transition-all text-xl shadow-lg"
          onClick={onClose}
        >
          ×
        </button>

        {/* Clerk SignIn — handles Google, Apple, Email natively */}
        <SignIn
          routing="hash"
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
              headerTitle: 'font-syne text-white',
              headerSubtitle: 'font-dm text-[#555]',
              socialButtonsBlockButton: 'bg-[#141414] border border-white/[0.08] hover:bg-[#1a1a1a] text-[#f0f0f0] font-dm',
              formFieldInput: 'bg-[#111] border-white/[0.08] text-white font-dm',
              formButtonPrimary: 'bg-[#ff3377] hover:brightness-110 font-dm font-semibold',
              footerActionLink: 'text-[#ff3377] hover:text-[#ff3377]/80',
              dividerLine: 'bg-white/[0.06]',
              dividerText: 'text-[#333] font-dm',
            },
          }}
        />
      </div>
    </div>
  );
}
