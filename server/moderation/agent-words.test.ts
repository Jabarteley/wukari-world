/**
 * The words an AI character may say to a person (agent-words.ts): every category is refused in English, Nigerian English and Pidgin,
 * disguised spellings are read, flirting is refused only with `toMinor`, and ordinary talk (a shopkeeper, the game's places) passes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { agentWords, textsIn } from './agent-words.ts';

const refused = (text: string, code: string, toMinor = false): void => {
  const verdict = agentWords(text, { toMinor });
  assert.equal(verdict.ok, false, `should be refused: ${text}`);
  if (!verdict.ok) { assert.equal(verdict.code, code, `${text} → ${verdict.code}`); assert.ok(verdict.reason.length > 10); }
};
const passes = (text: string, toMinor = false): void => {
  const verdict = agentWords(text, { toMinor });
  assert.equal(verdict.ok, true, `should pass: ${text}${verdict.ok ? '' : ` (${verdict.code})`}`);
};

test('asking a person for money, airtime or gifts is refused', () => {
  for (const text of [
    'Send me money please', 'can you send me some money', 'give me 5000 naira', 'Pay me 5k', 'pay me', 'please lend me cash', 'borrow me small money',
    'abeg send me money', 'abeg send small money for transport', 'abeg help me with money', 'oya dash me something', 'dash me', 'drop something for me',
    'send me airtime', 'buy me airtime', 'recharge me 500', 'I need money', 'i dey need cash', 'we want funds', 'send money to my account', 'transfer 5000 into my wallet',
    'what is your account number', 'my account number is', 'drop your acct no', 'opay details abeg', 'fund me', 'sponsor my business', 'invest in me',
    'double your money in a day', 'buy bitcoin with me', 'send me ₦2000', 'Send me N5k', 'give me 2000', 'S e n d  m e  m o n e y', 'send me m0ney', 'sennnd me moooney',
    'send me your card pin', 'share your password',
  ]) refused(text, 'agent_words_money');
});

test('asking for, or giving, a phone number, address, handle, location, name or photo is refused', () => {
  for (const text of [
    'What is your number?', 'give me your number', 'drop your number', 'wetin be your number', 'wetin be your whatsapp', 'whats ur phone', 'send me your location', 'share your address',
    'tell me your real name', 'what is your full name', 'send me a pic of you', 'send your selfie', 'how old are you', 'how old you be', 'what is your age',
    'my number is 0803 123 4567', 'call me on 08031234567', 'my phone number na 080', 'my whatsapp', 'my email', 'my address', 'reach me at ada@example.com', '+234 803 123 4567',
    'zero eight zero three one two three four five six seven', 'whatsapp me', 'dm me', 'inbox me', 'contact me on telegram', 'add me on snapchat', 'you get whatsapp?', 'do you have a phone number',
    'make we exchange numbers', 'lets continue on whatsapp', 'lets talk on telegram', 'I am on instagram', 'follow @ada_lovely', 'add me @ada22', 'telegram: adaobi_x',
    'where do you live', 'where you dey stay', 'I live at 12 Adeola Street', 'No 4 Ogunlana Close', 'my house address is', 'Send me your w h a t s a p p', 'drop your n u m b e r',
  ]) refused(text, 'agent_words_contact');
});

test('a link is refused', () => {
  for (const text of ['visit www.example.com', 'go to https://x.co/a', 'buy at shop.ng', 'check example dot com']) refused(text, 'agent_words_link');
});

test('meeting or moving the chat outside the game is refused', () => {
  for (const text of [
    'Let us meet in real life', 'meet me outside', 'lets link up outside', 'come to my house', 'come to my side', 'come my side', 'come see me tomorrow', 'make we meet',
    'meet me at the hotel', 'I want to meet you irl', 'see you in person', 'lets hang out', 'oya link me up', 'I go come your house', 'let me come to your place', 'I will pick you up',
    'meet offline', 'talk offline', 'let us chat off the game', 'visit me physically', 'i wan meet you', 'abeg make we meet', 'meet outside the game',
  ]) refused(text, 'agent_words_meet');
});

test('sexual words and invitations are refused, also spelt around', () => {
  for (const text of ['send nudes', 'you are sexy', 'I am horny', 'let us have sex', 's e x', 's3x chat', 'sleep with me', 'want to make love', 'show me your boobs', 'na yansh', 'sugar daddy needed', 'porn', 'naaaked']) refused(text, 'agent_words_sexual');
});

test('claiming to be a human or not an AI is refused', () => {
  for (const text of [
    'I am a real person', "I'm human", 'i am human', 'I am not a bot', "I'm not an AI", 'im not a robot', 'No bot here', 'I no be bot', 'na real person dey type', 'i be person',
    'I am a human being like you', 'as a human I think', 'we humans', 'you are talking to a real person', 'In my real life I am a nurse', 'I am a real man', 'iamnotanai', 'I a m h u m a n',
  ]) refused(text, 'agent_words_human');
});

test('secrecy is refused', () => {
  for (const text of ['this is our little secret', "don't tell your parents", 'keep it a secret', 'dont tell anyone', 'just between you and me']) refused(text, 'agent_words_secret');
});

test('flirting and romance are refused only for a person who is under 18 or has not said they are an adult', () => {
  for (const text of [
    'hey babe', 'my love', 'Hello sweetheart', 'you are so beautiful', 'you look hot', 'be my girlfriend', 'will you marry me', 'I love you', 'i miss you', 'send a kiss', 'wanna go on a date?', 'you are so cute', 'darling',
    'I have a crush on you', 'hi ❤️', 'see you 😘', 'my bae', 'fine girl', 'you are my crush',
  ]) { refused(text, 'agent_words_romance', true); passes(text, false); }
});

test('ordinary talk passes', () => {
  for (const text of [
    'I sell phones', 'I sell phone cases and chargers', 'Meet at the Square in the game', 'Meet at the Square in the game at six', 'The market is open', 'My number one customer is Ada', 'Your number one fan is here',
    'Welcome! What would you like to buy?', 'How are you today?', 'That will be 2,500 naira', 'The price is ₦1,500 for the bag', 'Give me a moment', 'Send me a message when you arrive', 'Please pay at the counter',
    'Pay at the till and I will wrap it', 'I walked 3 hours on the road', 'It is 10 minutes by road', 'You can send money to a friend from their card in Messages', 'Transfer your savings to the deposit in the bank tab',
    'I hope you are well', 'Do you want to play ludo?', 'Let us play a game at the table', 'Let us meet at the cinema in the game', 'See you tomorrow', 'See you at the match', 'Come back later, the shop opens at 9',
    'The wedding hall is on the left', 'Valentine promos start soon', 'We love jollof here', 'I love jollof rice', 'chicken breast with rice', 'Dick is my cousin', 'It is a long hot day', 'The tea is hot',
    'Call me Tola', 'Text me back in the game', 'I am a trader', 'I am a tailor from Yaba', 'I am an AI character, ask me about the market', 'I am an AI agent', 'Do not worry, I am a game character',
    '@Ada welcome', 'Welcome @Ada', 'My phone is on charge', 'Phones are on sale', 'I sell recharge cards at the kiosk', 'airtime is cheaper today', 'The street is busy', 'Take the number 5 bus', 'Number 4 hall',
    'Ada, your number is up for the draw', 'what is your plan today', 'what is your name', 'Which city do you want to visit?', 'how do I get a job', 'It costs 1500, 2000 or 2500', 'I am real tired today',
    'Please take off your shoes at the door.', 'Essex and Sussex are in England', 'The assessment is at noon', 'I like you being here', 'We offer data bundles in the shop', 'You can find me at the Square in the game',
  ]) passes(text);
  // And nothing in the romance list catches a sentence about food, honey, babies or dates the fruit when the person is an adult-or-unknown minor is not the concern here.
  for (const text of ['I sell honey and dates', 'The baby is asleep', 'Sugar is cheap today', 'Welcome to the date palm stall']) passes(text);
});

test('non-text and empty input pass; textsIn finds free text but not ids', () => {
  assert.deepEqual(agentWords(undefined), { ok: true });
  assert.deepEqual(agentWords(''), { ok: true });
  assert.deepEqual(agentWords(42), { ok: true });
  assert.deepEqual(textsIn({ id: 'MR-12', to: '3f2a9c1e-1111-4222-8333-444455556666', note: 'send me money', nested: [{ a: 'hello there' }, 5, null], phone: '08031234567' }).sort(), ['08031234567', 'hello there', 'send me money']);
});
