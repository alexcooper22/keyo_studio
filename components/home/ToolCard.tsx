'use client';
import { Link } from '@/i18n/navigation';

interface ToolCardProps {
  href: string;
  videoSrc: string;
}

export default function ToolCard({ href, videoSrc }: ToolCardProps) {
  return (
    <Link
      href={href}
      className="group block"
      style={{
        borderRadius: '12px',
        background: 'var(--bg-card)',
        border: 'var(--border)',
        overflow: 'hidden',
        textDecoration: 'none',
        position: 'relative',
      }}
    >
      <video
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        style={{ display: 'block', width: '100%', height: 'auto', zIndex: 0 }}
      />
    </Link>
  );
}
