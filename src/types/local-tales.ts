/** Authored game fiction grounded in supported places. No executable copy templates. */
export interface LocalTale {
  title: string
  desire: 'belonging' | 'competence' | 'autonomy' | 'curiosity' | 'recognition' | 'care' | 'fairness' | 'continuity'
  chapters: readonly [{ title: string; text: string }, { title: string; text: string }, { title: string; text: string }, { title: string; text: string }]
  /** Practical work, observation, and a considerate solo/host route, in that order. */
  approaches: readonly [{ label: string; callback: string }, { label: string; callback: string }, { label: string; callback: string }]
  dilemma: { prompt: string; answers: readonly [string, string, string]; correct: 0 | 1 | 2; explanation: string }
  closing: string
  keepsake: { name: string; description: string }
}

export type LocalMissionTask = 'practical' | 'discovery' | 'host-visit' | 'practical-visit' | 'discovery-visit' | 'places' | 'people'
export interface LocalTaleMission {
  label: string
  /** Why this observed task matters to this particular fictional plot. */
  purpose: string
  task: LocalMissionTask
  count: 1 | 2 | 3 | 4
}
export interface LocalCityTales {
  cityId: string
  city: LocalTale
  country: LocalTale
  /** Each tuple is life, discovery, social. Reward rules stay in the mission engine. */
  missions: { daily: readonly [LocalTaleMission, LocalTaleMission, LocalTaleMission]; weekly: readonly [LocalTaleMission, LocalTaleMission, LocalTaleMission] }
}
export interface LocalCountryArc {
  countryId: string
  title: string
  premise: string
  collection: string
  rewardTitle: string
}
export interface AuthoredContentBatch { countries: readonly LocalCountryArc[]; cities: readonly LocalCityTales[] }
