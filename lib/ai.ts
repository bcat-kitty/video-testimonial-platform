import OpenAI from 'openai';
import { vouchConfig } from '@/vouch.config';

/**
 * The part that makes video testimonials usable: transcribe what they said,
 * then turn it into three short paragraphs in their own voice.
 *
 * Entirely optional. Without OPENAI_API_KEY both functions return null and the
 * video is still stored, played back, and publishable, just without text.
 */

export const aiEnabled = (): boolean => Boolean(process.env.OPENAI_API_KEY);

const client = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeVideo(videoUrl: string): Promise<string | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) {
      console.error('[vouch] could not fetch video for transcription', res.status);
      return null;
    }
    const blob = await res.blob();
    const file = new File([blob], videoUrl.split('/').pop() || 'video.mp4', {
      type: blob.type || 'video/mp4',
    });
    const transcription = await client().audio.transcriptions.create({ model: 'whisper-1', file });
    return transcription.text || null;
  } catch (err) {
    console.error('[vouch] transcription failed', err);
    return null;
  }
}

export interface StructuredTestimonial {
  situationBefore: string | null;
  whatChanged: string | null;
  recommendation: string | null;
}

function systemPrompt(): string {
  const { brandName, questions } = vouchConfig;
  return `You convert a short customer video-testimonial transcript into three brief paragraphs that read like the customer's own words.

Context: the speaker is a customer of ${brandName}. Speech-to-text sometimes mishears company and personal names. If a word is clearly a garbled version of "${brandName}", write it correctly. Do this silently.

Output strict JSON with these keys:
- "situationBefore": 1-3 sentences answering: ${questions.before}
- "whatChanged": 1-3 sentences answering: ${questions.after}
- "recommendation": 1-2 sentences answering: ${questions.recommend}

Rules:
- Stay faithful to what the speaker said. Do not invent facts, numbers, dates, or company names.
- Use the speaker's own phrasing where it works. Lightly clean filler words ("um", "uh", "you know", "like") and false starts.
- Write in first person ("we", "I"), because the speaker is the customer.
- Each field must be a complete, grammatical paragraph, or null.
- If the transcript does not cover one of the three, set that field to null. Do not fabricate.
- Return raw JSON with no markdown fences.`;
}

const clean = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t : null;
};

export async function extractStructured(transcript: string): Promise<StructuredTestimonial | null> {
  if (!aiEnabled()) return null;
  const text = transcript.trim();
  if (text.length < 30) return null;

  try {
    const completion = await client().chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: `Transcript:\n\n${text}` },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (typeof content !== 'string') return null;

    const parsed = JSON.parse(content) as Record<string, unknown>;
    return {
      situationBefore: clean(parsed.situationBefore),
      whatChanged: clean(parsed.whatChanged),
      recommendation: clean(parsed.recommendation),
    };
  } catch (err) {
    console.error('[vouch] extraction failed', err);
    return null;
  }
}
