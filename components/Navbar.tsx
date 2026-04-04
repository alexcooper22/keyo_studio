'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useUser, useClerk } from '@clerk/nextjs';

export default function Navbar() {
  const pathname = usePathname();
  const { setShowModal } = useAuth();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user-credits')
        .then(res => res.json())
        .then(data => {
          if (data.credits !== undefined) {
            setCredits(data.credits);
          }
        })
        .catch(() => setCredits(null));
    }
  }, [isSignedIn]);

  const navLinks = [
    { name: 'Explore', href: '/' },
    { name: 'Image', href: '/image' },
    { name: 'Video', href: '/video' },
    { name: 'Text', href: '/text', badge: 'NEW' },
  ];

  /* Derive avatar initial from email */
  const avatarLetter = user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'K';

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress ??
    'User';

  return (
    <>
      {/* Top accent line */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-[var(--accent)] z-[101]" />

      <nav
        className="fixed top-[3px] left-0 right-0 h-[48px] md:h-[54px] z-[100] border-b border-[var(--border)] backdrop-blur-xl transition-all"
        style={{ backgroundColor: 'rgba(8,8,8,0.92)' }}
      >
        <div className="h-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-baseline gap-[2px] cursor-pointer relative shrink-0">
            <div className="absolute -top-1 left-0 w-1 h-1 bg-[var(--accent2)] rounded-full" />
            <span className="font-syne font-[800] text-[var(--accent)] text-lg md:text-xl tracking-tight">keyo</span>
            <span className="font-syne font-[800] text-[var(--accent)]/70 text-xs md:text-sm">.studio</span>
          </Link>

          {/* Center Tabs — desktop only */}
          <div className="hidden md:flex items-center h-full gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`h-full flex items-center transition-opacity duration-200 font-dm font-[600] text-[15px] gap-2 ${
                    isActive
                      ? 'text-white opacity-100 border-b-[1.5px] border-[var(--accent)] bg-transparent pt-[1.5px]'
                      : 'text-[#ffffff] opacity-75 hover:opacity-100 cursor-pointer'
                  }`}
                >
                  {link.name}
                  {link.badge && (
                    <span className="bg-[var(--accent)] text-[#000000] text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* Pricing link */}
            <Link
              href="/pricing"
              className={`font-dm font-[600] text-[13px] md:text-[15px] transition-opacity duration-200 ${
                pathname === '/pricing'
                  ? 'text-white md:opacity-100'
                  : 'text-[#888] md:text-white md:opacity-75 md:hover:opacity-100'
              }`}
            >
              Pricing
            </Link>

            <div className="flex items-center gap-3 md:gap-4">
              {isSignedIn ? (
                /* ── SIGNED IN: avatar + hover dropdown ── */
                <div className="relative group" style={{ paddingBottom: '8px' }}>
                  {/* Avatar trigger */}
                  <button
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center overflow-hidden cursor-pointer shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #00ffc8, #00d4a8)' }}
                    aria-label="User menu"
                  >
                    <span className="font-syne font-[800] text-black text-[15px] leading-none">
                      {avatarLetter}
                    </span>
                  </button>

                  {/* Hover dropdown */}
                  <div
                    className="absolute top-[calc(100%-8px)] right-0 pt-2 opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto transition-all duration-150 z-[200]"
                  >
                    <div className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl p-2 min-w-[200px] shadow-2xl">

                      {/* Section 1 — user info */}
                      <div className="px-2.5 py-2">
                        <p className="font-dm font-[500] text-[13px] text-white truncate">{displayName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="#ff3377" stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span className="font-dm text-[12px] text-[#ff3377]">
                            {credits !== null ? `${credits} credits` : '... credits'}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-[1px] bg-white/[0.06] my-1.5" />

                      {/* Section 2 — nav links */}
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

                      {/* Divider */}
                      <div className="h-[1px] bg-white/[0.06] my-1.5" />

                      {/* Section 3 — sign out */}
                      <button
                        onClick={() => signOut({ redirectUrl: '/' })}
                        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[13px] text-[#ff3377] hover:brightness-125 hover:bg-white/[0.04] transition-all duration-150 font-dm"
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
                    onClick={() => setShowModal(true)}
                    className="text-[#888] md:text-white md:opacity-75 md:hover:opacity-100 font-dm font-[600] text-[13px] md:text-[15px] transition-opacity duration-200 pointer-events-auto"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-[var(--accent)] text-black font-dm font-[600] text-[12px] md:text-[15px] px-3 md:px-4 py-1.5 rounded-lg hover:scale-105 transition-transform duration-200 pointer-events-auto shrink-0"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Subordinate Nav Bar */}
      <div
        className="flex md:hidden fixed top-[51px] left-0 right-0 h-[44px] bg-[#0a0a0a] border-b border-white/[0.06] z-[99] overflow-hidden"
      >
        <style jsx>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        <div className="no-scrollbar h-full flex items-center justify-center overflow-x-auto gap-3 px-4 whitespace-nowrap">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`px-4 py-1.5 rounded-full font-dm font-medium text-[13px] transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#ff3377] bg-[#ff3377]/10 border border-[#ff3377]/20 shadow-[0_0_12px_rgba(255,51,119,0.1)]'
                    : 'text-[#888] bg-transparent border border-transparent'
                }`}
              >
                {link.name}
                {link.badge && (
                  <span className="bg-[#ff3377] text-white text-[9px] font-bold px-1 py-0.5 rounded-sm">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
