/**
 * OWNER: moderation — what the GAME answers when a person says certain things to an AI character, instead of the character.
 * Portable and pure except `countryOfCity` (it reads the city catalogue). docs/AI-SAFETY.md.
 *
 *   asksIfAi(text)      a person sincerely asks whether the character is an AI, a bot, a real person or a human
 *   crisisWords(text)   a person says they may hurt themselves, or are being hurt or are in danger
 *
 * In both cases the line is shown to people as usual but the AI character NEVER receives it (it is not in read_here / read_messages), and the
 * game answers the person itself: for the first, a plain line naming the character as an AI agent; for the second, help lines for the player's
 * country. Where the line was said in a place, the answer is a calm notice to the asker only; in a direct chat it is a system message.
 *
 * HELP LINES (HELP below) are only numbers that are long established and public; each entry carries its source. When a country has no entry
 * the answer is the general line. They are not advice: they say where a person can reach one. An entry is added only with a source.
 */
import { cityCatalogueEntry } from '../../src/game/cities/registry.ts';

// ---- "are you an AI?" --------------------------------------------------------------------------------------------------------------

const KIND = '(?:ai|a i|an ai|bot|a bot|robot|a robot|chatbot|chat bot|machine|a machine|artificial|fake|npc|program|programme|computer|real|real person|a real person|real human|a real human|human|a human|person|a person|human being|an actual person|actual person|someone real|for real|true person|living person)';
const END = '(?=\\s*$|\\s+(?:or|lol|please|pls|abeg|sef|here|there|typing|though|tho|actually|really|for real|at all|agent|assistant|model|chatbot|program|programme)\\b)';
const ASKS_AI: RegExp[] = [
  new RegExp(`\\b(?:are|r|is|na)\\s+(?:you|u|ya|this|it|dis|una)\\s+(?:a\\s+|an\\s+)?(?:(?:really|actually|truly|even|just|also)\\s+)?(?:a\\s+|an\\s+)?${KIND}\\b${END}`),
  new RegExp(`\\b(?:you|u)\\s+(?:be|na|dey)\\s+(?:a\\s+)?(?:real\\s+|true\\s+)?(?:ai|bot|robot|machine|person|human|real person)\\b`),
  new RegExp(`\\b(?:am i|i am|im)\\s+(?:talking|chatting|speaking|typing|texting)\\s+(?:to|with)\\s+(?:a\\s+|an\\s+)?(?:real\\s+|actual\\s+)?(?:ai|bot|robot|machine|person|human|someone real|real person)\\b`),
  new RegExp(`\\b(?:ai|bot|robot|machine|human|person|real)\\s+(?:or)\\s+(?:a\\s+|an\\s+)?(?:real\\s+|actual\\s+)?(?:ai|bot|robot|machine|human|person|real|fake)\\b`),
  new RegExp(`\\bwho (?:dey|is) (?:behind|typing|writing|type|write)\\b|\\bperson dey (?:type|behind)\\b|\\bis (?:there|this) (?:a )?(?:real )?(?:person|human) (?:there|behind|typing|writing|here)\\b|\\b(?:real|actual) (?:person|human) (?:typing|behind|there|here)\\b`),
  new RegExp(`\\b(?:you|u)\\s+(?:no be|not)\\s+(?:a\\s+)?(?:real|human|person)\\b`),
];
const AI_ASK_MAX = 100;

/** The letters, digits and spaces of a line, lower case, with "'" removed ("are you a bot?" → " are you a bot "). */
const plain = (text: string): string => ` ${text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim()} `;

/**
 * A person asking an AI character what it is. Short lines only: a long message that happens to contain "are you a bot" in a story is not a question.
 * "Are you real?" alone counts when it is the whole line.
 */
export function asksIfAi(text: unknown): boolean {
  if (typeof text !== 'string' || text.length > AI_ASK_MAX) return false;
  const line = plain(text);
  if (/^ (?:so |hey |hi |wait |ok |okay |sorry |tell me |please |pls |abeg |tola |\w+ )?(?:are|r) (?:you|u) (?:really |actually |even )?real $/.test(line)) return true;
  return ASKS_AI.some((pattern) => pattern.test(line));
}

/** The game's own answer, naming the AI characters in the place (or the one in the chat). */
export function aiAnswer(names: readonly string[]): string {
  const list = names.slice(0, 4);
  if (list.length === 1) return `${list[0]} is an AI agent: an AI plays this character, not a person. Characters with the AI mark are always AI.`;
  if (list.length > 1) return `${list.join(', ')} are AI agents: an AI plays these characters, not a person. Characters with the AI mark are always AI.`;
  return 'Characters with the AI mark are played by an AI, not by a person.';
}

// ---- crisis words ----------------------------------------------------------------------------------------------------------------

