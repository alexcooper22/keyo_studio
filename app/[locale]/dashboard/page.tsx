'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useUser } from '@clerk/nextjs';

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [images, setImages] = useState<any[]>([]);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) fetchData();
  }, [isLoaded, isSignedIn]);

  const fetchData = async () => {
    try {
      const [creditsRes, imagesRes] = await Promise.all([
        fetch('/api/user-credits'),
        fetch('/api/user-images'),
      ]);
      const creditsData = await creditsRes.json();
      const imagesData = await imagesRes.json();
      setCredits(creditsData.credits);
      setImages(imagesData.images);
    } catch {
      // silent
    }
  };

  if (!isLoaded) return null;

  const initials = (
    (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')
  ).toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'K';
  const displayName = user?.fullName ?? user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User';

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg)', fontFamily: 'var(--font-dm)' }}>
      <Navbar />

      {/* Background decorations */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(rgba(120,80,255,0.07) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 100%)',
      }} />
      <div aria-hidden="true" style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '900px', height: '500px', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at center, rgba(83,47,207,0.12) 0%, rgba(60,30,180,0.05) 45%, transparent 70%)',
      }} />

      <main className="relative z-10 pt-[90px] pb-[100px] md:pb-24 px-4 md:px-8 max-w-[1200px] mx-auto">

        {/* ── Profile header ── */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start mb-12">

          {/* Avatar + info */}
          <div className="w-full lg:w-auto flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="relative">
              <div
                className="w-[80px] h-[80px] rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(83,47,207,0.9) 0%, rgba(140,90,255,0.8) 100%)',
                  border: '1px solid rgba(120,80,255,0.4)',
                  boxShadow: '0 0 30px rgba(83,47,207,0.35)',
                }}
              >
                <span className="font-syne font-[800] text-white" style={{ fontSize: initials.length > 1 ? '22px' : '32px' }}>{initials}</span>
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2"
                style={{ borderColor: 'var(--bg)' }} />
            </div>

            <div className="mt-4 flex items-center gap-2.5 justify-center lg:justify-start">
              <h1 className="font-clash font-[700] text-[24px] text-white tracking-tight">{displayName}</h1>
            </div>

            <div className="mt-2 flex items-center justify-center lg:justify-start gap-2 font-dm text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1" style={{ color: 'rgba(170,140,255,0.9)' }}>
                <span style={{ fontSize: '9px' }}>✦</span>
                {credits !== null ? `${credits} credits` : '···'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span>0 Followers</span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span>0 Following</span>
            </div>

            <Link href="/settings"
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all font-dm text-[12px]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit profile
            </Link>
          </div>

          {/* Featured project card */}
          <div className="flex-1 w-full">
            <div
              className="w-full min-h-[180px] rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer transition-all duration-300 group"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.08)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(120,80,255,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
              >
                <span className="text-[18px] leading-none">+</span>
              </div>
              <p className="font-dm font-[500] text-[13px] transition-colors" style={{ color: 'var(--text-secondary)' }}>
                Add featured project
              </p>
              <p className="font-dm text-[11px] mt-1 text-center max-w-[200px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Choose one of your projects to highlight it
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-10" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* ── Gallery ── */}
        <section className="relative">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-clash font-[600] text-[13px] uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Gallery</h2>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {images.length > 0 ? (
              images.map((img) => (
                <Link
                  key={img.id}
                  href={`/image?id=${img.id}`}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                  style={{ background: 'var(--bg-card)', border: '0.5px solid rgba(255,255,255,0.06)' }}
                >
                  <Image
                    src={img.image_url}
                    alt={img.prompt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    unoptimized
                  />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}>
                    <p className="font-dm text-[10px] text-white/70 line-clamp-2 leading-tight">{img.prompt}</p>
                  </div>
                </Link>
              ))
            ) : (
              [1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded-xl"
                  style={{ background: 'var(--bg-card)', border: '0.5px solid rgba(255,255,255,0.04)', opacity: 0.4 }}
                />
              ))
            )}
          </div>

          {/* Empty state overlay */}
          {images.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center text-center p-8"
                style={{ backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}>

                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 mb-5" style={{
                  background: 'rgba(83,47,207,0.1)',
                  border: '0.5px solid rgba(83,47,207,0.3)',
                  borderRadius: '20px', padding: '4px 12px',
                }}>
                  <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '9px' }}>✦</span>
                  <span className="font-dm font-[500] text-[11px] uppercase tracking-[0.8px]" style={{ color: 'rgba(120,80,255,0.7)' }}>
                    Start creating
                  </span>
                </div>

                <h3 className="font-clash font-[700] text-[20px] md:text-[26px] text-white leading-tight mb-2">
                  Ready to show your work?
                </h3>
                <p className="font-dm text-[13px] max-w-[260px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Create your first image or video to showcase here
                </p>
                <Link
                  href="/image"
                  className="mt-6 px-7 py-3 rounded-xl font-dm font-[700] text-[14px] text-white transition-all hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)' }}
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>
                    Start creating
                  </span>
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
