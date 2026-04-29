export interface RoomTheme {
  key: string;
  label: string;
  description: string;
  floorColor: string;
  ambientColor: string;
  ambientIntensity: number;
  accentColor: string;
  skyColor: string;
}

export const THEMES: Record<string, RoomTheme> = {
  default: {
    key: 'default',
    label: 'Lobby',
    description: 'A neutral, well-lit space.',
    floorColor: '#d4cfc4',
    ambientColor: '#ffffff',
    ambientIntensity: 0.6,
    accentColor: '#4f46e5',
    skyColor: '#e8eef7',
  },
  hearth: {
    key: 'hearth',
    label: 'Hearth',
    description: 'Warm light, slow conversation, fireside calm.',
    floorColor: '#5a3a2a',
    ambientColor: '#ffb37a',
    ambientIntensity: 0.55,
    accentColor: '#e07a3a',
    skyColor: '#2a1a14',
  },
  greenhouse: {
    key: 'greenhouse',
    label: 'Greenhouse',
    description: 'Bright, plant-filled, generative.',
    floorColor: '#3f6b3a',
    ambientColor: '#d4ffce',
    ambientIntensity: 0.85,
    accentColor: '#4caf50',
    skyColor: '#bde7c8',
  },
  observatory: {
    key: 'observatory',
    label: 'Observatory',
    description: 'Dim, focused, deep-work.',
    floorColor: '#1a1d2e',
    ambientColor: '#6b7cff',
    ambientIntensity: 0.35,
    accentColor: '#8b9bff',
    skyColor: '#0a0d1a',
  },
  studio: {
    key: 'studio',
    label: 'Studio',
    description: 'Crisp, neutral, broadcast-ready.',
    floorColor: '#ececec',
    ambientColor: '#ffffff',
    ambientIntensity: 0.9,
    accentColor: '#111111',
    skyColor: '#f7f7f7',
  },
};

export const DEFAULT_THEME_KEY = 'default';

export function resolveTheme(theme: unknown): RoomTheme {
  if (theme && typeof theme === 'object' && 'key' in theme) {
    const key = (theme as { key?: unknown }).key;
    if (typeof key === 'string' && THEMES[key]) return THEMES[key];
  }
  return THEMES[DEFAULT_THEME_KEY];
}
