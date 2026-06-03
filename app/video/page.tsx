'use client';
import React, { useState, useRef, useEffect } from 'react';
import Navbar from '../../components/layout/Navbar';
import { fetchModelsWithCache } from '../../lib/modelCache';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '../../context/AuthContext';

interface VideoItem {
  id: string;
  videoUrl: string;
  prompt: string;
  createdAt: Date;
  quality?: string;
  duration?: number;
  aspectRatio?: string;
}

export default function VideoDashboard() {
  const { isLoaded, isSignedIn } = useUser();
  const { setShowModal } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [quality, setQuality] = useState<'720p' | '1080p'>('720p');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [duration, setDuration] = useState<number>(5);
  const [showDurationMenu, setShowDurationMenu] = useState(false);
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
  const [videoModels, setVideoModels] = useState<Array<{ id: string; name: string; pricing: Array<{ quality: string; credits: number }> }>>([]);
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
        aspectRatio
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
        <span className="font-dm" style={{ color: 'rgba(120,80,255,0.7)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}>AI Video Studio</span>
      </div>
      <h1 style={{ fontWeight: 700, lineHeight: 1.05, marginBottom: '16px', position: 'relative' }}>
        <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(22px, 3.2vw, 34px)', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.85)' }}>
          Turn ideas into
        </span>
        <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(64px, 12vw, 110px)', letterSpacing: '-0.04em', lineHeight: 0.93, background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          videos
        </span>
        <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(22px, 3.2vw, 34px)', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.85)', marginTop: '6px' }}>
          using{' '}
          <span style={{ background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 50%, #7c5cf0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>keyo.studio</span>
        </span>
      </h1>
      <p className="font-dm" style={{ fontSize: '13px', color: 'rgba(180,160,230,0.45)', marginBottom: '36px', position: 'relative' }}>
        Infrastructure for AI Video Generation
      </p>
      <button
        onClick={() => setShowModal(true)}
        style={{ background: 'linear-gradient(135deg, #7c5cf0 0%, #9b7eff 100%)', border: 'none', borderRadius: '12px', padding: '14px 40px', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-dm)', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 24px rgba(83,47,207,0.45), inset 0 1px 0 rgba(255,255,255,0.15)', display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>
        Try for free
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
            {/* Purple ambient orbs — mirrors homepage */}
            <div aria-hidden style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '500px', background: 'radial-gradient(ellipse at center, rgba(83,47,207,0.28) 0%, rgba(60,30,180,0.12) 40%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', top: '20%', left: '-20%', width: '350px', height: '350px', background: 'radial-gradient(ellipse at center, rgba(100,50,220,0.14) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', top: '25%', right: '-20%', width: '300px', height: '300px', background: 'radial-gradient(ellipse at center, rgba(140,80,255,0.12) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

            {[['top-0 left-0', 'border-t border-l', '-translate-x-px -translate-y-px'],
              ['top-0 right-0', 'border-t border-r', 'translate-x-px -translate-y-px'],
              ['bottom-0 left-0', 'border-b border-l', '-translate-x-px translate-y-px'],
              ['bottom-0 right-0', 'border-b border-r', 'translate-x-px translate-y-px'],
            ].map(([pos, border, translate], i) => (
              <div key={i} className={`absolute ${pos} ${translate}`} style={{ width: '36px', height: '36px' }}>
                <div className={`w-full h-full ${border}`} style={{ borderColor: 'rgba(120,80,255,0.5)' }} />
              </div>
            ))}
            <p className="font-dm mb-5 tracking-[0.2em] uppercase" style={{ fontSize: '11px', color: 'rgba(160,120,255,0.6)', letterSpacing: '0.18em', position: 'relative' }}>
              Keyo Video Studio
            </p>
            <h1 className="font-clash" style={{
              fontSize: 'clamp(44px, 11vw, 72px)',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #e8e0ff 0%, #c4b0ff 40%, #9b7eff 70%, #6b4ef5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              maxWidth: '680px',
              position: 'relative',
            }}>
              What story<br />would you tell<br />with unlimited frames?
            </h1>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: 'linear-gradient(135deg, #7c5cf0 0%, #9b7eff 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 40px',
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'var(--font-dm)',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(83,47,207,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
                letterSpacing: '0.1px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '20px',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>
              Try for free
            </button>
          </div>
        )}

        {/* LEFT PANEL */}
        <div className="video-panel" style={{ background: '#0a0a0e', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
          {/* Top shimmer */}
          <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(120,80,255,0.5) 40%, rgba(83,47,207,0.75) 50%, rgba(120,80,255,0.5) 60%, transparent 95%)', pointerEvents: 'none', zIndex: 1 }} />

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.06)', padding: '0 14px', gap: '2px' }}>
            {['Create Video', 'Edit', 'Motion'].map((t, i) => (
              <div key={t} style={{ fontFamily: 'var(--font-dm)', fontSize: '12px', fontWeight: 500, color: i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.28)', padding: '11px 6px', marginRight: '8px', borderBottom: i === 0 ? '1.5px solid rgba(120,80,255,0.8)' : '1.5px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>{t}</div>
            ))}
          </div>

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>

            {/* Model card */}
            <div style={{ background: '#0c0c14', border: '0.5px solid rgba(83,47,207,0.25)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ height: '70px', background: 'radial-gradient(ellipse 100% 120% at 50% 0%, rgba(83,47,207,0.35) 0%, rgba(20,10,40,0.9) 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.5), transparent)' }} />
                <button style={{ position: 'absolute', top: '7px', right: '7px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '3px 9px', fontSize: '10px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'var(--font-dm)' }}>✎ Change</button>
              </div>
              <div style={{ padding: '8px 12px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(120,80,255,0.7)', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: 'var(--font-dm)' }}>✦ General</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginTop: '3px', fontFamily: 'var(--font-dm)', fontWeight: 500 }}>{videoModels.find(m => m.id === selectedVideoModelId)?.name ?? 'Loading...'}</div>
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
                          <span style={{ position: 'absolute', top: '6px', right: '8px', fontSize: '8px', color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--font-dm)' }}>Optional</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-dm)' }}>{type === 'start' ? 'Start frame' : 'End frame'}</span>
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
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', color: audioEnabled ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s', cursor: 'pointer' }} onClick={() => setAudioEnabled(v => !v)}>Audio</span>
              <div onClick={() => setAudioEnabled(v => !v)} style={{ width: '32px', height: '18px', background: audioEnabled ? 'rgba(83,47,207,0.8)' : 'rgba(255,255,255,0.1)', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', left: audioEnabled ? '16px' : '2px', top: '2px', transition: 'left 0.2s' }} />
              </div>
            </div>

            {/* Prompt textarea */}
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your video scene..."
              style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.85)', flex: 1, minHeight: '110px', resize: 'none', outline: 'none', width: '100%', fontFamily: 'var(--font-dm)', boxSizing: 'border-box', lineHeight: 1.6 }}
            />

            {/* Model select */}
            <div style={{ position: 'relative' }} data-menu="true">
              <div onClick={e => { e.stopPropagation(); setShowModelMenu(v => !v); setShowQualityMenu(false); setShowAspectMenu(false); setShowDurationMenu(false); }} style={{ background: showModelMenu ? 'rgba(83,47,207,0.1)' : 'rgba(255,255,255,0.03)', border: showModelMenu ? '0.5px solid rgba(83,47,207,0.4)' : '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-dm)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Model</div>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(120,80,255,0.8)', flexShrink: 0 }} />
                    {videoModels.find(m => m.id === selectedVideoModelId)?.name ?? 'Loading...'}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {showModelMenu && (
                <div data-menu="true" style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {videoModels.map(m => (
                    <button key={m.id} onClick={() => { setSelectedVideoModelId(m.id); setShowModelMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', background: selectedVideoModelId === m.id ? 'rgba(83,47,207,0.12)' : 'none', color: selectedVideoModelId === m.id ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.65)', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500 }}>
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
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
                <><div style={{ width: '13px', height: '13px', border: '1.5px solid rgba(255,255,255,0.35)', borderTop: '1.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />{status || 'Generating...'}</>
              ) : (creditCount !== null && creditCount <= 0) ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>No credits</>
              ) : (
                <><span style={{ fontSize: '10px', color: 'rgba(220,200,255,0.9)' }}>✦</span>Generate<span style={{ color: 'rgba(200,170,255,0.7)', fontSize: '11px', fontWeight: 500 }}>· {videoCreditCost}</span></>
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
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{status || 'Generating...'}</span>
            </div>
          )}
          {/* Empty state */}
          {videos.length === 0 && !isGenerating && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 154px)', position: 'relative' }}>
              {isLoaded && !isSignedIn ? (
                <div className="hidden md:block" style={{ textAlign: 'center', padding: '0 24px', position: 'relative' }}>
                  {[['top-0 left-0', '-translate-x-px -translate-y-px'], ['top-0 right-0', 'translate-x-px -translate-y-px'], ['bottom-0 left-0', '-translate-x-px translate-y-px'], ['bottom-0 right-0', 'translate-x-px translate-y-px']].map(([pos, translate], i) => (
                    <div key={i} className={`absolute ${pos} ${translate}`} style={{ width: '28px', height: '28px', border: `0.5px solid rgba(83,47,207,0.7)`, borderRadius: '0', ...(i === 0 ? { borderRight: 'none', borderBottom: 'none' } : i === 1 ? { borderLeft: 'none', borderBottom: 'none' } : i === 2 ? { borderRight: 'none', borderTop: 'none' } : { borderLeft: 'none', borderTop: 'none' }) }} />
                  ))}
                  <p style={{ fontSize: '10px', color: 'rgba(140,160,220,0.5)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-dm)', marginBottom: '16px' }}>Keyo Video Studio</p>
                  <h2 style={{ fontSize: 'clamp(28px, 4vw, 54px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #7090e8 0%, #5b7fe0 35%, #8ba4f0 65%, #a8c0ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', maxWidth: '520px', fontFamily: 'var(--font-clash)' }}>
                    What story would you tell with unlimited frames?
                  </h2>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(83,47,207,0.08)', border: '0.5px solid rgba(83,47,207,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: '16px solid rgba(120,80,255,0.3)', marginLeft: '4px' }}></div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>Your videos will appear here</span>
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
                  
                  {/* Hover actions */}
                  <div className="video-actions" style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', opacity: likedVideos.has(v.id) ? 1 : 0, transition: 'opacity 0.2s', zIndex: 30 }}>
                    <button className="download-btn" onClick={() => downloadVideo(v.videoUrl, v.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button onClick={() => toggleLike(v.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: likedVideos.has(v.id) ? 'var(--accent-subtle, rgba(83,47,207,0.13))' : 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={likedVideos.has(v.id) ? 'var(--accent)' : 'none'} stroke={likedVideos.has(v.id) ? 'var(--accent)' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                  </div>
                </div>
              </div>
              {/* Info sidebar — hidden on mobile */}
              <div className="video-sidebar" style={{ padding: '14px', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                  Kling 3.0
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
