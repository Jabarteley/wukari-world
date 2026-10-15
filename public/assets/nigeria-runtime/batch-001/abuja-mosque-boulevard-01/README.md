# Abuja mosque boulevard: batch 001

Immutable runtime candidate, 15 October 2026. This bounded, reference-grounded landmark/boulevard slice is an original authored interpretation, not a measured current reconstruction. It omits source cars and dense surrounding city context.

## Integrate

`manifest.json` is the authoritative metre / Y-up contract. Load its near or far GLB; all images are embedded. `navigation.json` exactly matches manifest navigation. `collision.json` and `anchors.json` are explicit extracts bound to the manifest SHA-256. Apply the same transform/unit conversion to mesh and all navigation data. Preserve portable PBR materials rather than using the legacy material-replacing scenery importer.

Near: 4,942 triangles, 4 primitives. Far: 1,936 triangles, 4 primitives. Per-tier decoded RGBA8 textures including mipmaps: 7,340,028 bytes. The tiers contain shared-image content; deduplicate textures or unload inactive tiers. Actual host draw counts, shadow passes and total-scene residency need measurement.

Navigation is limited to boulevard/sidewalks; the mosque is a solid blocking volume without an invented interior. The connected crossing is static geometry/path connectivity only. Future moving traffic needs its own crossing/collision rules; host terrain must continue around this finite slice.

## Evidence and limits

`validation.json` records independent structural, resource-budget and conservative navigation checks. `visual-review.json` pins four final exported/reimported day/night previews to exact GLB/image hashes. The unchanged reviewed PNGs are included. Daylight review confirmed restored facade divisions, full minaret silhouettes and corrected foliage masking. Night previews are very dark and establish only material/silhouette integrity, not detailed nighttime realism. No lights or cameras are embedded in the model.

Far geometry is distance-only, with faceted dome/minarets. Crossed-card foliage is not approved for close-up quality. Dome panel seams remain a documented improvement. Host integration, physical-device performance, runtime collision behavior, lighting parity and LOD transitions remain unverified by this package. No deployment success is implied.

## Rights and integrity

Original geometry and authored foliage are authorized for the owner's project use; no general redistribution license is granted and the repository license decision remains pending. Derived Poly Haven map components are CC0. See `THIRD-PARTY-NOTICES.md` for source lineage. Architectural research photos are not redistributed or embedded.

`publication-manifest.json` records payload hashes and gate pins. `SHA256SUMS.txt` covers every file except itself. The runtime manifest identifies its authoring source revision; the large editable source archive is excluded from this lightweight runtime batch.
