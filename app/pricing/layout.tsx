import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for Keyo Studio. Start for free and scale as you create more AI-generated images, videos and audio.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | Keyo Studio',
    description: 'Simple, transparent pricing. Start for free and scale as you create.',
    url: 'https://keyo.studio/pricing',
    images: [{ url: '/ot-banner.png', width: 1200, height: 630, alt: 'Keyo Studio Pricing' }],
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
