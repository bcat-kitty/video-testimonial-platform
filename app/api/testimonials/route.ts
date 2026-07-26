import { NextResponse, after } from 'next/server';
import { isValidCategory, debriefConfig } from '@/debrief.config';
import { extractStructured, transcribeVideo } from '@/lib/ai';
import { sendNewSubmissionNotification } from '@/lib/email';
import { createTestimonial, findOpenRequest, updateRequest, updateTestimonial } from '@/lib/store';

export const runtime = 'nodejs';
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  name?: string;
  role?: string;
  company?: string | null;
  companyUrl?: string | null;
  linkedinUrl?: string | null;
  email?: string;
  category?: string | null;
  situationBefore?: string | null;
  whatChanged?: string | null;
  recommendation?: string | null;
  videoUrl?: string | null;
  headshotUrl?: string | null;
  token?: string | null;
  mode?: 'video' | 'text';
};

/**
 * POST /api/testimonials
 *
 * Unauthenticated on purpose: the person submitting is a customer, not a user,
 * and will never have an account. The token from their emailed link is what
 * proves who they are.
 *
 * Under `inviteOnly` (the default) that token is required, so only people you
 * actually asked can post. Turn it off in debrief.config.ts and the page
 * becomes an open "leave us a testimonial" form; submissions without a token
 * then land unverified rather than being rejected.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    const str = (v: unknown): string | null => {
      const t = typeof v === 'string' ? v.trim() : '';
      return t ? t : null;
    };

    const name = str(body.name);
    const role = str(body.role);
    const email = str(body.email)?.toLowerCase() ?? null;
    const category = str(body.category);
    const situationBefore = str(body.situationBefore);
    const whatChanged = str(body.whatChanged);
    const recommendation = str(body.recommendation);
    const videoUrl = str(body.videoUrl);
    const token = str(body.token);
    const mode = body.mode === 'text' ? 'text' : 'video';

    if (!name || !role || !email) {
      return NextResponse.json({ success: false, error: 'Name, role, and email are required.' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, error: 'That email does not look right.' }, { status: 400 });
    }
    if (debriefConfig.categories.length > 0 && (!category || !isValidCategory(category))) {
      return NextResponse.json({ success: false, error: 'Pick which service you used.' }, { status: 400 });
    }
    if (mode === 'text' && (!situationBefore || !whatChanged || !recommendation)) {
      return NextResponse.json(
        { success: false, error: 'Please answer all three questions, or switch to video.' },
        { status: 400 },
      );
    }
    if (mode === 'video' && !videoUrl) {
      return NextResponse.json({ success: false, error: 'Please record or upload a video.' }, { status: 400 });
    }

    // A matching open request is what makes this a verified customer.
    const matched = await findOpenRequest({ token, email });

    if (debriefConfig.inviteOnly && !matched) {
      return NextResponse.json(
        {
          success: false,
          error: 'This recording link is not valid any more. Ask for a new one and we will send it over.',
        },
        { status: 403 },
      );
    }

    const created = await createTestimonial({
      name,
      role,
      company: str(body.company),
      companyUrl: str(body.companyUrl),
      linkedinUrl: str(body.linkedinUrl),
      email,
      headshotUrl: str(body.headshotUrl),
      videoUrl,
      videoTranscript: null,
      situationBefore,
      whatChanged,
      recommendation,
      category,
      verifiedCustomer: matched !== null,
    });

    if (matched) {
      await updateRequest(matched.id, { respondedAt: new Date(), testimonialId: created.id });
    }

    // Transcription takes a while and the customer should not have to wait for
    // it. The row is already saved, so the worst case is a testimonial with no
    // text yet, which the admin can see and re-run.
    after(async () => {
      await sendNewSubmissionNotification({ name, role, company: str(body.company) });

      if (!videoUrl) return;

      const transcript = await transcribeVideo(videoUrl);
      if (!transcript) return;
      await updateTestimonial(created.id, { videoTranscript: transcript });

      // Never overwrite answers the customer typed themselves.
      if (situationBefore || whatChanged || recommendation) return;

      const structured = await extractStructured(transcript);
      if (structured) await updateTestimonial(created.id, structured);
    });

    return NextResponse.json({ success: true, id: created.id });
  } catch (err) {
    console.error('[debrief] submit failed', err);
    return NextResponse.json({ success: false, error: 'Something went wrong.' }, { status: 400 });
  }
}
