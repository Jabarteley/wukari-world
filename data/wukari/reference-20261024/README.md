# FUW updated reference comparison — 24 October 2026

Owner Google Earth points are **reference reports**, not GPS surveys or independently verified entrances. Only supplied KML `Point` placemarks were compared. Camera `LookAt`, altitude, icons, network links and screenshot road/building/POI geometry were not imported. Original KML/photos/satellite images are not redistributed.

| Report | WGS84 [longitude,latitude] | Nearby original source geometry |
|---|---|---|
| Main gate | [9.777423952290516,7.843343595248542] |6.26m from OSM road673416541; inside anonymous building1523025009 |
| Second gate | [9.773531596768601,7.840040166545116] |12.37m from one-way road673416532;1.05m from anonymous building1523015612 |
| ICT | [9.771938702550473,7.842796064049926] |Inside building1523023150;90.14m from nearest mapped road673416538 |
| Earlier unnamed marker | [9.771962,7.8428172] |Inside the same anonymous building1523023150;3.47m from ICT report |

Distances are planar comparisons in the project's fixed9N spherical east/south metre frame, not accuracy estimates. Digit precision is not survey accuracy. Containment/proximity is not independent confirmation of building identity or access.

The updated main point is6.11m from the old Google pin. It is near the mapped approach but conflicts with a mapped footprint. **Do not relocate the virtual gate or spawn onto it.** Photo-guided gameplay uses a separately clearance-tested position about19.10m from this report; its approximate placement is not a surveyed entrance. The source conflict on road673416541/building1523025373 and approved illustrative bypass remain explicit.

The two unnamed OSM `barrier=entrance` nodes4719478984/4719478985 are not the owner's named gates by evidence. Nearest node4719478985 is306.82m from main and537.34m from second reports. Existing Overture transportation inherits OSM provenance here; agreement is not a separate survey. University-name Overture/Meta POIs are place records, not faculty/building or gate identities. No mapped source name establishes ICT, mosque or hall identity.

The mathematical original road graph connects nearest junction6306383698 to6306383685 in517.46m using673416541,673416543 and673416540. This is undirected shared-node connectivity, not a verified vehicle itinerary or pedestrian-access route. ICT still has an approximately90m unmapped final connection; do not invent a path from imagery.

**Smallest next playable section:** retain the existing gate scene and refine the first roughly100m of mapped approach/junction/branch673416543 toward node6306383692. This offers a source-backed turn without claiming the full gate-to-ICT connection. Keep ICT and second gate as review markers until firsthand access/identity evidence and continuous collision-free virtual footways are established. Review the exact route tags, named records, Overture feature IDs/provenance, nearby footprints and junctions in `comparison.json`.

**Needed firsthand observations:** main/second gate pedestrian thresholds and both sides of approach road, ICT's actual public doorway and a permitted walk track to the nearest mapped road, junction6306383698 and any unmapped wall/gap. Record WGS84 longitude/latitude, timestamp, phone accuracy, direction/facing and what exact point was measured. Aim for10+ stationary samples over30–60s with reported accuracy at most10–15m; report all readings/spread, never label phone accuracy as verified survey precision. No measurements while driving or in restricted areas.

**Needed original photographs:** main-gate front/inside/oblique views, both side passages with a familiar scale object, canopy/hinges/signage; a separate identified second-gate set; ICT doorway/sign plus surrounding corners and the allowed approach. Supply capture direction/date, GPS if available, the photographer's identity/permission to use, and main-versus-second identification. `gate.jfif` carries a PostUTMENews watermark, so ownership/redistribution permission is not inferred. Current gate art uses original meshes and lettering rather than copied pixels. The grass-island second-gate reference must not be treated as a surveyed main-gate roundabout.

Sources: unchanged Phase10B OSM/Overture extracts and their [license inventory](../phase10b/README.md), OSM contributors/ODbL1.0; Overture per-feature provenance/licenses retained in the source layer. Google Earth/Maps reference data is not an eligible replacement for open source roads or footprints. No original source record has been altered.
