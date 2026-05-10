'use client';

import Navbar from '../../components/Navbar';

export default function AudioPage() {
  const bars = [20,40,60,30,80,50,90,40,70,55,85,35,65,75,45,95,25,60,80,50,70,40,85,30,60,90,45,75,55,80];

  return (
    <>
      <Navbar />
      <main className="min-h-screen" style={{ paddingTop: '64px', background: '#080808' }}>

        {/* Hero */}
        <div className="relative flex flex-col items-center justify-center text-center" style={{ height: 'calc(100vh - 200px)', padding: '0 20px' }}>
          {/* Wave background */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end gap-[3px] px-8" style={{ height: '120px', opacity: 0.12 }}>
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: '#532fcf' }} />
            ))}
          </div>

          <p style={{ fontSize: '11px', color: '#532fcf', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 600 }}>
            Audio Generation
          </p>
          <h1 style={{ fontSize: '48px', fontWeight: 300, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '12px', fontFamily: 'var(--font-clash)' }}>
            Bring your scene<br />to life with sound
          </h1>
          <p style={{ fontSize: '14px', color: '#444' }}>
            Generate music, voiceovers and sound effects with AI
          </p>
        </div>

        {/* Prompt bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 px-8 pb-8 pointer-events-none">
          <div className="w-full max-w-4xl mx-auto rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden pointer-events-auto" style={{ backgroundColor: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(16px)' }}>
            <div style={{ padding: '14px 16px' }}>
              <input
                type="text"
                placeholder="Describe the sound you imagine..."
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#888', fontFamily: 'inherit', marginBottom: '12px' }}
              />
              <div className="flex items-center gap-2">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f0f0f', border: '0.5px solid #2a2a2a', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', color: '#666' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#532fcf' }} />
                  ElevenLabs v3
                </div>
                <div style={{ width: '0.5px', height: '16px', background: '#1e1e1e', margin: '0 4px' }} />
                <div style={{ background: '#0f0f0f', border: '0.5px solid #2a2a2a', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', color: '#666' }}>🎵 Music</div>
                <div style={{ background: '#0f0f0f', border: '0.5px solid #2a2a2a', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', color: '#666' }}>🎤 Voiceover</div>
                <button style={{ marginLeft: 'auto', background: '#532fcf', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '12px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                  ⚡ Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
