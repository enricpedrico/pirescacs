"""200 paired games: adjacent difficulty budgets, reversed colours, fixed opening seeds."""
from rules_v4_test import Engine,START,legal,apply,read as parse,VARIANT
import json,random,time
from pathlib import Path
rng=random.Random(7108);engines=[Engine(),Engine()];budgets=[256,1024,4096,16384];skills=[0,5,20,20];results=[];start=time.time()
try:
 for pair in range(100):
  low=pair%3;high=low+1;opening=[];fen=START
  for _ in range((pair%5)*2):
   moves=legal(fen)
   if not moves:break
   m=rng.choice(moves);opening.append(m);fen=apply(fen,m)
  for reverse in [False,True]:
   levels=[high,low] if not reverse else [low,high]
   for seat,e in enumerate(engines):
    e.send('ucinewgame\nsetoption name Skill Level value '+str(skills[levels[seat]]))
   moves=opening.copy();outcome='1/2-1/2';reason='test-ply-limit';invalid=False
   for ply in range(160):
    snap=engines[0].snapshot(START,moves)
    if snap['result']!='*':outcome=snap['result'];reason=snap['reason'];break
    seat=0 if snap['turn']=='white' else 1
    best,info=engines[seat].best(START,moves,nodes=budgets[levels[seat]])
    if best not in snap['legal']:invalid=True;raise RuntimeError('Illegal search move '+best)
    moves.append(best)
   score=.5 if outcome=='1/2-1/2' else float((outcome=='1-0')==(levels[0]==high))
   results.append({'pair':pair,'high':high,'low':low,'highWhite':levels[0]==high,'result':outcome,'reason':reason,'plies':len(moves),'highScore':score,'invalid':invalid,'moves':moves})
  if pair%10==0:print(f'{len(results)}/200 games, {time.time()-start:.1f}s',flush=True)
 summary={f'{h} vs {h-1}':{'games':len(xs),'higherScore':round(sum(x['highScore'] for x in xs)/len(xs),4)} for h in [1,2,3] if (xs:=[x for x in results if x['high']==h])}
 report={'engine':'pirescacs-fairy-1.4.0','variant':VARIANT,'games':len(results),'paired':True,'seconds':round(time.time()-start,2),'nodeBudgets':budgets,'skillLevels':skills,'maxPlies':160,'summary':summary,'results':results}
 Path(__file__).with_name('v4-selfplay-results.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(summary),flush=True)
finally:
 for e in engines:e.close()
