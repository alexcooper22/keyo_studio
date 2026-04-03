'use client';
import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import FeatureCards from '../components/FeatureCards';
import StatsBar from '../components/StatsBar';
import AuthModal from '../components/AuthModal';

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <main className="min-h-screen flex flex-col selection:bg-[var(--accent)] selection:text-black">
        <Navbar setShowModal={setShowModal} />
        <HeroSection />
        <FeatureCards />
        <StatsBar />
      </main>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
