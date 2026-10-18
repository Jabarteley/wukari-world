import * as THREE from 'three';
import type { PbrSet } from './textures.ts';

/**
 * Walls: a physically based plaster (or concrete) with the facade drawn in the shader from the wall's metres (uv) and its
 * per-building vec4 (buildings.ts): storeys, bays, windows with frames, sills, lintels and glass that reflects the sky; burglar
 * bars and curtains on homes; shop openings and roller shutters at street level; floor bands on concrete frames; curtain-wall
 * mullions on glass towers; grime near the ground and rain streaks under sills. `night` (0-1) lights a share of the windows.
 */
export interface FacadeUniforms { night: { value: number } }

export function createFacadeMaterial(plaster: PbrSet): { material: THREE.MeshStandardMaterial; uniforms: FacadeUniforms } {
  const uniforms: FacadeUniforms = { night: { value: 0 } };
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, map: plaster.map, normalMap: plaster.normalMap, roughnessMap: plaster.roughnessMap,
    normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1, metalness: 0,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = uniforms.night;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 facade;\nvarying vec4 vFacade;\nvarying vec2 vWall;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvFacade = facade;\nvWall = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uNight;
varying vec4 vFacade;
varying vec2 vWall;
float fhash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float box(vec2 p, vec2 lo, vec2 hi) { vec2 s = step(lo, p) * step(p, hi); return s.x * s.y; }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = fhash(vec3(i, 1.0)), b = fhash(vec3(i + vec2(1, 0), 1.0)), c = fhash(vec3(i + vec2(0, 1), 1.0)), d = fhash(vec3(i + vec2(1, 1), 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
float fbm(vec2 p) { return vnoise(p) * 0.55 + vnoise(p * 2.1) * 0.3 + vnoise(p * 4.3) * 0.15; }
`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
float glassMask = 0.0; vec3 lit = vec3(0.0);
{
  float style = vFacade.x, storey = max(vFacade.y, 2.5), seed = vFacade.z, roofLine = vFacade.w;
  float u = vWall.x, v = vWall.y;
  // The wall's own weathering, everywhere: darker and dirtier near the ground, faint vertical streaks.
  float grime = mix(0.62, 1.0, smoothstep(0.0, 1.1, v));
  float streak = fhash(vec3(floor(u * 0.6), seed * 91.0, 3.0));
  grime *= 1.0 - 0.08 * streak * smoothstep(roofLine, roofLine - 6.0, v);
  if (style < 1.5 || style > 2.5) {
    // Patches of repainting and sun-faded paint.
    float patchy = fbm(vec2(u, v) * 0.18 + seed * 17.0);
    diffuseColor.rgb *= 0.86 + 0.26 * patchy;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.04, 0.98, 0.9), smoothstep(0.55, 0.8, patchy));
    // Dark mould streaks running down from the roof line (rain off the parapet), broken by noise.
    float drip = fbm(vec2(u * 0.38 + seed * 9.0, v * 0.08)) * smoothstep(roofLine - 6.0 - 5.0 * fbm(vec2(u * 0.15, seed)), roofLine, v);
    diffuseColor.rgb *= 1.0 - 0.3 * smoothstep(0.4, 0.8, drip);
    // Damp tide line at the foot of the wall.
    float damp = smoothstep(0.9 + 0.5 * vnoise(vec2(u * 0.8, seed)), 0.0, v);
    diffuseColor.rgb *= 1.0 - 0.3 * damp * (0.6 + 0.4 * fbm(vec2(u * 2.0, v * 3.0)));
  }
  if (roofLine > 0.0 && v < roofLine - 0.35) {
    float floorIndex = floor(v / storey), fy = fract(v / storey);
    float bay = style > 1.5 ? 1.5 : style > 0.5 ? 3.2 : 3.4;
    float bayIndex = floor(u / bay), fx = fract(u / bay);
    float h = fhash(vec3(floorIndex, bayIndex, seed * 113.0));
    vec2 cell = vec2(fx * bay, fy * storey); // metres inside the cell
    bool ground = floorIndex < 0.5;
    vec2 lo, hi;
    if (style > 1.5) { lo = vec2(0.04, 0.12); hi = vec2(bay - 0.04, storey - 0.1); }
    else if (style > 0.5 && style < 1.5) { lo = vec2(0.2, 0.9); hi = vec2(bay - 0.2, storey - 0.55); }
    else { lo = vec2(bay * 0.27, 0.95); hi = vec2(bay * 0.73, 2.35); }
    float shop = (style > 2.5 && ground) ? 1.0 : 0.0;
    if (shop > 0.5) { lo = vec2(0.25, 0.12); hi = vec2(bay - 0.25, 2.75); }
    float inWin = box(cell, lo, hi);
    float frame = box(cell, lo - 0.07, hi + 0.07) - inWin;
    float sill = box(cell, vec2(lo.x - 0.12, lo.y - 0.12), vec2(hi.x + 0.12, lo.y - 0.04)) * (style > 1.5 ? 0.0 : 1.0);
    float lintel = box(cell, vec2(lo.x - 0.1, hi.y + 0.07), vec2(hi.x + 0.1, hi.y + 0.2)) * (style < 0.5 || style > 2.5 ? 1.0 : 0.0);
    // Floor bands on concrete frames; spandrels and mullions on glass.
    if (style > 0.5 && style < 1.5 && fy * storey < 0.32) diffuseColor.rgb *= 0.86;
    if (style > 1.5) { inWin = 1.0 - box(cell, vec2(-1.0, -1.0), vec2(bay + 1.0, 0.12)); frame = step(bay - 0.04, cell.x) + step(cell.x, 0.04) + (1.0 - inWin); frame = min(frame, 1.0); inWin *= 1.0 - frame; }
    if (shop > 0.5) {
      // Roller shutter on some shops: pale corrugated metal, otherwise a dark interior behind glass.
      if (h > 0.55 && inWin > 0.5) { diffuseColor.rgb = vec3(0.55, 0.56, 0.55) * (0.85 + 0.15 * step(0.5, fract(cell.y * 12.0))); roughnessFactor = 0.55; metalnessFactor = 0.5; inWin = 0.0; }
    }
    diffuseColor.rgb *= 1.0 - 0.35 * frame * (style > 1.5 ? 0.6 : 1.0);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78), sill * 0.5);
    diffuseColor.rgb *= 1.0 - 0.12 * lintel;
    // Rain streaks under each sill.
    float under = box(cell, vec2(lo.x, lo.y - 1.4), vec2(hi.x, lo.y - 0.12));
    diffuseColor.rgb *= 1.0 - 0.1 * under * fhash(vec3(floor(cell.x * 6.0), floorIndex, seed));
    if (inWin > 0.5) {
      glassMask = 1.0;
      vec3 interior = vec3(0.025, 0.028, 0.03) * (0.6 + 0.8 * h);
      // Homes: some curtains drawn (pale), burglar bars over the glass.
      if (style < 0.5 || style > 2.5) {
        if (h > 0.62 && shop < 0.5) interior = mix(vec3(0.42, 0.36, 0.3), vec3(0.6, 0.62, 0.68), fhash(vec3(h, seed, 7.0))) * 0.55;
        float bars = step(0.86, fract((cell.x - lo.x) / 0.14)) + step(0.9, fract((cell.y - lo.y) / 0.55));
        interior = mix(interior, vec3(0.07, 0.07, 0.065), min(bars, 1.0) * (shop > 0.5 ? 0.0 : 1.0));
      }
      if (style > 1.5) interior = mix(vec3(0.03, 0.04, 0.05), diffuseColor.rgb * 0.35, 0.6);
      diffuseColor.rgb = interior;
      roughnessFactor = style > 1.5 ? 0.04 : 0.08;
      metalnessFactor = style > 1.5 ? 0.85 : 0.35;
      // About a third of windows lit; a building in three is dark (no grid power, no generator running).
      float powered = step(0.3, fhash(vec3(seed * 31.0, 2.0, 5.0)));
      float on = step(0.66, fhash(vec3(floorIndex, bayIndex, seed * 7.0))) * uNight * powered;
      vec3 bulb = mix(vec3(1.0, 0.72, 0.42), vec3(0.78, 0.88, 1.0), step(0.5, fhash(vec3(bayIndex, floorIndex, seed * 3.0))));
      lit = bulb * on * (0.25 + 0.55 * h) * (shop > 0.5 ? 1.8 : 1.0);
    }
  }
  diffuseColor.rgb *= grime;
}
`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, glassMask));')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += lit;');
  };
  material.customProgramCacheKey = () => 'realworld-facade-4';
  return { material, uniforms };
}
