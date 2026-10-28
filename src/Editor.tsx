import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownUp, Eraser, Move, Play, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Rules, START, type Side } from './engine';
import { normalizeFen, readPosition, squareBit, writePosition } from './position';
import type { Text } from './i18n';
import { pieceImage, type Preferences } from './preferences';
const roles: Record<string, string> = { k: 'king', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn', m: 'queen', c: 'chef' };
export function Editor({ text: t, initialFen, rules, onUse, playOptions, preferences }: {
  text: Text; initialFen: string; rules: Rules; playOptions: ReactNode; preferences: Preferences; onUse: (fen: string, analysis: boolean) => void;
}) {
  const [position, setPosition] = useState(() => readPosition(initialFen)),
    [orientation, setOrientation] = useState<Side>('white'),
    [tool, setTool] = useState('move'),
    [origin, setOrigin] = useState(''),
    [fenInput, setFenInput] = useState(initialFen),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const epoch = useRef(0), squares = useRef(new Map<string, HTMLButtonElement>());
  const fen = writePosition(position.pieces, position.turn, position.virgin, position.clock, position.full, position.ep, position.revival);
  useEffect(() => { setFenInput(fen); setError(''); epoch.current++; }, [fen]);
  useEffect(() => () => { epoch.current++; }, []);
  const name = (p: string) => ({ k: t.captain, r: t.ship, b: t.musician, n: t.carpenter, p: t.marine, m: t.doctor, c: t.chef }[p.toLowerCase()] || '');
  const image = (p: string) => pieceImage(p === p.toUpperCase() ? 'white' : 'black', roles[p.toLowerCase()], preferences.pieces);
  function place(sq: string, piece?: string, from?: string) {
    setOrigin('');
    setPosition((old) => {
      const pieces = { ...old.pieces }; let virgin = old.virgin & ~squareBit(sq);
      if (from) { delete pieces[from]; virgin &= ~squareBit(from); }
      if (piece) pieces[sq] = piece; else delete pieces[sq];
      return { ...old, pieces, virgin, clock: 0, full: 1, ep: '-', revival: undefined };
    });
  }
  function choose(sq: string) {
    if (tool !== 'move') place(sq, tool === 'erase' ? undefined : tool);
    else if (origin) {
      if (origin === sq) setOrigin('');
      else place(sq, position.pieces[origin], origin);
    } else if (position.pieces[sq]) setOrigin(sq);
  }
  function load(value: string) {
    try { setPosition(readPosition(normalizeFen(value))); setOrigin(''); setError(''); }
    catch { setError(t.fenInvalid); }
  }
  async function use(analysis: boolean) {
    const token = ++epoch.current; setBusy(true); setError('');
    try {
      const result = await rules.load([], fen, 'pirescacs-v5', true);
      if (token !== epoch.current) return;
      if (result.error) setError(t.positionInvalid);
      else onUse(result.fen, analysis);
    } catch { if (token === epoch.current) setError(t.error); }
    finally { setBusy(false); }
  }
  const homePawns = Object.entries(position.pieces).filter(([sq, p]) => (p === 'P' && sq[1] === '2') || (p === 'p' && sq[1] === '7')).sort(([a], [b]) => a.localeCompare(b));
  const boardSquares = Array.from({ length: 64 }, (_, i) => {
    const x = orientation === 'white' ? i % 8 : 7 - i % 8, y = orientation === 'white' ? 8 - Math.floor(i / 8) : 1 + Math.floor(i / 8);
    return { sq: String.fromCharCode(97 + x) + y, x, y };
  });
  return <section className="editor-page">
    <div className="editor-heading"><div><p className="eyebrow">{t.setPosition} · PIRESCACS V5</p><h1>{t.positionTitle}</h1><p>{t.positionIntro}</p></div></div>
    <div className="editor-layout">
      <div>
        <div className="editor-board" role="grid" aria-label={t.setPosition}>
          {boardSquares.map(({ sq, x, y }) => { const p = position.pieces[sq]; return <button key={sq} ref={(el) => { if (el) squares.current.set(sq, el); else squares.current.delete(sq); }}
            role="gridcell" className={'editor-square ' + ((x + y) % 2 === 1 ? 'dark' : 'light') + (origin === sq ? ' chosen' : '')}
            aria-label={sq + (p ? ' ' + (p === p.toUpperCase() ? t.white : t.black) + ' ' + name(p) : '')}
            onClick={() => choose(sq)} onContextMenu={(e) => { e.preventDefault(); place(sq); }} draggable={!!p}
            onDragStart={(e) => { e.dataTransfer.setData('application/x-pirescacs-square', sq); e.dataTransfer.effectAllowed = 'move'; setOrigin(sq); }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={(e) => { e.preventDefault(); const from = e.dataTransfer.getData('application/x-pirescacs-square'); if (position.pieces[from] && from !== sq) place(sq, position.pieces[from], from); }}
            onDragEnd={() => setOrigin('')}
            onKeyDown={(e) => { const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
              if (delta[e.key]) { e.preventDefault(); const [dx, dy] = delta[e.key], sign = orientation === 'white' ? 1 : -1;
                const nx = Math.max(0, Math.min(7, x + dx * sign)), ny = Math.max(1, Math.min(8, y + dy * sign)); squares.current.get(String.fromCharCode(97 + nx) + ny)?.focus(); }
              else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); place(sq); }
            }}>
              {p && <img src={image(p)} alt="" draggable={false} />}
              {preferences.coordinates && <span className="editor-coordinate">{sq}</span>}
            </button>; })}
        </div>
        <div className="editor-board-actions"><button className="quiet-button" onClick={() => setOrientation((o) => o === 'white' ? 'black' : 'white')}><ArrowDownUp size={15} />{t.flip}</button><button className="quiet-button" onClick={() => load(START)}><RotateCcw size={15} />{t.initialPosition}</button><button className="quiet-button" onClick={() => { setPosition({ ...position, pieces: {}, virgin: 0n, clock: 0, full: 1, ep: '-', revival: undefined }); setOrigin(''); }}><Trash2 size={15} />{t.emptyBoard}</button></div>
        <p className="editor-help">{t.editorHelp}</p>
      </div>
      <div className="panel editor-panel">
        <h2>{t.positionPalette}</h2>
        {['white', 'black'].map((color) => <div className="editor-palette" key={color}>{['k', 'r', 'b', 'n', 'm', 'c', 'p'].map((letter) => { const p = color === 'white' ? letter.toUpperCase() : letter; return <button className={tool === p ? 'selected' : ''} key={p} aria-pressed={tool === p} aria-label={(color === 'white' ? t.white : t.black) + ' ' + name(p)} title={name(p)} onClick={() => { setTool(p); setOrigin(''); }}><img src={image(p)} alt="" /></button>; })}</div>)}
        <div className="segmented"><button className={tool === 'move' ? 'selected' : ''} onClick={() => { setTool('move'); setOrigin(''); }}><Move size={15} />{t.movePieces}</button><button className={tool === 'erase' ? 'selected' : ''} onClick={() => { setTool('erase'); setOrigin(''); }}><Eraser size={15} />{t.eraser}</button></div>
        <label className="editor-turn">{t.turn}<select value={position.turn} onChange={(e) => setPosition({ ...position, turn: e.target.value as 'w' | 'b', ep: '-', revival: undefined })}><option value="w">{t.white}</option><option value="b">{t.black}</option></select></label>
        <fieldset className="editor-rights"><legend>{t.doubleRights}</legend><p>{t.doubleHelp}</p><div>{homePawns.map(([sq, p]) => <label key={sq}><input type="checkbox" checked={!!(position.virgin & squareBit(sq))} onChange={(e) => setPosition({ ...position, virgin: e.target.checked ? position.virgin | squareBit(sq) : position.virgin & ~squareBit(sq) })} />{sq} <span className="sr-only">{p === 'P' ? t.white : t.black}</span></label>)}</div>{!homePawns.length && <p>{t.noHomePawns}</p>}</fieldset>
        <label className="editor-fen">{t.positionFen}<textarea spellCheck={false} value={fenInput} onChange={(e) => setFenInput(e.target.value)} /></label>
        <button className="quiet-button" onClick={() => load(fenInput)}>{t.loadFen}</button>
        {error && <p className="editor-error" role="alert">{error}</p>}
        {playOptions}<div className="editor-use"><button className="primary-button" disabled={busy} onClick={() => use(true)}><Search size={16} />{busy ? t.loading : t.analysePosition}</button><button className="quiet-button" disabled={busy} onClick={() => use(false)}><Play size={16} />{t.playPosition}</button></div>
      </div>
    </div>
  </section>;
}
