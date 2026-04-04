'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useUser } from '@clerk/nextjs';

type Section = 'Personal Profile' | 'Gifts' | 'Referrals' | 'Subscription' | 'Credits Usage' | 'Promo Code';

export default function SettingsPage() {
  const { isLoaded, user } = useUser();
  const [activeSection, setActiveSection] = useState<Section>('Personal Profile');

  if (!isLoaded) return null;

  // Derive avatar initial from email
  const avatarLetter = user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'K';

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress ??
    'User';

  const email = user?.emailAddresses?.[0]?.emailAddress ?? 'No email available';

  const navItem = (name: Section, icon: string, badge?: string) => {
    const isActive = activeSection === name;
    return (
      <button
        key={name}
        onClick={() => setActiveSection(name)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group ${
          isActive 
            ? 'bg-[#ff3377]/10 text-[#ff3377]' 
            : 'text-[#666] hover:bg-white/[0.04] hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[16px]">{icon}</span>
          <span className="font-dm text-[13px] font-[500]">{name}</span>
        </div>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-[#ff3377]/10 text-[#ff3377] uppercase">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-[#ff3377] selection:text-white flex flex-col">
      <Navbar />

      <main className="flex-1 pt-[54px] w-full max-w-[1200px] mx-auto flex flex-col md:flex-row">
        
        {/* LEFT SIDEBAR */}
        <aside className="w-full md:w-[260px] p-8 md:px-5 md:py-8 flex-shrink-0 border-r border-white/[0.02] flex flex-col">
          
          {/* User Snippet */}
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-white/10"
              style={{ background: 'linear-gradient(135deg, #00ffc8, #00d4a8)' }}
            >
              <span className="font-syne font-[800] text-[13px] text-black">{avatarLetter}</span>
            </div>
            <span className="font-dm text-[14px] font-[500] text-white truncate max-w-[150px]">
              {displayName}
            </span>
          </div>

          {/* Account Settings Group */}
          <div className="mt-6 flex flex-col gap-1">
            <h3 className="px-3 text-[11px] font-bold text-[#444] uppercase tracking-[0.5px] mb-2">Account settings</h3>
            {navItem('Personal Profile', '👤')}
            {navItem('Gifts', '🎁')}
            {navItem('Referrals', '👥', 'NEW')}
          </div>

          {/* Workspace Group */}
          <div className="mt-8 flex flex-col gap-1">
            <h3 className="px-3 text-[11px] font-bold text-[#444] uppercase tracking-[0.5px] mb-2">Workspace</h3>
            {navItem('Subscription', '💳')}
            {navItem('Credits Usage', '⚡')}
            {navItem('Promo Code', '🎟️')}
          </div>

          {/* Discord Card */}
          <div className="mt-auto pt-10">
            <div className="bg-[#0f0f0f] border border-white/[0.06] rounded-[10px] p-[14px] flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#5865F2] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.084 2.157 2.419c0 1.334-.947 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.084 2.157 2.419c0 1.334-.946 2.419-2.157 2.419z"/>
                  </svg>
                </div>
                <span className="font-dm text-[13px] font-[500] text-white">Join our Discord</span>
              </div>
              <p className="text-[11px] text-[#444] leading-normal">
                Get help and connect with community
              </p>
              <button className="w-full py-1.5 border border-white/10 rounded-md text-[11px] text-[#666] hover:text-white hover:bg-white/[0.04] transition-all">
                Join now
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <section className="flex-1 p-8 md:px-10 md:py-8 overflow-y-auto">
          
          {/* PERSONAL PROFILE SECTION */}
          {activeSection === 'Personal Profile' && (
            <div className="flex flex-col gap-4 animate-fade-up">
              {/* Profile Card */}
              <div className="bg-[#0f0f0f] border border-white/[0.06] rounded-xl p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-[60px] h-[60px] rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(0,255,200,0.15)]"
                      style={{ background: 'linear-gradient(135deg, #00ffc8, #00d4a8)' }}
                    >
                      <span className="font-syne font-[800] text-[24px] text-black">{avatarLetter}</span>
                    </div>
                    <div>
                      <h2 className="font-syne font-[700] text-[18px] text-white">{displayName}</h2>
                      <p className="font-dm text-[13px] text-[#444]">Personal account</p>
                    </div>
                  </div>
                  <button className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-[12px] text-[#666] font-[500] hover:text-white transition-colors">
                    Edit profile
                  </button>
                </div>

                <div className="flex flex-col">
                  {[
                    { label: 'Username', value: user?.username || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User' },
                    { label: 'Email', value: email }
                  ].map((field, idx) => (
                    <div key={idx} className="py-3 border-b border-white/[0.04] last:border-0">
                      <p className="text-[11px] font-bold text-[#444] uppercase tracking-[0.5px] mb-1">{field.label}</p>
                      <p className="font-dm text-[14px] text-[#f0f0f0]">{field.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credits Card */}
              <div className="bg-[#0f0f0f] border border-white/[0.06] rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#444] uppercase tracking-[0.5px]">Credits</span>
                    <div className="w-3 h-3 rounded-full border border-[var(--accent)]/30 border-t-[var(--accent)] animate-spin"></div>
                  </div>
                  <button className="px-3.5 py-1.5 rounded-md border border-white/10 bg-white/[0.02] text-[11px] text-[#666] font-[500] hover:text-white transition-colors">
                    Top-up
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-syne font-[800] text-[28px] text-white">100%</span>
                    <span className="font-dm text-[14px] text-[#666]">20 left</span>
                  </div>
                  <div className="w-full h-[6px] bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-[#ff3377] w-[100%] rounded-full shadow-[0_0_10px_rgba(255,51,119,0.3)]"></div>
                  </div>
                </div>

                {/* Usage History Mini Chart Placeholder */}
                <div className="mt-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-dm text-[13px] text-[#f0f0f0]">Usage history</span>
                    <button className="font-dm text-[13px] text-[#ff3377] hover:brightness-125 transition-all outline-none">See all</button>
                  </div>
                  <div className="w-full h-px border-b border-dashed border-white/10 mt-3" />
                </div>
              </div>
            </div>
          )}

          {/* SUBSCRIPTION SECTION */}
          {activeSection === 'Subscription' && (
            <div className="animate-fade-up">
              <div className="bg-[#0f0f0f] border border-white/[0.06] rounded-xl p-6">
                <h2 className="text-[11px] font-bold text-[#444] uppercase tracking-[0.5px] mb-4">Current Plan</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-syne font-[700] text-[24px] text-white">Free Plan</p>
                    <p className="font-dm text-[13px] text-[#555] mt-1">Limited features for exploring AI creativity</p>
                  </div>
                  <Link 
                    href="/pricing"
                    className="px-6 py-2.5 rounded-lg bg-[#ff3377] text-black font-syne font-[700] text-[14px] hover:scale-105 transition-all shadow-lg shadow-[#ff3377]/10"
                  >
                    Upgrade
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* PROMO CODE SECTION */}
          {activeSection === 'Promo Code' && (
            <div className="animate-fade-up">
              <div className="bg-[#0f0f0f] border border-white/[0.06] rounded-xl p-6">
                <h2 className="text-[11px] font-bold text-[#444] uppercase tracking-[0.5px] mb-4">Redeem Code</h2>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter promo code..." 
                    className="flex-1 bg-[#111] border border-white/[0.08] rounded-lg px-4 py-2.5 text-[14px] text-white placeholder:text-[#333] outline-none focus:border-[#ff3377]/30 transition-all font-dm"
                  />
                  <button className="px-6 py-2.5 rounded-lg bg-[#ff3377] text-black font-syne font-[700] text-[14px] hover:brightness-110 active:scale-95 transition-all shadow-lg">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* COMING SOON PLACEHOLDERS */}
          {['Gifts', 'Referrals', 'Credits Usage'].includes(activeSection) && (
            <div className="animate-fade-up">
              <div className="bg-[#0f0f0f] border border-white/[0.06] rounded-xl p-12 flex flex-col items-center text-center">
                <div className="text-[32px] mb-4 opacity-40">✨</div>
                <h2 className="font-syne font-[700] text-[22px] text-white mb-2">{activeSection}</h2>
                <p className="font-dm text-[14px] text-[#555] max-w-[280px]">We're currently scaling this feature. Stay tuned for updates!</p>
              </div>
            </div>
          )}

        </section>
      </main>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fadeUp 0.4s ease forwards;
        }
      `}</style>
    </div>
  );
}
