import { plotOf, type Plot } from '../game/home-layout.ts'
import { planOf, type HousePlan } from '../game/home-plan.ts'
import type { HouseStyle, PlacedItem } from '../types/life.ts'

/** A source-owned furnished house shown by the studio without creating a second save format. */
export interface HousingRecipe {
  id: string
  label: string
  city: string
  grid: number
  style: HouseStyle
  items: PlacedItem[]
  description: string
}

const style = (shape: number, wall: number, roof: number, door: number, windows: number, fence: number, yard: number, sign = 1): HouseStyle =>
  ({ shape, wall, roof, door, windows, fence, yard, sign })

const item = (id: string, itemId: PlacedItem['itemId'], x: number, y: number, rot = 0, floor = 0): PlacedItem =>
  ({ id, itemId, x, y, rot, ...(floor ? { floor } : {}) })

/** Owned plots use the game's existing tier geometry, room walls, stairs and placement rules. */
export const recipePlot = (recipe: Pick<HousingRecipe, 'grid'>): Plot => plotOf(recipe.grid, true)
export const recipePlan = (recipe: Pick<HousingRecipe, 'grid'>): HousePlan => planOf(recipePlot(recipe))

export const RECIPES: readonly HousingRecipe[] = [
  {
    id: 'lagos-duplex', label: 'Lagos Family Duplex', city: 'lagos', grid: 12,
    style: style(3, 1, 5, 0, 1, 3, 6),
    description: 'A furnished two-storey Lagos home with a social ground floor, two bedrooms, a balcony and clear stair landings.',
    items: [
      item('ld-sofa', 'family-sofa', 2, 2), item('ld-chair', 'lounge-armchair', 8, 2), item('ld-rug', 'centre-rug', 4, 5),
      item('ld-tv', 'flat-tv', 5, 8), item('ld-plant', 'potted-plant', 10, 8), item('ld-art', 'wall-art', 2, 0),
      item('ld-dining-desk', 'laptop-desk', 13, 1), item('ld-dining-chair', 'plastic-chair', 16, 2),
      item('ld-range', 'chef-range', 13, 7), item('ld-fridge', 'double-fridge', 16, 7),
      item('ld-guest-wc', 'wc-suite', 1, 13), item('ld-guest-basin', 'basin', 3, 13),
      item('ld-master-bed', 'king-bed', 2, 2, 0, 1), item('ld-master-robe', 'wardrobe', 7, 2, 0, 1),
      item('ld-master-lamp', 'standing-lamp', 10, 4, 0, 1), item('ld-second-bed', 'foam-bed', 13, 1, 0, 1),
      item('ld-second-robe', 'wardrobe', 16, 1, 1, 1), item('ld-bath', 'bathtub', 13, 7, 0, 1),
      item('ld-bath-wc', 'wc-suite', 16, 7, 0, 1), item('ld-balcony-chair', 'plastic-chair', 1, 13, 0, 1),
      item('ld-balcony-plant', 'potted-plant', 3, 13, 0, 1), item('ld-upstairs-art', 'wall-art', 4, 0, 0, 1),
    ],
  },
  {
    id: 'lagos-two-room-apartment', label: 'Lagos Two-room Apartment', city: 'lagos', grid: 8,
    style: style(0, 3, 0, 1, 0, 0, 1),
    description: 'A compact furnished apartment with a living and sleeping room plus a private bathroom.',
    items: [
      item('la-sofa', 'velvet-sofa', 2, 2), item('la-tv', 'small-tv', 5, 2), item('la-rug', 'centre-rug', 3, 4),
      item('la-stove', 'gas-cooker', 1, 1), item('la-fridge', 'fridge', 6, 1), item('la-art', 'wall-art', 2, 0),
      item('la-bed', 'spring-bed', 9, 1), item('la-robe', 'wardrobe', 9, 3),
      item('la-shower', 'shower-cubicle', 9, 6), item('la-wc', 'toilet', 11, 6),
    ],
  },
  {
    id: 'lagos-two-bedroom-apartment', label: 'Lagos Two-bedroom Apartment', city: 'lagos', grid: 10,
    style: style(2, 0, 5, 3, 2, 2, 0),
    description: 'A broad single-floor Lagos apartment with a parlour, bedrooms, kitchen, dining room and bathroom.',
    items: [
      item('l3-sofa', 'corner-lounge', 2, 2), item('l3-chair', 'lounge-armchair', 7, 2), item('l3-tv', 'flat-tv', 4, 7),
      item('l3-rug', 'centre-rug', 5, 4), item('l3-art', 'wall-art', 3, 0),
      item('l3-bed-a', 'foam-bed', 11, 1), item('l3-robe-a', 'wardrobe', 13, 3, 1),
      item('l3-bed-b', 'spring-bed', 11, 6), item('l3-robe-b', 'wardrobe', 13, 8, 1),
      item('l3-range', 'chef-range', 1, 11), item('l3-fridge', 'double-fridge', 4, 12),
      item('l3-shower', 'shower-cubicle', 7, 11), item('l3-wc', 'wc-suite', 9, 12),
      item('l3-dining-desk', 'laptop-desk', 11, 11), item('l3-dining-chair-a', 'plastic-chair', 11, 13),
      item('l3-dining-chair-b', 'plastic-chair', 14, 12),
    ],
  },
  {
    id: 'abuja-mansion', label: 'Abuja Courtyard Mansion', city: 'abuja', grid: 14,
    style: style(1, 1, 5, 0, 2, 3, 2),
    description: 'A furnished Abuja mansion with formal and family lounges, ground-floor guest quarters, an upper bedroom floor and a roof terrace.',
    items: [
      item('am-formal-sofa', 'gold-sofa', 2, 2), item('am-formal-chair', 'lounge-armchair', 7, 2), item('am-formal-rug', 'centre-rug', 4, 5),
      item('am-formal-tv', 'flat-tv', 5, 9), item('am-dining-desk', 'laptop-desk', 15, 1), item('am-dining-chair', 'plastic-chair', 18, 2),
      item('am-range', 'chef-range', 15, 8), item('am-fridge', 'double-fridge', 19, 8), item('am-bq-bed', 'spring-bed', 1, 15),
      item('am-bq-robe', 'wardrobe', 3, 15), item('am-ground-art', 'wall-art', 3, 0),
      item('am-master-bed', 'king-bed', 1, 2, 0, 1), item('am-master-robe', 'wardrobe', 5, 2, 0, 1),
      item('am-lounge-sofa', 'family-sofa', 10, 2, 1, 1), item('am-lounge-tv', 'flat-tv', 10, 9, 1, 1),
      item('am-second-bed', 'foam-bed', 15, 1, 0, 1), item('am-second-robe', 'wardrobe', 19, 1, 1, 1),
      item('am-bath', 'bathtub', 15, 8, 0, 1), item('am-bath-wc', 'wc-suite', 19, 8, 0, 1),
      item('am-balcony-chair', 'plastic-chair', 1, 15, 0, 1), item('am-balcony-plant', 'potted-plant', 3, 15, 0, 1),
      item('am-terrace-sofa', 'family-sofa', 3, 3, 0, 2), item('am-terrace-chairs', 'plastic-chair', 8, 4, 0, 2),
      item('am-terrace-plant-a', 'potted-plant', 12, 4, 0, 2), item('am-terrace-plant-b', 'potted-plant', 15, 4, 0, 2),
    ],
  },
]
