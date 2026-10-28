"""Run upstream perft.sh cases on this 8x8 build without requiring Tcl/expect."""
import json, shlex, subprocess, re, time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
exe=root/'engine/src/stockfish'
uci=subprocess.run([exe],input='uci\nquit\n',text=True,capture_output=True,check=True).stdout
variants=set(re.search(r'option name UCI_Variant .*',uci)[0].split(' var ')[1:])
cases=[];skipped=[];started=time.time()
for line in (root/'engine/tests/perft.sh').read_text().splitlines():
 if not line.strip().startswith('expect perft.exp'):continue
 args=shlex.split(line.strip());variant,pos,depth,count=args[2:6]
 if variant not in variants:skipped.append(variant);continue
 commands=f'setoption name UCI_Variant value {variant}\nsetoption name UCI_Chess960 value '+(args[6] if len(args)>6 and args[6] not in ('>','>/dev/null') else 'false')+f'\nposition {pos}\ngo perft {depth}\nquit\n'
 r=subprocess.run([exe],input=commands,text=True,capture_output=True,timeout=90,check=True)
 found=re.search(r'Nodes searched: (\d+)',r.stdout)
 assert found and found[1]==count,(variant,pos,depth,count,r.stdout[-300:],r.stderr)
 cases.append({'variant':variant,'depth':int(depth),'nodes':int(count)})
 if len(cases)%20==0:print(f'{len(cases)} upstream perft cases verified',flush=True)
report={'cases':len(cases),'seconds':round(time.time()-started,2),'unsupportedVariants':sorted(set(skipped)),'results':cases}
(root/'tests/v5-upstream-perft-results.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='results'}),flush=True)
