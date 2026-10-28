import { useEffect, useRef, useState } from 'react';
import { Check, Palette, Play, RotateCcw, Volume2, X } from 'lucide-react';
import type { Text } from './i18n';
import { BOARD_THEMES, DEFAULT_PREFERENCES, pieceImage, type Preferences } from './preferences';
import type { AudioStatus, SoundEvent } from './sound';

export function Personalization({ preferences: p, onChange, onClose, onPreview, audioStatus, storageFailed, text: t }: {
  preferences: Preferences; onChange: (p: Preferences) => void; onClose: () => void;
  onPreview: (event: SoundEvent) => void; audioStatus: AudioStatus; storageFailed: boolean; text: Text;
}) {
  const dialog = useRef<HTMLDialogElement>(null), [tab, setTab] = useState<'sound' | 'appearance'>('sound');
  useEffect(() => {
    const el = dialog.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    el.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; el.close(); opener?.focus(); };
  }, []);
  const update = (patch: Partial<Preferences>) => onChange({ ...p, ...patch });
  const toggle = (key: 'sound' | 'alerts' | 'historySound' | 'coordinates' | 'destinations' | 'lastMove' | 'background' | 'focus', label: string) =>
    <label className="preference-toggle"><span>{label}</span><input type="checkbox" checked={p[key]} onChange={(e) => update({ [key]: e.target.checked })} /></label>;
  const optionKeys = Object.keys(BOARD_THEMES) as (keyof typeof BOARD_THEMES)[];
  return <dialog ref={dialog} className="personalization" aria-labelledby="personalization-title" onKeyDown={(e) => {
    if (e.key !== 'Tab') return;
    const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), input:not(:disabled), select:not(:disabled)'));
    if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); }
    else if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1)?.focus(); }
  }} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.target === e.currentTarget && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) onClose();
  }}>
    <div className="personalization-heading"><div><p className="eyebrow">PIRESCACS</p><h2 id="personalization-title">{t.personalize}</h2></div><button className="icon-button" aria-label={t.closePreferences} onClick={onClose} autoFocus><X size={21} /></button></div>
    <p className="personalization-intro">{t.preferencesIntro}</p>
    <div className="preference-tabs" role="tablist" aria-label={t.personalize}>
      {(['sound', 'appearance'] as const).map((name, index) => <button key={name} id={'preferences-tab-' + name} role="tab" aria-selected={tab === name} aria-controls={'preferences-panel-' + name} tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)} onKeyDown={(e) => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 'sound' : e.key === 'End' ? 'appearance' : index === 0 ? 'appearance' : 'sound'; setTab(next); document.getElementById('preferences-tab-' + next)?.focus(); } }}>{name === 'sound' ? <Volume2 size={17} /> : <Palette size={17} />}{t[name]}</button>)}
    </div>
    <div className="preferences-body">
      {tab === 'sound' ? <section id="preferences-panel-sound" role="tabpanel" aria-labelledby="preferences-tab-sound">
        {toggle('sound', t.soundEnabled)}
        <label className="volume-control">{t.volume}<output>{p.volume}%</output><input aria-label={t.volume} type="range" min="0" max="100" step="1" value={p.volume} onChange={(e) => update({ volume: Number(e.target.value) })} /></label>
        <fieldset className="preference-fieldset"><legend>{t.soundStyle}</legend><div className="sound-options">{(['glass', 'wood', 'quiet'] as const).map((set, i) => <button key={set} className={p.soundSet === set ? 'selected' : ''} aria-pressed={p.soundSet === set} onClick={() => { onChange({ ...p, soundSet: set }); onPreview('move'); }}><span>{t.soundSets[i]}{p.soundSet === set && <Check size={16} />}</span><small>{t.soundDescriptions[i]}</small></button>)}</div></fieldset>
        <div className="sound-previews">{(['move', 'capture', 'swap', 'return'] as const).map((event, i) => <button className="quiet-button" disabled={!p.sound || !p.volume || audioStatus === 'unavailable'} key={event} onClick={() => onPreview(event)}><Play size={13} />{t.soundSamples[i]}</button>)}</div>
        <p className="sound-hint">{t.softGlassHelp}</p>
        {toggle('alerts', t.soundAlerts)}
        {toggle('historySound', t.soundHistory)}
        <p className="sound-status" role="status">{audioStatus === 'unavailable' ? t.audioUnavailable : !p.sound || !p.volume ? t.soundMuted : audioStatus === 'ready' ? t.soundReady : t.soundUnlock}</p>
      </section> : <section id="preferences-panel-appearance" role="tabpanel" aria-labelledby="preferences-tab-appearance">
        <div className="appearance-grid"><div>
          <fieldset className="preference-fieldset"><legend>{t.boardColors}</legend><div className="board-options">{optionKeys.map((theme, i) => <button key={theme} aria-pressed={p.board === theme} className={p.board === theme ? 'selected' : ''} onClick={() => update({ board: theme })}><span className="board-swatch" style={{ background: `conic-gradient(${BOARD_THEMES[theme][1]} 25%, ${BOARD_THEMES[theme][0]} 0 50%, ${BOARD_THEMES[theme][1]} 0 75%, ${BOARD_THEMES[theme][0]} 0)` }} /><span>{t.boardThemes[i]}</span>{p.board === theme && <Check size={13} />}</button>)}</div></fieldset>
          <label className="preference-select">{t.pieceStyle}<select aria-label={t.pieceStyle} value={p.pieces} onChange={(e) => update({ pieces: e.target.value as Preferences['pieces'] })}>{(['spectral', 'ivory', 'bronze'] as const).map((theme, i) => <option value={theme} key={theme}>{t.pieceThemes[i]}</option>)}</select></label>
        </div><div className="preference-preview"><div className="mini-board" aria-label={t.boardPreview}>{Array.from({ length: 16 }, (_, i) => <span key={i} style={{ backgroundColor: BOARD_THEMES[p.board][(Math.floor(i / 4) + i % 4) % 2] }}>{[0, 1, 2, 3, 12, 13, 14, 15].includes(i) && <img src={pieceImage(i < 4 ? 'black' : 'white', ['rook', 'king', 'bishop', 'knight'][i % 4], p.pieces)} alt="" />}</span>)}</div><small>{t.previewLive}</small></div></div>
        <div className="preference-selects">
          <label className="preference-select">{t.boardSize}<select aria-label={t.boardSize} value={p.size} onChange={(e) => update({ size: e.target.value as Preferences['size'] })}>{(['compact', 'comfortable', 'large'] as const).map((size, i) => <option value={size} key={size}>{t.boardSizes[i]}</option>)}</select></label>
          <label className="preference-select">{t.animationStyle}<select aria-label={t.animationStyle} value={p.animation} onChange={(e) => update({ animation: e.target.value as Preferences['animation'] })}>{(['system', 'none', 'fast', 'smooth'] as const).map((name, i) => <option value={name} key={name}>{t.animationStyles[i]}</option>)}</select></label>
          <label className="preference-select">{t.accentColor}<select aria-label={t.accentColor} value={p.accent} onChange={(e) => update({ accent: e.target.value as Preferences['accent'] })}>{(['mint', 'blue', 'amber'] as const).map((color, i) => <option value={color} key={color}>{t.accentColors[i]}</option>)}</select></label>
        </div>
        <p className="sound-hint">{t.reducedMotionHelp}</p>
        {toggle('coordinates', t.showCoordinates)}{toggle('destinations', t.showDestinations)}{toggle('lastMove', t.showLastMove)}{toggle('background', t.showBackground)}{toggle('focus', t.focusMode)}
      </section>}
    </div>
    {storageFailed && <p className="preferences-storage-error" role="alert">{t.preferencesStorageError}</p>}
    <div className="personalization-footer"><button className="quiet-button" onClick={() => onChange({ ...DEFAULT_PREFERENCES })}><RotateCcw size={14} />{t.resetPreferences}</button><button className="primary-button" onClick={onClose}>{t.done}</button></div>
  </dialog>;
}
