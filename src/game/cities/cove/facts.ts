import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "cove",
  "name": "Atlas Cove Station",
  "country": {
    "idISOlower": "hm",
    "name": "Heard Island & McDonald Islands"
  },
  "state": {
    "idunique": "hm",
    "name": "Atlas Cove Station"
  },
  "timezone": "Etc/GMT-5",
  "centre": {
    "lon": 73.3934601,
    "lat": -53.0190019
  },
  "airport": {
    "id": "cove-airport",
    "name": "Atlas Cove Station Helipad",
    "lon": 73.39349,
    "lat": -53.01885,
    "sourceUrl": "https://ourairports.com/airports/AU-0178/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/australia/heard-mcdonald-261013.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    73.24381350822969,
    -53.109442344966986,
    73.5431066917703,
    -52.92856145503301
  ],
  "generatedLinkPolicy": "authored-only",
  "links": [
    {
      "to": "port-louis",
      "name": "Port Louis",
      "kind": "ship",
      "km": 3900
    },
    {
      "to": "cape-town",
      "name": "Cape Town",
      "kind": "charter",
      "km": 4772
    }
  ],
  "names": {
    "area": "Atlas Cove Station",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
