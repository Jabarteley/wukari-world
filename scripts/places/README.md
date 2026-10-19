# Unique places: Blender framework

Builds one location-true model per place (LOD0/1/2) from a `PlaceBriefV1` + `CityStyleV1`. Rules live in
[docs/agent-plans/unique-places/CONTRACT.md](../../docs/agent-plans/unique-places/CONTRACT.md); this file is the author's manual.

## Commands

```bash
BLENDER=/Applications/Blender.app/Contents/MacOS/Blender

# 1. the global trim atlas (only when atlas/build.py changes; commits atlas/trim.webp + atlas/slots.json)
/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 scripts/places/atlas/build.py [--preview]

# 2. build jobs: one JSON object per line {city, venueId, brief, style}. One Blender process loops over all lines.
$BLENDER -b --factory-startup --python scripts/places/blender/worker.py -- \
    --jobs scripts/places/fixtures/airport-briefs.jsonl --out scripts/places/out \
    [--only venueId,city/venueId] [--no-render] [--views lod1,lod2,close]

# 3. gltfpack (meshopt + quantisation), brotli gates, content hashes (needs network once: npx gltfpack@1.3.0)
node --experimental-strip-types scripts/places/pack.ts [--out scripts/places/out] [--only city/venueId] [--drop-raw]

# 4. contact sheet of previews
$BLENDER -b --factory-startup --python scripts/places/blender/contact_sheet.py -- --out sheet.png a.png b.png c.png [--cols 3]
```

Never run more than two Blender processes at once on an 8 GB machine (about 500 MB each with EEVEE). Use `--only` while iterating on a
generator: a model costs about 0.25 s to build plus 1.1 s to render, so looping many models in one process is the way.
`--views lod1,lod2,close` also writes `<id>.lod1.png`, `<id>.lod2.png` and a 1024 px low-angle `<id>.close.png` for inspection.

Outputs under `out/<city>/` (gitignored): `<venueId>.lod{0,1,2}.raw.glb`, `<venueId>.png` (512 preview, atlas applied, front 3/4,
soft sun and sky), `<venueId>.mask.png` (128 px front silhouette of the BUILDING only, white on black), `<venueId>.json` report
(status ok|rejected|error|packed, triangles per LOD, `breakdown` of triangles per `b.section()` label, rawBytes, bounds, warnings,
errors, seconds, briefDigest). After pack: `<venueId>.lod{n}.<sha8>.glb` and `packed.lod{n}` in the report.

## Archetype module

`scripts/places/blender/archetypes/<archetype-id>.py` (hyphenated ids are fine, the worker loads by path):

```python
import lib                      # the worker puts scripts/places/blender on sys.path

FEATURES = {'control-tower', ...}   # optional: feature ids you implement; other ids in the brief become report warnings
def warnings(brief, style): ...     # optional: extra report warnings
def build(brief, style, rng, detail):  # detail 0/1/2 = LOD0/1/2; rng is the ONLY randomness (seeded per job, fresh per LOD)
    b = lib.Builder('name', detail)
    lk = lib.look(brief, style, rng)
    ...
    return b.objects()          # [building] + [building-site] when site() faces exist
```

Keep it deterministic: same brief + style gives the same bytes (checked). Draw random numbers that affect colours or placements of
site furniture from a sub-stream taken once at the top (`srng = random.Random(rng.getrandbits(64))`) so LODs agree on the details.
The worker checks: only mesh objects, one material named `trim`, triangle budgets (20,000 / 4,000 / 500), building bounds
(largest horizontal side over 170 m is an error, over about 134 m a warning; height 1 to 140 m).

## Conventions

- Metres. Blender +Z up (exported +Y up). Ground at z = 0. The main facade faces **-Y** (towards the camera); x runs left to right
  as seen from the camera. The preview camera looks from the front-right.
- Polygons: counter-clockwise seen from above for solids; holes clockwise. A face is visible from the side it winds counter-clockwise
  towards (back faces are culled). Use `b.facing(pts, hint_direction, ...)` when you do not want to think about winding.
