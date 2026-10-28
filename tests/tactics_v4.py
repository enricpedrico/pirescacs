"""Holdout tactical acceptance: independently proved wins and forced defenses, mirrored.
Kept separate from evaluation tuning. Reference generates and verifies every solution.
"""
from rules_v4_test import Engine,legal,apply,read as parse,write as fenof,sq,attack,VARIANT
from functools import lru_cache
from pathlib import Path
import json,time

def mirror(f):
 b,w,v,ep,r,c,n=parse(f)
 return fenof({63-i:p.swapcase() for i,p in b.items()},not w,sum(1<<(63-i) for i in range(64) if v>>i&1),None if ep is None else 63-ep,None if r is None else (r[0].swapcase(),63-r[1]),c,n)
def result(f):
 b,w,*_=parse(f)
 for i,p in b.items():
  if p.lower()=='r' and i//8==(7 if p.isupper() else 0):return p.isupper()
 if not legal(f):
  k=next(i for i,p in b.items() if p==('K' if w else 'k'))
  if attack(b,k,not w):return not w
 return None
@lru_cache(None)
def forced(f,side,plies):
 end=result(f)
 if end is not None:return end==side
 if not plies:return False
 ms=legal(f)
 if not ms:return False
 checks=(forced(apply(f,m),side,plies-1) for m in ms)
 return any(checks) if parse(f)[1]==side else all(checks)
def f(p):return fenof({sq(s):c for s,c in p.items()})
fixtures=[
 ('doctor-revival-mate','8/3r3k/5KrN/P4M2/R7/8/8/8 w - - 0 1 v:0 r:N@e6','win',1),
 ('doctor-must-block',f({'a1':'K','h7':'k','b1':'R','f2':'r','e1':'M'}),'defense',2),
 ('arrival-now',f({'a1':'K','h7':'k','c7':'R','f8':'r'}),'win',1),
 ('arrival-by-captain-swap',f({'c8':'K','h5':'k','c7':'R','f8':'r'}),'win',1),
 ('mate-now','8/3r3k/4BK1N/P7/R7/8/8/8 w - - 0 1 v:0','win',1),
 ('protected-sail-five',f({'a1':'K','h7':'k','c5':'R','f8':'r','b6':'B','b7':'B','d5':'N'}),'win',5),
 ('captain-must-block',f({'e1':'K','h7':'k','a1':'R','f2':'r'}),'defense',2),
 ('carpenter-must-block',f({'a1':'K','h7':'k','b1':'R','f2':'r','d1':'N'}),'defense',2),
 ('musician-must-block',f({'a1':'K','h7':'k','b1':'R','f2':'r','b5':'B'}),'defense',2),
 ('return-must-block',f({'a1':'K','h6':'k','a2':'R','f8':'r','b1':'B','d7':'P','g7':'b'}),'legal-return',1),
]
e=Engine();cases=[];start=time.time()
try:
 for title,fen,kind,depth in fixtures:
  for reflected in [False,True]:
   pos=mirror(fen) if reflected else fen;side=parse(pos)[1];ms=legal(pos)
   if kind=='win':solutions=[m for m in ms if forced(apply(pos,m),side,depth-1)]
   elif kind=='defense':solutions=[m for m in ms if not forced(apply(pos,m),not side,depth-1)]
   else:solutions=[m for m in ms if '@' in m];assert solutions==ms
   assert solutions,(title,pos)
   e.send('ucinewgame\nsetoption name Skill Level value 20')
   best,infos=e.best(pos,ms=10000);passed=best in solutions
   cases.append({'name':title+('-black' if reflected else '-white'),'fen':pos,'kind':kind,'proofPlies':depth,'solutions':solutions,'best':best,'passed':passed,'finalInfo':infos[-2]})
   print(cases[-1]['name'],best,'PASS' if passed else 'FAIL',flush=True)
 report={'engine':'pirescacs-fairy-1.4.0','variant':VARIANT,'budgetMs':10000,'referenceProof':True,'seconds':round(time.time()-start,2),'passed':sum(c['passed'] for c in cases),'total':len(cases),'cases':cases}
 Path(__file__).with_name('v4-tactics-results.json').write_text(json.dumps(report,indent=2));assert report['passed']==report['total'],report
finally:e.close()
