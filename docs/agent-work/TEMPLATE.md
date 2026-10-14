# Agent work record

Copy this file to `docs/agent-work/<work-id>.md`. One worker owns one record and updates it at each checkpoint. The coordinator owns any shared index.

## Identity

- **Work ID:** `<date>-<short-slug>`
- **Owner:** `<agent name or handle>`
- **Model / effort:** `<model> / <effort>`
- **Thread:** `<thread id or local>`
- **UTC updated:** `<YYYY-MM-DDTHH:MM:SSZ>`
- **Status:** `active | ready-for-review | verified-local | blocked | complete`
- **Work state:** `implementation | deployment`

## Goal and boundaries

- **Goal:** `<one sentence>`
- **In scope:** `<files, behaviour, and evidence>`
- **Out of scope:** `<explicit exclusions>`
- **Exclusive file ownership:** `<repo-relative paths only>`
- **Input contract:** `<source, branch, API, or fixture expected>`
- **Output contract:** `<files, interfaces, evidence, or handoff expected>`
- **Dependencies:** `<other work IDs, services, flags, or approvals>`

## Repository state

- **Repo:** `<repository name and generic repo-relative location>`
- **Host:** `<computer or execution host label>`
- **Branch / worktree:** `<branch or detached state>`
- **Base:** `<base commit SHA>`
- **Current commit:** `<current commit SHA>`
- **Dirty status:** `<clean | dirty; summarize owned and unrelated changes>`
- **Port/process ownership:** `<none, or process name + port + owner + stop rule>`

## Progress

### Done and exact evidence

- `<completed item>` — `<command, artifact path, test name, or review link>`

### In progress / blockers

- `<item>` — `<what is missing and the smallest next action>`

### Immediate resume steps

1. `<first command or inspection, using repo-relative paths>`
2. `<next action and completion criterion>`

## Release state

- **Local implementation:** `not-started | active | verified-local`
- **Deployment:** `not-requested | prepared | running | verified`
- **Release gate:** `<remaining approval or acceptance evidence>`
- **References:** `<repo-relative docs, issue, or source paths>`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `<timestamp>` | `<status>` | `<short update>` | `<exact path or command>` | `<next action>` |

Keep records portable: use synthetic examples and public evidence only. Never put credentials, tokens, private user data, machine-specific secrets, or raw personal-data dumps here. A local `/tmp` path is evidence on its originating host; re-run or copy the result before treating it as shared evidence. Do not auto-commit, push, kill another worker's process, or claim deployment from a local check.
