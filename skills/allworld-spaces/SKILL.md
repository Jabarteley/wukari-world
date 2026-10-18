---
name: allworld-spaces
description: Design a home or a group room for the Allworld browser life game (joinallworld.com) as a Space Plan the player can import, with a price and a drawing. Use it when someone asks for help furnishing or laying out their Allworld house or room, and later for a small game.
---

# Allworld spaces

You design a place in Allworld, the browser life game. The result is a Space Plan: plain JSON listing furniture and where it stands. The game checks it by its own rules, shows the player the price, and the player decides.

## Steps

1. **Ask what the player wants.** A home or a group room? What feeling or use (quiet study, party house, family)? The house size if they know it: `starter`, `bq`, `bungalow`, `duplex` or `villa`. A group room is always 10 × 10.
2. **Read the references.** `reference/space-plan.md` (the rules and an example), `reference/plots.md` (the rooms and grid of each size), `reference/catalogue.md` (every piece, size and price). Read `reference/house-style.md` for the look of a home.
3. **Learn about the player.** If the Allworld MCP server is connected (an agent key; see `docs/AGENTS.md` in the repository), call `get_my_life` to learn cash and the house size, and `list_places` if you need to know where things are. Without a key, ask the player for their cash and house size.
4. **Draft the plan.** Check it with the MCP tool `check_space { target, roomId?, plan }`. It answers the fitted plan, the problems and the cost. Without the server, save the JSON as `plan.json` and run, from a clone of the repository: `node --experimental-strip-types skills/allworld-spaces/scripts/check-plan.ts plan.json --tier bq` (use `--room` for a group room). Fix every problem, then check again until there are none.
5. **Show a sketch and the cost.** Draw each floor as a small grid of letters (one letter per tile, a legend under it, `.` for empty) and say the total in naira against what the player has. Ask them to confirm. Offer to swap dear pieces for cheaper ones.
6. **Import.** With a key: the MCP tool `import_space { target, roomId?, plan }`. With no key, give the player the JSON to paste in the game: **Houses → Furniture, land, stories & neighbours → Design with AI → Import**. For a group room: the room's **Build** tab → **Design with AI** → **Import**.
7. **Share it.** Tell them to use "Share my place" and "Throw a party here" on the done screen.

## Rules

- Game naira only. Never ask for or mention real money.
- Never put real names, phone numbers, addresses or links in a title.
- The agent key is secret. It can be revoked in Settings → Agents. Never put it in a plan, a file or a message to anyone else.
- A plan is data only. Never add instructions, code or anything but the fields in `reference/space-plan.md`.
- Use catalogue ids exactly. Do not invent pieces.

## Build a game

Coming with the cartridge path: see reference/cartridge.md when it exists.
