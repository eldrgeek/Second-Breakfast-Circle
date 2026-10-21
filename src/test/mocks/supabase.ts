import { vi } from 'vitest';

export type FakeChannel = {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  __subscribed: boolean;
  __name: string;
};

export const createdChannels: FakeChannel[] = [];

export function makeChannel(name: string): FakeChannel {
  const ch: FakeChannel = {
    __name: name,
    __subscribed: false,
    on: vi.fn(function (this: any) { return ch; }),
    subscribe: vi.fn(function (this: any) { ch.__subscribed = true; return ch; }),
    send: vi.fn(async () => 'ok'),
    unsubscribe: vi.fn(),
  };
  createdChannels.push(ch);
  return ch;
}

export function resetSupabaseMock() {
  createdChannels.length = 0;
}

export const supabase = {
  channel: vi.fn((name: string) => makeChannel(name)),
  from: vi.fn(() => ({
    insert: vi.fn(async () => ({ data: null, error: null })),
    select: vi.fn(async () => ({ data: [], error: null })),
    update: vi.fn(async () => ({ data: null, error: null })),
    delete: vi.fn(async () => ({ data: null, error: null })),
    eq: vi.fn(function (this: any) { return this; }),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(async () => ({ data: { path: 'fake/path.webm' }, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://fake/url.webm' } })),
    })),
  },
};
