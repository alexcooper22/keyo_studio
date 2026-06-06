'use client';

interface ToolCardProps {
  href: string;
  videoSrc: string;
  label?: string;
}

const styles = `
  .tc-video {
    transition: transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .tool-card:hover .tc-video {
    transform: scale(1.06);
  }
  .tc-border {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    border: 1px solid transparent;
    transition: border-color 0.4s ease, box-shadow 0.4s ease;
    pointer-events: none;
    z-index: 20;
  }
  .tool-card:hover .tc-border {
    border-color: rgba(130,80,255,0.5);
    box-shadow: inset 0 0 30px rgba(100,50,220,0.12), 0 0 40px rgba(100,50,220,0.15);
  }
  .tc-label {
    transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
    transform: translateY(4px);
    opacity: 0.85;
  }
  .tool-card:hover .tc-label {
    transform: translateY(0px);
    opacity: 1;
  }
  .tc-shadow {
    transition: opacity 0.4s ease;
    opacity: 0.85;
  }
  .tool-card:hover .tc-shadow {
    opacity: 1;
  }
`;

export default function ToolCard({ href, videoSrc, label }: ToolCardProps) {
  return (
    <>
      <style>{styles}</style>
      <a
        href={href}
        className="tool-card block"
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
          className="tc-video"
          style={{ display: 'block', width: '100%', height: 'auto', zIndex: 0 }}
        />

        {/* Animated border glow */}
        <div className="tc-border" />

        {label && (
          <>
            <div className="tc-shadow" aria-hidden style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '140px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 25%, rgba(0,0,0,0.25) 55%, transparent 100%)',
              pointerEvents: 'none', zIndex: 6,
            }} />
            <div className="tc-label" style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 10 }}>
              <span className="font-clash" style={{ whiteSpace: 'nowrap', fontSize: '36px', fontWeight: 900, letterSpacing: '0.02em' }}>
                <span style={{ color: '#ffffff', textTransform: 'uppercase' }}>
                  {label?.split(' ')[0]}{' '}
                </span>
                <span style={{ textTransform: 'uppercase', color: '#b8a0fc' }}>
                  {label?.split(' ').slice(1).join(' ')}
                </span>
              </span>
            </div>
          </>
        )}
      </a>
    </>
  );
}
