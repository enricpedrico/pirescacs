import assert from 'node:assert/strict';
import { fresh, validateFile, save } from './.compiled/storage.js';
const {parseInfo, startingFen, START, V3_START, V4_START, LEGACY_START}=await import('./.compiled/engine.js');
assert.equal(parseInfo('info depth 20 currmove b3b4 currmovenumber 3'),undefined);
const line=parseInfo('info depth 12 seldepth 17 multipv 1 score cp -281 nodes 647908 time 2000 pv b3b4 c7c5');
assert.equal(line.score,-281);assert.deepEqual(line.pv,['b3b4','c7c5']);
assert.equal(parseInfo('info depth 8 score mate 3 nodes 1382 time 6 pv c5c6 h7g6').winPlies,5);
const game=fresh('local','white',2);
game.moves=['g2g3','b7b6'];
game.annotations['g2g3 b7b6']=[{orig:'c2',dest:'e4',brush:'green',customSvg:{html:'unsafe'}}];
game.variations=[['g2g3','b7b6','a2a3']];
game.analyses['']={version:'pirescacs-fairy-1.0.0',budget:2000,lines:[{depth:8,nodes:234,time:2000,score:23,multiPV:1,pv:['g2g3']}],best:'g2g3'};
const imported=validateFile(JSON.parse(JSON.stringify(game)));
assert.deepEqual(imported.moves,game.moves);
assert.deepEqual(imported.variations,game.variations);
assert.deepEqual(imported.analyses[''].lines[0].pv,['g2g3']);
assert.equal(imported.analyses[''].budget,2000);
assert.equal(imported.annotations['g2g3 b7b6'][0].customSvg,undefined);
assert.equal(imported.annotations['g2g3 b7b6'][0].brush,'green');
assert.notEqual(imported.id,game.id);
for(const invalid of [{...game,rulesVersion:'other'},{...game,moves:['wrong']},{...game,variations:[['invalid']]}])assert.throws(()=>validateFile(invalid));
await assert.rejects(save(game)); // Node has no IndexedDB: storage failure must reject cleanly.
console.log('Export/import preserves moves, variations, numeric analyses and arrows; untrusted SVG removed; invalid versions and variations rejected; unavailable IndexedDB handled.');

const {normalizeFen, readPosition, writePosition, squareBit} = await import('./.compiled/position.js');
const custom='7k/8/8/8/8/8/3P4/K7 b - - 0 7 v:800';
const edited=fresh('bot','black',3); edited.startFen=custom;
assert.equal(edited.rulesVersion,'pirescacs-v5');
assert.equal(validateFile(edited).startFen,custom);
const p=readPosition(custom); assert.equal(writePosition(p.pieces,p.turn,p.virgin,p.clock,p.full),custom);
assert.equal(p.virgin & squareBit('d2'),squareBit('d2'));
assert.equal(validateFile({...game,rulesVersion:'pirescacs-v1'}).rulesVersion,'pirescacs-v1');
for(const invalid of ['8/8/8/8/8/8/8 w - - 0 1','8/8/8/8/8/8/8/9 w - - 0 1','8/8/8/8/8/8/8/8 w K - 0 1','8/8/8/8/8/8/8/8 x - - 0 1'])assert.throws(()=>normalizeFen(invalid));
assert.throws(()=>validateFile({...game,startFen:'bad'}));
console.log('v3/custom position FEN, turn, counters and individual pawn rights round-trip; v1/v2 imports preserved.');

assert.equal(startingFen('pirescacs-v3'),V3_START);
for(const rulesVersion of ['pirescacs-v1','pirescacs-v2']) {
 const old=validateFile({...game,rulesVersion});
 assert.equal(old.rulesVersion,rulesVersion);assert.equal(old.startFen,undefined);
 assert.equal(startingFen(old.rulesVersion),LEGACY_START);
}
assert.notEqual(START,LEGACY_START);
assert.match(V3_START,/^2bknbn1\/prpppppp\/8\/8\/8\/8\/PPPPPPRP\/1NBNKB2 /);

assert.equal(startingFen('pirescacs-v4'),V4_START);
assert.match(V4_START,/^1mbknbm1\/prpppppp\/8\/8\/8\/8\/PPPPPPRP\/1MBNKBM1 /);
const medical='7k/8/8/3pP3/8/8/1M6/K7 w - d6 0 1 v:0 r:B@d4';
const mp=readPosition(medical); assert.equal(writePosition(mp.pieces,mp.turn,mp.virgin,mp.clock,mp.full,mp.ep,mp.revival),medical);
const duel=fresh('engine','white',3);duel.engineLevels={white:3,black:1};duel.startFen=medical;duel.moves=['b2b2!'];duel.variations=[['e5d6']];
const d=validateFile(duel);assert.equal(d.mode,'engine');assert.deepEqual(d.engineLevels,{white:3,black:1});assert.deepEqual(d.moves,['b2b2!']);assert.equal(d.startFen,medical);
for(const bad of ['r:K@d4','r:R@d4','r:b@d4','r:B@z9','r:B@d4 r:P@e5','v:0 v:1'])assert.throws(()=>normalizeFen('8/8/8/8/8/8/8/8 w - - 0 1 '+bad));
console.log('v4 doctor, EP square, revival window and engine matchup settings survive export/import; historical v3 root preserved.');

assert.equal(startingFen('pirescacs-v5'),START);
assert.match(START,/^cmbknbmc\/prpppppr\/8\/8\/8\/8\/RPPPPPRP\/CMBNKBMC /);
const chef='8/8/8/8/3c4/8/1M6/C6K w - - 0 1 v:0 r:C@d4';
const cp=readPosition(chef);assert.equal(writePosition(cp.pieces,cp.turn,cp.virgin,cp.clock,cp.full,cp.ep,cp.revival),chef);
const cg=fresh('local','white',2);cg.startFen=chef;cg.moves=['b2b2!'];cg.analyses['']={version:'pirescacs-fairy-1.5.0',budget:100,lines:[{depth:4,nodes:100,time:100,score:-400,multiPV:1,pv:['b2b2!']}]};
assert.equal(validateFile(cg).analyses[''].lines[0].score,-400);
assert.equal(validateFile(cg).startFen,chef);
assert.equal(validateFile({...cg,end:{reason:'resignation',result:'1-0'}}).end,undefined);
assert.equal(validateFile({...cg,end:{reason:'agreement',result:'1-0'}}).end,undefined);
assert.equal(validateFile({...cg,end:{reason:'agreement',result:'1/2-1/2'}}).end.result,'1/2-1/2');
assert.equal(validateFile({...cg,rulesVersion:'pirescacs-v4',startFen:medical,end:{reason:'resignation',result:'1-0'}}).end.result,'1-0');
console.log('v5 chef/resurrection, two-ship root, analyses, ship-only outcomes and legacy v4 root/result preservation verified.');
