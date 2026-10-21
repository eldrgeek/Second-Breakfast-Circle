import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { tryImport } from '../test/optional';

vi.mock('../lib/supabase', () => import('../test/mocks/supabase'));

const baseUser = {
  id: 'u1',
  name: 'Alice',
  avatarUrl: '',
  seatNumber: 0,
  isActive: true,
  isSpeaking: false,
  hasStick: false,
  audioEnabled: true,
  videoEnabled: true,
  color: '#fff',
  joinedAt: new Date().toISOString(),
};

function mockStore(state: any) {
  vi.doMock('../store/useStore', () => ({
    useStore: (selector: any) => selector(state),
  }));
}

describe('RosterPanel recording-notification indicator', () => {
  it('shows a recording badge for users with an active recording', async () => {
    vi.resetModules();
    mockStore({
      users: [{ ...baseUser, isRecording: true }],
      currentUser: baseUser,
      isPresencePanelVisible: true,
      togglePresencePanel: vi.fn(),
      activeRecordings: [{ id: 'r1', userId: 'u1' }],
    });

    const mod = await tryImport<any>('./RosterPanel');
    if (!mod) return;

    render(<mod.RosterPanel />);

    // The feature should render some recording indicator near Alice.
    // Accept any of: aria-label, role, data-testid, or visible "Rec" text.
    const indicator =
      screen.queryByLabelText(/recording/i) ??
      screen.queryByTestId(/recording/i) ??
      screen.queryByText(/\brec(ording)?\b/i);

    expect(
      indicator,
      'RosterPanel should render a recording indicator when a user has an active recording'
    ).toBeTruthy();
  });
});
