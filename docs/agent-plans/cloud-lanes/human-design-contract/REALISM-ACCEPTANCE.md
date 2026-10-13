# Human acceptance and dependency handoff

Status: **not executed on new geometry**. The only implemented evidence is schema, migration, expression arithmetic, binding rejection and pinned-source metadata checks. This is a proposed review protocol for the existing character owner, informing parent-plan lanes 04–11 and QA lane 19. Parent owns integration/further launches; no runtime authority transfers here.

## Required owner decisions before deformation work

1. Reconcile existing task `01a13520-8d89-70f1-a722-786459524996`; its lookup returned `unsupportedplacementformatv2`, which establishes no abandoned ownership. Receive its branch, owned paths, topology, bind/rest data, morph naming and current stage. Do not stop it.
2. Choose an explicitly versioned common adult topology or separately identified body families. The current female and male arrays differ in count; shared rig names alone cannot establish correspondence. Freeze decoded vertex/index/normal/UV order, seam loops, skin influences, morph endpoint hashes and material regions. Unapplied object/armature transforms need explicit exporter handling.
3. Freeze the neutral-rest skeleton hierarchy, bind matrices, coordinate conversion, clip pack hash, animation root policy and four-influence export policy. The present 23-bone family has no eye/jaw/finger articulation. Hand scaling is a shape control; it does not promise independent finger animation.
4. Define the real extent of every normalized endpoint using landmark measurements. Keep body/face identity and expression control sets distinct. Dependency constraints/corrective shapes must report why an unsupported combination is unavailable; never silently change other saved controls to hide a failure.
5. Agree target camera distances, neutral/day/night lighting, accepted rig/LOD capabilities, current measured runtime caps and named hardware devices. Parent plan 40–80k hero/large-scene numbers are experiment targets only; do not replace `src/budgets.ts`.

## Geometry and deformation rejection criteria

Always reject non-finite vertices/normals/weights/transforms, invalid indices, singular bind matrices, negative or unnormalized skin weights, orphan joints, mismatched topology, or inverted/zero-area triangles introduced by a morph. Preserve the approved winding and intentionally open boundaries. Reject accidental left/right coupling and duplicate control names. Numerical acceptance must be paired with visible shape review.

For the geometry owner’s review, the following are **proposed measurement targets, not adopted game limits or measured results**: paired modular seams stay within 1 mm in body metres; corresponding smooth normals differ by no more than 5° unless the seam is intentionally sharp; sampled cloth penetration no deeper than 2 mm and zero visible penetration/holes in agreed views; planted sole slip ≤10 mm over an approved contact interval, floor penetration ≤2 mm on declared flat support. Parent and geometry/rig owners must agree the target set before using it as a pass criterion. Persist exact failed witnesses, including triangle/vertex IDs and pose/control values. Do not relax tolerances retrospectively.

Keep distances in body metres before scene conversion; account for non-uniform appearance scale and parent rotation. Quantized GLB mesh coordinates are not metres by themselves. Contact samples do not prove swept collision, boardability, route clearance or seat reservation; LIVING retains those gates.

| Area / controlled endpoint pairs | Required visible evidence | Dependencies and failure signals |
| --- | --- | --- |
| Ear size/protrusion/rotation/lobe; ear vs face width/head depth | Front/back/profile/three-quarter closeups; independent left/right endpoints, earrings/headwear present | Ear-root loops remain continuous; helix/antihelix/concha/lobe are readable; no scalp or accessory penetration. Head-rigid sockets alone are insufficient |
| Nose bridge/alar width/projection/tip; nose vs lip/chin | Frontal nostril symmetry and intended asymmetry; side silhouette; smile and jaw-open combinations | Keep nasal walls/nostril rim; avoid pinched bridge, collapsing nostrils and upper-lip overlap |
| Brow height/angle, eye spacing/aperture/fold; lids vs blink/gaze | Open/half/closed blink, both unilateral blinks and gaze corners | Eyeballs correctly seated; complete closure without eye popping, lid inversion or sliding brow; mouth/nose identity unchanged |
| Jaw/chin/cheek/lip vs smile/frown/jaw/seal/pucker | Neutral → posed → exact neutral cycle and short continuous motion | Lip contact, mouth cavity, teeth and tongue remain coherent; corrective expressions compose with identity rather than resetting it |
| Shoulder width/arm length/muscle vs reach/wave | Front/back full body and axilla closeup during raised/lowered arms | Deltoid/axilla loops, clavicle support, elbow volume, wrist position; no candy-wrapper twisting or inverted sleeve seams |
| Torso/waist/hip/abdomen vs sit/walk | Side/back sitting, hip flexion, turns, get-up | Pelvis support, seat offset, volume and garment fit; no implausible pelvis drift, stretched abdomen or collapsed groin |
| Height/leg/foot size vs planted stance/walk/jog/stairs | Full cycle with visible soles and step edges; fixed calibrated camera | Retargeted lengths/rest/binds, stride distance and sole frame; no accumulated IK, foot skating or soles hidden by framing |
| Hand size/arm length vs prop use | Contact closeup with hands visible | Current mitten/hand rig limitations explicit; prop anchors refitted, no claim of finger gripping from hand scaling |
| Hair vs face/ears/head depth and headwear | At least three actual styles including tightly curled hair, neutral/day/night and shadow modes | Scalp envelope and morph deltas; intended forehead/ear exposure; overdraw and shadow cost measured |
| Clothes vs all affected proportions/poses | Two actual outfits, footwear and accessories; exposed collar/cuffs/hem in motion | Correct fit deltas, approved body masks and normals; remove/re-equip restores exact original body indices/identity |

