import type { Metadata } from 'next';
import { vouchConfig } from '@/vouch.config';
import './globals.css';

export const metadata: Metadata = {
  title: `${vouchConfig.brandName} testimonials`,
  description: 'Collect video testimonials from your customers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ ['--vouch-accent' as string]: vouchConfig.accent }}>{children}</body>
    </html>
  );
}
