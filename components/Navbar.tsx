'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavbarProps {
  setShowModal?: (show: boolean) => void;
}

export default function Navbar({ setShowModal }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Explore', href: '/' },
    { name: 'Image', href: '/image' },
    { name: 'Video', href: '/video' },
    { name: 'Text', href: '/text', badge: 'NEW' },
  ];

  return (
    <>
      {/* Top Solid Line */}
      <div className="fixed top-0 left-0 right-0 h-[10px] bg-[var(--accent)] z-[101]" />
      
      <nav className="fixed top-[10px] left-0 right-0 h-[54px] z-[100] border-b border-[var(--border)] backdrop-blur-xl" style={{ backgroundColor: 'rgba(8,8,8,0.92)' }}>
        <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-[2px] cursor-pointer relative">
          <div className="absolute -top-1 left-0 w-1 h-1 bg-[var(--accent2)] rounded-full"></div>
          <span className="font-syne font-[800] text-[var(--accent)] text-xl tracking-tight">keyo</span>
          <span className="font-syne font-[800] text-[var(--accent)]/70 text-sm">.studio</span>
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
        <div className="flex items-center gap-6">
          <Link 
            href="/pricing"
            className={`font-dm font-[600] text-[15px] transition-opacity duration-200 ${
              pathname === '/pricing' ? 'text-white opacity-100' : 'text-white opacity-75 hover:opacity-100'
            }`}
          >
            Pricing
          </Link>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowModal?.(true)}
              className="text-[#ffffff] opacity-75 hover:opacity-100 font-dm font-[600] text-[15px] transition-opacity duration-200 pointer-events-auto"
            >
              Login
            </button>
            <button 
              onClick={() => setShowModal?.(true)}
              className="bg-[var(--accent)] text-black font-dm font-[600] text-[15px] px-4 py-1.5 rounded-lg hover:scale-105 transition-transform duration-200 pointer-events-auto"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
