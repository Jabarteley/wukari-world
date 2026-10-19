// The words and the score card of the "your AI life" panel (AiLifePanel.vue): Spot the AI's score text and picture, and the labels of the landlord, boss and
// rival. Pure, except drawSpotCard, which draws on a canvas the panel gives it. Part of the panel's lazy chunk: nothing here is in the first download.
import { shareUrl } from '../../../game/share-model.ts'

export const aiLifeWords = {
  spotIntro: 'Each week: read lines that were really said in Allworld\'s places and tap the ones you think an AI character said. Then see the answers, with the AI-played label the game always shows.',
  spotOptIn: 'Let my public lines be used in Spot the AI',
  spotOptHelp: 'Only lines you say in public places, without names or numbers, and never your name. Turning this off deletes them at once.',
  spotAdults: 'Only players who have said they are 18 or older can put their lines in. Anyone can play.',
  rolesIntro: 'Three AI characters in your life here, so it has a little drama when friends are offline. They read your life; they never change it.',
  roleLabel: { landlord: 'Your landlord', boss: 'Your boss', rival: 'Your rival' } as Record<string, string>,
} as const

/** "Better than 64% of players" or a word for the first player. */
export function betterText(better: number, players: number): string {
  if (players <= 1) return 'You are the first to play this week.'
  return `Better than ${Math.max(0, Math.min(100, Math.round(better)))}% of the ${players} players this week.`
}
/** The words that go with a shared score, ending with the link on its own line. `origin` is the site's own address. */
export function spotShareText(s: number, of: number, origin: string): string {
  const link = shareUrl(`${origin.replace(/\/+$/, '')}/`, 'spot-the-ai')
  const verdict = of > 0 && s === of ? 'every one' : `${s} of ${of}`
  return `I told AI from people in Allworld's Spot the AI this week: ${verdict} right. Can you beat me?\n${link}`
}

/** The score card, 1080 x 1080: the score big, the game's name, the week. Drawn on the phone; only the numbers are on it. */
export function drawSpotCard(canvas: HTMLCanvasElement, s: number, of: number, better: string): boolean {
  const g = canvas.getContext('2d')
  if (!g) return false
  canvas.width = 1080; canvas.height = 1080
  const bg = g.createLinearGradient(0, 0, 1080, 1080)
  bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(1, '#4338ca')
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1080)
  g.fillStyle = '#ffffff'; g.textAlign = 'center'
  g.font = '700 64px system-ui, sans-serif'; g.fillText('Spot the AI', 540, 210)
  g.font = '800 260px system-ui, sans-serif'; g.fillText(`${s}/${of}`, 540, 560)
  g.font = '500 44px system-ui, sans-serif'; g.fillText('lines told right', 540, 650)
  g.font = '400 38px system-ui, sans-serif'; g.fillText(better.slice(0, 60), 540, 760)
  g.font = '700 48px system-ui, sans-serif'; g.fillText('Allworld', 540, 940)
  return true
}
