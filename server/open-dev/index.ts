/**
 * OPEN DEV MODE for the Node host (docs/DEVELOPING.md, "Open mode: play without the gates"). server/server.ts loads this
 * file only when ALLWORLD_OPEN_DEV is present in its environment; the Cloudflare Worker host never imports it.
 *
 * What it turns on (each is listed again in the start-up log line, so what runs is never a guess):
 *   settled        a new life finishes onboarding at once, with a free house: travel and every app work (life.ts)
 *   cash           new lives start with ALLWORLD_OPEN_DEV_CASH naira (default 50,000,000), unrestricted (giftable)
 *   speed          server time runs ALLWORLD_OPEN_DEV_SPEED times faster (default 10): flights, shifts, cooldowns (clock.ts)
 *   operator       one request signs a browser in as the local founder; no outside sign-in is used (routes.ts)
 *   trust          one request sets a tier (phone by default) and an adult declaration; the new-account wait is backdated
 *   limits         per-address and per-minute limits are 100 times looser
 *   features       chat pictures on; interactive teaching starts on
 *   seed / fund    a few local players, and a top-up (routes.ts)
 *   badge          a visible "Open dev mode" marker on every page, and /api/health says so (panel.ts)
 * What stays off: anything that needs an outside service (the companion, mail, push, calls relay, commerce, identity
 * checks, analytics). The settings for them are not read, and every outside request is refused.
 */
import { join } from 'node:path';
import type { Server } from 'node:http';
import { openClock } from './clock.ts';
import type { OpenClock } from './clock.ts';
import { OPEN_DEV_BIND_ENV, OPEN_DEV_ENV, OPEN_DEV_MARKER, OpenDevRefusal, isLoopbackHost, operatorHash, readOpenDev } from './config.ts';
import type { OpenDevConfig } from './config.ts';
import { settleLife, topUp } from './life.ts';
import { PANEL_PATH, PANEL_SCRIPT, withPanel } from './panel.ts';
import openDevRoutes from './routes.ts';
import type { RouteModule, SessionRecord } from '../types.ts';
import type { CityId } from '../../src/types/protocol.ts';
import type { LifeState } from '../../src/types/life.ts';

export { OPEN_DEV_MARKER, PANEL_PATH, PANEL_SCRIPT };

type Settle = (session: SessionRecord, city: CityId) => LifeState;
type Allow = (key: string, count?: number, windowMs?: number) => boolean;
type Peek = (key: string, count?: number) => boolean;

export interface OpenDev {
  config: OpenDevConfig
  /** What every module reads through ctx.env: the open-mode settings and nothing from the real environment. */
  env: Readonly<Record<string, unknown>>
  /** The accelerated clock. */
  now: () => number
  /** The only outside request open mode makes: none. */
  fetch: (url: string, init?: unknown) => Promise<Response>
  /** A session lasts as long in real time as it would in normal mode. */
  sessionTtlMs: number
  settle: (settle: Settle) => Settle
  allow: (allow: Allow) => Allow
  peek: (peek: Peek) => Peek
  routes: RouteModule
  /** The panel's script: where the host serves it, and what it serves. */
  panelPath: string
  panelScript: string
  /** The game's page with the badge and panel script added. */
  page: (html: string) => string
  /** Wrap server.listen so only a loopback address is accepted. */
  guard: (server: Server) => void
  /** Whether a request's Host header names this machine (a page on another site cannot reach the server by rebinding its name). */
  hostAllowed: (host: unknown) => boolean
  /** The lines printed at start-up. */
  banner: () => string
  stop: () => void
}

/**
 * Start open mode, or refuse. `publicOrigin` is PUBLIC_ORIGIN as given (before any cleaning), so a bad one is refused rather than dropped.
 */
