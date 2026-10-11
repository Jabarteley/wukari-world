/**
 * OWNER: scenes
 * Procedural people: one smooth, rounded, low-detail figure (a round head about a sixth of the height, a neck,
 * tapered torso, capsule limbs, mitten hands, simple shoes), drawn at three levels of detail.
 *
 *   normalizeLook(look, seed)            → a complete look; anything missing or unknown is chosen
 *                                          deterministically from `seed` (e.g. a public player id)
 *   drawAvatar(batch, look, options)     → draws one avatar into a geometry batch (build.ts).
 *                                          options.detail (per avatar, so one batch may mix them):
 *                                            'low'    default; crowds and scenes, at most 600 triangles
 *                                            'medium' the same smooth figure with fewer segments and fewer
 *                                                     small parts, about 1,500 to 2,000 triangles — for the
 *                                                     player's own avatar in a scene
 *                                            'high'   the character preview: the same figure with a rounder
 *                                                     face (ears, nose, highlights), hands with thumbs, two-part
 *                                                     shoes and printed fabric, about 2,000 to 3,000 triangles
 *   buildAvatar(kit, look, options)      → THREE.Group holding one avatar (one or two meshes); with
 *                                          `rig: true` it is built as movable parts
 *                                          (userData.parts) that poseAvatar() turns
 *   poseAvatar(avatar, { pose, stride }) → poses a rigged avatar by rotating its parts: no rebuild
 *   buildCrowd(kit, people, options)     → { group, tags, triangles, dispose } — every person in
 *                                          one merged mesh, with name-tag data for the DOM
 *
 * A look is `{ body, hair, outfit, fabric, skin, hairColor, outfitColor, bottomsColor }` plus the
 * optional `accessories` (a list), `face` and `expression` (state.onboarding.look). Option ids are
 * listed in LOOK_OPTIONS; matching ignores case, spaces and punctuation ('Low cut' = 'lowcut').
 * Colours may be a swatch id, a swatch index or '#rrggbb'; the game's own skin ids ('skin-1' …
 * 'skin-7', content/traits.js) are understood too.
 *
 * WALKING. `pose: 'walk'` or `'jog'` with `stride` (0 … 1, one full cycle; it wraps) gives every
 * frame of the cycle at every detail level: 0 and 0.5 are the passing positions, 0.25 and 0.75
 * the two contacts, with opposite arm swing, a slight lean and a bob. A scene can either redraw
 * with a new stride, or — cheaper — build its player once with buildAvatar(kit, look, { rig:
 * true, detail: 'medium' }) and call poseAvatar(avatar, { pose: 'walk', stride }) per step, which
 * only rotates transforms.
 *
 * Nothing here animates by itself: a pose is chosen when the avatar is drawn or posed (POSES).
 * Rules for everything under src/scene/: procedural geometry only, no downloaded models or
 * textures, no animation loops — the host (src/venue-world.ts) draws on demand.
 */
import type * as THREE from 'three';
import { createBatch, sceneMaterials, kitResources, releaseObjects, hash, GLOW } from './build.ts';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { avatarProportions, normalizeAvatarAppearance } from '../types/avatar.ts';
import type { AvatarLookExtensions } from '../types/avatar.ts';
import { normalizeAvatarWearables, resolveAvatarWearablesForRenderer } from '../game/wardrobe/rules.ts';
import { AVATAR_WEARABLE_CATALOGUE } from '../game/wardrobe/catalogue.ts';
import { AVATAR_LOW_TRIANGLES } from '../budgets.ts';
import type { Kit } from './kit.ts';
import type { Batch, BatchOptions, Colour, ThreeModule, Vec3 } from './types.ts';

export type Body = 'woman' | 'man';
export type Fabric = 'plain' | 'ankara' | 'adire' | 'asooke';
export type Face = 'oval' | 'round' | 'long';
export type Expression = 'smile' | 'neutral' | 'grin';
export type Pose = 'stand' | 'sit' | 'walk' | 'wave' | 'work' | 'dance' | 'relax' | 'jog';
export type DetailLevel = 'low' | 'medium' | 'high';
/** The floating mark over a head: 'crown' = you, 'npc' = green dot, 'player' = blue dot. */
export type Marker = 'crown' | 'npc' | 'player';
export type CrowdKind = 'player' | 'npc' | 'self';
/** The limbs and body sections of a rigged avatar. */
export type PartName = 'torso' | 'head' | 'armL' | 'armR' | 'legL' | 'legR';

export interface Swatch { id: string; hex: Colour }
/** The option ids a look can take (colours are swatches). */
export interface LookOptions {
  body: readonly Body[];
  hair: Record<Body, readonly string[]>;
  outfit: Record<Body, readonly string[]>;
  fabric: readonly Fabric[];
  accessories: readonly string[];
  face: readonly Face[];
  expression: readonly Expression[];
  skin: readonly Swatch[];
  hairColor: readonly Swatch[];
  outfitColor: readonly Swatch[];
}
/** A complete look: every field set, colours as '#rrggbb'. */
export interface Look extends AvatarLookExtensions {
  body: Body;
  hair: string;
  outfit: string;
  fabric: Fabric;
  skin: Colour;
  hairColor: Colour;
  outfitColor: Colour;
  bottomsColor: Colour;
  accessories: string[];
  face: Face;
  expression: Expression;
}
/** The part of a batch the drawing functions use: a rig batch has no build(), and draws `part()`s into batches of their own. */
export interface Drawing {
  isBatch: true;
  box(x: number, y: number, z: number, w: number, h: number, d: number, colour: Colour, o?: BatchOptions): Drawing;
  cyl(x: number, y: number, z: number, r: number, h: number, colour: Colour, o?: BatchOptions): Drawing;
  cone(x: number, y: number, z: number, r: number, h: number, colour: Colour, o?: BatchOptions): Drawing;
  ball(x: number, y: number, z: number, rx: number, ry: number, rz: number, colour: Colour, o?: BatchOptions): Drawing;
  ico(x: number, y: number, z: number, rx: number, ry: number, rz: number, colour: Colour, o?: BatchOptions): Drawing;
  quad(x: number, y: number, z: number, w: number, h: number, colour: Colour, o?: BatchOptions): Drawing;
  disc(x: number, y: number, z: number, r: number, colour: Colour, o?: BatchOptions): Drawing;
  at(x: number, y: number, z: number, ry: number, draw: (b: Drawing) => void, rx?: number, rz?: number, scale?: number): Drawing;
  light(x: number, y: number, z: number, colour: Colour, intensity?: number, distance?: number): Drawing;
  world(x: number, y: number, z: number): { x: number; y: number; z: number };
  readonly triangles: number;
  /** Only a rig batch has it: draws `fn` into the batch of the named part, pivoted at (x, y, z). */
  part?(name: string, x: number, y: number, z: number, fn: (b: Drawing) => void, rx?: number, rz?: number): void;
}
/** Options of drawAvatar and buildAvatar. */
export interface DrawOptions {
  sleeping?: boolean;
  x?: number; y?: number; z?: number; ry?: number;
  pose?: Pose;
  /** The phase of 'walk' or 'jog', 0 … 1. */
  stride?: number;
  /** Seat height when sitting. */
  seat?: number;
  seed?: unknown;
  scale?: number;
  /** Internal buildAvatar fitting applies complete proportions after batching. */
  appearanceFit?: boolean;
  marker?: Marker | null;
  detail?: DetailLevel;
}
export interface AvatarOptions extends DrawOptions { rig?: boolean }
export interface DrawnAvatar { look: Look; top: number }
/** The movable parts of a rigged avatar (each a Group pivoted at its joint). */
export type AvatarParts = Record<PartName | 'body', THREE.Group>;
interface Bend { geometry: THREE.BufferGeometry; start: number; position: Float32Array; normal: Float32Array; pivotY: number; angle: number; kind: 'calf' | 'fore'; side: 0 | 1 }
export interface AvatarUserData { look: Look; top: number; triangles: number; dispose: () => void; parts?: AvatarParts; bends?: Bend[] }
/** What buildAvatar returns. */
export interface AvatarGroup extends THREE.Group { userData: AvatarUserData }
/** An avatar built with `rig: true`: its parts are there. */
export interface RiggedAvatar extends AvatarGroup { userData: AvatarUserData & { parts: AvatarParts } }
/** A person in a crowd. */
export interface CrowdPerson extends DrawOptions {
  id?: string;
  name?: string;
  kind?: CrowdKind;
  look?: unknown;
  /** Overrides the marker the kind would give. */
  marker?: Marker | null;
}
/** Name-tag record for the DOM layer. */
export interface CrowdTag {
  id: string;
  name: string;
  kind: CrowdKind;
  text: string;
  marker: 'dot' | 'crown' | 'tag';
  colour: Colour;
  position: { x: number; y: number; z: number };
}
export interface Crowd { group: THREE.Group; tags: CrowdTag[]; triangles: number; dispose: () => void }
export interface LookColours { shirt: Colour; pants: Colour; skin: Colour; hair: Colour }

const swatches = (entries: [string, Colour][]): Swatch[] => entries.map(([id, hex]) => ({ id, hex }));
export const LOOK_OPTIONS: Readonly<LookOptions> = Object.freeze<LookOptions>({
  body: ['woman', 'man'],
  hair: {
    woman: ['braids', 'afro', 'bun', 'ponytail', 'long', 'locs', 'lowcut', 'gele', 'classic', 'cornrows', 'twists', 'bantuknots'],
    man: ['lowcut', 'bald', 'curls', 'afro', 'locs', 'braids', 'classic', 'fade', 'cornrows', 'twists'],
  },
  outfit: {
    woman: ['casual', 'office', 'owambe', 'sitework', 'jersey', 'kaftan', 'gown'],
    man: ['casual', 'hoodie', 'office', 'chill', 'sitework', 'jersey', 'kaftan', 'agbada'],
  },
  fabric: ['plain', 'ankara', 'adire', 'asooke'],
  accessories: ['glasses', 'sunglasses', 'cap', 'headwrap', 'fila', 'earrings', 'chain', 'watch', 'beads', 'backpack', 'handbag'],
  face: ['oval', 'round', 'long'],
  expression: ['smile', 'neutral', 'grin'],
  skin: swatches([['sand', '#c68a5e'], ['honey', '#b0764d'], ['bronze', '#9a6341'], ['chestnut', '#845236'], ['cocoa', '#6e422c'], ['umber', '#573323'], ['ebony', '#40261b']]),
  hairColor: swatches([['black', '#1c1917'], ['softblack', '#2b2320'], ['darkbrown', '#3d2a1f'], ['brown', '#5a3a26'], ['auburn', '#8a3b22'], ['blonde', '#d2a857'], ['purple', '#7a4bb0']]),
  outfitColor: swatches([['blue', '#3f72c4'], ['green', '#3f9a5a'], ['red', '#c9423a'], ['orange', '#e0822f'], ['violet', '#8055c2'], ['pink', '#dd6fa0'], ['teal', '#2f9d98'], ['navy', '#243a66'], ['cream', '#ece2c6'], ['gold', '#d6a83a']]),
});
/** Accessories that share a slot replace each other: only the first of a slot is drawn. */
export const ACCESSORY_SLOTS: Readonly<Record<string, string>> = Object.freeze({ glasses: 'eyes', sunglasses: 'eyes', cap: 'head', headwrap: 'head', fila: 'head', earrings: 'ears', chain: 'neck', watch: 'wrist', beads: 'hand', backpack: 'carry', handbag: 'carry' });
export const POSES: readonly Pose[] = Object.freeze(['stand', 'sit', 'walk', 'wave', 'work', 'dance', 'relax', 'jog']);
/** The limbs and body sections of a rigged avatar (buildAvatar with `rig: true`). */
export const PARTS: readonly PartName[] = Object.freeze(['torso', 'head', 'armL', 'armR', 'legL', 'legR']);
export const DETAILS: readonly DetailLevel[] = Object.freeze(['low', 'medium', 'high']);
// The game's skin swatches (APPEARANCE.skin in content/traits.js), so a saved look keeps its tone in a scene.
const GAME_SKIN: Record<string, Colour> = { skin1: '#e0ac7e', skin2: '#c98e62', skin3: '#b0764c', skin4: '#96603c', skin5: '#7a4a2c', skin6: '#5e3620', skin7: '#3f2416' };

const key = (value: unknown): string => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIASES: Record<string, string> = { female: 'woman', f: 'woman', girl: 'woman', male: 'man', m: 'man', boy: 'man', asoke: 'asooke', lowcut: 'lowcut', site: 'sitework', work: 'sitework', smart: 'office' };

function pickOption<T extends string>(value: unknown, list: readonly T[], seed: number): T {
  const wanted = ALIASES[key(value)] || key(value);
  return list.includes(wanted as T) ? wanted as T : list[seed % list.length]!;
}
function pickColour(value: unknown, palette: readonly Swatch[], seed: number): Colour {
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim())) return value.trim().toLowerCase();
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < palette.length) return palette[value]!.hex;
  const named = palette.find((swatch) => swatch.id === key(value));
  if (!named && palette === LOOK_OPTIONS.skin && GAME_SKIN[key(value)]) return GAME_SKIN[key(value)]!;
  return (named || palette[seed % palette.length]!).hex;
}
/** Known accessories, one per slot, in the order given. */
function pickAccessories(value: unknown): string[] {
  const slots = new Set<string>(), out: string[] = [];
  for (const item of Array.isArray(value) ? value : []) {
    const id = key(item), slot = ACCESSORY_SLOTS[id];
    if (!slot || slots.has(slot)) continue;
    slots.add(slot); out.push(id);
  }
  return out;
}
// What a passer-by with no recorded look may carry (most carry nothing).
const SEEDED_ACCESSORIES: string[][] = [[], [], [], ['glasses'], ['cap'], [], ['backpack'], ['watch'], [], ['sunglasses'], ['handbag'], []];

