import type { Seen } from '../director.ts'
import type { MusicStyle } from './types.ts'

export type MusicContext = 'creator' | 'home' | 'street' | 'map' | 'market' | 'park' | 'shop' | 'night' | 'rain' | 'venue'
export const CONTEXT_STYLES: Record<Exclude<MusicContext, 'venue'>, readonly MusicStyle[]> = {
  creator: ['highlife', 'bossa', 'marimba'], home: ['palm-wine', 'cape-jazz', 'bossa'],
  street: ['highlife', 'juju', 'afrobeats'], map: ['marimba', 'highlife', 'palm-wine'],
  market: ['highlife', 'juju', 'afrobeats'], park: ['palm-wine', 'marimba', 'cape-jazz'],
  shop: ['bossa', 'cape-jazz', 'amapiano-lite'], night: ['cape-jazz', 'amapiano-lite', 'palm-wine'],
  rain: ['palm-wine', 'cape-jazz', 'bossa'],
}

/** Venue music has priority over a soundtrack, including during rain and at night. */
export function musicContext(seen: Seen | null, kind: string, variant: string): MusicContext {
  if (!seen || !seen.life) return 'creator'
  if (seen.mode !== 'map' && [kind, variant].some(value => /(?:^|-)(club|bar|church|viewing)(?:$|-)/.test(value))) return 'venue'
  const hour = new Date(seen.now + 3_600_000).getUTCHours()
  if (seen.mode !== 'map' && ['buka', 'rooftop'].includes(kind) && (hour >= 18 || hour < 6)) return 'venue'
  if (seen.mode === 'creator') return 'creator'
  if (seen.raining) return 'rain'
  if (hour >= 19 || hour < 6) return 'night'
  if (seen.mode === 'map') return 'map'
  if (seen.mode === 'shop') return 'shop'
  if (seen.location === 'home') return 'home'
  if (kind === 'market') return 'market'
  if (kind === 'park') return 'park'
  if (/shop|boutique|salon|mall/.test(kind)) return 'shop'
  return 'street'
}

export function nextBar(now: number, start: number, tempo: number): number {
  const bar = 240 / tempo
  return start + Math.max(0, Math.ceil((now - start) / bar)) * bar
}
