# Batch 002 — distinct stops in Ibadan, Kano and Port Harcourt

Reconciled with main `bc113b55` and content owner `01a13bea-138b-7b91-ac44-c49bc3d836ec`'s completed handoff. Source authors are released in that record; parent relay requested for unpublished overlap. No city venue overlap appeared in main. This is additive content, not a new district boundary or completed art asset. No housing internals changed.

## Implemented IDs and geography

| City | Existing venue / new stop | New activities | Geographic distinction |
|---|---|---|---|
| Ibadan | `mapo-hall/terrace` | `ibadan-mapo-roofscape`, `ibadan-mapo-colonnade` | Hilltop civic forecourt and irregular roofscape; keep separate from the Dugbe shopping streets. |
| Ibadan | `dugbe-market/pavement` | `ibadan-dugbe-frontages`, `ibadan-dugbe-street-rhythm` | Wider commercial frontage, signs and trader activity; not Mapo's colonnade and not Bodija/UI. |
| Kano | `palace/outer-court` | `kano-kudu-facade`, `kano-kudu-forecourt` | Public exterior observation of Kofar Kudu; no palace-interior access. |
| Kano | `kurmi-market/market-crossing` | `kano-kurmi-shop-bays`, `kano-kurmi-handcarts` | Small shop bays and shaded market crossing; distinct from palace monumentality. |
| Port Harcourt | `bonny-jetty/boat-observation` | `ph-nembe-outboards`, `ph-nembe-loading` | Land-side waterside stop; no new boat route, timetable, surveyed landing or bank is asserted. |

Existing mapped venue coordinates and administrative labels are unchanged. Ibadan map/travel and Kano/Port Harcourt placement tests validate their existing projected geography. District identity is deliberately separate from housing registration: Mapo and Creek Road waterside are locality keys for this art handoff, **not existing housing district IDs**. Do not add them to housing rules as part of art integration. The real `dugbe` and `kano-municipal` rule IDs are retained in the machine-readable handoff. The source already separates Mapo/Dugbe/Bodija/UI, the palace/Kurmi, and Bonny/Okrika/Trans-Amadi/GRA.

## Research provenance and visual direction

Reuse the parent's actual photo inspection (not a new independent image inspection by this worker):

