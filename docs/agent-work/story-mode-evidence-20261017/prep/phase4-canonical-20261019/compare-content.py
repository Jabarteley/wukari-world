from pathlib import Path
import json,hashlib,subprocess,collections
p=Path(__file__).parent;r=Path.cwd()
sha=lambda b:hashlib.sha256(b).hexdigest()
pack=lambda x:json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()
before=json.loads(Path('/private/tmp/story-phase4-transition-baseline-20261019/content-before.json').read_text());after=json.loads((p/'content-after.json').read_text())
assert before['recipeHashes']==after['recipeHashes'],'recipe core changed'
assert before['assetHashes']==after['assetHashes'],'asset bytes changed'
oldm=json.loads((p/'talk-manifest-before.json').read_text()); newm=json.loads((r/'scripts/talk-factory/generated/world-manifest.json').read_text())
oldscene=json.loads((p/'scene-manifest-before.json').read_text());oldoutputs={x['path']:x for x in oldscene['outputs']}
oldcities={x['city']:x for x in oldm['cities']};newcities={x['city']:x for x in newm['cities']};assert oldcities.keys()==newcities.keys()
def at95(path):return subprocess.check_output(['git','show','95a878bd:'+path],cwd=r)
def diff(a,b,path=''):
 if type(a)!=type(b):return [(path,a,b)]
 if isinstance(a,dict):
  if a.keys()!=b.keys():return [(path,a,b)]
  return [change for k in a for change in diff(a[k],b[k],path+'.'+k if path else k)]
 if isinstance(a,list):
  if len(a)!=len(b):return [(path,a,b)]
  return [change for i,(x,y) in enumerate(zip(a,b)) for change in diff(x,y,f'{path}[{i}]')]
 return [] if a==b else [(path,a,b)]
changed=[];counter=collections.Counter();unexpected=[];banks=0;cityrows=[];pins={}
for city in sorted(oldcities):
 oldpath='public'+oldcities[city]['path'];newpath='public'+newcities[city]['path']
 ob=at95(oldpath);nb=(r/newpath).read_bytes();assert sha(ob)==oldcities[city]['sha256'];assert sha(nb)==newcities[city]['sha256'];pins[newpath]=sha(nb)
 old=json.loads(ob);new=json.loads(nb)
 assert sha(pack(old['banks']))==before['bankObjectsHashesByCity'][city],f'95 baseline mismatch {city}'
 assert sha(pack(new['banks']))==after['bankObjectsHashesByCity'][city]
 assert old.keys()==new.keys() and {k:v for k,v in old.items() if k!='banks'}=={k:v for k,v in new.items() if k!='banks'}
 briefpath=f'scripts/scene-factory/generated/briefs/{city}.json';oldbriefbytes=at95(briefpath);assert sha(oldbriefbytes)==oldoutputs[briefpath]['sha256']
 oldbrief=json.loads(oldbriefbytes);newbriefbytes=(r/briefpath).read_bytes();newbrief=json.loads(newbriefbytes);pins[briefpath]=sha(newbriefbytes)
 oldtag='city-brief:'+oldbrief['digests']['inputSha256'];newtag='city-brief:'+newbrief['digests']['inputSha256']
 assert len(old['banks'])==len(new['banks']);localchanges=0
 for i,(a,b) in enumerate(zip(old['banks'],new['banks'])):
  assert a.keys()==b.keys()=={'bank','evidence','npc','venue'}
  assert {k:a[k]for k in ['bank','npc','venue']}=={k:b[k]for k in ['bank','npc','venue']},f'bank content/order changed {city}:{i}'
  banks+=1
  for path,x,y in diff(a['evidence'],b['evidence']):
   row={'city':city,'bankIndex':i,'npc':a['npc'],'venue':a['venue'],'path':path,'before':x,'after':y}
   changed.append(row);counter[path]+=1;localchanges+=1
   allowed=path in {'city.source','venue.source'} or (path.startswith('facts[') and path.endswith('].source') and a['evidence']['facts'][int(path.split('[')[1].split(']')[0])]['id'].startswith('venue-target-'))
   if not allowed or x!=oldtag or y!=newtag:unexpected.append(row)
 cityrows.append({'city':city,'banks':len(old['banks']),'fullEntryObjectsEqual':old['banks']==new['banks'],'evidenceLeafChanges':localchanges,'oldBriefInputDigest':oldbrief['digests']['inputSha256'],'newBriefInputDigest':newbrief['digests']['inputSha256']})
assert banks==13726 and len(cityrows)==284
for path,h in pins.items():assert sha((r/path).read_bytes())==h,path
(p/'bank-provenance-leaf-changes.json').write_text(json.dumps(changed,indent=2)+'\n')
receipt={'schema':'phase4-preservation-comparison-v2','contentPreservationAccepted':not unexpected,'scope':'recipe core, asset bytes, bank content and independently classified provenance only; runtime/visual acceptance separate','recipesEqualExcludingOnlyVersionSkySurfaceStyle':True,'recipes':len(after['recipeHashes']),'assetBytesEqual':True,'assets':len(after['assetHashes']),'banksSemanticFieldsExactAgainst95AndBefore':True,'banks':banks,'cities':len(cityrows),'fullBankObjectsEqual':before['bankObjectsHashesByCity']==after['bankObjectsHashesByCity'],'changedEvidenceFields':dict(counter),'changedEvidenceLeafCount':len(changed),'unexpectedChanges':unexpected,'cityRows':cityrows,'inputsStable':True,'sourceExplanation':'inputs.ts115-120,143-153: city/venue and venue-target fact source use brief.digests.inputSha256; all other evidence fields exact. No bank prose, identity or assignment changed.','beforeReceiptSha256':sha(Path('/private/tmp/story-phase4-transition-baseline-20261019/content-before.json').read_bytes()),'afterReceiptSha256':sha((p/'content-after.json').read_bytes()),'leafInventorySha256':sha((p/'bank-provenance-leaf-changes.json').read_bytes())}
(p/'content-comparison.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k not in {'cityRows','changedEvidenceFields','unexpectedChanges'}}));print('changed fields',dict(counter));print('unexpected',len(unexpected));assert not unexpected
