/**
 * How many roster figures a scene may draw, and at which level of detail. Pure (no Three.js): a scene asks for a figure by what the
 * person is to the player, and is told the model to load ('hero' or 'crowd') or that this one stays the procedural figure.
 *
 *   self    the player's own figure, always the first claim: the hero model near the camera.
 *   peer    another player: the hero model for the first few (HERO_PLAYERS heroes, the player's own included; never more than
 *           HERO_MAX in a scene), then the crowd model.
 *   npc     a regular or the anonymous crowd: the crowd model.
 *
 * A scene's roster figures together (the player's own included) stay under TRIANGLES_MAX (the hero model is about 13,000
 * triangles, the crowd model about 3,000), on top of the scene's own geometry, which keeps its own budget (src/budgets.ts SCENE_TRIANGLES); a figure that would go over it is not made, and the
 * procedural figure stays. A lite device (a few cores) has no hero model and at most LITE_FIGURES figures in all.
 */
export type RosterKind = 'self' | 'peer' | 'npc';
export type RosterTier = 'full' | 'lite';
export type Detail = 'hero' | 'crowd';

export const HERO_MAX = 4;
/** Heroes before other players stop getting the hero model: the player and the next two. */
export const HERO_PLAYERS = 3;
export const HERO_TRIANGLES = 13_200;
export const CROWD_TRIANGLES = 3_300;
export const TRIANGLES_MAX = 52_000;
export const LITE_FIGURES = 4;
export const FIGURES_MAX = 14;

export interface RosterBudget {
  /** The level of detail to load for a person, or null to keep the procedural figure. Reserves it; give it back with release(). */
  request(kind: RosterKind): Detail | null;
  release(detail: Detail): void;
  /** What is claimed now. */
  readonly used: { hero: number; crowd: number; triangles: number };
}

export function createRosterBudget(tier: RosterTier = 'full'): RosterBudget {
  const used = { hero: 0, crowd: 0, triangles: 0 };
  const claim = (detail: Detail): Detail => { used[detail] += 1; used.triangles += detail === 'hero' ? HERO_TRIANGLES : CROWD_TRIANGLES; return detail; };
  const room = (detail: Detail, limit: number): boolean => used.hero + used.crowd < (tier === 'lite' ? LITE_FIGURES : FIGURES_MAX)
    && used.triangles + (detail === 'hero' ? HERO_TRIANGLES : CROWD_TRIANGLES) <= TRIANGLES_MAX && (detail === 'crowd' || (tier === 'full' && used.hero < limit));
  return {
    used,
    request(kind) {
      if (kind === 'self' && room('hero', HERO_MAX)) return claim('hero');
      if (kind === 'peer' && room('hero', HERO_PLAYERS)) return claim('hero');
      return room('crowd', 0) ? claim('crowd') : null;
    },
    release(detail) {
      used[detail] = Math.max(0, used[detail] - 1);
      used.triangles = Math.max(0, used.triangles - (detail === 'hero' ? HERO_TRIANGLES : CROWD_TRIANGLES));
    },
  };
}
