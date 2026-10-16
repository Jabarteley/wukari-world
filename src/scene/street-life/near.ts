/**
 * OWNER: scenes
 * Street life, the NEAR CROWD (zoom phase 5c). Pure: no Three.js, no DOM (forcedNear reads what it is given). The far crowd uses native
 * snapshots from the same recipe. At most one person nearest the camera is replaced with the game's full native skinned body
 * (src/scene/body/skinned.ts, the body the player wears), only after its actual render cost fits the host's remaining room. This module
 * decides, as plain functions:
 *
 *   - WHO gets it (nearCrowdFor): only where the far crowd is drawn (its gate: a 'full' ambient tier, WebGL2, the dive's device tier not
 *     'cut'), with NEAR_CAPS by the street's tier; `?nearcrowd=off` (or localStorage 'aw.nearcrowd') turns it off, `=on` forces it;
 *   - WHICH people (selectNear): the nearest to the camera, inside NEAR_RADIUS.enter, kept until they pass NEAR_RADIUS.leave (the gap is
 *     the hysteresis: nobody flickers between a body and a cut-out at the edge), never one dissolving at a lane's end, never one behind
 *     the camera, at most the cap (members first, so a full set does not churn);
 *   - HOW they look (nearDress): a complete native recipe from the bounded two-body crowd pool, with the far person's height and colours;
 *   - WHAT they do (nearAction): walk by the native body's measured cycle distance or stand, plus a glance toward a nearby player;
 *   - CHILDREN (childrenAllowed, CHILD_*): crowd.ts plans a few children, each walking beside a parent on the parent's schedule, only
 *     where the place allows them (CHILD_CONTEXTS: the home street, markets, parks, walks and hubs). Bars, clubs, casinos, lounges and
 *     every other kind are never on that list. Children use the same native surface with uniform scale; no bone is reshaped at runtime.
 *
 * Every choice is a function of the street's seed and the person's index, so every device dresses the same person the same way.
 */
import { makeRng } from '../../game/util.ts';
import { normalizeNativeRecipe } from '../../character/native-recipe.ts';
import { nativeRecipeForLook } from '../../character/native-migration.ts';
import type { NativeCharacterRecipeV2 } from '../../character/native-recipe.ts';
import type { Person, PersonPose } from './crowd.ts';
import type { Forced, StreetTier } from './plan.ts';

// ---- the gate and the caps -------------------------------------------------------------------------------------------------------

/**
 * Historic street ceilings retained for compatibility and reporting. Live native admission additionally clamps people to one and asks
 * the host for actual remaining scene room; neither of these ceilings is raised.
 */
export const NEAR_CAPS: Readonly<Record<StreetTier, { people: number; triangles: number; drawCalls: number }>> = Object.freeze({
  full: { people: 12, triangles: 72_000, drawCalls: 28 },
  lite: { people: 6, triangles: 36_000, drawCalls: 14 },
});
/** A live native body is deliberately exceptional; the native far snapshots retain the rest of the population. */
export const NEAR_HARD_CAP = 1;

/** `?nearcrowd=on|off`, else localStorage 'aw.nearcrowd'. */
export function forcedNear(search = '', stored: string | null = null): Forced {
  const read = (value: string | null | undefined): Forced => {
    const v = (value ?? '').trim().toLowerCase();
    return v === 'on' || v === '1' || v === 'true' ? 'on' : v === 'off' || v === '0' || v === 'false' ? 'off' : null;
  };
  let asked: string | null = null;
  try { asked = new URLSearchParams(search).get('nearcrowd'); } catch { asked = null; }
  return read(asked) ?? read(stored);
}
/** The switch as this page has it (none outside a browser). */
export function pageNear(): Forced {
  const where = globalThis.location as { search?: string } | undefined;
  let stored: string | null = null;
  try { stored = (globalThis.localStorage as Storage | undefined)?.getItem('aw.nearcrowd') ?? null; } catch { stored = null; }
  return forcedNear(where?.search ?? '', stored);
}

export interface NearChoice { tier: StreetTier; people: number; triangles: number; drawCalls: number }
/**
 * Whether the near crowd is drawn: only on top of a far crowd (`street`: its tier, null when the street is off), never with the switch
 * off; the switch on gives the full tier. The far crowd's own gate already asked for the full ambient tier (bodyAllowed: not save-data,
 * not 2G, more than two cores and 2 GB), WebGL2 and a dive tier that is not 'cut'.
 */
export function nearCrowdFor(street: StreetTier | null, forced: Forced = null): NearChoice | null {
  if (forced === 'off' || (!street && forced !== 'on')) return null;
  const tier: StreetTier = forced === 'on' ? 'full' : street!;
  return { tier, ...NEAR_CAPS[tier] };
}
/** The near cap after the far crowd's adaptive caps: the same share of it (`shown` of `planned` cut-outs), never above the choice. */
export function nearCap(choice: NearChoice, shown: number, planned: number): number {
  const share = planned > 0 ? Math.max(0, Math.min(1, shown / planned)) : 0;
  return Math.max(0, Math.min(NEAR_HARD_CAP, choice.people, Math.floor(choice.people * share + 1e-9)));
}

