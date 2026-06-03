'use client';
import React, { useEffect } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';
import Portal from '../ui/Portal';

interface AuthModalProps {
  onClose: () => void;
  authMode: 'login' | 'signup';
  setAuthMode: (mode: 'login' | 'signup') => void;
}

const clerkAppearance = {
  elements: {
    rootBox: 'w-full',
    card: '!shadow-none !border-0 !rounded-none',
    header: '!hidden',
    formFieldInput: { fontSize: '16px' },
    badge: '!bg-[rgba(83,47,207,0.08)] !text-[#7c5cf0] !border-[rgba(83,47,207,0.3)] !rounded-full !font-medium',
  },
};

export default function AuthModal({ onClose, authMode, setAuthMode }: AuthModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [onClose]);

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center overflow-hidden p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
        onClick={onClose}
      >
        <div className="relative w-full" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
          <div
            className="flex overflow-hidden"
            style={{
              background: '#111111',
              border: '0.5px solid rgba(83,47,207,0.35)',
              borderRadius: '16px',
              boxShadow: '0 0 0 1px rgba(83,47,207,0.08), 0 0 60px rgba(83,47,207,0.22), 0 20px 60px rgba(0,0,0,0.7)',
              position: 'relative',
              maxHeight: 'calc(100vh - 32px)',
              alignItems: 'stretch',
            }}
          >
            {/* LEFT: form panel */}
            <div className="relative flex flex-col w-full md:w-[400px] flex-shrink-0" style={{ zIndex: 1, background: '#ffffff', height: 'min(600px, calc(100vh - 32px))' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(120,80,255,0.4) 30%, rgba(83,47,207,0.8) 50%, rgba(120,80,255,0.4) 70%, transparent 100%)', pointerEvents: 'none', zIndex: 2 }} />
              <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '340px', height: '220px', background: 'radial-gradient(ellipse at center, rgba(83,47,207,0.22) 0%, transparent 68%)', pointerEvents: 'none' }} />
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(120,80,255,0.07) 1px, transparent 1px)', backgroundSize: '24px 24px', maskImage: 'radial-gradient(ellipse 90% 55% at 50% 0%, black 0%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 55% at 50% 0%, black 0%, transparent 80%)', pointerEvents: 'none' }} />

              <div className="relative flex flex-col items-center px-5 pt-5 pb-4" style={{ borderBottom: '0.5px solid rgba(83,47,207,0.15)' }}>
                <button onClick={onClose} className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors" aria-label="Close">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <div style={{ display: 'inline-flex', alignItems: 'baseline', marginBottom: '16px' }}>
                  <span style={{ fontFamily: 'var(--font-clash)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111111' }}>keyo</span>
                  <span style={{ fontFamily: 'var(--font-clash)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #7c5cf0 0%, #532fcf 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>.</span>
                  <span style={{ fontFamily: 'var(--font-clash)', fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em', color: '#532fcf', opacity: 0.75 }}>studio</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['login', 'signup'] as const).map((mode) => (
                    <button key={mode} onClick={() => setAuthMode(mode)} className="font-dm font-[500] text-[13px] transition-all duration-150 px-3 py-1"
                      style={{ background: authMode === mode ? 'rgba(83,47,207,0.1)' : 'transparent', border: authMode === mode ? '0.5px solid rgba(83,47,207,0.35)' : '0.5px solid rgba(0,0,0,0.1)', borderRadius: '20px', color: authMode === mode ? '#532fcf' : '#6b7280' }}>
                      {mode === 'login' ? 'Login' : 'Sign up'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="keyo-auth-modal relative" style={{ padding: '0', marginTop: 'auto' }}>
                {authMode === 'login' ? (
                  <SignIn routing="hash" fallbackRedirectUrl="/" signUpUrl="/sign-up" appearance={clerkAppearance} />
                ) : (
                  <SignUp routing="hash" fallbackRedirectUrl="/" signInUrl="/sign-in" appearance={clerkAppearance} />
                )}
              </div>
            </div>

            {/* RIGHT: showcase panel */}
            <div className="hidden md:block flex-1 relative overflow-hidden">
              <img src="/hero-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.15) 100%)' }} />
              <button onClick={onClose} className="absolute top-3 right-3 flex items-center justify-center transition-all" style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <div className="absolute inset-y-0 left-0 w-8" style={{ background: 'linear-gradient(to right, #111111, transparent)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-7">
                <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full" style={{ background: 'rgba(120,80,255,0.18)', border: '0.5px solid rgba(120,80,255,0.35)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="font-dm text-xs font-medium" style={{ color: 'rgba(200,170,255,0.9)' }}>AI Creative Studio</span>
                </div>
                <h2 className="text-white text-2xl leading-tight mb-2" style={{ fontFamily: 'var(--font-clash)', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Generate stunning<br />images with AI
                </h2>
                <p className="font-dm text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Powered by Gemini, Flux, SDXL and more.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
