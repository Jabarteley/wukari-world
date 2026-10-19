from pathlib import Path
import subprocess,json,time,os
p=Path(__file__).parent
root='/Users/anthonyakpan/work/joinallworld-story'
rows=[]
commands=[('source-focused',['node','--experimental-strip-types','--test','--test-name-pattern=^(the first download|the shared shell|each generated|Three.js)','src/app/entry.test.ts'],0),('old419-rejection',['node','--experimental-strip-types',str(p/'old-artifact-probe.ts'),'/private/tmp/story-phase3-bank-qa-419e3768-c1pzv8nl/prepared-dist'],1)]
for name,cmd,expected in commands:
 start=time.monotonic()
 result=subprocess.run(cmd,cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=120,env=os.environ.copy())
 (p/(name+'.log')).write_text(result.stdout)
 passed=result.returncode==expected and (name!='old419-rejection' or 'native creator initialization must not depend on a static-import cycle' in result.stdout)
 rows.append({'name':name,'command':cmd,'exitCode':result.returncode,'expectedExitCode':expected,'passed':passed,'seconds':time.monotonic()-start})
 print(name,result.returncode,'PASS' if passed else 'FAIL',flush=True)
 if not passed:break
(p/'receipt.json').write_text(json.dumps({'scope':'source focused checks and exact old-artifact rejection only; no new bundle acceptance','rows':rows},indent=2)+'\n')
raise SystemExit(0 if len(rows)==2 and all(r['passed'] for r in rows) else 1)
