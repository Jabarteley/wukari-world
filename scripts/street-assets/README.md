# Street assets: generated models at game size

A repeatable path from a generated street model (one big mesh, four 2048 px textures, 4-9 MB) to a file the game can load: one mesh, one material, one
512 px texture, 100-140 kB. Nothing here is switched on in the game. `assets/` holds the packed results, `page/` the proof page that draws them beside what the
game draws today, and `capture.ts` / `gallery.ts` turn that into pictures, numbers and a gallery.

## Run it

    scripts/street-assets/build.sh <originals-dir> <work-dir> <out-dir> [name ...]     # needs Blender 5.2 and npx gltfpack@1.3.0
    node --experimental-strip-types scripts/street-assets/capture.ts <out-dir> <shots-dir> [--set all]   # headless Chrome, ports 4481-4489
    node --experimental-strip-types scripts/street-assets/gallery.ts <shots-dir> <originals-dir> <work-dir> <out-dir> <gallery-dir>

Typecheck, build and test commands go through the shared heavy-command lock; Blender and browser captures run outside it with their own time limits.
The originals are untrusted data: they are only ever passed as paths, and no script runs from their folder.

## What the pipeline does (`blender/reduce_asset.py`, one config per asset in `configs/`)

1. Weld, split into connected pieces, keep the wanted ones (`keep`), cut a fused ground disc (`cutBelow`) or litter (`deleteBoxes`).
2. Turn so the front faces -Y (glTF +Z, the game's forward), scale one axis to the game's size, origin on the ground at the centre.
3. Optional: replace a broken half by a mirror image of the good half (`mirrorFrom`). The danfo needed it: one side of the generated mesh was folded.
4. Remove faces no ray can leave from (seats, floors, inner walls) so thin shells do not fold when decimated (`hidden`; off for the kiosk, whose awning is a thin shell).
5. Decimate in steps; drop loose shards, and for thin foliage rebuild as one closed surface with a voxel remesh (far versions only get there).
6. Save, reopen, fresh unwrap (an unwrap in the session that decimated shatters into single triangles), bake the base colour from the full mesh to 512 px (256 px far).
   Normal and metal maps are dropped: the renders do not show a loss at street distance.
7. One principled material, plain glTF out, `gltfpack -cc -kn -km` (meshopt compression, named nodes kept).
8. `blender/variants.py` + `swap_texture.py`: colour variants made by recolouring the baked texture inside region masks (hue/saturation/value plus a position bake for the
   danfo's stripe). Same mesh, another 512 px texture. `configs/variants.json` holds the rules.

Units: the danfo and keke keep the model library's street size (4.94 and 3.16 long) so a swap is drop-in; the house is 11 wide (a plot is 12), the kiosk 3.4 high (the figure is 2.45), the trees 7 high.
Wheels: the keke's three wheels are separate pieces in the file and are packed as nodes `wheel_f`, `wheel_rl`, `wheel_rr` (origin on the axle, spin about X). The danfo's wheels are
fused to the body: a cut leaves mudguard fragments that flap when turned, so the danfo stays one mesh. The far versions are always one mesh (one draw call).
Trees keep their foliage as solid shards (no alpha), so the renderer needs nothing new.

## Prompts and settings that would have avoided the cleanup

What had to be cleaned: a patch of ground under the palm; two trees and loose paper under the kiosk; a danfo with one good side and one folded side, with seats and
floor inside the body; a keke front mudguard welded to its wheel; inconsistent facing (the vehicles lie along X and face -X, the house faces +Z);
every model normalised to about 1.9 units whatever its real size.

Wording for every street asset (put it first):

> One single [object]. Isolated on a plain white background, nothing else in the picture. No ground, no base, no shadow, no grass, no road, no surroundings, no
> people, no litter, no extra trees, no text, no logos. Strictly left-right symmetrical. Side view, the front pointing left. Closed solid body: no interior, no seats,
> windows are opaque dark glass. Flat clean colours, no baked lighting, no dirt, no scratches. Simple chunky shapes, game-ready, low detail.

Settings: ask for the final count straight away (3,000 for a vehicle or house, 2,000 for a kiosk, 1,500 for a tree) with triangle topology, texture 1K, no metal or normal
maps (they are thrown away); generate from a reference picture in strict side view when facing matters (text alone gave vehicles that face along X and houses along Z);
generate the preview first and only refine when the silhouette is right; never rely on the prompt for scale (set it in the config).
For wheels: ask for "the body without wheels, wheel arches open" and a separate "single wheel, front view" and add the wheels in the game (worth one test, not yet tried).

## Next twelve street assets (one line each, after the wording above)

1. Okada: a motorbike taxi, small yellow-black bike with a flat rear seat and a footrest, no rider.
2. Saloon car: an older four-door saloon car, boxy, cream paint, rounded roof, small hubcaps, no number plate text.
3. Bus stop: a roadside bus shelter, concrete posts, corrugated metal roof, one long bench, an empty sign pole beside it.
4. Market stall with umbrella: a wooden table stall under a big striped umbrella, three plastic stools, crates of produce, no people.
5. Generator: a petrol generator in a welded steel cage on two skids, red engine, black fuel tank, short exhaust.
6. Street lamp: a tall concrete street lamp post with a curved arm and a rounded lamp head, small solar panel on top.
7. Water tank on a stand: a black plastic water tank on a steel-frame tower with a short ladder and a pipe.
8. Signboard: a large rectangular billboard sign on two metal posts, blank faces so the game can paint text.
9. Wheelbarrow: a steel wheelbarrow, green tray, one wheel, two wooden handles, a little sand in it.
10. Roadside seller's table: a small wooden table with a plastic tray of oranges, a scale and a cloth awning on two sticks.
11. Gutter slab: a flat concrete drain cover section, three slabs side by side with a handle slot each, grey.
12. Fence and gate: a two-metre piece of cement block fence with a painted metal gate in the middle, two pillars with round caps.

## Round two: straight walls

Round one shrank a lumpy generated mesh by edge collapse, and the walls wobbled. Round two keeps the pipeline for organic things (trees) and changes the method elsewhere.

- Buildings, kiosk, market stall: **clean shells** (`blender/shells.py`, `build_shells.sh`). Walls, roof planes, window and door pieces, veranda, balconies and parapets are
  built by script as exact flat geometry (110-680 triangles, one draw call) with one texture atlas: a generated picture of a window and a door, plus drawn plaster, roofing, stripes and planks.
  Wall colours and awning colours are variants of the atlas only. `assets/footprints.json` records each building's footprint in game units and its door (x, z toward the street, facing +z).
- Vehicles: generated again from a clean side-view concept picture, which came out nearly low-poly already (about 3,000 triangles), so only a plain reduction is needed. Limited dissolve
  was tried first and broke the bake, so it is off for them (`configs/danfo2.json`, `keke2.json`); `build_vehicles2.sh`. Only the keke's rear wheels are separate pieces.
- The route comparison for the house (clean concept then gentle reduction, clean shell, shell plus props) is in the round-two gallery; the shell won on straightness and size.
- `capture2.ts` and `gallery2.ts` produce round two's pictures: four corners of every asset, side by side with today's props, the busy street at day, dusk and night.

What worked in the prompts: "single [object], plain flat light-grey background, nothing else, clean low-poly stylised game asset, simple bold shapes, flat colour planes, straight edges"
for the concept picture (look at it before spending on the 3D step); for a building, "exact side view" or "three-quarter front view" with named parts; for flat texture pictures, "flat orthographic
front view of a single window ... fills the picture, no perspective".

## Round three: the first street set

Files in `assets/` (157 `.glb`, each under 140 kB, the whole folder about 11 MB); descriptions in `assets/footprints.json` (buildings and props: footprint, door, sign boards, named empties),
`assets/shop-interior.json` (the shop room and its twelve slots) and `assets/vehicles.json` (sizes, wheel nodes, seat and light anchors).

- Buildings and props: `blender/set_build.py` on the shared atlas `blender/setlib.py` (`build_set.sh`). Clean scripted geometry, one draw call except where a sign board or a traffic lamp is its own node.
  Generated pictures supply the window, door, roller shutter, church and mosque windows; everything else on the atlas is drawn. `blender/crop_set.py` crops the generated pictures to the tiles.
- Shop interior: `blender/shop.py`, three themes, each with a generated back-wall picture (fashion, food, electronics).
- Vehicles: danfo, keke, okada and bus are generated from clean side-view pictures; the generated wheels are cut out and replaced by clean cylinder wheels (one node per wheel, origin on the axle,
  turn about X) by `blender/vehicle.py` (`build_vehicles3.sh`). Saloon (four colours), SUV, pickup and van are clean profile builds (`blender/car_shell.py`, `build_cars.sh`) because the generator account ran
  out of credits before they could be converted; their pictures were checked and the same wheel scheme is used. Anchors: `seat_driver`, `seat_1..`, `light_head_l/r/c`, `light_tail_l/r/c`.

### Instancing note

All buildings and props of one palette and level of detail carry the same 1024 px atlas image (512 px for far versions), pixel for pixel: `atlas-cream-near.jpg`, `atlas-mint-near.jpg`, `atlas-sky-near.jpg` and the three far ones.
The game can therefore keep one texture and one material per palette and merge or instance many different buildings and props into one draw call (a mesh merged per street row, or an instanced mesh per model).
The colour variants (cream, mint, sky; the kiosk and stall teal, red, blue) differ only in that atlas. The generated vehicles each have their own 512 px texture (256 far); the clean cars share nothing but are 256 px flat colours,
so the four saloon colours are four tiny textures. Sign boards (`sign_n`), the billboard face and the traffic lamps are separate nodes with their own materials: the game paints them. Spin the wheel nodes about X only.
