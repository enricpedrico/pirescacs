import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key, Dests, Role, Piece } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';
import type { Snapshot, Side } from './engine';
import type { Text } from './i18n';
import { DEFAULT_PREFERENCES, pieceImage, type Preferences } from './preferences';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
interface Props {
  preferences?: Preferences;
  legacy?: boolean;
  demoSquare?: Key;
  historyNavigation?: boolean;
  analysisMode?: boolean;
  renderStart?: number;
  positionReady?: boolean;
  snapshot?: Snapshot;
  orientation: Side;
  enabled: boolean;
  last?: string;
  onMove: (move: string) => void;
  pending?: string[];
  onReturn: (m: string) => void;
  onCancelReturn?: () => void;
  shapes: DrawShape[];
  onShapes: (s: DrawShape[]) => void;
  autoShapes?: DrawShape[];
  drawing: boolean;
  brush: string;
  text: Text;
}
export function Board(props: Props) {
  const preferences = props.preferences || DEFAULT_PREFERENCES;
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)'), update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const el = useRef<HTMLDivElement>(null),
    ground = useRef<Api | undefined>(undefined),
    latest = useRef(props);
  latest.current = props;
  const lastMeasured = useRef<number | undefined>(undefined),
    latencies = useRef<number[]>([]);
  const [focus, setFocus] = useState('c2'),
    [selected, setSelected] = useState(''),
    [inspectedDoctor, setInspectedDoctor] = useState('');
  const focusRef = useRef('c2');
  function focusSquare(square: string) {
    focusRef.current = square;
    setFocus(square);
  }
  useEffect(() => {
    if (!el.current) return;
    ground.current = Chessground(el.current, {
      autoCastle: false,
      coordinates: preferences.coordinates,
      disableContextMenu: true,
      premovable: { enabled: false },
      drawable: {
        enabled: true,
        defaultSnapToValidMove: false,
        eraseOnClick: false,
      },
      movable: {
        free: false,
        rookCastle: false,
        events: {
          after: (orig, dest) => {
            const p = latest.current;
            // Chessground animates the ship. Restore the friendly displaced piece immediately.
            const before = pieceAt(p.snapshot?.fen || '', dest);
            if (
              before &&
              pieceAt(p.snapshot?.fen || '', orig)?.toLowerCase() === 'r' &&
              (before === before.toUpperCase()) ===
                (p.snapshot?.turn === 'white')
            ) {
              const role = roles[before.toLowerCase() as keyof typeof roles];
              ground.current?.setPieces(
                new Map([[orig, { role, color: p.snapshot!.turn }]]),
              );
            }
            const candidates =
              p.snapshot?.legal.filter((m) => m.slice(0, 4) === orig + dest) ||
              [];
            if (candidates.length) p.onMove(candidates[0]);
          },
        },
      },
      events: {
        select: (key) => {
          setSelected(key);
          setInspectedDoctor(pieceAt(latest.current.snapshot?.fen || '', key)?.toLowerCase() === 'm' ? key : '');
        },
      },
      animation: {
        duration: 160,
        enabled: !matchMedia('(prefers-reduced-motion: reduce)').matches,
      },
    });
    return () => ground.current?.destroy();
  }, []);
  useEffect(() => {
    if (props.positionReady === false) {
      ground.current?.set({
        movable: { color: undefined, dests: new Map() },
        draggable: { enabled: false },
        selectable: { enabled: false },
      });
      return;
    }
    const dests: Dests = new Map();
    for (const move of props.snapshot?.legal || []) {
      const orig = move.slice(0, 2) as Key,
        dest = move.slice(2, 4) as Key;
      const row = dests.get(orig) || [];
      if (!row.includes(dest)) row.push(dest);
      dests.set(orig, row);
    }
    const enabled = props.enabled && !props.pending && !props.drawing;
    const coordinatesChanged = ground.current?.state.coordinates !== preferences.coordinates;
    ground.current?.set({
      orientation: props.orientation,
      turnColor: props.snapshot?.turn,
      check: props.snapshot?.check ? props.snapshot.turn : false,
      coordinates: preferences.coordinates,
      highlight: { lastMove: preferences.lastMove, check: true },
      animation: {
        enabled: !reducedMotion && preferences.animation !== 'none',
        duration: preferences.animation === 'smooth' ? 240 : preferences.animation === 'fast' ? 90 : 160,
      },
      lastMove: props.last
        ? [
            props.last.slice(0, 2) as Key,
            props.last.slice(2, 4) as Key,
            ...(props.last.includes('@')
              ? [props.last.slice(5, 7) as Key]
              : []),
          ]
        : [],
      movable: {
        color: enabled ? props.snapshot?.turn : undefined,
        dests: enabled ? dests : new Map(),
        showDests: preferences.destinations,
      },
      draggable: { enabled },
      selectable: { enabled },
      drawable: {
        shapes: props.shapes,
        autoShapes: props.autoShapes || [],
        onChange: (s) => latest.current.onShapes(s),
      },
    });
    ground.current?.setPieces(renderPieces(props.snapshot?.fen));
    if (coordinatesChanged) ground.current?.redrawAll();
    if (props.demoSquare && enabled) {
      ground.current?.selectSquare(props.demoSquare);
      focusSquare(props.demoSquare);
    }
    // Visual arrival while the user chooses the final, engine-approved return square.
    if (props.pending?.length && props.snapshot) {
      const m = props.pending[0],
        pawn = pieceAt(props.snapshot.fen, m.slice(0, 2));
      if (pawn)
        ground.current?.setPieces(
          new Map([
            [m.slice(0, 2) as Key, undefined],
            [
              m.slice(2, 4) as Key,
              { role: 'pawn', color: props.snapshot.turn },
            ],
          ]),
        );
    }
    if (
      import.meta.env.DEV &&
      props.renderStart !== undefined &&
      props.renderStart !== lastMeasured.current
    ) {
      lastMeasured.current = props.renderStart;
      const start = props.renderStart;
      requestAnimationFrame(() => {
        latencies.current.push(performance.now() - start);
        if (el.current)
          el.current.dataset.moveLatencies = JSON.stringify(
            latencies.current.slice(-100),
          );
      });
    }
  }, [
    props.demoSquare,
    props.renderStart,
    props.positionReady,
    props.snapshot,
    props.orientation,
    props.enabled,
    props.last,
    props.shapes,
    props.autoShapes,
    props.pending,
    props.drawing,
    preferences.coordinates,
    preferences.lastMove,
    preferences.destinations,
    preferences.animation,
    reducedMotion,
  ]);
  const pointerOrigin = useRef<Key | undefined>(undefined);
  function drawDown(e: React.PointerEvent) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerOrigin.current = ground.current?.getKeyAtDomPos([
      e.clientX,
      e.clientY,
    ]);
  }
  function drawUp(e: React.PointerEvent) {
    const orig = pointerOrigin.current,
      dest = ground.current?.getKeyAtDomPos([e.clientX, e.clientY]);
    pointerOrigin.current = undefined;
    if (!orig || !dest) return;
    const shape = {
      orig,
      dest: dest === orig ? undefined : dest,
      brush: props.brush,
    };
    const existing = props.shapes.find(
      (s) =>
        s.orig === shape.orig &&
        s.dest === shape.dest &&
        s.brush === shape.brush,
    );
    props.onShapes(
      existing
        ? props.shapes.filter((s) => s !== existing)
        : [...props.shapes, shape],
    );
  }
  function key(e: React.KeyboardEvent) {
    // The main board uses unmodified arrows for the game history. Alt retains square navigation.
    if (
      props.historyNavigation &&
      !props.pending &&
      !e.altKey &&
      (e.key.startsWith('Arrow') || (props.analysisMode && e.key === ' '))
    )
      return;
    const x = focusRef.current.charCodeAt(0) - 97,
      y = Number(focusRef.current[1]) - 1,
      sign = props.orientation === 'white' ? 1 : -1;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-sign, 0],
      ArrowRight: [sign, 0],
      ArrowUp: [0, sign],
      ArrowDown: [0, -sign],
    };
    if (delta[e.key]) {
      e.preventDefault();
      const [dx, dy] = delta[e.key];
      focusSquare(
        String.fromCharCode(97 + Math.max(0, Math.min(7, x + dx))) +
          (Math.max(0, Math.min(7, y + dy)) + 1),
      );
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (props.pending) {
        const move = props.pending.find((m) => m.endsWith('@' + focusRef.current));
        if (move) props.onReturn(move);
      } else if (props.enabled && !props.drawing) {
        const revival = focusRef.current + focusRef.current + '!';
        if (selected === focusRef.current && props.snapshot?.legal.includes(revival)) { setSelected(''); props.onMove(revival); }
        else {
          const move = selected && props.snapshot?.legal.find((m) => m.slice(0, 4) === selected + focusRef.current);
          if (move) { setSelected(''); props.onMove(move); }
          else ground.current?.selectSquare(focusRef.current as Key, true);
        }
      }
    } else if (e.key === 'Escape') {
      if (props.pending) { e.preventDefault(); props.onCancelReturn?.(); }
      ground.current?.selectSquare(null);
      setSelected(''); setInspectedDoctor('');
    }
  }
  useEffect(() => {
    if (props.pending?.length) {
      setSelected('');
      ground.current?.selectSquare(null);
      focusSquare(props.pending[0].split('@')[1]);
    }
  }, [props.pending]);
  const selectedPiece = pieceAt(props.snapshot?.fen || '', focus);
  const pieceName = selectedPiece
    ? {
        k: props.text.captain,
        r: props.text.ship,
        b: props.legacy ? props.text.carpenter : props.text.musician,
        n: props.legacy ? props.text.musician : props.text.carpenter,
        p: props.text.marine,
        m: props.text.doctor,
        c: props.text.chef,
      }[selectedPiece.toLowerCase()]
    : '';
  return (
    <div className={"board-component" + (props.legacy ? " legacy-pieces" : "")} style={Object.fromEntries(
      ['white', 'black'].flatMap((color) => ['king', 'rook', 'bishop', 'knight', 'queen', 'chef', 'pawn'].map((role) =>
        [`--piece-${color}-${role}`, `url("${pieceImage(color, role, preferences.pieces, props.legacy)}")`]))
    ) as CSSProperties}>
      <div
        className="board-frame"
        tabIndex={0}
        role="application"
        aria-label={`${props.text.brand}. ${props.pending ? props.text.returnKeys : props.historyNavigation ? props.text.historyKeys : props.text.keyboard}`}
        onKeyDown={key}
        onPointerDownCapture={(e) => {
          const square = ground.current?.getKeyAtDomPos([e.clientX, e.clientY]);
          if (square) {
            focusSquare(square);
            setInspectedDoctor(pieceAt(props.snapshot?.fen || '', square)?.toLowerCase() === 'm' ? square : '');
          }
        }}
      >
        <div className="cg-wrap" ref={el} />
        <div
          className="keyboard-focus"
          style={squareStyle(focus, props.orientation)}
        />
        {preferences.destinations && inspectedDoctor && pieceAt(props.snapshot?.fen || '', inspectedDoctor)?.toLowerCase() === 'm' && <div className="doctor-range" style={doctorRangeStyle(inspectedDoctor, props.orientation)} role="img" aria-label={props.text.doctorArea} />}
        {props.drawing && (
          <div
            className="draw-layer"
            onPointerDown={drawDown}
            onPointerUp={drawUp}
            onPointerCancel={() => (pointerOrigin.current = undefined)}
          />
        )}
        {props.pending && (
          <div className="return-layer">
            {props.pending.map((m) => (
              <button
                key={m}
                className="return-square"
                style={squareStyle(m.slice(5, 7), props.orientation)}
                aria-label={`${props.text.returnPawn}: ${m.slice(5, 7)}`}
                onClick={() => props.onReturn(m)}
              >
                <span />
              </button>
            ))}
          </div>
        )}
      </div>
      {props.enabled && !props.pending && !props.drawing && props.snapshot?.revival && props.snapshot.legal.some((m) => m.endsWith('!')) && <div className="revival-choice" role="group" aria-label={props.text.revivalTitle}>
        <p>{props.text.revivalAvailable}</p>
        <div>{props.snapshot.legal.filter((m) => m.endsWith('!')).map((m) => <button key={m} className="quiet-button" onClick={() => props.onMove(m)}>{props.text.revive} · {m.slice(0, 2)} · {pieceLabel(props.snapshot!.revival!.piece, props.text)}</button>)}</div>
      </div>}
      <span className="sr-only" aria-live="polite">
        {focus} {pieceName}{' '}
        {selectedPiece &&
          (selectedPiece === selectedPiece.toUpperCase()
            ? props.text.white
            : props.text.black)}
        .{' '}
        {props.snapshot &&
          `${props.text.turn} ${props.snapshot.turn === 'white' ? props.text.white : props.text.black}`}{' '}
        {props.pending && props.text.returnPawn} {selected && `${selected} →`}
      </span>
    </div>
  );
}
const roles = {
  k: 'king',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
  m: 'queen',
  c: 'chef' as Role,
} as const;
export function pieceAt(fen: string, key: string): string | undefined {
  if (!key) return;
  const rows = fen.split(' ')[0].split('/');
  const row = rows[8 - Number(key[1])];
  if (!row) return;
  let x = 0;
  for (const c of row) {
    if (/\d/.test(c)) x += Number(c);
    else {
      if (x === key.charCodeAt(0) - 97) return c;
      x++;
    }
  }
}
function squareStyle(key: string, orientation: Side) {
  let x = key.charCodeAt(0) - 97,
    y = 8 - Number(key[1]);
  if (orientation === 'black') {
    x = 7 - x;
    y = 7 - y;
  }
  return { left: `${x * 12.5}%`, top: `${y * 12.5}%` };
}

