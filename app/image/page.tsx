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

interface ImageDetails {
  url: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution?: string;
}

export default function ImageDashboard() {
  const { setShowModal } = useAuth();
  const { isLoaded, isSignedIn, user } = useUser();
  
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<ImageDetails[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [creditCount, setCreditCount] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState('google/nano-banana-2/text-to-image');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const [aspectRatio, setAspectRatio] = useState('4:3');
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const ratioButtonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState({ bottom: 0, left: 0 });
  const [quality, setQuality] = useState('1K');

  // Restore settings from localStorage on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('image_prompt_draft');
    if (savedPrompt) setPrompt(savedPrompt);

    const savedModel = localStorage.getItem('image_model_draft');
    if (savedModel) setSelectedModel(savedModel);

    const savedAspect = localStorage.getItem('image_aspect_draft');
    if (savedAspect) setAspectRatio(savedAspect);

    const savedQuality = localStorage.getItem('image_quality_draft');
    if (savedQuality) setQuality(savedQuality);
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    localStorage.setItem('image_prompt_draft', prompt);
  }, [prompt]);

  useEffect(() => {
    localStorage.setItem('image_model_draft', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('image_aspect_draft', aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    localStorage.setItem('image_quality_draft', quality);
  }, [quality]);
  const creditCost = quality === '4K' ? 4 : quality === '2K' ? 3 : 2;
  const [showQualityModal, setShowQualityModal] = useState(false);
  const qualityButtonRef = useRef<HTMLButtonElement>(null);
  const [qualityPopupPos, setQualityPopupPos] = useState({ bottom: 0, left: 0 });

  const qualityOptions = [
    { label: '1K', value: '1K' },
    { label: '2K', value: '2K' },
    { label: '4K', value: '4K' },
  ];

  const handleOpenQuality = () => {
    if (qualityButtonRef.current) {
      const rect = qualityButtonRef.current.getBoundingClientRect();
      setQualityPopupPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left + rect.width / 2
      });
    }
    setShowRatioDropdown(false); // close ratio when opening quality
    setShowQualityModal(prev => !prev);
  };

  const handleOpenRatio = () => {
    if (ratioButtonRef.current) {
      const rect = ratioButtonRef.current.getBoundingClientRect();
      setPopupPosition({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left + rect.width / 2
      });
    }
    setShowQualityModal(false); // close quality when opening ratio
    setShowRatioDropdown(prev => !prev);
  };
  
  const ratioOptions = [
    { label: 'Auto', value: 'auto', icon: '✦', w: 16, h: 16 },
    { label: '21:9', value: '21:9', icon: '▬', w: 24, h: 10 },
    { label: '16:9', value: '16:9', icon: '▬', w: 22, h: 12 },
    { label: '3:2', value: '3:2', icon: '▭', w: 18, h: 12 },
    { label: '4:3', value: '4:3', icon: '▭', w: 18, h: 14 },
    { label: '5:4', value: '5:4', icon: '▭', w: 16, h: 14 },
    { label: '1:1', value: '1:1', icon: '□', w: 16, h: 16 },
    { label: '4:5', value: '4:5', icon: '▯', w: 14, h: 16 },
    { label: '3:4', value: '3:4', icon: '▯', w: 14, h: 18 },
    { label: '2:3', value: '2:3', icon: '▯', w: 12, h: 18 },
    { label: '9:16', value: '9:16', icon: '▮', w: 12, h: 22 },
  ];
  
  // Interaction states
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const [selectedFullImage, setSelectedFullImage] = useState<ImageDetails | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (qualityButtonRef.current && qualityButtonRef.current.contains(e.target as Node)) return;
      if (ratioButtonRef.current && ratioButtonRef.current.contains(e.target as Node)) return;
      setShowRatioDropdown(false);
      setShowQualityModal(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!selectedFullImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        const currentIndex = generatedImages.findIndex(img => img.url === selectedFullImage.url);
        if (currentIndex > 0) setSelectedFullImage(generatedImages[currentIndex - 1]);
      }
      if (e.key === 'ArrowRight') {
        const currentIndex = generatedImages.findIndex(img => img.url === selectedFullImage.url);
        if (currentIndex < generatedImages.length - 1) setSelectedFullImage(generatedImages[currentIndex + 1]);
      }
      if (e.key === 'Escape') setSelectedFullImage(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFullImage, generatedImages]);

  // 1. Fetch initial data on load
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchCredits();
      fetchImages();
      // Restore generation state from localStorage
      const pendingGeneration = localStorage.getItem('image_generation_pending');
      if (pendingGeneration) {
        const pending = JSON.parse(pendingGeneration);
        // Only restore if started less than 5 minutes ago
        if (Date.now() - pending.startTime < 5 * 60 * 1000) {
          setIsLoading(true);
          // Restore prompt and settings
          if (pending.prompt) setPrompt(pending.prompt);
          if (pending.quality) setQuality(pending.quality);
          if (pending.aspectRatio) setAspectRatio(pending.aspectRatio);
          // Start polling for new images
          const pollInterval = setInterval(async () => {
            try {
              const res = await fetch('/api/user-images');
              const data = await res.json();
              if (data.images && data.images.length > 0) {
                // Check if there's a newer image than when generation started
                const newestImage = data.images[0];
                const imageTime = new Date(newestImage.created_at).getTime();
                if (imageTime > pending.startTime) {
                  // Generation completed
                  setGeneratedImages(data.images.map((img: any) => ({
                    url: img.image_url,
                    prompt: img.prompt || 'Generated with Keyo AI',
                    model: 'Nano Banana 2',
                    aspectRatio: img.aspect_ratio || '4:3',
                    resolution: img.resolution || '1K'
                  })));
                  setIsLoading(false);
                  localStorage.removeItem('image_generation_pending');
                  fetchCredits();
                  window.dispatchEvent(new Event('credits-updated'));
                  clearInterval(pollInterval);
                }
              }
            } catch (err) {
              console.error('Polling error:', err);
            }
          }, 3000);
          // Stop polling after 5 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
            setIsLoading(false);
            localStorage.removeItem('image_generation_pending');
          }, 5 * 60 * 1000);
        } else {
          // Too old, clean up
          localStorage.removeItem('image_generation_pending');
        }
      }
    } else if (isLoaded && !isSignedIn) {
      setCreditCount(0);
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
        setGeneratedImages(data.images.map((img: any) => ({
          url: img.image_url,
          prompt: img.prompt || 'Generated with Keyo AI',
          model: 'Nano Banana 2',
          aspectRatio: img.aspect_ratio || '4:3',
          resolution: img.resolution || '1K'
        })));
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
      // Save generation state to localStorage
      localStorage.setItem('image_generation_pending', JSON.stringify({
        prompt,
        startTime: Date.now(),
        quality,
        aspectRatio
      }));
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
        body: JSON.stringify({ prompt, model: selectedModel, imageUrls: uploadedUrls, aspectRatio, resolution: quality }),
      });
      
      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Non-JSON response from server:', response.status, responseText);
        throw new Error(`Server error (${response.status}): ${responseText.substring(0, 200)}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Update with the new generated image URLs and credits
      setGeneratedImages((prev) => [{
        url: data.images[0].url,
        prompt,
        model: 'Nano Banana 2',
        aspectRatio,
        resolution: quality
      }, ...prev]);
      localStorage.removeItem('image_generation_pending');
      if (data.remainingCredits !== undefined) {
        setCreditCount(data.remainingCredits);
      }
      window.dispatchEvent(new Event('credits-updated'));
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownload = (imageUrl: string) => {
    const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = 'keyo-studio-image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    { id: 'google/nano-banana-2/text-to-image', name: 'Nano Banana 2', price: '1 credit' }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-[130px] md:pb-[120px] relative" style={{ paddingTop: '64px' }}>
      <Navbar />
      


      {/* Main Canvas Area (Masonry Grid) */}
      <main className="w-full pt-4 md:pt-6 relative z-10" style={{ paddingLeft: '30px', paddingRight: '30px' }}>
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-dm text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#161616] to-[#0f0f0f] border border-[#ff3377]/20 shadow-lg animate-pulse" style={{ height: '220px' }}>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent w-[200%] animate-[shimmer_2.5s_ease_infinite]"></div>
               <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#ff3377] border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-syne font-bold text-[#ff3377] text-xs uppercase tracking-widest">Generating...</span>
               </div>
            </div>
          )}

          {/* Generated Results */}
          {generatedImages.map((img, i) => {
            const isLiked = likedImages.has(img.url);
            return (
              <div 
                key={img.url} 
                className="relative rounded-xl overflow-hidden bg-[#161616] border border-white/[0.06] hover:border-white/10 group shadow-lg transition-colors cursor-zoom-in"
                onClick={() => setSelectedFullImage(img)}
              >
                <Image 
                  src={img.url} 
                  alt={`Generated ${i}`} 
                  width={800} 
                  height={600} 
                  className="w-full object-cover"
                  style={{ height: '220px' }}
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
                    onClick={(e) => { e.stopPropagation(); handleDownload(img.url); }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[var(--accent)] flex items-center justify-center text-white backdrop-blur-md transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleLike(img.url); }}
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
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            cursor: 'default',
            paddingRight: '300px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedFullImage(null);
          }}
        >
          {/* Image area */}
          <img
            src={selectedFullImage.url}
            alt="Full view"
            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* RIGHT SIDEBAR */}
          <div
            style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: '300px', background: '#0f0f0f', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '24px', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Row */}
            <div className="flex items-center justify-between mb-8">
              <a 
                href="/dashboard"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #00ffc8, #00d4a8)',
                    color: 'black',
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 800,
                    fontSize: '13px'
                  }}
                >
                  {user?.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-white text-[14px] font-dm font-bold leading-none">
                    {user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'}
                  </div>
                  <div className="text-[#777] text-[12px] font-dm mt-1">Author</div>
                </div>
              </a>
              <button 
                onClick={() => setSelectedFullImage(null)}
                className="text-[#777] hover:text-white transition-colors flex items-center justify-center w-8 h-8 bg-white/[0.04] hover:bg-white/10 rounded-full"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="h-[1px] w-full bg-white/[0.06] mb-8"></div>

            {/* Prompt Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-[#777] uppercase tracking-[1px] font-syne font-bold">Prompt</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(selectedFullImage.prompt)}
                  className="text-[11px] text-[#777] border border-white/[0.08] hover:border-white/20 hover:text-white transition-colors rounded-[6px] px-2 py-[3px]"
                >
                  copy
                </button>
              </div>
              <p 
                className="text-[14px] text-[#777] font-dm leading-relaxed"
                style={{ userSelect: 'text', cursor: 'text' }}
              >
                {selectedFullImage.prompt}
              </p>
            </div>

            <div className="h-[1px] w-full bg-white/[0.06] mb-8"></div>

            {/* Information Section */}
            <div className="mb-8 flex-1">
              <span className="text-[11px] text-[#777] uppercase tracking-[1px] font-syne font-bold block mb-4">Information</span>
              
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[13px] text-[#777] font-dm">Model</span>
                <span className="text-[13px] text-white font-dm">Nano Banana 2</span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[13px] text-[#777] font-dm">Aspect ratio</span>
                <span className="text-[13px] text-white font-dm">{selectedFullImage.aspectRatio}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[13px] text-[#777] font-dm">Quality</span>
                <span className="text-[13px] text-white font-dm">{selectedFullImage.resolution || '1K'}</span>
              </div>
            </div>

            {/* Bottom Buttons */}
            <div>
              <button 
                onClick={() => handleDownload(selectedFullImage.url)}
                className="w-full text-[#777] hover:text-white border border-white/[0.1] hover:border-white/20 bg-transparent hover:bg-white/[0.02] transition-colors rounded-lg py-[10px] text-[13px] font-dm font-medium flex items-center justify-center gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download image
              </button>
            </div>

          </div>
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
              className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#080808] border border-white/[0.04] text-[#777] hover:text-white hover:border-white/20 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
              }}
              placeholder="Describe the image you imagine..." 
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#333 transparent'
              }}
              className="flex-1 bg-transparent border-none outline-none text-white font-dm text-sm placeholder:text-[#777] resize-none py-2"
            />
            <div className="flex flex-col gap-1.5 items-center">
              <button 
                onClick={handleGenerate}
                disabled={isLoaded && isSignedIn && (isLoading || !prompt.trim() || (creditCount !== null && creditCount <= 0))}
                className={`px-4 md:px-7 py-3 md:py-3.5 text-white font-dm font-[700] rounded-xl flex items-center justify-center gap-2 transition-all flex-shrink-0 ${(isLoading || (isLoaded && !isSignedIn)) ? 'opacity-70 cursor-pointer' : ''}`}
                style={{ 
                  background: (isLoaded && isSignedIn && creditCount !== null && creditCount <= 0) ? '#2a2a2a' : '#532fcf',
                  border: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  color: (isLoaded && isSignedIn && creditCount !== null && creditCount <= 0) ? '#777' : '#fff',
                  cursor: (isLoaded && isSignedIn && creditCount !== null && creditCount <= 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (isLoaded && isSignedIn && creditCount !== null && creditCount <= 0) ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#777" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>
                    No credits
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>
                    Generate · {creditCost}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bottom Row: Settings */}
          <div className="px-4 md:px-5 py-2 md:py-3 flex flex-wrap items-center gap-2 md:gap-3">
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className={`px-3 py-1 rounded-full bg-white/[0.06] border font-dm text-[11px] md:text-xs transition-all flex items-center gap-1.5 ${isModelDropdownOpen ? 'border-[#532fcf] text-white bg-white/10' : 'border-white/10 text-[#777] hover:text-white hover:bg-white/10'}`}
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
                      className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors flex flex-col gap-0.5 ${selectedModel === model.id ? 'bg-[#532fcf]/5' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-dm font-[600] text-sm text-[#777]`}>{model.name}</span>
                        {selectedModel === model.id && <div className="w-1 h-1 rounded-full bg-[#532fcf]" />}
                      </div>
                      <span className="font-dm text-[11px] text-[#777]">{model.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <button
                ref={ratioButtonRef}
                onClick={(e) => { e.stopPropagation(); handleOpenRatio(); }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-[#777] border border-white/10 hover:text-white transition-colors"
                style={{ minWidth: '60px' }}
              >
                {aspectRatio}
              </button>
              
              {showRatioDropdown && (
                <Portal>
                  <div 
                    className="fixed inset-0 z-[40]"
                    onMouseDown={() => setShowRatioDropdown(false)}
                  />
                  <div 
                    className="fixed z-[50] bg-[#141414] border border-white/10 rounded-2xl p-4 w-[160px]"
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      bottom: `${popupPosition.bottom}px`,
                      left: `${popupPosition.left}px`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <p className="text-[11px] text-[#777] mb-3 uppercase tracking-wider">Aspect ratio</p>
                    <div className="flex flex-col gap-1">
                      {ratioOptions.map(ratio => (
                        <button
                          key={ratio.value}
                          onClick={() => { setAspectRatio(ratio.value); setShowRatioDropdown(false); }}
                          className={`flex items-center gap-3 px-3 py-1 rounded-lg text-xs transition-colors text-left w-full ${
                            aspectRatio === ratio.value 
                              ? 'text-white bg-white/[0.08]' 
                              : 'text-[#777] hover:text-white hover:bg-white/[0.04]'
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

            <div>
              <button 
                ref={qualityButtonRef}
                onClick={handleOpenQuality}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-[#777] border border-white/10 hover:text-white transition-colors"
              >
                ◇ {quality}
              </button>

              {showQualityModal && (
                <Portal>
                  <div 
                    className="fixed inset-0 z-[40]"
                    onMouseDown={() => setShowQualityModal(false)}
                  />
                  <div
                    className="fixed z-[50] bg-[#141414] border border-white/10 rounded-2xl p-4 w-[160px]"
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      bottom: `${qualityPopupPos.bottom}px`,
                      left: `${qualityPopupPos.left}px`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <p className="text-[11px] text-[#777] mb-3 uppercase tracking-wider">Select quality</p>
                    <div className="flex flex-col gap-1">
                      {qualityOptions.map(q => (
                        <button
                          key={q.value}
                          onClick={() => { setQuality(q.value); setShowQualityModal(false); }}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13px] w-full text-left transition-colors ${
                            quality === q.value 
                              ? 'text-white bg-white/[0.08]' 
                              : 'text-[#777] hover:text-white'
                          }`}
                        >
                          {q.label}
                          {quality === q.value && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </Portal>
              )}
            </div>

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
