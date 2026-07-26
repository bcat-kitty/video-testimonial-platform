import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Issues a short-lived token so the browser uploads the video straight to
 * blob storage, never through this server. That is what keeps a 100MB phone
 * recording from hitting a function body limit.
 *
 * Swapping storage: replace this route and the `upload()` call in
 * app/submit/TestimonialForm.tsx with your S3/R2 presigned-URL equivalent.
 * Nothing else in Vouch knows where the file lives, it only stores the URL.
 */

// Blob matches these exactly, so the list has to be explicit. Phones and
// desktop browsers between them produce a surprising spread of MIME types.
const ALLOWED_CONTENT_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/3gpp',
  'video/3gpp2',
  'video/x-matroska',
  'video/x-msvideo',
  'video/avi',
  'video/mpeg',
  'video/ogg',
  'video/x-ms-wmv',
  'application/octet-stream', // some Android browsers send this for video
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm;codecs=h264,opus',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_SIZE_BYTES = 150 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Uploads are not configured. Set BLOB_READ_WRITE_TOKEN, or use text mode.' },
      { status: 501 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Keeps this route from being used as a general-purpose file dump.
        if (!pathname.startsWith('testimonials/')) {
          throw new Error('uploads must use the testimonials/ prefix');
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_SIZE_BYTES,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[vouch] upload complete', blob.pathname);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'upload failed' },
      { status: 400 },
    );
  }
}