## Bounded staged matrix

First run geometry checks on the neutral mesh and each of 38 controls at -1/+1 (76 endpoints per accepted topology), then review small image batches of the most affected anatomical regions. Do not run new heavy jobs from this document. The 38-control full two-control extreme space is 2,812 combinations per topology; author an explicit coverage queue and conservative constraints before claiming pairwise completion. Initial risk pairs above are a subset, not full coverage.

For each accepted fixture preset, cover rest, walk contact/passing phases, jog, stairs, turn, reach, sit entry/seated/exit and neutral restoration. Fix exact pose phase and all unrelated controls for A/B images. Include dark/light tones across all lighting presets and all current body families or their formally migrated successors. Include each hair and outfit’s affected extreme cases; do not explode all combinations in one unbounded process.

Record at least one continuous transition clip per risk family so still-frame success cannot conceal popping, accumulating offsets or visibility failures. Clip sampling must restore the raw animation checkpoint before external contact corrections. Host timestep/stride semantics, interruption and settled-idle behavior remain unchanged. Freeze evaluated bone and appearance generation when comparing contacts; same root placement can still hide different body poses.

## Current-game, persistence and lifecycle gates

The integrator adapts the accepted result through `loadBody` / `SkinnedBody`, preserving host time, data/device gates, fallback, place/fit/wear, standing vs seated destination, clip variants, contacts and idempotent disposal. Changes in body-file selection still require proper reload. Static scenery importer baking cannot replace the skinned loader.

Require in-game portrait, full body and street-level views with the same saved identity; a Blender render, topology diagram or workshop preview does not pass. All promised controls must produce the intended visible anatomical change. Hair/clothing/expression changes, scene transitions, crowd/peer views and near/far swaps must preserve design choices. Unknown capability uses the approved fallback and retains design data.

Save/reload each fixture and a hand-edited asymmetric face/body look. Verify normalization, strict authoritative write checks, inventory ownership, public projection, interruption/retry and prior-version migration. Exercise malformed/oversized/future saves without overwriting original bytes. Test legacy records both with no appearance extension and with all existing categories/wearables. Demonstrate editor clamping visibly with the exact applied value.

Exercise loading failure/abort, reduced-data/device gate, cold and warm cache, repeated rebuild/dispose and multiple simultaneous actors sharing assets. No geometry/material/texture ownership leaks or disposal of another actor’s cache. Report current whole-scene calls/triangles/raw/gzip/Brotli requests, renderer resources and frame/input behavior on named physical devices. Software WebGL and desktop emulation receive separate labels. No numerical cap, visual gate or physical-phone gate is waived here.

## Review packet required from the owner

Submit source and output hashes, editable original/licensed source, provenance, topology/rig/morph/anchor versions, actual fit/mask/material dependencies, exporter version/command, supported loader features, exact game commit, fixture/control/pose/light/camera values, measured failures as well as successes, and small independently inspectable captures. Include approved LOD/fallback behavior and migration/rollback instructions. Pin each dependency by content hash; do not publish mutable `latest` references.

Parent/GRAPHICS and the existing character owner decide adoption; QA lane 19 independently reviews rendered behavior and the user approves the realism direction. WORLD alone retains release authority. None of these pending acceptance items blocks delivery of this standalone proposal, and none is represented as complete by its passing tests.
