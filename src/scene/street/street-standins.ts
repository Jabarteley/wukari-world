/**
 * OWNER: neighbourhood
 * What stands in for a street model until its file arrives, or for good when the device may not fetch it or the file fails:
 * the procedural drawing the street always had (boxes and cylinders in the scene's batch), in the model's own frame.
 */
import type { Batch } from '../types.ts';
import { boxOf } from './street-kit.ts';
import type { PlanPiece } from './street-plan.ts';

/** A house as plain boxes: the front wall split around the door, two windows a floor, a flat roof slab. In the house's own frame (x centred, front at z = front). */
export function drawHouse(b: Batch, x: number, front: number, width: number, depth: number, wall: string, roof: string, door: string, floors = 1): void {
  const back = front - depth, half = width / 2, wallHeight = floors * 3.4;
  const leftDoor = 0.78, doorWidth = 1.56, wallDepth = 0.24;
  b.box(x - (half + leftDoor) / 2, wallHeight / 2, front, half - leftDoor, wallHeight, wallDepth, wall);
  b.box(x + (half + leftDoor) / 2, wallHeight / 2, front, half - leftDoor, wallHeight, wallDepth, wall);
  b.box(x, (wallHeight + 2.45) / 2, front, doorWidth, wallHeight - 2.45, wallDepth, wall);
  b.box(x - half, wallHeight / 2, back + depth / 2, wallDepth, wallHeight, depth, wall);
  b.box(x + half, wallHeight / 2, back + depth / 2, wallDepth, wallHeight, depth, wall);
  b.box(x, wallHeight / 2, back, width, wallHeight, wallDepth, wall);
  for (let floor = 1; floor < floors; floor++) {
    const y = floor * 3.4;
    b.box(x, y, front, width, 0.16, 0.3, '#e2d6bf');
    for (const side of [-1, 1]) {
      b.box(x + side * 2.2, y + 1.75, front - 0.14, 1.6, 1.2, 0.08, '#805a37');
      b.box(x + side * 2.2, y + 1.75, front - 0.085, 1.4, 1.02, 0.04, '#b8d8e7');
    }
  }
  b.box(x, wallHeight + 0.28, back + depth / 2, width + 0.5, 0.56, depth + 0.5, roof);
  b.box(x, wallHeight + 0.58, back + depth / 2, width + 0.5, 0.12, depth + 0.5, '#e2d6bf');
  b.box(x, 1.12, front - 0.14, 1.28, 2.18, 0.1, door);
  b.box(x + 0.38, 1.1, front - 0.075, 0.07, 0.12, 0.08, '#dfbd64');
  b.box(x - 2.55, 2.35, front - 0.14, 1.6, 1.15, 0.08, '#805a37');
  b.box(x - 2.55, 2.35, front - 0.085, 1.42, 0.94, 0.04, '#b8d8e7');
  b.box(x + 2.55, 2.35, front - 0.14, 1.6, 1.15, 0.08, '#805a37');
  b.box(x + 2.55, 2.35, front - 0.085, 1.42, 0.94, 0.04, '#b8d8e7');
  b.box(x, 3.25, front - 0.18, 1.8, 0.14, 0.12, '#f0d99a');
}

const SAND = '#d9c9a6', GREEN = '#3f8a57', DARK = '#3b3f46';

/** The stand-in for a piece, drawn in the model's own frame (the layer applies the piece's position, turn and scale). */
export function standInFor(item: PlanPiece): ((b: Batch) => void) | undefined {
  const [minX, maxX, minZ, maxZ, height] = boxOf(item.asset);
  const width = maxX - minX, depth = maxZ - minZ, midX = (minX + maxX) / 2, midZ = (minZ + maxZ) / 2;
  switch (item.asset) {
    case 'bungalow': case 'house2': case 'flats': {
      const paint = item.paint ?? { wall: '#e6cf9f', roof: '#a85c40', door: '#6b4a2b' };
      const floors = item.asset === 'bungalow' ? 1 : item.asset === 'house2' ? 2 : 3;
      return (b) => drawHouse(b, 0, maxZ, width * 0.92, depth * 0.62, paint.wall, paint.roof, paint.door, floors);
    }
    case 'shops': case 'shoprow': case 'church': case 'mosque': case 'school': case 'clinic': case 'filling': case 'bank': case 'unfinished':
      return (b) => { b.box(midX, height * 0.4, midZ, width * 0.94, height * 0.8, depth * 0.9, '#e2d3b0'); b.box(midX, height * 0.84, midZ, width, height * 0.1, depth * 1.02, '#a85c40'); b.box(0, 1.1, maxZ - 0.1, 1.5, 2.2, 0.2, '#6b4a2b'); };
    case 'fencegate':
      return (b) => { for (const side of [-1, 1]) { b.box(side * 1.65, 0.9, 0, 0.5, 1.8, 0.5, SAND); b.box(side * 1.65, 1.85, 0, 0.64, 0.12, 0.64, '#efe6cf'); } };
    case 'lamp':
      return (b) => { b.cyl(0, 2.6, 0, 0.12, 5.2, '#5d5142'); b.box(0.7, 5.3, 0, 1.5, 0.12, 0.2, '#5d5142'); b.cyl(1.4, 5.2, 0, 0.3, 0.3, '#e9c97c', { seg: 8 }); };
    case 'busstop':
      return (b) => { for (const side of [-1, 1]) b.box(side * 1.9, 1.2, -0.7, 0.14, 2.4, 0.14, DARK); b.box(0, 2.5, 0, 4.4, 0.14, 2.1, '#8d9399'); b.box(0, 0.5, -0.7, 3.4, 0.1, 0.5, '#73553b'); };
    case 'kiosk': case 'stall':
      return (b) => { b.box(midX, 1.1, midZ, width * 0.8, 2.2, depth * 0.8, '#c69a4e'); b.box(midX, 2.35, midZ, width, 0.18, depth, '#b5483f'); };
    case 'shadetree': case 'palm': case 'pawpaw': case 'plantain':
      return (b) => { b.cyl(0, height * 0.3, 0, 0.3, height * 0.6, '#73553b'); b.ico(0, height * 0.72, 0, width * 0.42, height * 0.26, depth * 0.42, GREEN); };
    case 'hedge':
      return (b) => b.box(0, 0.5, 0, width, 1.0, depth, GREEN);
    case 'bin':
      return (b) => b.cyl(0, 0.55, 0, 0.36, 1.1, '#3f6f4c');
    case 'tank':
      return (b) => { b.cyl(0, 3.4, 0, 0.95, 2, '#34383e'); for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]] as const) b.box(x, 1.2, z, 0.12, 2.4, 0.12, DARK); };
    case 'generator':
      return (b) => b.box(0, 0.65, 0, 1.3, 1.1, 0.9, '#b5483f');
    case 'billboard':
      return (b) => { for (const side of [-1, 1]) b.box(side * 2, 2.6, 0, 0.2, 5.2, 0.2, DARK); b.box(0, 5.2, 0, 6.3, 3, 0.2, '#f3eee0'); };
    case 'trafficlight':
      return (b) => { b.cyl(0, 2.5, 0, 0.1, 5, DARK); b.box(1.6, 4.9, 0, 3.2, 0.1, 0.1, DARK); b.box(3.2, 4.4, 0, 0.5, 1.2, 0.4, DARK); };
    case 'table':
      return (b) => b.box(0, 0.9, 0, 2, 0.1, 1, '#8a6644');
    case 'detail-gatehouse': case 'detail-generator-hut':
      return (b) => b.box(0, 1.1, 0, 1.8, 2.2, 1.5, SAND);
    default:
      return undefined;
  }
}
