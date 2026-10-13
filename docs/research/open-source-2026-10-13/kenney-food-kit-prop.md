# Kenney Food Kit counter prop: bowl-soup

**Decision:** use `bowl-soup.glb` as the first single counter/table prop. It is the smallest of the two requested food candidates, has a readable bowl silhouette, and shares the same atlas/material contract as the other Kenney food models. Keep `pot-stew.glb` as a later alternative if the larger cooking-pot silhouette is needed; do not start with `banana.glb` because the current Allworld asset set already has plantain/vegetation-adjacent props.

## Provenance and license

- Official source page: [Kenney Food Kit](https://kenney.nl/assets/food-kit) (the page identifies the Food Kit and its downloadable contents).
- The archive supplied for this inspection is `/tmp/allworld-kenney-food-kit.zip` (4.4 MiB as listed locally; archive entries dated 2024-06-26).
- `License.txt` in the archive says **Food Kit 2.0**, created/distributed by Kenney, and licenses the pack **CC0 1.0**: <https://creativecommons.org/publicdomain/zero/1.0/>. It explicitly permits personal, educational, and commercial use; Kenney/www.kenney.nl credit is appreciated but not required. Keep the license with any copied asset and retain provenance in the asset manifest.

## Exact inspected metadata

All three GLBs were parsed from the supplied ZIP without installing packages, downloading files, building, or running the application. Each is a UnityGLTF 2.0 file with one scene, one node, one mesh, one primitive, one material, and one external image reference. No animation, skin, or morph sections are present in the inspected JSON.

| file | archive bytes | vertices | index type/count | triangles | position min → max | raw dimensions (X × Y × Z) |
|---|---:|---:|---|---:|---|---|
| `banana.glb` | 12,348 | 212 | UNSIGNED_BYTE / 312 | 104 | `[-0.068799995,0,-0.314935625]` → `[0.068799995,0.195800394,0.314935625]` | `0.13759999 × 0.195800394 × 0.629871249` |
| **`bowl-soup.glb`** | **11,188** | **188** | **UNSIGNED_BYTE / 396** | **132** | **`[-0.251076520,0,-0.289918214]` → `[0.251076520,0.213824779,0.289918214]`** | **`0.502153039 × 0.213824779 × 0.579836428`** |
| `pot-stew.glb` | 29,560 | 532 | UNSIGNED_SHORT / 1,110 | 370 | `[-0.328724712,0,-0.411035407]` → `[0.328724712,0.360800000,0.411035407]` | `0.657449424 × 0.360800000 × 0.822070814` |

For the selected bowl, the primitive has `POSITION`, `NORMAL`, `TANGENT`, and `TEXCOORD_0`; all four accessors have count 188. The index accessor has count 396 and max index 187. The node has no explicit translation, rotation, or scale arrays, so its transform is the glTF identity. Geometry is centered around X/Z and rests at Y=0. Treat these as raw glTF units and confirm visual scale at the intended counter seam before assuming one unit equals one metre.

The one material is named `colormap` and is directly compatible with a Three.js glTF PBR material:

```json
{
  "pbrMetallicRoughness": {
    "baseColorTexture": {
      "index": 0,
      "extensions": {"KHR_texture_transform": {"texCoord": 0}}
    },
    "metallicFactor": 0.0
  },
  "doubleSided": true,
  "name": "colormap"
}
```

There is no explicit roughness factor in this JSON. The transform extension contains only `texCoord: 0`, so offset/rotation/scale remain defaults (identity). The image is external, not embedded: `Textures/colormap.png`. The texture and image arrays each contain one entry; the sampler is shared by that one texture.

`colormap.png` is **10,715 bytes**, **512×512**, 8-bit indexed PNG (color type 3), with a 254-entry RGB palette, no `tRNS` chunk, and all 254 palette entries used. The most frequent palette RGB values in the decoded image include `(0,0,0)`, `(65,51,49)`, `(56,56,61)`, `(176,96,65)`, `(255,126,68)`, `(79,82,96)`, `(103,148,217)`, `(160,168,201)`, `(207,83,79)`, `(241,151,108)`, `(253,228,199)`, and `(255,255,255)`. These are atlas palette colors, not a semantic claim about the soup or bowl; the model’s UVs select the relevant swatches.

The selected bowl’s UV accessor has 188 entries, with bounds `[0.09375, 0.524999976]` → `[0.96875, 0.975000024]`. All three candidate meshes point at the same external atlas and the same one-material contract, so a loader can cache one `colormap.png` for multiple food props. The atlas is indexed PNG; there is no KTX2/Basis decoder requirement for this asset.

## Minimal Allworld integration shape

Prefer an **offline bake into the existing shared geometry/material path**, rather than adding a new runtime GLB decoder, texture, or draw for one prop:

1. Use the asset tooling once to read the one primitive and preserve its identity transform, bounds, indices, normals, and UVs.
2. Sample the 512×512 indexed atlas and emit `COLOR_0` (or the project’s existing vertex-color representation) into the generated shared scene asset. Validate the result against a reference render because 188 vertices cannot reproduce every texel boundary if UV islands cross palette edges.
3. Append the bowl geometry to the existing venue/food layer seam and reuse its shared material/batch. If exact atlas appearance is required, keep the single shared PNG as an explicit measured fallback; do not assume a vertex-color bake is pixel-identical.
4. Place the origin on the counter surface using the existing venue transform, with Y=0 as the model’s local floor. The bowl’s raw footprint is roughly 0.50×0.58 units, so a scale/placement check is required before committing a fixed scale.

The archive itself is evidence of the geometry/texture contract; it does not prove visual fit, atlas orientation after Three.js texture conventions, or acceptable draw-call/batch behavior in Allworld. Acceptance should be a reference-image comparison plus a scene probe confirming no unexpected material/texture duplication.

## Why bowl-soup first

`bowl-soup.glb` costs 11,188 archive bytes and 132 triangles versus `pot-stew.glb` at 29,560 bytes and 370 triangles. Both use one primitive/material and the same 512×512 atlas, so the bowl gives the lower geometry and transfer risk for a first integration while still reading as a table food prop. `pot-stew.glb` is a valid second candidate, but its archive also has a separate `pot-stew-lid.glb`; that increases placement/variant decisions without adding value to the first test.

## Evidence limits

This is archive metadata, not a browser or device performance result. `archive bytes` are ZIP entry sizes, not decoded GPU memory. The texture’s palette/PNG dimensions describe the source image; actual GPU allocation depends on Three.js upload format, color-space handling, mip policy, and device capabilities. No claim is made here that the bowl is already in Allworld or that an offline vertex-color bake preserves the atlas exactly.
