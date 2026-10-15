/**
 * OWNER: agents (residents, docs/RESIDENTS.md "Residents everywhere")
 * THE RESIDENT GENERATOR. Portable and pure (no Node imports, no storage, no clock). For every open city it makes up to five residents, the same ones every time, from a
 * seed (city id + slot): `generateResident(city, slot)` is a function of its two arguments and nothing else, so a restart, another host or a test draws the same people.
 *
 * What is drawn, from tables below: a name from the region's pool (invented given names, common in that part of the world; never a real public figure's), an age (21 to 75), a
 * job fitted to the age and to what every city has (a market, a clinic, a workshop, an eatery, a park, a hall of worship, a transit hub, the notice house), a faith or none, a
 * family situation, likes and dislikes, one private goal, temperament (the eight numbers of persona.ts, drawn from different bands for the residents of one city), a way of
 * speaking with the local words of the region, a sleep schedule and working hours in the city's own time, and a first-person life story built from all of that. The
 * story is composed on first use (a getter) so a thousand residents cost almost nothing until a model needs one.
 *
 * The authored thirty (life.ts, roster.ts) keep the first slots of their cities (`rosterFor`); generated residents fill the rest.
 * Nothing here says what a resident is made of: the words AI, model, game, player, assistant and prompt never appear (the test checks every story of every city).
 */
import type { HouseLook } from '../house/cast.ts';
import type { Resident } from './life.ts';
import { derivePersona, hash, LIKES, pickOf, stream, TONGUES } from './persona.ts';
import type { Faith, Persona, Style } from './persona.ts';

export interface CityFacts { id: string; name: string; iso: string; lon: number; lat: number }

// ---- regions ---------------------------------------------------------------------------------------------------------------------------------------
type Region = 'yoruba' | 'igbo' | 'hausa' | 'akan' | 'wafr' | 'cafr' | 'swahili' | 'horn' | 'safr' | 'ioc' | 'arab' | 'gulf' | 'persian' | 'turkic' | 'hebrew' | 'sasia' | 'seasia' | 'chinese' | 'japan' | 'korea' | 'pacific' | 'caribbean' | 'spanish' | 'portuguese' | 'anglo' | 'french' | 'germanic' | 'italian' | 'greek' | 'slavic' | 'baltic' | 'magyar' | 'caucasus';
const regionList = (region: Region, codes: string): [string, Region][] => codes.split(' ').map((iso) => [iso, region]);
const REGION_OF: ReadonlyMap<string, Region> = new Map<string, Region>([
  ...regionList('akan', 'gh'), ...regionList('wafr', 'ci sn ml bf ne gn gw gm sl lr mr cv tg bj'), ...regionList('cafr', 'cm cg cd ga gq cf td st ao'), ...regionList('swahili', 'ke tz ug rw bi km'), ...regionList('horn', 'et er dj so ss sol'),
  ...regionList('safr', 'za bw zw zm mw mz na ls sz'), ...regionList('ioc', 'mg mu sc'), ...regionList('arab', 'dz ma tn ly eg eh sd'), ...regionList('gulf', 'ae sa qa kw bh om jo lb sy iq ye ps'), ...regionList('persian', 'ir af tj'),
  ...regionList('turkic', 'tr az tm uz kz kg mn cyn'), ...regionList('hebrew', 'il'), ...regionList('sasia', 'in pk bd lk np bt mv'), ...regionList('seasia', 'id my sg bn th vn ph kh la mm tl'), ...regionList('chinese', 'cn tw hk mo'),
  ...regionList('japan', 'jp'), ...regionList('korea', 'kr kp'), ...regionList('pacific', 'fj ws to vu sb pg ki nr tv mh fm pw nu ck as pf nc gu mp wf pn nf'),
  ...regionList('caribbean', 'jm bb tt bs ag dm gd kn lc vc ky bm tc vg vi ai ms gy bz aw cw sx mf bl ht'), ...regionList('spanish', 'es mx ar cl co pe ve ec bo py uy cu do pr gt sv hn ni cr pa ad'), ...regionList('portuguese', 'pt br'),
  ...regionList('anglo', 'gb ie us ca au nz im je gg fk sh hm gs aq ioa io atc kas'), ...regionList('french', 'fr mc be lu pm tf'), ...regionList('germanic', 'de at li ch nl dk no se is fo ax gl'), ...regionList('italian', 'it sm va mt'),
  ...regionList('greek', 'gr cy'), ...regionList('slavic', 'ru ua by pl cz sk rs hr ba si me mk bg'), ...regionList('baltic', 'ee lv lt fi'), ...regionList('magyar', 'ro md hu'), ...regionList('caucasus', 'ge am al xk'),
]);
/** Standard (winter) minutes east of UTC; a city's own time is not moved for summer time. Cities not listed use their longitude. */
const OFFSET_H: ReadonlyMap<string, number> = new Map<string, number>(Object.entries({
  ng: 1, gh: 0, tg: 0, bj: 1, ci: 0, sn: 0, ml: 0, bf: 0, ne: 1, gn: 0, gw: 0, gm: 0, sl: 0, lr: 0, mr: 0, cv: -1, st: 0, dz: 1, ma: 1, tn: 1, ly: 2, eg: 2, sd: 2, ss: 2, et: 3, er: 3, dj: 3, so: 3, sol: 3, ke: 3, tz: 3, ug: 3, rw: 2, bi: 2, km: 3, mg: 3, mu: 4, sc: 4,
  cm: 1, cg: 1, cd: 1, ga: 1, gq: 1, cf: 1, td: 1, ao: 1, za: 2, bw: 2, zw: 2, zm: 2, mw: 2, mz: 2, na: 2, ls: 2, sz: 2, ae: 4, sa: 3, qa: 3, kw: 3, bh: 3, om: 4, jo: 2, lb: 2, sy: 3, iq: 3, ye: 3, ps: 2, il: 2, tr: 3, ir: 3.5, az: 4, am: 4, ge: 4,
  tm: 5, uz: 5, tj: 5, kg: 6, kz: 5, af: 4.5, pk: 5, in: 5.5, np: 5.75, bd: 6, bt: 6, lk: 5.5, mv: 5, mm: 6.5, th: 7, la: 7, kh: 7, vn: 7, my: 8, sg: 8, bn: 8, id: 7, ph: 8, tl: 9, cn: 8, hk: 8, mo: 8, tw: 8, mn: 8, kp: 9, kr: 9, jp: 9,
  gb: 0, ie: 0, pt: 0, is: 0, fo: 0, es: 1, fr: 1, mc: 1, be: 1, nl: 1, lu: 1, de: 1, ch: 1, li: 1, at: 1, it: 1, sm: 1, va: 1, mt: 1, dk: 1, no: 1, se: 1, pl: 1, cz: 1, sk: 1, hu: 1, si: 1, hr: 1, ba: 1, rs: 1, me: 1, mk: 1, al: 1, xk: 1, ad: 1,
  ro: 2, bg: 2, gr: 2, cy: 2, fi: 2, ee: 2, lv: 2, lt: 2, ua: 2, md: 2, by: 3, ru: 3, us: -5, ca: -5, mx: -6, gt: -6, sv: -6, hn: -6, ni: -6, cr: -6, bz: -6, pa: -5, cu: -5, jm: -5, ht: -5, do: -4, pr: -4, bs: -5, bb: -4, tt: -4, lc: -4, vc: -4, gd: -4,
  dm: -4, ag: -4, kn: -4, ai: -4, vg: -4, vi: -4, ms: -4, cw: -4, aw: -4, sx: -4, mf: -4, bl: -4, ky: -5, tc: -5, bm: -4, gl: -3, pm: -3, co: -5, pe: -5, ec: -5, ve: -4, bo: -4, py: -3, ar: -3, uy: -3, cl: -4, br: -3, gy: -4, sr: -3, fk: -3,
  au: 10, nz: 12, fj: 12, ws: 13, to: 13, vu: 11, sb: 11, pg: 10, ki: 12, nr: 12, tv: 12, mh: 12, fm: 11, pw: 9, nu: -11, ck: -10, as: -11, pf: -10, nc: 11, gu: 10, mp: 10, wf: 12, pn: -8, nf: 11, im: 0, je: 0, gg: 0, sh: 0, ax: 2,
}));
const offsetMinOf = (city: CityFacts): number => Math.round((OFFSET_H.get(city.iso) ?? Math.max(-12, Math.min(14, Math.round(city.lon / 15 * 2) / 2))) * 60);
/** The region of a city; Nigeria is split by where the city lies (the north, the south-east, or the west). */
function regionOf(city: CityFacts): Region {
  if (city.iso === 'ng') return city.lat >= 10 ? 'hausa' : city.lon >= 6.4 && city.lat < 9 ? 'igbo' : 'yoruba';
  const found = REGION_OF.get(city.iso);
  if (found) return found;
  if (city.lon < -30) return 'spanish';
  if (city.lon > 60) return city.lat > 20 ? 'chinese' : 'seasia';
  return city.lat > 35 ? 'germanic' : 'anglo';
}
const TONGUE_OF: Readonly<Record<Region, string>> = { yoruba: 'naija', igbo: 'naija', hausa: 'naija', akan: 'ghana', wafr: 'french', cafr: 'french', swahili: 'swahili', horn: 'horn', safr: 'safrica', ioc: 'french', arab: 'arabic', gulf: 'arabic', persian: 'persian', turkic: 'persian',
  hebrew: 'hebrew', sasia: 'hindi', seasia: 'sea', chinese: 'chinese', japan: 'japanese', korea: 'korean', pacific: 'pacific', caribbean: 'caribbean', spanish: 'spanish', portuguese: 'portuguese', anglo: 'anglo', french: 'french', germanic: 'german', italian: 'italian',
  greek: 'greek', slavic: 'slavic', baltic: 'baltic', magyar: 'magyar', caucasus: 'caucasus' };

