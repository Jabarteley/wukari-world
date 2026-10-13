import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "majuro",
  "name": "Majuro",
  "country": {
    "idISOlower": "mh",
    "name": "Marshall Islands"
  },
  "state": {
    "idunique": "mh-majuro",
    "name": "Majuro"
  },
  "timezone": "Pacific/Tarawa",
  "centre": {
    "lon": 171.3816354,
    "lat": 7.0909924
  },
  "airport": {
    "id": "majuro-airport",
    "name": "Marshall Islands International Airport",
    "lon": 171.271656,
    "lat": 7.06511,
    "sourceUrl": "https://ourairports.com/airports/PKMJ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/marshall-islands-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    171.20051637022945,
    6.910111510066022,
    171.56275442977054,
    7.271873289933978
  ],
  "names": {
    "area": "Majuro",
    "unit": "starter play zone",
    "roadHub": "CMI Bus Stop"
  }
} satisfies DestinationFacts
