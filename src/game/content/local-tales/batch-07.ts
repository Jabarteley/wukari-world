import type { AuthoredContentBatch } from '../../../types/local-tales.ts'

const batch = {
  countries: [
    { countryId: 'jo', title: 'Skills Cross in Two Rounds', premise: 'Neighbors exchange distinct fictional skills through paired teaching and learning rounds.', collection: 'Cross-Skill Sessions', rewardTitle: 'Skill-Swap Partner' },
    { countryId: 'py', title: 'Make Space by Moving One Shelf', premise: 'A shared shelf gains useful uneven spaces through one measured board move.', collection: 'Measured Shelves', rewardTitle: 'Shelf-Space Planner' },
    { countryId: 'az', title: 'One Heat Change', premise: 'A shared fictional kitchen groups matching dishes before its single heat change.', collection: 'Matched Oven Rounds', rewardTitle: 'Heat-Change Cook' },
    { countryId: 'kn', title: 'Second Choices Break the Tie', premise: 'Friends resolve a fictional ranked-choice tie by transferring the unique lowest option.', collection: 'Fair Choice Games', rewardTitle: 'Second-Choice Steward' },
    { countryId: 'lb', title: 'A Quiet Role before One Loud Run', premise: 'A friend contributes visual counts before observing one energetic rehearsal run.', collection: 'Rehearsal Roles', rewardTitle: 'Visual-Count Lead' },
    { countryId: 'sk', title: 'One Friend Bridges Two Sessions', premise: 'A flexible friend carries continuity between separate morning and evening goal sessions.', collection: 'Bridged Sessions', rewardTitle: 'Session Link' },
    { countryId: 'io', title: 'Meet at the Passing Bay', premise: 'Two fictional work carts use one passing bay without reversing on a narrow path.', collection: 'Passing-Bay Routes', rewardTitle: 'Narrow-Path Guide' },
    { countryId: 'cx', title: 'Dependencies before the Shared Finish', premise: 'Friends complete independent fictional cooking tasks before their dependent finishing steps.', collection: 'Two-Station Sequences', rewardTitle: 'Dependency Cook' },
    { countryId: 'gu', title: 'Five Players, Five Referee Turns', premise: 'A friendly court rotates one referee turn evenly through five players.', collection: 'Five-Round Courts', rewardTitle: 'Referee-Rota Keeper' },
    { countryId: 'zw', title: 'Six Plots in Two Full Trips', premise: 'A fictional carrier serves six plots through two exact full trips.', collection: 'Full-Carrier Rounds', rewardTitle: 'Measure Carrier' },
    { countryId: 'sb', title: 'One Playable Game from Three Sets', premise: 'Compatible surviving pieces from three fictional sets become one rotating shared game.', collection: 'Combined Game Nights', rewardTitle: 'Game-Set Builder' },
    { countryId: 'ug', title: 'Lower the Ladder Only Once', premise: 'Neighbors order fictional high-to-low jobs around an adjustable ladder.', collection: 'Descending Tasks', rewardTitle: 'Ladder Planner' },
    { countryId: 'nf', title: 'Two Balanced Goals from Six Boards', premise: 'Long and short boards form a rigid equal-sided fictional frame without cutting.', collection: 'Joined-Side Frames', rewardTitle: 'Frame Joiner' },
    { countryId: 'cd', title: 'One Shared Briefing, Two Solo Consultations', premise: 'Four teams fit three help intervals by sharing their identical briefing.', collection: 'Briefing Windows', rewardTitle: 'Consultation Planner' },
    { countryId: 'mw', title: 'Assign by the Smallest Time Loss', premise: 'A relay resolves a contested leg through measured comparative cost.', collection: 'Evidence Relays', rewardTitle: 'Relay Analyst' },
    { countryId: 'lu', title: 'Two Triangles Share One Side', premise: 'Five equal sticks form a rigid double-triangle fictional frame.', collection: 'Shared-Side Builds', rewardTitle: 'Triangle Builder' },
    { countryId: 'mo', title: 'Split Every Skill Level', premise: 'Two friendly teams each receive one player from every experience pair.', collection: 'Balanced Skill Teams', rewardTitle: 'Team Balancer' },
    { countryId: 'es', title: 'Save the Battery for the Final Hour', premise: 'A fictional project preserves one charged lamp until all three lights are needed.', collection: 'Final-Hour Lights', rewardTitle: 'Battery Keeper' },
    { countryId: 'bh', title: 'Ingredients, Method, Timing', premise: 'Three friends alternate complementary recipe knowledge in a repeatable speaking order.', collection: 'Three-Part Recipes', rewardTitle: 'Recipe Sequencer' },
    { countryId: 'mf', title: 'A Reversible Middle Panel', premise: 'One reversible panel aligns both seams of a fictional fabric display.', collection: 'Aligned Panels', rewardTitle: 'Seam Matcher' },
    { countryId: 'om', title: 'Five Matches Form a Cycle', premise: 'Five friendly players each receive two matches through one complete neighbor cycle.', collection: 'Five-Match Cycles', rewardTitle: 'Court-Cycle Keeper' },
    { countryId: 'bs', title: 'Three Doorways Identify Three Boxes', premise: 'Doorway constraints assign three fictional boxes without labels or guessing.', collection: 'Doorway Deliveries', rewardTitle: 'Constraint Sorter' },
    { countryId: 'to', title: 'Seven Blocks Make One Braced Arch', premise: 'Seven blocks become two pillars, one lintel and two stabilizing braces.', collection: 'Braced Arches', rewardTitle: 'Arch Bracer' },
    { countryId: 'gl', title: 'Three Rhythms Meet on Beat Six', premise: 'Different repeating rhythms close together at their first shared cycle.', collection: 'Shared-Cycle Sounds', rewardTitle: 'Beat-Six Conductor' },
    { countryId: 'fr', title: 'Complementary Clues, Timed Finish', premise: 'Friendly rivals combine necessary constraints before racing an independent final step.', collection: 'Rival Puzzle Finishes', rewardTitle: 'Constraint Ally' },
    { countryId: 'ht', title: 'Two Hooks Anchor the Menu Chain', premise: 'Folded fictional menus interlock so one small weight secures the chain.', collection: 'Counter Anchors', rewardTitle: 'Menu-Chain Maker' },
    { countryId: 'tf', title: 'Demanding and Light Tasks Alternate', premise: 'A personal goal alternates demanding and light work to protect accuracy.', collection: 'Alternating Workdays', rewardTitle: 'Effort Sequencer' },
    { countryId: 'vg', title: 'Match the Two Friction Settings', premise: 'Two adjustable fictional hinges hold a door by sharing one tested friction setting.', collection: 'Matched Hinge Controls', rewardTitle: 'Friction-Dial Setter' },
    { countryId: 'do', title: 'Swap the Hotter Rack between Rivals', premise: 'Friendly bakers exchange unequal rack positions across two scored rounds.', collection: 'Two-Rack Bakes', rewardTitle: 'Rack-Swap Referee' },
    { countryId: 'st', title: 'Two Pushes around an L-Bend', premise: 'A trapped soft spool exits an L-shaped space through two directional pushes.', collection: 'Corner Rescues', rewardTitle: 'L-Bend Solver' },
    { countryId: 'xg', title: 'The Z-Fold Holds', premise: 'Three attached fictional screen panels stand inside a narrow strip through equal opposite hinge folds.', collection: 'Opposite-Fold Screens', rewardTitle: 'Z-Fold Builder' },
    { countryId: 'ag', title: 'A Folded Beam beneath the Center', premise: 'One folded strip braces the loaded center of a fictional paper bridge.', collection: 'Center Beams', rewardTitle: 'Bridge Bracer' },
    { countryId: 'aq', title: 'One Long Game, Three Quick Games', premise: 'Two tables host one continuous game and three sequential short games.', collection: 'Two-Table Game Days', rewardTitle: 'Table-Time Host' },
    { countryId: 'pl', title: 'Two Slaloms Share the Finish', premise: 'Seven cones create two equal fictional lanes and one common finish.', collection: 'Shared-Finish Courses', rewardTitle: 'Course Setter' },
    { countryId: 'cm', title: 'Walk the Ball out of the Rails', premise: 'Alternating side pushes free a soft ball from parallel fictional rails.', collection: 'Rail Rescues', rewardTitle: 'Paddle Walker' },
  ],
  cities: [
    {
      cityId: 'amman',
      city: { title: 'The Frame with Unequal Diagonals', desire: 'competence', chapters: [
        { title: 'A square leans without a loose corner', text: 'At مزرعة اليازوري, Corin’s fictional display frame has skewed even though all four corner joints remain secure. Its panel will not sit straight.' },
        { title: 'Two measurements reveal the strain', text: "A quiet evening at Hada'iq al-Malik Hussein gives Corin time to compare corner-to-corner lengths. One diagonal is longer, and one cord can connect that pair." },
        { title: 'The corners must remain assembled', text: 'Corin could force one side inward, remove a corner, or tension the longer diagonal gradually until both diagonal measurements match.' },
        { title: 'Equal diagonals restore the shape', text: 'Corin ties the cord across the longer diagonal and tightens it in small steps. When both measurements match, the panel settles square without disturbing a joint.' },
      ], approaches: [
        { label: 'Compare both diagonals', callback: 'Corin remembers the measurement that exposed the skew.' }, { label: 'Protect the corner joints', callback: 'Corin remembers why the frame stayed assembled.' }, { label: 'Tension in small steps', callback: 'Corin remembers how equal lengths restored the square.' },
      ], dilemma: { prompt: 'How should Corin straighten the secure but skewed frame?', answers: ['Tension the longer diagonal until both diagonals match.', 'Force one side inward by hand.', 'Remove and rebuild a corner.'], correct: 0, explanation: 'The unequal diagonals identify the skew, and the single cord corrects it without undoing secure corners.' }, closing: 'The panel rests inside a square frame, held by four original joints and one measured diagonal.', keepsake: { name: 'Equal-Diagonal Cord', description: 'A short cord marked with two matching corner-to-corner lengths.' } },
      country: { title: 'Skills Cross in Two Rounds', desire: 'belonging', chapters: [
        { title: 'Four neighbors know only one side', text: "At Hada'iq al-Malik Hussein, Corin’s fictional skill fair has two confident planters and two confident cooks. Each person wants to learn the unfamiliar skill." },
        { title: 'Every person must teach and learn', text: 'Looking around مزرعة اليازوري confirms there are exactly two rounds. No participant can teach and learn at the same moment.' },
        { title: 'Parallel experts would leave gaps', text: 'Corin could keep experts together, let one person demonstrate everything, or make two cross-skill pairs and reverse teacher and learner roles after round one.' },
        { title: 'The second round completes the exchange', text: 'Each planter first teaches a cook. Then each cook teaches the planter partner. Four people finish with one taught skill and one newly practised skill.' },
      ], approaches: [
        { label: 'Form cross-skill pairs', callback: 'Corin remembers how every pair held two kinds of knowledge.' }, { label: 'Reverse the roles', callback: 'Corin remembers the second round’s exchange.' }, { label: 'Count teaching and learning', callback: 'Corin remembers that all four did both.' },
      ], dilemma: { prompt: 'How should the four neighbors use the two rounds?', answers: ['Keep the planters and cooks in separate pairs.', 'Pair across skills, then reverse who teaches.', 'Let one expert teach both rounds.'], correct: 1, explanation: 'Cross-skill pairs and a role reversal give every participant one teaching turn and one learning turn.' }, closing: 'Two rounds end with four neighbors carrying a skill they did not bring.', keepsake: { name: 'Cross-Skill Pair Badge', description: 'A two-sided badge marked teach on one face and learn on the other.' } },
      missions: { daily: [
        { label: "Enjoy one quiet evening at Hada'iq al-Malik Hussein", purpose: 'Compare the fictional frame’s diagonal lengths.', task: 'practical', count: 1 }, { label: 'Visit two game places in Amman', purpose: 'Compare settings for Corin’s equal-corner frame.', task: 'places', count: 2 }, { label: 'Look around once at مزرعة اليازوري', purpose: 'Prepare the teach-then-learn exchange.', task: 'discovery', count: 1 },
      ], weekly: [
        { label: 'Look around twice at مزرعة اليازوري', purpose: 'Practise the two-round cross-skill pairing.', task: 'discovery', count: 2 }, { label: 'Visit Corin at مزرعة اليازوري', purpose: 'Review the diagonal tension plan.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Amman', purpose: 'Give Corin neighbors for both teaching rounds.', task: 'people', count: 3 },
      ] }
    },
    {
      cityId: 'asuncion',
      city: { title: 'Mild, Medium, Strong', desire: 'curiosity', chapters: [
        { title: 'One spoon meets three sauces', text: 'At ecologica, Ira’s fictional tasting challenge presents mild, medium and strong sauces. Only one tasting spoon is available.' },
        { title: 'Two rinses protect three tastes', text: 'A quiet evening at Parque Ñu Guasú reveals water for exactly two rinses. A strong taste would hide any gentler flavor that follows it.' },
        { title: 'Order matters more than speed', text: 'Ira could begin with strong, choose randomly, or taste mild then medium then strong while rinsing at both transitions.' },
        { title: 'Every flavor remains distinct', text: 'Ira tastes mild, rinses, tastes medium, rinses again and finishes with strong. The final sauce needs no later comparison, so the limited water is enough.' },
      ], approaches: [
        { label: 'Rank the flavor strength', callback: 'Ira remembers the useful tasting order.' }, { label: 'Reserve two rinses', callback: 'Ira remembers the transitions that protect each taste.' }, { label: 'Finish with strong', callback: 'Ira remembers why the boldest flavor came last.' },
      ], dilemma: { prompt: 'How should Ira taste all three sauces with two rinses?', answers: ['Taste strong first.', 'Choose the order randomly.', 'Taste mild, medium and strong, rinsing between them.'], correct: 2, explanation: 'Moving from mild to strong prevents an earlier bold flavor from masking the next sample, and two transitions use exactly two rinses.' }, closing: 'Three flavors remain recognizable because the spoon follows their strength.', keepsake: { name: 'Three-Taste Spoon Rest', description: 'A spoon rest marked mild, rinse, medium, rinse and strong.' } },
      country: { title: 'Make Space by Moving One Shelf', desire: 'competence', chapters: [
        { title: 'A tall book meets equal gaps', text: 'At Parque Ñu Guasú, Ira’s fictional project shelf has three twenty-unit gaps. One book is twenty-eight units tall; every other book is at most twelve.' },
        { title: 'Only the first board may move', text: 'Looking around ecologica shows the shelf height totals sixty units. The middle board stays fixed, while the first can shift upward by eight.' },
        { title: 'Every book must remain upright', text: 'Ira could lay the tall book flat, move both boards, or move the first board from twenty to twenty-eight, leaving gaps of twenty-eight, twelve and twenty.' },
        { title: 'One move creates three useful heights', text: 'The tall book stands in the new lower gap. Short books fill the twelve- and twenty-unit gaps, and the untouched middle board confirms only one shelf moved.' },
      ], approaches: [
        { label: 'Add the total height', callback: 'Ira remembers the fixed sixty units.' }, { label: 'Protect the middle board', callback: 'Ira remembers the one-move constraint.' }, { label: 'Match books to gaps', callback: 'Ira remembers how every book remained upright.' },
      ], dilemma: { prompt: 'How should Ira fit the twenty-eight-unit book?', answers: ['Move the first board to make gaps of twenty-eight, twelve and twenty.', 'Lay it flat across other books.', 'Move both shelf boards.'], correct: 0, explanation: 'Shifting one board by eight preserves the total height and leaves two gaps large enough for all books of twelve units or less.' }, closing: 'One measured shelf move gives the tallest book a proper place without displacing the shorter collection.', keepsake: { name: 'Twenty-Eight Gap Gauge', description: 'A slim gauge marked with the final three shelf heights.' } },
      missions: { daily: [
        { label: 'Enjoy two quiet evenings at Parque Ñu Guasú', purpose: 'Plan Ira’s mild-to-strong tasting order.', task: 'practical', count: 2 }, { label: 'Visit ecologica', purpose: 'Inspect the fictional one-board shelf change.', task: 'discovery-visit', count: 1 }, { label: 'Greet three game regulars in Asuncion', purpose: 'Give Ira tasters for the three-flavor challenge.', task: 'people', count: 3 },
      ], weekly: [
        { label: 'Look around three times at ecologica', purpose: 'Practise the twenty-eight, twelve and twenty gaps.', task: 'discovery', count: 3 }, { label: 'Visit two game places in Asuncion', purpose: 'Think through the two rinses.', task: 'places', count: 2 }, { label: 'Enjoy one quiet evening at Parque Ñu Guasú', purpose: 'Repeat the strength-based tasting sequence.', task: 'practical', count: 1 },
      ] },
    },
    {
      cityId: 'baku',
      city: { title: 'Three Tones across Six Beats', desire: 'curiosity', chapters: [
        { title: 'Every tone returns one beat later', text: 'At Izmir Garden, Corin’s fictional listening game must sound low, high and middle in order. Each original tone echoes on the following beat.' },
        { title: 'Adjacent tones overlap', text: 'Looking around Sabir Park reveals that a new tone played during an echo becomes hard to distinguish. The sequence must finish within six beats.' },
        { title: 'Silence can carry the order', text: 'Corin could play on three adjacent beats, reverse the tones, or play originals on beats one, three and five so each echo occupies the beat between.' },
        { title: 'The echoes receive their own spaces', text: 'Low sounds on beat one and echoes on two. High uses three and four; middle uses five and six. The ordered originals remain distinct.' },
      ], approaches: [
        { label: 'Mark the echo beats', callback: 'Corin remembers the returning sound after each original.' }, { label: 'Leave alternating spaces', callback: 'Corin remembers how silence prevented overlap.' }, { label: 'Count all six beats', callback: 'Corin remembers the complete low-high-middle sequence.' },
      ], dilemma: { prompt: 'How should Corin place the three original tones?', answers: ['Use beats one, two and three.', 'Use beats one, three and five.', 'Reverse the requested order.'], correct: 1, explanation: 'Alternating original and echo beats preserves the required order and completes exactly on beat six.' }, closing: 'Three originals and three echoes fill the sequence without covering one another.', keepsake: { name: 'Six-Beat Echo Strip', description: 'A strip alternating three tone marks with three echo rings.' } },
      country: { title: 'One Heat Change', desire: 'competence', chapters: [
        { title: 'Three dishes need two heats', text: 'At Sabir Park, Corin’s fictional shared kitchen has two dishes needing thirty minutes at the same heat and one needing fifteen minutes at another.' },
        { title: 'The oven holds a pair', text: 'A look around Izmir Garden confirms the oven holds two dishes together but the group has time for only one heat change.' },
        { title: 'Matching work should stay together', text: 'Corin could change heat for every dish, cook one matching dish alone, or cook the thirty-minute pair together before changing heat for the short dish.' },
        { title: 'One pair and one change complete the meal', text: 'The matching dishes share the first oven round. Corin changes the heat once, cooks the fifteen-minute dish and closes the fictional kitchen on schedule.' },
      ], approaches: [
        { label: 'Group the matching dishes', callback: 'Corin remembers the pair needing one heat.' }, { label: 'Reserve one heat change', callback: 'Corin remembers the transition before the short dish.' }, { label: 'Use both oven spaces', callback: 'Corin remembers how the long round stayed efficient.' },
      ], dilemma: { prompt: 'How should Corin schedule the three dishes?', answers: ['Change the heat before every dish.', 'Cook each matching dish alone.', 'Cook the matching pair together, then change heat once.'], correct: 2, explanation: 'The pair shares time and temperature, leaving the single allowed heat change for the distinct short dish.' }, closing: 'Two matching dishes leave together, and one short round follows a single deliberate heat change.', keepsake: { name: 'One-Change Oven Dial', description: 'A dial showing one paired long round and one short round.' } },
      missions: { daily: [
        { label: 'Look around once at Izmir Garden', purpose: 'Hear space between Corin’s fictional echo beats.', task: 'discovery', count: 1 }, { label: 'Visit Corin at Izmir Garden', purpose: 'Review the shared kitchen heat groups.', task: 'host-visit', count: 1 }, { label: 'Look around twice at Sabir Park', purpose: 'Prepare the low-high-middle timing.', task: 'practical', count: 2 },
      ], weekly: [
        { label: 'Look around three times at Sabir Park', purpose: 'Repeat the six-beat sound sequence.', task: 'practical', count: 3 }, { label: 'Visit three game places in Baku', purpose: 'Compare plans for the single heat change.', task: 'places', count: 3 }, { label: 'Look around twice at Izmir Garden', purpose: 'Practise alternating each tone and echo.', task: 'discovery', count: 2 },
      ] }
    },
    {
      cityId: 'basseterre',
      city: { title: 'Two Chocks on the Downhill Side', desire: 'competence', chapters: [
        { title: 'A display rolls while hands are busy', text: 'At St. Kitts Eco-Park, Ira’s fictional wheeled display drifts toward the low edge whenever the team releases it.' },
        { title: 'Only two chocks are available', text: 'Looking around National Heroes Park shows four wheels cannot be locked. Both downhill wheels remain reachable, and the floor direction does not change.' },
        { title: 'The display needs resistance on both sides', text: 'Ira could chock two wheels on one end, place both uphill, or put one chock behind each downhill wheel.' },
        { title: 'The frame stops without twisting', text: 'Ira seats one chock behind the left downhill wheel and one behind the right. Both sides meet resistance together, so the display stays square and still.' },
      ], approaches: [
        { label: 'Find the downhill direction', callback: 'Ira remembers where the display wanted to travel.' }, { label: 'Split the two chocks', callback: 'Ira remembers why both sides needed support.' }, { label: 'Test the released frame', callback: 'Ira remembers the stable final position.' },
      ], dilemma: { prompt: 'Where should Ira place the two chocks?', answers: ['Place one behind each downhill wheel.', 'Put both behind one end wheel.', 'Place both on the uphill side.'], correct: 0, explanation: 'Supporting both downhill wheels resists the shared drift without allowing one side to rotate ahead of the other.' }, closing: 'The display remains still when the team steps away, held evenly at its downhill edge.', keepsake: { name: 'Paired Wheel Chocks', description: 'Two small wedges marked left downhill and right downhill.' } },
      country: { title: 'Second Choices Break the Tie', desire: 'fairness', chapters: [
        { title: 'First choices produce no majority', text: 'At National Heroes Park, Ira’s five fictional outing ballots rank three games. No game receives three first choices, and one option has the unique lowest total.' },
        { title: 'Every ballot includes a second choice', text: 'A look around St. Kitts Eco-Park confirms the lowest option can leave without losing its voters’ preferences.' },
        { title: 'The group needs a deterministic finish', text: 'Ira could draw a winner, repeat the same vote, or remove the unique lowest option and transfer those ballots to their next ranked choice.' },
        { title: 'Transferred preferences create a majority', text: 'Ira removes the lowest option, reads its voters’ second choices and adds them to the remaining totals. One game now earns three of five preferences.' },
      ], approaches: [
        { label: 'Count first choices', callback: 'Ira remembers why no majority existed.' }, { label: 'Identify the unique lowest', callback: 'Ira remembers which option could leave cleanly.' }, { label: 'Transfer ranked choices', callback: 'Ira remembers how all five ballots still mattered.' },
      ], dilemma: { prompt: 'How should Ira resolve the ranked-choice result?', answers: ['Draw one option at random.', 'Remove the unique lowest and transfer its ballots.', 'Repeat the unchanged first-choice vote.'], correct: 1, explanation: 'The ranked second choices preserve every voter’s stated preference and produce a majority without inventing a new rule.' }, closing: 'The chosen game wins through three ranked preferences, and every ballot contributes to the result.', keepsake: { name: 'Transferred-Choice Token', description: 'A token showing a first arrow continuing to a second choice.' } },
      missions: { daily: [
        { label: 'Look around twice at National Heroes Park', purpose: 'Check Ira’s two downhill wheel positions.', task: 'practical', count: 2 }, { label: 'Visit St. Kitts Eco-Park', purpose: 'Review the fictional ranked-choice transfer.', task: 'discovery-visit', count: 1 }, { label: 'Greet two game regulars in Basseterre', purpose: 'Give Ira voters for the three-option game choice.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Look around three times at St. Kitts Eco-Park', purpose: 'Practise counting first and second preferences.', task: 'discovery', count: 3 }, { label: 'Visit two game places in Basseterre', purpose: 'Think through even downhill support.', task: 'places', count: 2 }, { label: 'Look around once at National Heroes Park', purpose: 'Repeat the paired-chock placement.', task: 'practical', count: 1 },
      ] },
    },
    {
      cityId: 'beirut',
      city: { title: 'Nine Chapters, Three Leaders', desire: 'recognition', chapters: [
        { title: 'One book must reach three readers', text: 'At Bchamoun Garden, Ira’s fictional book circle has one nine-chapter copy and one meeting. Every reader wants a meaningful leadership turn.' },
        { title: 'The book changes hands only twice', text: 'A quiet evening at Horsh Beirut reveals each reader can take one consecutive three-chapter section before passing the copy onward.' },
        { title: 'The meeting must cover the whole story', text: 'Ira could let one reader summarize everything, skip the middle, or assign consecutive thirds and invite the three recaps in story order.' },
        { title: 'Three voices rebuild one story', text: 'The first reader leads chapters one to three, the second four to six and the third seven to nine. Their ordered recaps join without a missing chapter.' },
      ], approaches: [
        { label: 'Divide consecutive thirds', callback: 'Ira remembers how one copy reached everyone.' }, { label: 'Give each reader a lead', callback: 'Ira remembers the three distinct contributions.' }, { label: 'Recap in story order', callback: 'Ira remembers how the whole plot returned.' },
      ], dilemma: { prompt: 'How should Ira organize the one-copy book circle?', answers: ['Let one reader lead every chapter.', 'Skip the middle section.', 'Assign consecutive thirds and recap them in order.'], correct: 2, explanation: 'Three consecutive sections cover all nine chapters and give every reader one complete leadership turn.' }, closing: 'The circle hears one continuous story carried by three clearly owned sections.', keepsake: { name: 'Three-Reader Chapter Band', description: 'A band divided into chapters one-three, four-six and seven-nine.' } },
      country: { title: 'A Quiet Role before One Loud Run', desire: 'autonomy', chapters: [
        { title: 'One friend wants a quieter contribution', text: 'At Horsh Beirut, Ira’s fictional group needs visual movement counts and one energetic full-volume rehearsal. A friend chooses not to join the loud run.' },
        { title: 'The quiet block needs a leader', text: 'Looking around Bchamoun Garden shows the visual counts can be designed and taught without music. A separate project area remains available during the final run.' },
        { title: 'Contribution does not require every activity', text: 'Ira could cancel the run, pressure the friend to join it, or let the friend lead the silent count block before observing the full run from the separate area.' },
        { title: 'The visual work guides the energetic finish', text: 'The friend teaches the counts in silence, then watches from the chosen area as the group performs once at full volume. Their contribution stays visible throughout.' },
      ], approaches: [
        { label: 'Build visual counts', callback: 'Ira remembers the quiet contribution the group needed.' }, { label: 'Keep one full run', callback: 'Ira remembers the rehearsal’s fixed energetic finish.' }, { label: 'Use the separate area', callback: 'Ira remembers the friend’s chosen place for observing.' },
      ], dilemma: { prompt: 'How should Ira include the friend’s chosen quiet role?', answers: ['Have the friend lead silent counts, then observe from the separate area.', 'Cancel the full run.', 'Require everyone to join the loud section.'], correct: 0, explanation: 'The plan completes both necessary rehearsal parts while honoring the friend’s chosen form of contribution.' }, closing: 'Silent counts shape the final run, and the friend sees their work carried through every movement.', keepsake: { name: 'Visual Count Ribbon', description: 'A ribbon marked with the rehearsal’s silent movement counts.' } },
      missions: { daily: [
        { label: 'Enjoy one quiet evening at Horsh Beirut', purpose: 'Plan Ira’s three ordered book recaps.', task: 'practical', count: 1 }, { label: 'Visit two game places in Beirut', purpose: 'Compare spaces for the quiet and loud rehearsal roles.', task: 'places', count: 2 }, { label: 'Look around once at Bchamoun Garden', purpose: 'Prepare the fictional visual-count role.', task: 'discovery', count: 1 },
      ], weekly: [
        { label: 'Enjoy two quiet evenings at Horsh Beirut', purpose: 'Repeat the ordered three-reader recap.', task: 'practical', count: 2 }, { label: 'Visit Ira at Bchamoun Garden', purpose: 'Review the silent-count rehearsal role.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Beirut', purpose: 'Give Ira readers for the ordered three-part recap.', task: 'people', count: 3 },
      ] }
    },
    {
      cityId: 'bratislava',
      city: { title: 'Clean the Axle before the Oil', desire: 'competence', chapters: [
        { title: 'The empty cart squeaks', text: 'At Lippayova záhrada, Ira’s fictional hand cart squeaks and resists each turn even after its load is removed.' },
        { title: 'Grit surrounds the dry axle', text: 'A quiet evening at Zámocký Park reveals one cloth and enough oil for one application. Oil placed over grit would trap it.' },
        { title: 'The order determines the repair', text: 'Ira could oil immediately, force the wheel, or lift the unloaded wheel, wipe the axle, oil it once and test.' },
        { title: 'A clean surface takes the oil', text: 'Ira wipes away the grit before applying the oil. The wheel turns quietly on its test without wasting the single application.' },
      ], approaches: [
        { label: 'Unload and lift the wheel', callback: 'Ira remembers how the axle became reachable.' }, { label: 'Wipe before oiling', callback: 'Ira remembers the grit that had to leave first.' }, { label: 'Test one full turn', callback: 'Ira remembers the quiet result.' },
      ], dilemma: { prompt: 'How should Ira use the cloth and single oil application?', answers: ['Oil over the grit.', 'Clean the axle, oil once and test.', 'Force the wheel until it loosens.'], correct: 1, explanation: 'Cleaning first prevents trapped grit and lets the one oil application reach the dry axle.' }, closing: 'The empty cart completes a quiet turn because the repair followed the cause in order.', keepsake: { name: 'Clean-Axle Cloth Patch', description: 'A cloth patch marked wipe, oil and test.' } },
      country: { title: 'One Friend Bridges Two Sessions', desire: 'continuity', chapters: [
        { title: 'Seven friends have divided schedules', text: 'At Zámocký Park, Ira’s fictional goal club has three morning-only friends, three evening-only friends and one flexible friend.' },
        { title: 'Each session holds four', text: 'Looking around Lippayova záhrada shows both sessions need a participant who heard the other group. Only the flexible friend can attend both.' },
        { title: 'Continuity needs a living link', text: 'Ira could run unrelated sessions, overfill one, or place the flexible friend in both and carry the same opening question between them.' },
        { title: 'Two groups continue one conversation', text: 'The morning group answers the opening question. The flexible friend brings its key idea to the evening group, which adds its own answer.' },
      ], approaches: [
        { label: 'Fit three plus one', callback: 'Ira remembers how each session stayed within four places.' }, { label: 'Repeat the opening question', callback: 'Ira remembers the shared point between groups.' }, { label: 'Carry one key idea', callback: 'Ira remembers the flexible friend’s bridge role.' },
      ], dilemma: { prompt: 'How should Ira connect the two fixed sessions?', answers: ['Run them with unrelated goals.', 'Put all seven in one session.', 'Have the flexible friend attend both with one shared question.'], correct: 2, explanation: 'Three fixed participants plus the flexible friend fill each session and preserve continuity without changing anyone’s availability.' }, closing: 'Morning and evening remain separate meetings, joined by one question and one returning friend.', keepsake: { name: 'Two-Session Link Card', description: 'A card with morning and evening circles joined by one name.' } },
      missions: { daily: [
        { label: 'Enjoy one quiet evening at Zámocký Park', purpose: 'Plan Ira’s clean-then-oil repair.', task: 'practical', count: 1 }, { label: 'Visit Ira at Lippayova záhrada', purpose: 'Review the fictional two-session bridge.', task: 'host-visit', count: 1 }, { label: 'Greet four game regulars in Bratislava', purpose: 'Give Ira participants for one goal session.', task: 'people', count: 4 },
      ], weekly: [
        { label: 'Look around three times at Lippayova záhrada', purpose: 'Practise carrying one question between groups.', task: 'discovery', count: 3 }, { label: 'Visit two game places in Bratislava', purpose: 'Think through the one-application axle repair.', task: 'places', count: 2 }, { label: 'Enjoy two quiet evenings at Zámocký Park', purpose: 'Repeat the wipe, oil and test order.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'chagos',
      city: { title: 'The Cup at the Center of the Tray', desire: 'care', chapters: [
        { title: 'One cup pulls the tray sideways', text: 'At Recreation area (game venue), Jesse’s fictional counter tray holds one full cup and four empty bowls. The cup sits near an edge.' },
        { title: 'Nothing may leave or stack', text: 'Having a simple meal at Visitor meal stop (game venue) shows the tray has space for a central cup and two bowls on either side.' },
        { title: 'Balance needs symmetry', text: 'Jesse could grip the tilted tray harder, stack bowls, or center the cup and place equal bowl pairs opposite one another.' },
        { title: 'The load settles around its center', text: 'Jesse moves the cup to the middle and mirrors two bowls on each side. The tray stays level during the fictional carry.' },
      ], approaches: [
        { label: 'Center the full cup', callback: 'Jesse remembers where the weight belonged.' }, { label: 'Mirror the empty bowls', callback: 'Jesse remembers the balanced pairs.' }, { label: 'Test the whole tray', callback: 'Jesse remembers the level carry.' },
      ], dilemma: { prompt: 'How should Jesse balance the fixed tray load?', answers: ['Center the cup and mirror the bowl pairs.', 'Hold the tilted tray more tightly.', 'Stack all four bowls.'], correct: 0, explanation: 'Centering the only heavy item and distributing equal light items symmetrically removes the sideways pull.' }, closing: 'One full cup travels level inside a quiet ring of four bowls.', keepsake: { name: 'Centered Tray Token', description: 'A tray token with one center circle and four mirrored outlines.' } },
      country: { title: 'Meet at the Passing Bay', desire: 'belonging', chapters: [
        { title: 'Two carts enter one narrow path', text: 'At Visitor meal stop (game venue), two fictional cleanup crews approach from opposite ends with carts that cannot reverse.' },
        { title: 'One passing bay favors the farther crew', text: 'A quiet evening at Recreation area (game venue) reveals the bay lies two-thirds from the nearer crew’s entrance.' },
        { title: 'Both carts need a clear route', text: 'Jesse could send both immediately, make one reverse, or send the farther crew to the bay while the nearer waits at its entrance.' },
        { title: 'The meeting happens where passing is possible', text: 'The farther cart reaches the bay and stops. The near cart enters, passes safely, and both crews continue without backing up.' },
      ], approaches: [
        { label: 'Locate the passing bay', callback: 'Jesse remembers the only wide point.' }, { label: 'Send the farther cart first', callback: 'Jesse remembers which crew had to start early.' }, { label: 'Hold at the entrance', callback: 'Jesse remembers how the near route stayed clear.' },
      ], dilemma: { prompt: 'How should the two carts use the narrow path?', answers: ['Send both into the path together.', 'Stage the farther cart in the bay before the nearer enters.', 'Require one cart to reverse.'], correct: 1, explanation: 'The passing bay can serve both only if the farther cart occupies it before the nearer cart blocks the route.' }, closing: 'The carts cross once at the bay and roll onward in opposite directions.', keepsake: { name: 'Passing-Bay Route Peg', description: 'A narrow route peg widened at one off-center meeting point.' } },
      missions: { daily: [
        { label: 'Enjoy one quiet evening at Recreation area (game venue) in Île Boddam', purpose: 'Plan the fictional passing-bay sequence.', task: 'discovery', count: 1 }, { label: 'Visit Visitor meal stop (game venue) in Île Boddam', purpose: 'Inspect a setting for Jesse’s balanced tray.', task: 'practical-visit', count: 1 }, { label: 'Have two simple meals at Visitor meal stop (game venue)', purpose: 'Repeat the center-and-pairs tray arrangement.', task: 'practical', count: 2 },
      ], weekly: [
        { label: 'Have three simple meals at Visitor meal stop (game venue)', purpose: 'Check the centered cup and opposite bowls.', task: 'practical', count: 3 }, { label: 'Visit two game places in Île Boddam', purpose: 'Compare routes for the narrow-path encounter.', task: 'places', count: 2 }, { label: 'Greet two game regulars in Île Boddam', purpose: 'Give Jesse crews for the passing-bay plan.', task: 'people', count: 2 },
      ] }
    },
    {
      cityId: 'flying-fish-cove',
      city: { title: 'The Cord Loop inside the Tube', desire: 'curiosity', chapters: [
        { title: 'A soft token stops at the middle', text: 'At Poon Saan Park, Uri’s fictional game token is trapped in a clear tube. The tube cannot open or tilt.' },
        { title: 'Two cords can overlap beyond it', text: 'A quiet evening at Drumsite Park reveals a cord can enter from each end. Neither reaches around the token alone.' },
        { title: 'The token needs a movable cradle', text: 'Uri could shake the fixed tube, push with one short cord, or overlap and cross both cords beyond the token to form a loop.' },
        { title: 'The loop draws the token home', text: 'Uri crosses the overlapping cords, tightens them gently around the token and pulls toward one opening. The soft piece slides out intact.' },
      ], approaches: [
        { label: 'Feed cords from both ends', callback: 'Uri remembers how the short lengths met.' }, { label: 'Cross beyond the token', callback: 'Uri remembers where the loop formed.' }, { label: 'Draw toward one opening', callback: 'Uri remembers the successful rescue direction.' },
      ], dilemma: { prompt: 'How should Uri retrieve the token without tilting the tube?', answers: ['Shake the fixed tube.', 'Push with one cord that cannot reach.', 'Cross two overlapping cords into a pulling loop.'], correct: 2, explanation: 'The two cords jointly reach beyond the token and form a movable cradle without opening the tube.' }, closing: 'A loop made from two short cords carries the soft token through the nearest opening.', keepsake: { name: 'Crossed-Cord Loop', description: 'Two short cords joined in a loose rescue loop.' } },
      country: { title: 'Dependencies before the Shared Finish', desire: 'competence', chapters: [
        { title: 'Four tasks share two stations', text: 'At Drumsite Park, four friends use two fictional cooking stations. Chopping must precede mixing, and heating must precede garnishing.' },
        { title: 'The first tasks are independent', text: 'Looking around Poon Saan Park shows chopping and heating can begin together. Mixing and garnishing wait for those results.' },
        { title: 'Busy stations are not enough', text: 'Uri could start a dependent task early, leave one station idle, or chop and heat in parallel before mixing and garnishing.' },
        { title: 'Both paths meet at the finish', text: 'Two friends chop and heat. When both stations free, the others mix and garnish, completing each dependency without a queue.' },
      ], approaches: [
        { label: 'Name both prerequisites', callback: 'Uri remembers what mixing and garnishing require.' }, { label: 'Start independent work together', callback: 'Uri remembers the productive first round.' }, { label: 'Release both finishing tasks', callback: 'Uri remembers the clean second round.' },
      ], dilemma: { prompt: 'How should Uri use the two stations?', answers: ['Run chopping and heating, then mixing and garnishing.', 'Start mixing before chopping.', 'Leave one station unused.'], correct: 0, explanation: 'The independent prerequisites fill round one and unlock both dependent tasks for round two.' }, closing: 'Two parallel starts become two ready finishes without breaking either recipe dependency.', keepsake: { name: 'Two-Station Dependency Tile', description: 'A tile with two starting arrows feeding two finishing arrows.' } },
      missions: { daily: [
        { label: 'Enjoy one quiet evening at Drumsite Park', purpose: 'Plan Uri’s two-cord token rescue.', task: 'practical', count: 1 }, { label: 'Visit Uri at Poon Saan Park', purpose: 'Review the fictional station dependencies.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Flying Fish Cove', purpose: 'Give Uri partners for the two-stage task plan.', task: 'people', count: 3 },
      ], weekly: [
        { label: 'Look around three times at Poon Saan Park', purpose: 'Practise the parallel prerequisites.', task: 'discovery', count: 3 }, { label: 'Visit three game places in Flying Fish Cove', purpose: 'Think through the crossed-cord loop.', task: 'places', count: 3 }, { label: 'Enjoy two quiet evenings at Drumsite Park', purpose: 'Repeat the fictional token rescue.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'hagatna',
      city: { title: 'Five Players Rotate the Whistle', desire: 'fairness', chapters: [
        { title: 'Four play while one watches', text: 'At Barrigada War Memorial Park, Parker’s fictional court holds one two-versus-two match and one referee. Five friends want equal participation.' },
        { title: 'Five rounds fit five referee turns', text: 'Looking around Chief Quipuha Park shows each round needs exactly one referee. Nobody needs to take the whistle twice.' },
        { title: 'The waiting role can travel', text: 'Parker could keep one permanent referee, choose randomly each round, or publish a five-round order with every player refereeing once.' },
        { title: 'Every player gets four matches', text: 'The whistle moves to a new player after every round. By round five, each friend has refereed once and played four times.' },
      ], approaches: [
        { label: 'List five referee turns', callback: 'Parker remembers the complete rotation.' }, { label: 'Move the whistle each round', callback: 'Parker remembers the visible handoff.' }, { label: 'Count four playing rounds', callback: 'Parker remembers every player’s equal court time.' },
      ], dilemma: { prompt: 'How should Parker assign the referee role?', answers: ['Keep one referee all day.', 'Rotate the role once through all five players.', 'Draw a hidden name every round.'], correct: 1, explanation: 'Five rounds and five players allow one referee turn each, leaving four playing rounds per person.' }, closing: 'The last whistle completes a rotation everyone could see from the start.', keepsake: { name: 'Five-Turn Whistle Ring', description: 'A ring with five equal referee marks.' } },
      country: { title: 'Two Cuts Make Three Exact Lengths', desire: 'competence', chapters: [
        { title: 'One strip holds three orders', text: 'At Chief Quipuha Park, Parker’s fictional workshop has one nine-unit strip and orders for lengths two, three and four.' },
        { title: 'Only two cuts are allowed', text: 'A look around Barrigada War Memorial Park confirms the requested lengths total nine. Two cuts can create exactly three pieces.' },
        { title: 'Cut positions must serve every order', text: 'Parker could cut equal thirds, leave scrap, or cut after units two and five to produce lengths two, three and four.' },
        { title: 'The full strip becomes three orders', text: 'Parker marks unit two, then three units farther at unit five. The remaining four-unit section completes the set with no scrap.' },
      ], approaches: [
        { label: 'Add the requested lengths', callback: 'Parker remembers why no scrap was needed.' }, { label: 'Mark cumulative cuts', callback: 'Parker remembers positions two and five.' }, { label: 'Check all three pieces', callback: 'Parker remembers the exact order set.' },
      ], dilemma: { prompt: 'Where should Parker make the two cuts?', answers: ['Cut the strip into equal thirds.', 'Choose positions that leave scrap.', 'Cut after units two and five.'], correct: 2, explanation: 'The cumulative marks create two-, three- and four-unit pieces whose lengths use the full nine-unit strip.' }, closing: 'Two marks turn one complete strip into three exact fictional orders.', keepsake: { name: 'Two-Five Cut Gauge', description: 'A nine-unit gauge marked at the two exact cut positions.' } },
      missions: { daily: [
        { label: 'Look around once at Barrigada War Memorial Park', purpose: 'Mark Parker’s two cumulative fictional cut points.', task: 'discovery', count: 1 }, { label: 'Visit two game places in Hagåtña', purpose: 'Compare settings for the five-round rotation.', task: 'places', count: 2 }, { label: 'Look around once at Chief Quipuha Park', purpose: 'Prepare one referee turn for each player.', task: 'practical', count: 1 },
      ], weekly: [
        { label: 'Look around three times at Chief Quipuha Park', purpose: 'Repeat Parker’s visible player rotation.', task: 'practical', count: 3 }, { label: 'Visit Parker at Barrigada War Memorial Park', purpose: 'Review the two-cut strip plan.', task: 'host-visit', count: 1 }, { label: 'Greet four game regulars in Hagåtña', purpose: 'Give Parker players for the fair court rounds.', task: 'people', count: 4 },
      ] }
    },
    {
      cityId: 'harare',
      city: { title: 'The Cloth beneath the Short Leg', desire: 'care', chapters: [
        { title: 'One table rocks under a shared meal', text: 'At Greenwood Park, Jesse’s fictional café table tips whenever a plate reaches one corner. The tabletop must remain available.' },
        { title: 'One leg ends above the floor', text: 'Having a simple meal at Afrotopia Café @ The Gallery reveals a gentle corner press identifies the short leg. One cloth can be folded.' },
        { title: 'The fix belongs below the gap', text: 'Jesse could hold the table throughout, pile cloth on top, or fold the cloth beneath the short leg until the surface settles.' },
        { title: 'A small support steadies every place', text: 'Jesse folds the cloth to the measured gap and slides it under the short leg. Plates now remain level at all four places.' },
      ], approaches: [
        { label: 'Press each corner gently', callback: 'Jesse remembers how the short leg was found.' }, { label: 'Fold to the gap', callback: 'Jesse remembers the needed thickness.' }, { label: 'Test all four places', callback: 'Jesse remembers the stable table.' },
      ], dilemma: { prompt: 'How should Jesse steady the table with one cloth?', answers: ['Fold it beneath the short leg.', 'Hold the table for the whole meal.', 'Place the cloth on the tabletop.'], correct: 0, explanation: 'The rocking test identifies the one gap, and a folded support closes it without removing the table from use.' }, closing: 'A cloth hidden beneath one leg lets the whole table share a steady meal.', keepsake: { name: 'Short-Leg Fold', description: 'A folded cloth patch matching one small floor gap.' } },
      country: { title: 'Six Plots in Two Full Trips', desire: 'competence', chapters: [
        { title: 'A carrier holds three measures', text: 'At Afrotopia Café @ The Gallery, Jesse’s fictional garden game has six plots, each needing one measure from a three-measure carrier.' },
        { title: 'Only two trips fit', text: 'A quiet evening at Greenwood Park confirms every measure must be used before returning. Three adjacent plots form each side of the route.' },
        { title: 'Partial trips would fail the count', text: 'Jesse could serve plots randomly, return half-full, or complete one adjacent group of three on each full trip.' },
        { title: 'Two empty returns prove completion', text: 'The first full carrier serves three neighboring plots. Jesse refills once, serves the other three and returns empty after exactly two trips.' },
      ], approaches: [
        { label: 'Group three adjacent plots', callback: 'Jesse remembers the first full route.' }, { label: 'Empty before returning', callback: 'Jesse remembers the capacity proof.' }, { label: 'Repeat on the other side', callback: 'Jesse remembers the complete six-plot result.' },
      ], dilemma: { prompt: 'How should Jesse cover six plots in two trips?', answers: ['Visit plots in a random order.', 'Serve one adjacent group of three per full trip.', 'Return with unused measures.'], correct: 1, explanation: 'Two full three-measure trips cover all six plots exactly and avoid carrying unused capacity back.' }, closing: 'Two full carriers return empty after six fictional plots receive one measure each.', keepsake: { name: 'Two-Trip Measure Clip', description: 'A clip showing two groups of three plot marks.' } },
      missions: { daily: [
        { label: 'Have one simple meal at Afrotopia Café @ The Gallery', purpose: 'Check Jesse’s fictional table stability.', task: 'practical', count: 1 }, { label: 'Visit Jesse at Greenwood Park', purpose: 'Review the two full garden trips.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Harare', purpose: 'Give Jesse neighbors for the six-plot plan.', task: 'people', count: 3 },
      ], weekly: [
        { label: 'Enjoy three quiet evenings at Greenwood Park', purpose: 'Practise grouping the fictional plot route.', task: 'discovery', count: 3 }, { label: 'Visit three game places in Harare', purpose: 'Think through the folded-cloth support.', task: 'places', count: 3 }, { label: 'Have two simple meals at Afrotopia Café @ The Gallery', purpose: 'Repeat the short-leg table check.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'honiara',
      city: { title: 'Three, Three and Two Decorations', desire: 'belonging', chapters: [
        { title: 'Eight decorations need three spans', text: "At Children's Park, Jesse’s fictional neighbor celebration has eight paper decorations and three strings that hold at most three each." },
        { title: 'The centerpiece needs breathing room', text: 'Having a simple meal at The Ofis shows the centerpiece can share a span with one small decoration, while the others are equal.' },
        { title: 'No string may carry four', text: 'Jesse could overload one string, leave a decoration down, or arrange three, three and two with the centerpiece in the smallest group.' },
        { title: 'Every decoration hangs safely', text: 'Two strings carry three small decorations each. The last holds the centerpiece and one companion, keeping all spans within their limits.' },
      ], approaches: [
        { label: 'Count each string limit', callback: 'Jesse remembers the maximum of three.' }, { label: 'Reserve the centerpiece span', callback: 'Jesse remembers the two-decoration group.' }, { label: 'Hang every piece', callback: 'Jesse remembers the complete celebration.' },
      ], dilemma: { prompt: 'How should Jesse divide eight decorations?', answers: ['Hang four on one string.', 'Leave one decoration unused.', 'Use groups of three, three and two.'], correct: 2, explanation: 'The three groups total eight and none exceeds the stated capacity.' }, closing: 'Eight decorations brighten three spans, with the centerpiece clear inside the smallest group.', keepsake: { name: 'Three-Three-Two Garland', description: 'A tiny garland divided into the three safe groups.' } },
      country: { title: 'One Playable Game from Three Sets', desire: 'curiosity', chapters: [
        { title: 'Three incomplete games arrive', text: "At The Ofis, Jesse’s fictional game night has one set missing a board, one missing tokens and one missing a die." },
        { title: 'The surviving pieces are compatible', text: "A quiet evening at Children's Park confirms one complete board, token group and die remain across the three boxes." },
        { title: 'The group needs one playable set', text: 'Jesse could abandon all three, invent pieces, or combine the compatible survivors and rotate who sets each challenge.' },
        { title: 'A shared game begins', text: 'The board, tokens and die meet on one table. A different friend sets the opening challenge each round, so every donor shapes play.' },
      ], approaches: [
        { label: 'Check surviving components', callback: 'Jesse remembers the compatible board, tokens and die.' }, { label: 'Build one complete set', callback: 'Jesse remembers the playable combination.' }, { label: 'Rotate the challenge setter', callback: 'Jesse remembers how each friend stayed involved.' },
      ], dilemma: { prompt: 'What should Jesse do with the three incomplete sets?', answers: ['Combine compatible pieces into one game.', 'Put every set away.', 'Create imaginary replacements.'], correct: 0, explanation: 'The surviving components fill one another’s exact gaps without altering or inventing game pieces.' }, closing: 'Three incomplete boxes produce one complete evening of rotating challenges.', keepsake: { name: 'Combined Game Token', description: 'A token showing board, piece and die symbols together.' } },
      missions: { daily: [
        { label: 'Have one simple meal at The Ofis', purpose: 'Plan Jesse’s three decoration spans.', task: 'practical', count: 1 }, { label: "Visit Jesse at Children's Park", purpose: 'Review the combined fictional game set.', task: 'host-visit', count: 1 }, { label: "Enjoy one quiet evening at Children's Park", purpose: 'Prepare the board, tokens and die rotation.', task: 'discovery', count: 1 },
      ], weekly: [
        { label: "Enjoy two quiet evenings at Children's Park", purpose: 'Practise combining the compatible game pieces.', task: 'discovery', count: 2 }, { label: 'Visit three game places in Honiara', purpose: 'Compare settings for the three-three-two decoration split.', task: 'places', count: 3 }, { label: 'Greet two game regulars in Honiara', purpose: 'Give Jesse partners for the game night.', task: 'people', count: 2 },
      ] }
    },
    {
      cityId: 'kampala',
      city: { title: 'Equal Pulls for the Awning', desire: 'competence', chapters: [
        { title: 'Two edges rise unevenly', text: 'At Entebbe Botanical Gardens, Jesse’s fictional shop awning tilts because its two pull cords begin with different slack.' },
        { title: 'Neither side may lead by a hand-span', text: 'Having a simple meal at Cafe Javas shows both cords remain usable and neither may be cut.' },
        { title: 'The tighter side must sometimes wait', text: 'Jesse could yank both continuously, cut the longer cord, or alternate equal hand-span pulls while pausing whichever edge reaches the limit.' },
        { title: 'The edges meet at the top', text: 'Jesse pulls in measured turns and pauses the tight side once. Both awning edges arrive level without changing either cord.' },
      ], approaches: [
        { label: 'Measure one hand-span', callback: 'Jesse remembers the equal pull unit.' }, { label: 'Watch both edges', callback: 'Jesse remembers when one side needed to pause.' }, { label: 'Finish level', callback: 'Jesse remembers the aligned awning.' },
      ], dilemma: { prompt: 'How should Jesse raise the uneven awning?', answers: ['Yank both cords continuously.', 'Alternate equal pulls and pause the leading side.', 'Cut the longer cord.'], correct: 1, explanation: 'Measured alternating pulls absorb the initial slack difference while keeping both edges within the allowed gap.' }, closing: 'Two unchanged cords finish with one level fictional awning.', keepsake: { name: 'Hand-Span Pull Marker', description: 'A cord marker showing the shared pull length.' } },
      country: { title: 'Lower the Ladder Only Once', desire: 'competence', chapters: [
        { title: 'Three tasks sit at three heights', text: 'At Cafe Javas, three neighbors share an adjustable fictional ladder for high, medium and low project jobs.' },
        { title: 'The ladder may descend but not rise again', text: 'A quiet evening at Entebbe Botanical Gardens reveals every adjustment locks safely downward until the session ends.' },
        { title: 'Task order determines completion', text: 'Jesse could begin low, jump between heights, or finish high first before lowering for medium and then low.' },
        { title: 'One direction completes every job', text: 'The highest task finishes at full extension. Jesse lowers the ladder for medium, then low, never needing a forbidden upward reset.' },
      ], approaches: [
        { label: 'Rank the three heights', callback: 'Jesse remembers the descending order.' }, { label: 'Begin at full extension', callback: 'Jesse remembers the only chance to reach high.' }, { label: 'Lower after completion', callback: 'Jesse remembers the one-way adjustments.' },
      ], dilemma: { prompt: 'In what order should the ladder tasks run?', answers: ['Low, medium, high.', 'Switch heights after every step.', 'High, medium, low.'], correct: 2, explanation: 'Descending order respects the no-raising constraint and still reaches all three heights.' }, closing: 'The ladder ends low after completing high, medium and low work once each.', keepsake: { name: 'Descending Ladder Tag', description: 'A tag with three steps pointing downward.' } },
      missions: { daily: [
        { label: 'Have one simple meal at Cafe Javas', purpose: 'Plan Jesse’s equal awning pulls.', task: 'practical', count: 1 }, { label: 'Visit Jesse at Entebbe Botanical Gardens', purpose: 'Review the fictional descending ladder jobs.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Kampala', purpose: 'Give Jesse neighbors for the height sequence.', task: 'people', count: 3 },
      ], weekly: [
        { label: 'Enjoy three quiet evenings at Entebbe Botanical Gardens', purpose: 'Practise the high-to-low task order.', task: 'discovery', count: 3 }, { label: 'Visit two game places in Kampala', purpose: 'Think through the alternating pull lengths.', task: 'places', count: 2 }, { label: 'Have two simple meals at Cafe Javas', purpose: 'Repeat the level-awning plan.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'kingston-nf',
      city: { title: 'Three Shots at Each Goal', desire: 'fairness', chapters: [
        { title: 'Two targets reward different skills', text: 'At Lions Park, Wren’s friendly ball game has one wide goal and one narrow goal. Raw totals from only one goal would favor its specialists.' },
        { title: 'Every player has six shots', text: 'Looking around Norfolk Island Memorial Park shows the schedule fits exactly three attempts at each goal.' },
        { title: 'Comparable evidence needs both targets', text: 'Wren could let players choose a goal, use only the narrow one, or give everyone three shots at each and combine results.' },
        { title: 'One score reflects both challenges', text: 'Each player completes both three-shot blocks. Wren adds the results, so the ranking includes wide-goal control and narrow-goal precision.' },
      ], approaches: [
        { label: 'Split six into two blocks', callback: 'Wren remembers the equal attempt count.' }, { label: 'Use both goals', callback: 'Wren remembers the two different demands.' }, { label: 'Combine the results', callback: 'Wren remembers the comparable final score.' },
      ], dilemma: { prompt: 'How should Wren compare the players?', answers: ['Give three shots at each goal and combine them.', 'Let each choose a goal.', 'Use only the narrow target.'], correct: 0, explanation: 'Equal attempts at both fixed targets create the same test for every player.' }, closing: 'The final score belongs to six shots across both kinds of challenge.', keepsake: { name: 'Two-Goal Score Disc', description: 'A disc divided into wide and narrow three-shot halves.' } },
      country: { title: 'Two Balanced Goals from Six Boards', desire: 'competence', chapters: [
        { title: 'Six boards must form four equal sides', text: 'At Norfolk Island Memorial Park, Wren’s fictional build has two long boards and four boards exactly half their length.' },
        { title: 'No cutting is allowed', text: 'A look around Lions Park shows paired short boards can join end to end and every board must be used.' },
        { title: 'Opposite sides should match', text: 'Wren could discard shorts, overlap lengths, or place long boards opposite and join two short boards for each remaining side.' },
        { title: 'Six pieces close one equal frame', text: 'The two long boards face each other. Two joined short pairs complete the other sides at the same length.' },
      ], approaches: [
        { label: 'Match half-length pairs', callback: 'Wren remembers how four shorts became two sides.' }, { label: 'Place long sides opposite', callback: 'Wren remembers the balanced frame.' }, { label: 'Use all six boards', callback: 'Wren remembers the complete build.' },
      ], dilemma: { prompt: 'How should Wren build four equal sides?', answers: ['Discard the short boards.', 'Use two long sides and two joined short pairs.', 'Overlap unequal lengths.'], correct: 1, explanation: 'Each short pair equals one long board, producing four matched sides without cutting.' }, closing: 'Two single boards and two joined pairs close one equal-sided fictional frame.', keepsake: { name: 'Joined-Side Corner', description: 'A model corner showing one long side and one paired side.' } },
      missions: { daily: [
        { label: 'Look around once at Norfolk Island Memorial Park', purpose: 'Plan Wren’s two-goal shot split.', task: 'practical', count: 1 }, { label: 'Visit Wren at Lions Park', purpose: 'Review the six-board fictional frame.', task: 'host-visit', count: 1 }, { label: 'Greet four game regulars in Kingston', purpose: 'Give Wren players for the fair score.', task: 'people', count: 4 },
      ], weekly: [
        { label: 'Look around twice at Lions Park', purpose: 'Practise joining the half-length boards.', task: 'discovery', count: 2 }, { label: 'Visit three game places in Kingston', purpose: 'Think through equal attempts at both goals.', task: 'places', count: 3 }, { label: 'Look around three times at Norfolk Island Memorial Park', purpose: 'Repeat the combined scoring plan.', task: 'practical', count: 3 },
      ] },
    },
    {
      cityId: 'kinshasa',
      city: { title: 'The Tray Turns before the Door', desire: 'competence', chapters: [
        { title: 'A wide tray meets a narrow doorway', text: 'At Parc Naturel de la Nsele (Mangiers), Jesse’s fictional tray holds three fragile cups and is wider than the project doorway.' },
        { title: 'The diagonal fits', text: 'Having a simple meal at petit restaurant et plage shows the doorway diagonal exceeds the tray width. Cups cannot leave and the tray must stay level.' },
        { title: 'Orientation is the available change', text: 'Jesse could remove cups, tilt the tray, or turn it level and guide the long corner through first.' },
        { title: 'Three cups pass without tipping', text: 'Jesse rotates before the threshold, advances the far corner and follows with the near corner. The level tray clears the doorway.' },
      ], approaches: [
        { label: 'Compare width and diagonal', callback: 'Jesse remembers the opening that fit.' }, { label: 'Turn while still clear', callback: 'Jesse remembers where orientation changed.' }, { label: 'Lead with one corner', callback: 'Jesse remembers the safe passage.' },
      ], dilemma: { prompt: 'How should Jesse move the tray through the doorway?', answers: ['Remove the fragile cups.', 'Tilt the loaded tray.', 'Rotate it level and lead with the long corner.'], correct: 2, explanation: 'The diagonal opening fits the unchanged level tray when its orientation changes before entry.' }, closing: 'Three cups cross the narrow doorway on the same level tray.', keepsake: { name: 'Diagonal Doorway Tile', description: 'A doorway tile with a tray turning through one corner.' } },
      country: { title: 'One Shared Briefing, Two Solo Consultations', desire: 'fairness', chapters: [
        { title: 'Four teams request three help intervals', text: 'At petit restaurant et plage, Jesse’s fictional project has four teams and only three consultation intervals.' },
        { title: 'Two requests are identical', text: 'A quiet evening at Parc Naturel de la Nsele (Mangiers) reveals two teams need the same opening briefing; the others need separate advice.' },
        { title: 'Shared information can share time', text: 'Jesse could reject one team, rush all four together, or brief the matching pair jointly and reserve one interval for each other team.' },
        { title: 'Three intervals serve four teams', text: 'The identical briefing opens with two teams. Separate consultations follow, and every request receives its needed format.' },
      ], approaches: [
        { label: 'Match identical requests', callback: 'Jesse remembers the pair that could share.' }, { label: 'Protect solo intervals', callback: 'Jesse remembers the distinct advice.' }, { label: 'Count three complete sessions', callback: 'Jesse remembers the full schedule.' },
      ], dilemma: { prompt: 'How should Jesse fit four teams into three intervals?', answers: ['Share the identical briefing, then hold two solo sessions.', 'Reject one team.', 'Rush everyone through one meeting.'], correct: 0, explanation: 'Combining only the identical request preserves two intervals for advice that cannot be shared.' }, closing: 'Four teams leave three complete consultations with no request compressed into the wrong format.', keepsake: { name: 'Shared-Briefing Slot', description: 'A three-slot card with two team marks in the first.' } },
      missions: { daily: [
        { label: 'Enjoy one quiet evening at Parc Naturel de la Nsele (Mangiers)', purpose: 'Plan the shared briefing before solo consultations.', task: 'discovery', count: 1 }, { label: 'Visit petit restaurant et plage', purpose: 'Inspect a setting for Jesse’s level tray turn.', task: 'practical-visit', count: 1 }, { label: 'Have one simple meal at petit restaurant et plage', purpose: 'Prepare the diagonal doorway approach.', task: 'practical', count: 1 },
      ], weekly: [
        { label: 'Enjoy two quiet evenings at Parc Naturel de la Nsele (Mangiers)', purpose: 'Practise matching the identical briefing requests.', task: 'discovery', count: 2 }, { label: 'Visit two game places in Kinshasa', purpose: 'Compare layouts for the three consultation intervals.', task: 'places', count: 2 }, { label: 'Greet two game regulars in Kinshasa', purpose: 'Give Jesse teams for the shared briefing.', task: 'people', count: 2 },
      ] }
    },
    {
      cityId: 'lilongwe',
      city: { title: 'The Leg with the Smallest Loss', desire: 'fairness', chapters: [
        { title: 'Two runners want the middle leg', text: 'At Bingu National Stadium, Jesse’s friendly relay has short, middle and long legs. Two runners prefer the middle distance.' },
        { title: 'Practice reveals unequal tradeoffs', text: 'Having a simple meal at Mamma Mia shows one runner loses one beat when moved short; the other loses five.' },
        { title: 'Preference alone cannot fill three legs', text: 'Jesse could draw lots, ignore practice, or keep the larger specialist advantage in the middle and move the smaller-loss runner short.' },
        { title: 'The team preserves more combined strength', text: 'The five-beat specialist takes middle, the one-beat alternative takes short, and the third runner keeps long. Every leg has an owner.' },
      ], approaches: [
        { label: 'Compare each time loss', callback: 'Jesse remembers the one-beat and five-beat difference.' }, { label: 'Protect the larger advantage', callback: 'Jesse remembers why middle stayed with its specialist.' }, { label: 'Fill every leg', callback: 'Jesse remembers the complete relay.' },
      ], dilemma: { prompt: 'Who should move from the contested middle leg?', answers: ['Choose by lot.', 'Move the runner who loses only one beat.', 'Ignore the practice results.'], correct: 1, explanation: 'Moving the smaller-loss runner preserves four more beats of combined relay performance.' }, closing: 'Three runners take distinct legs through a choice grounded in their measured tradeoffs.', keepsake: { name: 'One-Beat Relay Marker', description: 'A marker comparing the one-beat and five-beat alternatives.' } },
      country: { title: 'Eight Seats around Two Edge Tables', desire: 'belonging', chapters: [
        { title: 'The center must stay open', text: 'At Mamma Mia, Jesse’s fictional celebration has twelve chairs and three tables, but the central activity needs a four-chair-sized space.' },
        { title: 'Only eight guests need seats', text: 'A quiet evening at Bingu National Stadium reveals two edge tables each hold four people. The third can carry supplies outside the center.' },
        { title: 'Furniture must serve people and space', text: 'Jesse could fill the center, remove guest seats, or seat four at each edge table and move the supply table outside the activity area.' },
        { title: 'The gathering gains a clear middle', text: 'Eight guests sit at the two edge tables. Supplies remain reachable on the third, and the full central space opens for the shared activity.' },
      ], approaches: [
        { label: 'Count eight guest seats', callback: 'Jesse remembers the two full edge tables.' }, { label: 'Move supplies outward', callback: 'Jesse remembers the third table’s useful role.' }, { label: 'Protect the center', callback: 'Jesse remembers the open activity space.' },
      ], dilemma: { prompt: 'How should Jesse arrange the celebration furniture?', answers: ['Place a table in the center.', 'Remove seats from guests.', 'Use two edge tables for guests and one outer supply table.'], correct: 2, explanation: 'Two four-seat tables fit all eight guests while the third serves supplies without consuming the required center.' }, closing: 'Eight friends gather at the edges around one generous open middle.', keepsake: { name: 'Open-Center Table Plan', description: 'A plan showing two four-seat edges and one outer supply table.' } },
      missions: { daily: [
        { label: 'Have one simple meal at Mamma Mia', purpose: 'Compare Jesse’s fictional relay tradeoffs.', task: 'practical', count: 1 }, { label: 'Visit Jesse at Bingu National Stadium', purpose: 'Review the open-center celebration layout.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Lilongwe', purpose: 'Give Jesse runners for the three relay legs.', task: 'people', count: 3 },
      ], weekly: [
        { label: 'Enjoy two quiet evenings at Bingu National Stadium', purpose: 'Practise the eight-seat edge layout.', task: 'discovery', count: 2 }, { label: 'Visit three game places in Lilongwe', purpose: 'Think through the measured runner assignment.', task: 'places', count: 3 }, { label: 'Have three simple meals at Mamma Mia', purpose: 'Repeat the small-loss comparison.', task: 'practical', count: 3 },
      ] },
    },
    {
      cityId: 'luxembourg',
      city: { title: 'Two Stories and One Shared Question', desire: 'recognition', chapters: [
        { title: 'Six minutes hold two stories', text: 'At Place de Gand, Emery and a friend each bring a fictional story to a six-minute meetup. Both need a complete turn.' },
        { title: 'A common question must remain', text: 'Looking around Parc Heintz shows two minutes per story leaves two minutes for the question connecting them.' },
        { title: 'Neither voice should consume the meeting', text: 'Emery could tell one long story, rush both without response, or give each two minutes and reserve the final two for the shared question.' },
        { title: 'The question makes the stories meet', text: 'Both stories finish inside equal turns. Their remaining two minutes reveal one surprising theme they share.' },
      ], approaches: [
        { label: 'Time two complete turns', callback: 'Emery remembers the equal story space.' }, { label: 'Name one shared theme', callback: 'Emery remembers what joined the stories.' }, { label: 'Protect the final question', callback: 'Emery remembers the responsive ending.' },
      ], dilemma: { prompt: 'How should Emery use the six-minute meetup?', answers: ['Give two minutes each and two to a shared question.', 'Tell one long story.', 'Rush both stories without response.'], correct: 0, explanation: 'Two equal story turns preserve both voices and leave the required time for a real connection.' }, closing: 'Two finished stories lead into one question neither friend expected.', keepsake: { name: 'Two-Two-Two Story Dial', description: 'A six-minute dial divided into two stories and one question.' } },
      country: { title: 'Two Triangles Share One Side', desire: 'competence', chapters: [
        { title: 'Five sticks must make a rigid double-frame', text: 'At Parc Heintz, Emery’s fictional build has five equal sticks. No stick may be cut or bent.' },
        { title: 'Two triangles can share an edge', text: 'A look around Place de Gand shows separate triangles would need six sticks, but joined triangles reuse one middle side.' },
        { title: 'The shared piece must carry both shapes', text: 'Emery could make one square, leave a gap, or build two triangles against the same central stick.' },
        { title: 'Five pieces brace one another', text: 'Three sticks form the first triangle. Two more meet its shared side to close the second, creating a rigid double-frame.' },
      ], approaches: [
        { label: 'Reserve the shared side', callback: 'Emery remembers the stick used twice.' }, { label: 'Close the first triangle', callback: 'Emery remembers the stable starting shape.' }, { label: 'Brace the second', callback: 'Emery remembers the complete five-stick frame.' },
      ], dilemma: { prompt: 'How should Emery form two rigid shapes with five sticks?', answers: ['Build one four-sided shape.', 'Make two triangles share one side.', 'Leave one triangle open.'], correct: 1, explanation: 'Sharing one side reduces six required edges to five while preserving both closed triangles.' }, closing: 'One middle stick belongs fully to two shapes at once.', keepsake: { name: 'Shared-Side Joint', description: 'A five-stick model of two joined triangles.' } },
      missions: { daily: [
        { label: 'Look around once at Place de Gand', purpose: 'Study Emery’s fictional shared-side frame.', task: 'discovery', count: 1 }, { label: 'Visit Emery at Place de Gand', purpose: 'Review the two stories and one shared question.', task: 'host-visit', count: 1 }, { label: 'Look around once at Parc Heintz', purpose: 'Prepare the balanced story turns.', task: 'practical', count: 1 },
      ], weekly: [
        { label: 'Look around twice at Place de Gand', purpose: 'Practise the five-stick double triangle.', task: 'discovery', count: 2 }, { label: 'Visit two game places in Luxembourg', purpose: 'Compare spaces for Emery’s equal story timing.', task: 'places', count: 2 }, { label: 'Greet two game regulars in Luxembourg', purpose: 'Give Emery a partner for the shared question.', task: 'people', count: 2 },
      ] }
    },
    {
      cityId: 'macau',
      city: { title: 'Back the Slider away from the Fold', desire: 'competence', chapters: [
        { title: 'Fabric catches inside a zipper', text: 'At Ramalho Eanes Garden, Logan’s friend catches a fold in a fictional project zipper. Pulling forward tightens it.' },
        { title: 'The slider still moves backward', text: 'Looking around Hac Sa Park reveals the fabric cannot be cut, but one backward step releases pressure.' },
        { title: 'Force would deepen the snag', text: 'Logan could pull harder, cut the fold, or ease the slider back, flatten the fabric and close forward again.' },
        { title: 'Slack frees the project', text: 'The slider moves back one step. Logan smooths the fold clear and closes the zipper without damage.' },
      ], approaches: [
        { label: 'Stop the forward pull', callback: 'Logan remembers what tightened the snag.' }, { label: 'Create one step of slack', callback: 'Logan remembers the useful backward move.' }, { label: 'Flatten before closing', callback: 'Logan remembers the clean finish.' },
      ], dilemma: { prompt: 'How should Logan free the caught fabric?', answers: ['Pull the zipper harder.', 'Cut the fabric fold.', 'Back the slider up, flatten the fold and close again.'], correct: 2, explanation: 'Backward movement releases pressure so the intact fabric can leave the zipper path.' }, closing: 'The zipper closes cleanly after one careful retreat.', keepsake: { name: 'Freed-Fold Zipper Pull', description: 'A zipper pull marked back, smooth and forward.' } },
      country: { title: 'Split Every Skill Level', desire: 'fairness', chapters: [
        { title: 'Six players need two equal teams', text: 'At Hac Sa Park, Logan’s friendly game has advanced, intermediate and beginner pairs.' },
        { title: 'Each team needs the full range', text: 'A look around Ramalho Eanes Garden confirms teams must have three players and cannot place both partners from one level together.' },
        { title: 'Random groups could stack experience', text: 'Logan could draw freely, group by level, or split every level pair across the two teams.' },
        { title: 'Both teams receive one of each', text: 'One advanced, intermediate and beginner player joins each side. The first round starts with equal experience ranges.' },
      ], approaches: [
        { label: 'Pair matching levels', callback: 'Logan remembers the three experience pairs.' }, { label: 'Split each pair', callback: 'Logan remembers the balanced distribution.' }, { label: 'Count three per team', callback: 'Logan remembers the complete lineups.' },
      ], dilemma: { prompt: 'How should Logan form the teams?', answers: ['Split each experience pair between teams.', 'Draw all names without constraints.', 'Put matching levels together.'], correct: 0, explanation: 'Dividing every level pair guarantees both three-player teams contain the same experience range.' }, closing: 'Two teams face each other with one player from every level, ready from the start.', keepsake: { name: 'Three-Level Team Band', description: 'A band split into matching advanced, intermediate and beginner halves.' } },
      missions: { daily: [
        { label: 'Look around once at Hac Sa Park', purpose: 'Plan Logan’s zipper release.', task: 'practical', count: 1 }, { label: 'Visit Logan at Ramalho Eanes Garden', purpose: 'Review the fictional team split.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Macau', purpose: 'Give Logan players for the balanced teams.', task: 'people', count: 3 },
      ], weekly: [
        { label: 'Look around twice at Ramalho Eanes Garden', purpose: 'Practise splitting the three skill pairs.', task: 'discovery', count: 2 }, { label: 'Visit three game places in Macau', purpose: 'Think through the back-smooth-forward repair.', task: 'places', count: 3 }, { label: 'Look around three times at Hac Sa Park', purpose: 'Repeat the fictional zipper fix.', task: 'practical', count: 3 },
      ] },
    },
    {
      cityId: 'madrid',
      city: { title: 'Score the Five Rounds by Hand', desire: 'competence', chapters: [
        { title: 'The display stops after round five', text: 'At Parque Dehesa Boyal, Wren’s fictional game score display fails after five completed rounds. The results themselves remain known.' },
        { title: 'Wins and draws have fixed values', text: 'Looking around Parque de Las Presillas confirms a win is two points and a draw one. No round can be replayed.' },
        { title: 'The existing result can be recovered', text: 'Wren could restart the game, guess the leader, or total every recorded win and draw by hand.' },
        { title: 'Arithmetic restores the scoreboard', text: 'Wren adds two per win and one per draw for each player. The reconstructed totals agree with all five round records.' },
      ], approaches: [
        { label: 'List the five results', callback: 'Wren remembers the evidence that survived.' }, { label: 'Apply fixed point values', callback: 'Wren remembers the scoring rule.' }, { label: 'Check the total', callback: 'Wren remembers the recovered result.' },
      ], dilemma: { prompt: 'How should Wren finish scoring the game?', answers: ['Replay all five rounds.', 'Total the recorded wins and draws by hand.', 'Guess the leader.'], correct: 1, explanation: 'Known results and fixed point values reproduce the score without altering completed play.' }, closing: 'The final ranking returns through five records and simple arithmetic.', keepsake: { name: 'Five-Round Tally Tile', description: 'A tile marked two for wins and one for draws.' } },
      country: { title: 'Save the Battery for the Final Hour', desire: 'continuity', chapters: [
        { title: 'Three lamps are needed together at the finish', text: 'At Parque de Las Presillas, Wren’s fictional project has three lamps, one two-socket cable and one lamp with a one-hour battery.' },
        { title: 'Only the final hour needs all three', text: 'A look around Parque Dehesa Boyal confirms two plugged lamps cover setup. The charged lamp must last the closing hour.' },
        { title: 'Early use could spend the only reserve', text: 'Wren could run the battery during setup, leave one final lamp dark, or preserve it while two plugged lamps handle setup.' },
        { title: 'The third light joins exactly when needed', text: 'Two cable-powered lamps illuminate setup. Wren switches on the charged lamp for the final hour, when all three shine together.' },
      ], approaches: [
        { label: 'Power two setup lamps', callback: 'Wren remembers the cable’s exact capacity.' }, { label: 'Preserve the charged lamp', callback: 'Wren remembers the one-hour reserve.' }, { label: 'Start it at the finish', callback: 'Wren remembers the three-light closing.' },
      ], dilemma: { prompt: 'How should Wren schedule the battery lamp?', answers: ['Use it throughout setup.', 'Accept a dark lamp at the finish.', 'Save it for the final hour.'], correct: 2, explanation: 'The plugged pair covers setup, preserving the exact battery duration for the only interval needing three lamps.' }, closing: 'The saved third light joins the pair for a complete final hour.', keepsake: { name: 'Final-Hour Lamp Tab', description: 'A tab showing two steady lights and one timed reserve.' } },
      missions: { daily: [
        { label: 'Look around once at Parque de Las Presillas', purpose: 'Rebuild Wren’s fictional five-round score.', task: 'practical', count: 1 }, { label: 'Visit Wren at Parque Dehesa Boyal', purpose: 'Review the final-hour lamp plan.', task: 'host-visit', count: 1 }, { label: 'Greet four game regulars in Madrid', purpose: 'Give Wren players for the recorded rounds.', task: 'people', count: 4 },
      ], weekly: [
        { label: 'Look around three times at Parque Dehesa Boyal', purpose: 'Practise preserving the charged lamp.', task: 'discovery', count: 3 }, { label: 'Visit two game places in Madrid', purpose: 'Think through the win-and-draw totals.', task: 'places', count: 2 }, { label: 'Look around twice at Parque de Las Presillas', purpose: 'Repeat the manual scoring check.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'manama',
      city: { title: 'Practise the Ending First', desire: 'competence', chapters: [
        { title: 'The routine always restarts', text: 'At Askar Garden, Jesse’s friend practises a fictional three-section routine from the beginning and never reaches the ending confidently.' },
        { title: 'Three practice turns remain', text: 'Having a simple meal at Light House Cafe shows each turn can hold the ending alone, the middle-to-ending link or one full run.' },
        { title: 'Forward repetition would repeat the gap', text: 'Jesse could restart three more times, skip the ending, or work backward: ending, middle-plus-ending, then full routine.' },
        { title: 'The strongest section grows backward', text: 'The friend secures the ending, connects it to the middle and completes one full run. Every practice turn reaches the former weak point.' },
      ], approaches: [
        { label: 'Isolate the ending', callback: 'Jesse remembers where confidence was missing.' }, { label: 'Add the middle link', callback: 'Jesse remembers the second backward step.' }, { label: 'Finish with one full run', callback: 'Jesse remembers the completed routine.' },
      ], dilemma: { prompt: 'How should the friend use the three remaining turns?', answers: ['Practise ending, link, then full routine.', 'Restart from the beginning every time.', 'Skip the ending.'], correct: 0, explanation: 'Backward chaining makes every turn reach the weak ending before testing it inside the complete routine.' }, closing: 'The ending becomes the section the friend has practised most, not least.', keepsake: { name: 'Backward Practice Strip', description: 'A strip marked ending, link and full run.' } },
      country: { title: 'Ingredients, Method, Timing', desire: 'belonging', chapters: [
        { title: 'Three friends hold different recipe knowledge', text: 'At Light House Cafe, one fictional cook knows ingredients, one method and one timing.' },
        { title: 'No voice may speak twice in a row', text: 'A quiet evening at Askar Garden reveals every recipe step needs all three facts in the same dependable order.' },
        { title: 'A repeating sequence can combine expertise', text: 'Jesse could let one friend dominate, mix the order randomly, or repeat ingredients-method-timing for each step.' },
        { title: 'Every step arrives complete', text: 'The ingredient voice names what is used, method explains the action and timing closes the step. The sequence repeats without consecutive turns.' },
      ], approaches: [
        { label: 'Assign three knowledge roles', callback: 'Jesse remembers what each friend contributes.' }, { label: 'Keep one speaking order', callback: 'Jesse remembers the reliable sequence.' }, { label: 'Repeat for every step', callback: 'Jesse remembers the complete recipe explanation.' },
      ], dilemma: { prompt: 'How should the three friends explain each step?', answers: ['Let one person explain everything.', 'Use ingredients, method, then timing.', 'Change the order randomly.'], correct: 1, explanation: 'The repeated order combines all required facts while naturally alternating the three speakers.' }, closing: 'Three kinds of knowledge become one recipe through a sequence everyone can follow.', keepsake: { name: 'Three-Voice Recipe Ring', description: 'A ring marked ingredients, method and timing.' } },
      missions: { daily: [
        { label: 'Enjoy one quiet evening at Askar Garden', purpose: 'Plan Jesse’s three-part fictional recipe order.', task: 'discovery', count: 1 }, { label: 'Visit Light House Cafe', purpose: 'Inspect a setting for the ingredients-method-timing sequence.', task: 'practical-visit', count: 1 }, { label: 'Have one simple meal at Light House Cafe', purpose: 'Prepare the backward rehearsal turns.', task: 'practical', count: 1 },
      ], weekly: [
        { label: 'Have three simple meals at Light House Cafe', purpose: 'Repeat the ending-first practice chain.', task: 'practical', count: 3 }, { label: 'Visit Jesse at Askar Garden', purpose: 'Review the three speaking roles.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Manama', purpose: 'Give Jesse voices for the recipe sequence.', task: 'people', count: 3 },
      ] }
    },
    {
      cityId: 'marigot',
      city: { title: 'Flip Only the Middle Panel', desire: 'curiosity', chapters: [
        { title: 'Two seams refuse to meet', text: "At Lili's Tropical Garden, Jesse’s fictional fabric display has three patterned panels. The outer edges align, but both center seams break." },
        { title: 'The middle panel is reversible', text: 'Having a simple meal at Le Sand reveals the panels cannot be cut, and flipping either outer panel would spoil its finished edge.' },
        { title: 'One change can affect both seams', text: 'Jesse could trim the panels, flip an outer one, or reverse only the middle panel.' },
        { title: 'Both broken lines connect', text: 'The reversed middle panel presents its matching edges to both neighbors. The outer finished edges remain facing outward.' },
      ], approaches: [
        { label: 'Protect the outer edges', callback: 'Jesse remembers which faces had to remain.' }, { label: 'Inspect both middle faces', callback: 'Jesse remembers the reversible piece.' }, { label: 'Check two seams', callback: 'Jesse remembers the single change that fixed both.' },
      ], dilemma: { prompt: 'How should Jesse align both pattern seams?', answers: ['Cut the panels.', 'Flip an outer finished panel.', 'Reverse only the middle panel.'], correct: 2, explanation: 'The reversible center changes both internal edges while preserving the required outer faces.' }, closing: 'One flipped center makes two continuous lines across the full display.', keepsake: { name: 'Reversible Seam Patch', description: 'A patch with matching lines on opposite edges.' } },
      country: { title: 'One Paired Task, Two Solo Tasks', desire: 'fairness', chapters: [
        { title: 'Four friends face three jobs', text: 'At Le Sand, a fictional project has one task requiring a pair and two independent tasks requiring one person each.' },
        { title: 'Every friend needs a full role', text: "A quiet evening at Lili's Tropical Garden confirms the paired task cannot split, while the solo jobs cannot share." },
        { title: 'The task sizes already match the group', text: 'Jesse could crowd one job, leave a solo task open, or assign two friends jointly and one to each solo task.' },
        { title: 'Four roles fill three jobs exactly', text: 'The pair completes the shared lift while two friends handle independent work. No task or participant waits.' },
      ], approaches: [
        { label: 'Identify the paired job', callback: 'Jesse remembers the only two-person need.' }, { label: 'Protect both solo jobs', callback: 'Jesse remembers the independent roles.' }, { label: 'Count four assignments', callback: 'Jesse remembers the exact fit.' },
      ], dilemma: { prompt: 'How should Jesse assign four friends to three jobs?', answers: ['Use one pair and two solo assignments.', 'Put everyone on one job.', 'Leave a solo job open.'], correct: 0, explanation: 'The required staffing totals four people exactly, matching the available group without overlap.' }, closing: 'One pair and two independent workers finish three different jobs together.', keepsake: { name: 'Two-One-One Task Clip', description: 'A clip divided into one paired role and two solo roles.' } },
      missions: { daily: [
        { label: 'Have one simple meal at Le Sand', purpose: 'Plan Jesse’s middle-panel reversal.', task: 'practical', count: 1 }, { label: "Visit Jesse at Lili's Tropical Garden", purpose: 'Review the fictional two-one-one roles.', task: 'host-visit', count: 1 }, { label: 'Greet two game regulars in Marigot', purpose: 'Give Jesse partners for the shared task.', task: 'people', count: 2 },
      ], weekly: [
        { label: "Enjoy three quiet evenings at Lili's Tropical Garden", purpose: 'Practise assigning one pair and two solos.', task: 'discovery', count: 3 }, { label: 'Visit two game places in Marigot', purpose: 'Think through the reversible center panel.', task: 'places', count: 2 }, { label: 'Have two simple meals at Le Sand', purpose: 'Repeat the two-seam check.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'muscat',
      city: { title: 'The Rod across the Far Notch', desire: 'competence', chapters: [
        { title: 'The support rod is too long upright', text: 'At Muntaza.h Qantab, Wren’s fictional tool chest lid needs support, but the available rod exceeds the vertical gap.' },
        { title: 'A distant notch increases the span', text: 'Looking around Al Amerat Public Park reveals a farther corner notch whose diagonal span matches the rod exactly. The rod cannot be cut, and the chest must remain assembled.' },
        { title: 'The rod needs a different direction', text: 'Wren could force it vertically, leave the lid unsupported, or brace it diagonally between the base and distant notch.' },
        { title: 'The longer path fits', text: 'Wren seats the lower end, angles the rod across the chest and engages the far notch. The lid stays open without altering the rod.' },
      ], approaches: [
        { label: 'Compare both spans', callback: 'Wren remembers why the diagonal was longer.' }, { label: 'Protect the full rod', callback: 'Wren remembers the no-cut constraint.' }, { label: 'Test the far notch', callback: 'Wren remembers the stable support.' },
      ], dilemma: { prompt: 'How should Wren fit the long support rod?', answers: ['Force it into the vertical gap.', 'Brace it diagonally into the far notch.', 'Leave the lid unsupported.'], correct: 1, explanation: 'The diagonal span uses the rod’s full length and the existing notch without changing the chest.' }, closing: 'One unchanged rod crosses the chest and holds the lid at a useful angle.', keepsake: { name: 'Diagonal Support Peg', description: 'A peg showing the longer corner-to-corner brace.' } },
      country: { title: 'Five Matches Form a Cycle', desire: 'fairness', chapters: [
        { title: 'Five players each need two matches', text: 'At Al Amerat Public Park, Wren’s fictional court has five players, one match per round and exactly five rounds.' },
        { title: 'Ten appearances fit the schedule', text: 'A look around Muntaza.h Qantab confirms five matches create ten player places, exactly two for each person.' },
        { title: 'The pairings need a complete pattern', text: 'Wren could repeat favorites, draw every round, or arrange a five-match neighbor cycle where each player meets the two beside them once.' },
        { title: 'The fifth match closes the ring', text: 'The cycle runs A-B, B-C, C-D, D-E and E-A. Every player appears twice against two different opponents.' },
      ], approaches: [
        { label: 'Count ten appearances', callback: 'Wren remembers the exact capacity.' }, { label: 'Link neighboring players', callback: 'Wren remembers the first four matches.' }, { label: 'Close the cycle', callback: 'Wren remembers the E-A finish.' },
      ], dilemma: { prompt: 'How should Wren schedule the five matches?', answers: ['Repeat the same favored pair.', 'Draw every pairing separately.', 'Use one closed neighbor cycle.'], correct: 2, explanation: 'A five-edge cycle gives every player two distinct appearances and fills all five rounds exactly.' }, closing: 'The last match joins the ends of a cycle in which everyone played twice.', keepsake: { name: 'Five-Match Court Ring', description: 'A ring linking five players to two neighboring opponents.' } },
      missions: { daily: [
        { label: 'Look around once at Al Amerat Public Park', purpose: 'Plan Wren’s diagonal tool-chest support.', task: 'practical', count: 1 }, { label: 'Visit Wren at Muntaza.h Qantab', purpose: 'Review the fictional five-match cycle.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Muscat', purpose: 'Give Wren players for the court pattern.', task: 'people', count: 3 },
      ], weekly: [
        { label: 'Look around twice at Muntaza.h Qantab', purpose: 'Practise closing the five-player cycle.', task: 'discovery', count: 2 }, { label: 'Visit three game places in Muscat', purpose: 'Think through the far-notch brace.', task: 'places', count: 3 }, { label: 'Look around three times at Al Amerat Public Park', purpose: 'Repeat the diagonal support check.', task: 'practical', count: 3 },
      ] },
    },
    {
      cityId: 'nassau',
      city: { title: 'Eight Minutes to Try, Two to Check', desire: 'continuity', chapters: [
        { title: 'Two friends lose time differently', text: 'At Community Centre, Uri and a friend have five fictional puzzles and ten minutes. One rushes; the other rechecks every move.' },
        { title: 'Every puzzle needs one first attempt', text: 'Looking around Cairo National Park shows alternating attempts can cover all five inside eight minutes. Marked uncertainties can wait for a final check.' },
        { title: 'The clock needs a shared rule', text: 'Uri could let one rush alone, let one check forever, or alternate first attempts for eight minutes and inspect marked doubts for two.' },
        { title: 'Trying and checking both receive time', text: 'The friends alternate through all five puzzles, marking two doubtful moves. Their final two minutes resolve those marks and preserve every completed attempt.' },
      ], approaches: [
        { label: 'Alternate first attempts', callback: 'Uri remembers how both friends kept moving.' }, { label: 'Mark only uncertainty', callback: 'Uri remembers what deserved review.' }, { label: 'Reserve two minutes', callback: 'Uri remembers the focused final check.' },
      ], dilemma: { prompt: 'How should Uri divide the ten minutes?', answers: ['Use eight minutes to attempt and two to check marked doubts.', 'Let the faster friend do everything.', 'Recheck every move immediately.'], correct: 0, explanation: 'The split guarantees all five attempts while limiting review to the moves that actually remain uncertain.' }, closing: 'Five attempted puzzles and two checked doubts fit inside one shared clock.', keepsake: { name: 'Eight-Two Puzzle Timer', description: 'A timer with a long attempt band and short review band.' } },
      country: { title: 'Three Doorways Identify Three Boxes', desire: 'curiosity', chapters: [
        { title: 'Three boxes lost their room labels', text: 'At Cairo National Park, Uri’s fictional project has wide, tall and flexible boxes for rooms with narrow, low and open doorways.' },
        { title: 'Each restricted box has one exclusion', text: 'A look around Community Centre shows the widest box cannot enter narrow, the tallest cannot enter low, and the flexible box must use the open room’s fixed project connection.' },
        { title: 'Constraints can replace missing labels', text: 'Uri could guess, force a box through, or reserve the open room for the flexible box, then send wide through low and tall through narrow.' },
        { title: 'The final room receives the flexible box', text: 'The flexible box connects in the open room. The wide box fits the low doorway, and the tall box fits the narrow doorway, completing one feasible assignment.' },
      ], approaches: [
        { label: 'List doorway limits', callback: 'Uri remembers the narrow and low exclusions.' }, { label: 'Place constrained boxes first', callback: 'Uri remembers why guessing was unnecessary.' }, { label: 'Use the flexible remainder', callback: 'Uri remembers the final assignment.' },
      ], dilemma: { prompt: 'How should Uri assign the unlabelled boxes?', answers: ['Guess all three rooms.', 'Reserve open for flexible, then assign wide to low and tall to narrow.', 'Force a restricted box through.'], correct: 1, explanation: 'The fixed connection reserves open for flexible; the two doorway exclusions then force wide to low and tall to narrow.' }, closing: 'Three doorway shapes restore three missing destinations without a label.', keepsake: { name: 'Doorway Constraint Tile', description: 'A tile showing narrow, low and open doorway outlines.' } },
      missions: { daily: [
        { label: 'Look around once at Cairo National Park', purpose: 'Plan Uri’s eight-minute attempt block.', task: 'practical', count: 1 }, { label: 'Visit two game places in Nassau', purpose: 'Compare entrances for the constrained fictional boxes.', task: 'places', count: 2 }, { label: 'Look around once at Community Centre', purpose: 'Prepare the open, low and narrow assignments.', task: 'discovery', count: 1 },
      ], weekly: [
        { label: 'Look around three times at Community Centre', purpose: 'Practise placing the fixed-connection box first.', task: 'discovery', count: 3 }, { label: 'Visit Uri at Community Centre', purpose: 'Review the eight-two puzzle time split.', task: 'host-visit', count: 1 }, { label: 'Greet two game regulars in Nassau', purpose: 'Give Uri a partner for the marked-doubt review.', task: 'people', count: 2 },
      ] }
    },
    {
      cityId: 'nukualofa',
      city: { title: 'Two Spoons for the Wet Dishes', desire: 'care', chapters: [
        { title: 'Three dishes share two spoons', text: "At Fa'onelua Park, Greer’s fictional meal has two wet dishes and one dry finger food. Only two serving spoons remain." },
        { title: 'The dry dish needs no utensil', text: 'Having a quiet evening at Tukingapahu confirms every dish stays separate, and guests can take the dry pieces directly from their platter.' },
        { title: 'Utensils should follow actual need', text: 'Greer could mix dishes, alternate one spoon between wet foods, or assign both spoons to wet dishes and leave the dry platter utensil-free.' },
        { title: 'Three dishes remain distinct', text: 'Each wet dish receives a spoon. The dry food stays on its own platter, so all three are served together without cross-use.' },
      ], approaches: [
        { label: 'Separate wet and dry service', callback: 'Greer remembers which dishes need spoons.' }, { label: 'Assign both utensils', callback: 'Greer remembers the exact wet-dish pair.' }, { label: 'Keep the platter distinct', callback: 'Greer remembers the clean third service.' },
      ], dilemma: { prompt: 'How should Greer use the two spoons?', answers: ['Mix the dishes together.', 'Move one spoon back and forth.', 'Give spoons to wet dishes and serve the dry food directly.'], correct: 2, explanation: 'Only the two wet foods require spoons, so the available utensils cover every actual need without mixing dishes.' }, closing: 'Two spoons and one open platter serve three separate dishes at once.', keepsake: { name: 'Wet-Dry Serving Disc', description: 'A disc with two spoon marks and one open platter.' } },
      country: { title: 'Seven Blocks Make One Braced Arch', desire: 'competence', chapters: [
        { title: 'An arch must stand from seven blocks', text: 'At Tukingapahu, Greer’s fictional build has seven blocks and no fasteners. Two pillars must reach equal height.' },
        { title: 'Five blocks form the opening', text: "A look around Fa'onelua Park shows two blocks per pillar and one lintel use five. Two blocks remain for stability." },
        { title: 'The spare blocks need structural jobs', text: 'Greer could stack them on top, leave them unused, or place one outward brace at each pillar base.' },
        { title: 'The opening stands under its lintel', text: 'Greer builds two equal pillars, lays the lintel and presses the final blocks against the outer bases. The arch stays upright.' },
      ], approaches: [
        { label: 'Build equal pillars', callback: 'Greer remembers the four opening blocks.' }, { label: 'Place the lintel', callback: 'Greer remembers the spanning fifth block.' }, { label: 'Brace both bases', callback: 'Greer remembers the stabilizing pair.' },
      ], dilemma: { prompt: 'Where should the final two blocks go?', answers: ['Brace the two pillar bases.', 'Stack them above the lintel.', 'Leave them unused.'], correct: 0, explanation: 'Outward base braces use both remaining blocks symmetrically and resist the pillars spreading.' }, closing: 'Seven blocks become one opening held by two quiet braces.', keepsake: { name: 'Seven-Block Arch Model', description: 'A miniature arch with two marked base braces.' } },
      missions: { daily: [
        { label: "Look around once at Fa'onelua Park", purpose: 'Plan Greer’s seven-block fictional arch.', task: 'discovery', count: 1 }, { label: "Visit two game places in Nuku'alofa", purpose: 'Compare settings for the separate wet and dry dishes.', task: 'places', count: 2 }, { label: 'Enjoy one quiet evening at Tukingapahu', purpose: 'Prepare the two-spoon meal service.', task: 'practical', count: 1 },
      ], weekly: [
        { label: 'Enjoy three quiet evenings at Tukingapahu', purpose: 'Repeat the two-spoon assignment.', task: 'practical', count: 3 }, { label: "Visit Greer at Fa'onelua Park", purpose: 'Review the braced arch base.', task: 'host-visit', count: 1 }, { label: "Greet three game regulars in Nuku'alofa", purpose: 'Give Greer guests for the shared meal.', task: 'people', count: 3 },
      ] }
    },
    {
      cityId: 'nuuk',
      city: { title: 'The Tall Booth Goes First', desire: 'competence', chapters: [
        { title: 'Four fittings need two booths', text: 'At Aqqaluk Plads, Corin’s fictional project has one tall booth, one standard booth, one long garment and three short garments.' },
        { title: 'Two rounds must finish everything', text: 'Having a quiet evening at Mitsimmavik reveals the long garment fits only the tall booth; every short garment fits either.' },
        { title: 'The constrained fitting cannot wait behind a short one', text: 'Corin could fill booths randomly, place the long garment in standard, or pair long with one short before fitting the final two shorts.' },
        { title: 'Both rounds use both booths', text: 'The long garment takes tall while a short uses standard. In round two, the last two short garments fill both booths.' },
      ], approaches: [
        { label: 'Identify the constrained fitting', callback: 'Corin remembers the long garment’s only booth.' }, { label: 'Pair one flexible item', callback: 'Corin remembers the full first round.' }, { label: 'Fill the second round', callback: 'Corin remembers the two remaining shorts.' },
      ], dilemma: { prompt: 'How should Corin schedule the two booths?', answers: ['Assign every fitting randomly.', 'Fit long plus one short, then the final two shorts.', 'Put the long garment in the standard booth.'], correct: 1, explanation: 'Scheduling the constrained garment first leaves three flexible garments to fill every remaining booth slot.' }, closing: 'One tall-only fitting and three flexible ones finish in two full rounds.', keepsake: { name: 'Two-Booth Fitting Card', description: 'A card showing tall-plus-short followed by short-plus-short.' } },
      country: { title: 'Three Rhythms Meet on Beat Six', desire: 'belonging', chapters: [
        { title: 'Three patterns repeat at different lengths', text: 'At Mitsimmavik, Corin’s friends clap fictional rhythms repeating every two, three and six beats.' },
        { title: 'No pattern may change', text: 'A quiet evening at Aqqaluk Plads shows all can begin together. Their first shared cycle boundary occurs after six beats.' },
        { title: 'The ending needs one common point', text: 'Corin could stop each separately, shorten a pattern, or begin together and close all three after beat six.' },
        { title: 'Different rhythms land together', text: 'The two-beat pattern repeats three times, the three-beat twice and the six-beat once. All finish on the same sixth beat.' },
      ], approaches: [
        { label: 'Count each repeat length', callback: 'Corin remembers two, three and six.' }, { label: 'Begin on one beat', callback: 'Corin remembers the shared start.' }, { label: 'Close at six', callback: 'Corin remembers the first common boundary.' },
      ], dilemma: { prompt: 'When should the three rhythms finish together?', answers: ['Stop them at unrelated times.', 'Shorten the six-beat pattern.', 'Start together and end after beat six.'], correct: 2, explanation: 'Six is the first boundary divisible by every pattern length, so none needs alteration.' }, closing: 'Three different rhythms meet cleanly on one final beat.', keepsake: { name: 'Beat-Six Rhythm Wheel', description: 'A wheel aligning two-, three- and six-beat cycles.' } },
      missions: { daily: [
        { label: 'Enjoy one quiet evening at Mitsimmavik', purpose: 'Plan Corin’s constrained fitting first.', task: 'practical', count: 1 }, { label: 'Visit Corin at Aqqaluk Plads', purpose: 'Review the fictional beat-six close.', task: 'host-visit', count: 1 }, { label: 'Greet four game regulars in Nuuk', purpose: 'Give Corin friends for the rhythm cycle.', task: 'people', count: 4 },
      ], weekly: [
        { label: 'Look around three times at Aqqaluk Plads', purpose: 'Practise aligning the repeating rhythms.', task: 'discovery', count: 3 }, { label: 'Visit two game places in Nuuk', purpose: 'Think through the two fitting rounds.', task: 'places', count: 2 }, { label: 'Enjoy two quiet evenings at Mitsimmavik', purpose: 'Repeat the tall-booth-first schedule.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'paris',
      city: { title: 'Five Items Cover Seven Needs', desire: 'autonomy', chapters: [
        { title: 'A day bag has five spaces', text: 'At Parc de Ladoucette, Logan’s fictional day plan lists seven item requirements across three activities, but the bag holds five.' },
        { title: 'Two items each serve two purposes', text: 'Looking around Parc Montreau reveals the dual-use pair covers four distinct requirements. Three remaining needs each require one single-purpose item.' },
        { title: 'Every need must be covered', text: 'Logan could overfill the bag, drop an activity, or pack both dual-use items plus the three uncovered single-purpose items.' },
        { title: 'Five choices support the full day', text: 'The dual-use pair covers four needs, and three singles cover the rest. Logan closes the five-item bag without changing the plan.' },
      ], approaches: [
        { label: 'Mark dual-use coverage', callback: 'Logan remembers the four needs covered by two items.' }, { label: 'List uncovered needs', callback: 'Logan remembers the necessary three singles.' }, { label: 'Count five bag spaces', callback: 'Logan remembers the complete fit.' },
      ], dilemma: { prompt: 'How should Logan fill the five-item bag?', answers: ['Use both dual-use items and three uncovered singles.', 'Pack all seven single requirements.', 'Cancel one planned activity.'], correct: 0, explanation: 'Two dual-use choices plus three singles cover all seven requirements within five spaces.' }, closing: 'One small bag closes around a complete day rather than a shortened plan.', keepsake: { name: 'Dual-Use Bag Tag', description: 'A five-space tag with two items linked to four needs.' } },
      country: { title: 'Complementary Clues, Timed Finish', desire: 'curiosity', chapters: [
        { title: 'Friendly rivals each hold half the constraints', text: 'At Parc Montreau, two fictional puzzle teams cannot make a valid setup from their own clue set.' },
        { title: 'The final step remains independent', text: 'A look around Parc de Ladoucette shows combined constraints determine the setup, while a last speed step can still decide the friendly contest.' },
        { title: 'Competition can survive necessary cooperation', text: 'Logan could let both fail, guess separately, or combine constraints for setup and then race the final independent step.' },
        { title: 'A valid puzzle precedes a clear winner', text: 'The teams build the only setup satisfying both clue sets. They separate for the final step, and one earns the speed point.' },
      ], approaches: [
        { label: 'Combine necessary constraints', callback: 'Logan remembers why neither half worked alone.' }, { label: 'Build one valid setup', callback: 'Logan remembers the shared foundation.' }, { label: 'Preserve the final race', callback: 'Logan remembers the friendly competitive finish.' },
      ], dilemma: { prompt: 'How should the rival teams finish the puzzle?', answers: ['Accept two invalid setups.', 'Combine setup clues, then race the independent final step.', 'Guess independently.'], correct: 1, explanation: 'The complementary evidence is required for validity, while the separate final step preserves a fair competitive result.' }, closing: 'Rivals build one correct beginning together and sprint toward two separate finishes.', keepsake: { name: 'Shared-Clue Finish Flag', description: 'A flag with joined clue halves and two final lanes.' } },
      missions: { daily: [
        { label: 'Look around once at Parc Montreau', purpose: 'Plan Logan’s five-item fictional bag.', task: 'practical', count: 1 }, { label: 'Visit Logan at Parc de Ladoucette', purpose: 'Review the complementary puzzle constraints.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Paris', purpose: 'Give Logan friendly rival teams.', task: 'people', count: 3 },
      ], weekly: [
        { label: 'Look around twice at Parc de Ladoucette', purpose: 'Practise combining the two clue sets.', task: 'discovery', count: 2 }, { label: 'Visit three game places in Paris', purpose: 'Think through the dual-use item coverage.', task: 'places', count: 3 }, { label: 'Look around three times at Parc Montreau', purpose: 'Repeat the five-space bag plan.', task: 'practical', count: 3 },
      ] },
    },
    {
      cityId: 'port-au-prince',
      city: { title: 'The Interlocked Menu Chain', desire: 'competence', chapters: [
        { title: 'Loose menus slide from the counter', text: 'At Champs de Mars, Jesse’s fictional café menus keep slipping whenever the game-scene breeze crosses the outdoor counter.' },
        { title: 'One small weight cannot cover every menu', text: 'Having a simple meal at Hôtel Montana reveals the menus may be folded without damage. Their corners can hook through one another.' },
        { title: 'The weight needs to secure a connected set', text: 'Jesse could stack menus loosely, remove them all, or interlock folded corners into a chain and place both end loops under the weight.' },
        { title: 'One anchor holds the whole chain', text: 'Jesse links each folded corner to the next and gathers both end loops beneath the weight. The chain stays on the counter and opens one menu at a time.' },
      ], approaches: [
        { label: 'Fold reusable corner loops', callback: 'Jesse remembers how each menu could connect.' }, { label: 'Link the full chain', callback: 'Jesse remembers why no middle menu escaped.' }, { label: 'Anchor both ends', callback: 'Jesse remembers how one weight closed the loop.' },
      ], dilemma: { prompt: 'How should Jesse secure every menu with one weight?', answers: ['Stack them loosely.', 'Remove them from the counter.', 'Interlock the corners and weight both end loops.'], correct: 2, explanation: 'The connected chain transfers one anchor across every menu, while weighting both ends prevents it unraveling.' }, closing: 'One small anchor steadies a line of menus that remains easy to open and pass.', keepsake: { name: 'Interlocked Corner Loop', description: 'Two folded menu corners linked beneath one small weight.' } },
      country: { title: 'Three Mixed-Experience Pairs', desire: 'belonging', chapters: [
        { title: 'Six friends face three paired tasks', text: 'At Hôtel Montana, Jesse’s fictional neighbor project has three experienced friends, three learners and three two-person tasks.' },
        { title: 'Every task needs both perspectives', text: 'A quiet evening at Champs de Mars confirms each pair must contain one experienced friend and one learner.' },
        { title: 'Leadership should also travel', text: 'Jesse could group by experience, let experts lead throughout, or make three mixed pairs and reverse the leader halfway.' },
        { title: 'Each partner leads part of the work', text: 'Every task receives one experienced and one learning partner. Experts lead the first half; learners lead the second with their partner supporting.' },
      ], approaches: [
        { label: 'Make three mixed pairs', callback: 'Jesse remembers the balanced task teams.' }, { label: 'Divide each task in half', callback: 'Jesse remembers the leadership boundary.' }, { label: 'Reverse the lead', callback: 'Jesse remembers how learners gained ownership.' },
      ], dilemma: { prompt: 'How should Jesse form and run the three pairs?', answers: ['Mix experience and reverse leaders halfway.', 'Group friends by experience.', 'Keep one leader throughout.'], correct: 0, explanation: 'Three mixed pairs satisfy the task constraint, and the midpoint reversal gives every participant a real leadership turn.' }, closing: 'Three tasks finish through pairs in which teaching and ownership both change hands.', keepsake: { name: 'Halfway Leader Band', description: 'A two-color band that reverses at its midpoint.' } },
      missions: { daily: [
        { label: 'Have one simple meal at Hôtel Montana', purpose: 'Plan Jesse’s fictional interlocked menu chain.', task: 'practical', count: 1 }, { label: 'Visit Jesse at Champs de Mars', purpose: 'Review the mixed-experience project pairs.', task: 'host-visit', count: 1 }, { label: 'Greet two game regulars in Port-au-Prince', purpose: 'Give Jesse partners for the leadership swap.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Enjoy three quiet evenings at Champs de Mars', purpose: 'Practise reversing the paired leadership.', task: 'discovery', count: 3 }, { label: 'Visit two game places in Port-au-Prince', purpose: 'Think through the linked menu corners.', task: 'places', count: 2 }, { label: 'Have two simple meals at Hôtel Montana', purpose: 'Repeat the two-end anchor plan.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'port-aux-francais',
      city: { title: 'Four Corners through Four Handles', desire: 'competence', chapters: [
        { title: 'A serving mat twists during the scene', text: 'At Recreation area (game venue), Jesse’s fictional serving mat lifts and turns whenever the game-scene gust reaches it.' },
        { title: 'Weights are forbidden', text: 'Having a simple meal at Tiker shows each mat corner reaches one fixed tray handle. The mat may be tucked but not cut.' },
        { title: 'Every corner needs its own hold', text: 'Jesse could pile dishes on the mat, secure only two corners, or weave each corner through a handle and tuck it under itself.' },
        { title: 'Four small loops stop the twist', text: 'Jesse threads and tucks all four corners. The handles take the pull, while the center stays flat and clear for fictional service.' },
      ], approaches: [
        { label: 'Match corners to handles', callback: 'Jesse remembers the four available anchors.' }, { label: 'Weave without cutting', callback: 'Jesse remembers the reversible hold.' }, { label: 'Check the clear center', callback: 'Jesse remembers the usable serving area.' },
      ], dilemma: { prompt: 'How should Jesse secure the mat without weights?', answers: ['Pile dishes on it.', 'Loop every corner through a tray handle.', 'Tie only two corners.'], correct: 1, explanation: 'Four separate loops resist lifting and rotation while leaving the serving surface unobstructed.' }, closing: 'The mat stays flat through four tucked corners and an entirely clear center.', keepsake: { name: 'Four-Corner Tuck', description: 'A fabric square with a loop marked at every corner.' } },
      country: { title: 'Demanding and Light Tasks Alternate', desire: 'continuity', chapters: [
        { title: 'Eight tasks strain in the wrong order', text: 'At Tiker, Jesse’s fictional personal goal has four demanding tasks and four light tasks. Consecutive demanding work causes mistakes.' },
        { title: 'Every task must finish', text: 'A quiet evening at Recreation area (game venue) confirms order within each category is flexible, but none can be dropped.' },
        { title: 'Alternation protects the whole sequence', text: 'Jesse could group all demanding work, abandon a task, or alternate one demanding and one light task until all eight finish.' },
        { title: 'Effort rises and settles four times', text: 'Each demanding task is followed by lighter work. Jesse completes the fourth pair without ever placing two high-effort tasks together.' },
      ], approaches: [
        { label: 'Separate two task types', callback: 'Jesse remembers the four-and-four inventory.' }, { label: 'Choose within each category', callback: 'Jesse remembers the available flexibility.' }, { label: 'Alternate all eight', callback: 'Jesse remembers the sustainable sequence.' },
      ], dilemma: { prompt: 'How should Jesse order the eight tasks?', answers: ['Do all demanding tasks first.', 'Drop one difficult task.', 'Alternate demanding and light work.'], correct: 2, explanation: 'Equal category counts allow complete alternation, satisfying every task without consecutive demanding work.' }, closing: 'Four changes of pace carry the personal goal through every planned task.', keepsake: { name: 'Alternating Effort Strip', description: 'An eight-space strip alternating dark and light task marks.' } },
      missions: { daily: [
        { label: 'Have one simple meal at Tiker', purpose: 'Plan Jesse’s four-corner fictional mat loops.', task: 'practical', count: 1 }, { label: 'Visit Jesse at Recreation area (game venue) in Port-aux-Français', purpose: 'Review the alternating personal-goal tasks.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Port-aux-Français', purpose: 'Give Jesse companions for the project sequence.', task: 'people', count: 3 },
      ], weekly: [
        { label: 'Enjoy two quiet evenings at Recreation area (game venue) in Port-aux-Français', purpose: 'Practise alternating demanding and light work.', task: 'discovery', count: 2 }, { label: 'Visit three game places in Port-aux-Français', purpose: 'Think through the four handle loops.', task: 'places', count: 3 }, { label: 'Have three simple meals at Tiker', purpose: 'Repeat the corner-tuck plan.', task: 'practical', count: 3 },
      ] },
    },
    {
      cityId: 'road-town',
      city: { title: 'The Hub in the Middle', desire: 'competence', chapters: [
        { title: 'Nine tiles must fill a three-by-three frame', text: 'At Queen Elizabeth Park, Arden’s fictional path puzzle has one hub tile, four straight connector tiles and four corner decorations.' },
        { title: 'Every connector must touch the hub', text: 'Looking around The Noel Lloyd Positive Action Movement Park shows the frame is fixed and the four corner decorations cannot carry a path.' },
        { title: 'The hub position determines every route', text: 'Arden could put the hub on an edge, scatter connectors into corners, or center the hub with one connector on each cardinal side.' },
        { title: 'The corners complete the frame', text: 'Arden places the hub in the center, connectors above, below, left and right, then fills the four remaining corners with decorations. Every path reaches the hub.' },
      ], approaches: [
        { label: 'Reserve the center square', callback: 'Arden remembers the only place touching four sides.' }, { label: 'Place four connectors', callback: 'Arden remembers the cardinal path arms.' }, { label: 'Fill the corners last', callback: 'Arden remembers the complete nine-tile frame.' },
      ], dilemma: { prompt: 'How should Arden arrange the nine tiles?', answers: ['Center the hub, surround it with connectors, then fill corners.', 'Place the hub on an edge.', 'Put connector tiles in the corners.'], correct: 0, explanation: 'Only the center touches four cardinal spaces, so it supports every connector and leaves exactly four corners for decorations.' }, closing: 'Nine tiles become four clear paths meeting at one unmistakable center.', keepsake: { name: 'Four-Way Hub Tile', description: 'A center tile with four connector arms and four corner marks.' } },
      country: { title: 'Match the Two Friction Settings', desire: 'competence', chapters: [
        { title: 'A project door drifts after release', text: 'At The Noel Lloyd Positive Action Movement Park, Arden’s fictional project door uses two adjustable-friction hinges but will not hold its chosen position.' },
        { title: 'Both controls have a marked holding setting', text: 'A look around Queen Elizabeth Park shows the upper control reads one, the lower reads three, and the tested holding mark is two on each.' },
        { title: 'Unequal settings keep the door unbalanced', text: 'Arden could tighten both to maximum, leave the mismatch, or set both friction controls to the marked level two before testing.' },
        { title: 'Matched resistance holds the door', text: 'Arden turns the upper control up to two and the lower down to two. The test swing stops at the chosen position without binding.' },
      ], approaches: [
        { label: 'Read both friction controls', callback: 'Arden remembers the one-three mismatch.' }, { label: 'Use the tested hold mark', callback: 'Arden remembers the shared level two.' }, { label: 'Swing and release once', callback: 'Arden remembers the balanced result.' },
      ], dilemma: { prompt: 'How should Arden set the adjustable-friction hinges?', answers: ['Set both to maximum.', 'Set both controls to the marked level two.', 'Keep one at one and one at three.'], correct: 1, explanation: 'The explicit tested setting gives both hinges equal holding resistance without the binding risk of maximum friction.' }, closing: 'Two matched controls let the fictional door move freely and remain where it is released.', keepsake: { name: 'Level-Two Hinge Dial', description: 'A paired dial showing both friction controls at two.' } },
      missions: { daily: [
        { label: 'Look around once at The Noel Lloyd Positive Action Movement Park', purpose: 'Plan Arden’s nine-tile path layout.', task: 'practical', count: 1 }, { label: 'Visit two game places in Road Town', purpose: 'Compare settings for the adjustable-friction door.', task: 'places', count: 2 }, { label: 'Look around once at Queen Elizabeth Park', purpose: 'Prepare the matching level-two hinge settings.', task: 'discovery', count: 1 },
      ], weekly: [
        { label: 'Look around twice at The Noel Lloyd Positive Action Movement Park', purpose: 'Repeat the four-way connector placement.', task: 'practical', count: 2 }, { label: 'Visit Arden at Queen Elizabeth Park', purpose: 'Review the center-and-corners tile layout.', task: 'host-visit', count: 1 }, { label: 'Greet four game regulars in Road Town', purpose: 'Give Arden friends for the hub puzzle.', task: 'people', count: 4 },
      ] }
    },
    {
      cityId: 'santo-domingo',
      city: { title: 'Each Baker Uses Each Rack', desire: 'fairness', chapters: [
        { title: 'One oven rack runs hotter', text: 'At Parque Central de San Antonio de Guerra, Ira’s two fictional bakers each make two loaves in a friendly contest.' },
        { title: 'Rack position affects the result', text: 'Looking around Centro Olímpico Juan Pablo Duarte confirms the oven has one hotter and one cooler rack. Both bakes must use the same oven.' },
        { title: 'The unequal condition should change hands', text: 'Ira could keep positions fixed, judge one loaf each, or swap rack positions for the second bake and compare two-loaf totals.' },
        { title: 'Two rounds balance the heat', text: 'Each baker uses the hot rack once and cool rack once. Ira combines each pair of results, so position cannot belong to one competitor.' },
      ], approaches: [
        { label: 'Name the rack difference', callback: 'Ira remembers the unequal condition.' }, { label: 'Swap after round one', callback: 'Ira remembers how both bakers shared it.' }, { label: 'Compare paired results', callback: 'Ira remembers the balanced total.' },
      ], dilemma: { prompt: 'How should Ira handle the unequal oven racks?', answers: ['Keep bakers on fixed racks.', 'Judge only one loaf.', 'Swap racks and compare both loaves.'], correct: 2, explanation: 'A rack swap exposes each baker once to each condition, and the two-loaf total uses both results.' }, closing: 'The friendly contest ends after both bakers have worked with both kinds of heat.', keepsake: { name: 'Two-Rack Swap Card', description: 'A card crossing hot and cool rack positions between two rounds.' } },
      country: { title: 'Three Areas Receive Mixed Skills', desire: 'belonging', chapters: [
        { title: 'Six volunteers carry three paired skills', text: 'At Centro Olímpico Juan Pablo Duarte, Ira’s fictional neighbor project has two builders, two finishers and two organizers.' },
        { title: 'Each area needs two different skills', text: 'A look around Parque Central de San Antonio de Guerra shows there are three work areas and exactly two volunteers per area.' },
        { title: 'Copies should not share an area', text: 'Ira could pair identical skills, crowd one area, or make three mixed pairs so each skill copy goes to a different place.' },
        { title: 'Three areas gain complementary work', text: 'Ira forms builder-finisher, finisher-organizer and organizer-builder pairs. Every area receives two different skills and every volunteer has a place.' },
      ], approaches: [
        { label: 'Separate matching skills', callback: 'Ira remembers why copies went apart.' }, { label: 'Form three mixed pairs', callback: 'Ira remembers the complementary teams.' }, { label: 'Fill each area once', callback: 'Ira remembers the complete assignment.' },
      ], dilemma: { prompt: 'How should Ira assign the six volunteers?', answers: ['Create three pairs with different skills.', 'Pair identical skills.', 'Put extra volunteers in one area.'], correct: 0, explanation: 'The cyclic mixed pairs split both copies of every skill and give all three areas complementary ability.' }, closing: 'Three work areas begin with different but equally mixed pairs.', keepsake: { name: 'Three-Area Skill Triangle', description: 'A triangle whose edges join three different skill pairs.' } },
      missions: { daily: [
        { label: 'Look around once at Centro Olímpico Juan Pablo Duarte', purpose: 'Plan Ira’s fictional oven-rack swap.', task: 'practical', count: 1 }, { label: 'Visit Ira at Parque Central de San Antonio de Guerra', purpose: 'Review the three mixed-skill work areas.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Santo Domingo', purpose: 'Give Ira volunteers for the paired assignments.', task: 'people', count: 3 },
      ], weekly: [
        { label: 'Look around twice at Parque Central de San Antonio de Guerra', purpose: 'Practise the cyclic skill pairing.', task: 'discovery', count: 2 }, { label: 'Visit three game places in Santo Domingo', purpose: 'Think through both oven conditions.', task: 'places', count: 3 }, { label: 'Look around three times at Centro Olímpico Juan Pablo Duarte', purpose: 'Repeat the two-round rack swap.', task: 'practical', count: 3 },
      ] },
    },
    {
      cityId: 'sao-tome',
      city: { title: 'Order the Chimes by Sound', desire: 'curiosity', chapters: [
        { title: 'Four chimes look misleading', text: 'At Praça de Independência, Greer’s fictional listening puzzle asks for a rising sequence, but larger pieces do not consistently sound lower.' },
        { title: 'Every chime may sound once', text: 'Looking around Parque Popular confirms players can hear all four before arranging them, then must make one final attempt.' },
        { title: 'Appearance cannot solve an audible order', text: 'Greer could sort by size, guess the middle, or remember the heard pitches and place them low to high.' },
        { title: 'The final sequence rises cleanly', text: 'Greer sounds each chime, recalls its relative pitch and rearranges them. The final four tones climb without a drop.' },
      ], approaches: [
        { label: 'Hear every chime once', callback: 'Greer remembers the available evidence.' }, { label: 'Compare neighboring pitches', callback: 'Greer remembers the rising relation.' }, { label: 'Ignore misleading size', callback: 'Greer remembers why sound decided the order.' },
      ], dilemma: { prompt: 'How should Greer arrange the four chimes?', answers: ['Sort them by visible size.', 'Use the heard pitches from low to high.', 'Guess the two middle positions.'], correct: 1, explanation: 'The goal is auditory and every pitch is available, so remembered sound rather than appearance determines the sequence.' }, closing: 'Four misleading shapes produce one unmistakably rising line of sound.', keepsake: { name: 'Rising Chime Strip', description: 'A four-step strip ascending by remembered pitch.' } },
      country: { title: 'Two Pushes around an L-Bend', desire: 'competence', chapters: [
        { title: 'A soft spool stops behind a bent bench', text: 'At Parque Popular, Greer’s fictional spool has rolled into an L-shaped space beneath a bench.' },
        { title: 'Both ends are open', text: 'A look around Praça de Independência shows reaching underneath and moving the bench are forbidden. Each straight section has an accessible opening.' },
        { title: 'One push cannot turn the corner', text: 'Greer could push harder from one end, abandon it, or push from the short opening to the bend and then from the second opening to the exit.' },
        { title: 'Direction changes at the bend', text: 'The first push positions the spool at the corner. Greer moves to the other opening and sends it along the second leg into reach.' },
      ], approaches: [
        { label: 'Trace both straight sections', callback: 'Greer remembers why one direction was insufficient.' }, { label: 'Push only to the bend', callback: 'Greer remembers the first stopping point.' }, { label: 'Change openings', callback: 'Greer remembers the final exit direction.' },
      ], dilemma: { prompt: 'How should Greer free the spool?', answers: ['Push harder from one direction.', 'Leave it behind the bench.', 'Use one push to the bend and another toward the exit.'], correct: 2, explanation: 'The L-shaped space requires one controlled movement along each straight section from its accessible opening.' }, closing: 'Two simple pushes and one change of position bring the spool around the hidden corner.', keepsake: { name: 'L-Bend Rescue Bead', description: 'A bead set on a two-leg corner track.' } },
      missions: { daily: [
        { label: 'Look around once at Parque Popular', purpose: 'Plan Greer’s heard-pitch chime order.', task: 'practical', count: 1 }, { label: 'Visit Greer at Praça de Independência', purpose: 'Review the fictional L-bend spool rescue.', task: 'host-visit', count: 1 }, { label: 'Greet two game regulars in São Tomé', purpose: 'Give Greer listeners for the chime puzzle.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Look around three times at Praça de Independência', purpose: 'Practise the two-direction rescue.', task: 'discovery', count: 3 }, { label: 'Visit two game places in São Tomé', purpose: 'Think through the rising sound sequence.', task: 'places', count: 2 }, { label: 'Look around twice at Parque Popular', purpose: 'Repeat the pitch comparison.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'siachen',
      city: { title: 'Two Wedges under the Low Edge', desire: 'competence', chapters: [
        { title: 'Every puzzle piece drifts one way', text: 'At Recreation area (game venue), Jesse’s fictional tabletop puzzle slides toward the same edge before players can finish a move.' },
        { title: 'The board itself cannot move', text: 'Having a simple meal at Visitor meal stop (game venue) reveals two equal wedges and two low corners on that edge.' },
        { title: 'Both corners need equal lift', text: 'Jesse could hold pieces by hand, wedge one corner, or place one equal wedge beneath each low corner and test a center piece.' },
        { title: 'The test piece stays centered', text: 'Jesse raises both low corners by the same amount. A loose test piece remains near the center, so play resumes without anyone guarding it.' },
      ], approaches: [
        { label: 'Find both low corners', callback: 'Jesse remembers the shared drift edge.' }, { label: 'Split the equal wedges', callback: 'Jesse remembers the level lift.' }, { label: 'Test at the center', callback: 'Jesse remembers the stable result.' },
      ], dilemma: { prompt: 'How should Jesse stop the board’s one-sided drift?', answers: ['Wedge both low corners equally.', 'Hold every piece by hand.', 'Raise only one corner.'], correct: 0, explanation: 'Equal support beneath both corners raises the entire low edge without introducing a sideways twist.' }, closing: 'Two hidden wedges make the loose center piece stay where it is placed.', keepsake: { name: 'Twin Level Wedges', description: 'Two equal wedges marked for the same board edge.' } },
      country: { title: 'The Z-Fold Holds', desire: 'competence', chapters: [
        { title: 'Three panels must stand in a narrow strip', text: 'At Visitor meal stop (game venue), Jesse’s fictional folding screen has three attached panels but cannot fit fully open inside the marked floor width.' },
        { title: 'The hinges open in opposite directions', text: 'A quiet evening at Recreation area (game venue) shows the first hinge permits an inward fold and the second an outward fold. Neither panel may detach.' },
        { title: 'Matching fold directions would stack the panels', text: 'Jesse could force both hinges inward, flatten the screen beyond the strip, or open the hinges to equal opposite angles and form a Z.' },
        { title: 'The outer panels become parallel feet', text: 'Jesse folds the first hinge inward and the second outward by the same angle. The three panels form a stable Z inside the narrow strip.' },
      ], approaches: [
        { label: 'Check both hinge directions', callback: 'Jesse remembers the inward and outward limits.' }, { label: 'Match the two angles', callback: 'Jesse remembers the balanced folds.' }, { label: 'Test inside the strip', callback: 'Jesse remembers the stable Z shape.' },
      ], dilemma: { prompt: 'How should Jesse stand the attached screen in the narrow strip?', answers: ['Force both hinges inward.', 'Use equal opposite folds to form a Z.', 'Open the screen fully beyond the strip.'], correct: 1, explanation: 'Opposite equal folds keep all three attached panels inside the width and turn the outer panels into parallel supports.' }, closing: 'Three attached panels hold their place through one inward fold and one outward fold.', keepsake: { name: 'Z-Fold Hinge Model', description: 'A three-panel model with equal opposite hinge angles.' } },
      missions: { daily: [
        { label: 'Enjoy one quiet evening at Recreation area (game venue) in Terong Kangri', purpose: 'Plan the fictional screen’s opposite folds.', task: 'discovery', count: 1 }, { label: 'Visit Visitor meal stop (game venue) in Terong Kangri', purpose: 'Inspect a setting for Jesse’s level-board test.', task: 'practical-visit', count: 1 }, { label: 'Have one simple meal at Visitor meal stop (game venue) in Terong Kangri', purpose: 'Prepare the equal low-edge wedges.', task: 'practical', count: 1 },
      ], weekly: [
        { label: 'Have three simple meals at Visitor meal stop (game venue) in Terong Kangri', purpose: 'Repeat the centered-piece level test.', task: 'practical', count: 3 }, { label: 'Visit three game places in Terong Kangri', purpose: 'Compare narrow spaces for the Z-fold.', task: 'places', count: 3 }, { label: 'Greet three game regulars in Terong Kangri', purpose: 'Give Jesse helpers for the folding-screen setup.', task: 'people', count: 3 },
      ] }
    },
    {
      cityId: 'st-johns',
      city: { title: 'A Folded Beam beneath the Center', desire: 'competence', chapters: [
        { title: 'The paper bridge sags at its third token', text: "At Sea View Farm Playfield, Greer’s fictional paper bridge holds two end tokens but bends when a third rests at the center." },
        { title: 'One strip remains', text: "Looking around National Hero's Park shows the deck cannot be rebuilt. The spare strip can slide beneath it without moving the end supports." },
        { title: 'A flat strip would bend again', text: 'Greer could double the deck, remove the center token, or fold the strip into a triangular beam and place it beneath the middle.' },
        { title: 'The triangle carries the center load', text: 'Greer creases the strip into a rigid triangular section and slides it under the sag. All three tokens remain while the deck levels.' },
      ], approaches: [
        { label: 'Locate the center sag', callback: 'Greer remembers where support was missing.' }, { label: 'Fold a triangular section', callback: 'Greer remembers how the flat strip gained stiffness.' }, { label: 'Slide beneath the deck', callback: 'Greer remembers the repair without rebuilding.' },
      ], dilemma: { prompt: 'How should Greer use the one paper strip?', answers: ['Add it flat on top.', 'Remove the center token.', 'Fold it into a beam beneath the center.'], correct: 2, explanation: 'The folded triangular section resists bending and targets the unsupported center without altering the deck.' }, closing: 'A hidden folded beam lets the center token stand level with the two ends.', keepsake: { name: 'Triangular Paper Beam', description: 'A small folded strip with a center-load mark.' } },
      country: { title: 'Eight Balls Cover Demonstration and Practice', desire: 'fairness', chapters: [
        { title: 'Eight balls must serve four purposes', text: "At National Hero's Park, Greer’s fictional practice has three newcomers plus one two-ball demonstration." },
        { title: 'Every newcomer needs two attempts', text: 'A look around Sea View Farm Playfield confirms balls are not reused during the session. Six practice attempts plus two demo attempts total eight.' },
        { title: 'The allocation must be visible before play', text: 'Greer could spend extra balls on demonstration, shorten one learner’s turn, or reserve two demo balls and two for each newcomer.' },
        { title: 'The final ball completes the third practice pair', text: 'Greer sets aside the demonstration pair, then creates three learner pairs. The session uses every ball once and every newcomer receives equal attempts.' },
      ], approaches: [
        { label: 'Reserve the demo pair', callback: 'Greer remembers the opening two balls.' }, { label: 'Make three practice pairs', callback: 'Greer remembers the six learner attempts.' }, { label: 'Count all eight', callback: 'Greer remembers the exact complete allocation.' },
      ], dilemma: { prompt: 'How should Greer allocate the eight balls?', answers: ['Reserve two for demo and two per newcomer.', 'Use more than two for demonstration.', 'Give one newcomer fewer attempts.'], correct: 0, explanation: 'Two plus three pairs equals eight, satisfying the fixed demonstration and equal practice requirements exactly.' }, closing: 'One demonstration pair opens the session, and three equal practice pairs finish it.', keepsake: { name: 'Four-Pair Practice Rack', description: 'An eight-space rack grouped into one demo and three learner pairs.' } },
      missions: { daily: [
        { label: "Look around once at National Hero's Park", purpose: 'Plan Greer’s fictional center beam.', task: 'practical', count: 1 }, { label: 'Visit Greer at Sea View Farm Playfield', purpose: 'Review the eight-ball practice allocation.', task: 'host-visit', count: 1 }, { label: 'Greet four game regulars in St. John\'s', purpose: 'Give Greer newcomers for the practice session.', task: 'people', count: 4 },
      ], weekly: [
        { label: 'Look around three times at Sea View Farm Playfield', purpose: 'Practise grouping the four ball pairs.', task: 'discovery', count: 3 }, { label: "Visit two game places in St. John's", purpose: 'Think through the folded center support.', task: 'places', count: 2 }, { label: "Look around twice at National Hero's Park", purpose: 'Repeat the triangular-beam placement.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'villa-las-estrellas',
      city: { title: 'Use One Crate before Storing Two', desire: 'competence', chapters: [
        { title: 'Three crates arrive before storage is ready', text: 'At Recreation area (game venue), Jesse’s fictional project receives three crates one session early, but the available storage holds only two.' },
        { title: 'One crate contains today’s setup materials', text: 'Having a simple meal at Visitor meal stop (game venue) reveals those materials are needed immediately and require no storage after use.' },
        { title: 'The capacity problem can disappear through work', text: 'Jesse could leave a crate outside, overfill storage, or open and use the setup crate before placing the other two inside.' },
        { title: 'Only two closed crates remain', text: 'The team uses the first crate’s materials to prepare the project. Jesse then stores the two untouched crates in the two available spaces.' },
      ], approaches: [
        { label: 'Identify today’s crate', callback: 'Jesse remembers which contents leave storage immediately.' }, { label: 'Complete the setup', callback: 'Jesse remembers how work reduced the storage need.' }, { label: 'Store the closed pair', callback: 'Jesse remembers the exact two-space fit.' },
      ], dilemma: { prompt: 'How should Jesse handle three crates and two spaces?', answers: ['Leave one crate unattended.', 'Use the setup crate now and store the other two.', 'Force all three into storage.'], correct: 1, explanation: 'Using the immediately needed contents reduces the remaining closed-crate count to the available capacity.' }, closing: 'The project begins from one opened crate while two closed crates fill two storage spaces.', keepsake: { name: 'Use-Then-Store Crate Tag', description: 'A tag showing one open crate before two stored ones.' } },
      country: { title: 'One Long Game, Three Quick Games', desire: 'fairness', chapters: [
        { title: 'Four games share two tables', text: 'At Visitor meal stop (game venue), Jesse’s fictional game day has one long game and three quick games.' },
        { title: 'The long game cannot move', text: 'A quiet evening at Recreation area (game venue) shows the three quick games together take the same total span as the long one.' },
        { title: 'Parallel and sequential play can coexist', text: 'Jesse could cancel quick games, interrupt the long game, or keep long play on one table while rotating quick games on the other.' },
        { title: 'Both tables finish together', text: 'The long game runs continuously at table one. Three quick groups use table two in sequence, with the final quick game ending alongside the long one.' },
      ], approaches: [
        { label: 'Protect the long table', callback: 'Jesse remembers the continuous game.' }, { label: 'Order three quick games', callback: 'Jesse remembers the sequential second table.' }, { label: 'Align the final finishes', callback: 'Jesse remembers the full shared span.' },
      ], dilemma: { prompt: 'How should Jesse place the four games?', answers: ['Cancel the quick games.', 'Interrupt and move the long game.', 'Keep the long game fixed and rotate quick games beside it.'], correct: 2, explanation: 'One continuous table and one sequential table fit all four games inside the same total period.' }, closing: 'One patient game and three brisk games reach their final turns together.', keepsake: { name: 'Two-Table Time Bar', description: 'A bar with one long lane beside three short sections.' } },
      missions: { daily: [
        { label: 'Have one simple meal at Visitor meal stop (game venue) in Villa Las Estrellas', purpose: 'Plan Jesse’s fictional crate setup.', task: 'practical', count: 1 }, { label: 'Visit Jesse at Recreation area (game venue) in Villa Las Estrellas', purpose: 'Review the two-table game schedule.', task: 'host-visit', count: 1 }, { label: 'Greet two game regulars in Villa Las Estrellas', purpose: 'Give Jesse players for the quick-game rotation.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Enjoy two quiet evenings at Recreation area (game venue) in Villa Las Estrellas', purpose: 'Practise the long-and-quick table plan.', task: 'discovery', count: 2 }, { label: 'Visit three game places in Villa Las Estrellas', purpose: 'Think through the use-before-storage choice.', task: 'places', count: 3 }, { label: 'Have three simple meals at Visitor meal stop (game venue) in Villa Las Estrellas', purpose: 'Repeat the two-space crate fit.', task: 'practical', count: 3 },
      ] },
    },
    {
      cityId: 'warsaw',
      city: { title: 'Five Equal Props in Six Holes', desire: 'competence', chapters: [
        { title: 'A stand tips when weight crowds one side', text: 'At Park Kombatantów, Sage’s fictional circular stand has one center hole, four rim holes arranged as two opposite pairs and one off-center spare rim hole. Five props have equivalent weight.' },
        { title: 'One rim hole must remain empty', text: 'Looking around Park Fosa shows four rim holes form two opposite pairs. The fifth prop can occupy the center, where it creates no turning force.' },
        { title: 'Geometry matters before the props are locked', text: 'Sage could fill neighboring rim holes, leave the center empty, or place two opposite rim pairs plus one centered prop.' },
        { title: 'Opposite forces cancel', text: 'Sage fills both opposite pairs, places the fifth prop at center and leaves the unmatched rim hole empty. The stand remains level when released.' },
      ], approaches: [
        { label: 'Find opposite rim pairs', callback: 'Sage remembers the four balancing holes.' }, { label: 'Use the center for the fifth', callback: 'Sage remembers the position with no turning force.' }, { label: 'Leave one rim hole empty', callback: 'Sage remembers the complete six-hole geometry.' },
      ], dilemma: { prompt: 'How should Sage place five equal props in six holes?', answers: ['Use two opposite rim pairs and the center.', 'Fill five neighboring rim holes.', 'Leave the center empty.'], correct: 0, explanation: 'Equivalent weights in opposite pairs cancel, and the centered fifth weight adds no off-center turning force.' }, closing: 'Five props stand evenly around and at the center of a base with one harmless empty rim hole.', keepsake: { name: 'Opposite-Pair Stand Disc', description: 'A six-hole disc showing two rim pairs, one center and one empty rim hole.' } },
      country: { title: 'Two Slaloms Share the Finish', desire: 'fairness', chapters: [
        { title: 'Seven cones must serve two lanes', text: 'At Park Fosa, Sage’s fictional friendly course needs two equal slaloms and one common finish.' },
        { title: 'No cone may move after the start', text: 'A look around Park Kombatantów confirms each lane needs three turns. The seventh cone can stand where both routes end.' },
        { title: 'Equal lanes can share only the finish', text: 'Sage could give one lane four turns, omit a finish, or assign three cones to each lane and the last to a shared finish.' },
        { title: 'Both routes end at one marker', text: 'Sage lays three equal turns left and three right, then places cone seven beyond both. Racers navigate identical counts and cross the same finish.' },
      ], approaches: [
        { label: 'Split six lane cones', callback: 'Sage remembers the equal three-and-three turns.' }, { label: 'Reserve cone seven', callback: 'Sage remembers the common finish.' }, { label: 'Check both routes', callback: 'Sage remembers the matched course lengths.' },
      ], dilemma: { prompt: 'How should Sage use the seven cones?', answers: ['Give one lane an extra turn.', 'Use three per lane and one shared finish.', 'Build courses without a finish.'], correct: 1, explanation: 'The six lane cones divide evenly, and the indivisible seventh cone serves both routes equally at their endpoint.' }, closing: 'Two separate slaloms weave toward one unmistakable final cone.', keepsake: { name: 'Shared-Finish Cone Pin', description: 'A pin showing two three-turn lanes joining at cone seven.' } },
      missions: { daily: [
        { label: 'Look around once at Park Fosa', purpose: 'Plan Sage’s five-prop fictional stand.', task: 'practical', count: 1 }, { label: 'Visit two game places in Warsaw', purpose: 'Compare spaces for the shared-finish course.', task: 'places', count: 2 }, { label: 'Look around once at Park Kombatantów', purpose: 'Prepare the opposite-pair stand geometry.', task: 'discovery', count: 1 },
      ], weekly: [
        { label: 'Look around twice at Park Fosa', purpose: 'Repeat the equal slalom lane split.', task: 'practical', count: 2 }, { label: 'Visit Sage at Park Kombatantów', purpose: 'Review the centered fifth weight and shared finish.', task: 'host-visit', count: 1 }, { label: 'Greet three game regulars in Warsaw', purpose: 'Give Sage racers for the matched slaloms.', task: 'people', count: 3 },
      ] }
    },
    {
      cityId: 'yaounde',
      city: { title: 'Three Opposite Cup Pairs', desire: 'competence', chapters: [
        { title: 'A rotating tray must carry six cups', text: 'At Parcours Vita, Jesse’s fictional café display has a center pivot, six equal cups and six clips that lock positions before one full turn.' },
        { title: 'Placement happens before locking', text: 'Having a simple meal at Restaurant Municipal La Cascade reveals each cup has an opposite clip at the same distance from center.' },
        { title: 'The unlocked tray needs a balanced arrangement', text: 'Jesse could cluster cups, lock them one by one while turning, or place three opposite pairs first and then close every clip.' },
        { title: 'The fixed arrangement turns evenly', text: 'Jesse places each cup opposite an equal cup, verifies all three pairs, then locks the six clips. The tray completes its turn without pulling to one side.' },
      ], approaches: [
        { label: 'Find three opposite positions', callback: 'Jesse remembers the paired geometry.' }, { label: 'Place before locking', callback: 'Jesse remembers when adjustment was still possible.' }, { label: 'Test one full turn', callback: 'Jesse remembers the balanced result.' },
      ], dilemma: { prompt: 'How should Jesse prepare the tray before rotation?', answers: ['Cluster cups on one side.', 'Lock cups while the tray turns.', 'Place three opposite pairs, then lock all clips.'], correct: 2, explanation: 'Equal cups at equal opposite distances balance around the pivot, and arranging before locking preserves the needed adjustment.' }, closing: 'Six fixed cups travel one full circle as three balanced pairs.', keepsake: { name: 'Opposite-Cup Turn Disc', description: 'A disc showing three diameters joining six cup clips.' } },
      country: { title: 'Walk the Ball out of the Rails', desire: 'curiosity', chapters: [
        { title: 'A soft ball jams between two rails', text: 'At Restaurant Municipal La Cascade, Jesse’s fictional game ball is wedged in a straight channel with one open end.' },
        { title: 'A direct push tightens the jam', text: 'A quiet evening at Parcours Vita reveals two flat paddles fit the side gaps. Small alternating side pushes rotate the ball slightly toward the opening.' },
        { title: 'The ball needs a walking motion', text: 'Jesse could push harder from behind, pry one side continuously, or alternate short left and right paddle pushes.' },
        { title: 'Tiny changes add into an exit', text: 'The left paddle nudges, then the right. Repeated alternating pushes walk the ball down the rails until it reaches the open end.' },
      ], approaches: [
        { label: 'Fit both side paddles', callback: 'Jesse remembers the two available gaps.' }, { label: 'Alternate small pushes', callback: 'Jesse remembers the walking motion.' }, { label: 'Aim toward the open end', callback: 'Jesse remembers the final direction.' },
      ], dilemma: { prompt: 'How should Jesse free the jammed ball?', answers: ['Alternate small pushes from both sides.', 'Push harder from directly behind.', 'Pry continuously from one side.'], correct: 0, explanation: 'Alternating side forces relieve the jam and advance the ball without driving it more tightly between the rails.' }, closing: 'The ball leaves the rails through a patient series of left-right steps.', keepsake: { name: 'Rail-Walk Paddle Pair', description: 'Two flat paddles marked left, right and forward.' } },
      missions: { daily: [
        { label: 'Enjoy one quiet evening at Parcours Vita', purpose: 'Plan the alternating fictional paddle pushes.', task: 'discovery', count: 1 }, { label: 'Visit Restaurant Municipal La Cascade', purpose: 'Inspect a setting for Jesse’s opposite cup pairs.', task: 'practical-visit', count: 1 }, { label: 'Have one simple meal at Restaurant Municipal La Cascade', purpose: 'Prepare the pre-lock tray check.', task: 'practical', count: 1 },
      ], weekly: [
        { label: 'Enjoy two quiet evenings at Parcours Vita', purpose: 'Practise alternating the fictional paddle pushes.', task: 'discovery', count: 2 }, { label: 'Visit Jesse at Parcours Vita', purpose: 'Review the opposite-pair tray setup.', task: 'host-visit', count: 1 }, { label: 'Greet four game regulars in Yaoundé', purpose: 'Give Jesse partners for the tray check.', task: 'people', count: 4 },
      ] }
    },
  ],
} satisfies AuthoredContentBatch

export default batch
