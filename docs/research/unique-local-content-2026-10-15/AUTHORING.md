# Local tale authoring contract

Read the assigned input-NN.json and src/types/local-tales.ts. Each worker owns one batch-NN.ts and its own docs/agent-work record. Export default a literal object with countries and cities, contextually typed AuthoredContentBatch. Import type from ../../../types/local-tales.ts. Do not edit shared types, registry, other batches, city source, tests or Git state.

## What to write

Every assigned country gets one explicit LocalCountryArc: exact countryId, distinctive arc title, premise, collection name and earned title. Every assigned city gets two separate LocalTale objects, city and country. The city tale has a locally anchored conflict. The country tale is a distinct local installment of that country's arc, linked in spirit without reusing the city tale or another city's plot. Multi-city countries share the arc, not dialogue or dilemmas. Six mission entries per city form daily and weekly life/discovery/social tuples. All assigned cities and countries must appear exactly once.

Each tale contains four titled chapters, three approach labels with distinct remembered callbacks, one central dilemma with three plausible answers and a correct index/explanation, a resolved closing, a specific keepsake and its description, and its strongest fundamental human desire. Target roughly180–260words per tale. Chapters should make the constraint and stakes clear. Do not make wrong answers cartoonish; the intended answer follows the explicit story situation, not a moral stereotype or obscure trivia. Spread intended answers across all three positions.

Literal authored data only. No shared prose function, string interpolation, rotating title/plot arrays, city-name replacement, generic welcome/handover plots, filler tokens or placeholders. Do not write the same plot with different props. Titles, opening conflicts, dilemmas, outcomes and keepsakes must differ in meaning. Human desires are universal, never descriptions of national character.

## Grounding and facts

These are fictional game stories. Hosts are game NPCs. Use actual names/places in existingStoryReferences, with at least one meaningful place/action anchor in each tale. Additional registered places can be narrative context, but only the two seed activities and host are wired proof destinations. Never invent a real historical event, festival, official practice, real person's biography or service guarantee. Do not assume airport/statehouse game tasks are real services. Medical/worship/crisis content is outside scope. If adding a factual claim beyond the brief, verify it with a primary source using web tools and record the exact URL; otherwise keep it plainly fictional. No need to add factual claims to make a good story.

The engine proves completed activities, NPC conversation when available, and authored decisions. It does not prove that players physically built, delivered, bought, collected or changed something in the world. Fictional characters, props and events may act and resolve through the authored story decisions; they do not create actual inventory or world mutations. The supported activity proves the player’s effort, while the authored decision resolves the fictional event. Use lively mysteries, comedy, performances, friendly competitions, practical puzzles and personal stakes. Do not reduce every plot to editing a document. At most two tales per batch may center on maps, boards, notes, labels, drafts or publication. A different prop alone does not make a different plot. All three approaches work: practical activity, discovery activity, and conversation or practical-activity note while host is asleep. The final quiet-support route always works after the authored dilemma. No forced multi-human or paid/online-model dependency.

## Mission rules

Each LocalTaleMission has a bespoke label and purpose grounded in one of that city's two plots, task and count. Hints are assembled from the exact real action, then the authored purpose. Do not claim unsupported actions.

- practical / discovery: complete the corresponding exact seed activity, count1–3.
- host-visit / practical-visit / discovery-visit: visit that actual venue, count1 only.
- places: distinct supported venues, count2or3.
- people: distinct game regulars, count2–4.

Each tuple order is life,discovery,social. Life should use practical/discovery; discovery should use a visit or places. Social may use people or a practical/discovery preparation task relevant to the fictional social aim. Vary valid task combinations/counts across cities instead of imposing identical chores. Daily and weekly labels must be distinct and meaningful. No money, reward amounts, extra proof language, new venues or event types in this data.

## Output and review

Write one complete typed batch file, in manageable literal chunks if necessary. Temporary serialization scripts may format explicit authored records but must not generate plots or substitute city names into templates. No nested agents, browser work, CI/build, services, Git mutations or deployment. Run only a cheap syntax/import validation if needed. Record requested Luna/medium, source and exact assigned counts, gaps and primary sources if used; costs/tokens unknown. Parent will enforce coverage, normalized duplication, references, types, save compatibility and gameplay checks. Escalate missing grounding rather than inventing it. Do not mark a batch complete while any record is missing.
