/**
 * OWNER: agents (house agents, docs/HOUSE-AGENTS.md)
 * WRITTEN LINES: most of what a house agent says is written here, free, in the character's voice. They are what is said when nobody has written
 * to the agent, when no model key is set, when the day's model budget is gone, and when a model's phrasing is thrown away. Every line passes
 * `agentWords` before it is said (runner.ts `speak`); a test runs every line of every voice through it (lines.test.ts). Portable and pure.
 * `pick` is deterministic (a hash of a seed), so a test can ask for the same line twice.
 */
import { formatHour } from '../../src/game/clock.ts';
import type { Role, Spec } from './cast.ts';
import type { Verdict } from './haggle.ts';

const naira = (value: number): string => `₦${Math.round(value).toLocaleString('en-NG')}`;

export function hash(text: string): number {
  let h = 2166136261;
  for (const char of text) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const pick = <T>(list: readonly T[], seed: string): T => list[hash(seed) % list.length]!;

type Voice = 'pidgin' | 'plain';
const both = (pidgin: readonly string[], plain: readonly string[]): Record<Voice, readonly string[]> => ({ pidgin, plain });

const GREET = both(
  ['How far, {who}! Welcome. Wetin you dey find?', 'Welcome, {who}! Come, come, see wetin I get.', 'Good day, {who}. You are welcome here.'],
  ['Hello, {who}! Welcome. What can I do for you?', 'Hi {who}, good to see you here.', 'Welcome, {who}! Ask me anything about this place.'],
);
const AMBIENT: Record<Role, Record<Voice, readonly string[]>> = {
  seller: both(['Fresh cloth today! Come and see.', 'Price dey fair here, abeg come look.', 'Cloth, cloth! Good quality, good price.'], ['Fresh stock today. Come and have a look.', 'Fair prices here, take your time.', 'Come and see what is new today.']),
  guide: both(['New in town? Ask me where anything is.', 'If you dey lost, just ask me.'], ['New in town? Ask me where anything is.', 'Looking for a place? Ask me the way.', 'Ask me about prices, hours or the way.']),
  marketer: both(['Ask me what is happening tonight!', 'Plenty dey happen tonight, ask me.'], ['Ask me what is happening tonight!', 'There is always something on. Ask me.']),
  quiz: both(['Quiz time soon, come and play!', 'Who wan test im head? Quiz dey come.'], ['A quiz is coming up. Come and play!', 'Think you know the city? A quiz starts soon.']),
  mission: both(['I get small work for una. Ask me for a task.', 'Looking for helpers! Ask me for a task.'], ['I have small tasks for helpers. Ask me for one.', 'Looking for helpers! Ask me for a task.']),
};
const FALLBACK = both(
  ['I hear you. Ask me about price, time, or the way.', 'Hmm, I no too understand. Ask me about price, time or the way.'],
  ['I hear you. You can ask me about prices, opening hours or the way.', 'Not sure I follow. Try asking about prices, hours or directions.'],
);
const PRESSURE = both(
  ['I hear you, but my price na my price. Make you make a fair offer.', 'No vex, I no fit just reduce like that. Tell me wetin you fit pay.', 'Abeg, a fair offer I go listen. Big story no go change am.'],
  ['I understand, but my price is my price. Make me a fair offer.', 'No offence, I cannot lower it just like that. Tell me what you can pay.', 'A fair offer I will hear. Stories will not change the price.'],
);
const WHICH = both(
  ['Which one you want? {names}?', 'Tell me which one: {names}.'],
  ['Which one would you like: {names}?', 'Tell me which item: {names}.'],
);
const NOT_SELLER = both(
  ['I no dey sell. Find the market, one of the traders there go help you.', 'No be my own work be that. Try the market.'],
  ['I do not sell anything. Try the market, a trader there can help you.', 'That is not my work. Try the market.'],
);
const TASK_NONE = both(
  ['I no get work wey fit you today. Check back tomorrow.', 'Nothing for you now o. Come back tomorrow.'],
  ['I have nothing that suits you today. Check back tomorrow.', 'Nothing for you right now. Come back tomorrow.'],
);
const TASK_AGAIN = both(
  ['I don give you one today already. Go finish am, then come back tomorrow.', 'You get my task for today. Check Goals.'],
  ['I gave you a task today already. Check your Goals, and come back tomorrow.', 'You have my task for today. It is in your Goals.'],
);
const TASK_FULL = both(
  ['Your hands full for now. Finish one of your tasks, come back.', 'Plenty work dey your hand. Finish one, then come.'],
  ['Your hands are full for now. Finish one of your tasks and come back.', 'You have plenty to do already. Finish one and come back.'],
);
const TASK_GREETED = both(
  ['Ah, you came from my friend! Thank you. Go back and collect your reward.', 'Greetings received, thank you! Your task is done. Collect it in Goals.'],
  ['Oh, I am glad you came by with the greeting. Thank you! Your task is done: collect it in Goals.', 'Thank you for the hello! Your task is done. Collect it in Goals.'],
);
const TASK_HANDED = both(
  ['Ah, thank you! Na wetin I need be this. Your task is done, collect am for Goals.', 'You try! Your task is done. Collect am for Goals.'],
  ['Thank you, that is just what I needed! Your task is done: collect it in Goals.', 'Perfect, thank you! Your task is done. Collect it in Goals.'],
);
const TASK_BROUGHT = both(
  ['Welcome, your friend! Thank you for bringing them. Your task is done, check Goals.', 'Una don come! Thank you. Your task is done, check Goals.'],
  ['Welcome, friend of a friend! Thank you for bringing them. Your task is done: check Goals.', 'How nice to see you both! Your task is done. Check Goals.'],
);
const SOLD = both(
  ['Thank you! {label} na yours now for {price}. Safe!', 'Done! {label} for {price}. Enjoy am!'],
  ['Thank you! {label} is yours now, for {price}.', 'Done! {label} for {price}. Enjoy it!'],
);
const SALE_NO = both(
  ['Abeg, I no fit finish that one now. Try again small time.', 'Something no gel for the sale. Come again.'],
  ['I cannot finish that sale right now. Please try again in a moment.', 'Something got in the way of the sale. Try again.'],
);
const SALE_SHORT = both(
  ['Your money no reach for {price}. I go hold am small, come back.', 'Ah, you need {price} for {label}. Come back when you get am.'],
  ['You need {price} for {label}, and your cash is short. I will hold it a little while.', 'That is {price} for {label}: you are short. Come back when you can.'],
);
const SALE_FULL = both(
  ['Your bag dey full o. Use some things first.', 'Carry no fit again, bag full. Come back after.'],
  ['Your bag is full. Use some things first, then come back.', 'You cannot carry more right now. Come back when you have room.'],
);
const SALE_STUFFED = both(
  ['You don chop reach! Come back when hunger dey.', 'Belle full o. Come back later.'],
  ['You are full right now. Come back when you are hungry.', 'You do not need that right now. Come back later.'],
);
const TONIGHT_NONE = both(
  ['Nothing big wey I don hear yet, but the Square always dey alive. Come see.', 'Quiet so far. Check the Square, things dey start small.'],
  ['Nothing big announced yet, but the Square is always worth a look.', 'Quiet so far. Check the Square: things start small.'],
);
const BYE = both(['Okay o, see you later!', 'Safe, my friend.'], ['Alright, see you later!', 'Take care, and come back soon.']);

const fill = (text: string, vars: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');

export const greet = (spec: Spec, who: string, seed: string): string => fill(pick(GREET[spec.voice], seed), { who });
export const ambient = (spec: Spec, seed: string): string => pick(AMBIENT[spec.role][spec.voice], seed);
export const fallback = (spec: Spec, seed: string): string => pick(FALLBACK[spec.voice], seed);
export const pressure = (spec: Spec, seed: string): string => pick(PRESSURE[spec.voice], seed);
export const notSeller = (spec: Spec, seed: string): string => pick(NOT_SELLER[spec.voice], seed);
export const taskNone = (spec: Spec, seed: string): string => pick(TASK_NONE[spec.voice], seed);
export const taskAgain = (spec: Spec, seed: string): string => pick(TASK_AGAIN[spec.voice], seed);
export const taskFull = (spec: Spec, seed: string): string => pick(TASK_FULL[spec.voice], seed);
export const taskGreeted = (spec: Spec, seed: string): string => pick(TASK_GREETED[spec.voice], seed);
export const taskHanded = (spec: Spec, seed: string): string => pick(TASK_HANDED[spec.voice], seed);
export const taskBrought = (spec: Spec, seed: string): string => pick(TASK_BROUGHT[spec.voice], seed);
/** The brief as the task's giver says it, with a note on where it is kept. */
export const taskGiven = (brief: string): string => `${brief} It is in your Goals.`;
export const taskShort = (spec: Spec, units: number, what: string, seed: string): string => fill(pick(both(['Ehen, but I need {units} {what}. Bring all of dem first.', 'I asked for {units} {what}. You never get all, abeg bring am.'], ['I asked for {units} {what}, and you do not have them all yet. Bring them and tell me.', 'You still need {units} {what}. Bring them to me and say so.'])[spec.voice], seed), { units: String(units), what });
/** After a hand-over: what the agent says. */
export function sale(spec: Spec, outcome: { ok: true; label: string; price: number } | { ok: false; code: string; label: string; price: number }, seed: string): string {
  if (outcome.ok) return fill(pick(SOLD[spec.voice], seed), { label: outcome.label, price: naira(outcome.price) });
  const table = outcome.code === 'insufficient_funds' ? SALE_SHORT : outcome.code === 'bag_full' ? SALE_FULL : outcome.code === 'not_needed' ? SALE_STUFFED : SALE_NO;
  return fill(pick(table[spec.voice], seed), { label: outcome.label, price: naira(outcome.price) });
}
export const bye = (spec: Spec, seed: string): string => pick(BYE[spec.voice], seed);
export const which = (spec: Spec, names: readonly string[], seed: string): string => fill(pick(WHICH[spec.voice], seed), { names: names.join(', ') });
export const tonight = (spec: Spec, events: readonly string[], seed: string): string => (events.length ? `Tonight: ${events.slice(0, 2).join('. ')}.` : pick(TONIGHT_NONE[spec.voice], seed));

/** Opening hours in a sentence. */
export function hoursLine(spec: Spec, open: boolean): string {
  const { open: from, close: to } = spec.hours;
  const range = `${formatHour(from)} to ${formatHour(to)}`;
  return open ? (spec.voice === 'pidgin' ? `I dey here from ${range}. We dey open now!` : `I am here from ${range}. We are open now.`) : (spec.voice === 'pidgin' ? `I dey here from ${range}. Come back then.` : `I am here from ${range}. Come back then.`);
}

/** The price list in a sentence (at most four items). */
export function pricesLine(spec: Spec, items: readonly { label: string; list: number }[]): string {
  const list = items.slice(0, 4).map((item) => `${item.label} ${naira(item.list)}`).join(', ');
  return spec.voice === 'pidgin' ? `Today: ${list}. Tell me wetin you wan buy.` : `Today: ${list}. Tell me what you would like.`;
}

/** One item's price in a sentence. */
export const priceLine = (spec: Spec, label: string, list: number): string => (spec.voice === 'pidgin' ? `${label} na ${naira(list)}. You fit make offer.` : `${label} is ${naira(list)}. You can make me an offer.`);

/** The seller's words for a verdict. The price in a verdict is the only price a line may carry (talk.ts holds a model to that too). */
export function verdictLine(spec: Spec, label: string, verdict: Verdict, seed: string): string {
  const p = naira(verdict.price);
  const pid = spec.voice === 'pidgin';
  const choose = (a: readonly string[]): string => pick(a, seed);
  if (verdict.kind === 'accept') return choose(pid ? [`Deal! ${label} for ${p}. I go hold am for you.`, `Deal, na ${p} for ${label}. I go keep am for you.`] : [`Deal! ${label} for ${p}. I will hold it for you.`, `Deal: ${label} for ${p}. I will keep it aside for you.`]);
  if (verdict.kind === 'counter') return choose(pid ? [`Better, but not yet. ${label} for ${p}, na my best for now.`, `Almost! ${p} for ${label} and we dey talk.`] : [`Getting closer, but not yet. ${label} for ${p}.`, `Almost there. ${p} for ${label} and we can shake on it.`]);
  if (verdict.kind === 'final') return choose(pid ? [`That one na my last word: ${label} for ${p}.`, `No more o. ${p} for ${label}, final.`] : [`That is my last price: ${label} for ${p}.`, `I cannot do more. ${p} for ${label}, final.`]);
  return choose(pid ? [`E too low. ${label} dey ${p}, I no fit go that small.`, `Ah, no. ${p} for ${label}. Make you try better offer.`] : [`That is too low for me. ${label} is ${p}. Try a better offer.`, `Sorry, no. ${label} is ${p}. Make me a better offer.`]);
}

/** Directions: the venue asked about, or a short tour. `venues` are the city's venue names (and districts) as the content gives them. */
export function directionsLine(spec: Spec, venue: { name: string; district: string; status: string } | null, tour: readonly string[]): string {
  if (venue) return `${venue.name} is in ${venue.district}. ${venue.status}. Open the map, pick it and travel from there.`;
  return tour.length ? `Try ${tour.slice(0, 3).join(', ')}. Open the map and tap a place to see how to get there.` : fallback(spec, 'directions');
}

/** The quiz: the question, the right answer and the reveal. */
export const quizAsk = (question: string): string => `Quiz time! ${question}`;
export const quizWin = (name: string, answer: string): string => `Correct, ${name}! The answer is ${answer}. Well done!`;
export const quizEnd = (answer: string): string => `Time up! The answer was ${answer}. Next round soon.`;
