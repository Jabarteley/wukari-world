import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "ouagadougou",
  "name": "Ouagadougou",
  "country": {
    "idISOlower": "bf",
    "name": "Burkina Faso"
  },
  "state": {
    "idunique": "bf-ouagadougou",
    "name": "Ouagadougou"
  },
  "timezone": "Africa/Ouagadougou",
  "centre": {
    "lon": -1.53,
    "lat": 12.37
  },
  "airport": {
    "id": "ouagadougou-airport",
    "name": "Ouagadougou Thomas Sankara International Airport",
    "lon": -1.51242,
    "lat": 12.3532,
    "sourceUrl": "https://ourairports.com/airports/DFFD/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    -1.64,
    12.27,
    -1.41,
    12.47
  ],
  "coverageNote": "Ouagadougou: a sketch of the built-up extent traced from mapped land use (not an administrative boundary), mapped inland water, main roads and named places mapped in OpenStreetMap. The airport coordinates are an OurAirports dataset point, not an official reference point or evidence of current operations or schedules. Visitor services and homes are fictional game content set at the real named places.",
  "names": {
    "area": "Ouagadougou",
    "unit": "district",
    "roadHub": "Gare Routière Ouaga-Inter"
  }
} satisfies DestinationFacts
