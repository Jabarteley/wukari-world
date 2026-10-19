# Repo pass: NPC conversation and costs (HEAD e40e95e84, read-only)

Uncommitted in the Desktop checkout (NPC thread): server/house/acts.ts, talk-stream.ts, docs/research/talking-npcs-plan-2026-10-16.md (new); edits to server/house/runner.ts, call-routes.ts, server/models/router.ts, server/companion/gateway.ts, src/app/features/calls/agentCall*.ts. Face-to-face Talk is local only.

## House agents (server/house/**)
- cast.ts Spec {key, name, role seller|guide|marketer|mission|quiz, look, hours, post[], market?, eatery?, items?, card, voice pidgin|plain}. AUTHORED_CITIES = ['lagos'] (6 agents: Mama Tolani, Tunji, Kofo, Bro Dayo, Aunty Chinwe, Baba Ade). Every other city: castOf() returns 2 country-generic agents (ng Mama Nkechi/Chike; gh Auntie Efua/Kojo; ke Mama Wanjiru/Otieno; za Sis Thandi/Sipho; world Auntie Rosa/Maya). No per-city identity.
- runner.ts DEFAULTS: houseAgentsBusy 2 (Lagos), houseAgentsQuiet 0; MAX_AGENTS 48; brain order: routine (actions.ts planAt), written lines (lines.ts), model only when a person writes and intent needs it (router.ask purpose agent-talk, carriesPlayerWords true, maxTokens 220, talk 280, timeout 8 s). Wake limits house:wake:<agent>:<person> 8/min, all 120/min.
- talk.ts intentOf regex (English + Pidgin): hours/prices/offer/directions/tonight/mission/greet/bye/pressure/other; greet/bye/hours no model; prices/offer/pressure via lines + haggle.ts; directions/tonight/other -> model. promptFor(): card, AI disclosure, city + Pidgin hint, 220-char limit, no money/contact/meeting/flirt, anti-injection, hours, list prices, places, gist lines, person name, intent, closeness, <=5 remembered facts, open missions. User message cut to 200 chars.
- acts.ts (uncommitted): talkInstruction JSON with allowed acts; parseTalk -> {say, act}; validateAct gesture wave/nod/point/shrug/laugh, face product, direct venue, task, move spot; ruleAct for no-model. cleanReply: strip quotes/label, <=240 chars, reject links/@/brackets, any number not in allowedNumbers, seller promises; then agentWords(toMinor true); failure -> written line. talk-stream.ts: incremental JSON reader emits sentences, each filtered.
- lines.ts: both(pidgin[], plain[]) banks GREET, AMBIENT per role, FALLBACK, PRESSURE, WHICH, NOT_SELLER, TASK_*, SOLD, SALE_*, TONIGHT_NONE, CALL_BACK, CALL_BUSY, BYE; ~100 lines; deterministic pick(list, seed) FNV hash. None city-specific. QUIZ 12 questions in talk.ts.
- memory.ts: collection agentMemory {v, people{[publicId]{at, off?, a{[agentId]: Bond}}}}; Bond p closeness, f <=5 facts of 60 chars, w partner, m missions, r flirt; AGENTS_PER_PERSON 8, MAX_PEOPLE 3000; facts 60 days, bond 180; CONVO_LINES 6; summaries capped houseMemoryCalls 300/day; cleanFact rejects money/contact/command/private.
- call-limits.ts: playerMinutes 20, totalMinutes 300/day, GAP_MS 90 s, IDLE 3 min, MAX_CALLS 2000. Routes /api/agents/call/config|start|transcribe|turn|end and talk/turn|next|cancel (npcTalkOn default false; TALK_QUICK_MS 400 then poll 300 ms). Client src/app/features/calls/agentCall.ts, useNearbyAgent.ts (TALK_REACH 3), stt.ts/sttBrowser.ts (Web Speech en-NG or 16 kHz WAV, MAX_HOLD 15 s). Voice out: text only; server/voice-seed.ts picks a device voice.

## Residents (server/residents/**)
- residentsPerCity default 3 (0-5) across 284 cities ~852; authored first (life.ts Remi + roster.ts 29), rest generate.ts generateResident(city, slot) seeded: name from 33 regional pools (Nigeria yoruba/igbo/hausa by lat/lon), age, job, faith, traits, style warm|plain|formal|jokey|pidgin|brisk, tongue from persona.ts TONGUES (27 entries; all Nigerian regions -> one `naija` tongue; no Yoruba/Igbo/Hausa word lists), story 170-400 words lazily.
- Lines: persona.ts talkLine, PASTIMES; resident.ts WRITTEN/NOT_TRADING/GOODBYE; judgeTalk: LINE_MAX 140, no digits except ledger, OUT_OF_CHARACTER regex, agentWords, repeats check.
- Model purpose 'resident' (free list then gpt-5.6-luna): thought 160 tokens (no player words), night summary 320, resident-to-resident 120, reply to person 140 (paid only). residentDeepPerDay 240 units; MAX_THOUGHTS 64; STEP_MAX 48; residentDailyCents 100. Bonds/weddings bonds.ts (callsPerDay 24).

