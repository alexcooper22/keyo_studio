'use client';
import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '@clerk/nextjs';
import ReactDOM from 'react-dom';

const Portal = ({ children }: { children: React.ReactNode }) => {
  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(children, document.body);
};

const compressImage = async (base64: string): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 1024;
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
    };
    img.src = base64;
  });
};

export default function ImageDashboard() {
  const { setShowModal } = useAuth();
  const { isLoaded, isSignedIn } = useUser();
  
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [creditCount, setCreditCount] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState('flux-pro');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const [aspectRatio, setAspectRatio] = useState('4:3');
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const ratioButtonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState({ bottom: 0, left: 0 });

  const handleOpenRatio = () => {
    if (ratioButtonRef.current) {
      const rect = ratioButtonRef.current.getBoundingClientRect();
      setPopupPosition({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left + rect.width / 2
      });
    }
    setShowRatioDropdown(true);
  };
  
  const ratioOptions = [
    { label: '1:1', value: '1:1', icon: '□', w: 20, h: 20 },
    { label: '4:3', value: '4:3', icon: '▭', w: 24, h: 18 },
    { label: '3:4', value: '3:4', icon: '▯', w: 18, h: 24 },
    { label: '16:9', value: '16:9', icon: '▬', w: 28, h: 16 },
    { label: '9:16', value: '9:16', icon: '▮', w: 16, h: 28 },
  ];
  
  // Interaction states
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => setShowRatioDropdown(false);
    if (showRatioDropdown) {
      setTimeout(() => document.addEventListener('click', handleClick), 0);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showRatioDropdown]);

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
      const uploadedUrls = await Promise.all(
        uploadedImages.map(async (base64) => {
          const blob = await compressImage(base64);
          const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          return data.url;
        })
      );

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: selectedModel, imageUrls: uploadedUrls, aspectRatio }),
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const remainingSlots = 14 - uploadedImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    const promises = filesToProcess.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Images => {
      setUploadedImages(prev => [...prev, ...base64Images].slice(0, 14));
    }).catch(err => {
      console.error("Failed to read files", err);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== indexToRemove));
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
          className="fixed inset-0 z-[1000] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setSelectedFullImage(null)}
        >
          <img
            src={selectedFullImage}
            alt="Full view"
            style={{
              maxWidth: '60vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: '8px',
              cursor: 'default'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              color: 'white',
              fontSize: '28px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              zIndex: 1001
            }}
            onClick={() => setSelectedFullImage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Bottom Prompt Bar */}
      <div className="fixed bottom-0 left-0 md:left-[48px] right-0 z-50 px-2 md:px-8 pb-3 md:pb-8 pointer-events-none">
        <div className="w-full max-w-4xl mx-auto rounded-t-2xl rounded-b-xl border-t border-l border-r border-white/[0.08] shadow-2xl overflow-hidden pointer-events-auto" style={{ backgroundColor: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(16px)' }}>
          {/* Hidden File Input */}
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Uploaded Images Preview */}
          {uploadedImages.length > 0 && (
            <div className="flex items-center gap-2 px-3 md:px-4 pt-3 overflow-x-auto">
              {uploadedImages.map((src, idx) => (
                <div key={idx} className="relative flex-shrink-0" style={{ width: '60px', height: '60px' }}>
                  <img src={src} alt="Uploaded preview" className="w-full h-full object-cover" style={{ borderRadius: '8px', background: '#111', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-white/20 hover:bg-white/40 rounded-full text-white flex items-center justify-center text-xs shadow-md border border-[#111]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Top Row: Input */}
          <div className="p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 border-b border-white/[0.06]">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#080808] border border-white/[0.04] text-[#888] hover:text-white hover:border-white/20 transition-colors"
            >
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

            <div>
              <button
                ref={ratioButtonRef}
                onClick={(e) => { e.stopPropagation(); handleOpenRatio(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-[#888] border border-white/10 hover:text-white transition-colors"
              >
                {ratioOptions.find(r => r.value === aspectRatio)?.icon} {aspectRatio}
              </button>
              
              {showRatioDropdown && (
                <Portal>
                  <div 
                    className="fixed inset-0 z-[40]"
                    onClick={() => setShowRatioDropdown(false)}
                  />
                  <div 
                    className="fixed z-[50] bg-[#141414] border border-white/10 rounded-2xl p-4 w-[160px]"
                    style={{
                      bottom: `${popupPosition.bottom}px`,
                      left: `${popupPosition.left}px`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <p className="text-[11px] text-[#444] mb-3 uppercase tracking-wider">Aspect ratio</p>
                    <div className="flex flex-col gap-1">
                      {ratioOptions.map(ratio => (
                        <button
                          key={ratio.value}
                          onClick={() => { setAspectRatio(ratio.value); setShowRatioDropdown(false); }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors text-left w-full ${
                            aspectRatio === ratio.value 
                              ? 'text-white bg-white/[0.08]' 
                              : 'text-[#666] hover:text-white hover:bg-white/[0.04]'
                          }`}
                        >
                          <div style={{
                            width: ratio.w,
                            height: ratio.h,
                            border: aspectRatio === ratio.value ? '1.5px solid white' : '1.5px solid #444',
                            borderRadius: '2px',
                            flexShrink: 0
                          }} />
                          {ratio.label}
                          {aspectRatio === ratio.value && <span className="ml-auto">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </Portal>
              )}
            </div>

            {[
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