// ---- who is near -----------------------------------------------------------------------------------------------------------------

/** Scene units (a person is about 2.6 tall, so about 10 m and 12.5 m): within enter a person becomes a body, past leave a cut-out again. */
export const NEAR_RADIUS: Readonly<{ enter: number; leave: number }> = Object.freeze({ enter: 14, leave: 17.5 });
export interface NearCandidate { id: number; x: number; z: number; fade: number }
/** Where the camera stands, and (when known) which way it looks along the ground. */
export interface Eye { x: number; z: number; fx?: number; fz?: number }

/**
 * The people drawn as bodies this frame, by id, nearest first. A member (in `kept`) stays while inside `leave`; anyone else comes in
 * inside `enter`; members are kept before newcomers are taken, then the nearest, up to `cap`. Nobody dissolving (fade < 1: a body cannot
 * fade) and nobody behind the camera. Deterministic: ties go to the lower id.
 */
export function selectNear(candidates: readonly NearCandidate[], eye: Eye | null, kept: ReadonlySet<number>, cap: number, radius = NEAR_RADIUS): number[] {
  const limit = Math.max(0, Math.min(NEAR_HARD_CAP, Math.floor(cap)));
  if (!eye || !limit) return [];
  const facing = eye.fx !== undefined && eye.fz !== undefined && Math.hypot(eye.fx, eye.fz) > 1e-6 ? Math.hypot(eye.fx, eye.fz) : 0;
  const members: { id: number; d: number }[] = [], newcomers: { id: number; d: number }[] = [];
  for (const c of candidates) {
    if (!(c.fade >= 1)) continue;
    const dx = c.x - eye.x, dz = c.z - eye.z, d = Math.hypot(dx, dz);
    if (facing && (dx * eye.fx! + dz * eye.fz!) / facing < -1) continue;
    if (kept.has(c.id)) { if (d < radius.leave) members.push({ id: c.id, d }); }
    else if (d < radius.enter) newcomers.push({ id: c.id, d });
  }
  const order = (a: { id: number; d: number }, b: { id: number; d: number }): number => a.d - b.d || a.id - b.id;
  return [...members.sort(order), ...newcomers.sort(order)].slice(0, limit).sort(order).map(({ id }) => id);
}

/**
 * Who may be a body at all this instant: shown (index < count), placed, and standing on the scene's WALKABLE floor (the host's own walk
 * grid: a venue's floor, the home street's pavements and road), checked point by point as the final guard. A child and their parent are
 * checked together: both on the floor, or neither is a body. No walkable test at all: nobody (the cut-outs stay where they are).
 */
export function nearCandidates(people: readonly Pick<Person, 'family'>[], poses: readonly ({ x: number; z: number; fade: number } | null)[], count: number,
  walkable: ((x: number, z: number) => boolean) | null | undefined): NearCandidate[] {
  if (!walkable) return [];
  const n = Math.min(count, people.length, poses.length), on = (i: number): boolean => { const p = poses[i]; return Boolean(p && i < n && Number.isFinite(p.x) && Number.isFinite(p.z) && walkable(p.x, p.z)); };
  const families = new Map<number, number[]>();
  for (let i = 0; i < people.length; i++) { const family = people[i]!.family; if (family !== undefined) families.set(family, [...(families.get(family) ?? []), i]); }
  const out: NearCandidate[] = [];
  for (let i = 0; i < n; i++) {
    const pose = poses[i], family = people[i]!.family;
    if (!pose || !on(i)) continue;
    if (family !== undefined && !(families.get(family) ?? []).every(on)) continue;
    out.push({ id: i, x: pose.x, z: pose.z, fade: pose.fade });
  }
  return out;
}

// ---- children --------------------------------------------------------------------------------------------------------------------

/**
 * Where children may walk (with a parent): the home street ('street') and the open kinds a family passes through. An allow-list: any
 * other kind, and every venue for adults (bars, clubs, casinos, lounges and the like, which never have a street crowd anyway), has none.
 */
export const CHILD_CONTEXTS: ReadonlySet<string> = new Set(['street', 'market', 'park', 'walk', 'hub']);
/** Kinds that must never show children, whatever the list above says (a test holds the two apart). */
export const ADULT_CONTEXTS: ReadonlySet<string> = new Set(['bar', 'club', 'casino', 'lounge', 'nightclub', 'pub', 'betting', 'hotel', 'brothel', 'strip']);
export function childrenAllowed(context: string | null | undefined): boolean {
  return typeof context === 'string' && CHILD_CONTEXTS.has(context) && !ADULT_CONTEXTS.has(context);
}
export { ADULT_HEIGHT, CHILD_HEIGHT, CHILD_SHARE } from './crowd.ts';
/** Compatibility value only. Native child actors retain their authored proportions and are scaled uniformly. */
export const CHILD_HEAD = 1;

// ---- how they look ---------------------------------------------------------------------------------------------------------------

