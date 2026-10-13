"""One bounded still per invocation, opening the saved editable artifact."""
import bpy
import sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
kind=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'eye'
cameras={'eye':'Camera_street_eye_1.65m','detail':'Camera_drain_detail','overview':'Camera_segment_overview','plan':'Camera_planning_200m'}
bpy.ops.wm.open_mainfile(filepath=str(HERE/'artifacts/yaba-street-v1.blend'))
s=bpy.context.scene;s.camera=bpy.data.objects[cameras[kind]]
s.render.threads_mode='FIXED';s.render.threads=2
if kind=='plan':
    bpy.data.collections['03_PLANNING_200m_not_detailed_art'].hide_render=False
    s.render.resolution_x=720;s.render.resolution_y=720
if kind=='detail':s.cycles.samples=32
s.render.filepath=str(HERE/'artifacts'/f'{kind}.jpg')
bpy.ops.render.render(write_still=True)
