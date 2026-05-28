'use client';
import { useEffect } from 'react';
import type { UserResource } from '@clerk/shared/types';

export interface ImageDetails {
  url: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution?: string;
}

interface LightboxProps {
  image: ImageDetails;
  allImages: ImageDetails[];
  user: UserResource | null | undefined;
  onClose: () => void;
  onNavigate: (image: ImageDetails) => void;
  onDownload: (url: string) => void;
}

export default function Lightbox({ image, allImages, user, onClose, onNavigate, onDownload }: LightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = allImages.findIndex(img => img.url === image.url);
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(allImages[currentIndex - 1]);
      if (e.key === 'ArrowRight' && currentIndex < allImages.length - 1) onNavigate(allImages[currentIndex + 1]);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, allImages, onClose, onNavigate]);

  return (
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
        paddingRight: '300px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <img
        src={image.url}
        alt="Full view"
        style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 'var(--radius-btn)' }}
        onClick={(e) => e.stopPropagation()}
      />

      <div
        style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: '300px', background: 'var(--bg-card)', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '24px', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <a
            href="/dashboard"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', textDecoration: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00ffc8, #00d4a8)', color: 'black', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '13px' }}>
              {user?.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="text-white text-[14px] font-dm font-bold leading-none">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'}
              </div>
              <div className="text-text-secondary text-[12px] font-dm mt-1">Author</div>
            </div>
          </a>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors flex items-center justify-center w-8 h-8 bg-white/[0.04] hover:bg-white/10 rounded-full"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="h-[1px] w-full bg-white/[0.06] mb-8" />

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-text-secondary uppercase tracking-[1px] font-syne font-bold">Prompt</span>
            <button
              onClick={() => navigator.clipboard.writeText(image.prompt)}
              className="text-[11px] text-text-secondary border border-white/[0.08] hover:border-white/20 hover:text-white transition-colors rounded-[6px] px-2 py-[3px]"
            >
              copy
            </button>
          </div>
          <p className="text-[14px] text-text-secondary font-dm leading-relaxed" style={{ userSelect: 'text', cursor: 'text' }}>
            {image.prompt}
          </p>
        </div>

        <div className="h-[1px] w-full bg-white/[0.06] mb-8" />

        <div className="mb-8 flex-1">
          <span className="text-[11px] text-text-secondary uppercase tracking-[1px] font-syne font-bold block mb-4">Information</span>
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
            <span className="text-[13px] text-text-secondary font-dm">Model</span>
            <span className="text-[13px] text-white font-dm">Nano Banana 2</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
            <span className="text-[13px] text-text-secondary font-dm">Aspect ratio</span>
            <span className="text-[13px] text-white font-dm">{image.aspectRatio}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
            <span className="text-[13px] text-text-secondary font-dm">Quality</span>
            <span className="text-[13px] text-white font-dm">{image.resolution || '1K'}</span>
          </div>
        </div>

        <div>
          <button
            onClick={() => onDownload(image.url)}
            className="w-full text-text-secondary hover:text-white border border-white/[0.1] hover:border-white/20 bg-transparent hover:bg-white/[0.02] transition-colors rounded-lg py-[10px] text-[13px] font-dm font-medium flex items-center justify-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download image
          </button>
        </div>
      </div>
    </div>
  );
}
