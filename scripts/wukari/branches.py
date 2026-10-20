#!/usr/bin/env python3
"""Read-only audit; deletion requires owner-approved exact inventory and explicit flag."""
import argparse, csv, hashlib, io, json, pathlib, subprocess, datetime
REPO = 'Jabarteley/wukari-world'
KEEP = {'main','feat/wukari-geographic-foundation','feat/fuw-campus-map','feature/wukari-milestone-1','develop/wukari-life'}
def run(*args):
    return subprocess.check_output(args, text=True).strip()
def api(path):
    return json.loads(run('gh','api',f'repos/{REPO}' + (f'/{path}' if path else '')))
def ancestor(a,b):
    p = subprocess.run(['git','merge-base','--is-ancestor',a,b], capture_output=True)
    if p.returncode not in (0,1): raise RuntimeError(p.stderr.decode())
    return p.returncode == 0
def live():
    branches = [json.loads(line) for line in run('gh','api','--paginate',f'repos/{REPO}/branches?per_page=100','--jq','.[] | @json').splitlines()]
    prs = json.loads(run('gh','pr','list','--repo',REPO,'--state','open','--limit','1000','--json','number,headRefName,baseRefName,url'))
    if len(prs) >= 1000: raise ValueError('PR pagination required')
    default = api('')['default_branch']
    rules = api('rulesets')
    return branches, prs, default, rules
def audit(out):
    if run('git','rev-parse','--is-shallow-repository') != 'false': raise ValueError('Complete history required')
    run('git','fetch','origin','+refs/heads/*:refs/remotes/origin/*')
    branches, prs, default, rules = live()
    retained = KEEP | {default} | {p[k] for p in prs for k in ('headRefName','baseRefName')} | {b['name'] for b in branches if b['protected']}
    refs = {b['name']:b['commit']['sha'] for b in branches}
    upstream = {line.split()[1][11:]:line.split()[0] for line in run('git','ls-remote','--heads','https://github.com/kromate/joinallworld.git').splitlines()}
    rows=[]
    for b in branches:
        name, sha = b['name'], b['commit']['sha']
        if run('git','rev-parse',f'refs/remotes/origin/{name}') != sha: raise ValueError(f'Branch moved during audit: {name}')
        merged = ancestor(sha,refs[default])
        preserved = next((n for n in sorted(retained) if n in refs and n != name and ancestor(sha,refs[n])), '')
        unique = int(run('git','rev-list','--count',sha,'--not',*[refs[n] for n in retained if n in refs and n != name]))
        category = 'protected' if b['protected'] else 'active-retained' if name in retained else 'safe-candidate' if preserved and not rules else 'uncertain' if preserved else 'unmerged-review'
        rows.append(dict(name=name,sha=sha,protected=b['protected'],category=category,merged_main=merged,preserved_by=preserved,unique_vs_retained=unique,legacy_hint=name.startswith(('claude/','codex/')),upstream_same_tip=upstream.get(name)==sha))
    out.mkdir(parents=True,exist_ok=True)
    payload=dict(schemaVersion=1,repository=REPO,auditedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),default=default,rulesets=rules,openPRs=prs,branches=rows)
    (out/'inventory.json').write_text(json.dumps(payload,indent=2)+'\n')
    s=io.StringIO(); w=csv.DictWriter(s,fieldnames=list(rows[0]),lineterminator="\n");w.writeheader();w.writerows(rows);(out/'inventory.csv').write_text(s.getvalue())
    headings=list(rows[0]); md=['# Complete branch snapshot','',f'Audited: {payload["auditedAt"]}. Repository: {REPO}. Point-in-time evidence; not deletion approval.','', '| '+' | '.join(headings)+' |','| '+' | '.join(['---']*len(headings))+' |']
    md.extend('| '+' | '.join(str(row[k]).replace('|','\\|') for k in headings)+' |' for row in rows)
    (out/'inventory.md').write_text('\n'.join(md)+'\n')
    candidates=[dict(name=r['name'],sha=r['sha']) for r in rows if r['category']=='safe-candidate']
    (out/'candidates.json').write_text(json.dumps(dict(repository=REPO,approved=False,branches=candidates),indent=2)+'\n')
    counts={c:sum(r['category']==c for r in rows) for c in sorted({r['category'] for r in rows})}
    print(json.dumps(counts))
def cleanup(path, execute, results):
    if path.resolve()==results.resolve(): raise ValueError('Results must not overwrite the approved inventory')
    raw=b'';events=[]
    try:
        raw=path.read_bytes(); approval=json.loads(raw)
        if approval.get('repository') != REPO or not isinstance(approval.get('branches'),list): raise ValueError('Invalid exact inventory')
        if execute and approval.get('approved') is not True: raise ValueError('Owner-approved inventory required')
        remote=run('git','remote','get-url','--push','--all','origin')
        if remote not in (f'https://github.com/{REPO}.git',f'https://github.com/{REPO}',f'git@github.com:{REPO}.git'): raise ValueError('Origin push URL does not match authorized repository')
        snapshot=live()
        tips_snapshot=run('git','ls-remote','--heads','origin').splitlines()
        names=set()
        for item in approval['branches']:
            name,sha=item['name'],item['sha']
            if name in names or name in KEEP or len(sha)!=40 or any(c not in '0123456789abcdef' for c in sha): raise ValueError('Duplicate, retained or invalid branch')
            names.add(name)
            run('git','check-ref-format',f'refs/heads/{name}')
            branches,prs,default,rules=live() if execute else snapshot
            b=next((b for b in branches if b['name']==name),None)
            if not b or b['commit']['sha']!=sha or b['protected'] or name==default or rules or any(name in (p['headRefName'],p['baseRefName']) for p in prs): raise ValueError(f'Changed/protected/PR/ruleset state: {name}')
            # Independently require preservation in fixed retained refs, never another deletion candidate.
            tips=run('git','ls-remote','--heads','origin').splitlines() if execute else tips_snapshot
            retained=[line.split()[0] for line in tips if line.split()[1][11:] in KEEP]
            if not any(ancestor(sha,tip) for tip in retained): raise ValueError(f'No retained history proof: {name}')
            if execute:
                run('git','push',f'--force-with-lease=refs/heads/{name}:{sha}','origin',f':refs/heads/{name}')
            events.append(dict(name=name,sha=sha,result='deleted' if execute else 'dry-run-would-delete'))
    except Exception as e:
        events.append(dict(error=str(e))); raise
    finally:
        results.write_text(json.dumps(dict(inventorySHA256=hashlib.sha256(raw).hexdigest(),execute=execute,events=events),indent=2)+'\n')
if __name__=='__main__':
    p=argparse.ArgumentParser();sub=p.add_subparsers(dest='command',required=True)
    a=sub.add_parser('audit');a.add_argument('--out',type=pathlib.Path,default=pathlib.Path('docs/wukari/branches'))
    c=sub.add_parser('cleanup');c.add_argument('--inventory',type=pathlib.Path,required=True);c.add_argument('--execute-owner-approved',action='store_true');c.add_argument('--results',type=pathlib.Path,required=True)
    args=p.parse_args()
    if args.command=='audit':audit(args.out)
    else:cleanup(args.inventory,args.execute_owner_approved,args.results)
