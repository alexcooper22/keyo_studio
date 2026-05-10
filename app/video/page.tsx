'use client';
import React, { useState, useRef, useEffect } from 'react';
import Navbar from '../../components/Navbar';

interface VideoItem {
  id: string;
  videoUrl: string;
  prompt: string;
  createdAt: Date;
}

export default function VideoDashboard() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

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
          })));
        }
      } catch (err) {
        console.error('Failed to load videos', err);
      }
    };
    loadVideos();
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
        body: JSON.stringify({ prompt, duration: 5, aspectRatio: '9:16', mode: 'std' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const taskId = data.taskId;
      setStatus('Processing...');
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
          };
          setVideos(prev => [newVideo, ...prev]);
          setIsGenerating(false);
          setStatus('');
          // Scroll to top of feed
          if (feedRef.current) feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (result.status === 'failed') {
          clearInterval(pollRef.current!);
          setError('Generation failed');
          setIsGenerating(false);
          setStatus('');
        }
      }, 5000);
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
      setStatus('');
    }
  };

  return (
    <div style={{ paddingTop: '94px', background: '#080808', height: '100vh', overflow: 'hidden' }}>
      <Navbar />
      <style>{`
        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
        textarea::-webkit-scrollbar-thumb:hover { background: #532fcf; }
        .feed::-webkit-scrollbar { width: 0px; }
        .feed::-webkit-scrollbar-track { background: transparent; }
        .feed::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 4px; }
      `}</style>

      <div style={{ padding: '0 30px 30px 30px', display: 'flex', gap: '12px', height: 'calc(100vh - 94px)', alignItems: 'stretch' }}>

        {/* LEFT PANEL — fixed */}
        <div style={{ width: '260px', flexShrink: 0, background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #1e1e1e', padding: '0 12px' }}>
            {['Create Video', 'Edit', 'Motion'].map((t, i) => (
              <div key={t} style={{ fontSize: '12px', color: i === 0 ? '#fff' : '#555', padding: '10px 0', marginRight: '14px', borderBottom: i === 0 ? '2px solid #532fcf' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}</div>
            ))}
          </div>
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
            {/* Model card */}
            <div style={{ background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ height: '75px', background: 'linear-gradient(135deg, #1a1535, #0f1020)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#ffffff10', border: '0.5px solid #ffffff15', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', color: '#888', cursor: 'pointer' }}>✎ Change</div>
              </div>
              <div style={{ padding: '6px 10px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#532fcf', letterSpacing: '0.5px' }}>GENERAL</div>
                <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>Kling 3.0</div>
              </div>
            </div>
            {/* Frames */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {['Start frame', 'End frame'].map(f => (
                <div key={f} style={{ background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '8px', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: '5px', right: '6px', fontSize: '8px', color: '#333' }}>Optional</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span style={{ fontSize: '9px', color: '#2d2d2d' }}>{f}</span>
                </div>
              ))}
            </div>
            {/* Multi-shot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Multi-shot</span>
              <div style={{ width: '30px', height: '16px', background: '#1e1e1e', borderRadius: '20px', position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: '12px', height: '12px', background: '#444', borderRadius: '50%', position: 'absolute', left: '2px', top: '2px' }}></div>
              </div>
            </div>
            {/* Prompt */}
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your video scene..."
              style={{ background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#ccc', flex: 1, minHeight: '120px', resize: 'none', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            {/* Model select */}
            <div style={{ background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '8px', padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '9px', color: '#444' }}>Model</div>
                <div style={{ fontSize: '12px', color: '#555', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#532fcf' }}></div>
                  Kling 3.0
                </div>
              </div>
              <span style={{ color: '#333', fontSize: '14px' }}>›</span>
            </div>
            {error && <div style={{ fontSize: '11px', color: '#ef4444' }}>{error}</div>}
          </div>
          {/* Footer */}
          <div style={{ borderTop: '0.5px solid #1e1e1e', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              {['◷ 5s', '▭ 9:16', '◇ 720p'].map(p => (
                <div key={p} style={{ flex: 1, background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '6px', padding: '7px 3px', textAlign: 'center', fontSize: '10px', color: '#555', cursor: 'pointer' }}>{p}</div>
              ))}
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{ background: '#532fcf', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: 600, color: '#fff', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.7 : 1, width: '100%' }}
            >
              {isGenerating ? status || 'Generating...' : '⚡ Generate'}
            </button>
          </div>
        </div>

        {/* CENTER PANEL — scrollable feed */}
        <div ref={feedRef} className="feed" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* Generating placeholder */}
          {isGenerating && (
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '2px solid #532fcf', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ fontSize: '12px', color: '#555' }}>{status || 'Generating...'}</span>
            </div>
          )}
          {/* Empty state */}
          {videos.length === 0 && !isGenerating && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 154px)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff08', border: '0.5px solid #ffffff12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: '16px solid #ffffff20', marginLeft: '4px' }}></div>
                </div>
                <span style={{ fontSize: '12px', color: '#333' }}>Your videos will appear here</span>
              </div>
            </div>
          )}
          {/* Video list */}
          {videos.map(v => (
            <div key={v.id} style={{ width: '100%', background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, display: 'flex' }}>
              {/* Video */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <video src={v.videoUrl} controls autoPlay loop style={{ width: '100%', display: 'block', maxHeight: '80vh', objectFit: 'contain', background: '#000' }} />
              </div>
              {/* Info sidebar */}
              <div style={{ width: '200px', flexShrink: 0, borderLeft: '0.5px solid #1e1e1e', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: '#555', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#532fcf' }}></div>
                  Kling 3.0
                </div>
                <div style={{ fontSize: '11px', color: '#333', lineHeight: '1.6', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const }}>{v.prompt}</div>
                <div style={{ height: '0.5px', background: '#1a1a1a' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: '#333' }}>
                  <span>👁 720p</span>
                  <span>◷ 5.0s</span>
                  <span>▭ 9:16</span>
                </div>
                <div style={{ marginTop: 'auto', fontSize: '10px', color: '#2d2d2d' }}>
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
