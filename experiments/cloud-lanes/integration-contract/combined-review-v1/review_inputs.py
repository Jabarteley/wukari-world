"""Read exact candidate GLBs; compare buffers and scope every assembly decision."""
from pathlib import Path
import json
from glb import GLB,signatures,sha,canonical
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];DOC=ROOT/'docs/agent-plans/cloud-lanes/integration-contract/combined-review-v1'
PATHS={
 'master':'master/prototype/original-human-prototype.glb',
 'human':'human/prototype/eyelid-candidate-v3/eyelid-candidate-v3.glb',
 'skin':'skin/fitted-v1/artifacts/fitted-human-skin-eyes-v1.glb',
 'crop':'hair/artifacts/master-fit-v1/curl-crop-fitted.glb',
 'bun':'hair/artifacts/master-fit-v1/swept-bun-fitted.glb',
 'cropProxy':'hair/artifacts/master-fit-v1/curl-proxy-fitted.glb',
 'bunProxy':'hair/artifacts/master-fit-v1/bun-proxy-fitted.glb',
 'wardrobe':'wardrobe/envelope-fit-v1/artifacts/everyday-01-envelope-v1.glb'}
LIDS=['UpperLid_Left','LowerLid_Left','UpperLid_Right','LowerLid_Right']
PLACEHOLDER='Hair_original_close_curl_surface'

def load():return {k:GLB(HERE/'scratch'/v) for k,v in PATHS.items()}
def compatible(a,b):
 keys=['triangleCount','nodeTransformSha256','expandedPositionsSha256','expandedUvsSha256','morphPositions']
 return {k:a[k]==b[k] for k in keys}
def main():
 models=load();maps={k:{p['name']:p for p in g.parts} for k,g in models.items()};sigs={k:{name:signatures(p) for name,p in m.items()} for k,m in maps.items()}
 comparisons=[]
 for name in maps['master']:
  row={'name':name,'candidateVsMaster':compatible(sigs['human'][name],sigs['master'][name]),'skinVsMaster':compatible(sigs['skin'][name],sigs['master'][name])}
  comparisons.append(row)
  assert all(row['skinVsMaster'].values()),name
  assert all(row['candidateVsMaster'].values()) if name not in LIDS else not row['candidateVsMaster']['expandedUvsSha256'],name
 old=json.loads((HERE/'scratch/master/prototype/fit-frame.json').read_text());new=json.loads((HERE/'scratch/human/prototype/eyelid-candidate-v3/fit-frame-candidate-v3.json').read_text())
 assert old['anchorsBlenderMetres']==new['anchorsBlenderMetres']
 assert old['implementedIdentityControls']==new['implementedIdentityControls']
 skinAdded=set(maps['skin'])-set(maps['master']);assert len(skinAdded)==2
 bodyTri=models['human'].summary()['triangles'];hidden=len(maps['human'][PLACEHOLDER]['indices'])//3
 extra=sum(len(maps['skin'][n]['indices'])//3 for n in skinAdded)
 variants=[]
 for name in ['crop','bun','cropProxy','bunProxy']:
  total=bodyTri-hidden+extra+models[name].summary()['triangles']+models['wardrobe'].summary()['triangles']
  variants.append({'hair':name,'bodyTriangles':bodyTri,'replacedPlaceholderTriangles':hidden,'corneaTriangles':extra,'hairTriangles':models[name].summary()['triangles'],'wardrobeTriangles':2324,'totalTriangles':total,'previewCap':34000,'headroom':34000-total,'withinPreviewComparator':total<=34000,'bodyMaskAdopted':False})
 packet={'status':'PARTIAL_COMPATIBILITY_ONLY','sourcePaths':PATHS,'assets':{k:g.summary() for k,g in models.items()},'signatures':sigs,'comparisons':comparisons,'unchangedCandidateMeshes':sum(all(r['candidateVsMaster'].values()) for r in comparisons),'skinMaterialTransfer':{'eligibleUnchangedMeshes':[n for n in maps['master'] if n not in LIDS and n!=PLACEHOLDER],'blockedMeshes':LIDS,'reason':'Four candidate lid topology/UV/morph payloads changed; old skin lid maps not rebound. Keep candidate original lid material for diagnostic preview only.'},'fitFrames':{'frozenSha256':sha((HERE/'scratch/master/prototype/fit-frame.json').read_bytes()),'candidateSha256':sha((HERE/'scratch/human/prototype/eyelid-candidate-v3/fit-frame-candidate-v3.json').read_bytes()),'anchorsExact':True,'controlsExact':True,'skeleton':None},'skinAddedMeshes':sorted(skinAdded),'variants':variants,'assembly':{'base':'human','hideOnly':PLACEHOLDER,'addWholeBodies':False,'retainClothedEnvelope':True,'skin':'material only on 26 unchanged visible meshes; two caps separately','lidMaterials':'original candidate fallback, not remapped or rebaked','hair':'one already-produced silhouette LOD, not both styles simultaneously','wardrobe':'garment-only envelope overlay','runtimeAdopted':False},'readyForCompleteSkinAcceptance':False}
 (DOC/'compatibility-and-budgets.json').write_text(json.dumps(packet,indent=2)+'\n')
 (HERE/'scratch/review-config.json').write_text(json.dumps({'paths':{k:'scratch/'+v for k,v in PATHS.items()},'lids':LIDS,'placeholder':PLACEHOLDER,'skinAddedMeshes':sorted(skinAdded)},indent=2)+'\n')
 print(json.dumps({'unchangedMeshes':packet['unchangedCandidateMeshes'],'changedLidUvMeshes':LIDS,'skinAdded':sorted(skinAdded),'variants':variants}))
if __name__=='__main__':main()
