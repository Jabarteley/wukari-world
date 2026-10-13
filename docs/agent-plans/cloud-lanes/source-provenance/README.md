# Source provenance v1 — parent lane 02

A standalone, offline source intake contract for the proposed approximately 200 m
Lagos pilot. This package is **not wired into the game**. It admits exactly one
original synthetic source; no actual Lagos geometry, imagery or elevation has been
acquired or admitted. Parent owns integration and future launches.

## Files and execution

- `registry.v1.json`: nine sources, official evidence URLs and review dates,
  creator/provider, license, allowed/conditional/forbidden/unresolved uses,
  attribution, release/acquisition state, coverage, accuracy and missing data.
- `schema.v1.json`: closed JSON Schema 2020-12 shapes for registry, packet and
  field observations. Its root is a packet; registry is `#/$defs/registry`.
- `pins.json`: exact byte sizes and SHA-256 for schema, registry and retained
  baseline AGPL license. The packet separately pins schema and registry; the
  admitted source pins its original bytes and acquisition dates.
- `validate.ts`: bounded local-file verification, schema checks and rights/lineage
  checks using Node built-ins only. No fetch, provider calls or command execution.
- `fixtures/lawful.packet.json`: original 12 by 8 metre synthetic rectangle,
  measured local width, estimated height and authored facade. It has no location,
  real-world accuracy, field survey or imagery source. The license is copied
  verbatim from baseline `LICENSE`; source code/data follow repository AGPL terms.
- `fixtures/rejections.json`, `validate.test.ts`: 37 declarative rejection cases
  plus independent byte, semantic, path/bounds and CLI tests (49 tests total).
- `RESEARCH.md`: source findings and specific unresolved rights.
- `evidence/`: exact test logs and compact verification receipts.

From repository root, with Node >=22.18 (tested on 24.19.0):

```sh
NODE_OPTIONS=--max-old-space-size=1536 node docs/agent-plans/cloud-lanes/source-provenance/validate.ts --registry
NODE_OPTIONS=--max-old-space-size=1536 node docs/agent-plans/cloud-lanes/source-provenance/validate.ts
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 60s node --test --test-concurrency=1 docs/agent-plans/cloud-lanes/source-provenance/validate.test.ts
```

No installation, build, browser, Blender or full-suite run is needed. A busy slot
means defer the test, not raise limits. CLI paths are **relative to this directory**,
regardless of the working directory. Exit 0 means the requested check passed;
exit 1 means invalid input, changed pins, missing bytes or a rights gate. A default
pass always returns `eligibleForProduction: false`.

## Decisions and labels

`status=candidate` records researched source families, while `admission=quarantined`
blocks their use in a packet. `blocked` marks missing rights evidence or a prohibited
reusable-asset route. `admitted-fixture` / `fixture-only` applies solely to the
pinned original example. Registry validation may pass with unresolved candidates;
that validates their honest quarantine records, not their assets.

Each use is separate: deriving geometry, redistributing raw data, redistributing
derivatives, and runtime display. Google Maps imagery/tiles are `forbidden` for
the first three and `conditional` for API display. There is no implicit runtime
approval and no derived collision, navigation, facade, texture or mesh route.
Google Open Buildings referenced by Overture is a separate licensed product.

Every observation carries its feature/property, source inputs, method, operator,
receipt, basis, confidence, units and uncertainty. `measured` needs a timestamp
and known error bound; in this fixture it means arithmetic on **synthetic local
vertices**, never an independent Lagos measurement. A real measured feature must
have the independently sourced date/accuracy evidence required by the parent
plan. `estimated` needs a method, explicit confidence, uncertainty and `beta=true`.
`authored` identifies invented detail, with no measurement timestamp and
`beta=true`. Source-reported or ML-derived values are not automatically measured.
Unknown source accuracy remains null; it is never converted into a zero error.
Transforms belong to lane 03 and are deliberately absent here.

Attribution IDs alone are insufficient: the validator checks the exact retained
text and URL against the pinned registry, as well as every input/output/evidence
hash and lineage reference. These checks detect omission/substitution; they do not
prove legal authorship or the truth of submitted observations. Review the registry
at a trusted Git SHA. Someone who changes the registry, pins and code together
has changed the policy; hashes are not signatures or a rights-clearance service.

## Resource and schema limits

At most 1 MiB per referenced file, 256 KiB per CLI packet, 4 MiB total packet file
reads (failed hashes count), 20,000 JSON nodes and depth 32. The schema additionally
bounds sources/inputs, arrays and strings. Paths must be relative; traversal,
symlinks and non-regular files are rejected. This is a bounded local intake tool,
not a sandbox for concurrent hostile filesystem writers or a general GLB validator.
It checks declared field values for non-finite numbers, but does not parse arbitrary
opaque raster/mesh payloads. Format-specific geometry checks belong to exporters.

The built-in schema evaluator implements only the keywords present in
`schema.v1.json` and rejects unsupported keywords or remote references. It enforces
UTC whole-second timestamps and the explicit `https-url` format. Other generic
JSON Schema tools may treat formats as annotations: use this validator for semantic
acceptance. No third-party validator dependency is installed.

`python make-fixture.py` (from this directory) deterministically rebuilds original
fixtures and pins without acquisition. Run it only after reviewing intentional
source/schema edits: it refreshes trust anchors and is **not** an admission step.
The original admitted input is independently pinned in the registry, so changing
its geometry does not automatically authorize it. Preserve this v1 at the delivered
Git SHA and make future contract changes in a reviewed version.

## What the next owner must resolve

1. Parent selects a real block and source-specific acquisition scope. This lane
   made no location/coverage decision and no runtime budget change.
2. For each proposed input, pin exact release/product/object versions and bytes;
   record capture/acquisition dates, provider/author, geographic coverage, datum,
   missing features and defensible accuracy. Coordinate with lane 03.
3. Retain full applicable terms and exact notices. Resolve ODbL derivative-database
   versus produced-work obligations and any database offer; preserve Overture
   upstream notices. Select the DEM product/version and notice. For Sentinel,
   use actual sensing year and original/modified notice; exclude unrelated portal
   screenshots/basemaps. SRTM evidence must first be retrieved successfully.
4. Obtain written derivation/texture/redistribution rights for any commissioned
   photography. Label invented facades/heights; no Google tracing or extraction.
5. Parent and the integration owner review a new admitted-source/real-pilot
   contract and its negative tests before enabling production consumption. This
   lane has not performed a full game compiler/build or integration acceptance.
