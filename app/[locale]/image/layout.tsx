import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AI Image Generator',
  description: 'Generate stunning images from text prompts using the world\'s best AI models — Flux, Stable Diffusion, DALL-E and more.',
  alternates: { canonical: '/image' },
  openGraph: {
    title: 'AI Image Generator | Keyo Studio',
    description: 'Generate stunning images from text prompts using the world\'s best AI models.',
    url: 'https://keyo.studio/image',
    images: [{ url: '/ot-banner.png', width: 1200, height: 630, alt: 'AI Image Generator — Keyo Studio' }],
  },
  twitter: {
    title: 'AI Image Generator | Keyo Studio',
    description: 'Generate stunning images from text prompts using the world\'s best AI models.',
  },
};

export default function ImageLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
