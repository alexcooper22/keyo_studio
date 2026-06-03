'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
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
  models: Array<{ id: string; name: string; pricing: Array<{ quality: string; credits: number }> }>;
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
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelPopupPos, setModelPopupPos] = useState({ bottom: 0, left: 0 });
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ bottom: 0, left: 0 });
  const [qualityPopupPos, setQualityPopupPos] = useState({ bottom: 0, left: 0 });

  const selectedModel = models.find(m => m.id === selectedModelId);
  const availableQualities = new Set(selectedModel?.pricing.map(p => p.quality) ?? qualityOptions.map(q => q.value));

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

        {/* Uploaded images preview */}
        {uploadedImages.length > 0 && (
          <div className="flex items-center gap-2 px-4 pt-3 overflow-x-auto">
            {uploadedImages.map((img, idx) => (
              <div key={idx} className="relative flex-shrink-0" style={{ width: '52px', height: '52px' }}>
                <img
                  src={img.url}
                  alt="Uploaded preview"
                  className={`w-full h-full object-cover ${img.uploading ? 'opacity-40' : ''}`}
                  style={{ borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.1)' }}
                />
                {img.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!img.uploading && (
                  <button
                    onClick={() => onRemoveImage(idx)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    style={{ background: 'rgba(20,20,28,0.95)', border: '0.5px solid rgba(255,255,255,0.15)', fontSize: '10px' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className="px-4 pt-4 pb-2">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onGenerate(); } }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
            placeholder="Describe the image you imagine..."
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

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 gap-3">

          {/* Toolbar */}
          <div className="flex items-center gap-1 flex-nowrap overflow-hidden">

            {/* Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center transition-colors"
              style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.4)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              title="Attach image"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Clear — only when there's text */}
            {prompt.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center justify-center transition-colors"
                style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,100,100,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                title="Clear prompt"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            <div className="hidden md:block" style={{ width: '0.5px', height: '18px', background: 'rgba(255,255,255,0.07)', margin: '0 2px' }} />

            {/* Model dropdown */}
            <div ref={dropdownRef}>
              <button
                ref={modelButtonRef}
                onClick={(e) => { e.stopPropagation(); handleOpenModel(); }}
                className="flex items-center gap-1.5 font-dm transition-colors min-w-0"
                style={{
                  height: '30px', padding: '0 8px', borderRadius: '8px',
                  maxWidth: '160px',
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
                    className="fixed z-[60] w-[220px] overflow-hidden"
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      bottom: `${modelPopupPos.bottom}px`, left: `${modelPopupPos.left}px`,
                      background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                    }}
                  >
                    {models.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { onModelChange(m.id); setIsModelDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2.5 transition-colors"
                        style={{
                          background: selectedModelId === m.id ? 'rgba(83,47,207,0.12)' : 'none',
                          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                        }}
                        onMouseEnter={e => { if (selectedModelId !== m.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (selectedModelId !== m.id) e.currentTarget.style.background = 'none'; }}
                      >
                        <div className="font-dm font-medium text-[12px]" style={{ color: selectedModelId === m.id ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.75)' }}>{m.name}</div>
                        <div className="font-dm text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {m.pricing.find(p => p.quality === quality)?.credits ?? '?'} credits
                        </div>
                      </button>
                    ))}
                  </div>
                </Portal>
              )}
            </div>

            {/* Aspect ratio */}
            <div>
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
                    <p className="font-dm text-[10px] mb-2.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>Aspect ratio</p>
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
            </div>

            {/* Quality */}
            <div>
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
                    <p className="font-dm text-[10px] mb-2.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>Quality</p>
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
          </div>

          {/* Generate button — bottom right */}
          <button
            onClick={onGenerate}
            disabled={isLoaded && !!isSignedIn && (!prompt.trim() || noCredits)}
            className={`flex-shrink-0 flex items-center gap-1.5 font-dm font-[500] ${noCredits ? 'generate-btn-empty' : 'generate-btn'}`}
            style={{
              height: '32px', padding: '0 14px', borderRadius: '50px', fontSize: '12px', letterSpacing: '0.01em',
              background: noCredits ? 'rgba(255,255,255,0.05)' : undefined,
              border: noCredits ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
              color: noCredits ? 'rgba(255,255,255,0.25)' : '#fff',
              cursor: (isLoaded && !!isSignedIn && noCredits) ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>
            {noCredits ? 'No credits' : `Generate · ${creditCost}`}
          </button>
        </div>
      </div>{/* end card */}
      </div>{/* end orbit wrapper */}
    </div>
  );
}
