import { describe, it, expect } from 'vitest';
import { tryImport } from '../test/optional';

describe('Room themes', () => {
  it('exports a themes map keyed by theme name with color & lighting fields', async () => {
    const mod = await tryImport<any>('./themes');
    if (!mod) return;

    const themes = mod.THEMES ?? mod.themes ?? mod.default;
    expect(themes, 'expected src/config/themes.ts to export a themes map').toBeTruthy();

    const names = Object.keys(themes);
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const t = themes[name];
      expect(t, `theme ${name}`).toBeTruthy();
      // Required fields the 3D environment will read.
      expect(t).toHaveProperty('floorColor');
      expect(t).toHaveProperty('ambientColor');
      expect(t).toHaveProperty('ambientIntensity');
    }
  });
});
