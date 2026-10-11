"""Puts another JPEG in a plain .glb that has one texture: python3 -I swap_texture.py <in.glb> <new.jpg> <out.glb>. Standard library only."""
import json
import struct
import sys

src, jpg, dst = sys.argv[1:4]
data = open(src, "rb").read()
magic, version, total = struct.unpack("<III", data[:12])
jlen, jtype = struct.unpack("<II", data[12:20])
doc = json.loads(data[20:20 + jlen])
off = 20 + jlen
blen, btype = struct.unpack("<II", data[off:off + 8])
binary = bytearray(data[off + 8:off + 8 + blen])
view = doc["bufferViews"][doc["images"][0]["bufferView"]]
new = open(jpg, "rb").read()
while len(binary) % 4:
    binary.append(0)
view["byteOffset"] = len(binary); view["byteLength"] = len(new)
binary += new
while len(binary) % 4:
    binary.append(0)
doc["buffers"][0]["byteLength"] = len(binary)
js = json.dumps(doc, separators=(",", ":")).encode()
while len(js) % 4:
    js += b" "
out = struct.pack("<III", magic, version, 12 + 8 + len(js) + 8 + len(binary)) + struct.pack("<II", len(js), jtype) + js + struct.pack("<II", len(binary), btype) + bytes(binary)
open(dst, "wb").write(out)
