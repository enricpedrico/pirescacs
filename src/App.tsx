import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Anchor,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronFirst,
  ChevronLast,
  Compass,
  Download,
  Flag,
  FolderOpen,
  Globe,
  Pencil,
  Pause,
  Play,
  RotateCcw,
  Search as SearchIcon,
  Settings2,
  Palette,
  Volume2,
  VolumeX,
  Ship,
  Skull,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { DrawShape } from 'chessground/draw';
import { Board, pieceAt } from './Board';
import {
  Analysis,
  ENGINE_VERSION,
  EngineSettings,
  Line,
  Rules,
  RulesVersion,
  Search,
  Side,
  Snapshot,
  START,
  startingFen,
} from './engine';
import { Lang, translations } from './i18n';
import { Editor } from './Editor';
import { historyTarget } from './navigation';
import { rememberEvaluation, whiteEvaluationHeight, type DisplayEvaluation } from './evaluation';
import { Personalization } from './Personalization';
import { BOARD_THEMES, loadPreferences, savePreferences, pieceImage, type Preferences } from './preferences';
import { Sounds, moveSound, type SoundEvent, type AudioStatus } from './sound';
import {
  DEFAULT_SETTINGS,
  Voyage,
  download,
  fresh,
  list,
  remove,
  restore,
  save,
  validateFile,
} from './storage';
import './style.css';
const budgets = [250, 750, 3000, 10000],
  skills = [0, 5, 20, 20];
