'use client';

interface ToolCardProps {
  href: string;
  videoSrc: string;
}

export default function ToolCard({ href, videoSrc }: ToolCardProps) {
  return (
    <a
      href={href}
      className="group block"
      style={{
        borderRadius: '12px',
        background: 'var(--bg-card)',
        border: 'var(--border)',
        overflow: 'hidden',
        textDecoration: 'none',
        position: 'relative',
        display: 'block',
      }}
    >
      <video
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{ display: 'block', width: '100%', height: 'auto', zIndex: 0 }}
      />
    </a>
  );
}
