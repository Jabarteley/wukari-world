/**
 * WHAT AN AGENT MAY DO, in one place (docs/AGENTS.md). An agent plays like a person, so it may run every player-facing action the rules
 * engine dispatches and call every player-facing route: the list of allowed action types is READ FROM THE REGISTRY, so a new action is
 * included automatically. What is left out is this short deny list, each item with its reason. Everything the game restricts by age or trust
 * tier stays restricted exactly as for any account: those rules run in the same code paths, and nothing here bypasses them.
 */
import { actionTypes, serverOnlyReason } from '../../src/game/registry.ts';
import { ACTION_CATALOGUE } from './action-catalogue.generated.ts';

export interface Denied { id: string; label: string; reason: string; prefixes: readonly string[] }

/** The routes an agent may not call, and why. Matched by path prefix, any method. */
export const AGENT_DENY: readonly Denied[] = Object.freeze([
  { id: 'account-security', label: 'Account security and identity', prefixes: ['/api/account'],
    reason: 'Changing or resetting a password or e-mail, sign-in methods, signing out, exporting or deleting the account are the person\'s own: an agent never holds a password or a browser session.' },
  { id: 'contact-and-age', label: 'E-mail address, notifications and the age answer', prefixes: ['/api/growth/email', '/api/growth/push', '/api/growth/comeback', '/api/growth/consent'],
    reason: 'The e-mail address, push subscriptions and the "18 or older" answer are facts about the real person behind an account, and the age answer gates adult features.' },
  { id: 'verification', label: 'Phone and ID verification', prefixes: ['/api/trust/check', '/api/trust/phone', '/api/trust/id', '/api/trust/dojah'],
    reason: 'A phone or ID check proves a real person; an agent cannot take one, and cannot start one for the account it plays for.' },
  { id: 'agent-keys', label: 'Agent keys, claiming and taking over', prefixes: ['/api/agents/keys', '/api/agents/claim', '/api/agents/characters', '/api/agents/mcp'],
    reason: 'A key must never mint, revoke or hand over keys or characters: access is granted by a signed-in person only.' },
  { id: 'operator', label: 'Operator, moderator and admin routes', prefixes: ['/api/mod/', '/api/admin/'],
    reason: 'These are authenticated by the operator\'s own token and are not player features.' },
]);

/** Why a route is refused for an agent, or null when it may be called. */
export function routeDenied(path: string): Denied | null {
  for (const item of AGENT_DENY) if (item.prefixes.some((prefix) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`) || path.startsWith(prefix))) return item;
  return null;
}

/** Every action type an agent may run: all the registry dispatches to a player (a server-only action is run by the server, through the routes). */
export function allowedActionTypes(): string[] {
  return actionTypes().filter((type) => !serverOnlyReason(type));
}
export const mayRunAction = (scopes: readonly string[], type: string): boolean => (scopes.includes('*') || scopes.includes(type)) && allowedActionTypes().includes(type);

const BY_TYPE = new Map(ACTION_CATALOGUE.map(([type, line, payload]) => [type, { line, payload }]));
/** The catalogue of allowed action types: one line and the payload shape each. A type the table does not describe says so. */
export function actionList(): { type: string; description: string; payload: string }[] {
  return allowedActionTypes().map((type) => { const found = BY_TYPE.get(type); return { type, description: found?.line || 'See docs/AGENTS.md.', payload: found?.payload ?? '{ … }' }; });
}
