/**
 * OWNER: social
 * ERASURE of the social glue (docs/SOCIAL-GLUE.md "Stored data"), called by server/admin/erasure-data.ts: every part of the `glue` collection
 * forgets the people being erased. Portable: no Node imports.
 */
import { forgetClose } from './close.ts'
import { forgetTalks } from './talks.ts'
import { forgetBoards } from './board.ts'
import { forgetTrips } from './trips.ts'
import { forgetMarriages } from './marriage.ts'
import type { Db } from '../types.ts'

export function forgetGluePlayers(db: Db, ids: ReadonlySet<string>): void {
  forgetClose(db, ids); forgetTalks(db, ids); forgetBoards(db, ids); forgetTrips(db, ids); forgetMarriages(db, ids)
}