/** Invented, common given names by region: [women, men]. */
const NAMES: Readonly<Record<Region, readonly [string, string]>> = {
  yoruba: ['Abike Bukola Damilola Folake Funmilayo Yetunde Titilayo Morenike Omolara Sade Temitope Wuraola', 'Adebayo Babatunde Kunle Segun Tayo Femi Gbenga Lanre Niyi Seyi Dele Rotimi'],
  igbo: ['Amaka Chioma Ngozi Ifeoma Nkechi Obiageli Uju Adaku Chinelo Ebele Nneka Oluchi', 'Chidi Emeka Ikenna Obinna Nnamdi Uchenna Chukwudi Ifeanyi Kelechi Obi Okey Tobenna'],
  hausa: ['Amina Hadiza Zainab Maryam Rabi Safiya Hauwa Binta Fatima Aisha Zulai Larai', 'Musa Abdullahi Ibrahim Sani Yusuf Garba Bello Aliyu Danjuma Lawan Shehu Tanko'],
  akan: ['Abena Akosua Ama Efua Adwoa Yaa Esi Afia Nana Serwaa Araba Kukua', 'Kofi Kwame Kwesi Yaw Kojo Kwabena Fiifi Kobby Nii Papa Ebo Atta'],
  wafr: ['Awa Fatou Mariam Aminata Khady Rokia Salimata Adjoa Mame Kadi Nene Binta', 'Mamadou Ousmane Ibrahima Moussa Seydou Amadou Boubacar Lamine Sekou Cheick Kader Issa'],
  cafr: ['Nadege Solange Bernadette Yvette Clarisse Estelle Prisca Josiane Honorine Mireille Vanessa Rosalie', 'Jean-Paul Serge Patrick Alain Didier Landry Hervé Brice Romeo Fidele Gaston Hubert'],
  swahili: ['Neema Amani Zawadi Halima Mwajuma Wambui Atieno Imani Rehema Subira Grace Joyce', 'Juma Baraka Otieno Kamau Mwangi Hamisi Salim Thomas Peter Daudi Omari Kiprop'],
  horn: ['Selam Meron Hana Tigist Lensa Fasika Senait Ayan Hodan Rahel Saba Bethlehem', 'Dawit Abel Henok Yonas Tesfaye Mulugeta Ahmed Abdi Samuel Kaleb Bereket Fitsum'],
  safr: ['Thandi Naledi Lindiwe Palesa Nomsa Zanele Chipo Tendai Mpho Busisiwe Refilwe Anele', 'Sipho Thabo Tendai Bongani Kagiso Farai Lungile Tshepo Themba Mandla Kudzai Blessing'],
  ioc: ['Miora Voahangy Haingo Fanja Soa Lalaina Anita Nirina Mireille Priya Sandra Aina', 'Rivo Hery Tahina Mickael Andry Ravo Dev Kevin Sanjay Fidy Tojo Nirina'],
  arab: ['Salma Nour Yasmine Leila Samira Hanane Rania Soumaya Fadwa Dalia Meriem Khadija', 'Karim Youssef Omar Hamza Samir Mehdi Nabil Rachid Tarek Walid Anis Amine'],
  gulf: ['Mariam Layla Huda Noor Reem Aisha Dana Hind Shaikha Lina Maha Rawan', 'Khalid Faisal Hassan Saeed Nasser Tariq Majid Salem Adel Bader Rashid Jamal'],
  persian: ['Shirin Parisa Roya Mahnaz Soraya Laleh Nasrin Fariba Azadeh Mina Setareh Yalda', 'Reza Dariush Kaveh Arash Babak Farhad Omid Siavash Nima Behnam Javad Hamid'],
  turkic: ['Ayse Elif Zeynep Gul Aigerim Madina Dilnoza Nargiz Selin Aydan Altynai Munira', 'Mehmet Emre Burak Timur Ruslan Aibek Bakyt Farid Kemal Orhan Bolat Jasur'],
  hebrew: ['Noa Maya Yael Tamar Dana Shira Talia Michal Orly Hila Roni Liora', 'Avi Eitan Noam Yossi Gil Amir Tomer Ronen Daniel Itai Oren Yaron'],
  sasia: ['Anjali Priya Sunita Meena Kavita Lakshmi Nadia Farida Shanti Devi Roshni Amrita', 'Arjun Ravi Sanjay Imran Rahul Vikram Anil Karim Dilip Hari Naveen Sameer'],
  seasia: ['Siti Linh Mai Aroon Dewi Nurul Lani Malee Kanya Thida Maricel Rina', 'Budi Anh Somchai Rizal Wira Dara Tuan Narong Joko Bayu Arif Sokha'],
  chinese: ['Mei Lan Xiu Ling Hua Jing Yun Fang Qing Ying Rong Shu', 'Wei Jun Hao Ming Tao Lei Bo Chen Feng Gang Kai Long'],
  japan: ['Haruka Sakura Yui Aiko Mio Emi Natsuki Rina Hinata Kaori Midori Noriko', 'Haruto Ren Sota Daiki Kenji Takumi Hiroshi Yuto Shun Taro Ryo Isamu'],
  korea: ['Minji Soyeon Jiwoo Haneul Yuna Seoyeon Eunji Narae Hyejin Sumi Boram Dahye', 'Minjun Jihoon Seojun Hyun Dongwoo Taehyun Joon Sangho Woojin Kibum Yeongil Sungmin'],
  pacific: ['Losana Mele Salote Tui Moana Sina Lani Ana Leilani Tiare Marama Ofa', 'Sione Tevita Manu Jone Kalani Tane Mikaele Viliami Aisake Rua Ioane Tomasi'],
  caribbean: ['Shanice Marcia Keisha Joyann Tanya Andrea Kerry-Ann Sandra Denise Nadine Cherise Patrice', 'Delroy Marlon Winston Kemar Dwayne Orville Garfield Jerome Lloyd Hopeton Trevor Rohan'],
  spanish: ['Lucia Camila Valentina Marisol Itzel Paula Rocio Ximena Soledad Pilar Daniela Carmen', 'Mateo Santiago Javier Alejandro Diego Rafael Emilio Andres Joaquin Ramiro Tomas Hugo'],
  portuguese: ['Beatriz Ines Joana Luana Mariana Rita Carolina Tereza Sofia Leticia Fernanda Alice', 'Tiago Rui Pedro Joao Gustavo Henrique Caio Duarte Bruno Vasco Rafael Nuno'],
  anglo: ['Hannah Clara Megan Rosie Eleanor Priscilla Joanne Marjorie Beth Alison Naomi Wendy', 'Callum Graham Owen Brendan Walter Nathan Colin Stuart Gareth Dennis Marcus Harvey'],
  french: ['Camille Margaux Elodie Solene Odile Lucie Josephine Colette Noemie Berenice Chloe Manon', 'Antoine Julien Mathieu Gaspard Remy Etienne Lucien Baptiste Thibault Olivier Philippe Armand'],
  germanic: ['Anke Greta Ingrid Lotte Maren Sanne Thea Elin Freya Hilde Katrin Annika', 'Jonas Lukas Matthias Henrik Anders Stefan Bjorn Rasmus Lennart Tobias Niklas Ole'],
  italian: ['Giulia Chiara Elena Marta Francesca Valentina Silvia Paola Teresa Bianca Rosalba Gina', 'Marco Luca Matteo Paolo Stefano Enzo Carlo Franco Dario Nicola Sergio Aldo'],
  greek: ['Eleni Maria Katerina Despina Anna Sofia Irini Dimitra Zoe Vasiliki Niki Thalia', 'Nikos Yannis Kostas Giorgos Stavros Manolis Dimitris Takis Alexandros Petros Thanos Lefteris'],
  slavic: ['Anya Katarina Milena Jelena Olga Natalia Zofia Marta Irina Tatiana Vesna Ivana', 'Pavel Nikola Dragan Marek Sergei Andrei Tomas Milos Viktor Bogdan Jakub Stefan'],
  baltic: ['Liga Inga Marta Aino Kaisa Rasa Egle Annele Laima Sirje Tuuli Dace', 'Janis Andris Matti Juhani Tomas Rimas Mikk Kristjan Arvydas Aivars Toomas Eero'],
  magyar: ['Eszter Katalin Ildiko Zsuzsa Anca Mihaela Ioana Bernadett Reka Dorina Maria Timea', 'Laszlo Istvan Gabor Zoltan Andrei Mihai Ionut Balazs Csaba Daniel Radu Tibor'],
  caucasus: ['Nino Tamar Mariam Ani Lusine Eka Anahit Nana Shushan Teona Arta Besa', 'Giorgi Levan Davit Armen Tigran Vahan Nika Gor Arben Besnik Lekë Besim'],
};
/** Faith odds by region, in order christian, catholic, orthodox, muslim, hindu, buddhist, jewish, sikh, traditional, none. */
const FAITH_ORDER: readonly Faith[] = ['christian', 'catholic', 'orthodox', 'muslim', 'hindu', 'buddhist', 'jewish', 'sikh', 'traditional', 'none'];
const FAITH_ODDS: Readonly<Record<Region, readonly number[]>> = {
  yoruba: [40, 6, 0, 38, 0, 0, 0, 0, 6, 10], igbo: [60, 28, 0, 1, 0, 0, 0, 0, 5, 6], hausa: [12, 3, 0, 78, 0, 0, 0, 0, 2, 5], akan: [66, 12, 0, 14, 0, 0, 0, 0, 4, 4], wafr: [12, 8, 0, 66, 0, 0, 0, 0, 8, 6], cafr: [40, 40, 0, 8, 0, 0, 0, 0, 6, 6],
  swahili: [50, 14, 0, 28, 1, 0, 0, 0, 3, 4], horn: [16, 2, 52, 26, 0, 0, 0, 0, 2, 2], safr: [64, 10, 0, 3, 1, 0, 0, 0, 12, 10], ioc: [30, 28, 0, 14, 12, 6, 0, 0, 4, 6], arab: [1, 1, 3, 90, 0, 0, 0, 0, 0, 5], gulf: [6, 2, 2, 82, 2, 0, 0, 0, 0, 6],
  persian: [1, 0, 0, 90, 0, 0, 0, 0, 0, 9], turkic: [2, 0, 4, 78, 0, 1, 0, 0, 0, 15], hebrew: [3, 0, 0, 4, 0, 0, 55, 0, 0, 38], sasia: [4, 2, 0, 26, 52, 4, 0, 6, 0, 6], seasia: [16, 6, 0, 36, 6, 24, 0, 0, 2, 10],
  chinese: [6, 1, 0, 2, 0, 28, 0, 0, 10, 53], japan: [2, 0, 0, 0, 0, 38, 0, 0, 10, 50], korea: [24, 8, 0, 0, 0, 22, 0, 0, 2, 44], pacific: [66, 14, 0, 2, 2, 0, 0, 0, 6, 10], caribbean: [66, 12, 0, 2, 3, 0, 0, 0, 5, 12],
  spanish: [14, 62, 0, 0, 0, 0, 0, 0, 2, 22], portuguese: [14, 58, 0, 0, 0, 0, 0, 0, 2, 26], anglo: [38, 10, 0, 4, 2, 1, 1, 1, 0, 43], french: [8, 40, 0, 6, 0, 1, 1, 0, 0, 44], germanic: [38, 14, 0, 4, 0, 1, 0, 0, 0, 43],
  italian: [4, 70, 0, 2, 0, 0, 0, 0, 0, 24], greek: [4, 3, 80, 2, 0, 0, 0, 0, 0, 11], slavic: [10, 22, 36, 6, 0, 0, 0, 0, 0, 26], baltic: [36, 14, 8, 1, 0, 1, 0, 0, 0, 40], magyar: [20, 34, 24, 2, 0, 0, 0, 0, 0, 20],
  caucasus: [4, 2, 70, 16, 0, 0, 0, 0, 0, 8],
};

