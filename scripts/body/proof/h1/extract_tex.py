"""Writes the base colour image of a glb to a file: python3 -I extract_tex.py <in.glb> <out.png>  (reads the container only; nothing is executed)"""
import json, struct, sys
b = open(sys.argv[1], "rb").read(); n = struct.unpack("<I", b[12:16])[0]; d = json.loads(b[20:20 + n]); off = 20 + n + 8
m = d["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]; im = d["images"][d["textures"][m]["source"]]; bv = d["bufferViews"][im["bufferView"]]
open(sys.argv[2], "wb").write(b[off + bv.get("byteOffset", 0): off + bv.get("byteOffset", 0) + bv["byteLength"]])
