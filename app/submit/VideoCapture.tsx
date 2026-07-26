'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Records straight in the browser with MediaRecorder, with a plain file input
 * as the fallback. The fallback matters more than it looks: it is what makes
 * this work on older iOS and on locked-down work laptops.
 */

type CaptureState = 'idle' | 'permission' | 'preview' | 'recording' | 'review';

interface VideoCaptureProps {
  onChange: (file: File | null) => void;
  maxBytes?: number;
}

const DEFAULT_MAX = 150 * 1024 * 1024;

function pickMimeType(): string {
  const candidates = [
    'video/mp4;codecs=avc1,mp4a',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'video/webm';
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}

export default function VideoCapture({ onChange, maxBytes = DEFAULT_MAX }: VideoCaptureProps) {
  const [state, setState] = useState<CaptureState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedSize, setRecordedSize] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [canRecord, setCanRecord] = useState(false);

  const livePreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    setCanRecord(
      typeof navigator !== 'undefined' &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== 'undefined',
    );
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function requestCamera() {
    setError(null);
    setState('permission');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setState('preview');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not access the camera';
      setError(
        /permission|denied/i.test(msg)
          ? 'Camera access was blocked. Allow it in your browser, then try again, or upload a video instead.'
          : msg,
      );
      setState('idle');
    }
  }

  // iOS Safari drops srcObject when the parent re-renders or the recorder
  // starts, so the preview gets re-bound on every state change that keeps it
  // mounted, and re-played if something pauses it.
  useEffect(() => {
    if (state !== 'preview' && state !== 'recording') return;
    const stream = streamRef.current;
    const video = livePreviewRef.current;
    if (!stream || !video) return;

    if (video.srcObject !== stream) video.srcObject = stream;
    const play = () => void video.play().catch(() => undefined);
    play();
    video.addEventListener('pause', play);
    return () => video.removeEventListener('pause', play);
  }, [state]);

  function startRecording() {
    if (!streamRef.current) return;
    const mimeType = pickMimeType();
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) {
          setError('That recording came back empty. Try again.');
          setState('idle');
          return;
        }
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(URL.createObjectURL(blob));
        setRecordedSize(blob.size);
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        onChange(new File([blob], `testimonial-${Date.now()}.${ext}`, { type: mimeType }));
        setState('review');
        stopStream();
      };

      recorder.start(1000);
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      tickRef.current = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 200);
      setState('recording');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The recorder would not start');
      setState('preview');
    }
  }

  function stopRecording() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    recorderRef.current?.stop();
  }

  function reset() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedSize(0);
    setElapsedMs(0);
    onChange(null);
    setState('idle');
  }

  function handleFileFallback(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('That does not look like a video file.');
      onChange(null);
      return;
    }
    if (file.size > maxBytes) {
      setError(`That video is too large. The limit is ${Math.round(maxBytes / 1024 / 1024)}MB.`);
      onChange(null);
      return;
    }

    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(URL.createObjectURL(file));
    setRecordedSize(file.size);
    onChange(file);
    setError(null);
    setState('review');
  }

  return (
    <div className="space-y-4">
      {state === 'idle' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {canRecord && (
              <button type="button" onClick={requestCamera} className="v-btn">
                <span aria-hidden="true">●</span> Record now
              </button>
            )}
            <label className="v-btn-secondary cursor-pointer">
              <span aria-hidden="true">↑</span> Upload a video
              <input type="file" accept="video/*" onChange={handleFileFallback} className="sr-only" />
            </label>
          </div>
          <p className="text-xs text-zinc-500">Any format works. Phone, laptop, whatever you have.</p>
        </div>
      )}

      {state === 'permission' && <p className="text-sm text-zinc-500">Asking for camera access...</p>}

      {(state === 'preview' || state === 'recording') && (
        <div className="space-y-3">
          <div className="relative flex max-h-[28vh] sm:max-h-[38vh] justify-center overflow-hidden rounded-xl bg-black">
            <video
              ref={livePreviewRef}
              autoPlay
              muted
              playsInline
              disablePictureInPicture
              className="block h-auto max-h-[28vh] sm:max-h-[38vh] w-auto max-w-full"
              style={{ transform: 'scaleX(-1)' }}
            />
            {state === 'recording' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="font-mono text-xs text-white">REC {formatTime(elapsedMs)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {state === 'preview' ? (
              <>
                <button type="button" onClick={startRecording} className="v-btn">
                  <span aria-hidden="true">●</span> Start recording
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    setState('idle');
                  }}
                  className="v-btn-secondary"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="v-btn bg-red-600 text-white hover:bg-red-700"
              >
                <span aria-hidden="true">■</span> Stop recording
              </button>
            )}
          </div>

        </div>
      )}

      {state === 'review' && recordedUrl && (
        <div className="space-y-3">
          <video
            src={recordedUrl}
            controls
            playsInline
            className="mx-auto block max-h-[28vh] sm:max-h-[38vh] w-auto max-w-full rounded-xl bg-black"
          />
          <div className="flex items-center gap-4">
            <button type="button" onClick={reset} className="v-btn-secondary">
              Record again
            </button>
            <p className="font-mono text-xs text-zinc-500">
              {(recordedSize / 1024 / 1024).toFixed(1)}MB ready to send
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
