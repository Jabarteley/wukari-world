/**
 * OWNER: agents (residents, docs/RESIDENTS.md "Residents everywhere")
 * PERSONALITY THAT CHANGES WHAT A RESIDENT DOES. Portable and pure (no Node imports, no storage, no clock of its own): every function takes what it needs.
 *
 * A persona is eight numbers (0..99), a faith, a few likes and dislikes, a way of speaking and a tongue (the local words of its region). They are NOT only
 * wording for a prompt: the rules below read them to decide, with no model,
 *   - whether the resident goes out of its work (an outing: a walk, a bite, the market, a quiet hour at the place of worship) and where,
 *   - whether it skips lunch, how often it prays, how often it talks, how long, and what about,
 *   - what it says when nobody has asked (written lines, picked by trait, style and tongue),
 *   - how quickly a friendship grows and how likely a quarrel is (bonds.ts reads `temper`, `chatty` and `social`).
 * Residents of one city are drawn from different bands of every trait (`derivePersona` with the slot), so three neighbours measurably differ.
 *
 * Every line written here is plain, short, has no digits and passes the word rules of agents (tests check all of them).
 */

export type Faith = 'christian' | 'catholic' | 'orthodox' | 'muslim' | 'hindu' | 'buddhist' | 'jewish' | 'sikh' | 'traditional' | 'yoruba' | 'none';
export type Style = 'warm' | 'plain' | 'formal' | 'jokey' | 'pidgin' | 'brisk';
export const TRAITS = ['chatty', 'temper', 'devout', 'curious', 'funny', 'ambitious', 'generous', 'social'] as const;
export type Trait = typeof TRAITS[number];

export interface Persona {
  chatty: number; temper: number; devout: number; curious: number; funny: number; ambitious: number; generous: number; social: number
  faith: Faith
  likes: string[]
  dislikes: string[]
  style: Style
  /** Key of TONGUES: the local words a resident drops into its lines. */
  tongue: string
  /** Optional, from the generator: what it says about its work, one private goal, and a person it mentions. */
  workLines?: string[]
  goal?: string
  kin?: string
}

