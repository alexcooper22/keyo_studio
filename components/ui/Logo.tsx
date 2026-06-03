import Link from 'next/link';

interface LogoProps {
  size?: number;
  href?: string;
}

const GRADIENT_KEYO = 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.85) 100%)';
const GRADIENT_DOT  = 'linear-gradient(135deg, #c4b0ff 0%, #7c5cf0 100%)';
const GRADIENT_STUDIO = 'linear-gradient(135deg, #f0ecff 0%, #d8c8ff 50%, #c0a0ff 100%)';

export default function Logo({ size = 17, href = '/' }: LogoProps) {
  const base: React.CSSProperties = {
    fontFamily: 'var(--font-clash)',
    fontSize: `${size}px`,
    letterSpacing: '-0.02em',
  };

  const content = (
    <>
      <span style={{ ...base, fontWeight: 700, background: GRADIENT_KEYO, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        keyo
      </span>
      <span style={{ ...base, fontWeight: 700, background: GRADIENT_DOT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        .
      </span>
      <span style={{ ...base, fontWeight: 600, background: GRADIENT_STUDIO, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', opacity: 0.65 }}>
        studio
      </span>
    </>
  );

  return (
    <Link href={href} style={{ display: 'inline-flex', alignItems: 'baseline', textDecoration: 'none', flexShrink: 0 }}>
      {content}
    </Link>
  );
}
