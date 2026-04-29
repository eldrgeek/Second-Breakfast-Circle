import { supabase } from './supabase';

const RECORDINGS_BUCKET = 'recordings';
const MAX_RECORDING_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_RECORDING_SECONDS = 600;

const CODEC_PREFERENCES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

function pickMimeType(): string {
  const Recorder = (globalThis as any).MediaRecorder;
  if (Recorder?.isTypeSupported) {
    for (const t of CODEC_PREFERENCES) {
      try {
        if (Recorder.isTypeSupported(t)) return t;
      } catch {
        // ignore
      }
    }
  }
  return 'video/webm';
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}

function randomId(): string {
  if ((globalThis.crypto as any)?.randomUUID) {
    return (globalThis.crypto as any).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface RecordingResult {
  id: string;
  url: string;
  path: string;
  durationSeconds: number;
  sizeBytes: number;
  mimeType: string;
}

export interface RecordingManagerOptions {
  userId: string;
  roomId?: string;
  bucket?: string;
  maxBytes?: number;
  maxSeconds?: number;
}

export class RecordingManager {
  private readonly userId: string;
  private readonly roomId?: string;
  private readonly bucket: string;
  private readonly maxBytes: number;
  private readonly maxSeconds: number;

  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType = 'video/webm';
  private startedAt = 0;
  private stoppedAt = 0;
  private startedPromise: Promise<void> | null = null;
  private stopPromise: Promise<RecordingResult> | null = null;

  constructor(options: RecordingManagerOptions) {
    this.userId = options.userId;
    this.roomId = options.roomId;
    this.bucket = options.bucket ?? RECORDINGS_BUCKET;
    this.maxBytes = options.maxBytes ?? MAX_RECORDING_BYTES;
    this.maxSeconds = options.maxSeconds ?? MAX_RECORDING_SECONDS;
  }

  get state(): 'inactive' | 'recording' | 'paused' {
    return (this.recorder?.state ?? 'inactive') as any;
  }

  async start(stream: MediaStream): Promise<void> {
    if (this.recorder) throw new Error('RecordingManager already started');

    const Recorder = (globalThis as any).MediaRecorder;
    if (!Recorder) throw new Error('MediaRecorder not available in this environment');

    this.mimeType = pickMimeType();
    this.chunks = [];

    const recorder: MediaRecorder = new Recorder(stream, { mimeType: this.mimeType });
    this.recorder = recorder;

    recorder.ondataavailable = (e: any) => {
      if (e?.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.startedPromise = new Promise<void>((resolve) => {
      const onStart = () => resolve();
      (recorder as any).onstart = onStart;
      // Some implementations don't fire onstart synchronously; resolve on next tick
      // as a fallback so callers aren't blocked.
      Promise.resolve().then(() => resolve());
    });

    this.startedAt = Date.now();
    recorder.start();
    await this.startedPromise;
  }

  pause() { this.recorder?.pause(); }
  resume() { this.recorder?.resume(); }

  async stop(): Promise<RecordingResult> {
    if (!this.recorder) throw new Error('RecordingManager not started');
    if (this.stopPromise) return this.stopPromise;

    const recorder = this.recorder;

    this.stopPromise = new Promise<RecordingResult>((resolve, reject) => {
      const finalize = async () => {
        try {
          this.stoppedAt = Date.now();
          const blob = new Blob(this.chunks, { type: this.mimeType });

          if (blob.size === 0) throw new Error('Recording produced no data');
          if (blob.size > this.maxBytes) {
            throw new Error(`Recording exceeds ${this.maxBytes} bytes`);
          }

          const durationSeconds = Math.max(
            1,
            Math.round((this.stoppedAt - this.startedAt) / 1000),
          );
          if (durationSeconds > this.maxSeconds) {
            throw new Error(`Recording exceeds ${this.maxSeconds}s`);
          }

          const id = randomId();
          const ext = extensionFor(this.mimeType);
          const path = `${this.userId}/${id}.${ext}`;

          const bucket = supabase.storage.from(this.bucket);
          const { error: uploadError } = await bucket.upload(path, blob, {
            contentType: this.mimeType,
            upsert: false,
          } as any);
          if (uploadError) throw uploadError;

          const { data: publicData } = bucket.getPublicUrl(path) as any;
          const url = publicData?.publicUrl ?? path;

          const insertPayload: Record<string, any> = {
            id,
            user_id: this.userId,
            url,
            duration_seconds: durationSeconds,
            size_bytes: blob.size,
            created_at: new Date().toISOString(),
          };
          if (this.roomId) insertPayload.room_id = this.roomId;

          const { error: insertError } = await supabase
            .from('recordings')
            .insert(insertPayload);
          if (insertError) throw insertError;

          resolve({
            id,
            url,
            path,
            durationSeconds,
            sizeBytes: blob.size,
            mimeType: this.mimeType,
          });
        } catch (e) {
          reject(e);
        }
      };

      (recorder as any).onstop = finalize;
    });

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    return this.stopPromise;
  }
}

export async function getSignedRecordingUrl(
  path: string,
  expiresInSeconds = 60 * 60,
  bucket = RECORDINGS_BUCKET,
): Promise<string | null> {
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error('Failed to create signed recording URL:', error);
    return null;
  }
  return data?.signedUrl ?? null;
}

export function recordingPathFromUrl(url: string): string | null {
  const m = url.match(/\/recordings\/(.+)$/);
  return m ? m[1] : null;
}

export default RecordingManager;
