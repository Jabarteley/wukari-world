/**
 * OWNER: minigames (docs/MINI-GAMES.md)
 * THE TRADERS' WORDS in the market haggle: written lines per voice (Nigerian Pidgin for the Nigerian markets, plain English elsewhere) and per
 * personality (warm or tough), free and deterministic. Most of what a person reads is these; a model may rephrase one of them within a small daily
 * cap (haggle.ts), and its answer is thrown away unless it carries only the numbers this file handed out. Every line passes `agentWords` for a minor
 * (haggle.test.ts runs all of them). Portable and pure: no clock, no randomness, no I/O.
 */
import { hash } from '../house/lines.ts';

export type Voice = 'pidgin' | 'plain';
export type Mood = 'warm' | 'tough';
export type LineKind = 'open' | 'again' | 'returning' | 'regular' | 'accept' | 'counter' | 'refuse' | 'final' | 'expired' | 'bought' | 'afterwards';
export const LINE_KINDS: readonly LineKind[] = ['open', 'again', 'returning', 'regular', 'accept', 'counter', 'refuse', 'final', 'expired', 'bought', 'afterwards'];

const naira = (value: number): string => `₦${Math.round(value).toLocaleString('en-NG')}`;
type Table = Record<LineKind, readonly string[]>;
const TABLES: Record<Voice, Record<Mood, Table>> = {
  pidgin: {
    warm: {
      open: ['Welcome, welcome! {item} na {price}. Make your offer, we go talk.', 'Ah, customer! {item} fresh, na {price}. Wetin you fit pay?', 'My person, come see {item}! {price} is the price, but we fit talk.'],
      again: ['You again? Last price, o. {item} na {price}.', 'Ah, you don come back so soon? Last price for you: {price} for {item}.', 'You again! Okay, last price. {item} is {price}, no wahala.'],
      returning: ['I remember you! You buy from me before. {item} na {price}, make we talk.', 'Ah, you don return! I know your face. {item} na {price}.'],
      regular: ['My regular, {name}! For you, {item} na {price}. We go do am nicely.', '{name}! My own customer. {item} na {price} today, make we agree.'],
      accept: ['Deal! {item} for {price}. You don win me today, I hold am for you.', 'Ehen, deal! {price} for {item}. Na you sabi, I keep am for you.'],
      counter: ['Better, but small small. {price} for {item}, e fit work.', 'You dey try! {price} for {item} and we dey close.', 'Almost there o. {price} for {item}, na my kind price.'],
      refuse: ['Ah ah, that one too low. {item} na {price}. Try again.', 'No, no, no. {price} for {item}, make you add small.'],
      final: ['That one na my last. {item} for {price}, no more.', 'I don reach my end. {price} for {item}, last price.'],
      expired: ['Time don pass o. The price don go back. Make we talk again.', 'You delay too long. The price I hold don expire. Come, make we start again.'],
      bought: ['Thank you! {item} for {price}. Enjoy am, come again!', 'Done! {item} na yours for {price}. Safe!'],
      afterwards: ['The {item} don enter your bag. Come back tomorrow, I go remember you.', 'We don finish for today. Come back tomorrow, my person.'],
    },
    tough: {
      open: ['{item}? {price}. That is the price, but talk quick, I get customers.', 'Oya, {item} na {price}. Tell me your offer, no waste my time.', 'Customer, {item} na {price}. I no dey play with price o.'],
      again: ['You again? Last price. {item} na {price}, no story.', 'You again o! Last price: {price} for {item}. Take am or leave am.'],
      returning: ['Ah, I know you. You buy before. {item} na {price}, but I no go soft.', 'You don return? Fine. {item} is {price}. Offer well.'],
      regular: ['{name}, my regular. Because na you, {item} na {price}. No push your luck.', 'Ah, {name}! For you only, {item} na {price}. Talk well.'],
      accept: ['Hmm, you don win. {item} for {price}. Hold am before I change my mind.', 'Fine, deal. {price} for {item}. Na you sabi.'],
      counter: ['Not yet. {price} for {item}, that one na my move.', 'Add small. {item} for {price}, I fit go that far.', 'You dey press me o. {price} for {item}, take am.'],
      refuse: ['Ah! That price is an insult. {item} na {price}.', 'No way. {price} for {item}. Come with a better offer.'],
      final: ['Stop. {price} for {item}, last word. Finish.', 'I don talk finish. {item} for {price}, final.'],
      expired: ['Too late. The deal don expire. If you still want am, begin again.', 'You waste time. The price don go. Start again if you serious.'],
      bought: ['Done. {item} for {price}. Next customer!', 'Take your {item}, {price} paid. Safe.'],
      afterwards: ['{item} don enter your bag. Come tomorrow if you want another one.', 'That is enough for today. Come tomorrow.'],
    },
  },
  plain: {
    warm: {
      open: ['Welcome! {item} is {price}. Make me an offer and we will talk.', 'Hello, friend! {item} is {price}, but I am happy to talk.', 'Come and see the {item}. It is {price}; what can you pay?'],
      again: ['You again? Last price, then. {item} is {price}.', 'Back so soon? My last price for you is {price} for {item}.'],
      returning: ['I remember you! You bought from me before. {item} is {price}; let us talk.', 'Welcome back! I know your face. {item} is {price}.'],
      regular: ['My regular, {name}! For you, {item} is {price}. Let us do it nicely.', '{name}, good to see you again! {item} is {price} today.'],
      accept: ['Deal! {item} for {price}. I will hold it for you.', 'You have a deal: {price} for {item}. I will keep it aside.'],
      counter: ['Better, but not yet. {price} for {item}, and we are close.', 'You are getting there. {item} for {price}?', 'Almost! {price} for {item} is the best I can do for now.'],
      refuse: ['That is too low for me. {item} is {price}. Try again.', 'Oh no, I cannot do that. {item} is {price}; please add a little.'],
      final: ['That is my last price: {item} for {price}.', 'I cannot go lower. {price} for {item}, final.'],
      expired: ['The time has passed and the price is back. Let us start again.', 'You took too long, and the price I held has expired. Shall we begin again?'],
      bought: ['Thank you! {item} for {price}. Enjoy it, and come again!', 'Done! {item} is yours for {price}.'],
      afterwards: ['The {item} is in your bag. Come back tomorrow and I will remember you.', 'That is all for today. Come back tomorrow, friend.'],
    },
    tough: {
      open: ['{item} is {price}. Make your offer quickly, I have other customers.', 'The {item}? {price}. I do not play with prices.', 'Customer, {item} is {price}. Tell me your offer.'],
      again: ['You again? Last price. {item} is {price}.', 'Back again? My last price: {price} for {item}. Take it or leave it.'],
      returning: ['I know you. You bought before. {item} is {price}, and I am not going soft.', 'You are back. Fine. {item} is {price}; offer well.'],
      regular: ['{name}, my regular. Because it is you, {item} is {price}. Do not push your luck.', 'Ah, {name}! For you, {item} is {price}. Talk sensibly.'],
      accept: ['Hm, you win. {item} for {price}. Take it before I change my mind.', 'Fine, a deal: {price} for {item}.'],
      counter: ['Not yet. {price} for {item}; that is my move.', 'Add a little. I can go to {price} for {item}.', 'You are pressing me. {price} for {item}, final offer for now.'],
      refuse: ['That is an insult. {item} is {price}.', 'No way. {price} for {item}. Come back with a better offer.'],
      final: ['Stop there. {price} for {item}, last word.', 'I am done talking. {item} for {price}, final.'],
      expired: ['Too late. The deal has expired. Start again if you are serious.', 'You wasted time. The price is gone. Begin again.'],
      bought: ['Done. {item} for {price}. Next customer!', 'Here is your {item}. {price} paid. Good day.'],
      afterwards: ['The {item} is in your bag. Come tomorrow if you want another.', 'That is enough for today. Come tomorrow.'],
    },
  },
};

