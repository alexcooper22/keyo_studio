'use client';
import React, { useState, useEffect, useRef } from 'react';
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
  const [creditCount, setCreditCount] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState('flux-pro');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  
  // Interaction states
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle ESC key for modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedFullImage(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // 1. Fetch initial data on load
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchCredits();
      fetchImages();
    } else if (isLoaded && !isSignedIn) {
      setCreditCount(10); // Default for guests
    }
  }, [isLoaded, isSignedIn]);

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/user-credits');
      const data = await res.json();
      if (data.credits !== undefined) setCreditCount(data.credits);
    } catch (err) {
      console.error("Failed to fetch credits", err);
    }
  };

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/user-images');
      const data = await res.json();
      if (data.images) {
        setGeneratedImages(data.images.map((img: any) => img.image_url));
      }
    } catch (err) {
      console.error("Failed to fetch images", err);
    }
  };

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
        body: JSON.stringify({ prompt, model: selectedModel }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Update with the new generated image URLs and credits
      setGeneratedImages((prev) => [data.images[0].url, ...prev]);
      if (data.remainingCredits !== undefined) {
        setCreditCount(data.remainingCredits);
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'keyo-studio-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const toggleLike = (imageUrl: string) => {
    setLikedImages((prev) => {
      const next = new Set(prev);
      if (next.has(imageUrl)) next.delete(imageUrl);
      else next.add(imageUrl);
      return next;
    });
  };

  const modelOptions = [
    { id: 'flux-pro', name: 'Flux Pro', price: '1 credit' },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro', price: '1 credit' }
  ];

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
          {generatedImages.map((url, i) => {
            const isLiked = likedImages.has(url);
            return (
              <div 
                key={url} 
                className="relative rounded-xl overflow-hidden bg-[#161616] border border-white/[0.06] hover:border-white/10 group break-inside-avoid shadow-lg transition-colors cursor-zoom-in"
                onClick={() => setSelectedFullImage(url)}
              >
                <Image 
                  src={url} 
                  alt={`Generated ${i}`} 
                  width={800} 
                  height={600} 
                  className="w-full h-auto object-cover"
                  unoptimized
                />
                
                {/* Liked state persistence (Heart stays visible if liked) */}
                {isLiked && (
                  <div className="absolute top-3 right-3 z-20 pointer-events-none group-hover:opacity-0 transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff3377" stroke="#ff3377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </div>
                )}

                {/* Interaction Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-start justify-end p-3 gap-2 backdrop-blur-[2px] z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownload(url); }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[var(--accent)] flex items-center justify-center text-white backdrop-blur-md transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleLike(url); }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-md transition-colors"
                  >
                    <svg 
                      width="14" height="14" viewBox="0 0 24 24" 
                      fill={isLiked ? "#ff3377" : "none"} 
                      stroke={isLiked ? "#ff3377" : "white"} 
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Initial Placeholders */}
          {generatedImages.length === 0 && !isLoading && (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#161616] to-[#0f0f0f] border border-white/[0.06] aspect-square break-inside-avoid shadow-lg opacity-20"></div>
            ))
          )}
        </div>
      </main>

      {/* Lightbox Modal */}
      {selectedFullImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
          onClick={() => setSelectedFullImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/60 hover:text-white text-3xl font-light transition-colors z-[1001]"
            onClick={() => setSelectedFullImage(null)}
          >
            ×
          </button>
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <Image 
              src={selectedFullImage} 
              alt="Full view" 
              width={1600} 
              height={1200} 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              unoptimized
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

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
                disabled={isLoaded && isSignedIn && (isLoading || !prompt.trim() || (creditCount !== null && creditCount <= 0))}
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
              <div className="flex items-center gap-2">
                {creditCount !== null && (
                  <span className={`font-dm text-[12px] font-bold ${creditCount <= 0 ? 'text-[#ff3377]' : 'text-[#ff3377]/80'}`}>
                    ✨ {creditCount} credits
                  </span>
                )}
                {isLoaded && !isSignedIn && (
                  <span className="font-dm text-[12px] text-[#555] text-center">
                     — Sign in to generate
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Settings */}
          <div className="px-4 md:px-5 py-2 md:py-3 flex flex-wrap items-center gap-2 md:gap-3">
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className={`px-3 py-1 rounded-full bg-white/[0.06] border font-dm text-[11px] md:text-xs transition-all flex items-center gap-1.5 ${isModelDropdownOpen ? 'border-[#ff3377] text-white bg-white/10' : 'border-white/10 text-[#888] hover:text-white hover:bg-white/10'}`}
              >
                {modelOptions.find(m => m.id === selectedModel)?.name} ▾
              </button>
              
              {isModelDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-[220px] bg-[#161616] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl z-[60] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {modelOptions.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors flex flex-col gap-0.5 ${selectedModel === model.id ? 'bg-[#ff3377]/5' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-dm font-[600] text-sm ${selectedModel === model.id ? 'text-[#ff3377]' : 'text-white/90'}`}>{model.name}</span>
                        {selectedModel === model.id && <div className="w-1 h-1 rounded-full bg-[#ff3377]" />}
                      </div>
                      <span className="font-dm text-[11px] text-[#555]">{model.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {[
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
