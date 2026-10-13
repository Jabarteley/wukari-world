# Allworld cloud production plan

Prepared 13 October 2026. This is a proposed production and ownership plan, not a report that 20 workers are running.

## Recommendation

Build one convincing, playable Lagos city block and one expressive, fully customisable human before scaling production. Run character development, reusable environment assets, and geographic placement in parallel against shared contracts. Preserve the existing Blender pipeline as the background and mobile asset tier; add a higher-detail PBR tier for people and places seen up close.

The reported baseline is 330 generated bases and 310 validated bases, with GLB and Blender source files, an existing pinned Allworld importer, and a Three.js game. Those counts are inherited project context, not independently revalidated here. File validation is valuable, but does not establish realistic materials, anatomy, geographic fidelity, animation quality, or performance in the game.

The current workspace supports seven concurrent agents in total. Twenty lanes below are a backlog and ownership structure. They can be scheduled in waves; 20 or 100 simultaneously running threads require separately verified infrastructure, access and budgets. A saved joinallworld cloud environment is now confirmed for kromate/joinallworld on main, and a real cloud coordinator has been created; its setup checks are pending. This document does not claim that 20 implementation workers have started. It uses no Mac, creates no accounts and makes no purchases. Coordinator task ID: 01a13657-d308-749e-ada7-18b498dfd027. Environment onboarding task ID: 01a13655-7e6a-7467-bf76-69cb8474d059.

## What the visual references establish

Both supplied screenshots were opened and visually inspected. The first shows a Google Maps street map of Lagos mainland, including Yaba, the University of Lagos area, the lagoon and Third Mainland Bridge. The second shows a street-level user-contributed video on Google Maps at a place labelled Mulligan Hotel: people, parked vehicles, yellow minibuses, street surfaces, mid-rise buildings and vegetation.

Together they suggest two distinct requirements: correct large-scale geography and convincing street-level life. They do not establish photorealistic 3D coverage for Lagos, current building dimensions, or rights to extract geometry or textures. The visible person should not be reconstructed as a character. Use fictional identities and licensed reference material. The screenshots are not included in this deliverable or uploaded elsewhere.

## Scope of the first playable slice

Choose one approximately 200 by 200 metre Lagos-area block after checking lawful source coverage. Yaba is a sensible candidate suggested by the references, not a confirmed location decision. Include connected roads and sidewalks, 10 to 20 building exteriors, one recognisable independently documented landmark if rights permit, 15 to 25 reusable prop types, locally appropriate vegetation, parked and moving vehicles, and simple pedestrian activity.

Deliver one complete human system with at least six deliberately different fictional presets, not six unrelated meshes. Show independent ear, nose, face and body controls; expressions; hair and clothing swaps; locomotion; and save/reload. Include close-up portrait, full-body and street-level views in the actual game. A beautiful Blender render alone does not pass.

Define accuracy honestly:

- **Measured:** independently sourced coordinates, footprints or heights with a known date and accuracy statement
- **Estimated:** inferred height, road width or façade structure, with the method and confidence recorded
- **Authored:** invented detail used to fill gaps, clearly separated from surveyed facts

No claim of an exact city replica passes without measured evidence. Open footprints do not supply authentic façades, interiors, door positions or street-level textures. Missing information must remain explicit.

## Twenty lane ownership matrix

Each lane has one accountable owner. Names are roles to assign once execution is available. Proposed package paths are contracts for future work, not changes already made to the repository. Lane 01 alone merges shared runtime and importer changes. Lane 19 owns release acceptance, while content owners own fixes.

