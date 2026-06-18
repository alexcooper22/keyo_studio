'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Portal from '../ui/Portal';

interface UploadedImage {
  url: string;
  uploading?: boolean;
  tempId?: string;
}

interface PromptBarProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  isLoaded: boolean;
  isSignedIn: boolean | null | undefined;
  creditCount: number | null;
  creditCost: number;
  models: Array<{ id: string; name: string; provider: string; pricing: Array<{ quality: string; credits: number }> }>;
  selectedModelId: string;
  onModelChange: (id: string) => void;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  quality: string;
  onQualityChange: (quality: string) => void;
  uploadedImages: UploadedImage[];
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
}

const ratioOptions = [
  { label: 'Auto', value: 'auto', w: 16, h: 16 },
  { label: '21:9', value: '21:9', w: 24, h: 10 },
  { label: '16:9', value: '16:9', w: 22, h: 12 },
  { label: '3:2', value: '3:2', w: 18, h: 12 },
  { label: '4:3', value: '4:3', w: 18, h: 14 },
  { label: '5:4', value: '5:4', w: 16, h: 14 },
  { label: '1:1', value: '1:1', w: 16, h: 16 },
  { label: '4:5', value: '4:5', w: 14, h: 16 },
  { label: '3:4', value: '3:4', w: 14, h: 18 },
  { label: '2:3', value: '2:3', w: 12, h: 18 },
  { label: '9:16', value: '9:16', w: 12, h: 22 },
];

const qualityOptions = [
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
];

