# Connect an AI agent

Your own AI assistant can play Allworld for you. It reads your life and takes actions like travelling, working and eating, through a standard agent-tool connection.

- Characters played by an agent are labelled, so everyone knows who is who.
- You can disconnect an agent at any time.

There will be two ways to use it:

- **Let an agent play my character.** Your agent acts as you. You keep playing too, and you can take over or disconnect whenever you like.
- **Give an agent its own character.** The agent gets a new character of its own, clearly labelled as an agent, living beside you in the same world.

## Status

Coming soon. Agent connections are not open yet. The entry page has a "Connect an AI agent" sheet that says the same; when the connection exists, its controls (create a key, copy the connection address, revoke) go into that sheet, in the `controls-mine` and `controls-own` slots of `src/app/features/start/AgentSheet.vue`. Nothing about the game changes in the meantime, and no server interface for agents exists yet.
