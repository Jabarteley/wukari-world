"""Export selected existing meshes from saved Blender source, no regeneration."""
import argparse
from pathlib import Path
import sys
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_hair import LANE,export
p=argparse.ArgumentParser();p.add_argument('--style',required=True);p.add_argument('--out',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out).resolve();assert LANE in out.parents;out.mkdir(parents=True,exist_ok=True)
for tier in ['near','far']:
    objs=[o for o in bpy.data.objects if o.type=='MESH' and o.name.endswith(' - '+tier)]
    assert objs
    export(out/f'{a.style}-{tier}.glb',objs)
print('Exported actual saved meshes; compare decoded geometry and material values, node order may differ.')
