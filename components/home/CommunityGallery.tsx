import Link from 'next/link';

const galleryImages = [
  { id: 1, prompt: 'portrait of a young woman, natural window light, Canon 50mm', gradient: 'linear-gradient(160deg, #3a2a5a, #1a1240)' },
  { id: 2, prompt: 'Tokyo street at night, rain, neon lights, shallow depth', gradient: 'linear-gradient(160deg, #2a3545, #0f1a2e)' },
  { id: 3, prompt: 'studio portrait, dramatic lighting, 85mm lens', gradient: 'linear-gradient(160deg, #3a2a2a, #1a1010)' },
  { id: 4, prompt: 'botanical garden, soft golden light, film grain', gradient: 'linear-gradient(160deg, #2a3a2a, #101a10)' },
  { id: 5, prompt: 'candid street portrait, natural light, film look', gradient: 'linear-gradient(160deg, #3a2a3a, #1a0f20)' },
  { id: 6, prompt: 'night city reflections, long exposure, moody', gradient: 'linear-gradient(160deg, #2a2a3a, #0f1020)' },
];

export default function CommunityGallery() {
  return (
    <section
      className="animate-fadeUp delay-200"
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '16px',
        marginBottom: '30px',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
        <div>
          <p className="font-[600] text-white" style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-clash)' }}>
            Community Gallery
          </p>
          <p className="font-dm" style={{ fontSize: '11px', color: '#555', margin: '2px 0 0' }}>
            Created by our users
          </p>
        </div>
        <Link
          href="/explore"
          className="font-dm font-[500] hover:text-white transition-colors duration-200"
          style={{ fontSize: '12px', color: 'var(--accent)' }}
        >
          See all ›
        </Link>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {galleryImages.map((img) => (
          <div
            key={img.id}
            className="group relative overflow-hidden"
            style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-btn)', cursor: 'pointer', background: img.gradient }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)',
                borderRadius: 'var(--radius-btn)',
                padding: '10px 8px 8px',
              }}
            >
              <p
                className="font-dm text-white"
                style={{ fontSize: '9px', lineHeight: '1.4', opacity: 0.8, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {img.prompt}
              </p>
              <button
                className="font-dm font-[600] text-white w-full"
                style={{ fontSize: '9px', background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer' }}
              >
                ✦ Try prompt
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
