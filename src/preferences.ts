export const BOARD_THEMES = {
  spectral: ['#e0d8bb', '#708078'],
  wood: ['#f0d9b5', '#b58863'],
  ocean: ['#d5e3e5', '#638b99'],
  slate: ['#d9dce1', '#7a8596'],
  contrast: ['#f3f0e7', '#626b72'],
} as const;
export type SoundSet = 'glass' | 'wood' | 'quiet';
export type PieceTheme = 'spectral' | 'ivory' | 'bronze';
export interface Preferences {
  version: 2;
  sound: boolean;
  soundSet: SoundSet;
  volume: number;
  alerts: boolean;
  historySound: boolean;
  board: keyof typeof BOARD_THEMES;
  pieces: PieceTheme;
  size: 'compact' | 'comfortable' | 'large';
  animation: 'system' | 'none' | 'fast' | 'smooth';
  coordinates: boolean;
  destinations: boolean;
  lastMove: boolean;
  background: boolean;
  focus: boolean;
  accent: 'mint' | 'blue' | 'amber';
}
export const DEFAULT_PREFERENCES: Preferences = {
  version: 2, sound: true, soundSet: 'glass', volume: 45, alerts: true,
  historySound: false, board: 'spectral', pieces: 'spectral', size: 'comfortable',
  animation: 'system', coordinates: false, destinations: true, lastMove: true,
  background: true, focus: false, accent: 'mint',
};
export const PREFERENCES_KEY = 'pirescacs-preferences';
// Preferences are independent of saved voyages and never change game rules.
export function normalizePreferences(value: unknown): Preferences {
  const p = { ...DEFAULT_PREFERENCES };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return p;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 && v.version !== 2) return p;
  for (const key of ['sound', 'alerts', 'historySound', 'coordinates', 'destinations', 'lastMove', 'background', 'focus'] as const)
    if (typeof v[key] === 'boolean') p[key] = v[key];
  if (v.version === 1) p.coordinates = false; // Migrate the old default; the setting remains available.
  if (typeof v.volume === 'number' && Number.isFinite(v.volume)) p.volume = Math.round(Math.max(0, Math.min(100, v.volume)));
  if (typeof v.board === 'string' && Object.hasOwn(BOARD_THEMES, v.board)) p.board = v.board as Preferences['board'];
  for (const [key, allowed] of Object.entries({ soundSet: ['glass', 'wood', 'quiet'], pieces: ['spectral', 'ivory', 'bronze'], size: ['compact', 'comfortable', 'large'], animation: ['system', 'none', 'fast', 'smooth'], accent: ['mint', 'blue', 'amber'] }))
    if (typeof v[key] === 'string' && allowed.includes(v[key] as string)) Object.assign(p, { [key]: v[key] });
  return p;
}
export function loadPreferences(): Preferences {
  try { return normalizePreferences(JSON.parse(localStorage.getItem(PREFERENCES_KEY) || 'null')); }
  catch { return { ...DEFAULT_PREFERENCES }; }
}
export function savePreferences(value: Preferences): boolean {
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(normalizePreferences(value))); return true; }
  catch { return false; }
}
export function pieceImage(color: string, role: string, theme: PieceTheme, legacy = false) {
  // Preserve the icon meanings for historical rules, too.
  return `/pieces/${theme === 'spectral' ? '' : theme + '/'}${legacy && ['bishop', 'knight'].includes(role) ? 'legacy/' : ''}${color}-${role}.svg`;
}
