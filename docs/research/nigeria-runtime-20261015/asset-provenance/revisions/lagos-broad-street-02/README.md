# Broad Street runtime revision 2

Budget revision for the existing authorized Lagos game integration. Independent structural and scoped offline visual gates passed against the exact published hashes; host integration remains unverified.

Near: 4,174 triangles, 5 material primitives. Far: unchanged accepted 1,822 triangles, 1 primitive. The near plus measured canonical player (10,078 triangles) totals 14,252, leaving 2,748 below the 17,000 triangle venue cap before host/crowds. This arithmetic does not certify host performance or aggregate draw calls.

Source recovery: original workspace files were unavailable. Exact accepted far GLB and navigation were recovered from kromate/allworld-assets commit 8d01a5b83ab23a64b621def4784ffd0c93684c81. The >1 MB accepted near GLB could not be recovered through the available connector. This is explicitly a near-detail reconstruction from accepted far, not a decimation of the original near. Original approved full-scene PNG was materialized and visually inspected as comparison.

Preserved byte-for-byte: far GLB and embedded atlas image bytes. Navigation, collision and anchor coordinate values are unchanged; sidecar wrappers bind the revision-2 asset ID and manifest hash. Preserved geometry: all accepted far columns, floors, recesses, dark glazing, curb, thresholds, shop counters, umbrella silhouettes. Added budgeted 25mm window profiles, partial louvres, uneven thin racks and shallow closed folded-cloth forms. No arbitrary mesh collapse or broken curb simplification.

Real UVs, portable embedded 1K base / 512 normal / 512 ORM atlas. Added metal and cloth use ordinary scalar PBR with UVs, not procedural shader dependencies. Exactly 8,388,604 decoded RGBA8 bytes including mipmaps per tier. Near/far image hashes match, allowing image dedupe; otherwise unload inactive tier to avoid double allocation. No exported lights. No research photographs embedded.

Reproduce with Blender 4.3.2:
1. Keep baseline/lagos_broadstreet_lod1.glb, baseline/manifest.json and the three extracted atlas PNGs beside these scripts.
2. Run analyze_parts.py, then build_v2.py.
3. Run python share_atlas_bytes.py to restore exact original embedded image bytes and compact the binary buffer.
4. Run baseline/validation-tools/validate_runtime_asset.py manifest.json --out validation.json.
5. Run Blender render_review.py with -- lagos_broadstreet_v2_lod0.glb day runtime-lod0-day, then night runtime-lod0-night. Add eye as final argument for the human-eye-height camera.
6. Run check_winding.py. Closed components have positive signed volume; six inherited open components remain from baseline geometry.

Render previews are actual GLB reimports. HDRI and copyrighted photo sources are not included. No game edits performed by the asset author. The original published batch-001 remains unchanged.

## Published evidence and downloads

`manifest.json` names the direct embedded-texture GLBs. `validation.json` is the independent structural report; `parent-visual-review.json` pins the three actual near-GLB day/night/eye-height PNGs and the corrected sidecars. Far geometry is byte-identical to the accepted [batch-001 checkpoint](../../batch-001/lagos-broad-street-01/README.md), whose [far-distance image](../../batch-001/lagos-broad-street-01/runtime-lod1-distance-day.png) and [offline review](../../batch-001/lagos-broad-street-01/visual-review.json) remain available. No new far render is claimed.

The editable packed Blender file, build/render scripts, extracted atlas maps, component inventory and pinned baseline far/manifest/validator are included directly. Rebuild in a working copy; regenerated hashes and sidecar bindings must be refreshed and reviewed before integration. `AUTHOR-REVIEW.md` records the author's provisional checkpoint; the independent review is authoritative for the final scoped gate.

`publication-manifest.json` records payload hashes and gate pins. `SHA256SUMS.txt` covers every payload file and the publication manifest. No logs, backups, reference photographs, original empty near placeholder or duplicate ZIP are distributed. Seven scene entries remain in the gallery: this is a revision of the existing Broad Street location, not a new location.
