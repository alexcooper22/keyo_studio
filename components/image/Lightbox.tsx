'use client';
import { useEffect, useState } from 'react';
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
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none', cursor: 'default',
        paddingRight: '300px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <img
        src={image.url}
        alt="Full view"
        style={{ maxWidth: '100%', maxHeight: '88vh', objectFit: 'contain', borderRadius: '12px' }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Side panel */}
      <div
        style={{
          position: 'fixed', right: 0, top: 0, height: '100vh', width: '300px',
          background: '#0a0a0e',
          borderLeft: '0.5px solid rgba(255,255,255,0.07)',
          overflowY: 'auto', overflowX: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent 5%, rgba(120,80,255,0.5) 40%, rgba(83,47,207,0.75) 50%, rgba(120,80,255,0.5) 60%, transparent 95%)',
        }} />

        <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>

          {/* Header — user + close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a
              href="/dashboard"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(83,47,207,0.5), rgba(140,90,255,0.3))',
                border: '1px solid rgba(120,80,255,0.3)',
                fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '13px', color: 'white',
              }}>
                {avatarLetter}
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontFamily: 'var(--font-dm)', fontWeight: 500, lineHeight: 1.2 }}>
                  {displayName}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px', fontFamily: 'var(--font-dm)', marginTop: '2px' }}>
                  Author
                </div>
              </div>
            </a>
            <button
              onClick={onClose}
              style={{
                width: '28px', height: '28px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />

          {/* Prompt section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px', fontFamily: 'var(--font-dm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Prompt
              </span>
              <button
                onClick={handleCopy}
                style={{
                  fontSize: '10px', fontFamily: 'var(--font-dm)', fontWeight: 500,
                  padding: '3px 9px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
                  background: copied ? 'rgba(83,47,207,0.2)' : 'rgba(255,255,255,0.05)',
                  border: copied ? '0.5px solid rgba(120,80,255,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
                  color: copied ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.35)',
                }}
                onMouseEnter={e => { if (!copied) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
                onMouseLeave={e => { if (!copied) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; } }}
              >
                {copied ? '✓ copied' : 'copy'}
              </button>
            </div>
            <p style={{
              fontSize: '13px', fontFamily: 'var(--font-dm)', lineHeight: 1.65,
              color: 'rgba(255,255,255,0.55)', userSelect: 'text', cursor: 'text', margin: 0,
            }}>
              {image.prompt}
            </p>
          </div>

          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />

          {/* Info section */}
          <div>
            <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px', fontFamily: 'var(--font-dm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
              Information
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Model', value: image.model || 'Unknown' },
                { label: 'Aspect ratio', value: image.aspectRatio },
                { label: 'Quality', value: image.resolution || '1K' },
              ].map(({ label, value }, i) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 0',
                  borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', color: 'rgba(255,255,255,0.3)' }}>{label}</span>
                  <span style={{
                    fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500,
                    color: label === 'Model' ? 'rgba(180,150,255,0.9)' : 'rgba(255,255,255,0.8)',
                  }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Download button */}
          <button
            onClick={() => onDownload(image.url)}
            style={{
              width: '100%', padding: '11px', borderRadius: '10px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.55)', fontSize: '13px',
              fontFamily: 'var(--font-dm)', fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(83,47,207,0.2), rgba(120,80,255,0.12))';
              e.currentTarget.style.borderColor = 'rgba(100,65,220,0.4)';
              e.currentTarget.style.color = 'rgba(200,170,255,0.9)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download image
          </button>
        </div>
      </div>
    </div>
  );
}
