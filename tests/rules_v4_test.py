"""Independent reference, v4 medical/EP rules; never shipped in browser code."""
import json, random, unittest
from pathlib import Path
from rules_test import Engine as BaseEngine, sq, name, fenof, attack as old_attack
START = '1mbknbm1/prpppppp/8/8/8/8/PPPPPPRP/1MBNKBM1 w - - 0 1'
VARIANT = 'pirescacs-v4'

def read(f):
    t=f.split(); b={}
    for y,row in enumerate(reversed(t[0].split('/'))):
        x=0
        for c in row:
            if c.isdigit(): x+=int(c)
            else: b[y*8+x]=c; x+=1
    v=next((int(x[2:],16) for x in t[6:] if x.startswith('v:')),sum(1<<i for i,p in b.items() if p.lower()=='p') if f.strip()==START else 0)
    revive=next(((x[2],sq(x[4:])) for x in t[6:] if x.startswith('r:')),None)
    return b,t[1]=='w',v,None if t[3]=='-' else sq(t[3]),revive,int(t[4]),int(t[5])

def write(b,w=True,v=0,ep=None,revive=None,clock=0,full=1):
    s=fenof(b,w,v,clock,full).split(); s[3]='-' if ep is None else name(ep)
    return ' '.join(s)+(f' r:{revive[0]}@{name(revive[1])}' if revive else '')

