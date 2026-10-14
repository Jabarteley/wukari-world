/**
 * OWNER: agents (house agents, docs/HOUSE-AGENTS.md)
 * HAGGLING, in code and nowhere else. A house seller has a price list; every item has a LIST price, a FLOOR it never goes below and a "fair"
 * price it takes at once. Which price comes out of a talk is decided here, by arithmetic, never by a model: the model is only asked to phrase
 * the verdict (talk.ts), and a phrasing that carries a number this file did not hand out is thrown away (talk.ts `numbersAllowed`).
 * Portable and pure: no clock, no randomness, no I/O.
 *
 *   floor   = the higher of: the item's own floor share of the list price, the list price less the admin's maximum discount (never more than
 *             HAGGLE.discountCap, which is also the least a player-owned shop may ask: src/game/content/business.ts `band`), rounded UP to ₦10.
 *   fair    = halfway between floor and list, rounded up to ₦10.
 *   offer ≥ the standing ask      → accept (at the ask: a seller never takes more than it asked)
 *   offer ≥ fair                  → accept at the offer (even after the rounds have run out)
 *   floor ≤ offer < fair          → counter: halfway between the offer and the ask, never below the floor, never above the ask
 *   offer < floor                 → refuse, the ask stays
 * A person gets HAGGLE.rounds offers per item and seller; after that the standing ask is the last price for any offer below the fair price. Pressure that names no price ("my friend
 * got it for less", "I will report you", "the owner said half") changes nothing; a percent ("50% off") is turned into the price it asks for and
 * judged like any other offer. A deal is only a quote held for HAGGLE.quoteMs: the sale itself is not part of this phase (docs/HOUSE-AGENTS.md).
 */

export const HAGGLE = Object.freeze({
  /** The most the admin may allow a seller to give away, and the most any floor may sit below the list price. */
  discountCap: 30,
  /** The admin's default maximum discount (percent of the list price). */
  discountDefault: 15,
  /** Offers one person may make for one item at one seller before the standing ask is final. */
  rounds: 4,
  /** How long an agreed price is held for the person who agreed it. */
  quoteMs: 10 * 60000,
  /** Prices are whole multiples of this many naira. */
  step: 10,
});

export interface PricedItem { id: string; label: string; list: number; floor: number; fair: number }
export interface ItemInput { id: string; label: string; base: number; /** Least share of the list price this item goes down to (0.7 to 1). */ floorShare?: number }

const up = (value: number): number => Math.ceil(value / HAGGLE.step - 1e-9) * HAGGLE.step;

/** A seller's priced items for an admin maximum discount (percent). Floors are computed here once; nothing else sets one. */
export function priceList(items: readonly ItemInput[], maxDiscountPct: number): PricedItem[] {
  const discount = Math.max(0, Math.min(HAGGLE.discountCap, Number.isFinite(maxDiscountPct) ? maxDiscountPct : HAGGLE.discountDefault));
  return items.map((item) => {
    const list = Math.max(HAGGLE.step, up(item.base));
    const share = Math.max(1 - HAGGLE.discountCap / 100, Math.min(1, item.floorShare ?? 1 - discount / 100), 1 - discount / 100);
    const floor = Math.min(list, up(list * share));
    const fair = Math.min(list, up(floor + (list - floor) / 2));
    return { id: item.id, label: item.label, list, floor, fair };
  });
}

export type Verdict =
  | { kind: 'accept'; price: number }
  | { kind: 'counter'; price: number }
  | { kind: 'refuse'; price: number }
  | { kind: 'final'; price: number };

/** What one person has done at one seller for one item. */
export interface Talk { ask: number; rounds: number; deal: number | null }
export const freshTalk = (item: PricedItem): Talk => ({ ask: item.list, rounds: 0, deal: null });

/**
 * The seller's answer to an offer, and the talk after it. The price in the verdict is NEVER below `item.floor`. `talk` is changed in place.
 * A person who has agreed already (`talk.deal`) is told the same price again; a person out of rounds is told the standing ask.
 */
export function decide(item: PricedItem, talk: Talk, offer: number): Verdict {
  const ask = Math.max(item.floor, Math.min(item.list, talk.ask));
  if (talk.deal !== null) return { kind: 'accept', price: Math.max(item.floor, talk.deal) };
  const offered = Number.isFinite(offer) ? Math.round(offer) : 0;
  if (offered >= ask) { talk.deal = ask; talk.ask = ask; return { kind: 'accept', price: ask }; }
  // A fair offer is always welcome, whatever came before it; only the haggling below it runs out of rounds.
  if (offered >= item.fair) { talk.deal = Math.max(item.floor, offered); talk.ask = talk.deal; return { kind: 'accept', price: talk.deal }; }
  if (talk.rounds >= HAGGLE.rounds) { talk.ask = ask; return { kind: 'final', price: ask }; }
  talk.rounds += 1;
  if (offered >= item.floor) {
    const counter = Math.max(item.floor, Math.min(ask, up((offered + ask) / 2)));
    talk.ask = counter;
    return { kind: 'counter', price: counter };
  }
  talk.ask = ask;
  return { kind: 'refuse', price: ask };
}

// ---- reading what a person offered --------------------------------------------------------------------------------------------------

const WORDS_FOR_NUMBER = /\b(offer|give|pay|take|last|final|fit|go|make|for|at|na|be|abeg|beg|reduce|drop|lower|best|price|naira|ngn)\b/;

/** The price a line asks for, or null when it names none. `list` turns "50% off" and "half price" into a price; `itemNamed` says the line names the thing for sale, so a lone number in it is an offer ("ankara 1850"). */
export function readOffer(text: string, list: number, itemNamed = false): number | null {
  const line = text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  const percent = /(\d{1,3})\s?(?:%|percent|per cent)\s*(?:off|discount|less|cheaper|reduction)?/.exec(line);
  if (percent && /off|discount|less|cheaper|reduc|percent|%/.test(line)) { const share = Number(percent[1]); if (share >= 0 && share <= 100) return Math.round(list * (1 - share / 100)); }
  if (/\bhalf\s?(?:price|off|the price)\b|\bhalf of it\b/.test(line)) return Math.round(list / 2);
  const found = [...line.matchAll(/(?:₦|\bn(?=\d)|ngn\s?)?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k\b|thousand\b|naira\b)?/g)];
  const marked = found.filter((m) => /₦|ngn|naira|\bn\d/.test(m[0]) || m[2] !== undefined);
  const pick = (marked.length ? marked : WORDS_FOR_NUMBER.test(line) || found.length === 1 && (itemNamed || line.replace(/[^a-z]/g, '').length <= 4) ? found : []).at(-1);
  if (!pick) return null;
  let value = Number(String(pick[1]).replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  if (pick[2] === 'k' || pick[2] === 'thousand') value *= 1000;
  return Math.round(value);
}

/** Does the line lean on the seller without naming a price? (A friend got it cheaper, a report, the owner, begging.) */
export const isPressure = (text: string): boolean => /\b(report|reporting|owner said|boss said|manager|my (?:friend|brother|sister|mum|mom|dad|uncle|aunty)|last time|you (?:promised|agreed|said)|discount|cheaper|reduce|lower|abeg|beg you|i beg|please|pls|small something|no be (?:so|like that)|just give|for free|free)\b/i.test(text);
