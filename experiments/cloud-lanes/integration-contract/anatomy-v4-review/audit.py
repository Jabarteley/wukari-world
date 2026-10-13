"""Independent buffer, frame and conditional-cost review; no combined render."""
from pathlib import Path
import json,sys
import numpy as np
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
DOC=ROOT/'docs/agent-plans/cloud-lanes/integration-contract/anatomy-v4-review'
sys.path.insert(0,str(HERE.parent/'combined-review-v1'))
from glb import GLB,signatures,pose,sha,canonical
PATHS={'human':'anatomy-candidate-v4.glb','master':'prior/master/prototype/original-human-prototype.glb',
 'crop':'prior/hair/artifacts/master-fit-v1/curl-crop-fitted.glb',
 'bun':'prior/hair/artifacts/master-fit-v1/swept-bun-fitted.glb',
 'cropProxy':'prior/hair/artifacts/master-fit-v1/curl-proxy-fitted.glb',
 'bunProxy':'prior/hair/artifacts/master-fit-v1/bun-proxy-fitted.glb',
 'wardrobe':'prior/wardrobe/envelope-fit-v1/artifacts/everyday-01-envelope-v1.glb',
 'oldSkin':'prior/skin/fitted-v1/artifacts/fitted-human-skin-eyes-v1.glb'}
