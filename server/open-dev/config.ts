/**
 * OPEN DEV MODE: the setting, and the rules for when it may be on. Node host only: nothing in deploy/ imports this
 * directory (server/open-dev.test.ts and scripts/check-joinallworld-source.mjs both check it).
 *
 *   ALLWORLD_OPEN_DEV=1   a local development build with the gameplay gates relaxed (docs/DEVELOPING.md, "Open mode").
 *
 * IT FAILS CLOSED. The setting being PRESENT at all (any value, even empty) means "open mode was asked for": the host then
 * either runs it, when every condition below holds, or refuses to start with a message. It is never ignored and never half applied.
 *   - the value is exactly "1" (to turn it off, remove it);
 *   - the server is bound to a loopback address (checked where it listens: server.ts guards `listen`);
 *   - the public origin, when one is set, is a loopback origin;
 *   - the host is not told to trust a reverse proxy (TRUST_PROXY), which would mean it is reached from elsewhere.
 */
import { createHash } from 'node:crypto';

export const OPEN_DEV_ENV = 'ALLWORLD_OPEN_DEV';
/** How many times faster than the clock the waits run (flights, shifts, cooldowns). 1 is real time. */
export const OPEN_DEV_SPEED_ENV = 'ALLWORLD_OPEN_DEV_SPEED';
/** What a new life starts with, in naira. */
export const OPEN_DEV_CASH_ENV = 'ALLWORLD_OPEN_DEV_CASH';
/** The address `npm run start:open` binds (loopback only; anything else is refused). */
export const OPEN_DEV_BIND_ENV = 'ALLWORLD_OPEN_DEV_BIND';
/** Present in the built output only if open-mode code was bundled into it: the release guards look for it. */
export const OPEN_DEV_MARKER = 'allworld-open-dev-node-only';

export const DEFAULT_SPEED = 10;
export const MAX_SPEED = 1000;
export const DEFAULT_CASH = 50_000_000;
export const MAX_CASH = 500_000_000;
/** The address everyone who is the local operator signs in as. It cannot receive mail: the name is reserved for tests. */
export const OPERATOR_EMAIL = 'operator@open-dev.invalid';
export const operatorHash = (): string => createHash('sha256').update(OPERATOR_EMAIL).digest('hex');

export class OpenDevRefusal extends Error {
  constructor(reason: string) { super(`Open dev mode refused to start: ${reason} Remove ${OPEN_DEV_ENV} to run the normal game.`); this.name = 'OpenDevRefusal'; }
}

export interface OpenDevConfig { speed: number; cash: number }

/** Was open mode asked for? Any value counts, so a misspelt value is refused rather than ignored. */
export const openDevAsked = (env: Readonly<Record<string, unknown>> | null | undefined): boolean => env?.[OPEN_DEV_ENV] !== undefined;

const stripBrackets = (host: string): string => host.replace(/^\[(.*)\]$/, '$1');
/** A host name or address that can only be this machine: localhost, *.localhost, 127.x.x.x, ::1 (with or without a port or brackets). */
export function isLoopbackHost(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  let host = value.trim().toLowerCase();
  if (!host) return false;
  if (host.startsWith('[')) host = host.slice(0, host.indexOf(']') + 1);
  else if ((host.match(/:/g) ?? []).length === 1) host = host.replace(/:\d{1,5}$/, '');
  host = stripBrackets(host).replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '::ffff:127.0.0.1') return true;
  const parts = host.split('.');
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255) && parts[0] === '127';
}
/** An http(s) origin whose host is loopback. */
export function isLoopbackOrigin(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  try { const url = new URL(value.trim()); return (url.protocol === 'http:' || url.protocol === 'https:') && isLoopbackHost(url.host); } catch { return false; }
}

function whole(env: Readonly<Record<string, unknown>>, name: string, fallback: number, least: number, most: number): number {
  const given = env[name];
  if (given === undefined || given === '') return fallback;
  const text = typeof given === 'string' ? given.trim() : '';
  if (!/^\d{1,12}$/.test(text) || Number(text) < least || Number(text) > most) throw new OpenDevRefusal(`${name} must be a whole number from ${least} to ${most}.`);
  return Number(text);
}

/** The conditions that do not depend on where the server listens. Throws OpenDevRefusal. */
export function readOpenDev(env: Readonly<Record<string, unknown>>, { publicOrigin, trustProxy }: { publicOrigin: unknown; trustProxy: boolean }): OpenDevConfig {
  if (env[OPEN_DEV_ENV] !== '1') throw new OpenDevRefusal(`${OPEN_DEV_ENV} is set to something other than 1.`);
  if (typeof publicOrigin === 'string' && publicOrigin.trim() && !isLoopbackOrigin(publicOrigin)) throw new OpenDevRefusal('the public origin is not a localhost address.');
  if (trustProxy) throw new OpenDevRefusal('this server is told to trust a reverse proxy, so it is not only reachable from this machine.');
  return { speed: whole(env, OPEN_DEV_SPEED_ENV, DEFAULT_SPEED, 1, MAX_SPEED), cash: whole(env, OPEN_DEV_CASH_ENV, DEFAULT_CASH, 1000, MAX_CASH) };
}
