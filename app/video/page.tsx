'use client';
import React, { useState, useRef, useEffect } from 'react';
import Navbar from '../../components/Navbar';

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
    setIsGenerating(true);
    setError(null);
    setStatus('Submitting...');
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration, aspectRatio, mode: 'std', quality, audio: audioEnabled, startFrame, endFrame }),
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

  return (
    <div style={{ paddingTop: '94px', background: 'var(--bg)', height: '100vh', overflow: 'hidden' }}>
      <Navbar />
      <style>{`
        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
        textarea::-webkit-scrollbar-thumb:hover { background: var(--accent); }
        .feed::-webkit-scrollbar { width: 0px; }
        .feed::-webkit-scrollbar-track { background: transparent; }
        .feed::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
      `}</style>

      <div style={{ padding: '0 30px 30px 30px', display: 'flex', gap: '12px', height: 'calc(100vh - 94px)', alignItems: 'stretch' }}>

        {/* LEFT PANEL — fixed */}
        <div style={{ width: '260px', flexShrink: 0, background: 'var(--bg-card)', border: 'var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: 'var(--border)', padding: '0 12px' }}>
            {['Create Video', 'Edit', 'Motion'].map((t, i) => (
              <div key={t} style={{ fontSize: '12px', color: i === 0 ? 'var(--text)' : '#555', padding: '10px 0', marginRight: '14px', borderBottom: i === 0 ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}</div>
            ))}
          </div>
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
            {/* Model card */}
            <div style={{ background: '#0d0d0d', border: 'var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ height: '75px', background: 'linear-gradient(135deg, #1a1535, #0f1020)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#ffffff10', border: '0.5px solid #ffffff15', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer' }}>✎ Change</div>
              </div>
              <div style={{ padding: '6px 10px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.5px' }}>GENERAL</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Kling 3.0</div>
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
                    <div onClick={() => ref.current?.click()} style={{ background: '#0d0d0d', border: `0.5px solid ${frame ? 'var(--accent)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-btn)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                      {frame ? (
                        <img src={frame} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-btn)' }} />
                      ) : (
                        <>
                          <span style={{ position: 'absolute', top: '5px', right: '6px', fontSize: '8px', color: 'var(--text-secondary)' }}>Optional</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{type === 'start' ? 'Start frame' : 'End frame'}</span>
                        </>
                      )}
                    </div>
                    {frame && (
                      <div onClick={() => type === 'start' ? setStartFrame(null) : setEndFrame(null)} style={{ position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', background: '#000000aa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', color: '#fff', zIndex: 10 }}>×</div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Audio toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: audioEnabled ? 'var(--accent)' : 'var(--text-secondary)', transition: 'color 0.2s', cursor: 'pointer' }} onClick={() => setAudioEnabled(v => !v)}>Audio</span>
              <div onClick={() => setAudioEnabled(v => !v)} style={{ width: '30px', height: '16px', background: audioEnabled ? 'var(--accent)' : 'var(--border-color)', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ width: '12px', height: '12px', background: audioEnabled ? 'var(--text)' : '#444', borderRadius: '50%', position: 'absolute', left: audioEnabled ? '16px' : '2px', top: '2px', transition: 'left 0.2s, background 0.2s' }}></div>
              </div>
            </div>
            {/* Prompt */}
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your video scene..."
              style={{ background: '#0d0d0d', border: 'var(--border)', borderRadius: 'var(--radius-btn)', padding: '10px', fontSize: '12px', color: '#ccc', flex: 1, minHeight: '120px', resize: 'none', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            {/* Model select */}
            <div style={{ position: 'relative' }} data-menu="true">
              <div onClick={e => { e.stopPropagation(); setShowModelMenu(v => !v); setShowQualityMenu(false); setShowAspectMenu(false); setShowDurationMenu(false); }} style={{ background: '#0d0d0d', border: 'var(--border)', borderRadius: 'var(--radius-btn)', padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Model</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                    Kling 3.0
                  </div>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>›</span>
              </div>
              {showModelMenu && (
                <div data-menu="true" style={{ position: 'absolute', bottom: '110%', left: 0, right: 0, background: 'var(--bg-navbar)', border: 'var(--border)', borderRadius: 'var(--radius-btn)', overflow: 'hidden', zIndex: 100 }}>
                  <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                      Kling 3.0
                    </div>
                    <span style={{ color: 'var(--accent)' }}>✓</span>
                  </div>
                </div>
              )}
            </div>
            {error && <div style={{ fontSize: '11px', color: '#ef4444' }}>{error}</div>}
          </div>
          {/* Footer */}
          <div style={{ borderTop: 'var(--border)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <div data-menu="true" onClick={e => { e.stopPropagation(); setShowDurationMenu(v => !v); setShowQualityMenu(false); setShowAspectMenu(false); setShowModelMenu(false); }} style={{ background: '#0d0d0d', border: 'var(--border)', borderRadius: '6px', padding: '7px 3px', textAlign: 'center', fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer' }}>◷ {duration}s</div>
                {showDurationMenu && (
                  <div data-menu="true" style={{ position: 'absolute', bottom: '110%', left: 0, right: 0, background: 'var(--bg-navbar)', border: 'var(--border)', borderRadius: 'var(--radius-btn)', overflow: 'hidden', zIndex: 100 }}>
                    {[10, 9, 8, 7, 6, 5, 4, 3].map(d => (
                      <div key={d} onClick={() => { setDuration(d); setShowDurationMenu(false); }} style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {d}s
                        {duration === d && <span style={{ color: 'var(--accent)' }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <div data-menu="true" onClick={e => { e.stopPropagation(); setShowAspectMenu(v => !v); setShowQualityMenu(false); setShowDurationMenu(false); setShowModelMenu(false); }} style={{ background: '#0d0d0d', border: 'var(--border)', borderRadius: '6px', padding: '7px 3px', textAlign: 'center', fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer' }}>▭ {aspectRatio}</div>
                {showAspectMenu && (
                  <div data-menu="true" style={{ position: 'absolute', bottom: '110%', left: 0, right: 0, background: 'var(--bg-navbar)', border: 'var(--border)', borderRadius: 'var(--radius-btn)', overflow: 'hidden', zIndex: 100 }}>
                    {(['9:16', '16:9', '1:1'] as const).map(r => (
                      <div key={r} onClick={() => { setAspectRatio(r); setShowAspectMenu(false); }} style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {r}
                        {aspectRatio === r && <span style={{ color: 'var(--accent)' }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <div
                  data-menu="true"
                  onClick={e => { e.stopPropagation(); setShowQualityMenu(v => !v); setShowAspectMenu(false); setShowDurationMenu(false); setShowModelMenu(false); }}
                  style={{ background: '#0d0d0d', border: 'var(--border)', borderRadius: '6px', padding: '7px 3px', textAlign: 'center', fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >◇ {quality}</div>
                {showQualityMenu && (
                  <div data-menu="true" style={{ position: 'absolute', bottom: '110%', left: 0, right: 0, background: 'var(--bg-navbar)', border: 'var(--border)', borderRadius: 'var(--radius-btn)', overflow: 'hidden', zIndex: 100 }}>
                    {(['720p', '1080p'] as const).map(q => (
                      <div
                        key={q}
                        onClick={() => { setQuality(q); setShowQualityMenu(false); }}
                        style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        {q}
                        {quality === q && <span style={{ color: 'var(--accent)' }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || (creditCount !== null && creditCount < ((quality === '1080p' ? 4 : 3) + (audioEnabled ? 1 : 0)) * duration)}
              style={{
                background: (creditCount !== null && creditCount <= 0) ? '#2a2a2a' : 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-btn)',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 600,
                color: (creditCount !== null && creditCount <= 0) ? 'var(--text-secondary)' : 'var(--text)',
                cursor: (isGenerating || (creditCount !== null && creditCount <= 0)) ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.7 : 1,
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px' 
              }}
            >
              {isGenerating ? status || 'Generating...' : (creditCount !== null && creditCount <= 0) ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="#777" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg> No credits</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg> Generate · {((quality === '1080p' ? 4 : 3) + (audioEnabled ? 1 : 0)) * duration}</>
              )}
            </button>
          </div>
        </div>

        {/* CENTER PANEL — scrollable feed */}
        <div ref={feedRef} className="feed" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* Generating placeholder */}
          {isGenerating && (
            <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--bg-card)', border: 'var(--border)', borderRadius: 'var(--radius-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '2px solid var(--accent)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{status || 'Generating...'}</span>
            </div>
          )}
          {/* Empty state */}
          {videos.length === 0 && !isGenerating && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 154px)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff08', border: '0.5px solid #ffffff12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: '16px solid #ffffff20', marginLeft: '4px' }}></div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Your videos will appear here</span>
              </div>
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
              {/* Info sidebar */}
              <div style={{ width: '200px', flexShrink: 0, borderLeft: 'var(--border)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
