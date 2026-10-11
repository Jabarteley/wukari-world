"""Writes the shared atlases: atlas-<palette>-<near|far>.jpg for cream, mint and sky.
  blender --background --python make_atlas.py -- <textures-dir> <out-dir>"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import setlib
tex, out = sys.argv[sys.argv.index("--") + 1:][:2]
os.makedirs(out, exist_ok=True)
for pal in setlib.PALETTES:
    setlib.make_atlas(pal, tex, os.path.join(out, "atlas-%s-near.jpg" % pal), 1024)
    setlib.make_atlas(pal, tex, os.path.join(out, "atlas-%s-far.jpg" % pal), 512)
print("ATLASES")
