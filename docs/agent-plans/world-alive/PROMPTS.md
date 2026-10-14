# Prompts

Copy one into a new chat with a coding agent that can run commands and has `git`, `gh` (signed in to GitHub with access to
`kromate/joinallworld`) and Node.js 24. Nothing else is needed.

## 1. Start (the first session)

```text
You are taking over a large programme of work on Allworld, a browser game at https://joinallworld.com. You have never seen it
before, and nobody will explain anything that is not written in its repository. The repository is
https://github.com/kromate/joinallworld (public, branch main). You have access to my GitHub account through `gh`; use only that
repository for this game. Never use kromate/v1-allworld or kromate/allworld: that is a discontinued older game.

Your brief is in the repository, in docs/agent-plans/world-alive/. Clone the repository and read, in order:
1. docs/agent-plans/world-alive/README.md (the goal, how to work, how to check and release, the rules),
2. docs/agent-plans/world-alive/STATUS.md (where the work stands),
3. docs/agent-plans/world-alive/DESIGN.md and FEATURES.md (what to build and why),
4. docs/agent-plans/world-alive/PHASES.md (the order of work).
Then read the repository's README.md, CONTRIBUTING.md and docs/DEVELOPING.md.

Your job: implement every phase in PHASES.md, in order, and release each one to the live site using the release steps in
README.md. Work on your own judgement. Do not stop to ask me unless something is on the list of things only the owner can do
(README.md, "Rules"), and even then, ask, record it in STATUS.md, and continue with whatever does not depend on the answer.
After each phase, update STATUS.md and push it. Update STATUS.md before you stop for any reason, so a new session can continue
from it alone.

Non-negotiable:
- The repository is public: never commit secrets, private details, or names of real people or other games.
- main must always be releasable; never force-push.
- Stored player data changes only by adding optional fields; there is no rollback.
- The first-download size limits are never raised.
- People always know which characters are AI.
- Agents never ask people for money, personal details or meetings.
- Under-18 players get no romance from agents.
- Model spend never exceeds US$2 a day.

Start with Phase 0. When it is done, tell me in one short message what you found (the baseline, the live build, anything
blocked, the questions for me), then carry on with Phase 1 without waiting.
```

## 2. Continue (every later session)

```text
Continue the Allworld "world alive" programme. The repository is https://github.com/kromate/joinallworld (use only this one;
never kromate/v1-allworld). Clone or pull it, then read docs/agent-plans/world-alive/STATUS.md first, then README.md, PHASES.md
and whatever DESIGN.md and FEATURES.md say about the current phase. STATUS.md is the truth about where the work stands; check
it against the code and the live site (https://joinallworld.com/api/health shows the live commit) before relying on it.

Carry on from the current phase, following README.md for checks, releases and rules. Release each finished phase. Update
STATUS.md after each phase and before you stop. Ask me only for the owner's items, and keep working on what does not depend on
the answer.
```

## 3. Review (optional, before or after a large phase)

```text
Review recent work on Allworld with fresh eyes. The repository is https://github.com/kromate/joinallworld (only this one).
Read docs/agent-plans/world-alive/README.md and STATUS.md, then review the commits of the last phase (STATUS.md names them)
against PHASES.md and DESIGN.md.

Report, with file and line:
- bugs;
- broken rules (secrets or private details in the public repository; stored data changed in a way old saves cannot load; the
  first download grown past its limits; AI characters unlabelled to people; an agent able to ask a person for money, details or a
  meeting; romance with under-18 players; model spend able to exceed US$2 a day);
- missing tests;
- anything that does not do what the phase promised.

Do not change code unless I ask; write your findings into STATUS.md under a "Review" heading, push it, and summarise them to me.
```
