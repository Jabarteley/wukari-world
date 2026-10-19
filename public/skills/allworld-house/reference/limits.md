# The game's limits for a .glb (generated from src/spaces/glb.ts)

| | A model | A whole house (`--house`) |
|---|---|---|
| Megabytes | 20 | 50 |
| Triangles | 200,000 | 500,000 |
| Pictures | 16 | 32 |
| Picture side, pixels | 4,096 | 4,096 |
| Parts (nodes) | 2,000 | 5,000 |
| Meshes | 500 | 1,500 |
| Materials | 64 | 128 |

glTF 2.0 binary only, every buffer and picture inside the file. Pictures PNG, JPEG or WebP. Extensions a model may use:
`EXT_mesh_gpu_instancing`, `EXT_meshopt_compression`, `EXT_texture_webp`, `KHR_lights_punctual`, `KHR_materials_anisotropy`, `KHR_materials_clearcoat`, `KHR_materials_dispersion`, `KHR_materials_emissive_strength`, `KHR_materials_ior`, `KHR_materials_iridescence`, `KHR_materials_sheen`, `KHR_materials_specular`, `KHR_materials_transmission`, `KHR_materials_unlit`, `KHR_materials_variants`, `KHR_materials_volume`, `KHR_mesh_quantization`, `KHR_texture_transform`. Never Draco, never KTX2.

A player keeps one whole house and up to 30 models (300 MB in all). `node scripts/check_model.mjs file.glb [--house]` runs the same check.
