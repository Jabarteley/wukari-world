# Batch 07 plot and mission matrix

## Identity

- **Work ID:** `20261015-local-tales-07-outline-r2`
- **Owner:** `/root/local_tales_07_outline`
- **Model / effort:** `gpt-5.6-luna / medium`
- **Thread:** delegated bounded authoring unit
- **UTC updated:** `2026-10-15T02:41:06Z`
- **Status:** `ready-for-review` (semantic acceptance rejected)
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Prepare the complete batch-07 35-city plot/conflict matrix and the first five cities' six mission tuples for parent semantic review.
- **In scope:** this outline record only.
- **Out of scope:** `src/game/content/local-tales/batch-07.ts`, all shared source/types/registry, tests/build/CI, browser/UI, services/network, Git mutations and deployment.
- **Exclusive file ownership:** `docs/agent-work/local-tales-07-outline-20261015-r2.md`
- **Input contract:** `docs/research/unique-local-content-2026-10-15/AUTHORING.md`, `input-07.json`, `src/types/local-tales.ts`, and accepted 01–06 work-record matrices.
- **Output contract:** 35 city rows, each with separate city and country conflicts mapped to explicit constraints and resolutions; 35 arc links; five cities × six valid mission tuples.
- **Dependencies:** Parent semantic review before any source expansion.

## Repository state

- **Repo:** JoinAllworld
- **Host:** local canonical worktree
- **Branch / worktree:** `codex/retention-main-sync`, `/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld`
- **Base:** `c42a4757b5580b7cbeaea095b046a7298c257fc1` (historical input base only).
- **Current revision:** `84679997` at correction; no source edits.
- **Dirty status:** pre-existing dirty/untracked content preserved; only this new record is owned here.
- **Port/process ownership:** none.

## Plot matrix

Each city row records a city problem and a country-arc problem for parent review. “City” is grounded in the supplied host/place/action reference; “country” is an installment proposed for the named arc. All decisions resolve fictional events. Actual game activities prove player effort only.

