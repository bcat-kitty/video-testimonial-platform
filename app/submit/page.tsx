import { Suspense } from 'react';
import type { Metadata } from 'next';
import TestimonialForm from './TestimonialForm';

export const metadata: Metadata = {
  // Recording links are personal. Keep them out of search results.
  robots: { index: false, follow: false },
};

export default function SubmitPage() {
  return (
    <Suspense>
      <TestimonialForm uploadsEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} />
    </Suspense>
  );
}
