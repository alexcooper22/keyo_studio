import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AI Audio Generator',
  description: 'Generate realistic sound effects, music and ambient audio from text prompts using advanced AI audio models.',
  alternates: { canonical: '/audio' },
  openGraph: {
    title: 'AI Audio Generator | Keyo Studio',
    description: 'Generate realistic sound effects, music and ambient audio from text prompts.',
    url: 'https://keyo.studio/audio',
    images: [{ url: '/ot-banner.png', width: 1200, height: 630, alt: 'AI Audio Generator — Keyo Studio' }],
  },
  twitter: {
    title: 'AI Audio Generator | Keyo Studio',
    description: 'Generate realistic sound effects, music and ambient audio from text prompts.',
  },
};

export default function AudioLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
