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
    { name: 'Text', href: '/text' },
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
      {/* Main navbar — no border-bottom, blends with page background */}
      <nav
        className="fixed top-0 left-0 right-0 h-[54px] z-[100] backdrop-blur-xl transition-all"
        style={{ backgroundColor: 'rgba(8,8,8,0.95)' }}
      >
        <div className="h-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-baseline gap-0 cursor-pointer shrink-0">
            <span className="font-syne font-[800] text-[#532fcf] text-[18px] tracking-tight">keyo</span>
            <span className="font-syne font-[800] text-white/30 text-[18px]">.</span>
            <span className="font-syne font-[600] text-[#aaa] text-[18px]">studio</span>
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
                      ? 'text-white rounded-[20px]'
                      : 'text-[#555] hover:text-[#999] rounded-[20px]'
                    }
                  `}
                  style={isActive ? {
                    background: '#1e1e1e',
                    border: '0.5px solid #2e2e2e',
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

            {/* Pricing button with badge */}
            <Link
              href="/pricing"
              className="hidden md:flex items-center gap-2 font-dm font-[500] text-[13px] text-[#aaa] hover:text-white transition-colors duration-200"
              style={{
                background: '#111',
                border: '0.5px solid #1e1e1e',
                borderRadius: '8px',
                padding: '5px 12px',
              }}
            >
              Pricing
              <span
                className="font-dm font-[700] text-[10px] leading-none"
                style={{ color: '#532fcf' }}
              >
                30% OFF
              </span>
            </Link>

            {/* Vertical divider */}
            <div
              className="hidden md:block h-[20px] mx-1 shrink-0"
              style={{ width: '0.5px', background: '#1e1e1e' }}
            />

            {isSignedIn ? (
              /* ── SIGNED IN: avatar + hover dropdown ── */
              <div className="relative group" style={{ paddingBottom: '8px' }}>
                {/* Purple avatar button */}
                <button
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center overflow-hidden cursor-pointer shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95"
                  style={{ background: '#532fcf' }}
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
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#532fcf" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span className="font-dm text-[12px]" style={{ color: '#532fcf' }}>
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
                  className="font-dm font-[500] text-[13px] text-[#aaa] hover:text-white transition-colors duration-200"
                  style={{
                    background: '#111',
                    border: '0.5px solid #1e1e1e',
                    borderRadius: '8px',
                    padding: '6px 14px',
                  }}
                >
                  Login
                </button>
                <button
                  onClick={() => router.push('/sign-up')}
                  className="font-dm font-[600] text-[13px] text-white hover:opacity-90 transition-opacity duration-200"
                  style={{
                    background: '#532fcf',
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
        className="flex md:hidden fixed top-[54px] left-0 right-0 h-[44px] z-[99] overflow-hidden"
        style={{ background: '#080808' }}
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
                  isActive ? 'text-white' : 'text-[#555]'
                }`}
                style={isActive ? {
                  background: '#1e1e1e',
                  border: '0.5px solid #2e2e2e',
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
