import type { Metadata } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import Providers from '../components/layout/Providers';
import CookieConsentBanner from '../components/layout/CookieConsent';
import type { ReactNode } from 'react';

const syne = Syne({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-syne',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://keyo.studio'),
  title: {
    default: 'Keyo Studio — AI Creative Platform',
    template: '%s | Keyo Studio',
  },
  description: 'Infrastructure for AI Video & Image Gen. Generate images, videos and audio using top AI models in one place.',
  keywords: ['AI image generation', 'AI video generation', 'AI audio generation', 'AI creative platform', 'text to image', 'text to video'],
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'Keyo Studio — AI Creative Platform',
    description: 'Infrastructure for AI Video & Image Gen. Generate images, videos and audio using top AI models in one place.',
    url: 'https://keyo.studio',
    siteName: 'Keyo Studio',
    images: [
      {
        url: '/ot-banner.png',
        width: 1200,
        height: 630,
        alt: 'Keyo Studio — AI Creative Platform',
      },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Keyo Studio — AI Creative Platform',
    description: 'Infrastructure for AI Video & Image Gen. Generate images, videos and audio using top AI models in one place.',
    images: ['/ot-banner.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://keyo.studio/#organization',
      name: 'Keyo Studio',
      url: 'https://keyo.studio',
      logo: {
        '@type': 'ImageObject',
        url: 'https://keyo.studio/favicon.png',
      },
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://keyo.studio/#website',
      url: 'https://keyo.studio',
      name: 'Keyo Studio',
      description: 'Infrastructure for AI Video & Image Gen',
      publisher: { '@id': 'https://keyo.studio/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://keyo.studio/?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Keyo Studio',
      operatingSystem: 'Web',
      applicationCategory: 'MultimediaApplication',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description: 'Infrastructure for AI Video & Image Gen. Generate images, videos and audio using top AI models.',
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" translate="no">
      <head>
        {/* Clash Display via Fontshare CDN */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${syne.variable} ${dmSans.variable} font-dm antialiased`}>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: '#532fcf',
              colorBackground: '#0f0f0f',
              colorText: '#f0f0f0',
              colorInputBackground: '#161616',
              colorInputText: '#f0f0f0',
              borderRadius: '0.75rem',
            },
          }}
        >
          <Providers>
            {children}
          </Providers>
          <CookieConsentBanner />
        </ClerkProvider>
      </body>
    </html>
  );
}
