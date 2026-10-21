import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tryImport } from '../test/optional';

const connectMock = vi.fn(async () => undefined);
const disconnectMock = vi.fn(async () => undefined);
const onMock = vi.fn();

class FakeRoom {
  connect = connectMock;
  disconnect = disconnectMock;
  on = onMock;
  localParticipant = { publishTrack: vi.fn() };
  state = 'disconnected';
}

vi.mock('livekit-client', () => ({
  Room: FakeRoom,
  RoomEvent: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    ParticipantConnected: 'participantConnected',
    TrackSubscribed: 'trackSubscribed',
  },
  Track: { Source: { Camera: 'camera', Microphone: 'microphone' } },
}));

beforeEach(() => {
  connectMock.mockClear();
  disconnectMock.mockClear();
  onMock.mockClear();
});

describe('LiveKit room connection (sync video feature)', () => {
  it('connects to the configured LiveKit URL with a token', async () => {
    const mod = await tryImport<any>('./livekit');
    if (!mod) return; // feature not landed yet

    const Manager = mod.LiveKitManager ?? mod.default;
    expect(Manager, 'expected src/lib/livekit.ts to export LiveKitManager').toBeTruthy();

    const m = new Manager();
    await m.connect('wss://livekit.example/room', 'fake-jwt-token');

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledWith(
      'wss://livekit.example/room',
      'fake-jwt-token'
    );
  });

  it('registers handlers for Connected / ParticipantConnected / TrackSubscribed', async () => {
    const mod = await tryImport<any>('./livekit');
    if (!mod) return;
    const Manager = mod.LiveKitManager ?? mod.default;

    const m = new Manager();
    await m.connect('wss://livekit.example/room', 'jwt');

    const events = onMock.mock.calls.map(c => c[0]);
    expect(events).toEqual(
      expect.arrayContaining([
        'connected',
        'participantConnected',
        'trackSubscribed',
      ])
    );
  });

  it('disconnect tears down the room', async () => {
    const mod = await tryImport<any>('./livekit');
    if (!mod) return;
    const Manager = mod.LiveKitManager ?? mod.default;

    const m = new Manager();
    await m.connect('wss://livekit.example/room', 'jwt');
    await m.disconnect();
    expect(disconnectMock).toHaveBeenCalled();
  });
});
