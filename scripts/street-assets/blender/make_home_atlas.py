"""Writes home-atlas.jpg. blender --background --python make_home_atlas.py -- <pictures-dir> <out.jpg>"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import homelib
tex, out = sys.argv[sys.argv.index("--") + 1:][:2]
homelib.make_atlas(tex, out)
print("HOMEATLAS")
