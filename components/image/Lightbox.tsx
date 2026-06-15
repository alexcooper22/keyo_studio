'use client';
import { useEffect, useState, useCallback } from 'react';
import type { UserResource } from '@clerk/shared/types';

export interface ImageDetails {
  id?: string;
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
  onDelete?: (image: ImageDetails) => void;
  onAnimate?: (image: ImageDetails) => void;
  onCopyToPrompt?: (prompt: string) => void;
  onAddReference?: (url: string) => void;
}

export default function Lightbox({ image, allImages, user, onClose, onNavigate, onDownload, onDelete, onAnimate, onCopyToPrompt, onAddReference }: LightboxProps) {
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [refAdded, setRefAdded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [mobileImgFullscreen, setMobileImgFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const currentIndex = allImages.findIndex(img => img.url === image.url);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allImages.length - 1;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  useEffect(() => { setConfirmingDelete(false); setPromptCopied(false); setRefAdded(false); setMobileImgFullscreen(false); }, [image.url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const navBtn = (onClick: () => void, children: React.ReactNode, extraStyle?: React.CSSProperties) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', transition: 'all 0.15s', flexShrink: 0, ...extraStyle }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(83,47,207,0.5)'; e.currentTarget.style.color = 'white'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
    >{children}</button>
  );

  const prevArrow = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
  const nextArrow = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;

  const infoPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(83,47,207,0.5), rgba(140,90,255,0.3))', border: '1px solid rgba(120,80,255,0.3)', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '13px', color: 'white' }}>
            {avatarLetter}
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontFamily: 'var(--font-dm)', fontWeight: 500, lineHeight: 1.2 }}>{displayName}</div>
            <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px', fontFamily: 'var(--font-dm)', marginTop: '2px' }}>Author</div>
          </div>
        </a>
        {!isMobile && (
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />

      {/* Prompt */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px', fontFamily: 'var(--font-dm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Prompt</span>
          <button onClick={handleCopy} style={{ fontSize: '10px', fontFamily: 'var(--font-dm)', fontWeight: 500, padding: '3px 9px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s', background: copied ? 'rgba(83,47,207,0.2)' : 'rgba(255,255,255,0.05)', border: copied ? '0.5px solid rgba(120,80,255,0.4)' : '0.5px solid rgba(255,255,255,0.08)', color: copied ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.35)' }}>
            {copied ? '✓ copied' : 'copy'}
          </button>
        </div>
        <p style={{ fontSize: '13px', fontFamily: 'var(--font-dm)', lineHeight: 1.65, color: 'rgba(255,255,255,0.55)', userSelect: 'text', cursor: 'text', margin: 0 }}>{image.prompt}</p>
      </div>

      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />

      {/* Info */}
      <div>
        <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px', fontFamily: 'var(--font-dm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>Information</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[{ label: 'Model', value: image.model || 'Unknown' }, { label: 'Aspect ratio', value: image.aspectRatio }, { label: 'Quality', value: image.resolution || '1K' }].map(({ label, value }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', color: 'rgba(255,255,255,0.3)' }}>{label}</span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, color: label === 'Model' ? 'rgba(180,150,255,0.9)' : 'rgba(255,255,255,0.8)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Animate — full width, accent */}
        {onAnimate && (
          <button
            onClick={() => onAnimate(image)}
            style={{ width: '100%', padding: '11px', borderRadius: '10px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(83,47,207,0.9) 0%, rgba(110,65,230,0.85) 100%)', border: 'none', color: 'rgba(255,255,255,0.92)', fontSize: '13px', fontFamily: 'var(--font-dm)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s', boxShadow: '0 2px 12px rgba(83,47,207,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100,60,230,1) 0%, rgba(130,80,255,0.95) 100%)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(83,47,207,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(83,47,207,0.9) 0%, rgba(110,65,230,0.85) 100%)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(83,47,207,0.35)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            Animate
          </button>
        )}

        {/* Copy prompt + Reference — 2 cols */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {onCopyToPrompt && (
            <button
              onClick={() => { onCopyToPrompt(image.prompt); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 2000); }}
              style={{ padding: '10px 8px', borderRadius: '10px', cursor: 'pointer', background: promptCopied ? 'rgba(83,47,207,0.15)' : 'rgba(255,255,255,0.05)', border: promptCopied ? '0.5px solid rgba(120,80,255,0.4)' : '0.5px solid rgba(255,255,255,0.1)', color: promptCopied ? 'rgba(180,150,255,0.9)' : 'rgba(255,255,255,0.55)', fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!promptCopied) { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
              onMouseLeave={e => { if (!promptCopied) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              {promptCopied ? '✓ Pasted' : 'Copy prompt'}
            </button>
          )}
          {onAddReference && (
            <button
              onClick={() => { onAddReference(image.url); setRefAdded(true); setTimeout(() => setRefAdded(false), 2000); }}
              style={{ padding: '10px 8px', borderRadius: '10px', cursor: 'pointer', background: refAdded ? 'rgba(83,47,207,0.15)' : 'rgba(255,255,255,0.05)', border: refAdded ? '0.5px solid rgba(120,80,255,0.4)' : '0.5px solid rgba(255,255,255,0.1)', color: refAdded ? 'rgba(180,150,255,0.9)' : 'rgba(255,255,255,0.55)', fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!refAdded) { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
              onMouseLeave={e => { if (!refAdded) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              {refAdded ? '✓ Added' : 'Reference'}
            </button>
          )}
        </div>

        {/* Download */}
        <button onClick={() => onDownload(image.url)}
          style={{ width: '100%', padding: '11px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontFamily: 'var(--font-dm)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download image
        </button>

        {/* Delete */}
        {onDelete && (
          confirmingDelete ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmingDelete(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}>
                Cancel
              </button>
              <button onClick={() => { onDelete(image); setConfirmingDelete(false); }}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(220,50,50,0.12)', border: '0.5px solid rgba(220,50,50,0.3)', color: 'rgba(255,100,100,0.9)', fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,50,50,0.22)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,50,50,0.12)'; }}>
                Delete
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmingDelete(true)}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)', fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,50,50,0.1)'; e.currentTarget.style.borderColor = 'rgba(220,50,50,0.25)'; e.currentTarget.style.color = 'rgba(255,100,100,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              Delete image
            </button>
          )
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0a0a0e', display: 'flex', flexDirection: 'column', overflowY: mobileImgFullscreen ? 'hidden' : 'auto' }}>
        {/* Top accent line */}
        {!mobileImgFullscreen && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(120,80,255,0.5) 40%, rgba(83,47,207,0.75) 50%, rgba(120,80,255,0.5) 60%, transparent 95%)', zIndex: 1 }} />
        )}

        {/* Image area — tappable to go fullscreen */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'height 0.3s ease',
            height: mobileImgFullscreen ? '100dvh' : undefined,
            minHeight: mobileImgFullscreen ? undefined : '280px',
            maxHeight: mobileImgFullscreen ? undefined : '55vh',
          }}
          onClick={() => !mobileImgFullscreen && setMobileImgFullscreen(true)}
        >
          <img
            src={image.url}
            alt="Full view"
            style={{
              maxWidth: '100%',
              maxHeight: mobileImgFullscreen ? '100dvh' : '55vh',
              objectFit: 'contain',
              cursor: mobileImgFullscreen ? 'default' : 'zoom-in',
              display: 'block',
            }}
          />

          {/* Nav arrows */}
          {hasPrev && (
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
              {navBtn(() => onNavigate(allImages[currentIndex - 1]), prevArrow)}
            </div>
          )}
          {hasNext && (
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
              {navBtn(() => onNavigate(allImages[currentIndex + 1]), nextArrow)}
            </div>
          )}

          {/* Counter */}
          {allImages.length > 1 && (
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', borderRadius: '20px', padding: '4px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: 'var(--font-dm)', zIndex: 2 }}>
              {currentIndex + 1} / {allImages.length}
            </div>
          )}

          {/* Top-right buttons: collapse (when fullscreen) or close */}
          <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px', zIndex: 2 }}>
            {mobileImgFullscreen && (
              <button
                onClick={e => { e.stopPropagation(); setMobileImgFullscreen(false); }}
                style={{ width: '36px', height: '36px', borderRadius: '10px', border: '0.5px solid rgba(255,255,255,0.25)', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Show info"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); onClose(); }}
              style={{ width: '36px', height: '36px', borderRadius: '10px', border: '0.5px solid rgba(255,255,255,0.25)', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Tap hint — only visible briefly when NOT fullscreen */}
          {!mobileImgFullscreen && (
            <div style={{ position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'var(--font-dm)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
              tap to expand
            </div>
          )}
        </div>

        {/* Info panel — hidden when fullscreen */}
        {!mobileImgFullscreen && (
          <div style={{ flex: 1, padding: '20px 20px 32px', display: 'flex', flexDirection: 'column' }}>
            {infoPanel}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', cursor: 'default', paddingRight: '300px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Prev */}
      {hasPrev && (
        <div style={{ position: 'fixed', left: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
          {navBtn(() => onNavigate(allImages[currentIndex - 1]), prevArrow)}
        </div>
      )}
      {/* Next */}
      {hasNext && (
        <div style={{ position: 'fixed', right: '320px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
          {navBtn(() => onNavigate(allImages[currentIndex + 1]), nextArrow)}
        </div>
      )}
      {/* Counter */}
      {allImages.length > 1 && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(calc(-50% - 150px))', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '5px 14px', color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontFamily: 'var(--font-dm)', zIndex: 10 }}>
          {currentIndex + 1} / {allImages.length}
        </div>
      )}

      <img src={image.url} alt="Full view" style={{ maxWidth: '100%', maxHeight: '88vh', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />

      {/* Side panel */}
      <div style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: '300px', background: '#0a0a0e', borderLeft: '0.5px solid rgba(255,255,255,0.07)', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(120,80,255,0.5) 40%, rgba(83,47,207,0.75) 50%, rgba(120,80,255,0.5) 60%, transparent 95%)' }} />
        <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
          {infoPanel}
        </div>
      </div>
    </div>
  );
}
