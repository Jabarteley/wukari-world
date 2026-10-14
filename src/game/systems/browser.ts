/**
 * OWNER: foundation — feature owners never edit this file.
 * The browser's systems (it takes the place of index.ts in the build, vite.config.ts). Common life systems are registered;
 * stateless server-only living-world actions are omitted. Progression records and the campus are stand-ins until their rules
 * are fetched (progression-register.ts and campus/unilag/register.ts), and the order stays the same.
 */
import { BASE_SYSTEMS } from './base.ts';
import { registerStandIn } from '../registry.ts';
import { PROGRESSION_STAND_INS } from '../progression-slices.ts';
import { CAMPUS_STAND_INS } from '../../campus/unilag/slices.ts';

for (const system of PROGRESSION_STAND_INS) registerStandIn(system);
for (const system of CAMPUS_STAND_INS) registerStandIn(system);
export const SYSTEMS = [...BASE_SYSTEMS, ...PROGRESSION_STAND_INS, ...CAMPUS_STAND_INS];