- Everything is ONE material `trim` = global 2048 atlas x vertex colour `COLOR_0` (both multiply). Models do not embed the image;
  the game binds `atlas/trim.webp` using `atlas/slots.json` for reference. Every face picks a slot by name; colour is a `'#hex'` tint.
  Texture slots are neutral and light so the tint carries the colour. UVs are planar and tiled at each slot's real-world size
  (`tileM` in metres): faces are cut at tile borders, so large walls stay sharp but cost triangles (use `scale=` to coarsen).
- LOD2 is vertex colour only: the Builder maps every face to the `plain` slot automatically when `detail == 2`. Library helpers skip
  windows, trees, cars etc. at LOD2; you should skip ground and detail too (massing silhouette + roof only).
- "Site" geometry (ground pad, trees, cars, lamps, aircraft) goes in `with b.site():` (the lib's `ground/forecourt/tree/car/lamp`
  do it for you). It is exported in the same GLB but left out of the silhouette mask and the size check.
- No logos or legible text: `sign_board` is a blank board.

## Library (`import lib`)

Slots in `atlas/slots.json` (name: tile metres): walls `plain-render 4, rough-concrete 4, brick 2, stone-blocks 4, mud-render 4,
metal-cladding 4, timber 1.6`; roofs `corrugated 2, clay-tile 2, slate 2, metal-roof 3, roof-flat 4`; ground `paving 2, asphalt 4, grass 4,
laterite 4, sand 4`; glazing (whole polygon fits the whole slot) `glass-curtain, glass-punched, glass-shopfront, glass-ribbon`; trims
`cornice, frame, plain`. Pass any of them as `slot=`.

**Core**
- `lib.reset()` empty scene (the worker does this). `lib.mat()` the shared `trim` material. `lib.tint(obj, '#hex', mode='set'|'multiply')`.
- Colour: `rgb('#hex')`, `to_hex(rgb)`, `lin(rgb)`, `shade('#hex', f)`, `mix(a, b, t)`, `jitter('#hex', rng, amount)`, `pick(rng, list)`.
- `Builder(name, detail)`: `.face(pts, slot, col, smooth=False, uvs=None, mode=None, scale=1.0)`, `.facing(pts, hint, slot, col, **kw)`,
  `.shared_grid(grid, slot, col, smooth=True, wrap=False, scale=1.0)` (smooth surface from grid[i][j]; face normal is
  row-direction x column-direction; wrap closes the rows round), `.site()` context, `.section(label)` (triangle breakdown in the report),
  `.objects()`, `.tris`, `.detail`, `.flat` (True at LOD2). `lib.count_triangles(objs)`, `lib.bounds(objs)`.
- `lib.look(brief, style, rng) -> Look`: resolved slots and colours: `wall_slot, wall_col, accent_slot, accent_col, trim_col,
  roof_slot, roof_col, glass_slot, glass_col, frame_col, windows, ratio, ground_slot, ground_col, tree, forecourt, stone_col,
  dark_col, metal_col`. MATERIALS/ROOF_MATERIALS map to slots in `lib/facade.py` (`WALL_SLOT`, `ROOF_SLOT`). Overwrite attributes freely.

**Footprints** (all centred on 0,0; `Footprint.polys` outer CCW first, holes after; `.rects` wing rectangles, `.bbox`, `.size`,
`.edges()` yielding `Seg`, `.moved(dx, dy)`): `fp_rect(w, d, cx=0, cy=0)`, `fp_L(w, d, wing_w, wing_d, side)`, `fp_U(w, d, arm_w, arm_d,
open_to)`, `fp_T`, `fp_H`, `fp_cross`, `fp_ring(w, d, court_w, court_d)`, `fp_oval(w, d, n)`, `fp_round(r, n)`, `fp_polygon(points)`, and
`footprint(kind, w, d, rng, detail)` that takes the brief's `form.footprint` string (rect L U T H ring oval round cross irregular).