| Lane | Owner and exclusive package | Concrete first output | Dependencies | Acceptance test |
|---|---|---|---|---|
| 01 | Integration lead; shared contracts and integration branch | Baseline commit and importer pin, schema v1, golden asset, merge queue | Existing project access | Current golden scene imports unchanged; incompatible packages rejected with actionable errors |
| 02 | Source and rights lead; source registry | Pilot source inventory, rights records, accuracy labels and credits | Candidate block | Every source has origin, date, permitted uses and licence; no unlicensed geometry or textures admitted |
| 03 | Geospatial lead; geographic transforms | WGS84 to local-coordinate transform, block bounds, height datum and test fixtures | 01, 02 | Coordinate round-trip within 1 cm numerically; independent control-point errors reported separately |
| 04 | Human foundation lead; body topology | Shared adult base topology, UVs, proportions and anatomical landmarks | 01 | Clean mesh, reproducible export, valid skinning; shoulder, elbow, knee and hip silhouette reviewed in motion |
| 05 | Facial anatomy lead; face morph set | Ears, nose, jaw, cheek, brow, eye and mouth controls on shared topology | 04 contract | Neutral, each endpoint and pairwise extreme combinations show no broken seams or unintended coupled controls |
| 06 | Body customisation lead; proportion morph set | Height, torso, shoulder, waist, hip, limb and hand/foot controls | 04 contract | Inclusive preset matrix fits rig and clothing; no NaNs, collapsed limbs or invalid scale |
| 07 | Rig and animation lead; rig and clips | Skeleton, bind pose, locomotion, idle, turn, sit and expressive facial poses | 04; 05/06 for final tests | No root drift or foot skating on test paths; deformation passes at body-control extremes |
| 08 | Skin and eyes lead; human materials | Skin tone range, roughness and normal detail, eyes, teeth and nails | 04 UV contract | PBR maps load in game; skin tone remains plausible under neutral/day/night lighting; no baked directional shadows |
| 09 | Hair lead; hair packages | At least three hair types, including tightly curled hair, with scalp/brow options | 04, 07 anchors | No scalp gaps in standard views; hairstyle fits head morph matrix; shadow and alpha overdraw budgets pass |
| 10 | Clothing lead; garments and fit data | Two outfits, footwear and accessories with body-fit deltas and hide masks | 04, 06, 07 | Walk, sit and extreme-body tests produce no visible body penetration at agreed views |
| 11 | Character experience lead; editor and presets | Accessible controls, labelled ranges, randomisation constraints, versioned save/load | 01; mock 05–10 contracts first | Preset reload reproduces appearance; unsupported values clamp; all requested features are independently editable |
| 12 | Terrain lead; terrain tiles | Pilot terrain, coastline/water edge where relevant, height metadata | 02, 03 | No cracks across tile boundaries; roads and buildings align to defined height reference |
| 13 | Streets lead; road and sidewalk tiles | Connected roads, sidewalks, crossings, curbs and transit-stop metadata | 02, 03, 12 interface | Walk/drive routes connect; no impossible slopes; crossings and widths tagged measured or estimated |
| 14 | Buildings lead; building tiles | Footprint-based shells, roofs, façades, pilot landmark and one authored enterable interior | 02, 03; 12 heights | Footprints match permitted source within stated tolerance; no floating foundations; authored façades labelled |
| 15 | Street asset lead; props and vehicle models | Upgrade selected existing props, street furniture and fictional/unbranded vehicles | 01, 02 | Correct scale, pivot, PBR tier, collision proxy and LODs; no trademark or source-rights gaps |
| 16 | Vegetation lead; planting assets | Appropriate trees, shrubs, ground cover and wind presets | 01, 02 | Species/style review, bounded transparency cost, stable distant silhouettes and no road encroachment |
| 17 | Placement lead; scene manifests | Deterministic placements, density/exclusion rules, overrides and provenance | 03; placeholder assets allow early work | Same seed and inputs give same manifest; no duplicate IDs or road/door obstruction; manual edits survive rebuild |
| 18 | World behaviour lead; navigation and activity | Independent collision, pedestrian/vehicle paths and small activity demo | 07, 12–17 | Avatar walks complete block and opens a test door; vehicles follow valid lanes; no navigation derived from restricted imagery or tiles |
| 19 | Quality and performance lead; test harness | Automated validators, game captures, benchmark route, defect report | 01; consumes all packages | Release gate below passes on named devices; no missing credits, import failures or major visual defects |
| 20 | Production operations lead; builds and distribution | Isolated builds, runtime streaming adapter, immutable artifacts, cost dashboard and rollback | 01; cloud setup | Rebuild from pinned inputs; clean-machine load; failed job cannot overwrite a released package |

## Dependency order and parallel scheduling