// ---- jobs ------------------------------------------------------------------------------------------------------------------------------------------------
interface Job { id: string; role: 'seller' | 'guide'; kinds: string[]; eat: string[]; doing: string; me: string; day: string; says: string[]; ages: [number, number]; long?: boolean }
const J = (id: string, role: Job['role'], kinds: string, doing: string, me: string, day: string, says: string, lo: number, hi: number, long = false): Job => ({ id, role, kinds: kinds.split(' '), eat: ['buka', 'mall'], doing, me, day, says: says.split('|'), ages: [lo, hi], ...(long ? { long } : {}) });
const GOODS: readonly [string, string][] = [['fruit and vegetables', 'fruit and vegetables'], ['cloth and sewing thread', 'cloth'], ['spices and dried goods', 'spices'], ['second-hand books and school supplies', 'books'], ['shoes and sandals', 'shoes'], ['phone cases and chargers', 'phone things'], ['fresh bread and pastries', 'bread'],
  ['handmade soap and oils', 'soap'], ['pots and clay bowls', 'pottery'], ['second-hand clothes', 'clothes'], ['tea, coffee and sugar', 'tea and coffee'], ['sweets and snacks', 'snacks'], ['woven baskets and mats', 'baskets'], ['flowers and potted plants', 'flowers'], ['small tools and nails', 'tools'], ['eggs and cheese', 'eggs and cheese']];
