/**
 * The Worker host does not have an open developer mode, and a deployment that carries the Node host's setting for one is
 * misconfigured: it refuses every request instead of ignoring the setting (the setting would otherwise look as if it were
 * working). Nothing of the open-mode code is imported here or anywhere under deploy/ (server/open-dev.test.ts checks the
 * import graph). Portable: no imports.
 */
const SETTING = 'ALLWORLD_OPEN_DEV';

/** A 503 when the environment carries the setting (any value), otherwise null. */
export function openDevRefusal(env: object | null | undefined): Response | null {
  if (!env || !(SETTING in env) || (env as Record<string, unknown>)[SETTING] === undefined) return null;
  return new Response(`This deployment is misconfigured: ${SETTING} is a local development setting and is never honoured here. Remove it.`, { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
