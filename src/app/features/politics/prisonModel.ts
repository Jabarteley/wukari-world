// The words of the jail card, pure so they are tested without a browser (prisonModel.test.ts).
import type { PrisonView } from '../../../types/politics.ts'

const minutes = (ms: number): string => { const n = Math.max(1, Math.ceil(ms / 60000)); return `${n} minute${n === 1 ? '' : 's'}`; }
export function parolePhrase(parole: PrisonView['parole']): string {
  if (parole.state === 'denied') return 'Your parole hearing is over for this sentence.'
  if (parole.state === 'wait') return `Parole opens when half your sentence is served, in ${minutes(parole.inMs)}. Stay out of trouble until then.`
  return 'Half your sentence is served. You can ask for a parole hearing.'
}
export function visitingPhrase(visiting: PrisonView['visiting']): string {
  const hours = `${visiting.fromHour}:00 to ${visiting.toHour}:00, Lagos time`
  return visiting.open ? `Visiting hours are open now (${hours}). Friends can visit.` : `Friends can visit between ${hours}.`
}
