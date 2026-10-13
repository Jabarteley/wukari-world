"""Reopen the delivered .blend and check editability/packed image closure."""
import bpy,json,hashlib
from pathlib import Path
p=Path(__file__).resolve().parent
f=p/'artifacts/everyday-01-tailoring-form.blend'
bpy.ops.wm.open_mainfile(filepath=str(f))
assert not any(o.type=='ARMATURE' for o in bpy.data.objects)
collections={name:bpy.data.collections.get(name) for name in ['01_OVERSHIRT_editable_panels','02_TROUSERS_editable_panels','90_ORIGINAL_TAILORING_FORM_NOT_HUMAN_MASTER']}
assert all(collections.values())
clothes=[o for k,c in collections.items() if not k.startswith('90_') for o in c.objects]
panels=[o for o in clothes if o.type=='MESH'];curves=[o for o in clothes if o.type=='CURVE']
assert len(panels)>20 and len(curves)>20
assert all(any(m.type=='SOLIDIFY' for m in o.modifiers) for o in panels if 'panel' in o.name)
images=[im for im in bpy.data.images if im.name not in ['Render Result','Viewer Node']]
assert len(images)==3 and all(im.packed_file for im in images)
r={'status':'PASS','blendBytes':f.stat().st_size,'blendSha256':hashlib.sha256(f.read_bytes()).hexdigest(),'garmentObjects':len(clothes),'editableMeshObjects':len(panels),'editableCurveObjects':len(curves),'fixtureObjects':len(collections['90_ORIGINAL_TAILORING_FORM_NOT_HUMAN_MASTER'].objects),'packedImages':[{'name':im.name,'size':list(im.size),'packedBytes':im.packed_file.size} for im in images],'armatures':0,'fitAccepted':False}
(p/'receipts/blend-reopen.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
