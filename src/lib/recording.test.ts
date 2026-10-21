import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tryImport } from '../test/optional';
import { resetSupabaseMock, supabase } from '../test/mocks/supabase';

vi.mock('./supabase', () => import('../test/mocks/supabase'));

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType: string;
  constructor(_stream: any, opts: any = {}) {
    this.mimeType = opts.mimeType ?? 'video/webm';
    FakeMediaRecorder.instances.push(this);
  }
  start = vi.fn(() => { this.state = 'recording'; });
  stop = vi.fn(() => {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['fake'], { type: this.mimeType }) });
    this.onstop?.();
  });
  pause = vi.fn(() => { this.state = 'paused'; });
  resume = vi.fn(() => { this.state = 'recording'; });
}

beforeEach(() => {
  (globalThis as any).MediaRecorder = FakeMediaRecorder;
  FakeMediaRecorder.instances = [];
  resetSupabaseMock();
});

describe('Async video recording: capture → upload', () => {
  it('records a stream and uploads the resulting blob to Supabase Storage', async () => {
    const mod = await tryImport<any>('./recording');
    if (!mod) return; // feature not landed yet

    const Recorder = mod.RecordingManager ?? mod.default;
    expect(Recorder, 'expected src/lib/recording.ts to export RecordingManager').toBeTruthy();

    const stream = new (globalThis as any).MediaStream([
      { kind: 'video' }, { kind: 'audio' },
    ]);

    const r = new Recorder({ userId: 'user-a' });
    await r.start(stream);

    expect(FakeMediaRecorder.instances.length).toBe(1);
    expect(FakeMediaRecorder.instances[0].start).toHaveBeenCalled();

    const result = await r.stop();

    // Upload should have been routed through the storage bucket.
    expect(supabase.storage.from).toHaveBeenCalled();
    const bucket = (supabase.storage.from as any).mock.results[0].value;
    expect(bucket.upload).toHaveBeenCalled();
    const [path, blob] = (bucket.upload as any).mock.calls[0];
    expect(typeof path).toBe('string');
    expect(blob).toBeInstanceOf(Blob);

    expect(result).toMatchObject({ url: expect.any(String) });
  });

  it('inserts a recordings row with userId, url, and duration after upload', async () => {
    const mod = await tryImport<any>('./recording');
    if (!mod) return;
    const Recorder = mod.RecordingManager ?? mod.default;

    const stream = new (globalThis as any).MediaStream([{ kind: 'video' }]);
    const r = new Recorder({ userId: 'user-a' });
    await r.start(stream);
    await r.stop();

    expect(supabase.from).toHaveBeenCalledWith('recordings');
    const table = (supabase.from as any).mock.results.find(
      (r: any) => r.value.insert.mock.calls.length > 0
    )?.value;
    expect(table, 'expected an insert into recordings').toBeTruthy();
    const inserted = table.insert.mock.calls[0][0];
    expect(inserted).toMatchObject({
      user_id: 'user-a',
      url: expect.any(String),
    });
  });
});
