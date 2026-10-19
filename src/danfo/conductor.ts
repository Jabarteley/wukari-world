/**
 * OWNER: danfo (docs/DANFO.md)
 * THE CONDUCTOR'S LINES, one small bank per city, in the shape of the talk banks (docs/TALK-BANKS.md): short lines by topic, a voice, and a
 * gloss for every local word so a person who does not speak it still follows. `{stop}` is the next stop and `{end}` the last one. The
 * conductor is a text bubble over the road: the game's own (an AI conductor, labelled), or a player who took the role, whose taps pick
 * lines from this same bank (no free text reaches another player, so nothing here needs a filter).
 *
 * The generated talk banks belong to venue regulars and house characters and are hundreds of kilobytes a city; a bus needs a dozen calls, so
 * the conductor has its own authored bank. Phrases are everyday street calls; like the talk banks' phrasebook they await review by
 * fluent speakers (BETA in docs/DANFO.md).
 */
import { seeded } from './run.ts'

export type ConductorTopic = 'call' | 'approach' | 'served' | 'passed' | 'hard-brake' | 'crash' | 'bump' | 'go-slow' | 'cut-in' | 'done'
export interface ConductorBank {
  voice: 'pidgin' | 'plain' | 'jokey'
  lines: Readonly<Record<ConductorTopic, readonly string[]>>
  /** Local words in the lines and what they mean. */
  gloss: Readonly<Record<string, string>>
}

const NAIJA: ConductorBank = {
  voice: 'pidgin',
  lines: {
    call: ['{stop}! {stop}! Enter with your change!', '{end} straight! Wole, wole!', '{stop}, {stop}, one more chance!', 'Shift small, madam, make the man siddon!'],
    approach: ['{stop} dey come o! Who dey drop?', 'Owa! Somebody dey drop for {stop}?', '{stop}! Shine your eye, we don reach.'],
    served: ['Wole! Wole! Enter quick quick!', 'Owa ni o! Pay your money, oga.', 'Hold your change, I go give you for {stop}.'],
    passed: ['Driver! You don pass {stop}! Ah ah!', 'Na {stop} I wan drop o! Stop this motor!', 'Driver, you no hear owa?'],
    'hard-brake': ['Driver, easy! You wan kill us?', 'Ah! Na eggs I carry o!'],
    crash: ['Ah! Driver, you don jam motor!', 'Ehn! Who go pay for that one?'],
    bump: ['This pothole na swimming pool!', 'Ehen, the road don chop shock again.'],
    'go-slow': ['Go-slow don start. Hawkers, bring pure water!', 'This hold-up ehn. Na Lagos we dey.'],
    'cut-in': ['Okada! Commot for road!', 'See this okada man, e think say na im get road!'],
    done: ['{end}! Last bus stop! Everybody drop!', 'Owa! {end}, everybody come down.'],
  },
  gloss: { wole: 'get in (Yoruba)', owa: 'I am getting off here (Yoruba)', 'go-slow': 'a traffic jam', 'pure water': 'sachet water' },
}
const ACCRA: ConductorBank = {
  voice: 'pidgin',
  lines: {
    call: ['{stop}! {stop}! {stop}!', '{end}, {end}, one more!', 'Mate dey here! {stop} straight!'],
    approach: ['{stop} bus stop! Who dey drop?', 'Bus stop! {stop}, make you ready.'],
    served: ['Enter, enter! Seat dey for back.', 'Pay your lorry fare, chale.', 'Your change dey me, relax.'],
    passed: ['Driver! Bus stop! You pass {stop}!', 'Mate, I talk say {stop}!'],
    'hard-brake': ['Driver, take am easy, chale!', 'Eiii! Slowly!'],
    crash: ['Eiii driver! Wo ahu?', 'Chale, the car o!'],
    bump: ['This pothole be serious!', 'Eiii, the road!'],
    'go-slow': ['Traffic dey the junction, chale.', 'This traffic be too much.'],
    'cut-in': ['Okada, move!', 'See this okada guy!'],
    done: ['{end}! Last stop, everybody down!', '{end}! Thank you, chale.'],
  },
  gloss: { chale: 'friend (Ghanaian slang)', mate: 'the trotro conductor', eiii: 'surprise', 'wo ahu?': 'did you see? (Twi)', 'lorry fare': 'the fare' },
}
const EAST: ConductorBank = {
  voice: 'jokey',
  lines: {
    call: ['{stop}! {stop}! Ingia, ingia!', '{end} moja kwa moja!', 'Gari iko na nafasi! {stop}!'],
    approach: ['{stop} stage! Nani anashuka?', 'Stage ya {stop}! Shuka hapa!'],
    served: ['Ingia haraka, haraka!', 'Lipa fare yako, boss.', 'Nafasi iko nyuma, songa!'],
    passed: ['Dere! Umepita {stop}!', 'Stage! Nilisema {stop}, dere!'],
    'hard-brake': ['Pole pole, dere!', 'Eeh! Tutaumia!'],
    crash: ['Dere! Umegonga!', 'Aiyayaya, gari!'],
    bump: ['Hii barabara ni shida!', 'Pothole tena!'],
    'go-slow': ['Jam imeanza, tulia.', 'Hii jam ni ya wiki!'],
    'cut-in': ['Boda boda, toka barabarani!', 'Huyu boda anajifanya!'],
    done: ['{end}! Stage ya mwisho, shukeni!', '{end}! Asanteni sana!'],
  },
  gloss: { ingia: 'get in (Swahili)', shuka: 'get off', stage: 'the bus stop', dere: 'driver', 'pole pole': 'slowly', 'moja kwa moja': 'straight through', nafasi: 'space', songa: 'move along', jam: 'a traffic jam', 'boda boda': 'a motorbike taxi' },
}
const PLAIN: ConductorBank = {
  voice: 'plain',
  lines: {
    call: ['{stop}! {stop}! Get in!', '{end}, straight through!'],
    approach: ['{stop} next! Anyone for {stop}?'],
    served: ['Get in quickly! Fares please.'],
    passed: ['Driver, you missed {stop}!'],
    'hard-brake': ['Easy, driver!'],
    crash: ['Driver! Watch the road!'],
    bump: ['That pothole!'],
    'go-slow': ['Traffic again.'],
    'cut-in': ['Bike, move!'],
    done: ['{end}! Last stop, everyone off!'],
  },
  gloss: {},
}

