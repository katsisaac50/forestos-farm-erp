import type { Metadata, Viewport } from 'next';
// @ts-ignore -- Next.js handles this stylesheet import.
import './globals.css';
import PwaRegister from './pwa-register';
import { SessionProvider } from '@/lib/session-context';

export const metadata: Metadata = {
  title: 'ForestOS | Masulita Green Farms',
  description: 'Eucalyptus and beekeeping management',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#244b35',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <PwaRegister />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}