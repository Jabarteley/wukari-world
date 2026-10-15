# Destination expansion evidence and handoff

Remote research date: 2026-10-15. Base `9af2e51e`; branch `codex/destination-expansion-20261015`. No deployment or PR. Parent integration thread `01a13d83-d0f7-72c5-a61f-051e50bdc0f8` is the sole release writer.

## Batch 001: three additional playable stops, six activities

| City / district / venue / spot | Researched | Implemented | Asset requested | Integrated | Deployed |
|---|---|---|---|---|---|
| lagos / lekki / canopy-walk / wildlife-stop | NCF habitat text; photo review pending | Two beta observations at existing gate anchor | Handoff below, pending parent acceptance | No | No |
| abuja / maitama / millennium-park / garden-bench | FCTA garden description; photo review pending | Sketch/rest at existing bench | Handoff below, pending parent acceptance | No | No |
| abuja / jabi / jabi-lake-park / picnic-lawn | Existing mapped venue; lake/park secondary text | Rest/sketch at existing lawn | Handoff below, pending parent acceptance | No | No |

These are navigable sublocations, not three new cities or finished art assets. No venue, housing, route, district or existing activity ID is changed. Activities are fictional beta gameplay, with no representation of actual admission prices, opening hours, services or guaranteed wildlife sightings. Notes identify stylised stops. Existing procedural geometry remains in use.

## Evidence and limits

