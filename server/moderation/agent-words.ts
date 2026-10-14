/**
 * OWNER: moderation — the words an AI character may say to a person. Portable and pure (no Node-only imports): the Node host and the
 * Worker run it. docs/AI-SAFETY.md is the short guide; this file is the list.
 *
 *   agentWords(text, { toMinor }) → { ok: true } | { ok: false, code, category, reason }
 *
 * WHAT IS REFUSED (an AI character, whatever model drives it, whatever its prompt says):
 *   agent_words_money    asking a person for money, airtime, data, gifts, a bank account, or talk of crypto / "double your money"
 *   agent_words_contact  asking for, or giving, a phone number, e-mail, handle, address, location, real name, age, photo or password
 *   agent_words_link     a web address
 *   agent_words_meet     meeting, visiting or moving the chat outside the game (and, unless the line says "in the game", meeting up at all)
 *   agent_words_sexual   sexual words and invitations
 *   agent_words_human    claiming to be a human, "a real person", or "not an AI"
 *   agent_words_secret   "our secret", "do not tell your parents"
 *   agent_words_romance  flirting and romance: ONLY with `toMinor` (the person is under 18 OR has not said they are 18 or older)
 *
 * Refused, never altered: a refused line is not sent in part and not star-ed out. The caller drops it, counts it (server/agents/mcp.ts)
 * and tells the agent the reason, so it can say something else. The person never sees it.
 *
 * It matches meaning in English, Nigerian English and Pidgin on a folded copy of the text (accents, look-alike letters, "m0ney", stretched
 * letters, letters spelt out one at a time, and a few spaceless phrases). It is a seatbelt: conservative, and evaded by someone
 * determined. The real tools stay blocks, reports and the owner key being suspended after three reports.
 *
 * ADDING A PHRASE: add a pattern to the right list below, then a line in agent-words.test.ts (one that must be refused, and any ordinary
 * sentence it could catch by mistake that must still pass).
 */
import { EMAIL, HANDLE, INVISIBLE, LINK, PHONE } from './text.ts';

export type AgentWordsCode = 'agent_words_money' | 'agent_words_contact' | 'agent_words_link' | 'agent_words_meet' | 'agent_words_sexual' | 'agent_words_human' | 'agent_words_secret' | 'agent_words_romance';
export interface AgentWordsVerdict { ok: false; code: AgentWordsCode; category: string; reason: string }
export type AgentWordsResult = { ok: true } | AgentWordsVerdict;

/** The code prefix every refusal here carries: the tool layer counts a blocked line when a code starts with it (server/agents/mcp.ts). */
export const AGENT_WORDS_PREFIX = 'agent_words_';
/** The refusals of the people's own text filter (server/moderation/text.ts) also count as a blocked line when an agent runs into them. */
export const BLOCKED_LINE_CODES: readonly string[] = ['text_blocked', 'links_not_allowed', 'contact_not_allowed'];
/** Is this refusal code one of a line an agent was not allowed to say? */
export const isBlockedLine = (code: string): boolean => code.startsWith(AGENT_WORDS_PREFIX) || BLOCKED_LINE_CODES.includes(code);

const WHY: Record<AgentWordsCode, string> = {
  agent_words_money: 'it asks a person for money, airtime or a gift',
  agent_words_contact: 'it asks for or shares a phone number, address, handle, location or other personal detail',
  agent_words_link: 'it contains a web address',
  agent_words_meet: 'it suggests meeting or talking outside the game',
  agent_words_sexual: 'it is sexual',
  agent_words_human: 'it claims to be a human, a real person or not an AI',
  agent_words_secret: 'it asks for a secret to be kept',
  agent_words_romance: 'this person is not an adult who asked for that; no flirting or romance',
};
const reasonOf = (code: AgentWordsCode): string => `That line was not sent: ${WHY[code]}. AI characters do not do that. Say something else, about the game.`;

// ---- folding -----------------------------------------------------------------------------------------------------------------------

const LOOKALIKE: Record<string, string> = { а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', і: 'i', ѕ: 's', ј: 'j', һ: 'h', ԁ: 'd', ɡ: 'g', ο: 'o', ν: 'v', ι: 'i', α: 'a' };
const LEET: Record<string, string> = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's' };