const JOBS: readonly Job[] = [
  J('nurse', 'guide', 'hospital', 'Nursing at the clinic', 'I am a nurse at the clinic', 'I check on patients, write careful notes and explain things calmly to worried families', 'The clinic was calm this morning.|A patient thanked me today and it made my afternoon.|A nurse learns to listen before she speaks.', 22, 62),
  J('clerk', 'guide', 'hospital', 'Helping at the clinic desk', 'I work the front desk at the clinic', 'I greet people, find their papers and point them to the right door', 'The queue at the desk moved nicely today.|Most people only need a kind word and a clear sign.|I know where every file in this place hides.', 21, 66),
  J('pharma', 'guide', 'hospital', 'Helping in the pharmacy', 'I help in the pharmacy beside the clinic', 'I count, label and explain how to take things, slowly and clearly', 'Clear labels save a lot of trouble.|I have learned to read terrible handwriting.|A good pharmacist is mostly a good explainer.', 23, 64),
  J('tailor', 'seller', 'office', 'Sewing in the workshop', 'I am a tailor in the community workshop', 'I mend, hem and make clothes to order, and I measure twice before I cut once', 'A good seam is a quiet kind of pride.|A customer wants it done by Friday, as they always do.|My scissors and I have an understanding.', 21, 72, true),
  J('carpenter', 'seller', 'office', 'Working wood in the workshop', 'I am a carpenter in the community workshop', 'I make chairs, shelves and doors, and I fix what other people give up on', 'The smell of fresh wood is the best part of my day.|A chair that does not wobble is a small victory.|I measured it three times and it still needed trimming.', 21, 70, true),
  J('repair', 'seller', 'office', 'Fixing things in the workshop', 'I repair bicycles and small machines in the workshop', 'People bring me what is broken, and I like sending it back working', 'Most things only need a patient hour and the right spanner.|A bicycle chain tells you everything about its owner.|I never throw away a spare screw.', 21, 70, true),
  J('printer', 'guide', 'office', 'Printing in the workshop', 'I run the small printing desk in the workshop', 'I print notices, menus and school pages, and I fix the paper jams', 'The printer and I are not friends today.|Notices for the market are my bread and butter.|A clean page is a lovely thing.', 21, 66),
  J('accounts', 'guide', 'office', 'Keeping books at the workshop', 'I keep the books for the workshop', 'I add up the week, chase the missing receipts and keep everything tidy', 'The numbers finally agree with each other today.|A tidy ledger helps everyone sleep well.|Receipts have a way of hiding in coat pockets.', 24, 68),
  J('photo', 'guide', 'office viewing', 'Taking photographs', 'I take photographs for people who want them', 'I photograph families, shops and festivals, and I wait for the good light', 'The light was kind this afternoon.|A good photograph is mostly patience.|I met a family today who laughed through all the shots.', 22, 66),
  J('cook', 'seller', 'buka', 'Cooking at the eatery', 'I am a cook at the local eatery', 'I am up early to prepare, and I stir, taste and send out plates until the pots are empty', 'The pot is nearly empty and that is a happy sign.|Someone asked me for my recipe and I only smiled.|Good food needs time and a little salt at the right moment.', 21, 70, true),
  J('waiter', 'guide', 'buka', 'Serving at the eatery', 'I wait tables at the local eatery', 'I carry plates, remember orders and keep the tables friendly', 'I remembered every order without writing one down.|A smile costs nothing and tips well.|The lunch crowd was cheerful today.', 21, 55),
  J('baker', 'seller', 'buka market', 'Baking bread', 'I am a baker', 'I knead before dawn and sell the bread while it is warm', 'Warm bread sells itself.|I was up before the birds again.|The first loaf out of the oven is always for the neighbours.', 21, 66, true),
  J('gardener', 'guide', 'park', 'Tending the park', 'I look after the plants and paths in the park', 'I water, prune, sweep and say good morning to everyone who walks by', 'The roses are showing off today.|A well-watered tree is a happy tree.|I know the name of every bench in this park.', 22, 70),
  J('coach', 'guide', 'park walk', 'Leading morning exercise', 'I lead morning exercise in the park', 'I lead gentle stretching for anyone who turns up, from grandmothers to teenagers', 'Everyone who showed up today did a little better than last week.|Stretching is mostly breathing.|A tired body is a happy mind.', 23, 62),
  J('keeper', 'guide', 'worship', 'Looking after the prayer hall', 'I look after the hall of prayer', 'I sweep, set out the mats and chairs and open the doors for whoever needs a quiet place', 'The hall is calm this morning.|People come in worried and leave a little lighter.|I like the sound of an empty room before anyone arrives.', 28, 74),
  J('conductor', 'guide', 'hub', 'Helping travellers at the station', 'I help travellers at the transit stop', 'I answer questions, call the departures and sort out lost tickets', 'Another traveller found the right bus today.|People are kinder when they know where they are going.|I can read a timetable in my sleep.', 21, 62),
  J('dispatch', 'guide', 'hub', 'Calling the departures', 'I call the departures at the transit stop', 'I send vehicles on their way and keep the board honest', 'Every departure on time so far today.|A good board is a kindness to a tired traveller.|I have a voice made for announcements.', 24, 66),
  J('porter', 'guide', 'hub market', 'Carrying loads', 'I carry loads for people at the transit stop and the market', 'I lift, wheel and stack, and I know every short cut in the town', 'A strong back and a good cart go a long way.|I carried a wardrobe up three flights today. The wardrobe was not grateful.|I like work you can see finished.', 21, 52),
  J('notices', 'guide', 'statehouse', 'Keeping the notice house', 'I work at the council notice house', 'I post the notices, answer questions about forms and keep the community board tidy', 'The new notices are up and nobody has read them yet.|A form filled in properly is a lovely thing.|People ask the same three questions, and I love each of them.', 24, 66),
  J('teacher', 'guide', 'quad', 'Teaching a class', 'I am a teacher at the school on the campus grounds', 'I teach young people and then spend my evenings marking their work', 'One student finally understood fractions today.|Teaching is mostly saying a thing in a new way.|I marked forty exercise books and I am still smiling.', 23, 66),
  J('librarian', 'guide', 'quad', 'Working in the library', 'I am a librarian', 'I shelve, lend, recommend and shush, in that order', 'Someone returned a book thirty years late and said sorry. I forgave them.|A good book finds the right reader.|I know where everything hides in this library.', 24, 70),
  J('student', 'guide', 'quad', 'Studying on campus', 'I am a student, working part-time at the study hall', 'I study in the day and help at the study hall in the afternoons', 'The exam is coming and so is the panic.|I read the same page three times and then it clicked.|Studying is easier with tea.', 21, 29),
  J('shop', 'seller', 'mall market', 'Working in a shop', 'I work in a shop', 'I fold, label, tidy and help people find what they came for', 'The new stock came in today.|I can fold a shirt in my sleep.|A customer asked me for something I have never heard of. We found it.', 21, 58),
  J('guard', 'guide', 'mall', 'Looking after the shopping hall', 'I look after the shopping hall', 'I keep an eye on the doors and help anyone who is lost or looking for a lift', 'A quiet day is a good day for a watchman.|I helped a child find her mother. Best part of my week.|I know every door of this building.', 24, 66),
  J('tour', 'guide', 'viewing park', 'Showing visitors around', 'I show visitors around town', 'I walk people through the old streets and the good viewpoints and tell the stories behind them', 'A visitor asked a question I could not answer. I will find out.|The old quarter is best at this hour.|I never get tired of the view from the top.', 22, 66),
  J('retired', 'guide', 'park worship market', 'Sitting in the park', 'I am retired now, and I spend my mornings in the park', 'I chat with the gardener, feed the birds and read the day-old paper', 'Retirement is just a very long Saturday.|I have a favourite bench and it knows me.|The park looks better when you have time to look at it.', 62, 75),
];
const STALL = (goods: readonly [string, string]): Job => J('stall', 'seller', 'market', `Minding the ${goods[1]} stall`, `I keep a stall in the market selling ${goods[0]}`, 'I set out early, chat with the neighbouring stalls and let people look as long as they like', `Selling ${goods[1]} has taught me more than school did.|Business is steady, and so am I.|A regular came by today and it made the morning.|The best customers ask a lot of questions.`, 21, 72, true);

