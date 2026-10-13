# Lagos source intake, reviewed 13 October 2026

This lane owns only `docs/agent-plans/cloud-lanes/source-provenance/` on
`codex/cloud-source-provenance-20261013`. Baseline:
`81d9f599d87dfb34adf49cd9337a0b05678e5e0d`. Coordinator documents were read at
`6c2885d15d38b9d64501f14d467db9d5c01573b2`. Existing WORLD/GRAPHICS/LIVING and
Blender ownership remains in place; the parent owns integration and launches.

These are source-family findings, not approval of an acquired Lagos asset.
No imagery, tiles, elevation raster, map extract or paid data was downloaded.
Official pages were read through the web tool. No upstream document hash is
claimed: the tool exposes extracted text, not immutable response bytes.

| Candidate | Official evidence and finding | Outstanding admission work |
| --- | --- | --- |
| OSM vectors | [OSM copyright](https://www.openstreetmap.org/copyright), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/): attribution and database share-alike obligations apply. A produced work and a derivative database have different obligations. | Pin bounded extract bytes, timestamp, object IDs/versions, full license and notices; classify the derived database/produced work and arrange any required database offer. OSM data terms do not license arbitrary imagery or unrestricted tile-server downloading. |
| Overture buildings / transportation | [Theme licensing](https://docs.overturemaps.org/attribution/): both themes are ODbL. Buildings also carries upstream contributor notices; transportation identifies OSM and TomTom. [Building schema](https://docs.overturemaps.org/schema/reference/buildings/building/) was v2.0.0 when inspected. | Pin a release, schema and actual selected records, preserving field-level source metadata and applicable contributor notices. Never label the whole product CDLA Permissive. An ML footprint is not a surveyed facade/height. |
| Copernicus DEM GLO-30/GLO-90 | [Official collection and citation rules](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM): global 30/90 m products have a free license, with distinct notices for redistributed and modified data. This is a surface model, including vegetation/buildings, not kerb survey. | Retain applicable full license/annex, exact notice, release, geocell, vertical datum and bytes. EEA-10 has different eligibility. [AWS distributor](https://registry.opendata.aws/copernicus-dem/) describes a 2021 mirror; do not equate it with the official collection's newer release. |
| Sentinel-2 imagery | [Sentinel legal notice](https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice) permits lawful reproduction, distribution and modification, requiring source/year notices. [Product page](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2) gives 10/20/60 m bands. | Pin product ID, sensing time/year, band/processing level, masks, bytes and full notice. Suitable regional context does not resolve facade/kerb detail. [Portal terms](https://dataspace.copernicus.eu/terms-and-conditions) distinguish Sentinel data from other portal materials: screenshot/basemap rights are not inherited from Sentinel. |
| SRTM alternative | Official USGS/LP DAAC product and NASA Earthdata pages could not be retrieved in this environment (web errors/403; shell request also refused). | Rights remain unresolved in this registry. No memory-based public-domain approval, tile download or fallback mirror assumed. A future owner must retrieve the exact product's rights and citation policy. |
| Original survey / photographs | No photographer, surveyor, survey, photograph or permission document has been supplied. | Establish authorship and an explicit grant for geometry extraction, textures and redistribution; address applicable third-party interests. Authored assumptions remain labeled. |
| Google Maps imagery / Photorealistic 3D Tiles | [Platform terms §3.2.3](https://cloud.google.com/maps-platform/terms) prohibit scraping and creating content from Maps content. [Map Tiles policies](https://developers.google.com/maps/documentation/tile/policies) distinguish visualization from extraction/offline uses and require attribution/cache compliance. [3D Tiles documentation](https://developers.google.com/maps/documentation/tile/3d-tiles) describes runtime rendering. | Excluded from reusable geometry/textures and offline bundles. A separately authorized runtime API display would need applicable account/region terms, attribution and caching review; no account, key, payment or API request was made here. Google's separately licensed Open Buildings data listed by Overture is not Maps imagery/3D Tiles. |

## Decision for the first fixture

Use an original, tiny synthetic geometry record with a retained copy of the
repository's AGPL-3.0 license and measured **synthetic local** dimensions. Its
estimated height and authored facade are explicit. It is not a real Lagos block,
field measurement, accepted source extract or production asset. External source
families stay quarantined until per-input evidence is supplied.

A validator can enforce pins, completeness, known source policy, attribution and
honest labels; it cannot establish that a submitter owns an asset or that an
invented measurement is true. Parent review remains necessary for admission.
