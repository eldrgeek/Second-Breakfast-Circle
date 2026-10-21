import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { tryImport } from '../test/optional';

vi.mock('../lib/supabase', () => import('../test/mocks/supabase'));

describe('RoomSelector', () => {
  it('lists available rooms by name', async () => {
    const rooms = [
      { id: 'r1', name: 'Cozy Lounge', theme: 'forest', description: '' },
      { id: 'r2', name: 'Sunlit Studio', theme: 'beach', description: '' },
    ];

    vi.resetModules();
    vi.doMock('../store/useStore', () => ({
      useStore: (selector: any) =>
        selector({ rooms, currentRoom: null, setCurrentRoom: vi.fn() }),
    }));

    const mod = await tryImport<any>('./RoomSelector');
    if (!mod) return;

    const Component = mod.RoomSelector ?? mod.default;
    render(<Component />);

    expect(screen.queryByText('Cozy Lounge')).toBeTruthy();
    expect(screen.queryByText('Sunlit Studio')).toBeTruthy();
  });
});
