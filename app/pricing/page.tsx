'use client';
import React, { useState } from "react";
import Navbar from "@/components/Navbar";
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
      {
        icon: "image",
        main: "100 image generations",
        sub: "Nano Banana Pro · 2 credits each",
      },
      {
        icon: "video",
        main: "~23 video clips",
        sub: "Kling 3.0 · ~8.7 credits each",
      },
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
      {
        icon: "image",
        main: "500 image generations",
        sub: "Nano Banana Pro · 2 credits each",
      },
      {
        icon: "video",
        main: "~114 video clips",
        sub: "Kling 3.0 · ~8.7 credits each",
      },
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
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

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
        console.error('Checkout error:', data.error);
        alert('Something went wrong. Please try again.');
        setLoadingPlan(null);
      }
    } catch (error) {
      console.error(error);
      alert('Something went wrong. Please try again.');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#080808" }}>
      <Navbar />

      {/* Hero */}
      <div className="text-center" style={{ padding: "90px 30px 44px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(83,47,207,0.15)",
            border: "0.5px solid rgba(83,47,207,0.4)",
            borderRadius: 20,
            padding: "5px 14px",
            marginBottom: 22,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b6ef5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
          </svg>
          <span style={{ color: "#8b6ef5", fontSize: 11, fontWeight: 500, letterSpacing: "0.6px", textTransform: "uppercase" }}>
            Simple pricing
          </span>
        </div>

        <h1
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-1.5px",
            lineHeight: 1.1,
            marginBottom: 12,
          }}
        >
          Create more,{" "}
          <span style={{ color: "#7c5cf0" }}>think less</span>
        </h1>

        <p style={{ color: "#777", fontSize: 14, lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
          One credit system across images, video, and audio. Upgrade or cancel anytime.
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          maxWidth: 720,
          margin: "0 auto",
          padding: "0 30px 60px",
        }}
      >
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              background: "#111",
              border: plan.featured ? "1px solid #532fcf" : "0.5px solid #1e1e1e",
              borderRadius: 14,
              padding: 28,
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {plan.featured && (
              <div
                style={{
                  position: "absolute",
                  top: -11,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#532fcf",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 16px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
                </svg>
                Most popular
              </div>
            )}

            {/* Plan name */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{plan.name}</div>
              <div style={{ color: "#777", fontSize: 12, lineHeight: 1.5 }}>{plan.desc}</div>
            </div>

            {/* Price */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 22 }}>
              <span style={{ color: "#777", fontSize: 16, fontWeight: 500 }}>$</span>
              <span style={{ color: "#fff", fontSize: 42, fontWeight: 700, letterSpacing: -2 }}>{plan.price}</span>
              <span style={{ color: "#777", fontSize: 13, marginLeft: 2 }}>/mo</span>
            </div>

            {/* Credits pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(83,47,207,0.12)",
                border: "0.5px solid rgba(83,47,207,0.25)",
                borderRadius: 8,
                padding: "6px 12px",
                marginBottom: 22,
              }}
            >
              <span style={{ color: "#8b6ef5", fontSize: 15, fontWeight: 700 }}>
                {plan.credits.toLocaleString()}
              </span>
              <span style={{ color: "#777", fontSize: 12 }}>credits / month</span>
            </div>

            <hr style={{ border: "none", borderTop: "0.5px solid #1e1e1e", marginBottom: 18 }} />

            {/* Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {plan.breakdown.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "#161616",
                      border: "0.5px solid #1e1e1e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon === "image" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c5cf0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 21V9" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c5cf0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div style={{ color: "#ccc", fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{item.main}</div>
                    <div style={{ color: "#777", fontSize: 11, marginTop: 2 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => handleCheckout(plan.id as 'starter' | 'plus')}
              disabled={loadingPlan !== null}
              style={{
                width: "100%",
                borderRadius: 10,
                padding: "12px",
                fontSize: 14,
                fontWeight: 500,
                cursor: loadingPlan !== null ? "not-allowed" : "pointer",
                marginTop: "auto",
                border: plan.ctaStyle === "primary" ? "none" : "0.5px solid #2a2a2a",
                background: plan.ctaStyle === "primary" ? "#532fcf" : "transparent",
                color: plan.ctaStyle === "primary" ? "#fff" : "#aaa",
                opacity: loadingPlan !== null ? 0.7 : 1,
              }}
            >
              {loadingPlan === plan.id ? 'Loading...' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ textAlign: "center", color: "#777", fontSize: 12, paddingBottom: 40 }}>
        No contracts · Cancel anytime ·{" "}
        <a href="mailto:hello@keyo.studio" style={{ color: "#8b6ef5", textDecoration: "none" }}>
          Enterprise plan →
        </a>
      </div>
    </div>
  );
}
