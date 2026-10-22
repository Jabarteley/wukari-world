# FUW entrance-area virtual gameplay derivative

Candidate WGS84 [9.777370,7.843357] is an owner-supplied Google Maps pin, not independent GPS or surveyed gate coordinates. No Google imagery or geometry was traced. The campus boundary, actual access, gate design and anonymous building identities remain unknown.

The additive `fuw-play.json` retains every original coordinate, node ID, tag and footprint from Phase10B `fuw-osm.json`. See [Phase10B source/license inventory](../phase10b/README.md). OSM contributors, ODbL1.0, Geofabrik snapshot19October2026. Overture/Microsoft remain separately reviewable comparison layers; no machine footprint is silently assigned to a university building.

The default gameplay position is **FUW candidate entrance — virtual gameplay position**, on a clearance-tested illustrative 1.7m pedestrian corridor, approximately12.53m from the supplied pin. Its connected component follows independently mapped ways673416541 and673416542 for approximately32km including both sides and cross-road links. It faces the mapped inward approach. This establishes virtual play eligibility, not real-world pedestrian safety or legal access.

Road surfaces use an illustrative maximum6.2m total width, narrowing or disappearing where original footprints conflict. Original centerlines never move. Eligible wide segments use right-hand traffic offsets; lane changes blend continuously through shared source nodes and vehicles yield at junctions. Narrow segments remain single-file and exclude heavy vehicles. No surveyed widths, road surfacing or official lane design are claimed.

The original replaceable `entrance.ts` component is **proposed artistic representation**, approximately15.25m from the candidate along the mapped approach. Supports have building/road/pedestrian clearance; passage overhead is5.1m. It is not a faithful FUW gate model. No gatehouse, invented faculty building or campus wall was added. Authentic owner photographs and firsthand GPS would permit later replacement.

Generate: `node scripts/wukari/prepare-fuw10c.ts`. Launch: `npm run wukari:play`, http://127.0.0.1:5196/. Play starts FUW; Map Information offers Wukari town and independent source overview. WASD/arrows walk, Shift sprint, drag/Q/E look, scroll zoom. Source review remains available without covering Play.

`report.json` records candidate/spawn/portal positions, original-source hash, network and every source/illustrative-width conflict. Rejected pedestrian intervals are gaps; no paths cross buildings. Original source records remain untouched.

Owner follow-up authorized a clearly illustrative virtual bypass after OSM way673416541 was confirmed to intersect building1523025373. Overture segment8a218d61-9e4b-47b7-a10a-9a495d89fdf9 repeats that OSM geometry and does not resolve it. The bypass is a separate virtualRoads derivative with negative virtual node IDs, exact footprint-clearance checks and original GIS records preserved. Cars/SUVs/motorcycles can use it; heavy vehicles are excluded. Both-side terracotta pedestrian paving and perpendicular zebra crossings are illustrative gameplay styling. No real tar/sidewalk/crossing survey is claimed.
