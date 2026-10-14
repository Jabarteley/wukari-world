/**
 * OWNER: scenes
 * Street life, the NEAR CROWD (zoom phase 5c). Pure: no Three.js, no DOM (forcedNear reads what it is given). The far crowd (./plan.ts,
 * ./crowd.ts) is cut-outs: two triangles a person, which read well from mid range out. The few people nearest the camera are drawn
 * instead with the game's own skinned body (src/scene/body/skinned.ts, the body the player wears), at a level of detail of about 2,430
 * of its 9,002 triangles (scripts/body/build-lod.ts), dressed by the wardrobe (hair, cuts, bags, head wraps) from the avatar's own look
 * options. This module decides, as plain functions:
 *
 *   - WHO gets it (nearCrowdFor): only where the far crowd is drawn (its gate: a 'full' ambient tier, WebGL2, the dive's device tier not
 *     'cut'), with NEAR_CAPS by the street's tier; `?nearcrowd=off` (or localStorage 'aw.nearcrowd') turns it off, `=on` forces it;
 *   - WHICH people (selectNear): the nearest to the camera, inside NEAR_RADIUS.enter, kept until they pass NEAR_RADIUS.leave (the gap is
 *     the hysteresis: nobody flickers between a body and a cut-out at the edge), never one dissolving at a lane's end, never one behind
 *     the camera, at most the cap (members first, so a full set does not churn);
 *   - HOW they look (nearDress): a look in the avatar's own terms (body, skin, hair, outfit, fabric, colours, accessories, wearables,
 *     height and build), taken from the cut-out's colours so the hand-over keeps the person, plus what is in their hand (a cup or a phone);
 *   - WHAT they do (nearAction): walk at the stride their pace gives, stand (the idle clip, each at their own point in it), sip a coffee,
 *     look at a phone; and GLANCE: a head turn toward the player when close and in front of them (glanceYaw, easeGlance);
 *   - CHILDREN (childrenAllowed, CHILD_*): crowd.ts plans a few children, each walking beside a parent on the parent's schedule, only
 *     where the place allows them (CHILD_CONTEXTS: the home street, markets, parks, walks and hubs). Bars, clubs, casinos, lounges and
 *     every other kind are never on that list. A child is a smaller, slimmer body with a larger head, in everyday clothes, carrying
 *     nothing but perhaps a school bag; never a cup or a phone.
 *
 * Every choice is a function of the street's seed and the person's index, so every device dresses the same person the same way.
 */
import { makeRng } from '../../game/util.ts';
import { avatarProportions } from '../../types/avatar.ts';
import { OUTFITS } from './crowd.ts';
import type { Person, PersonPose } from './crowd.ts';
import type { Forced, StreetTier } from './plan.ts';

// ---- the gate and the caps -------------------------------------------------------------------------------------------------------

/**
 * What the near crowd may draw at most, per street tier: people, triangles (the bodies at their level of detail plus what they wear) and
 * draw calls (a body and its wardrobe are two; the cups and phones one each). A budget of its own on top of the scene's (like the dive's
 * aerial city), because it exists only on devices that passed the far crowd's gate, and the adaptive caps shrink it with the far crowd.
 */
export const NEAR_CAPS: Readonly<Record<StreetTier, { people: number; triangles: number; drawCalls: number }>> = Object.freeze({
  full: { people: 12, triangles: 72_000, drawCalls: 28 },
  lite: { people: 6, triangles: 36_000, drawCalls: 14 },
});
/** Never more near people than this, whatever asks. */
export const NEAR_HARD_CAP = 20;
/** Draw calls the props take (one instanced mesh of cups, one of phones), and a body's own (its mesh and its wardrobe layer). */
export const PROP_CALLS = 2, BODY_CALLS = 2;

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
/** A child's head against the body (the bone's scale): children's heads are larger for their height. */
export const CHILD_HEAD = 1.12;

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
}
export type Prop = 'cup' | 'phone' | null;
export interface NearDress {
  look: NearLook
  /** The seed the body takes (blinks, the expression's motion). */
  seed: string
  prop: Prop
  /** With a phone: on a call (held up by the face) rather than reading it. */
  call: boolean
  child: boolean
  /** The scene scale to fit the body at (skinned.ts fitScale): it then stands as tall as the cut-out it replaces. */
  scale: number
  /** Seconds into the idle clip this person stands at (each their own, so a group never sways in step). */
  idle: number
}

const HAIR = {
  woman: ['braids', 'braids', 'braids', 'afro', 'bun', 'ponytail', 'locs', 'cornrows', 'twists', 'bantuknots', 'lowcut', 'long'],
  man: ['lowcut', 'lowcut', 'fade', 'fade', 'bald', 'curls', 'afro', 'locs', 'cornrows', 'twists', 'braids', 'classic'],
  // Children keep close-fitting styles: a full afro on a child's larger head reads as a helmet.
  girl: ['braids', 'bantuknots', 'cornrows', 'ponytail', 'twists'],
  boy: ['lowcut', 'fade', 'curls', 'lowcut'],
} as const;
/** Black, soft black, dark brown and brown mostly; a little auburn. */
const HAIR_COLOURS = ['#1c1917', '#1c1917', '#2b2320', '#2b2320', '#3d2a1f', '#5a3a26', '#8a3b22'] as const;
const GREY = '#9c9893';
/** What each of the far crowd's outfits (crowd.ts OUTFITS) is in the wardrobe's cuts. */
const CUTS: Readonly<Record<string, { woman: readonly string[]; man: readonly string[] }>> = {
  office: { woman: ['office'], man: ['office'] },
  casual: { woman: ['casual'], man: ['casual', 'hoodie', 'chill'] },
  print: { woman: ['owambe', 'gown'], man: ['kaftan', 'agbada'] },
  sport: { woman: ['jersey'], man: ['jersey'] },
  smart: { woman: ['gown', 'office'], man: ['office'] },
  coat: { woman: ['office', 'casual'], man: ['office'] },
  summer: { woman: ['casual', 'gown'], man: ['casual', 'chill'] },
};
const PRINTS = ['ankara', 'adire', 'asooke'] as const;
/** Scene units of the avatar the body is fitted to (skinned.ts fitScale: 2.45 × the scene scale). */
export const AVATAR_UNITS = 2.45;
/** The share of adults who carry a coffee (not those who look at phones). */
export const CUP_SHARE = 0.18;

