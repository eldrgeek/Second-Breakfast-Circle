import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tryImport } from '../test/optional';
import {
  resetSupabaseMock,
  supabase,
  createdChannels,
} from '../test/mocks/supabase';

vi.mock('./supabase', () => import('../test/mocks/supabase'));

beforeEach(() => resetSupabaseMock());

describe('Multi-room: creation', () => {
  it('createRoom inserts {name, theme, description} into the rooms table', async () => {
    const mod = await tryImport<any>('./rooms');
    if (!mod) return;

    const fn = mod.createRoom ?? mod.default?.createRoom;
    expect(fn, 'expected src/lib/rooms.ts to export createRoom').toBeTruthy();

    await fn({
      name: 'Cozy Lounge',
      theme: 'forest',
      description: 'Quiet co-working space',
    });

    expect(supabase.from).toHaveBeenCalledWith('rooms');
    const table = (supabase.from as any).mock.results.find(
      (r: any) => r.value.insert.mock.calls.length > 0
    )?.value;
    expect(table).toBeTruthy();
    expect(table.insert.mock.calls[0][0]).toMatchObject({
      name: 'Cozy Lounge',
      theme: 'forest',
      description: 'Quiet co-working space',
    });
  });

  it('listRooms returns rooms from Supabase', async () => {
    const mod = await tryImport<any>('./rooms');
    if (!mod) return;
    const fn = mod.listRooms ?? mod.default?.listRooms;
    if (!fn) return;
    const result = await fn();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Multi-room: presence scoping', () => {
  it('subscribes presence on a per-room channel name (room A and room B differ)', async () => {
    const mod = await tryImport<any>('./rooms');
    if (!mod) return;

    const subscribe = mod.subscribeToRoomPresence ?? mod.subscribeRoomPresence;
    if (!subscribe) return;

    subscribe('room-a', () => {});
    subscribe('room-b', () => {});

    const names = createdChannels.map(c => c.__name);
    const aChans = names.filter(n => n.includes('room-a'));
    const bChans = names.filter(n => n.includes('room-b'));
    expect(aChans.length).toBeGreaterThan(0);
    expect(bChans.length).toBeGreaterThan(0);
    // Room-A subscription must not also match room-B (no shared global channel).
    expect(aChans.every(n => !n.includes('room-b'))).toBe(true);
  });
});
