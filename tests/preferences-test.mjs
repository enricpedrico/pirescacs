import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { DEFAULT_PREFERENCES as defaults, normalizePreferences, loadPreferences, savePreferences, pieceImage } from './.compiled/preferences.js';
import { SOUND_EVENTS, SOUND_RATE, synthesizeSound, moveSound, Sounds } from './.compiled/sound.js';

for (const invalid of [undefined, null, false, [], 'bad', { version: 99 }, { version: 1, sound: 'false', volume: NaN, board: '__proto__', size: 'enormous', pieces: 'unknown' }])
  assert.deepEqual(normalizePreferences(invalid), defaults);
assert.equal(normalizePreferences({ version: 1, volume: Infinity }).volume, 45);
assert.equal(normalizePreferences({ version: 1, volume: 120 }).volume, 100);
assert.equal(normalizePreferences({ version: 1, volume: -20 }).volume, 0);
const custom = { ...defaults, sound: false, soundSet: 'wood', volume: 71, board: 'ocean', pieces: 'ivory', animation: 'none', historySound: true, focus: true };
let stored;
globalThis.localStorage = { getItem: () => stored, setItem: (_key, value) => { stored = value; } };
assert.equal(savePreferences(custom), true);
assert.deepEqual(loadPreferences(), custom);
stored = '{bad'; assert.deepEqual(loadPreferences(), defaults);
globalThis.localStorage = { getItem() { throw Error('Unavailable'); }, setItem() { throw Error('Full'); } };
assert.deepEqual(loadPreferences(), defaults); assert.equal(savePreferences(custom), false);
assert.equal(pieceImage('white', 'bishop', 'bronze', true), '/pieces/bronze/legacy/white-bishop.svg');
console.log('Preferences: bounded/typed values, unknown version, corrupt JSON, unavailable storage, persistence and legacy icons verified.');

const fen = '7k/3P4/8/8/3p4/8/1N6/KR6 w - - 0 1 v:0';
assert.equal(moveSound(fen, 'b1b2'), 'swap');
assert.equal(moveSound(fen, 'b2d4'), 'capture');
assert.equal(moveSound(fen, 'b2d3'), 'move');
assert.equal(moveSound(fen, 'd7d8@c3'), 'return');
const sets = ['glass', 'wood', 'quiet'];
const stats = [];
for (const set of sets) for (const event of SOUND_EVENTS) {
  const pcm = synthesizeSound(set, event);
  assert.ok([...pcm].every(Number.isFinite));
  assert.equal(pcm[0], 0); assert.equal(pcm.at(-1), 0);
  assert.ok(Math.max(...pcm.map(Math.abs)) < .85, `${set}/${event} clips`);
  assert.ok(pcm.some(x => Math.abs(x) > .05));
  const tail = pcm.slice(-240);
  assert.ok(Math.max(...tail.map(Math.abs)) < .003, `${set}/${event} abrupt tail`);
  assert.deepEqual(synthesizeSound(set, event), pcm);
  stats.push({ set, event, duration: pcm.length / SOUND_RATE, peak: Math.max(...pcm.map(Math.abs)), rms: Math.sqrt(pcm.reduce((n, x) => n + x * x, 0) / pcm.length) });
}
assert.notDeepEqual(synthesizeSound('glass', 'move'), synthesizeSound('wood', 'move'));
assert.notDeepEqual(synthesizeSound('glass', 'move'), synthesizeSound('glass', 'capture'));
console.log('24 original sound variants: deterministic PCM, finite samples, unclipped peaks, smooth ends and distinct events verified.');

