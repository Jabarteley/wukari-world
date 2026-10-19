const PAGES = {
  '/county': 'county/index.html',
  '/cities': 'cities/index.html',
  '/cities/scenes': 'cities/scenes/index.html',
} as const;

/** The inspection entries use the same address on the Node and asset-binding hosts. */
export function sceneCataloguePage(pathname: string): string | null {
  const path = pathname.replace(/\/(?:index\.html)?$/, '');
  return Object.entries(PAGES).find(([key]) => key === path)?.[1] ?? null;
}
