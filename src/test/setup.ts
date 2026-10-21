import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (!(globalThis as any).RTCPeerConnection) {
  class FakeRTCPeerConnection {
    localDescription: any = null;
    signalingState = 'stable';
    onicecandidate: ((e: any) => void) | null = null;
    ontrack: ((e: any) => void) | null = null;
    onnegotiationneeded: (() => void) | null = null;
    addTrack = vi.fn();
    createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'fake-offer' }));
    createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'fake-answer' }));
    setLocalDescription = vi.fn(async (d: any) => { this.localDescription = d; });
    setRemoteDescription = vi.fn(async () => {});
    addIceCandidate = vi.fn(async () => {});
    close = vi.fn();
  }
  (globalThis as any).RTCPeerConnection = FakeRTCPeerConnection;
}

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