class MockContext {
  static instances = [];
  state = 'suspended'; currentTime = 0; destination = {}; sources = []; createdBuffers = 0;
  constructor() { MockContext.instances.push(this); }
  createGain() { return { gain: { setValueAtTime: (n) => { this.volume = n; } }, connect() {} }; }
  createBuffer(_channels, length) { this.createdBuffers++; const pcm = new Float32Array(length); return { getChannelData: () => pcm }; }
  createBufferSource() { const s = { connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; } }; this.sources.push(s); return s; }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
}
globalThis.AudioContext = MockContext;
const heard = [], statuses = [], sound = new Sounds((s) => statuses.push(s), (e) => heard.push(e));
sound.configure(defaults); sound.play('move'); assert.equal(heard.length, 0); // autoplay remains locked
await sound.unlock(); assert.equal(sound.status, 'ready');
sound.play('move'); sound.play('capture'); sound.play('move');
assert.deepEqual(heard, ['move', 'capture', 'move']);
const context = MockContext.instances.at(-1);
assert.equal(context.createdBuffers, 2); // reuses move PCM
sound.play('navigate'); assert.equal(heard.length, 3);
sound.configure({ ...defaults, alerts: false }); sound.play('check'); sound.play('end'); sound.play('start');
assert.equal(heard.length, 3); sound.play('move'); assert.equal(heard.at(-1), 'move');
sound.configure({ ...defaults, historySound: true }); sound.play('navigate'); assert.equal(heard.at(-1), 'navigate');
sound.configure({ ...defaults, sound: false });
assert.ok(context.sources.every(s => s.stopped)); assert.equal(context.volume, 0);
sound.play('swap'); assert.equal(heard.at(-1), 'navigate');
sound.configure({ ...defaults, volume: 0 }); sound.play('return'); assert.equal(heard.at(-1), 'navigate');
sound.configure(defaults); context.state = 'suspended'; sound.play('move'); assert.equal(heard.at(-1), 'navigate');
await sound.unlock(); sound.play('return'); assert.equal(heard.at(-1), 'return');
sound.close(); assert.equal(context.state, 'closed');
class BlockedContext extends MockContext {
  attempts = 0;
  async resume() { if (!this.attempts++) throw Error('Try a user gesture'); this.state = 'running'; }
}
globalThis.AudioContext = BlockedContext;
const blocked = new Sounds(() => {}); blocked.configure(defaults); await blocked.unlock();
assert.equal(blocked.status, 'locked'); await blocked.unlock(); assert.equal(blocked.status, 'ready'); blocked.close();
delete globalThis.AudioContext;
const unavailable = new Sounds(() => {}); unavailable.configure(defaults); await unavailable.unlock();
assert.equal(unavailable.status, 'unavailable'); unavailable.play('move');
console.log('Audio lifecycle: gesture unlock, cache, check/start/end opt-out, silent history, immediate mute, zero volume, resume, cleanup and unsupported browsers verified.');

mkdirSync('tests/personalization', { recursive: true });
writeFileSync('tests/personalization/audio-metrics.json', JSON.stringify(stats, null, 2) + '\n');
if (process.argv.includes('--samples')) {
  // Listen to these exports to compare the same sound buffers used by Web Audio.
  const directory = '../../work/personalization'; mkdirSync(directory, { recursive: true });
  for (const set of sets) {
    const events = ['move', 'capture', 'swap', 'return'];
    const samples = new Float32Array(SOUND_RATE * 3);
    events.forEach((event, i) => samples.set(synthesizeSound(set, event), i * SOUND_RATE * .7));
    const wav = Buffer.alloc(44 + samples.length * 2);
    wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(SOUND_RATE, 24); wav.writeUInt32LE(SOUND_RATE * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
    samples.forEach((sample, i) => wav.writeInt16LE(Math.round(sample * 32767), 44 + i * 2));
    writeFileSync(directory + '/' + set + '.wav', wav);
  }
}

assert.equal(defaults.coordinates,false);
assert.equal(normalizePreferences({version:1,coordinates:true,sound:false,board:'ocean'}).coordinates,false);
assert.equal(normalizePreferences({version:2,coordinates:true}).coordinates,true);
assert.equal(moveSound('8/8/8/3pP3/8/8/8/8 w - d6 0 1','e5d6'),'capture');
assert.equal(moveSound('8/8/8/8/8/8/1M6/8 w - - 0 1 v:0 r:B@d4','b2b2!'),'return');
console.log('Coordinates default off and v1 preference migration verified; en passant and revival use the matching sound event.');
