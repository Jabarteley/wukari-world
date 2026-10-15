/**
 * OWNER: scenes
 * The reward moment's wording and its confetti — kept out of the first download (this file ships
 * with the scene host). The shell only reports the numbers.
 *
 * rewardChips({ cash, needs: { id: change }, skills: { id: xp gained }, order }) → up to four
 *   [{ text, kind: 'money' | 'gain' | 'loss' | 'xp', glyph }] — money first, then gains by size, losses last.
 * cheer(parent) — a short burst of confetti under the top bar for a finished goal: CSS only
 *   (.life-burst in src/ui/shell.css), removed when its last piece has faded, nothing under reduced motion.
 */
import { money, cap } from '../ui/dom.ts';
import { glyph, hasGlyph } from '../ui/phone/icons.ts';

export type RewardKind = 'money' | 'gain' | 'loss' | 'xp';
export interface RewardChip { text: string; kind: RewardKind; glyph: string }
export interface RewardInput {
  cash?: number;
  needs?: Record<string, number>;
  skills?: Record<string, number>;
  order?: string[];
}
export interface RewardLayout {
  x: number
  y: number
  width: number
  height: number
  topInset: number
  bottomInset: number
}
interface RewardDraft { text: string; kind: RewardKind; icon: string; size: number }

export function rewardChips({ cash = 0, needs = {}, skills = {}, order = Object.keys(needs) }: RewardInput = {}): RewardChip[] {
  const chips: RewardDraft[] = [];
  if (cash) chips.push({ text: `${cash > 0 ? '+' : '−'}${money(Math.abs(cash))}`, kind: cash > 0 ? 'money' : 'loss', icon: 'bank', size: Infinity });
  for (const need of order) {
    const change = Math.round(needs[need] || 0);
    if (change) chips.push({ text: `${change > 0 ? '+' : '−'}${Math.abs(change)} ${cap(need)}`, kind: change > 0 ? 'gain' : 'loss', icon: need, size: Math.abs(change) });
  }
  for (const [skill, gained] of Object.entries(skills)) {
    const change = Math.round(gained);
    if (change >= 1) chips.push({ text: `+${change} ${cap(skill)} XP`, kind: 'xp', icon: 'skills', size: change });
  }
  chips.sort((a, b) => Number(b.kind !== 'loss') - Number(a.kind !== 'loss') || b.size - a.size);
  return chips.slice(0, 4).map(({ text, kind, icon }) => ({ text, kind, glyph: hasGlyph(icon) ? glyph(icon) : '' }));
}

/** Render the reward chips at a precomputed avatar projection without asking for another frame. */
export function showReward(parent: Element | null | undefined, detail: RewardInput = {}, layout: RewardLayout): boolean {
  const chips = rewardChips(detail)
  const doc = globalThis.document
  if (!doc?.createElement || !parent || !chips.length) return false
  parent.querySelector('.scene-reward')?.remove()
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
  const node = doc.createElement('div')
  node.className = 'scene-reward'; node.setAttribute('aria-hidden', 'true')
  node.style.left = `${Math.round(clamp(layout.x, 84, Math.max(84, layout.width - 84)))}px`
  node.style.top = `${Math.round(clamp(layout.y, layout.topInset + 28 * chips.length + 12, Math.max(layout.topInset + 60, layout.height - layout.bottomInset - 20)))}px`
  for (const chip of chips) {
    const item = doc.createElement('span')
    item.className = `is-${['gain', 'loss', 'money', 'xp'].includes(chip.kind) ? chip.kind : 'gain'}`
    if (typeof chip.glyph === 'string' && chip.glyph.startsWith('<svg')) item.innerHTML = chip.glyph
    item.append(String(chip.text || ''))
    node.append(item)
  }
  node.lastChild!.addEventListener('animationend', () => node.remove(), { once: true })
  parent.append(node)
  return true
}

const COLOURS = ['#f2b01e', '#2fa866', '#2a5bd7', '#e2572b', '#7a3fb0', '#ffffff'];
export function cheer(parent: Element | null | undefined = globalThis.document?.body) {
  const doc = globalThis.document;
  if (!doc?.createElement || !parent || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  doc.querySelector('.life-burst')?.remove();
  const box = doc.createElement('div');
  box.className = 'life-burst'; box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 22; i += 1) {
    const piece = doc.createElement('i'), angle = (i / 22) * Math.PI * 2, far = 70 + ((i * 37) % 60);
    piece.style.setProperty('--c', COLOURS[i % COLOURS.length]!);
    piece.style.setProperty('--x', `${Math.round(Math.cos(angle) * far)}px`);
    piece.style.setProperty('--y', `${Math.round(Math.sin(angle) * far * 0.7 + 50)}px`);
    piece.style.setProperty('--r', `${(i % 2 ? 1 : -1) * (120 + i * 9)}deg`);
    piece.style.animationDelay = `${(i % 5) * 18}ms`;
    box.append(piece);
  }
  box.lastChild!.addEventListener('animationend', () => box.remove(), { once: true });
  parent.append(box);
}