export default function PromptBar({
  prompt, onPromptChange, onGenerate,
  isLoading, isLoaded, isSignedIn,
  creditCount, creditCost,
  models, selectedModelId, onModelChange,
  aspectRatio, onAspectRatioChange,
  quality, onQualityChange,
  uploadedImages, onImageUpload, onRemoveImage,
}: PromptBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  const ratioButtonRef = useRef<HTMLButtonElement>(null);
  const qualityButtonRef = useRef<HTMLButtonElement>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelPopupPos, setModelPopupPos] = useState({ bottom: 0, left: 0 });
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ bottom: 0, left: 0 });
  const [qualityPopupPos, setQualityPopupPos] = useState({ bottom: 0, left: 0 });

  const t = useTranslations('image');
  const selectedModel = models.find(m => m.id === selectedModelId);
  const availableQualities = new Set(selectedModel?.pricing.map(p => p.quality) ?? qualityOptions.map(q => q.value));
  // All active providers now support image input
  const supportsImageInput = ['google', 'alibaba', 'bytedance', 'openai', 'kling'].includes(selectedModel?.provider ?? '');

  useEffect(() => {
    if (!availableQualities.has(quality)) {
      const fallback = qualityOptions.find(q => availableQualities.has(q.value));
      if (fallback) onQualityChange(fallback.value);
    }
  }, [selectedModelId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ratioButtonRef.current?.contains(e.target as Node)) return;
      if (qualityButtonRef.current?.contains(e.target as Node)) return;
      setShowRatioDropdown(false);
      setShowQualityModal(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewUrl(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenModel = () => {
    if (modelButtonRef.current) {
      const rect = modelButtonRef.current.getBoundingClientRect();
      setModelPopupPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left });
    }
    setIsModelDropdownOpen(prev => !prev);
  };

  const handleOpenRatio = () => {
    if (ratioButtonRef.current) {
      const rect = ratioButtonRef.current.getBoundingClientRect();
      setPopupPosition({ bottom: window.innerHeight - rect.top + 8, left: rect.left + rect.width / 2 });
    }
    setShowQualityModal(false);
    setShowRatioDropdown(prev => !prev);
  };

  const handleOpenQuality = () => {
    if (qualityButtonRef.current) {
      const rect = qualityButtonRef.current.getBoundingClientRect();
      const popupWidth = 140;
      const centered = rect.left + rect.width / 2 - popupWidth / 2;
      const left = Math.max(8, Math.min(centered, window.innerWidth - popupWidth - 8));
      setQualityPopupPos({ bottom: window.innerHeight - rect.top + 8, left });
    }
    setShowRatioDropdown(false);
    setShowQualityModal(prev => !prev);
  };

  const handleClear = () => {
    onPromptChange('');
    textareaRef.current?.focus();
  };

  const noCredits = isLoaded && isSignedIn && creditCount !== null && creditCount <= 0;

  return (
    <div className="fixed bottom-[80px] md:bottom-0 left-0 md:left-[48px] right-0 z-50 px-3 md:px-8 pb-3 md:pb-6 pointer-events-none">
      <style>{`
        .model-dropdown-scroll::-webkit-scrollbar { width: 3px; }
        .model-dropdown-scroll::-webkit-scrollbar-track { background: transparent; }
        .model-dropdown-scroll::-webkit-scrollbar-thumb { background: rgba(120,80,255,0.35); border-radius: 4px; }
        .model-dropdown-scroll::-webkit-scrollbar-thumb:hover { background: rgba(120,80,255,0.6); }
      `}</style>
      {/* Purple radial glow behind the bar */}
      <div aria-hidden className="w-full max-w-4xl mx-auto pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ bottom: '0', height: '220px', zIndex: -1 }}>
        <div style={{
          position: 'absolute', bottom: 0, left: '10%', right: '10%', height: '180px',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(83,47,207,0.22) 0%, rgba(83,47,207,0.06) 45%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      </div>

      <div className={`w-full max-w-4xl mx-auto pointer-events-auto prompt-bar-orbit${isFocused ? ' prompt-bar-focused' : ''}${isLoading ? ' prompt-bar-loading' : ''}`}>
      <div
        className="relative overflow-hidden"
        style={{
          background: 'rgba(10,10,14,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '14px',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.04) inset',
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onImageUpload} />

        {/* Top-right corner: attachment + clear */}
        <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
          {supportsImageInput && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center transition-colors"
              style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.35)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              title="Attach image"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
          )}
          {prompt.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center justify-center transition-colors"
              style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.35)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,100,100,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              title="Clear prompt"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Uploaded images preview — only for models that support image input */}
        {supportsImageInput && uploadedImages.length > 0 && (
          <div className="flex items-center gap-2.5 px-4 pt-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {uploadedImages.map((img, idx) => (
              <div key={idx} className="relative flex-shrink-0 group/thumb" style={{ width: '72px', height: '72px' }}>
                <img
                  src={img.url}
                  alt="Uploaded preview"
                  className="w-full h-full object-cover"
                  style={{
                    borderRadius: '10px',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    opacity: img.uploading ? 0.4 : 1,
                    transition: 'opacity 0.2s',
                    cursor: img.uploading ? 'default' : 'zoom-in',
                  }}
                  onClick={() => { if (!img.uploading) setPreviewUrl(img.url); }}
                />
                {img.uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={() => onRemoveImage(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover/thumb:opacity-100"
                    style={{ background: 'rgba(14,14,20,0.95)', border: '0.5px solid rgba(255,255,255,0.18)', fontSize: '13px', lineHeight: 1 }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className="pl-4 pr-20 pt-4 pb-2">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isLoading) onGenerate(); } }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
            placeholder={t('promptPlaceholder')}
            rows={1}
            className="w-full bg-transparent border-none outline-none text-white font-dm resize-none"
            style={{
              fontSize: '16px',
              lineHeight: '1.6',
              minHeight: '40px',
              maxHeight: '120px',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              color: 'rgba(255,255,255,0.9)',
            }}
          />
        </div>

        {/* Bottom toolbar — single row */}
        <div className="flex items-center justify-between px-3 pb-3 gap-2">

          {/* Left controls */}
          <div className="flex items-center gap-1 flex-nowrap overflow-hidden min-w-0">

            {/* Model dropdown */}
            <div ref={dropdownRef}>
              <button
                ref={modelButtonRef}
                onClick={(e) => { e.stopPropagation(); handleOpenModel(); }}
                className="flex items-center gap-1.5 font-dm transition-colors min-w-0 max-w-[120px] md:max-w-[160px]"
                style={{
                  height: '30px', padding: '0 8px', borderRadius: '8px',
                  background: isModelDropdownOpen ? 'rgba(83,47,207,0.15)' : 'rgba(255,255,255,0.05)',
                  border: isModelDropdownOpen ? '0.5px solid rgba(83,47,207,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
                  color: isModelDropdownOpen ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.45)',
                  fontSize: '11px',
                }}
                onMouseEnter={e => { if (!isModelDropdownOpen) { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; } }}
                onMouseLeave={e => { if (!isModelDropdownOpen) { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; } }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                  {models.find(m => m.id === selectedModelId)?.name ?? 'Loading...'}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {isModelDropdownOpen && (
                <Portal>
                  <div className="fixed inset-0 z-[40]" onMouseDown={() => setIsModelDropdownOpen(false)} />
                  <div
                    className="fixed z-[60] w-[260px] model-dropdown-scroll"
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      bottom: `${modelPopupPos.bottom}px`, left: `${modelPopupPos.left}px`,
                      background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)',
                      borderRadius: '14px', boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                      maxHeight: '400px', overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(120,80,255,0.35) transparent',
                    }}
                  >
                    {(() => {
                      const providerNames: Record<string, string> = { google: 'Google', openai: 'OpenAI', alibaba: 'Alibaba', kling: 'Kling', bytedance: 'ByteDance' };
                      const providerIcons: Record<string, React.ReactNode> = {
                        google: (
                          <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        ),
                        openai: (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(200,200,200,0.85)">
                            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.886zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .027-.057l4.83-2.791a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                          </svg>
                        ),
                        alibaba: (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2a10 10 0 1 0 6.32 17.74l1.47 1.47 1.41-1.41-1.47-1.47A10 10 0 0 0 12 2zm0 2a8 8 0 1 1-4.9 14.32l1.72-1.72A5.5 5.5 0 1 0 7.4 14.9L5.68 16.6A8 8 0 0 1 12 4zm0 3a5.5 5.5 0 1 0 3.18 9.94l-1.44-1.44A3.5 3.5 0 1 1 15.5 12c0 .7-.21 1.36-.56 1.9l1.44 1.44A5.48 5.48 0 0 0 17.5 12 5.5 5.5 0 0 0 12 7z" fill="#FF6A00"/>
                          </svg>
                        ),
                        kling: (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3l5 6-5 6V6z" fill="rgba(100,180,255,0.85)"/>
                          </svg>
                        ),
                        bytedance: (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <polygon points="2,3 5,3 4,20 1,20" fill="#3951CC"/>
                            <polygon points="8,10 11,10 10,20 7,20" fill="#5B86F0"/>
                            <polygon points="13,12 16,12 15,20 12,20" fill="#00C8C0"/>
                            <polygon points="19,4 22,4 21,20 18,20" fill="#5EE8D8"/>
                          </svg>
                        ),
                      };
                      const groups = models.reduce((acc, m) => {
                        const p = m.provider || 'other';
                        if (!acc[p]) acc[p] = [];
                        acc[p].push(m);
                        return acc;
                      }, {} as Record<string, typeof models>);

                      return Object.entries(groups).map(([provider, providerModels], gi) => (
                        <div key={provider}>
                          <div className="flex items-center gap-1.5 px-3 font-dm" style={{ padding: '10px 12px 6px', color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', borderTop: gi > 0 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px' }}>✦</span>
                            {providerNames[provider] || provider}
                          </div>
                          {providerModels.map(m => {
                            const isSelected = selectedModelId === m.id;
                            const credits = m.pricing.find(p => p.quality === quality)?.credits;
                            return (
                              <button
                                key={m.id}
                                onClick={() => { onModelChange(m.id); setIsModelDropdownOpen(false); }}
                                className="w-full text-left font-dm transition-colors flex items-center gap-2.5"
                                style={{ padding: '8px 12px', background: isSelected ? 'rgba(83,47,207,0.12)' : 'none' }}
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'none'; }}
                              >
                                <div style={{ width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {providerIcons[provider] || <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 700 }}>{provider[0].toUpperCase()}</span>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '12px', fontWeight: 500, color: isSelected ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', marginTop: '1px' }}>{credits != null ? t('creditsCount', { credits }) : '?'}</div>
                                </div>
                                {isSelected && (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(160,120,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                </Portal>
              )}
            </div>

            {/* Aspect ratio */}
            <button
              ref={ratioButtonRef}
              onClick={(e) => { e.stopPropagation(); handleOpenRatio(); }}
              className="flex items-center gap-1.5 font-dm transition-colors"
              style={{
                height: '30px', padding: '0 10px', borderRadius: '8px',
                background: showRatioDropdown ? 'rgba(83,47,207,0.15)' : 'rgba(255,255,255,0.05)',
                border: showRatioDropdown ? '0.5px solid rgba(83,47,207,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
                color: showRatioDropdown ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.45)',
                fontSize: '11px',
              }}
              onMouseEnter={e => { if (!showRatioDropdown) { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; } }}
              onMouseLeave={e => { if (!showRatioDropdown) { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; } }}
            >
              {aspectRatio}
            </button>

            {/* Quality */}
            <button
              ref={qualityButtonRef}
              onClick={handleOpenQuality}
              className="flex items-center gap-1.5 font-dm transition-colors"
              style={{
                height: '30px', padding: '0 10px', borderRadius: '8px',
                background: showQualityModal ? 'rgba(83,47,207,0.15)' : 'rgba(255,255,255,0.05)',
                border: showQualityModal ? '0.5px solid rgba(83,47,207,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
                color: showQualityModal ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.45)',
                fontSize: '11px',
              }}
              onMouseEnter={e => { if (!showQualityModal) { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; } }}
              onMouseLeave={e => { if (!showQualityModal) { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; } }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {quality}
            </button>
          </div>

          {/* Generate button */}
          <button
            onClick={onGenerate}
            disabled={isLoading || (isLoaded && !!isSignedIn && (!prompt.trim() || noCredits))}
            className={`flex-shrink-0 flex items-center gap-1.5 font-dm font-[500] ${noCredits ? 'generate-btn-empty' : 'generate-btn'}`}
            style={{
              height: '32px', padding: '0 14px', borderRadius: '50px', fontSize: '12px', letterSpacing: '0.01em',
              background: noCredits ? 'rgba(255,255,255,0.05)' : undefined,
              border: noCredits ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
              color: noCredits ? 'rgba(255,255,255,0.25)' : '#fff',
              cursor: (isLoading || (isLoaded && !!isSignedIn && noCredits)) ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>
            {noCredits ? t('noCredits') : `${t('generate')} · ${creditCost}`}
          </button>

          {/* Ratio popup portal — rendered once, shared by mobile + desktop buttons */}
          {showRatioDropdown && (
            <Portal>
              <div className="fixed inset-0 z-[40]" onMouseDown={() => setShowRatioDropdown(false)} />
              <div
                className="fixed z-[50] p-3 w-[155px]"
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  bottom: `${popupPosition.bottom}px`, left: `${popupPosition.left}px`, transform: 'translateX(-50%)',
                  background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                }}
              >
                <p className="font-dm text-[10px] mb-2.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>{t('aspectRatio')}</p>
                <div className="flex flex-col gap-0.5">
                  {ratioOptions.map(ratio => (
                    <button
                      key={ratio.value}
                      onClick={() => { onAspectRatioChange(ratio.value); setShowRatioDropdown(false); }}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left w-full transition-colors font-dm"
                      style={{
                        fontSize: '12px',
                        background: aspectRatio === ratio.value ? 'rgba(83,47,207,0.12)' : 'none',
                        color: aspectRatio === ratio.value ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.45)',
                      }}
                      onMouseEnter={e => { if (aspectRatio !== ratio.value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { if (aspectRatio !== ratio.value) e.currentTarget.style.background = 'none'; }}
                    >
                      <div style={{ width: ratio.w * 0.7, height: ratio.h * 0.7, border: aspectRatio === ratio.value ? '1.5px solid rgba(160,120,255,0.7)' : '1.5px solid rgba(255,255,255,0.2)', borderRadius: '2px', flexShrink: 0 }} />
                      {ratio.label}
                      {aspectRatio === ratio.value && <span className="ml-auto text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </Portal>
          )}

          {/* Quality popup portal — rendered once, shared by mobile + desktop buttons */}
          {showQualityModal && (
            <Portal>
              <div className="fixed inset-0 z-[40]" onMouseDown={() => setShowQualityModal(false)} />
              <div
                className="fixed z-[50] p-3 w-[140px]"
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  bottom: `${qualityPopupPos.bottom}px`, left: `${qualityPopupPos.left}px`,
                  background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                }}
              >
                <p className="font-dm text-[10px] mb-2.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>{t('quality')}</p>
                <div className="flex flex-col gap-0.5">
                  {qualityOptions.map(q => {
                    const available = availableQualities.has(q.value);
                    return (
                      <button
                        key={q.value}
                        disabled={!available}
                        onClick={() => { onQualityChange(q.value); setShowQualityModal(false); }}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg w-full text-left font-dm"
                        style={{
                          fontSize: '12px',
                          cursor: available ? 'pointer' : 'not-allowed',
                          opacity: available ? 1 : 0.3,
                          background: quality === q.value && available ? 'rgba(83,47,207,0.12)' : 'none',
                          color: quality === q.value && available ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.45)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (available && quality !== q.value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (available && quality !== q.value) e.currentTarget.style.background = 'none'; }}
                      >
                        {q.label}
                        {quality === q.value && available && <span style={{ fontSize: '10px' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Portal>
          )}
        </div>
      </div>{/* end card */}
      </div>{/* end orbit wrapper */}

      {/* Fullscreen image preview */}
      {previewUrl && (
        <Portal>
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            onClick={() => setPreviewUrl(null)}
          >
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', fontSize: '18px' }}
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: '12px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
                objectFit: 'contain',
              }}
            />
          </div>
        </Portal>
      )}
    </div>
  );
}
