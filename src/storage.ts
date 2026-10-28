import { openDB } from 'idb';
import type { DrawShape } from 'chessground/draw';
import type { Analysis, EngineSettings, Side } from './engine';
import type { RulesVersion } from './engine';
import { normalizeFen } from './position.js';
export interface Voyage {
  format: 'pirescacs';
  formatVersion: 1;
  rulesVersion: RulesVersion;
  startFen?: string;
  id: string;
  created: number;
  updated: number;
  moves: string[];
  annotations: Record<string, DrawShape[]>;
  analyses: Record<string, Analysis>;
  variations: string[][];
  mode: 'bot' | 'local' | 'engine';
  player: Side;
  level: number;
  engineLevels?: { white: number; black: number };
  end?: { result: string; reason: string };
}
export function fresh(
  mode: 'bot' | 'local' | 'engine',
  player: Side,
  level: number,
): Voyage {
  return {
    format: 'pirescacs',
    formatVersion: 1,
    rulesVersion: 'pirescacs-v5',
    id: crypto.randomUUID(),
    created: Date.now(),
    updated: Date.now(),
    moves: [],
    annotations: {},
    analyses: {},
    variations: [],
    mode,
    player,
    level,
  };
}
const db = () =>
  openDB('pirescacs', 1, {
    upgrade(db) {
      db.createObjectStore('voyages', { keyPath: 'id' });
      db.createObjectStore('preferences');
    },
  });
export async function save(v: Voyage) {
  const d = await db();
  const tx = d.transaction(['voyages', 'preferences'], 'readwrite');
  await tx.objectStore('voyages').put(v);
  await tx.objectStore('preferences').put(v.id, 'active');
  await tx.done;
}
export async function list() {
  return ((await (await db()).getAll('voyages')) as Voyage[]).sort(
    (a, b) => b.updated - a.updated,
  );
}
export async function restore() {
  const d = await db();
  const id = await d.get('preferences', 'active');
  return id ? ((await d.get('voyages', id)) as Voyage) : undefined;
}
export async function remove(id: string) {
  await (await db()).delete('voyages', id);
}
export function download(
  text: string,
  filename: string,
  type = 'application/json',
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function validateFile(value: unknown): Voyage {
  if (!value || typeof value !== 'object') throw new Error('Invalid object');
  const v = value as Partial<Voyage>;
  if (
    v.format !== 'pirescacs' ||
    v.formatVersion !== 1 ||
    !['pirescacs-v1', 'pirescacs-v2', 'pirescacs-v3', 'pirescacs-v4', 'pirescacs-v5'].includes(v.rulesVersion || '') ||
    !Array.isArray(v.moves) ||
    v.moves.length > 5000 ||
    v.moves.some(
      (m) =>
        typeof m !== 'string' || !/^([a-h][1-8]){2}(@[a-h][1-8]|!)?$/.test(m),
    )
  )
    throw new Error('Invalid format');
  const clean = fresh(
    v.mode === 'engine' ? 'engine' : v.mode === 'local' ? 'local' : 'bot',
    v.player === 'black' ? 'black' : 'white',
    Number.isInteger(v.level) && v.level! >= 0 && v.level! <= 3 ? v.level! : 2,
  );
  if (v.engineLevels && [v.engineLevels.white, v.engineLevels.black].every((n) => Number.isInteger(n) && n >= 0 && n <= 3)) clean.engineLevels = { white: v.engineLevels.white, black: v.engineLevels.black };
  clean.moves = v.moves;
  clean.rulesVersion = v.rulesVersion!;
  if (v.startFen !== undefined) clean.startFen = normalizeFen(v.startFen);
  if (v.variations !== undefined) {
    if (
      !Array.isArray(v.variations) ||
      v.variations.length > 100 ||
      v.variations.some(
        (ms) =>
          !Array.isArray(ms) ||
          ms.length > 5000 ||
          ms.some(
            (m) =>
              typeof m !== 'string' ||
              !/^([a-h][1-8]){2}(@[a-h][1-8]|!)?$/.test(m),
          ),
      )
    )
      throw new Error('Invalid variation');
    clean.variations = v.variations;
  }
  if (v.annotations && typeof v.annotations === 'object') {
    for (const [key, shapes] of Object.entries(v.annotations)) {
      if (key.length > 40000 || !Array.isArray(shapes)) continue;
      clean.annotations[key] = shapes
        .slice(0, 64)
        .filter(
          (s) =>
            s &&
            /^[a-h][1-8]$/.test(s.orig) &&
            (!s.dest || /^[a-h][1-8]$/.test(s.dest)),
        )
        .map((s) => ({
          orig: s.orig,
          dest: s.dest,
          brush: ['green', 'red', 'blue', 'yellow'].includes(s.brush || '')
            ? s.brush
            : 'green',
        }));
    }
  }
  if (
    v.end &&
    ['1-0', '0-1', '1/2-1/2'].includes(v.end.result) &&
    ['resignation', 'agreement'].includes(v.end.reason) &&
    (v.rulesVersion !== 'pirescacs-v5' || (v.end.reason === 'agreement' && v.end.result === '1/2-1/2'))
  )
    clean.end = v.end;
  if (v.analyses && typeof v.analyses === 'object') {
    for (const [key, a] of Object.entries(v.analyses)) {
      if (
        !a ||
        !['pirescacs-fairy-1.0.0', 'pirescacs-fairy-1.1.0', 'pirescacs-fairy-1.2.0', 'pirescacs-fairy-1.4.0', 'pirescacs-fairy-1.5.0'].includes(a.version) ||
        !Number.isFinite(a.budget) ||
        a.budget < 0 ||
        a.budget > 86400000 ||
        !Array.isArray(a.lines) ||
        key.length > 40000
      )
        continue;
      const lines = a.lines
        .slice(0, 3)
        .filter(
          (l) =>
            l &&
            [l.depth, l.nodes, l.time, l.score, l.multiPV].every(
              Number.isFinite,
            ) &&
            Array.isArray(l.pv) &&
            l.pv.length <= 250 &&
            l.pv.every(
              (m) =>
                typeof m === 'string' &&
                /^([a-h][1-8]){2}(@[a-h][1-8]|!)?$/.test(m),
            ),
        )
        .map((l) => ({
          depth: l.depth,
          nodes: l.nodes,
          time: l.time,
          score: l.score,
          multiPV: l.multiPV,
          pv: l.pv,
          mate: Number.isFinite(l.mate) ? l.mate : undefined,
          winPlies: Number.isFinite(l.winPlies) ? l.winPlies : undefined,
        }));
      clean.analyses[key] = {
        version: a.version,
        budget: a.budget,
        lines,
        best:
          typeof a.best === 'string' &&
          /^([a-h][1-8]){2}(@[a-h][1-8]|!)?$/.test(a.best)
            ? a.best
            : undefined,
        termination:
          a.termination === 'arrival' || a.termination === 'mate'
            ? a.termination
            : undefined,
      };
    }
  }
  if (Number.isFinite(v.created) && v.created! > 0) clean.created = v.created!;
  // Only typed numerical analyses and coordinate annotations survive import; SVG/HTML never does.
  return clean;
}
export const DEFAULT_SETTINGS: EngineSettings = { hash: 32, threads: 1 };
