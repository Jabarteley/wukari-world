# FUW entrance gameplay and approach repairs

Play now opens **Federal University Wukari — Entrance Area** in3D. Wukari town remains selectable through Map Information or Places. Source review is optional rather than the default destination.

The owner Google-pin report remains [9.777370,7.843357], WGS84, **unverified**. The starting position is **FUW candidate entrance — virtual gameplay position**, approximately12.53m from that report on a clearance-tested illustrative footway. This is not an official gate coordinate or verified real-world access. Original roads/footprints are unchanged; no campus boundary or anonymous building identity is inferred.

## Outward obstruction and approved bypass

OSM way673416541 intersects OSM building1523025373. This is a source-centerline conflict, rather than a projection or width-only defect. Overture transportation segment8a218d61-9e4b-47b7-a10a-9a495d89fdf9 repeats the same OSM geometry and therefore does not independently resolve it. Buildings1523025009/1523025373 are preserved at their original coordinates.

After explicit owner approval, `virtualRoads` contains a separately classified **illustrative gameplay bypass**, searched and rounded with at least5.3m footprint clearance. Negative node IDs identify virtual points; original OSM nodes, coordinates, tags and footprints remain in `roads`/`buildings`. This is not a newly discovered campus road. Cars/SUVs/motorcycles can enter and leave through the proposed portal using that connection; heavy vehicles cannot use the bypass. Original centerlines and conflict IDs remain visible in Geometry Review.

## Roads, walking and traffic

- Road surfaces have an illustrative6.2m maximum width and tarred appearance when source surface is unknown. Explicit surface tags retain their styling. Exact footprint clearance narrows/suppresses unsafe surfaces. White center markings are illustrative.
- Terracotta walking surfaces run on both sides where clearance permits. Explicit cross-road connections split their landing segments, so graph connectivity matches paving. Zebra bars are clipped to the rendered road envelope, work in east-west and north-south orientations, and remain gameplay scenery. They are omitted where geometry cannot support a connected crossing.
- Pedestrian components remain separated by genuine rejected intervals; paths do not bridge buildings or mapped barriers. The active network's roughly32.28km counts both-side segments and connectors across the vicinity, not32km of surveyed sidewalks or verified campus roads.
- Opposing traffic uses distinct right-hand lanes and continuous entry blending at bends. Oriented-body collision checks allow passing without intersection. Player yielding uses lane/body clearance, rather than a large circular exclusion that blocked vehicles beside the footway.
- Junction conflict-zone reservations keep vehicles waiting outside T-junctions. Vehicles prefer clear exits, heavy vehicles avoid approaches with no eligible onward route, and an ineligible heavy spawn cannot block the spawn queue. Persistent blocked vehicles fade/retire after a bounded wait; this is a lightweight simulation with recovery, not a guarantee of zero momentary queues or real traffic modeling.
- Pedestrians wait before entering a vehicle surface, while movement along crossing landings remains available. Vehicles and pedestrians retain separate networks.

## Proposed gate component

`src/wukari/play/entrance.ts` is original replaceable artwork, **not a faithful reconstruction**. Its arch, university sign, supports and daylight lamp details are illustrative. Supports clear original footprints and walk/vehicle envelopes; clear overhead passage exceeds5m. No unsupported gatehouse, faculty building or campus enclosure was fabricated. Firsthand GPS and properly licensed owner photographs/master plans remain needed for authentic placement/design.

## Review and launch

Run `npm run wukari:play`, then open http://127.0.0.1:5196/ and press Play. WASD/arrows walk, Shift sprints, drag/Q/E rotates, scroll zooms. Map Information offers Wukari town, Geometry overlay and Independent source overview. Customization/settings remain locally saved.

Source/license inventory and data offer: [Phase10B](../../data/wukari/phase10b/README.md). Gameplay derivative and regeneration: [Phase10C data](../../data/wukari/phase10c/README.md), [exact report](../../data/wukari/phase10c/report.json). OSM contributors/ODbL1.0 attribution is retained. Google screenshots were not traced; no new PBF download, database or economy change occurred.

Validation evidence is in `docs/wukari/evidence/phase10c-*`: original-source identity, exact road/building clearance, both-side crossing connectivity, keyboard movement, opposing gate-car passage, bounded junction recovery, browser desktop/mobile/destination tests and hardware measurements. Earlier failed browser controller/framing runs are historical, not current acceptance. Full-project TypeScript is not certified: its inherited failures/resource limitations remain outside the focused Wukari check. Build chunk-size advisory is retained.


## Measured results and visual evidence

- Full Wukari suite:81/81 passed; final junction/bypass follow-up:10/10 focused tests passed. Focused TypeScript exit0 and production build passed. Existing large-chunk warning remains. Full-project TypeScript was not rerun/certified.
- Final browser acceptance: default FUW, inward mapped turn, provenance/debug, mobile touch movement, town selection and FUW return passed, with zero runtime console errors. Actual browser captures were visually reviewed; desktop gate lettering, outward bypass, both-side paving and perpendicular white crossings are visible. Portrait framing still crops part of the long gate sign at normal follow view; orbit/zoom or desktop gives the full sign. It is not claimed as a faithful campus reconstruction.
- Intel HD620/ANGLE Direct3D11, Medium,1440x884/DPR1: **56.94FPS**, median16.7ms, **p95 21.6ms**,31of1140frames over33.3ms,6s warm-up plus20s foreground sample.16vehicles/10motorcycles, all16moving at sample end,944footprints,43draws,405,969triangles,35.33MB geometry buffers and10.16MB estimated textures. GPU timing/driver allocations are unavailable. CPU update2.38ms and render submission5.81ms are not GPU timings. Phone GPU performance and sustained thermal behavior are unmeasured.
- Earlier pre-bypass58.78FPS/p95 17ms sample is preserved as `phase10c-before-bypass-browser.json`; it does not describe the final scene. Phase9's56.68FPS/p95 17.4ms moving-camera view is a different workload; no like-for-like speedup is claimed.

[Desktop gate](evidence/phase10c-main-gate.png) ? [Outward bypass](evidence/phase10c-junction-1.png) ? [Inward turn/crossing](evidence/phase10c-mapped-turn.png) ? [Mobile](evidence/phase10c-mobile-play.png) ? [Geometry conflict overlay](evidence/phase10c-geometry.png) ? [Condensed actual-capture sequence](evidence/phase10c-gameplay.html) ? [Raw browser result](evidence/phase10c-browser.json).

The capture sequence is condensed from actual screencast frames with a final captured mapped-turn view; gaps are omitted, not synthesized. Earlier browser failures came from automated key-release acknowledgement delays, established by `phase10c-camera-audit.json`; independently scheduling release corrected the recorder. Historical failure evidence is retained rather than described as a passing final run.

Full-length traversal checks now also pass for cars entering and leaving through the entire bypass, not only passing directly under the portal. Earlier observer-range test failure was corrected to keep the test observer within the traffic simulation?s documented despawn range.
