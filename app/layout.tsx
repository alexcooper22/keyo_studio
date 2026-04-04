import type { Metadata } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import Providers from '../components/Providers';

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${dmSans.variable} font-dm antialiased`}>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: '#ff3377',
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
        </ClerkProvider>
      </body>
    </html>
  );
}
