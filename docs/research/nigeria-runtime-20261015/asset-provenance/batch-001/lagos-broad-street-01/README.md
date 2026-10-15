# Lagos Broad Street frontage: batch 001

Immutable runtime candidate, 15 October 2026. This is one standalone Broad Street / Marina-inspired frontage and its ground-floor shops, not an entire Lagos block or a survey reconstruction. Adjacent buildings, the road, vehicles and the larger offline source scene are excluded.

## Integrate

Use `manifest.json` as the authoritative metre / Y-up contract. Load the near or far GLB named in `lods`; images are embedded, with no remote texture dependencies. `collision.json` and `anchors.json` are exact extracts of the manifest navigation, bound to its SHA-256. Keep transforms, entrances and collision positions in the same coordinate frame. Do not substitute the legacy material-replacing importer for these PBR materials.

Near: 7,618 triangles, one primitive. Far: 1,822 triangles, one primitive. Per-tier decoded RGBA8 textures including mipmaps are 8,388,604 bytes. Both tiers contain the same images; manage texture reuse or unload inactive tiers to avoid double residency. Measure aggregate host/shadow draw cost rather than treating these authoring metrics as scene performance.

## Evidence and limits

`validation.json` records independent structural, LOD, finite-buffer, texture-budget and conservative navigation checks against the exact files. `visual-review.json` binds independent daylight/night reimport-image inspection and a far-distance view to model and render hashes. Reviewed PNGs are included unchanged. Night shop illumination comes from the preview rig; no runtime lights are embedded.

The far tier is distance-only and omits window frames/louvres. Opaque PBR windows approximate source glazing. Game integration, LOD-transition behavior, actual collision alignment, runtime lighting, device performance and production deployment remain unverified by this package. Successful export and offline review are not gameplay acceptance.

## Rights and integrity

Original geometry is authorized for the owner's project use. No general redistribution license is granted; the repository's owner license decision remains pending. The baked Poly Haven source maps are CC0; see `THIRD-PARTY-NOTICES.md`. Architectural photos were used only for research and are not distributed or embedded.

`publication-manifest.json` records payload hashes and gate pins. `SHA256SUMS.txt` covers all files except itself. The source Blender revision is identified in the runtime manifest; the large editable source archive is not part of this runtime batch.
