"""Re-export actual saved fitted geometry + morphs, no source reconstruction."""
import argparse
import json
from pathlib import Path
import sys
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from fit_master import LANE,export
p=argparse.ArgumentParser();p.add_argument('--out',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out).resolve();assert LANE in out.parents
out.mkdir(parents=True,exist_ok=True)
proposal=json.loads((Path(bpy.data.filepath).parent/'fit-proposal.json').read_text())
for style,s in proposal['derivatives'].items():export(out/(style+'-fitted.glb'),[bpy.data.objects[n] for n in s['objects']])
