// The typed boundary to the pure rules the growth screens read: the events calendar
// (src/game/calendar.ts) and the away-card rule (src/game/digest.ts). Its own file so the panel
// registry can compute badges, notifications and HUD slots without pulling in the rest of the
// growth boundary.
import { upcomingEvents as upcomingEventsJs } from '../../../game/calendar.ts'
import { awayCard as awayCardJs } from '../../../game/digest.ts'
import type { CalendarOccurrence } from '../../../types/growth.ts'
import type { PhoneNotification } from '../../types/panel.ts'

/** What is on now or starts within `days`, soonest first, from the server's clock: no request. */
export const upcomingEvents = upcomingEventsJs as unknown as (now: number, days?: number, cityId?: string) => CalendarOccurrence[]

// ---- the away card (src/game/digest.ts) ----------------------------------------------------
export interface AwayLine { id: string; text: string; app?: string; params?: unknown; group?: string; at?: number }
export interface AwayCard { title: string; sub: string; lines: AwayLine[]; more: number }
/** The card for a returning player (three hours or more away), or null when there is nothing worth a card. */
export const awayCard = awayCardJs as unknown as (input: { hoursAway: number; lines?: readonly PhoneNotification[]; missions?: unknown; events?: readonly CalendarOccurrence[] }) => AwayCard | null