function doctorRangeStyle(key: string, orientation: Side) {
  const x = key.charCodeAt(0) - 97, y = Number(key[1]) - 1;
  const left = Math.max(0, x - 4), right = Math.min(7, x + 4), bottom = Math.max(0, y - 4), top = Math.min(7, y + 4);
  return { left: `${(orientation === 'white' ? left : 7 - right) * 12.5}%`, top: `${(orientation === 'white' ? 7 - top : bottom) * 12.5}%`, width: `${(right - left + 1) * 12.5}%`, height: `${(top - bottom + 1) * 12.5}%` };
}
function pieceLabel(piece: string, t: Text) { return { k: t.captain, r: t.ship, b: t.musician, n: t.carpenter, m: t.doctor, c: t.chef, p: t.marine }[piece.toLowerCase()] || ''; }

// Chessground's public piece map supports extra rendered roles. The engine FEN
// remains authoritative; this adapter only maps symbols to SVG/CSS identities.
function renderPieces(fen?: string): Map<Key, Piece | undefined> {
  const pieces = new Map<Key, Piece | undefined>();
  for (let y = 1; y <= 8; y++) for (let x = 0; x < 8; x++)
    pieces.set((String.fromCharCode(97 + x) + y) as Key, undefined);
  if (fen) fen.split(' ')[0].split('/').forEach((row, y) => {
    let x = 0;
    for (const letter of row) {
      if (/[1-8]/.test(letter)) x += Number(letter);
      else pieces.set((String.fromCharCode(97 + x++) + (8 - y)) as Key, {
        role: roles[letter.toLowerCase() as keyof typeof roles],
        color: letter === letter.toUpperCase() ? 'white' : 'black',
      });
    }
  });
  return pieces;
}
