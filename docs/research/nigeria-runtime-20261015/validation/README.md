# Runtime follow-up validation

Cloud execution: Node 24.19 and Chromium 151 with software rendering in the published remote workspace, 15 October 2026. No paid services or new credentials used.

- `shadow-final-focused.tap`: 91/91 focused tests on product source `5bb9d30b`; adapter, bounded recovery, navigation, assets, lighting, customization, host, startup and release-package checks.
- `shadow-final-typecheck.log`: supported serial typecheck, five projects clean on `5bb9d30b`.
- `camera-tests.tap`: 21/21 camera/world regressions on `536347f9`, including frontage azimuth limits and retained ordinary-venue free orbit.
- `runtime-nav-final.tap`: 10/10 navigation/contact checks after excluding decorative action rings from physical obstacles.
- `runtime-package-final.tap`: 8/8 static-package and asset checks after moving nonruntime provenance out of public assets; package rules unchanged.
- `nigeria-gates-9af2-*.tap`: clean-main/candidate comparison reproduces identical Worker size 4,822,254 bytes against 3,500,000 cap; 14 game comeback tests pass.
- `nigeria-comeback-9af2-*.tap`: selected server idle transaction assertion fails on both baseline and candidate (2 instead of 0).

Hosted CI [38733202253](https://github.com/kromate/joinallworld/actions/runs/38733202253) passed exact `5bb9d30b`. Joint content/camera candidate `5bd1fcc8` is checked separately in [38734503763](https://github.com/kromate/joinallworld/actions/runs/38734503763). Fast CI skips full Worker and full Node suites; it does not supersede the failures above.

Final camera product source: `536347f93da308cf6235d3586af843c17e22f4c8`. Full browser receipts and exact per-file hashes are in `../host/ambient-lagos/` and `../host/ambient-abuja/`. Both source-stable runs pass and match this product revision. They verify the imported venue scope, not all ordinary venues or physical-phone performance. Production deployment and live verification remain separate requirements.
