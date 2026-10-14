// The calm sheet behind the away card, worked out from the view. Its own file, used only by the lazy card and sheet (AwayChip.vue,
// AwaySheet.vue): growth/register.ts and awayModel.ts are in the first download and must not pull awaySheet.ts in with them.
import type { LifeView } from '../../../types/view.ts'
import type { LifeState } from '../../../types/life.ts'
import type { PhoneNotification } from '../../types/panel.ts'
import type { RecordEntryView } from '../../../types/records.ts'
import { billsDue } from '../bank/bankModel.ts'
import { buildAwaySheet } from './awaySheet.ts'
import type { AwaySheet } from './awaySheet.ts'
import type { AwayInput } from './awayModel.ts'
import type { HelloOk } from './growthModel.ts'
import { upcomingEvents } from './rulesBoundary.ts'

/** The calm sheet behind the card (awaySheet.ts): city news, your people, money, one next step. Null while there is nothing to say. */
export function awaySheetFor(view: AwayInput & Partial<Pick<LifeView, 'economy' | 'social'>>, hello: HelloOk | null, me: Parameters<typeof buildAwaySheet>[0]['me'], records: readonly Pick<RecordEntryView, 'n' | 'at' | 'title'>[] = []): AwaySheet | null {
  if (!view.connected || !hello) return null
  const live = upcomingEvents(view.now, 1, view.cityId).find((event) => (event as { live?: boolean }).live)
  return buildAwaySheet({ hoursAway: hello.away.hours, since: hello.away.since, me, notices: view.social?.notices, records, billsDue: view.economy ? billsDue({} as LifeState, { economy: view.economy }) : 0, claimable: view.missions?.claimable, liveEvent: live ? { title: live.title, venueLabel: live.venueLabel } : null })
}
/** The one line the card gets when the sheet has something: it opens the sheet. */
export const sheetLine = (sheet: AwaySheet | null): PhoneNotification[] => (sheet ? [{ id: 'away-sheet', at: 0, fresh: true, app: 'away-sheet', text: 'See what is new in the city and with your people' } as PhoneNotification] : [])

