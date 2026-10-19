import type { ValidatedRecipe } from '../contract.ts';
import type { RecipeRuntimeMetadata } from '../pack.ts';

/** Immutable V8 diagnostic fixture: reviewed real regional kit + unchanged V5 Makola hero.
 * Literal transforms independently calculated from brief seed, compact-market source constants, landscape marker clearances and
 * immutable component bounds before comparing the normal generated pack; see V8 preparation evidence.
 */
export const SAMPLE_EXPECTATION = {
  "city": "accra",
  "venue": "accra-market-game",
  "kit": "a1d8e205700feccbed0a08f03b4cfdab8293b23fa3c8eb30bff477a00375e20d",
  "hero": "963572c102fe770373c28f406a019302410c0b6e0051d69808371dc08b802de0",
  "atlas": "fc52fcd31a6a0f6232071f06ba078fc350a270ad2e48d4d2becdff31e3e24959",
  "placements": [
    {
      "source": "kit",
      "id": "cooking-stand",
      "node": "cooking-stand",
      "x": 7.892422,
      "z": -5.476177,
      "ry": 3.141593,
      "scale": 1.3860000000000001
    },
    {
      "source": "kit",
      "id": "kiosk",
      "node": "kiosk",
      "x": 9.277451,
      "z": -0.713348,
      "ry": 1.570796,
      "scale": 1.3860000000000001
    },
    {
      "source": "kit",
      "id": "canopy",
      "node": "canopy",
      "x": 7.405756,
      "z": 3.148123,
      "ry": 3.141593,
      "scale": 1.3860000000000001
    },
    {
      "source": "hero",
      "id": "accra",
      "node": "accra",
      "x": 0,
      "z": -4.399925,
      "ry": 0,
      "scale": 1.3860000000000001
    }
  ],
  "crowd": [
    {
      "id": "recipe-resident-0",
      "seed": "recipe-resident-0",
      "x": 4.203974,
      "y": 0,
      "z": -5.186788,
      "ry": -3.135433
    },
    {
      "id": "recipe-resident-1",
      "seed": "recipe-resident-1",
      "x": 4.188575,
      "y": 0,
      "z": -7.686741,
      "ry": 0.00616
    },
    {
      "id": "recipe-resident-2",
      "seed": "recipe-resident-2",
      "x": -7.833698,
      "y": 0,
      "z": -7.743195,
      "ry": -0.301839
    },
    {
      "id": "recipe-resident-3",
      "seed": "recipe-resident-3",
      "x": -8.57689,
      "y": 0,
      "z": -5.356217,
      "ry": 2.839753
    },
    {
      "id": "recipe-resident-4",
      "seed": "recipe-resident-4",
      "x": 3.35402,
      "y": 0,
      "z": 7.349539,
      "ry": 2.236075
    },
    {
      "id": "recipe-resident-5",
      "seed": "recipe-resident-5",
      "x": 5.320882,
      "y": 0,
      "z": 5.806343,
      "ry": -0.905518
    },
    {
      "id": "recipe-resident-6",
      "seed": "recipe-resident-6",
      "x": 9.343218,
      "y": 0,
      "z": -6.821404,
      "ry": -1.410637
    },
    {
      "id": "recipe-resident-7",
      "seed": "recipe-resident-7",
      "x": 6.875213,
      "y": 0,
      "z": -6.422714,
      "ry": 1.730956
    },
    {
      "id": "recipe-resident-8",
      "seed": "recipe-resident-8",
      "x": -2.720481,
      "y": 0,
      "z": 6.590824,
      "ry": -1.435277
    },
    {
      "id": "recipe-resident-9",
      "seed": "recipe-resident-9",
      "x": -5.197559,
      "y": 0,
      "z": 6.928587,
      "ry": 1.706316
    },
    {
      "id": "recipe-resident-10",
      "seed": "recipe-resident-10",
      "x": -9.38939,
      "y": 0,
      "z": 1.728302,
      "ry": 1.349037
    },
    {
      "id": "recipe-resident-11",
      "seed": "recipe-resident-11",
      "x": -6.95061,
      "y": 0,
      "z": 2.278168,
      "ry": -1.792556
    }
  ]
} as const;

export function assertSampleExpectation(value: Pick<ValidatedRecipe, 'placements'> & { recipe: Pick<ValidatedRecipe['recipe'], 'city' | 'venue' | 'crowd'> }, metadata: RecipeRuntimeMetadata) {
  const expected = SAMPLE_EXPECTATION;
  if (value.recipe.city !== expected.city || value.recipe.venue !== expected.venue || metadata.assets.kit.measurement.sha256 !== expected.kit
    || metadata.assets.hero?.measurement.sha256 !== expected.hero || metadata.assets.kit.measurement.atlas?.sha256 !== expected.atlas
    || metadata.assets.hero?.measurement.atlas?.sha256 !== expected.atlas || value.placements.length !== expected.placements.length) throw new Error('Sample candidate/placement identity changed');
  assertExpectedPlacements(value.placements);
  if (value.recipe.crowd.length !== expected.crowd.length) throw new Error('Sample crowd changed');
  expected.crowd.forEach((p, i) => {
    const actual = value.recipe.crowd[i]!;
    if (actual[0] !== p.x || Math.abs(actual[1] - p.z) > 1e-12 || actual[2] !== p.ry) throw new Error(`Sample crowd ${i} transform changed`);
  });
}

export function assertExpectedPlacements(placements: ValidatedRecipe['placements']) {
  const expected = SAMPLE_EXPECTATION;
  if (placements.length !== expected.placements.length) throw new Error('Sample placement identity changed');
  expected.placements.forEach((p, i) => {
    const actual = placements[i]!;
    for (const key of ['source', 'id', 'node', 'x', 'z', 'ry', 'scale'] as const) if (actual[key] !== p[key]) throw new Error(`Sample placement ${i}.${key} changed`);
    if (actual.assetSha256 !== expected[p.source]) throw new Error(`Sample placement ${i} asset changed`);
  });
}
