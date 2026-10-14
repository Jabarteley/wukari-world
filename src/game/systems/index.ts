/**
 * OWNER: foundation — feature owners never edit this file.
 * Registers host systems in a fixed order (base.ts, progression records, server-only living-world and market actions, then
 * the UNILAG campus: student before community, then the shuttle). This is what servers, the Worker, scripts and tests run.
 * The browser build swaps it for browser.ts (vite.config.ts), which uses progression and campus stand-ins.
 */
import { BASE_SYSTEMS } from './base.ts';
import { installHomewardRules } from '../homeward-gate.ts';
import * as homewardRules from '../homeward-rules.ts';
import { registerSystem } from '../registry.ts';
import achievements from './achievements.ts';
import episodes from './episodes.ts';
import projects from './projects.ts';
import livingWorld from './living-world.ts';
import market from './market.ts';
import unilagStudent from '../../campus/unilag/student.ts';
import unilagCommunity from '../../campus/unilag/games.ts';
import unilagShuttle from '../../campus/unilag/shuttle.ts';

installHomewardRules(homewardRules);

export const PROGRESSION_SYSTEMS = [achievements, episodes, projects];
export const CAMPUS_SYSTEMS = [unilagStudent, unilagCommunity, unilagShuttle];
for (const system of PROGRESSION_SYSTEMS) registerSystem(system);
registerSystem(livingWorld);
registerSystem(market);
for (const system of CAMPUS_SYSTEMS) registerSystem(system);
export const SYSTEMS = [...BASE_SYSTEMS, ...PROGRESSION_SYSTEMS, livingWorld, market, ...CAMPUS_SYSTEMS];
