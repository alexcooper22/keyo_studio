'use client';
import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '@clerk/nextjs';

export default function ImageDashboard() {
  const { setShowModal } = useAuth();
  const { isLoaded, isSignedIn } = useUser();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!isLoaded) return;
    
    // Redirect guests to the auth modal
    if (!isSignedIn) {
      setShowModal(true);
      return;
    }

    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Update with the new generated image URLs
      setGeneratedImages((prev) => [...data.images.map((img: any) => img.url), ...prev]);
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pl-0 md:pl-[48px] pt-[92px] md:pt-[64px] pb-[130px] md:pb-[120px] relative">
      <Navbar />
      
      {/* Left Sidebar */}
      <aside className="fixed top-[64px] left-0 bottom-0 w-[48px] bg-[#0a0a0a] border-r border-white/[0.06] z-40 hidden md:flex flex-col items-center py-6 gap-6">
        <button className="text-[#555] hover:text-[var(--accent)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
        <button className="text-[#555] hover:text-[var(--accent)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </button>
      </aside>

      {/* Main Canvas Area (Masonry Grid) */}
      <main className="max-w-[1600px] mx-auto w-full px-4 md:px-6 pt-4 md:pt-6 relative z-10">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-dm text-sm">
            {error}
          </div>
        )}

        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#161616] to-[#0f0f0f] border border-[#ff3377]/20 aspect-[4/3] shadow-lg animate-pulse break-inside-avoid">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent w-[200%] animate-[shimmer_2.5s_ease_infinite]"></div>
               <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#ff3377] border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-syne font-bold text-[#ff3377] text-xs uppercase tracking-widest">Generating...</span>
               </div>
            </div>
          )}

          {/* Generated Results */}
          {generatedImages.map((url, i) => (
            <div key={url} className="relative rounded-xl overflow-hidden bg-[#161616] border border-white/[0.06] hover:border-white/10 group break-inside-avoid shadow-lg transition-colors">
              <Image 
                src={url} 
                alt={`Generated ${i}`} 
                width={800} 
                height={600} 
                className="w-full h-auto object-cover"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-start justify-end p-3 gap-2 backdrop-blur-[2px]">
                <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-[var(--accent)] flex items-center justify-center text-white backdrop-blur-md transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
                <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-[var(--accent)] flex items-center justify-center text-white backdrop-blur-md transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
              </div>
            </div>
          ))}

          {/* Initial Placeholders (shown when no images and not loading) */}
          {generatedImages.length === 0 && !isLoading && (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#161616] to-[#0f0f0f] border border-white/[0.06] aspect-square break-inside-avoid shadow-lg opacity-20"></div>
            ))
          )}
        </div>
      </main>

      {/* Bottom Prompt Bar */}
      <div className="fixed bottom-0 left-0 md:left-[48px] right-0 z-50 px-2 md:px-8 pb-3 md:pb-8 pointer-events-none">
        <div className="w-full max-w-4xl mx-auto rounded-t-2xl rounded-b-xl border-t border-l border-r border-white/[0.08] shadow-2xl overflow-hidden pointer-events-auto" style={{ backgroundColor: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(16px)' }}>
          {/* Top Row: Input */}
          <div className="p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 border-b border-white/[0.06]">
            <button className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#080808] border border-white/[0.04] text-[#888] hover:text-white hover:border-white/20 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Describe the image you imagine..." 
              className="flex-1 bg-transparent border-none outline-none text-white font-dm text-base md:text-lg placeholder:text-[#555]"
            />
            <div className="flex flex-col gap-1.5 items-center">
              <button 
                onClick={handleGenerate}
                disabled={isLoaded && isSignedIn && (isLoading || !prompt.trim())}
                className={`px-4 md:px-7 py-3 md:py-3.5 bg-[var(--accent)] text-black font-dm font-[700] rounded-xl flex items-center justify-center gap-2 hover:bg-[var(--accent2)] hover:shadow-[0_0_20px_rgba(255,51,119,0.3)] transition-all flex-shrink-0 ${(isLoading || (isLoaded && !isSignedIn)) ? 'opacity-70 cursor-pointer' : ''}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    Generate
                  </>
                )}
              </button>
              {isLoaded && !isSignedIn && (
                <span className="font-dm text-[12px] text-[#555] text-center">
                  Sign in to generate images
                </span>
              )}
            </div>
          </div>

          {/* Bottom Row: Settings */}
          <div className="px-4 md:px-5 py-2 md:py-3 flex flex-wrap items-center gap-2 md:gap-3">
            {[
              { label: 'Flux Pro ▾', active: true },
              { label: '4:3', active: false },
              { label: 'High Quality', active: false },
              { label: 'Seed: Auto', active: false }
            ].map((pill, idx) => (
              <button key={idx} className={`px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-[#888] font-dm text-[11px] md:text-xs hover:bg-white/10 hover:text-white transition-colors ${pill.active ? 'border-[#ff3377]/30 text-white' : ''}`}>
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
