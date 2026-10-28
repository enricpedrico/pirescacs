"""Independent, deliberately simple reference implementation. Never shipped to the browser."""
import json, random, re, subprocess, unittest, os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
VERSION = os.environ.get('PIRESCACS_RULES_VERSION', 'v3')
LEGACY = VERSION == 'v1'
VARIANT = 'pirescacs-' + VERSION
START = ('1rb1nbn1/p1pppkpp/5p2/8/8/2P5/PPKPPP1P/1NBN1BR1 w - - 0 1' if VERSION in ('v1', 'v2')
         else '2bknbn1/prpppppp/8/8/8/8/PPPPPPRP/1NBNKB2 w - - 0 1')
def sq(name): return ord(name[0])-97+8*(int(name[1])-1)
def name(i): return chr(97+i%8)+str(i//8+1)
def parse(fen):
    fields=fen.split(); b={}
    for y,line in enumerate(reversed(fields[0].split('/'))):
        x=0
        for c in line:
            if c.isdigit(): x+=int(c)
            else: b[y*8+x]=c;x+=1
    virgin=int(fields[6][2:],16) if len(fields)>6 else (sum(1<<i for i,c in b.items() if c.lower()=='p') if fen.strip()==START else 0)
    return b,fields[1]=='w',virgin,int(fields[4]),int(fields[5])
def fenof(b,white=True,virgin=0,clock=0,full=1):
    rows=[]
    for y in range(7,-1,-1):
        row='';empty=0
        for x in range(8):
            c=b.get(y*8+x)
            if c:
                if empty:row+=str(empty);empty=0
                row+=c
            else:empty+=1
        if empty:row+=str(empty)
        rows.append(row)
    return '/'.join(rows)+f' {"w" if white else "b"} - - {clock} {full} v:{virgin:x}'
def attack(b,target,white):
    tx,ty=target%8,target//8
    for i,p in b.items():
        if p.isupper()!=white or p.lower()=='r':continue
        dx,dy=tx-i%8,ty-i//8;d=1 if white else -1
        if p.lower()=='p' and abs(dx)==1 and dy==d:return True
        if p.lower()=='n' and max(abs(dx),abs(dy))==2 and (not LEGACY or dy*d>=0):return True
        diagonal=abs(dx)==abs(dy) and dx!=0
        straight=(dx==0) != (dy==0)
        if p.lower() in ('k','b') and (diagonal or (p.lower()=='k' and straight)):
            sx=(dx>0)-(dx<0);sy=(dy>0)-(dy<0)
            if all((i%8+sx*j)+(i//8+sy*j)*8 not in b for j in range(1,max(abs(dx),abs(dy)))):return True
    return False
def apply(fen,move):
    b,w,v,clock,full=parse(fen);a=sq(move[:2]);z=sq(move[2:4]);p=b.pop(a);q=b.pop(z,None)
    v &= ~(1<<a|1<<z)
    if p.lower()=='r' and q and q.isupper()==w:b[a]=q
    b[sq(move[5:7]) if '@' in move else z]=p
    clock=0 if q or p.lower() in ('p','r') else clock+1
    return fenof(b,not w,v,clock,full+(not w))
def legal(fen):
    b,w,v,_,_=parse(fen);d=1 if w else -1;out=[]
    if any(p.lower()=='r' and i//8==(7 if p.isupper() else 0) for i,p in b.items()):return []
    for i,p in b.items():
        if p.isupper()!=w:continue
        x,y=i%8,i//8;typ=p.lower();targets=[]
        if typ in ('k','b'):
            dirs=[(-1,-1),(-1,1),(1,-1),(1,1)]+([(1,0),(-1,0),(0,1),(0,-1)] if typ=='k' else [])
            for dx,dy in dirs:
                for dist in range(1,8):
                    xx,yy=x+dx*dist,y+dy*dist
                    if not(0<=xx<8 and 0<=yy<8):break
                    j=xx+8*yy;q=b.get(j)
                    if not q:targets.append(j)
                    elif q.isupper()!=w and q.lower() not in ('k','r'):targets.append(j)
                    if q:break
        elif typ=='n':
            for dx in range(-2,3):
                for dy0 in (range(3) if LEGACY else range(-2,3)):
                    if max(abs(dx),abs(dy0))!=2:continue
                    xx,yy=x+dx,y+dy0*d
                    if 0<=xx<8 and 0<=yy<8:
                        j=xx+yy*8;q=b.get(j)
                        if not q or q.isupper()!=w and q.lower() not in ('k','r'):targets.append(j)
        elif typ=='r':
            j=i+8*d;q=b.get(j)
            if 0<=j<64 and (not q or q.isupper()==w):targets.append(j)
        elif typ=='p':
            j=i+8*d
            if 0<=j<64:
                if j not in b:
                    targets.append(j)
                    if y==(1 if w else 6) and v>>i&1 and j+8*d not in b:targets.append(j+8*d)
                for dx in [-1,1]:
                    xx=x+dx;j=xx+8*(y+d);q=b.get(j)
                    if 0<=xx<8 and q and q.isupper()!=w and q.lower() not in ('k','r'):targets.append(j)
        for j in targets:
            base=name(i)+name(j)
            moves=[base+'@'+name(r) for r in range(0 if w else 32,32 if w else 64) if r not in b or r==i] if typ=='p' and j//8==(7 if w else 0) else [base]
            for m in moves:
                final,_,_,_,_=parse(apply(fen,m));k=next(s for s,c in final.items() if c==('K' if w else 'k'))
                enemy=next(s for s,c in final.items() if c==('k' if w else 'K'))
                if not attack(final,k,not w) and ('@' not in m or not attack(final,enemy,w)):out.append(m)
    return sorted(out)
class Engine:
    def __init__(self):
        self.p=subprocess.Popen([str(ROOT/'engine/src/stockfish')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
        self.send('setoption name UCI_Variant value '+VARIANT+'\nsetoption name Use NNUE value false')
    def send(self,s):self.p.stdin.write(s+'\n');self.p.stdin.flush()
    def snapshot(self,fen=START,moves=[]):
        self.send('position fen '+fen+' moves '+' '.join(moves)+'\nsnapshot')
        while True:
            s=self.p.stdout.readline()
            if not s:raise RuntimeError(self.p.stderr.read())
            if s.startswith('snapshot '):return json.loads(s[9:])
    def best(self,fen,moves=[],ms=100,nodes=0,depth=0):
        self.send('position fen '+fen+' moves '+' '.join(moves)+f'\ngo {"nodes "+str(nodes) if nodes else "depth "+str(depth) if depth else "movetime "+str(ms)}')
        lines=[]
        while True:
            s=self.p.stdout.readline()
            if not s:raise RuntimeError(self.p.stderr.read())
            lines.append(s.strip())
            if s.startswith('bestmove '):return s.split()[1],lines
    def close(self):self.send('quit');self.p.wait(timeout=5)
class RulesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.e=Engine()
    @classmethod
    def tearDownClass(cls):cls.e.close()
    def compare(self,fen):
        result=self.e.snapshot(fen);self.assertEqual(sorted(result['legal']),legal(fen),fen);self.assertFalse(result['error']);return result
    def test_initial(self):
        s=self.compare(START);self.assertEqual(s['result'],'*')
        self.assertEqual(s['fen'].split()[:6],START.split())
        if VERSION in ('v1','v2'):self.assertEqual(len(s['legal']),28)
        else:
            b,white,virgin,_,_=parse(s['fen']);self.assertEqual(len(b),26);self.assertTrue(white)
            for square,piece in {'g2':'R','b7':'r','e1':'K','d8':'k','c2':'P','f7':'p','c1':'B','f1':'B','c8':'b','f8':'b','b1':'N','d1':'N','e8':'n','g8':'n'}.items():self.assertEqual(b[sq(square)],piece)
            self.assertEqual(virgin,sum(1<<i for i,c in b.items() if c.lower()=='p'))
            rotated={63-i:(c.lower() if c.isupper() else c.upper()) for i,c in b.items()}
            self.assertEqual(rotated,b)
    def fixture(self,extras={},white=True,virgin=0):
        b={sq('a1'):'K',sq('h7'):'k',sq('c1'):'R',sq('f8'):'r'};b.update({sq(k):v for k,v in extras.items()});return fenof(b,white,virgin)
    def test_leaper_perimeter_and_ships(self):
        f=self.fixture({'d4':'N','e5':'p','c5':'P'});s=self.compare(f)
        dest={m[2:4] for m in s['legal'] if m.startswith('d4')};expected={'b4','f4','b5','f5','b6','c6','d6','e6','f6'}
        if not LEGACY:expected |= {'b2','c2','d2','e2','f2','b3','f3'}
        self.assertEqual(dest,expected)
        for square in ['b4','f4','b5','f5','b6','c6','d6','e6','f6']:
            self.compare(self.fixture({'d4':'N',square:'r'}))
    def test_ship_swap_all_types_and_captain_safety(self):
        for typ in 'PNBK':
            b,_,_,_,_=parse(self.fixture({'c2':typ}));
            if typ=='K':b.pop(sq('a1'))
            f=fenof(b);s=self.compare(f);self.assertIn('c1c2',s['legal']);n=self.e.snapshot(f,['c1c2']);self.assertEqual(n['fen'],apply(f,'c1c2'))
        self.compare(self.fixture({'c2':'p'}))
        self.compare(self.fixture({'c2':'P','b2':'b'}))
    def test_rebirth_capture_and_final_check(self):
        for extra in [{'d7':'P'},{'d7':'P','e8':'b'},{'d7':'P','a7':'b'},{'d7':'P','c8':'b','g6':'N'}]:
            f=self.fixture(extra);s=self.compare(f)
            for m in [m for m in s['legal'] if '@' in m]:self.assertEqual(self.e.snapshot(f,[m])['fen'],apply(f,m))
        self.compare(self.fixture({'d7':'P','d3':'B'}))
    def test_pawn_rights(self):
        f=self.fixture({'b2':'P','c2':'P'},virgin=(1<<sq('b2'))|(1<<sq('c2')));s=self.compare(f);self.assertIn('b2b4',s['legal'])
        n=self.e.snapshot(f,['c1c2']);self.assertFalse(parse(n['fen'])[2]>>sq('c1')&1)
        s=self.compare(self.fixture({'b2':'P'}));self.assertNotIn('b2b4',s['legal'])
    def test_arrival_and_invalid_move(self):
        b,_,_,_,_=parse(self.fixture());b.pop(sq('c1'));b[sq('c7')]='R';f=fenof(b);s=self.compare(f);self.assertIn('c7c8',s['legal']);end=self.e.snapshot(f,['c7c8']);self.assertEqual((end['result'],end['reason']),('1-0','arrival'))
        self.assertTrue(self.e.snapshot(START,['g1g8'])['error'])
    def test_repetition_and_clock(self):
        f=self.fixture();seq=['a1a2','h7h6','a2a1','h6h7']*2
        s=self.e.snapshot(f,seq);self.assertEqual(s['reason'],'repetition')
        b,w,v,_,_=parse(f);s=self.e.snapshot(fenof(b,w,v,100));self.assertEqual(s['reason'],'fifty')
    def test_returns_preserve_repetition_history_and_rights(self):
        f=self.fixture({'a2':'P'})
        cycle=[]
        for i,move in enumerate(['a2a3','a3a4','a4a5','a5a6','a6a7','a7a8@a2']):cycle += [move,'h7h6' if i%2==0 else 'h6h7']
        self.assertEqual(self.e.snapshot(f,cycle*2)['reason'],'repetition')
        b,w,_,c,n=parse(f);with_right=fenof(b,w,1<<sq('a2'),c,n)
        self.assertEqual(self.e.snapshot(with_right,cycle*2)['result'],'*')
        self.assertEqual(self.e.snapshot(with_right,cycle*3)['reason'],'repetition')
    def test_no_return_and_terminal_priority(self):
        b={i:'B' for i in range(32)};b.update({sq('a1'):'K',sq('c1'):'R',sq('d7'):'P',sq('h7'):'k',sq('f8'):'r'})
        self.assertFalse(any('@' in m for m in self.compare(fenof(b))['legal']))
        b={sq('a1'):'K',sq('h7'):'k',sq('c8'):'R',sq('f8'):'r'}
        s=self.e.snapshot(fenof(b,False,0,100));self.assertEqual((s['result'],s['reason']),('1-0','arrival'))
        stalemate='8/8/7k/8/3b4/r2n4/RP6/Kn6 w - - 0 1 v:0'
        s=self.compare(stalemate);self.assertEqual((s['result'],s['reason']),('1/2-1/2','stalemate'))
        mate='8/3r3k/5K1N/P4B2/R7/8/8/8 b - - 100 1 v:0'
        s=self.e.snapshot(mate);self.assertEqual((s['result'],s['reason']),('1-0','mate'))
    def test_final_position_escapes_and_captain_crossing(self):
        # Rebirth alone can interpose between a checked captain and a carpenter.
        b={sq(s):p for s,p in {'a1':'K','h6':'k','a2':'R','f8':'r','b1':'B','d7':'P','g7':'b'}.items()}
        s=self.compare(fenof(b));self.assertTrue(s['check']);self.assertTrue(s['legal']);self.assertTrue(all('@' in m for m in s['legal']))
        # Swap can move a captain out of a check in the opposite direction to the ship.
        b={sq(s):p for s,p in {'a2':'K','h7':'k','a1':'R','f8':'r','d5':'b'}.items()}
        s=self.compare(fenof(b));self.assertIn('a1a2',s['legal']);self.assertFalse(self.e.snapshot(fenof(b),['a1a2'])['check'])
        # Queen-like royal moves may cross an attacked intermediate square.
        f=self.fixture({'c4':'n'});s=self.compare(f);self.assertIn('a1a5' if LEGACY else 'a1a8',s['legal'])
    def test_random_games_and_exact_restore(self):
        rng=random.Random(241);positions=0
        for game in range(8):
            fen=START;history=[]
            for ply in range(70):
                s=self.compare(fen);positions+=1
                if s['result']!='*':break
                m=rng.choice(s['legal']);history.append(m);fen=apply(s['fen'],m)
                replay=self.e.snapshot(START,history);self.assertEqual(replay['fen'],fen);self.assertFalse(replay['error'])
        print(f'Validated {positions} independent positions and exact history replay.')
    def test_editor_validation_and_recovery(self):
        cases = [
            ('8/8/8/8/8/8/8/8 w - - 0 1', True),
            ('not-a-board w - - 0 1', True),
            ('8/7k/8/8/8/8/8/K7 w - - 0 1 v:0', False),
            ('8/7k/8/8/8/8/8/K7 b - - 0 1 v:0', False),
            ('7k/8/8/8/8/8/8/K7 w - - 0 1 v:xyz', True),
            ('6Pk/8/8/8/8/8/8/K7 w - - 0 1 v:0', True),
            ('7k/8/8/8/8/8/8/KRR5 w - - 0 1 v:0', True),
            ('8/7k/8/8/8/8/8/K7 w - - 0 1 v:0', False),
            ('7k/8/8/8/8/8/8/7K w - - 0 1 v:0', True),
        ]
        for fen, invalid in cases:
            self.e.send('position fen '+fen+'\nvalidate\nsnapshot')
            while True:
                line=self.e.p.stdout.readline()
                if not line:raise RuntimeError(self.e.p.stderr.read())
                if line.startswith('snapshot '):break
            self.assertEqual(json.loads(line[9:])['error'],invalid,fen)
            self.assertFalse(self.e.snapshot()['error'])
    def test_perft(self):
        def count(f,depth):return 1 if not depth else sum(count(apply(f,m),depth-1) for m in legal(f))
        for f in [START,self.fixture({'d7':'P','d4':'N'})]:
            expected=count(f,2);self.e.send('position fen '+f+'\ngo perft 2')
            while True:
                line=self.e.p.stdout.readline()
                if line.startswith('Nodes searched:'):break
            self.assertEqual(int(line.split(':')[1]),expected)
if __name__=='__main__':unittest.main(verbosity=2)
