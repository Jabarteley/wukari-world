# Olumo Rock scene budget

## Finding

The Olumo Rock rooftop outcrop measured 17,035 triangles with the full 12-person crowd, above the strict scene limit of 17,000. Loading only `src/scene/characters.ts` from `HEAD` measured 16,844 triangles for the same scene and crowd. The current character work adds 191 triangles here: 39 in authored extras and 152 across the crowd.

The outcrop's distant valley contains 126 simple building wall blocks: 73 in the nearer town and 53 in the far town. Each used a closed 12-triangle box even though its two-triangle bottom face is below the terrain and cannot be seen.

## Change

`src/scene/venues-ogun-a.ts` now uses one indexed five-face `BatchGeometry` for those two valley wall loops. Each instance has 20 vertices and 10 triangles, with one full-volume footprint recorded for movement and sight. Its top and four sides preserve the original dimensions, outward normals, colour, position, yaw, and `rx: 0.06` tilt. The separate roof panels are unchanged.

Removing only the 126 hidden bottom faces saves 252 triangles. The expected full Olumo Rock scene count is 16,783, leaving 217 triangles below the limit. The shared material, batching, draw calls, rock landmark geometry, and NPC geometry are unchanged.

## Verification boundary

The focused verification compares the original box and replacement world-space bounds under the building transform, checks the replacement's single recorded full-volume footprint, and runs the existing Ogun venue coverage followed by the complete scene test file. Visual comparison uses `evidence/olumo-before-budget.jpg` as the parent-owned baseline.
