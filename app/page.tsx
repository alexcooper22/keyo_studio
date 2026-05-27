'use client';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ToolCard from '../components/home/ToolCard';
import CommunityGallery from '../components/home/CommunityGallery';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen font-dm" style={{ paddingTop: '64px', background: 'var(--bg)' }}>
        <div className="w-full" style={{ padding: '30px' }}>

          <section
            className="w-full flex flex-col items-center justify-center text-center animate-fadeUp group"
            style={{ height: 'calc(50vh - 50px)', marginBottom: '30px' }}
          >
            <h1
              className="font-[300] text-white"
              style={{ fontSize: '54px', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: '8px', fontFamily: 'var(--font-clash)' }}
            >
              Welcome to keyo.studio
            </h1>
            <p className="font-dm" style={{ fontSize: '18px', color: '#666', maxWidth: '600px', lineHeight: '1.6' }}>
              Generate images, videos and audio with top AI models
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 animate-fadeUp delay-100" style={{ gap: '30px', marginBottom: '30px' }}>
            <ToolCard href="/image" videoSrc="/image-bg.mp4" />
            <ToolCard href="/video" videoSrc="/video-bg.mp4" />
            <ToolCard href="/audio" videoSrc="/audio-bg.mp4" />
          </div>

          <CommunityGallery />
        </div>

        <Footer />
      </main>
    </>
  );
}
