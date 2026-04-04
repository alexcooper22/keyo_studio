import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import FeatureCards from '../components/FeatureCards';
import StatsBar from '../components/StatsBar';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col selection:bg-[var(--accent)] selection:text-black">
      <Navbar />
      <HeroSection />
      <FeatureCards />
      <StatsBar />
    </main>
  );
}
