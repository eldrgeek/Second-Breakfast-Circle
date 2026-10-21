import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createdChannels, resetSupabaseMock } from '../test/mocks/supabase';

vi.mock('./supabase', () => import('../test/mocks/supabase'));

import WebRTCManager from './webrtc';

beforeEach(() => {
  resetSupabaseMock();
});

describe('WebRTCManager signaling channel reuse', () => {
  it('subscribes exactly one signaling channel during setup', async () => {
    new WebRTCManager('user-a', () => {});
    await Promise.resolve();
    const subscribed = createdChannels.filter(c => c.__subscribed);
    expect(subscribed.length).toBe(1);
    expect(subscribed[0].__name).toBe('webrtc-signaling');
  });

  it('reuses the same subscribed channel for outbound sends (no new channels per send)', async () => {
    const mgr = new WebRTCManager('user-a', () => {});
    await Promise.resolve();

    const channelsAfterSetup = createdChannels.length;
    expect(channelsAfterSetup).toBe(1);

    await mgr.connectToUser('user-b');
    // trigger negotiation manually to invoke send()
    const peer: any = (mgr as any).connections.get('user-b');
    await peer.connection.onnegotiationneeded?.();
    // also fire an ICE candidate
    await peer.connection.onicecandidate?.({ candidate: { candidate: 'fake' } });

    // BUG: current code calls supabase.channel('webrtc-signaling') inside send paths,
    // creating new unsubscribed channels each time. The fix should reuse the
    // subscribed channel from setupSignaling().
    const newChannels = createdChannels.length - channelsAfterSetup;
    expect(
      newChannels,
      'send() must reuse the subscribed signaling channel, not create a new one each time'
    ).toBe(0);

    // And the send must have happened on the originally subscribed channel.
    const subscribed = createdChannels.find(c => c.__subscribed)!;
    expect(subscribed.send).toHaveBeenCalled();
  });
});

describe('WebRTCManager ICE server config', () => {
  it('iceServers includes both STUN and TURN entries', async () => {
    const mgr = new WebRTCManager('user-a', () => {});
    await Promise.resolve();

    const captured: any[] = [];
    const originalRTC = (globalThis as any).RTCPeerConnection;
    (globalThis as any).RTCPeerConnection = class extends originalRTC {
      constructor(config: any) { super(); captured.push(config); }
    };

    try {
      await mgr.connectToUser('user-b');
    } finally {
      (globalThis as any).RTCPeerConnection = originalRTC;
    }

    expect(captured.length).toBeGreaterThan(0);
    const urls = captured[0].iceServers.flatMap((s: any) =>
      Array.isArray(s.urls) ? s.urls : [s.urls]
    );
    expect(urls.some((u: string) => u.startsWith('stun:'))).toBe(true);
    expect(
      urls.some((u: string) => u.startsWith('turn:') || u.startsWith('turns:')),
      'ICE config should include at least one TURN server for NAT traversal'
    ).toBe(true);
  });
});
