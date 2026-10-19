/**
 * OWNER: moderation — the scam warning (docs/WOW-PLAN.md, Phase 0; docs/AI-SAFETY.md, "The scam warning"). Portable and pure (no Node-only imports): the Node host
 * and the Worker run it.
 *
 *   looksLikeScam(text) → boolean
 *
 * WHAT IT IS. A line that asks for money, a "withdrawal", an account number, a code or a PIN, or offers to "unlock" or "withdraw" a person's game naira, or to turn
 * it into real money, is the shape of the cash-out scam players hate. The RECIPIENT sees a calm banner on that line ("Game naira is never real money. Nobody can
 * withdraw it for you.") with one tap to report it. The flag is decided here, on the server, so it is the same in room chat (`scam: true` on the `chat` frame), in
 * direct and group messages (`Message.scam`) and in feed replies (`ReplyView.scam`).
 *
 * WHAT IT IS NOT. It never blocks or alters a line: the existing rules (the text filter, the no-fee filter, the AI words) still refuse what they refuse, and a line
 * this only flags is delivered as typed. The sender is not told, and never sees the banner on their own line. It is a seatbelt that errs toward saying it: a false
 * alarm costs one calm sentence; a missed scam costs a player their trust.
 *
 * HOW. The money-asking patterns of the AI words (server/moderation/agent-words.ts, `agent_words_money`: "send me 5k", "account number", "send me your OTP"), read on
 * the same folded copies of the text (accents, look-alike letters, `m0ney`, stretched letters), plus the cash-out shapes below. A warning is not a request: "nobody can
 * withdraw game naira" is let through. English, Nigerian English and Pidgin.
 *
 * ADDING A PHRASE: add a pattern to SCAM below, then a line in scam-words.test.ts (one that must flag, and any ordinary sentence it could catch by mistake).
 */
import { firstMatch, MONEY, SPACELESS, variants } from './agent-words.ts';

const w = (source: string): RegExp => new RegExp(source, 'i');

/** Somebody offering to do it for you, or asking you to do it: the words that make "withdraw" a scam rather than a bank (the game has a savings deposit to take out). */
const OFFER = '(?:help|assist|aid|show|teach|guide|fit|go|can|could|will|wil|wan|want|let|make|dey|get|got|have|know|need|must|should)';
const YOU = '(?:you|u|una|yu|ya|ur|your)';
const CASHOUT = '(?:withdraw|withdrawn|withdrawing|withdrawal|withdrawals|withdrew|cash out|cashout|cashing out)';
const SUM = '(?:money|cash|naira|funds?|balance|wallet|winnings|earnings|millions?|billions?|coins?|ngn|dollars?|usd|\\d+k|\\d{3,})';

/** Phrases read with every space removed ("s e n d  m e  m o n e y", "send.me.money"): the money ones of the AI words, and the cash-out ones. */
const SPACELESS_SCAM: readonly string[] = [...SPACELESS.filter(([, code]) => code === 'agent_words_money').map(([phrase]) => phrase), 'withdrawyourmoney', 'withdrawyournaira', 'helpyouwithdraw', 'unlockyourmoney', 'unlockyourmillions', 'sendmeyourotp', 'sendmeyourpin'];

