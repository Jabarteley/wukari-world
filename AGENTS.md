# Allworld agent handoffs

Before starting or resuming repository work, read the current-work section of [docs/AGENT-COORDINATION.md](docs/AGENT-COORDINATION.md), then the work records relevant to your files.

Create or update your own `docs/agent-work/<unique-work-id>.md` using [the template](docs/agent-work/TEMPLATE.md) before editing shared source. Record exact checkout, source revision, owned paths, dependencies, evidence, running resources, and the next executable step. Update it after an accepted milestone, a blocker or scope change, and before yielding or handing off. Update only your own record; the integration owner maintains the shared index.

Preserve other agents' work. Resolve overlapping source ownership before writing; independent work can continue. A status file is coordination evidence, not a lock or permission to commit, publish, deploy, stop another process, or change user data. Recheck source and evidence when taking over, especially on another computer.

[docs/AGENT-PROMPTS.md](docs/AGENT-PROMPTS.md) contains prompts for registration, checkpoints, takeover, and integration. [docs/AGENTS.md](docs/AGENTS.md) describes AI characters playing the game; it is a separate API reference.

The "world alive" programme's work in flight, and how to pick it up, is in [AGENT.md](AGENT.md).
