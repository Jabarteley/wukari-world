# Lagos geography adapter proposal

Standalone, dependency-free at execution time on Node 24. Imports existing pure coordinate functions read-only. Nothing imports this experiment from runtime code. See [continuation and evidence](../../../docs/agent-plans/cloud-lanes/lagos-geography/CONTINUE.md).

`sample-manifest.json` proposes a 200 × 200 m authoring area around the existing approximate game coordinate for Sabo Yaba: longitude **3.382**, latitude **6.5075**. It has not been accepted as a real physical block. Three original synthetic features exercise scale, heading, elevation and a nonzero model pivot; their model IDs have no files. No restricted imagery, third-party building footprints or survey data were used.

## Frames and conversion

```text
lon/lat degrees <-- anchor-latitude spherical approximation --> local east/north/up metres
      |                                                          |
existing Nigeria projection                             scale + Y yaw + translation
      |                                                          |
Lagos city-local map units                                proposed scene x/y/z
      |
existing mapPointToMetres (×100)
      |
Lagos street projected metres --> quantize globally --> 128 m tile + integer centimetres
```

`createAdapter({anchor,scene})` requires an explicit scene scale, yaw and translation. Its frame-tagged point objects prevent accidental interchange. Geographic conversion is bounded to a 500 m horizontal radius about the anchor. It is suitable for numerical prototype work within that domain, not global GIS or a certified WGS84/vertical datum transformation. The repository source datum is unverified.

For radius `R=6371008.8 m`, radians per degree `d`, anchor `(lon0,lat0)`:

```text
east  = (lon-lon0) * R * d * cos(lat0*d)
north = (lat-lat0) * R * d
up    = independently supplied metres above arbitrary local zero
scene = translation + unitsPerMetre * rotateY(yaw, [east, up, -north])
```

The existing city frame fixes its standard parallel at 9°N. Its street metre x coordinates therefore scale east by `cos(9°)/cos(6.5075°)=0.9940932547076073` relative to this local approximation. A 200 m east span becomes 198.81865094152147 projected metres. Subtracting the rounded Lagos origin `(-5052,2835)` also matters; do not substitute the exact projection of `(3.4,6.45)`.

The proposed scene defaults to one scene unit per local metre. Existing city-street drawing uses its projected metre coordinates directly; procedural neighbourhood rows have another orientation; venue movement uses the reference 2.45/1.75 scale. Integration must select its target rather than treating any of these as universal. The adapter exposes no Equal Earth atlas conversion.

## Placement proposal

```ts
import { createAdapter } from './adapter.ts'
import { CONFIG, point } from './fixture.ts'

const adapter = createAdapter(CONFIG)
const placement = adapter.place({
  near: 'synthetic:example',
  metresPerModelUnit: 1,
  groundAnchorModel: { x: 0, y: 0, z: 0 },
  forward: '+z',
}, point(20, 30, 0.15), 90) // east-facing; synthetic ground elevation
```

Heading is clockwise from north. Model forward is +Z. Static Three.js Y yaw is `sceneYaw + pi - headingRadians`; uniform scale is `metresPerModelUnit * scene.unitsPerMetre`. The rotated/scaled model ground anchor is subtracted from translation so it lands at the desired local point. `modelPointToScene` transforms other named anchors. This is a scalar-field proposal for `Placement`, not a loader, asset registry, collider, door or navigation grant.

The pure `buildManifest` serializes in stable feature-ID order, rejects duplicates/nonfinite dimensions/footprints outside the proposed area, and carries synthetic provenance and uncertainty. There is no random seed because placement is an explicit fixed input list with no sampling. Real-world height error is `null`; nominal heights and scenario ranges are original fictional inputs, not measurements or statistical confidence intervals. `up` is ground elevation; feature height is a separate extent above ground.

## Reproduce without installing dependencies

From the repository root, Node >=22.18 (tested 24.19.0):

```sh
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 60s node --test --test-reporter=tap --test-concurrency=1 experiments/cloud-lanes/lagos-geography/adapter.test.ts experiments/cloud-lanes/lagos-geography/manifest.test.ts
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 30s node experiments/cloud-lanes/lagos-geography/generate.ts --check
```

Use `generate.ts --write` only when intentionally regenerating the lane's two JSON artifacts. It verifies existing source pins before writing and refuses drift. For a new baseline, the parent reviews the 14 pinned source contracts before any pin update. `--check` performs no writes. Tests include independent axis/scale and one-metre cube witnesses, 486 unquantized/quantized round trips, negative tile seams, pivot/heading/scale, malformed input, provenance retention and byte-deterministic output.

No renderer, Blender, full game tests, broad compiler, dependency install, network source acquisition or production operation is needed for these checks. Golden-scene rendering, real control-point errors, actual asset import, collider/navigation, phone performance, and selection of a lawful real block remain integration work for their owners.
