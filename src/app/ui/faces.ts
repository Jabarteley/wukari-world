// The 2D faces of the game: a person's roster portrait, wherever a letter avatar used to stand alone.
//
// A face is the portrait of the character a look wears (src/scene/roster/). Whose look is known: yours; every player the client has
// seen in a room (src/app/ui/looks.ts keeps the few fields that say which character, outfit and skin step, in memory and on this
// device, so a friend met yesterday still has a face in the contacts); and a family contact or a regular, by their description.
// Anyone else keeps the letter: the game never puts a face on a person that is not theirs.
import { regularPick } from '../../roster/map.ts'
import type { Regular } from '../../roster/map.ts'
import { portraitOf, portraitUrl } from '../../roster/portraits.ts'
import { known } from './looks.ts'

/** The portrait of a player whose look the client knows (`look` is given, or was seen before), else null. */
export function faceOfPlayer(id: string | undefined, look?: unknown): string | null {
  const wanted = look ?? (id ? known[id] : undefined)
  return wanted ? portraitOf(wanted, id) : null
}
/** The portrait of a regular or a family contact, from what the game says of them. */
export function faceOfRegular(who: Regular): string | null {
  const pick = regularPick(who)
  return pick ? portraitUrl(pick.id, pick.outfit) : null
}
