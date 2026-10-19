# Web research: AI-generated low-poly venues and cheap per-city NPC dialogue (17 Oct 2026)
[P] = primary source fetched; [S] = secondary.

## A. LLM-driven Blender scene generation
- Blender MCP (ahujasid): MIT; socket server inside a running Blender UI; asset hooks for Poly Haven (CC0), Sketchfab, Poly Pizza, Rodin, Hunyuan3D, Tripo; no headless batch mode documented [P]. For batch: emit plain bpy scripts, run `blender -b --python` or `pip install bpy`.
- SceneCraft (ICML 2024): paper only; scene graph -> numeric constraints -> bpy, VLM render-and-critique loop [S]. The right template to re-implement.
- Holodeck (AI2, Apache-2.0): rooms/doors/windows then objects via DFS or MILP solver; needs OpenAI key, Objaverse assets, Unity to view [P].
- Infinigen / Indoors (Princeton, BSD-3): headless pip install, CPU-only works on Apple Silicon; declarative constraint program + solver; 8-13 min CPU per room; photoreal high-poly, not stylised [P].
- LayoutGPT: MIT; in-context examples -> numeric layout; bedrooms only [P].
- bpy 5.2.2 on PyPI (15 Sep 2026), CPython 3.13, macOS 11+ arm64 wheels; geometry/export needs no GPU; one `import bpy` per process, batch via subprocesses [P].
- Take-away: nothing yields stylised low-poly off the shelf. Pattern that works: LLM emits JSON layout against your own prop vocabulary + tiny constraint checker (bounds, overlap, walkable), fixed script instantiates and exports.

## B. Text/image-to-3D generators and licences
| Model | Licence | Notes |
|---|---|---|
| Microsoft TRELLIS v1 | MIT | NVIDIA >=16 GB, Linux; dense meshes need decimation [P] |
| TRELLIS.2 (4B) | MIT (nvdiffrast deps NVIDIA licence) | >=24 GB, H100 ~17 s at 1024^3; image-only; high-fidelity [P] |
| Hunyuan3D 2.1 | Tencent Community License: void in EU/UK/South Korea; >1M MAU needs licence; outputs may not train models | 2.5/3.0/3.1 are API-only [P/S] |
| Hunyuan3D 3.x API | commercial; FaceCount 3,000-1.5M; 3.0 has LowPoly mode | credits ~$0.0135-0.02 [S] |
| Stability SPAR3D / SF3D | Community License: free commercial under $1M revenue | <1 s/asset, low fidelity, fine for small props [P] |
| Meshy | Free tier outputs CC BY 4.0; paid private | text-to-3D 20 cr + 10 texture; remesh 5 cr; Pro $20/1,000 cr; low-poly option [P] |
| Tripo v3.1 | commercial on paid plans | text 10-30 cr; smart low-poly +10; ~$0.01/cr [P/S] |
| Hyper3D Rodin | Creator $30/mo ~60 models | high fidelity [P] |
| Luma Genie | discontinued (site is video/image now) [P] |
| Sloyd | Plus $15/mo commercial; parametric | most reliable clean low-poly, generic catalogue [P] |
| Kaedim | pricing not public; human-in-loop [P] |
- Remesh/decimate: Blender Decimate; meshoptimizer/gltfpack (MIT): `-si R` simplify, `-tc` KTX2, `-cc` meshopt (three.js setMeshoptDecoder) [P]. Simplygon free tier ended Mar 2024 [S].
- Verdict: generator -> decimate 500-2,000 tris -> bake atlas; or procedural buildings + generated hero props only. Clean licences for AGPL commercial: TRELLIS (MIT), Stability (<$1M), Meshy/Tripo paid, Sloyd paid. Avoid Hunyuan3D 2.x for a global web game.

## C. Geodata
- OSM (ODbL): a game is a Produced Work; attribution allowed on splash/credits/menu [P]. Shipping substantial extracted per-city building data = Derivative Database (must be ODbL) [P]. Keep raw dumps internal; ship baked scenes.
- Overture: Buildings/Transportation/Base/Divisions ODbL; Places CDLA-Permissive 2.0 [P]; buildings include Google Open Buildings (CC BY 4.0) for Africa/Asia/LatAm [S].
- Wikidata CC0 [P]; Wikipedia CC BY-SA (inspiration only); Mapillary CC BY-SA 4.0; Commons per-file licences [P].
- CC0 kits: Kenney City Kit, Stealthix Low Poly City; Objaverse ODC-By with per-object CC (filter NC) [P/S].

## D. Freedom of panorama (commercial) [P Commons tables; not legal advice]
| Country | Buildings | Sculptures |
|---|---|---|
| Nigeria | No (Copyright Act 2022 s.20(1)(e)) | No |
| Ghana | No | No |
| Kenya | Yes | Yes |
| France | No (2016 exception non-commercial) | No |
| Japan | Yes | No |
Stylised low-poly from reference photos is a new work; risk sits in the architecture copyright (modern buildings) and trademarks. Old monuments, markets, natural features are safe anywhere. Respect CC BY-SA of photos fed to image-to-3D.

