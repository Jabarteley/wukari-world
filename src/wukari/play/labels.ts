import * as T from 'three';
import type { Study } from './model.ts';
export function signTexture(text: string, subtitle: string) { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128; const c = canvas.getContext('2d')!; c.fillStyle = '#204c42'; c.fillRect(0, 0, 512, 128); c.strokeStyle = '#e4ead0'; c.lineWidth = 5; c.strokeRect(5, 5, 502, 118); c.fillStyle = '#fff7dc'; c.font = 'bold 27px sans-serif'; c.textAlign = 'center'; c.fillText(text, 256, 51, 480); c.font = '17px sans-serif'; c.fillText(subtitle, 256, 91, 480); const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture; }
export function roadLabels(study: Study) { const group = new T.Group(), materials: T.SpriteMaterial[] = [], seen = new Set<string>(); for (const r of study.roads) {
    if (!r.tags.name || seen.has(r.tags.name))
        continue;
    seen.add(r.tags.name);
    const p = r.points[Math.floor(r.points.length / 2)]!, texture = signTexture(r.tags.name, r.tags.ref ? `${r.tags.ref} / OSM name` : 'OSM road name'), material = new T.SpriteMaterial({ map: texture, depthTest: true }), sprite = new T.Sprite(material);
    sprite.position.set(p.x, 5, p.z);
    sprite.scale.set(13, 3.25, 1);
    group.add(sprite);
    materials.push(material);
} return { group, dispose() { materials.forEach(m => { m.map?.dispose(); m.dispose(); }); group.removeFromParent(); } }; }
