// WHERE THIS PAGE STANDS, when it is not where the life is: the Square, or the room of a group chat (src/places/model.ts).
// Kept apart from the places store (placesStore.ts, fetched when a place is first opened) because the room socket, the scene
// and the HUD all read it from the first frame: this file is a few lines and names no rule.
import { shallowRef } from 'vue'
import type { CommunityRoom } from '../../../types/community.ts'
import type { PlacePerson } from '../../../types/places.ts'

export type PlaceNow = { kind: 'square' } | { kind: 'room'; id: string; name: string }
/** Null: the page shows the venue the life is in (or a home being visited). */
export const placeNow = shallowRef<PlaceNow | null>(null)
/** The room the socket is asked for while standing in a place. */
export const placeRoom = (now: PlaceNow | null): CommunityRoom | null => (now === null ? null
  : now.kind === 'square' ? { cityId: 'world', venueId: 'square', place: 'square', label: 'The Square' }
    : { cityId: 'world', venueId: 'room', place: 'room', roomId: now.id, label: now.name })
/** The other people standing in the place, as the server last listed them (placesStore.ts keeps it fresh): what the scene draws. */
export const placePeople = shallowRef<readonly PlacePerson[]>([])
/** The Square is drawn as this venue, for everybody: one scene, so where someone stands means the same on every screen. */
export const SQUARE_SCENE = Object.freeze({ city: 'lagos', venue: 'park' })
