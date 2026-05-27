import Link from 'next/link';

const galleryVideos = [
  { id: 1, prompt: 'portrait of a young woman, natural window light, Canon 50mm', src: 'https://cdn.higgsfield.ai/job_set_chain_preset/2b5ee036-8873-4871-a3f8-4ed4eeab1721.mp4' },
  { id: 2, prompt: 'Tokyo street at night, rain, neon lights, shallow depth', src: 'https://cdn.higgsfield.ai/job_set_chain_preset/06bf5a41-ed5e-49bf-88c6-2d5a7aa8acdb.mp4' },
  { id: 3, prompt: 'studio portrait, dramatic lighting, 85mm lens', src: 'https://cdn.higgsfield.ai/job_set_chain_preset/d4921e56-a83d-435f-9831-709e4aa1e625.mp4' },
  { id: 4, prompt: 'botanical garden, soft golden light, film grain', src: 'https://cdn.higgsfield.ai/job_set_chain_preset/f3617f5e-64d8-41de-bbf5-3648e8229e49.mp4' },
  { id: 5, prompt: 'candid street portrait, natural light, film look', src: 'https://cdn.higgsfield.ai/job_set_chain_preset/def7ae61-e8cb-4ddc-809b-fd13473995ee.mp4' },
  { id: 6, prompt: 'night city reflections, long exposure, moody', src: 'https://cdn.higgsfield.ai/job_set_chain_preset/d29483b9-aa2b-4c59-9aa7-37044bc2c4c0.mp4' },
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
        {galleryVideos.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden"
            style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-btn)', cursor: 'pointer', background: '#0a0a0a' }}
          >
            <video
              src={item.src}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
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
                {item.prompt}
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
