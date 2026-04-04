'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useUser, UserButton } from '@clerk/nextjs';

export default function Navbar() {
  const pathname = usePathname();
  const { setShowModal } = useAuth();
  const { isSignedIn } = useUser();

  const navLinks = [
    { name: 'Explore', href: '/' },
    { name: 'Image', href: '/image' },
    { name: 'Video', href: '/video' },
    { name: 'Text', href: '/text', badge: 'NEW' },
  ];

  return (
    <>
      {/* Top Solid Line */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-[var(--accent)] z-[101]" />
      
      <nav className="fixed top-[3px] left-0 right-0 h-[48px] md:h-[54px] z-[100] border-b border-[var(--border)] backdrop-blur-xl transition-all" style={{ backgroundColor: 'rgba(8,8,8,0.92)' }}>
        <div className="h-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-[2px] cursor-pointer relative shrink-0">
          <div className="absolute -top-1 left-0 w-1 h-1 bg-[var(--accent2)] rounded-full"></div>
          <span className="font-syne font-[800] text-[var(--accent)] text-lg md:text-xl tracking-tight">keyo</span>
          <span className="font-syne font-[800] text-[var(--accent)]/70 text-xs md:text-sm">.studio</span>
        </Link>

        {/* Center Tabs */}
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

        {/* Right side buttons */}
        <div className="flex items-center gap-3 md:gap-6">
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
              /* Clerk UserButton — shown when signed in */
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                  },
                }}
              />
            ) : (
              /* Login + Sign up — shown when signed out */
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