| City / country | Arc link | City conflict → explicit constraint → decision/resolution | Country conflict → explicit constraint → decision/resolution |
|---|---|---|---|
| Amman / Jordan | **Three Useful Turns** | Corin at مزرعة اليازوري needs to stage three friendly demonstrations, but one table holds only two sets of pieces → sets cannot be mixed and each demonstration must remain complete → run the first two sets, reset one set, then run the third. | A neighborhood repair day has four requests and two available work windows → each request needs one uninterrupted window → place the two long jobs first and fit the two short jobs into the remaining window. |
| Asuncion / Paraguay | **The Shared Starting Line** | Ira at ecologica promises a friend a practice lap, but a second friend arrives with a different pace → one course and one finish time → use staggered starts at the same course markers so both finish together. | A fictional shop has five orders and three shelves → orders must stay in arrival order and no shelf holds two open orders → close the first three orders before opening the final two. |
| Baku / Azerbaijan | **Small Wins, Long Game** | Corin at Izmir Garden has a friendly target game where a fast thrower and careful thrower share six turns → target cannot move and both get three turns → alternate one careful turn with one fast turn, then compare each player to their own first attempt. | A shared meal has seven portions and two serving rounds → one late guest needs a whole portion and nothing can be remade → reserve the final portion before the first round, then divide the other six. |
| Basseterre / St Kitts & Nevis | **The Two-Handed Plan** | Ira at St. Kitts Eco-Park is arranging a team relay, but two runners want the same hardest leg → four legs, one per runner, fixed finish order → let each runner claim one leg, giving the harder leg to the runner with the stronger timed practice. | A friend-care route has three doors and one helper can visit only the middle slot → every door needs one visit → assign the middle helper the center door and split the outer doors between the other two helpers. |
| Beirut / Lebanon | **Course Before Curtain** | Ira at Bchamoun Garden has a shared picnic whose cold and warm dishes arrive together → one warming turn and serving order is fixed → serve the cold course first, use the single warming turn, and serve warm dishes second. | A fictional clothing project has two stands and three complete outfits → all three must be visible and pieces cannot be cut → put two outfits on stands and lay the third as a complete flat set between them. |
| Bratislava / Slovakia | **The Patient Counter** | Ira at Lippayova záhrada must help three friends practise a game, but one learner needs twice the explanation → the session has three equal turns and nobody may lose a turn → use the first turn as a demonstration, then give each learner one coached turn. | A friendship walk has four people and three route cards → everyone must contribute and no route card may be duplicated → make the fourth person pace caller, then rotate that role at the midpoint. |
| Île Boddam / British Indian Ocean Territory | **One Table, Two Jobs** | Jesse at Recreation area (game venue) prepares a simple meal while a friend sets a place display → one table and one shared serving window → use opposite ends, exchanging at the center only after each side is complete. | A fictional supply count finds six matched pairs and three singles → no written inventory and the count closes after two passes → nest the pairs physically, leave singles visible, and recount only the three singles. |
| Flying Fish Cove / Christmas Island | **The Missing Middle Beat** | Uri at Poon Saan Park leads a friendly rhythm exercise where the middle beat keeps being skipped → sequence must remain four beats and cannot be slowed → mark the middle beat with a deliberate pause, then resume the same tempo. | A neighbor project has four plant trays and two check-in windows → every tray needs one early and one late check → one helper covers both checks on the middle trays while two helpers split the outer trays. |
| Hagåtña / Guam | **Fair Turns at the Park** | Parker at Barrigada War Memorial Park runs a throwing challenge where one player always retrieves → six throws, one retriever, no extra equipment → rotate the retriever after every two throws so each player receives and throws. | A fictional shop receives three fragile parcels and one cart holding two → fragile parcels cannot wait unattended → take the first pair, return the cart, then take the final parcel before opening the counter. |
| Harare / Zimbabwe | **The Cooling Window** | Jesse at Greenwood Park serves a simple meal, but two friends arrive at different times → food can be warmed once and the table cannot move → serve the early cold course, warm once when both arrive, then serve the warm course. | A project team has four tasks and one specialist tool → two tasks need the tool and one depends on the other → complete the independent tool task, finish the dependency, then use the tool for the final task. |
| Honiara / Solomon Islands | **Pass the Good Idea** | Jesse at Children's Park leads a team game where everyone chooses the scorer → three roles must be filled and no role repeats within a round → assign scorer, caller and recorder, then rotate each role next round. | A shared supper has nine guests and six plates → everyone eats together and no plate may be stacked → place three shared dishes in bowls and use the six plates for individual portions. |
| Kampala / Uganda | **The Last Seat** | Jesse at Entebbe Botanical Gardens promises a friend a quiet goal session, but another friend asks for practice help → one hour, both goals matter → reserve two twenty-minute solo blocks and one shared twenty-minute rehearsal. | A fictional café has two pickup orders before four new orders → one counter and prepared food cools if delayed → alternate one pickup with one new order until both pickups clear. |
| Kingston / Norfolk Island | **The Shape of a Team** | Wren at Lions Park has a friendly ball challenge where rebounds are scored inconsistently → course is fixed and no replay → declare one allowed rebound before each attempt and score against that class. | A neighbor care rota covers four homes with one helper who can work only the middle hour → every home needs one check → give the middle helper the two adjacent homes and route the outer checks from each end. |
| Kinshasa / Democratic Republic of the Congo | **The Safe Middle Step** | Jesse at Parc Naturel de la Nsele (Mangiers) has a walking game where the shortcut crosses the play area → course cannot be changed and children must stay clear → use the marked long route and add a timed pause at the midpoint. | A fictional repair counter has three items and one tool that must be returned after two turns → no job may be abandoned → do both tool-dependent steps first, then complete the hand-finished item. |
| Lilongwe / Malawi | **Serve the Whole Table** | Jesse at Bingu National Stadium organizes a simple meal with six portions and one late guest → portions cannot be remade → reserve one portion, serve five, and bring the reserved portion when the guest arrives. | A project has three display panels but only two stands → panels cannot be altered and all must be visible → stand the two tall panels and place the low panel flat between them. |
| Luxembourg / Luxembourg | **The Quiet Finish** | Emery at Place de Gand hosts a personal sketch goal while friends keep arriving → one shared afternoon and nobody is turned away → protect three short sketch intervals and place greetings only between them. | A friendship game has five rounds and four players → nobody may sit out twice and a round needs three players → rotate one recorder each round, with the recorder choosing the next team. |
| Macau / Macau | **The Order of Four** | Logan at Ramalho Eanes Garden has four small shop displays, but one stand wobbles → displays cannot be reassembled and only three stable positions exist → put the stable displays on stands and lay the fourth flat at the front edge. | A shared meal has two dishes that must be served hot and one cold dish → one serving pass and no reheating → serve the cold dish first, then the two hot dishes together. |
| Madrid / Spain | **The Helpful Detour** | Wren at Parque Dehesa Boyal guides a friend through a friendly route, but the fastest path bypasses a required stop → course and stop order are fixed → take the detour, then use a shorter return leg to preserve the finish time. | A fictional project has six tasks and two workers with different strengths → every task needs one owner and no task can be split → assign specialist tasks first, then give the remaining tasks to the worker with open time. |
| Manama / Bahrain | **The Unseasoned Portion** | Jesse at Askar Garden serves a simple meal when one guest has not chosen a preference → five confirmed portions and one neutral base, no second contact → prepare five confirmed portions and leave the sixth unseasoned until pickup. | A neighbor-care circle has three requests and two volunteers → one volunteer can do only one continuous route → assign the continuous route two adjacent requests and the other volunteer the remaining request. |
| Marigot / St Martin (French) | **The Three-Part Catch-Up** | Jesse at Lili's Tropical Garden promised two friends separate catch-ups, but only one full walk fits → routes allow one shared finish and each friend needs private time → give each friend a private opening segment, then share the final segment. | A fictional juice stand has seven cups and two flavors → orders stay in sequence and one tray holds four → alternate flavors on the four-cup tray, then carry the remaining three in order. |
| Muscat / Oman | **The Reliable Measure** | Wren at Muntaza.h Qantab runs a friendly accuracy game with quick and careful players → twelve attempts, six each, target fixed → alternate three-attempt blocks so each player resets the same starting mark. | A shop project has three bundles and two display spaces → bundles cannot be opened off-space and one space must remain clear for the customer → display the priority bundle first, then swap the second bundle at the planned midpoint. |
| Nassau / Bahamas | **The Fifth Player** | Uri at Community Centre leads a five-player game with four places → nobody may leave and the game lasts four rounds → make the fifth player scorekeeper for round one, then rotate that role each round. | A neighbor meal has eight portions and three containers holding three each → one container returns early and portions stay whole → put two portions in the early-return container, then pack three and three. |
| Nuku'alofa / Tonga | **The Gentle Pace** | Greer at Fa'onelua Park trains two friends for a shared goal walk, but one moves faster → same route, same finish, no split → use fixed meeting markers where the faster walker makes short out-and-back sections. | A fictional project has four deliveries and one cart holding two → delivery windows cannot overlap → deliver the first pair, return the cart, then deliver the second pair. |
| Nuuk / Greenland | **The Warm and Cool Order** | Corin at Aqqaluk Plads stages a friendly performance with a warm-up and cool-down group → one shared opening and one shared closing, no extra rehearsal → use one joint opening count, split the middle practice, and reunite for the closing count. | A personal goal group has three people and two available evenings → everyone needs one focused session and one shared check-in → give two people the first evening, the third the second, and hold the check-in at the venue on the second evening. |
| Paris / France | **The One-Cut Window** | Logan at Parc de Ladoucette has three fictional display cards and one sheet that can be cut once → every card must remain readable → arrange the cards head-to-tail before making the single cut. | A friendship circle has six planned activities but time for three → each person names one must-do and choices cannot be duplicated → select the three unique must-dos and defer the rest. |
| Port-au-Prince / Haiti | **The Shared Tray** | Jesse at Champs de Mars serves a simple meal with one narrow pass → hot and cold dishes cannot meet in transit → pass complete hot and cold batches alternately. | A fictional repair group has four items and one workbench → drying occupies the bench after the second item → finish the two quick items first, then use the drying period to prepare the remaining two. |
| Port-aux-Français / French S. Terr. | **The Two-Person Turn** | Jesse at Recreation area (game venue) runs a friendly game where a long turn blocks a short turn → course and finish time fixed → start the long turn alongside the short turn, then cycle the remaining short turns through the free space. | A shared supply room has five parcels and two destination windows → parcels cannot wait unattended → deliver the first-window pair, return, then deliver the remaining three in the second window. |
| Road Town / Virgin Islands (UK) | **The Honest Score** | Arden at Queen Elizabeth Park judges a friendly target game where each player counts a different kind of rebound → target and distance fixed → define the rebound class before each round and score all players against it. | A fictional shop display has three shelves and one low item → shelves cannot move and the low item must remain visible → place the two tall items on shelves and put the low item centered below them. |
| Santo Domingo / Dominican Republic | **The Late Teammate** | Ira at Parque Central de San Antonio de Guerra starts a relay while one teammate arrives for the final leg → route and finish stay fixed → let the late teammate take the final leg and give the first two leg briefings to the waiting runners. | A neighborhood project has eight cuttings and six holders → none can be discarded and holders cannot be added → pair the four smallest cuttings into two wide holders and give the other four individual holders. |
| São Tomé / Sao Tome & Principe | **The Two-Color Table** | Greer at Praça de Independência runs a team sorting game where two groups keep reaching for the same marker → markers must stay in order and the table has one center space → work from opposite ends and exchange only at the center. | A fictional supper has five bowls and seven guests → everyone eats at once and no one waits for a returned bowl → use five shared bowls and two existing flat plates for the final pair. |
| Terong Kangri / Siachen Glacier | **The Steady Rest** | Jesse at Recreation area (game venue) guides a quiet evening route where a player wants to rush the middle → route and rest point fixed → keep the start and finish pace, using the marked middle rest rather than skipping it. | A supply project has three teams and two work surfaces → each team needs one full interval and no surface sharing → run two teams first, then the third on the surface that opens. |
| St. John's / Antigua & Barbuda | **The Chosen Leg** | Greer at Sea View Farm Playfield runs a friendly relay where the strongest runner wants both difficult legs → four runners, four legs, fixed order → let the strongest runner choose one difficult leg and assign the other by timed practice. | A fictional shared kitchen has one long prep surface and teams approaching from both ends → ingredients stay in order and collisions are forbidden → assign one end to prep, the other to completed trays, with a center exchange. |
| Villa Las Estrellas / Antarctica | **The Last Warm Dish** | Jesse at Recreation area (game venue) serves a simple meal when one guest arrives after the first course → one warming turn and food stays on the table → reserve one portion, warm once when the guest arrives, and serve it as the closing course. | A project team has six parcels and one cart holding four → one fragile tall parcel cannot ride with heavy parcels → move two heavy groups first, then take the tall parcel with the remaining light parcels. |
| Warsaw / Poland | **The Four-Corner Practice** | Sage at Park Kombatantów coaches a friendly game where every player chooses the hardest role → four roles and four players, no duplicate role → assign roles by first-round draw, then rotate one step each round. | A personal reading goal has four chapters and one friend available for one review interval → all chapters must be read solo first → read two chapters, use the interval for recall, then read and self-test the final two. |
| Yaoundé / Cameroon | **The Narrow Counter** | Jesse at Parcours Vita serves a simple meal while two pickup guests arrive between new orders → one counter and prepared portions cool if delayed → alternate one pickup with one new order until the pickup queue clears. | A neighbor-care rota has six visits across morning and evening → two helpers each work one continuous block → one helper covers all morning visits and the other all evening visits, with one midpoint handoff. |

