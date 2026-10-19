# The Allworld skill for Claude

`skills/allworld-spaces/` is an Agent Skill. It teaches Claude to design a home or a group room for Allworld: ask what the player wants, draft a Space Plan ([SPACES.md](SPACES.md)), check it, show a sketch and the price, and import it. Later it will also help build a small game.

## Install

- **Claude Code:** copy the folder `skills/allworld-spaces/` into `~/.claude/skills/`.
- **Claude apps:** upload the folder `skills/allworld-spaces/` as a skill.

## Connect to the game (optional)

With an agent key, Claude can read the player's cash and house, check a plan and import it. Make a key in Settings → Agents and add the Allworld MCP server as described in [AGENTS.md](AGENTS.md). Keep the key secret; revoke it in Settings → Agents if it leaks.

## Two ways to import

1. **By tool.** With the MCP server connected, Claude calls `check_space` and `import_space`.
2. **By paste.** Without a key, Claude gives the player the JSON. In the game: Houses → Furniture, land, stories & neighbours → Design with AI → Import (a group room: Build → Design with AI → Import). The game checks it again with the same rules.

Without a connection, `skills/allworld-spaces/scripts/check-plan.ts` checks a plan on your computer from a clone of the repository.

## Privacy

A plan holds furniture, positions, a title and a look, nothing else. Do not put real names, phone numbers, addresses or links in a title. The agent key never goes in a plan.

## Keeping the reference current

The files in `skills/allworld-spaces/reference/` `catalogue.md`, `house-style.md` and `plots.md` are generated from the game source. After changing furniture, house styles or house plans, run:

```
node --experimental-strip-types scripts/skills/build-skill-reference.ts
```

`--check` verifies without writing. The drift test `src/spaces/skill-reference.test.ts` fails in CI when a committed file differs from the source, and also checks that the example in `space-plan.md` is a valid plan. `space-plan.md` and `SKILL.md` are written by hand.

## The house skill: copy a real house

`public/skills/allworld-house/` is a second skill, served by the game at `/skills/allworld-house/SKILL.md` so a player's AI can read
it by its address (Houses → Copy my real house → Copy the instructions for my AI). It teaches an AI to turn photos of a real house into
a house in the game: a house description the game builds (`reference/house-spec.md`), or a whole-house .glb made in Blender
(`scripts/build_house.py`, `scripts/project_photos.py`), checked with the game's own check (`scripts/check_model.mjs`) and sent with
the player's agent key (`scripts/upload.mjs`, a one-time upload link). It also covers worlds and their scripts (`reference/worlds.md`).

`reference/house-spec.md`, `reference/limits.md`, `scripts/check_model.mjs` and `index.json` are generated from the game source:

```
node --experimental-strip-types scripts/skills/build-house-skill.ts
```

`src/spaces/house-skill.test.ts` fails in CI when they are stale, when SKILL.md names a file that is not there, or when the worked
example is not a house the game takes unchanged. Details: [HOUSE-FROM-PHOTOS.md](HOUSE-FROM-PHOTOS.md).