/** How the near crowd dresses the person at `index` of a street's planned crowd (seeded by the street and the index). */
export function nearDress(person: Person, index: number, seed: string): NearDress {
  const next = makeRng(`street-life|near|${seed}|${index}`);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length) % list.length] as T;
  const child = person.child === true;
  const woman = child ? next() < 0.5 : person.skirt || next() < 0.35;
  const kind = OUTFITS[person.outfit]?.name ?? 'casual';
  const wrapped = !child && person.style === 1, grey = !child && person.style === 2;
  const accessories: string[] = [], wearables: string[] = [];
  let hair: string = pick(child ? (woman ? HAIR.girl : HAIR.boy) : woman ? HAIR.woman : HAIR.man);
  let outfit: string, fabric = 'plain';
  if (child) {
    outfit = pick(woman ? ['casual', 'jersey', 'gown'] : ['casual', 'jersey', 'hoodie']);
    if (next() < 0.3) wearables.push('school-uniform');
    if (person.bag === 2 || next() < 0.25) accessories.push('backpack');
  } else {
    const cuts = CUTS[kind] ?? CUTS.casual!;
    outfit = pick(woman ? cuts.woman : cuts.man);
    if (kind === 'print' || (outfit === 'gown' && next() < 0.5)) fabric = pick(PRINTS);
    if (person.bag === 2) accessories.push('backpack'); else if (person.bag === 1 || person.bag === 3) accessories.push('handbag');
    const extra = next();
    if (extra < 0.1) accessories.push('glasses'); else if (extra < 0.18) accessories.push('sunglasses'); else if (extra < 0.4) accessories.push('watch');
    if (woman && next() < 0.3) accessories.push('earrings');
    if (wrapped) {
      if (woman) { const wrap = next(); if (wrap < 0.45) hair = 'gele'; else wearables.push(wrap < 0.75 ? 'hijab-wrap' : 'hijab-drape'); }
      else if (next() < 0.35) wearables.push('turban'); else accessories.unshift('cap');
    }
  }
  const heightClass: NearLook['appearance']['height'] = child ? 'average' : person.height < 2.45 ? 'short' : person.height > 2.72 ? 'tall' : 'average';
  const build: NearLook['appearance']['build'] = child ? 'slim' : person.width < 0.95 ? 'slim' : person.width > 1.12 ? 'broad' : 'average';
  const ageAppearance: NearLook['appearance']['ageAppearance'] = grey ? 'elder' : !child && next() < 0.12 ? 'mature' : 'adult';
  const appearance = { height: heightClass, build, ageAppearance };
  const look: NearLook = {
    body: woman ? 'woman' : 'man', skin: person.skin, hair, hairColor: grey ? GREY : pick(HAIR_COLOURS), outfit, fabric,
    // A jacket is the top people see; trousers or a skirt keep the cut-out's colour, so the hand-over keeps the person.
    outfitColor: person.jacket ?? person.shirt, bottomsColor: person.legs,
    accessories, ...(wearables.length ? { wearables } : {}), expression: next() < 0.4 ? 'smile' : 'neutral', face: pick(['oval', 'round', 'long']), appearance,
  };
  const prop: Prop = child ? null : person.phone ? 'phone' : next() < CUP_SHARE ? 'cup' : null;
  // The body's own height factor (short 0.94, tall 1.06) is taken out, so the body stands exactly as tall as the cut-out.
  const scale = person.height / (AVATAR_UNITS * avatarProportions(appearance).height);
  return { look, seed: `${seed}|near|${index}`, prop, call: prop === 'phone' && next() < 0.35, child, scale, idle: next() * 8 };
}

// ---- what they do ----------------------------------------------------------------------------------------------------------------

/** One full walk cycle (two steps) is this share of a body's height: the player's own (src/scene/movement.ts gaitPhase: 1.83 / 2.45). */
export const WALK_CYCLE = 1.83 / 2.45;
export type NearAction =
  | { kind: 'walk'; phase: number }
  | { kind: 'stand'; seconds: number }
  | { kind: 'drink'; seconds: number }
  | { kind: 'phone'; call: boolean };

/** What a near person does at this moment (seconds: wall clock), from the far crowd's pose (crowd.ts personAt). */
export function nearAction(person: Person, pose: PersonPose, dress: NearDress, seconds: number): NearAction {
  if (pose.mode === 0) return { kind: 'walk', phase: (2 * Math.PI * (pose.travelled ?? 0)) / (WALK_CYCLE * person.height) };
  if (pose.mode === 2 && dress.prop === 'phone') return { kind: 'phone', call: dress.call };
  if (dress.prop === 'cup') return { kind: 'drink', seconds: seconds + dress.idle };
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
