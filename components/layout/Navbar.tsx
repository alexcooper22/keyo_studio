'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useClerk, SignIn, SignUp } from '@clerk/nextjs';
import Portal from '../ui/Portal';
import Logo from '../ui/Logo';

const clerkAppearance = {
  variables: {
    colorPrimary: '#532fcf',
    colorBackground: '#111111',
    colorText: '#f0f0f0',
    colorInputBackground: '#1a1a1a',
    colorInputText: '#f0f0f0',
    colorTextSecondary: 'rgba(255,255,255,0.35)',
    borderRadius: '8px',
    fontFamily: 'var(--font-dm)',
  },
  elements: {
    rootBox: 'w-full',
    card: '!bg-[#111111] !shadow-none !border-0 !rounded-none',
    header: '!hidden',
    main: '!bg-[#111111]',
    footer: '!bg-[#111111]',
    footerAction: '!bg-[#111111]',
    footerActionLink: '!text-[#7c5cf0] hover:!text-[#9b7eff]',
    socialButtonsBlockButton: '!border-[rgba(255,255,255,0.07)] !bg-[rgba(255,255,255,0.03)] hover:!bg-[rgba(255,255,255,0.06)] !text-white/70',
    formButtonPrimary: '!bg-[#532fcf] hover:!brightness-110',
    dividerLine: '!bg-[rgba(255,255,255,0.06)]',
    dividerText: '!text-[rgba(255,255,255,0.25)]',
    formFieldInput: '!bg-[#1e1e1e] !border-[rgba(255,255,255,0.18)] focus:!border-[rgba(120,80,255,0.5)]',
    formFieldLabel: '!text-[rgba(255,255,255,0.45)] !text-[12px]',
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const [credits, setCredits] = useState<number | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const fetchCredits = async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch('/api/user-credits');
      const data = await res.json();
      if (data.credits !== undefined) setCredits(data.credits);
    } catch {
      setCredits(null);
    }
  };

  useEffect(() => {
    if (isSignedIn) fetchCredits();
  }, [isSignedIn]);

  useEffect(() => {
    const handler = () => fetchCredits();
    window.addEventListener('credits-updated', handler);
    return () => window.removeEventListener('credits-updated', handler);
  }, [isSignedIn]);

  useEffect(() => {
    if (!showAuthModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAuthModal(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAuthModal]);

  // Close modal when user signs in
  useEffect(() => {
    if (isSignedIn) setShowAuthModal(false);
  }, [isSignedIn]);

  const navLinks = [
    { name: 'Explore', href: '/' },
    { name: 'Image', href: '/image' },
    { name: 'Video', href: '/video' },
    { name: 'Audio', href: '/audio' },
    { name: 'Pricing', href: '/pricing' },
  ];

  const avatarLetter = user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'K';
  const displayName = user?.fullName ?? user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User';

  return (
    <>
      <style>{`
        .nav-active { color: rgba(170,140,255,0.95) !important; background: rgba(120,80,255,0.1); border: 0.5px solid rgba(120,80,255,0.22); border-radius: 20px; }
        .nav-drop { opacity: 0; visibility: hidden; pointer-events: none; transform: translateY(-4px); transition: opacity 0.15s ease, visibility 0.15s ease, transform 0.15s ease; }
        .nav-avatar:hover .nav-drop { opacity: 1; visibility: visible; pointer-events: auto; transform: translateY(0); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Clerk modal overrides — scoped to keyo-auth-modal */
        .keyo-auth-modal .cl-card { background: #111111 !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
        .keyo-auth-modal .cl-header { display: none !important; }
        .keyo-auth-modal .cl-footer,
        .keyo-auth-modal .cl-footer > *,
        .keyo-auth-modal [class*="cl-footer"] { background: #111111 !important; }
        .keyo-auth-modal [class*="cl-internal"] { background: #111111 !important; }
        .keyo-auth-modal .cl-rootBox { width: 100% !important; }
        .keyo-auth-modal [class*="formButtonPrimary"] { background: linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%) !important; background-color: transparent !important; }
        .keyo-auth-modal [class*="formButtonPrimary"] * { background: transparent !important; background-color: transparent !important; }
      `}</style>

      {/* ── Main navbar ── */}
      <nav
        className="fixed top-0 z-[100]"
        style={{
          left: '16px',
          right: '16px',
          height: '60px',
          background: 'rgba(6,6,6,0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: '0 0 16px 16px',
          borderLeft: '0.5px solid rgba(255,255,255,0.05)',
          borderRight: '0.5px solid rgba(255,255,255,0.05)',
          boxShadow: '0 0 0 1px rgba(83,47,207,0.06), 0 8px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >

        <div className="h-full px-4 flex items-center justify-between">

          {/* ── Logo ── */}
          <Logo size={19} />

          {/* ── Center nav links ── */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-4 py-1.5 font-dm font-[500] text-[13px] transition-all duration-150 ${isActive ? 'nav-active' : 'text-white/38 hover:text-white/80'}`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* ── Right controls ── */}
          <div className="flex items-center gap-1.5">

            {isSignedIn ? (
              /* ── Signed in ── */
              <div className="nav-avatar relative">
                <button
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 hover:opacity-75"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                  aria-label="User menu"
                >
                  <span className="font-syne font-[800] text-white text-[13px] leading-none select-none">
                    {avatarLetter}
                  </span>
                </button>

                <div className="nav-drop absolute top-full right-0 pt-3 z-[200]">
                  <div
                    className="rounded-2xl p-2 min-w-[210px] shadow-2xl"
                    style={{ background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="px-3 py-2.5 flex items-center gap-2.5">
                      <div
                        className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(83,47,207,0.5), rgba(140,90,255,0.3))', border: '1px solid rgba(120,80,255,0.3)' }}
                      >
                        <span className="font-syne font-[800] text-white text-[11px]">{avatarLetter}</span>
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-dm font-[500] text-[12px] text-white truncate leading-tight">{displayName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '9px' }}>✦</span>
                          <span className="font-dm text-[11px] text-white/30">
                            {credits !== null ? `${credits} credits` : '···'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[1px] mx-1 my-1.5" style={{ background: 'rgba(255,255,255,0.05)' }} />

                    <Link href="/dashboard" className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] text-white/40 hover:text-white hover:bg-white/[0.04] transition-all duration-150 font-dm">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      View profile
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] text-white/40 hover:text-white hover:bg-white/[0.04] transition-all duration-150 font-dm">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      Settings
                    </Link>

                    <div className="h-[1px] mx-1 my-1.5" style={{ background: 'rgba(255,255,255,0.05)' }} />

                    <button
                      onClick={() => signOut({ redirectUrl: '/' })}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] text-white/40 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150 font-dm"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sign out
                    </button>
                  </div>
                </div>
              </div>

            ) : (
              /* ── Signed out — icon triggers full modal ── */
              <>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 hover:opacity-75"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                  aria-label="Sign in or create account"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </button>

                {showAuthModal && (
                  <Portal>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-[500]"
                      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                      onClick={() => setShowAuthModal(false)}
                    />

                    {/* Modal */}
                    <div
                      className="fixed z-[501] w-full"
                      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: '440px', padding: '0 16px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        style={{
                          background: '#111111',
                          border: '0.5px solid rgba(83,47,207,0.35)',
                          borderRadius: '14px',
                          overflow: 'hidden',
                          boxShadow: '0 0 0 1px rgba(83,47,207,0.08), 0 0 60px rgba(83,47,207,0.22), 0 20px 60px rgba(0,0,0,0.7)',
                          position: 'relative',
                        }}
                      >
                        {/* Top shimmer */}
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                          background: 'linear-gradient(90deg, transparent 0%, rgba(120,80,255,0.4) 30%, rgba(83,47,207,0.8) 50%, rgba(120,80,255,0.4) 70%, transparent 100%)',
                          pointerEvents: 'none', zIndex: 2,
                        }} />

                        {/* Glow orb */}
                        <div style={{
                          position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)',
                          width: '340px', height: '220px',
                          background: 'radial-gradient(ellipse at center, rgba(83,47,207,0.22) 0%, transparent 68%)',
                          pointerEvents: 'none',
                        }} />

                        {/* Dot grid */}
                        <div aria-hidden="true" style={{
                          position: 'absolute', inset: 0,
                          backgroundImage: 'radial-gradient(rgba(120,80,255,0.07) 1px, transparent 1px)',
                          backgroundSize: '24px 24px',
                          maskImage: 'radial-gradient(ellipse 90% 55% at 50% 0%, black 0%, transparent 80%)',
                          WebkitMaskImage: 'radial-gradient(ellipse 90% 55% at 50% 0%, black 0%, transparent 80%)',
                          pointerEvents: 'none',
                        }} />

                        {/* ── Header ── */}
                        <div className="relative flex flex-col items-center px-5 pt-5 pb-4" style={{ borderBottom: '0.5px solid rgba(83,47,207,0.15)' }}>

                          {/* Close button */}
                          <button
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors"
                            aria-label="Close"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>

                          {/* Logo */}
                          <Logo size={18} />

                          {/* Badge */}
                          <div className="inline-flex items-center gap-1.5 mt-3 mb-4" style={{
                            background: 'rgba(83,47,207,0.08)',
                            border: '0.5px solid rgba(83,47,207,0.22)',
                            borderRadius: '20px', padding: '3px 10px',
                          }}>
                            <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '8px' }}>✦</span>
                            <span style={{ color: 'rgba(120,80,255,0.6)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}>AI Creative Studio</span>
                          </div>

                          {/* Tab switcher */}
                          <div className="flex items-center gap-1">
                            {(['login', 'signup'] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setAuthMode(mode)}
                                className="font-dm font-[500] text-[13px] transition-all duration-150 px-3 py-1"
                                style={{
                                  background: authMode === mode ? 'rgba(83,47,207,0.12)' : 'transparent',
                                  border: authMode === mode ? '0.5px solid rgba(83,47,207,0.35)' : '0.5px solid transparent',
                                  borderRadius: '20px',
                                  color: authMode === mode ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.32)',
                                }}
                              >
                                {mode === 'login' ? 'Login' : 'Sign up'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ── Clerk form ── */}
                        <div className="keyo-auth-modal relative" style={{ padding: '0 8px 4px' }}>
                          {authMode === 'login' ? (
                            <SignIn
                              routing="virtual"
                              afterSignInUrl="/"
                              signUpUrl="/sign-up"
                              appearance={clerkAppearance}
                            />
                          ) : (
                            <SignUp
                              routing="virtual"
                              afterSignUpUrl="/"
                              signInUrl="/sign-in"
                              appearance={clerkAppearance}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </Portal>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[100] flex"
        aria-label="Mobile navigation"
        style={{
          height: '65px',
          background: 'rgba(6,6,6,0.96)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-around w-full h-full px-2" style={{ overflow: 'visible' }}>

          {/* Home */}
          <Link href="/" className="flex flex-col items-center gap-[3px] flex-1 py-2 transition-colors duration-150"
            style={{ color: pathname === '/' ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.3)' }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="font-dm text-[10px] font-[500]">Home</span>
          </Link>

          {/* Image */}
          <Link href="/image" className="flex flex-col items-center gap-[3px] flex-1 py-2 transition-colors duration-150"
            style={{ color: pathname === '/image' ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.3)' }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span className="font-dm text-[10px] font-[500]">Image</span>
          </Link>

          {/* Generate — center elevated */}
          <div className="flex flex-col items-center flex-1 relative" style={{ top: '-14px' }}>
            <Link href="/image" aria-label="Generate"
              className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl mb-1"
              style={{ background: 'linear-gradient(135deg, #532fcf 0%, #7c5cf0 100%)', boxShadow: '0 4px 24px rgba(83,47,207,0.55), 0 0 0 1px rgba(120,80,255,0.3)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(220,200,255,1)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12"/>
                <circle cx="12" cy="12" r="2.5"/>
              </svg>
            </Link>
            <span className="font-dm text-[10px] font-[500]" style={{ color: 'rgba(255,255,255,0.3)' }}>Generate</span>
          </div>

          {/* Video */}
          <Link href="/video" className="flex flex-col items-center gap-[3px] flex-1 py-2 transition-colors duration-150"
            style={{ color: pathname === '/video' ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.3)' }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            <span className="font-dm text-[10px] font-[500]">Video</span>
          </Link>

          {/* Audio */}
          <Link href="/audio" className="flex flex-col items-center gap-[3px] flex-1 py-2 transition-colors duration-150"
            style={{ color: pathname === '/audio' ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.3)' }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <span className="font-dm text-[10px] font-[500]">Audio</span>
          </Link>

        </div>
      </nav>
    </>
  );
}