// ---- family, goals, speech -----------------------------------------------------------------------------------------------------------------------
type Fam = { text: string; kin: string };
const FAMILY_YOUNG: readonly Fam[] = [{ text: 'I live with my parents and two younger cousins, and the house is never quiet', kin: 'My parents asked about my day and I told them everything.' }, { text: 'I share a small flat with a friend from work', kin: 'My flatmate made dinner and I did the dishes, fair is fair.' }, { text: 'I live alone in a rented room and I am learning to cook for one', kin: 'I called home and my mother told me to eat properly.' }, { text: 'I am engaged to someone I met at a friend\'s wedding', kin: 'Someone close to me and I are planning a small party and arguing about the cake.' }];
const FAMILY_MID: readonly Fam[] = [{ text: 'I am married and we have two children who are growing too fast', kin: 'My children drew me a picture today and I put it on the wall.' }, { text: 'I am married and we are expecting our first child', kin: 'We are painting the spare room and we cannot agree on a colour.' }, { text: 'I live alone, and my sister two streets away feeds me twice a week', kin: 'My sister dropped off a bowl of food again. She will not take no.' }, { text: 'I am raising my daughter on my own, and she is the centre of my days', kin: 'My daughter taught me a new word today and corrected my spelling.' }, { text: 'I am married, and my mother-in-law lives with us and runs the kitchen', kin: 'My mother-in-law has reorganised the kitchen again. I have given up.' }, { text: 'I have three brothers and we all live within a short walk of each other', kin: 'My brothers argued about football all evening. I took the middle.' }];
const FAMILY_OLD: readonly Fam[] = [{ text: 'I am married and our grown children visit on Sundays with the grandchildren', kin: 'My grandchildren came on Sunday and ate everything in the house.' }, { text: 'I am a widow, and my neighbours have become my family', kin: 'A neighbour brought me soup when she heard I had a cold.' }, { text: 'I am a widower and my daughter calls every evening to check on me', kin: 'My daughter called to ask if I took my tea. I had.' }, { text: 'I live with my wife in the house we built, and our grandchildren keep the garden loud', kin: 'My wife and I walked slowly home together, as we do.' }, { text: 'I live with my younger sister, and we have not stopped bickering since we were children', kin: 'My sister and I bickered over the radio again. It is our favourite sport.' }];
const GOALS: readonly string[] = ['to open a small shop of my own', 'to learn to swim, which embarrasses me at my age', 'to visit a place I have only seen in pictures', 'to teach one young person everything I know', 'to finish the course I started and never completed', 'to build a small house for my family', 'to learn to play an instrument', 'to write down the stories my grandparents told', 'to save enough to travel by train across the country', 'to grow a proper garden', 'to start a little reading club for children', 'to run a long race before I am too old', 'to learn another language well enough to joke in it', 'to repair my family\'s old house', 'to bake a cake that my mother would approve of', 'to put aside enough for a quiet old age'];
const ORIGINS = (city: string): readonly string[] => [`I was born here in ${city} and I have never lived anywhere else for long`, `I came to ${city} when I was twenty, from a village a few hours away`, `I grew up near ${city}, in a family that moved around a lot`, `I came to ${city} for work and stayed for the people`, `I grew up on the other side of ${city} and still take the long way home`];
const SPEECH: Readonly<Record<Style, string>> = {
  warm: 'I speak warmly and I laugh easily. I greet everyone like an old friend, even a stranger, and I remember what people tell me.',
  plain: 'I speak plainly and say what I mean in few words. I would rather be clear than clever.',
  formal: 'I speak carefully and politely, in full sentences, and I like to be on time. I use titles with people I do not know yet.',
  jokey: 'I make a joke before I make a point. Most of the time the joke lands and the point does too.',
  pidgin: 'I speak a mix of plain English and pidgin when I am relaxed, and I switch to careful English when I am speaking to someone I do not know.',
  brisk: 'I speak quickly and briefly. I do not like to waste anyone\'s time, including my own.',
};
const TEMPER_WORDS = (p: Persona): string[] => [
  p.chatty >= 66 ? 'I love to talk and I can make a conversation out of a bus stop.' : p.chatty <= 33 ? 'I am quiet by nature. I listen more than I talk, and I say little but mean it.' : 'I talk when there is something to say.',
  p.temper >= 70 ? 'I have a short fuse and I am working on it, mostly by counting to ten.' : p.temper <= 30 ? 'I almost never lose my temper. People say I am calm; I say I am just tired of shouting.' : 'I get cross sometimes, but I get over it quickly.',
  p.generous >= 66 ? 'I give too much away and I do not regret it.' : p.generous <= 33 ? 'I am careful with money. I count what I have before I spend it.' : 'I give when I can and save when I must.',
  p.curious >= 66 ? 'I ask questions all day, and I get into trouble for it now and then.' : p.curious <= 33 ? 'I like my routines and I see no reason to change a good one.' : 'I try new things now and then.',
  p.ambitious >= 66 ? 'I want more from my work than I have now, and I work hard for it.' : p.ambitious <= 33 ? 'I am content with what I do. I do not need more than a good day.' : 'I like my work and I want to do it well.',
  p.funny >= 66 ? 'I try to make people laugh, even when I am tired.' : p.funny <= 33 ? 'I am serious by nature, though I laugh more than people expect.' : 'I enjoy a joke, but I know when to stop.',
];
const FAITH_STORY = (faith: Faith, devout: number): string => {
  const how = devout >= 70 ? 'I take it seriously and it shapes my days' : devout <= 35 ? 'I keep it lightly, though it matters to me' : 'it is part of my week and my thinking';
  switch (faith) {
    case 'christian': return `I am a Christian. I pray in the morning and I go to church when I can; ${how}. I listen to everyone else's faith with respect.`;
    case 'catholic': return `I am a Catholic. I say a short prayer before I leave the house and I go to Mass when I can; ${how}. I listen to everyone else's faith with respect.`;
    case 'orthodox': return `I was raised in the Orthodox church. I light a candle on feast days and I fast when the season asks it; ${how}. I listen to everyone else's faith with respect.`;
    case 'muslim': return `I am a Muslim. I pray at the set times when I can and I go to the mosque on Fridays; ${how}. I listen to everyone else's faith with respect.`;
    case 'hindu': return `I am a Hindu. I light a lamp at home each morning and I visit the temple on special days; ${how}. I listen to everyone else's faith with respect.`;
    case 'buddhist': return `I am a Buddhist. I sit quietly each morning and visit the temple on holy days; ${how}. I listen to everyone else's faith with respect.`;
    case 'jewish': return `I am Jewish. We keep Shabbat at home and I light the candles on Friday; ${how}. I listen to everyone else's faith with respect.`;
    case 'sikh': return `I am a Sikh. I read from the holy book in the morning and I go to the gurdwara on Sundays; ${how}. I listen to everyone else's faith with respect.`;
    case 'traditional': case 'yoruba': return `I follow the old ways of my grandparents. I pour a little water for the ancestors in the morning; ${how}. I listen to everyone else's faith with respect.`;
    default: return 'I do not follow a religion, but I respect everyone who does, and I like a quiet moment in the morning before the day starts.';
  }
};

