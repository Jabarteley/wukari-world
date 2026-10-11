// Is the address a short address (/abuja, /games, /unilag, /signup …) rather than the plain page or an invite or share link? Kept apart
// from entryModel.ts because the first download reads it (warmLanding.ts) and must not carry the entry page's words.
export function isPathAddress(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '')
  if (path === '' || path === '/index.html') return false
  return !/^\/(v|s)\/[^/]+$/.test(path)
}
