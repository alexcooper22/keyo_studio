import type { Metadata } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import Providers from '../components/Providers';
import CookieConsentBanner from '../components/CookieConsent';
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
  title: 'Keyo Studio - AI Creative Platform',
  description: 'Generate text, images and video using top AI models in one place.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'Keyo Studio - AI Creative Platform',
    description: 'Generate text, images and video using top AI models in one place.',
    url: 'https://keyo.studio',
    siteName: 'Keyo Studio',
    images: [
      {
        url: '/ot-banner.png',
        width: 1200,
        height: 630,
        alt: 'Keyo Studio',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Keyo Studio - AI Creative Platform',
    description: 'Generate text, images and video using top AI models in one place.',
    images: ['/ot-banner.png'],
  },
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
