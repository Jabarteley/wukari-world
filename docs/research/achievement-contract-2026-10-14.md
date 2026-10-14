# Achievement contract for agents and clients

Achievements are character-scoped recognition records. They are derived from validated gameplay
events, exposed in the agent's existing `get_goals` response, and do not change cash, stars, or
mission payout economics.

## The six outcome criteria

The authoritative catalogue is `src/game/content/achievements.ts:3-10`:

| id | player outcome | event source |
| --- | --- | --- |
| `wayfinder` | Reach three different non-home places | `travel.arrived`, deduplicated by city and venue |
| `familiar-face` | Make a friend through one confirmed relationship milestone | `friend.made`, deduplicated by resident/player and id |
| `first-shift` | Finish one paid job shift or paid campus job | `shift.completed` or `campus.job.completed`, pay must be positive |
| `home-maker` | Buy and place one furniture item in the home | `item.bought`, filtered to `kind === 'furniture'` and deduplicated by item |
| `table-regular` | Finish three counted table games; winning is not required | `table.played` |
| `curious-mind` | Reach skill level two through a recorded level-up | `skill.levelup`, using the maximum recorded level |

The listener mapping and qualifying conditions are implemented at
`src/game/systems/achievements.ts:53-60`. Progress is capped at each definition's target and
stops after the earned receipt exists (`src/game/systems/achievements.ts:17-30`). This means a
button click, an unvalidated client payload, or a retrospective scan must not grant one.

## Scope, assistance, and permanent receipt

Every definition declares `scope: 'character'`, `assistance: 'allowed-and-recorded'`, and
`retirement: 'earned-receipts-remain'` (`src/types/achievements.ts:22-34`). The state is stored in
the life and includes progress, earned receipts, pins, and one displayed plaque
(`src/types/achievements.ts:14-20`). Assistance is recorded as an origin on in-progress rows and
copied to the final receipt. The origin is taken from the trusted execution context, never from a
client field (`src/game/systems/achievements.ts:11-15`, `src/game/systems/achievements.ts:25-31`).

An earned receipt is permanent in the contract: `{ id, version: 1, earnedAt, cityId, origins }`;
the emitted reward identifier is `achievement:v1:<id>` (`src/game/systems/achievements.ts:29-32`).
Sanitization accepts only the known id, version, valid timestamp, and valid city, so a later
catalogue retirement must keep already-earned receipts while it may stop new progress
(`src/game/systems/achievements.ts:66-83`). There is no retrospective grant path: the reducer only
advances in response to the registered event listeners, and an existing earned receipt short-circuits
progress (`src/game/systems/achievements.ts:18-23`).

The catalogue's reward text is cosmetic badge/home-plaque recognition, and its module explicitly
states that awards never multiply economic rewards (`src/game/content/achievements.ts:3-4`). No
cash or star grant is emitted by the achievement reducer; the only emitted records are the
`achievement.earned` event and a notice (`src/game/systems/achievements.ts:31-32`).

## Pin and plaque rules

- Pin selection accepts at most three distinct known earned ids; invalid, duplicate, or unearned
  selections fail (`src/game/systems/achievements.ts:35-42`).
- There is exactly one displayed home plaque. Clearing sets it to `null`; setting it requires being
  at home, and the selected id must already be earned (`src/game/systems/achievements.ts:44-50`).
- Sanitization rechecks pins against earned receipts and truncates to three, and rechecks the
  displayed id against earned receipts (`src/game/systems/achievements.ts:81-82`).

## Agent projection

`get_goals` now returns `achievements: view.achievements` alongside the existing `goal`,
`starterGoals`, `missions`, `job`, and `life` keys (`server/agents/tools.ts:157-174`). This is the
full derived view, including `trackingSince`, `earnedCount`, `pinned`, `displayed`, and all six
rows. Existing mission keys remain unchanged. The view contract defines those exact fields at
`src/types/achievements.ts:36-50` and registers the view at `src/types/view.ts:1190-1200`.

Agents can therefore observe progress and recorded origins, but they cannot manufacture completion:
the event listeners receive the engine's execution context, and `get_goals` is read-only. The
achievement action map only permits pinning earned ids and changing the home plaque
(`src/types/achievements.ts:51-55`).
