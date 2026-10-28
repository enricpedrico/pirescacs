"""Ship-only tactical holdout: independently proved arrival wins/forced blockades."""
from rules_v5_test import Engine,legal,apply,read,write,sq,VARIANT
from functools import lru_cache
from pathlib import Path
import json,time

def mirror(f):
 b,w,v,ep,r,c,n=read(f)
 return write({63-i:p.swapcase() for i,p in b.items()},not w,sum(1<<(63-i) for i in range(64) if v>>i&1),None if ep is None else 63-ep,None if r is None else (r[0].swapcase(),63-r[1]),c,n)
def result(f):
 for i,p in read(f)[0].items():
  if p.lower()=='r' and i//8==(7 if p.isupper() else 0):return p.isupper()
 return None
@lru_cache(None)
def forced(f,side,plies):
 end=result(f)
 if end is not None:return end==side
 if not plies:return False
 ms=legal(f)
 if not ms:return False
 checks=(forced(apply(f,m),side,plies-1) for m in ms)
 return any(checks) if read(f)[1]==side else all(checks)
def f(p):return write({sq(s):c for s,c in p.items()})
fixtures=[
 ('arrival-now',f({'c7':'R','f8':'r'}),'win',1),
 ('arrival-swaps-chef',f({'c7':'R','c8':'C','f8':'r'}),'win',1),
 ('arrival-while-captain-attacked',f({'a1':'K','a8':'c','c7':'R','f8':'r'}),'win',1),
 ('second-ship-wins',f({'a7':'R','g2':'R','g3':'p','b7':'r','h7':'r'}),'win',1),
 ('chef-must-block',f({'a2':'R','f2':'r','d1':'C'}),'defense',2),
 ('chef-removes-blocker',f({'a8':'C','c8':'c','c7':'R','g8':'r'}),'win',3),
 ('doctor-revives-chef-to-clear-route','r1p2M2/2R5/8/8/8/8/8/8 w - - 0 1 v:0 r:C@e7','win',5),
 ('return-must-block',f({'d7':'P','e8':'c','a2':'R','a3':'k','f2':'r'}),'defense',2),
 ('captain-must-block',f({'a1':'K','b2':'R','f2':'r'}),'defense',2),
 ('carpenter-must-block',f({'a2':'R','f2':'r','d1':'N'}),'defense',2),
 ('musician-must-block',f({'a2':'R','f2':'r','b5':'B'}),'defense',2),
 ('sail-five-plies',f({'c5':'R','f8':'r'}),'win',5),
]
e=Engine();cases=[];start=time.time()
try:
 for title,fen,kind,depth in fixtures:
  for reflected in [False,True]:
   pos=mirror(fen) if reflected else fen;side=read(pos)[1];ms=legal(pos)
   solutions=[m for m in ms if forced(apply(pos,m),side,depth-1)] if kind=='win' else [m for m in ms if not forced(apply(pos,m),not side,depth-1)]
   assert solutions,(title,pos)
   e.send('ucinewgame\nsetoption name Skill Level value 20')
   best,infos=e.best(pos,ms=10000);passed=best in solutions
   cases.append({'name':title+('-black' if reflected else '-white'),'fen':pos,'kind':kind,'proofPlies':depth,'solutions':solutions,'best':best,'passed':passed,'finalInfo':infos[-2]})
   print(cases[-1]['name'],best,'PASS' if passed else 'FAIL',flush=True)
 report={'engine':'pirescacs-fairy-1.5.0','variant':VARIANT,'budgetMs':10000,'referenceProof':True,'seconds':round(time.time()-start,2),'passed':sum(c['passed'] for c in cases),'total':len(cases),'cases':cases}
 Path(__file__).with_name('v5-tactics-results.json').write_text(json.dumps(report,indent=2));assert report['passed']==report['total'],report
finally:e.close()
