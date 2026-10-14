// The two accepted country dataset sources (README-batch.md "Pinned extract mirror"). Both name the snapshot as -YYMMDD in the file name.
// 1. A dated official Geofabrik country or region file.
// 2. A pinned mirror copy of a small extract that Geofabrik does not publish (an undated download.openstreetmap.fr file): an asset of an
//    `extracts-YYYYMMDD` release of the public kromate/joinallworld repository. Nothing else: no other host, repository, tag form or query.
// The Python copies (bootstrap/metadata.py, bootstrap/country-boundary.py, offline-extract.py) are kept equal by bootstrap/test_dataset_url.py.
export const GEOFABRIK_DATASET_URL = /^https:\/\/download\.geofabrik\.de\/(?:[a-z0-9-]+\/)*[a-z0-9-]+-([0-9]{6})\.osm\.pbf$/;
export const MIRROR_DATASET_URL = /^https:\/\/github\.com\/kromate\/joinallworld\/releases\/download\/extracts-[0-9]{8}\/[a-z0-9]+(?:-[a-z0-9]+)*-([0-9]{6})\.osm\.pbf$/;

/** The YYMMDD snapshot of an accepted dataset URL, or null when the URL is neither a dated Geofabrik file nor a pinned mirror asset. */
export function datasetUrlSnapshot(url) {
  if (typeof url !== 'string') return null;
  const match = GEOFABRIK_DATASET_URL.exec(url) ?? MIRROR_DATASET_URL.exec(url);
  return match ? match[1] : null;
}

export const isMirrorDatasetUrl = url => typeof url === 'string' && MIRROR_DATASET_URL.test(url);
