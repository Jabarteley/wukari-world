import { existsSync, realpathSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute } from 'node:path';

export function insideSandbox(path, sandbox) {
  const target = resolve(path), root = realpathSync(resolve(sandbox));
  let ancestor = target;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const actual = resolve(realpathSync(ancestor), relative(ancestor, target));
  const delta = relative(root, actual);
  if (!delta || delta.startsWith('..') || isAbsolute(delta)) {
    throw Error('Output must be a strict child of the explicit sandbox; symlink escapes are rejected');
  }
  return target;
}

export function remapTable(table, source, extractRoot) {
  return {
    ...table,
    root: resolve(source),
    targets: table.targets.map(target => {
      const key = target.extractKey ?? target.id;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) throw Error('Invalid extract key');
      const next = { ...target, extractDirectory: resolve(extractRoot, key) };
      delete next.extractKey;
      return next;
    }),
  };
}
