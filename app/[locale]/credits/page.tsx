'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useAuth } from '@/context/AuthContext';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  original_price_usd: number | null;
  is_popular: boolean;
  sort_order: number;
}

const FALLBACK_PACKAGES: CreditPackage[] = [
  { id: 's',  name: 'S',  credits: 100, price_usd: 9,  original_price_usd: null, is_popular: false, sort_order: 1 },
  { id: 'm',  name: 'M',  credits: 200, price_usd: 17, original_price_usd: 20,   is_popular: false, sort_order: 2 },
  { id: 'l',  name: 'L',  credits: 450, price_usd: 32, original_price_usd: 40,   is_popular: false, sort_order: 3 },
  { id: 'xl', name: 'XL', credits: 900, price_usd: 49, original_price_usd: 80,   is_popular: true,  sort_order: 4 },
];

export default function CreditsPage() {
  const { isSignedIn } = useClerkAuth();
  const { setShowModal } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<CreditPackage[]>(FALLBACK_PACKAGES);
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/credits/packages')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length) setPackages(d) })
      .catch(() => {});

    if (typeof window !== 'undefined' && window.location.search.includes('success=true')) {
      setSuccess(true);
    }
  }, []);

  const handlePurchase = async (packageId: string) => {
    if (!isSignedIn) { setShowModal(true); return; }
    setLoadingPkg(packageId);
    try {
      const res = await fetch('/api/stripe/credits-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
        setLoadingPkg(null);
      }
    } catch {
      alert('Something went wrong. Please try again.');
      setLoadingPkg(null);
    }
  };

  return (
    <div className="font-dm" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ paddingTop: '60px', position: 'relative', overflow: 'hidden' }}>

        {/* Background glow */}
        <div aria-hidden style={{
          position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)',
          width: '1000px', height: '800px',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(95,55,220,0.35) 0%, rgba(70,35,190,0.15) 35%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Dot grid */}
        <div aria-hidden style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '700px',
          backgroundImage: 'radial-gradient(rgba(120,80,255,0.12) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 10%, black 10%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 10%, black 10%, transparent 75%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Hero */}
        <div className="relative px-5 md:px-8" style={{ paddingTop: '60px', paddingBottom: '32px', textAlign: 'center', zIndex: 1 }}>
          <div className="inline-flex items-center gap-2" style={{
            background: 'rgba(83,47,207,0.1)', border: '0.5px solid rgba(83,47,207,0.3)',
            borderRadius: '20px', padding: '4px 12px', marginBottom: '20px',
          }}>
            <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '9px' }}>✦</span>
            <span className="font-dm" style={{ color: 'rgba(120,80,255,0.7)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Top Up Credits
            </span>
          </div>

          <h1 className="font-clash" style={{
            fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em',
            lineHeight: 1.1, marginBottom: '12px', color: '#fff',
          }}>
            Buy Additional{' '}
            <span style={{
              background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Credits
            </span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', lineHeight: 1.7 }}>
            One-time purchase. Credits are added to your balance instantly.
          </p>
        </div>

        {/* Success banner */}
        {success && (
          <div className="mx-auto px-4" style={{ maxWidth: '680px', marginBottom: '24px', zIndex: 1, position: 'relative' }}>
            <div style={{
              background: 'rgba(50,180,100,0.1)', border: '0.5px solid rgba(50,180,100,0.35)',
              borderRadius: '12px', padding: '14px 20px',
              color: 'rgba(100,220,140,0.9)', fontSize: '14px', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span>✓</span> Payment successful! Your credits have been added to your account.
            </div>
          </div>
        )}

        {/* Packages list */}
        <div className="mx-auto px-4 md:px-8" style={{ maxWidth: '680px', paddingBottom: '80px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {packages.map((pkg) => {
              const discountPct = pkg.original_price_usd
                ? Math.round((1 - pkg.price_usd / pkg.original_price_usd) * 100)
                : null;
              const isLoading = loadingPkg === pkg.id;
              const isDisabled = loadingPkg !== null;

              return (
                <div
                  key={pkg.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                    background: pkg.is_popular
                      ? 'radial-gradient(ellipse 120% 80% at 0% 50%, rgba(83,47,207,0.22) 0%, rgba(83,47,207,0.06) 50%, transparent 100%), #0e0e0e'
                      : '#0e0e0e',
                    border: pkg.is_popular ? '0.5px solid rgba(100,65,220,0.5)' : '0.5px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px',
                    padding: '18px 20px',
                    boxShadow: pkg.is_popular
                      ? '0 0 0 1px rgba(83,47,207,0.05), 0 8px 32px rgba(83,47,207,0.15)'
                      : 'none',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* Popular glow line */}
                  {pkg.is_popular && (
                    <div aria-hidden style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                      background: 'linear-gradient(90deg, transparent 5%, rgba(140,100,255,0.5) 40%, rgba(170,130,255,0.8) 50%, rgba(140,100,255,0.5) 60%, transparent 95%)',
                    }} />
                  )}

                  {/* Credits */}
                  <div style={{ flex: '1 1 140px', minWidth: '120px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span className="font-clash" style={{
                        color: '#fff', fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 700, letterSpacing: '-0.5px',
                      }}>
                        {pkg.credits.toLocaleString()} Credits
                      </span>

                      {pkg.is_popular && (
                        <span style={{
                          background: 'linear-gradient(135deg, #5c3dd8 0%, #9b7eff 100%)',
                          color: '#fff', fontSize: '10px', fontWeight: 700,
                          padding: '3px 10px', borderRadius: '20px',
                          whiteSpace: 'nowrap', letterSpacing: '0.3px',
                          boxShadow: '0 2px 10px rgba(83,47,207,0.45)',
                        }}>
                          Most Popular
                        </span>
                      )}

                      {discountPct && (
                        <span style={{
                          background: 'rgba(230,50,100,0.15)', border: '0.5px solid rgba(230,50,100,0.3)',
                          color: 'rgba(255,90,130,0.9)', fontSize: '11px', fontWeight: 700,
                          padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap',
                        }}>
                          -{discountPct}%
                        </span>
                      )}
                    </div>

                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '4px' }}>
                      ${(pkg.price_usd / pkg.credits).toFixed(3)} per credit
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {pkg.original_price_usd && (
                      <span style={{
                        color: 'rgba(255,255,255,0.22)', fontSize: '15px', fontWeight: 500,
                        textDecoration: 'line-through',
                      }}>
                        ${pkg.original_price_usd}
                      </span>
                    )}
                    <span className="font-clash" style={{
                      color: pkg.is_popular ? '#c4aeff' : '#fff',
                      fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px',
                    }}>
                      ${pkg.price_usd}
                    </span>
                  </div>

                  {/* Button */}
                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={isDisabled}
                    className="font-dm"
                    style={{
                      flexShrink: 0,
                      padding: '10px 22px',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      transition: 'opacity 0.2s, transform 0.15s',
                      opacity: isDisabled ? 0.5 : 1,
                      border: pkg.is_popular ? 'none' : '0.5px solid rgba(255,255,255,0.12)',
                      background: pkg.is_popular
                        ? 'linear-gradient(135deg, #5c3dd8 0%, #9b7eff 100%)'
                        : 'rgba(255,255,255,0.06)',
                      color: pkg.is_popular ? '#fff' : 'rgba(255,255,255,0.65)',
                      boxShadow: pkg.is_popular ? '0 4px 20px rgba(83,47,207,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isLoading ? 'Loading...' : 'Purchase'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: '12px', marginTop: '28px', lineHeight: 1.6 }}>
            Credits never expire · Secure payment via LiqPay ·{' '}
            <a href="mailto:hello@keyo.studio" style={{ color: 'rgba(120,80,255,0.5)', textDecoration: 'none' }}>
              Contact support
            </a>
          </p>
        </div>

        <Footer />
      </main>
    </div>
  );
}
