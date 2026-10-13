# Planned country-aware character content metadata

Parent relayed the user's 20:08 UTC direction: character content should fit the country context. The first bounded research set is **Nigeria, Ghana, Kenya and Tanzania**. The exact parent-supplied research brief has now been read in full and is retained below. This is a proposed content contract only, separate from the finite geometry/budget review. No runtime/save-schema change, NPC generation, country preset, new worker or authenticity claim is included.

Contemporary clothing, hairstyles and accessories may carry geographically relevant context. Local NPC presets should offer varied, referenced combinations rather than one representative national look. Players may receive optional suggestions, but travelling preserves their identity and chosen appearance; no country hard-locks skin colour, facial shape or ethnicity, and no physical trait is used to infer nationality.

## Exact research reference and status

- Source: [Allworld: country-aware character art brief](https://github.com/kromate/allworld-assets/blob/f8e554c85090eb0b0ee9cc03c945e0f44ac44396/docs/character-country-context.md).
- Repository/path: `kromate/allworld-assets`, `docs/character-country-context.md`.
- Immutable commit: `f8e554c85090eb0b0ee9cc03c945e0f44ac44396`; returned Git blob: `5d5dfd7f5cd3cbcd249f8ef745f381d73c8de74d`.
- Read receipt: 2026-10-13 UTC, successful authorized GitHub connector fetch at the exact commit, UTF-8 content read in full. Public web access returned 404; the private connector succeeded. The cited external references were not independently revalidated in this coordinator pass.
- Source status: **research/design proposal; rights clearance and relevant local review outstanding**. Citation, public visibility or a designer catalogue does not grant pattern/image/3D reuse rights. This handoff does not authorize paid reviewers, commissioning, copying designer patterns or production implementation.

The source proposes the following **12 selectable recipes / 24 original colourway combinations**, sharing garment meshes where practical. These are proposed content directions, not delivered assets or nationality assignments; consult the pinned brief for the complete construction, context, evidence and review notes.

| Recipe | Proposed context and outfit |
| --- | --- |
| `NG-01` | Lagos casual: original tee, relaxed denim, sneakers, optional bucket hat |
| `NG-02` | Abuja/Lagos everyday: relaxed blouse/shirt, wide trousers, flats, tote; adire option remains pending textile provenance |
| `NG-03` | Nigerian city work/social: collarless long tunic, straight trousers, loafers; cut/name/context need review |
| `GH-01` | Accra work: lightweight blouse/shirt, tailored trousers, optional blazer, flats |
| `GH-02` | Ghanaian city casual: plain top, midi skirt/trousers, sneakers, crossbody bag; shared everyday foundation |
| `GH-03` | Northern provenance/urban Ghana: original fugu/batakari smock, plain trousers, flats; named tradition needs review |
| `KE-01` | Nairobi commuting: tee, trousers, weather-appropriate light layer, sneakers, backpack |
| `KE-02` | Nairobi creative/social: original workwear jacket/trousers or overalls, flat shoes |
| `KE-03` | Coastal Kenya everyday: lightweight long shirt, relaxed trousers/long skirt, sandals; coastal review before weighting |
| `TZ-01` | Dar es Salaam work/everyday: breathable collared shirt/blouse, straight trousers, flats, shoulder bag |
| `TZ-02` | Dar/Zanzibar casual: plain top, long skirt, optional khanga wrap, sandals; textile and Kiswahili text gates apply |
| `TZ-03` | Zanzibar town everyday: loose tunic/dress, trousers where appropriate, sandals, wearer-chosen optional headscarf |

Shared contemporary basics remain available across all four countries and all player nationalities/genders; body fit is separate. The source's eight reusable hair directions are options, not country locks. Its three-body-shape fit target and movement/headwear QA are future requirements, not passes for the current unrigged prototype. Formal agbádá/riga and kente ensembles, community-specific beadwork and sacred/ceremonial regalia remain later research batches.

Player travel preserves face, skin, body, hair, name **and current outfit**. Any local-style suggestion requires player selection and undo. NPC recipes use reviewed city/region, weather, activity, occasion and authored preferences, with varied residents/visitors/diaspora choices; no invented population weights or inferred religion. Until appropriate review, use shared basics and keep contextual cultural candidates preview-only. Clothing must not assign abilities, intelligence, morality, hostility or occupation.

The source's review sequence is `draft` → `local-review-needed` → `approved-for-specified-context`, with rights clearance a **separate pass/fail gate**. Named traditions require relevant maker/community review; text requires language/meaning/context review. The source proposes paid local reviewers as a release gate, but none are commissioned or authorized here. Original meshes/textures and recorded permitted commercial/derivative/3D uses are required; no scraping/tracing/projection of reference photographs. Review disagreements and limited scope must be recorded rather than claiming national authenticity.

## Proposed optional catalogue fields

| Field | Intended meaning / constraint |
| --- | --- |
| `contextMetadataVersion` | Explicit version for this optional catalogue metadata; do not silently change human save v2 or a geometry/fit contract |
| `contentId`, `contentRevision`, `assetPacketSha256` | Resolve the exact clothing/hair/accessory/preset content and its independent geometry/provenance packet |
| `locationContexts[]` | Each record references existing country ID and optional region/city IDs, with a plain-language relevance claim and linked evidence IDs. Resolve catalogue IDs before implementation; no invented boundary or city mapping |
| `clothingContext` | Documented occasion/use (for example everyday, work or ceremony), activity, contemporary time range, and source-supported weather/season or setting relevance where useful. Leave unsupported values unknown; no universal national dress rule |
| `usageRole` | `npc-preset` or `optional-player-suggestion`; neither grants forced changes to player appearance |
| `variationGroup`, `compatibleContentIds` | Enable varied local combinations subject to actual mesh/fit compatibility and per-lane budgets. These are content choices, not ethnicity/physique constraints |
| `evidence[]` | Source ID/URL/title, access/publication date, factual basis versus design inference, geography/context, maker/texture author, provenance/rights record, permitted uses and required attribution. Refer to the source registry; a cultural reference does not grant asset-extraction rights |
| `review` | Proposed source-aligned context states: `draft` / `local-review-needed` / `approved-for-specified-context`, evidence version, reviewer context/date, disagreements and limitations. Keep rights clearance and any text-language/translation review separate; neither source citation nor geometry QA implies a pass |
| `suggestionPolicy` | Optional and user-controlled; preserve identity and selected appearance across travel. No automatic wardrobe/hair/skin/body/facial changes or country-specific complexion/ethnicity restrictions |

These are proposed descriptive names, not implemented TypeScript/JSON-schema fields. Region/city specificity and context confidence must follow the pinned evidence and appropriate review. The source additionally requests garment/component IDs, body/hair/headwear compatibility, LOD/material/skeleton versions and animation-test status; resolve those against existing owner contracts before a schema change. Do not populate cultural claims from stereotypes or attach authenticity labels to the current prototype images. Source/provenance review, geometry compatibility, budgets and cultural review are independent gates.

Parent retains implementation and launch coordination. Existing human/skin/hair/wardrobe owners retain their asset scopes. The current anatomy/eye, affected skin bindings and complete-character cost blockers remain the immediate work; this metadata proposal does not expand fan-out or authorize more character builds. Keep implementation on hold until that combined checkpoint is resolved.
