# Batch 02 local-tale quality correction

## Identity

- **Work ID:** `20261015-local-tales-02-quality`
- **Owner:** `/root/local_tales_02_quality`
- **Model / effort:** `GPT-5.6 Sol / medium`
- **Thread:** `local_tales_02_quality`
- **UTC updated:** `2026-10-15T02:04:03Z`
- **Status:** `complete`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Replace batch 02's repetitive ambiguity-and-permission stories with 70 distinct, concrete fictional plots and aligned mission motivations.
- **In scope:** Rewrite `src/game/content/local-tales/batch-02.ts`; maintain this record; run the supplied narrow checker.
- **Out of scope:** Shared schemas/registry, other batches, tests/build/CI, services, browser/UI, Git mutations and deployment.
- **Exclusive file ownership:** `src/game/content/local-tales/batch-02.ts`; `docs/agent-work/local-tales-02-quality-20261015.md`.
- **Input contract:** `src/types/local-tales.ts`, `docs/research/unique-local-content-2026-10-15/AUTHORING.md`, and `input-02.json` at parent-provided checkout state.
- **Output contract:** One exact typed literal with 34 country arcs, 35 city records, 70 independently authored tales and 210 missions; at most two document/map/sign/note/letter/editing/credit/interpretation plots.
- **Dependencies:** Parent owns semantic acceptance, integration, runtime/UI verification, and Git.

## Repository state

- **Repo:** `JoinAllworld`, managed worktree `retention-main-sync/JoinAllworld`
- **Host:** Local Codex checkout
- **Branch / worktree:** `codex/retention-main-sync`
- **Base:** `313e8c266d889194a25c6625449af7c9195520e8`
- **Current commit:** `313e8c266d889194a25c6625449af7c9195520e8`
- **Dirty status:** Parent-owned runtime edits and untracked local-content files already present. This correction owns only the batch file and this new record; the prior worker's record is released evidence and will not be edited.
- **Port/process ownership:** None.

## Story matrix: conflict -> constraint -> resolution

Each row fixes both the city tale and its country installment before prose expansion. The country entry after the semicolon is independent of the city problem and solution.

