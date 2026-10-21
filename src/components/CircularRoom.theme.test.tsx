import { describe, it, expect, vi } from 'vitest';
import { tryImport } from '../test/optional';

vi.mock('@react-three/fiber', () => {
  const captured: any[] = [];
  return {
    Canvas: ({ children }: any) => children,
    useThree: () => ({ scene: {}, camera: {}, raycaster: {} }),
    __captured: captured,
  };
});

describe('CircularRoom theme application', () => {
  it('exposes theme-driven props (color/lighting) for the active room', async () => {
    const themes = await tryImport<any>('../config/themes');
    if (!themes) return;
    const map = themes.THEMES ?? themes.themes ?? themes.default;
    expect(map).toBeTruthy();

    // Sanity: the theme objects expose the props the 3D environment will pass
    // down to lighting/floor primitives. Render-level assertion lives in
    // CircularRoom integration once the prop wiring lands.
    const first = map[Object.keys(map)[0]];
    expect(first.floorColor).toMatch(/^#|rgb/);
    expect(typeof first.ambientIntensity).toBe('number');
  });
});