## E. Cheap or local NPC dialogue
- Small open models: Gemma 4 E2B/E4B (Apache 2.0, 35+ languages), Qwen3.5 0.8B-9B (Apache 2.0, 201 languages), Phi-4-mini (MIT, no Yoruba/Hausa/Igbo), Llama 4 (community licence, no small variant) [P].
- African languages: IrokoBench: Llama 3.1 8B 24.9, Gemma 2 9B 31.9 avg; Gemma 2 27B ~63% of GPT-4o; translate-test +10-13 pts [P]. AfriMMLU: GPT-4o Hausa 67/Igbo 67/Yoruba 61; Gemma 2 27B 43/44/41 [P]. No Pidgin benchmark. Implication: English/Pidgin generation plus human phrasebooks for yo/ha/ig.
- In-browser: WebGPU ~85-88% global; Chrome Android yes, Safari iOS 26+ yes [P]. WebLLM smallest Qwen2 0.5B; 4-bit 1B ~0.7 GB download, ~0.9 GB GPU memory [S]. Nigeria: Tecno 17%, Infinix 15%, Samsung 16%; entry phones 2-4 GB RAM; data ~N431/GB [S]. Local inference only as opt-in on high-end devices.
- Server prices per 1M tokens [P]: Claude Haiku 5.5 $0.10/$0.50 (cache read $0.01); gpt-5-nano $0.05/$0.40 (cached $0.005); Gemini 2.5 Flash-Lite $0.10/$0.40; Groq gpt-oss-20b $0.075/$0.30; OpenRouter :free 20 rpm, 50-1,000 rpd (not production); Vercel AI Gateway list price, no markup.
- Cost per NPC line (600 cached + 100 in + 100 out): ~$0.00005-0.00011; $50-110 per million lines. Cheapest: pre-generate 50-200 lines per NPC per city offline, ship as JSON.

## F. Design precedents
GTA III islands unlock by story; Assassin's Creed viewpoints reveal regions; Pokemon badges; Yakuza districts by chapter. Research: gating works when each unlock is content-rich and soft (teaser visible, reachable by play) [S].

## G. Generation cost for ~1,500 assets (x3 retries)
GPU on-demand Oct 2026 [P]: RunPod 4090 $0.34-0.89/h, A100 80 GB $1.19-1.79, H100 $2.69-3.99; Lambda H100 $3.29-4.29.
TRELLIS.2 on H100 ~$90-120; TRELLIS v1/SPAR3D on 4090 ~$25-50; Tripo API ~$450-1,350; Meshy ~$560-1,700; Sloyd $15-45. Blender automation (1-2 engineer-days) dominates.

## Sources
Blender MCP https://github.com/ahujasid/blender-mcp ; Holodeck https://github.com/allenai/Holodeck ; Infinigen https://github.com/princeton-vl/infinigen ; LayoutGPT https://github.com/weixi-feng/LayoutGPT ; SceneCraft https://proceedings.mlr.press/v235/hu24g.html ; bpy https://pypi.org/project/bpy/ ; TRELLIS https://github.com/microsoft/TRELLIS ; TRELLIS.2 https://github.com/microsoft/TRELLIS.2 ; Hunyuan3D-2.1 https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1 and https://huggingface.co/tencent/Hunyuan3D-2.1/blob/main/LICENSE ; Tencent API https://www.tencentcloud.com/document/product/1284/75540 ; SPAR3D https://huggingface.co/stabilityai/stable-point-aware-3d ; Stability licence https://stability.ai/license ; Meshy https://www.meshy.ai/pricing ; Tripo https://developers.tripo3d.com/en/models/v3-1 ; Hyper3D https://hyper3d.ai/pricing ; Sloyd https://www.sloyd.ai/pricing ; meshoptimizer https://github.com/zeux/meshoptimizer ; OSMF attribution https://osmfoundation.org/wiki/Licence/Attribution_Guidelines ; Overture https://docs.overturemaps.org/attribution/ ; Wikidata https://www.wikidata.org/wiki/Wikidata:Licensing ; FoP https://commons.wikimedia.org/wiki/Commons:Freedom_of_panorama ; Gemma 4 https://huggingface.co/google/gemma-4-E2B-it ; Qwen3.5 https://huggingface.co/Qwen/Qwen3.5-2B ; IrokoBench https://arxiv.org/html/2406.03368 ; AfroBench https://arxiv.org/abs/2311.07978v4 ; WebLLM https://github.com/mlc-ai/web-llm ; caniuse https://caniuse.com/webgpu ; Anthropic pricing https://platform.claude.com/docs/en/about-claude/pricing ; OpenAI https://developers.openai.com/api/docs/pricing ; Gemini https://ai.google.dev/gemini-api/docs/pricing ; OpenRouter limits https://openrouter.ai/docs/api-reference/limits ; RunPod https://www.runpod.io/gpu-cloud/pricing ; Lambda https://lambda.ai/service/gpu-cloud ; GTA III https://en.wikipedia.org/wiki/Grand_Theft_Auto_III