| City / country | City conflict -> constraint -> resolution | Country conflict -> constraint -> resolution |
|---|---|---|
| Adamstown / Pitcairn | A comic tower-sandwich challenge collapses -> one platter and a dinner bell -> Jesse redistributes heavy layers into three stable towers | A carved game wheel rolls beneath the recreation benches -> it cannot be lifted over the low rail -> players steer it through a box-and-stool slalom |
| Amsterdam / Netherlands | Arden's wind-up beetle stops before its arboretum finish -> one loose gear fits two shafts -> test scratch patterns, then restore the drive shaft | A two-person shadow show misses its finale -> one lantern must light both performers -> stagger entrances around a shared timed cue |
| Bangkok / Thailand | A paper crown skitters beyond a pretend canal -> stepping pieces cannot touch the crown -> Wren builds a hooked chain from the game rods | Friendly rival lantern carts each lack a working wheel -> neither cart can finish alone -> join the sound cart and light cart for a paired parade |
| Bogota / Colombia | Indigo's rhythm chest will not open -> four echoes must be repeated in reverse -> place players at different listening points and perform the full sequence | A counter game leaves five pieces after equal dealing -> no player may receive a permanent advantage -> rotate the extra-piece role across short rounds |
| Brasilia / Brazil | Sage's foam arch keeps folding -> all rods are too short for the planned square -> brace two triangles into a freestanding gateway | Two prop crates reach the wrong fictional scenes -> the curtain rises after one park look-around -> swap only the unique pieces, then let each cast improvise with the shared pieces |
| Brazzaville / Congo | Jesse's chess pieces slide off a tilted serving tray -> the board cannot be moved during the round -> wedge it level with folded game mats | A surprise entrance must stay silent until the guest appears -> hanging chimes block the only curtain pull -> route the pull through stool legs so the curtain rises without touching them |
| Bridgetown / Barbados | Arden's relay ribbons knot around one pole -> cutting or adding a pole is forbidden -> run the pole backward through the knot in team order | Two friendly shadow-puppet rivals accidentally form one huge creature -> there is one screen and one lamp -> turn the collision into a joint finale |
| Bucharest / Romania | Arden's clockwork theatre jams mid-scene -> three levers reset only in one order -> follow the frozen actors' positions to infer the sequence | Dance and sound rehearsals both need four stools -> only four exist and both finales overlap -> interleave seated percussion with standing dance beats |
| Conakry / Guinea | Jesse loses a brass bell clapper in the forest-game set -> only scrape, dent and roll clues remain -> follow the three spatial clues to the hollow log prop | A cooking-game lid is too small for the pretend pot -> no replacement lid is available -> fit a ring of wooden spoons as a stable collar |
| Cotonou / Benin | Two picnic baskets are delivered to the wrong game tables -> names are absent -> match the odd cup, cloth pattern and missing handle to each scene | A domino tournament has an odd player each round -> nobody may sit out twice -> use a rotating bye that grants setup duty, then a guaranteed first move |
| Gaborone / Botswana | A ribbon maze is blown across the stadium-game course -> markers cannot be moved -> Jesse retensions the ribbon using the fixed corners | A radio-play finale needs four sounds but one performer is missing -> every prop must remain audible -> one player layers two non-overlapping cues |
| Georgetown / Guyana | Emery's floating stage tiles will not span the pretend marsh -> only seven shapes and no overlaps -> rotate the trapezoid into a load-bearing middle | A friendly rival finishes half a puzzle first -> the two halves secretly interlock -> combine them and race the clock as one team |
| Helsinki / Finland | Arden's long sled prop sticks in a narrow arch -> it cannot be dismantled -> pivot the rear upward and rotate it through diagonally | A light rehearsal has six minutes of battery -> the original scene lasts nine -> compress pauses and let the darkness become the closing beat |
| Ho Chi Minh City / Vietnam | Corin's paper dragon twists its three control cords -> pulling the wrong cord tightens the knot -> slacken, cross, then retension in color order | A tray-balance game uses cups of unequal weight -> all cups must travel in one trip -> pair heavy and light cups around the center handle |
| Jakarta / Indonesia | Wren's blanket-fort roof sags before the quiet scene -> only three supports and no extra cloth -> make a triangular ridge with a low reading nook | Two dance rehearsals share one giant fan -> each needs it at a different climax -> build a timed handoff into both choreographies |
| Khartoum / Sudan | Jesse's comic meal scene has spoons too long for the tiny table -> no prop may be removed -> alternate handles outward to create room | A relay target must total exactly twelve -> the available numbered rings cannot repeat -> combine three routes with equal sums |
| Kuala Lumpur / Malaysia | Ira's model moon sticks high in a stage rig -> climbing is unavailable -> rig a two-line pulley from ground-level handles | A sound-fountain game demands a five-note sequence -> echoes hide the third note -> split listeners between the two venues and combine what each hears |
| Kyrenia / Northern Cyprus | Greer's giant hoop will not pass a narrow game gate -> bending is forbidden -> tilt, roll and rotate it through one corner at a time | Friendly rival marble-track builders each lack crucial parts -> rails and supports cannot be traded permanently -> connect both tracks for one return loop |
| Lima / Peru | Emery's wind-up carousel stops with riders tilted -> opening the casing loses spring tension -> reset the outer latch while counter-turning the platform | Three lantern cues and one operator collide in the finale -> the operator cannot reach both sides in time -> use one reflected cue to trigger the far performer |
| London / Britain | Nico's costume rack locks while crossing the park-game stage -> two wheels turn and two do not -> lift one corner onto a round prop and roll it to the repair mark | A lost brass key prop must be found before a treasure scene -> no written map exists -> follow a red-thread snag, a circular scuff and a bench-side glint |
| Majuro / Marshall Islands | Nico's cup tower keeps drifting in a fan-made breeze -> the fan stays on for the scene -> build a broad spiral base with sheltered upper cups | Batons for two rehearsals are delivered to the opposite casts -> neither rehearsal can pause -> perform a mid-scene crossing exchange |
| Montevideo / Uruguay | Jesse's musical glasses play the melody out of order -> water cannot be added or removed -> rearrange glasses by pitch after careful taps | A park parade float is wider than the finish arch -> the decorated panels may not be folded -> release four pins, carry panels through, and rebuild inside |
| Nairobi / Kenya | Jesse serves the right pretend dishes to the wrong fictional roles -> the trays look identical -> use each character's repeated gesture to correct the comic scene | A tiny neighbour celebration has more guests than stools -> the performance area must stay clear -> build a semicircle of alternating sitting and standing places |
| Nouakchott / Mauritania | A squeaky cart ruins Jesse's silent-comedy entrance -> the wheel cannot be repaired before showtime -> make the squeak the beat for a new routine | A fair game has eleven tiles for four players -> all tiles must be used -> rotate three-tile hands so each player gets the short hand once |
| Pago Pago / American Samoa | Logan's relay baton disappears among field cones -> moving cones would erase the route -> use toppled grass, a scrape and the cone shadows to locate it | A beach-park stage rocks on uneven blocks -> no new blocks are available -> swap and rotate the existing blocks until all four corners bear weight |
| Philipsburg / St Maarten | Arden's ring-toss props blow behind a low obstacle -> players cannot cross the boundary -> link spare rings into a retrieval chain | Friendly rival sculpture teams receive shapes that only balance together -> each wants a separate finish -> suspend both sets as one counterweighted mobile |
| Port of Spain / Trinidad and Tobago | Arden's percussion finale loses its middle beat -> the instrument is stuck across the stage -> answer it with a precisely timed bench tap | Two costume rehearsals share three capes -> both finales occur within a minute -> choreograph visible quick changes that become part of each scene |
| Prague / Czech Republic | Emery's toy tram jams on a curved park track -> the carriage cannot be removed -> reverse the rear axle while nudging the front guide straight | A clock chorus misses its final chime -> three groups count from different starting beats -> synchronize on the only shared silent beat |
| Quito / Ecuador | Corin's foam cable-car stalls over a model ravine -> one track segment is reversed -> use the wear marks to flip and align it | Seventeen game tokens must serve three teams -> equal piles are impossible -> rotate the two extra tokens as temporary challenge pieces |
| San Marino / San Marino | Corin's inward-opening stage door traps a scenery cart -> hinges cannot move -> rebuild the cart as two narrow linked halves | Friendly rival obstacle-course builders create incompatible starts -> neither course has a finish -> cross-connect the last pieces into a loop |
| Sao Paulo / Brazil | Logan's color-relay bundles reach opposite teams -> the race has already started -> exchange bundles at a midpoint pattern without stopping | A giant paper flower collapses because its ribs are short -> no extra ribs exist -> overlap them into a six-point inner brace |
| Seoul / South Korea | Nico's stone-chime puzzle has five tones but only four visible strikers -> the fifth tone must come from the setting -> use a timed heel tap on the game platform | A friendly rival memory game reveals complementary halves -> scores are tied and time is low -> combine remembered positions for a joint final sweep |
| Tehran / Iran | Nico's rolling theatre wall cannot turn through a narrow corner -> scenery cannot be detached -> reverse, pivot on one wheel and guide the top edge through | A timed light scene has one fading battery -> three lamps cannot stay lit together -> sequence them so each handoff reveals the next performer |
| Tripoli / Libya | Uri's puppet drops through a trapdoor before its final line -> resetting would break the show's pace -> improvise its voice from below as another puppet searches | A jammed sandglass makes round lengths unfair -> the game must continue without a working timer -> use equal sound sequences as round boundaries |
| Vaduz / Liechtenstein | Corin's obstacle course opens in the wrong order -> each gate locks after use -> infer the safe sequence from height, balance and reach constraints | A miniature garden bridge bends under the finale prop -> only six beams and two supports -> laminate three short spans into a shallow arch |

