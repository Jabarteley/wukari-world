# Blender to Allworld

**Units and axes.** 1 Blender unit = 1 metre. Z is up. The front wall of the house runs along the X axis at Y = 0, the house extends
towards −Y (its back wall at Y = −depth), and its left end is at X = 0. The glTF exporter turns this into the game's axes (Y up, the house
towards +Z). `scripts/build_house.py` builds everything this way; keep to it when you add parts.

**The way in.** An empty named `allworld_spawn`, on the ground in front of the main door (beyond the fence if there is one): the game starts the walker there.
`build_house.py` adds it.

**What the game draws.** Meshes with Principled BSDF materials (base colour, roughness, metallic, normal map, emission, alpha). No
custom shader nodes beyond those, no geometry nodes left unapplied (apply them before exporting), no Draco compression, no KTX2.

**Staying within the limits** (`limits.md`):
- Decimate dense meshes (Modifier → Decimate, ratio 0.3 to 0.6) and apply it; walls and floors need very few faces.
- Pictures at most 2048 px for walls and floors, 1024 px for small parts; export them as WebP (Export → Images: WebP) or JPEG.
- Join small parts that share a material (Ctrl J) so the house has a few hundred meshes, not thousands.

**Export.** File → Export → glTF 2.0: Format **glTF Binary (.glb)**, Include: Selected Objects off (the whole scene), Transform: **+Y Up**
on, Mesh: Apply Modifiers on, Compression off (or meshopt via gltfpack), Images: WebP. Then:
`node scripts/check_model.mjs house.glb --house`.

**Collision.** Every wall, floor, stair and roof surface you model is solid in the game (the house is one triangle mesh to the physics).
Leave doorways open at least 0.8 m wide and 2 m high, and stairs with steps of at most 30 cm, so a walker gets through and up.
