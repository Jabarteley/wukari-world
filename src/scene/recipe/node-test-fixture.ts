import '../body/native-test-fixture.ts';
import { nativeTestDocument } from '../body/native-test-fixture.ts';
import { imageHeaderBitmap, recipeGeometryCanvas } from './image-header-fixture.ts';

Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: imageHeaderBitmap });
if (typeof document === 'undefined') Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: {
  ...nativeTestDocument,
  createElement: (tag: string) => tag === 'canvas' ? recipeGeometryCanvas() : nativeTestDocument.createElement(tag),
} });
