"""Independent ship-only/chef reference. Verification only, never used by the app."""
import json,random,unittest
from pathlib import Path
from rules_test import Engine as BaseEngine,sq,name
from rules_v4_test import read as medical_read,write,doctors
START='cmbknbmc/prpppppr/8/8/8/8/RPPPPPRP/CMBNKBMC w - - 0 1'
VARIANT='pirescacs-v5'
def read(f):
    result=list(medical_read(f))
    if f.strip()==START:result[2]=sum(1<<i for i,p in result[0].items() if p.lower()=='p')
    return result

def apply(f,m):
    b,w,v,ep,r,clock,full=read(f);a,z=sq(m[:2]),sq(m[2:4]);p=b.pop(a);old=b.get(z);step=8 if w else -8
    captured=z-step if p.lower()=='p' and z==ep and old is None and a%8!=z%8 else z
    q=b.pop(captured,None);new_ep=new_r=None
    v &= ~(1<<a|1<<z|1<<captured)
    if m.endswith('!'):b[a]=r[0];q=None
    else:
        swap=p.lower()=='r' and q and q.isupper()==w
        if swap:b[a]=q
        b[sq(m[5:]) if '@' in m else z]=p
        if p.lower()=='p' and abs(z-a)==16:
            middle=a+step
            if any(c==('p' if w else 'P') and abs(i%8-middle%8)==1 and i//8==z//8 for i,c in b.items()):new_ep=middle
        if q and not swap and q.lower() not in ('k','r'):
            candidate=(q,captured)
            if doctors(b,not w,candidate):new_r=candidate
    clock=0 if old or q or p.lower() in ('p','r') or m.endswith('!') else clock+1
    return write(b,not w,v,new_ep,new_r,clock,full+(not w))

def legal(f):
    b,w,v,ep,r,_,_=read(f);moves=[];step=1 if w else -1
    if any(c.lower()=='r' and i//8==(7 if c.isupper() else 0) for i,c in b.items()):return []
    for a,p in b.items():
        if p.isupper()!=w:continue
        x,y=a%8,a//8;typ=p.lower();targets=[]
        if typ in ('k','b','c'):
            dirs=([(-1,-1),(-1,1),(1,-1),(1,1)] if typ in ('k','b') else [])+([(1,0),(-1,0),(0,1),(0,-1)] if typ in ('k','c') else [])
            for dx,dy in dirs:
                for n in range(1,8):
                    xx,yy=x+dx*n,y+dy*n
                    if not(0<=xx<8 and 0<=yy<8):break
                    z=xx+8*yy;q=b.get(z)
                    if not q or (q.isupper()!=w and q.lower()!='r'):targets.append(z)
                    if q:break
        elif typ in ('n','m'):
            radius=2 if typ=='n' else 1
            for dx in range(-radius,radius+1):
                for dy in range(-radius,radius+1):
                    if max(abs(dx),abs(dy))!=radius:continue
                    xx,yy=x+dx,y+dy
                    if 0<=xx<8 and 0<=yy<8:
                        z=xx+yy*8;q=b.get(z)
                        if not q or (q.isupper()!=w and q.lower()!='r'):targets.append(z)
            if typ=='m' and a in doctors(b,w,r):moves.append(name(a)+name(a)+'!')
        elif typ=='r':
            yy=y+step
            if 0<=yy<8:
                z=x+8*yy;q=b.get(z)
                if not q or q.isupper()==w:targets.append(z)
        elif typ=='p':
            yy=y+step
            if 0<=yy<8:
                z=x+8*yy
                if z not in b:
                    targets.append(z)
                    if y==(1 if w else 6) and (v>>a&1) and z+8*step not in b:targets.append(z+8*step)
                for xx in (x-1,x+1):
                    if not 0<=xx<8:continue
                    z=xx+8*yy;q=b.get(z)
                    if q and q.isupper()!=w and q.lower()!='r':targets.append(z)
                    elif z==ep and not q and b.get(z-8*step)==('p' if w else 'P'):targets.append(z)
        for z in targets:
            base=name(a)+name(z)
            if typ=='p' and z//8==(7 if w else 0):
                half=range(0,32) if w else range(32,64)
                moves += [base+'@'+name(ret) for ret in half if ret not in b or ret==a]
            else:moves.append(base)
    return sorted(moves)

class Engine(BaseEngine):
    def __init__(self):super().__init__();self.send('setoption name UCI_Variant value '+VARIANT)
    def snapshot(self,fen=START,moves=[]):return super().snapshot(fen,moves)

class ShipOnlyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.e=Engine();cls.fixtures=[]
    @classmethod
    def tearDownClass(cls):
        cls.e.close();Path(__file__).with_name('v5-fixtures.json').write_text(json.dumps(cls.fixtures,indent=2))
    def fixture(self,pieces,w=True,v=0,ep=None,r=None,clock=0):return write({sq(k):p for k,p in pieces.items()},w,v,ep,r,clock)
    def compare(self,f,moves=[]):
        expected=f
        for m in moves:self.assertIn(m,legal(expected));expected=apply(expected,m)
        s=self.e.snapshot(f,moves);self.assertFalse(s['error'],f);self.assertFalse(s['check']);self.assertEqual(sorted(s['legal']),legal(expected),expected)
        if len(expected.split())>=7:self.assertEqual(s['fen'],expected)
        self.fixtures.append({'fen':f,'moves':moves,'expected':s});return s
    def test_exact_initial_and_symmetry(self):
        s=self.e.snapshot();b,w,v,*_=read(s['fen']);self.assertEqual(len(b),32);self.assertEqual(len(s['legal']),19)
        for c in ['R','r','C','c']:self.assertEqual(list(b.values()).count(c),2)
        for k,p in {'a1':'C','h1':'C','a8':'c','h8':'c','a2':'R','g2':'R','b7':'r','h7':'r','e1':'K','d8':'k'}.items():self.assertEqual(b[sq(k)],p)
        self.assertEqual({63-i:p.swapcase() for i,p in b.items()},b);self.compare(s['fen'])
    def test_captain_capturable_and_not_a_terminal(self):
        f=self.fixture({'d2':'K','d3':'k','g1':'R','h8':'r','b2':'m'})
        s=self.compare(f,['d2d3']);self.assertEqual(s['result'],'*');self.assertEqual(s['reason'],'');self.assertNotIn('revival',s)
        f=self.fixture({'h8':'k','g7':'K','a8':'r','c1':'R'},False)
        s=self.compare(f);self.assertIn('h8g7',s['legal']);self.assertEqual(s['result'],'*')
    def test_attacked_squares_pins_and_captain_absence(self):
        f=self.fixture({'e1':'K','e2':'C','e8':'c','d4':'n','a2':'R','h7':'r'})
        s=self.compare(f);self.assertIn('e2f2',s['legal']);self.assertIn('e1d2',s['legal']);self.assertIn('a2a3',s['legal'])
        self.compare(self.fixture({'a2':'R','h7':'r'}))
    def test_chef_rook_rays_blockers_captures_and_no_castling(self):
        for white in [True,False]:
            owner=lambda p:p if white else p.lower();foe=lambda p:p.lower() if white else p
            f=self.fixture({'d4':owner('C'),'d6':foe('P'),'f4':foe('K'),'b4':foe('R'),'d2':owner('M')},white)
            s=self.compare(f);dest={m[2:4] for m in s['legal'] if m.startswith('d4')}
            self.assertIn('d6',dest);self.assertIn('f4',dest);self.assertNotIn('d7',dest);self.assertNotIn('g4',dest);self.assertNotIn('b4',dest);self.assertNotIn('d2',dest);self.assertNotIn('e5',dest)
        f=self.fixture({'a1':'C','e1':'K','h1':'C'});s=self.compare(f);self.assertIn('a1d1',s['legal'])
        s=self.compare(f,['e1g1']);b=read(s['fen'])[0];self.assertEqual(b[sq('h1')],'C');self.assertNotIn(sq('f1'),b)
    def test_both_ships_win_even_with_attacked_captain(self):
        for at,goal in [('a7','a8'),('g7','g8')]:
            f=self.fixture({at:'R','b2':'R','e1':'K','e8':'c','h7':'r'})
            s=self.compare(f,[at+goal]);self.assertEqual((s['result'],s['reason']),('1-0','arrival'))
            mirror={63-i:p.swapcase() for i,p in read(f)[0].items()};m=name(63-sq(at))+name(63-sq(goal))
            s=self.compare(write(mirror,False),[m]);self.assertEqual((s['result'],s['reason']),('0-1','arrival'))
    def test_ship_swaps_chef_captain_and_another_ship(self):
        for p in 'CKRPMNB':
            f=self.fixture({'a2':'R','a3':p,'h7':'r'});s=self.compare(f,['a2a3']);self.assertEqual(read(s['fen'])[0][sq('a2')],p)
    def test_chef_revival_and_no_captain_revival(self):
        f=self.fixture({'d4':'C','f5':'n','b2':'M','a2':'R','h7':'r'},False)
        s=self.compare(f,['f5d4']);self.assertEqual(s['revival']['piece'],'C');self.assertIn('b2b2!',s['legal'])
        s=self.compare(f,['f5d4','b2b2!']);self.assertEqual(read(s['fen'])[0][sq('b2')],'C')
        for p in 'KkRr':self.assertTrue(self.e.snapshot(self.fixture({'b2':'M'})+' r:'+p+'@d4')['error'])
    def test_return_has_no_check_restrictions_and_captures_captain(self):
        f=self.fixture({'d7':'P','e8':'k','a1':'R','h7':'r','f4':'M','e1':'K','e7':'c'})
        s=self.compare(f,['d7e8@b2']);self.assertEqual(read(s['fen'])[0][sq('b2')],'P');self.assertEqual(s['result'],'*')
        f=self.fixture({'d7':'P','g5':'k','e1':'K','e8':'c','a2':'R','h7':'r'})
        self.assertIn('d7d8@f4',self.compare(f)['legal'])
    def test_ep_and_revival_window_and_rights(self):
        f=self.fixture({'e5':'P','d7':'p','a2':'R','h7':'r','g8':'m'},False,1<<sq('d7'))
        s=self.compare(f,['d7d5','e5d6']);self.assertEqual(s['revival']['capturedAt'],'d5');self.assertEqual(s['revival']['piece'],'p')
        f=self.fixture({'b1':'M','a2':'R','b7':'r'},r=('P',sq('d4')))
        self.compare(f,['a2a3','b7b6']);self.assertNotIn('b1b1!',self.e.snapshot(f,['a2a3','b7b6'])['legal'])
    def test_stalemate_draw_repetition_and_victory_precedence(self):
        f=self.fixture({'a2':'R','a3':'p','h7':'r'});s=self.compare(f);self.assertEqual((s['result'],s['reason']),('1/2-1/2','stalemate'))
        f=self.fixture({'a2':'R','h7':'r','b1':'C','g8':'c'},clock=99);s=self.compare(f,['b1c1']);self.assertEqual(s['result'],'1/2-1/2')
        f=self.fixture({'a7':'R','h7':'r'},clock=99);s=self.compare(f,['a7a8']);self.assertEqual(s['result'],'1-0')
        f=self.fixture({'b1':'C','g8':'c','a2':'R','h7':'r'})
        cycle=['b1c1','g8f8','c1b1','f8g8']*2;s=self.compare(f,cycle);self.assertEqual(s['reason'],'repetition')
    def test_editor_already_arrived_ship_is_terminal_for_either_turn(self):
        for turn in [True,False]:
            for color,at,result in [('R','a8','1-0'),('r','h1','0-1')]:
                s=self.compare(self.fixture({at:color,'d4':'C'},turn));self.assertEqual((s['result'],s['reason']),(result,'arrival'))
    def test_random_positions_apply_search_and_perft(self):
        rng=random.Random(150013)
        for _ in range(160):
            squares=rng.sample(range(64),rng.randint(5,22));b={i:rng.choice('PPNBMCKppnbmck') for i in squares}
            for i,c in [(sq('a2'),'R'),(sq('g2'),'R'),(sq('b7'),'r'),(sq('h7'),'r')]:b[i]=c
            f=write(b,bool(rng.randrange(2)));s=self.compare(f)
            if s['result']=='*' and s['legal']:
                m=rng.choice(s['legal']);self.compare(f,[m])
                best,_=self.e.best(f,nodes=256);self.assertIn(best,s['legal']);self.compare(f)
        f=self.e.snapshot()['fen'];expected=sum(len(legal(apply(f,m))) for m in legal(f));self.assertEqual(expected,361)
        self.e.send('position fen '+f+'\ngo perft 2')
        while True:
            line=self.e.p.stdout.readline()
            if line.startswith('Nodes searched:'):self.assertIn(str(expected),line);break

if __name__=='__main__':unittest.main(verbosity=2)