/** A look in the avatar's own terms (src/scene/characters.ts normalizeLook reads it), with what the person holds. */
export interface NearLook {
  body: 'woman' | 'man'
  skin: string
  hair: string
  hairColor: string
  outfit: string
  fabric: string
  outfitColor: string
  bottomsColor: string
  accessories: string[]
  wearables?: string[]
  expression: string
  face: string
  appearance: { height: 'short' | 'average' | 'tall'; build: 'slim' | 'average' | 'broad'; ageAppearance: 'adult' | 'mature' | 'elder' }
  /** The sole rendered identity; compatibility fields above do not select scene assets. */
  native: NativeCharacterRecipeV2
}
export interface NearDress {
  look: NearLook
  /** The seed the body takes (blinks, the expression's motion). */
  seed: string
  child: boolean
  /** The scene scale to fit the body at (skinned.ts fitScale): it then stands as tall as the cut-out it replaces. */
  scale: number
  /** Seconds into the idle clip this person stands at (each their own, so a group never sways in step). */
  idle: number
}
/** Scene units of a native actor at recipe height 1 and scene scale 1. */
export const AVATAR_UNITS = 2.45;

/** How the near crowd dresses the person at `index` of a street's planned crowd (seeded by the street and the index). */
export function nearDress(person: Person, index: number, seed: string): NearDress {
  const stableSeed = `street-life|near|${seed}|${index}`;
  const next = makeRng(stableSeed);
  const child = person.child === true;
  const base = nativeRecipeForLook({}, stableSeed);
  const nativeHeight = Math.max(.85, Math.min(1.15, person.height / AVATAR_UNITS));
  const native = normalizeNativeRecipe({ ...base, appearance: { ...base.appearance, height: nativeHeight,
    colors: { ...base.appearance.colors, skin: person.skin, upper: person.jacket ?? person.shirt, lower: person.legs } } });
  const woman = native.appearance.body === 'female';
  const heightClass: NearLook['appearance']['height'] = child ? 'average' : person.height < 2.45 ? 'short' : person.height > 2.72 ? 'tall' : 'average';
  const build: NearLook['appearance']['build'] = child ? 'slim' : person.width < 0.95 ? 'slim' : person.width > 1.12 ? 'broad' : 'average';
  const ageAppearance: NearLook['appearance']['ageAppearance'] = !child && next() < 0.12 ? 'mature' : 'adult';
  const appearance = { height: heightClass, build, ageAppearance };
  const look: NearLook = {
    body: woman ? 'woman' : 'man', skin: person.skin, hair: 'low-cut', hairColor: native.appearance.colors.hair,
    outfit: 'casual', fabric: 'plain', outfitColor: native.appearance.colors.upper, bottomsColor: native.appearance.colors.lower,
    accessories: [], expression: native.emotion === 'happy' ? 'smile' : 'neutral', face: 'oval', appearance, native,
  };
  // The native recipe owns relative height; this uniform scene scale makes its authored surface meet the far snapshot height.
  const scale = person.height / (AVATAR_UNITS * native.appearance.height);
  return { look, seed: stableSeed, child, scale, idle: next() * 8 };
}

// ---- what they do ----------------------------------------------------------------------------------------------------------------

/** Legacy diagnostic ratio; live phase uses SkinnedBody.cycleDistance(). */
export const WALK_CYCLE = 1.83 / 2.45;
export type NearAction =
  | { kind: 'walk'; travelled: number }
  | { kind: 'stand'; seconds: number };

/** What a near person does at this moment (seconds: wall clock), from the far crowd's pose (crowd.ts personAt). */
export function nearAction(_person: Person, pose: PersonPose, dress: NearDress, seconds: number): NearAction {
  if (pose.mode === 0) return { kind: 'walk', travelled: pose.travelled ?? 0 };
  return { kind: 'stand', seconds: seconds + dress.idle };
}

/** A glance: within `radius` of the player and with the player no more than `field` off their facing, the head turns at most `max`. */
export const GLANCE = Object.freeze({ radius: 6, field: 1.75, max: 1.0, rate: 5 });
const angle = (value: number): number => Math.atan2(Math.sin(value), Math.cos(value));
/**
 * How far (radians, the sense of a rotation.y) the head should turn to look at the player: 0 when the player is out of range or behind.
 * Facing ry means looking along (sin ry, cos ry).
 */
export function glanceYaw(self: { x: number; z: number; ry: number }, player: { x: number; z: number } | null | undefined, glance = GLANCE): number {
  if (!player) return 0;
  const dx = player.x - self.x, dz = player.z - self.z, d = Math.hypot(dx, dz);
  if (!(d > 0.3) || d > glance.radius) return 0;
  const off = angle(Math.atan2(dx, dz) - self.ry);
  if (Math.abs(off) > glance.field) return 0;
  return Math.max(-glance.max, Math.min(glance.max, off));
}
/** Ease the head toward the target at GLANCE.rate (no overshoot; dt 0 holds, a long dt arrives). */
export function easeGlance(current: number, target: number, dt: number, rate = GLANCE.rate): number {
  const t = 1 - Math.exp(-Math.max(0, dt) * rate);
  return current + (target - current) * t;
}