- [Mapo aerial, 31 July 2024](https://commons.wikimedia.org/wiki/File:Aerial_view_of_Mapo_Hall_in_ibadan_city.jpg): parent observed blue main roof, pale colonnade, stepped forecourt, dense brown/red pitched roofs and pocket broadleaf trees. Existing procedural `hill-hall` instead uses rust roofs and an invented clock-tower composition. **Do not call that a photo-matched replica.** Replacement should prioritize the observed silhouette/roof/forecourt; tower details require direct confirmation. The existing terrace anchor is a gameplay composition, not a surveyed overlook.
- [Dugbe street](https://retna.io/photos/dugbe-iyana-eleyele-ibadan-3iJuV3), published 2 May 2023, capture date unknown: parent observed two/three-level commercial frontages, galleries, layered signs, umbrellas, wires and curb. Use original fictional shop signage. Street traffic remains visual reference, not new road simulation or an inferred timetable.
- [Kurmi bays](https://www.rumbunilimi.com.ng/hotuna/Kasuwar%20Kurmi%20Rumfa.jpg): parent observed low arched bays, flat parapet, projecting piers, ochre surfaces, raised thresholds, sandy lane, handcart and tree shade. Exact material composition and capture date unverified. Existing market scenery provides original craft props; do not infer the contents or ownership of specific photographed shops.
- [Kofar Kudu, 21 February 2024](https://commons.wikimedia.org/wiki/File:Kofar_Kudu,_Emirs_Palace_Kano.jpg): parent observed red central tower/lower wings, cream pointed-arch trim, green doors/base, barrier and planting. Existing generalized earth-wall palace scene is not accepted as a matching reconstruction. Preserve exterior-only movement and blocked gate. Everyday Kano compounds are a separate future brief; palace/market motifs are not a template for every home.
- [Nembe boats, 20 April 2024](https://commons.wikimedia.org/wiki/File:Flirts_of_Boat_in_Nembe_Waterside,_Port_Harcourt_transporting_people_from_Port_Harcourt_to_Bonny_Island_9.jpg): parent observed painted narrow open motorboats, transverse benches, ropes and outboards on opaque grey-brown water. The image viewpoint (lon 7.028842, lat 4.741350) is about 1.9 km from the current terminal point (7.0247212, 4.7576372). **Boat detail evidence does not validate the terminal marker, bank or buildings.** Preserve the mapped marker pending stronger evidence; do not relocate to the photograph. [Channels' 2021 terminal report](https://www.channelstv.com/2021/01/10/wike-warns-against-criminal-activities-around-bonny-bille-nembe-jetty/) supports the remodelled terminal identity, not an exact plan. Bonny/Nembe Waterside is neither Bonny Island nor Nembe town. Okrika landing geometry remains unverified and unchanged.
- [Kabuga demolition report, 24 March 2024](https://trustradio.com.ng/en/kano-residents-yearn-for-return-of-1000-year-old-kofar-mata/): no verified reconstruction. Existing `kofar-kabuga` is already a historic-site variant; no intact replacement gate is introduced.

These photographs remain reference links only. No pixels, copyrighted signs or textures are redistributed. Capture-date uncertainty and original-layout inferences remain explicit. Nightlife, seasonal weather and transport activity require separate evidence; this batch does not infer current services, rain or event schedules from daytime photographs.

## Blender request and acceptance

`batch002-handoff.json` contains five stable asset-request IDs, city/locality/venue/spot/activity IDs, proposed metric bounds, entrances, host-anchor conversion and near/far budgets. All five are **proposed requests**, not evidence that production has begun. Art state: researched via parent / implemented as gameplay stops / proposed asset request / not integrated / not deployed.

All slices are original 24m × 20m compositions, Y-up, 1m → 1.4 host units. These new bounds are design proposals, not survey measurements. Keep exact host anchor positions unless an independently tested adapter is supplied. Maintain 1.5m-wide continuous entrance/activity/return paths with >=0.4m radius clearance. Block raised shop thresholds, water edges, piers, walls and planted beds appropriately; never expand a walkable rectangle across unsupported water. Do not combine Mapo with Dugbe, palace with Kurmi, or Okrika with the city terminal as one continuous street.

Proposed slice limits: near6k triangles/30draws; far2k/12draws; <=1024 textures, original/CC0 material sources. Integrator still must check complete host+hero+crowd totals against unchanged repo limits, release bytes, correct Y support, camera views, every activity approach/return, lifecycle/reentry and single-tier residency. Require original/cleared materials, hash-bound near/far GLBs, bounds/entrance/action/collision/navigation sidecars, daylight/night offline views and actual host captures. Do not overlay full new geometry on old colliders.

## Verification so far

- 8/8 focused stop tests cover both batches, unique IDs, approach/return paths, 16 actual engine activity starts/completions and unchanged estate state.
- Ibadan/Kano/Port Harcourt city contracts:12/12. Map/travel/journey/placement/outing regressions:21/21, including preserved Lagos–Rivers flight/boat/return character and homes.
- Baseline comparison: `preservation-batch002.json` proves all408 existing activities, existing spots/default order, coordinates, housing definitions and local boat routes unchanged across five cities.
- Full typecheck/build/download/browser results are recorded in the verification receipt after completion. Browser harness uses real production VenueHost and real pointer/touch events with synthetic accepted activity state; engine checks separately prove actual dispatch/completion. It is not a full application/HTTP journey or real-phone performance measurement.

No standalone deployment or competing main write. Parent integration owner receives tested source commits and this handoff.
