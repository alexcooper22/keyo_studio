'use client';
import { useRef, useState, useEffect } from 'react';
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
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  const ratioButtonRef = useRef<HTMLButtonElement>(null);
  const qualityButtonRef = useRef<HTMLButtonElement>(null);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelPopupPos, setModelPopupPos] = useState({ bottom: 0, left: 0 });
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ bottom: 0, left: 0 });
  const [qualityPopupPos, setQualityPopupPos] = useState({ bottom: 0, left: 0 });

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
      setQualityPopupPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left + rect.width / 2 });
    }
    setShowRatioDropdown(false);
    setShowQualityModal(prev => !prev);
  };

  const noCredits = isLoaded && isSignedIn && creditCount !== null && creditCount <= 0;

  return (
    <div className="fixed bottom-[65px] md:bottom-0 left-0 md:left-[48px] right-0 z-50 px-2 md:px-8 pb-2 md:pb-8 pointer-events-none">
      <div
        className="w-full max-w-4xl mx-auto rounded-t-2xl rounded-b-xl border-t border-l border-r border-white/[0.08] shadow-2xl overflow-hidden pointer-events-auto"
        style={{ backgroundColor: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onImageUpload} />

        {uploadedImages.length > 0 && (
          <div className="flex items-center gap-2 px-3 md:px-4 pt-3 overflow-x-auto">
            {uploadedImages.map((img, idx) => (
              <div key={idx} className="relative flex-shrink-0" style={{ width: '60px', height: '60px' }}>
                <img
                  src={img.url}
                  alt="Uploaded preview"
                  className={`w-full h-full object-cover ${img.uploading ? 'opacity-50' : ''}`}
                  style={{ borderRadius: 'var(--radius-btn)', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                {img.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!img.uploading && (
                  <button
                    onClick={() => onRemoveImage(idx)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-white/20 hover:bg-white/40 rounded-full text-white flex items-center justify-center text-xs shadow-md border border-bg-card"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="p-3 md:p-4 border-b border-white/[0.06]">
          {/* Upload + textarea — always on the same row */}
          <div className="flex items-start gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-bg border border-white/[0.04] text-text-secondary hover:text-white hover:border-white/20 transition-colors mt-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <div className="flex flex-col sm:flex-row flex-1 min-w-0 gap-2 sm:gap-3 sm:items-center">
              <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onGenerate(); } }}
                onInput={(e) => {
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                }}
                placeholder="Describe the image you imagine..."
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-white font-dm text-sm placeholder:text-text-secondary resize-none py-2"
              />
              <button
                onClick={onGenerate}
                disabled={isLoaded && !!isSignedIn && (isLoading || !prompt.trim() || noCredits)}
                className={`w-full sm:w-auto flex-shrink-0 px-5 py-3 text-white font-dm font-[700] rounded-xl flex items-center justify-center gap-2 transition-all ${(isLoading || (isLoaded && !isSignedIn)) ? 'opacity-70' : ''}`}
                style={{
                  background: noCredits ? '#2a2a2a' : 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)',
                  border: 'none',
                  color: noCredits ? 'var(--text-secondary)' : '#fff',
                  cursor: noCredits ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating...</>
                ) : noCredits ? (
                  <><svg width="15" height="15" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>No credits</>
                ) : (
                  <><svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>Generate · {creditCost}</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-5 py-2 md:py-3 flex flex-wrap items-center gap-2 md:gap-3">
          <div ref={dropdownRef}>
            <button
              ref={modelButtonRef}
              onClick={(e) => { e.stopPropagation(); handleOpenModel(); }}
              className={`px-3 py-1 rounded-full bg-white/[0.06] border font-dm text-[11px] md:text-xs transition-all flex items-center gap-1.5 ${isModelDropdownOpen ? 'border-accent text-white bg-white/10' : 'border-white/10 text-text-secondary hover:text-white hover:bg-white/10'}`}
            >
              {models.find(m => m.id === selectedModelId)?.name ?? 'Loading...'} ▾
            </button>
            {isModelDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[40]" onMouseDown={() => setIsModelDropdownOpen(false)} />
                <div
                  className="fixed z-[60] w-[220px] bg-bg-navbar border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl"
                  style={{ bottom: modelPopupPos.bottom, left: modelPopupPos.left }}
                >
                  {models.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { onModelChange(m.id); setIsModelDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedModelId === m.id ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                    >
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {m.pricing.find(p => p.quality === quality)?.credits ?? '?'} credits
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <button
              ref={ratioButtonRef}
              onClick={(e) => { e.stopPropagation(); handleOpenRatio(); }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-text-secondary border border-white/10 hover:text-white transition-colors"
              style={{ minWidth: '60px' }}
            >
              {aspectRatio}
            </button>
            {showRatioDropdown && (
              <Portal>
                <div className="fixed inset-0 z-[40]" onMouseDown={() => setShowRatioDropdown(false)} />
                <div
                  className="fixed z-[50] bg-[#141414] border border-white/10 rounded-2xl p-4 w-[160px]"
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ bottom: `${popupPosition.bottom}px`, left: `${popupPosition.left}px`, transform: 'translateX(-50%)' }}
                >
                  <p className="text-[11px] text-text-secondary mb-3 uppercase tracking-wider">Aspect ratio</p>
                  <div className="flex flex-col gap-1">
                    {ratioOptions.map(ratio => (
                      <button
                        key={ratio.value}
                        onClick={() => { onAspectRatioChange(ratio.value); setShowRatioDropdown(false); }}
                        className={`flex items-center gap-3 px-3 py-1 rounded-lg text-xs transition-colors text-left w-full ${aspectRatio === ratio.value ? 'text-white bg-white/[0.08]' : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'}`}
                      >
                        <div style={{ width: ratio.w, height: ratio.h, border: aspectRatio === ratio.value ? '1.5px solid white' : '1.5px solid #444', borderRadius: '2px', flexShrink: 0 }} />
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-text-secondary border border-white/10 hover:text-white transition-colors"
            >
              ◇ {quality}
            </button>
            {showQualityModal && (
              <Portal>
                <div className="fixed inset-0 z-[40]" onMouseDown={() => setShowQualityModal(false)} />
                <div
                  className="fixed z-[50] bg-[#141414] border border-white/10 rounded-2xl p-4 w-[160px]"
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ bottom: `${qualityPopupPos.bottom}px`, left: `${qualityPopupPos.left}px`, transform: 'translateX(-50%)' }}
                >
                  <p className="text-[11px] text-text-secondary mb-3 uppercase tracking-wider">Select quality</p>
                  <div className="flex flex-col gap-1">
                    {qualityOptions.map(q => (
                      <button
                        key={q.value}
                        onClick={() => { onQualityChange(q.value); setShowQualityModal(false); }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13px] w-full text-left transition-colors ${quality === q.value ? 'text-white bg-white/[0.08]' : 'text-text-secondary hover:text-white'}`}
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
  );
}
