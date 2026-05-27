'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ToolCard from '../components/home/ToolCard';
import CommunityGallery from '../components/home/CommunityGallery';

const cycleWords = ['images', 'videos', 'audio'] as const;

const imageExamples = [
  { prompt: 'Portrait, golden hour, 85mm lens, shallow depth of field', src: 'https://image.lexica.art/full_webp/33481a2f-e92e-4fe1-a19b-b89080dca786' },
  { prompt: 'Cyberpunk cityscape, neon reflections on wet pavement', src: 'https://image.lexica.art/full_webp/2dd1d953-ac22-41b0-9fdf-06414415316d' },
  { prompt: 'Macro flower photography, morning dew, soft bokeh', src: 'https://image.lexica.art/md/00043cc4-eb05-4e05-b8d0-a167934804b3' },
  { prompt: 'Abstract plasma energy, vibrant flowing light', src: 'https://image.lexica.art/full_jpg/78501602-575d-442c-a5a7-9fab4c30de86' },
  { prompt: 'Minimalist brutalist architecture, overcast sky', src: 'https://image.lexica.art/full_webp/11bc22b3-23fe-4c78-9735-5c9bdd83abce' },
  { prompt: 'Fantasy floating islands, dramatic cinematic lighting', src: 'https://image.lexica.art/md/02028c35-2428-4344-aac7-fb609ff52234' },
];

const videoExamples = [
  { prompt: 'Cinematic drone shot over mountain range at sunset', src: 'https://cdn.higgsfield.ai/job_set_chain_preset/340d426e-8591-4bd5-b7f1-6c3c4be34923.mp4' },
  { prompt: 'Ocean waves crashing, slow motion, ultra sharp', src: 'https://cdn.higgsfield.ai/job_set_chain_preset/3b2d004b-303b-4201-8fd5-6d286ae895ba.mp4' },
  { prompt: 'City timelapse, cars and light streaks, night', src: 'https://cdn.higgsfield.ai/job_set_chain_preset/0ad7a436-9a7d-4391-bf3a-ba1a400d6218.mp4' },
  { prompt: 'Person walking through misty forest, autumn leaves', src: 'https://cdn.higgsfield.ai/job_set_chain_preset/9342e910-75cf-4df5-aaec-379cbb9eaa73.mp4' },
];

function SectionHeader({ badge, title, href, linkLabel }: { badge: string; title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
      <div className="flex items-center gap-3">
        <div
          className="inline-flex items-center gap-1.5"
          style={{
            background: 'rgba(83,47,207,0.1)',
            border: '0.5px solid rgba(83,47,207,0.25)',
            borderRadius: '20px',
            padding: '3px 10px',
          }}
        >
          <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '8px' }}>✦</span>
          <span className="font-dm" style={{ color: 'rgba(120,80,255,0.65)', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {badge}
          </span>
        </div>
        <h2 className="font-clash" style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.01em', margin: 0 }}>
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className="font-dm transition-colors duration-200 hover:text-white"
        style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        {linkLabel}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </Link>
    </div>
  );
}

