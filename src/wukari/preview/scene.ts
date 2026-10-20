import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { rings, toWorld, wayPositions } from '../geography.ts';
import type { Dataset, Position } from '../geography.ts';

/** Flat linework only: no guessed road width, building height, elevation, gates or player spawn. */
export function createPreview(host: HTMLElement, data: Dataset): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#17242e');
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1e7);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
  const all = new THREE.Group(); scene.add(all);
  const draw = (points: Position[], color: number, y: number): void => {
    const vertices = points.map(p => { const v = toWorld(data.origin, p); return new THREE.Vector3(v.x, y, v.z); });
    const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
    all.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })));
  };
  for (const ring of rings(data.extents.lga.feature.geometry)) draw(ring, 0x5fba88, 0);
  for (const way of data.osm.elements) {
    if (way.type !== 'way' || (!way.tags?.highway && !way.tags?.building)) continue;
    const points = wayPositions(way, data.osm.elements);
    if (points && points.length >= 2) draw(points, way.tags?.highway ? 0x77c7ff : 0xc5cbd1, 0.01);
  }
  if (data.extents.campus.geometry) for (const ring of rings(data.extents.campus.geometry)) draw(ring, 0xffc56e, 0.02);
  // Start with campus when available. LGA context remains in the scene, outside the initial framing.
  const focus = data.extents.campus.geometry ?? data.extents.lga.feature.geometry;
  const box = new THREE.Box3();
  for (const ring of rings(focus)) for (const p of ring) { const v = toWorld(data.origin, p); box.expandByPoint(new THREE.Vector3(v.x, 0, v.z)); }
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const distance = Math.max(size.x, size.z, 50) * 1.8;
  controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(0, distance, distance * 0.5)); controls.update();
  const resize = (): void => { const { width, height } = host.getBoundingClientRect(); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); renderer.setSize(width, height, false); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
  return () => {
    renderer.setAnimationLoop(null); observer.disconnect(); controls.dispose();
    all.traverse(object => { if (object instanceof THREE.Line) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } });
    renderer.dispose(); renderer.domElement.remove();
  };
}
