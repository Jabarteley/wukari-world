// The "While you were away" card and the inbox chip: what they show and where they sit. Pure, so
// it is tested without a browser. The card's rule is src/game/digest.ts awayCard; its lines are the
// fresh ones of the Phone's notification list, with the live events and the missions.
import type { LifeView } from '../../../types/view.ts'
import type { PhoneNotification } from '../../types/panel.ts'
import type { SocialOverview } from '../../../types/social.ts'
import type { AwayCard } from './rulesBoundary.ts'
import { awayCard, upcomingEvents } from './rulesBoundary.ts'
import type { HelloOk } from './growthModel.ts'

export interface AwayInput {
  connected: boolean
  cityId: string
  now: number
  onboarding?: { required?: boolean } | null
  missions?: LifeView['missions'] | null
}
/** The card to show now, or null: not connected, not settled in, no hello yet, already dismissed, or nothing waiting. */
export function awayCardFor(view: AwayInput, hello: HelloOk | null, dismissed: boolean, lines: readonly PhoneNotification[], extra: readonly PhoneNotification[] = []): AwayCard | null {
  if (!view.connected || view.onboarding?.required || !hello || dismissed) return null
  return awayCard({ hoursAway: hello.away.hours, lines: [...lines.filter((line) => line.fresh), ...extra], missions: view.missions, events: upcomingEvents(view.now, 1, view.cityId) })
}
/** The card is only asked for once a connected player has settled in: a guest in their first minutes has nothing to come back to. */
export const awayWanted = (view: { connected: boolean; onboarding?: { required?: boolean; guest?: boolean } | null }): boolean =>
  Boolean(view.connected) && view.onboarding?.required !== true && view.onboarding?.guest !== true

// ---- the inbox chip's slot (the chip itself is in ./inboxChipModel.ts, fetched with the chip) ---------
/** A knock at the door cannot wait in the tray: it is an alert. */
export const inboxSlot = (connected: boolean, me: Pick<SocialOverview, 'house'> | null): 'alert' | 'hud' => (connected && me?.house.knocks?.length ? 'alert' : 'hud')