export default function Home() {
  const orb1 = useRef<HTMLDivElement>(null);
  const orb2 = useRef<HTMLDivElement>(null);
  const orb3 = useRef<HTMLDivElement>(null);
  const iconsFar = useRef<HTMLDivElement>(null);
  const iconsMid = useRef<HTMLDivElement>(null);
  const iconsNear = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);

  useEffect(() => {
    let rafId: number;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      cx += (tx - cx) * 0.04;
      cy += (ty - cy) * 0.04;
      if (orb1.current) orb1.current.style.transform = `translate(calc(-50% + ${cx * 40}px), ${cy * 28}px)`;
      if (orb2.current) orb2.current.style.transform = `translate(${cx * -24}px, ${cy * -16}px)`;
      if (orb3.current) orb3.current.style.transform = `translate(${cx * 30}px, ${cy * 22}px)`;
      if (iconsFar.current) iconsFar.current.style.transform = `translate(${cx * 6}px, ${cy * 4}px)`;
      if (iconsMid.current) iconsMid.current.style.transform = `translate(${cx * -13}px, ${cy * 9}px)`;
      if (iconsNear.current) iconsNear.current.style.transform = `translate(${cx * 22}px, ${cy * -15}px)`;
      rafId = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    rafId = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(rafId); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIndex(prev => (prev + 1) % cycleWords.length);
        setWordVisible(true);
      }, 500);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const y = window.scrollY;
      heroRef.current.style.transform = `translateY(${y * 0.25}px)`;
      heroRef.current.style.opacity = String(Math.max(0, 1 - y / 360));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Navbar />

      <main className="font-dm" style={{ paddingTop: '60px', background: 'var(--bg)', minHeight: '100vh' }}>

        {/* ── Hero + Tool cards — shared ambient glow ── */}
        <div className="relative" style={{ padding: '30px 32px 0', overflow: 'clip' }}>

          {/* Dot grid */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(120,80,255,0.13) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(ellipse 100% 55% at 50% 0%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 100% 55% at 50% 0%, black 30%, transparent 100%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          <div ref={orb1} aria-hidden="true" style={{
            position: 'absolute', top: '-60px', left: '50%',
            width: '900px', height: '700px',
            background: 'radial-gradient(ellipse at center, rgba(83,47,207,0.22) 0%, rgba(60,30,180,0.1) 40%, transparent 68%)',
            borderRadius: '50%', pointerEvents: 'none', willChange: 'transform', zIndex: 0,
          }} />
          <div ref={orb2} aria-hidden="true" style={{
            position: 'absolute', top: '5%', left: '-15%',
            width: '650px', height: '550px',
            background: 'radial-gradient(ellipse at center, rgba(100,50,220,0.12) 0%, transparent 65%)',
            borderRadius: '50%', pointerEvents: 'none', willChange: 'transform', zIndex: 0,
          }} />
          <div ref={orb3} aria-hidden="true" style={{
            position: 'absolute', top: '18%', right: '-14%',
            width: '550px', height: '480px',
            background: 'radial-gradient(ellipse at center, rgba(140,80,255,0.1) 0%, transparent 65%)',
            borderRadius: '50%', pointerEvents: 'none', willChange: 'transform', zIndex: 0,
          }} />

          {/* Top shimmer */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.45), transparent)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Hero text */}
          <section
            ref={heroRef}
            className="relative w-full flex flex-col items-center justify-center text-center"
            style={{ height: 'calc(44vh - 60px)', marginBottom: '20px', willChange: 'transform, opacity', zIndex: 1 }}
          >
            {/* Far depth layer — slowest, AI-themed */}
            <div ref={iconsFar} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', willChange: 'transform' }}>
              {/* Waveform / audio */}
              <svg style={{ position: 'absolute', left: '6%', top: '10%', opacity: 0.22, transform: 'rotate(10deg)' }} width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              {/* CPU / AI chip */}
              <svg style={{ position: 'absolute', left: '19%', top: '60%', opacity: 0.18 }} width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="8" width="8" height="8"/>
                <rect x="5" y="5" width="14" height="14" rx="1.5"/>
                <path d="M9 5V3M12 5V3M15 5V3M9 21v-2M12 21v-2M15 21v-2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2"/>
              </svg>
              {/* Microphone / audio AI */}
              <svg style={{ position: 'absolute', left: '25%', top: '30%', opacity: 0.15, transform: 'rotate(-5deg)' }} width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              {/* Image generation frame */}
              <svg style={{ position: 'absolute', right: '5%', top: '14%', opacity: 0.2, transform: 'rotate(-8deg)' }} width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              {/* Layers / content */}
              <svg style={{ position: 'absolute', right: '18%', top: '64%', opacity: 0.15, transform: 'rotate(5deg)' }} width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 22 8.5 12 15 2 8.5"/>
                <polyline points="2 15.5 12 22 22 15.5"/>
                <polyline points="2 11.5 12 18 22 11.5"/>
              </svg>
              {/* Eye / vision AI */}
              <svg style={{ position: 'absolute', right: '24%', top: '38%', opacity: 0.14 }} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>

            {/* Mid depth layer — AI network, film, play */}
            <div ref={iconsMid} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', willChange: 'transform' }}>
              {/* 4-point sparkle / AI magic */}
              <svg style={{ position: 'absolute', left: '9%', top: '42%', opacity: 0.32 }} width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round">
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              {/* Film clapperboard / video AI */}
              <svg style={{ position: 'absolute', left: '20%', top: '8%', opacity: 0.24, transform: 'rotate(7deg)' }} width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="15" rx="1.5"/>
                <polyline points="17 2 22 7 2 7 7 2 17 2"/>
                <line x1="7" y1="2" x2="7" y2="7"/>
                <line x1="12" y1="2" x2="12" y2="7"/>
                <line x1="17" y1="2" x2="17" y2="7"/>
              </svg>
              {/* Brush / creative AI */}
              <svg style={{ position: 'absolute', left: '27%', top: '58%', opacity: 0.18, transform: 'rotate(-10deg)' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3l5 5L7 22H2v-5L16 3z"/>
                <line x1="14" y1="5" x2="19" y2="10"/>
              </svg>
              {/* Play circle / video generation */}
              <svg style={{ position: 'absolute', right: '8%', top: '48%', opacity: 0.28 }} width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
              {/* Neural network nodes */}
              <svg style={{ position: 'absolute', right: '19%', top: '10%', opacity: 0.22, transform: 'rotate(-3deg)' }} width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="5" cy="19" r="2"/>
                <circle cx="19" cy="19" r="2"/>
                <circle cx="5" cy="12" r="1.5"/>
                <circle cx="19" cy="12" r="1.5"/>
                <line x1="12" y1="7" x2="5" y2="10.5"/>
                <line x1="12" y1="7" x2="19" y2="10.5"/>
                <line x1="5" y1="13.5" x2="5" y2="17"/>
                <line x1="19" y1="13.5" x2="19" y2="17"/>
                <line x1="7" y1="19" x2="17" y2="19"/>
              </svg>
              {/* Lightning / fast AI */}
              <svg style={{ position: 'absolute', right: '26%', top: '55%', opacity: 0.17, transform: 'rotate(5deg)' }} width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>

            {/* Near depth layer — fastest, largest */}
            <div ref={iconsNear} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', willChange: 'transform' }}>
              {/* Magic wand / AI generation */}
              <svg style={{ position: 'absolute', left: '3%', top: '36%', opacity: 0.42, transform: 'rotate(15deg)' }} width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="0.85" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4l5 5L7 22H2v-5L15 4z"/>
                <path d="M3 6l1-1M5 3l-1 1M20 2l1 1M4 12l1 1"/>
              </svg>
              {/* Infinity / unlimited AI */}
              <svg style={{ position: 'absolute', left: '22%', top: '22%', opacity: 0.3 }} width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1.2" strokeLinecap="round">
                <path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4zm0 0c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z"/>
              </svg>
              {/* Small sparkle near center-left */}
              <svg style={{ position: 'absolute', left: '28%', top: '50%', opacity: 0.26 }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1.3" strokeLinecap="round">
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12"/>
              </svg>
              {/* Waveform large / audio */}
              <svg style={{ position: 'absolute', right: '2%', top: '24%', opacity: 0.45, transform: 'rotate(-14deg)' }} width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="0.85" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              {/* Sparkle near center-right */}
              <svg style={{ position: 'absolute', right: '22%', top: '54%', opacity: 0.32 }} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1.2" strokeLinecap="round">
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12"/>
              </svg>
              {/* CPU small near center-right */}
              <svg style={{ position: 'absolute', right: '27%', top: '28%', opacity: 0.22, transform: 'rotate(-8deg)' }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,1)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="8" width="8" height="8"/>
                <rect x="5" y="5" width="14" height="14" rx="1.5"/>
                <path d="M9 5V3M12 5V3M15 5V3M9 21v-2M12 21v-2M15 21v-2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2"/>
              </svg>
            </div>

            <div className="inline-flex items-center gap-2 mb-4" style={{ background: 'rgba(83,47,207,0.1)', border: '0.5px solid rgba(83,47,207,0.3)', borderRadius: '20px', padding: '4px 12px' }}>
              <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '9px' }}>✦</span>
              <span className="font-dm" style={{ color: 'rgba(120,80,255,0.7)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}>AI Creative Studio</span>
            </div>

            <style>{`
              @keyframes wordIn {
                0%   { opacity: 0; transform: translateY(32px) scale(0.88) skewY(4deg); filter: blur(12px); }
                60%  { filter: blur(0px); }
                100% { opacity: 1; transform: translateY(0)    scale(1)    skewY(0deg); filter: blur(0px); }
              }
              @keyframes wordOut {
                0%   { opacity: 1; transform: translateY(0)     scale(1)    skewY(0deg);  filter: blur(0px); }
                100% { opacity: 0; transform: translateY(-24px) scale(0.92) skewY(-3deg); filter: blur(10px); }
              }
            `}</style>

            <h1 style={{ fontWeight: 700, lineHeight: 1.1, marginBottom: '12px', color: '#fff' }}>
              <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(18px, 2.8vw, 34px)', color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.01em' }}>
                Turn ideas into
              </span>
              {/* Animated cycling word — Syne 800, inline-grid for zero layout shift */}
              <span className="font-clash" style={{ display: 'inline-grid', fontSize: 'clamp(46px, 8vw, 92px)', fontWeight: 700, letterSpacing: '-0.04em', padding: '6px 20px', overflow: 'visible' }}>
                {cycleWords.map((word, i) => (
                  <span
                    key={word}
                    style={{
                      gridArea: '1/1',
                      background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      opacity: 0,
                      animation: i === wordIndex
                        ? (wordVisible ? 'wordIn 0.7s cubic-bezier(0.16,1,0.3,1) forwards' : 'wordOut 0.45s cubic-bezier(0.4,0,1,1) forwards')
                        : 'none',
                    }}
                  >
                    {word}
                  </span>
                ))}
              </span>
              <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(18px, 2.8vw, 34px)', color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.01em' }}>
                using{' '}
                <span style={{ background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  keyo.studio
                </span>
              </span>
            </h1>

            <p className="font-dm" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.32)', maxWidth: '400px', lineHeight: '1.7' }}>
              The world&apos;s best AI models in one place.
            </p>
          </section>

          {/* Tool cards */}
          <div className="relative grid grid-cols-1 md:grid-cols-3" style={{ gap: '12px', paddingBottom: '32px', zIndex: 1 }}>
            <ToolCard href="/image" videoSrc="/image-bg.mp4" />
            <ToolCard href="/video" videoSrc="/video-bg.mp4" />
            <ToolCard href="/audio" videoSrc="/audio-bg.mp4" />
          </div>

          {/* Bottom fade */}
          <div aria-hidden="true" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
            background: 'linear-gradient(to bottom, transparent, var(--bg))',
            pointerEvents: 'none', zIndex: 2,
          }} />
        </div>

        {/* ── Image generation section ── */}
        <div style={{ padding: '8px 32px 32px' }}>
          <SectionHeader badge="Image" title="Generate images" href="/image" linkLabel="Try Image" />

          <div className="grid grid-cols-3 md:grid-cols-6" style={{ gap: '8px' }}>
            {imageExamples.map((item, i) => (
              <div
                key={i}
                className="group relative overflow-hidden"
                style={{ aspectRatio: '3/4', borderRadius: '10px', background: '#0a0a0a', cursor: 'pointer' }}
              >
                <img
                  src={item.src}
                  alt={item.prompt}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 55%)', padding: '10px 8px 8px' }}
                >
                  <p className="font-dm text-white" style={{ fontSize: '9px', lineHeight: '1.4', opacity: 0.7, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.prompt}
                  </p>
                  <div className="inline-flex items-center gap-1" style={{ background: 'rgba(83,47,207,0.8)', borderRadius: '4px', padding: '3px 6px', width: 'fit-content' }}>
                    <span style={{ color: 'rgba(200,180,255,0.9)', fontSize: '8px' }}>✦</span>
                    <span className="font-dm text-white" style={{ fontSize: '9px', fontWeight: 600 }}>Try prompt</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Video generation section ── */}
        <div style={{ padding: '0 32px 32px' }}>
          <SectionHeader badge="Video" title="Generate videos" href="/video" linkLabel="Try Video" />

          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '8px' }}>
            {videoExamples.map((item, i) => (
              <div
                key={i}
                className="group relative overflow-hidden"
                style={{ aspectRatio: '16/9', borderRadius: '10px', background: '#0a0a0a', cursor: 'pointer' }}
              >
                <video
                  src={item.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)', padding: '8px' }}
                >
                  <p className="font-dm text-white" style={{ fontSize: '9px', lineHeight: '1.4', opacity: 0.65, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.prompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Community Gallery ── */}
        <div style={{ padding: '0 32px 32px' }}>
          <CommunityGallery />
        </div>

        <Footer />
      </main>
    </>
  );
}