## Progress

### Done and exact evidence

- Read the repository coordination protocol, prior batch 02 record, authoring contract, type contract and all 35 input rows.
- Rejected the released draft's recurring ambiguity, credit, opt-in and interpretation patterns; fixed a 70-plot matrix with concrete constraints and resolutions before prose expansion.
- Reserved zero document/map/sign/note/letter/editing/credit/interpretation plots in the new matrix.
- Replaced the complete literal batch: 34 country arcs, 35 city records, 70 tales and 210 missions. All eight desire tags appear: competence 23, belonging 12, care 11, curiosity 8, fairness 8, autonomy 4, recognition 3 and continuity 1. Intended dilemma answers are spread 21/29/20 across indices 0/1/2.
- Mission tasks vary across the batch: practical 69, discovery 31, host-visit 35, places 35 and people 40. Counts range across every valid activity/places/people count used by the authored tuples; labels and purposes name the concrete fictional motivation.
- The supplied checker passes with zero errors: `node --experimental-strip-types scripts/city/check-local-tales.ts src/game/content/local-tales/batch-02.ts --output /tmp/local-tales-02-quality.json` -> 35 cities, 34 countries, 70 tales, 210 missions.
- Tale copy averages 190 words including all tale fields (min 161, max 272); 31 tales fall below the 180-word target but remain four-chapter, constrained, resolved stories. This is the principal editorial gap for parent review.
- Semantic spread is recorded in the 35-row matrix above. It includes distinct mechanical repairs, spatial rotations and rescues, timed cue chains, fair-game arithmetic, sound reconstruction, moving delivery corrections, shared-resource rehearsals, friendly-rival combinations, comic failures, tiny celebrations and playful structures. Problems and resolutions were reviewed pairwise at the matrix stage; the parent-requested Brazzaville and Philipsburg collisions were corrected before prose expansion.
- No external geographical or historical facts were added. All real place/action names come from `input-02.json`; story events and consequences remain fictional.
- Corrected the choice order in all 70 tales after the parent UI review: chapter three now states the unresolved constraint and all three competing plans without identifying the intended answer; the former solution procedure now appears only in chapter four with the fictional consequence. A source audit found 70/70 third chapters with explicit `(1)/(2)/(3)` alternatives and no unmatched records.
- Replaced all 40 `people` mission labels with short observable greeting contexts such as “near the slalom gates” or “around the hidden-tile grid.” Fictional casting/team motivation remains in `purpose`; the label no longer claims that a greeting assigns a performer or team.
- Combined batch gate passes: `node --experimental-strip-types scripts/city/check-local-tales.ts src/game/content/local-tales/batch-01.ts src/game/content/local-tales/batch-02.ts --output /tmp/local-tales-01-02-quality.json` -> 75 cities, 35 countries, 150 tales, 450 missions, zero errors.

