import type { JourneyDefinition } from '../../types/journeys.ts'

const geography = { countryId: 'ng', cityId: 'lagos', venueId: 'unilag' } as const

/** Finite authored collection; adding a country requires an explicit reviewed definition. */
export const AKOKA_CHAPTERS: JourneyDefinition = {
  id: 'ng:lagos:akoka-chapters', version: 1, name: 'Akoka chapters', title: 'Friend of Akoka', geography,
  members: [
    { id: 'hostel-hustle-memento', title: 'Hostel Hustle keepsake', criterion: 'Complete Hostel Hustle.', source: { kind: 'episode', id: 'hostel-hustle', version: 1 } },
    { id: 'the-quiet-hours-memento', title: 'Quiet Hours bookmark', criterion: 'Complete The Quiet Hours.', source: { kind: 'episode', id: 'the-quiet-hours', version: 1 } },
    { id: 'akoka-games-night', title: 'Akoka Welcome Pennant', criterion: 'Complete the Akoka games night project occurrence.', source: { kind: 'project', id: 'akoka-games-night', occurrence: 'akoka-games-night:v1:pilot' } },
    { id: 'unilag-reading-corner', title: 'Reading Corner bookmark', criterion: 'Complete the UNILAG reading corner project occurrence.', source: { kind: 'project', id: 'unilag-reading-corner', occurrence: 'unilag-reading-corner:v1:pilot' } },
  ],
}

export const JOURNEYS: readonly JourneyDefinition[] = Object.freeze([AKOKA_CHAPTERS])
