'use client';
import React from 'react';
import Navbar from '../../components/Navbar';

export default function VideoDashboard() {
  return (
    <div className="h-screen w-full bg-[var(--bg)] overflow-hidden flex flex-col relative">
      <Navbar />

      {/* Main 3-column area */}
      <div className="flex-1 flex w-full pt-[64px] h-screen overflow-hidden">
        
        {/* LEFT PANEL */}
        <div
          className="bg-[#0a0a0a] border-r border-white/[0.06] p-4 shrink-0 flex flex-col"
          style={{ width: '280px', minWidth: '280px', height: 'calc(100vh - 54px)', overflow: 'hidden' }}
        >
          {/* TABS */}
          <div className="flex items-center gap-4 border-b border-white/[0.06] pb-3 mb-2 shrink-0">
            <button className="text-white font-semibold text-[13px] border-b-2 border-[#ff3377] pb-3 -mb-[13px]">Create Video</button>
            <button className="text-[#555] hover:text-[#888] text-[13px] transition-colors pb-3 -mb-[13px]">Edit</button>
            <button className="text-[#555] hover:text-[#888] text-[13px] transition-colors pb-3 -mb-[13px]">Motion</button>
          </div>

          {/* A) MODEL SELECTOR */}
          <div className="w-full bg-[#111] rounded-xl border border-white/[0.04] p-4 flex flex-col gap-2 relative shrink-0">
            <button className="absolute top-4 right-4 bg-white/[0.08] hover:bg-white/[0.15] cursor-pointer px-2 py-0.5 rounded-full text-xs text-white/70 transition-colors z-10">Change</button>
            <div className="w-full aspect-video bg-gradient-to-br from-[#161616] to-[#0f0f0f] rounded-lg mb-1 relative overflow-hidden border border-white/[0.02]">
              {/* Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent w-[200%] animate-[shimmer_3s_ease_infinite]"></div>
            </div>
            <div className="text-[var(--accent)] font-syne font-bold text-sm tracking-wide mt-1">GENERAL</div>
            <div className="text-[#888] font-dm text-sm">Kling 3.0</div>
          </div>

          {/* B) FRAME INPUTS */}
          <div className="flex gap-3 w-full shrink-0">
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-white/80 font-dm text-[13px]">Start frame</span>
              <div className="w-full aspect-square bg-[#111] rounded-lg border border-white/[0.06] flex items-center justify-center cursor-pointer hover:bg-[#161616] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-[#555] font-dm text-[13px]">Optional</span>
              <div className="w-full aspect-square bg-[#0a0a0a] rounded-lg border border-dashed border-white/[0.06] flex items-center justify-center">
                <span className="text-[#333] text-xs font-dm">End frame</span>
              </div>
            </div>
          </div>

          {/* C) MULTI-SHOT TOGGLE */}
          <div className="flex items-center justify-between w-full shrink-0">
            <div className="flex items-center gap-1.5 text-white/80 font-dm text-[13px]">
              Multi-shot
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            </div>
            <div className="w-9 h-5 bg-[var(--accent)] rounded-full relative cursor-pointer shadow-inner">
              <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
            </div>
          </div>

          {/* D) PROMPT TEXTAREA */}
          <div className="w-full flex flex-col gap-2 min-h-0 shrink-0">
            <textarea 
              className="w-full h-[100px] bg-[#111] border border-white/[0.08] rounded-xl p-4 text-white font-dm text-[14px] placeholder:text-[#444] outline-none focus:border-[var(--accent)]/50 transition-colors resize-none"
              placeholder="Describe your video scene..."
            ></textarea>
          </div>

          {/* Bottom Module Items */}
          <div style={{ marginTop: 'auto' }} className="flex flex-col gap-4">
            {/* E) MODEL BADGE */}
            <div className="w-full py-2.5 px-3 bg-[rgba(255,51,119,0.1)] border border-[rgba(255,51,119,0.2)] rounded-full flex items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-[rgba(255,51,119,0.15)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              <span className="text-[var(--accent)] font-dm text-[13px] font-[600]">New Seedance 2.0</span>
            </div>

            {/* F) GENERATE BUTTON */}
            <button className="w-full h-[52px] bg-[var(--accent)] text-black font-syne font-[700] text-[16px] rounded-lg flex items-center justify-center gap-1.5 hover:brightness-110 hover:scale-[1.01] transition-all">
              ⚡ Generate
            </button>
          </div>
        </div>

        {/* CENTER PANEL */}
        <div className="flex-1 bg-[#080808] p-6 flex flex-col h-full overflow-hidden">
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
              {/* Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent w-[200%] animate-[shimmer_3s_ease_infinite]"></div>
              
              {/* Play Button */}
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md group-hover:bg-[var(--accent)] transition-all cursor-pointer z-10 shadow-lg group-hover:shadow-[0_0_20px_rgba(255,51,119,0.3)] hover:scale-105">
                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white group-hover:border-l-black border-b-[8px] border-b-transparent ml-1 transition-colors"></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-[280px] bg-[#0a0a0a] border-l border-white/[0.06] flex flex-col h-full overflow-y-auto p-5 gap-6 shrink-0 custom-scrollbar">
          
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