/** Fill in a look. The same input and seed always give the same result. */
export function normalizeLook(look?: unknown, seed?: unknown): Look {
  const source: Record<string, unknown> = look && typeof look === 'object' ? look as Record<string, unknown> : {};
  const recorded = Object.keys(source).length > 0;
  const base = seed ?? source.seed ?? source.id ?? 'joinallworld';
  const pick = (part: string) => hash(`${base}:${part}`);
  const body = pickOption(source.body ?? source.gender, LOOK_OPTIONS.body, pick('body'));
  const outfitColor = pickColour(source.outfitColor, LOOK_OPTIONS.outfitColor, pick('outfitColor'));
  let bottomsSeed = pick('bottomsColor');
  if (LOOK_OPTIONS.outfitColor[bottomsSeed % 10]!.hex === outfitColor) bottomsSeed += 7;
  // Seeded fallbacks rarely pick site work, so a crowd is not a sea of hard hats.
  const outfits = LOOK_OPTIONS.outfit[body], everyday = outfits.filter((id) => id !== 'sitework');
  const outfitSeed = outfits.indexOf(pick('outfit') % 9 === 0 ? 'sitework' : everyday[pick('outfit') % everyday.length]!);
  return {
    body,
    hair: pickOption(source.hair ?? source.hairstyle, LOOK_OPTIONS.hair[body], pick('hair')),
    outfit: pickOption(source.outfit, outfits, outfitSeed),
    fabric: pickOption(source.fabric, LOOK_OPTIONS.fabric, source.fabric == null && pick('fabric') % 2 ? 0 : pick('fabric')),
    skin: pickColour(source.skin ?? source.skinTone, LOOK_OPTIONS.skin, pick('skin')),
    hairColor: pickColour(source.hairColor, LOOK_OPTIONS.hairColor, pick('hairColor') % 4),
    outfitColor,
    bottomsColor: pickColour(source.bottomsColor, LOOK_OPTIONS.outfitColor, bottomsSeed),
    // A recorded look wears exactly what it lists (nothing, if it lists nothing).
    accessories: pickAccessories(recorded ? source.accessories : SEEDED_ACCESSORIES[pick('accessories') % SEEDED_ACCESSORIES.length]),
    face: pickOption(source.face, LOOK_OPTIONS.face, recorded ? 0 : pick('face')),
    expression: pickOption(source.expression, LOOK_OPTIONS.expression, 0),
    ...(source.wearables != null ? { wearables: normalizeAvatarWearables(source.wearables) } : {}),
    ...(source.appearance != null ? { appearance: normalizeAvatarAppearance(source.appearance) } : {}),
  };
}

// Joint angles per pose. arm/leg: [pitch, roll] at the shoulder/hip (negative pitch = forward);
// fore/calf: bend at the elbow/knee. Index 0 is the avatar's right side (−x), 1 its left (+x).
interface Joints {
  /** [pitch, roll] at the shoulder; index 0 is the avatar's right side. */
  arm: [[number, number], [number, number]];
  fore: [number, number]; leg: [number, number]; calf: [number, number];
  lean: number; bob?: number;
}
const POSE: Partial<Record<Pose, Joints>> & { stand: Joints } = {
  stand: { arm: [[0.06, 0.1], [0.06, 0.1]], fore: [-0.18, -0.18], leg: [0.03, -0.03], calf: [0, 0], lean: 0 },
  sit: { arm: [[-0.35, 0.08], [-0.35, 0.08]], fore: [-0.95, -0.95], leg: [-1.5, -1.5], calf: [1.5, 1.5], lean: -0.04 },
  walk: { arm: [[0.55, 0.1], [-0.55, 0.1]], fore: [-0.35, -0.6], leg: [-0.5, 0.42], calf: [0.15, 0.6], lean: 0.06 },
  wave: { arm: [[0.06, 0.1], [0, 2.55]], fore: [-0.18, -0.55], leg: [0.03, -0.03], calf: [0, 0], lean: 0 },
  work: { arm: [[-0.75, 0.12], [-0.75, 0.12]], fore: [-0.85, -0.85], leg: [0.03, -0.03], calf: [0, 0], lean: 0.14 },
  dance: { arm: [[-0.4, 2.2], [-1.1, 0.5]], fore: [-0.7, -1.2], leg: [-0.45, 0.12], calf: [0.75, 0.1], lean: -0.06 },
  // At ease: weight on one leg, the other knee soft, arms a little away from the body and bent.
  relax: { arm: [[0.1, 0.17], [-0.04, 0.15]], fore: [-0.36, -0.26], leg: [0.015, -0.075], calf: [0, 0.13], lean: 0.01 },
};

// What each outfit is made of. sleeve: short | long | wide | cap. legs: trousers | shorts | skirt |
// wrapper | dress. `hem` is where the top ends, measured from the hips; `bulk` pads the torso.
/**
 * A walk or jog cycle. `stride` is the phase, 0 … 1 for one full cycle (it wraps): 0 and 0.5 are
 * the passing positions (legs together, body at its highest), 0.25 and 0.75 the two contacts
 * (right foot forward, then left; body at its lowest). Arms swing opposite to the legs, the
 * swinging leg's knee bends, the torso leans a little and `bob` moves the body up and down.
 */
function gait(stride: number | undefined, jog: boolean): Joints {
  const p = (stride !== undefined && Number.isFinite(stride) ? stride : 0.25) * TAU, swing = Math.sin(p);
  const reach = jog ? 0.78 : 0.5, knee = jog ? 1.25 : 0.62, elbow = jog ? -1.35 : -0.35;
  // Index 0 is the right side. A leg's knee bends while that leg is travelling forwards.
  const leg: [number, number] = [-reach * swing, reach * swing];
  const calf: [number, number] = [(jog ? 0.3 : 0.08) + knee * Math.max(0, Math.cos(p)), (jog ? 0.3 : 0.08) + knee * Math.max(0, -Math.cos(p))];
  const arm: Joints['arm'] = [[reach * 0.9 * swing, 0.1], [-reach * 0.9 * swing, 0.1]];
  return { arm, fore: [elbow - 0.15 * Math.max(0, -swing), elbow - 0.15 * Math.max(0, swing)], leg, calf, lean: jog ? 0.17 : 0.06, bob: (jog ? 0.045 : 0.02) * Math.cos(2 * p) };
}
/** Joint angles for a pose (an unknown pose stands). 'walk' and 'jog' take `stride`; 'walk' without one is the classic mid-stride figure. */
function jointsOf(pose: Pose | undefined, stride?: number): Joints {
  if (pose === 'jog' || (pose === 'walk' && Number.isFinite(stride))) return gait(stride, pose === 'jog');
  return (pose && POSE[pose]) || POSE.stand;
}
/** Draw `fn` in a frame at (x, y, z) turned by rx, rz. On a rig this is a separate, movable part with its pivot there. */
function part(b: Drawing, name: string, x: number, y: number, z: number, fn: (b: Drawing) => void, rx = 0, rz = 0): void {
  if (b.part) b.part(name, x, y, z, fn, rx, rz);
  else b.at(x, y, z, 0, fn, rx, rz);
}

interface Outfit { sleeve: string; legs: string; shoe: string; hem: number; collar?: boolean; gown?: boolean; vest?: boolean; helmet?: boolean; hood?: boolean; bulk?: number; open?: boolean; sport?: boolean; socks?: boolean; tunic?: boolean; robe?: boolean; dress?: boolean }
const OUTFIT: Record<string, Outfit> & { casual: Outfit } = {
  casual: { sleeve: 'short', legs: 'trousers', shoe: 'sneaker', hem: -0.13 },
  office: { sleeve: 'long', legs: 'trousers', shoe: 'dress', hem: -0.13, collar: true },
  owambe: { sleeve: 'wide', legs: 'wrapper', shoe: 'heel', hem: -0.1, gown: true },
  sitework: { sleeve: 'short', legs: 'trousers', shoe: 'boot', hem: -0.13, vest: true, helmet: true },
  hoodie: { sleeve: 'long', legs: 'trousers', shoe: 'sneaker', hem: -0.16, hood: true, bulk: 0.03 },
  chill: { sleeve: 'short', legs: 'shorts', shoe: 'slide', hem: -0.13, open: true },
  jersey: { sleeve: 'short', legs: 'shorts', shoe: 'sneaker', hem: -0.15, sport: true, socks: true },
  kaftan: { sleeve: 'long', legs: 'trousers', shoe: 'dress', hem: -0.52, tunic: true },
  agbada: { sleeve: 'long', legs: 'trousers', shoe: 'dress', hem: -0.2, robe: true },
  gown: { sleeve: 'cap', legs: 'dress', shoe: 'heel', hem: -0.1, dress: true },
};
OUTFIT['avatar-abaya'] = { sleeve: 'long', legs: 'dress', shoe: 'slide', hem: -0.13, bulk: 0.018 };
OUTFIT['avatar-buba-iro'] = { sleeve: 'wide', legs: 'wrapper', shoe: 'slide', hem: -0.1, gown: true };
OUTFIT['avatar-school'] = { sleeve: 'short', legs: 'trousers', shoe: 'dress', hem: -0.1, collar: true };
OUTFIT['avatar-school-skirt'] = { sleeve: 'short', legs: 'skirt', shoe: 'dress', hem: -0.1, collar: true };
OUTFIT['avatar-work'] = { sleeve: 'long', legs: 'trousers', shoe: 'boot', hem: -0.1, collar: true };
// [upper, sole] colours.
type Shoe = [Colour, Colour];
const SHOES: Record<string, Shoe> & { sneaker: Shoe } = { sneaker: ['#2c3340', '#f1efe9'], dress: ['#1f1c1c', '#141212'], heel: ['#c9a13a', '#a8842a'], boot: ['#8a6a3c', '#2b2622'], slide: ['#3a342e', '#d9cfb8'] };

// Body measurements. Radii are half-widths; depth = radius × aspect. Torso heights are measured
// from the hips (1.06 above the feet), where the upper body leans from.
interface Measures { hip: number; waist: number; chest: number; shoulder: number; aspect: number; arm: number; elbow: number; wrist: number; leg: number; knee: number; calf: number; ankle: number; neck: number; legX: number }
const BODY: Record<Body, Measures> = {
  woman: { hip: 0.252, waist: 0.172, chest: 0.208, shoulder: 0.226, aspect: 0.72, arm: 0.062, elbow: 0.052, wrist: 0.04, leg: 0.1, knee: 0.075, calf: 0.07, ankle: 0.048, neck: 0.056, legX: 0.11 },
  man: { hip: 0.232, waist: 0.208, chest: 0.272, shoulder: 0.308, aspect: 0.62, arm: 0.08, elbow: 0.066, wrist: 0.05, leg: 0.1, knee: 0.08, calf: 0.078, ankle: 0.054, neck: 0.074, legX: 0.11 },
};
const HIP_Y = 1.06, SHOULDER_Y = 0.64;
const HEAD = { y: 2.14 };
const CLOTH_WHITE = '#f3f0e8', INK = '#1f1a1a', GOLD = '#d9b048', CORAL = '#d8452c';
const TAU = Math.PI * 2;

