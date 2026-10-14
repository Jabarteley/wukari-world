"""Read-only closed-lid profile and unchanged appearance comparison; no render."""
import bpy,json,hashlib,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent;sys.path.insert(0,str(ROOT))
from build_character import set_values,DOC
OUT=DOC/'anatomy-candidate-v5-uv1'
def stable(v):
    if isinstance(v,(str,int,float,bool)) or v is None:return v
    try:return [stable(x) for x in v]
    except TypeError:return str(v)
def appearance():
    materials={}
    for m in bpy.data.materials:
        nodes=[]
        if m.use_nodes:
            for n in m.node_tree.nodes:
                nodes.append({'name':n.name,'type':n.bl_idname,'inputs':[(s.name,stable(s.default_value)) for s in n.inputs if hasattr(s,'default_value')]})
        materials[m.name]={'diffuse':list(m.diffuse_color),'nodes':nodes,'links':[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in m.node_tree.links] if m.use_nodes else []}
    lights={o.name:{'type':o.data.type,'energy':o.data.energy,'color':list(o.data.color),'matrix':[list(row) for row in o.matrix_world]} for o in bpy.context.scene.objects if o.type=='LIGHT'}
    digest=lambda x:hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    return {'materialsSha256':digest(materials),'lightsSha256':digest(lights)}
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'anatomy-candidate-v4/anatomy-candidate-v4.blend'));v4=appearance()
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'anatomy-candidate-v5/anatomy-candidate-v5.blend'));v5=appearance()
assert v4==v5
build=json.loads((DOC/'anatomy-candidate-v5/build-receipt.json').read_text());region=build['lidRegions']['Left']
rows=[]
for blink in [0,.5,1]:
    set_values({'expression.blinkLeft':blink,'expression.blinkRight':blink})
    mesh=bpy.data.objects['Head_continuous_anatomy'].evaluated_get(bpy.context.evaluated_depsgraph_get()).data
    samples=[]
    for row,t in enumerate(region['ringFractions']):
        for label,j in [('upperCentre',16),('lowerCentre',48),('outerCorner',0),('innerCorner',32)]:
            i=region['firstNewVertex']+row*region['ringSamples']+j
            samples.append({'label':label,'ring':row,'t':t,'vertex':i,'xyzMetres':list(mesh.vertices[i].co)})
    upper=next(x['xyzMetres'] for x in samples if x['label']=='upperCentre' and x['t']==1)
    lower=next(x['xyzMetres'] for x in samples if x['label']=='lowerCentre' and x['t']==1)
    mids=[x for x in samples if x['label'] in ['upperCentre','lowerCentre']]
    for x in mids:
        p=x['xyzMetres'];chord_y=lower[1]+(upper[1]-lower[1])*(p[2]-lower[2])/(upper[2]-lower[2])
        x['anteriorToOuterRingChordMm']=(chord_y-p[1])*1000
    rim={x['label']:x['xyzMetres'] for x in samples if x['t']==0}
    a,b,centre=rim['innerCorner'],rim['outerCorner'],rim['upperCentre']
    chord_y=a[1]+(b[1]-a[1])*(centre[0]-a[0])/(b[0]-a[0])
    rows.append({'blink':blink,'verticalOuterRingChord':{'upper':upper,'lower':lower},'maximumAnteriorDepartureMm':max(x['anteriorToOuterRingChordMm'] for x in mids),
        'centralUpperMarginAnteriorToCanthusChordMm':(chord_y-centre[1])*1000,'samples':samples})
report={'inputCommit':'c54141c1eb809f1c529e5808e46d228f3451e20f','readOnly':True,'rendered':False,'leftEyeProfiles':rows,
 'appearanceV4':v4,'appearanceV5':v5,'materialsAndLightsExact':True,
 'interpretation':'Measured forward convexity is actual geometry. Globe-supported lid depths and the broad Hermite transition remain domed at full blink. Smooth normals and the unchanged lighting/materials shade this curvature; the finite orientation gates do not assess anatomical thinness. The chord is a local geometric reference, not an anatomical skin-thickness measurement.',
 'nextCorrectionScope':'Preserve the v5 neutral aperture and all protected data. Change only blink path/closed-state tangents; review one close-up side/three-quarter comparison before any further expansion. No correction or appearance work is performed here.'}
(OUT/'closed-lid-profile.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'materialsAndLightsExact':True,'profiles':[{'blink':x['blink'],'maximumAnteriorDepartureMm':x['maximumAnteriorDepartureMm']} for x in rows],'rendered':False}))
