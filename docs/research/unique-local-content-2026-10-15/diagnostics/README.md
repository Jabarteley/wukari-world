# Reproduce the content acceptance diagnostics

These archived sources are temporary diagnostics, excluded from the application and test inventory. They inject canonical game proof events, so they do not replace browser playthroughs. The engine check also reloads the retained legacy save; the mission check exercises dealing, swaps and old reward claims.

From the repository root, materialize both files outside the checkout with the current absolute root substituted:

```sh
python3 - <<'PYTHON'
from pathlib import Path
root = Path.cwd()
for name in ('engine-acceptance', 'mission-acceptance'):
    source = (root / 'docs/research/unique-local-content-2026-10-15/diagnostics' / f'{name}.ts.txt').read_text()
    Path(f'/tmp/allworld-{name}.ts').write_text(source.replace('__REPO_ROOT__', str(root)))
PYTHON
node --experimental-strip-types scripts/agent-slot.ts heavy -- node --experimental-strip-types /tmp/allworld-engine-acceptance.ts
node --experimental-strip-types scripts/agent-slot.ts heavy -- node --experimental-strip-types /tmp/allworld-mission-acceptance.ts
```

Run serially because both load the world. The reports are written under this research directory, not to player data. The source revision and working-tree state in the engine report describe the run, not a subsequently committed revision. Use the registered batches as the coverage authority. Results are not proof of deployment, measured retention or physical-device behavior.
