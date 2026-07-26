import type { Metadata } from 'next';
import { debriefConfig } from '@/debrief.config';
import './globals.css';

export const metadata: Metadata = {
  title: `${debriefConfig.brandName} testimonials`,
  description: 'Collect video testimonials from your customers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ ['--debrief-accent' as string]: debriefConfig.accent }}>{children}</body>
    </html>
  );
}
