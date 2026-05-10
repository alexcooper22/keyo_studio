'use client';
import React, { useState, useRef } from 'react';
import Navbar from '../../components/Navbar';

export default function VideoDashboard() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setVideoUrl(null);
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
          setVideoUrl(result.videoUrl);
          setIsGenerating(false);
          setStatus('');
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
      <div style={{ padding: '0 30px 30px 30px', display: 'flex', gap: '12px', height: 'calc(100vh - 94px)', alignItems: 'stretch' }}>

        {/* LEFT PANEL */}
        <div style={{ width: '260px', flexShrink: 0, background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid #1e1e1e', padding: '0 12px' }}>
            {['Create Video', 'Edit', 'Motion'].map((t, i) => (
              <div key={t} style={{ fontSize: '12px', color: i === 0 ? '#fff' : '#555', padding: '10px 0', marginRight: '14px', borderBottom: i === 0 ? '2px solid #532fcf' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}</div>
            ))}
          </div>

          {/* Body */}
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
            {/* Model card */}
            <div style={{ background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
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
                  <span style={{ position: 'absolute', top: '5px', right: '6px', fontSize: '8px', color: '#252525' }}>Optional</span>
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
              style={{ background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '8px', padding: '8px', fontSize: '12px', color: '#888', minHeight: '80px', resize: 'none', outline: 'none', width: '100%', fontFamily: 'inherit' }}
            />

            {/* Model select */}
            <div style={{ background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '8px', padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '9px', color: '#2d2d2d' }}>Model</div>
                <div style={{ fontSize: '12px', color: '#555', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#532fcf' }}></div>
                  Kling 3.0
                </div>
              </div>
              <span style={{ color: '#2d2d2d', fontSize: '14px' }}>›</span>
            </div>

            {error && <div style={{ fontSize: '11px', color: '#ef4444' }}>{error}</div>}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '0.5px solid #1e1e1e', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              {['◷ 5s', '▭ 9:16', '◇ 720p'].map(p => (
                <div key={p} style={{ flex: 1, background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '6px', padding: '5px 3px', textAlign: 'center', fontSize: '10px', color: '#444', cursor: 'pointer' }}>{p}</div>
              ))}
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              style={{ background: '#532fcf', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer', opacity: isGenerating || !prompt.trim() ? 0.5 : 1, width: '100%' }}
            >
              {isGenerating ? status || 'Generating...' : '⚡ Generate'}
            </button>
          </div>
        </div>

        {/* CENTER PANEL */}
        <div style={{ flex: 1, background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '14px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
            {['◷ History', 'ⓘ How it works'].map(a => (
              <span key={a} style={{ fontSize: '12px', color: '#444', cursor: 'pointer' }}>{a}</span>
            ))}
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff30' }}></div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            {videoUrl ? (
              <video src={videoUrl} controls autoPlay loop style={{ maxHeight: '100%', maxWidth: '100%', borderRadius: '10px' }} />
            ) : (
              <div style={{ width: '200px', height: '355px', background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#ffffff08', border: '0.5px solid #ffffff12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '14px solid #ffffff20', marginLeft: '3px' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: '220px', flexShrink: 0, background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', color: '#444', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            Kling 3.0
          </div>
          <div style={{ fontSize: '11px', color: '#333', lineHeight: '1.6', fontStyle: 'italic' }}>
            "Woman and man stand side by side facing the camera. Camera slowly pulls back in slow motion."
          </div>
          <div style={{ height: '0.5px', background: '#1a1a1a' }}></div>
          <div style={{ width: '36px', height: '36px', background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '6px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#2d2d2d' }}>
            <span>👁 1080p</span>
            <span>◷ 4.0s</span>
            <span>▭ 9:16</span>
          </div>
          <div style={{ marginTop: 'auto', fontSize: '11px', color: '#222' }}>April 1, 2026</div>
        </div>

      </div>
    </div>
  );
}