// ---- small helpers -----------------------------------------------------------------------------------------------------------------------------------
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy'];
export const numberWord = (n: number): string => (n < 20 ? ONES[n]! : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`);
/** "around six", "around half past seven": a clock hour (decimals allowed) in words. */
export function clockWords(hour: number): string {
  const h24 = ((hour % 24) + 24) % 24, whole = Math.floor(h24), minutes = Math.round((h24 - whole) * 60);
  const h12 = whole % 12 === 0 ? 12 : whole % 12, next = (whole + 1) % 12 === 0 ? 12 : (whole + 1) % 12;
  const word = (n: number): string => numberWord(n);
  if (minutes < 8) return `around ${word(h12)}`;
  if (minutes < 23) return `around a quarter past ${word(h12)}`;
  if (minutes < 38) return `around half past ${word(h12)}`;
  if (minutes < 53) return `around a quarter to ${word(next)}`;
  return `around ${word(next)}`;
}
const lookFor = (woman: boolean, age: number): HouseLook => (woman ? (age >= 50 ? 'mama' : age >= 35 ? 'auntie' : 'sis') : (age >= 55 ? 'elder' : age >= 30 ? 'bro' : 'youth'));
const weighted = <T>(items: readonly T[], odds: readonly number[], roll: number): T => {
  const total = odds.reduce((sum, n) => sum + n, 0);
  let at = roll * total;
  for (let i = 0; i < items.length; i++) { at -= odds[i]!; if (at < 0) return items[i]!; }
  return items[items.length - 1]!;
};
const SUFFIX_FREE: ReadonlySet<Region> = new Set(['yoruba', 'igbo', 'hausa', 'akan', 'wafr', 'cafr']);

/** The five-residents-at-most generator: the same resident for the same (city, slot, names already taken in the city). */
export function generateResident(city: CityFacts, slot: number, taken: readonly string[] = []): Resident {
  const seed = `${city.id}|${slot}`, roll = stream(`gen|${seed}`);
  const region = regionOf(city), offsetMin = offsetMinOf(city);
  // Who: age, gender, name (distinct from everyone already in the city).
  const age = 21 + Math.floor(roll() * 55), woman = roll() < 0.5;
  const pool = NAMES[region][woman ? 0 : 1].split(' '), start = Math.floor(roll() * pool.length);
  let base = pool[start]!;
  for (let i = 0; i < pool.length; i++) { const candidate = pool[(start + i) % pool.length]!; if (!taken.some((name) => name.toLowerCase().endsWith(candidate.toLowerCase()))) { base = candidate; break; } }
  const titled = SUFFIX_FREE.has(region) && age >= (woman ? 48 : 55) && roll() < 0.5;
  const name = titled ? `${woman ? 'Mama' : 'Baba'} ${base}` : base;
  // What: a job that fits the age and is always open in a city.
  const goods = GOODS[Math.floor(roll() * GOODS.length)]!;
  const fits = [...JOBS, STALL(goods), STALL(goods)].filter((job) => age >= job.ages[0] && age <= job.ages[1]);
  const job = fits[Math.floor(roll() * fits.length)]!;
  // Temperament: eight numbers from different bands for the residents of one city.
  const persona = derivePersona(`resident.${city.id}.g${slot}`, '', slot, city.id);
  const faith = weighted(FAITH_ORDER, FAITH_ODDS[region], roll());
  const style: Style = (region === 'yoruba' || region === 'igbo' || region === 'hausa' || region === 'akan' || region === 'caribbean') && roll() < 0.45 ? 'pidgin' : persona.style === 'pidgin' ? 'warm' : persona.style;
  const fam = pickOf(age < 30 ? FAMILY_YOUNG : age < 52 ? FAMILY_MID : FAMILY_OLD, roll());
  const goal = pickOf(GOALS, roll());
  Object.assign(persona, { faith, style, tongue: TONGUE_OF[region], devout: faith === 'none' ? Math.min(persona.devout, 20) : persona.devout, workLines: job.says, goal, kin: fam.kin });
  // When: sleep and hours in the city's own time.
  const chrono = (slot + hash(city.id)) % 3, r2 = stream(`sched|${seed}`);
  const wake = [5 + Math.floor(r2() * 3) * 0.25 - 0.25, 6 + Math.floor(r2() * 5) * 0.25, 7.75 + Math.floor(r2() * 6) * 0.25][chrono]!;
  const bed = [20.75 + Math.floor(r2() * 7) * 0.25, 22 + Math.floor(r2() * 8) * 0.25, 0.25 + Math.floor(r2() * 8) * 0.25][chrono]!;
  const span = job.long ? 9 + Math.floor(r2() * 3) * 0.5 : 7 + Math.floor(r2() * 5) * 0.5;
  const open = Math.round((wake + 1.5 + r2() * 1.0) * 2) / 2, close = Math.min(23.5, open + span);
  const kinds = { post: job.kinds, ...(job.role === 'seller' ? { market: ['market'] } : {}), eatery: job.eat };
  const key = `g${slot}-${base.toLowerCase().replace(/[^a-z]/g, '')}`;
  const info = { name, age, woman, base, job, fam, goal, city, region, persona, wake, bed, open, close, seed };
  const resident: Resident = {
    key, name, city: city.id, utcOffsetMin: offsetMin, sleep: { bed, wake }, look: lookFor(woman, age), doing: job.doing, persona, kinds, generated: true, age,
    work: { role: job.role, hours: { open, close }, post: [], ...(job.role === 'seller' ? { market: [] } : {}), eatery: [] },
    story: '',
  };
  let cached: string | null = null;
  Object.defineProperty(resident, 'story', { enumerable: true, configurable: true, get: () => (cached ??= storyOf(info)) });
  return Object.freeze(resident);
}

interface Info { name: string; age: number; woman: boolean; base: string; job: Job; fam: Fam; goal: string; city: CityFacts; region: Region; persona: Persona; wake: number; bed: number; open: number; close: number; seed: string }
function storyOf(i: Info): string {
  const roll = stream(`story|${i.seed}`), p = i.persona, tongue = TONGUES[p.tongue] ?? TONGUES['anglo']!;
  const cityName = i.city.name;
  const likes = p.likes.map((tag) => LIKES[tag] ?? tag), dislikes = p.dislikes;
  const owl = i.wake >= 7.5, lark = i.wake <= 5.5;
  const sentence = (text: string): string => (/[.!?]$/.test(text) ? text : `${text}.`);
  const temper = TEMPER_WORDS(p);
  const traitPicks = [temper[0]!, temper[1]!, temper[2 + Math.floor(roll() * 4)]!];
  const phrases = `When I am thinking I say "${pickOf(tongue.filler, roll())}", I greet people with "${pickOf(tongue.hello, roll())}", and when I am pleased I say "${tongue.wow}".`;
  const parts = [
    `My name is ${i.base}. I am ${numberWord(i.age)}. ${sentence(pickOf(ORIGINS(cityName), roll()))} ${sentence(i.fam.text)}`,
    `${i.job.me}: ${i.job.day}. ${owl ? 'I am a night owl and my work starts late enough to let me be one.' : lark ? 'I am an early riser and I like the town before it fills up.' : 'I keep sensible hours and I like them.'}`,
    `${SPEECH[p.style]} ${phrases}`,
    `What I like: ${likes.join(', ')}. What I dislike: ${dislikes.join(' and ')}. ${traitPicks.join(' ')}`,
    `What I want, and tell almost nobody: ${i.goal}. I think about it more than I admit.`,
    FAITH_STORY(p.faith, p.devout),
    `Days go like this: I wake ${clockWords(i.wake)}, have something small to eat, and go to work by ${clockWords(i.open)}. I stop ${clockWords(i.close)}, and then I see to the house, ${p.social >= 60 ? 'find company if I can' : 'keep to myself a while'} and I am in bed ${clockWords(i.bed)}. I choose each hour as it comes, and I do not make promises I cannot keep. I never ask anyone for money, for their private details, or to meet me anywhere but where we both already are.`,
  ];
  return parts.join('\n\n');
}

/** The cities' residents in slot order: the authored ones of the city first, then generated ones, `count` in all. */
export function rosterFor(city: CityFacts, count: number, authored: readonly Resident[]): Resident[] {
  const out: Resident[] = authored.slice(0, count);
  const names = out.map((who) => who.name);
  for (let slot = out.length; slot < count; slot++) {
    // Slot numbers are the position in the city's list, so an authored resident taking a slot never moves a generated one's seed.
    const made = generateResident(city, slot, names);
    out.push(made); names.push(made.name);
  }
  return out;
}

/** A generated resident by its id (`resident.<city>.g<slot>-<name>`), for the Prayers page and the acts of the owner. Null for anything else. */
export function generatedById(id: string, facts: (city: string) => CityFacts | null, authoredIn: (city: string) => readonly Resident[] = () => []): Resident | null {
  const m = /^resident\.([a-z0-9-]+)\.g(\d)-[a-z]+$/.exec(id);
  if (!m) return null;
  const city = facts(m[1]!);
  if (!city) return null;
  const made = rosterFor(city, Number(m[2]) + 1, authoredIn(city.id)).find((who) => `resident.${who.city}.${who.key}` === id);
  return made ?? null;
}
export const regionOfCity = regionOf;
