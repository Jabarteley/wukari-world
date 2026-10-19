// The Detty December season card's picture (docs/DETTY-DECEMBER.md), drawn on this device: the season's two colours, a string of lights, the
// title and the one line of facts (src/festivals/detty.ts cardWords). Public counts and city names only; nothing is uploaded. It goes to the
// Allworld share sheet (the phone's own sheet first, then WhatsApp and X) with the text and the /detty link, as Capture's photos do.
import { cardWords } from '../../../festivals/detty.ts'
import type { SeasonFacts } from '../../../festivals/detty.ts'

export const CARD_SIZE = 1080
/** The lines the picture writes, top to bottom: the year, the title, the facts and the brand. */
export function cardLines(facts: SeasonFacts): string[] {
  const words = cardWords(facts)
  return [facts.year ? `DETTY DECEMBER ${facts.year}` : 'DETTY DECEMBER', words.title, words.line, 'joinallworld.com/detty']
}

/** Draw the card; null where the browser cannot draw (no canvas). */
export async function cardPicture(facts: SeasonFacts, doc: Pick<Document, 'createElement'> | undefined = globalThis.document): Promise<File | null> {
  const canvas = doc?.createElement('canvas') as HTMLCanvasElement | undefined, g = canvas?.getContext('2d')
  if (!canvas || !g) return null
  canvas.width = CARD_SIZE; canvas.height = CARD_SIZE
  const sky = g.createLinearGradient(0, 0, CARD_SIZE, CARD_SIZE)
  sky.addColorStop(0, '#2a1240'); sky.addColorStop(0.55, '#7b3fa0'); sky.addColorStop(1, '#e0a43a')
  g.fillStyle = sky; g.fillRect(0, 0, CARD_SIZE, CARD_SIZE)
  // A string of lights across the top, sagging between three posts.
  for (let i = 0; i < 24; i++) {
    const x = 60 + (i * (CARD_SIZE - 120)) / 23, y = 120 + 40 * Math.sin((Math.PI * (i % 8)) / 7)
    g.fillStyle = ['#ffe2a8', '#e0a43a', '#ffffff'][i % 3]!
    g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill()
  }
  const [year, title, line, brand] = cardLines(facts)
  g.textAlign = 'center'; g.fillStyle = '#ffffff'
  g.font = '600 40px system-ui, sans-serif'; g.fillText(year!, CARD_SIZE / 2, 300)
  g.font = '800 72px system-ui, sans-serif'
  const words = title!.split(' '), half = Math.ceil(words.length / 2)
  g.fillText(words.slice(0, half).join(' '), CARD_SIZE / 2, 470); g.fillText(words.slice(half).join(' '), CARD_SIZE / 2, 560)
  g.font = '600 44px system-ui, sans-serif'; g.fillText(line!, CARD_SIZE / 2, 700, CARD_SIZE - 120)
  g.font = '500 34px system-ui, sans-serif'; g.fillStyle = '#fff3d6'; g.fillText(brand!, CARD_SIZE / 2, 960)
  const blob = await new Promise<Blob | null>((done) => { try { canvas.toBlob(done, 'image/png') } catch { done(null) } })
  return blob ? new File([blob], 'detty-december.png', { type: 'image/png' }) : null
}