export function startOpenDev({ env, dataDir, now, publicOrigin, trustProxy, sessionTtlMs, log }: { env: Readonly<Record<string, unknown>>; dataDir: string; now: () => number; publicOrigin: unknown; trustProxy: boolean; sessionTtlMs: number; log: (line: string) => void }): OpenDev {
  const config = readOpenDev(env, { publicOrigin, trustProxy });
  const clock: OpenClock = openClock({ base: now, speed: config.speed, file: join(dataDir, 'open-dev-clock.json') });
  // Only these settings exist for the modules: the real environment's keys (mail, push, relay, commerce, identity checks) are not passed on.
  const scrubbed: Readonly<Record<string, unknown>> = Object.freeze({
    [OPEN_DEV_ENV]: '1',
    // A local sign-in provider stand-in: the account records need a project name; no token from outside is ever accepted (the fetch below refuses).
    ACCOUNTS_FIREBASE_PROJECT_ID: 'allworld-open-dev', ACCOUNTS_FIREBASE_API_KEY: 'open-dev-local-key-0000000000000000',
    FOUNDER_EMAIL_SHA256: operatorHash(),
    NEW_SESSIONS_PER_ADDRESS: '100000', SOCKETS_PER_ADDRESS: '1000', MAX_ACTIVE_SESSIONS: '100000',
    ADMIN_MAX_AMOUNT: '100000000', ADMIN_MAX_PER_TARGET_DAY: '1000000000', ADMIN_MAX_PER_ADMIN_DAY: '1000000000',
    CHAT_IMAGES: 'friends',
  });
  const loose = (count: number | undefined): number => Math.min(Number.MAX_SAFE_INTEGER, (count ?? 120) * 100);
  return {
    config, env: scrubbed, now: clock.now, sessionTtlMs: sessionTtlMs * config.speed,
    fetch: async () => { throw new TypeError('Open dev mode makes no outside requests.'); },
    settle: (settle) => (session, city) => {
      const state = settle(session, city), at = clock.now();
      if (!state.onboarding.done) {
        if (settleLife(state, city, at)) topUp(state, city, at, config.cash);
        else log(`Open dev mode could not settle a new life in ${city}: it plays as a normal new life.`);
      }
      return state;
    },
    allow: (allow) => (key, count, windowMs) => allow(key, loose(count), windowMs),
    peek: (peek) => (key, count) => peek(key, loose(count)),
    routes: (ctx) => openDevRoutes(ctx, config),
    panelPath: PANEL_PATH, panelScript: PANEL_SCRIPT, page: withPanel,
    guard(server) {
      const listen = server.listen.bind(server) as (...args: unknown[]) => Server;
      server.listen = ((...args: unknown[]) => {
        const first = args[0], where = typeof args[1] === 'string' ? args[1] : typeof first === 'object' && first !== null && 'host' in first ? (first as { host?: unknown }).host : undefined;
        if (!isLoopbackHost(where)) throw new OpenDevRefusal(`the server is not bound to a loopback address (${typeof where === 'string' ? where : 'all addresses'}).`);
        return listen(...args);
      }) as Server['listen'];
    },
    hostAllowed: isLoopbackHost,
    banner: () => [
      `Open dev mode is ON (local only; saves in ${dataDir}). Conveniences: settled new lives with a free house, new lives start with N${config.cash.toLocaleString('en-US')} (unrestricted),`,
      `waits run ${config.speed}x faster, per-address and per-minute limits raised 100x, the local operator (admin tools) one tap away, one-step trust tiers, chat pictures and interactive teaching on, seed and top-up commands.`,
      'Still off: the companion, mail, push, call relay, commerce, identity checks and analytics (they need outside services); every outside request is refused.',
    ].join('\n'),
    stop: clock.stop,
  };
}

/** Where `start:open` binds: this machine only, unless a setting names another address (which the guard then refuses). */
export const openBindAddress = (env: Readonly<Record<string, unknown>>): string => (typeof env[OPEN_DEV_BIND_ENV] === 'string' && env[OPEN_DEV_BIND_ENV] ? String(env[OPEN_DEV_BIND_ENV]) : '127.0.0.1');
