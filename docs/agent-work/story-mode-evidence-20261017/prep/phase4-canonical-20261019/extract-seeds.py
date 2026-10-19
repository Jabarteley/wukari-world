from pathlib import Path
import json,hashlib,subprocess,sys
root=Path(sys.argv[1]);target=Path(sys.argv[2]);receipt=Path(sys.argv[3]);assert not target.exists() and not receipt.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
revision=subprocess.check_output(['git','rev-parse','95a878bd^{commit}'],cwd=root,text=True).strip()
show=lambda path:subprocess.check_output(['git','show',revision+':'+path],cwd=root)
worldbytes=show('scripts/scene-factory/generated/world-manifest.json');world=json.loads(worldbytes)
paths=sorted(x['path']for x in world['outputs']if x['path'].startswith('scripts/scene-factory/generated/briefs/'))
outputs={x['path']:x for x in world['outputs']};assert len(paths)==284
seeds={};rows=[]
for path in paths:
 b=show(path);assert sha(b)==outputs[path]['sha256'];old=json.loads(b);currentbytes=(root/path).read_bytes();current=json.loads(currentbytes)
 city=old['city']['id'];semantic=old['digests']['contentSha256'];seed=old['digests']['inputSha256']
 assert city==current['city']['id'] and semantic==current['digests']['contentSha256'],city
 assert city not in seeds;seeds[city]={'contentSha256':semantic,'seedSha256':seed}
 rows.append({'city':city,'baselineBriefPath':path,'baselineBriefSha256':sha(b),'currentBriefSha256':sha(currentbytes),'baselineContentSha256':semantic,'currentContentSha256':current['digests']['contentSha256'],'selectedSeedSha256':seed})
text='// Accepted layout art seeds from source '+revision+'. Source provenance remains independently current.\n'
text+='export const RETAINED_LAYOUT_SEEDS: Readonly<Record<string, { readonly contentSha256: string; readonly seedSha256: string }>> = '+json.dumps(seeds,indent=2,sort_keys=True)+';\n'
target.write_text(text)
receipt.write_text(json.dumps({'schema':'retained-layout-seed-migration-v1','baselineSourceSha':revision,'baselineWorldManifestSha256':sha(worldbytes),'cities':len(seeds),'allCurrentSemanticDigestsMatch':True,'artDataPath':str(target),'artDataSha256':sha(text.encode()),'rows':rows},indent=2)+'\n')
print(json.dumps({'cities':len(seeds),'artDataSha256':sha(text.encode()),'receipt':str(receipt),'receiptSha256':sha(receipt.read_bytes())}))
