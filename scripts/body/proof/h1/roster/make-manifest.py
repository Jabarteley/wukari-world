#!/usr/bin/env python3
"""Writes roster.json for a folder of roster files:  python3 -I make-manifest.py <assets-roster dir> <roster-config.json>
The config holds, per figure id, the look name and sex (from the creator's catalogue), whether skin steps are allowed, and whether the figure passed review (ok).
Everything else (the number of outfits, file names, byte sizes) is read from the folder, so the manifest cannot disagree with the files."""
import json, os, re, sys
d, cfgp = sys.argv[1], sys.argv[2]
cfg = json.load(open(cfgp))
chars = []
for cid, c in cfg.items():
    files = {}
    def add(name):
        p = os.path.join(d, name)
        if os.path.exists(p):
            files[name] = os.path.getsize(p)
        return os.path.exists(p)
    ok = True
    for lod in ("hero", "crowd"):
        for suf in (".glb", ".json", "-mask.png"):
            ok &= add(f"{cid}-{lod}{suf}")
    n = 0
    while os.path.exists(os.path.join(d, f"{cid}-hero-outfit-{n + 1}.jpg")):
        n += 1
        ok &= add(f"{cid}-hero-outfit-{n}.jpg") and add(f"{cid}-crowd-outfit-{n}.jpg")
    for k in range(n + 1):
        ok &= add(f"portraits/{cid}-{k}-face.png") and add(f"portraits/{cid}-{k}-full.png")
    chars.append({"id": cid, "sex": c["sex"], "look": c["look"], "outfits": n, "skinSteps": bool(c["skin"]),
                  "files": files, "bytes": sum(files.values()), "ok": bool(c["ok"]) and bool(ok)})
json.dump({"version": 2, "note": "outfits counts the numbered outfit maps; outfit 0 is the figure as made (the map inside the model file). Files are relative to this folder.", "characters": chars}, open(os.path.join(d, "roster.json"), "w"), indent=1)
print("roster.json", [(c["id"], c["outfits"], c["ok"]) for c in chars])
