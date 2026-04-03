'use client';
import React from 'react';
import Navbar from '../../components/Navbar';

export default function TextChat() {
  const messages = [
    {
      role: 'user',
      content: 'Write a cinematic prompt for a woman in a cafe with moody lighting'
    },
    {
      role: 'ai',
      content: 'A mysterious woman sits alone in a dimly lit cafe, warm amber light casting long shadows across her face. Steam rises from a coffee cup. Shot on 35mm film, shallow depth of field, cinematic color grading.'
    },
    {
      role: 'user',
      content: 'Make it more dramatic, add neon lights'
    },
    {
      role: 'ai',
      content: 'A woman in a dark cafe at night, neon signs reflected in rain-streaked windows, dramatic side lighting, deep shadows, cyberpunk atmosphere. Ultra realistic, 8K, cinematic composition.'
    }
  ];

  return (
    <div className="flex flex-col h-screen bg-[#080808] overflow-hidden relative">
      <Navbar />

      {/* Main content layout starting below navbar (54px + 10px banner) */}
      <main className="flex-1 flex flex-col pt-[92px] md:pt-[64px] overflow-hidden">
        
        {/* Chat Messages Area */}
        <section className="flex-1 overflow-y-auto px-4 md:px-[20%] py-6 md:py-10 flex flex-col gap-5 scrollbar-thin">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-[10px]'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-[28px] h-[28px] bg-[var(--accent)] rounded-full flex items-center justify-center font-[700] text-black text-xs shrink-0 mt-1">
                  K
                </div>
              )}
              
              <div 
                className={`${
                  msg.role === 'user' 
                    ? 'max-w-[75%] bg-[#141414] border border-white/[0.06] rounded-[14px_14px_2px_14px] px-4 py-3 text-[13px] text-[#f0f0f0] leading-[1.7]' 
                    : 'text-[13px] text-[#cccccc] leading-[1.8] flex-1 pt-1'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </section>

        {/* Input Bar Area */}
        <footer className="w-full bg-[#080808] border-t border-white/[0.06] px-4 md:px-[20%] py-4 flex flex-col gap-3">
          <div className="bg-[#111] border border-white/[0.08] rounded-xl p-[10px_14px] flex items-end gap-[10px] focus-within:border-[rgba(255,51,119,0.3)] transition-colors shadow-sm">
            <textarea 
              className="flex-1 bg-transparent border-none outline-none text-[#f0f0f0] font-dm text-[13px] placeholder:text-[#444] resize-none h-10 py-2"
              placeholder="Ask anything or describe what you want to create..."
            ></textarea>
            
            <button className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center text-black font-[700] hover:brightness-110 transition-all shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
          
          <div className="text-center text-[11px] text-[#333] font-dm uppercase tracking-wider">
            Keyo AI — Powered by Claude
          </div>
        </footer>

      </main>
    </div>
  );
}