**Solids**: `box(b, x0,y0,z0, x1,y1,z1, slot, col, top_slot, top_col, skip=('bottom',))`, `box_c(b, cx, cy, z0, w, d, h, ...)`,
`obox(b, cx, cy, z0, sx, sy, h, yaw, ...)` (rotated box), `beam(b, p0, p1, z0, z1, width)`, `prism(b, poly_or_footprint, z0, z1)`,
`cylinder(b, cx, cy, z0, z1, r, n, slot, col, r_top=None, top=True, smooth=True)` (r_top=0 is a cone), `cap(b, polys, z, up, slot, col)`,
`sweep(b, footprint, z, profile=[(out, up), ...], slot, col)` (cornices, plinths, parapets, eaves, mitred round any footprint),
`steps(b, x0, x1, y_face, z_top, depth, n)`.

**Facades** (`lib.facade`): `walls(b, fp, z0, z1, storeys, look, rng, kind=None, ratio=None, front_kind=None, rear='flat'|'same'|'plain',
ground_kind=None, ground_h=None, plinth=0.35, band=None, bay=None, edges=None)` builds every wall of a footprint; `facade(b, seg, ...)`
one wall. `kind`: `curtain | ribbon | punched | arched | pointed-arch | screen | louvre | none`. LOD0 cuts real openings (reveals, sills,
mullions, recessed glazing); LOD1 (and rear walls at LOD0) inset flat glazing quads; LOD2 plain wall. `parapet(b, fp, z, height, thick)`,
`cornice(b, fp, z, projection, height)`, `seg_box(b, seg, u0, u1, z0, z1, proud, col, slot)` (bands/fins on a wall; `Seg.P(u, z, d)` is
the point u along the wall, z up, d into the building).

**Roofs** (`lib.roof(b, form, fp_or_rect, z, look, rise=None, pitch=28, ov=0.5, **kw)` handles every contract form incl. multi-wing
footprints; round plans get a cone): builders `gable, hip, pyramidal, shed(high=), mansard, stepped(tiers=), barrel, dome(profile=
hemi|shallow|pointed|onion, drum, lantern, finial), multi_dome, tensile, sawtooth, cone, flat_roof(parapet_h, ov, slab), roof_profile`
(generic inset-ring loft) and `roof_shell(b, top_grid, thickness, look)` which skins ANY curved roof you can compute as
`top[i][j]` (rows along +x, columns along +y), with underside and fascia. That is how wave/sweep/vault roofs are made.

**Elements**: `column`, `colonnade`, `portico`, `canopy_flat`, `canopy_curved`, `tower` (square/round/tapered, with cap), `ground`,
`forecourt(kind='parking'|'plaza'|'garden'|'road'|'water')`, `tree(kind='palm'|'broadleaf'|'acacia'|'conifer')`, `blob`, `car`, `lamp`,
`sign_board`.

## Atlas

`atlas/build.py` generates every slot procedurally (tileable FFT noise and patterns; no third-party images, so no licences to record),
packs them in one 2048 x 2048 sheet with 8 px wrapped gutters, writes `trim.webp` (about 450 KB, downloaded once) and `slots.json`.
Slot rectangles are pixel `px: [x, y, w, h]` (y from the top). To add a slot, add a function and a row to `SLOTS` and rebuild.

## Reference archetype: `airport-terminal`

Four typologies chosen from the brief (`form.footprint/roof/width_m/...`, `features`, wording in `subject`/`notes`): `wave` (glass box under
a sweeping, undulating or vaulted curved roof; Abuja, Heathrow T5), `linear` (concrete modernist block with attached control tower and an
optional newer glass wing; Lagos), `pier` (head house + finger pier with bridges on both sides), `regional` (small terminal, hip/gable roof,
squat tower, one turboprop). Control tower variants (round, faceted, square), jet bridges, low-poly airliners, entrance canopies (flat or
curved), forecourt with parking, trees, lamps, apron. Fixtures: `fixtures/airport-briefs.jsonl` (Abuja, Lagos, Heathrow T5) and
`fixtures/airport-variants.jsonl` (pier and regional test fixtures with invented, clearly marked, non-place names).
