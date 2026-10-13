# Combined character review v1 — blocked, diagnostic preview delivered

One isolated combined diagnostic is inspectable: [12-panel preview](combined-character-diagnostic.png), **417,491 bytes**, SHA-256 `1819a35a5cec7904fdbdfc608b8b46eac5e7b0edd0e6168b0329238b5aebf96b`. It contains real GLTFLoader renders, not replacement/generated pixels. **No realism, complete skin binding, skeletal fit or game readiness is approved.** No production integration or budget change occurred.

## Exact inputs and assembly

| Input | Commit |
| --- | --- |
| Human eyelid candidate | `b62b7fb6d10e9c80e0d127d535d97a86d0b29f49` |
| Human continuation, read only | `7a8928797aea919ae92d41fe4cc15f1c2ad74da1` |
| Frozen reference master | `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a` |
| Corrected skin/corneas | `2544b6d66bddf5431ed15bd17298a21b43bcc454` |
| Hair and existing fitted silhouettes | `7a9759f1c371aba39bc34b875e64797c4071ad25` |
| Optimized envelope wardrobe | `8f6e32102f47330239c30d45aa552ea6e17d9011` |

[Input pins](input-pins.json) record **21 exact Git blobs / 11,274,232 bytes**, including source blends, exported GLBs, frame/binding metadata and relevant receipts. Inputs are materialized only in ignored coordinator scratch; no source lane file or frozen first-wave input was replaced. Full asset/buffer signatures and decisions are in [compatibility-and-budgets.json](compatibility-and-budgets.json).

Independent GLB decoding confirms **27 candidate meshes preserve triangle-expanded positions, UVs, every POSITION morph and node transform against the frozen master**. All 31 old-body meshes in the skin derivative retain those fields. Only the four revised lids break the old topology/UV/morph binding. Anchors and six identity control names match the original fit frame. Exact frame hashes are recorded; there is no skeleton/bind hash to claim.

The diagnostic therefore uses the candidate body exactly once, transfers skin materials onto **26 compatible visible meshes**, and adds only the two corrected corneas, one fitted hair silhouette and the garment-only overlay. It hides only `Hair_original_close_curl_surface` (2,518 triangles), following the hair owner's explicit replacement rule. It retains the original clothed torso/legs; no invented body mask or duplicate whole body is added. The **four new lids retain their original candidate material**, visibly exposing the missing skin-map rebind instead of incorrectly applying old UV maps. This is a partial-binding diagnostic, not an accepted combined skin asset. No merged production GLB was emitted.

## Actual costs under unchanged limits

The measured assembly formula is **32,482 candidate − 2,518 placeholder + 1,200 corneas + chosen hair + 2,324 wardrobe**. All counts are decoded from the exact inputs; shared body geometry appears once.

| Hair option | Hair triangles | Complete geometry | Margin under 34,000 | Result |
| --- | ---: | ---: | ---: | --- |
| Detailed fitted crop | 6,574 | 40,062 | −6,062 | Over; not rendered as a passing preview |
| Detailed fitted bun | 5,766 | 39,254 | −5,254 | Over; not rendered as a passing preview |
| Existing crop silhouette | 358 | **33,846** | **154** | Geometry comparator passes only |
| Existing bun silhouette | 502 | **33,990** | **10** | Geometry comparator passes only |

The current body/eye/garment allocation leaves **512 triangles total for replacement hair** under this comparator. Detailed crop/bun would instead require body counts <=26,420 / <=27,228 if all other components remained unchanged. These are accounting implications, not authorization to decimate anatomy, hide body surfaces or raise limits.

Actual Three.js 0.180.0 software-WebGL measurements expose the optical-pass cost:

| Diagnostic view | Geometry triangles | Submitted triangles | Draw calls |
| --- | ---: | ---: | ---: |
| Crop silhouette, full body | 33,846 | **67,692** | **68** |
| Bun silhouette, full body | 33,990 | **67,980** | **70** |
| Crop silhouette, portrait | 33,846 | 50,280 | 54 |
| Bun silhouette, portrait | 33,990 | 50,568 | 56 |

No background grid or floor geometry was added. The optical material path submits extra passes; a primitive count is not a draw-call measurement. Full-body calls exceed the existing **60-call venue comparator**, and geometry far exceeds its **<17,000-triangle scene test scope**. Neither preview comparator is the shipped skinned-body allowance: that route requires <=10,000 base triangles, one skeleton and its binding contract. The master remains unrigged. [The pinned budget audit](../COMBINED-CHARACTER-REVIEW.md) retains exact scope and source hashes.

The wardrobe's 2,324 triangles remain below the actual **3,000 combined wardrobe** guard, with one primitive/material and zero textures. Its match to those costs does not establish compatibility with the indexed skinned-body renderer, undressed anatomy or production masks. The skin file retains 64 image definitions / 634,338 encoded image bytes including variants; not all definitions are simultaneously rendered.

## Bounded checks and visible findings

[State checks](state-checks.json) executed **21 states × two silhouette styles = 42** directly from decoded GLB morphs. They include six signed identity endpoints, quarter/half/three-quarter/full blink, happy-expression weights, and body-extreme/half-blink cases. The consumer computes both existing height×expression products and new `4*b*(1-b)` blink-arc correctives. Exact neutral reset and unchanged input files were verified.

