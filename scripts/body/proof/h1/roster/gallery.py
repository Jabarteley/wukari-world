#!/usr/bin/env python3
"""Shot lists and sheet layouts for the roster gallery (python3 with pillow):
  gallery.py shots <out.json> <kind>     kind: check | skin | outfits | faces | groups
  gallery.py sheet <shots-dir> <out-dir>  composes check-<id>.png, strip-skin-<id>.png, outfits-<id>.png and the face files from the frames
"""
import json, os, sys

IDS = ["m1", "m2", "m3", "m4", "m5", "m6", "w1", "w2", "w3", "w4", "w5", "w6"]
SKIN = ["#c48f66", "#a8704a", "#8a5a38", "#6e4429", "#523320", "#3a2317"]
cam = lambda t, d, az=0, l=0.35, f=30: {"target": t, "dist": d, "az": az, "lift": l, "fov": f}


def spec(pick, pose="idle", phase=0, ry=0, w=340, h=520, c=None, face=None):
    s = {"picks": [pick] if isinstance(pick, dict) else pick, "pose": pose, "phase": phase, "rys": [ry] * (1 if isinstance(pick, dict) else len(pick)), "cols": 1 if isinstance(pick, dict) else len(pick), "spacingX": 1, "width": w, "height": h, "cam": c or cam([0, 0.95, 0], 4.0)}
    if face:
        s["face"] = face
    return s


def shots(kind, manifest=None):
    out = []
    counts = {c["id"]: c["outfits"] for c in json.load(open(manifest))["characters"]} if manifest else {}
    for i in IDS:
        top = 1.62 if i[0] == "w" else 1.70
        fc = cam([0, top, 0], 1.05, 0, 0, 28)
        if kind == "check":
            for tag, pose, ph, ry in (("a-front", "idle", 0, 0), ("b-side", "idle", 0, 1.5), ("c-back", "idle", 0, 3.14), ("d-walk", "walk", 0.25, 0.6), ("e-jog", "jog", 0.3, 0.6), ("f-sit", "sit", 0.5, 0.6), ("g-dance", "dance", 0.4, 0.0)):
                out.append({"name": f"{i}-{tag}", "spec": spec({"id": i}, pose, ph, ry)})
            for tag, ry, face in (("h-face", 0, None), ("i-tq", 0.7, None), ("j-side", 1.5, None), ("k-blink", 0, {"blink": 1}), ("l-happy", 0, {"mood": "happy"}), ("m-uneasy", 0, {"mood": "uneasy"})):
                out.append({"name": f"{i}-{tag}", "spec": spec({"id": i}, "idle", 0, ry, 340, 340, fc, face)})
        elif kind == "faces":
            fc2 = cam([0, top, 0], 0.55, 0, 0, 28)
            for tag, ry in (("front", 0), ("tq", 0.7), ("side", 1.5)):
                out.append({"name": f"face-{i}-{tag}", "spec": spec({"id": i}, "idle", 0, ry, 600, 600, fc2)})
        elif kind == "skin":
            out.append({"name": f"skin-{i}", "spec": {**spec([{"id": i}] + [{"id": i, "skin": t} for t in SKIN], "idle", 0, 0, 1500, 640, cam([0, 1.0, 0], 5.0, 0, 0.3, 30)), "spacingX": 0.85}})
        elif kind == "outfits":
            out.append({"name": f"outfits-{i}", "spec": spec([{"id": i, "outfit": k} for k in range(counts.get(i, 3) + 1)], "idle", 0, 0, 1100 if counts.get(i, 3) >= 3 else 880, 620, cam([0, 1.0, 0], 5.6, 0, 0.4, 30))})
    return out


if __name__ == "__main__":
    if sys.argv[1] == "shots":
        json.dump(shots(sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None), open(sys.argv[2], "w"))
    elif sys.argv[1] == "sheet":
        from PIL import Image
        d, o = sys.argv[2], sys.argv[3]
        for i in IDS:
            top = [Image.open(f"{d}/{i}-{t}.png").convert("RGB") for t in ("a-front", "b-side", "c-back", "d-walk", "e-jog", "f-sit", "g-dance")]
            bot = [Image.open(f"{d}/{i}-{t}.png").convert("RGB") for t in ("h-face", "i-tq", "j-side", "k-blink", "l-happy", "m-uneasy")]
            sh = Image.new("RGB", (340 * 7, 860), (0, 0, 0))
            for k, im in enumerate(top): sh.paste(im, (k * 340, 0))
            for k, im in enumerate(bot): sh.paste(im, (k * 340, 520))
            sh.save(f"{o}/check-{i}.png")