type View = 'play' | 'analysis' | 'games' | 'rules' | 'editor';
type Shown = Snapshot & { path: string };
type LivePosition = Shown & { gameId: string };
type LiveAnalysis = {
  fen: string;
  rulesVersion: RulesVersion;
  gameId: string;
  key: string;
  path: string[];
  lines: Line[];
};
export default function App() {
  const [preferences, setPreferences] = useState(loadPreferences),
    [preferencesOpen, setPreferencesOpen] = useState(false),
    [preferencesStorageFailed, setPreferencesStorageFailed] = useState(false),
    [audioStatus, setAudioStatus] = useState<AudioStatus>('locked');
  const soundsRef = useRef<Sounds | undefined>(undefined);
  if (!soundsRef.current) soundsRef.current = new Sounds(setAudioStatus, (event) => {
    if (!import.meta.env.DEV) return;
    const root = document.querySelector<HTMLElement>('.app');
    if (root) { root.dataset.soundEvent = event; root.dataset.soundCount = String(Number(root.dataset.soundCount || 0) + 1); }
  });
  const analysisSound = useRef<{ gameId: string; path: string; event: SoundEvent } | undefined>(undefined);
  const heardPosition = useRef<{ gameId: string; moves: string[]; fen: string; result: string } | undefined>(undefined);
  function updatePreferences(next: Preferences) {
    soundsRef.current!.configure(next);
    setPreferences(next);
  }
  function previewSound(event: SoundEvent) {
    void soundsRef.current!.unlock().then(() => soundsRef.current!.play(event));
  }
  useEffect(() => {
    soundsRef.current!.configure(preferences);
    setPreferencesStorageFailed(!savePreferences(preferences));
  }, [preferences]);
  useEffect(() => {
    const unlock = (event: Event) => { if (event.isTrusted) void soundsRef.current!.unlock(); };
    const hide = () => { if (document.hidden) soundsRef.current!.silence(); };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('visibilitychange', hide);
      soundsRef.current!.close();
    };
  }, []);
  const [lang, setLang] = useState<Lang>(() => {
      try {
        return (
          ['ca', 'es', 'en'].includes(
            localStorage.getItem('pirescacs-lang') || '',
          )
            ? localStorage.getItem('pirescacs-lang')
            : 'ca'
        ) as Lang;
      } catch {
        return 'ca';
      }
    }),
    t = translations[lang];
  const [view, setView] = useState<View>('play'),
    [editorFen, setEditorFen] = useState(START),
    [game, setGame] = useState(() => fresh('bot', 'white', 2)),
    [cursor, setCursor] = useState(0),
    [branch, setBranch] = useState<string[] | undefined>(),
    [shown, setShown] = useState<Shown>(),
    [livePosition, setLivePosition] = useState<LivePosition>(),
    [orientation, setOrientation] = useState<Side>('white');
  const [mode, setMode] = useState<'bot' | 'local' | 'engine'>('bot'),
    [side, setSide] = useState<Side | 'random'>('white'),
    [level, setLevel] = useState(2),
    [blackLevel, setBlackLevel] = useState(2),
    [enginesPaused, setEnginesPaused] = useState(false),
    [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false),
    [busy, setBusy] = useState(true),
    [thinking, setThinking] = useState(false),
    [error, setError] = useState(''),
    [storageError, setStorageError] = useState(false),
    [pending, setPending] = useState<string[] | undefined>(),
    [drawing, setDrawing] = useState(false),
    [brush, setBrush] = useState('green');
  const [running, setRunning] = useState(false),
    [engineEnabled, setEngineEnabled] = useState(true),
    [multiPV, setMultiPV] = useState(3),
    [showEngineArrows, setShowEngineArrows] = useState(true),
    [showEvalBar, setShowEvalBar] = useState(true),
    [autoplay, setAutoplay] = useState(false),
    [live, setLive] = useState<Line[]>([]),
    [batchProgress, setBatchProgress] = useState<
      [number, number] | undefined
    >(),
    [savedGames, setSavedGames] = useState<Voyage[]>([]),
    [retry, setRetry] = useState(0),
    [notice, setNotice] = useState(''),
    [setupOpen, setSetupOpen] = useState(true),
    [startedId, setStartedId] = useState<string>(),
    [modal, setModal] = useState<
      { message: string; action: () => void } | undefined
    >();
  const startedBanner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view === 'play' && startedId === game.id)
      startedBanner.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [startedId, game.id, view]);
  const historyCursor = useRef(cursor);
  historyCursor.current = cursor;
  const rulesRef = useRef<Rules | undefined>(undefined);
  if (!rulesRef.current) rulesRef.current = new Rules();
  const moveStarted = useRef<number | undefined>(undefined),
    activeAnalysis = useRef<LiveAnalysis | undefined>(undefined);
  const botSearchRef = useRef(new Search());
  const searchRef = useRef(new Search()),
    epoch = useRef(0),
    task = useRef(0),
    file = useRef<HTMLInputElement>(null);
  const liveKey = game.moves.join(' ');
  const liveReady = livePosition?.gameId === game.id && livePosition.path === liveKey;
  const reviewing = view === 'play' && cursor !== game.moves.length;
  const active = branch || game.moves,
    current = active.slice(0, cursor),
    key = current.join(' '),
    cached = game.analyses[key];
  const startFen = game.startFen || startingFen(game.rulesVersion);
  const shapes = game.annotations[key] || [];
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.brand + ' · ' + t.tagline;
    try {
      localStorage.setItem('pirescacs-lang', lang);
    } catch {}
  }, [lang, t]);
  useEffect(() => {
    let cancelled = false;
    restore()
      .then((v) => {
        if (!cancelled && v && ['pirescacs-v1', 'pirescacs-v2', 'pirescacs-v3', 'pirescacs-v4', 'pirescacs-v5'].includes(v.rulesVersion)) {
          setGame(v);
          setCursor(v.moves.length);
          setMode(v.mode);
          setSide(v.player);
          setLevel(v.engineLevels?.white ?? v.level);
          setBlackLevel(v.engineLevels?.black ?? v.level);
          setEnginesPaused(v.mode === 'engine');
          setOrientation(v.player);
        }
      })
      .catch(() => setStorageError(true))
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (hydrated) save(game).catch(() => setStorageError(true));
  }, [game, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    const version = ++epoch.current;
    stop();
    setLive([]);
    setBatchProgress(undefined);
    setPending(undefined);
    setBusy(true);
    setError('');
    rulesRef
      .current!.load(current, startFen, game.rulesVersion)
      .then((s) => {
        if (version !== epoch.current) return;
        if (s.error) throw new Error('Illegal history');
        setShown({ ...s, path: key });
        setBusy(false);
      })
      .catch(() => {
        if (version === epoch.current) {
          setBusy(false);
          setError(t.error);
        }
      });
  }, [hydrated, key, retry, view, game.id, startFen, game.rulesVersion]);
  // New moves belong to the real game even while the board is showing its history.
  useEffect(() => {
    if (view === 'play') {
      historyCursor.current = game.moves.length;
      setCursor(game.moves.length);
      setBranch(undefined);
    }
  }, [game.id, game.moves, view]);
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    rulesRef.current!.load(game.moves, startFen, game.rulesVersion)
      .then((snapshot) => {
        if (cancelled) return;
        if (snapshot.error) throw new Error('Illegal live history');
        setLivePosition({ ...snapshot, path: liveKey, gameId: game.id });
        if (snapshot.result !== '*')
          setGame((g) =>
            g.id !== game.id || g.end ? g : {
              ...g,
              end: { result: snapshot.result, reason: snapshot.reason },
              updated: Date.now(),
            },
          );
      })
      .catch(() => { if (!cancelled) setError(t.error); });
    return () => { cancelled = true; };
  }, [hydrated, game.id, liveKey, startFen, game.rulesVersion, retry]);
  const shownReady = shown?.path === key && !busy;
  useEffect(() => {
    if (!liveReady || !livePosition) return;
    const previous = heardPosition.current, result = game.end?.result || livePosition.result;
    if (previous?.gameId === game.id) {
      const nextMove = game.moves.length === previous.moves.length + 1 &&
        previous.moves.every((m, i) => game.moves[i] === m);
      if (view === 'play' && !document.hidden) {
        if (result !== '*' && previous.result === '*' && preferences.alerts) soundsRef.current!.play('end');
        else if (nextMove) {
          const event = moveSound(previous.fen, game.moves.at(-1)!);
          soundsRef.current!.play(livePosition.check && event === 'move' && preferences.alerts ? 'check' : event);
        }
      }
    }
    heardPosition.current = { gameId: game.id, moves: game.moves, fen: livePosition.fen, result };
  }, [liveReady, livePosition, game.id, liveKey, game.end?.result, view, preferences.alerts]);
  useEffect(() => {
    const intent = analysisSound.current;
    if (!intent || !shownReady || !shown) return;
    analysisSound.current = undefined;
    if (view === 'analysis' && intent.gameId === game.id && intent.path === key && !document.hidden)
      soundsRef.current!.play(shown.result !== '*' && preferences.alerts ? 'end' : shown.check && intent.event === 'move' && preferences.alerts ? 'check' : intent.event);
  }, [shownReady, shown, key, game.id, view, preferences.alerts]);
  const terminal =
    view === 'play'
      ? game.end ||
        (liveReady && livePosition?.result !== '*'
          ? { result: livePosition!.result, reason: livePosition!.reason }
          : undefined)
      : shownReady && shown?.result !== '*'
        ? { result: shown!.result, reason: shown!.reason }
        : undefined;
  useEffect(() => {
    if (
      !liveReady ||
      !livePosition ||
      livePosition.result !== '*' ||
      view !== 'play' ||
      game.end ||
      game.mode === 'local' ||
      (game.mode === 'bot' && livePosition.turn === game.player) ||
      (game.mode === 'engine' && enginesPaused)
    ) return;
    let cancelled = false;
    const search = botSearchRef.current;
    const playingLevel = game.mode === 'engine' ? game.engineLevels?.[livePosition.turn] ?? game.level : game.level;
    setThinking(true);
    setError('');
    search.run(
      game.moves,
      settings,
      budgets[playingLevel],
      1,
      skills[playingLevel],
      () => {},
      startFen,
      game.rulesVersion,
    )
      .then((best) => {
        if (cancelled) return;
        if (!livePosition.legal.includes(best)) throw new Error('Invalid best move');
        setGame((g) =>
          g.id !== game.id || g.moves.join(' ') !== liveKey || g.end ? g : {
            ...g,
            moves: [...g.moves, best],
            updated: Date.now(),
          },
        );
      })
      .catch(() => { if (!cancelled) setError(t.error); })
      .finally(() => { if (!cancelled) setThinking(false); });
    return () => {
      cancelled = true;
      search.cancel();
      setThinking(false);
    };
  }, [
    liveReady,
    livePosition,
    liveKey,
    startFen,
    view,
    game.id,
    game.mode,
    game.player,
    game.level,
    game.engineLevels?.white,
    game.engineLevels?.black,
    enginesPaused,
    game.end,
    game.rulesVersion,
    settings.hash,
    settings.threads,
  ]);
  useEffect(() => {
    if (!modal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(undefined);
      if (e.key === 'Tab') {
        const buttons = Array.from(
          document.querySelectorAll<HTMLButtonElement>('.modal button'),
        );
        const first = buttons[0],
          last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [modal]);
  useEffect(() => {
    if (view === 'games')
      list()
        .then(setSavedGames)
        .catch(() => setStorageError(true));
  }, [view, game.updated]);
  function storeLive(context: LiveAnalysis) {
    if (!context.lines.length) return;
    const analysis: Analysis = {
      version: ENGINE_VERSION,
      budget: Math.max(...context.lines.map((l) => l.time)),
      lines: context.lines,
      best: context.lines[0]?.pv[0],
    };
    setGame((g) =>
      g.id === context.gameId
        ? {
            ...g,
            analyses: { ...g.analyses, [context.key]: analysis },
            updated: Date.now(),
          }
        : g,
    );
    if (context.lines[0].mate !== undefined)
      rulesRef
        .current!.load([...context.path, ...context.lines[0].pv], context.fen, context.rulesVersion)
        .then((s) => {
          if (s.error || !['arrival', 'mate'].includes(s.reason)) return;
          setGame((g) =>
            g.id === context.gameId && g.analyses[context.key] === analysis
              ? {
                  ...g,
                  analyses: {
                    ...g.analyses,
                    [context.key]: {
                      ...analysis,
                      termination: s.reason as 'arrival' | 'mate',
                    },
                  },
                }
              : g,
          );
        })
        .catch(() => {});
  }
  function stop(cancelReturn = true) {
    const context = activeAnalysis.current;
    activeAnalysis.current = undefined;
    if (context) storeLive(context);
    task.current++;
    searchRef.current.cancel();
    setRunning(false);
    setBatchProgress(undefined);
    if (cancelReturn) setPending(undefined);
  }
  function toggleEngine() {
    if (engineEnabled) stop(false);
    else setError('');
    setEngineEnabled((enabled) => !enabled);
  }
  function patch(p: Partial<Voyage>) {
    setGame((g) => ({ ...g, ...p, updated: Date.now() }));
  }
  function start() {
    soundsRef.current!.silence();
    soundsRef.current!.play('start');
    analysisSound.current = undefined;
    setAutoplay(false);
    stop();
    const player =
      side === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : side;
    const next = { ...fresh(mode, player, level), ...(mode === 'engine' ? { engineLevels: { white: level, black: blackLevel } } : {}) };
    setEnginesPaused(false);
    setGame(next);
    setStartedId(next.id);
    setSetupOpen(false);
    setShown(undefined);
    setBusy(true);
    setOrientation(player);
    setCursor(0);
    setBranch(undefined);
    setView('play');
    setNotice('');
  }
  function editPosition() {
    stop();
    setAutoplay(false);
    setEditorFen(shownReady && shown ? shown.fen : startFen);
    setView('editor');
  }
  function usePosition(fen: string, analysis: boolean) {
    stop();
    setAutoplay(false);
    const player = side === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : side;
    const next = { ...fresh(mode, player, level), startFen: fen, ...(mode === 'engine' ? { engineLevels: { white: level, black: blackLevel } } : {}) };
    setEnginesPaused(false);
    setGame(next);
    setStartedId(analysis ? undefined : next.id);
    setSetupOpen(false);
    setShown(undefined);
    setBusy(true);
    setOrientation(player);
    setCursor(0);
    setBranch(undefined);
    setPending(undefined);
    setNotice('');
    setError('');
    setEngineEnabled(true);
    setView(analysis ? 'analysis' : 'play');
  }
  function askNew() {
    if (game.moves.length && !game.end)
      setModal({ message: t.newConfirm, action: start });
    else start();
  }
  function move(m: string) {
    if (!shownReady || !shown || (view === 'play' &&
      (game.mode === 'engine' || reviewing || terminal || thinking || (game.mode === 'bot' && shown.turn !== game.player)))) return;
    const candidates = shown.legal.filter(
      (x) => x.slice(0, 4) === m.slice(0, 4),
    );
    if (!candidates.length) return;
    if (candidates.some((x) => x.includes('@'))) {
      setAutoplay(false);
      stop(false);
      setPending(candidates);
      return;
    }
    commit(m);
  }
  function commit(m: string) {
    if (
      !shownReady ||
      !shown?.legal.includes(m) ||
      (view === 'play' && (game.mode === 'engine' || terminal || reviewing || thinking ||
        (game.mode === 'bot' && shown.turn !== game.player)))
    )
      return;
    setAutoplay(false);
    stop();
    moveStarted.current = performance.now();
    setPending(undefined);
    if (view === 'analysis') {
      const next = [...current, m];
      analysisSound.current = { gameId: game.id, path: next.join(' '), event: moveSound(shown.fen, m) };
      setBranch(next);
      setCursor(next.length);
      setGame((g) => ({
        ...g,
        variations: [
          ...g.variations.filter((p) => p.join(' ') !== next.join(' ')),
          next,
        ],
        updated: Date.now(),
      }));
    } else {
      patch({ moves: [...game.moves, m] });
      setCursor(game.moves.length + 1);
    }
  }
  function cancelReturn() {
    setPending(undefined);
    setRetry((n) => n + 1);
  }
  function undo() {
    stop();
    if (game.mode === 'engine') setEnginesPaused(true);
    if (!game.moves.length) return;
    let n = game.moves.length - 1;
    if (game.mode === 'bot' && n > 0 && livePosition?.turn === game.player) n--;
    patch({ moves: game.moves.slice(0, n), end: undefined });
    setCursor(n);
    setBranch(undefined);
  }
  function go(n: number, keepPlaying = false) {
    if (!keepPlaying) setAutoplay(false);
    const next = Math.max(0, Math.min(active.length, n));
    if (next === historyCursor.current) return;
    analysisSound.current = undefined;
    soundsRef.current!.play('navigate');
    historyCursor.current = next;
    stop();
    setPending(undefined);
    setCursor(next);
  }
  function open(v: Voyage) {
    setAutoplay(false);
    stop();
    setGame(v);
    setCursor(v.moves.length);
    setBranch(undefined);
    setMode(v.mode);
    setSide(v.player);
    setLevel(v.engineLevels?.white ?? v.level);
    setBlackLevel(v.engineLevels?.black ?? v.level);
    setEnginesPaused(v.mode === 'engine');
    setOrientation(v.player);
    setView('play');
  }
  function toAnalysis() {
    setAutoplay(false);
    setEngineEnabled(true);
    if (view === 'analysis') setRetry((n) => n + 1);
    stop();
    setBranch(undefined);
    setCursor(game.moves.length);
    setView('analysis');
  }
  function setShapes(s: DrawShape[]) {
    patch({ annotations: { ...game.annotations, [key]: s } });
  }
  async function analysePath(
    path: string[],
    ms: number,
    token: number,
    onInfo: (ls: Line[]) => void,
    multi = 3,
  ): Promise<Analysis> {
    const s = await rulesRef.current!.load(path, startFen, game.rulesVersion);
    if (token !== task.current) throw new Error('Cancelled');
    if (s.result !== '*')
      return {
        version: ENGINE_VERSION,
        budget: ms,
        lines: [],
        termination:
          s.reason === 'arrival'
            ? 'arrival'
            : s.reason === 'mate'
              ? 'mate'
              : undefined,
      };
    const lines: Line[] = [];
    const best = await searchRef.current.run(
      path,
      settings,
      ms,
      multi,
      20,
      (l) => {
        if (token !== task.current) return;
        const normalized = {
          ...l,
          score: s.turn === 'black' ? -l.score : l.score,
          mate:
            l.mate === undefined
              ? undefined
              : s.turn === 'black'
                ? -l.mate
                : l.mate,
        };
        lines[l.multiPV - 1] = normalized;
        onInfo(lines.filter(Boolean));
      },
      startFen,
      game.rulesVersion,
    );
    if (token !== task.current) throw new Error('Cancelled');
    let termination: 'arrival' | 'mate' | undefined;
    if (lines[0]?.mate !== undefined && lines[0].pv.length) {
      const end = await rulesRef.current!.load([...path, ...lines[0].pv], startFen, game.rulesVersion);
      if (!end.error)
        termination =
          end.reason === 'arrival'
            ? 'arrival'
            : end.reason === 'mate'
              ? 'mate'
              : undefined;
    }
    return {
      version: ENGINE_VERSION,
      budget: ms || Math.max(0, ...lines.filter(Boolean).map((l) => l.time)),
      lines: lines.filter(Boolean),
      best,
      termination,
    };
  }
  // Position changes cancel the previous Worker; the enabled switch survives navigation.
  useEffect(() => {
    if (
      view !== 'analysis' ||
      !engineEnabled ||
      !shownReady ||
      shown?.result !== '*' ||
      pending ||
      batchProgress ||
      error
    )
      return;
    const token = ++task.current;
    const context: LiveAnalysis = {
      gameId: game.id,
      fen: startFen,
      rulesVersion: game.rulesVersion,
      key,
      path: current,
      lines: [],
    };
    activeAnalysis.current = context;
    setRunning(true);
    setLive([]);
    analysePath(
      current,
      0,
      token,
      (lines) => {
        if (token !== task.current) return;
        context.lines = lines;
        setLive(lines);
      },
      multiPV,
    )
      .then((result) => {
        if (token !== task.current) return;
        activeAnalysis.current = undefined;
        setGame((g) =>
          g.id === context.gameId
            ? {
                ...g,
                analyses: { ...g.analyses, [context.key]: result },
                updated: Date.now(),
              }
            : g,
        );
      })
      .catch(() => {
        if (token === task.current) setError(t.error);
      })
      .finally(() => {
        if (token === task.current) {
          activeAnalysis.current = undefined;
          setRunning(false);
        }
      });
    return () => {
      if (activeAnalysis.current === context) stop(false);
    };
  }, [
    view,
    engineEnabled,
    shownReady,
    shown?.result,
    key,
    game.id,
    startFen,
    game.rulesVersion,
    settings.hash,
    settings.threads,
    multiPV,
    !!pending,
    !!batchProgress,
    !!error,
    retry,
  ]);

  useEffect(() => {
    if (!autoplay || view !== 'analysis') return;
    if (cursor >= active.length) {
      setAutoplay(false);
      return;
    }
    const timer = window.setTimeout(() => go(cursor + 1, true), 1000);
    return () => window.clearTimeout(timer);
  }, [autoplay, view, cursor, active.length]);

  async function exploreLine(line: Line, index: number) {
    if (!shownReady || pending) return;
    setAutoplay(false);
    stop();
    const token = ++task.current;
    const next = [...current, ...line.pv.slice(0, index + 1)];
    setBusy(true);
    try {
      const snapshot = await rulesRef.current!.load(next, startFen, game.rulesVersion);
      if (token !== task.current) return;
      if (snapshot.error) throw new Error('Invalid principal variation');
      setBranch(next);
      setCursor(next.length);
      setGame((g) => ({
        ...g,
        variations: [
          ...g.variations.filter((p) => p.join(' ') !== next.join(' ')),
          next,
        ],
        updated: Date.now(),
      }));
    } catch {
      if (token === task.current) setError(t.error);
    } finally {
      if (token === task.current) setBusy(false);
    }
  }
  async function batch() {
    setAutoplay(false);
    stop();
    const token = ++task.current;
    setRunning(true);
    setLive([]);
    setError('');
    setBatchProgress([0, game.moves.length + 1]);
    try {
      for (let i = 0; i <= game.moves.length; i++) {
        const path = game.moves.slice(0, i),
          nodeKey = path.join(' ');
        const result = await analysePath(path, 2000, token, () => {});
        if (token !== task.current) return;
        setGame((g) => ({
          ...g,
          analyses: { ...g.analyses, [nodeKey]: result },
          updated: Date.now(),
        }));
        setBatchProgress([i + 1, game.moves.length + 1]);
      }
      setNotice(t.analysisDone);
    } catch {
      if (token === task.current) setError(t.error);
    } finally {
      if (token === task.current) {
        setRunning(false);
        setBatchProgress(undefined);
      }
    }
  }
  async function importGame(selected?: File) {
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) {
      setError(t.importError);
      return;
    }
    stop();
    setBusy(true);
    setNotice(t.importing);
    try {
      const v = validateFile(JSON.parse(await selected.text()));
      const root = await rulesRef.current!.load([], v.startFen || startingFen(v.rulesVersion), v.rulesVersion, true);
      if (root.error) throw new Error('Invalid starting position');
      const s = await rulesRef.current!.load(v.moves, v.startFen || startingFen(v.rulesVersion), v.rulesVersion);
      if (s.error) throw new Error('Invalid moves');
      for (const path of v.variations) {
        const sub = await rulesRef.current!.load(path, v.startFen || startingFen(v.rulesVersion), v.rulesVersion);
        if (sub.error) throw new Error('Invalid variation');
      }
      await save(v).catch(() => setStorageError(true));
      open(v);
      setNotice(t.importDone);
      setRetry((n) => n + 1);
    } catch {
      setError(t.importError);
      setNotice('');
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  }
  async function exportText() {
    const rows: string[] = [];
    for (let i = 0; i < game.moves.length; i++) {
      const snap = await rulesRef.current!.load(game.moves.slice(0, i), startFen, game.rulesVersion);
      const m = game.moves[i],
        a = pieceAt(snap.fen, m.slice(0, 2)),
        b = pieceAt(snap.fen, m.slice(2, 4));
      const swap =
        a?.toLowerCase() === 'r' &&
        b &&
        (a.toUpperCase() === a) === (b.toUpperCase() === b);
      rows.push(
        `${snap.fen.split(' ')[5]}${snap.turn === 'black' ? '...' : '.'} ${moveText(m)}${swap ? ' (' + t.swap + ')' : ''}`,
      );
    }
    download(
      `${t.brand} · ${game.rulesVersion}\nFEN: ${startFen}\n${new Date(game.created).toLocaleString(lang)}\n${game.end?.result || '*'}\n\n` +
        rows.join('\n'),
      'pirescacs.txt',
      'text/plain',
    );
  }
  const finalLines = (
      running && live.length ? live : cached?.lines || []
    ).slice(0, multiPV),
    main = finalLines[0],
    score = main?.score;
  const prior =
    cursor > 0 ? game.analyses[current.slice(0, -1).join(' ')] : undefined;
  const previous = prior?.lines[0];
  const loss =
    previous &&
    main &&
    previous.mate === undefined &&
    main.mate === undefined &&
    prior?.version === cached?.version &&
    prior?.budget === cached?.budget &&
    !running
      ? Math.max(0, (previous.score - main.score) * (shown?.turn === 'black' ? 1 : -1)) / 100
      : undefined;
  const autoShapes: DrawShape[] =
    view === 'analysis' && showEngineArrows && main?.pv[0]
      ? [
          {
            orig: main.pv[0].slice(0, 2) as DrawShape['orig'],
            dest: main.pv[0].slice(2, 4) as DrawShape['dest'],
            brush: 'blue',
            modifiers: { lineWidth: 6 },
          },
        ]
      : [];
  if (view === 'analysis' && showEngineArrows && main?.pv[0]?.includes('@')) {
    autoShapes.push({
      orig: main.pv[0].slice(2, 4) as DrawShape['orig'],
      dest: main.pv[0].slice(5, 7) as DrawShape['dest'],
      brush: 'blue',
      modifiers: { lineWidth: 6 },
    });
  }
  const resultStatus = terminal
    ? terminal.result === '1/2-1/2'
      ? t.drawn
      : `${terminal.result === '1-0' ? t.white : t.black} ${t.wins}`
    : '';
  const status = reviewing
    ? t.reviewing
    : pending
    ? t.returnPawn
    : game.mode === 'engine' && enginesPaused && view === 'play'
      ? t.enginesPaused
    : thinking
      ? t.thinking
      : terminal
        ? resultStatus
        : shownReady
          ? `${t.turn} ${shown?.turn === 'white' ? t.white : t.black}`
          : t.loading;
  const resultReason = terminal
    ? (t[terminal.reason as keyof typeof t] as string)
    : '';
  const humanCanPlay =
    shownReady &&
    !terminal &&
    !thinking &&
    !pending &&
    (view === 'analysis' ||
      (view === 'play' &&
        cursor === game.moves.length &&
        (game.mode === 'local' || (game.mode === 'bot' && shown?.turn === game.player))));
  useEffect(() => {
    if (view !== 'play' && view !== 'analysis') return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        modal || preferencesOpen ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      )
        return;
      const target = e.target instanceof Element ? e.target : undefined;
      if (
        target?.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"]',
        )
      )
        return;
      const destination = historyTarget(e.key, historyCursor.current, active.length);
      if (destination !== undefined) {
        e.preventDefault();
        go(destination);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setOrientation((o) => (o === 'white' ? 'black' : 'white'));
      } else if (
        view === 'analysis' &&
        e.key.toLowerCase() === 'l' &&
        !batchProgress
      ) {
        e.preventDefault();
        toggleEngine();
      } else if (
        view === 'analysis' &&
        e.key === ' ' &&
        !target?.closest('button, summary, a') &&
        main?.pv[0] &&
        humanCanPlay
      ) {
        e.preventDefault();
        commit(main.pv[0]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    view,
    cursor,
    active.length,
    modal,
    preferencesOpen,
    engineEnabled,
    batchProgress,
    key,
    shownReady,
    pending,
    main?.pv[0],
    humanCanPlay,
  ]);

  function gameDescription(g: Voyage) { return g.mode === 'engine' ? t.engineVsEngine + ' · ' + t.levels[g.engineLevels?.white ?? g.level] + ' / ' + t.levels[g.engineLevels?.black ?? g.level] : g.mode === 'local' ? t.local : t.bot + ' · ' + t.levels[g.level] + ' · ' + (g.player === 'white' ? t.white : t.black); }
  const iconButton = (
    label: string,
    onClick: () => void,
    Icon: typeof Ship,
    disabled = false,
  ) => (
    <button
      className="icon-button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={18} />
    </button>
  );
  return (
    <div className={'app' + (view === 'analysis' ? ' analysis-view' : '')} data-board={preferences.board} data-size={preferences.size} data-focus={preferences.focus} data-background={preferences.background} data-accent={preferences.accent} style={{ '--board-light': BOARD_THEMES[preferences.board][0], '--board-dark': BOARD_THEMES[preferences.board][1] } as CSSProperties}>
      <div className="sea-backdrop" aria-hidden="true">
        <GhostShip />
      </div>
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            stop();
            setBranch(undefined);
            setCursor(game.moves.length);
            setView('play');
          }}
        >
          <span className="brand-mark">
            <Ship size={27} />
          </span>
          <span>
            {t.brand}
            <small>EST. 2026</small>
          </span>
        </a>
        <nav aria-label={t.brand}>
          {(['play', 'analysis', 'games', 'rules', 'editor'] as View[]).map((v) => (
            <button
              key={v}
              aria-label={t[v]}
              className={view === v ? 'active' : ''}
              onClick={() => {
                if (v === view) return;
                stop();
                if (v === 'editor') editPosition();
                else if (v === 'analysis') toAnalysis();
                else {
                  setView(v);
                  if (v === 'play') {
                    setBranch(undefined);
                    setCursor(game.moves.length);
                  }
                }
              }}
            >
              {v === 'play' ? (
                <Compass size={16} />
              ) : v === 'analysis' ? (
                <SearchIcon size={16} />
              ) : v === 'games' ? (
                <FolderOpen size={16} />
              ) : v === 'editor' ? (
                <Pencil size={16} />
              ) : (
                <BookOpen size={16} />
              )}
              <span>{t[v]}</span>
            </button>
          ))}
        </nav>
        <button className="header-new quiet-button" aria-label={t.newGame} title={t.newGame} onClick={askNew}><Play size={15} /><span>{t.newGame}</span></button>
        <div className="header-preferences">
          <button className="icon-button sound-toggle" aria-label={preferences.sound && preferences.volume ? t.muteSound : t.unmuteSound} title={preferences.sound && preferences.volume ? t.muteSound : t.unmuteSound} aria-pressed={preferences.sound && !!preferences.volume} onClick={() => updatePreferences({ ...preferences, sound: !(preferences.sound && preferences.volume), volume: preferences.volume || 45 })}>{preferences.sound && preferences.volume ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <button className="icon-button" aria-label={t.personalize} title={t.personalize} aria-haspopup="dialog" onClick={() => setPreferencesOpen(true)}><Palette size={18} /></button>
        </div>
        <label className="language">
          <Globe size={16} />
          <select
            aria-label="Language"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="ca">CA</option>
            <option value="es">ES</option>
            <option value="en">EN</option>
          </select>
        </label>
      </header>
      <main>
        {view === 'editor' && <Editor preferences={preferences} text={t} initialFen={editorFen} rules={rulesRef.current!} onUse={usePosition} playOptions={<div className="editor-game-options"><label>{t.mode}<select value={mode} onChange={(e) => setMode(e.target.value as Voyage['mode'])}><option value="bot">{t.bot}</option><option value="local">{t.local}</option><option value="engine">{t.engineVsEngine}</option></select></label><label>{t.side}<select value={side} onChange={(e) => setSide(e.target.value as Side | 'random')}><option value="white">{t.white}</option><option value="black">{t.black}</option><option value="random">{t.random}</option></select></label><label>{mode === 'engine' ? t.whiteEngine : t.level}<select value={level} disabled={mode === 'local'} onChange={(e) => setLevel(Number(e.target.value))}>{t.levels.map((name, i) => <option key={i} value={i}>{name}</option>)}</select></label>{mode === 'engine' && <label>{t.blackEngine}<select value={blackLevel} onChange={(e) => setBlackLevel(Number(e.target.value))}>{t.levels.map((name, i) => <option key={i} value={i}>{name}</option>)}</select></label>}</div>} />}
        {game.rulesVersion !== 'pirescacs-v5' && (view === 'play' || view === 'analysis') && <p className="legacy-note">{t.legacyRules} · {game.rulesVersion}</p>}
        {(view === 'play' || view === 'analysis') && (
          <>
            <section className="intro">
              <div>
                <p className="eyebrow">
                  <span /> {t.tagline}
                </p>
                <h1>{view === 'analysis' ? t.analysis : t.hero}</h1>
                <p className="intro-copy">
                  {game.startFen ? t.customPosition + ' · ' : ''}{view === 'analysis' ? t.branch : t.intro}
                </p>
              </div>
              {view === 'analysis' && <div className="analysis-entry-actions"><button className="primary-button" onClick={askNew}><Play size={16} />{t.newGame}</button><button className="quiet-button" onClick={editPosition}><Pencil size={16} />{t.setPosition}</button></div>}
              <div className="version-seal">
                <Anchor size={17} />
                <span>
                  PIRESCACS
                  <br />
                  <b>{'V. ' + game.rulesVersion.slice(-1)}</b>
                </span>
              </div>
            </section>
            <div className="arena">
              <section className="board-section">
                {view === 'play' && startedId === game.id && <div className="game-started" ref={startedBanner} role="status"><Play size={20} /><div><strong>{t.gameStarted}</strong><span>{gameDescription(game)}</span></div><button className="icon-button" aria-label={t.closeNotice} onClick={() => setStartedId(undefined)}><X size={17} /></button></div>}
                <div className="crew-banner">
                  <div className="crew-name">
                    <span
                      className={
                        'crew-dot ' +
                        (orientation === 'white' ? 'black' : 'white')
                      }
                    />
                    <span>{orientation === 'white' ? t.black : t.white}</span>
                    <small>
                      {game.mode === 'bot' &&
                      game.player ===
                        (orientation === 'white' ? 'black' : 'white')
                        ? ''
                        : game.mode === 'bot'
                          ? t.levels[game.level]
                          : game.mode === 'engine' ? t.engine + ' · ' + t.levels[game.engineLevels?.[orientation === 'white' ? 'black' : 'white'] ?? game.level] : t.local}
                    </small>
                  </div>
                  <Ship size={16} />
                </div>
                <div className="board-and-eval">
                  {view === 'analysis' && showEvalBar && (
                    <EvaluationBar
                      context={game.id + ':' + game.rulesVersion}
                      score={terminal ? terminal.result === '1-0' ? 10000 : terminal.result === '0-1' ? -10000 : 0 : score}
                      label={terminal?.result || (main ? formatScore(main, cached, t, game.rulesVersion === 'pirescacs-v5') : t.noAnalysis)}
                    />
                  )}
                  <Board
                    preferences={preferences}
                    renderStart={shownReady ? moveStarted.current : undefined}
                    historyNavigation
                    legacy={game.rulesVersion === 'pirescacs-v1'}
                    analysisMode={view === 'analysis'}
                    positionReady={shownReady}
                    snapshot={shown}
                    orientation={orientation}
                    enabled={!!humanCanPlay}
                    last={current.at(-1)}
                    onMove={move}
                    pending={pending}
                    onReturn={commit}
                    onCancelReturn={cancelReturn}
                    shapes={shapes}
                    onShapes={setShapes}
                    autoShapes={pending ? [] : autoShapes}
                    drawing={drawing}
                    brush={brush}
                    text={t}
                  />
                </div>
                <div className="crew-banner bottom">
                  <div className="crew-name">
                    <span className={'crew-dot ' + orientation} />
                    <span>{orientation === 'white' ? t.white : t.black}</span>
                    <small>
                      {game.mode === 'bot' && game.player === orientation
                        ? t.side
                        : game.mode === 'bot'
                          ? t.levels[game.level]
                          : game.mode === 'engine' ? t.engine + ' · ' + t.levels[game.engineLevels?.[orientation] ?? game.level] : t.local}
                    </small>
                  </div>
                  <span className="board-turn">
                    {shownReady && (
                      <span
                        className={'turn-light ' + (thinking ? 'pulse' : '')}
                      />
                    )}{' '}
                    {status}
                  </span>
                </div>
                {(view === 'play' || view === 'analysis') && (
                  <div
                    className="history-toolbar"
                    aria-label={t.historyNavigation}
                  >
                    {iconButton(
                      t.first,
                      () => go(0),
                      ChevronFirst,
                      cursor === 0,
                    )}
                    {iconButton(
                      t.prev,
                      () => go(cursor - 1),
                      ArrowLeft,
                      cursor === 0,
                    )}
                    {view === 'analysis' && iconButton(
                      autoplay ? t.pauseReplay : t.playReplay,
                      () => {
                        if (autoplay) setAutoplay(false);
                        else {
                          if (cursor === active.length) go(0, true);
                          setAutoplay(true);
                        }
                      },
                      autoplay ? Pause : Play,
                      !active.length,
                    )}
                    {iconButton(
                      t.next,
                      () => go(cursor + 1),
                      ArrowRight,
                      cursor === active.length,
                    )}
                    {iconButton(
                      t.last,
                      () => go(active.length),
                      ChevronLast,
                      cursor === active.length,
                    )}
                    <span className="history-counter">
                      {cursor} / {active.length}
                    </span>
                  </div>
                )}
                {reviewing && <div className="playback-note" role="status"><span>{t.historyReadOnly}</span><button className="quiet-button" onClick={() => go(game.moves.length)}><ChevronLast size={16} />{t.returnLive}</button></div>}
                <div className="board-tools">
                  <div>
                    {iconButton(
                      t.flip,
                      () =>
                        setOrientation((o) =>
                          o === 'white' ? 'black' : 'white',
                        ),
                      ArrowDownUp,
                    )}
                    {iconButton(
                      t.undo,
                      undo,
                      RotateCcw,
                      !game.moves.length || view !== 'play',
                    )}
                    {iconButton(
                      t.clear,
                      () => setShapes([]),
                      Trash2,
                      !shapes.length,
                    )}
                  </div>
                  <div className="draw-controls">
                    <button
                      className={'quiet-button ' + (drawing ? 'selected' : '')}
                      onClick={() => setDrawing((d) => !d)}
                    >
                      <Pencil size={15} />
                      {t.drawMode}
                    </button>
                    {drawing && (
                      <div className="brushes" aria-label={t.drawingColor}>
                        {['green', 'red', 'blue', 'yellow'].map((c) => (
                          <button
                            key={c}
                            className={
                              'brush ' + c + (brush === c ? ' selected' : '')
                            }
                            aria-label={c}
                            onClick={() => setBrush(c)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="board-hint">
                  {drawing ? t.touchHelp : t.arrowsHelp}
                </p>
              </section>
              <aside className="side-panel">
                <div
                  className={
                    'status-card ' +
                    (pending ? 'returning' : terminal ? 'finished' : '')
                  }
                  role="status"
                >
                  <span className="status-icon">
                    {terminal ? (
                      <Flag size={23} />
                    ) : pending ? (
                      <RotateCcw size={23} />
                    ) : (
                      <Compass size={23} className={thinking ? 'spin' : ''} />
                    )}
                  </span>
                  <div>
                    <strong>{status}</strong>
                    <p>
                      {reviewing
                        ? thinking ? t.thinking : terminal ? resultStatus : liveReady
                          ? `${t.liveTurn} ${livePosition?.turn === 'white' ? t.white : t.black}`
                          : t.loading
                        : pending
                        ? t.returnHelp
                        : terminal
                          ? resultReason
                          : shown?.check
                            ? t.check
                            : thinking
                              ? t.levels[game.mode === 'engine' ? game.engineLevels?.[livePosition?.turn || 'white'] ?? game.level : game.level]
                              : t.ready}
                    </p>
                  </div>
                  {pending &&
                    iconButton(
                      t.cancel,
                      cancelReturn,
                      X,
                    )}
                </div>
                {error && (
                  <div className="notice error" role="alert">
                    {error}
                    <button
                      onClick={() => {
                        rulesRef.current?.close();
                        rulesRef.current = new Rules();
                        setRetry((n) => n + 1);
                      }}
                    >
                      {t.retry}
                    </button>
                  </div>
                )}
                {notice && <div className="notice">{notice}</div>}
                {storageError && (
                  <div className="notice" role="alert">
                    {t.storageError}
                  </div>
                )}
                {view === 'play' ? (
                  <>
                    <section className="panel setup">
                      <h2>
                        <Ship size={18} />
                        {t.mode}
                      </h2>
                      <button className="quiet-button setup-toggle" aria-expanded={setupOpen} aria-controls="game-setup-options" onClick={() => setSetupOpen((open) => !open)}><Settings2 size={15} />{t.newGameOptions}</button>
                      {!setupOpen && <p className="game-mode-summary">{gameDescription(game)}</p>}
                      {setupOpen && <div id="game-setup-options"><div className="segmented">
                        <button
                          className={mode === 'bot' ? 'selected' : ''}
                          onClick={() => setMode('bot')}
                        >
                          <Skull size={16} />
                          {t.bot}
                        </button>
                        <button
                          className={mode === 'local' ? 'selected' : ''}
                          onClick={() => setMode('local')}
                        >
                          {t.local}
                        </button>
                        <button className={mode === 'engine' ? 'selected' : ''} onClick={() => setMode('engine')}><Compass size={16} />{t.engineVsEngine}</button>
                      </div>
                      <div className="setup-grid">
                        <label>
                          {t.side}
                          <select
                            value={side}
                            disabled={mode === 'engine'}
                            onChange={(e) =>
                              setSide(e.target.value as Side | 'random')
                            }
                          >
                            <option value="white">{t.white}</option>
                            <option value="black">{t.black}</option>
                            <option value="random">{t.random}</option>
                          </select>
                        </label>
                        <label>
                          {mode === 'engine' ? t.whiteEngine : t.level}
                          <select
                            value={level}
                            disabled={mode === 'local'}
                            onChange={(e) => setLevel(Number(e.target.value))}
                          >
                            {t.levels.map((l, i) => (
                              <option key={i} value={i}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </label>
                        {mode === 'engine' && <label>{t.blackEngine}<select value={blackLevel} onChange={(e) => setBlackLevel(Number(e.target.value))}>{t.levels.map((l, i) => <option value={i} key={i}>{l}</option>)}</select></label>}
                      </div>
                      </div>}
                      <button className="primary-button full" onClick={askNew}>
                        <Play size={16} />
                        {terminal ? t.rematch : t.newGame}
                        <ArrowRight size={16} />
                      </button>
                    </section>
                    {game.mode === 'engine' && <section className="panel engine-match-controls"><button className="quiet-button full" disabled={!!terminal} onClick={() => setEnginesPaused((p) => !p)}>{enginesPaused ? <Play size={16} /> : <Pause size={16} />}{enginesPaused ? t.resumeGame : t.pauseGame}</button><p>{t.engineGameHelp}</p></section>}
                    <section className="panel log-panel">
                      <h2>
                        <BookOpen size={18} />
                        {t.voyage}
                        <small>{game.moves.length}</small>
                      </h2>
                      <MoveLog
                        startFen={startFen}
                        moves={game.moves}
                        cursor={cursor}
                        onSelect={go}
                        empty={t.noMoves}
                      />
                    </section>
                    <div className="action-row">
                      {game.mode !== 'engine' && game.rulesVersion !== 'pirescacs-v5' && <button
                        className="quiet-button"
                        disabled={!!terminal}
                        onClick={() =>
                          setModal({
                            message: t.resignConfirm,
                            action: () => {
                              stop();
                              patch({
                                end: {
                                  result:
                                    game.mode === 'bot'
                                      ? game.player === 'white'
                                        ? '0-1'
                                        : '1-0'
                                      : livePosition?.turn === 'white'
                                        ? '0-1'
                                        : '1-0',
                                  reason: 'resignation',
                                },
                              });
                            },
                          })
                        }
                      >
                        <Flag size={15} />
                        {t.resign}
                      </button>}
                      {game.mode === 'local' && (
                        <button
                          className="quiet-button"
                          disabled={!!terminal}
                          onClick={() =>
                            setModal({
                              message: t.drawConfirm,
                              action: () => {
                                stop();
                                patch({
                                  end: {
                                    result: '1/2-1/2',
                                    reason: 'agreement',
                                  },
                                });
                              },
                            })
                          }
                        >
                          {t.draw}
                        </button>
                      )}
                      <button
                        className="quiet-button accent"
                        onClick={toAnalysis}
                      >
                        <SearchIcon size={15} />
                        {t.inspect}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <section className="panel engine-panel">
                      <div className="engine-heading">
                        <h2>
                          <SearchIcon size={18} />
                          {t.engine}
                          <small>WASM</small>
                        </h2>
                        <button
                          className="engine-switch"
                          role="switch"
                          aria-checked={engineEnabled}
                          aria-label={t.continuous}
                          aria-keyshortcuts="l"
                          title={t.continuous + ' (L)'}
                          disabled={!!batchProgress}
                          onClick={toggleEngine}
                        >
                          <span />
                          <span className="sr-only">{t.continuous}</span>
                        </button>
                      </div>
                      <div className="engine-activity">
                        <span
                          className={
                            'engine-light' + (running ? ' active' : '')
                          }
                        />
                        {batchProgress
                          ? t.batch
                          : pending
                            ? t.analysisAwaitReturn
                            : running
                            ? t.liveAnalysis
                            : !engineEnabled
                              ? t.enginePaused
                              : terminal
                                ? t.result
                                : t.loading}
                      </div>
                      <p className="muted">{t.engineSub}</p>
                      <div className="score-line">
                        <strong>
                          {main ? formatScore(main, cached, t, game.rulesVersion === 'pirescacs-v5') : '—'}
                        </strong>
                        <span>{main ? t.best : t.noAnalysis}</span>
                      </div>
                      {main && (
                        <>
                          <button
                            className="best-move"
                            onClick={() => {
                              if (main.pv[0]) commit(main.pv[0]);
                            }}
                            disabled={!humanCanPlay}
                          >
                            {moveText(main.pv[0] || '')}
                            <ArrowRight size={17} />
                          </button>
                          <div className="engine-stats">
                            <span>
                              {t.depth}
                              <b>{main.depth}</b>
                            </span>
                            <span>
                              {t.nodes}
                              <b>{main.nodes.toLocaleString(lang)}</b>
                            </span>
                            <span>
                              {t.time}
                              <b>{(main.time / 1000).toFixed(1)} s</b>
                            </span>
                          </div>
                          <div className="pv-lines">
                            {finalLines.map((l, i) => (
                              <div key={i}>
                                <b title={formatScore(l, cached, t, game.rulesVersion === 'pirescacs-v5')}>
                                  {l.mate !== undefined
                                    ? game.rulesVersion === 'pirescacs-v5' ? t.wonShip[0] + (l.mate > 0 ? '+' : '−') + (l.winPlies ?? Math.abs(l.mate) * 2 - 1) : '#' + l.mate
                                    : (l.score / 100).toFixed(2)}
                                </b>
                                <span className="pv-moves">
                                  {l.pv.slice(0, 8).map((m, j) => (
                                    <button
                                      key={j}
                                      disabled={!shownReady || !!pending}
                                      title={t.exploreLine + ' ' + (i + 1)}
                                      aria-label={
                                        t.exploreLine +
                                        ' ' +
                                        (i + 1) +
                                        ': ' +
                                        l.pv
                                          .slice(0, j + 1)
                                          .map(moveText)
                                          .join(' · ')
                                      }
                                      onClick={() => exploreLine(l, j)}
                                    >
                                      {moveText(m)}
                                    </button>
                                  ))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      <div className="analysis-actions">
                        <button
                          className="quiet-button"
                          disabled={!shownReady || !game.moves.length || !!pending}
                          onClick={batchProgress ? () => stop() : batch}
                        >
                          {batchProgress ? (
                            <Square size={14} />
                          ) : (
                            <SearchIcon size={14} />
                          )}
                          {batchProgress ? t.stop : t.batch}
                        </button>
                      </div>
                      {batchProgress && (
                        <div className="batch-progress">
                          <progress
                            value={batchProgress[0]}
                            max={batchProgress[1]}
                          />
                          <small>
                            {t.progress} {batchProgress[0]}/{batchProgress[1]}
                          </small>
                        </div>
                      )}
                      <p className="fine-print">{t.estimate}</p>
                      {loss !== undefined && (
                        <p className="evaluation-loss">
                          {t.evalLoss}: <b>{loss.toFixed(2)}</b> · {t.budget}{' '}
                          {cached!.budget / 1000} s
                        </p>
                      )}
                      <details className="engine-settings">
                        <summary>
                          <Settings2 size={15} />
                          {t.settings}
                        </summary>
                        <label className="engine-lines-setting">
                          {t.lines}
                          <select
                            aria-label={t.lines}
                            value={multiPV}
                            onChange={(e) => setMultiPV(Number(e.target.value))}
                          >
                            {[1, 2, 3].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="engine-display-settings">
                          <label>
                            <input
                              type="checkbox"
                              checked={showEngineArrows}
                              onChange={(e) =>
                                setShowEngineArrows(e.target.checked)
                              }
                            />
                            {t.engineArrows}
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={showEvalBar}
                              onChange={(e) => setShowEvalBar(e.target.checked)}
                            />
                            {t.evaluationBar}
                          </label>
                        </div>
                        <div className="setup-grid">
                          <label>
                            {t.memory}
                            <select
                              aria-label={t.memory}
                              value={settings.hash}
                              onChange={(e) =>
                                setSettings((s) => ({
                                  ...s,
                                  hash: Number(e.target.value),
                                }))
                              }
                            >
                              {[16, 32, 64, 128].map((m) => (
                                <option key={m} value={m}>
                                  {m} MiB
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {t.threads}
                            <select
                              aria-label={t.threads}
                              value={settings.threads}
                              onChange={(e) =>
                                setSettings((s) => ({
                                  ...s,
                                  threads: Number(e.target.value),
                                }))
                              }
                            >
                              <option value={1}>1</option>
                              {crossOriginIsolated &&
                                (navigator.hardwareConcurrency || 1) >= 4 && (
                                  <option value={2}>2</option>
                                )}
                            </select>
                          </label>
                        </div>
                      </details>
                    </section>
                    <section className="panel log-panel">
                      <h2>
                        <BookOpen size={18} />
                        {branch ? t.variant : t.voyage}
                      </h2>
                      <MoveLog
                        startFen={startFen}
                        moves={active}
                        cursor={cursor}
                        onSelect={go}
                        empty={t.noMoves}
                      />
                      {branch && (
                        <button
                          className="quiet-button full"
                          onClick={() => {
                            setBranch(undefined);
                            setCursor(Math.min(cursor, game.moves.length));
                          }}
                        >
                          {t.returnMain}
                        </button>
                      )}
                    </section>
                    <details className="keyboard-help">
                      <summary>{t.shortcuts}</summary>
                      <p>{t.historyKeys}</p>
                      <p>{t.analysisKeys}</p>
                    </details>
                    <EvalGraph
                      game={game}
                      onSelect={(n) => {
                        stop();
                        setBranch(undefined);
                        setCursor(Math.max(0, Math.min(game.moves.length, n)));
                      }}
                      title={t.advantage}
                      cursor={cursor}
                    />
                    {game.variations.length > 0 && (
                      <details className="variations">
                        <summary>
                          {t.variant} · {game.variations.length}
                        </summary>
                        {game.variations.map((p, i) => (
                          <button
                            className="quiet-button full"
                            key={i}
                            onClick={() => {
                              setBranch(p);
                              setCursor(p.length);
                            }}
                          >
                            {i + 1}. {p.slice(-3).map(moveText).join(' · ')}
                          </button>
                        ))}
                      </details>
                    )}
                    <button
                      className="quiet-button full"
                      onClick={() => {
                        setBranch(undefined);
                        setCursor(game.moves.length);
                        setView('play');
                      }}
                    >
                      <ArrowLeft size={15} />
                      {t.backGame}
                    </button>
                  </>
                )}
                <div className="export-row">
                  <button
                    onClick={() =>
                      download(
                        JSON.stringify(game, null, 2),
                        'pirescacs-' + game.id.slice(0, 8) + '.json',
                      )
                    }
                    title={t.export}
                  >
                    <Download size={15} />
                    {t.export}
                  </button>
                  <button
                    onClick={() => file.current?.click()}
                    title={t.import}
                  >
                    <Upload size={15} />
                    {t.import}
                  </button>
                  <button onClick={exportText} title={t.textExport}>
                    TXT
                  </button>
                </div>
                <p className="save-note">
                  <span /> {storageError ? t.disclaimer : t.saved}
                </p>
              </aside>
            </div>
          </>
        )}
        {view === 'rules' && (
          <RulesPage preferences={preferences} onSound={(fen, m) => soundsRef.current!.play(moveSound(fen, m))} text={t} lang={lang} rules={rulesRef.current!} />
        )}
        {view === 'games' && (
          <section className="games-page">
            <p className="eyebrow">{t.tagline}</p>
            <h1>{t.recent}</h1>
            <p className="muted">{t.disclaimer}</p>
            <div className="games-actions">
              <button
                className="primary-button"
                onClick={() => file.current?.click()}
              >
                <Upload size={16} />
                {t.import}
              </button>
              <button
                className="quiet-button"
                onClick={() =>
                  download(JSON.stringify(game, null, 2), 'pirescacs.json')
                }
              >
                <Download size={16} />
                {t.export}
              </button>
            </div>
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
            {!savedGames.length ? (
              <div className="empty-games">
                <Ship size={48} />
                <p>{t.emptyGames}</p>
              </div>
            ) : (
              <div className="game-cards">
                {savedGames.map((v) => (
                  <article className="game-card" key={v.id}>
                    <span className="game-card-icon">
                      <Ship size={27} />
                    </span>
                    <div>
                      <h2>
                        {new Date(v.created).toLocaleDateString(lang, {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </h2>
                      <p>
                        {v.mode === 'engine' ? t.engineVsEngine : v.mode === 'bot'
                          ? t.bot + ' · ' + t.levels[v.level]
                          : t.local}{' '}
                        · {v.moves.length} {t.plies}
                      </p>
                      <small>{v.end ? v.end.result : t.continuing}</small>
                    </div>
                    <div>
                      <button
                        className="quiet-button accent"
                        onClick={() => open(v)}
                      >
                        {t.open}
                        <ArrowRight size={16} />
                      </button>
                      {iconButton(
                        t.delete,
                        () =>
                          setModal({
                            message: t.deleteConfirm,
                            action: () => {
                              remove(v.id)
                                .then(() =>
                                  setSavedGames((s) =>
                                    s.filter((g) => g.id !== v.id),
                                  ),
                                )
                                .catch(() => setStorageError(true));
                            },
                          }),
                        Trash2,
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <footer>
        <span>
          <Anchor size={14} />
          {t.disclaimer}
        </span>
        <span>
          {t.privacy} <a href="/source.tar.gz">{t.source}</a> · GPL-3.0
        </span>
      </footer>
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={(e) => importGame(e.target.files?.[0])}
      />
      {preferencesOpen && <Personalization preferences={preferences} onChange={updatePreferences} onClose={() => setPreferencesOpen(false)} onPreview={previewSound} audioStatus={audioStatus} storageFailed={preferencesStorageFailed} text={t} />}
      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setModal(undefined)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={modal.message}
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <Compass size={28} />
            <p>{modal.message}</p>
            <div>
              <button
                className="quiet-button"
                autoFocus
                onClick={() => setModal(undefined)}
              >
                {t.cancel}
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  modal.action();
                  setModal(undefined);
                }}
              >
                {t.confirm}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function moveText(m: string) {
  if (!m) return '';
  return (
    m.slice(0, 2) +
    ' → ' +
    m.slice(2, 4) +
    (m.includes('@') ? ' ↺ ' + m.slice(5, 7) : m.endsWith('!') ? ' ✚' : '')
  );
}
function formatScore(
  l: Line | undefined,
  a: Analysis | undefined,
  t: typeof translations.ca,
  shipOnly = false,
) {
  if (!l) return '—';
  if (l.mate !== undefined)
    return `${l.mate > 0 ? '+' : '−'} ${t.winIn} ${l.winPlies ?? Math.abs(l.mate) * 2 - 1} ${t.plies}${shipOnly ? ' · ' + t.wonShip : a?.termination ? ' · ' + (a.termination === 'arrival' ? t.wonShip : t.wonMate) : ''}`;
  return (l.score > 0 ? '+' : '') + (l.score / 100).toFixed(2);
}
function MoveLog({
  startFen,
  moves,
  cursor,
  onSelect,
  empty,
}: {
  startFen: string;
  moves: string[];
  cursor: number;
  onSelect: (i: number) => void;
  empty: string;
}) {
  const offset = startFen.split(' ')[1] === 'b' ? 1 : 0, fullmove = Number(startFen.split(' ')[5]);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = container.current,
      row = box?.querySelector('.current') as HTMLElement | undefined;
    if (!box || !row) return;
    const top =
      row.getBoundingClientRect().top -
      box.getBoundingClientRect().top +
      box.scrollTop;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (top + row.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = top + row.offsetHeight - box.clientHeight;
  }, [cursor, moves.length]);
  return (
    <div className="move-log" ref={container}>
      {moves.length ? (
        Array.from({ length: Math.ceil((moves.length + offset) / 2) }, (_, i) => (
          <div className="move-row" key={i}>
            <span>{i + fullmove}.</span>
            {[i * 2 - offset, i * 2 + 1 - offset].map((j) =>
              moves[j] ? (
                <button
                  key={j}
                  className={cursor === j + 1 ? 'current' : ''}
                  onClick={() => onSelect(j + 1)}
                >
                  {moveText(moves[j])}
                </button>
              ) : (
                <span key={j} />
              ),
            )}
          </div>
        ))
      ) : (
        <div className="empty-log">
          <Anchor size={27} />
          <p>{empty}</p>
        </div>
      )}
    </div>
  );
}
function EvalGraph({
  game,
  onSelect,
  title,
  cursor,
}: {
  game: Voyage;
  onSelect: (i: number) => void;
  title: string;
  cursor: number;
}) {
  const values = Array.from(
    { length: game.moves.length + 1 },
    (_, i) => game.analyses[game.moves.slice(0, i).join(' ')]?.lines[0]?.score,
  );
  if (!values.some((v) => v !== undefined)) return null;
  const points = values
    .map((v, i) =>
      v === undefined
        ? undefined
        : {
            x: 5 + (i / Math.max(1, game.moves.length)) * 290,
            y: 50 - Math.tanh(v / 500) * 42,
            i,
          },
    )
    .filter(Boolean) as { x: number; y: number; i: number }[];
  return (
    <section className="panel eval-graph">
      <h2>{title}</h2>
      <svg viewBox="0 0 300 100" role="img" aria-label={title}>
        <line
          x1="0"
          x2="300"
          y1="50"
          y2="50"
          stroke="#4b6762"
          strokeDasharray="3 4"
        />
        <polyline
          points={points.map((p) => p.x + ',' + p.y).join(' ')}
          fill="none"
          stroke="#8cceb4"
          strokeWidth="2"
        />
        {points.map((p) => (
          <circle
            key={p.i}
            cx={p.x}
            cy={p.y}
            r={p.i === cursor ? 5 : 3}
            fill={p.i === cursor ? '#eee8d4' : '#8cceb4'}
            tabIndex={0}
            role="button"
            aria-label={`${p.i}: ${(values[p.i]! / 100).toFixed(2)}`}
            onClick={() => onSelect(p.i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSelect(p.i);
            }}
          />
        ))}
      </svg>
    </section>
  );
}
function RulesPage({
  text: t,
  rules,
  preferences,
  onSound,
}: {
  text: typeof translations.ca;
  lang: Lang;
  rules: Rules;
  preferences: Preferences;
  onSound: (fen: string, m: string) => void;
}) {
  const [s, setS] = useState<Snapshot>(),
    [example, setExample] = useState(0),
    [history, setHistory] = useState<string[]>([]),
    [pending, setPending] = useState<string[]>();
  const demos = [
    ['7r/7k/8/3P4/1p1K4/8/8/6R1 w - - 0 1 v:0', 'd4', t.captain, t.demoCaptain],
    ['7r/7k/8/3P4/3R4/8/8/K7 w - - 0 1 v:0', 'd4', t.ship, t.demoShip],
    ['7r/7k/1p6/4P3/3B4/8/8/K5R1 w - - 0 1 v:0', 'd4', t.musician, t.demoMusician],
    ['7r/7k/8/4P3/3N4/2P5/8/K5R1 w - - 0 1 v:0', 'd4', t.carpenter, t.demoCarpenter],
    ['7r/7k/8/8/8/2p5/3P4/K5R1 w - - 0 1 v:800', 'd2', t.marine, t.demoMarine],
    ['5r2/3P3k/8/8/8/8/8/K1R5 w - - 0 1 v:0', 'd7', t.rebirthTitle, t.demoReturn],
    ['7r/7k/8/4p3/3M4/8/8/K5R1 w - - 0 1 v:0', 'd4', t.doctor, t.demoDoctor],
    ['7k/8/8/3n4/8/8/1M6/K5R1 w - - 0 1 v:0 r:B@d4', 'b2', t.revivalTitle, t.demoRevival],
    ['8/7k/8/3pP3/8/8/8/K5R1 w - d6 0 1 v:0', 'e5', t.enPassant, t.demoEnPassant],
    ['7r/7k/3p4/8/3C1p2/8/8/K5R1 w - - 0 1 v:0', 'd4', t.chef, t.demoChef],
  ];
  useEffect(() => {
    let live = true;
    rules
      .load(history, demos[example][0])
      .then((v) => {
        if (live) setS(v);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [rules, example, history]);
  const reset = (n: number) => {
    setPending(undefined);
    setS(undefined);
    setExample(n);
    setHistory([]);
  };
  const demoMove = (m: string) => {
    const candidates =
      s?.legal.filter((v) => v.slice(0, 4) === m.slice(0, 4)) || [];
    if (candidates.some((v) => v.includes('@'))) setPending(candidates);
    else { if (s) onSound(s.fen, m); setHistory((h) => [...h, m]); }
  };
  const finish = (m: string) => {
    if (s) onSound(s.fen, m);
    setPending(undefined);
    setHistory((h) => [...h, m]);
  };
  const crew = [
    ['king', t.captain, t.captainRule],
    ['rook', t.ship, t.shipRule],
    ['chef', t.chef, t.chefRule],
    ['bishop', t.musician, t.musicianRule],
    ['knight', t.carpenter, t.carpenterRule],
    ['pawn', t.marine, t.marineRule],
    ['queen', t.doctor, t.doctorRule],
  ];
  return (
    <section className="rules-page">
      <p className="eyebrow">{t.rulesVersion}</p>
      <h1>{t.ruleTitle}</h1>
      <p className="rules-lead">{t.ruleIntro}</p>
      <div className="rules-layout">
        <div>
          <div className="piece-rules">
            {crew.map(([role, title, description]) => (
              <article key={role}>
                <img src={pieceImage('white', role, preferences.pieces)} alt="" />
                <div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
          <article className="rule-callout">
            <RotateCcw size={25} />
            <div>
              <h2>{t.rebirthTitle}</h2>
              <p>{t.rebirthRule}</p>
            </div>
          </article>
          <article className="rule-callout">
            <Flag size={25} />
            <p>{t.drawRule}</p>
          </article>
          <h2>{t.analysisStart}</h2>
          <table className="starting-table">
            <thead>
              <tr>
                <th></th>
                <th>{t.white}</th>
                <th>{t.black}</th>
              </tr>
            </thead>
            <tbody>
              {[
                [t.captain, 'e1', 'd8'],
                [t.ship, 'a2, g2', 'b7, h7'],
                [t.chef, 'a1, h1', 'a8, h8'],
                [t.musician, 'c1, f1', 'c8, f8'],
                [t.carpenter, 'd1', 'e8'],
                [t.doctor, 'b1, g1', 'b8, g8'],
                [
                  t.marine,
                  'b2, c2, d2, e2, f2, h2',
                  'a7, c7, d7, e7, f7, g7',
                ],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="example-board">
          <h2>{t.example}</h2>
          <div className="segmented example-tabs" role="tablist" aria-label={t.example}>
            {demos.map((demo, i) => <button key={i} role="tab" id={'example-tab-' + i} aria-controls="piece-example" aria-selected={example === i} tabIndex={example === i ? 0 : -1} className={example === i ? 'selected' : ''} onClick={() => reset(i)} onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + demos.length) % demos.length; reset(n); document.getElementById('example-tab-' + n)?.focus(); }
            }}>{demo[2]}</button>)}
          </div>
          <div id="piece-example" role="tabpanel" aria-labelledby={'example-tab-' + example}>
          <p className="demo-explanation">{demos[example][3]}</p>
          <Board
            preferences={preferences}
            snapshot={s && !history.length ? { ...s, legal: s.legal.filter((m) => m.startsWith(demos[example][1])) } : s}
            demoSquare={!history.length ? demos[example][1] as DrawShape['orig'] : undefined}
            orientation="white"
            enabled={!history.length}
            onMove={demoMove}
            pending={pending}
            onReturn={finish}
            onCancelReturn={() => setPending(undefined)}
            shapes={[]}
            onShapes={() => {}}
            drawing={false}
            brush="green"
            text={t}
          />
          <p>{pending ? t.returnHelp : t.demoSelect}</p>
          </div>
          <button className="quiet-button" onClick={() => reset(example)}>
            <RotateCcw size={15} />
            {t.analysisStart}
          </button>
        </div>
      </div>
    </section>
  );
}
function GhostShip() {
  return (
    <svg viewBox="0 0 800 620" fill="none">
      <g stroke="currentColor" strokeWidth="2">
        <path d="M145 407L650 407L575 483Q350 540 220 470Z" />
        <path d="M351 50V406M494 138V406" />
        <path d="M342 73L342 322L171 322Q267 187 215 73Z" />
        <path d="M363 83L520 94Q557 241 412 319H363Z" />
        <path d="M506 164L638 180Q660 289 530 360H506Z" />
        <path d="M206 432L595 442M268 459L559 463M350 338L226 407M498 366L600 407M350 73L165 407M495 164L678 407" />
        <path d="M350 48H446L418 87H350" />
        <path d="M86 516Q173 493 259 516T431 516T603 516T775 516M0 568Q86 543 172 568T344 568T516 568T688 568" />
        {[280, 330, 380, 430, 480, 530].map((x) => (
          <circle key={x} cx={x} cy={433} r={8} />
        ))}
      </g>
    </svg>
  );
}

function EvaluationBar({ context, score, label }: { context: string; score?: number; label: string }) {
  const remembered = useRef<DisplayEvaluation | undefined>(undefined);
  const value = rememberEvaluation(remembered.current, context, score, label);
  remembered.current = value;
  return <div className="eval-rail" title={value.label} aria-label={value.label} aria-busy={score === undefined} data-score={value.score}>
    <div style={{ height: `${whiteEvaluationHeight(value.score)}%` }} />
  </div>;
}
