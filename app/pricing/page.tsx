'use client';
import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan } from '@/lib/plans';

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: "starter", name: "Starter", description: "For first-time AI content creators",
    price_usd: 19, credits: 200, featured: false, cta_text: "Get started", cta_style: "outline", sort_order: 1,
    breakdown: [
      { icon: "image", main: "100 image generations", sub: "Nano Banana Pro · 2 credits each" },
      { icon: "video", main: "~23 video clips", sub: "Kling 3.0 · ~8.7 credits each" },
    ],
  },
  {
    id: "plus", name: "Plus", description: "For consistent and easy AI content creation",
    price_usd: 49, credits: 1000, featured: true, cta_text: "Get Plus", cta_style: "primary", sort_order: 2,
    breakdown: [
      { icon: "image", main: "500 image generations", sub: "Nano Banana Pro · 2 credits each" },
      { icon: "video", main: "~114 video clips", sub: "Kling 3.0 · ~8.7 credits each" },
    ],
  },
];

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<'starter' | 'plus' | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(FALLBACK_PLANS);

  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(d => { if (d.plans?.length) setPlans(d.plans) })
      .catch(() => {});
  }, []);

  const handleCheckout = async (plan: 'starter' | 'plus') => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/liqpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.data && data.signature) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://www.liqpay.ua/api/3/checkout';
        form.acceptCharset = 'utf-8';
        const dataInput = document.createElement('input');
        dataInput.type = 'hidden'; dataInput.name = 'data'; dataInput.value = data.data;
        const sigInput = document.createElement('input');
        sigInput.type = 'hidden'; sigInput.name = 'signature'; sigInput.value = data.signature;
        form.appendChild(dataInput);
        form.appendChild(sigInput);
        document.body.appendChild(form);
        form.submit();
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
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

      <main style={{ paddingTop: '60px', position: 'relative', overflow: 'hidden' }}>

        {/* ── Background glow — spans hero + cards seamlessly ── */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)',
          width: '1200px', height: '1000px',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(95,55,220,0.4) 0%, rgba(70,35,190,0.2) 30%, rgba(50,20,150,0.07) 55%, transparent 72%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* ── Dot grid — spans hero + cards, fades naturally ── */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '800px',
          backgroundImage: 'radial-gradient(rgba(120,80,255,0.14) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 90% 65% at 50% 8%, black 10%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 65% at 50% 8%, black 10%, transparent 75%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* ── Hero ── */}
        <div className="relative px-5 md:px-8" style={{ paddingTop: '60px', paddingBottom: '40px', textAlign: 'center' }}>

          {/* Top shimmer */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(140,90,255,0.6), transparent)',
            pointerEvents: 'none',
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
        <div className="grid grid-cols-1 md:grid-cols-2 px-4 md:px-8" style={{ maxWidth: '760px', margin: '-16px auto 0', paddingBottom: '60px', gap: '16px' }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col${plan.featured ? ' order-first md:order-none' : ''}`}
              style={{
                background: plan.featured
                  ? 'radial-gradient(ellipse 100% 55% at 50% 0%, rgba(83,47,207,0.28) 0%, rgba(83,47,207,0.08) 55%, rgba(83,47,207,0) 100%), #0e0e0e'
                  : '#0e0e0e',
                border: plan.featured
                  ? '0.5px solid rgba(100,65,220,0.55)'
                  : '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: '18px',
                padding: 'clamp(20px, 5vw, 32px) clamp(16px, 4vw, 28px) clamp(20px, 4vw, 28px)',
                boxShadow: plan.featured
                  ? '0 0 0 1px rgba(83,47,207,0.06), 0 24px 60px rgba(83,47,207,0.2), inset 0 1px 0 rgba(140,100,255,0.18)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                overflow: 'hidden',
              }}
            >
              {/* Featured top highlight line */}
              {plan.featured && (
                <div aria-hidden style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                  background: 'linear-gradient(90deg, transparent 5%, rgba(140,100,255,0.65) 40%, rgba(170,130,255,0.9) 50%, rgba(140,100,255,0.65) 60%, transparent 95%)',
                }} />
              )}

              {/* Most popular badge */}
              {plan.featured && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #5c3dd8 0%, #9b7eff 100%)',
                  color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                  padding: '5px 16px', borderRadius: '0 0 10px 10px',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px',
                  boxShadow: '0 4px 16px rgba(83,47,207,0.45)',
                }}>
                  <span style={{ fontSize: '8px' }}>✦</span> Most popular
                </div>
              )}

              {/* Plan name */}
              <div style={{ marginBottom: '24px', paddingTop: plan.featured ? '12px' : '0' }}>
                <div className="font-clash" style={{ color: '#fff', fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', marginBottom: '6px' }}>{plan.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '12px', lineHeight: 1.6 }}>{plan.description}</div>
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0', marginBottom: '20px' }}>
                <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '18px', fontWeight: 400, marginBottom: '7px', marginRight: '3px' }}>$</span>
                <span className="font-clash" style={{ color: '#fff', fontSize: 'clamp(40px, 10vw, 52px)', fontWeight: 700, letterSpacing: '-3px', lineHeight: 1 }}>{plan.price_usd}</span>
                <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '13px', marginBottom: '8px', marginLeft: '6px' }}>/mo</span>
              </div>

              {/* Credits pill — full width */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: plan.featured ? 'rgba(83,47,207,0.16)' : 'rgba(255,255,255,0.04)',
                border: plan.featured ? '0.5px solid rgba(100,65,220,0.35)' : '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '10px 14px', marginBottom: '24px',
              }}>
                <span style={{ color: plan.featured ? 'rgba(160,120,255,0.85)' : 'rgba(255,255,255,0.25)', fontSize: '9px' }}>✦</span>
                <span style={{ color: plan.featured ? '#c4aeff' : 'rgba(255,255,255,0.75)', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>{plan.credits.toLocaleString()}</span>
                <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '12px' }}>credits / month</span>
              </div>

              {/* Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '28px' }}>
                {plan.breakdown.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.025)',
                    border: '0.5px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                      background: plan.featured ? 'rgba(83,47,207,0.18)' : 'rgba(255,255,255,0.05)',
                      border: plan.featured ? '0.5px solid rgba(100,65,220,0.28)' : '0.5px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.icon === 'image' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.featured ? '#a87fff' : 'rgba(255,255,255,0.35)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.featured ? '#a87fff' : 'rgba(255,255,255,0.35)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: '13px', fontWeight: 500, lineHeight: 1.3 }}>{item.main}</div>
                      <div style={{ color: 'rgba(255,255,255,0.24)', fontSize: '11px', marginTop: '1px' }}>{item.sub}</div>
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
                  borderRadius: '11px',
                  padding: '13px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loadingPlan !== null ? 'not-allowed' : 'pointer',
                  marginTop: 'auto',
                  transition: 'opacity 0.2s',
                  opacity: loadingPlan !== null ? 0.5 : 1,
                  letterSpacing: '0.1px',
                  border: plan.cta_style === 'primary' ? 'none' : '0.5px solid rgba(255,255,255,0.1)',
                  background: plan.cta_style === 'primary'
                    ? 'linear-gradient(135deg, #5c3dd8 0%, #9b7eff 100%)'
                    : 'rgba(255,255,255,0.05)',
                  color: plan.cta_style === 'primary' ? '#fff' : 'rgba(255,255,255,0.5)',
                  boxShadow: plan.cta_style === 'primary' ? '0 4px 24px rgba(83,47,207,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                }}
              >
                {loadingPlan === plan.id ? 'Loading…' : plan.cta_text}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="px-4" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '12px', paddingBottom: '48px' }}>
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
