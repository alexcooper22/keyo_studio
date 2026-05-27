import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AI Video Generator',
  description: 'Generate high-quality videos from text prompts using cutting-edge AI models. Turn your ideas into cinematic video content.',
  alternates: { canonical: '/video' },
  openGraph: {
    title: 'AI Video Generator | Keyo Studio',
    description: 'Generate high-quality videos from text prompts using cutting-edge AI models.',
    url: 'https://keyo.studio/video',
    images: [{ url: '/ot-banner.png', width: 1200, height: 630, alt: 'AI Video Generator — Keyo Studio' }],
  },
  twitter: {
    title: 'AI Video Generator | Keyo Studio',
    description: 'Generate high-quality videos from text prompts using cutting-edge AI models.',
  },
};

export default function VideoLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
