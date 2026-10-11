import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "windhoek",
  "name": "Windhoek",
  "country": { "idISOlower": "na", "name": "Namibia" },
  "state": { "idunique": "na-windhoek", "name": "Windhoek" },
  "timezone": "Africa/Windhoek",
  "centre": { "lon": 17.0772739, "lat": -22.5776104 },
  "airport": {
    "id": "windhoek-airport",
    "name": "Hosea Kutako International Airport",
    "lon": 17.470277777777778,
    "lat": -22.481111111111108,
    "sourceUrl": "https://ncaa.com.na/publications/aeronautical-information/aeronautical-information-publication/aip-supplement/S04_2025%20FYWH%20AD.pdf"
  },
  "sourceLabel": "OpenStreetMap contributors via the Overpass interpreter and Namibia Civil Aviation Authority",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0",
  "bounds": [16.95, -22.68, 17.51, -22.45],
  "coverageNote": "Windhoek from the mapped built-up land around the city centre and its route toward Hosea Kutako International Airport: a sketch of the built-up extent traced from mapped land use, mapped inland water, main roads and named places from OpenStreetMap. The airport point is an aviation reference point, not an airport boundary or evidence of current schedules. Visitor services and homes are fictional game content set at the real named places.",
  "names": { "area": "Windhoek", "unit": "district", "roadHub": "Windhoek Central Bus Station" }
} satisfies DestinationFacts
