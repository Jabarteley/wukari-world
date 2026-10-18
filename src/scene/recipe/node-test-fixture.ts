import '../body/native-test-fixture.ts';
import { nativeTestDocument } from '../body/native-test-fixture.ts';
import { imageHeaderBitmap, recipeGeometryCanvas } from './image-header-fixture.ts';

Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: imageHeaderBitmap });

interface GeometryElement {
  children: unknown[];
  parentElement: GeometryElement | null;
  appendChild(child: unknown): unknown;
  [key: string]: unknown;
}

function geometryElement(tag: string): GeometryElement {
  const children: unknown[] = [], classes = new Set<string>(), selectors = new Map<string, GeometryElement>();
  const style = Object.assign(Object.create(null) as Record<string, string>, {
    setProperty(name: string, value: string) { style[name] = value; },
    removeProperty(name: string) { const value = style[name] ?? ''; delete style[name]; return value; },
    getPropertyValue(name: string) { return style[name] ?? ''; },
  });
  const element = {
    tagName: tag.toUpperCase(), className: '', textContent: '', hidden: false, parentElement: null as GeometryElement | null,
    dataset: {} as Record<string, string>, style, children, innerHTML: '',
    classList: {
      add(...names: string[]) { names.forEach(name => classes.add(name)); },
      remove(...names: string[]) { names.forEach(name => classes.delete(name)); },
      toggle(name: string, force?: boolean) { const on = force ?? !classes.has(name); if (on) classes.add(name); else classes.delete(name); return on; },
      contains(name: string) { return classes.has(name); },
    },
    setAttribute() {}, addEventListener() {}, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {},
    appendChild(child: unknown) {
      if (child && typeof child === 'object') (child as { parentElement?: unknown }).parentElement = element;
      children.push(child); return child;
    },
    append(...items: unknown[]) { items.forEach(item => element.appendChild(item)); },
    replaceChildren(...items: unknown[]) { children.splice(0); element.append(...items); },
    remove() {
      const parent = element.parentElement;
      if (parent) { const at = parent.children.indexOf(element); if (at >= 0) parent.children.splice(at, 1); }
      element.parentElement = null;
    },
    querySelector(selector: string) {
      if (selector !== '.scene-stick' && selector !== '.scene-hint') return null;
      let found = selectors.get(selector);
      if (!found) {
        found = geometryElement(selector === '.scene-stick' ? 'div' : 'p');
        found.appendChild(geometryElement(selector === '.scene-stick' ? 'i' : 'span'));
        selectors.set(selector, found); element.appendChild(found);
      }
      return found;
    },
    closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} }; },
  };
  Object.defineProperty(element, 'firstElementChild', { enumerable: true, get: () => children[0] ?? null });
  return tag === 'canvas' ? Object.assign(element, recipeGeometryCanvas()) : element;
}

if (typeof document === 'undefined') {
  const body = geometryElement('body'), head = geometryElement('head');
  Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: {
    ...nativeTestDocument,
    body, head,
    createElement: geometryElement,
    createElementNS(namespace: string, tag: string) { return tag === 'img' ? nativeTestDocument.createElementNS(namespace, tag) : geometryElement(tag); },
    getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
  } });
}
