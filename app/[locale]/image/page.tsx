'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import PromptBar from '@/components/image/PromptBar';
import { fetchModelsWithCache } from '@/lib/modelCache';
import Lightbox, { type ImageDetails } from '@/components/image/Lightbox';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

const parseAR = (ratio: string) => {
  const [w, h] = ratio.split(':').map(Number);
  return (w || 4) / (h || 3);
};

const ROW_H = 320;

const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const maxSize = 1024;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = (height / width) * maxSize; width = maxSize; }
        else { width = (width / height) * maxSize; height = maxSize; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
    };
    img.src = url;
  });
};

export default function ImageDashboard() {
  const t = useTranslations('image');
  const { setShowModal } = useAuth();
  const { isLoaded, isSignedIn, user } = useUser();

  const [prompt, setPrompt] = useState('');
  const [loadingCount, setLoadingCount] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<ImageDetails[]>([]);
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; uploading?: boolean; tempId?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [creditCount, setCreditCount] = useState<number | null>(null);
  const [imageModels, setImageModels] = useState<Array<{ id: string; name: string; provider: string; pricing: Array<{ quality: string; credits: number; unit: string; cost_usd: number }> }>>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [error, setError] = useState('');
  const [aspectRatio, setAspectRatio] = useState('4:3');
  const [quality, setQuality] = useState('1K');
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const [selectedFullImage, setSelectedFullImage] = useState<ImageDetails | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

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
    fetchModels();
  }, []);

  useEffect(() => {
    const onFocus = () => { if (isSignedIn) fetchModels(); fetchCredits(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) onFocus(); });
    return () => { window.removeEventListener('focus', onFocus); };
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchCredits();
      fetchImages();
      const pendingGeneration = localStorage.getItem('image_generation_pending');
      if (pendingGeneration) {
        const pending = JSON.parse(pendingGeneration);
        if (Date.now() - pending.startTime < 5 * 60 * 1000) {
          setLoadingCount(c => c + 1);
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
                    id: img.id,
                    url: img.image_url,
                    prompt: img.prompt || 'Generated with Keyo AI',
                    model: img.model || 'Unknown',
                    aspectRatio: img.aspect_ratio || '4:3',
                    resolution: img.resolution || '1K',
                  })));
                  setLoadingCount(c => Math.max(0, c - 1));
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
            setLoadingCount(c => Math.max(0, c - 1));
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
          id: img.id,
          url: img.image_url,
          prompt: img.prompt || 'Generated with Keyo AI',
          model: img.model || 'Unknown',
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
      const models = await fetchModelsWithCache('image');
      if (models.length) {
        setImageModels(models);
        const saved = localStorage.getItem('image_model_draft');
        const validSaved = models.find((m: any) => m.id === saved);
        setSelectedModelId(validSaved ? saved : models[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch image models', err);
    }
  };

  async function handleGenerate() {
    if (!isLoaded) return;
    if (!isSignedIn) { setShowModal(true); return; }
    if (!prompt.trim()) return;

    setLoadingCount(c => c + 1);
    setError('');
    const currentPrompt = prompt;
    const uploadedUrls = uploadedImages.filter(img => !img.uploading).map(img => img.url);

    try {
      localStorage.setItem('image_generation_pending', JSON.stringify({ prompt: currentPrompt, startTime: Date.now(), quality, aspectRatio }));
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt, modelId: selectedModelId, imageUrls: uploadedUrls, aspectRatio, resolution: quality }),
      });

      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server error (${response.status}): ${responseText.substring(0, 200)}`);
      }

      if (data.error) throw new Error(data.error);

      localStorage.removeItem('image_generation_pending');
      if (data.remainingCredits !== undefined) setCreditCount(data.remainingCredits);
      window.dispatchEvent(new Event('credits-updated'));
      await fetchImages();
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoadingCount(c => Math.max(0, c - 1));
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

  const handleDeleteImage = async (img: ImageDetails) => {
    if (!img.id) return;
    setGeneratedImages(prev => prev.filter(i => i.id !== img.id));
    if (selectedFullImage?.id === img.id) setSelectedFullImage(null);
    try {
      await fetch('/api/user-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: img.id }),
      });
    } catch (err) {
      console.error('Delete failed', err);
      fetchImages();
    }
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
        const needsCompression = file.size > 4.5 * 1024 * 1024;
        const fileToUpload = needsCompression
          ? new File([await compressImage(file)], 'image.jpg', { type: 'image/jpeg' })
          : file;
        const formData = new FormData();
        formData.append('file', fileToUpload);
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

  if (isLoaded && !isSignedIn) {
    return (
      <div className="relative overflow-hidden flex flex-col" style={{ background: '#0a0c10', height: '100dvh', overflow: 'hidden' }}>
        <Navbar />
        {/* radial glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(60,80,160,0.28) 0%, rgba(40,55,120,0.1) 45%, transparent 70%)', pointerEvents: 'none' }} />

        {/* center content — shifted up on mobile */}
        <div className="flex-1 flex flex-col items-center relative z-10 px-6 text-center" style={{ justifyContent: 'center', paddingBottom: '160px' }}>
          {/* corner brackets */}
          {[['top-0 left-0', 'border-t border-l', '-translate-x-px -translate-y-px'],
            ['top-0 right-0', 'border-t border-r', 'translate-x-px -translate-y-px'],
            ['bottom-0 left-0', 'border-b border-l', '-translate-x-px translate-y-px'],
            ['bottom-0 right-0', 'border-b border-r', 'translate-x-px translate-y-px'],
          ].map(([pos, border, translate], i) => (
            <div key={i} className={`absolute ${pos} ${translate}`} style={{ width: '36px', height: '36px' }}>
              <div className={`w-full h-full ${border}`} style={{ borderColor: 'rgba(83,47,207,0.7)' }} />
            </div>
          ))}

          <p className="font-dm mb-5 tracking-[0.2em] uppercase" style={{ fontSize: '11px', color: 'rgba(140,160,220,0.55)', letterSpacing: '0.18em' }}>
            {t('studioLabel')}
          </p>
          <h1 className="font-clash" style={{
            fontSize: 'clamp(44px, 6vw, 72px)',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #7090e8 0%, #5b7fe0 35%, #8ba4f0 65%, #a8c0ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            maxWidth: '680px',
          }}>
            {t('heroTitle')}
          </h1>
        </div>

        <PromptBar
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          isLoading={loadingCount > 0}
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-[200px] md:pb-[120px] relative" style={{ paddingTop: '64px' }}>
      <Navbar />

      <main className="w-full pt-4 md:pt-6 px-4 md:px-8 relative z-10">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-dm text-sm">
            {error}
          </div>
        )}

        {generatedImages.length === 0 && loadingCount === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {[4/3, 16/9, 1, 4/3, 3/4, 16/9, 1, 4/3].map((r, i) => (
              <div key={i} style={{ flex: `${r} 1 ${r * ROW_H}px`, height: ROW_H, background: 'var(--bg-card)', border: '0.5px solid rgba(83,47,207,0.08)', opacity: 0.4, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(83,47,207,0.06) 0%, transparent 70%)' }} />
              </div>
            ))}
            <div style={{ flex: '999 0 0', height: ROW_H }} />
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {Array.from({ length: loadingCount }).map((_, idx) => {
            const r = parseAR(aspectRatio);
            return (
              <div key={`loading-${idx}`} style={{ flex: `${r} 1 ${r * ROW_H}px`, height: ROW_H, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(83,47,207,0.12) 0%, #111111 100%)', border: '0.5px solid rgba(83,47,207,0.25)' }}>
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(83,47,207,0.15) 0%, transparent 65%)' }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid rgba(120,80,255,0.8)', borderTopColor: 'transparent' }} />
                  <span className="font-clash text-xs uppercase tracking-widest" style={{ color: 'rgba(120,80,255,0.7)', letterSpacing: '1px' }}>Generating...</span>
                </div>
              </div>
            );
          })}

          {generatedImages.map((img, i) => {
            const isLiked = likedImages.has(img.url);
            const r = parseAR(img.aspectRatio || '4:3');
            return (
              <div
                key={img.url}
                className="group"
                style={{ flex: `${r} 1 ${r * ROW_H}px`, height: ROW_H, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setSelectedFullImage(img)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Generated ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {isLiked && (
                  <div className="absolute top-3 right-3 z-20 pointer-events-none group-hover:opacity-0 transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  </div>
                )}
                {confirmingDeleteId === img.id ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} onClick={e => e.stopPropagation()}>
                    <p className="font-dm text-xs text-white/75 text-center px-4">Delete this image?</p>
                    <div className="flex gap-2">
                      <button onClick={e => { e.stopPropagation(); setConfirmingDeleteId(null); }} className="px-4 py-1.5 rounded-lg font-dm text-xs" style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)' }}>Cancel</button>
                      <button onClick={e => { e.stopPropagation(); setConfirmingDeleteId(null); handleDeleteImage(img); }} className="px-4 py-1.5 rounded-lg font-dm text-xs text-white" style={{ background: 'rgba(200,40,40,0.8)' }}>Delete</button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/40 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300 flex items-start justify-end p-3 gap-2 backdrop-blur-[2px] z-10">
                    <button onClick={e => { e.stopPropagation(); handleDownload(img.url); }} className="w-9 h-9 rounded-full bg-white/10 hover:bg-[var(--accent)] flex items-center justify-center text-white backdrop-blur-md transition-colors" title="Download">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); toggleLike(img.url); }} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-md transition-colors" title="Like">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? 'var(--accent)' : 'none'} stroke={isLiked ? 'var(--accent)' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmingDeleteId(img.id ?? null); }} className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/70 flex items-center justify-center text-white/70 hover:text-white backdrop-blur-md transition-colors" title="Delete">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {(generatedImages.length > 0 || loadingCount > 0) && (
            <div style={{ flex: '999 0 0', height: ROW_H }} />
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
          onDelete={handleDeleteImage}
        />
      )}

      <PromptBar
        prompt={prompt}
        onPromptChange={setPrompt}
        onGenerate={handleGenerate}
        isLoading={loadingCount > 0}
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
