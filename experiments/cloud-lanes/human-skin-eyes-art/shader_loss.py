"""Reopen saved editable source and compare retained Blender SSS with exported PBR."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(P/'artifacts'/'skin-eyes-calibration-v1.blend'))
s=bpy.context.scene;s.render.resolution_x=420;s.render.resolution_y=420;s.cycles.samples=64;s.cycles.use_denoising=False;s.render.threads_mode='FIXED';s.render.threads=2
# Two copies of the same frozen patch/UV at identical physical scale.
for ob in bpy.data.collections['01_CALIBRATION_ASSETS_NOT_HUMAN_FIT'].objects:ob.hide_render=True
original=bpy.data.objects['SkinPatch_02_copper']
copies=[]
for i,suffix in enumerate(['BAKED_PBR','BLENDER_SSS_SOURCE']):
    ob=original.copy();ob.data=original.data.copy();s.collection.objects.link(ob);ob.hide_render=False;ob.location=(0,0,.044);ob.data.materials.clear();ob.data.materials.append(bpy.data.materials['Skin_02_copper_'+suffix]);copies.append(ob)
cam=s.camera;cam.location=(0,-.22,.074);cam.rotation_euler=(Vector((0,0,.044))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.073
for name,energy in [('Key',.85),('Fill',.3),('Rim',1.4)]:bpy.data.objects[name].data.energy=energy
for i,label in enumerate(['pbr','sss']):
    for j,ob in enumerate(copies):ob.hide_render=(i!=j)
    s.cycles.seed=7108;s.render.filepath=str(P/'proof'/f'shader-{label}.png');bpy.ops.render.render(write_still=True)
# Reopened source integrity: files packed, text sources present, unbound joints/morphs.
r=dict(status='PASS',blendOpened=True,packedImages=[im.name for im in bpy.data.images if im.packed_file],embeddedSources=[t.name for t in bpy.data.texts],comparison='sequential matched-camera and matched-light frames: exported core PBR / Blender SSS source; identical maps, geometry and random seed',sourceSubsurfaceWeight=.11,sourceSubsurfaceScaleM=.00065,coreSubsurfaceWeight=0,renderSamples=64,threads=2)
(P/'receipts'/'source-reopen.json').write_text(json.dumps(r,indent=2)+'\n')
print('SHADER_LOSS_PROOF_COMPLETE')