PLACEHOLDER='Hair_original_close_curl_surface'
def load():return {k:GLB(HERE/'scratch'/v) for k,v in PATHS.items()}
def main():
 pins=json.loads((DOC/'input-pins.json').read_text())['files']
 for r in pins:assert sha((HERE/r['localPath']).read_bytes())==r['sha256']
 models=load();maps={k:{p['name']:p for p in g.parts} for k,g in models.items()}
 sigs={k:{name:signatures(p) for name,p in parts.items()} for k,parts in maps.items()}
 old=maps['master'];new=maps['human'];changed=[];unchanged=[]
 keys=['triangleCount','nodeTransformSha256','expandedPositionsSha256','expandedUvsSha256','morphPositions']
 for name in new:
  (unchanged if all(sigs['master'][name][k]==sigs['human'][name][k] for k in keys) else changed).append(name)
 frame=json.loads((HERE/'scratch/fit-frame-candidate-v4.json').read_text())
 oldframe=json.loads((HERE/'scratch/prior/master/prototype/fit-frame.json').read_text())
 assert frame['sourceGlbSha256']==models['human'].summary()['sha256']
 assert set(changed)==set(frame['changedNodes']) and len(unchanged)==20
 assert set(old)-set(new)==set(frame['removedNodes'])
 assert all(frame[k]==oldframe[k] for k in ['anchorsBlenderMetres','implementedIdentityControls','units','blenderAxes','gltfAxes','blenderToGltf'])
 a=old['Head_continuous_anatomy'];b=new[a['name']];count=len(a['indices'])
 av=pose(a,{})[a['indices']].reshape(-1,3,3);bv=pose(b,{})[b['indices']].reshape(-1,3,3)
 assert np.array_equal(a['attributes']['TEXCOORD_0'][a['indices']],b['attributes']['TEXCOORD_0'][b['indices']][:count])
 delta=np.not_equal(av,bv[:len(av)]).any(axis=(1,2))
 hair=json.loads((HERE/'scratch/prior/hair/artifacts/master-fit-v1/fit-proposal.json').read_text());anchorrows=[]
 for r in hair['surfaceAnchors']:
  i=r['triangle'];ai=a['indices'].reshape(-1,3)[i];bi=b['indices'].reshape(-1,3)[i]
  morphsame=all(np.array_equal(m['POSITION'][ai],b['morph'][n]['POSITION'][bi]) for n,m in a['morph'].items())
  addedzero=all(not np.any(m['POSITION'][bi]) for n,m in b['morph'].items() if n not in a['morph'])
  row={'anchorId':r['anchorId'],'triangle':i,'positionsExact':bool(np.array_equal(av[i],bv[i])),'oldMorphDeltasExact':morphsame,'newMorphDeltasZero':addedzero}
  assert all(row[k] for k in ['positionsExact','oldMorphDeltasExact','newMorphDeltasZero']);anchorrows.append(row)
 variants=[];fixed=models['human'].summary()['triangles']-len(new[PLACEHOLDER]['indices'])//3+models['wardrobe'].summary()['triangles']
 for hairkey in ['crop','bun','cropProxy','bunProxy']:
  h=models[hairkey].summary();withoutSkin=fixed+h['triangles']
  variants.append({'hair':hairkey,'candidateMinusPlaceholderPlusWardrobe':fixed,'hairTriangles':h['triangles'],'beforeSkinAddedGeometry':withoutSkin,'skinAddedTriangles':None,'conditionalUsingOld1200CapTriangles':withoutSkin+1200,'conditionalMarginUnder34000':34000-withoutSkin-1200,'actualCombinedTriangles':None,'conditionalPrimitiveCountUsingTwoCaps':27-1+2+h['primitives']+1,'conditionalCallsSameOldOpticalPipeline':2*(27-1+h['primitives']+1)+4})
 groups=[['Shirt_fused_shoulders','Collar_band'],['Shoe_-1','Shoe_1'],['Sole_-1','Sole_1'],['Brow_Left','Brow_Right'],['Mouth_seam','Nostril_-1','Nostril_1'],['Pupil_Left','Pupil_Right']]
 merges=[]
 for names in groups:
  mats=[models['oldSkin'].j['materials'][maps['oldSkin'][n]['material']] for n in names]
  semantics=[{k:v for k,v in m.items() if k not in ['name','extras']} for m in mats]
  assert len({sha(canonical(m)) for m in semantics})==1
  merges.append({'meshes':names,'oldSkinMaterialSemanticsMatch':True,'noTextureReferences':not any('Texture' in k for m in semantics for k in m) and not any('Texture' in k for m in semantics for k in m.get('pbrMetallicRoughness',{})),'savedOpaquePrimitivesIfMerged':len(names)-1,'requiresFutureSkinEqualityCheck':True,'implemented':False})
 sources=json.loads((DOC.parent/'renderer-budget-source-pins.json').read_text())
 for r in sources['files']:assert sha((ROOT/r['path']).read_bytes())==r['sha256']
 three=Path('/workspace/joinallworld-cloud-coordinator/node_modules/three')
 renderer=three/'src/renderers/WebGLRenderer.js'
 report={'status':'PRE_SKIN_REVIEW_ONLY','assets':{k:v.summary() for k,v in models.items()},'signatures':sigs,'unchangedMeshes':unchanged,'changedMeshes':changed,'removedMeshes':frame['removedNodes'],'frameIdentityControlsAnchorsExact':True,'hairSurfaceAnchors':anchorrows,'headOriginalFaceUvsExact':True,'changedOriginalHeadTriangles':int(delta.sum()),'changedOriginalHeadBoundsGltfMetres':{'min':bv[:len(av)][delta].min(axis=(0,1)).tolist(),'max':bv[:len(av)][delta].max(axis=(0,1)).tolist()},'wardrobeCompatibleUnchangedBodyMeshes':[n for n in unchanged if n in ['Neck','Shirt_fused_shoulders','Collar_band','Trousers_fused_hip','Forearm_hand_-1','Forearm_hand_1','Shoe_-1','Shoe_1','Sole_-1','Sole_1']],'variants':variants,'materialMergeProposals':merges,'budgetSourceBaseline':sources['baseline'],'budgetSourceFilesVerified':len(sources['files']),'threeSource':{'version':json.loads((three/'package.json').read_text())['version'],'relativePath':'src/renderers/WebGLRenderer.js','sha256':sha(renderer.read_bytes()),'bytes':renderer.stat().st_size},'unresolved':['skin/cap refit and Head binding migration','2102 inherited Head UV overlap pairs per producer','visual realism','detailed hair budget','skeleton/skin weights/locomotion','actual combined draw/texture counts and lifecycle'],'fullCombinationRendered':False,'productionAdopted':False}
 (DOC/'compatibility-and-cost-plan.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({'unchangedMeshes':len(unchanged),'changedMeshes':changed,'hairAnchorsExact':len(anchorrows),'variants':variants,'potentialOpaquePrimitivesSaved':sum(r['savedOpaquePrimitivesIfMerged'] for r in merges),'sourceFilesVerified':len(sources['files'])}))
if __name__=='__main__':main()
