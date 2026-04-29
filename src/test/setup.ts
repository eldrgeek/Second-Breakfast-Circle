import { vi } from 'vitest';

if (!(globalThis as any).MediaStream) {
  class FakeMediaStream {
    private tracks: any[];
    constructor(tracks: any[] = []) { this.tracks = tracks; }
    getTracks() { return this.tracks; }
    getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); }
    getVideoTracks() { return this.tracks.filter(t => t.kind === 'video'); }
    addTrack(t: any) { this.tracks.push(t); }
  }
  (globalThis as any).MediaStream = FakeMediaStream;
}

if (!(globalThis as any).MediaRecorder) {
  (globalThis as any).MediaRecorder = class {
    static isTypeSupported() { return true; }
    state = 'inactive';
    start = vi.fn();
    stop = vi.fn();
    pause = vi.fn();
    resume = vi.fn();
  };
}
