'use client';
import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const plans = [
  {
    id: "starter",
    name: "Starter",
    desc: "For first-time AI content creators",
    price: 19,
    credits: 200,
    featured: false,
    breakdown: [
      { icon: "image", main: "100 image generations", sub: "Nano Banana Pro · 2 credits each" },
      { icon: "video", main: "~23 video clips", sub: "Kling 3.0 · ~8.7 credits each" },
    ],
    cta: "Get started",
    ctaStyle: "outline",
  },
  {
    id: "plus",
    name: "Plus",
    desc: "For consistent and easy AI content creation",
    price: 49,
    credits: 1000,
    featured: true,
    breakdown: [
      { icon: "image", main: "500 image generations", sub: "Nano Banana Pro · 2 credits each" },
      { icon: "video", main: "~114 video clips", sub: "Kling 3.0 · ~8.7 credits each" },
    ],
    cta: "Get Plus",
    ctaStyle: "primary",
  },
];

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<'starter' | 'plus' | null>(null);

  const handleCheckout = async (plan: 'starter' | 'plus') => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Something went wrong. Please try again.');
        setLoadingPlan(null);
      }
    } catch {
      alert('Something went wrong. Please try again.');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="font-dm" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ paddingTop: '60px' }}>

        {/* ── Hero ── */}
        <div className="relative" style={{ padding: '60px 32px 52px', overflow: 'hidden', textAlign: 'center' }}>

          {/* Dot grid */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(120,80,255,0.13) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 100%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Glow orb */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: '-80px', left: '50%',
            width: '800px', height: '600px',
            background: 'radial-gradient(ellipse at center, rgba(83,47,207,0.2) 0%, rgba(60,30,180,0.08) 40%, transparent 68%)',
            transform: 'translateX(-50%)',
            borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Top shimmer */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.45), transparent)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          <div className="relative" style={{ zIndex: 1 }}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2" style={{
              background: 'rgba(83,47,207,0.1)',
              border: '0.5px solid rgba(83,47,207,0.3)',
              borderRadius: '20px',
              padding: '4px 12px',
              marginBottom: '20px',
            }}>
              <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '9px' }}>✦</span>
              <span className="font-dm" style={{ color: 'rgba(120,80,255,0.7)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Simple pricing
              </span>
            </div>

            <h1 className="font-clash" style={{
              fontSize: 'clamp(32px, 5vw, 54px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: '14px',
              color: '#fff',
            }}>
              Create more,{' '}
              <span style={{
                background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                think less
              </span>
            </h1>

            <p className="font-dm" style={{ color: 'rgba(255,255,255,0.32)', fontSize: '14px', lineHeight: 1.7, maxWidth: '360px', margin: '0 auto' }}>
              One credit system across images, video, and audio. Upgrade or cancel anytime.
            </p>
          </div>
        </div>

        {/* ── Cards ── */}
        <div style={{ maxWidth: '740px', margin: '0 auto', padding: '0 32px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="relative flex flex-col"
              style={{
                background: plan.featured
                  ? 'linear-gradient(160deg, rgba(83,47,207,0.12) 0%, var(--bg-card) 60%)'
                  : 'var(--bg-card)',
                border: plan.featured ? '0.5px solid rgba(83,47,207,0.45)' : '0.5px solid #1e1e1e',
                borderRadius: 'var(--radius-card)',
                padding: '28px',
                boxShadow: plan.featured ? '0 0 40px rgba(83,47,207,0.12)' : 'none',
              }}
            >
              {plan.featured && (
                <div style={{
                  position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(90deg, #532fcf, #7c5cf0)',
                  color: '#fff', fontSize: '11px', fontWeight: 600,
                  padding: '4px 16px', borderRadius: '20px',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  <span style={{ fontSize: '9px' }}>✦</span>
                  Most popular
                </div>
              )}

              {/* Plan name */}
              <div style={{ marginBottom: '20px' }}>
                <div className="font-clash" style={{ color: '#fff', fontSize: '17px', fontWeight: 600, marginBottom: '5px' }}>{plan.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: '12px', lineHeight: 1.5 }}>{plan.desc}</div>
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '18px' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '16px', fontWeight: 500 }}>$</span>
                <span className="font-clash" style={{ color: '#fff', fontSize: '44px', fontWeight: 700, letterSpacing: '-2px' }}>{plan.price}</span>
                <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: '13px', marginLeft: '2px' }}>/mo</span>
              </div>

              {/* Credits pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(83,47,207,0.12)',
                border: '0.5px solid rgba(83,47,207,0.25)',
                borderRadius: '8px', padding: '6px 12px', marginBottom: '20px',
              }}>
                <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '8px' }}>✦</span>
                <span style={{ color: '#9b7eff', fontSize: '14px', fontWeight: 700 }}>{plan.credits.toLocaleString()}</span>
                <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: '12px' }}>credits / month</span>
              </div>

              {/* Divider */}
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', marginBottom: '18px' }} />

              {/* Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {plan.breakdown.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '8px',
                      background: 'rgba(83,47,207,0.1)',
                      border: '0.5px solid rgba(83,47,207,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {item.icon === 'image' ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9b7eff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9b7eff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500, lineHeight: 1.3 }}>{item.main}</div>
                      <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px', marginTop: '2px' }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleCheckout(plan.id as 'starter' | 'plus')}
                disabled={loadingPlan !== null}
                className="font-dm"
                style={{
                  width: '100%',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loadingPlan !== null ? 'not-allowed' : 'pointer',
                  marginTop: 'auto',
                  transition: 'opacity 0.2s, filter 0.2s',
                  opacity: loadingPlan !== null ? 0.6 : 1,
                  border: plan.ctaStyle === 'primary' ? 'none' : '0.5px solid rgba(255,255,255,0.1)',
                  background: plan.ctaStyle === 'primary'
                    ? 'linear-gradient(135deg, #532fcf, #7c5cf0)'
                    : 'rgba(255,255,255,0.04)',
                  color: plan.ctaStyle === 'primary' ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {loadingPlan === plan.id ? 'Loading...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '12px', paddingBottom: '48px' }}>
          No contracts · Cancel anytime ·{' '}
          <a href="mailto:hello@keyo.studio" style={{ color: 'rgba(120,80,255,0.7)', textDecoration: 'none' }}>
            Enterprise plan →
          </a>
        </div>

        <Footer />
      </main>
    </div>
  );
}
