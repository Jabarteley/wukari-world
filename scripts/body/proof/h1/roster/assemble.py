#!/usr/bin/env python3
"""Collects the roster files into one folder with the names the game side uses:
  python3 -I assemble.py <work-root> <out-dir> [<id> ...]
  <id>-hero.glb  <id>-crowd.glb  <id>-hero.json  <id>-crowd.json  <id>-hero-mask.png  <id>-crowd-mask.png  <id>-hero-outfit-<n>.jpg  <id>-crowd-outfit-<n>.jpg
Outfit maps are re-encoded to stay under 150 kB (player, 1024) and 50 kB (crowd, 512).  Which of a figure's baked outfits are kept comes from KEEP below (the others failed review)."""
import io, json, os, shutil, sys
from PIL import Image

root, out = sys.argv[1], sys.argv[2]
ids = sys.argv[3:] or ["m1", "m2", "m3", "m4", "m5", "m6", "w1", "w2", "w3", "w4", "w5", "w6"]
KEEP = {"w1": [1, 2], "w5": [1, 2], "w6": [1, 2]}
LIMIT = {"hero": 150_000, "crowd": 50_000}
os.makedirs(out, exist_ok=True)


def squeeze(src, dst, limit):
    im = Image.open(src).convert("RGB")
    for q in (88, 82, 76, 70, 64, 58, 52, 46, 40, 34):
        b = io.BytesIO(); im.save(b, "JPEG", quality=q, optimize=True, progressive=True, subsampling=2)
        if b.tell() <= limit:
            break
    open(dst, "wb").write(b.getvalue())
    return q, b.tell()


for c in ids:
    for lod in ("hero", "crowd"):
        shutil.copy(f"{root}/out/{c}-{lod}.glb", f"{out}/{c}-{lod}.glb")
        meta = json.load(open(f"{root}/out/{c}-{lod}.json")); sk = json.load(open(f"{root}/var/{c}/{c}-{lod}-skin.json"))
        meta["refs"] = {"skin": [round(v, 4) for v in sk["refSkin"]], "skin2": [round(v, 4) for v in sk["refSkin2"]]}
        meta["mask"] = f"{c}-{lod}-mask.png"
        json.dump(meta, open(f"{out}/{c}-{lod}.json", "w"))
        shutil.copy(f"{root}/var/{c}/{c}-{lod}-mask.png", f"{out}/{c}-{lod}-mask.png")
        for new, i in enumerate(KEEP.get(c, [1, 2, 3]), 1):
            q, n = squeeze(f"{root}/var/{c}/o{i}-{lod}.jpg", f"{out}/{c}-{lod}-outfit-{new}.jpg", LIMIT[lod])
            print(c, lod, "outfit", new, "q", q, n, "bytes")
