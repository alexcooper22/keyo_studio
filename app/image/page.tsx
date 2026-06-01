'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Navbar from '../../components/layout/Navbar';
import PromptBar from '../../components/image/PromptBar';
import Lightbox, { type ImageDetails } from '../../components/image/Lightbox';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '@clerk/nextjs';

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
  const { isLoaded, isSignedIn, user } = useUser();

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<ImageDetails[]>([]);
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; uploading?: boolean; tempId?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [creditCount, setCreditCount] = useState<number | null>(null);
  const [imageModels, setImageModels] = useState<Array<{ id: string; name: string; pricing: Array<{ quality: string; credits: number; unit: string; cost_usd: number }> }>>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [error, setError] = useState('');
  const [aspectRatio, setAspectRatio] = useState('4:3');
  const [quality, setQuality] = useState('1K');
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const [selectedFullImage, setSelectedFullImage] = useState<ImageDetails | null>(null);

  const selectedModelData = imageModels.find(m => m.id === selectedModelId);
  const creditCost = selectedModelData?.pricing.find(p => p.quality === quality)?.credits ?? 2;

  // Restore settings from localStorage on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('image_prompt_draft');
    if (savedPrompt) setPrompt(savedPrompt);
    const savedAspect = localStorage.getItem('image_aspect_draft');
    if (savedAspect) setAspectRatio(savedAspect);
    const savedQuality = localStorage.getItem('image_quality_draft');
    if (savedQuality) setQuality(savedQuality);
    const savedRefs = localStorage.getItem('image_uploaded_refs');
    if (savedRefs) {
      try {
        const parsed = JSON.parse(savedRefs);
        if (Array.isArray(parsed)) setUploadedImages(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => { localStorage.setItem('image_prompt_draft', prompt); }, [prompt]);
  useEffect(() => {
    if (selectedModelId) localStorage.setItem('image_model_draft', selectedModelId);
  }, [selectedModelId]);
  useEffect(() => { localStorage.setItem('image_aspect_draft', aspectRatio); }, [aspectRatio]);
  useEffect(() => { localStorage.setItem('image_quality_draft', quality); }, [quality]);
  useEffect(() => {
    const onlyUploaded = uploadedImages.filter(img => !img.uploading);
    if (onlyUploaded.length > 0) {
      localStorage.setItem('image_uploaded_refs', JSON.stringify(onlyUploaded.map(img => ({ url: img.url }))));
    } else {
      localStorage.removeItem('image_uploaded_refs');
    }
  }, [uploadedImages]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchCredits();
      fetchImages();
      fetchModels();
      const pendingGeneration = localStorage.getItem('image_generation_pending');
      if (pendingGeneration) {
        const pending = JSON.parse(pendingGeneration);
        if (Date.now() - pending.startTime < 5 * 60 * 1000) {
          setIsLoading(true);
          if (pending.prompt) setPrompt(pending.prompt);
          if (pending.quality) setQuality(pending.quality);
          if (pending.aspectRatio) setAspectRatio(pending.aspectRatio);
          const pollInterval = setInterval(async () => {
            try {
              const res = await fetch('/api/user-images');
              const data = await res.json();
              if (data.images && data.images.length > 0) {
                const newestImage = data.images[0];
                const imageTime = new Date(newestImage.created_at).getTime();
                if (imageTime > pending.startTime) {
                  setGeneratedImages(data.images.map((img: any) => ({
                    url: img.image_url,
                    prompt: img.prompt || 'Generated with Keyo AI',
                    model: 'Nano Banana 2',
                    aspectRatio: img.aspect_ratio || '4:3',
                    resolution: img.resolution || '1K',
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
          setTimeout(() => {
            clearInterval(pollInterval);
            setIsLoading(false);
            localStorage.removeItem('image_generation_pending');
          }, 5 * 60 * 1000);
        } else {
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
      console.error('Failed to fetch credits', err);
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
          resolution: img.resolution || '1K',
        })));
      }
    } catch (err) {
      console.error('Failed to fetch images', err);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models?category=image');
      const data = await res.json();
      if (data.models?.length) {
        setImageModels(data.models);
        const saved = localStorage.getItem('image_model_draft');
        const validSaved = data.models.find((m: any) => m.id === saved);
        setSelectedModelId(validSaved ? saved : data.models[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch image models', err);
    }
  };

  async function handleGenerate() {
    if (!isLoaded) return;
    if (!isSignedIn) { setShowModal(true); return; }
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      localStorage.setItem('image_generation_pending', JSON.stringify({ prompt, startTime: Date.now(), quality, aspectRatio }));
      const uploadedUrls = uploadedImages.filter(img => !img.uploading).map(img => img.url);
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modelId: selectedModelId, imageUrls: uploadedUrls, aspectRatio, resolution: quality }),
      });

      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server error (${response.status}): ${responseText.substring(0, 200)}`);
      }

      if (data.error) throw new Error(data.error);

      setGeneratedImages((prev) => [{ url: data.images[0].url, prompt, model: 'Nano Banana 2', aspectRatio, resolution: quality }, ...prev]);
      localStorage.removeItem('image_generation_pending');
      if (data.remainingCredits !== undefined) setCreditCount(data.remainingCredits);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const arr = files.slice(0, 14 - uploadedImages.length);

    for (const file of arr) {
      const tempId = Math.random().toString(36).slice(2);
      const previewUrl = URL.createObjectURL(file);
      setUploadedImages(prev => [...prev, { url: previewUrl, uploading: true, tempId }]);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          setUploadedImages(prev => prev.map(img => img.tempId === tempId ? { url: data.url } : img));
          URL.revokeObjectURL(previewUrl);
        } else {
          setUploadedImages(prev => prev.filter(img => img.tempId !== tempId));
        }
      } catch {
        setUploadedImages(prev => prev.filter(img => img.tempId !== tempId));
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-[200px] md:pb-[120px] relative" style={{ paddingTop: '64px' }}>
      <Navbar />

      <main className="w-full pt-4 md:pt-6 px-4 md:px-8 relative z-10">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-dm text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isLoading && (
            <div className="relative rounded-xl overflow-hidden" style={{ height: '220px', background: 'linear-gradient(135deg, rgba(83,47,207,0.12) 0%, #111111 100%)', border: '0.5px solid rgba(83,47,207,0.25)' }}>
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(83,47,207,0.15) 0%, transparent 65%)' }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-t-transparent animate-spin" style={{ border: '2px solid rgba(120,80,255,0.8)', borderTopColor: 'transparent' }} />
                <span className="font-clash text-xs uppercase tracking-widest" style={{ color: 'rgba(120,80,255,0.7)', letterSpacing: '1px' }}>Generating...</span>
              </div>
            </div>
          )}

          {generatedImages.map((img, i) => {
            const isLiked = likedImages.has(img.url);
            return (
              <div
                key={img.url}
                className="relative rounded-xl overflow-hidden bg-bg-navbar border border-white/[0.06] hover:border-white/10 group shadow-lg transition-colors cursor-zoom-in"
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
                {isLiked && (
                  <div className="absolute top-3 right-3 z-20 pointer-events-none group-hover:opacity-0 transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                )}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? 'var(--accent)' : 'none'} stroke={isLiked ? 'var(--accent)' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}

          {generatedImages.length === 0 && !isLoading && (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square" style={{ background: 'var(--bg-card)', border: '0.5px solid rgba(83,47,207,0.08)', opacity: 0.4 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(83,47,207,0.06) 0%, transparent 70%)' }} />
              </div>
            ))
          )}
        </div>
      </main>

      {selectedFullImage && (
        <Lightbox
          image={selectedFullImage}
          allImages={generatedImages}
          user={user}
          onClose={() => setSelectedFullImage(null)}
          onNavigate={setSelectedFullImage}
          onDownload={handleDownload}
        />
      )}

      <PromptBar
        prompt={prompt}
        onPromptChange={setPrompt}
        onGenerate={handleGenerate}
        isLoading={isLoading}
        isLoaded={isLoaded}
        isSignedIn={isSignedIn}
        creditCount={creditCount}
        creditCost={creditCost}
        models={imageModels}
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModelId}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        quality={quality}
        onQualityChange={setQuality}
        uploadedImages={uploadedImages}
        onImageUpload={handleImageUpload}
        onRemoveImage={removeImage}
      />

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