const SCAM: RegExp[] = [
  // "I can help you withdraw", "make I help you withdraw", "I fit cash out for you"
  w(`\\b${OFFER}\\b(?:\\s+\\w+){0,4}?\\s+${YOU}\\b(?:\\s+\\w+){0,3}?\\s+${CASHOUT}\\b`),
  // "withdraw your millions", "withdraw it for you", "withdrawal of your naira", "cash out your winnings"
  w(`\\b${CASHOUT}\\b(?:\\s+\\w+){0,4}?\\s+(?:for\\s+${YOU}|${YOU}\\s+\\w+|${YOU}\\b|${SUM})`),
  // "your withdrawal is ready", "withdrawal fee", "withdrawal agent", "withdrawal portal"
  w(`\\b(?:your|ur|the|a)\\s+(?:\\w+\\s+){0,2}${CASHOUT}\\b|\\b${CASHOUT}\\s+(?:fee|fees|charge|charges|code|pin|link|portal|agent|agents|page|site|app|account)\\b`),
  // "unlock your millions", "unlock withdrawal", "activate your wallet", "verify your account to withdraw"
  w(`\\bunlock(?:ing|ed|s)?\\b(?:\\s+\\w+){0,3}?\\s+(?:${SUM}|withdrawals?|account|wallet|game)\\b`),
  w(`\\b(?:activate|verify|upgrade|confirm|validate|release)\\b\\s+(?:\\w+\\s+){0,2}?(?:${YOU}|the)\\s+(?:\\w+\\s+){0,1}?(?:wallet|account|winnings|earnings|balance|withdrawals?)\\b`),
  // turning game naira into real money, or selling it
  w(`\\b(?:turn|convert|change|exchange|swap|cash|trade|sell|buy|selling|buying)\\s+(?:\\w+\\s+){0,3}?(?:game\\s+)?(?:naira|money|cash|coins?|millions?)\\s+(?:to|into|2|for|at)\\s+(?:\\w+\\s+){0,2}?(?:real|cash|money|dollars?|usd|bank|naira)\\b`),
  w('\\b(?:sell|buy|selling|buying|exchange|swap)\\s+(?:\\w+\\s+){0,3}?game\\s+(?:naira|money|cash|coins?|currency)\\b|\\breal\\s+(?:money|cash|naira)\\s+(?:for|from)\\s+(?:\\w+\\s+){0,2}?(?:game|naira|coins?)\\b'),
  w('\\b(?:sell|buy|selling|buying)\\s+(?:me\\s+|us\\s+)?(?:\\w+\\s+){0,2}?(?:naira|coins?)\\b(?:\\s+\\w+){0,6}?\\s+(?:cash|real|dollars?|usd|bank|transfer)\\b'),
  // the code sent to your phone, or a verification code asked for
  w('\\b(?:send|share|give|tell|drop|forward|read|confirm|type|post)\\s+(?:me\\s+)?(?:the\\s+|your\\s+|ur\\s+|that\\s+|a\\s+)?(?:\\w+\\s+){0,2}?(?:otp|verification code|confirmation code|login code|sms code|security code|six digit code|6 digit code|one time code|one time password|code (?:you|u) (?:got|get|received|see))\\b'),
  w('\\bcode\\b(?:\\s+\\w+){0,3}?\\s+(?:sent|texted|received|delivered|came)\\s+(?:to|on|by)\\s+(?:your|ur)\\b'),
  w('\\b(?:your|ur)\\s+(?:\\w+\\s+){0,1}?(?:code|otp|pin)\\b(?:\\s+\\w+){0,3}?\\s+(?:to|2|so)\\s+(?:\\w+\\s+){0,3}?(?:withdraw|unlock|verify|activate|claim|receive)\\b'),
  // prize bait: "claim your millions", "your winnings are waiting", "you don win ..."
  w('\\bclaim\\s+(?:\\w+\\s+){0,2}?(?:your|ur)\\s+(?:\\w+\\s+){0,2}?(?:millions?|billions?|winnings|prize|reward|jackpot|naira)\\b|\\b(?:your|ur)\\s+(?:\\w+\\s+){0,2}?(?:millions?|billions?|winnings|jackpot)\\s+(?:is|are|dey|has|have)\\s+(?:waiting|ready|pending|locked|frozen|on hold)\\b'),
];

/** A warning, not an ask: "nobody can withdraw game naira", "never send your OTP", "you cannot cash out". The negation must sit right before the verb ("dont worry, I go help you withdraw" is still a scam). */
const NEGATED = w(`\\b(?:no|never|not|nobody|cant|cannot|dont|wont|isnt|arent|neva|without|avoid|stop)\\b(?:\\s+\\w+){0,2}?\\s+(?:${CASHOUT}|unlock(?:ing)?|(?:send|sending|share|sharing|give|giving|tell|telling)\\s+(?:\\w+\\s+){0,2}?(?:otp|code|pin|password|card|bvn))\\b`);

/** The same message is read again each time a thread is opened: remember the last answers (the answer depends only on the text). */
const seen = new Map<string, boolean>();

/** Does this line have the shape of a request for money or a cash-out scam? Read on every folded copy of the line. Pure; never throws. */
export function looksLikeScam(text: unknown): boolean {
  if (typeof text !== 'string' || text.length < 4) return false;
  const known = seen.get(text);
  if (known !== undefined) return known;
  const answer = read(text);
  if (text.length <= 600) { if (seen.size >= 2000) seen.clear(); seen.set(text, answer); }
  return answer;
}

function read(text: string): boolean {
  const forms = variants(text.slice(0, 1000));
  // The money asks come first: "send me 5k", "pay me", "account number", "send me your OTP". 
  const asked = firstMatch(MONEY, forms) !== null;
  const cashout = forms.some((form) => SCAM.some((pattern) => pattern.test(form))) || SPACELESS_SCAM.some((phrase) => (forms[0] ?? '').replace(/\s+/g, '').includes(phrase));
  if (!asked && !cashout) return false;
  return !forms.some((form) => NEGATED.test(form));
}
