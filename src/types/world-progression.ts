/** Build-time reviewed references to existing game content, never claims about real people or services. */
export interface WorldStoryActivity {
  venue: string
  venueName: string
  spot: string
  id: string
  label: string
}

export interface WorldStorySeed {
  cityId: string
  cityName: string
  countryId: string
  countryName: string
  host: { id: string; name: string; venue: string; venueName: string }
  practical: WorldStoryActivity
  discovery: WorldStoryActivity
  /** Existing guide prose, retained as game context rather than newly asserted local history. */
  placeLine: string
}
