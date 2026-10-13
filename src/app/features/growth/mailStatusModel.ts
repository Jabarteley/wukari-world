// What Settings says about e-mail, read-only. Pure, so it is tested without a browser. The numbers are the player's own
// (the growth hello: nobody else's address or mail comes into it); the switches themselves stay in Stay in touch.
import type { OutreachMine } from '../../../types/growth.ts'

export interface MailStatus {
  /** E-mails about the character: 'On' or 'Off'. */
  character: 'On' | 'Off'
  /** A Stay in touch address: confirmed, waiting for its confirmation, or none. */
  address: 'Confirmed' | 'Waiting for confirmation' | 'None yet'
  /** The date of the last e-mail sent to this player, or "none yet". */
  last: string
}

const DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })
/** A day, no time of day: "12 Oct 2026". */
export const sentDate = (at: number): string => (Number.isFinite(at) && at > 0 ? DATE.format(at) : 'none yet')

/** The row, or null while the server has not answered. */
export function mailStatus(contact: Pick<OutreachMine, 'email' | 'comeback'> | null | undefined): MailStatus | null {
  if (!contact) return null
  const { email, comeback } = contact
  return {
    character: comeback.on ? 'On' : 'Off',
    address: email?.confirmed ? 'Confirmed' : email ? 'Waiting for confirmation' : 'None yet',
    last: sentDate(comeback.lastSent),
  }
}

/** What a guest is told in place of the row. */
export const MAIL_GUEST_LINE = 'Sign in to get e-mails about your character.'
/** Whether the row is for this player: signed in. A guest on a server with accounts gets the line; a server without accounts shows nothing. */
export const mailRowKind = (account: { loaded: boolean; enabled: boolean; account: unknown }): 'row' | 'guest' | 'none' => (account.account ? 'row' : account.loaded && account.enabled ? 'guest' : 'none')

/** The one notice to an account whose e-mails were switched on by default: what it says, and its two answers. */
export const MAIL_NOTICE_WORDS = Object.freeze({ title: 'E-mails are on', text: 'We e-mail you about your character, a few a week at most.', off: 'Turn off', keep: 'Keep them on' })
/** Shown while the server says the owner has not answered yet. */
export const mailNoticeDue = (contact: Pick<OutreachMine, 'comeback'> | null | undefined): boolean => contact?.comeback.notice === true
