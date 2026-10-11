/**
 * OWNER: showcase
 * The public face of a shop: its link, the words of a prefilled message and the address a "Message the seller" button opens.
 * Pure strings, no DOM: the servers write the public page with it and the seller's Share action reads the same address, so the
 * two cannot disagree. Types and small helpers only; nothing here is in the game's first download.
 *
 * The address is /shop/<name>-<token>. The token (8 letters and digits, no look-alikes) is made once, at random, when the seller
 * first shares: it is not the shop's `SC-n` id, so one address does not lead to the next. The name part is only for people
 * reading the link; the token alone finds the shop, and an edited name does not break an old link.
 */

/** 31 characters without 0, 1, i, l, o: easy to read out and to type. */
export const SHOP_TOKEN_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const SHOP_TOKEN_LENGTH = 8
const TOKEN = new RegExp(`^[${SHOP_TOKEN_ALPHABET}]{${SHOP_TOKEN_LENGTH}}$`)
const PATH = new RegExp(`^/shop/(?:[a-z0-9-]{0,40}-)?([${SHOP_TOKEN_ALPHABET}]{${SHOP_TOKEN_LENGTH}})/?$`)

export const isShopToken = (value: unknown): value is string => typeof value === 'string' && TOKEN.test(value)
/** The token a path carries (`/shop/<name>-<token>` or `/shop/<token>`), or null. */
export function shopTokenOf(pathname: unknown): string | null {
  return PATH.exec(typeof pathname === 'string' ? pathname : '')?.[1] ?? null
}
/** The readable part of a shop's address: lower case, letters and digits, at most 30 characters. */
export function shopSlug(name: string): string {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 30).replace(/-+$/, '')
}
/** The path of a shop's public page. */
export function shopPath(name: string, token: string): string {
  const slug = shopSlug(name)
  return `/shop/${slug ? `${slug}-` : ''}${token}`
}
/** Where "Step inside" leads: the game, which opens this shop once the visitor is in. */
export const shopEntryPath = (token: string): string => `/?go=shop&shop=${token}`

/** Whole numbers with thousands separators ("5,000"); a price of 0 is "Ask for the price". */
export const priceWords = (naira: number): string => (naira > 0 ? `₦${String(Math.trunc(naira)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : 'Ask for the price')

/** At most `max` characters (not UTF-16 units: an emoji is one), with an ellipsis when cut. */
function clip(text: string, max: number): string {
  const letters = Array.from(text.replace(/\s+/g, ' ').trim())
  return letters.length <= max ? letters.join('') : `${letters.slice(0, max - 1).join('')}…`
}

export interface ShopItemFacts { label: string; priceNaira: number }
/** The first words of a chat with the seller. Names and items are cut, so a long one cannot make an address too long to open. */
export function buyMessage(shopName: string, item?: ShopItemFacts | null): string {
  const shop = clip(shopName, 60)
  if (!item) return `Hello, I found ${shop} on Allworld and I would like to know more.`
  const price = item.priceNaira > 0 ? ` (${priceWords(item.priceNaira)})` : ''
  return `Hello, I found ${shop} on Allworld and I am interested in ${clip(item.label, 60)}${price}. Is it available?`
}
/** The ready-made message a seller sends to their own customers with the link. */
export const shareMessage = (shopName: string, url: string): string => `${clip(shopName, 60)} is open on Allworld. See what we offer and message us: ${url}`

/**
 * An outside address a seller gave, or null. Only https, tel and mailto are ever sent to a visitor: no javascript:, data:, file:
 * or anything else, and no user name or password in a web address. The servers have already refused every other site when the
 * seller saved the shop; this is the check made again at the moment a visitor is given the address.
 */
export function safeLink(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text || text.length > 300 || /[\s<>"'`\\]/.test(text)) return null
  if (/^tel:\+?[0-9()-]{5,20}$/i.test(text)) return text
  if (/^mailto:[^\s?&#,;@]+@[^\s?&#,;@]+$/i.test(text)) return text
  const web = webParts(text)
  return web ? `https://${web.host}${web.path}${web.query}${web.hash}` : null
}
/** The parts of an https address: a host with a dot (no port, user name or password), a path, a query ("?a=b" or "") and a hash. */
function webParts(text: string): { host: string; path: string; query: string; hash: string } | null {
  const found = /^https:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i.exec(text)
  return found?.[1] ? { host: found[1].toLowerCase(), path: found[2] ?? '', query: found[3] ?? '', hash: found[4] ?? '' } : null
}

/** What a chat address can take as the first words: a messaging app's link takes `text`, an address takes a subject and a body, a phone number takes nothing. */
export function messageHref(raw: unknown, message: string, subject = ''): string | null {
  const link = safeLink(raw)
  if (!link) return null
  let text = ''
  try { text = encodeURIComponent(message) } catch { text = '' }
  if (/^mailto:/i.test(link)) return `${link}?subject=${encodeURIComponent(subject || message)}${text ? `&body=${text}` : ''}`
  if (!text || !/^https:/i.test(link)) return link
  const web = webParts(link)
  if (!web || (web.host !== 'wa.me' && web.host !== 'api.whatsapp.com' && web.host !== 'www.wa.me')) return link
  const rest = web.query.slice(1).split('&').filter((part) => part && !/^text=/i.test(part)).join('&')
  return `https://${web.host}${web.path || '/'}${rest ? `?${rest}&` : '?'}text=${text}`
}
