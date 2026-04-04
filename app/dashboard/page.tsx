'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useUser } from '@clerk/nextjs';

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return null;

  // Derive avatar initial
  const avatarLetter = user?.firstName?.[0]
    ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase()
    ?? '?';

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress ??
    'User';

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-[#ff3377] selection:text-white">
      <Navbar />

      <main className="pt-[105px] md:pt-[120px] pb-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            
            {/* LEFT SIDE: Profile Section */}
            <div className="w-full lg:w-[400px] flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* Avatar Container */}
              <div className="relative group">
                <div className="w-[90px] h-[90px] rounded-full bg-[#ff3377] border-[3px] border-white/10 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
                  {user?.imageUrl ? (
                    <Image 
                      src={user.imageUrl} 
                      alt={displayName} 
                      width={90} 
                      height={90} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-syne font-[700] text-[36px] text-white">{avatarLetter}</span>
                  )}
                </div>
              </div>

              {/* Username + Edit */}
              <div className="mt-4 flex items-center gap-3 justify-center lg:justify-start">
                <h1 className="font-syne font-[700] text-[22px] text-white tracking-tight">
                  {displayName}
                </h1>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors group">
                  <span className="text-[12px] group-hover:scale-110 transition-transform">✏️</span>
                  <span className="font-dm text-[12px] text-[#555] group-hover:text-white/60 transition-colors">Edit</span>
                </button>
              </div>

              {/* Stats Row */}
              <div className="mt-2.5 flex items-center gap-2.5 font-dm text-[14px] text-[#555]">
                <span>0 Followers</span>
                <span className="w-1 h-1 rounded-full bg-[#333]"></span>
                <span>0 Following</span>
              </div>
            </div>

            {/* RIGHT SIDE: Featured Content */}
            <div className="flex-1 w-full">
              <div className="bg-[#0f0f0f] border border-dashed border-white/10 rounded-2xl min-h-[220px] flex flex-col items-center justify-center p-8 group cursor-pointer hover:border-[#ff3377]/30 transition-all duration-300">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[#444] text-[20px] group-hover:text-[#ff3377] group-hover:border-[#ff3377]/50 group-hover:scale-110 transition-all duration-300">
                  +
                </div>
                <h3 className="mt-2.5 font-dm font-[500] text-[14px] text-[#555] group-hover:text-white/80 transition-colors">
                  Add featured Project
                </h3>
                <p className="mt-1 font-dm text-[12px] text-[#333] text-center max-w-[240px]">
                  Choose one of your projects to highlight it
                </p>
              </div>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="h-[1px] w-full bg-white/[0.06] my-10" />

          {/* GALLERY SECTION (EMPTY) */}
          <section className="relative">
            <h2 className="font-syne font-[700] text-[18px] text-white mb-6 uppercase tracking-wider opacity-60">Gallery</h2>
            
            {/* Dark Placeholder Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div 
                  key={idx} 
                  className="bg-[#0f0f0f] border border-white/[0.04] rounded-[10px] h-[180px] opacity-40 shadow-inner"
                />
              ))}
            </div>

            {/* CTA Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center text-center p-8 backdrop-blur-[2px]">
                <h3 className="font-syne font-[800] text-[22px] text-white leading-tight">
                  READY TO SHOW YOUR WORK?
                </h3>
                <p className="mt-2 font-dm text-[14px] text-[#555] max-w-[300px]">
                  Create your first image or video to showcase here
                </p>
                <Link 
                  href="/image"
                  className="mt-6 px-7 py-3 rounded-lg bg-[#ff3377] text-black font-syne font-[700] text-[14px] hover:scale-105 hover:brightness-110 active:scale-95 transition-all shadow-lg"
                >
                  Start creating →
                </Link>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
