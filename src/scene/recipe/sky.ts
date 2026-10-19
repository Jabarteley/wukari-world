import { Color } from 'three';
import type { SceneDef } from '../types.ts';
import type { RecipeSky } from './contract.ts';
import { requireRecipe } from './pack.ts';

/** Scene-owned cache; converts existing sRGB sky colors to linear before applying bounded artist multipliers. */
export function recipeSkyTint(sky: RecipeSky): NonNullable<SceneDef['skyTint']> {
  const gains = [sky.horizon.slice(), sky.zenith.slice()];
  requireRecipe(gains.every(rgb => rgb.length === 3 && rgb.every(v => Number.isFinite(v) && v >= 0.85 && v <= 1)), 'invalid sky multipliers');
  const colors = [new Color(), new Color()];
  let previous: readonly [string, string] | undefined, output: [string, string] = ['', ''];
  return pair => {
    if (!previous || previous[0] !== pair[0] || previous[1] !== pair[1]) {
      const tint = (i: number): string => {
        const color = colors[i]!.set(pair[i]!);
        const gain = gains[i]!;
        color.r *= gain[0]!; color.g *= gain[1]!; color.b *= gain[2]!;
        return `#${color.getHexString()}`;
      };
      output = [tint(0), tint(1)]; previous = [pair[0], pair[1]];
    }
    return [...output];
  };
}
