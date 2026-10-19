/**
 * OWNER: agents (AI residents, docs/AI-RESIDENTS.md)
 * ERASURE of what Phase 3 keeps about a person: their Spot the AI lines, choice and plays (spot.ts), their landlord's small record (roles.ts), and their place in the
 * record of who was told a character is leaving (continuity.ts). server/admin/erasure-data.ts calls it beside memory.ts erasePerson. Pure on the store.
 */
import type { Db } from '../types.ts';
import { eraseContinuity } from './continuity.ts';
import { eraseRoles } from './roles.ts';
import { eraseSpot } from './spot.ts';

export function eraseAiLife(db: Db, publicId: string): void {
  eraseSpot(db, publicId);
  eraseRoles(db, publicId);
  eraseContinuity(db, publicId);
}