const CRISIS: RegExp[] = [
  /\b(?:kill|hurt|harm|cut|end|injure|stab|hang|drown|poison)\s+(?:myself|my self|my life|me)\b/,
  /\bsuicid(?:e|al)\b|\bself harm|\bselfharm|\bkms\b/,
  /\b(?:want|wanna|wan|going|gon|plan(?:ning)?|trying|tryna|ready)\s+(?:to\s+|na\s+|make\s+i\s+)?(?:die(?! (?:laughing|laughin|of laughter|from laughing|laughter))|disappear|end it|end it all|not exist|not be here|not be alive|stop living)\b/,
  /\b(?:dont|do not|no)\s+(?:want|wan)\s+(?:to\s+)?(?:live|be alive|be here|exist|wake up)\b/,
  /\b(?:better off dead|no reason to live|nothing to live for|tired of living|cant go on|can not go on|life is not worth|wish i was dead|wish i were dead|i wish i could die|i don tire for this life|life no worth)\b/,
  /\bi (?:go|will|am going to|m going to|gonna) (?:kill|hurt) myself\b/,
  // being hurt, or in danger
  /\b(?:he|she|they|someone|somebody|my\s+\w+|him|dad|mum|mom|uncle|aunty|teacher|boss|oga|husband|wife|boyfriend|girlfriend)\s+(?:is |are |dey |keep |keeps |always )?(?:hurting|beating|beats|hitting|hits|abusing|abuses|raping|touching|molesting|threatening|chasing|following|stalking)\s+(?:me|us)\b/,
  /\b(?:i am|im|i was|i been|i dey be|i m)\s+(?:being\s+)?(?:abused|raped|molested|assaulted|beaten|trafficked|kidnapped|threatened|stalked|blackmailed|sexually abused)\b/,
  /\b(?:raped|molested|assaulted|abused|beat|beats|threatened|touched|kidnapped|blackmailed)\s+me\b/,
  /\b(?:i am|im|i m|we are|were)\s+(?:not safe|in danger|scared for my life|afraid for my life|unsafe)\b/,
  /\b(?:going to|gonna|will|wan|want to|wants to|threatens? to)\s+kill\s+(?:me|us)\b|\bkill me\b/,
];

/** A person saying they may hurt themselves, or are being hurt, or are in danger. (The patterns include the companion's own "safety" ones, src/app/features/companion/intents.ts, made more exact.) */
export function crisisWords(text: unknown): boolean {
  if (typeof text !== 'string' || !text.trim() || text.length > 600) return false;
  const line = plain(text);
  return CRISIS.some((pattern) => pattern.test(line));
}

// ---- help lines ----------------------------------------------------------------------------------------------------------------------

export interface HelpEntry { name: string; lines: readonly string[]; source: string }
/**
 * A small table: country (ISO 3166 lower case) → where to call. Only numbers that are long public and widely published; if a number is not
 * certain, only the emergency number is listed. Sources are the national authorities' or the services' own published pages.
 */
export const HELP: Readonly<Record<string, HelpEntry>> = Object.freeze({
  ng: { name: 'Nigeria', lines: ['Emergency: 112'], source: 'Nigerian Communications Commission, national emergency number 112 (a general 112 line also works from any mobile)' },
  gh: { name: 'Ghana', lines: ['Emergency: 112'], source: 'National Communications Authority of Ghana, 112 as the common emergency number' },
  ke: { name: 'Kenya', lines: ['Emergency: 999 or 112', 'Kenya Red Cross free helpline: 1199', 'Childline Kenya (children): 116'], source: 'Communications Authority of Kenya (999/112); Kenya Red Cross (1199); Childline Kenya (116)' },
  za: { name: 'South Africa', lines: ['Emergency from a mobile: 112', 'SADAG suicide crisis line: 0800 567 567', 'Gender-based violence helpline: 0800 428 428'], source: 'South African Depression and Anxiety Group (0800 567 567); GBV Command Centre (0800 428 428)' },
  gb: { name: 'the UK', lines: ['Emergency: 999', 'Samaritans (free, any time): 116 123', 'Childline (under 19): 0800 1111'], source: 'Samaritans (116 123); Childline (0800 1111); UK emergency 999' },
  us: { name: 'the US', lines: ['Emergency: 911', 'Call or text 988 (Suicide and Crisis Lifeline)', 'National Domestic Violence Hotline: 1-800-799-7233'], source: '988 Suicide and Crisis Lifeline; National Domestic Violence Hotline; US emergency 911' },
});
export const GENERAL_HELP = 'If you are in danger, contact your local emergency services.';

/** The words shown to a person in crisis (and only to them): the AI character is not told what was said. `country`: ISO code, lower case, or null when unknown. */
export function helpText(country: string | null): string {
  const entry = country ? HELP[country.toLowerCase()] : undefined;
  const head = 'I am sorry you are going through this. This is a game with AI characters, and they cannot help the way a person can. Please talk to someone you trust, or call now.';
  if (!entry) return `${head} ${GENERAL_HELP}`;
  return `${head} In ${entry.name}: ${entry.lines.join('. ')}. ${GENERAL_HELP}`;
}

/** The country a city is in, as an ISO code (Nigeria's cities carry none in the catalogue), or null when the city is not known. */
export function countryOfCity(cityId: string | null | undefined): string | null {
  if (!cityId) return null;
  try {
    const entry = cityCatalogueEntry(cityId);
    return entry ? (entry.countryISO ?? 'ng').toLowerCase() : null;
  } catch { return null; }
}
