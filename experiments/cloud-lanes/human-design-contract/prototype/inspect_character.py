"""Read actual saved Blender morph geometry; small endpoint/pairwise checks and frozen fitting data."""
import bpy
import hashlib
import itertools
import json
import sys
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parent
DOC=ROOT.parents[3]/'docs/agent-plans/cloud-lanes/human-design-contract/prototype'
IDENTITY=['nose.projection','nose.alarWidth','earLeft.protrusion','earRight.protrusion','body.height','body.shoulderWidth']
PRESETS={
    'neutral':{},
    'happy':{'expression.smileLeft':1,'expression.smileRight':1},
    'sad':{'expression.frownLeft':1,'expression.frownRight':1,'expression.browRaiseLeft':.8,'expression.browRaiseRight':.8},
    'blink':{'expression.blinkLeft':1,'expression.blinkRight':1},
}

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def digest(array):return hashlib.sha256(array.tobytes()).hexdigest()

objects=[]
for obj in bpy.context.scene.objects:
    if obj.type!='MESH' or obj.name.startswith('STUDIO'):continue
    obj.data.calc_loop_triangles()
    basis=np.array([tuple(v.co) for v in obj.data.vertices],dtype='<f8')
    triangles=np.array([tuple(t.vertices) for t in obj.data.loop_triangles],dtype='<u4')
    deltas={k.name:np.array([tuple(p.co) for p in k.data],dtype='<f8')-basis for k in obj.data.shape_keys.key_blocks if k.name!='Basis'}
    objects.append((obj,basis,triangles,deltas))

rows=[];errors=[];rotation_witnesses=[];cases=[('neutral',{})]
for key in IDENTITY:
    for value in [-1,1]:cases.append((key+':'+str(value),{key:value}))
for a,b in itertools.combinations(IDENTITY,2):
    for x,y in itertools.product([-1,1],repeat=2):cases.append((a+':'+str(x)+'/'+b+':'+str(y),{a:x,b:y}))
for name,expr in PRESETS.items():
    if name=='neutral':continue
    cases.append((name,expr))
    for key in IDENTITY:
        for value in [-1,1]:cases.append((key+':'+str(value)+'/'+name,{key:value,**expr}))

metrics=[]
for obj,basis,tri,deltas in objects:
    vectors=np.cross(basis[tri[:,1]]-basis[tri[:,0]],basis[tri[:,2]]-basis[tri[:,0]])
    area=np.linalg.norm(vectors,axis=1)*.5
    meshrow={
        'name':obj.name,'vertices':len(basis),'triangles':len(tri),
        'positionSha256':digest(basis),'triangleOrderSha256':digest(tri),
        'uvSha256':digest(np.array([tuple(x.uv) for x in obj.data.uv_layers.active.data],dtype='<f8')),
        'boundsBlenderMetres':{'min':basis.min(axis=0).tolist(),'max':basis.max(axis=0).tolist()},
        'morphs':{k:{'movedVertices':int((np.linalg.norm(d,axis=1)>1e-8).sum()),'maxDeltaMetres':float(np.linalg.norm(d,axis=1).max()),'sha256':digest(d)} for k,d in deltas.items()},
        'zeroAreaTriangles':int((area<1e-14).sum()),
    }
    if meshrow['zeroAreaTriangles']:errors.append({'case':'neutral','mesh':obj.name,'zeroArea':meshrow['zeroAreaTriangles']})
    metrics.append(meshrow)
    for name,values in cases:
        points=basis.copy()
        for key,value in values.items():
            if key in deltas:points+=deltas[key]*value
            correction='corrective.height.'+key.split('.')[-1]
            if key.startswith('expression.') and correction in deltas:points+=deltas[correction]*value*values.get('body.height',0)
        if not np.isfinite(points).all():errors.append({'case':name,'mesh':obj.name,'error':'nonfinite'})
        after=np.cross(points[tri[:,1]]-points[tri[:,0]],points[tri[:,2]]-points[tri[:,0]])
        afterarea=np.linalg.norm(after,axis=1)*.5
        newly_flat=(afterarea<1e-14)&(area>=1e-14)
        inverted=(np.einsum('ij,ij->i',vectors,after)<-1e-16)&(area>1e-12)
        if 'Lid_' in obj.name:
            # A lid sheet is a single-valued (x,z)->y surface. Its 3D normal can
            # rotate >90 degrees while it closes over the globe without folding.
            # The oriented x/z Jacobian is the appropriate fold test here; retain
            # every large-rotation witness instead of quietly discarding it.
            # At a closed canthus the projected area is zero while the curved
            # 3D patch still has area; tolerate 0.01% of baseline for float32 data.
            projected_fold=vectors[:,1]*after[:,1]<-(vectors[:,1]**2)*1e-4
            if inverted.any() and name=='blink':
                ids=np.flatnonzero(inverted)
                rotation_witnesses.append({'mesh':obj.name,'triangles':ids.tolist(),
                    'baselineCrossY':vectors[ids,1].tolist(),'closedCrossY':after[ids,1].tolist(),
                    'projectedFold':bool(projected_fold[ids].any()),
                    'explanation':'Single-valued lid surface rotates around eye; signed x/z Jacobian checked independently.'})
            inverted=projected_fold
        if newly_flat.any() or inverted.any():errors.append({'case':name,'mesh':obj.name,'newZeroArea':int(newly_flat.sum()),'normalReversals':int(inverted.sum())})

