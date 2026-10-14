/**
 * OWNER: social
 * PLACES: the wire types of server/routes/places.ts. The rules are server/social/places.ts; the numbers, the room keys and
 * the furniture rule are src/places/model.ts. Standing in a place is the room socket's `join` with `place` (protocol.ts).
 */
import type { HostErrorCode, JsonBodyErrorCode, Ok, PlayerRef, Refusal, SessionErrorCode, StorageErrorCode } from './protocol.ts'
import type { Done, LookIds } from './social.ts'
import type { HouseStyle, PlacedItem } from './life.ts'
import type { RoomEdit, ServiceKind } from '../places/model.ts'

/** What an AI agent offers where it stands. */
export interface ServiceCard { kind: ServiceKind; title: string; about: string }
/** Somebody standing in a place, as the caller may see them. */
export interface PlacePerson extends PlayerRef {
  look: LookIds | null
  friend: boolean
  /** A member of the group whose room this is (always false in the Square). */
  member: boolean
  service?: ServiceCard
}
/** One of the caller's group rooms, for the list. */
export interface RoomSummary { id: string; name: string; members: number; here: number; link: boolean }
/** A group room as one person sees it. `link` is only told to members. */
export interface RoomView {
  id: string
  name: string
  role: 'member' | 'visitor'
  members: number
  grid: number
  style: HouseStyle
  items: PlacedItem[]
  rev: number
  link?: { on: boolean; path?: string }
  here: PlacePerson[]
}
export interface SquareView { here: number; groups: number; people: PlacePerson[] }

export interface RoomEditBody { id: string; edit: RoomEdit }
export interface RoomLinkBody { id: string; on: boolean; fresh?: boolean }
export interface RoomRemoveBody { id: string; player: string }
export interface RoomTokenBody { token: string }

type Refused = Refusal<string>
export type PlacesResult = Done<'ok', { square: { here: number }; rooms: RoomSummary[] }>
export type SquareResult = Done<'ok', { square: SquareView }>
export type RoomResult = Done<'ok', { room: RoomView }> | Refused
export type RoomEditResult = Done<'changed' | 'same', { room: RoomView }> | Refused
export type RoomLinkResult = Done<'on' | 'off', { room: RoomView }> | Refused
export type RoomRemoveResult = Done<'removed', { room: RoomView }> | Refused
/** What a room link is to someone with no session: only whether it works, the room's name and how many are inside. */
export type RoomPeekResult = Done<'open', { room: { name: string; here: number } }> | Done<'ended'>
export type RoomEnterResult = Done<'inside', { room: RoomView }> | Refused

type Common = HostErrorCode | SessionErrorCode | StorageErrorCode | 'onboarding_required'
type Post = Common | JsonBodyErrorCode
export interface PlacesHttpRoutes {
  'GET /api/places': { response: Ok<PlacesResult>; errors: Common }
  'GET /api/places/square': { response: Ok<SquareResult>; errors: Common }
  'GET /api/places/room': { query: { id: string }; response: Ok<RoomResult>; errors: Common | 'invalid_room' }
  'POST /api/places/room/edit': { body: RoomEditBody; response: Ok<RoomEditResult>; errors: Post | 'invalid_room' | 'invalid_edit' }
  'POST /api/places/room/link': { body: RoomLinkBody; response: Ok<RoomLinkResult>; errors: Post | 'invalid_room' | 'invalid_link' }
  'POST /api/places/room/remove': { body: RoomRemoveBody; response: Ok<RoomRemoveResult>; errors: Post | 'invalid_room' | 'invalid_player' }
  'POST /api/places/room/peek': { body: RoomTokenBody; response: Ok<RoomPeekResult>; errors: HostErrorCode | StorageErrorCode | JsonBodyErrorCode }
  'POST /api/places/room/enter': { body: RoomTokenBody; response: Ok<RoomEnterResult>; errors: Post }
}