def distance(a,b): return max(abs(a%8-b%8),abs(a//8-b//8))

def doctors(b,w,revive):
    return [i for i,p in b.items() if p==('M' if w else 'm') and distance(i,revive[1])<=4] if revive else []

def attack(b,z,w):
    return old_attack(b,z,w) or any(p==('M' if w else 'm') and distance(i,z)==1 for i,p in b.items())

def apply(f,m):
    b,w,v,ep,r,clock,full=read(f); a,z=sq(m[:2]),sq(m[2:4]); p=b.pop(a); old=b.get(z); d=8 if w else -8
    capturedAt=z-d if p.lower()=='p' and z==ep and old is None and a%8!=z%8 else z
    q=b.pop(capturedAt,None); newep=None; newr=None
    v &= ~(1<<a|1<<z|1<<capturedAt)
    if m.endswith('!'): b[a]=r[0]; q=None
    else:
        swap=p.lower()=='r' and q and q.isupper()==w
        if swap: b[a]=q
        b[sq(m[5:]) if '@' in m else z]=p
        if p.lower()=='p' and abs(z-a)==16:
            middle=a+d
            if any(c==('p' if w else 'P') and abs(i%8-middle%8)==1 and i//8==z//8 for i,c in b.items()):newep=middle
        if q and not swap:
            candidate=(q,capturedAt)
            if doctors(b,not w,candidate):newr=candidate
    clock=0 if old or q or p.lower() in ('p','r') or m.endswith('!') else clock+1
    return write(b,not w,v,newep,newr,clock,full+(not w))

def legal(f):
    b,w,v,ep,r,_,_=read(f); moves=[]; step=1 if w else -1
    # A game with a ship already at its goal is finished; editor still accepts it.
    if any(c.lower()=='r' and i//8==(7 if c.isupper() else 0) for i,c in b.items()):return []
    for a,p in b.items():
        if p.isupper()!=w:continue
        x,y=a%8,a//8; typ=p.lower(); targets=[]
        if typ in ('k','b'):
            dirs=[(-1,-1),(-1,1),(1,-1),(1,1)]+([(1,0),(-1,0),(0,1),(0,-1)] if typ=='k' else [])
            for dx,dy in dirs:
                for n in range(1,8):
                    xx,yy=x+dx*n,y+dy*n
                    if not(0<=xx<8 and 0<=yy<8):break
                    z=xx+8*yy; q=b.get(z)
                    if not q or (q.isupper()!=w and q.lower() not in 'kr'):targets.append(z)
                    if q:break
        elif typ in ('n','m'):
            radius=2 if typ=='n' else 1
            for dx in range(-radius,radius+1):
                for dy in range(-radius,radius+1):
                    if max(abs(dx),abs(dy))!=radius:continue
                    xx,yy=x+dx,y+dy
                    if 0<=xx<8 and 0<=yy<8:
                        z=xx+8*yy;q=b.get(z)
                        if not q or (q.isupper()!=w and q.lower() not in 'kr'):targets.append(z)
            if typ=='m' and a in doctors(b,w,r):moves.append(name(a)+name(a)+'!')
        elif typ=='r':
            yy=y+step
            if 0<=yy<8:
                z=x+yy*8;q=b.get(z)
                if not q or q.isupper()==w:targets.append(z)
        elif typ=='p':
            yy=y+step
            if 0<=yy<8:
                z=x+yy*8
                if z not in b:
                    targets.append(z)
                    if y==(1 if w else 6) and (v>>a&1) and z+8*step not in b:targets.append(z+8*step)
                for xx in (x-1,x+1):
                    if not 0<=xx<8:continue
                    z=xx+yy*8;q=b.get(z)
                    if q and q.isupper()!=w and q.lower() not in 'kr':targets.append(z)
                    elif z==ep and not q and b.get(z-8*step)==('p' if w else 'P'):targets.append(z)
        for z in targets:
            base=name(a)+name(z)
            if typ=='p' and z//8==(7 if w else 0):
                moves += [base+'@'+name(ret) for ret in range(0,32) if ret not in b or ret==a] if w else [base+'@'+name(ret) for ret in range(32,64) if ret not in b or ret==a]
            else:moves.append(base)
    result=[]
    for m in moves:
        final=read(apply(f,m))[0]
        if any(attack(final,i,not w) for i,p in final.items() if p==('K' if w else 'k')):continue
        if '@' in m and any(attack(final,i,w) for i,p in final.items() if p==('k' if w else 'K')):continue
        result.append(m)
    return sorted(result)

class Engine(BaseEngine):
    def __init__(self):
        super().__init__(); self.send('setoption name UCI_Variant value '+VARIANT)
    def snapshot(self,fen=START,moves=[]):return super().snapshot(fen,moves)

class MedicalTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.e=Engine(); cls.fixtures=[]
    @classmethod
    def tearDownClass(cls):
        cls.e.close()
        Path(__file__).with_name('v4-fixtures.json').write_text(json.dumps(cls.fixtures,indent=2))
    def compare(self,f,moves=[]):
        expected=f
        for m in moves: self.assertIn(m,legal(expected)); expected=apply(expected,m)
        s=self.e.snapshot(f,moves); self.assertFalse(s['error'],f); self.assertEqual(sorted(s['legal']),legal(expected),expected)
        self.assertEqual(s['fen'],expected if len(expected.split())>=7 else self.e.snapshot(f)['fen'])
        self.fixtures.append({'fen':f,'moves':moves,'expected':s});return s
    def fixture(self,pieces,w=True,v=0,ep=None,r=None):return write({sq(k):p for k,p in pieces.items()},w,v,ep,r)
    def test_initial(self):
        s=self.e.snapshot(); self.compare(s['fen']);b,w,v,*_=read(s['fen']);self.assertEqual(len(b),28)
        for key,p in {'b1':'M','g1':'M','b8':'m','g8':'m','d1':'N','e8':'n','c1':'B','f1':'B','g2':'R','b7':'r','e1':'K','d8':'k','c2':'P','f7':'p'}.items():self.assertEqual(b[sq(key)],p)
        self.assertEqual({63-i:p.swapcase() for i,p in b.items()},b);self.assertEqual(len(s['legal']),22)
    def test_doctor_moves_edges_and_invulnerable_ships(self):
        for at in ['d4','a1','h8']:
            f=self.fixture({at:'M','e5':'p','c3':'r','f2':'k'});s=self.compare(f)
            dest={m[2:4] for m in s['legal'] if m.startswith(at)}
            self.assertNotIn('c3',dest)
        s=self.compare(self.fixture({'d4':'M','e5':'p'}));self.assertEqual(len(s['legal']),8);self.assertIn('d4e5',s['legal'])
    def test_capture_and_resurrection_all_piece_types_both_colors(self):
        for white in [True,False]:
            for victim in 'PNBM':
                own=lambda p:p if white else p.lower()
                enemy=lambda p:p.lower() if white else p
                f=self.fixture({'d4':own(victim),'f5':enemy('N'),'b2':own('M')},not white)
                s=self.compare(f,['f5d4']);self.assertIn('b2b2!',s['legal']);self.assertEqual(s['revival']['piece'],own(victim))
                s=self.compare(f,['f5d4','b2b2!']);self.assertEqual(read(s['fen'])[0][sq('b2')],own(victim));self.assertNotIn('revival',s)
    def test_range_four_diagonal_boundary_five_excluded(self):
        f=self.fixture({'e5':'B','g7':'n','a1':'M','b1':'M','h1':'M'},False)
        s=self.compare(f,['g7e5']);self.assertEqual(set(s['revival']['medics']),{'a1','b1','h1'})
        f=self.fixture({'f6':'B','h8':'n','a1':'M'},False);s=self.compare(f,['h8f6']);self.assertNotIn('revival',s)
    def test_window_expires_and_dead_doctor_cannot_revive(self):
        f=self.fixture({'d4':'B','f5':'n','b2':'M','h2':'P'},False)
        s=self.compare(f,['f5d4','h2h3','d4f5']);self.assertNotIn('revival',s);self.assertNotIn('b2b2!',s['legal'])
        f=self.fixture({'d4':'M','f5':'n'},False);s=self.compare(f,['f5d4']);self.assertNotIn('revival',s)
    def test_no_captain_or_ship_resurrection(self):
        for token in ['K','R','k','r']:
            s=self.e.snapshot('7k/8/8/8/8/8/1M6/K7 w - - 0 1 v:0 r:'+token+'@d4');self.assertTrue(s['error'])
    def test_resurrection_may_check_but_must_keep_own_captain_safe(self):
        f=self.fixture({'a1':'K','h8':'k','b2':'M'},r=('B',sq('d4')))
        s=self.compare(f,['b2b2!']);self.assertTrue(s['check'])
        f=self.fixture({'a1':'K','b2':'M','c3':'n','h7':'k'},r=('P',sq('d4')))
        self.assertNotIn('b2b2!',self.compare(f)['legal'])
        f=self.fixture({'a1':'K','b2':'M','e5':'b','h7':'k'},r=('B',sq('d4')))
        self.assertIn('b2b2!',self.compare(f)['legal'])
    def test_pawn_revival_loses_double_and_swap_doctor(self):
        f=self.fixture({'b2':'M'},r=('P',sq('c4')));s=self.compare(f,['b2b2!']);self.assertEqual(read(s['fen'])[2],0)
        f=self.fixture({'c1':'R','c2':'M','a1':'K','h7':'k'});s=self.compare(f,['c1c2']);self.assertEqual(read(s['fen'])[0][sq('c1')],'M')
    def test_ep_both_colors_and_medical_capture_square(self):
        for white in [True,False]:
            own='P' if white else 'p';enemy=own.swapcase(); at='e5' if white else 'e4'; victim='d5' if white else 'd4'; ep='d6' if white else 'd3'; doc='a1' if white else 'a8'
            f=self.fixture({at:own,victim:enemy,doc:'m' if white else 'M'},white,ep=sq(ep));m=at+ep
            s=self.compare(f,[m]);self.assertNotIn(sq(victim),read(s['fen'])[0]);self.assertEqual(s['revival']['capturedAt'],victim)
            self.compare(f,[m,doc+doc+'!'])
    def test_ep_double_step_expiry_and_discovered_check(self):
        f=self.fixture({'e2':'P','d4':'p','a1':'M'},True,v=1<<sq('e2'))
        s=self.compare(f,['e2e4']);self.assertEqual(read(s['fen'])[3],sq('e3'));self.assertIn('d4e3',s['legal'])
        self.compare(f,['e2e4','d4e3','a1a1!'])
        f=self.fixture({'a5':'K','d5':'p','e5':'P','h5':'k'},True,ep=sq('d6'))
        self.assertNotIn('e5d6',self.compare(f)['legal'])
    def test_free_editor_extra_pieces_no_or_multiple_royals_last_rank_check(self):
        cases=[{}, {name(i):'P' for i in range(8,24)}, {'a1':'K','b1':'K','h8':'k','h7':'k','d4':'M'}, {'a8':'P','b8':'P','c1':'p'}, {'a1':'K','h8':'k','h1':'B','g2':'B','f3':'B','c2':'N','c3':'N','c4':'N','a2':'R','b2':'R'}, {'a1':'K','h8':'k','b2':'B'}]
        for b in cases:
            f=self.fixture(b);self.e.send('position fen '+f+'\nvalidate');s=self.compare(f)
            if s['legal'] and s['result']=='*':
                best,lines=self.e.best(f,nodes=300);self.assertIn(best,s['legal']);self.compare(f)
    def test_random_reference_and_apply_undo(self):
        rng=random.Random(4409)
        for n in range(100):
            b={};places=rng.sample(range(64),rng.randrange(3,18))
            for i in places:b[i]=rng.choice('PNBMKpnbmk')
            w=bool(n%2);f=write(b,w)
            s=self.compare(f)
            for m in rng.sample(s['legal'],min(3,len(s['legal']))):self.compare(f,[m])
            if s['legal'] and s['result']=='*':
                best,_=self.e.best(f,nodes=100);self.assertIn(best,s['legal']);self.compare(f)
    def test_perft_and_legacy_versions(self):
        f=self.e.snapshot()['fen']; expected=sum(len(legal(apply(f,m))) for m in legal(f))
        self.e.send('position fen '+f+'\ngo perft 2');output=''
        while True:
            line=self.e.p.stdout.readline()
            if not line:raise RuntimeError(self.e.p.stderr.read())
            output+=line
            if line.startswith('Nodes searched:'):break
        self.assertIn('Nodes searched: '+str(expected),output)
        self.assertEqual(expected,484)
        for variant in ['pirescacs-v1','pirescacs-v2','pirescacs-v3']:
            self.e.send('setoption name UCI_Variant value '+variant+'\nposition startpos\nsnapshot')
            while True:
                l=self.e.p.stdout.readline()
                if l.startswith('snapshot '):break
            self.assertNotIn('m',json.loads(l[9:])['fen'].split()[0])
        self.e.send('setoption name UCI_Variant value '+VARIANT)

if __name__=='__main__':unittest.main(verbosity=2)
