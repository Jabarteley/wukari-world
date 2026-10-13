"""Apply a 0.20 mm maximum static flattening to the two owned corneal caps only.
Read immutable before bytes; original master data and all materials remain unchanged.
"""
import bpy,json,hashlib
import numpy as np
from pathlib import Path
P=Path(__file__).resolve().parent;F=P.parent
pins=json.loads((P/'receipts/before-pins.json').read_text())
for file,pin in pins['artifacts'].items():
 data=(P/'inputs'/Path(file).name).read_bytes();assert len(data)==pin['bytes'] and hashlib.sha256(data).hexdigest()==pin['sha256']
bpy.ops.wm.open_mainfile(filepath=str(P/'inputs/fitted-human-skin-eyes-v1.blend'))
changes=[]
for side in ['Left','Right']:
 ob=bpy.data.objects['Fitted_Cornea_'+side];cx=.032 if side=='Left' else -.032
 base=np.array([tuple(v.co) for v in ob.data.vertices]);rad2=((base[:,0]-cx)**2+(base[:,2]-1.635)**2)/.00625**2
 shift=.00020*np.maximum(0,1-rad2)
 for v,dy in zip(ob.data.vertices,shift):v.co.y+=float(dy)
 for key in ob.data.shape_keys.key_blocks:
  for v,dy in zip(key.data,shift):v.co.y+=float(dy)
 ob.data.update();ob['corneaRevision']='Static dome 0.25 mm; max posterior change 0.20 mm; no visibility/coverage/blink deformation change'
 changes.append({'object':ob.name,'vertices':len(base),'maxPosteriorShiftM':float(shift.max()),'oldDomeM':.00045,'newDomeM':.00025,'geometryChange':'only local Y of existing vertices and corresponding shape-key coordinates','newMorphs':0,'visibilityOrAlphaChange':False})
# Retain current source plus explicit correction source in editable Text blocks.
text=bpy.data.texts.get('FIT_SOURCE_build_fitted.py')
if text:text.clear();text.write((F/'build_fitted.py').read_text())
text=bpy.data.texts.new('CORNEA_CORRECTION_SOURCE');text.write(Path(__file__).read_text())
text=bpy.data.texts.get('FITTED_README');text.write('\nCORNEA FIX: owned dome reduced from 0.45 to 0.25 mm. Exact input master unchanged. Dense sampled fit receipt and before/after proof in cornea-fix/. No rig, new blink deformation, visibility or alpha workaround.\n')
bpy.context.scene['cornea_revision']='v1.1-static-025mm'
bpy.ops.object.select_all(action='DESELECT')
for side in ['Left','Right']:bpy.data.objects['Fitted_Cornea_'+side].select_set(True)
bpy.ops.export_scene.gltf(filepath=str(P/'inputs/corrected-caps.glb'),export_format='GLB',use_selection=True,export_animations=False,export_morph=True,export_morph_normal=False,export_morph_tangent=False,export_cameras=False,export_lights=False,export_yup=True,export_extras=True,export_tangents=True)
bpy.ops.wm.save_as_mainfile(filepath=str(F/'artifacts/fitted-human-skin-eyes-v1.blend'),compress=True)
(P/'receipts/correction.json').write_text(json.dumps({'sourceCommit':'f504d2f450a95d5f411abca6f63b9401f1401fc5','masterCommit':'3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a','changes':changes,'blendSha256':hashlib.sha256((F/'artifacts/fitted-human-skin-eyes-v1.blend').read_bytes()).hexdigest()},indent=2)+'\n')
print('CORNEA_ONLY_STATIC_CORRECTION_WRITTEN')
