'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useClerk, SignIn, SignUp } from '@clerk/nextjs';
import Portal from '../ui/Portal';
import Logo from '../ui/Logo';

const clerkAppearance = {
  elements: {
    rootBox: 'w-full',
    card: '!shadow-none !border-0 !rounded-none',
    header: '!hidden',
    formFieldInput: { fontSize: '16px' },
    badge: '!bg-[rgba(83,47,207,0.08)] !text-[#7c5cf0] !border-[rgba(83,47,207,0.3)] !rounded-full !font-medium',
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const [credits, setCredits] = useState<number | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const fetchCredits = async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch('/api/user-credits');
      const data = await res.json();
      if (data.credits !== undefined) setCredits(data.credits);
      if (data.isAdmin !== undefined) setUserIsAdmin(data.isAdmin);
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
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [showAuthModal]);

  // Close modal when user signs in
  useEffect(() => {
    if (isSignedIn) setShowAuthModal(false);
  }, [isSignedIn]);

  const navLinks = [
    { name: 'Explore', href: '/' },
    { name: 'Image', href: '/image' },
    { name: 'Video', href: '/video' },
  ];

  const avatarLetter = (
    (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')
  ).toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'K';
  const displayName = user?.fullName ?? user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User';

  return (
    <>
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
        }}
      >

        <div className="h-full px-4 flex items-center justify-between">

          {/* ── Logo ── */}
          <Logo size={23} />

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
          <div className="flex items-center gap-2">

            {/* ── Pricing pill ── */}
            <Link
              href="/pricing"
              className="pricing-pill hidden md:inline-flex items-center gap-1.5 font-dm font-[500] text-[12px] transition-colors duration-200"
              style={{
                padding: '5px 11px 5px 8px',
                borderRadius: '20px',
                background: 'rgba(120,80,255,0.15)',
                border: '1px solid rgba(120,80,255,0.3)',
                color: 'rgba(190,165,255,0.9)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
              Pricing
            </Link>

            {isSignedIn ? (
              /* ── Signed in ── */
              <div>
                <button
                  ref={avatarButtonRef}
                  onClick={() => {
                    if (avatarButtonRef.current) {
                      const r = avatarButtonRef.current.getBoundingClientRect();
                      setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
                    }
                    setShowUserMenu(v => !v);
                  }}
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 hover:border-[rgba(120,80,255,0.5)]"
                  style={{
                    background: 'rgba(120,80,255,0.15)',
                    border: '1px solid rgba(120,80,255,0.3)',
                  }}
                  aria-label="User menu"
                >
                  <span className="font-dm font-[600] leading-none select-none" style={{ fontSize: avatarLetter.length > 1 ? '10px' : '12px', color: 'rgba(190,165,255,0.9)' }}>
                    {avatarLetter}
                  </span>
                </button>

                {showUserMenu && (
                  <Portal>
                    <div className="fixed inset-0 z-[300]" onClick={() => setShowUserMenu(false)} />
                    <div
                      className="fixed z-[301] rounded-2xl p-2 min-w-[210px] shadow-2xl"
                      style={{ top: menuPos.top, right: menuPos.right, background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-2.5 flex items-center gap-2.5">
                        <div
                          className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(135deg, rgba(83,47,207,0.5), rgba(140,90,255,0.3))', border: '1px solid rgba(120,80,255,0.3)' }}
                        >
                          <span className="font-syne font-[800] text-white leading-none" style={{ fontSize: avatarLetter.length > 1 ? '9px' : '11px' }}>{avatarLetter}</span>
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

                      <Link href="/dashboard" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] text-white/40 hover:text-white hover:bg-white/[0.04] transition-all duration-150 font-dm">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        View profile
                      </Link>
                      <Link href="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] text-white/40 hover:text-white hover:bg-white/[0.04] transition-all duration-150 font-dm">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        Settings
                      </Link>

                      <div className="h-[1px] mx-1 my-1.5" style={{ background: 'rgba(255,255,255,0.05)' }} />

                      <button
                        onClick={() => { setShowUserMenu(false); signOut({ redirectUrl: '/' }); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] text-white/40 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150 font-dm"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign out
                      </button>
                    </div>
                  </Portal>
                )}
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
                      className="fixed inset-0 z-[500] flex items-center justify-center overflow-hidden p-4"
                      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                      onClick={() => setShowAuthModal(false)}
                    >
                    {/* Modal */}
                    <div
                      className="relative w-full"
                      style={{ maxWidth: '820px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
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
                        {/* ── LEFT: form panel ── */}
                        <div className="relative flex flex-col w-full md:w-[400px] flex-shrink-0" style={{ zIndex: 1, background: '#ffffff', height: 'min(600px, calc(100vh - 32px))' }}>
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

                            {/* Logo — dark variant for light bg */}
                            <div style={{ display: 'inline-flex', alignItems: 'baseline', marginBottom: '16px' }}>
                              <span style={{ fontFamily: 'var(--font-clash)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111111' }}>keyo</span>
                              <span style={{ fontFamily: 'var(--font-clash)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #7c5cf0 0%, #532fcf 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>.</span>
                              <span style={{ fontFamily: 'var(--font-clash)', fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em', color: '#532fcf', opacity: 0.75 }}>studio</span>
                            </div>

                            {/* Tab switcher */}
                            <div className="flex items-center gap-1">
                              {(['login', 'signup'] as const).map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => setAuthMode(mode)}
                                  className="font-dm font-[500] text-[13px] transition-all duration-150 px-3 py-1"
                                  style={{
                                    background: authMode === mode ? 'rgba(83,47,207,0.1)' : 'transparent',
                                    border: authMode === mode ? '0.5px solid rgba(83,47,207,0.35)' : '0.5px solid rgba(0,0,0,0.1)',
                                    borderRadius: '20px',
                                    color: authMode === mode ? '#532fcf' : '#6b7280',
                                  }}
                                >
                                  {mode === 'login' ? 'Login' : 'Sign up'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ── Clerk form ── */}
                          <div className="keyo-auth-modal relative" style={{ padding: '0', marginTop: 'auto' }}>
                            {authMode === 'login' ? (
                              <SignIn
                                routing="hash"
                                fallbackRedirectUrl="/"
                                signUpUrl="/sign-up"
                                appearance={clerkAppearance}
                              />
                            ) : (
                              <SignUp
                                routing="hash"
                                fallbackRedirectUrl="/"
                                signInUrl="/sign-in"
                                appearance={clerkAppearance}
                              />
                            )}
                          </div>
                        </div>

                        {/* ── RIGHT: showcase panel (desktop only) ── */}
                        <div className="hidden md:block flex-1 relative overflow-hidden">
                          <img
                            src="/hero-bg.jpg"
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          {/* gradient */}
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.15) 100%)' }} />

                          {/* Close button */}
                          <button
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-3 right-3 flex items-center justify-center transition-all"
                            style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
                            aria-label="Close"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                          {/* left edge fade */}
                          <div className="absolute inset-y-0 left-0 w-8" style={{ background: 'linear-gradient(to right, #111111, transparent)' }} />

                          {/* bottom text */}
                          <div className="absolute bottom-0 left-0 right-0 p-7">
                            <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full" style={{ background: 'rgba(120,80,255,0.18)', border: '0.5px solid rgba(120,80,255,0.35)' }}>
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              <span className="font-dm text-xs font-medium" style={{ color: 'rgba(200,170,255,0.9)' }}>AI Creative Studio</span>
                            </div>
                            <h2 className="text-white text-2xl leading-tight mb-2" style={{ fontFamily: 'var(--font-clash)', fontWeight: 700, letterSpacing: '-0.02em' }}>
                              Generate stunning<br />images with AI
                            </h2>
                            <p className="font-dm text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              Powered by Gemini, Flux, SDXL and more.
                            </p>
                          </div>
                        </div>

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
        className="md:hidden fixed bottom-0 left-0 right-0 z-[100]"
        aria-label="Mobile navigation"
        style={{
          height: 'calc(65px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(6,6,6,0.96)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          height: '65px', overflow: 'visible',
        }}>

          {/* Image */}
          <Link href="/image"
            className="flex flex-col items-center justify-center gap-[3px] active:opacity-60 transition-opacity"
            style={{
              color: pathname === '/image' ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.3)',
              touchAction: 'manipulation', minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span className="font-dm text-[10px] font-[500]">Image</span>
          </Link>

          {/* Home — center elevated */}
          <div className="flex flex-col items-center justify-center relative" style={{ top: '-14px', WebkitTapHighlightColor: 'transparent' }}>
            <Link href="/" aria-label="Home"
              className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl mb-1 active:opacity-75 transition-opacity"
              style={{
                background: pathname === '/' ? 'linear-gradient(135deg, #532fcf 0%, #7c5cf0 100%)' : 'linear-gradient(135deg, #3d2299 0%, #5a3fd4 100%)',
                boxShadow: '0 4px 24px rgba(83,47,207,0.55), 0 0 0 1px rgba(120,80,255,0.3)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(220,200,255,1)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </Link>
            <span className="font-dm text-[10px] font-[500]" style={{ color: pathname === '/' ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.3)' }}>Home</span>
          </div>

          {/* Video */}
          <Link href="/video"
            className="flex flex-col items-center justify-center gap-[3px] active:opacity-60 transition-opacity"
            style={{
              color: pathname === '/video' ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.3)',
              touchAction: 'manipulation', minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            <span className="font-dm text-[10px] font-[500]">Video</span>
          </Link>

        </div>
      </nav>
    </>
  );
}
