'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/layout/Navbar';
import { useUser } from '@clerk/nextjs';

type Section = 'Personal Profile' | 'Gifts' | 'Referrals' | 'Subscription' | 'Credits Usage' | 'Promo Code';

const sections: { name: Section; icon: string; badge?: string; group: string }[] = [
  { name: 'Personal Profile', icon: '👤', group: 'account' },
  { name: 'Gifts',            icon: '🎁', group: 'account' },
  { name: 'Referrals',        icon: '👥', badge: 'NEW', group: 'account' },
  { name: 'Subscription',     icon: '💳', group: 'workspace' },
  { name: 'Credits Usage',    icon: '⚡', group: 'workspace' },
  { name: 'Promo Code',       icon: '🎟️', group: 'workspace' },
];

export default function SettingsPage() {
  const { isLoaded, user } = useUser();
  const [activeSection, setActiveSection] = useState<Section>('Personal Profile');

  if (!isLoaded) return null;

  const initials = (
    (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')
  ).toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'K';

  const displayName = user?.fullName ?? user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User';
  const email = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const username = user?.username || email.split('@')[0] || 'user';

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg)', fontFamily: 'var(--font-dm)' }}>
      <Navbar />

      {/* Background decorations */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(rgba(120,80,255,0.06) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
        maskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, black 0%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, black 0%, transparent 100%)',
      }} />
      <div aria-hidden="true" style={{
        position: 'fixed', top: 0, left: '30%', width: '600px', height: '400px',
        pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at center, rgba(83,47,207,0.1) 0%, transparent 70%)',
      }} />

      {/* ── Mobile tab bar ── */}
      <div className="md:hidden fixed top-[60px] left-0 right-0 z-40 overflow-x-auto no-scrollbar"
        style={{ background: 'rgba(8,8,8,0.95)', borderBottom: '0.5px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-1 px-3 py-2" style={{ minWidth: 'max-content' }}>
          {sections.map(s => (
            <button
              key={s.name}
              onClick={() => setActiveSection(s.name)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap font-dm text-[12px] font-[500] transition-all"
              style={{
                background: activeSection === s.name ? 'rgba(83,47,207,0.15)' : 'transparent',
                border: activeSection === s.name ? '0.5px solid rgba(83,47,207,0.4)' : '0.5px solid transparent',
                color: activeSection === s.name ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.35)',
              }}
            >
              <span style={{ fontSize: '13px' }}>{s.icon}</span>
              {s.name}
              {s.badge && (
                <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(83,47,207,0.2)', color: 'rgba(120,80,255,0.9)' }}>
                  {s.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex max-w-[1200px] mx-auto" style={{ paddingTop: '60px', minHeight: '100vh' }}>

        {/* ── Desktop sidebar ── */}
        <aside className="hidden md:flex w-[240px] flex-shrink-0 flex-col py-8 px-4"
          style={{ borderRight: '0.5px solid rgba(255,255,255,0.05)', position: 'sticky', top: '60px', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>

          {/* User snippet */}
          <div className="flex items-center gap-3 px-3 mb-8">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(83,47,207,0.9) 0%, rgba(140,90,255,0.8) 100%)', border: '1px solid rgba(120,80,255,0.3)' }}>
              <span className="font-syne font-[800] text-white leading-none" style={{ fontSize: initials.length > 1 ? '9px' : '11px' }}>{initials}</span>
            </div>
            <span className="font-dm text-[13px] font-[500] text-white truncate">{displayName}</span>
          </div>

          {/* Account group */}
          <div className="mb-6">
            <p className="px-3 mb-2 font-dm text-[10px] font-[700] uppercase tracking-[0.6px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Account</p>
            {sections.filter(s => s.group === 'account').map(s => (
              <button key={s.name} onClick={() => setActiveSection(s.name)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-dm text-[13px] font-[500] transition-all mb-0.5"
                style={{
                  background: activeSection === s.name ? 'rgba(83,47,207,0.1)' : 'transparent',
                  color: activeSection === s.name ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.4)',
                }}>
                <div className="flex items-center gap-2.5">
                  <span style={{ fontSize: '14px' }}>{s.icon}</span>
                  {s.name}
                </div>
                {s.badge && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(83,47,207,0.15)', color: 'rgba(120,80,255,0.9)' }}>{s.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Workspace group */}
          <div className="mb-6">
            <p className="px-3 mb-2 font-dm text-[10px] font-[700] uppercase tracking-[0.6px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Workspace</p>
            {sections.filter(s => s.group === 'workspace').map(s => (
              <button key={s.name} onClick={() => setActiveSection(s.name)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-dm text-[13px] font-[500] transition-all mb-0.5"
                style={{
                  background: activeSection === s.name ? 'rgba(83,47,207,0.1)' : 'transparent',
                  color: activeSection === s.name ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.4)',
                }}>
                <div className="flex items-center gap-2.5">
                  <span style={{ fontSize: '14px' }}>{s.icon}</span>
                  {s.name}
                </div>
              </button>
            ))}
          </div>

          {/* Discord card */}
          <div className="mt-auto">
            <div className="rounded-xl p-4" style={{ background: 'rgba(88,101,242,0.08)', border: '0.5px solid rgba(88,101,242,0.2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#5865F2' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.084 2.157 2.419 0 1.334-.947 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.084 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
                  </svg>
                </div>
                <span className="font-dm text-[12px] font-[500] text-white">Join Discord</span>
              </div>
              <p className="font-dm text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Get help & connect with the community</p>
              <button className="w-full py-1.5 rounded-lg font-dm text-[11px] font-[500] transition-all"
                style={{ background: 'rgba(88,101,242,0.15)', border: '0.5px solid rgba(88,101,242,0.3)', color: 'rgba(150,160,255,0.8)' }}>
                Join now
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 px-4 md:px-8 pb-[100px] md:pb-16" style={{ paddingTop: '52px' }}>

          {/* Personal Profile */}
          {activeSection === 'Personal Profile' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl p-5 md:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgba(83,47,207,0.9) 0%, rgba(140,90,255,0.8) 100%)', border: '1px solid rgba(120,80,255,0.4)', boxShadow: '0 0 24px rgba(83,47,207,0.3)' }}>
                    <span className="font-syne font-[800] text-white" style={{ fontSize: initials.length > 1 ? '18px' : '22px' }}>{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-clash font-[700] text-[18px] text-white truncate">{displayName}</h2>
                    <p className="font-dm text-[12px]" style={{ color: 'var(--text-secondary)' }}>Personal account</p>
                  </div>
                </div>

                <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {[
                    { label: 'Username', value: username },
                    { label: 'Email', value: email },
                  ].map((field, idx) => (
                    <div key={idx} className="py-3">
                      <p className="font-dm text-[10px] font-[700] uppercase tracking-[0.5px] mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{field.label}</p>
                      <p className="font-dm text-[14px] text-white break-all">{field.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-5 md:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '9px' }}>✦</span>
                    <span className="font-dm text-[11px] font-[700] uppercase tracking-[0.5px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Credits</span>
                  </div>
                  <Link href="/pricing"
                    className="px-3 py-1 rounded-full font-dm text-[11px] font-[500] transition-all"
                    style={{ background: 'rgba(83,47,207,0.1)', border: '0.5px solid rgba(83,47,207,0.3)', color: 'rgba(170,140,255,0.9)' }}>
                    Top-up
                  </Link>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, #532fcf, #9b7eff)' }} />
                </div>
                <p className="font-dm text-[12px]" style={{ color: 'var(--text-secondary)' }}>Usage history coming soon</p>
              </div>
            </div>
          )}

          {/* Subscription */}
          {activeSection === 'Subscription' && (
            <div className="rounded-2xl p-5 md:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <p className="font-dm text-[10px] font-[700] uppercase tracking-[0.5px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Current Plan</p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-clash font-[700] text-[22px] text-white">Free Plan</p>
                  <p className="font-dm text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>Limited features for exploring AI creativity</p>
                </div>
                <Link href="/pricing"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-dm font-[700] text-[14px] text-white transition-all hover:brightness-110 active:scale-95 whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>
                  Upgrade
                </Link>
              </div>
            </div>
          )}

          {/* Promo Code */}
          {activeSection === 'Promo Code' && (
            <div className="rounded-2xl p-5 md:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <p className="font-dm text-[10px] font-[700] uppercase tracking-[0.5px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Redeem Code</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Enter promo code..."
                  className="flex-1 rounded-xl px-4 py-2.5 font-dm text-[14px] text-white outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'white' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(120,80,255,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  className="px-6 py-2.5 rounded-xl font-dm font-[700] text-[14px] text-white transition-all hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)' }}>
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Coming soon */}
          {['Gifts', 'Referrals', 'Credits Usage'].includes(activeSection) && (
            <div className="rounded-2xl p-10 md:p-16 flex flex-col items-center text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div className="inline-flex items-center gap-1.5 mb-5" style={{ background: 'rgba(83,47,207,0.1)', border: '0.5px solid rgba(83,47,207,0.3)', borderRadius: '20px', padding: '4px 12px' }}>
                <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '9px' }}>✦</span>
                <span className="font-dm font-[500] text-[11px] uppercase tracking-[0.8px]" style={{ color: 'rgba(120,80,255,0.7)' }}>Coming soon</span>
              </div>
              <h2 className="font-clash font-[700] text-[22px] text-white mb-2">{activeSection}</h2>
              <p className="font-dm text-[13px] max-w-[260px]" style={{ color: 'var(--text-secondary)' }}>
                We're currently scaling this feature. Stay tuned for updates!
              </p>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