- Zero new proper cornea/lid/head/eye crossings in the tested pairs; zero upper/lower-lid proper crossings.
- Zero hair/body or wardrobe/body proper crossings; no sampled penetration beyond 0.2 mm hair /0.1 mm garment criteria. Minimum signed nearest-normal samples: **3.405 mm hair**, **2.808 mm garment**. These are local samples, not global/continuous clearance certificates.
- No nonfinite or near-zero-area geometry states. Three lid triangles point opposite their neutral normal at full blink (repeated for both hairstyles). [Focused diagnosis](lid-diagnostic.json) finds positive finite areas at the five already-tested blink weights, minimum about `1.1353e-10 m²`; this does **not** classify or clear a fold through continuous motion. Retain these faces for the anatomy owner.
- Independently reproduced **69 inherited proper eye/head crossings at neutral**. New cap success does not erase these original defects.

The strict intersection classifier is the pinned producer's audited function, reused with its **0.25 µm tolerance** and three independent crossing/disjoint/touch fixtures. Raw BVH candidates remain in receipts alongside proper crossings. Results cover discrete exported morph geometry, not all possible identity combinations, coplanar/self-collision or skeletal motion. Existing 112/448/17/3,003 owner suites were not rerun or relabelled as coordinator execution.

One browser session produced **12 still panels**, inspected visually. No video or additional turntable was generated. Neutral/half/full-blink portraits visibly retain raised eyelids, hard patch transitions and uneven/mottled skin; facial proportions remain stylized. Silhouette hair is a coarse cap at portrait distance, and the envelope outfit still has stiff/faceted collar/shoulder/detail treatment. These are concrete blockers to the requested convincing-human target. The short/broad/happy illustration is a display-only combination, not an extra numerical geometry pass in the 42-state table.

Browser receipt: zero page errors / failed requests, ~4.65 seconds, ANGLE SwiftShader. One style swap back, neutral reset, and garment hide/restore were exercised. Geometry counter returned to zero; one texture counter remained after disposal/context-loss request, so **a zero-texture lifecycle pass is not claimed**. The browser/context and loopback server were then closed, all owned commands ended, and heavy/server/browser slots returned to 0/1. This is not physical-device performance evidence.

The first state-check invocation failed at import because the script name `inspect.py` collided with Python's standard module. It ran no states; [failure log](state-checks-import-failed.log) is retained. Renaming the coordinator helper to `review_inputs.py` fixed the conflict. The successful 42-state run took ~2.78 seconds inside a 120-second Blender/heavy-slot bound, two CPU threads and 256 MiB Node heap. The focused lid diagnosis used a separate 30-second bound and only already-sampled blink weights. No full tests/build/typecheck, new workers, paid resources, deployment or production edit occurred.

## Checklist outcome and smallest next corrections

1. Corrected input intake: **received**, with remaining anatomy defects retained.
2. Compatibility: **partial only**; four lid UV/material bindings block a complete skin combination. Hair/head and wardrobe/envelope dependencies otherwise match their consumed geometry/frame in these checks.
3. Budgets: **detailed hair fails**. Existing silhouettes meet only the 34,000 geometry comparator, with negligible spare room; full-body optical calls still fail the 60-call comparator.
4. Sampled geometry: narrow crossing/clearance checks pass; inherited 69 crossings and three normal-direction flags remain explicit.
5. Visual review: **not convincing/realism accepted**; one diagnostic delivered with limitations on-image.
6. Lifecycle/runtime: resources closed; residual texture counter and absent rig/binding remain open. No game route was exercised.
7. Overall: **BLOCKED for complete combined-character acceptance**. Stop after this checkpoint.

Parent should route only these bounded follow-ups to existing owners:

1. **Human owner:** resolve the existing eye/head penetration and raised closed-lid/patch transitions in one versioned candidate; inspect the three flagged faces. Preserve unaffected buffers/controls/frame where possible, report changed hashes and geometric cost, and freeze that result before more skin fitting. Do not call the current sampled pass realistic.
2. **Skin owner:** consume that explicit candidate; rebind/rebake only affected lid/eye UV/material surfaces and any dependency that actually changed. Keep the current corrected cap pin until combined checks require another correction. Review optical pass costs within the unchanged renderer limits; do not silently remove optical features just to manufacture a budget pass. Repeat the affected bounded regression, not the entire research pipeline.
3. **Parent plus existing art owners:** retain 34,000 complete-preview /3,000 wardrobe limits and assign a single explicit geometry/material allocation. Existing silhouettes provide a cheap diagnostic now; detailed hair needs 5,254–6,062 triangles reclaimed from the composition or a reviewed lower-cost art derivative. Keep original detail sources. Measure complete draws after optical/material changes; no cap increase or arbitrary body masking.
4. **One subsequent finite combined check** only after compatible completed pins arrive. Actual rig/rest/bind, locomotion, undressed-body fitting and game integration remain separate outstanding contracts; no new lane is launched by this report.

Country-aware content metadata is a separate proposal in [COUNTRY-CONTEXT-PROPOSAL.md](../COUNTRY-CONTEXT-PROPOSAL.md). No cultural authenticity, country-specific anatomy, NPC distribution or travel behaviour was implemented in this geometry review.

## Reproduction

Executable review helpers are in `experiments/cloud-lanes/integration-contract/combined-review-v1/`. From this worktree with the exact Git objects available, `python3 .../materialize.py` restores and verifies ignored scratch; `review_inputs.py` writes the byte-level comparisons. Blender runs `check_states.py` and `diagnose_lid_flags.py` through existing heavy-slot/timeouts. `capture.py` uses installed Python Playwright/Chromium and the existing Three 0.180.0 installation; no dependency install is required in this executor. Exact bounded commands are in [CONTINUE.md](../CONTINUE.md). Do not rerun unchanged captures/checks merely to read the handoff.
