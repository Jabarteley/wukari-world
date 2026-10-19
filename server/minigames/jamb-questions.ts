/**
 * OWNER: minigames (docs/MINI-GAMES.md)
 * THE JAMB SEASON'S QUESTION BANK: 120 original multiple-choice questions, 40 each of English, Maths and General knowledge. Every question was written for this
 * game; none is copied or adapted from a past paper, and the "JAMB season" is a revision game, not an exam or a promise about one.
 * Each row is [subject, question, the right answer, three wrong answers, why]. The right answer is written FIRST here and the four are put in a different order
 * for each person and question when they are served (`optionsOf`, a hash of the person's seed), so the position of the answer says nothing and the bank holds no
 * answer key by position. Server only: the browser is sent a question without its answer, and the answer only after it has chosen. Portable and pure.
 */
import type { JambSubject } from '../../src/types/minigames.ts';
import { hash } from '../house/lines.ts';

export type BankRow = readonly [JambSubject, string, string, readonly [string, string, string], string];

export const BANK: readonly BankRow[] = Object.freeze([
  // ---- English (0 to 39) ----
  ['english', 'Choose the word that completes the sentence: "Neither the teacher nor the students ___ present."', 'were', ['was', 'is', 'has been'], 'With "neither ... nor" the verb agrees with the nearer subject, and "students" is plural.'],
  ['english', 'Choose the word closest in meaning to "abundant".', 'plentiful', ['scarce', 'tiny', 'bitter'], '"Abundant" means existing in large quantities, which is plentiful.'],
  ['english', 'Choose the word opposite in meaning to "generous".', 'stingy', ['kind', 'rich', 'brave'], 'A generous person gives freely; a stingy person does not.'],
  ['english', 'Which sentence is correct?', 'She has been living here since 2019.', ['She has been living here since five years.', 'She has been living here for 2019.', 'She is living here since 2019.'], '"Since" goes with a point in time and the present perfect continuous.'],
  ['english', 'What is the plural of "criterion"?', 'criteria', ['criterions', 'criterias', 'criterion'], '"Criterion" comes from Greek and has the plural "criteria".'],
  ['english', 'What does "caught red-handed" mean?', 'caught in the act', ['caught after a long chase', 'caught with paint on the hands', 'caught by a police officer'], 'The idiom means found doing something wrong at the very moment.'],
  ['english', 'Which word is spelt correctly?', 'accommodation', ['accomodation', 'acommodation', 'accomodasion'], '"Accommodation" has a double c and a double m.'],
  ['english', 'Which of these words is a noun?', 'happiness', ['quickly', 'beautiful', 'rapidly'], 'A noun names a thing or a feeling; "happiness" names a feeling.'],
  ['english', 'Choose the correct verb: "Each of the boys ___ a book."', 'has', ['have', 'are having', 'were'], '"Each" is singular, so the verb is "has".'],
  ['english', 'Choose the word opposite in meaning to "ancient".', 'modern', ['old', 'historic', 'aged'], 'Ancient means very old; modern means of the present time.'],
  ['english', 'Which sentence is in the passive voice?', 'The meal was prepared by the cook.', ['The cook prepared the meal.', 'The cook is preparing the meal.', 'The cook will prepare the meal.'], 'In the passive voice the thing acted on ("the meal") is the subject.'],
  ['english', 'What is the prefix in the word "unhappy"?', 'un-', ['-py', 'hap-', '-happy'], 'A prefix is added at the beginning of a word; "un-" means not.'],
  ['english', 'Choose the correct form: "I look forward to ___ you."', 'seeing', ['see', 'saw', 'seen'], 'After "look forward to" the verb takes the -ing form.'],
  ['english', 'What do we call a person who writes poems?', 'a poet', ['a potter', 'a pilot', 'a painter'], 'A poet writes poems.'],
  ['english', 'What does the idiom "to bite the bullet" mean?', 'to face something unpleasant bravely', ['to eat very quickly', 'to refuse to fight', 'to be shot'], 'It means to get through a hard thing with courage.'],
  ['english', 'Choose the correct preposition: "She is good ___ mathematics."', 'at', ['in', 'on', 'for'], 'We say "good at" a subject.'],
  ['english', 'Which is written correctly?', 'It\'s raining.', ['Its raining.', 'Its\'raining.', 'It,s raining.'], '"It\'s" is the short form of "it is".'],
  ['english', 'What is the past tense of "teach"?', 'taught', ['teached', 'tought', 'teaches'], '"Teach" is an irregular verb: teach, taught, taught.'],
  ['english', 'Choose the word opposite in meaning to "victory".', 'defeat', ['triumph', 'success', 'win'], 'The opposite of winning is defeat.'],
  ['english', 'Which word means the same as "commence"?', 'begin', ['finish', 'delay', 'stop'], '"Commence" means to begin.'],
  ['english', 'Which sentence uses their, there and they\'re correctly?', 'They\'re going to put their books over there.', ['There going to put they\'re books over their.', 'Their going to put there books over they\'re.', 'They\'re going to put there books over their.'], '"They\'re" is they are, "their" shows ownership and "there" shows a place.'],
  ['english', 'A group of ships is called a ___.', 'fleet', ['herd', 'pack', 'bunch'], 'A fleet is a group of ships.'],
  ['english', 'Which of these words is an adverb?', 'slowly', ['slow', 'slowness', 'slower'], 'Adverbs often end in -ly and tell how something is done.'],
  ['english', 'Choose the correct form: "If I ___ you, I would apologise."', 'were', ['am', 'was', 'be'], 'In an unreal "if" clause, standard English uses "were".'],
  ['english', 'What does "benevolent" mean?', 'kind and helpful', ['angry and loud', 'weak and tired', 'proud and rude'], '"Benevolent" describes someone who wishes and does good for others.'],
  ['english', 'Choose the word closest in meaning to "rapid".', 'quick', ['slow', 'heavy', 'calm'], '"Rapid" means happening at great speed.'],
  ['english', 'Choose the correct form: "He is the ___ of the two brothers."', 'taller', ['tall', 'tallest', 'most tall'], 'We use the comparative ("taller") when two things are compared.'],
  ['english', 'Choose the correct word: "To ___ should I give the key?"', 'whom', ['who', 'whose', 'which'], '"Whom" is the object form and follows the preposition "to".'],
  ['english', 'What figure of speech is "The wind whispered through the trees"?', 'personification', ['simile', 'hyperbole', 'irony'], 'The wind is given the human action of whispering.'],
  ['english', 'What figure of speech is "as brave as a lion"?', 'a simile', ['a metaphor', 'a pun', 'irony'], 'A simile compares two things using "as" or "like".'],
  ['english', 'Choose the correct verb: "Tolu, together with his friends, ___ coming."', 'is', ['are', 'were', 'have'], 'The subject is "Tolu"; "together with his friends" does not make it plural.'],
  ['english', 'Which word rhymes with "light"?', 'night', ['lit', 'late', 'lift'], '"Light" and "night" share the same ending sound.'],
  ['english', 'Which word sounds the same as "write"?', 'right', ['wrote', 'writ', 'wrist'], '"Write" and "right" are homophones.'],
  ['english', 'Choose the correct verb: "The sun ___ in the east."', 'rises', ['rise', 'rising', 'risen'], 'A general truth uses the simple present, and "sun" takes "rises".'],
  ['english', 'Choose the correct word: "I have not seen him ___ last week."', 'since', ['for', 'from', 'by'], '"Since" is used with a point in time.'],
  ['english', 'A group of words with a subject and a verb that expresses a complete thought is a ___.', 'sentence', ['prefix', 'syllable', 'phrase'], 'A complete thought with a subject and a verb is a sentence.'],
  ['english', 'In which word is the first letter silent?', 'knife', ['kite', 'kettle', 'king'], 'The k in "knife" is not pronounced.'],
  ['english', 'Choose the correct verb: "Neither of the answers ___ correct."', 'is', ['are', 'were', 'have been'], '"Neither of" takes a singular verb in careful English.'],
  ['english', 'Choose the word opposite in meaning to "transparent".', 'opaque', ['clear', 'thin', 'bright'], 'Transparent things let light through; opaque things do not.'],
  ['english', 'Choose the correct word: "She arrived ___ the airport at noon."', 'at', ['in', 'on', 'to'], 'We say "arrive at" a small place such as an airport.'],
  // ---- Maths (40 to 79) ----
  ['maths', 'Evaluate 3/4 + 1/8.', '7/8', ['4/12', '5/8', '1 1/8'], '3/4 is 6/8, and 6/8 + 1/8 = 7/8.'],
  ['maths', 'What is 15% of 240?', '36', ['24', '32', '40'], '10% of 240 is 24 and 5% is 12, so 15% is 36.'],
  ['maths', 'Solve 2x + 7 = 21.', 'x = 7', ['x = 14', 'x = 10', 'x = 6'], '2x = 14, so x = 7.'],
  ['maths', 'What is the area of a rectangle 12 cm long and 5 cm wide?', '60 cm²', ['34 cm²', '17 cm²', '120 cm²'], 'Area = length × width = 12 × 5 = 60.'],
  ['maths', 'What is the perimeter of a square of side 9 cm?', '36 cm', ['81 cm', '18 cm', '27 cm'], 'Perimeter = 4 × 9 = 36.'],
  ['maths', 'What is 2⁵?', '32', ['10', '25', '64'], '2 × 2 × 2 × 2 × 2 = 32.'],
  ['maths', 'What is the square root of 144?', '12', ['14', '72', '11'], '12 × 12 = 144.'],
  ['maths', 'What is the lowest common multiple (LCM) of 4 and 6?', '12', ['24', '2', '10'], 'The smallest number that both 4 and 6 divide into is 12.'],
  ['maths', 'What is the highest common factor (HCF) of 18 and 24?', '6', ['3', '12', '72'], 'The largest number dividing both 18 and 24 is 6.'],
  ['maths', 'What is the mean of 4, 8, 12 and 16?', '10', ['12', '8', '40'], 'The sum is 40, and 40 ÷ 4 = 10.'],
  ['maths', 'Simplify 5a + 3a − 2a.', '6a', ['10a', '8a', '4a'], '5 + 3 − 2 = 6, so 6a.'],
  ['maths', 'Convert the binary number 101 to base ten.', '5', ['3', '7', '101'], '1 × 4 + 0 × 2 + 1 × 1 = 5.'],
  ['maths', 'A trader buys a bag for ₦800 and sells it for ₦1,000. What is the percentage profit?', '25%', ['20%', '200%', '12.5%'], 'The profit is ₦200, and 200 ÷ 800 = 25%.'],
  ['maths', 'Simplify the ratio 12 : 18.', '2 : 3', ['3 : 2', '4 : 5', '6 : 8'], 'Divide both by 6 to get 2 : 3.'],
  ['maths', 'Find the simple interest on ₦2,000 at 5% a year for 3 years.', '₦300', ['₦100', '₦450', '₦600'], 'Interest = 2,000 × 5 × 3 ÷ 100 = ₦300.'],
  ['maths', 'What do the angles of a triangle add up to?', '180°', ['90°', '270°', '360°'], 'The angles of any triangle add up to 180°.'],
  ['maths', 'What is the value of 3 − (−4)?', '7', ['−1', '1', '−7'], 'Taking away a negative is adding: 3 + 4 = 7.'],
  ['maths', 'If y = 3x − 2 and x = 4, what is y?', '10', ['12', '14', '8'], '3 × 4 − 2 = 10.'],
  ['maths', 'What is the mode of 2, 3, 3, 5, 7, 3, 9?', '3', ['2', '5', '9'], 'The mode is the value that appears most often, and 3 appears three times.'],
  ['maths', 'Write 0.25 as a fraction in its lowest terms.', '1/4', ['1/25', '2/5', '1/5'], '0.25 is 25/100, which simplifies to 1/4.'],
  ['maths', 'Express 2/5 as a percentage.', '40%', ['25%', '52%', '4%'], '2 ÷ 5 = 0.4, which is 40%.'],
  ['maths', 'What is the probability of getting a head when a fair coin is tossed once?', '1/2', ['1', '1/4', '2'], 'There are two equally likely outcomes, and one is a head.'],
  ['maths', 'Find the area of a circle of radius 7 cm. (Take π = 22/7.)', '154 cm²', ['44 cm²', '49 cm²', '308 cm²'], 'Area = πr² = 22/7 × 49 = 154.'],
  ['maths', 'What is the positive value of x if x² = 81?', '9', ['8', '18', '27'], '9 × 9 = 81.'],
  ['maths', 'Expand (x + 3)(x + 2).', 'x² + 5x + 6', ['x² + 6x + 5', 'x² + 6', '2x + 5'], 'x² + 2x + 3x + 6 = x² + 5x + 6.'],
  ['maths', 'What is the gradient of the line y = 5x + 1?', '5', ['1', '6', '−5'], 'In y = mx + c the gradient is m, which is 5.'],
  ['maths', 'How many seconds are there in 2 minutes?', '120', ['60', '100', '200'], '2 × 60 = 120.'],
  ['maths', 'What is the median of 5, 1, 9, 3, 7?', '5', ['3', '7', '9'], 'In order the numbers are 1, 3, 5, 7, 9, and the middle one is 5.'],
  ['maths', 'A shirt costs ₦5,000 and a 10% discount is given. What is the new price?', '₦4,500', ['₦4,000', '₦4,900', '₦5,500'], '10% of 5,000 is 500, and 5,000 − 500 = 4,500.'],
  ['maths', 'What do the interior angles of a quadrilateral add up to?', '360°', ['180°', '540°', '720°'], 'A quadrilateral splits into two triangles: 2 × 180° = 360°.'],
  ['maths', 'Write 4,500 in standard form.', '4.5 × 10³', ['4.5 × 10²', '4.5 × 10⁴', '45 × 10³'], '4,500 = 4.5 × 1,000 = 4.5 × 10³.'],
  ['maths', 'If 3 pens cost ₦450, how much do 5 pens cost at the same price?', '₦750', ['₦600', '₦900', '₦1,250'], 'One pen is ₦150, so five pens are ₦750.'],
  ['maths', 'A car travels at 60 km/h for 2½ hours. How far does it go?', '150 km', ['120 km', '62.5 km', '24 km'], 'Distance = speed × time = 60 × 2.5 = 150.'],
  ['maths', 'Factorise x² − 9.', '(x − 3)(x + 3)', ['(x − 3)²', '(x − 9)(x + 1)', '(x + 9)(x − 1)'], 'It is a difference of two squares: x² − 3² = (x − 3)(x + 3).'],
  ['maths', 'What is 5! (five factorial)?', '120', ['25', '60', '20'], '5 × 4 × 3 × 2 × 1 = 120.'],
  ['maths', 'Find the circumference of a circle of radius 14 cm. (Take π = 22/7.)', '88 cm', ['44 cm', '176 cm', '616 cm'], 'Circumference = 2πr = 2 × 22/7 × 14 = 88.'],
  ['maths', 'Which of these numbers is the greatest?', '0.45', ['0.4', '0.405', '0.04'], 'Writing them as 0.450, 0.400, 0.405 and 0.040 shows 0.45 is the greatest.'],
  ['maths', 'Solve x/4 = 6.', 'x = 24', ['x = 1.5', 'x = 10', 'x = 2'], 'Multiply both sides by 4: x = 24.'],
  ['maths', 'What is the next number in the pattern 2, 6, 18, 54, ...?', '162', ['108', '72', '148'], 'Each number is three times the one before: 54 × 3 = 162.'],
  ['maths', 'How many edges does a cube have?', '12', ['6', '8', '10'], 'A cube has 12 edges, 8 corners and 6 faces.'],
  // ---- General knowledge (80 to 119) ----
  ['general', 'What is the capital of Nigeria?', 'Abuja', ['Lagos', 'Kano', 'Ibadan'], 'Abuja in the Federal Capital Territory has been the capital since 1991.'],
  ['general', 'In which year did Nigeria become independent?', '1960', ['1957', '1963', '1966'], 'Nigeria became independent on 1 October 1960.'],
  ['general', 'Which river joins the River Niger at Lokoja?', 'the Benue', ['the Ogun', 'the Cross River', 'the Yobe'], 'The Benue meets the Niger at Lokoja, forming a Y-shaped confluence.'],
  ['general', 'What is the longest river in Africa?', 'the Nile', ['the Niger', 'the Congo', 'the Zambezi'], 'The Nile is the longest river in Africa.'],
  ['general', 'Which is the largest continent by area?', 'Asia', ['Africa', 'Europe', 'South America'], 'Asia is the largest continent.'],
  ['general', 'What is the chemical formula of water?', 'H₂O', ['CO₂', 'O₂', 'NaCl'], 'A water molecule has two hydrogen atoms and one oxygen atom.'],
  ['general', 'How many states does Nigeria have?', '36', ['30', '32', '40'], 'Nigeria has 36 states and the Federal Capital Territory.'],
  ['general', 'What is the official language of Nigeria?', 'English', ['Hausa', 'Yoruba', 'French'], 'English is the official language, used in government and schools.'],
  ['general', 'Which planet is closest to the Sun?', 'Mercury', ['Venus', 'Mars', 'Earth'], 'Mercury is the innermost planet.'],
  ['general', 'Which is the largest ocean?', 'the Pacific Ocean', ['the Atlantic Ocean', 'the Indian Ocean', 'the Arctic Ocean'], 'The Pacific is the largest and deepest ocean.'],
  ['general', 'Which gas do plants take in for photosynthesis?', 'carbon dioxide', ['oxygen', 'nitrogen', 'hydrogen'], 'Plants use carbon dioxide, water and light to make food.'],
  ['general', 'Who wrote the novel "Things Fall Apart"?', 'Chinua Achebe', ['Wole Soyinka', 'Ben Okri', 'Buchi Emecheta'], 'Chinua Achebe published it in 1958.'],
  ['general', 'Who was the first African to win the Nobel Prize in Literature?', 'Wole Soyinka', ['Chinua Achebe', 'Nadine Gordimer', 'Naguib Mahfouz'], 'Wole Soyinka of Nigeria won it in 1986.'],
  ['general', 'What is the currency of Ghana?', 'the cedi', ['the naira', 'the shilling', 'the rand'], 'Ghana\'s currency is the cedi.'],
  ['general', 'What is the currency of Kenya?', 'the Kenyan shilling', ['the naira', 'the cedi', 'the rand'], 'Kenya uses the Kenyan shilling.'],
  ['general', 'What is the capital of Ghana?', 'Accra', ['Kumasi', 'Lomé', 'Abidjan'], 'Accra is the capital and largest city of Ghana.'],
  ['general', 'What is the capital of Kenya?', 'Nairobi', ['Mombasa', 'Kampala', 'Dodoma'], 'Nairobi is Kenya\'s capital.'],
  ['general', 'Which country hosted the 2010 FIFA World Cup, the first on African soil?', 'South Africa', ['Nigeria', 'Egypt', 'Morocco'], 'South Africa hosted the tournament in 2010.'],
  ['general', 'How many days are there in a leap year?', '366', ['365', '364', '367'], 'A leap year has an extra day, 29 February.'],
  ['general', 'Which organ pumps blood around the body?', 'the heart', ['the lungs', 'the liver', 'the kidney'], 'The heart is the pump of the circulatory system.'],
  ['general', 'Which of these animals is a mammal?', 'the whale', ['the shark', 'the trout', 'the crocodile'], 'Whales breathe air and feed their young with milk, like all mammals.'],
  ['general', 'Which is the nearest star to the Earth?', 'the Sun', ['Polaris', 'Sirius', 'Venus'], 'The Sun is a star, and it is the closest one to us.'],
  ['general', 'What does a speedometer in a car show?', 'speed', ['temperature', 'mass', 'volume'], 'A speedometer shows how fast the vehicle is moving.'],
  ['general', 'In which country is Mount Kilimanjaro?', 'Tanzania', ['Nigeria', 'Egypt', 'Ghana'], 'Kilimanjaro, Africa\'s highest mountain, is in Tanzania.'],
  ['general', 'Which Nigerian city is nicknamed the "Centre of Excellence"?', 'Lagos', ['Kano', 'Jos', 'Enugu'], 'Lagos State uses the nickname "Centre of Excellence".'],
  ['general', 'The famous Zuma Rock is close to which Nigerian city?', 'Abuja', ['Lagos', 'Calabar', 'Owerri'], 'Zuma Rock stands beside the road to Abuja.'],
  ['general', 'What are the colours of the Nigerian flag?', 'green and white', ['green and yellow', 'red and white', 'blue and green'], 'The flag has two green bands and a white band between them.'],
  ['general', 'Which gas do humans need to breathe in to stay alive?', 'oxygen', ['helium', 'argon', 'methane'], 'Our bodies use oxygen to release energy from food.'],
  ['general', 'Which is the fastest land animal?', 'the cheetah', ['the lion', 'the horse', 'the elephant'], 'A cheetah can run faster than any other land animal.'],
  ['general', 'How many continents are there in the usual count?', '7', ['5', '6', '9'], 'The usual count is Africa, Antarctica, Asia, Australia (Oceania), Europe, North America and South America.'],
  ['general', 'What colour do you get by mixing blue and yellow paint?', 'green', ['purple', 'orange', 'pink'], 'Blue and yellow paints make green.'],
  ['general', 'Which of these is a primary colour of light?', 'red', ['orange', 'pink', 'brown'], 'The primary colours of light are red, green and blue.'],
  ['general', 'The Super Eagles are the national football team of which country?', 'Nigeria', ['Ghana', 'Cameroon', 'Senegal'], 'Nigeria\'s national football team is nicknamed the Super Eagles.'],
  ['general', 'The Africa Cup of Nations is a competition in which sport?', 'football', ['basketball', 'athletics', 'tennis'], 'AFCON is the continent\'s football championship for national teams.'],
  ['general', 'At what temperature does pure water boil at sea level?', '100°C', ['0°C', '50°C', '150°C'], 'Water boils at 100 degrees Celsius at sea level.'],
  ['general', 'Which of these is a renewable source of energy?', 'solar power', ['coal', 'petrol', 'diesel'], 'The Sun keeps shining, so solar power is renewable.'],
  ['general', 'The Niger Delta is best known for producing which resource?', 'crude oil', ['diamonds', 'wheat', 'tea'], 'Most of Nigeria\'s crude oil comes from the Niger Delta.'],
  ['general', 'Which is the largest country in Africa by area?', 'Algeria', ['Nigeria', 'Egypt', 'Ghana'], 'Algeria has been the largest country in Africa by area since 2011.'],
  ['general', 'Which instrument measures temperature?', 'a thermometer', ['a barometer', 'a ruler', 'a voltmeter'], 'A thermometer measures how hot or cold something is.'],
  ['general', 'Who is the head of the federal government of Nigeria?', 'the President', ['a Governor', 'the Senate President', 'an Emir'], 'Nigeria has an executive President who heads the federal government.'],
] as BankRow[]);

export const BANK_SIZE = BANK.length;
export const SUBJECTS: readonly JambSubject[] = ['english', 'maths', 'general'];
/** The ids of a subject's questions. */
export const idsOf = (subject: JambSubject): number[] => BANK.flatMap((row, id) => (row[0] === subject ? [id] : []));

/** The four answers of a question in the order this person sees them, and where the right one sits. Repeatable. */
export function optionsOf(id: number, seed: string): { options: string[]; answer: number } | null {
  const row = BANK[id];
  if (!row) return null;
  const all = [row[2], ...row[3]];
  const order = all.map((text, at) => ({ text, at, key: hash(`${seed}|${id}|${at}`) })).sort((a, b) => a.key - b.key || a.at - b.at);
  return { options: order.map((entry) => entry.text), answer: order.findIndex((entry) => entry.at === 0) };
}