## Companion Lumo
- Client deterministic: src/app/features/companion/answers.ts, intents.ts (~230 phrasings en/NG English/Pidgin), actions.ts. Model only for POST /api/companion/ask (purpose companion, 220 tokens, 8 s); checks.ts checkReply; MAX_REPLY 320, MAX_INPUT 400; documented US$0.0001-0.0002 per request.

## talking-npcs-plan-2026-10-16.md
Four hooks (select NPC within 3 steps; server SceneFacts; sentence-streamed speech; validated acts). STT browser en-NG or gateway microsoft/mai-transcribe-2. Voice tiers: device speechSynthesis (default), hosted Nigerian voice (Azure en-NG-Ezinne/Abeo, US$15/M chars; Spitch for yo/ha/ig), text. Latency 1.6-3.3 s end of speech to first audio. Costs per conversation-minute: device ~0.001, hosted 0.008-0.014, premium 0.021, self-hosted L4 US$500-580/month. Prototype 5-6 engineer-weeks.

## Model router (server/models/)
- PRICES per M tokens in/out: openai/gpt-5.6-luna 0.10/0.50; xai/grok-4.1-fast-non-reasoning 0.20/0.50; free: nvidia/nemotron-3.5-lightning-free, poolside/laguna-s-2.1-free, stealth/glyph-cluster, convaiinnovations/laya-free; UNKNOWN 1/4.
- DEFAULT_LISTS: companion and agent-talk [gpt-5.6-luna, grok-4.1-fast] paid; resident 4 free gateway + 5 free OpenRouter (google/gemma-4-31b-it:free, gemma-4-26b-a4b-it:free, nvidia/nemotron-3-super-120b-a12b:free, thinkingmachines/inkling:free, nemotron-3-ultra-550b-a55b:free) then gpt-5.6-luna; safety nvidia/nemotron-3.5-content-safety:free.
- Caps: HARD_CAP_MICRO 2,000,000 (US$2/UTC day); modelBudgetCents lowers only; modelPlayerRequests 200, modelPlayerCents 5; OpenRouter free 20/min 1,000/day; gateway 60/min. No-training: carriesPlayerWords -> paid only, data_collection deny.
- transcribe.ts: DEFAULT_STT_MODEL microsoft/mai-transcribe-2 at 27.78 micro-$/s (~US$0.10/h); MAX_SECONDS 20; nothing stored. STT bench: no results recorded; docs/CALLS.md table all "not yet measured".

## On-device AI today
speechSynthesis only (src/audio/voice/speech.ts, en-NG preferred); formant talk blips; Web Speech STT. No WebLLM/transformers.js/ONNX anywhere. Deps: three, vue, ws, posthog, sentry, meshoptimizer, vite. EMBODIMENT.md: ~23% of Nigerian Android below WebGPU floor.

## Authored text per city
ridePacks.ts (LAGOS, ACCRA, NAIROBI, SOUTH_AFRICA, GENERIC); src/moments/cities.ts (8 Nigerian cities, ~10 yo/ha/ig/efi greetings); src/game/chatter/lines.ts (ChatterLang en|pcm|ha|yo|ig|efi, non-English beta); src/game/cities/lagos/regulars.ts (48 NPCs x 2 quotes); src/game/cities/formula/cast.ts PAIRS templates; local-tales batch-01..08 (284 cities, ~11.6k lines); dictionary is puzzle words only. Nothing generates full Yoruba/Hausa/Igbo dialogue.

## Safety
agent-words.ts agentWords(text,{toMinor}) refuses money/contact/link/meet/sexual/human/secret/romance-to-minor; ai-intercept.ts asksIfAi/aiAnswer/crisisWords/helpText; models/safety.ts modelWordsSafe (nemotron safety, admin modelSafetyCheck off by default); AI mark never dropped; toMinor for under-18 or unknown age.

## Measured numbers
No live latency or calls/day. DESIGN.md Part 7: ~1,000 in + 100 out ~US$0.00015/reply (US$2 ~ 13,000 replies). Resident tests: 0.65 ms/beat for 852 residents; 476 KB storage. Inferred agent-talk turn ~US$0.0001-0.00015; STT 15 s ~US$0.00042.
