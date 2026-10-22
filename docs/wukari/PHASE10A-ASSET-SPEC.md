# Next-stage asset quality proposal (owner approval pending)

The current fleet uses original merged primitive geometry. It is useful for route/collision regression, but motorcycles lack realistic frames/suspension/rider clothing, cars lack glazing/interiors and trailers lack articulated hitch physics. Existing buildings preserve footprints but facades repeat. Do not scale this fleet into an NPC expansion before the owner accepts replacement art. The retained rigged avatar system is preferable to new primitive pedestrians.

Use legally redistributable original or licensed GLB/glTF2.0 assets, metres, +Y up/+Z forward, applied transforms, named wheel/steering/hitch nodes, geometry/material ownership and disposal. Keep a source URL, author, immutable file hash, exact license text, attribution and proof that commercial redistribution/modification are allowed. CC0 or explicit permissive rights are preferable. No proprietary game extractions or uncertain marketplace redistribution. These are proposed budgets, not measured performance promises.

| Asset | Reference scale to validate | Nearby LOD0 budget | LOD1/LOD2 target | Material budget |
|---|---|---:|---:|---:|
| Nigerian commercial motorcycle + clothed rider | roughly1.9-2.2m long; rider uses retained human rig scale |12k triangles combined|5k/1.5k|2-3, shared1k atlas|
| Car/taxi | roughly3.5-4.8m long,1.5-1.9m wide |12k|5k/1k|2-3|
| SUV | roughly4.3-5.1m long |14k|6k/1.5k|2-3|
| Delivery truck | roughly5-8m long |16k|7k/2k|3|
| Truck/articulated trailer | actual chosen model dimensions, usually12-18m combined |24k|10k/3k|3-4 shared atlas|
| Pedestrian | retained1.7-1.8m rig, varied presentations/outfits |existing measured rig budget; optimize hidden faces first|retargeted shared rig/low-cost distant silhouette|retain cached palette/atlas|
| House/shop/compound | original footprint authoritative; separate parametric facade modules |2-8k visible detail per nearby building|batched shell/distant roof|1-2 shared atlases|
| Pole/light/shelter | chosen reference dimensions, never surveyed placement by default |300/800/2k|instanced lower detail|1 shared atlas|

Before accepting each motorcycle, car/taxi, SUV, truck and trailer: capture front, side, rear and three-quarter views at normal gameplay distance and a close view. Verify real-world proportions against a legally reusable measured reference, recognizable tires/wheelbases/windows, frame/body silhouette, smooth normals and restrained PBR roughness. Check both static and moving wheels, rider hand/foot contact, clothing clearance and trailer hitch articulation. A wheel must rotate about its actual axle; a collision box must enclose the visible moving model. Verify turn swept-volume and braking before traffic integration. Do not claim a selected reference model is representative of actual Wukari traffic frequency.

Render budgets are scene budgets: target roughly40 draw calls on Medium and keep source town geometry batched; instance repeated vehicles/furniture and share immutable GLB templates. Avoid per-vehicle shadows, transparent windows with excessive overdraw, separate materials per bolt or4k textures on small distant props. Provide actual IntelHD620 FPS/p95 with representative mixed traffic before acceptance; previous Phase9 numbers do not certify replacement assets. Distinct NPCs, driving and multiplayer remain outside these milestones.