- [NCF, Lekki Conservation Centre](https://ncfnigeria.org/lekki-conservation-centre-the-green-soul-of-lagos-metropolis/): operator describes swamp/tropical habitat, trees, wildlife and canopy access. Supports ground-level nature observation as an authored activity; does not establish a surveyed welcome-stop position or current wildlife population. Existing broad `Lekki` label is retained; it does not mean Lekki Phase 1. Photographs embedded on that page are reference candidates, not independently inspected in this batch.
- [FCTA, Millennium Park](https://www.fcta.gov.ng/ova_por/millennium-park-abuja/): identifies Maitama, rectilinear water axis, terraced vegetation and formal garden. Materials described include white travertine; fountain pools and red/yellow shrubs distinguish this from the swamp scene. The stop is an original composition, not a copied or surveyed bench. Do not infer today's fountain operation from promotional text.
- [Jabi Lake](https://en.wikipedia.org/wiki/Jabi_Lake): secondary evidence of reservoir and lakeside recreation, with underlying studies linked. Existing venue coordinate is retained from the repository's field-study reference; this work adds no invented shore/jetty coordinate. Exact lawn appearance awaits located photographs.
- [Freedom Park operator](https://www.freedomparklagos.com/about.php) and [contact](https://www.freedomparklagos.com/contact.php): Lagos Island / Hospital Road confirmed. No edits to its ID or runtime hours in this batch.
- Asset reference: `kromate/allworld-assets` HEAD `9a5999d28a8eaef5b8973529172c8816f2ae5676`, `scenes/runtime-nigeria-2026-10/batch-001/README.md`. Existing candidates are Broad Street frontage and National Mosque boulevard. Neither should be reused as conservation-centre or park identity. Near/far tiers are independent downloads; preserve manifest/hash/sidecar/rights contracts.

Direct shell retrieval of the FCTA photo page was blocked by HTTP proxy 403; the web text read succeeded. No newly retrieved photograph was visually accepted in this batch. No image pixels were saved to the repository or shipped as textures. Parent-supplied photo observations below remain explicitly attributed to parent.

## Blender contract: proposed original slices

Stable full key is `city/district/venue/spot`; district keys here match existing authored vocabulary and are not new administrative boundaries. Source IDs in JSON are authoritative. Source runtime anchor positions are game units. Proposed Blender coordinates are metres, Y-up; conversion is 1 metre = 1.4 game units, matching Nigeria host convention. This is a **proposed art adapter**, not an already wired scale change. Preserve existing game anchor positions exactly when integrating, or submit a new tested host adapter. No geodetic accuracy is claimed for slice bounds.

Each proposed slice: bounds x/z `[-12,-10,12,10]` metres; floor at y=0; south entrance `(0,0,9)`; at least 1.5m clear continuous path from entrance to each activity; player clearance radius >=0.4m. Include return routes. Exclude water, planting beds, walls and props from walkable union. Elevated canopy access is outside this ground-level slice; retain the existing raised walkway and approaches when replacing the full venue. Do not move furniture or housing anchors. Do not put a new full-venue model over the old colliders.

| Slice ID | Existing runtime activity anchor (x,z) | Proposed metric target (x,y,z) | Visual acceptance |
|---|---|---|---|
| lagos-lekki-canopy-ground-01 | gate (-9.6,-1.4) | (-6.857143,0,-1) | Dense broadleaf/swamp setting, shaded ground-level timber path; no urban commercial facade. Rail/collision protects wet margins. No species promise, animal feeding prop or invented surveyed entrance. |
| abuja-maitama-millennium-bench-01 | bench (6.2,-2.1) | (4.428571,0,-1.5) | Formal pale paved walk, water-axis hint, planted lawn and shrubs; terraces beyond. Keep activity approach level. Fountain spray optional, not a claim of current operation. |
| abuja-jabi-lawn-01 | lawn (-6.4,5.4) | (-4.571429,0,3.857143) | Lakeside lawn and shore-facing open view. Water outside walk region; shoreline architecture/landing shape remain provisional until photo review. |

Proposed per-slice ceilings: near <=6,000 triangles / 30 draw calls; far <=2,000 triangles / 12 draw calls; textures <=1024 square, shared original/CC0 materials. These are production requests, **not acceptance of total host cost**. Integrator must measure scene+hero+crowd against unchanged repo budgets, single tier resident, no duplicate near/far or old/new full scene, disposal and reentry. Require near/far GLB, SHA256 manifest, metre bounds, entrance/anchor sidecar, collision and walkable polygons, provenance, offline day/night front and reverse views; real host day/night captures and all action/return routes before visual completion.

Weather/transport/nightlife: no current weather simulation, transport route or nightlife change in this batch. Lagos wetland identity must differ from inland Abuja garden/lake composition. Rain sheen, seasonal dryness and nighttime lighting require explicit artistic assumptions, never inferred present-day conditions. Further district work must research these categories independently rather than copy a single Nigerian template.

## Parent photo brief retained for next batches

- Ibadan Mapo: parent inspected [31 July 2024 aerial](https://commons.wikimedia.org/wiki/File:Aerial_view_of_Mapo_Hall_in_ibadan_city.jpg): dense irregular brown/red low-rise roofs, blue hall roof, pale colonnade, stepped forecourt, pocket broadleaf trees. [Dugbe reference](https://retna.io/photos/dugbe-iyana-eleyele-ibadan-3iJuV3), published 2 May 2023, capture unknown: wider commercial street, upper galleries, signs, umbrellas, curb, wires. Keep Mapo and Dugbe distinct; do not imply adjacent buildings. Existing roster separately names Mapo, Dugbe, Bodija and UI.
- Kano: parent inspected [Kurmi shop bays](https://www.rumbunilimi.com.ng/hotuna/Kasuwar%20Kurmi%20Rumfa.jpg): arches, flat parapet, projecting piers, ochre wall material, thresholds, sandy lane, handcart and shade tree. Date metadata unconfirmed. [21 February 2024 Kofar Kudu](https://commons.wikimedia.org/wiki/File:Kofar_Kudu,_Emirs_Palace_Kano.jpg): red tower/wings, cream pointed trim, green doors/base, barrier and planting. Market and palace are separate. [Kabuga demolition report, 24 March 2024](https://trustradio.com.ng/en/kano-residents-yearn-for-return-of-1000-year-old-kofar-mata/); no reconstruction verified. Existing venue already says Historic Site; do not add an intact gate on that evidence.
- Port Harcourt: parent inspected [20 April 2024 Nembe Waterside boat view](https://commons.wikimedia.org/wiki/File:Flirts_of_Boat_in_Nembe_Waterside,_Port_Harcourt_transporting_people_from_Port_Harcourt_to_Bonny_Island_9.jpg), viewpoint 4.741350,7.028842: narrow painted open motorboats, transverse benches, outboards, ropes, opaque grey-brown water. Crop proves neither bank nor buildings. [2021 terminal report](https://www.channelstv.com/2021/01/10/wike-warns-against-criminal-activities-around-bonny-bille-nembe-jetty/) documents remodelled terminal. Existing IDs `bonny-jetty` and `okrika-jetty` must remain separate; Bonny/Nembe Waterside is neither Bonny Island nor Nembe town. Okrika geometry unverified.

## Roster audit / next work

Catalogue generator discovers modules and preserves row order; current roster remains 284. Shanghai exists; Beijing absent. No roster-count increase is claimed.

Priority follow-on: validate Ibadan/Kano/Port Harcourt existing scene treatment against parent's photographs, then Accra and Nairobi. Inspection flags (not corrections yet): Accra labels University of Ghana `East Legon`, Memorial Park `James Town`, Makola `Adabraka`; Nairobi labels City Market and university main campus `Upper Hill`. These need primary-source district validation before changing labels. Preserve existing IDs and verify administrative-versus-neighbourhood meaning. Everyday compounds, transport, street layouts and nightlife remain research tasks; generic scenery is not evidence of completion.

## Verification receipt

- `npm run typecheck` with 3584 MB heap: five projects, zero errors.
- `node --experimental-strip-types --test src/scene/destination-expansion.test.ts`: 3/3; all three new stops reachable from entrance and back, unique activity IDs, no cash rewards, explicit beta flags.
- Abuja contract + placement + FCT scene suite: 7/8. Contracts, mapped dry-land/council placement, all venue/spot navigation and scene budgets pass. The unrelated `no two Abuja scenes are the same scene` test fails because `office/fct-campus-court` equals `market/fct-lockups` in triangle count. Exact same failure reproduced at clean base `9af2e51e` in a detached remote worktree. No test disabled or assertion weakened.
- Housing runtime 4/4; Abuja journey 3/3 (including Lagos–Abuja character and both homes preservation); generated links 7/7 (all open-city reachability, positive/symmetric fares, route constraints).
- Catalogue `--check` passes; progression `--check` passes 284 cities / 243 country identities. Generated story seeds unchanged; coverage source fingerprints refreshed.
- `npm run cities:assets` regenerates content manifest for 284 cities; only Lagos/Abuja payload rows differ.
- Baseline comparison `preservation.json`: all 274 existing Lagos and 33 existing Abuja activities, every existing spot and default spot order, all housing definitions, coordinates and local routes unchanged.
- `git diff --check` passes.

No full production build, hosted CI, browser screenshot, live deployment or visual art acceptance is claimed. The release owner must run normal build/download-size gates and browser interaction checks before serialized integration/release. New gameplay data increases the two city payloads; unchanged geometry does not establish unchanged startup bytes.
