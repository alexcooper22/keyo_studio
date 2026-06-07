'use client';
import React, { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { fetchModelsWithCache } from '@/lib/modelCache';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';

interface VideoItem {
  id: string;
  videoUrl: string;
  prompt: string;
  createdAt: Date;
  quality?: string;
  duration?: number;
  aspectRatio?: string;
  model?: string;
}

export default function VideoDashboard() {
  const t = useTranslations('video');
  const { isLoaded, isSignedIn } = useUser();
  const { setShowModal } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [quality, setQuality] = useState<'720p' | '1080p'>('720p');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [duration, setDuration] = useState<number>(5);
  const [showDurationMenu, setShowDurationMenu] = useState(false);
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [startFrame, setStartFrame] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);
  const startFrameRef = useRef<HTMLInputElement>(null);
  const endFrameRef = useRef<HTMLInputElement>(null);

  // Restore settings from localStorage on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('video_prompt_draft');
    if (savedPrompt) setPrompt(savedPrompt);

    const savedQuality = localStorage.getItem('video_quality_draft');
    if (savedQuality === '720p' || savedQuality === '1080p') setQuality(savedQuality);

    const savedAspect = localStorage.getItem('video_aspect_draft');
    if (savedAspect === '9:16' || savedAspect === '16:9' || savedAspect === '1:1') setAspectRatio(savedAspect);

    const savedDuration = localStorage.getItem('video_duration_draft');
    if (savedDuration) setDuration(Number(savedDuration));

    const savedAudio = localStorage.getItem('video_audio_draft');
    if (savedAudio === 'true') setAudioEnabled(true);

    const savedStart = localStorage.getItem('video_start_frame');
    if (savedStart && !savedStart.startsWith('blob:')) setStartFrame(savedStart);

    const savedEnd = localStorage.getItem('video_end_frame');
    if (savedEnd && !savedEnd.startsWith('blob:')) setEndFrame(savedEnd);

    fetchVideoModels();
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    localStorage.setItem('video_prompt_draft', prompt);
  }, [prompt]);

  useEffect(() => {
    localStorage.setItem('video_quality_draft', quality);
  }, [quality]);

  useEffect(() => {
    localStorage.setItem('video_aspect_draft', aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    localStorage.setItem('video_duration_draft', String(duration));
  }, [duration]);

  useEffect(() => {
    localStorage.setItem('video_audio_draft', String(audioEnabled));
  }, [audioEnabled]);

  useEffect(() => {
    if (startFrame && !startFrame.startsWith('blob:')) localStorage.setItem('video_start_frame', startFrame);
    else if (!startFrame) localStorage.removeItem('video_start_frame');
  }, [startFrame]);

  useEffect(() => {
    if (endFrame && !endFrame.startsWith('blob:')) localStorage.setItem('video_end_frame', endFrame);
    else if (!endFrame) localStorage.removeItem('video_end_frame');
  }, [endFrame]);
  const [videoModels, setVideoModels] = useState<Array<{ id: string; name: string; provider?: string; pricing: Array<{ quality: string; credits: number }> }>>([]);
  const [selectedVideoModelId, setSelectedVideoModelId] = useState('');
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [creditCount, setCreditCount] = useState<number | null>(null);

  const toggleLike = (id: string) => {
    setLikedVideos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadVideo = async (url: string, id: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `video-${id}.mp4`;
    a.click();
  };

  const deleteVideo = async (taskId: string) => {
    setVideos(prev => prev.filter(v => v.id !== taskId));
    await fetch('/api/delete-video', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
  };

  const handleFrameUpload = async (file: File, type: 'start' | 'end') => {
    const preview = URL.createObjectURL(file);
    if (type === 'start') setStartFrame(preview);
    else setEndFrame(preview);

    try {
      const res = await fetch('/api/upload-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      const { signedUrl, publicUrl } = await res.json();

      await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (type === 'start') setStartFrame(publicUrl);
      else setEndFrame(publicUrl);
    } catch (err) {
      console.error('Upload failed', err);
    }
  };
  const fetchVideoModels = async () => {
    try {
      const models = await fetchModelsWithCache('video');
      if (models.length) {
        setVideoModels(models);
        setSelectedVideoModelId(models[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch video models', err);
    }
  };

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu]')) {
        setShowQualityMenu(false);
        setShowAspectMenu(false);
        setShowDurationMenu(false);
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch('/api/user-credits');
        const data = await res.json();
        if (data.credits !== undefined) setCreditCount(data.credits);
      } catch (err) {
        console.error("Failed to fetch credits", err);
      }
    };
    fetchCredits();
  }, []);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await fetch('/api/get-videos');
        const data = await res.json();
        if (data.videos) {
          setVideos(data.videos.map((v: any) => ({
            id: v.task_id,
            videoUrl: v.video_url,
            prompt: v.prompt,
            createdAt: new Date(v.created_at),
            quality: v.quality,
            duration: v.duration,
            aspectRatio: v.aspect_ratio,
            model: v.model,
          })));
        }
      } catch (err) {
        console.error('Failed to load videos', err);
      }
    };
    loadVideos();

    // Restore pending video generation from localStorage
    const pendingVideo = localStorage.getItem('video_generation_pending');
    if (pendingVideo) {
      try {
        const pending = JSON.parse(pendingVideo);
        // Only restore if started less than 10 minutes ago
        if (Date.now() - pending.startTime < 10 * 60 * 1000) {
          setIsGenerating(true);
          setStatus('Processing...');
          // Resume polling
          pollRef.current = setInterval(async () => {
            try {
              const check = await fetch(`/api/check-video?taskId=${pending.taskId}`);
              const result = await check.json();
              if (result.status === 'succeed' && result.videoUrl) {
                clearInterval(pollRef.current!);
                const newVideo: VideoItem = {
                  id: pending.taskId,
                  videoUrl: result.videoUrl,
                  prompt: pending.prompt,
                  createdAt: new Date(),
                  quality: pending.quality,
                  duration: pending.duration,
                  aspectRatio: pending.aspectRatio,
                  model: pending.modelName,
                };
                setVideos(prev => [newVideo, ...prev]);
                setIsGenerating(false);
                setStatus('');
                localStorage.removeItem('video_generation_pending');
                localStorage.removeItem('video_start_frame');
                localStorage.removeItem('video_end_frame');
                setStartFrame(null);
                setEndFrame(null);
                window.dispatchEvent(new Event('credits-updated'));
              } else if (result.status === 'failed') {
                clearInterval(pollRef.current!);
                setIsGenerating(false);
                setStatus('');
                localStorage.removeItem('video_generation_pending');
              }
            } catch (err) {
              console.error('Polling error:', err);
            }
          }, 5000);
        } else {
          localStorage.removeItem('video_generation_pending');
        }
      } catch (err) {
        localStorage.removeItem('video_generation_pending');
      }
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    if (!selectedVideoModelId) return;
    setIsGenerating(true);
    setError(null);
    setStatus('Submitting...');
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration, aspectRatio, mode: 'std', quality, audio: audioEnabled, startFrame, endFrame, modelId: selectedVideoModelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const taskId = data.taskId;
      setStatus('Processing...');
      
      // Save to localStorage for cross-page persistence
      localStorage.setItem('video_generation_pending', JSON.stringify({
        taskId,
        prompt,
        startTime: Date.now(),
        quality,
        duration,
        aspectRatio,
        modelName: videoModels.find(m => m.id === selectedVideoModelId)?.name,
      }));

      pollRef.current = setInterval(async () => {
        const check = await fetch(`/api/check-video?taskId=${taskId}`);
        const result = await check.json();
        if (result.status === 'succeed' && result.videoUrl) {
          clearInterval(pollRef.current!);
          const newVideo: VideoItem = {
            id: taskId,
            videoUrl: result.videoUrl,
            prompt: prompt,
            createdAt: new Date(),
            quality,
            duration,
            aspectRatio,
            model: videoModels.find(m => m.id === selectedVideoModelId)?.name,
          };
          setVideos(prev => [newVideo, ...prev]);
          setIsGenerating(false);
          setStatus('');
          localStorage.removeItem('video_generation_pending');
          localStorage.removeItem('video_start_frame');
          localStorage.removeItem('video_end_frame');
          setStartFrame(null);
          setEndFrame(null);
          window.dispatchEvent(new Event('credits-updated'));
          // Scroll to top of feed
          if (feedRef.current) feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (result.status === 'failed') {
          clearInterval(pollRef.current!);
          setError('Generation failed');
          setIsGenerating(false);
          setStatus('');
          localStorage.removeItem('video_generation_pending');
        }
      }, 5000);
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
      setStatus('');
    }
  };

  const selectedVideoModel = videoModels.find(m => m.id === selectedVideoModelId);
  const perSecond = selectedVideoModel?.pricing.find(p => p.quality === quality)?.credits ?? (quality === '1080p' ? 4 : 3);
  const videoCreditCost = (perSecond + (audioEnabled ? 1 : 0)) * duration;

  const videoHero = (
    <>
      <div className="inline-flex items-center gap-2" style={{ background: 'rgba(83,47,207,0.1)', border: '0.5px solid rgba(83,47,207,0.3)', borderRadius: '20px', padding: '4px 12px', marginBottom: '20px', position: 'relative' }}>
        <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '9px' }}>✦</span>
        <span className="font-dm" style={{ color: 'rgba(120,80,255,0.7)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{t('aiBadge')}</span>
      </div>
      <h1 style={{ fontWeight: 700, lineHeight: 1.05, marginBottom: '16px', position: 'relative' }}>
        <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(22px, 3.2vw, 34px)', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.85)' }}>
          {t('heroLine1')}
        </span>
        <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(64px, 12vw, 110px)', letterSpacing: '-0.04em', lineHeight: 0.93, background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {t('heroWord')}
        </span>
        <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(22px, 3.2vw, 34px)', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.85)', marginTop: '6px' }}>
          {t('heroLine3')}{' '}
          <span style={{ background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 50%, #7c5cf0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>keyo.studio</span>
        </span>
      </h1>
      <p className="font-dm" style={{ fontSize: '13px', color: 'rgba(180,160,230,0.45)', marginBottom: '36px', position: 'relative' }}>
        {t('heroSubtitle')}
      </p>
      <button
        onClick={() => setShowModal(true)}
        style={{ background: 'linear-gradient(135deg, #7c5cf0 0%, #9b7eff 100%)', border: 'none', borderRadius: '12px', padding: '14px 40px', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-dm)', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 24px rgba(83,47,207,0.45), inset 0 1px 0 rgba(255,255,255,0.15)', display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>
        {t('tryForFree')}
      </button>
    </>
  );


  return (
    <div className={`video-root${isLoaded && !isSignedIn ? ' mobile-locked' : ''}`} style={{ paddingTop: '94px', background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <style>{`
        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
        textarea::-webkit-scrollbar-thumb:hover { background: var(--accent); }
        .feed::-webkit-scrollbar { width: 0px; }
        .feed::-webkit-scrollbar-track { background: transparent; }
        .feed::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        @media (min-width: 768px) {
          .video-root { height: 100vh; overflow: hidden; }
          .video-layout { height: calc(100vh - 94px); padding-bottom: 24px; }
          .video-panel { width: 260px; flex-shrink: 0; }
        }
        .video-panel { display: none; }
        @media (min-width: 768px) {
          .video-panel { display: flex; flex-direction: column; }
        }
        .video-sidebar { display: none; }
        @media (min-width: 768px) {
          .video-sidebar { display: flex; width: 200px; flex-shrink: 0; border-left: var(--border); flex-direction: column; }
        }
        @media (max-width: 767px) {
          .mobile-locked { overflow: hidden; height: 100vh; }
        }
      `}</style>

      <div className="video-layout flex flex-col md:flex-row" style={{ padding: '0 16px 80px', gap: '12px', alignItems: 'stretch' }}>

        {/* MOBILE HERO — unauthenticated only */}
        {isLoaded && !isSignedIn && (
          <div className="flex md:hidden flex-col items-center justify-start text-center relative px-6" style={{ minHeight: 'calc(100vh - 94px)', overflow: 'hidden', paddingTop: '15vh' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(60,80,160,0.28) 0%, rgba(40,55,120,0.1) 45%, transparent 70%)', pointerEvents: 'none' }} />

            {[['top-0 left-0', 'border-t border-l', '-translate-x-px -translate-y-px'],
              ['top-0 right-0', 'border-t border-r', 'translate-x-px -translate-y-px'],
              ['bottom-0 left-0', 'border-b border-l', '-translate-x-px translate-y-px'],
              ['bottom-0 right-0', 'border-b border-r', 'translate-x-px translate-y-px'],
            ].map(([pos, border, translate], i) => (
              <div key={i} className={`absolute ${pos} ${translate}`} style={{ width: '36px', height: '36px' }}>
                <div className={`w-full h-full ${border}`} style={{ borderColor: 'rgba(83,47,207,0.7)' }} />
              </div>
            ))}
            <p className="font-dm mb-5 tracking-[0.2em] uppercase" style={{ fontSize: '11px', color: 'rgba(140,160,220,0.55)', letterSpacing: '0.18em', position: 'relative' }}>
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
              position: 'relative',
            }}>
              {t('heroTitle')}
            </h1>
          </div>
        )}

        {/* LEFT PANEL */}
        <div className="video-panel" style={{ background: '#0a0a0e', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
          {/* Top shimmer */}
          <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(120,80,255,0.5) 40%, rgba(83,47,207,0.75) 50%, rgba(120,80,255,0.5) 60%, transparent 95%)', pointerEvents: 'none', zIndex: 1 }} />

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>

            {/* Model card */}
            <div style={{ background: '#0c0c14', border: '0.5px solid rgba(83,47,207,0.25)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ height: '70px', background: 'radial-gradient(ellipse 100% 120% at 50% 0%, rgba(83,47,207,0.35) 0%, rgba(20,10,40,0.9) 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.5), transparent)' }} />
                <button style={{ position: 'absolute', top: '7px', right: '7px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '3px 9px', fontSize: '10px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'var(--font-dm)' }}>✎ {t('change')}</button>
              </div>
              <div style={{ padding: '8px 12px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(120,80,255,0.7)', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: 'var(--font-dm)' }}>✦ {t('general')}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginTop: '3px', fontFamily: 'var(--font-dm)', fontWeight: 500 }}>{videoModels.find(m => m.id === selectedVideoModelId)?.name ?? t('loading')}</div>
              </div>
            </div>

            {/* Frames */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {(['start', 'end'] as const).map(type => {
                const frame = type === 'start' ? startFrame : endFrame;
                const ref = type === 'start' ? startFrameRef : endFrameRef;
                return (
                  <div key={type} style={{ position: 'relative', aspectRatio: '1' }}>
                    <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFrameUpload(e.target.files[0], type)} />
                    <div onClick={() => ref.current?.click()} style={{ background: '#0c0c14', border: `0.5px solid ${frame ? 'rgba(83,47,207,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}>
                      {frame ? (
                        <img src={frame} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <span style={{ position: 'absolute', top: '6px', right: '8px', fontSize: '8px', color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--font-dm)' }}>{t('optional')}</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-dm)' }}>{type === 'start' ? t('startFrame') : t('endFrame')}</span>
                        </>
                      )}
                    </div>
                    {frame && (
                      <div onClick={() => type === 'start' ? setStartFrame(null) : setEndFrame(null)} style={{ position: 'absolute', top: '5px', right: '5px', width: '18px', height: '18px', background: 'rgba(10,10,14,0.85)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px', color: 'rgba(255,255,255,0.7)', zIndex: 10 }}>×</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Audio toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', color: audioEnabled ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s', cursor: 'pointer' }} onClick={() => setAudioEnabled(v => !v)}>{t('audio')}</span>
              <div onClick={() => setAudioEnabled(v => !v)} style={{ width: '32px', height: '18px', background: audioEnabled ? 'rgba(83,47,207,0.8)' : 'rgba(255,255,255,0.1)', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', left: audioEnabled ? '16px' : '2px', top: '2px', transition: 'left 0.2s' }} />
              </div>
            </div>

            {/* Prompt textarea */}
            <div
              className={`prompt-bar-orbit${isPromptFocused ? ' prompt-bar-focused' : ''}${isGenerating ? ' prompt-bar-loading' : ''}`}
              style={{ borderRadius: '12px' }}
            >
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onFocus={() => setIsPromptFocused(true)}
                onBlur={() => setIsPromptFocused(false)}
                placeholder={t('promptPlaceholder')}
                style={{ background: 'rgba(10,10,14,0.97)', border: 'none', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.85)', flex: 1, minHeight: '110px', resize: 'none', outline: 'none', width: '100%', fontFamily: 'var(--font-dm)', boxSizing: 'border-box', lineHeight: 1.6, display: 'block' }}
              />
            </div>

            {/* Model select */}
            <div style={{ position: 'relative' }} data-menu="true">
              <div onClick={e => { e.stopPropagation(); setShowModelMenu(v => !v); setShowQualityMenu(false); setShowAspectMenu(false); setShowDurationMenu(false); }} style={{ background: showModelMenu ? 'rgba(83,47,207,0.1)' : 'rgba(255,255,255,0.03)', border: showModelMenu ? '0.5px solid rgba(83,47,207,0.4)' : '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-dm)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{t('model')}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(120,80,255,0.8)', flexShrink: 0 }} />
                    {videoModels.find(m => m.id === selectedVideoModelId)?.name ?? t('loading')}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {showModelMenu && (() => {
                const providerNames: Record<string, string> = { kling: 'Kling', bytedance: 'ByteDance' };
                const providerIcons: Record<string, React.ReactNode> = {
                  kling: (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3l5 6-5 6V6z" fill="rgba(100,180,255,0.85)"/>
                    </svg>
                  ),
                  bytedance: (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <polygon points="2,3 5,3 4,20 1,20" fill="#3951CC"/>
                      <polygon points="8,10 11,10 10,20 7,20" fill="#5B86F0"/>
                      <polygon points="13,12 16,12 15,20 12,20" fill="#00C8C0"/>
                      <polygon points="19,4 22,4 21,20 18,20" fill="#5EE8D8"/>
                    </svg>
                  ),
                };
                const groups = videoModels.reduce((acc, m) => {
                  const p = m.provider || 'other';
                  if (!acc[p]) acc[p] = [];
                  acc[p].push(m);
                  return acc;
                }, {} as Record<string, typeof videoModels>);
                return (
                  <div data-menu="true" style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    {Object.entries(groups).map(([provider, providerModels], gi) => (
                      <div key={provider}>
                        <div style={{ padding: '8px 12px 5px', borderTop: gi > 0 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px' }}>✦</span>
                          {providerIcons[provider]}
                          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', fontFamily: 'var(--font-dm)' }}>
                            {providerNames[provider] || provider}
                          </span>
                        </div>
                        {providerModels.map(m => {
                          const credits = m.pricing.find(p => p.quality === quality)?.credits ?? m.pricing[0]?.credits;
                          const isSelected = selectedVideoModelId === m.id;
                          return (
                            <button key={m.id} onClick={() => { setSelectedVideoModelId(m.id); setShowModelMenu(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '8px 12px', background: isSelected ? 'rgba(83,47,207,0.12)' : 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                              <div>
                                <div style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, color: isSelected ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.75)' }}>{m.name}</div>
                                {credits && <div style={{ fontSize: '10px', fontFamily: 'var(--font-dm)', color: 'rgba(255,255,255,0.28)', marginTop: '1px' }}>{credits} credit/s</div>}
                              </div>
                              {isSelected && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(160,120,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {error && <div style={{ fontSize: '11px', color: '#ef4444', fontFamily: 'var(--font-dm)' }}>{error}</div>}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: `◷ ${duration}s`, show: showDurationMenu, toggle: () => { setShowDurationMenu(v => !v); setShowQualityMenu(false); setShowAspectMenu(false); setShowModelMenu(false); }, items: [10,9,8,7,6,5,4,3].map(d => ({ label: `${d}s`, value: d, active: duration === d, onClick: () => { setDuration(d); setShowDurationMenu(false); } })) },
                { label: `▭ ${aspectRatio}`, show: showAspectMenu, toggle: () => { setShowAspectMenu(v => !v); setShowQualityMenu(false); setShowDurationMenu(false); setShowModelMenu(false); }, items: (['9:16','16:9','1:1'] as const).map(r => ({ label: r, value: r, active: aspectRatio === r, onClick: () => { setAspectRatio(r); setShowAspectMenu(false); } })) },
                { label: `◇ ${quality}`, show: showQualityMenu, toggle: () => { setShowQualityMenu(v => !v); setShowAspectMenu(false); setShowDurationMenu(false); setShowModelMenu(false); }, items: (['720p','1080p'] as const).map(q => ({ label: q, value: q, active: quality === q, onClick: () => { setQuality(q); setShowQualityMenu(false); } })) },
              ].map(({ label, show, toggle, items }) => (
                <div key={label} style={{ flex: 1, position: 'relative' }} data-menu="true">
                  <div onClick={e => { e.stopPropagation(); toggle(); }} style={{ background: show ? 'rgba(83,47,207,0.1)' : 'rgba(255,255,255,0.04)', border: show ? '0.5px solid rgba(83,47,207,0.35)' : '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '7px 4px', textAlign: 'center', fontSize: '11px', color: show ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'var(--font-dm)', transition: 'all 0.15s' }}>{label}</div>
                  {show && (
                    <div data-menu="true" style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                      {items.map(item => (
                        <div key={String(item.value)} onClick={item.onClick} style={{ padding: '8px 12px', fontSize: '12px', color: item.active ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.55)', background: item.active ? 'rgba(83,47,207,0.1)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-dm)' }}>
                          {item.label}
                          {item.active && <span style={{ fontSize: '10px' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || !selectedVideoModelId || (creditCount !== null && creditCount < videoCreditCost)}
              style={{
                background: (creditCount !== null && creditCount <= 0) ? 'rgba(255,255,255,0.04)' : isGenerating ? 'rgba(83,47,207,0.5)' : 'linear-gradient(135deg, #7c5cf0 0%, #9b7eff 100%)',
                border: (creditCount !== null && creditCount <= 0) ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
                borderRadius: '11px', padding: '13px', fontSize: '13px', fontWeight: 700,
                fontFamily: 'var(--font-dm)', letterSpacing: '0.1px',
                color: (creditCount !== null && creditCount <= 0) ? 'rgba(255,255,255,0.25)' : '#fff',
                cursor: (isGenerating || (creditCount !== null && creditCount <= 0)) ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.85 : 1, width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                boxShadow: (creditCount !== null && creditCount <= 0) || isGenerating ? 'none' : '0 4px 20px rgba(83,47,207,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                transition: 'opacity 0.2s',
              }}
            >
              {isGenerating ? (
                <><div style={{ width: '13px', height: '13px', border: '1.5px solid rgba(255,255,255,0.35)', borderTop: '1.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />{status || t('generating')}</>
              ) : (creditCount !== null && creditCount <= 0) ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>{t('noCredits')}</>
              ) : (
                <><span style={{ fontSize: '10px', color: 'rgba(220,200,255,0.9)' }}>✦</span>{t('generate')}<span style={{ color: 'rgba(200,170,255,0.7)', fontSize: '11px', fontWeight: 500 }}>· {videoCreditCost}</span></>
              )}
            </button>
          </div>
        </div>

        {/* CENTER PANEL — scrollable feed */}
        <div ref={feedRef} className="feed" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0, minHeight: 0 }}>
          {/* Generating placeholder */}
          {isGenerating && (
            <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--bg-card)', border: 'var(--border)', borderRadius: 'var(--radius-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '2px solid var(--accent)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{status || t('generating')}</span>
            </div>
          )}
          {/* Empty state */}
          {videos.length === 0 && !isGenerating && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 154px)', position: 'relative' }}>
              {isLoaded && !isSignedIn ? (
                <div className="hidden md:flex flex-col items-center text-center" style={{ padding: '0 24px' }}>
                  <p className="font-dm mb-5 tracking-[0.2em] uppercase" style={{ fontSize: '11px', color: 'rgba(140,160,220,0.55)', letterSpacing: '0.18em' }}>{t('studioLabel')}</p>
                  <h2 className="font-clash" style={{ fontSize: 'clamp(44px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #7090e8 0%, #5b7fe0 35%, #8ba4f0 65%, #a8c0ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', maxWidth: '680px' }}>
                    {t('heroTitle')}
                  </h2>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(83,47,207,0.1)', border: '0.5px solid rgba(83,47,207,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(120,80,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span className="font-clash" style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>No videos yet</span>
                    <span className="font-dm" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', maxWidth: '160px', lineHeight: 1.5 }}>Enter a prompt and hit Generate to create your first video</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Video list */}
          {videos.map(v => (
            <div key={v.id} style={{ width: '100%', background: 'var(--bg-card)', border: 'var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden', flexShrink: 0, display: 'flex' }}>
              {/* Video */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ position: 'relative' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget.querySelector('.video-actions') as HTMLElement;
                    const dl = e.currentTarget.querySelector('.download-btn') as HTMLElement;
                    if (el) el.style.opacity = '1';
                    if (dl) dl.style.display = 'flex';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget.querySelector('.video-actions') as HTMLElement;
                    const dl = e.currentTarget.querySelector('.download-btn') as HTMLElement;
                    if (el) el.style.opacity = likedVideos.has(v.id) ? '1' : '0';
                    if (dl && likedVideos.has(v.id)) dl.style.display = 'none';
                  }}
                >
                  <video src={v.videoUrl} controls loop style={{ width: '100%', display: 'block', maxHeight: '80vh', objectFit: 'contain', background: '#000' }} />

                  {/* Delete confirmation overlay */}
                  {confirmingDeleteId === v.id && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 40 }} onClick={e => e.stopPropagation()}>
                      <p className="font-dm" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', textAlign: 'center', padding: '0 16px' }}>Delete this video?</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setConfirmingDeleteId(null)} className="font-dm" style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '12px', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => { setConfirmingDeleteId(null); deleteVideo(v.id); }} className="font-dm" style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '12px', background: 'rgba(200,40,40,0.8)', border: 'none', color: '#fff', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="video-actions" style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', opacity: likedVideos.has(v.id) ? 1 : 0, transition: 'opacity 0.2s', zIndex: 30 }}>
                    <button className="download-btn" onClick={() => downloadVideo(v.videoUrl, v.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button onClick={() => toggleLike(v.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: likedVideos.has(v.id) ? 'var(--accent-subtle, rgba(83,47,207,0.13))' : 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={likedVideos.has(v.id) ? 'var(--accent)' : 'none'} stroke={likedVideos.has(v.id) ? 'var(--accent)' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                    <button onClick={() => setConfirmingDeleteId(v.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,60,60,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,100,100,0.9)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
              {/* Info sidebar — hidden on mobile */}
              <div className="video-sidebar" style={{ padding: '14px', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                  {v.model ?? 'Kling 3.0'}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const, flex: 1 }}>{v.prompt}</div>
                  <div
                    onClick={() => navigator.clipboard.writeText(v.prompt)}
                    title="Copy prompt"
                    style={{ flexShrink: 0, cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </div>
                </div>
                <div style={{ height: '0.5px', background: '#1a1a1a' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>👁 {v.quality || '720p'}</span>
                  <span>◷ {v.duration || 5}s</span>
                  <span>▭ {v.aspectRatio || '9:16'}</span>
                </div>
                <div style={{ marginTop: 'auto', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {v.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