## First five cities: six mission tuples

Tuple order is life, discovery, social. Labels name only observable supported actions/place/city/count; the fictional purpose belongs in the purpose field during source expansion.

| City | Daily: life / discovery / social | Weekly: life / discovery / social |
|---|---|---|
| Amman | `practical 1` Enjoy one quiet evening in Amman / `host-visit 1` Visit Corin at مزرعة اليازوري / `people 2` Greet two game regulars in Amman | `discovery 2` Look around twice at مزرعة اليازوري / `places 2` Visit two supported places in Amman / `practical 3` Enjoy three quiet evenings in Amman |
| Asuncion | `discovery 1` Look around once at ecologica / `host-visit 1` Visit Ira at ecologica / `people 3` Greet three game regulars in Asuncion | `practical 2` Enjoy two quiet evenings in Asuncion / `places 3` Visit three supported places in Asuncion / `discovery 2` Look around twice at ecologica |
| Baku | `practical 1` Look around once at Sabir Park / `host-visit 1` Visit Corin at Izmir Garden / `people 2` Greet two game regulars in Baku | `discovery 3` Look around three times at Izmir Garden / `places 2` Visit two supported places in Baku / `practical 2` Look around twice at Sabir Park |
| Basseterre | `discovery 1` Look around once at National Heroes Park / `host-visit 1` Visit Ira at St. Kitts Eco-Park / `people 4` Greet four game regulars in Basseterre | `practical 2` Look around twice at National Heroes Park / `places 3` Visit three supported places in Basseterre / `discovery 2` Look around twice at St. Kitts Eco-Park |
| Beirut | `practical 1` Enjoy one quiet evening in Beirut / `host-visit 1` Visit Ira at Bchamoun Garden / `people 3` Greet three game regulars in Beirut | `discovery 2` Look around twice at Bchamoun Garden / `places 2` Visit two supported places in Beirut / `practical 3` Enjoy three quiet evenings in Beirut |