export const fill = (text: string, vars: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');

/** One trader line. `seed` makes the choice repeatable. */
export function say(voice: Voice, mood: Mood, kind: LineKind, vars: { item: string; price?: number; name?: string }, seed: string): string {
  const options = TABLES[voice][mood][kind];
  const text = options[hash(`${kind}|${seed}`) % options.length]!;
  return fill(text, { item: vars.item, price: vars.price === undefined ? '' : naira(vars.price), name: (vars.name ?? 'friend').slice(0, 24) });
}

/** Every template line, for the test that runs them through the AI word rules. */
export function allTemplates(): string[] {
  return (Object.keys(TABLES) as Voice[]).flatMap((voice) => (Object.keys(TABLES[voice]) as Mood[]).flatMap((mood) => LINE_KINDS.flatMap((kind) => [...TABLES[voice][mood][kind]])));
}
export const templatesOf = (voice: Voice, mood: Mood, kind: LineKind): readonly string[] => TABLES[voice][mood][kind];

const GREETINGS: Record<Voice, Record<Mood, Record<'new' | 'again' | 'returning' | 'regular', string>>> = {
  pidgin: {
    warm: { new: 'Welcome, welcome! Come and see wetin I get.', again: 'You again? Na last price I dey give today.', returning: 'I remember you! Come, make we talk.', regular: '{name}, my regular! Come in, come in.' },
    tough: { new: 'Oya, look well. No waste my time.', again: 'You again? Last price only, o.', returning: 'I know you. Talk well this time.', regular: '{name}, my regular. Talk sense.' },
  },
  plain: {
    warm: { new: 'Welcome! Come and see what I have.', again: 'You again? Last prices only today.', returning: 'I remember you! Come, let us talk.', regular: '{name}, my regular! Come in.' },
    tough: { new: 'Look well, and do not waste my time.', again: 'You again? Last price only.', returning: 'I know you. Talk sensibly this time.', regular: '{name}, my regular. Talk sense.' },
  },
};
/** What the trader says on the stall before any talk: it shows how well they know the person. */
export const greeting = (voice: Voice, mood: Mood, memory: 'new' | 'again' | 'returning' | 'regular', name: string): string => fill(GREETINGS[voice][mood][memory], { name: (name || 'friend').slice(0, 24) });
export const allGreetings = (): string[] => (Object.keys(GREETINGS) as Voice[]).flatMap((voice) => (Object.keys(GREETINGS[voice]) as Mood[]).flatMap((mood) => Object.values(GREETINGS[voice][mood])));

/** The person's own side of the talk, as a short line in the log. */
export const youSay = (offer: number): string => `I can pay ${naira(offer)}.`;
export const youTake = (price: number): string => `I will take it for ${naira(price)}.`;
export { naira };
