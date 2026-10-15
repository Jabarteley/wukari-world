import type { AuthoredContentBatch } from '../../../types/local-tales.ts'

const batch: AuthoredContentBatch = {
  countries: [{ countryId: 'ng', title: 'The Many-Stops Encore', premise: 'A neighborhood performance challenge travels from city to city. Each stop invents its own playful test of timing, teamwork, or improvisation; no installment describes a real custom or event.', collection: 'Encore Sparks', rewardTitle: 'Keeper of the Encore' }],
  cities: [
    {
      cityId: 'abakaliki',
      city: {
        title: 'The Rice Bowl Drumroll', desire: 'competence',
        chapters: [
          { title: 'A premature flourish', text: 'At Abakaliki Rice Processing Market, Amara Mbah watches a cook prepare a comic tasting reveal for a neighborhood stage. Each time the drummer starts the grand roll, the cook lifts the covered bowl too early and announces the surprise while the lid is still on. ' },
          { title: 'The rhythm goes rogue', text: 'You can browse Abakaliki rice as the cook explains the timing, or join Amara for a quiet evening at Fatilami Park to rehearse away from the crowd. The cook has one more run before the friendly rival troupe takes its turn, and feels embarrassed by the repeated mismatch.' },
          { title: 'Three ways to cue', text: 'The drummer suggests a louder roll, the cook suggests a tiny hand signal, and Amara proposes that the drummer watch the cook’s breath. The cook explains that the lid is heavy: both hands are busy until the final beat, so a hand signal cannot be seen.' },
          { title: 'The shared breath', text: 'They try the breath cue. The drummer follows the cook’s last audible inhale, holds a comic pause, then rolls as the lid lifts. The rival troupe applauds the pause more than the reveal, and the cook turns the former mistake into the punchline.' },
        ],
        approaches: [
          { label: 'Browse Abakaliki rice and hear the cue problem', callback: 'You noticed the cook needed both hands until the lid was ready.' },
          { label: 'Rehearse quietly at Fatilami Park', callback: 'You helped the drummer wait for the cook’s breath instead of guessing.' },
          { label: 'Leave Amara a note for the cook’s next rehearsal', callback: 'You gave the cook time to turn the missed beat into a joke.' },
        ],
        dilemma: { prompt: 'The cook cannot signal with either hand while lifting the heavy lid. Which cue fits?', answers: ['Make the drumroll louder so it covers the awkward pause.', 'Use the cook’s last audible breath as the drummer’s cue.', 'Have the cook stop lifting and point at the drummer.'], correct: 1, explanation: 'The cook has both hands occupied, but the breath remains audible; following it gives both performers a cue they can use.' },
        closing: 'Amara calls the act “The Longest Drumroll in Town,” and the cook bows before the lid is even fully open. This time the timing is the joke.',
        keepsake: { name: 'Breath-beat shaker', description: 'A tiny stage shaker marked with the pause that made the reveal land.' },
      },
      country: {
        title: 'The Encore Bell Arrives Late', desire: 'belonging',
        chapters: [
          { title: 'A late arrival', text: 'The Many-Stops Encore challenge reaches Abakaliki with a brass bell meant to announce each troupe’s turn. It arrives after the performers have already gathered at Fatilami Park. Amara Mbah finds the bell in its padded case and discovers that its clapper is missing.' },
          { title: 'No official opening', text: 'The cook from the rice-bowl act offers a drumbeat instead, while a rival performer suggests beginning without any signal. A newcomer worries that joining late has made them miss their chance to take part. The group is trying to welcome everybody.' },
          { title: 'A signal anyone can give', text: 'They can wait until the bell is repaired, let only the established drummer announce turns, or invite each troupe to invent a short sound and teach it to the newcomers. Amara says the bell can travel empty; its meaning is not fixed.' },
          { title: 'A chorus of starts', text: 'They choose the invented sounds. The newcomer contributes a soft whistle, the cook adds the two-beat rhythm, and the rival troupe adds a heel tap. Amara writes no hierarchy into the challenge: any signal can open the next turn.' },
        ],
        approaches: [
          { label: 'Browse rice and listen for a two-beat rhythm', callback: 'You carried a sound the newcomer could learn without waiting for the bell.' },
          { label: 'Visit Fatilami Park for the late opening', callback: 'You helped make the first turn welcoming after the bell arrived late.' },
          { label: 'Leave Amara a cue for the next performer', callback: 'You made room for another troupe to invent its own opening sound.' },
        ],
        dilemma: { prompt: 'How can the performance begin while welcoming someone who arrived after the bell?', answers: ['Invite each troupe to teach an opening sound, including the newcomer.', 'Wait for a repaired bell before anyone takes a turn.', 'Let the established drummer alone announce the turns.'], correct: 0, explanation: 'The bell is not required, and the newcomer wants a chance to join; shared signals give every troupe a way to start.' },
        closing: 'The empty bell case travels onward beside a list of sounds. The next troupe can add a new one or borrow a cue it has learned.',
        keepsake: { name: 'Three-sound clapper', description: 'A playful wooden clapper shaped to remind the group that an opening can have several voices.' },
      },
      missions: { daily: [
        { label: 'Browse rice before the drumroll', purpose: 'Hear the cook explain why the lid and the first drumbeat kept colliding.', task: 'practical', count: 1 },
        { label: 'Visit Fatilami Park before the reveal', purpose: 'Practice waiting for the cook’s audible breath before starting the roll.', task: 'host-visit', count: 1 },
        { label: 'Spend a quiet evening before the cue', purpose: 'Compare how the cook and drummer experience the same pause.', task: 'discovery', count: 1 },
      ], weekly: [
        { label: 'Browse rice three times before the encore', purpose: 'Give the performers another chance to land their comic pause.', task: 'practical', count: 3 },
        { label: 'Visit two places before the final beat', purpose: 'Try the act in more than one setting before the encore.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before rehearsal', purpose: 'Prepare a cue that a newcomer can learn and use.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'abeokuta',
      city: {
        title: 'The Bridge’s Borrowed Hat', desire: 'autonomy',
        chapters: [
          { title: 'A prop goes wandering', text: 'At the Ogun River and Lafenwa Bridge, Peju Adefisan watches a amateur troupe rehearse a silent comedy. A broad hat slips from the lead performer and tumbles into the scene just as the rival troupe arrives. The hat lands beside the stage.' },
          { title: 'The scene changes', text: 'One performer wants to pause and reset; another thinks the surprise is funnier than the planned entrance. You can price the market at Kuto Market while the actors argue, or walk beside the river and imagine how the scene might continue.' },
          { title: 'A choice for the owner', text: 'They could stop the scene, pretend the hat is a new character, or continue without the prop. Peju reminds them that the lead performer owns the role and has not yet chosen. The friendly rivals are waiting, but no prize depends on finishing first.' },
          { title: 'An improvised guest', text: 'The lead performer chooses to make the hat a silent guest who interrupts every boast. The troupe rehearses that version once, then gives the owner a chance to return to the original plan. The rivals laugh at the hat’s exaggerated bow and offer to borrow the gag for their own act.' },
        ],
        approaches: [
          { label: 'Price the market and consider a reset', callback: 'You remembered the performer who owned the role should choose what happens next.' },
          { label: 'Walk beside the river and imagine a new entrance', callback: 'You helped turn a surprise prop into an optional comic guest.' },
          { label: 'Leave Peju a note for the next rehearsal', callback: 'You gave the performer room to choose between the planned scene and the gag.' },
        ],
        dilemma: { prompt: 'The lead performer owns the role and wants to decide how to handle the unexpected hat. What should the troupe do?', answers: ['Pause and reset without asking what the lead wants.', 'Keep going without the hat so the schedule stays tidy.', 'Offer the hat a comic guest role and let the lead choose whether to use it.'], correct: 2, explanation: 'The performer has not chosen yet; offering an improvisation while leaving the choice with them respects their role and the playful opportunity.' },
        closing: 'Peju calls the hat the troupe’s most independent actor. The lead keeps the original scene ready for another day and takes a bow with the borrowed guest.',
        keepsake: { name: 'Fold-flat hat badge', description: 'A tiny paper hat badge for the prop that briefly became the star.' },
      },
      country: {
        title: 'The Encore That Changed Its Ending', desire: 'curiosity',
        chapters: [
          { title: 'A new troupe joins', text: 'The Many-Stops Encore challenge reaches the Ogun River and Lafenwa Bridge with a rule written on its travelling card: every troupe must end with the same bow. Peju Adefisan finds a group of first-time performers who want to join but have rehearsed a different ending.' },
          { title: 'A borrowed finale', text: 'The returning troupe insists the shared bow makes the challenge recognizable. The newcomers say their finale uses an unexpected still pose. Neither group wants to mock the other.' },
          { title: 'Keep the link, change the move', text: 'They can force everyone into the old bow, let each troupe perform separately with no shared moment, or keep one shared beat and let each troupe choose what shape follows it. Peju asks what would make a traveler recognize the challenge without making every performer identical.' },
          { title: 'One beat, many endings', text: 'They keep a single beat of stillness, then let each troupe finish in its own way. The new group holds its surprising pose; the returning troupe bows. Their friendly rivals applaud both, and the challenge gains a signal that connects acts without dictating them.' },
        ],
        approaches: [
          { label: 'Price the market and consider the shared finale', callback: 'You helped keep one recognizable beat while leaving the rest to each troupe.' },
          { label: 'Walk beside the river and watch a rehearsal', callback: 'You saw the new performers’ still pose become part of the challenge.' },
          { label: 'Leave Peju a cue for the next troupe', callback: 'You left the next group room to shape its own ending.' },
        ],
        dilemma: { prompt: 'What ending connects the troupes while giving the newcomers room for their own finale?', answers: ['Keep one shared beat, then let each troupe choose its ending.', 'Require every troupe to use the original bow.', 'Remove every shared moment and perform separately.'], correct: 0, explanation: 'A shared beat makes the challenge recognizable, while the following move can remain each troupe’s own.' },
        closing: 'Peju changes the traveling card from “same bow” to “shared beat.” The next city inherits a connection, not a choreography.',
        keepsake: { name: 'Stillness token', description: 'A small wooden beat token marking the instant before each troupe’s own ending.' },
      },
      missions: { daily: [
        { label: 'Walk beside the river before the hat gag', purpose: 'Give the performers time to decide how the wandering hat enters the scene.', task: 'discovery', count: 1 },
        { label: 'Visit two places before the silent entrance', purpose: 'Imagine how a surprise prop might change the silent comedy.', task: 'places', count: 2 },
        { label: 'Price the market before the scene', purpose: 'Hear both the prop owner’s preference and the rival troupe’s reaction.', task: 'practical', count: 1 },
      ], weekly: [
        { label: 'Price the market twice before the rivals arrive', purpose: 'Let the lead compare the planned scene with the improvised guest role.', task: 'practical', count: 2 },
        { label: 'Visit Ogun River and Lafenwa Bridge', purpose: 'See how the same comedy changes in another setting.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 3 regulars before the borrowed hat', purpose: 'Prepare a link between the troupes that leaves each finale open.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'abuja',
      city: {
        title: 'The Puppet That Would Not Bow', desire: 'care',
        chapters: [
          { title: 'A stubborn curtain call', text: 'At the National Children’s Park and Zoo, Grace Samuel watches a puppet act rehearse for the neighborhood encore. The animal puppet has a springy neck that keeps popping upright during the bow. Its puppeteer is proud of the lively movement but worries that the audience will think the act is mocking the other performers.' },
          { title: 'A friendly rival offers help', text: 'You can walk the parade ground at Eagle Square or visit the park and see the animals while Grace listens to the puppeteer. The rival troupe offers to hold the puppet still, but the puppeteer wants to keep control of the character.' },
          { title: 'Three ways to bow', text: 'They could tape the puppet’s neck down, let the springy bow become a deliberate joke, or ask the rival to operate the puppet. Grace asks what the puppeteer wants: they say they like the bounce but want the audience to know it is playful.' },
          { title: 'A bow with a wink', text: 'They add a wink and a second exaggerated bounce, then let the puppet bow toward each troupe in turn. The rival performers answer with their own silly bows. Grace sees the worry fade as the audience understands the puppet is greeting, not ridiculing, its friends.' },
        ],
        approaches: [
          { label: 'Walk Eagle Square and practice a curtain-call bow', callback: 'You helped the puppeteer keep control while making the bounce clearly playful.' },
          { label: 'Visit the park and see the animals', callback: 'You suggested a second bounce that turned an awkward twitch into a greeting.' },
          { label: 'Leave Grace a note for the puppeteer', callback: 'You gave the performer room to explain the character’s intent.' },
        ],
        dilemma: { prompt: 'The puppeteer likes the bouncing neck but wants the rival troupe to know it is a friendly greeting. What should happen?', answers: ['Let a rival control the puppet during the bow.', 'Make the bounce an intentional greeting directed to both troupes.', 'Tape the springy neck down so it cannot move.'], correct: 1, explanation: 'The puppeteer wants to keep control and likes the bounce; a clear greeting preserves both preferences.' },
        closing: 'Grace calls the puppet back for one more bow. It bounces twice, and the rival troupe answers with a synchronized wobble.',
        keepsake: { name: 'Wobble-bow ribbon', description: 'A ribbon tied to the puppet’s wrist to mark its two-bounce greeting.' },
      },
      country: {
        title: 'The Encore’s Unplanned Audience', desire: 'belonging',
        chapters: [
          { title: 'A surprise row', text: 'The Many-Stops Encore challenge settles near the National Children’s Park and Zoo for a rehearsal. Grace Samuel notices that a group of shy newcomers has arrived just as the performers begin. They want to watch first, while one performer assumes everyone should join the next act.' },
          { title: 'An invitation can feel large', text: 'The troupe wants to be welcoming but does not want to put anyone on the spot. The newcomers have not said whether they want to perform, and Grace cautions that a wave from the stage can feel like a demand when everyone is looking.' },
          { title: 'Offer more than one seat', text: 'They might call the newcomers onto the stage, keep them outside the activity, or offer a choice of watching, helping with a simple cue, or joining a later act. The troupe has a spare cue card and several short performances still to come.' },
          { title: 'A place behind the curtain', text: 'They offer the choices without naming anyone. One newcomer takes the cue card, another watches, and a third joins after the next act. Grace keeps the invitation open across the evening rather than treating the first answer as permanent.' },
        ],
        approaches: [
          { label: 'Walk Eagle Square while planning a gentle invitation', callback: 'You kept watching and performing both available as ways to join.' },
          { label: 'Visit the park before the next act', callback: 'You left the newcomers time to choose their own level of participation.' },
          { label: 'Leave Grace a cue card for later arrivals', callback: 'You made the invitation useful after the first act had already begun.' },
        ],
        dilemma: { prompt: 'How can the troupe welcome newcomers who have not said whether they want to perform?', answers: ['Offer watching, a small cue role, or a later turn as equal choices.', 'Call the newcomers onto the stage so they know they are welcome.', 'Keep the newcomers outside the act until they ask to join.'], correct: 0, explanation: 'The group wants to welcome without pressure, and several performances remain; offering choices lets each newcomer decide.' },
        closing: 'Grace puts a spare cue card by the entrance. It signals that an encore can have listeners as well as performers.',
        keepsake: { name: 'Backstage cue card', description: 'A card showing a tiny bell, a watching eye, and an open stage as equal ways to join.' },
      },
      missions: { daily: [
        { label: 'Walk Eagle Square before the puppet bow', purpose: 'Help the puppeteer make the bouncing bow read as friendly.', task: 'practical', count: 1 },
        { label: 'Visit National Children’s Park and Zoo', purpose: 'Give the act space to rehearse its two-bounce ending.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 2 regulars before the curtain call', purpose: 'Learn which choices make a new audience member comfortable.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'See the park animals twice before the encore', purpose: 'Let both troupes answer the puppet’s greeting.', task: 'discovery', count: 2 },
        { label: 'Visit three places before the final bow', purpose: 'Prepare a welcoming entrance in different settings.', task: 'places', count: 3 },
        { label: 'Walk Eagle Square twice before the puppet returns', purpose: 'Offer watching and joining as equally valid choices.', task: 'practical', count: 2 },
      ] },
    },
    {
      cityId: 'ado-ekiti',
      city: {
        title: 'The Leafy Costume Mix-Up', desire: 'recognition',
        chapters: [
          { title: 'A double entrance', text: 'At Asha Botanical Garden, Yetunde Lawal finds two performers arriving in identical paper-leaf capes. Each thought the other had chosen a different costume, and both planned to enter as the dramatic “mystery gardener.” They are friends, but each wants the audience to recognize their own character.' },
          { title: 'A collision of clues', text: 'You can browse yam, cassava and grain at Bisi Market while the performers try different entrances, or spend an evening in the garden as Yetunde helps them compare the cape details.' },
          { title: 'Share the spotlight', text: 'They could make one performer change costumes, have both enter separately as the same mystery figure, or turn the duplication into a paired character with different jobs. Yetunde asks what each performer hopes the audience will remember.' },
          { title: 'Two halves of a clue', text: 'One performer wants to be remembered for a dramatic entrance; the other wants to solve the scene’s riddle. They choose a paired character: one arrives loudly while the other reveals the clue. The matching capes become evidence that the two roles belong together.' },
        ],
        approaches: [
          { label: 'Browse the produce market and compare entrances', callback: 'You helped each performer name what they wanted the audience to remember.' },
          { label: 'Spend an evening at Asha Botanical Garden', callback: 'You saw the matching capes become a clue shared by two roles.' },
          { label: 'Leave Yetunde a note for the next rehearsal', callback: 'You let both performers choose a part that suited their own idea.' },
        ],
        dilemma: { prompt: 'Both performers want recognition and have chosen matching capes. What keeps each role distinctive?', answers: ['Have one performer change outfits to remove the overlap.', 'Give the pair two linked jobs: dramatic entrance and riddle reveal.', 'Make them enter separately as the same mystery gardener.'], correct: 1, explanation: 'Their stated hopes differ, so linked roles make each performer recognizable while keeping the costume coincidence.' },
        closing: 'Yetunde introduces the pair as “The Entrance and the Answer.” Their rival troupe asks if it can borrow the act’s double reveal.',
        keepsake: { name: 'Paired-leaf clasp', description: 'A paper clasp joining two matching cape swatches for the linked characters.' },
      },
      country: {
        title: 'The Encore’s Reversed Riddle', desire: 'curiosity',
        chapters: [
          { title: 'A clue points backward', text: 'The Many-Stops Encore reaches Asha Botanical Garden with a riddle card for the next troupe. Yetunde Lawal notices the final clue appears before the first one, making the answer impossible to follow.' },
          { title: 'The order is tangled', text: 'One performer wants to read the card as printed; another thinks the clues should be rearranged. A third worries that changing the order will reveal the answer too soon.' },
          { title: 'Try the trail', text: 'They can discard the card, let the audience guess from the last clue, or read the clues backward and pause before the answer. Yetunde asks which version gives the next troupe a fair chance to solve it.' },
          { title: 'A question travels onward', text: 'They test the reversed order. The clues now build toward a surprising answer, and the troupe leaves the final line covered for the next stop. Their rivals volunteer to write a new riddle for the return trip.' },
        ],
        approaches: [
          { label: 'Browse Bisi Market before the riddle test', callback: 'You helped make the clues build in a useful order.' },
          { label: 'Visit Asha Botanical Garden during the riddle rehearsal', callback: 'You saw the next troupe get a fair chance to guess.' },
          { label: 'Leave Yetunde a note with the clue order', callback: 'You kept the answer hidden for the next stop.' }
        ],
        dilemma: { prompt: 'How can the troupe make the riddle fair without revealing its answer?', answers: ['Read the card as printed even though the clues are reversed.', 'Reorder the clues and keep the answer covered.', 'Discard the riddle card.'], correct: 1, explanation: 'Reordering lets the clues build while the covered answer preserves the puzzle.' },
        closing: 'Yetunde turns the riddle card around so the next troupe can begin at the beginning.',
        keepsake: { name: 'Reversed riddle card', description: 'A folded card with numbered clues and a covered final answer.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the cape riddle', purpose: 'Give both performers time to describe what they want the audience to remember.', task: 'discovery', count: 1 },
        { label: 'Visit Bisi Market before the paired entrance', purpose: 'Practice separating the dramatic entrance from the riddle reveal.', task: 'practical-visit', count: 1 },
        { label: 'Browse produce before the clue reveal', purpose: 'Hear what each wants to contribute to the matching costume scene.', task: 'practical', count: 1 },
      ], weekly: [
        { label: 'Browse produce twice before the riddle', purpose: 'Let the paired performers trade entrance and clue roles.', task: 'practical', count: 2 },
        { label: 'Visit Asha Botanical Garden before rehearsal', purpose: 'Practice using a shared entrance in another setting.', task: 'host-visit', count: 1 },
        { label: 'Greet 4 regulars before the next entrance', purpose: 'Give the second troupe its own comic moment.', task: 'people', count: 4 },
      ] },
    },
    {
      cityId: 'akure',
      city: {
        title: 'The Cocoa Bean Juggle-Off', desire: 'fairness',
        chapters: [
          { title: 'One prop, two challengers', text: 'At Akure Market, Ayodele Balogun sees two rivals preparing a gentle juggling contest with oversized foam cocoa-bean props. One rival has practiced longer; the other has invented a clever trick but keeps dropping the prop when nervous. They both want a fair chance to delight the crowd.' },
          { title: 'The audience picks favorites', text: 'You can browse cocoa, yam and cassava at Akure Market, or compare the rivalry at Erekesan Market. Ayodele notices that the crowd has begun cheering for one performer before either has finished.' },
          { title: 'What counts as a win?', text: 'They could count uninterrupted catches, award points for the funniest recovery, or give each rival a turn to demonstrate one skill and one invented trick. The rivals agree they care more about the crowd laughing with them than about who holds the foam prop longest.' },
          { title: 'A two-part contest', text: 'They choose one clean catch round and one comic recovery round. Each rival gets to lead the round that suits them, then they finish with a deliberately awkward synchronized toss. Ayodele calls it a tie, though both insist they won the laugh.' },
        ],
        approaches: [
          { label: 'Browse cocoa and consider the contest rules', callback: 'You separated practiced control from the improvised comic trick.' },
          { label: 'Compare the rivals at Erekesan Market', callback: 'You helped give each performer a round that showed a different strength.' },
          { label: 'Leave Ayodele a note for the contestants', callback: 'You reminded the rivals that making the crowd laugh mattered to both.' },
        ],
        dilemma: { prompt: 'The rivals value both a clean catch and a funny recovery. Which contest gives each a fair moment?', answers: ['Count only uninterrupted catches.', 'Give one round to control and one to comic recovery.', 'Award the win to whoever the crowd cheered first.'], correct: 1, explanation: 'Each rival has a different strength and both value laughter; two rounds let each show a skill without the early cheering deciding.' },
        closing: 'Ayodele writes “tie, but louder” on the score card. The rivals bow together and accidentally drop the foam bean on cue.',
        keepsake: { name: 'Foam-bean score charm', description: 'A soft bean-shaped charm marked with two equal score lines.' },
      },
      country: {
        title: 'The Encore’s Stolen Pause', desire: 'care',
        chapters: [
          { title: 'A performer needs a breath', text: 'The Many-Stops Encore reaches Erekesan Market while a comic duo rehearses a rapid-fire dialogue. Ayodele Balogun notices one performer has begun missing lines because the other never leaves room to answer.' },
          { title: 'A race to speak', text: 'The quick speaker enjoys the pace; the partner wants a little time to finish each thought. The rival troupe offers to clap between every sentence, but that would interrupt the scene.' },
          { title: 'Make room to answer', text: 'They can slow every line, have the partner speak louder, or use a raised finger as a signal that the next line is still coming. Ayodele asks for a cue the pair can use without stopping the joke.' },
          { title: 'The pause gets a laugh', text: 'They try the finger cue. The quick speaker waits, the partner completes the thought, and the next reply lands as a punchline. The rivals borrow the pause for their own scene.' },
        ],
        approaches: [
          { label: 'Browse cocoa, yam and cassava at Akure Market before rehearsal', callback: 'You helped the pair find a cue that leaves room to answer.' },
          { label: 'Visit Erekesan Market during the dialogue practice', callback: 'You saw a pause make the punchline easier to follow.' },
          { label: 'Leave Ayodele a note about the finger cue', callback: 'You gave the duo a signal they can use again.' }
        ],
        dilemma: { prompt: 'How can the quick speaker leave room for a reply without losing the comic pace?', answers: ['Make the partner shout over the next line.', 'Use a small signal to leave time for the answer.', 'Slow every line to the same pace.'], correct: 1, explanation: 'A small cue keeps the scene moving while letting both performers finish their lines.' },
        closing: 'Ayodele clips the finger-cue sketch to the travelling challenge card.',
        keepsake: { name: 'Reply cue sketch', description: 'A tiny drawing of a raised finger beside a speech bubble.' },
      },
      missions: { daily: [
        { label: 'Browse cocoa before the juggle-off', purpose: 'Hear both rivals explain which part of the contest they enjoy.', task: 'practical', count: 1 },
        { label: 'Visit two places before the contest', purpose: 'Notice how a recovery can make a missed toss entertaining.', task: 'places', count: 2 },
        { label: 'Browse produce before the rivals take turns', purpose: 'Find out what each performer wants the crowd to notice.', task: 'discovery', count: 1 },
      ], weekly: [
        { label: 'Browse produce three times before the rematch', purpose: 'Give control and comic recovery their own turns.', task: 'discovery', count: 3 },
        { label: 'Visit Akure Market before the final round', purpose: 'Try the trick relay in another mapped setting.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the foam-bean contest', purpose: 'Prepare a graceful continuation for the next troupe.', task: 'people', count: 2 },
      ] },
    },
    {
      cityId: 'asaba',
      city: {
        title: 'The Museum Mime’s Missing Name', desire: 'curiosity',
        chapters: [
          { title: 'A wordless riddle', text: 'At National Museum Asaba, Nnamdi Ibe hosts a mime act about a mysterious suitcase. The performer opens it, looks astonished, then points to an empty space. The audience guesses wildly because the act never tells them whether the suitcase held a hat, a trumpet, or an invisible cake.' },
          { title: 'The joke gets lost', text: 'You can browse yams, spices and smoked fish at Ogbeogonogo Modern Market, or learn about the collection at the museum while Nnamdi asks what kind of guess the mime wants.' },
          { title: 'Give the audience a foothold', text: 'The mime could silently reveal the object, add one clue before opening the case, or let each audience member invent a different answer. The performer says the fun is in the guesses, but wants them to be connected to a clue rather than random.' },
          { title: 'A clue, then chaos', text: 'They add a clue: the object makes music when shaken. The audience guesses bell, drum, or a very confused tambourine. The mime chooses the tambourine and mimes an impossible solo, giving the audience a fair start and keeping the ending silly.' },
        ],
        approaches: [
          { label: 'Browse spices while testing a clue', callback: 'You helped the mime make the audience guesses playful and connected.' },
          { label: 'Learn about the collection and rehearse the reveal', callback: 'You gave the audience a clue before the suitcase opened.' },
          { label: 'Leave Nnamdi a possible sound clue', callback: 'You offered a hint that left the final answer open.' },
        ],
        dilemma: { prompt: 'The mime wants surprising guesses that still connect to the imaginary suitcase. What should the act add?', answers: ['Reveal the object immediately.', 'Give one clue before inviting guesses.', 'Let every audience member name anything at all.'], correct: 1, explanation: 'A clue gives the guesses a shared starting point while preserving the performer’s surprise.' },
        closing: 'Nnamdi asks the rival troupe to invent another clue for the next suitcase. The mime bows to an audience still arguing about the tambourine.',
        keepsake: { name: 'Invisible suitcase tag', description: 'A blank tag with a musical note, left for the next imaginary object.' },
      },
      country: {
        title: 'The Encore’s Two-Ending Scene', desire: 'autonomy',
        chapters: [
          { title: 'A scene reaches a fork', text: 'The Many-Stops Encore reaches National Museum Asaba with a short story that can end in either a reunion or a comic escape. Nnamdi Ibe finds that the troupe has rehearsed both endings but cannot decide which to perform.' },
          { title: 'The audience is waiting', text: 'One actor prefers the reunion; another likes the escape. The rival troupe offers to choose by applause, though neither ending has been shown yet.' },
          { title: 'Let the scene choose', text: 'They can ask the audience to pick before the story begins, perform both endings back-to-back, or place a clear choice in the story so the actors can follow what the audience calls. Nnamdi asks whether a choice can feel like part of the play.' },
          { title: 'A fork in the story', text: 'They add a fork where the main character reaches two doors. The audience calls “home” or “hide,” and the actors perform the matching ending. Both endings remain ready for the next showing.' },
        ],
        approaches: [
          { label: 'Browse yams, spices and smoked fish at Ogbeogonogo Modern Market', callback: 'You helped turn the ending choice into part of the scene.' },
          { label: 'Visit National Museum Asaba for the rehearsal', callback: 'You saw both endings stay available.' },
          { label: 'Leave Nnamdi a two-door cue', callback: 'You gave the audience a clear choice inside the story.' }
        ],
        dilemma: { prompt: 'How can the audience choose an ending without judging between actors?', answers: ['Let applause choose before the story begins.', 'Add a story moment where the audience picks a door.', 'Perform both endings every time.'], correct: 1, explanation: 'The in-story choice lets the audience shape the ending without ranking the performers.' },
        closing: 'Nnamdi sends the two-door cue onward so another troupe can make its own fork.',
        keepsake: { name: 'Two-door card', description: 'A card showing two stage doors with different ending symbols.' },
      },
      missions: { daily: [
        { label: 'Browse market goods before the mime clue', purpose: 'Help the mime find a clue that narrows guesses without ending the surprise.', task: 'practical', count: 1 },
        { label: 'Visit Ogbeogonogo Modern Market before rehearsal', purpose: 'Try the clue before the audience guesses.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the pun-off', purpose: 'Hear whether the clue gives different players a fair starting point.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse market goods three times before the choice', purpose: 'Prepare a second puzzle for the encore relay.', task: 'practical', count: 3 },
        { label: 'Visit three places before the final scene', purpose: 'Try the guessing act in more than one setting.', task: 'places', count: 3 },
        { label: 'Learn about the collection twice before the encore', purpose: 'Pass a playful question forward without requiring an answer.', task: 'discovery', count: 2 },
      ] },
    },
    {
      cityId: 'awka',
      city: {
        title: 'The Chicken Costume’s Squeak', desire: 'autonomy',
        chapters: [
          { title: 'The soundtrack arrives', text: 'At Burger Chicken and Co, Adaeze Chukwu meets a performer whose oversized chicken costume squeaks at every step. The performer planned a dignified entrance for the neighborhood encore, but the costume has turned each stride into a comic sound effect.' },
          { title: 'A laugh or a line', text: 'The performer worries that the audience will laugh at them instead of with them. You can browse the traditional retail markets at Eke Awka Main Market, or compare the sound at Old Timber Market Awka while Adaeze helps the actor try a slower entrance.' },
          { title: 'Let the wearer decide', text: 'They could stuff the costume with paper to silence it, lean into the squeak as a rhythm, or ask a rival to wear the costume. The performer says the squeak is funny, but wants to remain the character rather than hand it off.' },
          { title: 'A squeaky march', text: 'They choose a short march where the performer sets the tempo and the troupe answers each squeak with a soft clap. The actor starts slowly, then speeds up when comfortable. The audience laughs at the pattern, and the performer gets the final bow.' },
        ],
        approaches: [
          { label: 'Browse the main market and hear the costume story', callback: 'You let the costume wearer choose how to use the squeak.' },
          { label: 'Browse Old Timber Market and test a rhythm', callback: 'You helped the troupe answer the squeak without taking over the role.' },
          { label: 'Leave Adaeze a note for the performer', callback: 'You kept the actor in charge of the character and the tempo.' },
        ],
        dilemma: { prompt: 'The performer likes the squeak but wants to keep the role. What should the troupe do?', answers: ['Ask a rival to wear the costume instead.', 'Set a tempo the performer controls and answer each squeak together.', 'Stuff the costume until it makes no sound.'], correct: 1, explanation: 'The performer wants the role and enjoys the sound; a controlled rhythm keeps both.' },
        closing: 'Adaeze names the act “The Awka Squeak-Off.” The rival troupe asks for a turn clapping along at the next encore.',
        keepsake: { name: 'Squeak-beat button', description: 'A large costume button stamped with the rhythm the troupe made together.' },
      },
      country: {
        title: 'The Encore’s Turning Stage', desire: 'autonomy',
        chapters: [
          { title: 'Which side is front?', text: 'The Many-Stops Encore reaches Old Timber Market Awka with a small rotating stage used by the traveling troupes. Adaeze Chukwu sees one group set up its whole act facing one direction, while its rival wants to turn the platform halfway through and surprise the audience.' },
          { title: 'A stage can turn more than once', text: 'The platform is light enough to rotate, but the performers have rehearsed entrances from only one side. One actor wants a sudden spin; another worries the change will make their carefully planned positions meaningless.' },
          { title: 'Hold or turn', text: 'They can keep the stage facing one way, spin it whenever a performer feels like it, or agree on one moment when the actors move to the opposite side before the platform turns. Adaeze asks which choice lets every performer know where to stand.' },
          { title: 'A planned reveal', text: 'They choose the mid-act move: performers cross to the far side, then the platform turns once. The rival troupe becomes the audience for the first half and the cast for the second. Both groups get to see the same scene from a new angle.' },
        ],
        approaches: [
          { label: 'Browse traditional retail markets at Eke Awka Main Market', callback: 'You helped the troupe decide when the platform turns.' },
          { label: 'Browse traditional retail markets at Old Timber Market Awka', callback: 'You gave every performer a clear place to stand before the reveal.' },
          { label: 'Leave Adaeze a note for the next rehearsal', callback: 'You left the turning moment open for the performers to choose together.' },
        ],
        dilemma: { prompt: 'The performers want to use both sides of the rotating stage and know where to stand. What gives them a clear reveal?', answers: ['Agree on one cross-and-turn moment midway through the act.', 'Keep the stage facing one direction for the whole act.', 'Spin the stage whenever a performer chooses.'], correct: 0, explanation: 'One agreed transition gives the performers time to move and makes the change visible to the audience.' },
        closing: 'Adaeze calls the move “the Awka about-face.” The rival troupe asks to borrow the platform for a second reveal of its own.',
        keepsake: { name: 'Turn-stage marker', description: 'A small marker placed where the performers cross before the platform turns.' },
      },
      missions: { daily: [
        { label: 'Browse retail goods before the costume squeak', purpose: 'Give the costume wearer time to explain the unexpected squeak.', task: 'practical', count: 1 },
        { label: 'Visit two places before the squeaky entrance', purpose: 'Let the actor set a tempo before the troupe joins in.', task: 'places', count: 2 },
        { label: 'Greet 2 regulars before the costume cue', purpose: 'Hear how the performer and rival troupe read the squeak.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse retail goods three times before the stage turn', purpose: 'Let the performer try a slower and faster entrance.', task: 'discovery', count: 3 },
        { label: 'Visit Burger Chicken and Co before the next act', purpose: 'Compare how the comic cue works in different performance settings.', task: 'host-visit', count: 1 },
        { label: 'Greet 3 regulars before the stage turns', purpose: 'Give the encore troupe a playable reaction to an unexpected noise.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'bauchi',
      city: {
        title: 'The Park Bench Orchestra', desire: 'belonging',
        chapters: [
          { title: 'A tune with spare seats', text: 'At Unity Park, Rabi Yakubu hears a troupe rehearse a bench-orchestra act using harmless taps on their own props. A late-arriving performer knows the melody but not the planned rhythm. The group has saved a place, yet the newcomer fears joining will throw off the others.' },
          { title: 'Find the shared beat', text: 'You can browse groundnut, cotton, grain and livestock trade at Muda Lawal Market or spend a quiet evening at Unity Park while Rabi listens to both versions.' },
          { title: 'A place without a test', text: 'The group can ask the newcomer to learn the existing rhythm, stop and teach the whole pattern, or keep the melody and let the newcomer choose a simple beat of their own. Rabi points out that the performer already knows the tune.' },
          { title: 'A new rhythm joins', text: 'They keep the melody moving and let the newcomer tap a beat they can manage. The others gradually echo it, making the old rhythm sound new. After the song, the newcomer asks to learn the original pattern too.' },
        ],
        approaches: [
          { label: 'Browse Muda Lawal Market before rehearsal', callback: 'You made room for a newcomer to join with a beat they already knew.' },
          { label: 'Spend a quiet evening at Unity Park', callback: 'You helped the group keep the melody going while a new rhythm formed.' },
          { label: 'Leave Rabi a note about the late arrival', callback: 'You gave the newcomer a way in before asking them to learn the full pattern.' },
        ],
        dilemma: { prompt: 'The late performer knows the tune but not the troupe’s rhythm. How can they join immediately?', answers: ['Pause and teach the whole pattern before continuing.', 'Let the newcomer choose a simple beat while the melody continues.', 'Ask them to wait until they learn the original rhythm.'], correct: 1, explanation: 'The performer already knows the tune, so a chosen simple beat lets them participate while the rehearsal carries on.' },
        closing: 'Rabi calls the result a duet with extra chairs. The newcomer learns the troupe’s old rhythm after having already helped make a new one.',
        keepsake: { name: 'Park-bench beat token', description: 'A wooden token with two different rhythms carved on either side.' },
      },
      country: {
        title: 'The Encore’s Missing Final Line', desire: 'competence',
        chapters: [
          { title: 'The page ends too soon', text: 'The Many-Stops Encore reaches Tafawa Balewa Tomb Museum with a short comedy script. Rabi Yakubu notices the last page stops halfway through a sentence, just before the final joke.' },
          { title: 'A blank where the laugh goes', text: 'One performer wants to improvise the ending; another worries that a new line may not fit the earlier setup. The rival troupe suggests replacing the scene with a familiar joke.' },
          { title: 'Build from the setup', text: 'They can use the familiar joke, stop before the ending, or return to the first line and write a payoff that answers it. Rabi asks what the opening made the audience expect.' },
          { title: 'A callback lands', text: 'They write a final line that repeats the opening phrase with a changed meaning. The cast tries it aloud; the callback earns a laugh and gives the next troupe a pattern to adapt.' },
        ],
        approaches: [
          { label: 'Browse Muda Lawal Market before the script rehearsal', callback: 'You helped connect the ending to the opening line.' },
          { label: 'Visit Unity Park during the comedy practice', callback: 'You saw the callback finish the setup.' },
          { label: 'Leave Rabi a note with the opening phrase', callback: 'You gave the next troupe a starting point for its own ending.' }
        ],
        dilemma: { prompt: 'What can the troupe do when the script stops before the final joke?', answers: ['Replace the scene with a familiar joke.', 'Return to the opening and write a payoff for it.', 'Stop before the unfinished sentence.'], correct: 1, explanation: 'A callback uses material the audience already knows and completes the scene’s setup.' },
        closing: 'Rabi keeps the unfinished page as a prompt for the next city to create its own callback.',
        keepsake: { name: 'Callback strip', description: 'A paper strip joining the opening phrase to its changed final meaning.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the orchestra joins', purpose: 'Give the late performer time to explain the melody they already know.', task: 'discovery', count: 1 },
        { label: 'Visit Unity Park before the duet question', purpose: 'Help the troupe follow a rhythm the new performer can choose.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 2 regulars before the newcomer’s beat', purpose: 'Hear how the established rhythm and new variation fit together.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse trade goods twice before the borrowed rhythm', purpose: 'Let the newcomer lead one version of the rhythm.', task: 'practical', count: 2 },
        { label: 'Visit two places before the final tune', purpose: 'Try the bench-orchestra idea in a second setting.', task: 'places', count: 2 },
        { label: 'Spend three evenings before the encore', purpose: 'Turn the borrowed pause into a playful movement signal.', task: 'discovery', count: 3 },
      ] },
    },
    {
      cityId: 'benin-city',
      city: {
        title: 'The Garden’s Accidental Chorus', desire: 'recognition',
        chapters: [
          { title: 'A chorus from nowhere', text: 'At Celebrate Garden, Efosa Aghedo meets a singer preparing a solo for the neighborhood encore. During rehearsal, two rival performers hum along from behind a prop hedge. Their accidental harmony sounds wonderful, but the soloist worries their own part will disappear.' },
          { title: 'Share the sound', text: 'You can walk through Ramat Park or spend an evening in Celebrate Garden while the group tries the melody in different arrangements. The hedge is a stage prop, and the song is invented for this game.' },
          { title: 'Solo, duet, or surprise', text: 'The performers can ask the rivals to stop humming, turn the act into an unannounced trio, or give the soloist a clear first verse before inviting the others into a chorus. Efosa asks what kind of recognition the soloist wants.' },
          { title: 'A verse worth hearing', text: 'The soloist chooses the first verse alone and signals the chorus with a turn. The rivals join only when invited. Their harmony lifts the ending, and the soloist receives the opening bow while the trio shares the final one.' },
        ],
        approaches: [
          { label: 'Walk through Ramat Park and rehearse a verse', callback: 'You kept the soloist’s opening clear before the chorus joined.' },
          { label: 'Spend an evening at Celebrate Garden', callback: 'You helped the rivals wait for the soloist’s signal.' },
          { label: 'Leave Efosa a note for the singers', callback: 'You gave the performer a way to invite the harmony on their own terms.' },
        ],
        dilemma: { prompt: 'The singer likes the accidental harmony but wants the solo to remain recognizable. What arrangement helps?', answers: ['Ask the rivals to stop humming for the whole act.', 'Give the soloist a clear verse, then let them signal the chorus.', 'Make the act an unannounced trio from the start.'], correct: 1, explanation: 'A solo opening recognizes the lead, and the agreed signal lets the harmony join by invitation.' },
        closing: 'Efosa praises the soloist’s first note and the trio’s last chord. The friendly rivals request a turn at leading the next song.',
        keepsake: { name: 'Chorus cue flower', description: 'A paper flower the soloist turns to invite the harmony into the song.' },
      },
      country: {
        title: 'The Encore’s Banner Shadow', desire: 'curiosity',
        chapters: [
          { title: 'A shadow changes the picture', text: 'The Many-Stops Encore reaches Celebrate Garden with a tall paper banner for the visiting troupe. Efosa Aghedo notices that the banner casts a long shadow across a painted moon in the backdrop. The performers like the accidental shape but cannot agree whether it belongs in the scene.' },
          { title: 'A picture within a picture', text: 'The lead wants the moon visible, while the prop holder enjoys the shadow’s odd outline. The banner can be raised, lowered, or turned, but each movement changes the silhouette.' },
          { title: 'Keep one image or discover another', text: 'They can move the banner out of view, hold it still so the shadow never changes, or let the prop holder slowly turn it while the lead responds to the changing outline. Efosa asks whether the shadow could become a second character.' },
          { title: 'The shadow gets a part', text: 'They choose the slow turn. The lead treats the shadow as a curious visitor who keeps changing shape. The banner remains visible, the moon still appears between turns, and the troupe finds a scene hidden in the backdrop.' },
        ],
        approaches: [
          { label: 'Walk through Ramat Park and consider the banner', callback: 'You helped the troupe keep both the moon and its changing shadow.' },
          { label: 'Spend an evening at Celebrate Garden', callback: 'You gave the banner holder a slow turn that made the silhouette part of the act.' },
          { label: 'Leave Efosa a shadow-character idea', callback: 'You left the performers a new shape to discover in the scene.' },
        ],
        dilemma: { prompt: 'The troupe likes the banner’s shadow but wants the moon in the scene too. How can both appear?', answers: ['Move the banner out of view.', 'Turn the banner slowly so the lead can respond to the changing shadow.', 'Hold the banner still for the whole scene.'], correct: 1, explanation: 'A slow turn lets the moon reappear between changing silhouettes and gives both elements a role.' },
        closing: 'Efosa sends the banner onward with a new character made of shadow. The next troupe can decide what the shape means.',
        keepsake: { name: 'Banner-shadow cutout', description: 'A paper silhouette of the curious shape made by the turning banner.' },
      },
      missions: { daily: [
        { label: 'Walk the park before the accidental chorus', purpose: 'Give the soloist time to choose how the chorus joins.', task: 'practical', count: 1 },
        { label: 'Visit Ramat Park before the solo', purpose: 'Practice waiting for the lead singer’s cue.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the chorus begins', purpose: 'Hear what each performer wants the audience to remember.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Spend two evenings before the garden finale', purpose: 'Let the soloist lead the opening and invite the harmony.', task: 'discovery', count: 2 },
        { label: 'Visit three places before the shared song', purpose: 'Try the group arrangement in another place.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the next verse', purpose: 'Connect a visiting tune to the next troupe’s new song.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'birnin-kebbi',
      city: {
        title: 'The Supper Menu Switcheroo', desire: 'care',
        chapters: [
          { title: 'Two menus, one joke', text: 'At Daula Restaurant, Aliyu Yakubu watches a comedy duo prepare a pretend supper menu for their act. One performer reads the other’s menu upside down and announces “rice with a side of moonlight.” The audience loves the line, but the second performer worries the joke makes their careful menu sound foolish.' },
          { title: 'Keep the laugh kind', text: 'You can browse rice, grain, fish and livestock trade at Yaryara mini market, or compare the scene at zaget mini market.' },
          { title: 'A joke about the mix-up', text: 'The duo can drop the menu gag, make the careful performer the butt of the joke, or let both characters misunderstand the menu and help one another recover. Aliyu asks which option makes both performers willing to repeat the scene.' },
          { title: 'A shared mistake', text: 'They decide each character misreads one line, then work together to invent an even stranger combination. The careful performer gets to explain the real menu while the other adds “moonlight” as dessert. Their rivals laugh with both of them.' },
        ],
        approaches: [
          { label: 'Browse Yaryara mini market and hear the scene', callback: 'You helped the duo share the mix-up instead of blaming one performer.' },
          { label: 'Browse zaget mini market and test the punchline', callback: 'You kept the careful character in on the joke.' },
          { label: 'Leave Aliyu a kind menu gag', callback: 'You offered a punchline both performers could enjoy repeating.' },
        ],
        dilemma: { prompt: 'How can the duo keep the upside-down-menu joke funny for both performers?', answers: ['Make the careful performer the only one who misreads the menu.', 'Let each character misread a line and help invent the recovery.', 'Drop the menu gag and cancel the scene.'], correct: 1, explanation: 'Both performers want to stay in the act; sharing the mistake lets them build the joke together.' },
        closing: 'Aliyu writes “moonlight dessert” on the imaginary menu. The performers agree to serve it only to the rival troupe, who ask for seconds.',
        keepsake: { name: 'Upside-down menu card', description: 'A reversible stage menu with a moonlight dessert on the back.' },
      },
      country: {
        title: 'The Encore’s Repeated Rehearsal', desire: 'competence',
        chapters: [
          { title: 'The same mistake returns', text: 'The Many-Stops Encore reaches Daula Restaurant as a troupe rehearses a three-part silent scene. Aliyu Yakubu notices the same performer keeps entering before the previous part has finished.' },
          { title: 'A cue is unclear', text: 'The early entrant thinks the movement is correct; the others say they cannot tell when the next part begins. A rival troupe offers to count aloud, but the scene has no spoken words.' },
          { title: 'Give the scene a visible handoff', text: 'They can ask the entrant to wait longer, add a spoken count, or give the finishing performer a clear gesture that signals the next entrance. Musa asks which cue fits a silent act.' },
          { title: 'The scene flows', text: 'The finishing performer raises one hand, and the next actor enters on the signal. The repeated early entrance becomes a playful anticipation, now timed on purpose. The rival troupe adopts a gesture of its own.' },
        ],
        approaches: [
          { label: 'Visit Birnin Kebbi Riverside Park during rehearsal', callback: 'You helped make the silent handoff clear.' },
          { label: 'Browse Birnin Kebbi Central Market before the next run', callback: 'You turned the repeated early entrance into a timed gag.' },
          { label: 'Leave Musa a handoff gesture', callback: 'You gave the next troupe a cue it can see.' }
        ],
        dilemma: { prompt: 'What helps the next actor know when to enter in a silent scene?', answers: ['Ask them to wait longer without a cue.', 'Add a spoken count.', 'Use a visible gesture to signal the handoff.'], correct: 2, explanation: 'A visible cue communicates the handoff without adding dialogue.' },
        closing: 'Musa adds the handoff gesture to the travelling challenge card.',
        keepsake: { name: 'Handoff gesture card', description: 'A card showing one raised hand as the signal for the next entrance.' },
      },
      missions: { daily: [
        { label: 'Browse rice before the menu switch', purpose: 'Give the performers time to make the upside-down menu funny to both.', task: 'practical', count: 1 },
        { label: 'Visit two places before the supper scene', purpose: 'Practice a recovery where both characters contribute.', task: 'places', count: 2 },
        { label: 'Greet 2 regulars before the silent handoff', purpose: 'Hear which version each character enjoys repeating.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse rice three times before the relay', purpose: 'Let each performer cause and recover from a comic mix-up.', task: 'practical', count: 3 },
        { label: 'Visit zaget mini market before the next scene', purpose: 'Try the scene’s shared punchline in another place.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 3 regulars before the entrance cue', purpose: 'Give either performer a chance to deliver the final word.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'calabar',
      city: {
        title: 'The Garden’s Invisible Tightrope', desire: 'autonomy',
        chapters: [
          { title: 'A very low wire', text: 'At Calabar Municipal Gardens, Ete Udoh watches a clown prepare an invisible-tightrope routine. The performer tiptoes across an imaginary line but keeps glancing down to see whether the audience understands the game. Their rival says the routine needs a bigger wobble.' },
          { title: 'The audience joins in', text: 'You can walk through Millennium Park or spend an evening in Calabar Municipal Gardens while Ete asks what the performer wants.' },
          { title: 'Trust the mime', text: 'The troupe could add a real prop, ask the rival to narrate every step, or give the clown one visible landmark to look toward and let the audience imagine the rest. The performer says they want the audience to lean in, not to be told what to see.' },
          { title: 'A wobble with purpose', text: 'They choose a distant imaginary flag as the landmark. The clown looks up, takes two careful steps, then invents an enormous wobble just before the finish. The audience gasps and laughs; the rival troupe mimes a safety net made of applause.' },
        ],
        approaches: [
          { label: 'Walk through Millennium Park and test the mime', callback: 'You helped the clown look toward a goal instead of checking for approval.' },
          { label: 'Spend an evening in the garden', callback: 'You let the audience imagine the line rather than explaining every step.' },
          { label: 'Leave Ete a landmark for the performance', callback: 'You gave the clown a point to trust through the wobble.' },
        ],
        dilemma: { prompt: 'The clown wants the audience to imagine the tightrope without constant narration. What helps?', answers: ['Add a real rope prop across the stage.', 'Choose one distant imaginary landmark and let the mime carry the rest.', 'Have the rival describe every careful step.'], correct: 1, explanation: 'A landmark gives the clown focus while leaving the audience free to imagine the line.' },
        closing: 'Ete calls the invisible rope the most crowded bridge in the garden: everyone crossed it in their imagination.',
        keepsake: { name: 'Imaginary flag marker', description: 'A cloth marker that reminds the clown where the invisible tightrope is headed.' },
      },
      country: {
        title: 'The Encore’s Applause Net', desire: 'belonging',
        chapters: [
          { title: 'A nervous act', text: 'The Many-Stops Encore challenge reaches Calabar Municipal Gardens. Ete Udoh finds a performer waiting in the wings, afraid that the audience will not understand a silent comedy. The previous troupe has left behind only a card reading “trust the pause.”' },
          { title: 'A borrowed instruction', text: 'The performer wants to know how long to pause and what face to make. The rival troupe says the pause should feel spontaneous. Neither can guarantee what every audience will do.' },
          { title: 'Agree on a signal', text: 'They can script every expression, erase the silent act, or decide on one signal that tells the troupe when the pause ends while letting the performer choose its length. Ete asks the performer what would help them feel supported.' },
          { title: 'The pause becomes a choice', text: 'The performer chooses to raise one eyebrow when ready. The troupe holds still until then, and the audience begins to laugh before the gesture is complete. The performer discovers that silence can be a part of the act they control.' },
        ],
        approaches: [
          { label: 'Walk through Millennium Park and practice the pause', callback: 'You helped the performer choose a signal instead of a scripted expression.' },
          { label: 'Visit the gardens before the encore', callback: 'You gave the audience room to react before the act moved on.' },
          { label: 'Leave Ete an eyebrow cue', callback: 'You offered a small signal the performer could use when ready.' },
        ],
        dilemma: { prompt: 'How can the troupe support the silent act without dictating every expression?', answers: ['Script each look and pause exactly.', 'Use one performer-chosen signal to end the pause.', 'Remove the silent act from the encore.'], correct: 1, explanation: 'The performer wants support but also control; a chosen signal offers both.' },
        closing: 'Ete writes “trust the eyebrow” on the card for the next stop. The performer takes the long pause again, just because it is fun.',
        keepsake: { name: 'Eyebrow cue pin', description: 'A small pin shaped like a raised eyebrow, the performer’s own signal.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the tightrope rehearsal', purpose: 'Give the clown time to focus on the imaginary landmark.', task: 'discovery', count: 1 },
        { label: 'Visit Calabar Municipal Gardens before the act', purpose: 'Practice a mime that lets the audience imagine the line.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the balancing scene', purpose: 'Hear how the audience reads a silent moment.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Walk the park twice before the encore', purpose: 'Let the performer try both a careful step and a comic wobble.', task: 'practical', count: 2 },
        { label: 'Visit two places before the silent finish', purpose: 'Imagine the act in another green setting.', task: 'places', count: 2 },
        { label: 'Spend three evenings before the next act', purpose: 'Give the performer a signal they control.', task: 'discovery', count: 3 },
      ] },
    },
    {
      cityId: 'damaturu',
      city: {
        title: 'The Market’s Missing Drumstick', desire: 'competence',
        chapters: [
          { title: 'The comic solo', text: 'At DAMATURU MODERN MARKET, Hauwa Bulama meets a one-person band rehearsing a song for the neighborhood encore. The performer has a drum, a shaker and only one drumstick. They keep trying to play all three parts and end up with a lopsided beat.' },
          { title: 'A problem with one hand', text: 'You can browse Yobe farm produce at the modern market or visit Bayan Tasha market while Hauwa hears the band’s plan.' },
          { title: 'Turn the gap into music', text: 'The performer could stop until a second stick appears, ask the audience to supply the missing beat, or use the shaker as a foot-tapped rhythm while one hand plays the drum. Hauwa asks whether the performer wants help or a solo solution.' },
          { title: 'The one-person band', text: 'The performer chooses the foot-tapped shaker rhythm. It takes two tries, then the uneven pattern becomes a comic musical signature. The audience claps the missing beat, but the soloist keeps control of the song.' },
        ],
        approaches: [
          { label: 'Browse Yobe farm produce and hear the solo', callback: 'You helped the musician decide whether to borrow a beat or keep the act solo.' },
          { label: 'Visit Bayan Tasha market before the encore', callback: 'You turned the missing drumstick into a rhythm the performer could make alone.' },
          { label: 'Leave Hauwa a foot-tap pattern', callback: 'You gave the one-person band an idea without taking over the song.' },
        ],
        dilemma: { prompt: 'The soloist wants to keep the act alone with only one drumstick. What fills the missing beat?', answers: ['Wait until a second drumstick is found.', 'Use a foot-tapped shaker rhythm under the drum.', 'Ask the audience to play the other instruments.'], correct: 1, explanation: 'The performer wants a solo solution and can tap a rhythm while one hand plays.' },
        closing: 'Hauwa gives the lopsided beat a proud introduction. The soloist ends with a flourish and one foot still tapping.',
        keepsake: { name: 'Footbeat anklet', description: 'A soft stage anklet marked with the rhythm that filled the empty beat.' },
      },
      country: {
        title: 'The Encore’s Lost Stage Plan', desire: 'competence',
        chapters: [
          { title: 'A route is missing', text: 'The Many-Stops Encore reaches Bayan Tasha market with a floor plan for a short procession. Hauwa Bulama sees that the marks showing where each performer should turn have rubbed away.' },
          { title: 'No one knows the route', text: 'The troupe can guess the turns, cancel the procession, or walk the route slowly and agree on a new mark at each corner. A rival asks whether the path needs to be exact or simply clear to everyone.' },
          { title: 'Make a route together', text: 'They walk it once, placing a paper marker at each turn. The route changes slightly to avoid a crowded prop table, and every performer agrees on the new path before the music begins.' },
          { title: 'A clear procession', text: 'The troupe completes the scene without colliding, and the next group can move the markers to fit its own stage. Fatima keeps the plan simple enough to redraw.' },
        ],
        approaches: [
          { label: 'Visit Borno Museum during the route rehearsal', callback: 'You helped the troupe agree on clear turning points.' },
          { label: 'Browse Monday Market before the procession', callback: 'You gave the cast a chance to test the route together.' },
          { label: 'Leave Fatima a marked stage plan', callback: 'You made a route the next group can adapt.' }
        ],
        dilemma: { prompt: 'What can the troupe do when its turning marks have disappeared?', answers: ['Guess where each turn was meant to be.', 'Walk the route and agree on new markers.', 'Cancel the procession.'], correct: 1, explanation: 'Walking together reveals a clear route that all performers can follow.' },
        closing: 'Fatima sends the marked route onward with the encore kit.',
        keepsake: { name: 'Marked route card', description: 'A simple stage plan with paper dots at each turning point.' },
      },
      missions: { daily: [
        { label: 'Browse farm produce before the drum solo', purpose: 'Give the soloist time to choose a one-person rhythm.', task: 'practical', count: 1 },
        { label: 'Visit Bayan Tasha market before rehearsal', purpose: 'Try a foot rhythm that works with the single drumstick.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 2 regulars before the procession', purpose: 'Hear which beat makes the lopsided song feel intentional.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse farm produce three times before the route test', purpose: 'Let the soloist practice the foot-tapped shaker rhythm.', task: 'practical', count: 3 },
        { label: 'Visit two places before the final turn', purpose: 'Try the stage rhythm in a second mapped venue.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the next procession', purpose: 'Help two performers trade one prop without losing the beat.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'dutse',
      city: {
        title: 'The Museum’s Backwards Bow', desire: 'recognition',
        chapters: [
          { title: 'A finale facing the wrong way', text: 'At Dutse Emirate Museum, Binta Suleiman watches a troupe rehearse a grand finale. The lead performer has practiced a sweeping bow so often that they now bow toward the curtain, leaving the audience staring at their back. The rival troupe tries not to laugh.' },
          { title: 'Practice makes a pattern', text: 'You can browse farming, livestock and trade at Dutse Ultra Modern Market, or spend a quiet evening at the museum while Binta helps the lead find a better ending.' },
          { title: 'A correction or a joke', text: 'The lead could rehearse the bow again, turn the mistake into a deliberate backwards salute, or let a rival give a quiet cue before the final turn. The lead admits they are tired of correcting the same habit in front of everyone.' },
          { title: 'A cue from a friend', text: 'They choose a quiet cue: the rival taps a foot when the lead reaches the curtain. The performer turns, sees the audience, and bows properly. On the second run they add one backward salute for comic effect, now chosen rather than accidental.' },
        ],
        approaches: [
          { label: 'Browse the modern market before the finale', callback: 'You helped the lead get a cue without turning the mistake into ridicule.' },
          { label: 'Spend a quiet evening at the museum', callback: 'You gave the performer a private signal before the final turn.' },
          { label: 'Leave Binta a cue for the lead', callback: 'You let the performer choose when to use the backwards salute as a joke.' },
        ],
        dilemma: { prompt: 'The lead is tired of making the same mistake in front of the group. What helps without making them the joke?', answers: ['Give a quiet cue before the final turn, then let the lead decide about the comic salute.', 'Make the entire finale a backwards bow.', 'Ask the rival troupe to correct the performer loudly.'], correct: 0, explanation: 'The performer wants help and is tired of public correction; a quiet cue supports them while leaving the joke optional.' },
        closing: 'Binta watches the lead choose the backward salute on the final run. The rival troupe applauds the intentional version most of all.',
        keepsake: { name: 'Turn-around cuff', description: 'A costume cuff marked with the discreet cue to face the audience.' },
      },
      country: {
        title: 'The Encore’s Delayed Reveal', desire: 'curiosity',
        chapters: [
          { title: 'A box opens too soon', text: 'The Many-Stops Encore reaches Dutse Emirate Museum with a covered prop box for a surprise scene. Binta Suleiman notices the lid springs open before the audience is ready.' },
          { title: 'The surprise is gone', text: 'The box owner wants to preserve the reveal; the actor holding it wants to keep the springy lid because it makes them laugh. A rival suggests replacing the box.' },
          { title: 'Choose the reveal moment', text: 'They can tape the lid shut, remove the prop, or let the actor hold the lid and open it only after a chosen signal. Zainab asks how they can keep the spring and still control the surprise.' },
          { title: 'A reveal on cue', text: 'The actor presses the lid gently, waits for the signal, then lets it pop. The audience sees the reveal at the right moment and laughs at the actor’s triumphant look. The rival troupe borrows the delayed cue.' },
        ],
        approaches: [
          { label: 'Visit Emir’s Palace Museum during the prop rehearsal', callback: 'You helped the actor keep the spring and choose when it opens.' },
          { label: 'Browse Dutse Central Market before the surprise scene', callback: 'You gave the audience time to anticipate the reveal.' },
          { label: 'Leave Zainab a reveal signal', callback: 'You made the prop’s timing repeatable.' }
        ],
        dilemma: { prompt: 'How can the actor keep the springy lid without losing control of the surprise?', answers: ['Tape the lid shut.', 'Remove the box from the scene.', 'Hold the lid and release it on a chosen signal.'], correct: 2, explanation: 'The actor keeps the playful spring while controlling the moment of release.' },
        closing: 'Zainab adds a small signal mark to the traveling prop box.',
        keepsake: { name: 'Reveal signal tag', description: 'A tag marking the cue to release the springy lid.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the backwards bow', purpose: 'Give the lead performer time to choose a discreet correction cue.', task: 'discovery', count: 1 },
        { label: 'Visit two places before the reveal', purpose: 'Try the quiet cue before the performer reaches the curtain.', task: 'places', count: 2 },
        { label: 'Greet 2 regulars before the surprise scene', purpose: 'Hear how the lead and rival experience the recurring mistake.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse trade goods twice before the prop opens', purpose: 'Let the performer choose when the backwards salute becomes a joke.', task: 'practical', count: 2 },
        { label: 'Visit Dutse Emirate Museum before rehearsal', purpose: 'Try the finale in another mapped setting.', task: 'host-visit', count: 1 },
        { label: 'Spend three evenings before the next reveal', purpose: 'Give the troupe a dependable way to finish its encore.', task: 'discovery', count: 3 },
      ] },
    },
    {
      cityId: 'enugu',
      city: {
        title: 'The Tap-Dancing Shoe Escape', desire: 'competence',
        chapters: [
          { title: 'A runaway shoe', text: 'At Agofure park, Uzoamaka Eze watches a tap dancer begin the encore with one shoe that keeps sliding loose. The dancer pauses, tightens it, then loses it again on the same turn. Their rival says the repeated pause is becoming funnier than the planned routine.' },
          { title: 'Two audiences', text: 'You can spend an evening in Ekulu garden or walk through the park while Uzoamaka asks the dancer what they want. The dancer wants to finish the routine but does not want the audience laughing at a mishap they cannot control.' },
          { title: 'Make the slip part of the act', text: 'They could stop after every turn, tie the shoe so tightly it cannot move, or change the routine so the loose shoe gets its own comic solo before the dancer retrieves it. Uzoamaka reminds them that the shoe should not be thrown or kicked into the crowd.' },
          { title: 'The shoe dances alone', text: 'They choose a safe solo: the dancer freezes while the shoe wiggles in place, then picks it up between steps. The rival troupe adds a silent drumroll. The dancer finishes the routine and takes a bow with both shoes still on.' },
        ],
        approaches: [
          { label: 'Spend an evening in the garden at Ekulu garden', callback: 'You helped the dancer keep control while making the loose shoe a planned gag.' },
          { label: 'Walk through the park at Agofure park', callback: 'You found a safe pause where the dancer could reset without losing the act.' },
          { label: 'Leave Uzoamaka a shoe-solo idea', callback: 'You gave the dancer a way to continue after the slip.' },
        ],
        dilemma: { prompt: 'The dancer wants to finish without throwing or kicking the loose shoe. How can the mishap become playable?', answers: ['Stop after every turn to tighten the shoe.', 'Freeze while the shoe has a small solo, then retrieve it between steps.', 'Tie the shoe as tightly as possible and hope it stays put.'], correct: 1, explanation: 'The solo makes the slip deliberate, keeps the shoe close, and lets the dancer continue.' },
        closing: 'Uzoamaka names the move “the shoe’s big break.” The dancer tries it once more, this time with the rival troupe’s drumroll timed perfectly.',
        keepsake: { name: 'Tap-shoe ticket', description: 'A tiny paper ticket for the shoe’s one-step solo.' },
      },
      country: {
        title: 'The Encore’s Split Script', desire: 'autonomy',
        chapters: [
          { title: 'Two actors share a page', text: 'The Many-Stops Encore reaches Agofure park with a short comic scene. Uzoamaka Eze sees two performers holding the same script page, each certain the other has the next line.' },
          { title: 'A pause grows', text: 'One wants to keep the scene moving; the other wants a clear turn to speak. The rival troupe suggests one actor read both parts, but neither performer wants to give up a role.' },
          { title: 'Mark the handoff', text: 'They can assign one reader to both parts, stop to rehearse every line, or add a visible mark where the speaking turn changes. Chika asks which option helps them continue without changing the cast.' },
          { title: 'The line passes cleanly', text: 'They add a small star beside each handoff. The actors follow the marks and finish the scene together. Their rivals borrow the symbol for a script with even more parts.' },
        ],
        approaches: [
          { label: 'Spend an evening in the garden at Ekulu garden', callback: 'You helped the actors mark where each line changes hands.' },
          { label: 'Browse Ogbete Market before the next scene', callback: 'You gave both performers a way to keep their roles.' },
          { label: 'Leave Chika a handoff mark for the next script', callback: 'You made a cue the next cast can reuse.' }
        ],
        dilemma: { prompt: 'How can both actors keep their roles and know when to speak?', answers: ['Have one performer read both parts.', 'Add a clear mark at each speaking handoff.', 'Stop and rehearse every line before continuing.'], correct: 1, explanation: 'A visible handoff mark clarifies the turn while preserving both parts.' },
        closing: 'Uzoamaka draws the star on the travelling script as a cue for shared scenes.',
        keepsake: { name: 'Handoff star', description: 'A paper star marking where one actor passes the line to another.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the runaway shoe scene', purpose: 'Help the dancer test how the shoe slips during the repeated move.', task: 'practical', count: 1 },
        { label: 'Visit Agofure park before rehearsal', purpose: 'Turn the loose shoe into a brief, controlled comic moment.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the script handoff', purpose: 'Hear whether the shoe solo feels funny to its performer and rival.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Walk through the park three times before the curtain flips', purpose: 'Let the dancer finish the routine after the planned pause.', task: 'discovery', count: 3 },
        { label: 'Visit two places before the shoe returns', purpose: 'Try the finale and recovery in another mapped place.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the shoe scene', purpose: 'Prepare a clear gesture for the missing glove in the touring act.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'gombe',
      city: {
        title: 'The Market Echo Choir', desire: 'belonging',
        chapters: [
          { title: 'A word comes back', text: 'At KASUWAR MATA, Zulai Gambo meets a chorus rehearsing a call-and-response joke. Every time the lead calls “Who packed the echo?”, the group shouts “you did!” But one shy singer repeats the lead’s line instead, and everyone turns to look.' },
          { title: 'An unexpected solo', text: 'You can browse farming and grain trade at the market or spend an evening in Botanical Garden while Zulai asks the singer whether they want to continue.' },
          { title: 'Give the echo a part', text: 'They could ask the singer to memorize the group’s answer, have everyone repeat the lead’s line, or let the singer’s echo become the cue for the rest of the chorus. Zulai says the singer likes repeating the line but is nervous about being singled out.' },
          { title: 'A chorus answers together', text: 'They choose the echo as a cue: when the singer repeats the call, everyone joins on the second repetition. Soon the whole chorus is deliberately echoing itself, and the shy singer leads the biggest laugh without having to stand alone.' },
        ],
        approaches: [
          { label: 'Browse the grain market and hear the chorus', callback: 'You let the singer’s repeated line become a cue for everyone.' },
          { label: 'Spend an evening in Botanical Garden', callback: 'You helped the group turn a solo mistake into a chorus entrance.' },
          { label: 'Leave Zulai an echo cue for later', callback: 'You gave the singer time to choose how the repeated line would work.' },
        ],
        dilemma: { prompt: 'The singer enjoys repeating the call but feels nervous being singled out. What shares the spotlight?', answers: ['Ask the singer to memorize the chorus answer.', 'Let the repeated call cue everyone to join together.', 'Have the entire group repeat the lead’s line every time.'], correct: 1, explanation: 'The singer keeps the part they enjoy and the group joins on the second repetition.' },
        closing: 'Zulai counts three echoes before the chorus joins. By the fourth, the rival troupe is echoing from the back row too.',
        keepsake: { name: 'Echo-count clapper', description: 'A small clapper with three marks before the group joins.' },
      },
      country: {
        title: 'The Encore’s Crooked Crown', desire: 'recognition',
        chapters: [
          { title: 'A crown leans sideways', text: 'The Many-Stops Encore reaches Botanical Garden with a paper crown for the troupe’s grand finale. Zulai Gambo sees that it keeps sliding over the lead performer’s eyes. The understudy suggests wearing it crooked, while the lead wants the audience to see the final expression.' },
          { title: 'The crown has a job', text: 'The crown is meant to mark the moment the lead becomes ruler of a tiny imaginary kingdom. Changing the prop could make it stay in place, but the troupe has already built a joke around its oversized shape.' },
          { title: 'Wear or carry', text: 'They can tape the crown tightly, have a friend hold it above the performer, or let the lead carry it in both hands until the finale and place it on their head for one clear moment. Zulai asks which part matters most: wearing the crown or receiving it.' },
          { title: 'A coronation on cue', text: 'The lead says the moment of receiving it matters. They carry the crown through the act, then let the understudy present it at the final beat. The audience sees the lead’s face and the crown’s huge shape at once.' },
        ],
        approaches: [
          { label: 'Browse farming and grain trade at KASUWAR MATA', callback: 'You helped the lead keep their face visible until the coronation.' },
          { label: 'Spend an evening at Botanical Garden', callback: 'You moved the crown from a slipping prop to a clear final moment.' },
          { label: 'Leave Zulai a coronation cue', callback: 'You gave the understudy a moment to present the crown.' },
        ],
        dilemma: { prompt: 'The crown slides over the lead’s eyes, but the coronation is the finale’s key moment. What preserves both?', answers: ['Tape it tightly onto the performer’s head.', 'Have a friend hold it above them throughout the act.', 'Carry it through the scene and place it on the lead at the final beat.'], correct: 2, explanation: 'The lead stays visible during the act and receives the crown at the moment it matters.' },
        closing: 'Zulai sends the crown onward with its coronation intact. The next troupe can invent a new kingdom for it.',
        keepsake: { name: 'Coronation paper seal', description: 'A seal used when the paper crown is presented at the finale.' },
      },
      missions: { daily: [
        { label: 'Browse grain before the echo choir', purpose: 'Give the chorus time to decide how the repeated line can work.', task: 'practical', count: 1 },
        { label: 'Visit KASUWAR MATA before rehearsal', purpose: 'Let the group join after the singer repeats the call.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the echo challenge', purpose: 'Hear how the singer and group want to share the response.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Spend two evenings before the refrain', purpose: 'Practice bringing everyone in after the repeated line.', task: 'discovery', count: 2 },
        { label: 'Visit two places before the next chorus', purpose: 'Try the call-and-response in two mapped settings.', task: 'places', count: 2 },
        { label: 'Greet 4 regulars before the choir returns', purpose: 'Prepare a fresh delivery for the traveling encore phrase.', task: 'people', count: 4 },
      ] },
    },
    {
      cityId: 'gusau',
      city: {
        title: 'The Magician’s Sleeve Parade', desire: 'fairness',
        chapters: [
          { title: 'A sleeve too full', text: 'At Gusau Amusement Park, Maryam Abubakar watches a stage magician prepare a trick with oversized sleeves. A cascade of colorful scarves spills out before the act begins. The magician planned to reveal one scarf at a time and worries that the audience will think the whole trick has already happened.' },
          { title: 'A rival spots the trick', text: 'You can browse farming and commerce at Gusau central market or spend a quiet evening at the amusement park while Maryam helps the magician decide what to do.' },
          { title: 'Reveal or recover', text: 'The magician could hide the scarves and restart, pretend the spill was the trick, or admit the spill and invent a parade where each scarf gets a different entrance. The magician says they want the audience to be surprised, but not fooled about what just happened.' },
          { title: 'A parade of surprises', text: 'They choose to laugh at the spill and then make each scarf reappear from a different oversized sleeve. The audience knows the first reveal was accidental, but the later ones are genuinely surprising. Maryam’s rival volunteers to carry the final scarf like a royal banner.' },
        ],
        approaches: [
          { label: 'Browse the central market and hear the trick plan', callback: 'You helped the magician admit the spill before inventing a new reveal.' },
          { label: 'Spend a quiet evening at Gusau Amusement Park', callback: 'You turned the accidental spill into a parade the magician chose.' },
          { label: 'Leave Maryam a scarf entrance idea', callback: 'You gave the magician a new reveal without pretending the spill was planned.' },
        ],
        dilemma: { prompt: 'The magician wants to surprise the crowd without pretending the accidental spill was part of the trick. What should happen?', answers: ['Hide the scarves and restart the whole act.', 'Admit the spill, then give each scarf a different planned entrance.', 'Claim the spill was the complete trick.'], correct: 1, explanation: 'The magician can be honest about the accident and still create later surprises.' },
        closing: 'Maryam applauds the final scarf’s banner march. The magician promises never to underestimate an oversized sleeve again.',
        keepsake: { name: 'Sleeve-parade tassel', description: 'A bright tassel from the final scarf’s entrance.' },
      },
      country: {
        title: 'The Encore’s Mixed-Up Invitation', desire: 'belonging',
        chapters: [
          { title: 'A guest is left out', text: 'The Many-Stops Encore reaches Gusau Amusement Park for a short partner scene. Maryam Abubakar notices a newcomer has arrived, but the actors have already paired off and started rehearsing.' },
          { title: 'A place in the scene', text: 'One actor wants to stop and restart; another thinks the newcomer may prefer to watch. The newcomer has not yet said what they want.' },
          { title: 'Offer a gentle choice', text: 'They can pull the newcomer into the scene, continue without acknowledging them, or pause and offer a choice to watch, join a small role, or take a later turn. Safiya says the choice should remain open.' },
          { title: 'A later turn is ready', text: 'The newcomer chooses to watch the first run and join the next. The troupe keeps a small role available, and the scene continues without making the arrival a test. The rival group asks to copy the welcome.' },
        ],
        approaches: [
          { label: 'Visit Gusau City Park during the rehearsal', callback: 'You helped the newcomer choose how to take part.' },
          { label: 'Spend a quiet evening here at Gusau Amusement Park', callback: 'You left an open role for someone who arrives later.' },
          { label: 'Leave Safiya a welcome cue', callback: 'You kept watching and joining as equal options.' }
        ],
        dilemma: { prompt: 'How should the troupe respond when a newcomer has not said whether they want to perform?', answers: ['Bring them into the scene immediately.', 'Continue without acknowledging them.', 'Offer watching, a small role, or a later turn.'], correct: 2, explanation: 'The newcomer can choose how to participate without pressure.' },
        closing: 'Safiya places a spare role card beside the stage for whoever arrives next.',
        keepsake: { name: 'Open-role card', description: 'A card with three choices: watch, join, or return later.' },
      },
      missions: { daily: [
        { label: 'Browse farming goods before the sleeve parade', purpose: 'Hear the magician explain why the scarf spill should not be called a planned trick.', task: 'practical', count: 1 },
        { label: 'Visit Gusau Amusement Park before the welcome scene', purpose: 'Turn one colorful prop into a deliberate surprise after the mishap.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the newcomer joins', purpose: 'Find a helpful way to continue after a forgotten cue.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse commerce goods three times before the open role', purpose: 'Give each prop a different planned entrance.', task: 'practical', count: 3 },
        { label: 'Visit three places before the next scene', purpose: 'Try the magic act in another mapped location.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the invitation', purpose: 'Give a rival a way to help when a performer loses the next cue.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'ibadan',
      city: {
        title: 'The Ayo Board’s Comic Count', desire: 'fairness',
        chapters: [
          { title: 'A score that will not settle', text: 'At Agodi Gardens, Yetunde Akinola hosts a comic ayo match between two friendly rivals. After a playful round, each player counts the stage tokens and arrives at a different score. The tokens are props for this story; the scene does not claim to teach official rules.' },
          { title: 'The audience takes sides', text: 'You can price the market at Bodija Market or play a round of ayo at Agodi Gardens while Yetunde asks what the rivals want from the match. The crowd has begun cheering for whichever count sounds more dramatic.' },
          { title: 'A rematch or a recount', text: 'They could accept the louder count, restart the whole match, or pause to agree which tokens belong in the playful tally and count them together. Both rivals say the joke is fun, but neither wants the other to be declared the winner by volume.' },
          { title: 'A score with two names', text: 'They count the agreed tokens together and discover the totals match. The rivals announce a tie, then challenge the audience to invent a celebration that does not require a winner. The crowd performs a synchronized gasp followed by applause.' },
        ],
        approaches: [
          { label: 'Price the market before the match', callback: 'You let both players agree on the playful tally before announcing a score.' },
          { label: 'Play a round of ayo at Agodi Gardens', callback: 'You helped the rivals recount together instead of following the louder guess.' },
          { label: 'Leave Yetunde a tie-celebration idea', callback: 'You gave the audience a way to celebrate without choosing a winner.' },
        ],
        dilemma: { prompt: 'The friendly rivals want a fair comic score, and their counts disagree. What resolves it?', answers: ['Accept whichever count gets the louder cheer.', 'Agree which stage tokens count and recount them together.', 'Restart the entire match from the beginning.'], correct: 1, explanation: 'The players can define the playful tally and check it together without letting the audience decide by volume.' },
        closing: 'Yetunde declares the match a double victory for arithmetic and dramatic gasping. The rival players request an encore with an even sillier score announcement.',
        keepsake: { name: 'Tie-score pebble', description: 'A smooth stage token stamped with two equal score marks.' },
      },
      country: {
        title: 'The Encore’s Uneven Echo', desire: 'fairness',
        chapters: [
          { title: 'A compliment lands unevenly', text: 'The Many-Stops Encore reaches Agodi Gardens after a rehearsal. Bisi Akinwale hears the audience praise one performer’s line while the other actor’s careful setup goes unmentioned.' },
          { title: 'Both shaped the laugh', text: 'The praised performer wants to share credit; the other says the setup mattered just as much. Their rival offers to repeat the joke so both can bow, but the actors want to keep the scene moving.' },
          { title: 'Acknowledge the setup', text: 'They can stop for a second bow, ignore the concern, or add a short callback that names the setup before the punchline. Bisi asks how the audience can notice both contributions within the act.' },
          { title: 'A shared laugh', text: 'They add the callback and replay the scene. The audience recognizes the setup as part of the joke, and both actors bow together without interrupting the performance.' },
        ],
        approaches: [
          { label: 'Price the market at Bodija Market', callback: 'You helped the audience notice both parts of the joke.' },
          { label: 'Play a round of ayo at Agodi Gardens', callback: 'You gave the setup performer a clear place in the laugh.' },
          { label: 'Leave Bisi a callback cue', callback: 'You helped the cast share credit inside the scene.' }
        ],
        dilemma: { prompt: 'How can the act recognize both performers without stopping for another bow?', answers: ['Repeat the joke and give both a second bow.', 'Add a callback that makes the setup visible.', 'Ignore the performer whose setup was missed.'], correct: 1, explanation: 'The callback includes the setup in the audience’s recognition while the scene continues.' },
        closing: 'Bisi adds the callback cue to the next troupe’s prompt.',
        keepsake: { name: 'Shared-laugh cue', description: 'A small prompt linking a setup line to its payoff.' },
      },
      missions: { daily: [
        { label: 'Play ayo before the comic count', purpose: 'Give the rivals time to agree what belongs in their comic tally.', task: 'discovery', count: 1 },
        { label: 'Visit Bodija Market before rehearsal', purpose: 'Let the friendly rivals try their game before the shared recount.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the shared laugh', purpose: 'Hear what each rival wants the audience to recognize.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Play ayo three times before the encore', purpose: 'Give the players another chance to agree on the comic score.', task: 'discovery', count: 3 },
        { label: 'Visit two places before the callback', purpose: 'Compare the market and garden story anchors.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the score callback', purpose: 'Celebrate a performance moment without forcing one overall winner.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'ijebu-ode',
      city: {
        title: 'The Ayo Player’s Double Turn', desire: 'autonomy',
        chapters: [
          { title: 'A board-side surprise', text: 'At Ijebu Neighbourhood Park, Ronke Odukoya watches two friends play a comic round of ayo for the neighborhood encore. One player moves too quickly and takes a second turn before noticing the other has not finished. The player laughs, but the friend wants a chance to choose their own move.' },
          { title: 'A friendly pause', text: 'You can play a round of ayo at the park or price the market at Ijebu-Ode Market while Ronke asks both players what would help.' },
          { title: 'Make turns visible', text: 'They could let the faster player finish the whole match, restart from the beginning, or use a simple spoken handoff so each person says when their turn is done. Ronke asks whether the players want a referee.' },
          { title: 'A handoff they own', text: 'They choose the spoken handoff and decline a referee. The faster player says “your move,” waits, and then asks what their friend noticed. The match takes longer but both friends make choices that shape the ending.' },
        ],
        approaches: [
          { label: 'Play ayo at the neighborhood park', callback: 'You let each player own a turn and name when it was finished.' },
          { label: 'Price the market while the friends talk', callback: 'You helped the players choose a simple handoff instead of adding a referee.' },
          { label: 'Leave Ronke a turn-taking phrase', callback: 'You gave the friends a phrase they could use without handing control to someone else.' },
        ],
        dilemma: { prompt: 'The friends want each person to choose their own move and do not want a referee. What helps?', answers: ['Let the faster player finish the match.', 'Use a spoken handoff so each player marks the end of a turn.', 'Restart the match from the beginning.'], correct: 1, explanation: 'The spoken handoff makes turns visible while the friends keep control of their own game.' },
        closing: 'Ronke calls the match a duet with turns. The friends agree to keep the phrase for their next friendly rivalry.',
        keepsake: { name: 'Your-move token', description: 'A round token printed with the phrase that hands a turn to the other player.' },
      },
      country: {
        title: 'The Encore’s Last-Minute Partner', desire: 'belonging',
        chapters: [
          { title: 'A duet loses a player', text: 'The Many-Stops Encore challenge reaches Ijebu-Ode Market just as one performer in a duet realizes they must leave early. Ronke Odukoya watches the remaining performer insist the act should continue, though the song was built for two voices.' },
          { title: 'No replacement on cue', text: 'A rival offers to step in but does not know the words. The departing performer can stay for one verse, while the remaining singer wants to avoid making them feel guilty.' },
          { title: 'Choose a duet that fits', text: 'They could cancel the act, ask the rival to improvise the missing verse, or rewrite the ending so the departing singer leads a short call and the remaining performer answers alone. Ronke asks the pair what they would enjoy, not what would preserve the original arrangement.' },
          { title: 'A shorter song, still shared', text: 'They choose the call-and-answer ending. The departing singer gives the cue, the remaining performer answers, and the rival supplies a gentle closing hum. The act is shorter but the three performers all have a clear part.' },
        ],
        approaches: [
          { label: 'Price the market before the duet', callback: 'You helped the performers find a shorter ending that still belonged to all three.' },
          { label: 'Price the market at Ijebu-Ode Market', callback: 'You gave the departing singer a clear cue and the remaining singer a solo answer.' },
          { label: 'Leave Ronke a closing hum', callback: 'You offered the rival a small part they could join without knowing the full song.' },
        ],
        dilemma: { prompt: 'One singer must leave, and the replacement does not know the full song. How can the act stay shared?', answers: ['Cancel the performance.', 'Give the departing singer a cue, the remaining singer an answer, and the rival a closing hum.', 'Ask the rival to improvise the entire missing verse.'], correct: 1, explanation: 'A shorter call-and-answer lets the departing singer participate and gives the rival a part they can perform.' },
        closing: 'Ronke sends the encore onward with a shorter song that has three clear voices. The next group can decide how long its duet should last.',
        keepsake: { name: 'Call-and-answer ribbon', description: 'A ribbon tied at the point where the first voice passes the song onward.' },
      },
      missions: { daily: [
        { label: 'Play ayo before the double turn', purpose: 'Let both friends practice marking the end of a turn.', task: 'practical', count: 1 },
        { label: 'Visit Ijebu-Ode Market before rehearsal', purpose: 'Give each player time to choose a move before the other continues.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 2 regulars before the extra turn', purpose: 'Hear whether both players feel able to shape the match.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Price the market three times before the next round', purpose: 'Practice using the handoff phrase in another round.', task: 'discovery', count: 3 },
        { label: 'Visit two places before the player switches', purpose: 'Carry the story from its game setting to another mapped place.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the shared game', purpose: 'Give a short duet a cue, answer, and closing hum.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'kaduna',
      city: {
        title: 'The Costume Thread Tug-of-War', desire: 'fairness',
        chapters: [
          { title: 'A sleeve comes apart', text: 'At Chechinya Market, Amina Tanko helps a costume-maker repair a bright stage jacket for a friendly fashion race. One sleeve is held by a loose thread, and two performers each tug it in opposite directions while trying to help. The jacket has not torn, but the group has stopped rehearsing.' },
          { title: 'Small hands, big opinions', text: 'You can browse textile making at the market or spend a quiet evening at Love Garden while Amina invites the performers to describe the look they want. The race is an invented game act; the story makes no claims about local textile work.' },
          { title: 'Choose a wearer', text: 'They could pull harder until the sleeve sits straight, give the jacket to one performer to repair alone, or let the wearer point to the desired fit while the others hold the cloth gently. The wearer says they want room to wave during the finale.' },
          { title: 'A sleeve for waving', text: 'The group chooses the wearer’s direction. One friend holds the cloth, another ties the loose thread, and the wearer tests a broad wave. The sleeve stays in place, and the rival troupe copies the wave as its race-start signal.' },
        ],
        approaches: [
          { label: 'Browse textile making at Chechinya Market', callback: 'You let the wearer describe the movement the sleeve needed to allow.' },
          { label: 'Spend a quiet evening at Love Garden', callback: 'You helped the friends hold the costume gently while the wearer chose the fit.' },
          { label: 'Leave Amina a waving-sleeve idea', callback: 'You prepared the jacket for the performer’s own finale.' },
        ],
        dilemma: { prompt: 'The wearer wants a sleeve that leaves room to wave. How should the group adjust it?', answers: ['Pull the sleeve straight as firmly as possible.', 'Give the jacket to one friend to repair without the wearer.', 'Let the wearer show the needed fit while friends hold and tie the thread.'], correct: 2, explanation: 'The wearer knows the movement they need; gentle help follows their direction.' },
        closing: 'Amina gives the wearer the first wave of the encore. The loose thread becomes a bright cuff that flutters like a tiny flag.',
        keepsake: { name: 'Wave-cuff thread', description: 'A short colorful thread tied into the jacket’s new waving cuff.' },
      },
      country: {
        title: 'The Encore’s Seated Finale', desire: 'care',
        chapters: [
          { title: 'A performer needs a rest', text: 'The Many-Stops Encore reaches Love Garden as a troupe rehearses a long finale. Amina Tanko notices one performer has become tired and asks whether the ending can include a seated role.' },
          { title: 'A different kind of finish', text: 'The performer wants to remain part of the scene; a rival suggests they leave until the finale is over. The cast is unsure how to make a seated position feel intentional.' },
          { title: 'Shape the ending around them', text: 'They can remove the performer from the scene, ask them to push through standing, or build a final tableau where the seated performer gives the signal that brings everyone together. Tunde asks what contribution would feel comfortable.' },
          { title: 'The signal brings the cast in', text: 'The performer chooses a small hand signal from their seat. The others gather on that cue and shape a final picture around them. The rival troupe asks to borrow the tableau for its own closing scene.' },
        ],
        approaches: [
          { label: 'Browse Textile making at Chechinya Market', callback: 'You helped the performer choose a comfortable role.' },
          { label: 'Browse Central Market before the scene', callback: 'You gave the cast a way to build around the seated cue.' },
          { label: 'Leave Tunde a tableau signal', callback: 'You made the ending work with different positions.' }
        ],
        dilemma: { prompt: 'How can the performer stay part of the finale while choosing to sit?', answers: ['Ask them to leave the scene.', 'Build the final picture around a signal they choose.', 'Ask them to finish standing.'], correct: 1, explanation: 'The signal lets the performer shape the group ending from a comfortable position.' },
        closing: 'Amina sends the hand signal onward as one possible start to a finale.',
        keepsake: { name: 'Tableau cue card', description: 'A card showing a seated figure whose raised hand brings others into the picture.' },
      },
      missions: { daily: [
        { label: 'Browse textiles before the thread tug', purpose: 'Give the wearer a chance to show how much room the sleeve needs.', task: 'practical', count: 1 },
        { label: 'Visit Love Garden before the seated finale', purpose: 'Check that the costume allows the finale movement.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the tableau', purpose: 'Hear the wearer’s need and the helpers’ ideas.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Spend three quiet evenings before the signal', purpose: 'Let the wearer test the sleeve while waving.', task: 'discovery', count: 3 },
        { label: 'Visit three places before the final picture', purpose: 'Carry the costume story between its market and garden anchors.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the cast gathers', purpose: 'Test a fast costume fix against the next performer’s movement.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'kano',
      city: {
        title: 'The Racecourse’s Slowest Sprint', desire: 'curiosity',
        chapters: [
          { title: 'A race with no running', text: 'At Kano Racecourse, Amina Bello hosts a stage sprint where performers race paper batons across an imaginary finish line. One rival moves so slowly that the commentator announces the finish before the baton arrives. The crowd starts cheering for the baton.' },
          { title: 'The baton steals the show', text: 'You can learn about the racecourse or play a round of ayo at Gama Community Garden while Amina asks what the contestants enjoy.' },
          { title: 'Let the slow one lead', text: 'They could speed up the contestant, make the commentator wait silently, or give the slow baton a dramatic solo crossing while the contestant narrates its journey. The performer says the slow movement is deliberate but worries the crowd has forgotten who is carrying it.' },
          { title: 'A finish in slow motion', text: 'They choose the solo crossing and let the contestant give the baton a grand introduction. The commentator counts each tiny step as if it were a record. The rival arrives at the finish with the baton and a triumphant bow.' },
        ],
        approaches: [
          { label: 'Learn about the racecourse and the stage sprint', callback: 'You helped the slow performer lead the joke instead of rushing.' },
          { label: 'Play a round of ayo at Gama Community Garden', callback: 'You gave the paper baton its own dramatic moment.' },
          { label: 'Leave Amina a slow-motion line', callback: 'You turned the delayed finish into a deliberate performance.' },
        ],
        dilemma: { prompt: 'The performer chose a slow pace, but the audience is cheering for the baton. How can the contestant reclaim the scene?', answers: ['Speed up to catch the commentator’s announcement.', 'Give the baton a dramatic introduction and narrate its tiny steps.', 'Stop speaking until the audience goes quiet.'], correct: 1, explanation: 'The performer deliberately chose the slow pace; giving the baton a role lets them control the joke.' },
        closing: 'Amina awards the baton a paper medal, then lets the contestant wear it. The next race may take even longer.',
        keepsake: { name: 'Paper finish medal', description: 'A medal awarded to the baton and then proudly worn by its carrier.' },
      },
      country: {
        title: 'The Encore’s Backstage Schedule', desire: 'competence',
        chapters: [
          { title: 'Two acts need the same space', text: 'The Many-Stops Encore reaches Gama Community Garden with two troupes ready to rehearse. Amina Bello finds both groups have scheduled their warm-up in the same small courtyard.' },
          { title: 'A crowded timetable', text: 'One troupe wants the first half-hour; the other needs quiet before its act. A rival suggests rehearsing both at once, but the overlap makes it hard to hear the cues.' },
          { title: 'Share the time', text: 'They can cancel one warm-up, speak over each other, or divide the courtyard into a quiet first period and a shared later period. Sani asks what each group needs before going on.' },
          { title: 'Both groups get ready', text: 'They agree to the quiet period first, then use the space together for a short joint run. The second troupe learns one cue from the first and returns the favor with a new warm-up rhythm.' },
        ],
        approaches: [
          { label: 'Learn about the racecourse at Kano Racecourse', callback: 'You helped the troupes divide the time by what each needed.' },
          { label: 'Browse Kurmi Market before the warm-up', callback: 'You gave both groups a chance to prepare.' },
          { label: 'Leave Sani a two-part schedule', callback: 'You helped keep the courtyard usable for both acts.' }
        ],
        dilemma: { prompt: 'How can both groups prepare when they need the same space for different reasons?', answers: ['Cancel one troupe’s warm-up.', 'Divide the time into a quiet period and shared run.', 'Rehearse both acts at once.'], correct: 1, explanation: 'A divided schedule meets the quiet need and still leaves time for both groups to share the space.' },
        closing: 'Amina adds the two-part schedule to the travelling encore card.',
        keepsake: { name: 'Two-part schedule', description: 'A small card divided into quiet and shared rehearsal periods.' },
      },
      missions: { daily: [
        { label: 'Learn about the racecourse before the schedule', purpose: 'Hear why the contestant chose a slow pace for the paper baton.', task: 'practical', count: 1 },
        { label: 'Visit Kano Racecourse before rehearsal', purpose: 'Let the performer narrate a deliberate slow finish.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the shared timetable', purpose: 'Hear how the contestant and announcer read the false finish.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Learn about the racecourse three times before the next act', purpose: 'Let each rival give the paper baton a dramatic arrival.', task: 'practical', count: 3 },
        { label: 'Visit two places before both troupes rehearse', purpose: 'Try the stage sprint in another mapped location.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the courtyard opens', purpose: 'Give the announcer a clear cue before calling the encore complete.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'katsina',
      city: {
        title: 'The Polo Commentator’s Pause', desire: 'competence',
        chapters: [
          { title: 'Too many words', text: 'At Katsina Polo Ground, Asmau Umar helps a sports commentator rehearse a comic play-by-play for a pretend hobby-horse race. The commentator describes every shuffle, blink and wobble until the riders can no longer hear the starting cue.' },
          { title: 'A crowded soundtrack', text: 'You can spend a quiet evening at Maryam Park or walk through Katsina Polo Ground while Asmau asks the riders what they need. The race uses hobby horses and belongs only to this performance.' },
          { title: 'Words or rhythm', text: 'The commentator could keep narrating and ask the riders to listen harder, stop narrating completely, or use short calls between quiet gaps. One rider says they like the colorful descriptions but need a clear moment to hear the cue.' },
          { title: 'A cue between calls', text: 'They choose short calls and leave one full pause for the start. The commentator introduces each rider with a playful phrase, then holds still as the cue sounds. The riders launch together, while the commentator keeps the best joke for the finish.' },
        ],
        approaches: [
          { label: 'Walk the polo ground and test the start cue', callback: 'You made a quiet gap so the riders could hear the starting signal.' },
          { label: 'Walk through the park at Katsina Polo Ground', callback: 'You kept the colorful commentary but gave it room to breathe.' },
          { label: 'Leave Asmau a short call for the start', callback: 'You helped the commentator save a joke for after the cue.' },
        ],
        dilemma: { prompt: 'The riders enjoy commentary but need to hear the start cue. What should the commentator do?', answers: ['Keep narrating and ask them to listen harder.', 'Use short calls with a clear pause for the cue.', 'Stop narrating for the entire race.'], correct: 1, explanation: 'Short calls preserve the lively introductions while the pause makes the cue audible.' },
        closing: 'Asmau calls the act “The Great Pause.” The riders ask for the commentator to describe their finish in twice as many words.',
        keepsake: { name: 'Commentator’s pause card', description: 'A cue card with a wide blank stripe for the quiet moment before the start.' },
      },
      country: {
        title: 'The Encore’s Unheard Bell', desire: 'curiosity',
        chapters: [
          { title: 'A cue goes unnoticed', text: 'The Many-Stops Encore reaches Katsina Polo Ground with a short scene that starts when a tiny bell rings. Asmau Umar sees the actors miss the cue whenever the audience laughs.' },
          { title: 'The sound disappears', text: 'The bell player wants to ring louder; the actors say they cannot hear it over the laughter. The rival troupe proposes replacing the cue with a large gesture.' },
          { title: 'Make a visible signal', text: 'They can ring until the room goes quiet, remove the cue, or pair the bell with a raised card that stays visible through the laugh. Amina asks which signal will reach both the actors and the audience.' },
          { title: 'The card holds the moment', text: 'They pair the soft bell with a bright card. The actors see the card even when laughter covers the sound, and the pause becomes part of the scene. The next troupe chooses a signal of its own.' },
        ],
        approaches: [
          { label: 'Spend a quiet evening here at Maryam Park', callback: 'You helped the actors catch a cue through the laughter.' },
          { label: 'Browse Katsina Central Market before the scene', callback: 'You saw the visible signal keep the moment clear.' },
          { label: 'Leave Amina a cue card for the next troupe', callback: 'You gave the next act a way to make a cue visible.' }
        ],
        dilemma: { prompt: 'What helps the actors notice the start cue while the audience is laughing?', answers: ['Ring the bell louder until everyone is quiet.', 'Pair the bell with a visible raised card.', 'Remove the cue from the scene.'], correct: 1, explanation: 'A visible card remains clear even when laughter covers the bell.' },
        closing: 'Asmau sends the paired cue onward with the travelling challenge.',
        keepsake: { name: 'Bell-and-card cue', description: 'A bright card printed beside a tiny bell symbol.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the unheard bell', purpose: 'Let the hobby-horse riders test whether the commentator leaves enough quiet.', task: 'practical', count: 1 },
        { label: 'Visit Katsina Polo Ground before rehearsal', purpose: 'Keep the introductions lively while making space for the start signal.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the cue card rises', purpose: 'Hear which calls help and which ones cover the cue.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Spend three evenings before the next signal', purpose: 'Give the commentator a chance to save a joke for the finish.', task: 'practical', count: 3 },
        { label: 'Visit three places before the actors take their cue', purpose: 'Practice the announcer handoff in a second setting.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the paired signal', purpose: 'Give both announcers a clear part before the troupe enters.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'lafia',
      city: {
        title: 'The Market Juggler’s Flying Millet', desire: 'care',
        chapters: [
          { title: 'A pretend harvest', text: 'At Lafia Market, Laraba Audu meets a juggler practicing with three soft stage pouches labeled yam, sorghum and millet. One pouch keeps landing near a friend who is watching. The friend is not hurt, but does not want to be part of the act.' },
          { title: 'A safer laugh', text: 'You can browse yams, sorghum and millet at New market or visit Lafia Market while Laraba helps the juggler rearrange the routine.' },
          { title: 'Change the target', text: 'The juggler can keep tossing toward the friend, stop juggling, or move the landing pattern toward an empty marked space and let the friend choose whether to join. Laraba asks the watcher what kind of participation they want.' },
          { title: 'An empty-space encore', text: 'The friend chooses to be the judge, not a target. The juggler tosses toward the marked space and lets the pouches fall in a comic pile. The friend declares the pile “perfectly harvested” and awards a dramatic ribbon.' },
        ],
        approaches: [
          { label: 'Browse New market and hear the juggler’s plan', callback: 'You moved the landing area away from a watcher who did not want to join.' },
          { label: 'Visit Lafia Market for a prop rehearsal', callback: 'You let the friend choose the judge’s role instead of becoming a target.' },
          { label: 'Leave Laraba an empty-space gag', callback: 'You made the falling pouches part of a joke that did not involve the watcher.' },
        ],
        dilemma: { prompt: 'The watcher does not want to be part of the act. How can the juggler keep the scene playful?', answers: ['Keep tossing toward the watcher until they join in.', 'Stop the act and remove the pouches.', 'Toss toward an empty marked space and let the watcher choose another role.'], correct: 2, explanation: 'The watcher can choose to judge while the performer moves the props away from them.' },
        closing: 'Laraba pins the ribbon on the juggler’s pouch pile. The friend asks to judge again, but only from the safe side of the stage.',
        keepsake: { name: 'Harvest-pile ribbon', description: 'A ribbon awarded to the perfectly messy stack of soft stage pouches.' },
      },
      country: {
        title: 'The Encore’s Borrowed Pouch', desire: 'care',
        chapters: [
          { title: 'A prop crosses the stage', text: 'The Many-Stops Encore challenge reaches Lafia Market carrying one soft pouch from a previous troupe. Laraba Audu meets a new performer who wants to use it, and a second performer who has been carrying the pouch between stops.' },
          { title: 'A prop with a story', text: 'The carrier is attached to the pouch because it survived the first act. The new performer has an idea for a different joke, but fears changing it will erase the first troupe’s contribution.' },
          { title: 'Lend or preserve', text: 'They can keep the pouch untouched, give it away permanently, or let the new performer borrow it for one act and return it with a new tag describing what changed. Laraba asks both performers what they want the object to carry forward.' },
          { title: 'A prop with two chapters', text: 'They choose a temporary loan and a new tag. The act gives the pouch a comic role as a tiny traveling suitcase. When it returns, the old carrier adds the new tag beside the original one.' },
        ],
        approaches: [
          { label: 'Browse New market and hear the prop’s story', callback: 'You helped the performers preserve the first act while lending the pouch for another.' },
          { label: 'Visit Lafia Market for the suitcase gag', callback: 'You gave the pouch a new role and a tag that can travel back.' },
          { label: 'Leave Laraba a note for the prop carrier', callback: 'You let both performers describe what they wanted the pouch to remember.' },
        ],
        dilemma: { prompt: 'The new performer wants to use a traveling pouch without erasing the first troupe’s contribution. What fits?', answers: ['Keep the pouch untouched for the rest of the challenge.', 'Lend it for one act and return it with a tag describing the change.', 'Give it away permanently to the new performer.'], correct: 1, explanation: 'A temporary loan lets the prop travel into a new act while preserving both contributions.' },
        closing: 'Laraba adds no rules about how long a prop must stay. The pouch carries two little stories into the next stop.',
        keepsake: { name: 'Two-act pouch tag', description: 'A tag with space for the prop’s first role and its new traveling-suitcase gag.' },
      },
      missions: { daily: [
        { label: 'Browse millet before the flying-harvest act', purpose: 'Hear the watcher explain which role they would choose.', task: 'practical', count: 1 },
        { label: 'Visit two places before the juggling scene', purpose: 'Move the soft pouches away from someone who does not want to join.', task: 'places', count: 2 },
        { label: 'Greet 2 regulars before the pretend harvest', purpose: 'Hear what the new act and original carrier want the prop to retain.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse sesame three times before the next act', purpose: 'Give the watcher a choice of judging or staying out of the act.', task: 'discovery', count: 3 },
        { label: 'Visit New market before the final toss', purpose: 'Carry the harvest gag between its two market anchors.', task: 'practical-visit', count: 1 },
        { label: 'Greet 3 regulars before the final toss', purpose: 'Record the original prop role and the new act’s contribution.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'lagos',
      city: {
        title: 'The Open Mic’s Borrowed Punchline', desire: 'recognition',
        chapters: [
          { title: 'A joke changes hands', text: 'At Freedom Park, Kunle helps an open-mic performer prepare a short joke for the encore. The performer’s friend repeats the punchline at Amala Shitta before the set, and the line gets a bigger laugh than the performer expected. The friend says they were practicing it, not claiming it.' },
          { title: 'Who gets the laugh?', text: 'You can gist with Mama at Amala Shitta or test jokes at the open mic with Kunle. The performer wants credit but does not want to embarrass a friend.' },
          { title: 'A handoff or a boundary', text: 'They could forbid the friend from repeating the line, share the joke as a two-person bit, or let the performer introduce it and invite the friend to deliver the punchline. Kunle asks what each person would enjoy doing on stage.' },
          { title: 'A punchline with two voices', text: 'The performer chooses to set up the joke and invite the friend to finish it. They agree to name the shared bit before performing. The audience laughs at the handoff, and both friends take a bow without competing for the final word.' },
        ],
        approaches: [
          { label: 'Gist with Mama about the joke', callback: 'You helped the friends agree how to share the setup and punchline.' },
          { label: 'Test jokes at the Freedom Park open mic', callback: 'You gave the performer the setup and the friend the invited finish.' },
          { label: 'Leave Kunle a two-person punchline idea', callback: 'You let both friends choose a part they wanted to perform.' },
        ],
        dilemma: { prompt: 'The performer wants credit without embarrassing the friend who repeated the punchline. What makes both contributions clear?', answers: ['Tell the friend never to repeat the joke again.', 'Share a named two-person bit with the performer setting it up and inviting the punchline.', 'Let the friend perform the whole joke alone.'], correct: 1, explanation: 'The shared bit credits both roles and keeps the friend’s participation invited.' },
        closing: 'Kunle adds “setup by one, finish by two” to the open-mic introduction. Their rivals ask if they can borrow the format for a sketch.',
        keepsake: { name: 'Two-voice mic tag', description: 'A small tag attached to the microphone to mark a shared punchline.' },
      },
      country: {
        title: 'The Encore’s Quiet Prop Change', desire: 'competence',
        chapters: [
          { title: 'A scene needs a reset', text: 'The Many-Stops Encore reaches Freedom Park as a troupe prepares a fast transition between two scenes. Kunle sees the performers lose time while carrying props across the stage.' },
          { title: 'The change takes over', text: 'One performer wants to move everything at once; another worries the quick reset will become chaotic. The rival troupe offers to clear the whole stage, but that would remove a prop needed in the next scene.' },
          { title: 'Give each prop a route', text: 'They can clear everything, move props without a plan, or assign each item a return spot and a simple order. Ayo asks which setup lets the next scene begin without a scramble.' },
          { title: 'The next scene is ready', text: 'They mark two return spots and move the props in order. The transition becomes a playful procession, and the important prop arrives just as its character enters.' },
        ],
        approaches: [
          { label: 'Gist with Mama at Amala Shitta', callback: 'You helped the troupe give each prop a return place.' },
          { label: 'Browse Balogun Market before the next act', callback: 'You saw the scene change become orderly and playful.' },
          { label: 'Leave Ayo a two-spot prop cue', callback: 'You gave the next troupe a way to reset its scene.' }
        ],
        dilemma: { prompt: 'How can the troupe move props quickly while keeping the next scene’s needed item?', answers: ['Clear every prop from the stage.', 'Assign return spots and move the items in order.', 'Move everything at once without a plan.'], correct: 1, explanation: 'A simple route preserves the needed prop and gives the transition a repeatable order.' },
        closing: 'Ayo clips the two-spot cue to the travelling kit.',
        keepsake: { name: 'Two-spot prop card', description: 'A sketch showing where two props wait between scenes.' },
      },
      missions: { daily: [
        { label: 'Gist before the borrowed punchline', purpose: 'Give the friends space to decide how to share the punchline.', task: 'practical', count: 1 },
        { label: 'Visit Freedom Park before the open mic', purpose: 'Rehearse the setup and invited finish at the open mic.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 2 regulars before the prop change', purpose: 'Hear how each friend wants their part introduced.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Gist three times before the next act', purpose: 'Let both friends perform a setup and invited finish.', task: 'practical', count: 3 },
        { label: 'Visit two places before the stage reset', purpose: 'Try the shared joke at its two story anchors.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the punchline returns', purpose: 'Give a spectator one clear word without interrupting the rest of the act.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'lokoja',
      city: {
        title: 'The Amusement Park’s Missing Moon', desire: 'curiosity',
        chapters: [
          { title: 'A night sky with a gap', text: 'At Children Amusement, Salamatu Audu watches a puppet show in which a paper moon is supposed to rise over a tiny cardboard town. The moon prop is missing, and the puppeteer keeps pointing to an empty corner of the stage. A child in the audience whispers that perhaps the moon is hiding.' },
          { title: 'The show can continue', text: 'You can browse grains and vegetables at Old Market or spend a quiet evening at Children Amusement while Salamatu hears the puppeteer’s idea. The scene is entirely imaginary, with paper scenery and no claim about an actual show.' },
          { title: 'Reveal or wonder', text: 'They could stop until the moon is found, make a new paper circle, or ask the audience to suggest what might be lighting the town. The puppeteer wants the children to keep imagining but also wants a satisfying ending.' },
          { title: 'A moon made of guesses', text: 'They ask the audience for possibilities. One says a lantern; another says a friendly firefly; the child says it is the stage itself. The puppeteer uses a little spotlight and lets every guess become part of the paper town’s sky.' },
        ],
        approaches: [
          { label: 'Browse Old Market and invent a moon clue', callback: 'You helped the puppeteer invite guesses before replacing the prop.' },
          { label: 'Spend a quiet evening at Children Amusement', callback: 'You made the missing moon a question the audience could answer.' },
          { label: 'Leave Salamatu a paper-moon idea', callback: 'You gave the show a way to finish without one fixed answer.' },
        ],
        dilemma: { prompt: 'The paper moon is missing, and the puppeteer wants a satisfying ending that keeps imagination alive. What works?', answers: ['Stop the show until the moon is found.', 'Ask for possible light sources and use the audience’s guesses in the sky.', 'Make a new paper circle and end the mystery immediately.'], correct: 1, explanation: 'Audience guesses keep the mystery open while the spotlight gives the scene a playable ending.' },
        closing: 'Salamatu asks the child to choose which light will lead the next scene. The paper town has more than one moon now.',
        keepsake: { name: 'Guessing-moon disk', description: 'A round card with several possible lights drawn around its edge.' },
      },
      country: {
        title: 'The Encore’s Too-Wide Backdrop', desire: 'competence',
        chapters: [
          { title: 'A backdrop will not fit', text: 'The Many-Stops Encore reaches Children Amusement with a painted backdrop wider than the troupe’s playing space. Salamatu Audu watches the performers try to squeeze past it, blocking one another as they carry it onto the stage.' },
          { title: 'Keep the picture, find a way', text: 'The backdrop shows a tiny cardboard town from the traveling act. One performer wants to leave it outside; another says the town is the setting the audience expects. The group cannot widen the stage.' },
          { title: 'Fold or frame', text: 'They can cut the backdrop, leave it offstage, or fold both edges inward to make a narrow frame around the town. Salamatu asks if the performers can still see the painted center when the edges fold.' },
          { title: 'A frame for the town', text: 'They test the folds and find the center remains visible. The folded edges become two comic doorways, and the performers enter through them one at a time. The too-wide backdrop turns into a frame that gives the town extra entrances.' },
        ],
        approaches: [
          { label: 'Browse grains and vegetables at Old Market', callback: 'You helped the troupe keep the painted town while narrowing its frame.' },
          { label: 'Spend a quiet evening at Children Amusement', callback: 'You found two doorways in the folded edges.' },
          { label: 'Leave Salamatu a backdrop-fold idea', callback: 'You gave the performers a way to keep the picture on a small stage.' },
        ],
        dilemma: { prompt: 'The backdrop is too wide for the stage, but its painted town is central to the act. What fits?', answers: ['Cut the backdrop down the middle.', 'Fold both edges inward and use them as doorways.', 'Leave the backdrop outside the performance.'], correct: 1, explanation: 'The folds make the backdrop narrow enough while preserving its visible center.' },
        closing: 'Salamatu calls it a town with two doors. The next troupe inherits a backdrop that can change shape.',
        keepsake: { name: 'Folded-town frame', description: 'A paper frame shaped from the edges of the too-wide backdrop.' },
      },
      missions: { daily: [
        { label: 'Browse produce before the missing moon scene', purpose: 'Give the puppeteer time to decide how to finish without the paper moon.', task: 'practical', count: 1 },
        { label: 'Visit Children Amusement before rehearsal', purpose: 'Let several ideas become lights in the paper town’s sky.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the backdrop test', purpose: 'Hear which guesses make the missing moon scene satisfying.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Spend three evenings before the night scene', purpose: 'Give the puppeteer another way to involve audience imagination.', task: 'discovery', count: 3 },
        { label: 'Visit three places before the final backdrop', purpose: 'Carry the story between its two mapped places.', task: 'places', count: 3 },
        { label: 'Greet 4 regulars before the next reveal', purpose: 'Mark a performer’s entrance without pretending a lamp is working.', task: 'people', count: 4 },
      ] },
    },
    {
      cityId: 'maiduguri',
      city: {
        title: 'The Garden’s Whispering Megaphone', desire: 'competence',
        chapters: [
          { title: 'A whisper that booms', text: 'At BEXIL GARDENS, Kachalla Abatcha helps a announcer prepare a whispering contest for the encore. The announcer uses a comically large megaphone, and the quietest whisper comes out as a booming proclamation. The performers keep breaking character to laugh.' },
          { title: 'Volume is not the point', text: 'You can walk through Maiduguri international park or spend an evening at BEXIL GARDENS while Kachalla asks the announcer what they want the audience to notice. The megaphone is a stage prop, not real equipment advice.' },
          { title: 'A new whisper rule', text: 'They can remove the megaphone, have the audience cover their ears, or make the announcer whisper into the wide end while the performers guess the phrase. The announcer likes the prop and wants to keep the contrast.' },
          { title: 'A phrase for the back row', text: 'They choose the wide-end whisper. The front row hears a muffled secret while the back row sees only the dramatic pose. The performers guess wildly, and the announcer reveals the phrase with an ordinary voice after the round.' },
        ],
        approaches: [
          { label: 'Walk through Maiduguri international park', callback: 'You helped the announcer keep the oversized prop while changing how it was used.' },
          { label: 'Spend an evening at BEXIL GARDENS', callback: 'You made the whisper a guessing game instead of a volume contest.' },
          { label: 'Leave Kachalla a phrase for the contest', callback: 'You gave the performers a new secret to guess.' },
        ],
        dilemma: { prompt: 'The announcer likes the megaphone but wants a real whispering contest. What use fits?', answers: ['Remove the megaphone from the act.', 'Whisper into the wide end while performers guess the muffled phrase.', 'Ask the audience to cover their ears.'], correct: 1, explanation: 'Using the prop differently keeps its comic contrast while making the round about guessing a whisper.' },
        closing: 'Kachalla declares the megaphone the quietest loud object in the garden. The announcer asks for an even sillier phrase next time.',
        keepsake: { name: 'Whispering megaphone tag', description: 'A tag for the wide end of the prop, where the secret phrase begins.' },
      },
      country: {
        title: 'The Encore’s Cramped Dressing Room', desire: 'fairness',
        chapters: [
          { title: 'Three performers, one mirror', text: 'The Many-Stops Encore reaches BEXIL GARDENS with three performers preparing different costume details in front of one tall mirror. Kachalla Abatcha sees them crowd together, each trying to check a different part of their outfit.' },
          { title: 'A mirror is not a stage', text: 'The lead needs to check a sleeve, the second performer wants to see a hat, and the third only needs a quick glance at a shoe. They all insist their check is urgent, but the act can wait a moment.' },
          { title: 'Share the reflection', text: 'They can let the lead keep the mirror, move the mirror to the side and make each performer wait, or rotate three short turns based on what each needs to check. Kachalla asks whether every check needs the full mirror.' },
          { title: 'Three quick reflections', text: 'They choose short turns: sleeve, hat, shoe. The performers notice that only the sleeve needs the full reflection, while the hat and shoe can be checked from the side. The troupe leaves the dressing space ready without ranking whose costume matters most.' },
        ],
        approaches: [
          { label: 'Walk through Maiduguri international park before the act', callback: 'You helped the performers divide the mirror time by what each needed to see.' },
          { label: 'Spend an evening at BEXIL GARDENS', callback: 'You kept the costume checks short and gave each performer a turn.' },
          { label: 'Leave Kachalla a three-part mirror order', callback: 'You made room for the sleeve, hat, and shoe checks.' },
        ],
        dilemma: { prompt: 'Three performers need one mirror for different costume details. How can each get a fair check?', answers: ['Let the lead keep the mirror.', 'Give short turns based on what each detail needs.', 'Move the mirror away and make everyone wait.'], correct: 1, explanation: 'Short, need-based turns let each performer check the relevant costume detail.' },
        closing: 'Kachalla puts the mirror back by the entrance. The next troupe can make its own order when the performers arrive.',
        keepsake: { name: 'Three-turn mirror token', description: 'A token marked sleeve, hat, and shoe for the costume-check order.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the whisper challenge', purpose: 'Give the announcer time to test a quiet use of the megaphone prop.', task: 'discovery', count: 1 },
        { label: 'Visit maiduguri international park before rehearsal', purpose: 'Let performers guess a whispered line instead of measuring volume.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the quiet scene', purpose: 'Hear which clue makes the whisper round fun.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Walk the park three times before the next cue', purpose: 'Let the performers try different secret phrases.', task: 'practical', count: 3 },
        { label: 'Visit two places before the finale', purpose: 'Try the guessing act in another mapped park setting.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the whisper returns', purpose: 'Keep a guessing game playable after its phrase is heard.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'makurdi',
      city: {
        title: 'The Dinner Bell’s Wrong Note', desire: 'care',
        chapters: [
          { title: 'An early ring', text: 'At Golden Plate Restaurant, Aondover Shima helps a comedy pair rehearse a scene about a dinner bell. One performer rings the bell whenever the other says “almost ready,” so the imaginary diners rush in before the table is set. The bell is a prop; no meal or service is involved.' },
          { title: 'The line sounds similar', text: 'You can browse fresh farm produce at North bank market or compare the scene at Wurukum market while Aondover listens. The performers want the bell gag, but the early ring makes the second actor look careless.' },
          { title: 'Separate the signals', text: 'They could remove the bell, let the bell ring on every “almost ready,” or add a phrase that clearly means the scene is truly ready. The actor who sets the table asks to choose that phrase.' },
          { title: 'Ready means ready', text: 'They agree that “all set” is the true cue. The bell rings only then; every “almost ready” becomes a suspenseful near-miss. The second actor gets to complete the table, and the audience learns to wait for the phrase.' },
        ],
        approaches: [
          { label: 'Browse North bank market before rehearsal', callback: 'You helped the actors choose a cue that means the table is actually ready.' },
          { label: 'Browse Wurukum market and test the bell', callback: 'You made “almost ready” a joke and kept the bell for the real signal.' },
          { label: 'Leave Aondover a clear readiness phrase', callback: 'You gave the table-setter control of the moment the bell rings.' },
        ],
        dilemma: { prompt: 'The table-setter wants to finish before the bell calls the diners. What change keeps the bell gag?', answers: ['Remove the bell from the scene.', 'Ring whenever anyone says “almost ready.”', 'Choose a distinct phrase that means the table is truly ready.'], correct: 2, explanation: 'A distinct phrase lets the table-setter complete the setup and preserves the bell as a punchline.' },
        closing: 'Aondover asks the imaginary diners to wait for “all set.” They arrive together, perfectly on cue, and one still brings an imaginary spoon too early.',
        keepsake: { name: 'All-set bell ribbon', description: 'A ribbon tied to the stage bell with the phrase that triggers its ring.' },
      },
      country: {
        title: 'The Encore’s Three-Entrance Traffic Jam', desire: 'fairness',
        chapters: [
          { title: 'Everyone arrives at once', text: 'The Many-Stops Encore reaches Wurukum market with a comic stage scene about three characters sharing one narrow doorway. Aondover Shima watches the performers rush in together, bump shoulders, and find themselves all standing behind the same little table. The scene has one entrance and the performers want the pile-up to be funny without making anyone feel pushed aside.' },
          { title: 'One doorway, three styles', text: 'The first character wants a grand entrance, the second wants to sneak in, and the third wants to arrive backward. Each performer has a distinct idea, but they keep trying to use the same space at the same time. A rival troupe suggests removing the table, which would also remove the setting for the joke.' },
          { title: 'Give the entrances room', text: 'They can rush through together and repeat the collision, remove the table, or let each character enter one at a time with a different path around it. Aondover asks which version keeps all three comic entrances and leaves each performer room to play.' },
          { title: 'A traffic pattern for actors', text: 'They choose the separate paths: grand entrance in front, sneaking entrance behind, backward entrance last. Each gets a solo moment before the characters meet at the table. The final collision is a carefully timed bow, and the rival troupe asks to try the pattern with its own cast.' },
        ],
        approaches: [
          { label: 'Browse fresh farm produce before the scene', callback: 'You helped the troupe keep the table while giving each entrance its own path.' },
          { label: 'Visit Wurukum market for the doorway scene', callback: 'You let the three characters enter in different styles and in sequence.' },
          { label: 'Leave Aondover a note for when he is free', callback: 'You left the traffic pattern ready for Aondover to share with the troupe.' },
        ],
        dilemma: { prompt: 'Three characters share one doorway and keep colliding. How can each have a comic entrance without being crowded out?', answers: ['Rush through together and repeat the collision.', 'Remove the table that gives the scene its setting.', 'Give each character a different path and let them enter one at a time.'], correct: 2, explanation: 'Different paths and a sequence preserve all three distinct entrances while leaving each performer room.' },
        closing: 'Aondover adds a final group bow after the separate entrances. The encore troupe leaves with a stage pattern that turns crowding into choreography.',
        keepsake: { name: 'Three-path ticket', description: 'A ticket showing the grand, sneaking, and backward routes around the table.' },
      },
      missions: { daily: [
        { label: 'Browse produce before the dinner bell', purpose: 'Give the actors time to decide which phrase means the table is ready.', task: 'practical', count: 1 },
        { label: 'Visit Wurukum market before rehearsal', purpose: 'Keep the bell quiet during “almost ready” and ring it at the chosen phrase.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 2 regulars before the three-entrance act', purpose: 'Hear how the bell affects both the table-setter and the imaginary diners.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse produce three times before the next cue', purpose: 'Let the performers practice near-misses and a clear final cue.', task: 'practical', count: 3 },
        { label: 'Visit two places before the entrances cross', purpose: 'Bring the sketch to another mapped market setting.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the three-way entrance', purpose: 'Give the traveling troupe a reliable cue distinct from its dialogue.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'minna',
      city: {
        title: 'The Garden’s Ayo Board Reversal', desire: 'competence',
        chapters: [
          { title: 'A playful rematch', text: 'At Veez Garden, Fatima Yakubu joins a ayo match staged as a comic duel. One friendly rival celebrates a move before the other has finished, then discovers the game has turned the story around. Both players grin, but the premature celebration has spoiled the surprise.' },
          { title: 'Let the last move land', text: 'You can spend an evening at Yemisi Suswam Garden or walk through Veez Garden while Fatima asks the players what they want from the rematch. The game scene is and uses the existing play-a-round activity as its only proof anchor.' },
          { title: 'Celebrate or wait', text: 'They could forbid celebration until the match is over, let each player announce a win whenever they feel ahead, or agree on one shared signal for the true ending. The players say they enjoy surprise more than keeping score.' },
          { title: 'A delayed celebration', text: 'They choose a final flourish both players recognize, then celebrate together after it. The player who celebrated early gets to lead the flourish; the other adds a ridiculous victory dance. The rematch has two winners and one excellent dance.' },
        ],
        approaches: [
          { label: 'Spend an evening at Yemisi Suswam Garden', callback: 'You gave both players a chance to enjoy the surprise before celebrating.' },
          { label: 'Walk through Veez Garden and play a round', callback: 'You helped the rivals agree on one shared signal for the real finish.' },
          { label: 'Leave Fatima a victory-flourish idea', callback: 'You turned the early celebration into a move they could save for the end.' },
        ],
        dilemma: { prompt: 'The rivals enjoy surprise more than scoring. How can they keep an early celebration from spoiling the rematch?', answers: ['Choose a shared final signal, then celebrate together.', 'Let each player announce a win whenever they feel ahead.', 'Forbid any celebration until the game is over.'], correct: 0, explanation: 'A shared signal preserves the surprise and gives both players a moment to celebrate.' },
        closing: 'Fatima calls the final flourish a victory dance for the entire garden. The rivals promise to make it even more ridiculous next time.',
        keepsake: { name: 'Final-flourish feather', description: 'A bright paper feather worn during the shared victory dance.' },
      },
      country: {
        title: 'The Encore’s Curtain with Two Sides', desire: 'curiosity',
        chapters: [
          { title: 'A curtain hides the wrong scene', text: 'The Many-Stops Encore reaches Veez Garden with a reversible curtain painted differently on each side. Fatima Yakubu notices that the troupe keeps revealing the same side, although both paintings were made for the act.' },
          { title: 'One reveal, two pictures', text: 'The first side shows a sleepy town; the other shows the same town celebrating. The performers like the surprise but are unsure whether to turn the curtain before or after the scene changes.' },
          { title: 'Turn or stay', text: 'They can keep one picture for the whole act, flip the curtain whenever someone crosses the stage, or agree on a moment when the town’s mood changes and the curtain turns with it. Fatima asks what event could make the town wake.' },
          { title: 'A parade wakes the town', text: 'They choose a parade of imaginary paper lanterns. When the first lantern passes, the curtain flips from sleepy to celebrating. The performers use the two pictures to show the same town changing mood.' },
        ],
        approaches: [
          { label: 'Spend an evening at Yemisi Suswam Garden', callback: 'You helped the troupe connect the curtain turn to the town’s change in mood.' },
          { label: 'Walk through Veez Garden before the reveal', callback: 'You kept both painted sides in the act and gave the turn a clear moment.' },
          { label: 'Leave Fatima a town-waking event', callback: 'You gave the performers a reason for the scene to change.' },
        ],
        dilemma: { prompt: 'The reversible curtain shows two moods of one town. What gives the flip a clear meaning?', answers: ['Keep one picture for the entire act.', 'Flip it whenever anyone crosses the stage.', 'Tie the turn to a moment when the town’s mood changes.'], correct: 2, explanation: 'A story event gives the visual change a reason the audience can follow.' },
        closing: 'Fatima sends the curtain onward with both scenes intact. The next group can invent its own moment of change.',
        keepsake: { name: 'Two-sided town ticket', description: 'A ticket showing the sleepy and celebrating faces of the same paper town.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the Ayo reversal', purpose: 'Give the rivals time to agree on a final signal before celebrating.', task: 'practical', count: 1 },
        { label: 'Visit Veez Garden before rehearsal', purpose: 'Let both players practice waiting for the shared finish.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the curtain changes', purpose: 'Hear whether the shared flourish leaves room for both to enjoy the ending.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Walk through the park three times before the finale', purpose: 'Save the shared celebration for the agreed final signal.', task: 'discovery', count: 3 },
        { label: 'Visit three places before the two-sided curtain', purpose: 'Try the encore finish in another mapped garden.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the curtain cue', purpose: 'Pass the playful trophy to someone whose act deserves recognition.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'osogbo',
      city: {
        title: 'The Market’s Pun-Off', desire: 'recognition',
        chapters: [
          { title: 'A joke in a basket', text: 'At Ayegbaju International Modern Market, Temitope Adeyemi hosts a pun-off between two friendly performers. One has a clever joke about a yam in a basket; the other delivers a much sillier punchline about a basket that wants to be a hat. The first performer feels their carefully written joke has vanished.' },
          { title: 'Laughs are unpredictable', text: 'You can browse yam at the market or walk through Nelson Mandela Freedom Park while Temitope hears both performers. No real market vendor or product is part of the joke; it is a stage prop scene.' },
          { title: 'Count the laughs or the craft', text: 'They could award the round to the loudest laugh, let each performer explain the work behind their joke, or ask the audience to name what they enjoyed in each. The performers agree they want people to remember both jokes, even if one got a bigger reaction.' },
          { title: 'Two kinds of funny', text: 'They ask for one word about each joke: clever, silly, surprising, or strange. The audience names different qualities, and both performers repeat their lines with a new flourish. Temitope calls it a tie between careful craft and glorious nonsense.' },
        ],
        approaches: [
          { label: 'Browse yam and hear both puns', callback: 'You helped the audience name different strengths instead of counting volume.' },
          { label: 'Walk through Nelson Mandela Freedom Park', callback: 'You let both performers hear what the crowd enjoyed about their jokes.' },
          { label: 'Leave Temitope a new pun category', callback: 'You gave each performer a way to be remembered for a different kind of funny.' },
        ],
        dilemma: { prompt: 'One joke gets a louder laugh, but both performers want their work remembered. What should the audience do?', answers: ['Award the round to the loudest laugh.', 'Name a quality they enjoyed in each joke.', 'Ask each performer to explain the joke’s craft.'], correct: 1, explanation: 'Naming different qualities recognizes both performances without pretending the crowd reacted identically.' },
        closing: 'Temitope awards the basket two paper hats. The performers bow, then argue happily about which hat has the better brim.',
        keepsake: { name: 'Two-pun rosette', description: 'A rosette with one clever and one silly side.' },
      },
      country: {
        title: 'The Encore’s Costume Rack Traffic', desire: 'fairness',
        chapters: [
          { title: 'Everyone wants the same hanger', text: 'The Many-Stops Encore reaches Nelson Mandela Freedom Park with a small rolling costume rack. Temitope Adeyemi watches the performers reach for the same empty hanger at once, each holding a different costume piece needed for the next scene.' },
          { title: 'A rack with limited space', text: 'The costumes are light, but the rack has only one open hook. One performer wants to hang a cape; another has a hat that may fall if set down; a third carries a sash that can be folded.' },
          { title: 'Choose what needs hanging', text: 'They can let the first hand keep the hook, put every item on top of the rack, or decide which piece needs the hook most and find another place for the other two. Temitope asks the performers to consider how each item will stay ready.' },
          { title: 'A hook for the cape', text: 'They hang the cape so it will not drag, set the hat in a box, and fold the sash over the handle. Each costume piece stays ready, and no one has to win the hook by reaching first.' },
        ],
        approaches: [
          { label: 'Browse yam at Ayegbaju International Modern Market', callback: 'You helped the performers give the hook to the cape that needed it most.' },
          { label: 'Walk through Nelson Mandela Freedom Park', callback: 'You found separate places for the hat and sash.' },
          { label: 'Leave Temitope a costume-rack order', callback: 'You left the next performers a way to share limited hanging space.' },
        ],
        dilemma: { prompt: 'Three costume pieces need to stay ready, but the rack has one hook. How can the troupe use it?', answers: ['Let the first person to reach keep the hook.', 'Hang the piece that cannot be stored another way, and place the other two safely.', 'Pile every costume piece on top of the rack.'], correct: 1, explanation: 'The cape needs hanging, while the hat and sash have other storage options.' },
        closing: 'Temitope labels the hook “for the piece that needs it.” The next troupe can decide which costume gets the space.',
        keepsake: { name: 'Single-hook tag', description: 'A tag for the costume rack’s one open hook.' },
      },
      missions: { daily: [
        { label: 'Browse yam before the pun-off', purpose: 'Give both performers time to prepare a different kind of joke.', task: 'practical', count: 1 },
        { label: 'Visit Ayegbaju International Modern Market before rehearsal', purpose: 'Let the audience hear the clever and silly punchlines clearly.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the two-ending scene', purpose: 'Find out what qualities people enjoyed in each performance.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Walk through the park three times before the next act', purpose: 'Give each performer another chance to deliver their line.', task: 'discovery', count: 3 },
        { label: 'Visit two places before the costume rack clears', purpose: 'Carry the open punchline to another mapped performance place.', task: 'places', count: 2 },
        { label: 'Greet 4 regulars before the next performance', purpose: 'Add a possible punchline to the traveling setup.', task: 'people', count: 4 },
      ] },
    },
    {
      cityId: 'ota',
      city: {
        title: 'The Ayo Board’s Extra Seat', desire: 'belonging',
        chapters: [
          { title: 'A player joins late', text: 'At Ota Neighbourhood Park, Temi Adebayo hosts a comic ayo match. A third friend arrives after the two rivals have begun and asks whether there is room to join. The players have built a playful story around their match and worry a new player will change the whole scene.' },
          { title: 'No one wants to be left out', text: 'You can play a round of ayo at the park or price the market at Sango-Ota Market while Temi asks what each friend hopes for.' },
          { title: 'Join the game or the story', text: 'They could make the newcomer watch, restart with a different game, or invite them to be the commentator who gives each move an absurd title. The newcomer says they would enjoy joining the story even if they are not ready to play.' },
          { title: 'A seat in the story', text: 'They choose the commentator role and let the newcomer invent a title for each player’s move. Soon the rivals are playing to earn funnier names. After the round, the newcomer asks to try a game too.' },
        ],
        approaches: [
          { label: 'Play ayo at Ota Neighbourhood Park', callback: 'You offered the late arrival a role in the story while keeping the match underway.' },
          { label: 'Price Sango-Ota Market before the match', callback: 'You let the newcomer choose a commentator role before trying the game.' },
          { label: 'Leave Temi a move-title idea', callback: 'You gave the late arrival a creative way into the friendly rivalry.' },
        ],
        dilemma: { prompt: 'The newcomer wants to join the story but is not ready to play. What lets them take part?', answers: ['Ask them to watch until the match ends.', 'Restart with a different game immediately.', 'Invite them to invent absurd titles for the players’ moves.'], correct: 2, explanation: 'The newcomer chose a commentator role, so the match can continue while they shape its story.' },
        closing: 'Temi records the most ridiculous move title and gives it to the newcomer to keep. The next match begins with a new commentator already seated.',
        keepsake: { name: 'Move-title rosette', description: 'A small paper rosette for the friend who gave each move a name.' },
      },
      country: {
        title: 'The Encore’s Unexpected Referee', desire: 'autonomy',
        chapters: [
          { title: 'A stranger calls the turns', text: 'The Many-Stops Encore challenge reaches Sango-Ota Market with a stage race. A volunteer referee starts calling every performer’s moves, including those who never asked for a referee. Temi Adebayo notices one troupe is following the calls while another has stopped its act.' },
          { title: 'Help can take over', text: 'The referee only wants to keep the race fair. The performers want to decide how their comic act moves, but nobody wants to insult the volunteer.' },
          { title: 'Offer a different role', text: 'They can tell the volunteer to leave, accept every call, or offer the referee a role as announcer while performers keep control of their own timing. Temi asks the troupes if they want an announcer.' },
          { title: 'Announce, do not decide', text: 'They choose an announcer. The volunteer gives each act a playful introduction, then lets the performers begin when ready. The troupe that paused restarts, and the volunteer enjoys the new role.' },
        ],
        approaches: [
          { label: 'Play a round of ayo at Ota Neighbourhood Park', callback: 'You helped change an unwanted referee into an announcer by choice.' },
          { label: 'Price the market at Sango-Ota Market', callback: 'You left performers in charge of when their act begins.' },
          { label: 'Leave Temi an announcer introduction', callback: 'You gave the volunteer a way to help without directing each move.' },
        ],
        dilemma: { prompt: 'The volunteer wants to help, but performers want to control their own timing. What role fits?', answers: ['Ask the volunteer to leave the event.', 'Offer an announcer role and let performers begin when ready.', 'Accept every referee call.'], correct: 1, explanation: 'The announcer role welcomes the volunteer’s help without taking control from performers.' },
        closing: 'Temi carries the announcer’s best introduction to the next stop. The troupe keeps its own starting cue.',
        keepsake: { name: 'Announcer’s whistle card', description: 'A card with a playful introduction and no authority to start the act.' },
      },
      missions: { daily: [
        { label: 'Play ayo before the extra-seat scene', purpose: 'Give the newcomer a chance to see how the comic match works.', task: 'practical', count: 1 },
        { label: 'Visit Sango-Ota Market before rehearsal', purpose: 'Let a late arrival join the story as commentator.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 2 regulars before the referee arrives', purpose: 'Hear whether the newcomer prefers playing or narrating first.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Play ayo three times before the next round', purpose: 'Give the commentator more moves to name.', task: 'practical', count: 3 },
        { label: 'Visit three places before the late player joins', purpose: 'Bring the late-arrival story to another mapped place.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the final game', purpose: 'Help the volunteer welcome each troupe without directing its timing.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'owerri',
      city: {
        title: 'The Amusement Park’s Mirror Mime', desire: 'recognition',
        chapters: [
          { title: 'A copy that copies back', text: 'At Imo Golf and Amusement Center, Adaeze Ugwu watches a mime perform with an imaginary mirror. A rival performer imitates every move so perfectly that the audience begins applauding the copy more than the original. The mime laughs, then wonders how to make their own role visible again.' },
          { title: 'A new move', text: 'You can spend an evening at Love Garden, IMSU, or walk through the amusement center while Adaeze asks the performers what they want.' },
          { title: 'Copy or contrast', text: 'The performers can stop the imitation, trade roles every few seconds, or let the original mime make one move the copy deliberately misunderstands. The original says they want the audience to see both performers, not just the trick.' },
          { title: 'Two different mirrors', text: 'They choose the misunderstood move. The original mimes a tiny bow; the copy turns it into an enormous stretch. The audience laughs at the contrast, and both performers take a separate bow before trying a new exchange.' },
        ],
        approaches: [
          { label: 'Spend an evening at Love Garden', callback: 'You helped each performer make a distinct move instead of competing for the same one.' },
          { label: 'Walk through the amusement center', callback: 'You turned perfect imitation into a comic misunderstanding.' },
          { label: 'Leave Adaeze a contrasting mime move', callback: 'You gave the audience a reason to notice both performers.' },
        ],
        dilemma: { prompt: 'The copy is getting more attention than the original. How can both roles be seen?', answers: ['Stop the imitation entirely.', 'Trade roles every few seconds.', 'Let the original make a move the copy deliberately misunderstands.'], correct: 2, explanation: 'A deliberate contrast gives both performers a distinct action the audience can notice.' },
        closing: 'Adaeze calls the new act “Two Mirrors, No Reflection.” The performers make a second version where the copy teaches the original a new move.',
        keepsake: { name: 'Mirror-mime coin', description: 'A paper coin with one tiny bow on one side and a huge stretch on the other.' },
      },
      country: {
        title: 'The Encore’s Runaway Curtain', desire: 'competence',
        chapters: [
          { title: 'The show starts too early', text: 'The Many-Stops Encore reaches Imo Golf and Amusement Center with a curtain that begins to close as soon as the first performer enters. Adaeze Ugwu sees the second performer still outside while the audience assumes the scene has ended.' },
          { title: 'A cue is not an ending', text: 'The curtain has a simple pull string, and the troupe uses it to mark the last scene. One performer suggests holding it open; another wants to remove it from the act. The lead still wants a dramatic closing.' },
          { title: 'Open, close, or hold', text: 'They can keep the curtain open throughout, remove it, or let the second performer hold the string until the final shared pose. Adaeze asks whether the curtain can help rather than interrupt the entrance.' },
          { title: 'The closing becomes a duet', text: 'They choose the hold. The second performer waits at the string, joins the scene, and closes the curtain after both actors take the final pose. The curtain now marks the ending they planned.' },
        ],
        approaches: [
          { label: 'Spend an evening at Love Garden, IMSU', callback: 'You gave the second performer control of the curtain until the shared ending.' },
          { label: 'Walk through Imo Golf and Amusement Center', callback: 'You let both performers reach the final pose before the curtain closed.' },
          { label: 'Leave Adaeze a closing-pose cue', callback: 'You gave the troupe a clear moment for the curtain to mark.' },
        ],
        dilemma: { prompt: 'The curtain begins closing before the second performer enters. How can it mark the end without interrupting the scene?', answers: ['Keep it open for the entire act.', 'Let the second performer hold the string until both reach the final pose.', 'Remove the curtain from the performance.'], correct: 1, explanation: 'The second performer can join the scene and close the curtain only after the shared ending.' },
        closing: 'Adaeze hears the curtain close after the applause begins. The rival troupe borrows the string-holder role for its own finale.',
        keepsake: { name: 'Curtain-pull ticket', description: 'A ticket marking the shared pose that begins the curtain’s final close.' },
      },
      missions: { daily: [
        { label: 'Walk through the park before the mirror mime', purpose: 'Give the performers time to compare the copy and original mime move.', task: 'discovery', count: 1 },
        { label: 'Visit Love Garden, IMSU before rehearsal', purpose: 'Let both performers create a contrast the audience can recognize.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the copycat scene', purpose: 'Hear what each wants the audience to notice.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Walk through the park three times before the mime finale', purpose: 'Give each mime a distinct move in the act.', task: 'discovery', count: 3 },
        { label: 'Visit two places before the mime changes', purpose: 'Try the new ending in a different mapped place.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the final gesture', purpose: 'Give a borrowed dance a finale owned by the new troupe.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'port-harcourt',
      city: {
        title: 'The Park’s Balloon Orchestra', desire: 'curiosity',
        chapters: [
          { title: 'A tune in the air', text: 'At Isaac Boro Park, Kelechi Amadi helps a clown orchestra prepare a balloon-powered finale. The troupe squeaks the balloons to make music, but every performer has a different pitch and they cannot agree on a melody. One balloon keeps producing a note no one can match.' },
          { title: 'Keep the odd note', text: 'You can walk through Isaac Boro Park or play a round of ayo at Port Harcourt Pleasure Park while Kelechi listens to the troupe try again.' },
          { title: 'Tune or improvise', text: 'The group could discard the mismatched balloon, ask everyone to copy its odd note, or make that note the start of a call-and-response where each performer adds a different sound. The performer holding the odd balloon wants it included.' },
          { title: 'A melody with room', text: 'They choose call-and-response. The odd note opens each round, then the others answer in turn. Their melody is lopsided but recognizable, and the performer with the unusual balloon gets to start every chorus.' },
        ],
        approaches: [
          { label: 'Walk through Isaac Boro Park and hear the tune', callback: 'You kept the odd note and let it open the chorus.' },
          { label: 'Play ayo at Pleasure Park before the act', callback: 'You gave every balloon a different sound in the response.' },
          { label: 'Leave Kelechi a chorus pattern', callback: 'You helped the performers build around the sound no one could match.' },
        ],
        dilemma: { prompt: 'The troupe wants to include the unmatched balloon note. What makes room for it?', answers: ['Discard the mismatched balloon.', 'Ask everyone to copy its note exactly.', 'Use it to start a call-and-response with different answers.'], correct: 2, explanation: 'The unusual note can lead a pattern without requiring every other performer to match it.' },
        closing: 'Kelechi calls the lopsided melody “Port Harcourt air-band.” The troupe’s rivals ask for a chorus of their own.',
        keepsake: { name: 'Odd-note balloon tag', description: 'A tag marking the balloon that opens each chorus.' },
      },
      country: {
        title: 'The Encore’s Misplaced Spotlight', desire: 'competence',
        chapters: [
          { title: 'The beam misses the mark', text: 'At Isaac Boro Park, Kelechi Amadi watches the Many-Stops Encore troupe rehearse a scene where an actor steps into a spotlight. The light operator points the beam at the empty mark after the actor has moved.' },
          { title: 'A moving target', text: 'The actor wants to keep improvising; the operator wants a fixed position to aim at. The rival troupe has offered to call the cue, but the pair has not agreed on a signal.' },
          { title: 'Choose a cue', text: 'They could freeze the actor in place, let the operator guess each move, or have the actor call “now” when ready and hold the pose for a beat. Kelechi asks which cue both people can repeat.' },
          { title: 'The beam finds its mark', text: 'They choose the spoken cue and a one-beat pose. The operator lands the light; then the actor adds a comic step just after it moves away. The rival troupe laughs and asks to try the same timing.' },
        ],
        approaches: [
          { label: 'Play at Pleasure Park before the light rehearsal', callback: 'You helped the actor and operator agree on a repeatable cue.' },
          { label: 'Visit Port Harcourt Pleasure Park during the scene practice', callback: 'You watched the moving mark become a shared timing joke.' },
          { label: 'Leave Temi a cue card for the next operator', callback: 'You gave the next pair a signal they can both use.' }
        ],
        dilemma: { prompt: 'How can the actor and operator coordinate without ending the improvisation?', answers: ['Keep the actor frozen on one mark.', 'Let the actor call “now” and hold for one beat.', 'Let the operator guess each new position.'], correct: 1, explanation: 'A shared cue lets the actor keep choosing movement while giving the operator a repeatable target.' },
        closing: 'Kelechi sends the one-beat cue onward with the spotlight scene.',
        keepsake: { name: 'One-beat cue card', description: 'A card with a tiny light symbol and one marked pause.' },
      },
      missions: { daily: [
        { label: 'Walk Isaac Boro Park before the balloon orchestra', purpose: 'Give the clown orchestra space to test its unusual note.', task: 'practical', count: 1 },
        { label: 'Visit Garden City Amusement Park before rehearsal', purpose: 'Let each performer add a different sound after the odd note.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the spotlight cue', purpose: 'Hear whether the unmatched note can lead the tune.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Play ayo three times before the next scene', purpose: 'Give the odd-note performer another chance to start the group.', task: 'discovery', count: 3 },
        { label: 'Visit three places before the beam finds its mark', purpose: 'Try the sound-and-gesture duet in a second mapped setting.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the operator’s cue', purpose: 'Let two players exchange a sound and gesture when a prop is missing.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'sagamu',
      city: {
        title: 'The Market’s Ayo Pairing Puzzle', desire: 'fairness',
        chapters: [
          { title: 'Two rivals, one partner', text: 'At Sagamu Market, Temi Adebiyi watches a ayo exhibition where two rivals each want to partner with the same new player. The newcomer smiles but has not chosen. Both rivals begin explaining why their style is easier to follow.' },
          { title: 'A choice becomes a contest', text: 'You can price the market or play a round of ayo at Sagamu Neighbourhood Park while Temi helps the newcomer think.' },
          { title: 'Let the player choose', text: 'The rivals could decide for the newcomer, take turns partnering without asking, or offer two short practice rounds and let the newcomer choose afterward. The new player says they would rather try both styles before deciding.' },
          { title: 'A partner picked freely', text: 'They play a short round with each rival. The newcomer chooses the second partner, then asks to play another round with the first later. Temi declares the tryout a success because nobody had to win the choice forever.' },
        ],
        approaches: [
          { label: 'Play a round of ayo at Sagamu Neighbourhood Park', callback: 'You gave the new player time to try both styles before choosing.' },
          { label: 'Price the market at Sagamu Market', callback: 'You helped the rivals make the choice reversible.' },
          { label: 'Leave Temi a practice-round idea', callback: 'You let the newcomer compare partners without making a permanent choice.' },
        ],
        dilemma: { prompt: 'The newcomer wants to try both playing styles before choosing a partner. What lets them do that?', answers: ['Let the rivals choose who partners with them.', 'Offer a short practice round with each and let the newcomer choose afterward.', 'Have both rivals take turns without asking.'], correct: 1, explanation: 'The newcomer asked to try both, and a short practice round makes the choice theirs.' },
        closing: 'Temi keeps the pairing open for future rounds. The rivals begin competing to invent the most helpful practice tip.',
        keepsake: { name: 'Partner-pick token', description: 'A two-sided token that lets the player choose which rival to try first.' },
      },
      country: {
        title: 'The Encore’s Borrowed Rhythm', desire: 'autonomy',
        chapters: [
          { title: 'A scene needs a pace', text: 'The Many-Stops Encore reaches Sagamu Market for a wordless comedy scene. Temi Adebayo sees the performers struggling to agree on how quickly the scene should move.' },
          { title: 'Fast or slow', text: 'One performer wants a brisk pace; another wants a longer pause so the audience can notice each gesture. The rival troupe offers to set a steady beat, but the pair has not chosen one.' },
          { title: 'Let the actors shape it', text: 'They can force one pace, let every performer choose a different speed, or use a simple hand sign to shift between brisk and slow sections. Temi asks which option gives the actors control while keeping the scene readable.' },
          { title: 'A pace that can change', text: 'They use the hand sign to switch pace. The fast section ends in a sudden slow-motion stare, and the audience laughs at the contrast. Each performer gets a chance to lead the change.' },
        ],
        approaches: [
          { label: 'Play a round of ayo at Sagamu Neighbourhood Park', callback: 'You helped the actors control when the pace changes.' },
          { label: 'Price the market at Sagamu Market', callback: 'You gave the scene a clear sign for shifting speed.' },
          { label: 'Leave Temi a pace-change cue', callback: 'You let the performers lead the transition.' }
        ],
        dilemma: { prompt: 'How can the actors change pace without losing a shared scene?', answers: ['Force everyone to use one pace.', 'Use a hand sign to shift between fast and slow.', 'Let every performer choose a different speed at any time.'], correct: 1, explanation: 'A shared sign lets the performers change pace together while still choosing when.' },
        closing: 'Temi sends the pace cue onward as a tool for the next silent act.',
        keepsake: { name: 'Pace-change card', description: 'A card showing a quick step beside a long pause.' },
      },
      missions: { daily: [
        { label: 'Play ayo before the pairing puzzle', purpose: 'Give the newcomer time to decide whether they want to try both partners.', task: 'practical', count: 1 },
        { label: 'Visit two places before the pace change', purpose: 'Let the new player compare the rivals’ styles before choosing.', task: 'places', count: 2 },
        { label: 'Greet 2 regulars before the partner switch', purpose: 'Hear what each partner wants to teach the newcomer.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Price the market three times before the next scene', purpose: 'Let the newcomer make a choice after testing each style.', task: 'discovery', count: 3 },
        { label: 'Visit Sagamu Neighbourhood Park before rehearsal', purpose: 'Carry the pairing story to another mapped venue.', task: 'practical-visit', count: 1 },
        { label: 'Greet 3 regulars before the silent act', purpose: 'Give a third performer a way to affect a duet without taking its center.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'sokoto',
      city: {
        title: 'The Baker’s Pretend Parade', desire: 'curiosity',
        chapters: [
          { title: 'A tray marches in', text: 'At Shanghai Bakers, Halima Suleiman helps a comedy troupe stage a parade of pretend pastries. The lead carries an empty tray and announces each invisible treat with grand ceremony. A rival keeps naming the treats before the lead can reveal them.' },
          { title: 'Who gets to name it?', text: 'You can browse hides, skins and leather trade at Central Market or browse farming and fishing at Sokoto karra cattle market while Halima asks the performers what they want.' },
          { title: 'Share the reveal', text: 'The lead could forbid guesses, let the rival name everything, or have the rival guess after each reveal and then let the lead confirm or invent a stranger answer. The lead says the guessing is fun as long as the final reveal stays theirs.' },
          { title: 'An invisible pastry parade', text: 'They choose the guess-and-reveal pattern. The rival guesses “cloud bun,” and the lead declares it a “moon-shaped puff.” The audience invents more names, but Halima keeps the lead’s final word as the bell that moves the parade along.' },
        ],
        approaches: [
          { label: 'Browse the Central Market before the act', callback: 'You let the rival guess while the lead kept the final reveal.' },
          { label: 'Browse the karra market and rehearse', callback: 'You made each invisible treat a shared guessing game.' },
          { label: 'Leave Halima a pretend pastry name', callback: 'You gave the lead a new reveal that remained theirs to choose.' },
        ],
        dilemma: { prompt: 'The lead enjoys guesses but wants the final reveal to stay theirs. What pattern fits?', answers: ['Let the rival name every treat.', 'Forbid guesses from the audience.', 'Invite a guess after each reveal, then let the lead confirm or invent the final name.'], correct: 2, explanation: 'The lead gets the final word while others can contribute guesses.' },
        closing: 'Halima announces the parade’s last treat: a “cloud bun with moon manners.” The rival troupe asks for one invisible pastry to take on tour.',
        keepsake: { name: 'Pretend-pastry ticket', description: 'A small ticket bearing the lead’s final invented treat name.' },
      },
      country: {
        title: 'The Encore’s Silent Auction', desire: 'fairness',
        chapters: [
          { title: 'A story without a score', text: 'The Many-Stops Encore reaches Central Market with a silent-act challenge: performers must pass an imaginary object without speaking. Halima Suleiman sees two troupes both claim the first turn.' },
          { title: 'Who moves first?', text: 'One troupe wants the younger performers to begin; the other says its own members travelled farther in the story and should lead. Nobody wants a judging panel to decide whose claim matters more.' },
          { title: 'A fair first move', text: 'They can pick a winner by applause, let the troupes alternate who begins in each round, or cancel the challenge. Halima suggests that the first move can be shared without deciding which troupe deserves it.' },
          { title: 'Pass the invisible parcel', text: 'They alternate: one troupe begins the first silent pass, the other begins the return. A performer mimes a parcel so fragile that every handoff becomes a comic slow-motion event. Both groups get to set the pace.' },
        ],
        approaches: [
          { label: 'Browse Central Market while the troupes settle the first turn', callback: 'You helped share who begins each round.' },
          { label: 'Visit Sokoto karra cattle market before the silent challenge', callback: 'You saw both groups shape the handoff.' },
          { label: 'Leave Halima a turn-taking cue', callback: 'You gave the troupes a way to share the opening.' }
        ],
        dilemma: { prompt: 'How can both troupes get a first move without ranking whose claim matters more?', answers: ['Let applause choose which troupe deserves to begin.', 'Alternate which troupe begins each round.', 'Cancel the challenge so neither can go first.'], correct: 1, explanation: 'Alternating gives each troupe the opening in one round without asking a judge to rank their claim.' },
        closing: 'Halima sends the imaginary parcel onward with a turn-taking cue clipped to its invisible wrapping.',
        keepsake: { name: 'Turn token', description: 'A flat token passed to whichever troupe opens the next round.' },
      },
      missions: { daily: [
        { label: 'Browse leather goods before the pretend parade', purpose: 'Give the lead time to decide how guesses fit the pretend pastry reveal.', task: 'practical', count: 1 },
        { label: 'Visit Sokoto karra cattle market before rehearsal', purpose: 'Let the rival guess and the lead invent the final reveal.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 2 regulars before the silent parcel', purpose: 'Hear how each person wants to contribute to the invisible parade.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse leather goods three times before the next act', purpose: 'Give the lead another chance to keep the final word.', task: 'practical', count: 3 },
        { label: 'Visit three places before the question travels', purpose: 'Bring the playful parade to another mapped market.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the turn-taking scene', purpose: 'Prepare a shared invention for the traveling encore.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'ilorin',
      city: {
        title: 'The Garden’s Costume Change Relay', desire: 'autonomy',
        chapters: [
          { title: 'A costume arrives late', text: 'At Diamond Park, Folake Adeyemi sees a performer run onstage wearing one boot from each costume. The performer meant to change outfits between sketches, but the rival troupe has already started its act. Both groups stop to decide whether to restart.' },
          { title: 'Two looks, one performer', text: 'You can spend an evening in Flower Garden or walk through Diamond Park while Folake asks what the performer wants to do.' },
          { title: 'A relay instead of a reset', text: 'They could cancel the act and change completely, pretend the mismatched boots were a mistake, or turn each boot into a signal for a different character. The performer wants to use both costumes but does not want to rush the change.' },
          { title: 'One boot, two characters', text: 'They choose the signals: one boot means the character is formal, the other means the character is ridiculous. The performer switches by turning one foot forward, then the other. The rival troupe responds with a matching change in posture.' },
        ],
        approaches: [
          { label: 'Spend an evening in Flower Garden', callback: 'You helped the performer use each boot as a clear signal for a character.' },
          { label: 'Walk through Diamond Park and test the switch', callback: 'You turned the costume change into a move rather than a delay.' },
          { label: 'Leave Folake a boot-switch cue', callback: 'You gave the performer a way to use both looks without rushing.' },
        ],
        dilemma: { prompt: 'The performer wants both costumes but has no time for a full change. What works?', answers: ['Cancel and change outfits completely.', 'Use each boot as a signal for a different character.', 'Pretend the mismatched boots were accidental.'], correct: 1, explanation: 'The signals let the performer use both costumes through a simple movement.' },
        closing: 'Folake calls the act “Two Shoes, Many Characters.” The performer adds a third persona whose only line is “check your other foot.”',
        keepsake: { name: 'Character-boot charm', description: 'A tiny charm with one formal boot and one ridiculous boot.' },
      },
      country: {
        title: 'The Encore’s Stacked Sound Cues', desire: 'curiosity',
        chapters: [
          { title: 'Two sounds collide', text: 'The Many-Stops Encore reaches Flower Garden as a troupe prepares a scene with a bell for surprise and a drum for a change of scene. Folake Adeyemi hears both cues played together, so the actors cannot tell what to do.' },
          { title: 'Which sound means what?', text: 'The bell player likes the surprise; the drummer wants the scene change to feel bold. They have rehearsed separately and assume the other sound will stop first.' },
          { title: 'Give each cue a place', text: 'They can remove one instrument, play both at once but louder, or assign each sound a different moment and let the actors practice the transition. Folake asks which sound should move the scene forward.' },
          { title: 'A cue the cast can read', text: 'They place the bell before the surprise and the drum after it. The actors respond to each sound in turn, and the rival troupe asks to try the sequence with its own instruments.' },
        ],
        approaches: [
          { label: 'Spend an evening in the garden at Flower Garden', callback: 'You helped give each sound a different moment.' },
          { label: 'Walk through the park at Diamond Park', callback: 'You saw the actors respond to the cues in order.' },
          { label: 'Leave Folake a two-sound cue card', callback: 'You gave the next troupe a sequence it can adapt.' }
        ],
        dilemma: { prompt: 'How can the actors tell the surprise cue from the scene-change cue?', answers: ['Remove one of the sounds.', 'Play both sounds together, but louder.', 'Give each sound its own moment and practice the transition.'], correct: 2, explanation: 'Separate moments make the cues distinguishable while keeping both performers’ ideas.' },
        closing: 'Folake writes the cue order on the travelling card and leaves the next city room to choose its sounds.',
        keepsake: { name: 'Two-sound cue card', description: 'A card with a bell symbol followed by a drum symbol.' },
      },
      missions: { daily: [
        { label: 'Walk through the park before the costume relay', purpose: 'Give the performer time to test the two character signals.', task: 'discovery', count: 1 },
        { label: 'Visit Diamond Park before rehearsal', purpose: 'Practice switching character by turning one boot forward.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the sound cues', purpose: 'Hear what the previous troupe and new wearer want from the costume.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Spend three evenings before the cue sequence', purpose: 'Give the performer a chance to make each boot signal clear.', task: 'practical', count: 3 },
        { label: 'Visit two places before the instruments change', purpose: 'Try the costume relay in another mapped place.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the next transition', purpose: 'Turn a borrowed costume detail into a useful part of a new act.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'jalingo',
      city: {
        title: 'The Market’s Imaginary Pet', desire: 'care',
        chapters: [
          { title: 'A pet with no leash', text: 'At Bando Market, Hannatu Yohanna meets a comedian who performs with an imaginary pet. The pet keeps wandering offstage during the act, and the comedian follows it while the audience waits for the punchline. The performer is not sure whether the audience understands that the pet is pretend.' },
          { title: 'A playful boundary', text: 'You can browse Taraba farming at Jalingo centre market or browse Taraba farming at Bando Market while Hannatu asks the performer what they want.' },
          { title: 'Invite or chase', text: 'The performer could chase the invisible pet through the whole scene, give it a pretend leash, or make a clear calling sound and let the audience imagine where it went. They want the pet to be mischievous, but the act should not confuse the younger watchers.' },
          { title: 'A sound from offstage', text: 'They choose a silly whistle and a paw-print mime. The audience understands the pet is imaginary and calls back when it wanders. The comedian lets the pet return only after everyone has guessed where it hid.' },
        ],
        approaches: [
          { label: 'Browse Taraba farming at Jalingo centre market', callback: 'You helped the comedian use a clear sound for an imaginary pet.' },
          { label: 'Browse Taraba farming at Bando Market', callback: 'You gave the audience a way to follow the pretend pet without a real prop.' },
          { label: 'Leave Hannatu a calling sound', callback: 'You offered a playful cue that kept the pet imaginary and understandable.' },
        ],
        dilemma: { prompt: 'The comedian wants the pet to wander but wants the audience to know it is pretend. What helps?', answers: ['Chase it through the whole scene.', 'Give it a pretend leash.', 'Use a clear silly whistle and mime its paw prints.'], correct: 2, explanation: 'The sound and mime make the imaginary pet legible without adding a real animal or prop.' },
        closing: 'Hannatu asks the audience where the pet should wander next. They choose an imaginary cupboard, and the comedian pretends to be surprised.',
        keepsake: { name: 'Invisible-paw token', description: 'A token stamped with a paw print for the pet that exists only in the act.' },
      },
      country: {
        title: 'The Encore’s Unfinished Soundtrack', desire: 'curiosity',
        chapters: [
          { title: 'A scene has no music', text: 'The Many-Stops Encore reaches Bando Market with a short silent scene ready for rehearsal. Hannatu Yohanna notices the performers disagree about what sound should accompany a character’s long walk.' },
          { title: 'Three possible moods', text: 'One wants a dramatic drumroll, another wants a cheerful tune, and a third thinks silence makes the walk funnier. They have time to test only one version before the next troupe takes the floor.' },
          { title: 'Let the scene answer', text: 'They can vote without trying anything, let the loudest performer choose, or act the walk three ways in quick succession and let the group notice which version changes the joke. Jatau reminds them that the scene belongs to the whole cast.' },
          { title: 'A walk that changes', text: 'They test each version. The silent walk turns into an exaggerated tiptoe, and the cast chooses it for this showing. They keep the other sounds as options for a future scene, so the choice is curious rather than permanent.' },
        ],
        approaches: [
          { label: 'Browse Jalingo Market before the rehearsal', callback: 'You helped the cast compare three different moods.' },
          { label: 'Walk through Mambilla Park during the scene practice', callback: 'You saw the same movement change with each sound.' },
          { label: 'Leave Jatau a note with the three options', callback: 'You kept the unused ideas available for another showing.' }
        ],
        dilemma: { prompt: 'How should the cast choose a soundtrack when it has time to test the options?', answers: ['Let the loudest performer decide.', 'Try the walk with each sound and compare the effect.', 'Vote before anyone rehearses it.'], correct: 1, explanation: 'A quick trial gives the cast direct experience of how each sound changes the scene.' },
        closing: 'The troupe writes “try it in the scene” on its travelling card for the next creative disagreement.',
        keepsake: { name: 'Three-mood card', description: 'A card with three blank sound symbols beside one walking figure.' },
      },
      missions: { daily: [
        { label: 'Browse Taraba farming before the soundtrack test', purpose: 'Give the comedian time to decide how to make the imaginary pet visible.', task: 'discovery', count: 1 },
        { label: 'Visit Jalingo centre market before rehearsal', purpose: 'Rehearse the pet’s clear whistle and paw-print mime.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the silent scene', purpose: 'Let the crowd help choose the imaginary pet’s next hiding place.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse Taraba farming three times before the next version', purpose: 'Let performers practice bringing the invisible pet back.', task: 'discovery', count: 3 },
        { label: 'Visit two places before the soundtrack returns', purpose: 'Carry the story between its two mapped market anchors.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the soundtrack choice', purpose: 'Give the next troupe a cue for bringing the imaginary pet back.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'jos',
      city: {
        title: 'The Sculpture Garden’s Statue Race', desire: 'autonomy',
        chapters: [
          { title: 'A statue that moves', text: 'At Dr. T. K. Gotul Peace Park, Grace Danjuma watches a statue performer in a freeze-frame contest. The performer keeps changing poses whenever the audience gasps. A rival insists the statue should hold still until the next cue, but the performer enjoys choosing when to move.' },
          { title: 'Stillness with a choice', text: 'You can spend an evening in Sculpture Garden or walk through the park while Grace asks the performer what kind of contest they want.' },
          { title: 'Hold, move, or surprise', text: 'They could require every performer to freeze, allow the statue to move whenever they choose, or let the audience give a cue while the performer decides whether to follow it. The performer says they like surprises but want to keep control of their pose.' },
          { title: 'An optional cue', text: 'They choose an audience cue that the performer may accept or ignore. When a child whispers “turn,” the statue chooses a slow spin. The rival statue copies the pose, then changes it into a wave.' },
        ],
        approaches: [
          { label: 'Spend an evening in Sculpture Garden', callback: 'You let the performer decide whether to follow an audience cue.' },
          { label: 'Walk through Dr. T. K. Gotul Peace Park', callback: 'You gave the statue a surprise without taking control of its pose.' },
          { label: 'Leave Grace an optional cue word', callback: 'You made the audience part of the act while keeping the performer in charge.' },
        ],
        dilemma: { prompt: 'The performer likes surprise but wants control of the pose. How can the audience contribute?', answers: ['Require every statue to freeze until a cue.', 'Let the audience offer cues the performer may accept or ignore.', 'Let the statue move whenever it wants without any audience cue.'], correct: 1, explanation: 'Optional cues invite the audience into the act while leaving the performer in control.' },
        closing: 'Grace declares the freeze-frame race a tie between stillness and a very slow spin. The performer chooses one last pose for the encore.',
        keepsake: { name: 'Pose-cue pebble', description: 'A smooth token the audience can offer as a cue, never a command.' },
      },
      country: {
        title: 'The Encore’s Vanishing Hat-Brim', desire: 'autonomy',
        chapters: [
          { title: 'A hat changes its shape', text: 'The Many-Stops Encore reaches Dr. T. K. Gotul Peace Park with a costume hat whose wide brim keeps covering the wearer’s face. Maimuna Gambo wants to keep the hat in the act, but cannot see the next performer’s cue.' },
          { title: 'Fix the hat or the cue?', text: 'The costume helper offers to trim the brim; another actor suggests changing the blocking so the wearer turns sideways. Maimuna says the performer should decide what happens to their costume.' },
          { title: 'Offer choices', text: 'They can cut the brim immediately, remove the hat from the scene, or test a folded brim and a new stage position before choosing whether to alter it. The wearer wants to try reversible changes first.' },
          { title: 'A clear sightline', text: 'They fold the brim for one entrance and shift the cue-giver to the wearer’s visible side. The performer can see the signal and keeps the original brim ready for a later scene. The rival troupe borrows the folded shape for its own comic entrance.' },
        ],
        approaches: [
          { label: 'Spend an evening in the garden at Sculpture Garden', callback: 'You helped test changes the wearer could undo.' },
          { label: 'Browse Terminus market before the next entrance', callback: 'You gave the performer time to choose how the hat should work.' },
          { label: 'Leave Maimuna a reversible costume idea', callback: 'You kept the original hat available for another scene.' }
        ],
        dilemma: { prompt: 'What should the troupe try when the wearer wants to keep the hat and see the cue?', answers: ['Trim the brim before asking the wearer.', 'Try a reversible fold and a new cue position.', 'Remove the hat from the act.'], correct: 1, explanation: 'Both changes can be tested without permanently altering the performer’s costume.' },
        closing: 'Maimuna adds a folded-paper brim sketch to the travelling kit as a reminder to test before changing.',
        keepsake: { name: 'Folded-brim sketch', description: 'A costume drawing with one reversible fold marked in pencil.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the statue race', purpose: 'Give the statue performer time to decide whether to follow an audience cue.', task: 'practical', count: 1 },
        { label: 'Visit Dr. T. K. Gotul Peace Park before rehearsal', purpose: 'Practice a cue that invites but does not command movement.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the folded-brim reveal', purpose: 'Hear how each statue wants to handle the audience’s cues.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Walk through the park three times before the hat returns', purpose: 'Give each performer a turn to accept or ignore a cue.', task: 'discovery', count: 3 },
        { label: 'Visit three places before the final pose', purpose: 'Try the living-statue act in another mapped setting.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the statue pose', purpose: 'Give the performer a comfortable way to change the frozen scene.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'umuahia',
      city: {
        title: 'The Garden Umbrella Ballet', desire: 'autonomy',
        chapters: [
          { title: 'A prop opens too soon', text: 'At Ulo ama Umuochoko, Ifeoma Anyanwu watches a dancer rehearse with a paper umbrella. It opens whenever the dancer tries a quick turn, blocking the audience’s view. A rival suggests removing the umbrella, but the dancer likes the surprise.' },
          { title: 'A turn with a choice', text: 'You can browse farm produce at Orie Ugba Market or spend a quiet evening at Ulo ama Umuochoko while Ifeoma helps the dancer test slower turns. The umbrella is a stage prop in the game, and the choreography belongs to the performer.' },
          { title: 'Hide, hold, or reveal', text: 'The dancer could leave the umbrella closed, ask a partner to hold it, or choose a turn where the opening becomes the cue for a pause. The performer says the pause should feel like a choice rather than a costume problem.' },
          { title: 'A pause beneath paper', text: 'They choose the opening cue. The umbrella blooms, the dancer freezes beneath it, and the rival enters as a dramatic gust of wind. The audience sees the prop and performer together instead of losing the dancer behind it.' },
        ],
        approaches: [
          { label: 'Browse farm produce at Orie Ugba Market', callback: 'You let the dancer choose when the umbrella opened.' },
          { label: 'Spend a quiet evening at Ulo ama Umuochoko', callback: 'You helped turn the opening umbrella into a cue for a chosen pause.' },
          { label: 'Leave Ifeoma a paper-umbrella turn', callback: 'You gave the dancer a way to keep the prop and remain visible.' },
        ],
        dilemma: { prompt: 'The dancer likes the umbrella but wants to remain visible when it opens. What can they do?', answers: ['Keep it closed throughout the dance.', 'Choose a turn that opens it into a pause, with the dancer beneath it.', 'Ask a partner to hold it for the whole act.'], correct: 1, explanation: 'The dancer keeps control of the prop and uses the opening as an intentional moment.' },
        closing: 'Ifeoma calls the pose “the paper moon.” The performer decides to keep the pause short, then invites the rival’s wind to blow it closed.',
        keepsake: { name: 'Paper-moon pin', description: 'A folded pin shaped like the umbrella at the top of its chosen pause.' },
      },
      country: {
        title: 'The Encore’s Sudden Weather', desire: 'autonomy',
        chapters: [
          { title: 'A breeze interrupts', text: 'The Many-Stops Encore challenge reaches Ulo ama Umuochoko with a paper set that keeps tipping over. Ifeoma Anyanwu finds the performers trying to hold the scenery in place while maintaining a serious scene.' },
          { title: 'The set is part of the act', text: 'One performer wants to stop and repair the scenery. Another suggests pretending the stage is windy, but the group has not agreed how far the scene may change.' },
          { title: 'Use the wobble', text: 'They can stop, ask the audience to hold the set, or let each performer react to the wobble in character. Ifeoma asks the troupe to choose a simple movement that keeps everyone clear of the falling scenery.' },
          { title: 'A wind with a rhythm', text: 'They choose a two-step sway away from the set, then freeze when it settles. The wobble becomes a comic weather report, and the performers no longer need to hold the scenery during every line.' },
        ],
        approaches: [
          { label: 'Browse Orie Ugba Market before rehearsal', callback: 'You helped the troupe choose a clear movement for the wobbling set.' },
          { label: 'Spend a quiet evening at Ulo ama Umuochoko', callback: 'You let the performers react in character while leaving the set alone.' },
          { label: 'Leave Ifeoma a wind-step cue', callback: 'You gave the troupe a repeatable way to play through a wobble.' },
        ],
        dilemma: { prompt: 'The paper scenery wobbles, and the performers need to keep clear of it. What can the troupe do?', answers: ['Keep holding the set while delivering every line.', 'Ask the audience to hold the scenery.', 'Use a two-step sway away from the set and freeze when it settles.'], correct: 2, explanation: 'The chosen movement gives the performers space and lets the wobble become part of the scene.' },
        closing: 'Ifeoma leaves the next city a weather cue that can be played without touching the scenery.',
        keepsake: { name: 'Wind-step ribbon', description: 'A ribbon marked with two steps and a freeze for a wobbly stage.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the umbrella ballet', purpose: 'Give the dancer time to describe how the umbrella should move.', task: 'discovery', count: 1 },
        { label: 'Visit Ulo ama Umuochoko before rehearsal', purpose: 'Rehearse the umbrella opening as a chosen pause.', task: 'discovery-visit', count: 1 },
        { label: 'Greet 2 regulars before the prop cue', purpose: 'Hear how the dancer and rival want the paper umbrella to work.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse farm produce three times before the scene change', purpose: 'Let the dancer test a visible pose beneath the open prop.', task: 'practical', count: 3 },
        { label: 'Visit two places before the final umbrella move', purpose: 'Try the paper-scene act in both mapped places.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the next act', purpose: 'Give performers a clear way to respond when the paper set wobbles.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'uyo',
      city: {
        title: 'The Unity Park Duet of Wrong Names', desire: 'curiosity',
        chapters: [
          { title: 'A name game goes sideways', text: 'At Unity Park, Ifiok Akpan hosts a duet in which two performers introduce each other with grand stage names. One keeps mixing them up, calling the other “Captain Moonbeam” and then “Doctor Thunder.” The audience loves the names, but the performers lose track of who is speaking.' },
          { title: 'A chorus of titles', text: 'You can browse Akpan Andem yam trade or spend a quiet evening at Unity Park while Ifiok asks the duo what they want. The names are invented for the act, and both performers want a chance to choose one.' },
          { title: 'Keep or swap', text: 'They could memorize one name each, let the audience assign their names, or choose a pair of names together and use a hand signal to show who speaks next. One performer likes “Doctor Thunder” but wants to name the other too.' },
          { title: 'A pair of titles', text: 'They choose “Doctor Thunder” and “Captain Moonbeam” together, then trade names midway through the act. A raised hand signals the swap. The audience laughs when both performers answer to both names, and the duet stays easy to follow.' },
        ],
        approaches: [
          { label: 'Browse Akpan Andem yam trade', callback: 'You let the duo choose their stage names together and signal the swap.' },
          { label: 'Spend a quiet evening at Unity Park', callback: 'You kept the playful names while making the speaking turn clear.' },
          { label: 'Leave Ifiok a hand-swap cue', callback: 'You gave the performers a visible signal for trading titles.' },
        ],
        dilemma: { prompt: 'The duo likes both silly names but keeps mixing up who speaks. What helps?', answers: ['Memorize one name each and never change.', 'Let the audience assign names without asking.', 'Choose a pair together and use a hand signal before swapping them.'], correct: 2, explanation: 'The performers choose the names and the visible cue clarifies when the swap happens.' },
        closing: 'Ifiok introduces them by both titles. The performers bow to each other, then swap names one more time just for the laugh.',
        keepsake: { name: 'Thunder-moon badge', description: 'A reversible badge with the duo’s two chosen stage names.' },
      },
      country: {
        title: 'The Encore’s Unclaimed Question', desire: 'curiosity',
        chapters: [
          { title: 'A question waits', text: 'The Many-Stops Encore reaches Unity Park with an audience question box for the next act. Ifiok Akpan finds several questions inside, but no performer knows which one the box is meant to answer.' },
          { title: 'Choose a starting point', text: 'One actor wants to answer the first slip; another wants the audience to choose. The rival troupe suggests answering them all, though rehearsal time is short.' },
          { title: 'Let the questioner choose', text: 'They can answer the first slip, answer every question, or read two short options aloud and let the audience choose which question begins the scene. Eno asks how to keep the rest for later.' },
          { title: 'A question starts the act', text: 'The audience picks one question. The actors improvise a brief scene around it, then return the remaining slips to the box for another troupe. Nobody has to decide what every question means at once.' },
        ],
        approaches: [
          { label: 'Browse Akpan Andem yam trade at Akpan Andem Market', callback: 'You helped the audience choose which question begins.' },
          { label: 'Browse Itam Market before the next act', callback: 'You kept the other questions available for another troupe.' },
          { label: 'Leave Eno a question-box cue', callback: 'You gave the next performers a simple way to start.' }
        ],
        dilemma: { prompt: 'How can the troupe choose one question without losing the others?', answers: ['Answer the first slip automatically.', 'Read two options and let the audience choose.', 'Try to answer every question in one rehearsal.'], correct: 1, explanation: 'A choice starts the scene while keeping the remaining questions for later.' },
        closing: 'Ifiok sends the question box onward with room for another troupe’s answer.',
        keepsake: { name: 'Question-box token', description: 'A paper token placed beside whichever question starts the scene.' },
      },
      missions: { daily: [
        { label: 'Browse yam before the duet question', purpose: 'Give the performers time to choose and practice their paired stage names.', task: 'practical', count: 1 },
        { label: 'Visit Unity Park before rehearsal', purpose: 'Rehearse the hand signal before the duo trades titles.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the question box opens', purpose: 'Hear which titles each person wants to use and share.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Spend three evenings before the next question', purpose: 'Let each performer answer to both chosen titles.', task: 'discovery', count: 3 },
        { label: 'Visit three places before the audience chooses', purpose: 'Try the duo act in a second mapped place.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the question-box scene', purpose: 'Give a performer an optional way to enter after an introduction.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'yenagoa',
      city: {
        title: 'The Field’s Paper Boat Parade', desire: 'autonomy',
        chapters: [
          { title: 'Boats without water', text: 'At Igbogene Field, Ine Pere meets a troupe planning a paper-boat parade across a dry stage. One performer wants to sail the boat with a long ribbon; another wants to carry it overhead like a tiny flag. Neither wants the other to decide.' },
          { title: 'Two ways to sail', text: 'You can browse fishing, farming and palm products at Onopa Market or spend a quiet evening at Igbogene Field while Ine listens to the performers.' },
          { title: 'Choose the captain', text: 'They could pick one captain, make a pair carry the boat together, or let the boat’s maker choose which movement to try first and switch after one lap. The maker says they want to see both ideas before settling.' },
          { title: 'One lap each', text: 'They let the maker choose the ribbon first, then switch to the overhead flag. The paper boat looks like it sails and then celebrates. The two performers laugh at how easily a dry-stage boat can change its destination.' },
        ],
        approaches: [
          { label: 'Browse Onopa Market and hear both boat ideas', callback: 'You let the boat’s maker choose which motion to try first.' },
          { label: 'Spend a quiet evening at Igbogene Field', callback: 'You helped the performers test both ways before settling on a parade.' },
          { label: 'Leave Ine a paper-boat route', callback: 'You gave the maker time to choose and then switch the movement.' },
        ],
        dilemma: { prompt: 'The maker wants to try both ways of moving the paper boat before choosing. What should the troupe do?', answers: ['Choose one captain for the whole parade.', 'Let the maker choose one lap, then switch to the other movement.', 'Make both performers carry it overhead together.'], correct: 1, explanation: 'A trial of each idea lets the maker compare them and choose without closing off the other performer’s contribution.' },
        closing: 'Ine awards the paper boat a map of two laps. It sails nowhere in particular, and both performers get to steer it.',
        keepsake: { name: 'Two-lap boat tag', description: 'A paper tag listing the ribbon lap and the flag lap.' },
      },
      country: {
        title: 'The Encore’s Borrowed Applause', desire: 'recognition',
        chapters: [
          { title: 'A quiet contribution', text: 'The Many-Stops Encore reaches Igbogene Field during a rehearsal of a comic courtroom scene. Ine Pere notices that one performer has prepared all the sound effects, but the audience only sees the actors at the front.' },
          { title: 'Who gets seen?', text: 'The sound-effect performer likes working from the side but wants the cast to recognize their contribution. A rival suggests bringing them into the middle of the scene, though that would change the part they enjoy.' },
          { title: 'Make the work visible', text: 'They can leave the role exactly as it is, replace the sound effects with a recording, or let the performer introduce one sound before choosing whether to return to the side. Ine asks how to honor the work without choosing the performer’s position for them.' },
          { title: 'A signature sound', text: 'The performer chooses to step forward for a short introduction, makes a dramatic “gavel” sound, then returns to the side for the rest. The actors echo the sound in their closing bow, making the unseen contribution part of the scene.' },
        ],
        approaches: [
          { label: 'Browse Onopa Market before the courtroom rehearsal', callback: 'You helped the performer choose how to present their contribution.' },
          { label: 'Visit Igbogene Field for the sound-effect scene', callback: 'You saw the cast acknowledge the work without changing the whole role.' },
          { label: 'Leave Ine a note about the signature sound', callback: 'You gave the performer an optional way to be recognized.' }
        ],
        dilemma: { prompt: 'How can the cast recognize the sound-effects performer while respecting the role they enjoy?', answers: ['Move them into the center for the whole scene.', 'Replace their work with a recording.', 'Offer a brief introduction, then let them choose their place.'], correct: 2, explanation: 'A short introduction recognizes the contribution and leaves the performer in control of the role.' },
        closing: 'The cast keeps the signature gavel sound as a cue for acknowledging backstage creativity.',
        keepsake: { name: 'Gavel-sound badge', description: 'A small badge shaped like a comic courtroom sound bubble.' },
      },
      missions: { daily: [
        { label: 'Spend an evening before the paper-boat parade', purpose: 'Give the paper-boat makers time to compare both movements.', task: 'discovery', count: 1 },
        { label: 'Visit Onopa Market before rehearsal', purpose: 'Let the maker choose and test the ribbon and flag laps.', task: 'practical-visit', count: 1 },
        { label: 'Greet 2 regulars before the delayed reveal', purpose: 'Hear who wants to carry it and who wants to call its route.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Browse palm goods three times before the boat route', purpose: 'Give each performer a turn at both movements.', task: 'practical', count: 3 },
        { label: 'Visit two places before the scene fork', purpose: 'Carry the parade story across its two mapped anchors.', task: 'places', count: 2 },
        { label: 'Greet 3 regulars before the next voyage', purpose: 'Let the next troupe share carrying and calling roles.', task: 'people', count: 3 },
      ] },
    },
    {
      cityId: 'yola',
      city: {
        title: 'The Race Course’s Gorilla Impression', desire: 'recognition',
        chapters: [
          { title: 'An impression steals focus', text: 'At Gorilla Park Yola, Ruth Tanko watches a comedian rehearse an impression of a stage character called the “Grand Gorilla.” The performer’s arms swing so broadly that the rest of the cast disappears behind them. A rival wants to copy the gesture, but the comedian wants their own character to remain distinct.' },
          { title: 'A smaller gesture', text: 'You can browse livestock and crop trade at Jimeta ultra modern market or spend a quiet evening at Gorilla Park Yola while Ruth asks what each performer wants.' },
          { title: 'Copy or contrast', text: 'The cast can all use the huge swing, ask the comedian to shrink the gesture, or give each character a different version: broad, tiny, and sideways. The comedian says they want the audience to recognize the original move first.' },
          { title: 'A move with variations', text: 'They give the original performer the broad opening, then invite the cast to vary it. One uses tiny waves; another turns sideways. The audience can trace the source move while each performer adds a personal twist.' },
        ],
        approaches: [
          { label: 'Browse livestock and crop trade', callback: 'You let the comedian introduce the broad gesture before others varied it.' },
          { label: 'Spend a quiet evening at Gorilla Park Yola', callback: 'You gave each performer a distinct variation of the first move.' },
          { label: 'Leave Ruth a gesture variation', callback: 'You helped the cast recognize the source and add their own style.' },
        ],
        dilemma: { prompt: 'The comedian wants the original broad move to remain recognizable while the cast adds its own style. What fits?', answers: ['Let everyone use the same broad swing.', 'Give the comedian the opening, then let others make distinct variations.', 'Ask the comedian to shrink the gesture.'], correct: 1, explanation: 'The original is established first, then variations let each performer contribute.' },
        closing: 'Ruth calls the act “One Big Move, Many Small Surprises.” The comedian keeps the opening gesture and lets the rival choose the final variation.',
        keepsake: { name: 'Gesture-variation badge', description: 'A badge showing a broad arm arc beside two smaller versions.' },
      },
      country: {
        title: 'The Encore’s Three-Word Welcome', desire: 'care',
        chapters: [
          { title: 'A welcome needs room', text: 'The Many-Stops Encore reaches Gorilla Park Yola with a troupe preparing a short welcome for the next city. Ruth Tanko hears three performers each suggest a different opening line.' },
          { title: 'Too many greetings', text: 'One wants a joke, one wants a sincere welcome, and one wants a question for the audience. They are running out of rehearsal time and worry that choosing one line will erase the others.' },
          { title: 'Build a shared opening', text: 'They can choose the funniest line, say all three at once, or give each performer one short phrase in sequence: welcome, joke, invitation. Ruth asks which order lets the audience follow and leaves each writer’s idea intact.' },
          { title: 'A clear invitation', text: 'They try the three phrases in order. The joke earns a laugh, then the question gives the audience a simple way to answer. All three writers hear their line in the opening, and the troupe sends the sequence onward.' },
        ],
        approaches: [
          { label: 'Browse Jimeta ultra modern market before rehearsal', callback: 'You helped fit three writers’ ideas into one sequence.' },
          { label: 'Visit Gorilla Park Yola during the welcome practice', callback: 'You saw the opening make room for a laugh and a response.' },
          { label: 'Leave Ruth a three-part cue', callback: 'You gave the next troupe a clear order for its welcome.' }
        ],
        dilemma: { prompt: 'How can the troupe keep each writer’s idea while making the welcome easy to follow?', answers: ['Use only the funniest line.', 'Speak all three lines at the same time.', 'Sequence welcome, joke, and invitation.'], correct: 2, explanation: 'A short sequence lets each contribution land without competing for the same moment.' },
        closing: 'Ruth sends the three-part welcome onward as an invitation the next troupe can adapt.',
        keepsake: { name: 'Three-part cue', description: 'A card with three simple marks for welcome, laugh, and response.' },
      },
      missions: { daily: [
        { label: 'Browse crops before the gorilla impression', purpose: 'Give the comedian time to introduce the broad character move.', task: 'practical', count: 1 },
        { label: 'Visit Gorilla Park Yola before rehearsal', purpose: 'Rehearse the original gesture before adding variations.', task: 'host-visit', count: 1 },
        { label: 'Greet 2 regulars before the welcome scene', purpose: 'Hear what the original comedian and the cast want recognized.', task: 'people', count: 2 },
      ], weekly: [
        { label: 'Spend three evenings before the next impression', purpose: 'Let the cast add distinct movements after the original opening.', task: 'discovery', count: 3 },
        { label: 'Visit three places before the three-word welcome', purpose: 'Carry the character introduction to another mapped venue.', task: 'places', count: 3 },
        { label: 'Greet 3 regulars before the next performance', purpose: 'Give the next troupe a distinct way to introduce an invented role.', task: 'people', count: 3 },
      ] },
    },
  ],
};

export default batch;
