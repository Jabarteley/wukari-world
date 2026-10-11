/**
 * OWNER: social
 * Plain lines regulars use for their own memories, gossip and one-time follow-ups.
 */
import type { MemoryFact } from '../../types/life.ts';
import { isBadDeed } from './mind.ts';
import type { Recollection } from './mind.ts';

const pick = (options: readonly string[], day: number): string => options[Math.abs(day) % options.length] ?? options[0] ?? '';

const FACT_LINES: Readonly<Record<string, readonly string[]>> = {
  treat: ['That drink you bought me the other day? I have not forgotten o.', 'You are the one who bought me a drink. Thank you again, eh.'],
  laugh: ['I am still laughing at that joke you cracked.', 'Abeg, do you have another one like that last joke?'],
  flop: ['Ehen, the comedian! I hope you brought better jokes today.', 'Before you start: no more jokes like the last one, please.'],
  praise: ['You are the one who liked my outfit. You have good eyes.', 'See who is here. The person with taste!'],
  job: ['Hard worker! I saw you on shift here.', 'How is work treating you? I saw you on duty the other day.'],
  met: ['You came back! Good to see you again.', 'Ah, my new friend is back. Welcome.'],
};
const PLACE_LINES: Readonly<Record<string, readonly string[]>> = {
  haggled: ['You and your bargaining! You nearly finished my profit the other day.', 'Hope you have not come to price my goods to zero again.'],
  respectful: ['The way you greeted me last time, your parents trained you well.'],
  patient: ['You waited your turn the other day without wahala. I noticed.'],
  'ball-talk': ['We never finished that football argument o. I am still right.'],
  'greeted-after-service': ['Good to see you again after service.'],
};
const DEED_LINES = {
  good: ['People here speak well of you at work. Keep it up.', 'I hear you did the right thing at work. Respect.'],
  bad: ['I heard what happened at work. Hmm. Do better next time.', 'They are still talking about what you did at work. Be careful o.'],
};
const RUMOUR_LINES: Readonly<Record<string, string>> = {
  treat: 'you have been buying people drinks at {place}. Big spender!',
  laugh: 'you had everyone laughing at {place}.',
  shade: 'you threw shade at somebody at {place}. Take it easy o.',
  shift: 'you have been working hard at {place}.',
  haggle: 'you price market at {place} like your life depends on it.',
};
const HEARD = ['I hear', 'Word is', 'They say'];

export const FOLLOW_UP_LINES: Readonly<Record<string, readonly string[]>> = {
  favour: ['This one is on me. You bought me a drink the other day, I have not forgotten.', 'Sit down, let me get you something. You looked after me last time.'],
  tease: ['Ah, it is you! Did you bring better jokes this time?', 'Comedian of the year! Let me hear today’s own.'],
  referral: ['They need hands here. Go and ask, tell them I sent you.'],
};
export const AWAY_LINES = ['Long time since we talked. How have you been?', 'We have not caught up in a while. How are things?'];

/** How a regular stands with the player, from cold to friendly, judged from the little the save keeps (see standingOf in mind.ts). */
export type Standing = 'new' | 'known' | 'cold' | 'regular' | 'friend' | 'neglected';
const STANDING_LINES: Readonly<Record<Standing, readonly string[]>> = {
  new: ['Good day. I do not think we have met. How may I help you?', 'Welcome. First time here? Take your time.', 'Good day, please. You are new here, I think.'],
  known: ['Ah, welcome back. Good to see you again.', 'You again! Come, come. What will it be today?', 'Welcome back. I was just thinking someone would come.'],
  cold: ['Hm. You again. Buying something today, or only looking?', 'Oh, it is you. Well. What do you want today?'],
  regular: ['{name}! My regular customer. The usual? I always keep the best for you.', '{name}, you know you are always welcome here. Between us, the fresh stock comes in early; come before noon.', 'Look who it is, {name}. For you, I will see what I can do on the price.'],
  friend: ['{name}, my friend! Sit, sit. Tell me everything.', 'Ah, {name}! My day just got better. How are you?'],
  neglected: ['{name}! Where have you been? I was beginning to think you forgot me.', 'Ah, a stranger returns. Long time, {name}. I almost sent someone to look for you.'],
};
/** A greeting for how the regular stands with the player. `name` is the player's own first name ('' when there is none: it reads "my friend"). */
export function standingLine(standing: Standing, name: string, day: number, salt = 0): string {
  const options = STANDING_LINES[standing];
  return pick(options, day + salt).replace('{name}', name || 'my friend');
}

export const followUpLine = (kind: string, day: number): string => (FOLLOW_UP_LINES[kind] ? pick(FOLLOW_UP_LINES[kind], day) : '');
export const awayLine = (day: number): string => pick(AWAY_LINES, day);

export function factLine(fact: MemoryFact, day: number): string {
  if (fact.k === 'deed' && fact.v) return pick(isBadDeed(fact.v) ? DEED_LINES.bad : DEED_LINES.good, day);
  const options = fact.k === 'place' ? (fact.v ? PLACE_LINES[fact.v] : undefined) : FACT_LINES[fact.k];
  return options ? pick(options, day) : '';
}

/** The teller, when present, is another regular, never the player. */
export function rumourLine(rumour: MemoryFact, day: number, placeName: string, teller?: string): string {
  const line = RUMOUR_LINES[rumour.k];
  return line ? `${teller ? `${teller} says` : pick(HEARD, day)} ${line.replace('{place}', placeName)}` : '';
}

export const recollectionLine = (memo: Recollection | null, day: number, placeName: (venue: string) => string, teller?: (venue: string) => string | undefined): string =>
  !memo ? '' : memo.from === 'fact' ? factLine(memo.fact, day) : rumourLine(memo.fact, day, placeName(memo.fact.v ?? ''), teller?.(memo.fact.v ?? ''));
