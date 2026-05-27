import Link from 'next/link';

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
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
      />
      <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} />
    </Link>
  );
}
