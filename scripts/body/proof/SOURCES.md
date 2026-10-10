# Sources of the Blender-made character

What the second character proof (`blender/`, `assemble.ts`, `page2/`) is built from, under what licence, and how to rebuild it. Same style as `docs/ASSETS.md`. Everything the build uses is CC0 or written for this project (AGPL-3.0-or-later like the rest of the repository). Downloaded files are kept outside the repository; only the generated, small game-ready outputs and the scripts are committed.

## Used

| What | Author | Where (checked 2026-10-10) | Licence | Used for |
| --- | --- | --- | --- | --- |
| MakeHuman base mesh `base.obj` and its target files (body, face, expression units) | MakeHuman community | Inside the MPFB add-on zip, `data/3dobjs/base.obj`, `data/targets/` | CC0 1.0: the file header reads "This asset was explicitly released as CC0 in september 2020." and the licence page http://static.makehumancommunity.org/about/license.html says "All core assets are shared under Creative Commons, CC0." | The body, the face shapes (blink, brows, smile, mouth, visemes), proportions |
| MakeHuman system assets pack `makehuman_system_assets_cc0.zip` (eyelashes, eyebrows, teeth, tongue, hair, shoes, skins, eyes) | MakeHuman community | https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip, page http://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html | CC0 (the page lists every asset as "CC0"; each file header carries the CC0 statement above) | Lashes, brows, teeth, tongue, shoes, the low-cut hair (`short01`), brow and lash textures |
| MPFB 2.0.18 (Blender add-on, only used to read the data above and fit assets) | Joel Palmius and contributors | https://extensions.blender.org/add-ons/mpfb/ | GPL-3.0-or-later (the add-on's own code; it is a build tool and none of its code is shipped) | Builds the base mesh, applies targets, fits the rig and assets |
| Universal Base Characters skeleton and Universal Animation Library clips | Quaternius | See `docs/ASSETS.md` | CC0 1.0 | The 23-bone skeleton and its rest rotations, the clip pack the character plays |
| Eye texture, ankara and hair textures | This project | `blender/make_eye_texture.py`, `build.ts` | Own work | Eyes, prints, hair |

MPFB is installed through Blender's own Python API (`bpy.ops.extensions.package_install_files`) into Blender's user add-on folder, and the asset pack is unzipped into MPFB's user data folder (`extensions/.user/user_default/mpfb/data`). Nothing else was installed.

## Found, not used (the owner decides)

| What | Where | Licence as stated on its page | Why it is not used |
| --- | --- | --- | --- |
| Poly Haven models, textures and HDRIs | https://polyhaven.com/license | "Our assets are all licensed as CC0" | CC0 and usable. Not needed yet (no HDRI used; the page lights with a three-light rig and a small room environment). A candidate for fabric and skin detail later. |
| ambientCG materials | https://docs.ambientcg.com/license/ | "All ambientCG assets are provided under the Creative Commons CC0 1.0 Universal License." | CC0 and usable. Not needed yet; candidate for fabric weave and skin pores. |
| Kenney asset packs | https://kenney.nl/support | "all game assets on the asset pages are public domain licensed (CC0)" | CC0. Nothing humanoid of the needed quality. |
| Blender Foundation Human Base Meshes v1.4.1 | https://www.blender.org/download/demo-files/ | Listed as "CC0" | CC0 and usable. Not needed: the MakeHuman base mesh already gives a fully weighted, UV-mapped, face-targeted body. |
| Quaternius Universal Base Characters Standard | https://quaternius.itch.io/universal-base-characters | Creative Commons Zero v1.0 Universal | In the game already (Superhero bodies only in the free version; the stylised proportions and muscular build were the problem). |

Not searched to the end (no account-free, licence-verified CC0 hits within the time box): Sketchfab and Blend Swap models for braids, afro, gele, kaftan, agbada and ankara dresses; OpenGameArt. Anything found there that is CC-BY or similar needs the owner's separate decision and is not used.

## Rebuilding

Blender 5.2 with MPFB 2.0.18 and the CC0 asset pack installed as above. Every script takes its inputs and outputs as arguments.

```
node --experimental-strip-types scripts/body/proof/export-base.ts female <work>/base-female.glb
blender --background --python scripts/body/proof/blender/dump_skeleton.py -- <work>/base-female.glb scripts/body/proof/blender/skeleton-female.json
AW_PARTS="shoes:shoes04" blender --background --disable-autoexec --python scripts/body/proof/blender/build_body.py -- female scripts/body/proof/blender/skeleton-female.json <work>/female-1.blend
blender ... face_keys.py -- <work>/female-1.blend <work>/female-2.blend
blender ... bake_skin.py -- <work>/female-2.blend <work>/female-3.blend
blender ... export_gltf.py -- <work>/female-3.blend <work>/female-parts.glb <work>/female-joints.json
node ... assemble.ts <work>/female-parts.glb <work>/female-joints.json female <work>/female-final.glb
npx gltfpack@1.3.0 -i <work>/female-final.glb -o char-female.glb -cc -kn -km -kv -vtf
```

Hair: `build_hair.py -- <work>/female-2.blend braids|afro <out.glb>`; shoes and the low-cut: `build_part.py`; garments: `build-garment.ts <work>/female-final.glb female dress <out.glb>`; the crowd versions add `--lod` and gltfpack `-si`. `shots.ts` drives the proof page (`evidence-shots.json` is the shot list).

## Third build (`rebuild.sh`, `page3/`, `assets3/`)

No new third-party assets. The face recipe, the shape keys, the face atlas (eye, brow and lash shapes; the brow and lash shapes are the CC0 MakeHuman images thickened), the hair (braids, afro, gele), the jewellery and the crowd face decal are written for this project. The shoes (`shoes06`, `shoes02`, cut down to the ankle) and the man's low-cut (`short01`) are CC0 MakeHuman system assets as above. One command rebuilds a character: `scripts/body/proof/rebuild.sh <work-dir> <out-dir> <female|male> [stage ...]`; shots: `shots.ts evidence-shots3.json <out> --assets <abs path to assets3>`.
