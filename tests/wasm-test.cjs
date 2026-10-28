const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'),mode=process.argv[2]||'single';
 const filename=path.resolve(root,'../../work','test-'+mode+'.cjs');fs.copyFileSync(path.join(root,'public/engine/pirescacs-'+mode+'.js'),filename);
 const factory=require(filename);
 const sf=await factory({wasmBinary:fs.readFileSync(path.join(root,'public/engine/pirescacs-'+mode+'.wasm'))});
 let pending;const logs=[];
 sf.addMessageListener(line=>{logs.push(line);if(pending&&((pending.target==='readyok'&&line==='readyok')||line.startsWith(pending.target+' '))){const {resolve,timer}=pending;clearTimeout(timer);pending=null;resolve(line);}});
 const query=(target,commands)=>new Promise((resolve,reject)=>{const request={target,resolve};pending=request;request.timer=setTimeout(()=>{if(pending===request){pending=null;reject(new Error('Timeout: '+logs.slice(-6).join('\n')));}},15000);request.timer.unref();for(const c of commands)sf.postMessage(c);});
 await query('readyok',['setoption name UCI_Variant value pirescacs','setoption name Use NNUE value false','setoption name Threads value '+(mode==='multi'?2:1),'isready']);
 const fixtures=[['startpos',[]],['fen 5r2/7k/8/2P1p3/3N4/8/8/K1R5 w - - 0 1 v:0',[]],['fen 5r2/7k/8/8/8/8/2P5/K1R5 w - - 0 1 v:400',['c1c2']],['fen 5r2/3P3k/8/8/8/8/8/K1R5 w - - 0 1 v:0',['d7d8@b2']]];
 for (const variant of ['pirescacs','pirescacs-v1','pirescacs-v2','pirescacs-v3','pirescacs-v4','pirescacs-v5']) for(const [fen,moves]of fixtures){
  const commands=['setoption name UCI_Variant value '+variant,'setoption name Use NNUE value false','position '+fen+' moves '+moves.join(' '),'snapshot'];
  const wasm=JSON.parse((await query('snapshot',commands)).slice(9));
  const native=execFileSync(path.join(root,'engine/src/stockfish'),{input:commands.join('\n')+'\nquit\n',encoding:'utf8'}).split('\n').find(s=>s.startsWith('snapshot '));
  const n=JSON.parse(native.slice(9));wasm.legal.sort();n.legal.sort();if(JSON.stringify(wasm)!==JSON.stringify(n))throw new Error('Native/WASM mismatch '+fen);
 }
 await query('snapshot',['setoption name UCI_Variant value pirescacs','position fen 8/8/8/8/8/8/8/8 w - - 0 1','validate','snapshot']).then(s=>{if(JSON.parse(s.slice(9)).error)throw new Error('Free editor rejected empty board');});
 await query('snapshot',['position startpos','validate','snapshot']).then(s=>{if(JSON.parse(s.slice(9)).error)throw new Error('Recovery failed');});
 const medical=JSON.parse(fs.readFileSync(path.join(root,'tests/v4-fixtures.json'),'utf8'));
 for(const f of medical){
   const output=await query('snapshot',['setoption name UCI_Variant value pirescacs-v4','position fen '+f.fen+' moves '+f.moves.join(' '),'validate','snapshot']);
   const actual=JSON.parse(output.slice(9)),expected=f.expected;actual.legal.sort();expected.legal.sort();
   if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('v4 native/reference/WASM mismatch '+JSON.stringify(f));
 }
 console.log(JSON.stringify({mode,v4Fixtures:medical.length,medicalParity:true}));
 const ships=JSON.parse(fs.readFileSync(path.join(root,'tests/v5-fixtures.json'),'utf8'));
 for(const f of ships){
   const output=await query('snapshot',['setoption name UCI_Variant value pirescacs-v5','position fen '+f.fen+' moves '+f.moves.join(' '),'validate','snapshot']);
   const actual=JSON.parse(output.slice(9)),expected=f.expected;actual.legal.sort();expected.legal.sort();
   if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('v5 native/reference/WASM mismatch '+JSON.stringify(f));
 }
 console.log(JSON.stringify({mode,v5Fixtures:ships.length,shipOnlyParity:true}));
 await query('readyok',['setoption name UCI_Variant value pirescacs','isready']);
 const samples=[];for(let i=0;i<100;i++){const start=performance.now();await query('snapshot',['position startpos','snapshot']);samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);
 console.log(JSON.stringify({mode,rulesResponseP95Ms:samples[94],samples:samples.length}));
 if(process.argv.includes('--tactics') || process.argv.includes('--v4-tactics') || process.argv.includes('--v5-tactics')){
   const v4=process.argv.includes('--v4-tactics'); const prefix=process.argv.includes('--v5-tactics')?'v5-':v4?'v4-':'';
   const corpus=JSON.parse(fs.readFileSync(path.join(root,'tests/'+prefix+'tactics-results.json'),'utf8')),cases=corpus.cases,results=[];
   sf.postMessage('setoption name UCI_Variant value '+corpus.variant);
   for(const c of cases){const started=performance.now();const output=await query('bestmove',['ucinewgame','position fen '+c.fen,'go movetime 10000']);const move=output.split(' ')[1];results.push({name:c.name,best:move,passed:c.solutions.includes(move),wallMs:Math.round(performance.now()-started)});console.log(c.name,move,results.at(-1).passed?'PASS':'FAIL');}
   fs.writeFileSync(path.join(root,'tests/'+prefix+'wasm-tactics-'+mode+'-results.json'),JSON.stringify({mode,engine:'pirescacs-fairy-1.5.0',variant:corpus.variant,budgetMs:10000,passed:results.filter(r=>r.passed).length,total:results.length,results},null,2));
   if(results.some(r=>!r.passed))throw new Error('WASM tactical acceptance failed');
 }
 const best=await query('bestmove',['position startpos','go nodes 2000']);
 if(!/^bestmove [a-h][1-8][a-h][1-8]/.test(best))throw new Error('Invalid bestmove');
 console.log(JSON.stringify({mode,fixtures:fixtures.length*6,nativeParity:true,search:true,best,info:logs.filter(l=>l.startsWith('info depth')).at(-1)}));
 if(sf.terminate)sf.terminate();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
