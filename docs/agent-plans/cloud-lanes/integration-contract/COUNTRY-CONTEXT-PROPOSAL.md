# Planned country-aware character content metadata

Parent relayed the user's 20:08 UTC direction: character content should fit the country context. The first bounded research set is **Nigeria, Ghana, Kenya and Tanzania**. Parent has started a source-backed brief; it has not been received here. This is a proposed content contract only, separate from the finite geometry/budget review. No runtime/save-schema change, NPC generation, country preset, new worker or authenticity claim is included.

Contemporary clothing, hairstyles and accessories may carry geographically relevant context. Local NPC presets should offer varied, referenced combinations rather than one representative national look. Players may receive optional suggestions, but travelling preserves their identity and chosen appearance; no country hard-locks skin colour, facial shape or ethnicity, and no physical trait is used to infer nationality.

## Proposed optional catalogue fields

| Field | Intended meaning / constraint |
| --- | --- |
| `contextMetadataVersion` | Explicit version for this optional catalogue metadata; do not silently change human save v2 or a geometry/fit contract |
| `contentId`, `contentRevision`, `assetPacketSha256` | Resolve the exact clothing/hair/accessory/preset content and its independent geometry/provenance packet |
| `locationContexts[]` | Each record references existing country ID and optional region/city IDs, with a plain-language relevance claim and linked evidence IDs. Resolve catalogue IDs before implementation; no invented boundary or city mapping |
| `clothingContext` | Documented occasion/use (for example everyday, work or ceremony), contemporary time range, and source-supported climate/season or setting relevance where useful. Leave unsupported values unknown; no universal national dress rule |
| `usageRole` | `npc-preset` or `optional-player-suggestion`; neither grants forced changes to player appearance |
| `variationGroup`, `compatibleContentIds` | Enable varied local combinations subject to actual mesh/fit compatibility and per-lane budgets. These are content choices, not ethnicity/physique constraints |
| `evidence[]` | Source ID/URL/title, publication or capture date, supported claim, geography/context, provenance/rights record, reuse scope and required attribution. Refer to the source registry; a cultural reference does not grant asset-extraction rights |
| `review` | `pending` / `needs-correction` / `reviewed`, evidence version, reviewer/context notes and limitations. Authenticity remains unclaimed until appropriate references and review exist |
| `suggestionPolicy` | Optional and user-controlled; preserve identity and selected appearance across travel. No automatic wardrobe/hair/skin/body/facial changes or country-specific complexion/ethnicity restrictions |

These are proposed descriptive names, not implemented TypeScript/JSON-schema fields. Region/city specificity and context confidence must follow the incoming evidence. Do not populate cultural claims from stereotypes or attach authenticity labels to the current prototype images. Source/provenance review, geometry compatibility, budgets and cultural review are independent gates.

Parent will reconcile the incoming brief into a bounded metadata revision. Existing human/skin/hair/wardrobe owners retain their asset scopes. The current corrected-eye/skin and complete-character cost blockers remain the immediate work; this metadata proposal does not expand fan-out or authorize more character builds.
