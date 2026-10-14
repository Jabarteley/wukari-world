import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "port-aux-francais",
  "name": "Port-aux-Français",
  "country": {
    "idISOlower": "tf",
    "name": "French S. Terr."
  },
  "state": {
    "idunique": "tf",
    "name": "Port-aux-Français"
  },
  "timezone": "Indian/Maldives",
  "centre": {
    "lon": 70.2199565,
    "lat": -49.3497607
  },
  "airport": {
    "id": "port-aux-francais-airport",
    "name": "Port-aux-Français Heliport",
    "lon": 70.22033,
    "lat": -49.35033,
    "sourceUrl": "https://ourairports.com/airports/TF-0002/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-france-taaf-261013.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    70.15094490173844,
    -49.39498092248349,
    70.28896809826155,
    -49.304540477516504
  ],
  "generatedLinkPolicy": "authored-only",
  "links": [
    {
      "to": "port-louis",
      "name": "Port Louis",
      "kind": "ship",
      "km": 3436
    },
    {
      "to": "cape-town",
      "name": "Cape Town",
      "kind": "charter",
      "km": 4529
    }
  ],
  "names": {
    "area": "Port-aux-Français",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
