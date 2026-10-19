# Portable regional style inputs

Each `<region>.json` is the standalone style row for that region from the pinned preparation input. The `assets.ts build` command reads the selected file directly; generation does not depend on the private preparation or temporary directories.

```sh
node --experimental-strip-types scripts/scene-factory/assets.ts build --kind kit --id REGION --out OUT.glb --report REPORT.json --style scripts/scene-factory/styles/REGION.json
```

The `palette` array order used by `kit.py` is: `light-surface`, `wood`, `foliage`, `accent`, `glass-water`, `warm-accent`, `metal`, `dark`. The current textile mapping uses `glass-water` for atlas cell 9, `accent` for cell 10, and `warm-accent` for cell 11. Those cells contain textile only; the other atlas cells stay shared.

`gulf-guinea.json` is retained as an explicit input row, while the current kit selects the explicit `market-base-v1` baseline profile for Gulf Guinea. It is not an implicit missing-style fallback. All regions share the same physical-kit geometry. The legacy `roof` and `canopyHeight` fields remain present and validated input metadata; current physical geometry does not vary with them.

The source URLs and provenance fields identify place-context inputs and their recorded limitations. They do not establish palette colours, architectural form, local building practice, or reuse rights. Palette values are bounded art inputs, not claims about local colours.