### In progress / blockers

- Parent activation/runtime review remains open. The checker proves structure, grounding references, tuple legality and normalized exact uniqueness only; it does not prove runtime/save integration or subjective story quality.
- Thirty-one tales are below the rough 180-word target (minimum 161) and one is 272 words. They are complete, but parent may request a focused length pass if the concise entries feel thin in review.
- No narrow typecheck, build, runtime, UI, Git or deployment action was run; these remain parent-owned. Model token and monetary cost are unavailable/unknown.

### Immediate resume steps

1. Parent accepts or rejects the corrected chapter-three choice flow from representative UI-facing samples.
2. Parent runs the owned runtime proof and activation path after acceptance.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** Parent semantic review and integration/runtime verification.
- **References:** `docs/research/unique-local-content-2026-10-15/AUTHORING.md`, `docs/research/unique-local-content-2026-10-15/input-02.json`, `src/types/local-tales.ts`, `docs/agent-work/local-tales-02-20261015.md`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15T01:38:01Z | active | Registered quality-correction ownership and completed the 35-row plot matrix | This record | Send first six rows, then expand source |
| 2026-10-15T01:45:00Z | active | Parent accepted concrete-play direction; removed two equivalent arch/tower transformations and committed to varied mission tuples | Parent checkpoint; this record | Expand literal source |
| 2026-10-15T02:34:00Z | active | Completed 35/34/70/210 literal data; first checker found only exact duplicates among generic mission labels | `/tmp/local-tales-02-quality.json` | Fold bespoke purposes into duplicate generic labels |
| 2026-10-15T02:36:00Z | ready-for-review | Focused label correction complete; checker passes with zero errors | `src/game/content/local-tales/batch-02.ts`; `/tmp/local-tales-02-quality.json` | Parent semantic and integration review |
| 2026-10-15T03:08:00Z | ready-for-review | Reordered all 70 tales so chapter three preserves the unresolved decision and chapter four contains the chosen procedure; replaced 40 people labels with observed greeting contexts | `src/game/content/local-tales/batch-02.ts`; `/tmp/local-tales-01-02-quality.json` | Parent activation/runtime proof |
| 2026-10-15T02:04:03Z | complete | Parent accepted the focused batch 02 correction and released this worker's ownership | Parent handoff | Parent owns final integration/runtime/Git |
