// The AI character's question in a private chat, "can we flirt in public places?" (docs/AI-SAFETY.md): the words under the card and on the profile
// switch. Pure. The server decides everything (adults only, one question a day, who may answer); this only says what the card shows.
import type { Message } from '../../../types/social.ts'

export type RomanceView = NonNullable<Message['romance']>
/** What is shown under the question once it is answered (or cannot be answered by this person). */
export const romanceState = (view: RomanceView): string | null => (view.state === 'yes' ? 'You said yes. You can change it on their profile.' : view.state === 'no' ? 'You said no.' : view.answerable ? null : 'Waiting for their answer.')
/** The profile switch: "Flirting in public: on" / "off", with the way to change it. A Bae counts as on and is ended to turn it off. */
export const romanceSwitch = (card: { on: boolean; bae: boolean }): { label: string; action: string; hint: string } => ({
  label: `Flirting in public: ${card.on ? 'on' : 'off'}`,
  action: card.on ? 'Turn off' : 'Turn on',
  hint: card.bae ? 'Your Bae can flirt with you in public. End being Bae to stop that.' : card.on ? 'This character may flirt with you in public places when it speaks to you. Sex, money and meetings outside the game stay refused.' : 'Off: this character never flirts with you in public.',
})