export const hash = (text: string): number => { let h = 2166136261; for (const char of text) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
/** A small deterministic random stream from a text (mulberry32). */
export function stream(seed: string): () => number {
  let a = hash(seed) || 1;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const pickOf = <T>(list: readonly T[], roll: number): T => list[Math.floor(roll * list.length) % list.length]!;

// ---- likes, dislikes ---------------------------------------------------------------------------------------------------------------------------
export const LIKES: Readonly<Record<string, string>> = Object.freeze({
  music: 'old songs and a good drummer', football: 'a close football match', books: 'a worn book and a quiet corner', cooking: 'cooking for people I like', garden: 'watching a small garden grow',
  walks: 'a long slow walk at sunset', sea: 'the sound of water', children: 'children asking questions', art: 'drawing the street as it is', radio: 'the radio on low in the evening',
  dance: 'dancing in the kitchen when nobody is looking', tea: 'a hot cup of tea before anything else', chess: 'a slow match of chess', fishing: 'sitting still with a fishing line', cycling: 'cycling before the traffic wakes',
  cinema: 'a long film and a cold drink', birds: 'learning the names of birds', history: 'old stories of this place', bread: 'the smell of fresh bread', fabrics: 'good cloth and bright colours', running: 'an early run',
});
export const LIKE_TAGS: readonly string[] = Object.freeze(Object.keys(LIKES));
export const DISLIKES: readonly string[] = Object.freeze(['loud arguments', 'wasted food', 'being kept waiting', 'litter in the street', 'rude drivers', 'noisy engines at night', 'people who talk through a film', 'cold coffee', 'broken promises', 'dirty cups', 'long speeches', 'being rushed', 'gossip about money', 'crowded buses in the heat', 'slow internet', 'unfinished jobs']);

// ---- tongues: the local words dropped into a line ----------------------------------------------------------------------------------------------------
export interface Tongue { hello: string[]; filler: string[]; thanks: string; bye: string; wow: string }
const t = (hello: string, filler: string, thanks: string, bye: string, wow: string): Tongue => ({ hello: hello.split('|'), filler: filler.split('|'), thanks, bye, wow });
export const TONGUES: Readonly<Record<string, Tongue>> = Object.freeze({
  naija: t('How far|Good day o|Hello o', 'ehn|sha|abeg|na so', 'Thank you o', 'Till later', 'Chai'),
  ghana: t('Akwaaba|Good day|Hello my friend', 'chale|eii|oh', 'Medaase', 'See you soon', 'Eii'),
  swahili: t('Karibu|Habari|Jambo', 'sawa|basi|pole', 'Asante', 'Tutaonana', 'Ala'),
  safrica: t('Howzit|Sawubona|Hello there', 'eish|ja|hey', 'Thanks a lot', 'Sharp, see you', 'Eish'),
  horn: t('Selam|Good day|Hello', 'yes|well|so', 'Thank you', 'Goodbye for now', 'Wow'),
  arabic: t('Salaam|Marhaba|Good day', 'yalla|inshallah|well', 'Shukran', 'Ma salama', 'Mashallah'),
  persian: t('Salam|Good day|Hello', 'well|so|yes', 'Merci', 'Khodahafez', 'Aaah'),
  hindi: t('Namaste|Namaskar|Hello', 'arre|achha|na|yaar', 'Dhanyavaad', 'Phir milenge', 'Arre wah'),
  sea: t('Hello|Good day|Selamat', 'lah|ya|well', 'Thank you', 'See you later', 'Wah'),
  chinese: t('Ni hao|Hello|Good day', 'well|yes|ah', 'Xie xie', 'Zai jian', 'Aiya'),
  japanese: t('Konnichiwa|Hello|Good day', 'ne|well|ah', 'Arigato', 'Mata ne', 'Maa'),
  korean: t('Annyeong|Hello|Good day', 'well|ah|yes', 'Gomawo', 'Annyeong', 'Aigoo'),
  pacific: t('Bula|Talofa|Hello', 'well|yes|ah', 'Vinaka', 'Till next time', 'Aue'),
  caribbean: t('Wah gwaan|Good day|Hello', 'man|yes|seen', 'Respect and thanks', 'Walk good', 'Lawd'),
  spanish: t('Hola|Buenos dias|Hello', 'pues|bueno|claro', 'Gracias', 'Hasta luego', 'Ay'),
  portuguese: t('Ola|Bom dia|Hello', 'pois|entao|bem', 'Obrigado', 'Ate logo', 'Nossa'),
  french: t('Bonjour|Salut|Hello', 'bon|alors|voila', 'Merci', 'A bientot', 'Oh la la'),
  german: t('Hallo|Guten Tag|Hello', 'also|na ja|genau', 'Danke', 'Bis bald', 'Ach'),
  italian: t('Ciao|Buongiorno|Hello', 'allora|dai|beh', 'Grazie', 'A presto', 'Mamma mia'),
  greek: t('Yia sou|Kalimera|Hello', 'ne|opa|well', 'Efharisto', 'Ta leme', 'Opa'),
  slavic: t('Dobry den|Hello|Good day', 'well|so|yes', 'Thank you', 'Do vidzenia', 'Eh'),
  baltic: t('Labdien|Hello|Good day', 'well|so|yes', 'Thank you', 'Goodbye for now', 'Oh'),
  magyar: t('Szia|Hello|Good day', 'well|so|yes', 'Koszonom', 'Viszlat', 'Jaj'),
  caucasus: t('Gamarjoba|Barev|Hello', 'well|yes|so', 'Thank you', 'Goodbye for now', 'Oh'),
  hebrew: t('Shalom|Boker tov|Hello', 'nu|yalla|well', 'Todah', 'Lehitraot', 'Wow'),
  anglo: t('Hello|Good day|Hi there', 'right|well|so', 'Thanks very much', 'See you later', 'Goodness'),
  nordic: t('Hej|Hello|Good day', 'well|so|yes', 'Tack', 'Vi ses', 'Oj'),
});

// ---- the traits as a person ----------------------------------------------------------------------------------------------------------------------
export const FAITH_WORDS: readonly [Faith, RegExp][] = [['catholic', /\bcatholic\b/i], ['muslim', /\bmuslim\b/i], ['hindu', /\bhindu\b/i], ['jewish', /\bjewish\b|\bshabbat\b/i], ['sikh', /\bsikh\b/i], ['yoruba', /\bold yoruba ways\b|\borisa\b/i], ['buddhist', /\bbuddhist\b/i], ['orthodox', /\borthodox\b/i], ['christian', /\bchristian\b|\bchurch\b/i]];
const LIKE_WORDS: readonly [string, RegExp][] = [['music', /\bmusic|songs?|highlife|choir|guitar\b/i], ['football', /\bfootball\b/i], ['books', /\bbooks?|novels?|library|reading\b/i], ['cooking', /\bcook\w*|kitchen|soup\b/i], ['garden', /\bgarden\w*|flowers?|plants?\b/i],
  ['walks', /\bwalks?\b/i], ['sea', /\bsea|beach|ocean\b/i], ['children', /\bchildren|kids|school\b/i], ['art', /\bpaint\w*|sketch\w*|drawing|art\b/i], ['radio', /\bradio\b/i], ['dance', /\bdanc\w+/i], ['tea', /\btea\b/i]];
const HOT_WORDS = /\b(?:temper|stubborn|quick to (?:anger|argue)|short fuse|proud)\b/i;

/** The eight numbers drawn from five bands (0-19, 20-39, ...), each resident of a city in a different band of each trait: neighbours differ by at least 8 and usually by 20 or more. */
function band(seed: string, trait: number, slot: number): number {
  const mult = [1, 2, 3, 4][hash(`${seed}|m|${trait}`) % 4]!, off = hash(`${seed}|o|${trait}`) % 5;
  return ((slot % 5) * mult + off) % 5;
}
/** A persona from an id (and a story, when there is one) and the resident's slot among those of its city. `bandSeed` is shared by the city's residents; the roll is the resident's own. */
export function derivePersona(id: string, story: string, slot = 0, bandSeed = id): Persona {
  const roll = stream(`persona|${id}`), nums: Record<string, number> = {};
  TRAITS.forEach((trait, index) => { nums[trait] = band(bandSeed, index, slot) * 20 + 4 + Math.floor(roll() * 12); });
  const faith = FAITH_WORDS.find(([, pattern]) => pattern.test(story))?.[0] ?? 'none';
  const likes = LIKE_WORDS.filter(([, pattern]) => pattern.test(story)).map(([name]) => name);
  const shuffled = [...LIKE_TAGS];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(roll() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]; }
  for (const extra of shuffled) { if (likes.length >= 3) break; if (!likes.includes(extra)) likes.push(extra); }
  const hot = HOT_WORDS.test(story);
  const devout = story && faith === 'none' ? Math.min(nums['devout']!, 25) : nums['devout']!;
  const style: Style = /\bpidgin\b/i.test(story) ? 'pidgin' : (['warm', 'plain', 'formal', 'jokey', 'brisk'] as const)[Math.floor(roll() * 5)]!;
  return { chatty: nums['chatty']!, temper: hot ? Math.max(nums['temper']!, 70) : nums['temper']!, devout, curious: nums['curious']!, funny: nums['funny']!, ambitious: nums['ambitious']!, generous: nums['generous']!, social: nums['social']!,
    faith, likes: likes.slice(0, 3), dislikes: [pickOf(DISLIKES, roll()), pickOf(DISLIKES, roll())].filter((d, at, all) => all.indexOf(d) === at), style, tongue: 'anglo' };
}
const memo = new WeakMap<object, Persona>();
/** The persona of a resident: the one it carries (generated residents), else one derived from its id and story, kept for the life of the object. */
export function personaOf(who: { key: string; city: string; story: string; persona?: Persona }): Persona {
  if (who.persona) return who.persona;
  let found = memo.get(who);
  if (!found) { found = derivePersona(`resident.${who.city}.${who.key}`, who.story); memo.set(who, found); }
  return found;
}

// ---- time words --------------------------------------------------------------------------------------------------------------------------------
const DAY_MS = 86400000;
/** 0 = Sunday, in a place `offsetMin` east of UTC. */
export const weekdayAt = (t: number, offsetMin: number): number => (Math.floor((t + offsetMin * 60000) / DAY_MS) + 4) % 7;
export const hourAt = (t: number, offsetMin: number): number => (((Math.floor(t / 60000) + offsetMin) % 1440) + 1440) % 1440 / 60;

// ---- outings (where a resident goes when it is not at its post) ---------------------------------------------------------------------------------------
export type PastimeId = 'walk' | 'worship' | 'bite' | 'browse' | 'learn' | 'view';
export interface Pastime { kinds: string[]; doing: string; minutes: [number, number]; says: string[] }
export const PASTIMES: Readonly<Record<PastimeId, Pastime>> = Object.freeze({
  walk: { kinds: ['park', 'walk', 'lakeside', 'beach', 'hilltop'], doing: 'Out for a walk', minutes: [30, 70], says: ['Going to stretch my legs for a while.', 'A walk will clear my head.', 'I need some fresh air.'] },
  worship: { kinds: ['worship', 'shrine'], doing: 'Sitting quietly at the prayer hall', minutes: [30, 80], says: ['I am going to sit quietly for a while.', 'A quiet hour will do me good.', 'Off to give thanks.'] },
  bite: { kinds: ['buka', 'mall'], doing: 'Having a bite', minutes: [25, 55], says: ['Time for a bite.', 'I could eat something good right now.', 'Let me find something warm to eat.'] },
  browse: { kinds: ['market', 'mall'], doing: 'Looking around the shops', minutes: [25, 60], says: ['Let me see what the stalls have today.', 'I will have a look around the market.', 'A little browsing never hurt anyone.'] },
  learn: { kinds: ['quad', 'viewing', 'office'], doing: 'Reading and looking around', minutes: [35, 80], says: ['I want to read for a while.', 'There is always something new to learn.', 'I will go and find a quiet place to read.'] },
  view: { kinds: ['viewing', 'hilltop', 'walk'], doing: 'Taking in the view', minutes: [25, 60], says: ['I want to see the town from up there.', 'A good view is worth the walk.', 'Let me look at the town for a while.'] },
});
/** The days and hours people of each faith usually go to their place of worship (weekday 0 = Sunday). */
export function worshipWindow(faith: Faith, weekday: number, hour: number): boolean {
  switch (faith) {
    case 'muslim': return weekday === 5 && hour >= 12.25 && hour < 14.25;
    case 'christian': case 'catholic': case 'orthodox': return weekday === 0 && hour >= 8.5 && hour < 11.5;
    case 'jewish': return weekday === 6 && hour >= 9 && hour < 12;
    case 'sikh': case 'hindu': case 'buddhist': return weekday === 0 && hour >= 8 && hour < 11;
    case 'traditional': case 'yoruba': return weekday === 6 && hour >= 17 && hour < 19.5;
    default: return false;
  }
}
const has = (p: Persona, ...tags: string[]): number => (tags.some((tag) => p.likes.includes(tag)) ? 25 : 0);
/** How much a resident wants each outing now (0 = never). Pure; the chance of going out at all is `outingOdds`. */
export function pastimeWeights(p: Persona, weekday: number, hour: number): Record<PastimeId, number> {
  const worship = p.faith === 'none' ? 0 : worshipWindow(p.faith, weekday, hour) ? 40 + p.devout * 1.5 : p.devout >= 80 && hour >= 17 && hour < 20 ? 10 : 0;
  return { walk: 14 + p.curious * 0.25 + p.social * 0.2 + has(p, 'walks', 'sea', 'garden', 'running', 'cycling', 'birds'), worship,
    bite: hour >= 11 && hour < 21.5 ? 8 + p.social * 0.4 + p.generous * 0.3 + has(p, 'cooking', 'bread') : 0,
    browse: hour >= 8 && hour < 20 ? 8 + p.generous * 0.3 + p.ambitious * 0.15 + has(p, 'fabrics') : 0,
    learn: p.curious * 0.55 + has(p, 'books', 'art', 'history', 'chess'), view: p.curious * 0.2 + has(p, 'sea', 'art', 'birds') };
}
/** The chance in a hundred of going out in a 45-minute slot: high in free time for the sociable, low at work for the steady. */
export const outingOdds = (p: Persona, working: boolean): number => Math.round(working ? 2 + (p.curious + p.social) * 0.07 - p.ambitious * 0.03 : 12 + p.social * 0.55 + p.curious * 0.15);
/** Which outing (or none) a resident takes in a slot, by its traits and a fixed roll for (resident, day, slot). */
export function pastimeAt(p: Persona, seed: string, weekday: number, hour: number, working: boolean): PastimeId | null {
  const roll = stream(seed);
  const weights = pastimeWeights(p, weekday, hour), worshipping = weights.worship > 0 && worshipWindow(p.faith, weekday, hour);
  // A faithful resident goes to its place of worship in the window whatever else the day holds (the roll is its devotion).
  if (worshipping && roll() * 100 < p.devout + 10) return 'worship';
  if (roll() * 100 >= outingOdds(p, working)) return null;
  const entries = (Object.entries(weights) as [PastimeId, number][]).filter(([id, weight]) => weight > 0 && !(id === 'worship' && !worshipping && !(p.devout >= 80)));
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return null;
  let at = roll() * total;
  for (const [id, weight] of entries) { at -= weight; if (at < 0) return id; }
  return entries.at(-1)![0];
}
/** The ambitious and the careful eat at their post and carry on. */
export const lunchSkipped = (p: Persona, seed: string): boolean => (hash(seed) % 100) < Math.max(0, p.ambitious - 40) * 0.9 + (100 - p.generous - p.social) * 0.12 - 8;
/** How many prayers (0..2) a resident says on a day: none without a faith, more the more devout. Rule prayers are capped for all residents together by resident.ts. */
export function prayersToday(p: Persona, seed: string): number {
  if (p.faith === 'none') return 0;
  const roll = hash(seed) % 100;
  return (roll < p.devout * 0.35 ? 1 : 0) + (p.devout >= 70 && roll < p.devout * 0.12 ? 1 : 0);
}

// ---- talk: how often, how long, with whom, about what ------------------------------------------------------------------------------------------------
export interface TalkProfile { maxTalks: number; gapMs: number; turns: number; lines: number }
/** Talkers talk more often, longer and with shorter breaks; the quiet speak two or three times a day. */
export const talkProfile = (p: Persona): TalkProfile => ({ maxTalks: 1 + Math.round(p.chatty / 18), gapMs: Math.round((75 - p.chatty * 0.6) * 60000), turns: p.chatty >= 65 ? 4 : p.chatty >= 35 ? 3 : 2, lines: 2 + Math.round(p.chatty / 14) });
/** Percent chance that two residents who stand together begin to talk in a given check. */
export const talkOdds = (a: Persona, b: Persona): number => Math.round(6 + (a.chatty + b.chatty) * 0.22 + (a.social + b.social) * 0.06);
export type Topic = 'news' | 'work' | 'like' | 'dislike' | 'goal' | 'family' | 'faith' | 'joke' | 'town';
export function topicFor(p: Persona, seed: string, newsAvailable: boolean): Topic {
  const roll = stream(seed)(), list: [Topic, number][] = [['news', newsAvailable ? 10 + p.curious * 0.5 : 0], ['work', 12 + p.ambitious * 0.4], ['like', 12 + p.social * 0.2], ['dislike', 3 + p.temper * 0.3], ['goal', 4 + p.ambitious * 0.3],
    ['family', 8 + p.generous * 0.15], ['faith', p.faith === 'none' ? 0 : p.devout * 0.45], ['joke', p.funny * 0.55], ['town', 6 + p.curious * 0.1]];
  const total = list.reduce((sum, [, weight]) => sum + weight, 0);
  let at = roll * total;
  for (const [topic, weight] of list) { at -= weight; if (at < 0) return topic; }
  return 'town';
}

// ---- written lines -------------------------------------------------------------------------------------------------------------------------------------
const JOKES: readonly string[] = ['If I find my other sock today, it will be a good day.', 'My tea and I have an agreement: it goes cold, I forgive it.', 'They say patience is a virtue. I say it is mostly waiting.', 'I planned a quiet day. The day had other plans.', 'The clock and I are not on speaking terms this morning.', 'I told myself one biscuit. The packet disagrees.'];
const TOWN: readonly string[] = ['The light is lovely in town today.', 'It is a good day to be outside.', 'The streets feel friendly this morning.', 'Everyone seems to be in a hurry today.', 'The evening air is kind today.', 'There is a nice mood in town today.'];
const FAMILY: readonly string[] = ['My family sends their greetings.', 'I called home today and it did me good.', 'Someone at home told me a funny story.', 'My family is the reason I get up early.'];
const FAITH: readonly string[] = ['I am grateful for this day.', 'I said a small thank you this morning.', 'A quiet moment in the day keeps me steady.', 'I try to be kind, and the rest follows.'];
const MORNING: readonly string[] = ['Good morning. Another day to get on with.', 'Up and ready, and the day looks kind.', 'Tea first, then work.', 'A new day, and plenty to do.', 'Good morning. Let us see what today brings.'];
const MORNING_OWL: readonly string[] = ['A slow start for me today, but I am here.', 'Morning comes late for me, but it comes.', 'Give me a minute, the day is still waking up.'];
const GREET: readonly string[] = ['Welcome, come and have a look around.', 'Hello there, good to see a new face.', 'Good to see you. Take your time.', 'Come in, come in, there is no hurry.'];
const GREET_QUIET: readonly string[] = ['Hello.', 'Morning.', 'Good day.', 'Hello, take your time.'];
const EVENING: readonly string[] = ['A long day, and I am glad of a quiet evening.', 'The day is done and I am content.', 'Time to wind down and go home.', 'That was a good day, all things considered.'];
const WORKING: readonly string[] = ['Things are steady today.', 'Plenty to do, and I do not mind it.', 'Busy, but a good kind of busy.', 'One thing at a time, that is how it gets done.'];
const SHARP: readonly string[] = ['I do not have much patience for that today.', 'Let us not start with that today.', 'I will say it plainly and then I will let it go.'];

export type LineKind = 'morning' | 'greet' | 'work' | 'outing' | 'remark' | 'evening';
const LINE_MAX = 140;
const first = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
/** The local flavour of a line: a greeting or a filler word, by how much the resident leans on its tongue (pidgin and jokey styles most). */
function flavour(p: Persona, line: string, roll: () => number): string {
  const tongue = TONGUES[p.tongue] ?? TONGUES['anglo']!;
  const lean = p.style === 'pidgin' ? 0.55 : p.style === 'warm' || p.style === 'jokey' ? 0.3 : p.style === 'brisk' ? 0.05 : 0.15;
  if (roll() >= lean) return line;
  return roll() < 0.5 ? `${pickOf(tongue.hello, roll())}. ${line}` : `${first(pickOf(tongue.filler, roll()))}, ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
}
function styled(p: Persona, line: string): string {
  if (p.style === 'brisk') return line.split(/(?<=[.!?])\s+/)[0] ?? line;
  if (p.style === 'formal') return line.replace(/\bdon't\b/gi, 'do not').replace(/\bcan't\b/gi, 'cannot').replace(/\bI'm\b/g, 'I am');
  return line;
}
/** The remark for a topic: a plain line from the resident's likes, dislikes, goal, work, kin or faith. `gist` is a real ledger line (or null). */
export function remark(p: Persona, topic: Topic, roll: () => number, gist: string | null = null): string {
  switch (topic) {
    case 'news': return gist ? `People are saying: ${gist.replace(/[.!?]+$/, '')}.` : pickOf(TOWN, roll());
    case 'work': return p.workLines?.length ? pickOf(p.workLines, roll()) : pickOf(WORKING, roll());
    case 'like': { const like = pickOf(p.likes.length ? p.likes : ['tea'], roll()); return `I do enjoy ${LIKES[like] ?? like}.`; }
    case 'dislike': return `I cannot stand ${pickOf(p.dislikes.length ? p.dislikes : DISLIKES, roll())}.`;
    case 'goal': return p.goal ? `One day I would like ${p.goal}.` : 'I have a few plans for the year ahead.';
    case 'family': return p.kin ? `${p.kin}` : pickOf(FAMILY, roll());
    case 'faith': return pickOf(FAITH, roll());
    case 'joke': return pickOf(JOKES, roll());
    default: return pickOf(TOWN, roll());
  }
}
/** A line a resident says by itself. Short, plain, no digits; the style and the tongue colour it. `null` when its character would say nothing (the quiet say little). */
export function ruleLine(p: Persona, kind: LineKind, seed: string, extra: { pastime?: PastimeId; gist?: string | null; owl?: boolean } = {}): string | null {
  const roll = stream(seed);
  if (kind === 'greet' && p.chatty < 30 && roll() < 0.7) return styled(p, pickOf(GREET_QUIET, roll()));
  let core: string;
  switch (kind) {
    case 'morning': core = extra.owl ? pickOf(MORNING_OWL, roll()) : pickOf(MORNING, roll()); break;
    case 'greet': core = pickOf(GREET, roll()); break;
    case 'work': core = remark(p, roll() < 0.6 ? 'work' : topicFor(p, `${seed}|t`, false), roll); break;
    case 'outing': core = extra.pastime ? pickOf(PASTIMES[extra.pastime].says, roll()) : pickOf(TOWN, roll()); break;
    case 'evening': core = pickOf(EVENING, roll()); break;
    default: core = remark(p, topicFor(p, `${seed}|t`, !!extra.gist), roll, extra.gist ?? null);
  }
  if (p.temper >= 75 && kind === 'remark' && roll() < 0.25) core = pickOf(SHARP, roll());
  const line = styled(p, flavour(p, core, roll));
  return line.length > LINE_MAX ? core.slice(0, LINE_MAX) : line;
}
/** A line to another resident: the opener greets by name and carries the topic; a reply acknowledges first (the curious ask, the funny joke, the quiet nod). */
export function talkLine(speaker: Persona, listenerName: string, turn: number, seed: string, gist: string | null): string {
  const roll = stream(seed), topic = topicFor(speaker, `${seed}|topic`, !!gist);
  const body = remark(speaker, topic, roll, gist);
  if (turn === 0) {
    const tongue = TONGUES[speaker.tongue] ?? TONGUES['anglo']!;
    const hello = speaker.chatty >= 50 || speaker.style === 'warm' ? `${pickOf(tongue.hello, roll())}, ${listenerName}. ` : `${listenerName}. `;
    return styled(speaker, `${hello}${body}`).slice(0, LINE_MAX);
  }
  const ack = speaker.curious >= 60 ? 'Really? Tell me more.' : speaker.funny >= 60 ? 'Ha, you do make me smile.' : speaker.temper >= 70 ? 'Hm. Well, that is how I see it.' : speaker.chatty < 30 ? 'Mm.' : speaker.style === 'formal' ? 'Indeed.' : 'Yes, I know what you mean.';
  return styled(speaker, `${ack} ${body}`).slice(0, LINE_MAX);
}
/** The words of a rule-written prayer, by faith: short, thankful, about the day. Capped for all residents together by resident.ts. */
const ADDRESS: Readonly<Record<Faith, string>> = { christian: 'Lord', catholic: 'Lord', orthodox: 'Lord', muslim: 'Allah', hindu: 'God', buddhist: 'May all beings', jewish: 'Lord', sikh: 'Waheguru', traditional: 'Ancestors', yoruba: 'Ancestors', none: 'Thank you' };
const PRAYERS: readonly string[] = ['thank you for this day, for my family and for work to do.', 'please keep the people I love well and steady.', 'give me patience with the day and kindness for the people in it.', 'thank you for the small good things I almost forgot.', 'help me to be fair in what I say and do today.'];
export function ruleVow(faith: Faith, seed: string): string {
  const roll = stream(seed);
  return `${ADDRESS[faith]}, ${pickOf(PRAYERS, roll())}`;
}
/** What the traits mean for a friendship: sociable talkers grow close faster; the hot-tempered quarrel more. Used by bonds.ts. */
export const gainOf = (a: Persona, b: Persona, base: number): number => Math.max(1, Math.round(base * (0.6 + (a.chatty + b.chatty + a.social + b.social) / 400 * 0.9)));
export const quarrelScale = (a: Persona, b: Persona): number => 0.4 + (a.temper + b.temper) / 100;
export const sameBand = (a: number, b: number): boolean => Math.abs(a - b) < 20;

/** A few plain words for the model about how this resident is, by nature (the rules above read the numbers; a deep thought is told the words too). */
export function describePersona(p: Persona): string {
  const words: string[] = [];
  words.push(p.chatty >= 66 ? 'talkative' : p.chatty <= 33 ? 'quiet' : 'friendly enough');
  words.push(p.temper >= 70 ? 'quick to anger' : p.temper <= 30 ? 'calm' : 'even-tempered');
  if (p.faith !== 'none' && p.devout >= 60) words.push('devout');
  if (p.curious >= 66) words.push('curious');
  if (p.funny >= 66) words.push('funny');
  if (p.ambitious >= 66) words.push('ambitious');
  if (p.generous >= 66) words.push('generous'); else if (p.generous <= 30) words.push('careful with money');
  if (p.social >= 66) words.push('fond of company'); else if (p.social <= 30) words.push('happy alone');
  return words.join(', ');
}