1. **Establish contracts:** 01, 02, 03 and 19 define the baseline, permitted data, coordinates and acceptance scene. 04 can explore anatomy independently, but must wait for agreed export contracts before publishing. 20 prepares the cloud execution specification without acquiring services.
2. **Build independent foundations:** 04 supplies the human topology interface. 12, 13 and 14 build geographic foundations. 15 and 16 produce reusable assets. 17 writes placement against placeholders. 11 builds its editor against fixture presets. These tasks do not need final art to proceed.
3. **Develop detail in parallel:** 05, 06, 07, 08, 09 and 10 consume the fixed human contracts. Rigging and topology exchange a versioned early prototype; topology changes after freeze require a migration. World assets and placement continue concurrently.
4. **Integrate the slice:** 17 replaces placeholders by stable IDs; 18 adds independent physics and activity; 11 consumes approved character packages; 01 merges through the importer. 19 benchmarks the complete game rather than individual files.
5. **Scale accepted recipes:** 20 batches only packages whose first example passed. Geographic expansion and extra character content begin after the slice gate, using the same quality checks.

With seven total slots, allow one coordinator, one integrator/quality slot and up to five independent production tasks, subject to other existing work and the platform's actual capacity. Reserve capacity for the ongoing original pipeline; do not cancel or silently restart it. A queue should select dependency-ready jobs, not insist that lane numbers run consecutively. Twenty lanes need not mean twenty simultaneous CPU/GPU jobs.

For future 20–100-worker execution, keep one owner per shared contract and scale by independent units: geographic tiles, individual asset families, clothing items, hairstyles, test fixtures or licensed source regions. Workers write isolated branches/worktrees and immutable artifact prefixes. Increasing model-agent count alone does not provide render GPUs, disk throughput, API quotas, review capacity or faster integration.

## Character integration contract

Use one versioned topology and skeleton family for the initial adult human system. Anatomical variation comes from controlled shapes and rig adjustments. Keep future incompatible body families explicit rather than forcing them into one mesh. Do not obtain realism by copying the person visible in the reference screenshot or harvesting real people’s identities.

Required package fields:

- Stable asset ID, semantic version, content hash, author/source rights, topology version, skeleton version and exporter/importer compatibility
- GLB for runtime, editable Blender source, materials/textures, morph registry, rig metadata, fitting masks and thumbnail/contact-sheet evidence
- Metres; declared right-handed axes and forward direction; exporter conversion tested against the existing importer rather than replacing its convention by guesswork
- Morph names, default/minimum/maximum, units, symmetry option, dependency constraints and corrective-shape rules
- Named attachment points for headwear, ears/accessories, hands, feet and clothing; shared seam positions, normals and UV boundaries where body parts are modular
- Animation naming, root-motion/in-place designation, loop duration and event semantics

Initial controls cover ear size/projection/lobe, nose width/bridge/tip, jaw/chin, cheeks, brows, eye spacing and lids, lip form, head proportions, height, limb proportions, torso, shoulders, waist and hips. Avoid ethnicity-labelled sliders and avoid coupling skin tone to facial shape. Preserve the user's choices when clothing or hair changes.

Expressions include blink, eye direction, jaw open, smile, frown, brow raise/lower and basic speech shapes. Test asymmetry and combinations. Separate identity shapes from expression shapes; an identity control must not erase an expression. Skin requires a plausible range of tones and surface detail, including dark skin under all lighting presets. Hair and clothing require fitting deltas or deformation rules, not a promise that one static mesh fits every body.

## World integration contract

Use WGS84 longitude/latitude for source records, a declared vertical datum for heights, and a local metric frame for gameplay. Store the origin and transform explicitly. A useful Three.js convention is local east as +X, up as +Y and north as −Z; adopt it only through the importer adapter and golden tests. Never apply an axis swap independently in every asset lane.

A world-tile manifest records: schema version; region/tile ID; geographic bounds; origin and datum; source release; measured/estimated/authored tags; asset IDs and hashes; transforms; deterministic seed; collision/navigation references; LOD policy; and attribution identifiers. Do not embed private keys or licensed service responses in manifests.

A placement records stable instance ID, source feature ID where allowed, asset version, position/quaternion/scale, placement rule, confidence and any manual override. Placement accepts an asset registry by ID, so a detailed tree or vehicle can replace a placeholder without rebuilding the street network. Tile border ownership prevents duplicate buildings/trees; halo data may be read for continuity but only the tile owning an object's anchor publishes it.

Unknown building heights remain null or estimated with an explicit method. Real businesses, logos and private interiors are not automatically part of the reusable set. A mapped footprint is not permission to reproduce a commercial artwork, branded façade or identifiable person.

## Two quality tiers and initial performance budgets

These are proposed starting budgets to benchmark, not measured capability or guarantees. Lane 19 should revise them with recorded evidence on named target hardware.

