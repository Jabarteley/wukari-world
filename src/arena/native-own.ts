/**
 * OWNER: games (real-time)
 * The player's own native look as a fight seat carries it. A lazy module of its own: the Fight screen imports it dynamically, so the
 * modules it reaches (native-migration, native-recipe) are reached through native-body, by a dynamic import keep the chunk grouping the first download was measured with.
 */
import { packNativeLook } from './native-look.ts'
import type { ArenaNative } from '../types/arena.ts'

/** The look the world dresses this player in (their saved one, or the one made from their look), in short form; undefined if it cannot be made. */
export async function packOwnLook(look: Record<string, unknown> | undefined): Promise<ArenaNative | undefined> {
  try { const { recipeForLook } = await import('../scene/body/skinned.ts'); return packNativeLook(recipeForLook(look, look?.seed ?? look?.id ?? 'joinallworld').appearance) } catch { return undefined }
}
