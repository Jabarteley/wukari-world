# Lagos Broad Street runtime slice

Original geometry and procedural material components were authored for this project. Owner-authorized project use; no external redistribution license is inferred.

## CC0 source maps baked into atlases
- Concrete wall 006: https://polyhaven.com/a/concrete_wall_006 . Photography Charlotte Baglioni, processing Dario Barresi.
- Concrete pavement: https://polyhaven.com/a/concrete_pavement .
- License for both: CC0-1.0 https://polyhaven.com/license .

The basecolor, normal and ORM atlases combine these maps with original procedural material colours/surface details. Source maps are not city reference photographs. No chair/crate imported model, HDRI, asphalt texture, vehicle or copyrighted reference photo survives in the runtime GLBs.

## Architectural references, research only
TAG, January 21 2024, Lagos Broad Street and Marina environs: https://transnationalarchitecture.group/2024/01/21/lagos-broad-street-and-marina-environs/ . Actual photo pixels were inspected before original scene authoring. The six-storey repetitive deep concrete bays and shaded retail frontage informed the scene; dimensions and shop layout are artistic estimates, not survey data.

## Runtime boundaries
Single frontage module, not an entire city block. Small wares/frames retained selectively; geometry interiors upstairs simplified. Lower LOD removes complete detail parts and retains intact structure/curb geometry with the same footprint and navigation sidecar. Ground shop counters are obstacles. Upper floors are not navigable. GLBs contain baked portable texture shaders, no procedural nodes or external network assets. Structural validation does not establish gameplay or mobile FPS acceptance.

Texture residency: each tier has identical embedded images totaling 8,388,604 bytes decoded RGBA8 with full mipmaps. The host must deduplicate textures across separately loaded GLBs or unload the inactive tier; loading both independently can allocate about16MiB. LOD1 is distance-only, not a near-camera substitute. Night preview lights are review-only and not exported.