## Parent rejection findings and handoff

- The matrix is **unaccepted** and must be re-authored by the parent before any batch-07 source expansion.
- Harare's warm-once meal with late friends repeats batch-05 Almaty's reheating/late-arrival solution family.
- Beirut's cold-course/single-warming-turn meal repeats the same solution family and is not accepted as distinct.
- Basseterre and Kingston country installments both use the batch-05 Ashgabat middle-slot neighbor-care rota family.
- Amman says four requests each need an uninterrupted window but provides only two windows without parallel capacity, so its constraint/resolution is under-specified and arithmetically invalid.
- Bratislava has three learners and three turns, but the stated one demonstration plus three coached turns requires four turns.
- Honiara's nine guests and six plates are not resolved by three shared serving bowls if all guests require individual portions.
- These findings invalidate the prior claims of semantic distinctness and arithmetic/time acceptance. The rows remain draft material for parent replacement only.

## Structural inventory (not acceptance)

- Coverage: 35 assigned city rows, 35 separate country-arc installments, 70 conflict/resolution rows, and 30 mission tuple proposals (five cities × daily/weekly × three positions).
- The inventory counts 35 assigned city rows, 35 country-arc placeholders, and 30 mission tuple proposals; this is structural bookkeeping only, not semantic or arithmetic acceptance.
- Grounding: every city row names its supplied host venue or supplied practical/discovery venue; no external factual claim, history, service, medicine, worship, crisis, or real-person assertion was added.
- The earlier duplication and arithmetic review claims are withdrawn. Parent must re-author the rejected rows and re-review the first six rows and five tuples before any long-form tale or later mission expansion.
- No source, tests, UI, browser, services, network, Git, or nested-agent work was performed.
- This unit ends at the rejected matrix checkpoint; do not restore the interrupted draft or start batch 08.

## Release state

- **Local implementation:** `active` (outline rejected; no source expansion)
- **Deployment:** `not-requested`
- **Release gate:** parent must re-author and semantically accept batch 07; no batch source exists from this unit.
- **References:** `docs/research/unique-local-content-2026-10-15/AUTHORING.md`, `docs/research/unique-local-content-2026-10-15/input-07.json`, `src/types/local-tales.ts`, accepted batch 05/06 work records.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15T02:41:06Z | ready-for-review | Drafted all 35 city/country rows and first five six-tuples; parent rejected semantic duplication and arithmetic in Harare, Beirut, Basseterre, Kingston, Amman, Bratislava and Honiara. | This record; current source revision 84679997 | Parent re-authors batch 07; no source expansion from this unit. |

## Usage

- The known `mcp__codex_app__get_usage_limits` reading in this turn was 92% used / 8% remaining. No stronger usage or end-state claim is made here; stop all work at 95% used.
