'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user-credits')
        .then(res => res.json())
        .then(data => {
          if (data.credits !== undefined) setCredits(data.credits);
        })
        .catch(() => setCredits(null));
    }
  }, [isSignedIn]);

  const navLinks = [
    { name: 'Explore', href: '/' },
    { name: 'Image', href: '/image' },
    { name: 'Video', href: '/video' },
    { name: 'Audio', href: '/audio' },
  ];

  /* Derive avatar initial from email */
  const avatarLetter =
    user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'K';

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress ??
    'User';

  return (
    <>
      {/* Main navbar — fixed card style with offsets */}
      <nav
        className="fixed top-0 h-[64px] z-[100] transition-all"
        style={{ left: '30px', right: '30px', backgroundColor: '#532fcf', borderRadius: '0 0 14px 14px' }}
      >
        <div className="h-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-baseline gap-0 cursor-pointer shrink-0">
            <span style={{ fontFamily: 'var(--font-clash)', fontWeight: 700, color: '#fff', fontSize: '20px', letterSpacing: '-0.01em' }}>keyo</span>
            <span style={{ fontFamily: 'var(--font-clash)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontSize: '20px' }}>.</span>
            <span style={{ fontFamily: 'var(--font-clash)', fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontSize: '20px' }}>studio</span>
          </Link>

          {/* ── Center nav tabs — desktop only ── */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`
                    px-4 py-1.5 font-dm font-[500] text-[14px] transition-all duration-200
                    ${isActive
                      ? 'text-white'
                      : 'text-white/60 hover:text-white'
                    }
                  `}
                  style={isActive ? {
                    background: 'rgba(255,255,255,0.15)',
                    border: '0.5px solid rgba(255,255,255,0.25)',
                    borderRadius: '20px',
                  } : undefined}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* ── Right side controls ── */}
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              style={{
                padding: '6px 16px',
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.15)',
                border: '0.5px solid rgba(255,255,255,0.3)',
                borderRadius: 20,
              }}
            >
              Pricing
            </Link>

            {isSignedIn ? (
              /* ── SIGNED IN: avatar + hover dropdown ── */
              <div className="relative group" style={{ paddingBottom: '8px' }}>
                {/* Purple avatar button */}
                <button
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center overflow-hidden cursor-pointer shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                  aria-label="User menu"
                >
                  <span className="font-syne font-[800] text-white text-[14px] leading-none">
                    {avatarLetter}
                  </span>
                </button>

                {/* Hover dropdown */}
                <div
                  className="absolute top-[calc(100%-8px)] right-0 pt-2 opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto transition-all duration-150 z-[200]"
                >
                  <div className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl p-2 min-w-[200px] shadow-2xl">

                    {/* User info */}
                    <div className="px-2.5 py-2">
                      <p className="font-dm font-[500] text-[13px] text-white truncate">{displayName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span className="font-dm text-[12px] text-white/70">
                          {credits !== null ? `${credits} credits` : '... credits'}
                        </span>
                      </div>
                    </div>

                    <div className="h-[1px] bg-white/[0.06] my-1.5" />

                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[13px] text-[#888] hover:text-white hover:bg-white/[0.04] transition-all duration-150 font-dm"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                      View profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[13px] text-[#888] hover:text-white hover:bg-white/[0.04] transition-all duration-150 font-dm"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      Settings
                    </Link>

                    <div className="h-[1px] bg-white/[0.06] my-1.5" />

                    <button
                      onClick={() => signOut({ redirectUrl: '/' })}
                      className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[13px] text-[#888] hover:text-white hover:bg-white/[0.04] transition-all duration-150 font-dm"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── SIGNED OUT: Login + Sign up ── */
              <>
                <button
                  onClick={() => router.push('/sign-in')}
                  className="font-dm font-[500] text-[13px] text-white hover:text-white/80 transition-colors duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '0.5px solid rgba(255,255,255,0.25)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                  }}
                >
                  Login
                </button>
                <button
                  onClick={() => router.push('/sign-up')}
                  className="font-dm font-[600] text-[13px] text-[#532fcf] hover:opacity-90 transition-opacity duration-200"
                  style={{
                    background: '#fff',
                    borderRadius: '8px',
                    padding: '6px 14px',
                  }}
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile subordinate nav bar ── */}
      <div
        className="flex md:hidden fixed h-[44px] z-[99] overflow-hidden"
        style={{ top: '64px', left: '30px', right: '30px', background: '#532fcf', borderRadius: '0 0 14px 14px' }}
      >
        <style jsx>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        <div className="no-scrollbar h-full flex items-center justify-center overflow-x-auto gap-2 px-4 whitespace-nowrap">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`px-4 py-1.5 font-dm font-[500] text-[13px] transition-all ${
                  isActive ? 'text-white' : 'text-white/60'
                }`}
                style={isActive ? {
                  background: 'rgba(255,255,255,0.15)',
                  border: '0.5px solid rgba(255,255,255,0.25)',
                  borderRadius: '20px',
                } : undefined}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
