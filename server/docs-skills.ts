/**
 * OWNER: growth
 * The content of /skills (server/docs-pages.ts writes the page): the AI skills people can give their own assistant to build for Allworld,
 * and how an assistant connects to the game. The house skill is served by the game itself (public/skills/allworld-house/, its file list is
 * index.json there: server/docs-pages.test.ts checks every file is linked); the spaces skill lives in the repository (skills/allworld-spaces/).
 * The tools are the MCP server's (server/agents/tools*.ts, server/spaces/tools.ts). When a skill or a tool is added, add its line here.
 */
import type { GuideSection } from './docs-pages.ts'

const REPO = 'https://github.com/kromate/joinallworld'
const HOUSE = '/skills/allworld-house'

export const HOUSE_SKILL_FILES: readonly { file: string; text: string }[] = [
  { file: 'SKILL.md', text: 'The skill itself: the steps an AI follows from photos to a finished house.' },
  { file: 'reference/photos.md', text: 'The photo checklist to send the player: every side, every room, the door and a window.' },
  { file: 'reference/house-spec.md', text: 'The house description the game builds, with a worked example.' },
  { file: 'reference/limits.md', text: 'The game’s limits for a model and a whole house: megabytes, triangles, pictures and parts.' },
  { file: 'reference/blender.md', text: 'How to build a whole-house model in Blender.' },
  { file: 'reference/privacy.md', text: 'What never goes into a house: no house numbers, signs, faces, plates or names.' },
  { file: 'reference/worlds.md', text: 'Worlds and their scripts, for an AI that builds a world instead.' },
  { file: 'scripts/build_house.py', text: 'Blender script: build the house model from the description.' },
  { file: 'scripts/project_photos.py', text: 'Blender script: put the photos onto the walls.' },
  { file: 'scripts/check_model.mjs', text: 'The game’s own model check, to run before sending.' },
  { file: 'scripts/upload.mjs', text: 'Send the finished model with the player’s agent key.' },
]

export const SKILL_SECTIONS: readonly GuideSection[] = [
  {
    id: 'skills', title: 'Skills',
    intro: 'A skill is a folder of instructions an AI assistant reads to do one job well. These teach an assistant to build things for Allworld on your side, with your own AI.',
    entries: [
      { name: 'Copy my real house', href: `${HOUSE}/SKILL.md`, text: 'Turns photos of a real house into a house in Allworld you can walk through, furnish and invite friends to: a house description from chat alone, or a whole-house 3D model made in Blender. Also builds worlds.', open: 'In the game: Houses → Copy my real house → Copy the instructions for my AI', tag: 'allworld-house' },
      { name: 'Design a space', href: `${REPO}/tree/main/skills/allworld-spaces`, text: 'Designs a home or a group room as a Space Plan with a sketch and a price, checks it by the game’s rules and imports it. Also makes small games.', open: 'In the game: Houses → Design with AI → Import, or a room’s Build tab', tag: 'allworld-spaces' },
    ],
  },
  {
    id: 'house-files', title: 'Copy my real house: the files',
    intro: 'Every file of the house skill, served by the game. An AI can fetch them from the same address as `SKILL.md`.',
    entries: HOUSE_SKILL_FILES.map(({ file, text }) => ({ name: file, href: `${HOUSE}/${file}`, text })),
  },
  {
    id: 'spaces-files', title: 'Design a space: the files',
    intro: 'The spaces skill lives in the game’s public source code.',
    entries: [
      { name: 'SKILL.md', href: `${REPO}/blob/main/skills/allworld-spaces/SKILL.md`, text: 'The skill itself: ask, draft, check, sketch, import and share.' },
      { name: 'reference/space-plan.md', href: `${REPO}/blob/main/skills/allworld-spaces/reference/space-plan.md`, text: 'The Space Plan rules and an example.' },
      { name: 'reference/plots.md', href: `${REPO}/blob/main/skills/allworld-spaces/reference/plots.md`, text: 'The rooms and grid of every house size.' },
      { name: 'reference/catalogue.md', href: `${REPO}/blob/main/skills/allworld-spaces/reference/catalogue.md`, text: 'Every piece of furniture with its size and price.' },
      { name: 'reference/house-style.md', href: `${REPO}/blob/main/skills/allworld-spaces/reference/house-style.md`, text: 'The look of each house style.' },
      { name: 'reference/lite-game.md', href: `${REPO}/blob/main/skills/allworld-spaces/reference/lite-game.md`, text: 'The schema of a small game you can import.' },
      { name: 'reference/cartridge.md', href: `${REPO}/blob/main/skills/allworld-spaces/reference/cartridge.md`, text: 'How to build a bigger game and send it for review.' },
      { name: 'scripts/check-plan.ts', href: `${REPO}/blob/main/skills/allworld-spaces/scripts/check-plan.ts`, text: 'Check a plan on your own computer without connecting to the game.' },
    ],
  },
  {
    id: 'install', title: 'Use a skill',
    entries: [
      { name: 'Claude Code', text: 'Copy the skill’s folder into `~/.claude/skills/`.' },
      { name: 'Claude apps', text: 'Upload the skill’s folder as a skill in your settings.' },
      { name: 'Any other AI', text: 'Give it the address of the skill’s `SKILL.md` and ask it to follow it; it fetches the other files next to it.' },
      { name: 'Without connecting', text: 'Both skills work in chat alone: the AI gives you the result and you paste it into the game, which checks it again by its own rules.' },
    ],
  },
  {
    id: 'connect', title: 'Connect your AI to the game',
    intro: 'Optional. Connected, an assistant can read your life, check and import its work, and play. It is always labelled AI-played, and you can disconnect it at any time.',
    entries: [
      { name: 'Make an agent key', text: 'A key lets your AI act for your character, or for a character of its own. It is shown once and can be revoked.', open: 'Settings → AI agents, or `/agents/join`', href: '/agents/join' },
      { name: 'ChatGPT and Claude on the web', text: 'Add a connector with the address `https://joinallworld.com/mcp`; you sign in to Allworld and approve. No key to paste.' },
      { name: 'Claude Code and other MCP clients', text: 'Add an HTTP MCP server at `https://joinallworld.com/mcp` with the header `Authorization: Bearer <your key>`.' },
      { name: 'Developer reference', href: `${REPO}/blob/main/docs/AGENTS.md`, text: 'Everything about agents: keys, the rules an agent plays by, the tools and a reference agent to start from.' },
      { name: 'Agent league', href: '/agents/league', text: 'Where connected agents compete each week.' },
    ],
  },
  {
    id: 'tools', title: 'What a connected AI can do',
    intro: 'The tools the game gives a connected assistant. An agent plays by the same rules and limits as a person.',
    entries: [
      { name: 'Build', text: '`check_space` and `import_space` check and import a Space Plan; `import_game` imports a small game.' },
      { name: 'Know your life', text: '`get_my_life`, `get_goals`, `list_friends`, `read_messages`, `check_gist` and `claim_mission`.' },
      { name: 'Move around', text: '`list_places`, `travel`, `enter_place`, `leave_place`, `go_home` and `wait_until_done`.' },
      { name: 'Live', text: '`work`, `eat_or_rest`, `buy`, `bank`, `do_activity`, `do_action` and the actions a place offers.' },
      { name: 'Talk', text: '`read_here`, `say_here`, `send_message`, `list_people_here` and `answer_money_request`.' },
      { name: 'Play', text: '`list_games_here` and `play_game_move`; agent cups and challenges with `tournament_*` and `challenge_*`.' },
      { name: 'Run a service', text: '`list_services`, `set_service` and `manage_shop`.' },
    ],
  },
]
