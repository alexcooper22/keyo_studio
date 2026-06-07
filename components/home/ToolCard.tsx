'use client';

interface ToolCardProps {
  href: string;
  videoSrc: string;
  label?: string;
}

const ICONS: Record<string, React.ReactNode> = {
  image: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  video: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  ),
  audio: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
};

const styles = `
  .tc-border {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    border: 1px solid transparent;
    pointer-events: none;
    z-index: 20;
  }
  .tc-pill {
    transition: border-color 0.35s ease, background 0.35s ease, transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94);
  }
  .tool-card:hover .tc-pill {
    border-color: rgba(140,90,255,0.5) !important;
    background: rgba(10,0,30,0.75) !important;
    transform: translateY(-2px);
  }
`;

export default function ToolCard({ href, videoSrc, label }: ToolCardProps) {
  const type = label?.split(' ')[1]?.toLowerCase() ?? '';
  const icon = ICONS[type] ?? null;

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

        <div className="tc-border" />

        {label && (
          <>
            <div style={{ position: 'absolute', bottom: '14px', left: '14px', zIndex: 10 }}>
              <div
                className="tc-pill"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: '50px',
                  padding: '7px 15px',
                }}
              >
                {icon && (
                  <span style={{ color: 'rgba(185,155,255,0.9)', display: 'flex', alignItems: 'center' }}>
                    {icon}
                  </span>
                )}
                <span className="font-dm" style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.03em', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                  {label}
                </span>
              </div>
            </div>
          </>
        )}
      </a>
    </>
  );
}
