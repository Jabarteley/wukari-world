# Abuja National Mosque boulevard runtime slice

Original authored low-detail architectural geometry and original baked foliage, authorized for this project. The independent research photographs are not embedded, redistributed or used as production textures.

## Surviving CC0 texture lineage

The 1024px surface-atlas.png and 512px normal-atlas.png derive their stone, asphalt and sidewalk tiles from these Poly Haven assets. Other atlas tiles are original authored procedural color/joint patterns. Material roughness and metallic values are scalar glTF parameters; there is no missing procedural shader dependency.

- concrete_wall_006: https://polyhaven.com/a/concrete_wall_006 . Photography Charlotte Baglioni; processing Dario Barresi.
- worn_asphalt: https://polyhaven.com/a/worn_asphalt . Amal Kumar.
- concrete_pavement: https://polyhaven.com/a/concrete_pavement . Original downloaded provenance is retained alongside authoring source.
- Asset license: CC0-1.0, https://polyhaven.com/license and https://creativecommons.org/publicdomain/zero/1.0/

The 256px foliage image is a transparent render baked from this project's original individually authored broadleaf geometry. It is not downloaded plant photography. No Poly Haven model or HDR environment survives in the runtime GLB. The runtime file exports no lights or camera.

## Research only

- https://commons.wikimedia.org/wiki/File:AbujaNationalMosque.jpg — Shiraz Chakera, 16 September 2005, CC BY-SA 2.0. Research-only; image omitted.
- https://commons.wikimedia.org/wiki/File:Abuja_National_Mosque.jpg — Mark Fischer, 16 February 2015, CC BY-SA 2.0. Research-only; image omitted.

This is a compressed, reference-grounded authored scene, not a measured reproduction of current Abuja. Navigation is intentionally limited to the boulevard and sidewalks; the mosque has a blocking volume and no invented interior. True LOD tiers preserve origin, landmark silhouette and street layout. Structural and offline visual checks are separate from target-device performance certification.

Navigation assumes a static street with no moving traffic simulation. The crossing corridor is geometry/path connectivity only; any future traffic layer must add its own crossing and collision rules. Host terrain must continue around the finite slice footprint.
