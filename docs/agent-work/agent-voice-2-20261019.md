# AI characters and Lumo: no empty replies, no fourth wall, no repeated lines

- **Work ID:** `20261019-agent-voice-2` · **Owner:** Claude (T3 Code thread, the owner's Mac) · **Base:** main `18bf1355c`
- **Goal:** the owner's screenshots (19 Oct 13:29, 13:33): Tunji fell back to a written line on "can you come over to my place?" and then said "I'm an AI-played character"; Lumo repeats the same hunger line for "What should I do now?".
- **Causes:** GPT-6 Luna is a reasoning model and its hidden thinking counts against the 140–220 token reply cap, so a reply needing thought came back empty (server/companion/gateway-billing.test.ts already shows such an answer); the house prompt told the agent to say it is AI-played when asked what it is; Lumo's confident answers are the deterministic brain's lines, never phrased by the model (rephrase existed but was off and unused).
- **Change:** GPT-5.x/6 requests carry `reasoning: { effort: 'none' }`; the house prompt never brings up being AI (the game answers a sincere question itself) and answers an invitation like a busy friend; rephrase is on unless `COMPANION_AI_REPHRASE=off`, carries what the player said, and the client uses it for every confident answer but a safety one, keeping the brain's buttons.
- **Files:** server/companion/{gateway,prompt,service}.ts, server/house/talk.ts, src/app/features/companion/{brain.ts,CompanionHost.vue}, src/types/companion.ts, tests, docs/COMPANION.md, this record.
- **Evidence:** typecheck clean; 292 touched tests pass; build ok; budgets ok.
- **Status:** release.
