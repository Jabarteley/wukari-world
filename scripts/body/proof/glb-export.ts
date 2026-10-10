// Writes a three.js scene as a .glb from Node (the exporter expects a browser's Blob and FileReader; both are small shims here).
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type * as THREE from 'three';

class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  readAsArrayBuffer(blob: Blob): void { void blob.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); }, (e: unknown) => this.onerror?.(e)); }
  readAsDataURL(blob: Blob): void { void blob.arrayBuffer().then((r) => { this.result = `data:${blob.type};base64,${Buffer.from(r).toString('base64')}`; this.onloadend?.(); }, (e: unknown) => this.onerror?.(e)); }
}
(globalThis as unknown as { FileReader: unknown }).FileReader ??= NodeFileReader;

export async function exportGlb(scene: THREE.Object3D): Promise<Buffer> {
  const result = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false, includeCustomExtensions: false });
  return Buffer.from(result as ArrayBuffer);
}