const BANKS: Readonly<Record<string, ConductorBank>> = { lagos: NAIJA, abuja: NAIJA, ibadan: NAIJA, 'port-harcourt': NAIJA, accra: ACCRA, nairobi: EAST, kampala: EAST, 'dar-es-salaam': EAST }
export const bankFor = (city: string): ConductorBank => BANKS[city] ?? PLAIN

/** One line for a moment, with the stop names filled in. `pick` chooses among the topic's lines (a seeded number, or a tap count). */
export function conductorLine(city: string, topic: ConductorTopic, stop: string, end: string, pick: number): string {
  const lines = bankFor(city).lines[topic]
  const line = lines[Math.abs(Math.floor(pick)) % lines.length] ?? ''
  return line.split('{stop}').join(stop).split('{end}').join(end)
}
/** A line for a run's moment, the same on every device of the crew: seeded by the run, the topic and the stop. */
export const seededLine = (city: string, topic: ConductorTopic, stop: string, end: string, seed: string, n: number): string =>
  conductorLine(city, topic, stop, end, Math.floor(seeded(`${seed}:${topic}:${n}`)() * 1000))
/** The glosses for the local words in a line (lower-case match). */
export function glossFor(city: string, line: string): string[] {
  const lower = line.toLowerCase()
  return Object.entries(bankFor(city).gloss).filter(([word]) => lower.includes(word)).map(([word, meaning]) => `${word}: ${meaning}`)
}