const q3 = (value: number) => Math.round(value * 1000) / 1000;
const channels = (hex: Colour): number[] => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (rgb: number[]): Colour => `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const shade = (hex: Colour, amount: number): Colour => toHex(channels(hex).map((v) => v * (1 + amount) + (amount > 0 ? 255 * amount * 0.25 : 0)));
const mix = (a: Colour, b: Colour, t: number): Colour => { const x = channels(a), y = channels(b); return toHex(x.map((v, i) => v * (1 - t) + y[i]! * t)); };

/** Colour list a fabric is woven from: [main, second, third]. */
type Colours = [Colour, Colour, Colour];
function fabricColours(look: Look): Colours {
  const main = look.outfitColor, palette = LOOK_OPTIONS.outfitColor, at = palette.findIndex((swatch) => swatch.hex === main);
  const other = (step: number) => palette[((at < 0 ? hash(main) : at) + step) % palette.length]!.hex;
  if (look.fabric === 'ankara') return [main, other(3), other(7)];
  if (look.fabric === 'adire') return [main, '#e6ebf3', shade(main, -0.3)];
  if (look.fabric === 'asooke') return [main, '#e2c15a', shade(main, -0.35)];
  return [main, main, main];
}

// ---- Lofted shapes --------------------------------------------------------------------------
// A garment, a torso or a limb is a stack of tapered elliptical rings: [[y, radius], …] from the bottom up.

/** Rings through `keys` with `per` steps between each pair, rounded with a Catmull-Rom curve. */
type Ring = [number, number];
function smooth(keys: Ring[], per = 3): Ring[] {
  if (per <= 1) return keys.map((ring) => [...ring]);
  const out: Ring[] = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[Math.max(0, i - 1)]![1], b = keys[i]![1], c = keys[i + 1]![1], d = keys[Math.min(keys.length - 1, i + 2)]![1];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([keys[i]![0] + (keys[i + 1]![0] - keys[i]![0]) * t, 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)]);
    }
  }
  out.push([...keys[keys.length - 1]!]);
  return out;
}
const torsoKeys = (m: Measures): Ring[] => [[-0.14, m.hip * 0.93], [-0.02, m.hip], [0.22, m.waist], [0.5, m.chest], [0.64, m.shoulder], [0.73, m.shoulder * 0.66], [0.79, m.neck + 0.075], [0.85, m.neck + 0.03]];
const padded = (rings: Ring[], pad: number): Ring[] => rings.map(([y, r]) => [y, r + pad]);
function radiusAt(rings: Ring[], y: number): number {
  if (y <= rings[0]![0]) return rings[0]![1];
  for (let i = 1; i < rings.length; i++) {
    if (y <= rings[i]![0]) { const [y0, r0] = rings[i - 1]!, [y1, r1] = rings[i]!; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
  }
  return rings[rings.length - 1]![1];
}
/** The part of `rings` between two heights, with new rings cut exactly at the ends. */
function clip(rings: Ring[], from: number, to: number): Ring[] {
  const inside = rings.filter(([y]) => y > from + 1e-6 && y < to - 1e-6);
  return [[from, radiusAt(rings, from)], ...inside, [to, radiusAt(rings, to)]];
}
interface LoftOptions { seg?: number; aspect?: number; z?: number; capped?: boolean }
/** One colour, or one per ring section (cycled). */
type Paint = Colour | Colour[];
function loft(b: Drawing, rings: Ring[], colour: Paint, { seg = 12, aspect = 1, z = 0, capped = false }: LoftOptions = {}): void {
  for (let i = 0; i < rings.length - 1; i++) {
    const [y0, r0] = rings[i]!, [y1, r1] = rings[i + 1]!;
    if (y1 - y0 < 1e-5) continue;
    b.cyl(0, (y0 + y1) / 2, z, r0, y1 - y0, Array.isArray(colour) ? colour[i % colour.length]! : colour, { seg, top: q3(r1 / r0), sz: aspect, open: !capped });
  }
}
/** A ring of trim lying on a loft at height y: follows the loft's taper, so it never cuts through it. */
function band(b: Drawing, rings: Ring[], y: number, height: number, colour: Colour, { seg = 12, aspect = 1, z = 0, lift = 0.005 }: { seg?: number; aspect?: number; z?: number; lift?: number } = {}): void {
  const r0 = radiusAt(rings, y - height / 2) + lift, r1 = radiusAt(rings, y + height / 2) + lift;
  b.cyl(0, y, z, r0, height, colour, { seg, top: q3(r1 / r0), sz: aspect, open: true });
}
/** A point on a loft's surface at height y and angle a (0 = front), `lift` outside it, with the turn that faces outwards. */
function onLoft(rings: Ring[], aspect: number, y: number, a: number, lift = 0, z = 0): { x: number; y: number; z: number; ry: number } {
  const r = radiusAt(rings, y) + lift;
  return { x: Math.sin(a) * r, y, z: z + Math.cos(a) * r * aspect, ry: Math.atan2(aspect * Math.sin(a), Math.cos(a)) };
}
/** A strip of cloth running up a loft at angle a (0 = front), following its taper. */
function strip(b: Drawing, rings: Ring[], from: number, to: number, a: number, width: number, colour: Colour, { aspect = 1, lift = 0.005, thick = 0.01 }: { aspect?: number; lift?: number; thick?: number } = {}): void {
  const cut = clip(rings, from, to), reach = Math.hypot(Math.sin(a), aspect * Math.cos(a));
  for (let i = 0; i < cut.length - 1; i++) {
    const [y0, r0] = cut[i]!, [y1, r1] = cut[i + 1]!, mid = (y0 + y1) / 2, p = onLoft(cut, aspect, mid, a, lift);
    b.box(p.x, mid, p.z, width, Math.hypot(y1 - y0, (r1 - r0) * reach) + 0.004, thick, colour, { ry: p.ry, rx: Math.atan2((r1 - r0) * reach, y1 - y0) });
  }
}
/** A tapered rod from A to B (points [x, y, z]): fingers, strands of hair, straps, frames. */
function stick(b: Drawing, A: Vec3, B: Vec3, rA: number, rB: number, colour: Colour, seg = 6): void {
  const dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2], length = Math.hypot(dx, dy, dz) || 1e-6;
  b.cyl((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2, rA, length, colour, { seg, top: q3(rB / rA), rx: Math.acos(Math.max(-1, Math.min(1, dy / length))), ry: Math.atan2(dx, dz) });
}
/** Rods through a list of points, tapering from r0 to r1. */
function chain(b: Drawing, points: Vec3[], r0: number, r1: number, colour: Colour, seg = 6): void {
  for (let i = 0; i < points.length - 1; i++) {
    const t0 = i / (points.length - 1), t1 = (i + 1) / (points.length - 1);
    stick(b, points[i]!, points[i + 1]!, r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, colour, seg);
  }
}
/**
 * Fabric print laid over a garment, drawn as flat diamonds and squares (two triangles each) so a pattern costs a few
 * hundred triangles. Ankara: a bold star motif in two colours with a third centre; adire: indigo resist rings, each a
 * diamond inside a diamond; aso-oke: woven bands (wide, then a thin bright thread).
 */
interface PrintOptions { aspect?: number; z?: number; from?: number; to?: number; size?: number; around?: number; seg?: number }
function print(b: Drawing, look: Look, colours: Colours, rings: Ring[], { aspect = 1, z = 0, from = rings[0]![0], to = rings[rings.length - 1]![0], size = 1, around = 8, seg = 14 }: PrintOptions = {}): void {
  const [main, second, third] = colours;
  const quad = (a: number, y: number, s: number, colour: Colour, lift: number, turn: number) => { const q = onLoft(rings, aspect, y, a, lift, z); b.quad(q.x, y, q.z, s, s, colour, { ry: q.ry, rz: turn }); };
  if (look.fabric === 'asooke') {
    for (let y = from + 0.04, i = 0; y < to - 0.03; y += i % 2 ? 0.05 : 0.14, i++) band(b, rings, y, i % 2 ? 0.014 : 0.05, i % 2 ? second : third, { seg, aspect, z, lift: 0.004 });
    return;
  }
  const step = (look.fabric === 'ankara' ? 0.25 : 0.27) * size;
  for (let y = from + step * 0.5, row = 0; y < to - step * 0.3; y += step, row++) {
    for (let i = 0; i < around; i++) {
      const a = (i + (row % 2) * 0.5) / around * TAU, swap = (i + row) % 2;
      if (look.fabric === 'ankara') {
        quad(a, y, 0.13 * size, swap ? third : second, 0.004, 0);
        quad(a, y, 0.13 * size, swap ? second : third, 0.006, Math.PI / 4);
        quad(a, y, 0.05 * size, main, 0.008, Math.PI / 4);
      } else {
        quad(a, y, 0.17 * size, second, 0.004, Math.PI / 4);
        quad(a, y, 0.11 * size, main, 0.006, Math.PI / 4);
        quad(a, y, 0.05 * size, third, 0.008, Math.PI / 4);
      }
    }
  }
}
/** Coarse fabric for the cheapest level: the garment's own rings take the fabric's colours. */
const weave = (look: Look, colours: Colours): Paint => ({ ankara: [colours[0], colours[1], colours[0], colours[2]], adire: [colours[0], colours[0], colours[1], colours[0]], asooke: [colours[0], colours[2]] }[look.fabric as string] || colours[0]);

// ---- The figure: one smooth, rounded, low-detail person at three sizes of detail ------------------
// Everything is a loft of rings, a ball or a flat shape: no boxes in the body. The level only changes how many segments
// the curves have (coarse() below), how many small parts there are and whether a fabric is printed or just banded.

/** k: the share of each curve's segments kept on the body, kh: on the head and hair; per: rings added between a loft's key rings. */
interface Level { k: number; kh: number; per: number; n: 0 | 1 | 2 }
const LEVELS: Record<DetailLevel, Level> = { low: { k: 0.34, kh: 0.42, per: 1, n: 0 }, medium: { k: 0.55, kh: 0.62, per: 1, n: 1 }, high: { k: 0.52, kh: 0.8, per: 2, n: 2 } };
const LOW_BUDGET = AVATAR_LOW_TRIANGLES.value;

/** The same batch with every curved primitive drawn with fewer segments. */
function coarse(b: Drawing, scale: number, minCylinder = 5): Drawing {
  const fewer = (o: BatchOptions | undefined, least: number): BatchOptions => ({ ...o, seg: Math.max(least, Math.round((o?.seg || 8) * scale)) });
  const lite: Drawing = Object.create(b);
  lite.ball = (x: number, y: number, z: number, rx: number, ry: number, rz: number, colour: Colour, o?: BatchOptions) => b.ball(x, y, z, rx, ry, rz, colour, fewer(o, 5));
  lite.cyl = (x: number, y: number, z: number, r: number, h: number, colour: Colour, o?: BatchOptions) => b.cyl(x, y, z, r, h, colour, fewer(o, minCylinder));
  return lite;
}
const cover = (b: Drawing, rings: Ring[], from: number, to: number, pad: number, colour: Colour, seg: number) => loft(b, padded(clip(rings, from, to), pad), colour, { seg });
/** Rods through points with a ball at every joint, so a bent rope has no gaps. */
function rope(b: Drawing, points: Vec3[], r0: number, r1: number, colour: Colour, seg = 6): void {
  chain(b, points, r0, r1, colour, seg);
  for (let i = 1; i < points.length; i++) { const r = r0 + (r1 - r0) * i / (points.length - 1); b.ball(points[i]![0], points[i]![1], points[i]![2], r, r, r, colour, { seg: 6 }); }
}

// The head is drawn in its own frame: origin at the head's centre, +y up, +z towards the face.
interface FaceShape { rx: number; ry: number; rz: number }
const FACES: Record<Face, FaceShape> = { oval: { rx: 0.178, ry: 0.215, rz: 0.187 }, round: { rx: 0.206, ry: 0.196, rz: 0.2 }, long: { rx: 0.154, ry: 0.256, rz: 0.17 } };
/** How far forward the face is at (x, y). */
function faceZ(F: FaceShape, x: number, y: number): number {
  return F.rz * Math.sqrt(Math.max(0.03, 1 - (x / F.rx) ** 2 - (y / F.ry) ** 2));
}
function headShape(b: Drawing, look: Look, F: FaceShape, n: number, sleeping: boolean): void {
  const age = look.appearance?.ageAppearance === 'elder' ? 1 : look.appearance?.ageAppearance === 'mature' ? 0.55 : 0;
  const skin = look.skin, woman = look.body === 'woman', mood = look.expression;
  const dark = channels(skin).reduce((sum, v) => sum + v, 0) < 250, white = '#fbf6ec', eye = '#1b1210';
  b.ball(0, 0, 0, F.rx, F.ry, F.rz, skin, { seg: 20 });
  const ey = 0.012, ex = F.rx * 0.43;
  for (const side of [-1, 1]) {
    const x = side * ex, z = faceZ(F, x, ey), turn = side * 0.32;
    if (!n) b.quad(x, ey, z + 0.014, 0.05, sleeping ? 0.008 : 0.064, eye, { ry: turn });
    else if (!sleeping) { b.cyl(x, ey, z, 0.025, 0.012, eye, { seg: 14, rx: Math.PI / 2, ry: turn, sz: mood === 'grin' ? 0.95 : 1.25 }); b.quad(x - side * 0.01, ey + 0.015, z + 0.012, 0.016, 0.016, white, { rz: Math.PI / 4 }); }
    else b.ball(x, ey, z, 0.03, 0.005, 0.012, eye, { seg: 6, ry: turn });
    if (n) {
      const by = ey + 0.06 + (mood === 'grin' ? 0.012 : 0), bz = faceZ(F, x, by);
      b.quad(x, by, bz + 0.006, woman ? 0.066 : 0.076, woman ? 0.016 : 0.022, mix(look.hairColor, INK, 0.45), { ry: turn, rz: side * (mood === 'neutral' ? 0 : -0.14) });
      if (n > 1) b.ball(side * F.rx * 0.985, -0.005, -0.012, 0.022, 0.042, 0.03, skin, { seg: 6 }); // ear
    }
  }
  if (n > 1) b.ball(0, -0.032, faceZ(F, 0, -0.032) + 0.006, 0.022, 0.022, 0.022, shade(skin, dark ? 0.06 : -0.07), { seg: 6 }); // nose
  const lip = mix(skin, dark ? '#b2545a' : '#a23f46', woman ? 0.65 : 0.5), my = -0.092, mz = faceZ(F, 0, my) + 0.002;
  if (!n) b.quad(0, my, mz + 0.012, mood === 'neutral' ? 0.06 : 0.09, mood === 'grin' ? 0.04 : 0.016, mood === 'grin' ? white : lip);
  else if (mood === 'grin') { b.ball(0, my, mz, 0.05, 0.022, 0.012, '#4a1a1a', { seg: 7 }); b.quad(0, my + 0.004, mz + 0.012, 0.075, 0.018, white); }
  else if (mood === 'smile') { b.ball(0, my - 0.006, mz, 0.044, 0.013, 0.012, lip, { seg: 8 }); for (const side of [-1, 1]) b.quad(side * 0.052, my + 0.008, faceZ(F, side * 0.052, my + 0.008) + 0.006, 0.034, 0.008, shade(lip, -0.3), { rz: side * 0.8, ry: side * 0.5 }); }
  else b.ball(0, my, mz, 0.027, 0.0085, 0.01, lip, { seg: 6 });
  if (age) for (const side of [-1, 1]) b.ball(side * 0.07, ey - 0.052, faceZ(F, side * 0.07, ey - 0.052) + 0.002, 0.03, 0.004 * age + 0.002, 0.006, mix(skin, INK, 0.22), { seg: 5, ry: side * 0.3 });
}

// ---- Hair, in the head's frame ---------------------------------------------------------------------
/** The scalp's covering of hair: an ellipsoid tipped back so its edge is the hairline. */
const cap = (b: Drawing, F: FaceShape, c: Colour, grow = 0, o?: BatchOptions) => b.ball(0, F.ry * 0.3, -0.035, F.rx * 1.05 + grow, F.ry * 0.78 + grow, F.rz * 1.07 + grow, c, { seg: 16, rx: -0.32, ...o });
/** A point on the head's surface, az from the face (0) round to the back (π), el from the ears (0) up to the crown (π/2). */
const onHead = (F: FaceShape, az: number, el: number, lift = 0): Vec3 => [Math.sin(az) * Math.cos(el) * (F.rx + lift), 0.02 + Math.sin(el) * (F.ry + lift), Math.cos(az) * Math.cos(el) * (F.rz + lift)];
/** Points spread evenly over the upper part of a sphere (golden-angle spiral). */
function dome(count: number, coverage = 0.6): Vec3[] {
  return Array.from({ length: count }, (_, i): Vec3 => {
    const up = 1 - (i + 0.5) / count * coverage * 2, r = Math.sqrt(Math.max(0, 1 - up * up)), turn = i * 2.39996;
    return [Math.cos(turn) * r, up, Math.sin(turn) * r];
  });
}
/** Chunky strands hanging from the head round the back, ear to ear; spread is how far round they go (π/2 is the ears). */
function hang(b: Drawing, n: number, F: FaceShape, c: Colour, count: number, spread: number, length: number, r0: number, r1: number, { short = length * 0.55, from = 0.45, bead = null as Colour | null, knots = false } = {}): void {
  for (let i = 0; i < count; i++) {
    const az = Math.PI + ((i + 0.5) / count - 0.5) * 2 * spread, side = Math.abs(az - Math.PI) > 1.15, len = (side ? short : length) * (1 - ((i * 7) % 5) * 0.04);
    const a = onHead(F, az, from, 0.012), mid = onHead(F, az, 0.02, 0.028), end: Vec3 = [mid[0] * 1.12, mid[1] - len, mid[2] * 1.12 - (side ? 0 : 0.03)];
    if (n < 2) stick(b, mid, end, r0, r1, c, 5); else (knots ? rope : chain)(b, [a, mid, end], r0, r1, c, 5);
    if (bead) b.ball(end[0], end[1] - r1, end[2], r1 * 1.5, r1 * 1.6, r1 * 1.5, bead, { seg: 5 });
  }
}
type HairDraw = (b: Drawing, c: Colour, look: Look, colours: Colours, F: FaceShape, n: number) => void;
const HAIR: Record<string, HairDraw> & { lowcut: HairDraw } = {
  bald() {},
  lowcut(b, c, _l, _c, F) { cap(b, F, c, 0.006); },
  fade(b, c, look, _c, F, n) {
    b.ball(0, F.ry * 0.2, -0.025, F.rx * 1.02, F.ry * 0.8, F.rz * 1.03, mix(c, look.skin, 0.62), { seg: 20, rx: -0.2 });
    b.ball(0, F.ry * 0.46, -0.03, F.rx * 0.94, F.ry * 0.62, F.rz * 1.0, c, { seg: 18, rx: -0.22 });
    if (n) b.cyl(0, F.ry * 0.86, -0.03, F.rx * 0.74, 0.07, c, { seg: 14, top: 0.88, sz: 1.1 });
  },
  classic(b, c, look, _c, F, n) {
    cap(b, F, c, 0.022);
    if (look.body === 'woman') {
      b.ball(0, -0.02, -0.045, F.rx * 1.3, F.ry * 1.0, F.rz * 1.08, c, { seg: 20 }); // a bob framing the face
      if (n) b.ball(-0.05, F.ry * 0.78, F.rz * 0.58, F.rx * 0.95, 0.06, F.rz * 0.5, c, { seg: 12, rz: 0.28, rx: 0.4 }); // side-swept fringe
    } else {
      b.ball(0, F.ry * 0.82, -0.01, F.rx * 1.02, 0.09, F.rz * 1.04, c, { seg: 16, rx: -0.12 });
      if (n) b.ball(0.02, F.ry * 0.83, F.rz * 0.5, F.rx * 0.8, 0.065, F.rz * 0.55, c, { seg: 12, rx: 0.2 }); // quiff
    }
  },
  afro(b, c, _l, _c, F, n) { if (n) cap(b, F, c, 0.01); b.ball(0, F.ry * 0.5, -0.085, F.rx * 1.78, F.ry * 1.28, F.rz * 1.32, c, { seg: 22 }); },
  curls(b, c, _l, _c, F, n) {
    cap(b, F, c, 0.008);
    for (const v of dome(n ? 22 : 5, 0.5)) { if (v[2] > 0.5 && v[1] < 0.45) continue; (n ? b.ball : b.ico)(v[0] * F.rx * 1.05, F.ry * 0.3 + v[1] * F.ry * 0.82, -0.035 + v[2] * F.rz * 1.0, 0.07, 0.07, 0.07, c, { seg: 8 }); }
  },
  bun(b, c, _l, _c, F, n) { cap(b, F, c, 0.01); b.ball(0, F.ry + 0.07, -0.09, 0.1, 0.095, 0.1, c, { seg: 14 }); if (n) b.cyl(0, F.ry + 0.0, -0.075, 0.07, 0.026, GOLD, { seg: 10, rx: -0.5 }); },
  ponytail(b, c, _l, _c, F, n) {
    cap(b, F, c, 0.01);
    if (!n) { stick(b, [0, F.ry * 0.6, -F.rz * 1.05], [0, -0.28, -F.rz * 1.6], 0.06, 0.03, c, 5); return; }
    b.cyl(0, F.ry * 0.62, -F.rz * 1.1, 0.05, 0.045, GOLD, { seg: 10, rx: 1.1 });
    rope(b, [[0, F.ry * 0.6, -F.rz * 1.05], [0, F.ry * 0.3, -F.rz * 1.6], [0, -0.12, -F.rz * 1.72], [0, -0.3, -F.rz * 1.6]], 0.065, 0.03, c, 8);
  },
  long(b, c, _l, _c, F, n) {
    cap(b, F, c, 0.022);
    b.ball(0, -0.2, -0.085, F.rx * 1.34, 0.34, F.rz * 0.72, c, { seg: n ? 18 : 12 });
    if (n) for (const side of [-1, 1]) b.ball(side * F.rx * 1.02, -0.07, -0.005, 0.05, 0.18, F.rz * 0.7, c, { seg: 10 });
  },
  braids(b, c, look, _c, F, n) {
    cap(b, F, c, 0.01);
    hang(b, n, F, c, n > 1 ? 11 : n ? 8 : 4, 2.0, look.body === 'woman' ? 0.62 : 0.42, 0.036, 0.026, { bead: null });
  },
  locs(b, c, _l, _c, F, n) {
    cap(b, F, c, 0.022);
    if (n) for (const v of dome(n > 1 ? 12 : 7, 0.3)) b.ball(v[0] * F.rx * 0.98, F.ry * 0.38 + v[1] * F.ry * 0.7, -0.03 + v[2] * F.rz * 0.98, 0.058, 0.05, 0.058, c, { seg: 8 });
    hang(b, n, F, c, n > 1 ? 9 : n ? 7 : 4, 1.95, 0.4, 0.046, 0.036, { short: 0.28, from: 0.55 });
  },
  cornrows(b, c, look, _c, F, n) {
    b.ball(0, F.ry * 0.3, -0.035, F.rx * 1.04, F.ry * 0.78, F.rz * 1.06, mix(c, look.skin, 0.3), { seg: 18, rx: -0.32 });
    for (const u of n ? [-0.75, -0.4, 0, 0.4, 0.75] : [-0.45, 0.45]) {
      const w = Math.sqrt(1 - u * u), pts: Vec3[] = [];
      for (let i = 0; i <= (n ? 4 : 2); i++) { const t = 0.15 + (Math.PI - 0.45) * i / (n ? 4 : 2); pts.push([u * F.rx * 1.06, F.ry * 0.3 + w * Math.sin(t) * F.ry * 0.82, -0.035 + w * Math.cos(t) * F.rz * 1.08]); }
      if (look.body === 'woman' && n) pts.push([pts[4]![0], pts[4]![1] - 0.2, pts[4]![2] - 0.05]);
      chain(b, pts, 0.026, 0.022, c, 5);
    }
  },
  twists(b, c, look, _c, F, n) {
    cap(b, F, c, 0.012);
    if (look.body === 'woman') hang(b, n, F, c, n > 1 ? 10 : n ? 7 : 4, 2.1, 0.36, 0.034, 0.026, { short: 0.26, knots: n === 2 });
    else for (const v of dome(n > 1 ? 20 : n ? 12 : 6, 0.5)) { if (v[2] > 0.5 && v[1] < 0.45) continue; (n ? b.ball : b.ico)(v[0] * F.rx * 1.12, F.ry * 0.3 + v[1] * F.ry * 0.88, -0.035 + v[2] * F.rz * 1.1, 0.05, 0.062, 0.05, c, { seg: 6 }); }
  },
  bantuknots(b, c, _l, _c, F, n) {
    cap(b, F, c, 0.008);
    for (const v of dome(n ? 8 : 6, 0.3)) { if (v[2] > 0.5 && v[1] < 0.75) continue; (n ? b.ball : b.ico)(v[0] * F.rx * 1.05, F.ry * 0.35 + v[1] * F.ry * 0.9, -0.035 + v[2] * F.rz * 1.05, 0.062, 0.06, 0.062, c, { seg: 8 }); }
  },
  gele(b, c, look, colours, F, n) {
    const main = colours[0], other = look.fabric === 'plain' ? shade(main, 0.22) : colours[1], deep = look.fabric === 'plain' ? shade(main, -0.18) : colours[2];
    if (n) b.ball(0, F.ry * 0.12, -0.04, F.rx * 1.02, F.ry * 0.78, F.rz * 1.04, c, { seg: 14 });
    // The wrap sits round the crown; the fan of pleated cloth stands up behind and above it.
    b.ball(0, F.ry * 0.78, -0.04, F.rx * 1.28, F.ry * 0.5, F.rz * 1.3, main, { seg: 18, rx: -0.12 });
    if (n) b.ball(0, F.ry * 0.98, -0.06, F.rx * 1.05, F.ry * 0.4, F.rz * 1.05, other, { seg: 16, rx: -0.12 });
    const fan: [number, number, number, number, Colour][] = [[0.26, 0.66, -0.12, -0.34, main], [0.25, 0.7, -0.06, -0.16, other], [0.22, 0.7, 0, -0.02, deep]];
    for (const [r, y, z, tilt, colour] of n ? fan : fan.slice(0, 1)) b.cyl(0, F.ry + y - 0.1, z, r, 0.035, colour, { seg: 20, sz: 0.55, rx: Math.PI / 2 + tilt });
  },
};
// Under a hat only hair that hangs below it is drawn in full; the rest is cut short.
const HANGING = new Set(['braids', 'locs', 'long', 'ponytail', 'bald', 'cornrows', 'fade', 'lowcut']);

/** Canonical wearable choices adapt the existing clothed figure, never remove its safe base. */
function fallbackLook(look: Look): Look {
  if (!look.wearables?.length) return look;
  const ids = resolveAvatarWearablesForRenderer(look), full = ids.find(id => AVATAR_WEARABLE_CATALOGUE[id].slot === 'full');
  const mapped = full === 'abaya' ? 'avatar-abaya' : full === 'buba-iro' ? 'avatar-buba-iro' : full === 'school-uniform' ? look.body === 'woman' ? 'avatar-school-skirt' : 'avatar-school' : full === 'work-uniform' ? 'avatar-work' : full ?? look.outfit;
  const accessories = ids.filter(id => id.startsWith('legacy-')).map(id => id.slice(7));
  if (ids.includes('wristwatch')) accessories.push('watch');
  return { ...look, outfit: mapped, outfitColor: full === 'school-uniform' ? CLOTH_WHITE : look.outfitColor, accessories };
}
const fallbackHead = (look: Look): string | undefined => look.wearables?.find(id => AVATAR_WEARABLE_CATALOGUE[id].slot === 'head');
const accessoryColour = (look: Look, colours: Colours): Colour => (look.fabric === 'plain' ? shade(look.outfitColor, -0.25) : colours[1]);
/** Head wearables are drawn in the old, larger head frame (centre 2.2): HEAD_FIT shrinks them about the head's centre. */
const HEAD_FIT = 0.74;
function drawFallbackHead(b: Drawing, id: string, look: Look, n: number): void {
  const fabric = accessoryColour(look, fabricColours(look)), seg = n ? 16 : 8;
  b.at(0, 2.2 * (1 - HEAD_FIT) + HEAD.y - 2.2, 0, 0, () => {
    if (id === 'hijab-drape' || id === 'hijab-wrap') {
      b.ball(0, 2.43, -0.025, 0.292, 0.163, 0.29, fabric, { seg });
      b.quad(0, 2.22, -0.285, 0.55, 0.48, fabric, { ry: Math.PI });
      for (const sign of [-1, 1]) b.quad(sign * 0.278, 2.2, -0.02, 0.44, 0.43, fabric, { ry: sign * Math.PI / 2 });
      b.ball(0, 1.98, -0.025, id === 'hijab-drape' ? 0.39 : 0.29, 0.115, 0.29, fabric, { seg });
      if (id === 'hijab-wrap') b.box(-0.18, 1.84, 0.19, 0.11, 0.35, 0.028, fabric);
    } else if (id === 'turban') {
      b.ball(0, 2.44, -0.03, 0.3, 0.19, 0.3, fabric, { seg });
      b.cyl(0, 2.39, -0.025, 0.3, 0.06, shade(fabric, -0.12), { seg, sz: 1.03, open: true });
      b.box(0, 2.47, 0.27, 0.08, 0.1, 0.033, fabric);
    } else if (id === 'gele-fan') {
      b.ball(0, 2.39, -0.04, 0.28, 0.15, 0.28, fabric, { seg });
      for (const sign of [-1, 0, 1]) b.quad(sign * 0.17, 2.7, -0.08, 0.3, 0.33, fabric, { rz: sign * -0.32 });
    } else {
      b.ball(0, 2.42, -0.035, 0.29, 0.16, 0.28, fabric, { seg });
      for (let i = 0; i < 3; i++) b.cyl(0.12, 2.62, 0.02 + i * 0.012, 0.13 - i * 0.033, 0.025, i % 2 ? shade(fabric, -0.12) : fabric, { seg, rx: Math.PI / 2, open: true });
    }
  }, 0, 0, HEAD_FIT);
}
function drawFallbackNeck(b: Drawing, look: Look): void {
  const id = look.wearables?.find(value => AVATAR_WEARABLE_CATALOGUE[value].slot === 'neck');
  if (!id) return;
  const cloth = accessoryColour(look, fabricColours(look)), neck = BODY[look.body].neck;
  if (id === 'neck-scarf' || id === 'shoulder-wrap') {
    b.cyl(0, 0.82, 0, neck + 0.05, 0.1, cloth, { seg: 12, open: true });
    if (id === 'neck-scarf') b.box(0.05, 0.6, 0.2, 0.11, 0.4, 0.025, cloth);
    else b.cyl(0, 0.54, -0.02, BODY[look.body].shoulder + 0.065, 0.37, cloth, { seg: 12, top: 0.7, sz: 0.85, open: true });
  } else {
    const beads = id === 'beads' || id === 'coral', tint = id === 'coral' ? CORAL : beads ? '#9c713b' : GOLD;
    b.cyl(0, 0.78, 0.02, neck + 0.06, id === 'chain-cuban' ? 0.03 : 0.018, tint, { seg: 14, sz: 1.2, rx: 0.5, open: true });
    if (id === 'chain-pendant') b.ball(0, 0.64, 0.2, 0.03, 0.04, 0.012, GOLD, { seg: 6 });
  }
}
function drawFallbackWrist(b: Drawing, look: Look, end: number): void {
  if (!look.wearables?.includes('bangles')) return;
  for (const y of [end + 0.02, end + 0.05]) b.cyl(0, y, 0, BODY[look.body].wrist + 0.012, 0.015, GOLD, { seg: 8, open: true });
}

/** A shoe on a foot whose ankle is at y = end; the ground is 0.08 below it and the toes point to +z. */
function shoeFor(b: Drawing, kind: string, end: number, skin: Colour, [upper, sole]: Shoe = SHOES[kind] || SHOES.sneaker, n = 2): void {
  const g = end - 0.08;
  if (!n) { b.ico(0, g + 0.05, 0.05, 0.06, 0.05, 0.14, kind === 'slide' ? skin : upper); return; }
  if (kind === 'slide') {
    b.ball(0, g + 0.045, 0.05, 0.052, 0.042, 0.125, skin, { seg: 10 });
    if (n > 1) b.ball(0, g + 0.03, 0.06, 0.062, 0.03, 0.15, sole, { seg: 10 });
    if (n > 1) b.ball(0, g + 0.065, 0.09, 0.054, 0.025, 0.05, upper, { seg: 8 });
  } else if (kind === 'boot') {
    b.ball(0, g + 0.06, 0.05, 0.068, 0.06, 0.145, upper, { seg: 12 });
    b.cyl(0, end + 0.05, -0.008, 0.064, 0.14, upper, { seg: 12, top: 1.04 });
    if (n > 1) b.ball(0, g + 0.02, 0.055, 0.07, 0.026, 0.158, sole, { seg: 10 });
  } else if (kind === 'heel') {
    b.ball(0, g + 0.075, 0.03, 0.046, 0.046, 0.115, skin, { seg: 10, rx: 0.32 });
    b.ball(0, g + 0.055, 0.105, 0.05, 0.036, 0.075, upper, { seg: 10, rx: 0.3 });
    if (n > 1) b.cyl(0, g + 0.03, -0.05, 0.016, 0.06, sole, { seg: 6, top: 0.7 });
  } else {
    b.ball(0, g + 0.052, 0.055, 0.06, 0.05, 0.138, upper, { seg: 12 });
    if (n > 1) b.ball(0, g + 0.02, 0.058, 0.066, 0.026, 0.148, sole, { seg: 12 });
  }
}
function drawFallbackShoe(b: Drawing, look: Look, end: number, n: number): boolean {
  const id = look.wearables?.find(value => AVATAR_WEARABLE_CATALOGUE[value].slot === 'shoes');
  if (!id) return false;
  if (id === 'sneakers') shoeFor(b, 'sneaker', end, look.skin, SHOES.sneaker, n);
  else shoeFor(b, 'slide', end, look.skin, ['#705539', '#705539'], n);
  return true;
}

function markerOf(b: Drawing, marker: Marker | null | undefined): void {
  if (marker === 'crown') {
    b.cyl(0, 3.1, 0, 0.13, 0.16, '#ffd34d', { seg: 6, top: 1.5, ...GLOW });
    b.cone(0, 2.92, 0, 0.1, 0.16, '#ffd34d', { seg: 4, rz: Math.PI, ...GLOW });
  } else if (marker === 'npc') {
    b.ico(0, 3.02, 0, 0.12, 0.12, 0.12, '#58d68a', GLOW);
  } else if (marker === 'player') {
    b.ico(0, 3.02, 0, 0.11, 0.14, 0.11, '#6fb4ff', GLOW);
  }
}

/** One segment of a limb: its rings, and extra detail drawn on it. */
interface Piece { length: number; rings: Ring[]; colour: Colour; extra?: (() => unknown) | null; joint?: Colour }
function limb(b: Drawing, n: number, name: string, x: number, y: number, z: number, pitch: number, roll: number, upper: Piece, bend: number, lower: Piece, end?: (end: number) => void): void {
  const piece = (p: Piece, lap = 0) => { loft(b, lap ? [...p.rings, [lap, p.rings[p.rings.length - 1]![1]]] : p.rings, p.colour, { seg: 16 }); p.extra?.(); };
  part(b, name, x, y, z, () => {
    piece(upper);
    part(b, name.replace('leg', 'calf').replace('arm', 'forearm'), 0, -upper.length, 0, () => {
      const r = upper.rings[0]![1] * 0.98; // fills a bent joint, and shows no seam on a straight one
      if (n > 1) b.ball(0, 0, 0, r, r, r, upper.joint ?? upper.colour, { seg: 10 });
      piece(lower, n === 1 ? 0.04 : 0); // a little overlap above the joint fills the bend where there is no joint ball
      end?.(-lower.length);
    }, bend);
  }, pitch, roll);
}
/** A relaxed mitten of a hand below the wrist at y = end, with a thumb. dir: +1 on the avatar's left. */
function hand(b: Drawing, m: Measures, end: number, dir: number, skin: Colour, n: number): void {
  const w = m.wrist * 1.25;
  (n ? b.ball : b.ico)(0, end - 0.062, 0.004, w * 0.95, 0.078, w * 0.8, skin, { seg: 10 });
  if (n > 1) b.ball(-dir * w * 0.2, end - 0.07, w * 0.78, 0.022, 0.04, 0.024, skin, { seg: 6, rx: 0.3 });
}

// ---- Accessories ---------------------------------------------------------------------------------
function headwear(b: Drawing, n: number, F: FaceShape, kind: string, cloth: Colour): void {
  const dark = shade(cloth, -0.22), t = F.ry;
  if (!n) {
    if (kind === 'fila') b.cyl(0, t * 0.62, -0.02, F.rx * 1.1, 0.2, cloth, { seg: 18, top: 1.03, rz: -0.05 });
    else b.ball(0, t * 0.32, -0.02, F.rx * 1.1, F.ry * 0.78, F.rz * 1.12, cloth, { seg: 16, rx: -0.15 });
    if (kind === 'cap') b.quad(0, t * 0.25, F.rz * 1.15, 0.2, 0.05, dark, { rx: -1.2 });
    return;
  }
  if (kind === 'cap') {
    b.ball(0, t * 0.34, -0.015, F.rx * 1.1, F.ry * 0.78, F.rz * 1.12, cloth, { seg: 18, rx: -0.1 });
    b.cyl(0, t * 0.25, F.rz * 0.98, 0.115, 0.014, dark, { seg: 16, sz: 1.25, rx: 0.16 });
  } else if (kind === 'headwrap') {
    b.ball(0, t * 0.3, -0.035, F.rx * 1.1, F.ry * 0.82, F.rz * 1.12, cloth, { seg: 18, rx: -0.24 });
    b.ball(0, -0.04, -F.rz * 1.05, 0.12, 0.1, 0.06, cloth, { seg: 10 });
    b.ball(0, 0.04, -F.rz * 1.2, 0.04, 0.035, 0.035, dark, { seg: 8 });
  } else if (kind === 'fila') {
    b.cyl(0, t * 0.6, -0.02, F.rx * 1.1, 0.19, cloth, { seg: 18, top: 1.03, rz: -0.05, rx: -0.06 });
    b.ball(0.02, t * 0.98, -0.02, F.rx * 1.12, 0.05, F.rx * 1.12, cloth, { seg: 16, rz: -0.14 });
    b.ball(0.12, t * 0.92, -0.02, 0.1, 0.07, 0.15, cloth, { seg: 10, rz: -0.5 });
  }
}
function eyewear(b: Drawing, n: number, F: FaceShape, kind: string): void {
  const y = 0.012, frame = kind === 'sunglasses' ? '#17181c' : INK;
  if (!n) { b.quad(0, y + (kind === 'sunglasses' ? 0 : 0.03), faceZ(F, 0, y) + 0.03, kind === 'sunglasses' ? 0.34 : 0.3, kind === 'sunglasses' ? 0.07 : 0.012, frame); return; }
  for (const side of [-1, 1]) {
    const x = side * F.rx * 0.43, z = faceZ(F, x, y) + 0.022, turn = side * 0.2;
    if (kind === 'sunglasses') b.ball(x, y, z, 0.056, 0.042, 0.008, '#101216', { seg: 10, ry: turn });
    else {
      b.box(x, y + 0.04, z, 0.1, 0.009, 0.008, frame, { ry: turn });
      b.box(x, y - 0.04, z, 0.1, 0.009, 0.008, frame, { ry: turn });
      for (const edge of [-1, 1]) b.box(x + edge * 0.05, y, z, 0.009, 0.08, 0.008, frame, { ry: turn });
    }
    b.cyl(side * F.rx * 0.98, y + 0.005, 0.0, 0.005, 0.09, frame, { seg: 4, rx: Math.PI / 2 });
  }
  b.box(0, y + 0.016, faceZ(F, 0, y) + 0.026, kind === 'sunglasses' ? 0.14 : 0.05, 0.009, 0.008, frame);
}

// ---- The model -----------------------------------------------------------------------------------

/** What drawFigure needs besides the look. */
interface Stance { joints: Joints; sitting: boolean; marker: Marker | null | undefined; sleeping?: boolean }
function drawFigure(b0: Drawing, look: Look, { joints, sitting, marker, sleeping }: Stance, L: Level): void {
  const b = coarse(b0, L.k), bh = coarse(b0, L.kh), n = L.n, per = L.per, SEG = 20;
  /** A limb's rings: its key rings, or only its two ends on the cheapest level. */
  const sm = (keys: Ring[]): Ring[] => n ? keys : [keys[0]!, keys[keys.length - 1]!];
  const style = OUTFIT[look.outfit] || OUTFIT.casual, m = BODY[look.body], woman = look.body === 'woman';
  const colours = fabricColours(look), top = look.outfitColor, bottoms = look.bottomsColor, skin = look.skin;
  const plain = look.fabric === 'plain', has = (id: string) => look.accessories.includes(id), F = FACES[look.face] || FACES.oval;
  const skirt = woman && look.outfit === 'office' || style.legs === 'skirt', legs = skirt ? 'skirt' : style.legs;
  const shoe = skirt ? 'heel' : style.shoe, shoeColours = skirt ? SHOES.dress : SHOES[shoe];
  const bulk = style.bulk || 0, aspect = m.aspect, trim = shade(top, -0.2);
  const wrapper: Colours = plain ? [bottoms, bottoms, shade(bottoms, -0.15)] : colours;
  const long = (legs === 'wrapper' || legs === 'dress') && !sitting;
  const dyed = style.vest && !n ? '#f47f1b' : n || plain ? top : weave(look, colours);
  const cloth = (rings: Ring[], o: PrintOptions) => { if (n && !plain) print(b, look, colours, rings, { ...o, size: 1.12, around: Math.max(5, (o.around ?? 8) - 1) }); };
  const body = smooth(torsoKeys(m), per);
  const start = b.triangles;
  let reserve = 330;
  const room = (cost: number) => n > 0 || b.triangles - start + cost + reserve <= LOW_BUDGET;

  const stripe: typeof strip = (...args) => { if (n) strip(...args); }, bandy: typeof band = (...args) => { if (n) band(...args); };
  /** Fewer key rings on the cheapest level. */
  const lite = (keys: Ring[]): Ring[] => n ? keys : keys.length > 3 ? [keys[0]!, keys[Math.floor(keys.length / 2)]!, keys[keys.length - 1]!] : keys;
  // Legs and shoes
  if (!long) {
    const trousers = legs === 'trousers', pad = trousers ? 0.012 : 0, bare = legs === 'shorts' || legs === 'skirt';
    const thigh = sm([[-0.5, m.knee + pad], [-0.25, (m.leg + m.knee) / 2 + 0.008 + pad], [0, m.leg + pad]]);
    const shin = sm([[-0.46, m.ankle + pad * 2], [-0.16, m.calf + pad], [0, m.knee + pad]]);
    for (const side of [0, 1] as const) {
      const dir = side ? 1 : -1;
      limb(b, n, side ? 'legL' : 'legR', dir * m.legX, 1.04, 0, joints.leg[side], 0,
        { length: 0.5, rings: thigh, colour: trousers ? bottoms : skin, extra: legs === 'shorts' ? () => {
          cover(b, thigh, -0.38, 0, 0.026, bottoms, 14);
          b.cyl(0, -0.37, 0, radiusAt(thigh, -0.37) + 0.028, 0.025, shade(bottoms, -0.18), { seg: 14, open: true });
        } : null },
        joints.calf[side],
        { length: 0.46, rings: shin, colour: bare ? (style.socks ? CLOTH_WHITE : skin) : bottoms, extra: trousers && n ? () => b.cyl(0, -0.45, 0, m.ankle + 0.03, 0.02, shade(bottoms, -0.2), { seg: 14, open: true }) : style.socks && n ? () => b.cyl(0, -0.2, 0, radiusAt(shin, -0.2) + 0.012, 0.02, top, { seg: 14, open: true }) : null },
        (end) => { if (!drawFallbackShoe(b, look, end, n)) shoeFor(b, shoe, end, skin, shoeColours, n); });
    }
  } else {
    for (const side of [-1, 1]) part(b, side > 0 ? 'legL' : 'legR', side * m.legX, 1.04, 0, () => { if (!drawFallbackShoe(b, look, -0.96, n)) shoeFor(b, shoe, -0.96, skin, shoeColours, n); });
  }
  // The garment below the waist
  if (legs === 'wrapper') {
    if (sitting) b.box(0, 1.02, 0.24, 0.56, 0.3, 0.8, wrapper[0]);
    else {
      const rings = smooth(lite([[0.08, 0.31], [0.45, 0.28], [0.9, m.hip + 0.014], [1.04, m.hip * 0.94]]), per);
      loft(b, rings, n || plain ? wrapper[0] : weave(look, colours), { seg: SEG, aspect: 0.76 });
      bandy(b, rings, 0.115, 0.05, plain ? shade(bottoms, -0.2) : colours[2], { seg: SEG, aspect: 0.76 });
      cloth(rings, { aspect: 0.76, from: 0.16, to: 0.98, around: 9, seg: SEG });
      if (n) stripe(b, rings, 0.1, 1.0, 0.5, 0.035, plain ? shade(bottoms, 0.2) : colours[1], { aspect: 0.76, lift: 0.012, thick: 0.02 });
    }
  } else if (legs === 'dress') {
    if (sitting) b.box(0, 1.02, 0.24, 0.56, 0.3, 0.8, top);
    else {
      const rings = smooth(lite([[0.08, 0.45], [0.5, 0.37], [0.92, m.hip + 0.045], [1.13, m.hip * 0.99], [1.3, m.waist + 0.03]]), per);
      loft(b, rings, dyed, { seg: SEG, aspect: 0.84 });
      bandy(b, rings, 0.12, 0.06, bottoms, { seg: SEG, aspect: 0.84 });
      cloth(rings, { aspect: 0.84, from: 0.2, to: 1.2, around: 10, seg: SEG });
    }
  } else if (legs === 'skirt') {
    if (sitting) b.box(0, 1.03, 0.2, 0.52, 0.28, 0.7, bottoms);
    else {
      const rings = smooth([[0.6, m.hip + 0.01], [0.88, m.hip + 0.03], [0.99, m.hip - 0.004]], per);
      loft(b, rings, bottoms, { seg: SEG, aspect: 0.82 });
      bandy(b, rings, 0.62, 0.03, shade(bottoms, -0.2), { seg: SEG, aspect: 0.82 });
    }
  }
  // Hips and seat
  const seat = legs === 'wrapper' ? wrapper[0] : legs === 'dress' ? top : bottoms;
  b.at(0, HIP_Y, 0, 0, () => {
    loft(b, padded(n ? clip(body, -0.14, 0.02) : [[-0.14, radiusAt(body, -0.14)], [0.02, radiusAt(body, 0.02)]], 0.004), seat, { seg: SEG, aspect, capped: n > 0 });
  });

  b.at(0, HIP_Y, 0, 0, () => {
    const hem = sitting ? Math.max(style.hem, -0.14) : style.tunic ? (woman ? -0.7 : -0.5) : style.hem;
    let keys = torsoKeys(m);
    keys[0] = [-0.16, m.hip + 0.006]; // a top hangs straight from the hips
    if (hem < -0.14) keys = [[hem, m.hip + (woman ? 0.085 : 0.03)], [(hem - 0.16) / 2, m.hip + (woman ? 0.05 : 0.022)], ...keys.slice(1)];
    const wear = padded(smooth(keys, per), 0.016 + bulk), depthAt = (y: number) => radiusAt(wear, y) * aspect;
    const front = (y: number, a = 0, lift = 0.008) => onLoft(wear, aspect, y, a, lift);
    // Skin under the neckline, then the garment over it
    if (n) loft(b, clip(body, 0.72, 0.85), skin, { seg: SEG, aspect });
    b.cyl(0, 0.92, 0, m.neck + (n ? 0 : 0.03), 0.2, skin, { seg: 16, top: 0.94 });
    const neckline = style.open ? 0.7 : style.dress ? 0.68 : 0.77;
    const garment = n ? clip(wear, hem, neckline) : [hem, 0.22, 0.55, neckline].map((y): Ring => [y, radiusAt(wear, y)]);
    loft(b, garment, dyed, { seg: SEG, aspect });
    if (n) bandy(b, wear, hem + 0.02, 0.04, style.gown && !plain ? colours[2] : trim, { seg: SEG, aspect });
    cloth(garment, { aspect, from: hem + 0.06, to: style.vest ? 0.1 : style.robe ? hem + 0.05 : 0.68, around: 8, seg: SEG });

    if (style.open) {
      // An unbuttoned camp shirt over a vest: the opening runs down the front between two plackets.
      stripe(b, wear, hem + 0.03, 0.7, 0, 0.13, CLOTH_WHITE, { aspect, lift: 0.004 });
      for (const side of [-1, 1]) {
        stripe(b, wear, hem + 0.03, 0.7, side * 0.3, 0.028, trim, { aspect, lift: 0.008, thick: 0.014 });
        if (n) b.ball(side * 0.1, 0.74, depthAt(0.74) * 0.9, 0.07, 0.03, 0.05, top, { seg: 8, rz: side * 0.5, ry: side * 0.3 }); // camp collar
      }
    } else if (style.collar) {
      // A blazer or a school shirt: a white V of shirt between two lapels, a tie or a pendant.
      const tie = colours[2] === top ? shade(top, -0.5) : colours[1], lapel = shade(top, -0.16);
      stripe(b, wear, 0.43, 0.77, 0, 0.2, CLOTH_WHITE, { aspect, lift: 0.004 });
      if (!woman) stripe(b, wear, 0.44, 0.74, 0, 0.05, tie, { aspect, lift: 0.01 });
      if (!n) b.quad(0, 0.62, depthAt(0.62) + 0.01, 0.12, 0.3, CLOTH_WHITE);
      else for (const side of [-1, 1]) {
        const tilt = Math.atan2((radiusAt(wear, 0.77) - radiusAt(wear, 0.4)) * aspect, 0.37);
        b.box(side * 0.09, 0.58, depthAt(0.58) + 0.012, 0.115, 0.4, 0.016, lapel, { rz: side * -0.38, rx: tilt });
        b.ball(side * 0.08, 0.79, depthAt(0.79) * 0.78, 0.065, 0.03, 0.04, CLOTH_WHITE, { seg: 8, rz: side * -0.5, ry: side * 0.5 });
      }
      if (n) for (const y of [0.27, 0.14]) { const p = front(y, 0, 0.01); b.cyl(0, y, p.z, 0.02, 0.01, shade(top, -0.5), { seg: 8, rx: Math.PI / 2 }); }
    } else if (style.hood) {
      bandy(b, wear, hem + 0.045, 0.09, trim, { seg: SEG, aspect, lift: 0.008 }); // ribbed hem
      b.ball(0, 0.8, -0.13, 0.2, 0.15, 0.13, top, { seg: 14, rx: 0.5 }); // the hood, resting behind the neck
      b.cyl(0, 0.81, -0.01, m.neck + 0.07, 0.1, top, { seg: 16, top: 1.2, sz: 1.05, open: true });
      const pouch = front(0.14, 0, 0.012);
      b.box(0, 0.15, pouch.z, 0.34, 0.19, 0.03, shade(top, -0.1));
      if (n) for (const side of [-1, 1]) { const cord = front(0.6, side * 0.22, 0.012); b.cyl(cord.x, 0.58, cord.z, 0.01, 0.2, CLOTH_WHITE, { seg: 5 }); }
    } else if (style.gown) {
      // Buba: a gold round neckline, a coral necklace and an ipele over the shoulder.
      bandy(b, wear, neckline - 0.02, 0.04, GOLD, { seg: SEG, aspect, lift: 0.006 });
      if (n) b.cyl(0, 0.8, 0.012, m.neck + 0.055, 0.03, CORAL, { seg: 16, sz: 1.08, rx: 0.12, open: true }); // coral necklace
      const sash = plain ? shade(top, 0.3) : colours[1];
      for (const face of [0.62, Math.PI - 0.62]) stripe(b, wear, 0.2, 0.7, face, 0.12, sash, { aspect, lift: 0.012, thick: 0.022 });
    } else if (style.sport) {
      // Jersey: contrast side panels, a V-neck and a number.
      const second = bottoms === top ? CLOTH_WHITE : bottoms;
      for (const side of [-1, 1]) stripe(b, wear, hem + 0.04, 0.5, side * Math.PI / 2, 0.11, second, { aspect, lift: 0.004 });
      bandy(b, wear, neckline - 0.012, 0.03, second, { seg: SEG, aspect, lift: 0.006 });
      b.quad(0, 0.705, depthAt(0.705) + 0.008, 0.11, 0.11, second, { rz: Math.PI / 4, rx: -0.25 });
      b.quad(0, 0.725, depthAt(0.725) + 0.011, 0.07, 0.07, skin, { rz: Math.PI / 4, rx: -0.25 });
      if (n) for (const y of [0.5, 0.42]) b.quad(0, y, depthAt(y) + 0.008, y > 0.45 ? 0.05 : 0.14, 0.05, CLOTH_WHITE);
    } else if (style.tunic) {
      // Kaftan: a stand collar, a buttoned placket with embroidery, and slits at the sides.
      b.cyl(0, 0.8, 0, m.neck + 0.025, 0.06, shade(top, -0.12), { seg: 16, top: 0.94, open: true });
      stripe(b, wear, 0.3, 0.76, 0, 0.055, shade(top, -0.14), { aspect, lift: 0.006 });
      for (const side of [-1, 1]) stripe(b, wear, 0.26, 0.74, side * 0.17, 0.012, GOLD, { aspect, lift: 0.008 });
      bandy(b, wear, 0.27, 0.014, GOLD, { seg: SEG, aspect, lift: 0.004 });
    } else if (style.dress) {
      // Gown: a scooped neckline and a sash at the waist with a bow.
      bandy(b, wear, neckline - 0.014, 0.028, bottoms, { seg: SEG, aspect, lift: 0.006 });
      bandy(b, wear, 0.25, 0.07, bottoms, { seg: SEG, aspect, lift: 0.01 });
      const knot = onLoft(wear, aspect, 0.25, 0.6, 0.02);
      if (n) b.ball(knot.x, 0.25, knot.z, 0.035, 0.035, 0.025, shade(bottoms, -0.15), { seg: 8 });
      if (n) for (const tail of [-0.3, 0.25]) b.box(knot.x + tail * 0.12, 0.17, knot.z + 0.008, 0.045, 0.16, 0.012, bottoms, { rz: tail, ry: knot.ry });
    } else if (!style.robe) {
      // A crew-neck tee: a ribbed collar and a chest pocket.
      bandy(b, wear, neckline - 0.014, 0.03, trim, { seg: SEG, aspect, lift: 0.006 });
      if (!style.vest && n) { const p = front(0.5, 0.66, 0.008); b.box(p.x, 0.5, p.z, 0.095, 0.1, 0.008, shade(top, -0.12), { ry: p.ry }); }
    }
    if (style.robe) {
      // Agbada: a wide open robe over the tunic, embroidered at the chest.
      const robe = smooth(lite([[sitting ? -0.14 : -0.64, 0.41], [-0.2, 0.42], [0.3, 0.375], [0.6, 0.34], [0.72, 0.29], [0.78, 0.2]]), per), ra = 0.5;
      b.cyl(0, 0.8, 0, m.neck + 0.025, 0.05, shade(top, -0.12), { seg: 16, top: 0.94, open: true });
      loft(b, robe, dyed, { seg: SEG, aspect: ra });
      bandy(b, robe, robe[0]![0] + 0.025, 0.05, trim, { seg: SEG, aspect: ra });
      cloth(robe, { aspect: ra, from: robe[0]![0] + 0.08, to: 0.2, around: 10, seg: SEG });
      const emb = plain ? GOLD : colours[1];
      stripe(b, robe, 0.22, 0.76, 0, 0.25, emb, { aspect: ra, lift: 0.006 });
      stripe(b, robe, 0.27, 0.76, 0, 0.17, shade(top, -0.1), { aspect: ra, lift: 0.009 });
      if (n) for (const side of [-1, 1]) b.ball(side * (m.shoulder + 0.06), 0.68, 0, 0.15, 0.06, 0.18, top, { seg: 12, rz: side * -0.42 }); // folds on the shoulders
    }
    if (style.vest) {
      // Hi-vis vest: reflective bands round the body and over both shoulders.
      const vest = padded(wear, 0.024), reflect = '#eef0b4';
      if (n) loft(b, clip(vest, 0.04, 0.72), '#f47f1b', { seg: SEG, aspect }); else band(b, wear, 0.3, 0.06, reflect, { seg: SEG, aspect, lift: 0.006 });
      for (const y of [0.16, 0.38]) bandy(b, vest, y, 0.06, reflect, { seg: SEG, aspect });
      for (const side of [-1, 1]) for (const face of [0, Math.PI]) stripe(b, vest, 0.41, 0.7, face + side * 0.5, 0.055, reflect, { aspect });
    }
    // Things worn on the body
    drawFallbackNeck(b, look);
    if (has('chain') && room(n ? 0 : 20)) { if (n) b.cyl(0, 0.78, 0.02, m.neck + 0.05, 0.02, GOLD, { seg: 12, sz: 1.15, rx: 0.5, open: true }); else b.quad(0, 0.72, depthAt(0.72) + 0.012, 0.12, 0.05, GOLD); }
    if (has('backpack') && room(40)) {
      const pack = '#3b4658', back = depthAt(0.42);
      (n ? b.ball : b.ico)(0, 0.4, -(back + 0.08), 0.19, 0.26, 0.115, pack, { seg: 14 });
      if (n) { b.ball(0, 0.27, -(back + 0.16), 0.135, 0.11, 0.05, shade(pack, 0.25), { seg: 10 }); for (const side of [-1, 1]) stripe(b, wear, 0.16, 0.74, side * 0.48, 0.05, shade(pack, -0.2), { aspect, lift: 0.01, thick: 0.016 }); }
    }
    if (has('handbag') && room(20)) { const p = onLoft(wear, aspect, -0.03, 2.25, 0.07); (n ? b.ball : b.ico)(p.x, -0.05, p.z, 0.13, 0.1, 0.05, '#b5763a', { seg: 8, ry: p.ry }); }

    // Arms and hands
    const sp = 0.014 + bulk * 0.35;
    const upperArm = sm([[-0.42, m.elbow], [-0.2, (m.arm + m.elbow) / 2 + 0.005], [0, m.arm]]);
    const foreArm = sm([[-0.38, m.wrist], [-0.14, m.elbow * 1.02], [0, m.elbow]]);
    for (const side of [0, 1] as const) {
      const dir = side ? 1 : -1, [pitch, roll] = joints.arm[side];
      const sleeve = style.sleeve, wide = sleeve === 'wide', covered = sleeve === 'long';
      const sleeveColour = wide && !plain ? colours[1] : top;
      const worn = () => {
        if (side) drawFallbackWrist(b, look, -0.38);
        if (side && has('watch') && room(n ? 0 : 30)) b.cyl(0, -0.325, 0, radiusAt(foreArm, -0.325) + (covered ? sp : 0) + 0.008, 0.032, '#23262d', { seg: 12 });
        if (!side && has('beads') && room(n ? 0 : 30)) b.cyl(0, -0.335, 0, radiusAt(foreArm, -0.335) + (covered ? sp : 0) + 0.01, 0.03, CORAL, { seg: 12 });
      };
      const upper: Piece = covered
        ? { length: 0.42, rings: padded(upperArm, sp), colour: top, extra: () => { if (n > 1) b.ball(0, 0, 0, m.arm + sp, m.arm + sp, m.arm + sp, top, { seg: 12 }); } }
        : { length: 0.42, rings: upperArm, colour: skin, extra: () => {
          if (n > 1 && !(sleeve === 'cap')) b.ball(0, 0, 0, m.arm + (wide ? 0.02 : sp), m.arm + (wide ? 0.02 : sp), m.arm + (wide ? 0.02 : sp), sleeveColour, { seg: 12 });
          if (wide) {
            const bell = sm([[-0.42, m.arm + 0.1], [-0.2, m.arm + 0.056], [0, m.arm + 0.02]]);
            loft(b, bell, sleeveColour, { seg: 16 });
            if (n) b.cyl(0, -0.405, 0, m.arm + 0.104, 0.04, plain ? GOLD : colours[2], { seg: 16, open: true });
          } else if (sleeve === 'cap') {
            b.ball(0, -0.03, 0, m.arm + 0.03, 0.08, m.arm + 0.03, top, { seg: 14 });
          } else {
            cover(b, upperArm, -0.2, 0, sp, top, 14);
            if (n) b.cyl(0, -0.195, 0, radiusAt(upperArm, -0.195) + sp + 0.004, 0.028, style.sport && bottoms !== top ? bottoms : trim, { seg: 14, open: true });
          }
        } };
      const lower: Piece = covered
        ? { length: 0.38, rings: padded(foreArm, sp), colour: top, extra: () => { b.cyl(0, -0.352, 0, m.wrist + sp + 0.005, 0.05, style.collar ? CLOTH_WHITE : style.tunic || style.robe ? GOLD : trim, { seg: 14, open: true }); worn(); } }
        : { length: 0.38, rings: foreArm, colour: skin, extra: () => { if (style.vest) b.cyl(0, -0.3, 0, radiusAt(foreArm, -0.3) + 0.005, 0.035, INK, { seg: 14, open: true }); worn(); } };
      upper.joint = covered ? top : skin;
      limb(b, n, side ? 'armL' : 'armR', dir * (m.shoulder - 0.02 + bulk), SHOULDER_Y, 0, pitch, dir * (style.robe ? Math.max(roll, 0.3) : roll), upper, joints.fore[side], lower, (end) => hand(b, m, end, dir, skin, n));
    }

    part(b, 'head', 0, 0.86, 0, () => b.at(0, -HIP_Y - 0.86, 0, 0, () => {
      reserve = (marker ? (marker === 'crown' ? 32 : 20) : 0) + (style.helmet ? 90 : 0);
      bh.at(0, HEAD.y, 0, 0, () => {
        headShape(bh, look, F, n, sleeping === true);
        const hat = style.helmet || look.hair === 'gele' ? null : look.accessories.find((id) => ACCESSORY_SLOTS[id] === 'head');
        const hair = (style.helmet || hat) && !HANGING.has(look.hair) ? 'lowcut' : look.hair;
            if (!fallbackHead(look) && !(!n && (style.helmet || (hat && ['cornrows', 'fade', 'lowcut', 'bald'].includes(look.hair))))) (HAIR[hair] || HAIR.lowcut)(bh, look.hairColor, look, colours, F, n);
        if (hat && room(n ? 0 : 90)) headwear(b, n, F, hat, accessoryColour(look, colours));
        if (has('sunglasses') && room(10)) eyewear(b, n, F, 'sunglasses');
        else if (has('glasses') && room(10)) eyewear(b, n, F, 'glasses');
        if (has('earrings') && room(44)) for (const side of [-1, 1]) (n ? b.ball : b.ico)(side * (F.rx + 0.012), -0.04, 0, 0.018, 0.026, 0.018, GOLD, { seg: 6 });
        if (style.helmet) {
          const hard = '#f2c230';
          b.ball(0, F.ry * 0.32, -0.01, F.rx * 1.12, F.ry * 0.82, F.rz * 1.14, hard, { seg: 16 });
          b.cyl(0, F.ry * 0.2, F.rz * 0.2, F.rx * 1.2, 0.025, hard, { seg: 16, sz: 1.2 });
        }
      });
      const selectedHead = fallbackHead(look);
      if (selectedHead) drawFallbackHead(b, selectedHead, look, n);
      markerOf(b, marker);
    }));
  }, joints.lean);
}

/**
 * Draw one avatar into a batch.
 * options: { x, y, z, ry, pose (one of POSES), stride (the phase of 'walk' or 'jog', 0 … 1), seat
 * (seat height when sitting), seed, scale, marker ('crown' = you, 'npc' = green dot, 'player' =
 * blue dot), detail ('low' — the default — | 'medium' | 'high'; see the top of this file) }
 * Returns { look, top } where top is the height just above the head, for a name tag.
 */
export function drawAvatar(b: Drawing, input?: unknown, { x = 0, y = 0, z = 0, ry = 0, pose = 'stand', stride, seat = 0.6, seed, scale = 1, appearanceFit = true, sleeping = false, marker = null, detail = 'low' }: DrawOptions = {}): DrawnAvatar {
  const look = normalizeLook(input, seed), rendered = fallbackLook(look), proportions = avatarProportions(look.appearance);
  if (appearanceFit) scale *= proportions.height;
  // A rig is drawn upright and still: its pose is set afterwards by turning its parts (poseAvatar).
  const posed = jointsOf(pose, stride), joints = b.part ? { ...posed, lean: 0, bob: 0 } : posed, sitting = pose === 'sit';
  const lift = (sitting ? seat + 0.13 - 1.05 : 0) + (joints.bob || 0);
  b.at(x, y + lift * scale, z, ry, () => {
    drawFigure(b, rendered, { joints, sitting, marker, sleeping }, LEVELS[detail] || LEVELS.low);
  }, 0, 0, scale);
  return { look, top: y + (lift + 2.95) * scale };
}

/** A batch that draws each named part (see part()) into a batch of its own, in that part's own coordinates. */
type Forwarded = 'box' | 'cyl' | 'cone' | 'ball' | 'ico' | 'quad' | 'disc' | 'at' | 'light';
interface RigBatch extends Drawing {
  root: Batch;
  parts: Map<string, Batch>;
  pivots: Map<string, { x: number; y: number; z: number }>;
}
function rigBatch(THREE: ThreeModule): RigBatch {
  const root = createBatch(THREE), parts = new Map<string, Batch>(), pivots = new Map<string, { x: number; y: number; z: number }>();
  let current = root;
  const forward = (name: Forwarded) => (...args: unknown[]): RigBatch => { (current[name] as (...args: unknown[]) => unknown)(...args); return rig; };
  const forwards: Record<Forwarded, (...args: unknown[]) => RigBatch> = { box: forward('box'), cyl: forward('cyl'), cone: forward('cone'), ball: forward('ball'), ico: forward('ico'), quad: forward('quad'), disc: forward('disc'), at: forward('at'), light: forward('light') };
  const rig: RigBatch = {
    ...forwards, isBatch: true, root, parts, pivots,
    part(name: string, x: number, y: number, z: number, fn: (b: Drawing) => void) {
      pivots.set(name, current.world(x, y, z));
      if (!parts.has(name)) parts.set(name, createBatch(THREE));
      const previous = current;
      current = parts.get(name)!;
      try { fn(rig); } finally { current = previous; }
    },
    world: (x: number, y: number, z: number) => current.world(x, y, z),
    get triangles() { return [root, ...parts.values()].reduce((sum, batch) => sum + batch.triangles, 0); },
  };
  return rig;
}

/**
 * Pose a rigged avatar by turning its parts — no geometry is rebuilt, so this is what a scene
 * calls while its player walks. options: { pose (default 'stand'), stride (0 … 1 for 'walk' and
 * 'jog') }. Shoulders, hips, elbows and knees turn, the torso leans and the whole body bobs.
 * Returns the avatar.
 */
export function poseAvatar<T extends { userData?: unknown } | null | undefined>(avatar: T, { pose = 'stand', stride }: { pose?: Pose; stride?: number } = {}): T {
  const data = avatar?.userData as { parts?: AvatarParts; bends?: Bend[] } | null | undefined;
  const parts = data?.parts;
  if (!parts) return avatar;
  const joints = jointsOf(pose, stride);
  parts.torso.rotation.x = joints.lean || 0;
  parts.body.position.y = joints.bob || 0;
  parts.legR.rotation.x = joints.leg[0]; parts.legL.rotation.x = joints.leg[1];
  parts.armR.rotation.set(joints.arm[0][0], 0, -joints.arm[0][1]); parts.armL.rotation.set(joints.arm[1][0], 0, joints.arm[1][1]);
  for (const bend of data?.bends ?? []) {
    const angle = joints[bend.kind][bend.side];
    if (angle === bend.angle) continue;
    const c = Math.cos(angle), s = Math.sin(angle), position = bend.geometry.getAttribute('position'), normal = bend.geometry.getAttribute('normal');
    for (let i = 0; i < bend.position.length; i += 3) {
      const y = bend.position[i + 1]! - bend.pivotY, z = bend.position[i + 2]!, ny = bend.normal[i + 1]!, nz = bend.normal[i + 2]!;
      const vertex = bend.start + i / 3;
      position.setXYZ(vertex, bend.position[i]!, bend.pivotY + y * c - z * s, y * s + z * c);
      normal.setXYZ(vertex, bend.normal[i]!, ny * c - nz * s, ny * s + nz * c);
    }
    position.needsUpdate = true; normal.needsUpdate = true; bend.angle = angle;
    bend.geometry.boundingBox = null; bend.geometry.boundingSphere = null;
  }
  return avatar;
}

/**
 * One avatar as its own THREE.Group. Call group.userData.dispose() (or dispose the kit) to free it.
 * userData: { look, top, triangles, dispose }.
 *
 * With `rig: true` the avatar is built as movable parts instead of one mesh, so a scene can animate
 * it by rotating transforms only: userData.parts = { body, torso, head, armL, armR, legL, legR },
 * each a THREE.Group whose origin is its pivot (hips, neck, shoulders, hip joints; rotation order
 * 'YXZ'). `body` holds everything and is what bobs; head and arms are children of `torso`, so they
 * follow its lean. Calves and forearms bend within their limb's mesh using cached rest vertices.
 * Use poseAvatar(avatar, { pose, stride }) to pose it. A rig costs one draw call
 * per part (six, plus one for a marker) instead of one or two.
 */
export function buildAvatar(kit: Kit, look: unknown, options: AvatarOptions & { rig: true }): RiggedAvatar;
export function buildAvatar(kit: Kit, look?: unknown, options?: AvatarOptions): AvatarGroup;
export function buildAvatar(kit: Kit, look?: unknown, options: AvatarOptions = {}): AvatarGroup {
  const { THREE } = kit;
  const { x = 0, y = 0, z = 0, ry = 0, rig = false, ...rest } = options;
  const group = new THREE.Group() as AvatarGroup;
  group.position.set(x, y, z);
  group.rotation.y = ry;
  const registry = kitResources(kit).disposers, meshes: THREE.Mesh[] = [];
  const dispose = () => { registry.delete(dispose); releaseObjects(meshes); group.parent?.remove(group); if (group.userData.parts) group.clear(); };
  if (!rig) {
    const batch = createBatch(THREE);
    const drawn = drawAvatar(batch, look, { ...rest, appearanceFit: false });
    const proportions = avatarProportions(drawn.look.appearance);
    group.scale.set(proportions.height * proportions.width, proportions.height, proportions.height * proportions.depth);
    if (rest.pose === 'sit') group.position.y += (rest.seat ?? 0.6) * (rest.scale ?? 1) * (1 - proportions.height);
    const built = batch.build(sceneMaterials(kit));
    built.meshes.forEach((mesh) => { meshes.push(mesh); group.add(mesh); });
    registry.add(dispose);
    group.userData = { look: drawn.look, top: drawn.top * proportions.height, triangles: built.triangles, dispose };
    return group;
  }
  const { scale = 1, pose = 'stand', stride, ...still } = rest;
  const batch = rigBatch(THREE);
  // Every joint is drawn neutral and posed by its transforms.
  const drawn = drawAvatar(batch, look, { ...still, appearanceFit: false, pose: pose === 'sit' ? 'stand' : pose, stride });
  const materials = sceneMaterials(kit);
  const holder = (name: string, parent: THREE.Object3D, pivot: { x: number; y: number; z: number }, origin: { x: number; y: number; z: number }) => {
    const node = new THREE.Group();
    node.name = name; node.rotation.order = 'YXZ';
    node.position.set(pivot.x - origin.x, pivot.y - origin.y, pivot.z - origin.z);
    parent.add(node);
    return node;
  };
  const fill = (node: THREE.Object3D, source: Batch | undefined, offset: { x: number; y: number; z: number }) => source?.build(materials).meshes.forEach((mesh: THREE.Mesh) => { mesh.position.set(-offset.x, -offset.y, -offset.z); meshes.push(mesh); node.add(mesh); });
  const zero = { x: 0, y: 0, z: 0 }, hips = { x: 0, y: HIP_Y, z: 0 };
  const body = holder('body', group, zero, zero);
  const parts = { body, torso: holder('torso', body, hips, zero) } as AvatarParts; // the other five are set in the loop below
  const bends: Bend[] = [];
  fill(parts.torso, batch.root, hips);
  for (const name of ['head', 'armL', 'armR', 'legL', 'legR'] as const) {
    const pivot = batch.pivots.get(name) ?? hips, upper = name === 'legL' || name === 'legR' ? body : parts.torso;
    parts[name] = holder(name, upper, pivot, upper === body ? zero : hips);
    if (name === 'head') { fill(parts[name], batch.parts.get(name), zero); continue; }
    const lowerName = name.replace('leg', 'calf').replace('arm', 'forearm'), lower = batch.parts.get(lowerName), joint = batch.pivots.get(lowerName);
    if (!lower || !joint) { fill(parts[name], batch.parts.get(name), zero); continue; }
    const upperMeshes = batch.parts.get(name)!.build(materials).meshes;
    for (const mesh of lower.build(materials).meshes) {
      mesh.geometry.translate(joint.x, joint.y, joint.z);
      const upper = upperMeshes.find((candidate) => candidate.material === mesh.material);
      const position = mesh.geometry.getAttribute('position'), normal = mesh.geometry.getAttribute('normal');
      const restPosition = Float32Array.from(position.array), restNormal = Float32Array.from(normal.array);
      const start = upper?.geometry.getAttribute('position').count ?? 0;
      let geometry = mesh.geometry;
      if (upper) {
        const merged = mergeGeometries([upper.geometry, geometry]);
        if (!merged) throw new Error('avatar limb attributes cannot merge');
        upper.geometry.dispose(); geometry.dispose(); upper.geometry = merged; geometry = merged;
      } else upperMeshes.push(mesh);
      bends.push({ geometry, start, position: restPosition, normal: restNormal, pivotY: joint.y, angle: NaN, kind: name.startsWith('leg') ? 'calf' : 'fore', side: name.endsWith('R') ? 0 : 1 });
    }
    for (const mesh of upperMeshes) { mesh.frustumCulled = false; meshes.push(mesh); parts[name].add(mesh); }
  }
  const proportions = avatarProportions(drawn.look.appearance);
  group.scale.set(scale * proportions.height * proportions.width, scale * proportions.height, scale * proportions.height * proportions.depth);
  registry.add(dispose);
  group.userData = { look: drawn.look, top: y + 2.95 * scale * proportions.height, triangles: batch.triangles, dispose, parts, bends };
  return poseAvatar(group, { pose: pose === 'sit' ? 'stand' : pose, stride });
}

/** Name-tag record for the DOM layer. `position` is in the scene's own coordinates. */
function tagFor(person: CrowdPerson, index: number, top: number): CrowdTag {
  const kind = person.kind === 'npc' || person.kind === 'self' ? person.kind : 'player';
  const name = String(person.name ?? person.id ?? '');
  return {
    id: String(person.id ?? `person-${index}`),
    name,
    kind,
    text: kind === 'player' ? `@${name}` : name,
    marker: kind === 'npc' ? 'dot' : kind === 'self' ? 'crown' : 'tag',
    colour: kind === 'npc' ? '#58d68a' : kind === 'self' ? '#ffd34d' : '#6fb4ff',
    position: { x: person.x || 0, y: top, z: person.z || 0 },
  };
}

/** Draw people into an existing batch; returns their name tags. */
export function drawCrowd(b: Drawing, people: CrowdPerson[] = []): CrowdTag[] {
  return people.map((person, index) => {
    const kind = person.kind === 'npc' ? 'npc' : person.kind === 'self' ? 'crown' : 'player';
    const drawn = drawAvatar(b, person.look, {
      x: person.x || 0, y: person.y || 0, z: person.z || 0, ry: person.ry || 0, pose: person.pose, seat: person.seat, detail: person.detail,
      seed: person.seed ?? person.id ?? person.name ?? index, marker: person.marker === undefined ? kind : person.marker,
    });
    return tagFor(person, index, drawn.top);
  });
}

/**
 * A small crowd of other players and NPCs, merged into at most two meshes.
 * people: [{ id, name, kind: 'player' | 'npc', look?, seed?, x, z, y?, ry?, pose?, seat?, detail? }]
 * Returns { group, tags, triangles, dispose }. tags: [{ id, name, kind, text ('@name' for
 * players), marker ('tag' | 'dot' | 'crown'), colour, position: { x, y, z } }] — the host
 * projects `position` through its camera and draws the label in the DOM.
 */
export function buildCrowd(kit: Kit, people: CrowdPerson[] = []): Crowd {
  const { THREE } = kit;
  const batch = createBatch(THREE);
  const tags = drawCrowd(batch, people);
  const built = batch.build(sceneMaterials(kit));
  const group = new THREE.Group();
  built.meshes.forEach((mesh) => group.add(mesh));
  const registry = kitResources(kit).disposers;
  const dispose = () => { registry.delete(dispose); releaseObjects(built.meshes); group.parent?.remove(group); };
  registry.add(dispose);
  return { group, tags, triangles: built.triangles, dispose };
}

/** Colours for the original kit-based person(): kept for callers that still use it. */
export function appearanceToLook(appearance?: unknown, seed?: unknown): LookColours {
  const look = normalizeLook(appearance, seed);
  return { shirt: look.outfitColor, pants: look.bottomsColor, skin: look.skin, hair: look.hairColor };
}

/** person(kit, parent, x, z, shirtColour, trouserColour, { seated, rotation, skin, hair, y, gesture }) → THREE.Group (original kit-based figure) */
export function person(kit: Kit, parent: THREE.Object3D, x: number, z: number, shirt: Colour, pants: Colour, { seated = false, rotation = 0, skin = '#986345', hair = '#211d1c', y = 0, gesture = false }: { seated?: boolean; rotation?: number; skin?: Colour; hair?: Colour; y?: number; gesture?: boolean } = {}): THREE.Group {
  const { THREE, box, round, sphere, mesh, sphereGeometry } = kit;
  const person = new THREE.Group();
  person.position.set(x, y, z);
  person.rotation.y = rotation;
  parent.add(person);
  const body = new THREE.Group();
  person.add(body);
  box(0, 1.47, 0, 0.6, 0.72, 0.34, shirt, body);
  round(0, 1.94, 0, 0.1, 0.2, skin, body);
  sphere(0, 2.2, 0, 0.26, skin, body);
  mesh(sphereGeometry, 0, 2.34, -0.025, 0.28, 0.19, 0.27, hair, body);
  box(0, 1.04, 0, 0.5, 0.24, 0.3, pants, body);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.38, 1.78, 0);
    arm.rotation.z = side * -0.12;
    body.add(arm);
    round(0, -0.21, 0, 0.105, 0.43, shirt, arm);
    const forearm = new THREE.Group();
    forearm.position.y = -0.43;
    forearm.rotation.x = seated ? -0.9 : gesture && side === 1 ? -1.2 : -0.14;
    arm.add(forearm);
    round(0, -0.19, 0, 0.078, 0.38, skin, forearm);
    sphere(0, -0.4, 0, 0.085, skin, forearm);
    const leg = new THREE.Group();
    leg.position.set(side * 0.17, 1.02, 0);
    leg.rotation.x = seated ? -Math.PI / 2 : side * 0.035;
    body.add(leg);
    round(0, -0.24, 0, 0.115, 0.49, pants, leg);
    const calf = new THREE.Group();
    calf.position.y = -0.49;
    calf.rotation.x = seated ? Math.PI / 2 : 0;
    leg.add(calf);
    round(0, -0.23, 0, 0.095, 0.46, pants, calf);
    box(0, -0.47, 0.08, 0.24, 0.14, 0.43, '#252c32', calf);
  }
  if (seated) body.position.y = -0.85;
  return person;
}