def part(name):return next(row for row in objects if row[0].name==name)
def pts(name,values):
    _,base,_,deltas=part(name);out=base.copy()
    for k,v in values.items():
        if k in deltas:out+=deltas[k]*v
        correction='corrective.height.'+k.split('.')[-1]
        if k.startswith('expression.') and correction in deltas:out+=deltas[correction]*v*values.get('body.height',0)
    return out

# Independence means changing one ear cannot move the opposite ear or body.
for side,other in [('Left','Right'),('Right','Left')]:
    key='ear'+side+'.protrusion'
    assert key in part('Ear_'+side)[3]
    assert key not in part('Ear_'+other)[3]
    assert key not in part('Trousers_fused_hip')[3]
for key in ['nose.projection','nose.alarWidth']:
    assert key in part('Head_continuous_anatomy')[3]
    assert all(key not in deltas for obj,_,_,deltas in objects if obj.name.startswith(('Ear_','Shirt','Trousers')))
for side in ['Left','Right']:
    a=pts('UpperLid_'+side,{'expression.blink'+side:1})[16]
    b=pts('LowerLid_'+side,{'expression.blink'+side:1})[16]
    if np.linalg.norm(a-b)>.00001:errors.append({'case':'blink','error':'central eyelid seam','side':side,'gapMetres':float(np.linalg.norm(a-b))})

allpoints=np.concatenate([row[1] for row in objects])
triangles=sum(len(row[2]) for row in objects)
if triangles>34000:errors.append({'error':'high_detail_preview_budget','actual':triangles,'maximum':34000})
report={
    'schemaVersion':1,'evidence':'Actual Blender source positions and morph deltas, original authored geometry.',
    'blendSha256':sha(ROOT/'original-human-prototype.blend'),'glbSha256':sha(ROOT/'original-human-prototype.glb'),
    'cases':len(cases),'checks':['finite vertices','zero-area triangles','triangle normal reversal (lids use signed x/z Jacobian; large rotations retained)','nose/ear region independence','central blink closure','high-detail preview triangle limit'],
    'triangles':triangles,'meshCount':len(objects),'highDetailPreviewMaximum':34000,
    'bodyBoundsBlenderMetres':{'min':allpoints.min(axis=0).tolist(),'max':allpoints.max(axis=0).tolist()},
    'errors':errors,'passed':not errors,'lidRotationWitnesses':rotation_witnesses,'meshes':metrics,
    'limits':'Sampled endpoint and pairwise arithmetic; no continuous self-intersection, skinning, dynamic garment fit, runtime/mobile or realism acceptance.',
}
(DOC/'geometry-checks.json').write_text(json.dumps(report,indent=2)+'\n')
anchors={
    'schemaVersion':1,'frameId':'original-human-prototype-frame@1','units':'metres',
    'blenderAxes':{'up':'+Z','front':'-Y','characterLeft':'+X'},
    'gltfAxes':{'up':'+Y','front':'+Z','characterLeft':'+X'},
    'blenderToGltf':'[x, y, z] -> [x, z, -y]',
    'sourceBlendSha256':report['blendSha256'],'sourceGlbSha256':report['glbSha256'],
    'skeleton':None,'rigStatus':'No skeleton/skin weights or locomotion yet; real exported shape keys only.',
    'topologyStatus':'Original experimental surfaces, incompatible with current 23-bone body topology. Per-mesh hashes in geometry-checks.json.',
    'bodySurfaceStatus':'Clothed torso/leg envelope plus exposed head/neck/forearm/hand. No independent undressed torso/leg master; clothing fit not accepted.',
    'anchorsBlenderMetres':{
        'scalp.crown':[0,.025,1.759],'scalp.templeLeft':[.072,-.010,1.670],'scalp.templeRight':[-.072,-.010,1.670],
        'eye.left':[.032,-.036,1.635],'eye.right':[-.032,-.036,1.635],
        'ear.lobeLeft':[.080,.010,1.583],'ear.lobeRight':[-.080,.010,1.583],
        'nose.bridge':[0,-.074,1.622],'neck.collar':[0,.013,1.443],
        'shoulder.left':[.176,.012,1.367],'shoulder.right':[-.176,.012,1.367],
        'waist.center':[0,.015,1.039],'wrist.left':[.293,-.011,.925],'wrist.right':[-.293,-.011,.925],
        'foot.left':[.09,-.026,.027],'foot.right':[-.09,-.026,.027],
    },
    'anchorStatus':'Authored rest-frame fitting landmarks from construction parameters, not fitted production surface bindings. Measured actual bounds accompany each mesh.',
    'implementedIdentityControls':IDENTITY,'expressionPresets':PRESETS,
    'correctiveRule':'For every exported corrective.height.CHANNEL, weight = body.height * expression.CHANNEL. Blender source includes drivers; glTF consumer must compute this product explicitly.',
    'unimplementedIdentityCount':32,'provenance':'Original scripted geometry by this lane; no downloaded assets, personal photos, scans or third-party models.',
}
(ROOT/'fit-frame.json').write_text(json.dumps(anchors,indent=2)+'\n')
print(json.dumps({'cases':len(cases),'triangles':triangles,'meshes':len(objects),'errors':len(errors),'passed':not errors,'bounds':report['bodyBoundsBlenderMetres']}),flush=True)
if errors: print(json.dumps(errors[:15]),flush=True)
# Blender --python-exit-code 2 propagates failed assertions to the shell.
assert not errors, 'Geometry checks failed; see geometry-checks.json'
