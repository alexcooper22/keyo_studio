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
    <div className="min-h-screen w-full bg-[var(--bg)] md:overflow-hidden flex flex-col relative pt-[92px] md:pt-[64px]">
      <Navbar />

      {/* Main 3-column area */}
      <div className="flex-1 flex flex-col md:flex-row w-full h-full overflow-hidden transition-all">
        
        {/* LEFT PANEL */}
        <div className="bg-[#0a0a0a] border-b md:border-b-0 md:border-r border-white/[0.06] shrink-0 flex flex-col w-full md:w-[280px] h-auto md:h-[calc(100vh-64px)] overflow-y-auto">
          {/* TABS */}
          <div className="flex items-center border-b border-white/[0.06] px-4">
            <button className="text-white text-[13px] border-b-2 border-[#532fcf] py-3 mr-4">Create Video</button>
            <button className="text-[#555] hover:text-[#888] text-[13px] transition-colors py-3 mr-4">Edit</button>
            <button className="text-[#555] hover:text-[#888] text-[13px] transition-colors py-3">Motion</button>
          </div>

          <div className="flex flex-col gap-3 p-3 flex-1">
            {/* MODEL CARD */}
            <div className="w-full bg-[#111] rounded-xl border border-white/[0.04] overflow-hidden relative">
              <div className="w-full h-[90px] bg-gradient-to-br from-[#1a1535] to-[#0f1020] relative">
                <button className="absolute top-2 right-2 bg-white/[0.12] hover:bg-white/[0.2] px-2 py-1 rounded-md text-[10px] text-white/70 transition-colors flex items-center gap-1">
                  ✎ Change
                </button>
              </div>
              <div className="px-3 py-2">
                <div className="text-[#532fcf] text-[10px] font-bold tracking-wide">GENERAL</div>
                <div className="text-[#888] text-[12px]">Kling 3.0</div>
              </div>
            </div>

            {/* FRAME INPUTS */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <div className="w-full aspect-square bg-[#111] rounded-lg border border-white/[0.06] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-[#161616] transition-colors relative">
                  <span className="absolute top-1.5 right-2 text-[9px] text-[#333]">Optional</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className="text-[10px] text-[#444]">Start frame</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="w-full aspect-square bg-[#111] rounded-lg border border-white/[0.06] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-[#161616] transition-colors relative">
                  <span className="absolute top-1.5 right-2 text-[9px] text-[#333]">Optional</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className="text-[10px] text-[#444]">End frame</span>
                </div>
              </div>
            </div>

            {/* MULTI-SHOT TOGGLE */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#888] text-[12px]">
                Multi-shot
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </div>
              <div className="w-8 h-[18px] bg-[#333] rounded-full relative cursor-pointer">
                <div className="w-3.5 h-3.5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
              </div>
            </div>

            {/* PROMPT */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-[90px] bg-[#111] border border-white/[0.08] rounded-xl p-3 text-white text-[13px] placeholder:text-[#333] outline-none focus:border-[#532fcf]/50 transition-colors resize-none font-dm"
              placeholder="Describe your video scene..."
            />

            {/* MODEL SELECT */}
            <div className="w-full bg-[#111] border border-white/[0.06] rounded-lg px-3 py-2.5 flex items-center justify-between cursor-pointer hover:border-white/[0.12] transition-colors">
              <div>
                <div className="text-[10px] text-[#444] mb-0.5">Model</div>
                <div className="text-[12px] text-[#888] flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#532fcf]"></div>
                  Kling 3.0
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>

            {error && <div className="text-red-500 text-xs px-1">{error}</div>}
          </div>

          {/* PARAMS + GENERATE */}
          <div className="border-t border-white/[0.06] p-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <button className="flex-1 bg-[#111] border border-white/[0.06] rounded-lg py-2 text-[11px] text-[#666] flex items-center justify-center gap-1.5 hover:border-white/[0.12] hover:text-[#888] transition-colors">
                ◷ 5s
              </button>
              <button className="flex-1 bg-[#111] border border-white/[0.06] rounded-lg py-2 text-[11px] text-[#666] flex items-center justify-center gap-1.5 hover:border-white/[0.12] hover:text-[#888] transition-colors">
                ▭ 9:16
              </button>
              <button className="flex-1 bg-[#111] border border-white/[0.06] rounded-lg py-2 text-[11px] text-[#666] flex items-center justify-center gap-1.5 hover:border-white/[0.12] hover:text-[#888] transition-colors">
                ◇ 720p
              </button>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-[#532fcf] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[13px] rounded-lg py-3 flex items-center justify-center gap-2 transition-all"
            >
              {isGenerating ? status || 'Generating...' : '⚡ Generate'}
            </button>
          </div>
        </div>

        {/* CENTER PANEL */}
        <div className="flex-1 bg-[#080808] p-4 md:p-6 flex flex-col min-h-[400px] md:h-full">
          <div className="w-full flex items-center justify-end mb-4 gap-4">
            <button className="flex items-center gap-1.5 text-[#555] hover:text-white transition-colors text-[13px] font-dm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              History
            </button>
            <button className="flex items-center gap-1.5 text-[#555] hover:text-white transition-colors text-[13px] font-dm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
              How it works
            </button>
            <span className="w-[1px] h-3 bg-white/10 mx-1"></span>
            <span className="w-2 h-2 bg-white/90 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]"></span>
            <button className="text-[#555] hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>
            </button>
          </div>
          <div className="w-full flex-1 flex items-center justify-center pb-8 overflow-hidden">
            <div className="h-full w-full max-h-[calc(100vh-200px)] aspect-[9/16] bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-xl border border-white/[0.06] relative group overflow-hidden shadow-2xl mx-auto flex items-center justify-center">
              {videoUrl ? (
                <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain rounded-xl" />
              ) : (
                <>
                  {/* Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent w-[200%] animate-[shimmer_3s_ease_infinite]"></div>
                  
                  {/* Play Button */}
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md group-hover:bg-[var(--accent)] transition-all cursor-pointer z-10 shadow-lg group-hover:shadow-[0_0_20px_rgba(255,51,119,0.3)] hover:scale-105">
                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white group-hover:border-l-black border-b-[8px] border-b-transparent ml-1 transition-colors"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="hidden md:flex w-[280px] bg-[#0a0a0a] border-l border-white/[0.06] flex-col h-full overflow-y-auto p-5 gap-6 shrink-0 custom-scrollbar">
          
          {/* A) Model label */}
          <div className="flex items-center gap-2 text-[#888] font-dm text-[13px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Kling 3.0
          </div>
          
          {/* B) Generated prompt */}
          <div className="text-[#666] font-dm text-[13px] leading-[1.7] mt-1">
            "Woman and man stand side by side facing the camera.<br/>
            They hold their gaze steadily.<br/>
            Camera slowly pulls back in slow motion."
          </div>

          <div className="w-full h-[1px] bg-white/[0.04] my-2"></div>

          {/* C) Small thumbnail */}
          <div className="w-12 h-12 bg-gradient-to-br from-[#161616] to-[#0f0f0f] border border-white/[0.04] rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent w-[200%] animate-[shimmer_2s_ease_infinite]"></div>
          </div>

          {/* D) Meta info row */}
          <div className="flex flex-wrap items-center gap-4 text-[#555] font-dm text-[12px] mt-2">
            <div className="flex items-center gap-1.5 hover:text-white/80 transition-colors cursor-default">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              1080p
            </div>
            <div className="flex items-center gap-1.5 hover:text-white/80 transition-colors cursor-default">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              4.0s
            </div>
            <div className="flex items-center gap-1.5 hover:text-white/80 transition-colors cursor-default">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
              9:16
            </div>
          </div>

          {/* E) Date */}
          <div className="mt-auto pt-8 text-[#444] font-dm text-[12px]">
            April 1, 2026
          </div>
        </div>

      </div>
    </div>
  );
}