| Concern | Detailed nearby tier | Background and mobile tier |
|---|---|---|
| Characters | Approximately 40–80k visible triangles per hero, full face controls, selected 2k PBR textures | Approximately 5–15k triangles, reduced bones/morphs and 512–1k textures; more aggressive crowd LOD |
| Buildings and props | Modular PBR surfaces, silhouette geometry, believable scale and contact detail | Existing low-poly/vertex-colour assets where appropriate; simplified geometry, atlas or colour materials |
| Hair | Cards or meshes selected after shadow/overdraw testing; detailed hero silhouette | Simplified clumps/cards; reduced transparency and draw calls |
| Streaming | Near/mid/far LODs and view-dependent requests | Smaller resident set and earlier LOD switches |
| Scene target | 60 fps desktop at 1080p; p95 frame time at most 20 ms | 30 fps on a named midrange mobile device; p95 at most 40 ms |
| Working caps | Start around 2 million visible triangles and 500 draw calls | Start around 500k visible triangles and 200 draw calls |

Avoid drawing every facial morph, high-resolution texture and dynamic shadow on every distant NPC. Use material atlases, instancing and compressed textures only when the pinned importer supports them. Preserve editable master assets; derive all LODs reproducibly. A PBR label alone does not mean photorealistic: use neutral-light comparisons and artist/user review.

## Lawful data choices

### Google live visualisation

Google's Map Tiles policies permit geospatial visualisations and independently created object overlays. They prohibit extraction/non-visualisation processing and offline use, and explicitly reject overlays traced or derived from the tiles. Required Google and provider credits must remain visible. Therefore, use a Google-backed mode only as licensed live visualisation after confirming the intended application and applicable agreement. It is not an export route into the reusable Blender/GLB library. Do not derive collision, navigation, façades or textures from those tiles. See [Map Tiles policies](https://developers.google.com/maps/documentation/tile/policies).

Google's general terms also restrict scraping, caching outside permitted exceptions, and creating content from Maps content. Applicable terms depend partly on billing region, including separate EEA terms. Before enabling a mode in the commercial game, review the actual account agreement, product-specific terms, target audience and intended overlays with qualified counsel or provider support; this plan is technical guidance, not legal clearance. See [Google Maps Platform terms](https://cloud.google.com/maps-platform/terms) and [service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms).

Lagos Photorealistic 3D Tiles coverage has not been verified. A Google street photo/video and the ordinary map screenshot prove neither coverage nor reusable-data rights. Do not commit to that visualisation option until an authorised live coverage test succeeds.

### OpenStreetMap and Overture

