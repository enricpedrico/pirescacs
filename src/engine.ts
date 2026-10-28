export const ENGINE_VERSION = 'pirescacs-fairy-1.5.0';
export type RulesVersion = 'pirescacs-v1' | 'pirescacs-v2' | 'pirescacs-v3' | 'pirescacs-v4' | 'pirescacs-v5';
export const START =
  'cmbknbmc/prpppppr/8/8/8/8/RPPPPPRP/CMBNKBMC w - - 0 1';
export const V4_START =
  '1mbknbm1/prpppppp/8/8/8/8/PPPPPPRP/1MBNKBM1 w - - 0 1';
export const V3_START =
  '2bknbn1/prpppppp/8/8/8/8/PPPPPPRP/1NBNKB2 w - - 0 1';
export const LEGACY_START =
  '1rb1nbn1/p1pppkpp/5p2/8/8/2P5/PPKPPP1P/1NBN1BR1 w - - 0 1';
export function startingFen(version: RulesVersion): string {
  return version === 'pirescacs-v5' ? START : version === 'pirescacs-v4' ? V4_START : version === 'pirescacs-v3' ? V3_START : LEGACY_START;
}
export type Side = 'white' | 'black';
export interface Snapshot {
  fen: string;
  turn: Side;
  check: boolean;
  error: boolean;
  result: string;
  reason: string;
  legal: string[];
  revival?: { piece: string; capturedAt: string; medics: string[] };
}
export interface Line {
  depth: number;
  nodes: number;
  time: number;
  score: number;
  mate?: number;
  winPlies?: number;
  pv: string[];
  multiPV: number;
}
export interface Analysis {
  version: string;
  budget: number;
  lines: Line[];
  best?: string;
  termination?: 'arrival' | 'mate';
}
export interface EngineSettings {
  hash: number;
  threads: number;
}
export function parseInfo(line: string): Line | undefined {
  // UCI also sends progress-only `info depth ... currmove ...` messages.
  if (!/\bscore (cp|mate) -?\d+/.test(line) || !line.includes(' pv '))
    return undefined;
  const get = (n: string) =>
    Number(line.match(new RegExp('\\b' + n + ' (-?\\d+)'))?.[1] || 0);
  const mate = line.match(/score mate (-?\d+)/);
  return {
    depth: get('depth'),
    nodes: get('nodes'),
    time: get('time'),
    score: mate ? (Number(mate[1]) > 0 ? 10000 : -10000) : get('cp'),
    mate: mate ? Number(mate[1]) : undefined,
    winPlies: mate
      ? Math.max(
          0,
          2 * Math.abs(Number(mate[1])) - (Number(mate[1]) > 0 ? 1 : 0),
        )
      : undefined,
    multiPV: get('multipv') || 1,
    pv: line.split(' pv ')[1]?.trim().split(' ') || [],
  };
}
let serial = 0;
function newWorker() {
  return new Worker('/engine-worker.js');
}
export class Rules {
  worker = newWorker();
  private requests = new Map<
    number,
    {
      resolve: (s: Snapshot) => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  constructor() {
    this.worker.onmessage = ({ data }) => {
      const r = this.requests.get(data.id);
      if (!r) return;
      clearTimeout(r.timer);
      this.requests.delete(data.id);
      data.type === 'error'
        ? r.reject(new Error(data.error))
        : r.resolve(data.snapshot);
    };
    this.worker.onerror = () =>
      this.fail(new Error('Unable to load Pirescacs rules'));
  }
  private fail(e: Error) {
    for (const r of this.requests.values()) {
      clearTimeout(r.timer);
      r.reject(e);
    }
    this.requests.clear();
  }
  load(moves: string[], fen: string | undefined = undefined, rulesVersion: RulesVersion = 'pirescacs-v5', validate = false): Promise<Snapshot> {
    const id = ++serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.requests.delete(id);
        reject(new Error('Rules timeout'));
      }, 20000);
      this.requests.set(id, { resolve, reject, timer });
      this.worker.postMessage({ type: 'snapshot', id, fen: fen ?? startingFen(rulesVersion), moves, rulesVersion, validate });
    });
  }
  close() {
    this.fail(new Error('Cancelled'));
    this.worker.terminate();
  }
}
export class Search {
  worker?: Worker;
  private pendingCancel?: () => void;
  cancel() {
    this.worker?.terminate();
    this.worker = undefined;
    this.pendingCancel?.();
    this.pendingCancel = undefined;
  }
  run(
    moves: string[],
    settings: EngineSettings,
    time: number,
    multiPV: number,
    skill: number,
    onInfo: (l: Line) => void,
    fen: string | undefined = undefined,
    rulesVersion: RulesVersion = 'pirescacs-v5',
  ): Promise<string> {
    this.cancel();
    const id = ++serial;
    const worker = newWorker();
    this.worker = worker;
    return new Promise((resolve, reject) => {
      const done = (error?: Error, best?: string) => {
        clearTimeout(watchdog);
        this.pendingCancel = undefined;
        worker.terminate();
        if (this.worker === worker) this.worker = undefined;
        error ? reject(error) : resolve(best!);
      };
      const watchdog =
        time === 0
          ? undefined
          : setTimeout(() => done(new Error('Engine timeout')), time + 20000);
      this.pendingCancel = () => {
        clearTimeout(watchdog);
        reject(new Error('Cancelled'));
      };
      worker.onerror = () => done(new Error('Unable to load engine'));
      worker.onmessage = ({ data }) => {
        if (data.id !== id) return;
        if (data.type === 'info') {
          const parsed = parseInfo(data.line);
          if (parsed) onInfo(parsed);
        } else if (data.type === 'best') {
          done(undefined, data.best);
        } else if (data.type === 'error') {
          done(new Error(data.error));
        }
      };
      const mode =
        settings.threads > 1 && globalThis.crossOriginIsolated
          ? 'multi'
          : 'single';
      worker.postMessage({
        type: 'search',
        id,
        fen: fen ?? startingFen(rulesVersion),
        rulesVersion,
        moves,
        mode,
        ...settings,
        time,
        multiPV,
        skill,
      });
    });
  }
}