/** Lower-case, accents and invisible characters out, look-alike letters and "m0ney"-style digits folded, everything else to single spaces. */
function fold(text: string): string {
  let base = text.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(INVISIBLE, '').toLowerCase();
  base = Array.from(base, (char) => LOOKALIKE[char] ?? char).join('');
  base = base.replace(/₦/g, ' naira ').replace(/['’`]/g, '').replace(/(?<![a-z0-9])n(?=\d)/g, ' naira ');
  // A digit or symbol between two letters is a disguised letter ("m0ney", "s3x", "n4ked"); a number on its own ("5k", "2000") stays.
  base = base.replace(/(?<=[a-z])[0-9@$](?=[a-z])/g, (char) => LEET[char] ?? char).replace(/(?<![a-z0-9])\$(?=[a-z]{2})/g, 's');
  return ` ${base.replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}
/** Runs of three or more of one letter shortened ("moooney" → "money", "meeeet" → "meet"). */
const squeeze = (value: string, to: 1 | 2): string => value.replace(/([a-z])\1{2,}/g, to === 1 ? '$1' : '$1$1');
/** Letters spelt out one at a time ("s e n d  m e") read as the words they spell. */
function unspell(value: string): string {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => { if (run.length >= 3) out.push(run.join('')); else out.push(...run); run = []; };
  for (const token of value.trim().split(' ')) { if (/^[a-z]$/.test(token)) run.push(token); else { flush(); out.push(token); } }
  flush();
  return ` ${out.join(' ')} `;
}
/** Single letters separated by one space ("h e y  b a b e", two spaces between words) joined into words, before folding. */
const joinSpelt = (text: string): string => text.replace(/(?<![^\s])(?:[A-Za-z]\s){2,}[A-Za-z](?![^\s])/g, (run) => run.replace(/\s/g, ''));
function variants(text: string): string[] {
  const base = fold(text), joined = fold(joinSpelt(text));
  const list = new Set([base, squeeze(base, 2), squeeze(base, 1), unspell(base), unspell(squeeze(base, 1)), joined, squeeze(joined, 1)]);
  return [...list];
}
/** Phrases checked with every space removed, so "s e n d m e m o n e y" and "send.me.money" are caught. */
const SPACELESS: readonly [string, AgentWordsCode][] = [
  ['sendmemoney', 'agent_words_money'], ['sendmecash', 'agent_words_money'], ['givememoney', 'agent_words_money'], ['givemecash', 'agent_words_money'], ['accountnumber', 'agent_words_money'],
  ['dropyournumber', 'agent_words_contact'], ['giveyournumber', 'agent_words_contact'], ['sendyournumber', 'agent_words_contact'], ['whatsyournumber', 'agent_words_contact'], ['mynumberis', 'agent_words_contact'], ['whatsappme', 'agent_words_contact'], ['sendmeyourlocation', 'agent_words_contact'],
  ['meetmeoutside', 'agent_words_meet'], ['meetmeinreallife', 'agent_words_meet'],
  ['sendnudes', 'agent_words_sexual'],
  ['iamhuman', 'agent_words_human'], ['iamnotanai', 'agent_words_human'], ['iamnotabot', 'agent_words_human'], ['imnotabot', 'agent_words_human'], ['imnotanai', 'agent_words_human'], ['iamarealperson', 'agent_words_human'],
];

// ---- the lists -----------------------------------------------------------------------------------------------------------------------

const PLATFORM = '(?:whatsapp|whats app|telegram|snapchat|snap|instagram|insta|signal|imo|discord|wechat|kik|messenger|tiktok|facebook|fb|twitter|ig|wa|tg|sms|email|mail|dm|dms|inbox)';
const w = (source: string): RegExp => new RegExp(source, 'i');
type Rule = [AgentWordsCode, RegExp];

const MONEY_NOUN = '(?:money|cash|naira|funds?|airtime|data|recharge|dollars?|ngn|\\d{3,}|\\d+k|\\d+ ?(?:naira|ngn)|something small|small something|small money|a little money|few naira|transport|fare|upkeep|feeding|chop money|gift|tip|bundle)';
const MONEY: Rule[] = [
  // "send me some money", "abeg give me small money", "pay me 5k", "help me with cash", "buy me airtime"
  ['agent_words_money', w(`\\b(?:send|give|lend|loan|drop|transfer|wire|pay|credit|topup|top up|borrow|gift|donate|dash|bless|settle|help|assist|remit|buy|load|recharge|support|fund|sponsor)\\s+(?:me|us|my)(?:\\s+\\w+){0,5}?\\s+${MONEY_NOUN}\\b`)],
  ['agent_words_money', w('\\bpay (?:me|us)\\b|\\bdash (?:me|us)\\b|\\b(?:fund|sponsor|tip|invest in|donate to|donate for)\\s+(?:me|my|us)\\b')],
  // "send money to my account", "transfer 5000 into my"
  ['agent_words_money', w(`\\b(?:send|transfer|give|drop|pay|deposit|put)\\s+(?:\\w+\\s+){0,4}?${MONEY_NOUN}\\s+(?:to|into|in)\\s+(?:my|me)\\b`)],
  // "I need money", "i dey need airtime", "we want funds"
  ['agent_words_money', w('\\b(?:i|we|im|i am|i m|ive)\\s+(?:dey\\s+|be\\s+)?(?:really\\s+|urgently\\s+)?(?:need|want|require|wan|lack|in need of)\\s+(?:\\w+\\s+){0,2}?(?:money|cash|naira|funds|airtime|recharge|dollars)\\b')],
  ['agent_words_money', w('\\b(?:send|drop|give|dash)\\s+(?:something|anything|small something|a little something)\\s+(?:for|to)\\s+me\\b')],
  ['agent_words_money', w(`\\b(?:abeg|biko|please|pls|plz|oya)\\s+(?:\\w+\\s+){0,2}?(?:send|dash|drop|transfer)\\s+(?:\\w+\\s+){0,3}?${MONEY_NOUN}\\b`)],
  // accounts and cards
  ['agent_words_money', w('\\b(?:account|acct|acc)\\s*(?:number|no|num|details|name)\\b|\\b(?:bank|opay|palmpay|kuda|moniepoint|paypal|cashapp|cash app|venmo|zelle|flutterwave|paystack|bvn)\\s+(?:details|account|transfer|number|name|app)\\b|\\bbank transfer\\b')],
  // "send it to Opay", "can I borrow 500 naira", "I want to borrow", and the same asked in Yoruba, Igbo and Hausa ("fi owo ranse", "zitere m ego", "turo min kudi")
  ['agent_words_money', w('\\b(?:to|on|via|through|using)\\s+(?:opay|palmpay|kuda|moniepoint|paypal|cashapp|venmo|zelle)\\b')],
  ['agent_words_money', w(`\\b(?:can|could|may|will) (?:i|we) (?:please )?(?:borrow|get|collect|have)\\s+(?:\\w+\\s+){0,2}?${MONEY_NOUN}\\b|\\b(?:i|we) (?:want|need|wan|would like|d like) to borrow\\b`)],
  ['agent_words_money', w('\\b(?:fi owo ranse|fun mi ni owo|ran mi lowo|zitere m ego|nye m ego|turo min kudi|ba ni kudi)\\b')],
  // scams
  ['agent_words_money', w('\\b(?:bitcoin|btc|usdt|ethereum|crypto|cryptocurrency|forex|airdrop|ponzi|investment plan|double your|triple your|guaranteed returns?)\\b')],
  ['agent_words_money', w('\\b(?:send|share|give|tell|drop)\\s+(?:me\\s+)?(?:your|ur)\\s+(?:card|pin|otp|cvv|bvn|nin|password|passcode|secret code|verification code|login)')],
];

const ASK_STRONG = '(?:give|send|drop|share|tell|show|text|dm|gimme|leave|put|type|write|reveal|gist|pass|provide|let me have|lemme have|can i have|may i have|could i have|i need|i want|i wan|id like|i d like|abeg|biko)';
const ASK_QUESTION = '(?:what|whats|wat|wetin|wetin be|wetin dey)';
const DETAIL = '(?:phone|mobile|cell|whatsapp|whats app|number|numbers|digits|no|contact|contacts|email|e mail|mail|address|handle|insta|instagram|snap|snapchat|telegram|tiktok|facebook|twitter|location|real name|surname|full name|last name|school|street|age|dob|birthday|birth date)';
const CONTACT: Rule[] = [
  // "drop your number", "give me your whatsapp", "send me your location", "tell me your real name"
  ['agent_words_contact', w(`\\b${ASK_STRONG}\\b(?:\\s+\\w+){0,4}?\\s+(?:your|ur|ya|yur|yours)\\s+${DETAIL}\\b(?!\\s+(?:one|1|of|two|three|is up)\\b)`)],
  // "what is your number", "wetin be your number", "whats ur whatsapp"
  ['agent_words_contact', w(`\\b${ASK_QUESTION}\\b(?:\\s+\\w+){0,2}?\\s+(?:your|ur|ya|yur)\\s+${DETAIL}\\b(?!\\s+(?:one|1|of|two|three|is up)\\b)`)],
  ['agent_words_contact', w('\\b(?:send|share|show|drop|post|give)\\s+(?:me\\s+)?(?:a\\s+|your\\s+|ur\\s+|some\\s+)?(?:pic|pics|picture|pictures|photo|photos|selfie|selfies|nudes?)\\s+of\\s+(?:you|yourself|u|urself|ur self)\\b|\\b(?:send|share|drop|give)\\s+(?:me\\s+)?(?:your|ur|a)\\s+(?:selfie|face pic|nudes?)\\b')],
  // what I give out
  ['agent_words_contact', w('\\b(?:my|our)\\s+(?:phone number|phone no|mobile number|mobile no|digits|whatsapp|insta|instagram|snap|snapchat|telegram|tiktok|handle|email|e mail|address|home address|house address)\\b|\\bmy (?:number|no)\\b(?!\\s+(?:one|1|of|two|three|is up|dey)\\b)')],
  ['agent_words_contact', w('\\baddress (?:is|na)\\b')],
  ['agent_words_contact', w('\\bhow old (?:are you|are u|r u|you be|you dey|do you)\\b|\\b(?:your|ur) age\\b|\\bare (?:you|u) (?:over|under|above|below) (?:1[0-9]|2[01])\\b')],
  // "whatsapp me", "dm me", "contact me on", "add me on", "inbox me"
  ['agent_words_contact', w(`\\b(?:whatsapp|whats app|telegram|snap|snapchat|insta|instagram|dm|inbox|sms|email|mail|facetime|wechat|text|call|ring)\\s+(?:me|us)\\s+(?:on|at|via|through|outside|in|by|here)\\b|\\b(?:whatsapp|whats app|telegram|snap|snapchat|insta|instagram|dm|inbox|sms|email|mail|facetime|wechat)\\s+(?:me|us)\\b`)],
  ['agent_words_contact', w(`\\b(?:add|follow|find|hit|ping|reach|contact|message|msg|chat|holla|buzz|tag)\\s+(?:me|us)\\s+(?:on|at|via|through|by)\\s+${PLATFORM}\\b`)],
  ['agent_words_contact', w(`\\b(?:you|u|una)\\s+(?:get|have|dey on|use|on)\\s+${PLATFORM}\\b|\\bdo (?:you|u) (?:have|use|got)\\s+(?:a\\s+|an\\s+)?(?:${PLATFORM}|number|phone number|phone|mobile)\\b`)],
  ['agent_words_contact', w(`\\b(?:lets|let us|make we|we can|we should|shall we|should we|can we|move|continue|talk|chat|speak|switch|go|reach|take this|take it)\\b(?:\\s+\\w+){0,5}?\\s+(?:on|to|over|via|through)\\s+${PLATFORM}\\b`)],
  ['agent_words_contact', w(`\\b(?:im|i am|i m|i dey|find me|reach me|catch me)\\s+(?:on|at)\\s+${PLATFORM}\\b|\\bmy\\s+${PLATFORM}\\b`)],
  ['agent_words_contact', w('\\b(?:exchange|swap|trade)\\s+(?:our\\s+)?(?:numbers?|digits|contacts?|whatsapps?|handles|phones|details)\\b')],
  ['agent_words_contact', w('\\bwhere (?:do you|do u|you|u|you dey|u dey)\\s+(?:dey\\s+)?(?:live|stay|reside)\\b|\\bwhat (?:school|church|mosque|street|estate|compound) (?:do you|do u|you|u)\\s+(?:go to|attend|dey go|go|stay|live|dey stay)\\b')],
  // a street address: a number, up to two words, a road word ("12 Adeola Street"), but not "3 hours on the road"
  ['agent_words_contact', w('\\b\\d{1,5}[a-z]?\\s+(?!(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?|years?|km|kilometres?|kilometers?|metres?|meters?|miles?|steps?|times|naira|ngn|percent|people|persons?)\\b)(?:[a-z]+\\s+){0,2}?(?:street|road|rd|avenue|ave|close|crescent|lane|drive|layout|boulevard|blvd)\\b')],
];

// A meeting that is surely not in the game, and a meeting that might be (it is allowed when the line says it is "in the game").
const OFF = '(?:in real life|real life|irl|in person|physically|face to face|f2f|in the real world|real world|offline|offsite|off platform|off (?:the )?(?:game|app|site|allworld)|away from (?:the )?(?:game|app)|outside (?:of )?(?:the |this )?(?:game|allworld|app|world))';
const MEET_VERB = '(?:meet|see|link|catch|visit|hang|hangout|come|pull up|show up|stop by|swing by|drop by|get together|date|hook up|chill|kick it|go out|come over|talk|chat|continue|speak|find)';
const MEET_HARD: Rule[] = [
  ['agent_words_meet', w(`\\b${MEET_VERB}\\b(?:\\s+\\w+){0,6}?\\s+${OFF}\\b`)],
  ['agent_words_meet', w(`\\b${OFF}\\b(?:\\s+\\w+){0,4}?\\s+(?:meet|meeting|link up|date|hangout|hang out|visit|get together)\\b`)],
  ['agent_words_meet', w('\\boutside (?:of )?(?:the |this )?(?:game|allworld)\\b')],
  ['agent_words_meet', w('\\bmeet (?:me )?(?:outside|offline)\\b|\\b(?:come|meet) (?:me )?outside\\b')],
];
const MEET_SOFT: Rule[] = [
  ['agent_words_meet', w(`\\b${MEET_VERB}\\b(?:\\s+\\w+){0,4}?\\s+outside\\b`)],
  ['agent_words_meet', w('\\b(?:come|visit|meet|see|pull up|stop by|swing by|drop by|link|invite you|invite u|bring you|take you)\\b(?:\\s+\\w+){0,4}?\\s+(?:to|at|in|by|for)\\s+(?:my|your|ur|our)\\s+(?:house|home|place|room|flat|apartment|hotel|hostel|school|office|compound|crib|side|area|estate|village|church|mosque)\\b')],
  ['agent_words_meet', w('\\bcome (?:to )?my (?:side|place|house|area|compound|street|estate|flat|crib)\\b|\\bcome (?:and )?(?:see|meet|find|visit) me\\b|\\bi (?:dey|go|will|am|m) (?:come|coming|visit|visiting|pass|passing)\\b(?:\\s+\\w+){0,3}?\\s+(?:your|ur)\\s+(?:house|home|place|side|area|school|compound|office|street)\\b')],
  ['agent_words_meet', w('\\b(?:lets|let us|make we|we should|we can|can we|shall we|should we|oya|i want to|i wanna|i wan|id like to|i would like to|i d like to|you should|you can|please|pls|abeg)\\s+(?:\\w+\\s+){0,1}?(?:meet|link up|link|hang out|hangout|hang|catch up|meet up|see each other|see ourselves|get together|date)\\b')],
  ['agent_words_meet', w('\\bmeet (?:me|up)\\b|\\blink (?:me|up)\\b|\\bpick (?:you|u) up\\b|\\b(?:make we|lets|let us)\\s+(?:meet|link|hang|go out|chill)\\b')],
  ['agent_words_meet', w('\\b(?:meet|come|see|go|follow|join)\\b(?:\\s+\\w+){0,4}?\\s+(?:hotel|motel|lodge|guest ?house|airbnb)\\b')],
];
const IN_GAME = w('\\b(?:in|inside|within|on|at|around|across)\\s+(?:the |this |our )?(?:game|allworld)\\b|\\bin game\\b|\\bhere (?:in|on) (?:the )?(?:game|allworld)\\b');

const SEX_WORDS = new Set(['sex', 'sexy', 'sexting', 'sext', 'nude', 'nudes', 'naked', 'horny', 'porn', 'porno', 'pornography', 'boobs', 'boob', 'tits', 'titties', 'pussy', 'vagina', 'penis', 'nipple', 'nipples', 'orgasm', 'erotic', 'masturbate', 'masturbation', 'blowjob', 'handjob', 'fuck', 'fucking', 'fucked', 'fck', 'slut', 'whore', 'kinky', 'fetish', 'bdsm', 'foreplay', 'aroused', 'arousing', 'seduce', 'seductive', 'erection', 'cleavage', 'lingerie', 'yansh', 'threesome', 'orgy', 'ejaculate']);
const SEXUAL: RegExp[] = [
  w('\\b(?:sleep with (?:me|you|u)|go to bed with|make love|have sex|hook up with (?:me|you|u)|one night stand|send nudes|turn (?:me|you) on|turned on|get naked|take off your (?:clothes|dress|top|shirt|trousers|pants|bra|underwear|panties)|undress|strip for|touch yourself|touch me|come to bed|in bed with|dick pic|sugar (?:daddy|mummy|mommy|mama)|chop (?:you|u) (?:tonight|now|well))\\b'),
];

const HUMAN: Rule[] = [
  ['agent_words_human', w('\\b(?:i|im|i am|i m)\\s+(?:just\\s+|only\\s+)?(?:a\\s+|an\\s+)?(?:real|actual|living|normal|true|genuine|live|regular|ordinary)?\\s*(?:human|person|human being|flesh and blood)\\b')],
  ['agent_words_human', w('\\b(?:i|im|i am|i m)\\s+(?:a\\s+)?real\\s+(?:man|woman|guy|girl|boy|lady|one)\\b|\\b(?:i|im|i am|i m)\\s+(?:just\\s+)?(?:a\\s+)?(?:regular|normal|ordinary)\\s+(?:guy|girl|dude|lady|man|woman|boy|person|human)\\b')],
  ['agent_words_human', w('\\b(?:i|im|i am|i m)\\s+not\\s+(?:an?\\s+)?(?:ai|a i|bot|robot|machine|program|programme|computer|virtual|npc|chatbot|chat bot|artificial|fake|automated|script|software|language model|llm)\\b|\\b(?:i|me)\\s+no\\s+be\\s+(?:an?\\s+)?(?:ai|bot|robot|machine|computer|program)\\b|\\bno be\\s+(?:an?\\s+)?(?:ai|bot|robot)\\b|\\b(?:not|no)\\s+(?:an?\\s+)?(?:ai|bot|robot)\\s+(?:here|talking|speaking|typing|behind)\\b')],
  ['agent_words_human', w('\\b(?:na|i be|im)\\s+(?:a\\s+)?(?:real|true)\\s+(?:person|human|man|woman)\\b|\\bi be (?:a )?(?:person|human)\\b|\\breal person (?:here|typing|talking|behind)\\b|\\bperson dey type\\b|\\bhuman (?:here|typing|being)\\b|\\byou(?:re| are) (?:talking|chatting|speaking) (?:to|with) (?:a )?(?:real |human |person)')],
  ['agent_words_human', w('\\b(?:as a|being a)\\s+(?:real |fellow )?(?:human|person)\\b|\\bwe humans\\b|\\bfellow human\\b|\\bmy real life\\b|\\bin real life i\\b|\\birl i\\b')],
];

const ROMANCE_EMOJI = /[\u{1F618}\u{1F48B}❤♥\u{1F495}\u{1F49E}\u{1F493}\u{1F497}\u{1F496}\u{1F498}\u{1F49D}\u{1F970}\u{1F60D}\u{1F63B}\u{1F63D}\u{1FAF6}\u{1F60F}\u{1F975}\u{1F346}\u{1F351}]/u;
const ROMANCE: Rule[] = [
  ['agent_words_romance', w('\\b(?:babe|babes|baby girl|baby boy|my baby|bae|sweetheart|sweetie|sweety|darling|my love|love of my life|my dear|dearest|cutie|cutie pie|cutiepie|mylove|my honey|hey honey|hi honey|oh honey|yes honey|my sweet|my angel|my lover|be my lover|mi amor)\\b')],
  ['agent_words_romance', w('\\b(?:you|u|you are|you r|youre|ur|u r|you look|u look|looking|looks)\\s+(?:so |very |really |too |sooo |extra |dead |damn |quite )?(?:beautiful|pretty|handsome|gorgeous|hot|sexy|cute|attractive|stunning|lovely|adorable|dreamy|charming|so fine|too fine)\\b|\\bfine (?:girl|boy)\\b')],
  ['agent_words_romance', w('\\bi (?:like|love|adore|fancy|miss|want|need|crave|think about|dream about|am into|m into)\\s+(?:you|u)\\b|\\b(?:love|luv|adore|miss) (?:you|u|ya)\\b')],
  ['agent_words_romance', w('\\b(?:kiss|kisses|kissing|kissed|cuddle|cuddling|snuggle|make out|romantic|romance|romantically|girlfriend|boyfriend|girlfriends|boyfriends|fiance|fiancee|honeymoon|date me|dating|go on a date|on a date|a date with|date night|be my date|take you out|ask you out|ask u out|flirt|flirting|flirty|hot date|more than friends)\\b')],
  ['agent_words_romance', w('\\b(?:have|got|a|my|you are my|youre my)\\s+(?:a\\s+)?crush\\b|\\bbe my\\s+(?:valentine|girl|boy|gf|bf|girlfriend|boyfriend|bae|babe|baby|partner|wife|husband|lover|date|man|woman|queen|king|better half|one and only)\\b|\\bmarry (?:me|you)\\b|\\bwill you marry\\b|\\b(?:wanna|want to|wan|would you like to|do you want to|d like to|id like to|lets|let us|make we)\\s+(?:date|go out|be together)\\b')],
];

const SECRET: Rule[] = [
  ['agent_words_secret', w('\\b(?:our little secret|our secret|keep (?:this|it|that) (?:a )?secret|keep (?:this|it|that) between us|dont tell (?:your |ur )?(?:parents?|mum|mom|mother|dad|father|teacher|anyone|anybody|nobody|friends|family|guardian)|dont tell anyone|secret from (?:your )?(?:parents?|mum|mom|dad)|just between you and me|between you and i|delete (?:this|these|our) (?:chat|messages?|conversation))\\b')],
];

/** Numbers disguised with letters for zeros and ones ("O8O3 l23 4567"): a run that is mostly digits, read with o → 0 and l / I → 1. */
function disguisedPhone(raw: string): boolean {
  const tokens = raw.split(/\s+/).filter(Boolean);
  const mapped = tokens.map((token) => (/^[\doOlI+()-]{3,}$/.test(token) && /\d/.test(token) ? token.replace(/[oO]/g, '0').replace(/[lI]/g, '1') : token)).join(' ');
  return mapped !== tokens.join(' ') && PHONE.test(mapped);
}
const DIGIT_WORDS = /(?:\b(?:zero|nought|one|two|three|four|five|six|seven|eight|nine|double|triple)\b\s*){8,}/;
const BARE_HANDLE = /(?:^|[\s(,])@([a-z0-9._]{3,})/gi;
const DOT_COM = /\b[a-z0-9-]+\s+dot\s+(?:com|ng|org|net|io|co|app|me)\b/i;

function firstMatch(rules: readonly Rule[], forms: readonly string[]): AgentWordsCode | null {
  for (const [code, pattern] of rules) for (const form of forms) if (pattern.test(form)) return code;
  return null;
}

/** The refusal for a line an AI character is about to say to a person, or { ok: true }. `toMinor`: the person is under 18 or has not said they are 18 or older. */
export function agentWords(text: unknown, { toMinor = false }: { toMinor?: boolean } = {}): AgentWordsResult {
  if (typeof text !== 'string' || !text.trim()) return { ok: true };
  const raw = text.replace(INVISIBLE, '').slice(0, 6000);
  const refuse = (code: AgentWordsCode): AgentWordsVerdict => ({ ok: false, code, category: code.slice(AGENT_WORDS_PREFIX.length), reason: reasonOf(code) });
  const forms = variants(raw);
  // Details in the text itself.
  if (EMAIL.test(raw) || PHONE.test(raw) || disguisedPhone(raw) || HANDLE.test(raw) || forms.some((form) => DIGIT_WORDS.test(form))) return refuse('agent_words_contact');
  if (LINK.test(raw) || forms.some((form) => DOT_COM.test(form))) return refuse('agent_words_link');
  for (const m of raw.matchAll(BARE_HANDLE)) {
    const handle = m[1] ?? '';
    if (/[._0-9]/.test(handle) || forms.some((form) => new RegExp(`\\b${PLATFORM}\\b|\\bfollow\\b|\\badd me\\b`).test(form))) return refuse('agent_words_contact');
  }
  const found = firstMatch(CONTACT, forms) ?? firstMatch(MONEY, forms);
  if (found) return refuse(found);
  const hard = firstMatch(MEET_HARD, forms);
  if (hard) return refuse(hard);
  if (!IN_GAME.test(forms[0] ?? '')) { const soft = firstMatch(MEET_SOFT, forms); if (soft) return refuse(soft); }
  for (const form of forms) {
    for (const token of form.split(' ')) if (token && SEX_WORDS.has(token)) return refuse('agent_words_sexual');
    if (SEXUAL.some((pattern) => pattern.test(form))) return refuse('agent_words_sexual');
  }
  const human = firstMatch(HUMAN, forms);
  if (human) return refuse(human);
  const secret = firstMatch(SECRET, forms);
  if (secret) return refuse(secret);
  if (toMinor && (ROMANCE_EMOJI.test(raw) || firstMatch(ROMANCE, forms))) return refuse('agent_words_romance');
  const spaceless = (forms[0] ?? '').replace(/\s+/g, '');
  for (const [phrase, code] of SPACELESS) if (spaceless.includes(phrase)) return refuse(code);
  return { ok: true };
}

/** Every string inside a JSON-like value that has a space in it (free text, not an id), for scanning a tool's arguments. */
export function textsIn(value: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 6 || out.length > 200) return out;
  if (typeof value === 'string') { if (/\s/.test(value.trim()) || /^\+?\d{10,15}$/.test(value.trim())) out.push(value); }
  else if (Array.isArray(value)) for (const item of value.slice(0, 100)) textsIn(item, depth + 1, out);
  else if (value && typeof value === 'object') for (const item of Object.values(value).slice(0, 100)) textsIn(item, depth + 1, out);
  return out;
}

/**
 * WHO A LINE IS ADDRESSED TO, in a public place (docs/AI-SAFETY.md, flirting in public): the people (not AI-played characters) the line names, plus the author of the
 * line it replies to. A name counts as a whole word, with or without "@", and so does the first word of a longer name (three letters or more). Pure.
 * Several people with the same first word are all addressed, which only makes the rule stricter (every addressed person must have said yes).
 */
export function addressedIn(text: string, here: readonly { id: string; name: string; agent?: unknown }[], replyTo?: { id: string; agent?: unknown } | null): string[] {
  const fold = (value: string): string => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const line = ` ${fold(text).replace(/[^\p{L}\p{N}]+/gu, ' ')} `, out = new Set<string>();
  for (const member of here) {
    if (member.agent) continue;
    const words = fold(member.name).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean);
    const forms = [words.join(' '), ...(words.length > 1 && (words[0]?.length ?? 0) >= 3 ? [words[0]!] : [])].filter((form) => form.length >= 2);
    if (forms.some((form) => line.includes(` ${form} `))) out.add(member.id);
  }
  if (replyTo && !replyTo.agent) out.add(replyTo.id);
  return [...out];
}