OSM provides reusable geographic data under ODbL with attribution and share-alike obligations for applicable derivative databases. Keep source-derived geographic databases separable from independently authored art, and review whether the delivered world dataset is a derivative database or produced work; open data does not automatically require all game code to be open source. See [OSM copyright and licence](https://www.openstreetmap.org/copyright).

Overture buildings are useful footprints and available height/part information, not a global photorealistic mesh. Their documentation supports extrusion-based 3D visualisation and identifies the buildings theme as ODbL. Use version-pinned releases and record missing attributes. See [Overture buildings](https://docs.overturemaps.org/guides/buildings/).

Overture licensing varies by theme and upstream source. Buildings, transportation, base and divisions include ODbL data; places include permissive and Apache-licensed sources; addresses carry source-specific terms. Preserve upstream notices and assess joins rather than applying one blanket licence. See [Overture attribution and licensing](https://docs.overturemaps.org/attribution/).

Download permitted vector extracts or use a licensed host. OSM's donation-funded public raster tile service prohibits bulk/offline fetching and offers no SLA; it should not be the asset-production backend. See [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) and [OSM data API policy](https://operations.osmfoundation.org/policies/api/).

### Cesium and additional sources

CesiumJS is an Apache-2.0 renderer available for commercial use; that licence does not relicense Cesium ion data, Google content or other third-party datasets. Cesium can be evaluated as a separate geospatial viewer or adapter, but do not replace the existing Three.js game without a measured integration need. See [CesiumJS](https://cesium.com/platform/cesiumjs/).

For US expansion, USGS 3DEP elevation is a useful public-domain source; it is not a Lagos elevation source. See [USGS elevation specifications](https://pubs.usgs.gov/tm/11b9/tm11B9.pdf). Elsewhere, assess national/municipal open-data portals and source-specific licences. For example, the Netherlands provides 3D collections through [PDOK](https://www.pdok.nl/ogc-apis/-/article/3d-basisvoorziening-1); verify the selected collection's licence before importing.

For Lagos close-up authenticity, prioritise independently commissioned, permissioned photography/survey or a supplier whose written licence permits mesh creation, texture derivation, commercial game use and redistribution inside the game. Check people, vehicle plates, building/art rights and capture permissions. No such licence or purchase is secured by this plan. Generic original façades remain an acceptable labelled approximation when measured detail is unavailable.

## Costs and guardrails

Pricing was checked on 13 October 2026 and must be rechecked before purchase or launch. No spending has been approved here.

- **Google direct:** the published global Photorealistic 3D Tiles price lists 1,000 free monthly events and $6 per 1,000 in the first paid tier. An illustrative 10,000 billable events would be $54 before tax, other APIs and contract differences. Do not equate every downloaded child tile with a billable event without validating the product's billing semantics. Instrument actual usage. Sources: [global price list](https://developers.google.com/maps/billing-and-pricing/pricing) and [usage and billing](https://developers.google.com/maps/documentation/tile/usage-and-billing).
- **Cesium ion:** listed Commercial pricing is $149/month individual or $524/month team; Premium is $499/$874. Commercial lists 100 GB storage, 150 GB/month streaming and 5,000 Google root tiles/month. Community is for personal/non-commercial use and evaluation, not assumed production commercial entitlement. Included data quotas and provider rights still apply. Source: [Cesium pricing](https://cesium.com/platform/cesium-ion/pricing/).
- **Open-data build:** dataset licence cost may be zero, but compute, storage, egress, imagery rights and human review are not. Budget as CPU-hours × rate + GPU-hours × rate + GB-month storage + GB egress + service requests + licensed content.

Require a provider quote and approved monthly ceiling before scaling. As an initial planning proposal, cap a small prototype's incremental cloud allowance at $200/month only if the user approves the provider and commitment; this is a suggested ceiling, not a cost forecast. Do not imply 100 workers fit within it. Add daily limits, per-job runtime/output limits, anomaly alerts and an application-side stop switch. Billing alerts alone are not a hard spending cap. Do not silently switch from free sources to paid services.

## Shared source and release safeguards

1. Capture the existing repository revision, importer hash, Blender/exporter versions and golden-scene outputs before new work. Do not overwrite the original pipeline or move its outputs under new ownership.
2. One branch/worktree or isolated job directory per lane. Only the integration owner changes shared schemas, lockfiles, importer adapters, top-level asset registries or game entry points.
3. Store immutable packages under asset ID/version/hash. Never have multiple writers publish `latest.glb`. Promotion updates a small reviewed manifest atomically.
4. Model files carry provenance and tests, not only thumbnails. Reject packages without source rights, unit/axis declaration, valid bounds, finite vertices, supported materials and import evidence.
5. Prevent restricted-provider contamination: runtime-service content never enters source-art, derived collision or reusable world-data buckets. CI scans manifests and requires a rights record for every external input.
6. Validate schema and visual output before merge. Run clean import, animation, representative extreme morphs, fixture placement and benchmark-route tests. Record failures against the owning lane.
7. Changes to topology, rig, coordinate frame or IDs require a version increment and migration plan. No silent re-export that breaks saved characters or placements.
8. Preserve a last-known-good game build and manifests. A failed tile or asset should fall back to a valid lower tier rather than break the entire scene.
9. Secrets stay in approved secret storage. Account creation, credentials, access expansion, paid content and commercial service commitments require the appropriate user approvals.

## Slice acceptance and scale gate

The first slice is accepted only when all of the following are demonstrated:

- **Realism:** in-game portrait and full-body views show coherent anatomy, natural eyes/skin/hair and expressive motion. Street-level views have believable materials, scale, lighting and placement. User review approves the direction.
- **Customisation:** every promised control works, six diverse presets save/reload, and a repeatable extreme-combination suite passes with clothing and hair. No recreation of an identifiable reference person.
- **Geography:** at least 20 independently sourced control points are compared; report horizontal and vertical errors, source dates and outliers. An initial target is median horizontal error at most 2 m and 95th percentile at most 5 m where source quality supports it. Otherwise label the block approximate; do not manufacture accuracy.
- **Gameplay:** the avatar walks the whole connected block, camera and collisions behave, and simple pedestrians/vehicles run without clipping through buildings. A renderer-only flyover does not pass.
- **Performance:** test a recorded route on named desktop and mobile devices, including cold load and LOD changes. Report p50/p95 frame times, memory, transferred bytes and draw calls. Proposed first-load target: an interactive coarse scene within 10 seconds on a controlled 20 Mbps connection; no assumption that the complete high-detail slice arrives in that interval.
- **Rights and repeatability:** every external source has a rights record and credits; released source-derived databases have required notices/offers; the build reproduces from pinned inputs; rollback and degraded-network behaviour work.

After acceptance, expand to a district, then additional locations, and increase workers only while review/merge throughput, quality and spending remain within agreed limits. Track accepted in-game assets and verified playable area, not raw generation counts.

## Decisions needed before execution

1. Complete the new joinallworld cloud coordinator setup checks and verify repository access plus original importer/pipeline references
2. Confirm the first Lagos block, the target desktop/mobile devices, and whether geographic approximation is acceptable where data is missing
3. Choose reusable open/licensed world data as the core; decide separately whether a live Google visualisation mode is worth its terms and running costs
4. Approve any provider, budget, licence or paid capture work before commitment
5. Approve the vertical slice's visual quality before launching large-scale content generation

The next meaningful result is a tested customisable human walking through one well-grounded block. The 20-lane structure is designed to get that result safely while keeping characters, world assets and placement moving together.

## Copy ready lane launch prompts

These prompts are execution specifications. First launch a read-only repository assessment in each available slot. Implementation starts only after the coordinator confirms setup, pins the shared contracts and approves each lane's exclusive file scope. The proposed branch and directory names are new ownership boundaries; if repository conventions differ, the coordinator assigns replacements before writes. A lane may read approved shared inputs but cannot edit them. Download this plan from Library into the selected cloud task; local paths in another task are not shared automatically.

### Lane 01 integration

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-01-integration`. Your exclusive proposed output directory is `production/lanes/01-integration/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Freeze the actual repository baseline, pinned Allworld importer, axes, units, GLB feature support and golden scene. Publish schema v1, ownership map and merge queue. Own shared integration only after identifying actual paths; all other owners submit patches.

Deliver: Importer, schema, registry and entry-point paths must be discovered and explicitly locked before edits.

Acceptance: An unchanged golden scene imports; invalid packages fail clearly; record the actual revision and supported material/morph/rig features.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 02 sources

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-02-sources`. Your exclusive proposed output directory is `production/lanes/02-sources/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Inventory lawful sources for a Lagos pilot block. Record licence, attribution, allowed derivations, capture date, accuracy and coverage. Separate Google runtime-only content from reusable open/licensed data.

Deliver: A source registry, source-by-source rights checklist and unresolved data gaps.

Acceptance: Every admitted input has a traceable permission basis. Do not purchase, accept new terms, download restricted content or derive assets from Google imagery.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 03 geospatial

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-03-geospatial`. Your exclusive proposed output directory is `production/lanes/03-geospatial/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Define coordinate transforms from WGS84 into a local metric Three.js frame using the actual importer convention. Specify vertical datum, tile edges, stable IDs and fixtures.

Deliver: Transform module and independent numerical fixtures; no edits to other lane code.

Acceptance: Round-trip numerical error at most 1 cm; report real-world source error separately. Verify east/north/up and a 1 m cube in the golden scene.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 04 human base

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-04-human_base`. Your exclusive proposed output directory is `production/lanes/04-human_base/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Design a realistic fictional adult human foundation with consistent anatomy, shared topology, UVs and named landmarks, ready for body/face morphs and a common rig.

Deliver: One editable Blender master, runtime GLB prototype, topology registry and six proposed diverse presets.

Acceptance: Check silhouette and topology at shoulders, elbows, hips and knees. Do not recreate the person shown in the user reference or obtain real-person identity data.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 05 face morphs

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-05-face_morphs`. Your exclusive proposed output directory is `production/lanes/05-face_morphs/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Build independent ears, nose, jaw, cheeks, brows, eyes and lips controls on lane 04 topology. Agree interface names before authoring.

Deliver: Versioned morph registry, identity deltas and test presets.

Acceptance: Render every endpoint and pairwise extremes; no torn seams, NaNs or accidental coupling. Identity changes retain lane 07 expressions.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 06 body morphs

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-06-body_morphs`. Your exclusive proposed output directory is `production/lanes/06-body_morphs/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Build inclusive height, torso, shoulder, waist, hip, limb and hand/foot controls on lane 04 topology. Supply corrective rig and garment-fitting data.

Deliver: Morph deltas, constrained ranges and full-body preset matrix.

Acceptance: Run extreme proportions with rig and clothes; reject collapsed limbs, inconsistent units and controls that silently erase other choices.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 07 rig expression

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-07-rig_expression`. Your exclusive proposed output directory is `production/lanes/07-rig_expression/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Own skeleton, skinning, locomotion and facial expression clips. Separate identity morphs from blink, eye direction, jaw, smile, frown, brows and basic speech shapes.

Deliver: Versioned rig contract, bind pose, idle/walk/turn/sit clips and expression-combination fixtures.

Acceptance: Test extreme bodies and faces. Check feet, joint deformation, root motion, blend transitions and expression preservation; supply in-game evidence through integration.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 08 skin eyes

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-08-skin_eyes`. Your exclusive proposed output directory is `production/lanes/08-skin_eyes/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Create realistic skin/eye/teeth/nail PBR materials on the approved UV contract, with a varied skin-tone range and independent roughness/detail controls.

Deliver: Licensed or original texture sources, neutral lighting fixtures and runtime material package.

Acceptance: Review dark and light skin under neutral, daylight and night scenes. No directional lighting baked into base colour; runtime textures and colour space must match importer support.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 09 hair

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-09-hair`. Your exclusive proposed output directory is `production/lanes/09-hair/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Create at least three distinctly shaped hair options including tightly curled hair, plus compatible scalp, brows and head-fitting rules.

Deliver: Editable masters, runtime LOD packages and attachment/morph-fitting metadata.

Acceptance: No scalp gaps, head penetration or excessive alpha overdraw in standard views; test facial and head-shape extremes and shadow modes.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 10 wardrobe

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-10-wardrobe`. Your exclusive proposed output directory is `production/lanes/10-wardrobe/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Create two outfits, shoes and accessories with garment-fit deltas, skin hiding masks and head/body attachment rules.

Deliver: Original/licensed clothing masters, GLBs, fit tables and LODs.

Acceptance: Walk and sit at each extreme body preset without visible penetration in the acceptance views; do not assume one static garment fits every shape.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 11 character editor

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-11-character_editor`. Your exclusive proposed output directory is `production/lanes/11-character_editor/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Implement an isolated customisation editor component against fixture contracts first; consume approved morph/hair/clothes packages later.

Deliver: Labelled accessible controls, constrained randomisation, six presets, versioned save/load and migrations.

Acceptance: Save/reload reproduces appearance; invalid values clamp; ears/nose/body can change independently. Export a component for integration rather than editing the shared game entry point.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 12 terrain

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-12-terrain`. Your exclusive proposed output directory is `production/lanes/12-terrain/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Build reusable terrain for the permitted pilot bounds using approved source data, declared elevation datum and seam-safe tiling.

Deliver: Terrain tile package, source confidence, water edge where relevant and collision-ready separate geometry.

Acceptance: No tile cracks or datum mismatch. Do not use Google tile geometry or imagery to create terrain, collision or textures.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 13 roads transit

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-13-roads_transit`. Your exclusive proposed output directory is `production/lanes/13-roads_transit/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Build road, sidewalk, curb and crossing geometry plus separately sourced transit-stop and route metadata where available.

Deliver: Tile-scoped street meshes and a navigation graph contract; estimated widths labelled.

Acceptance: Connected pedestrian/vehicle networks, sensible slopes and no duplicate border segments. Transit schedule/current service claims require current source evidence.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 14 buildings interiors

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-14-buildings_interiors`. Your exclusive proposed output directory is `production/lanes/14-buildings_interiors/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Build footprint-based building shells, roofs and authored modular façades for the pilot. Add one authored enterable interior with door/interaction anchors; distinguish invented interior from measured building facts.

Deliver: Building tile packages, one permitted landmark if supported and interior/collision attachment metadata.

Acceptance: Footprints match licensed evidence within declared tolerances. No floating foundations or unexplained heights; interiors and façade guesses labelled authored. No branded art copied without permission.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 15 props vehicles

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-15-props_vehicles`. Your exclusive proposed output directory is `production/lanes/15-props_vehicles/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Preserve original low-poly asset production as background/mobile tier. Select pilot furniture, street props and unbranded vehicle models for a detailed PBR tier.

Deliver: 15–25 reusable prop types across the slice, vehicle model packages, LODs and collision proxies.

Acceptance: Correct scale/pivot/materials, visible close-up quality, source rights and importer success. Do not overwrite existing generated assets or count simple bases as realism proof.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 16 vegetation

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-16-vegetation`. Your exclusive proposed output directory is `production/lanes/16-vegetation/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Produce locally suitable tree, shrub and ground-cover assets with LODs and controlled wind. Coordinate placement rules without owning scene manifests.

Deliver: Original/licensed vegetation packages and suggested exclusion/density constraints.

Acceptance: Review silhouette, species/style fit, shadow cost and transparency cost. Do not intersect roads or doors in the placement fixture.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 17 placement

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-17-placement`. Your exclusive proposed output directory is `production/lanes/17-placement/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Build deterministic tile placement manifests using stable IDs, geographic anchors, source confidence, exclusion zones and manual overrides. Begin against placeholder asset registry.

Deliver: Seeded placement rules, tile ownership tests and pilot manifest; never modify asset masters.

Acceptance: Identical pinned inputs and seed reproduce output; no duplicate IDs, road obstruction or erased manual overrides. Detailed models replace placeholders by ID without world rebuild.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 18 world interactions

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-18-world_interactions`. Your exclusive proposed output directory is `production/lanes/18-world_interactions/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Implement independent collisions, pedestrian/vehicle movement and a small interaction set: avatar traversal, a usable door and entry into the authored interior.

Deliver: Navigation/activity adapter, interaction anchors and integration tests.

Acceptance: Complete a walking route and enter/exit interior; vehicles remain on valid paths. No collision/navigation derivation from restricted Google imagery or tiles; no edits to shared scene bootstrap.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 19 qa performance

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-19-qa_performance`. Your exclusive proposed output directory is `production/lanes/19-qa_performance/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Own validation fixtures, visual acceptance evidence and benchmark routes, independently reviewing outputs from all lanes.

Deliver: Named desktop/mobile test matrix, screenshot/contact sheets, morph tests, error/performance reports and release recommendation.

Acceptance: Run the full slice in-game. Report measured p50/p95 times, memory and source accuracy. Asset count and Blender-only renders cannot pass realism. Escalate blockers to the responsible owner.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

### Lane 20 builds streaming

Work in the saved joinallworld cloud environment on kromate/joinallworld, starting from the coordinator-approved main revision. Your branch is `allworld/lane-20-builds_streaming`. Your exclusive proposed output directory is `production/lanes/20-builds_streaming/`; this is not permission to invent repository structure before the coordinator checks it. Do not use the Mac.

Task: Design isolated cloud builds, immutable artifacts, rollback and runtime streaming/LOD adapter behind the coordinator interface. Profile resource use before proposing more workers.

Deliver: Reproducible build job specification, streaming adapter, cost estimate and failure/fallback tests.

Acceptance: Clean-machine reproduction; aborts cannot corrupt released packages; constrained network degrades to valid LOD. Do not provision paid resources, create credentials or expand access without approval.

Start read-only: inspect the actual files and pinned importer, report dependencies, proposed changes and test commands. Wait for the coordinator's implementation release. Once released, edit only the approved lane-owned paths; shared runtime, schema, importer, registry, lockfile and entry-point changes must be submitted as integration requests. Preserve the ongoing original Blender pipeline. Use fictional human identities and original or properly licensed data. Do not create accounts, secrets, purchases or new access.

Return commit/revision, complete artifact locations, hashes, tests run with observed results, unresolved risks and any exact integration patch requested. Report useful results right away, before scratch notes. If work remains, send the coordinator a short update; otherwise return the result. If authorization is missing or an action is denied, pause that action and report its exact target and blocker. No claims that other lanes or 20–100 threads are running without verified status.

## Coordinator launch checklist

- Verify environment setup and repository status in task 01a13657-d308-749e-ada7-18b498dfd027; inspect AGENTS instructions and existing source ownership
- Materialize this Library file in that task and verify readable bytes before delegation
- Preserve the current pipeline and reserve its required resources
- Start dependency-ready read-only assessments within verified concurrency limits
- Publish the baseline commit, discovered importer contract, exclusive path map and first golden fixture
- Release isolated implementation only after those contracts are accepted; apply shared changes through lane 01
- Track lane states explicitly as planned, assessing, blocked, implementing, validating or accepted, with evidence
- Deliver the tested character-plus-block slice before authorizing broad content expansion
