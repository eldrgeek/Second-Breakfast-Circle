import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('@react-three/fiber', () => ({
  useThree: () => ({ raycaster: {}, camera: {}, scene: {} }),
}));

vi.mock('../store/useStore', () => ({
  useStore: (selector: any) =>
    selector({ users: [], currentUser: null, passStick: vi.fn(), numChairs: 8 }),
}));

describe('Participants component', () => {
  it('module loads without runtime errors', async () => {
    const mod = await import('./Participants');
    expect(typeof mod.Participants).toBe('function');
  });

  it('imports the User type it references in handler signatures', () => {
    // Bug: Participants.tsx references `User` in handleClick's parameter type
    // but never imports it from '../types', breaking `tsc --noEmit`.
    // esbuild/Vite strip types so the runtime import test above passes anyway,
    // hence this static check.
    const src = readFileSync(
      resolve(__dirname, 'Participants.tsx'),
      'utf8'
    );
    if (/:\s*User(\b|\s|\|)/.test(src)) {
      expect(
        /import\s+(?:type\s+)?\{[^}]*\bUser\b[^}]*\}\s+from\s+['"]\.\.\/types['"]/.test(src),
        'Participants.tsx uses the User type — it must import { User } from "../types"'
      ).toBe(true);
    }
  });
});
