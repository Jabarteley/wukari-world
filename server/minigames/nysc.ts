/**
 * OWNER: minigames (docs/MINI-GAMES.md)
 * NYSC CAMP, the server half: a three-week arc for Nigeria in the shape of the youth-service orientation camp. Week one is registration, week two the platoon, week three
 * the parade, and day 21 the passing out. It is a game about the camp's daily life, written for this game; it is not an official programme.
 *
 *   SEASON  an admin switch (`nyscOn`) and a batch label (`nyscBatch`). A person joins once a batch, in Nigeria only (the character's city decides). The arc runs
 *           from the day they join, not from a calendar date, so a late joiner still has three weeks.
 *   DUTIES  three a stage, nine in all, each a short scene with three choices worth 2, 1 or 0 points. One duty a game day, and only from a stage that is open
 *           (a stage opens a week after the one before; one left undone stays open). The points are kept on the server and decide the honour on the card.
 *   MONEY   game naira only: DUTY_PAY for each duty and PASS_OUT_PAY once at the passing out, through the living-world server action, inside the season's day cap.
 *   CARD    the passing-out card (camp, platoon, honour, posting) is built from the server's row and drawn on the device.
 */
import { cityRules } from '../../src/game/cities/index.ts';
import { hash } from '../house/lines.ts';
import { countryOfCity } from '../moderation/ai-intercept.ts';
import type { NyscCard, NyscDutyView, NyscStageId, NyscStageView, NyscView } from '../../src/types/minigames.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import { SEASON_DAY_CAP, dayOf, idOf, no, reward, workerOf } from './common.ts';
import type { Refused, Small } from './common.ts';
import { minigamesOf, peekMinigames } from './store.ts';
import type { DayRow, MiniGamesCollection, NyscRow } from './store.ts';

export const DUTY_PAY = 500, PASS_OUT_PAY = 8000, STAGE_DAYS = 7, ARC_DAYS = 21;

interface OptionDef { id: string; text: string; points: 0 | 1 | 2; result: string }
interface DutyDef { id: string; title: string; scene: string; options: readonly OptionDef[] }
interface StageDef { id: NyscStageId; title: string; blurb: string; duties: readonly DutyDef[] }

const o = (id: string, points: 0 | 1 | 2, text: string, result: string): OptionDef => ({ id, text, points, result });
export const STAGES: readonly StageDef[] = Object.freeze([
  { id: 'registration', title: 'Week 1: Registration', blurb: 'Papers, medicals and kit. Get in order before camp life begins.', duties: [
    { id: 'documents', title: 'The document queue', scene: 'The registration hall is full. Your call-up letter, testimonial and ID are in your bag, and the corps member ahead of you is arguing about a missing photocopy.', options: [
      o('check', 2, 'Check every paper against the list before you reach the desk.', 'Your papers are in order, and the officer stamps them without a second look.'),
      o('share', 1, 'Share your spare photocopy with the person ahead and sort yours out after.', 'A kind move. You lose your place, but the officer lets you through when you return.'),
      o('hope', 0, 'Skip the checking and trust your luck.', 'The officer sends you to the back of the line for a missing photocopy.')] },
    { id: 'medicals', title: 'The camp clinic', scene: 'The nurse checks your blood pressure and asks about allergies and old illnesses.', options: [
      o('honest', 2, 'Answer honestly, including the small allergy you almost forgot.', 'The nurse notes it down. A week later it spares you a bad rash.'),
      o('ask', 1, 'Ask what each test is for before you take it.', 'The nurse explains, a little tired of questions, and you finish last in the queue.'),
      o('rush', 0, 'Say everything is fine so you can finish faster.', 'You finish quickly, but an itchy rash on day three sends you back to the clinic.')] },
    { id: 'kit', title: 'Collecting the kit', scene: 'Khaki trousers, white shirts, the cap and the boots. The store keeper hands over a bundle.', options: [
      o('try', 2, 'Try the boots and trousers on before you leave the store.', 'They fit. You will not limp on parade.'),
      o('swap', 1, 'Take it and swap sizes with a friend later.', 'After a long swap round the bunk, one boot is still half a size wrong.'),
      o('go', 0, 'Take the bundle and go.', 'The boots pinch by evening, and the store is closed.')] },
  ] },
  { id: 'platoon', title: 'Week 2: The platoon', blurb: 'Dawn formation, skills day and the camp market. Your platoon becomes your family.', duties: [
    { id: 'formation', title: 'Meeting the platoon', scene: 'Your platoon assembles at dawn. The platoon leader asks everyone to say their name and where they studied.', options: [
      o('name', 2, 'Introduce yourself clearly and learn three names before breakfast.', 'By breakfast you are the person who knows everyone.'),
      o('wait', 1, 'Wait for the others to go first.', 'You are friendly, but it takes days for people to remember your name.'),
      o('late', 0, 'Arrive late and slip in at the back.', 'The leader notices. You carry the water drum to the bunks as a lesson.')] },
    { id: 'skills', title: 'Skills day', scene: 'Workshops run all morning: baking, soap-making, phone repair and small-scale farming.', options: [
      o('one', 2, 'Pick one skill you could really use and finish a small project.', 'You leave with a finished project and a real idea for after service.'),
      o('three', 1, 'Try three workshops without finishing any.', 'You learn a little of everything and finish nothing.'),
      o('shade', 0, 'Spend the morning in the shade.', 'A cool morning, and nothing to show for it.')] },
    { id: 'mammy', title: 'An evening at Mammy Market', scene: 'The camp market glows with lanterns and the smell of suya and jollof. Music drifts across from the stage.', options: [
      o('share', 2, 'Buy supper for your bunkmates and split the cost.', 'Your bunk eats together and sings along. It is the night people remember.'),
      o('mine', 1, 'Buy only your own and enjoy the music.', 'A good evening, quietly enjoyed.'),
      o('bargain', 0, 'Haggle so hard the seller closes the stall.', 'The seller packs up early, and the whole queue behind you groans.')] },
  ] },
  { id: 'parade', title: 'Week 3: The parade', blurb: 'Drill rehearsals and a crisp uniform for the march past.', duties: [
    { id: 'drill', title: 'Drill rehearsal', scene: 'The drill instructor calls "Quick march!" under the afternoon sun. Your platoon is out of step.', options: [
      o('count', 2, 'Count the beat out loud with your neighbours until you match.', 'Within ten minutes the whole platoon lands on the same foot.'),
      o('follow', 1, 'Follow the person in front and hope.', 'You are in step most of the time, and the instructor says so.'),
      o('heat', 0, 'Complain about the heat.', 'The heat is real, and so are the extra laps.')] },
    { id: 'uniform', title: 'Pressing the uniform', scene: 'The night before the parade you need a crisp uniform and clean boots, and only one iron is going round the hostel.', options: [
      o('help', 2, 'Press yours, polish your boots, and lend a hand to a mate who has no iron.', 'Two uniforms are crisp by lights-out, and a friend owes you a favour.'),
      o('mine', 1, 'Press only your own.', 'You look sharp, and your bunk looks a little scruffy.'),
      o('sleep', 0, 'Sleep early and deal with it in the morning.', 'The morning rush is a mess, and your collar shows it.')] },
    { id: 'march', title: 'The march past', scene: 'The parade ground is full of families and the band starts to play.', options: [
      o('eyes', 2, 'Eyes front, arms swinging with the band.', 'Your line is perfect, and the officers nod as you pass.'),
      o('nod', 1, 'Keep the line and give a small nod to your family.', 'A warm moment that costs no step.'),
      o('wave', 0, 'Wave at your family and lose the step.', 'The platoon behind you trips on your gap, and everyone laughs afterwards.')] },
  ] },
]);
export const DUTIES: readonly DutyDef[] = STAGES.flatMap((stage) => stage.duties);
const POSTINGS = ['a secondary school, teaching Mathematics', 'a community clinic, as an administrative assistant', 'a local radio station, producing the morning show', 'a bank branch, in customer service', 'a community library, running reading hours', 'a small-business hub, helping new traders'] as const;
const STATES: Readonly<Record<string, string>> = Object.freeze({ lagos: 'Lagos State', abuja: 'FCT', ibadan: 'Oyo State', 'port-harcourt': 'Rivers State', kano: 'Kano State', abeokuta: 'Ogun State', ota: 'Ogun State', 'ijebu-ode': 'Ogun State', sagamu: 'Ogun State', ilorin: 'Kwara State', akure: 'Ondo State', 'ado-ekiti': 'Ekiti State', 'benin-city': 'Edo State' });

/** The camp a city's corps members go to: the two well-known ones by name, any other city's by its own. */
export function campOf(cityId: string): { name: string; state: string } {
  const name = cityRules(cityId)?.name ?? 'Your city';
  return { name: cityId === 'lagos' ? 'Iyana-Ipaja Orientation Camp' : cityId === 'abuja' ? 'Kubwa Orientation Camp' : `${name} Orientation Camp`, state: STATES[cityId] ?? name };
}
export const honourFor = (points: number): string => (points >= 14 ? 'Distinction' : points >= 9 ? 'Credit' : 'Pass');
export const dutyOf = (id: string): DutyDef | undefined => DUTIES.find((duty) => duty.id === id);

export function nyscService(ctx: RouteContext) {
  const worker = workerOf(ctx);
  const on = (): boolean => ctx.checks?.setting?.('nyscOn') === true;
  const batchLabel = (): string => { const value = ctx.checks?.text?.('nyscBatch'); return typeof value === 'string' && value.trim() ? value.trim().slice(0, 12) : '2026-C'; };
  const rowOf = (c: MiniGamesCollection | null, me: string): NyscRow | null => { const row = c?.nysc[me]; return row && row.batch === batchLabel() ? row : null; };
  const dayRow = (c: MiniGamesCollection, me: string, day: number): DayRow => { const row = c.days[me]; return row && row.day === day ? row : (c.days[me] = { day, buys: 0, rephrased: 0, earned: 0 }); };
  const dayNumber = (row: NyscRow, now: number): number => Math.max(0, dayOf(now) - row.joinedDay);
  const points = (row: NyscRow): number => Object.values(row.duties).reduce((sum, item) => sum + item.points, 0);

  function stageViews(row: NyscRow, now: number): NyscStageView[] {
    const day = dayNumber(row, now);
    return STAGES.map((stage, at) => {
      const duties: NyscDutyView[] = stage.duties.map((duty) => {
        const done = row.duties[duty.id];
        const picked = done ? duty.options.find((option) => option.id === done.option) : undefined;
        return { id: duty.id, title: duty.title, scene: duty.scene, options: duty.options.map((option) => ({ id: option.id, text: option.text })), done: Boolean(done), ...(picked ? { result: picked.result } : {}) };
      });
      return { id: stage.id, title: stage.title, blurb: stage.blurb, opensDay: at * STAGE_DAYS, open: day >= at * STAGE_DAYS, done: duties.every((duty) => duty.done), duties };
    });
  }
  function cardOf(row: NyscRow, name: string): NyscCard | null {
    const out = row.passedOut;
    if (!out) return null;
    return { name: name.slice(0, 24), batch: row.batch, camp: row.camp, state: row.state, platoon: row.platoon, honour: out.honour, posting: out.posting,
      passedOutDay: new Date(out.day * 86400000).toISOString().slice(0, 10) };
  }
  function view(db: Db | null, session: SessionRecord, now: number): NyscView {
    const row = rowOf(db ? peekMinigames(db) : null, session.publicId);
    const base = { on: on(), batch: batchLabel() };
    if (!row) return { ...base, joined: false, day: 0, camp: null, platoon: null, stages: [], dutyToday: false, passingOut: 'locked', card: null, earned: 0 };
    const day = dayNumber(row, now), stages = stageViews(row, now), all = stages.every((stage) => stage.done);
    return { ...base, joined: true, day, camp: { name: row.camp, state: row.state }, platoon: row.platoon, stages, dutyToday: row.dutyDay === dayOf(now),
      passingOut: row.passedOut ? 'done' : day >= ARC_DAYS && all ? 'ready' : 'locked', card: cardOf(row, ctx.publicSession(session).name), earned: row.earned };
  }
  function gate(session: SessionRecord, body: Record<string, unknown>) {
    const cityId = typeof body.cityId === 'string' ? body.cityId : '';
    if (!on()) return no('season_closed', 'NYSC camp is not open right now.');
    if (countryOfCity(cityId) !== 'ng') return no('nigeria_only', 'NYSC camp is for Nigeria only.');
    return { ok: true as const, cityId, life: worker(session, cityId) };
  }
  function pay(c: MiniGamesCollection, me: string, life: Parameters<typeof reward>[1], city: string, amount: number, now: number): number {
    const day = dayRow(c, me, dayOf(now)), allowed = Math.min(amount, Math.max(0, SEASON_DAY_CAP - day.earned));
    const paid = reward(ctx, life, city, allowed, 'nysc');
    day.earned += paid;
    return paid;
  }

  return {
    view: (db: Db, session: SessionRecord, now: number): NyscView => view(db, session, now),

    /** Inside ctx.once: join this batch. Joining again in the same batch changes nothing. */
    join(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): Small | Refused {
      const g = gate(session, body);
      if (!g.ok) return g;
      const c = minigamesOf(ctx, db), me = session.publicId;
      if (rowOf(c, me)) return { ok: true };
      const camp = campOf(g.cityId);
      c.nysc[me] = { batch: batchLabel(), city: g.cityId, joinedDay: dayOf(now), camp: camp.name, state: camp.state, platoon: 1 + (hash(`${me}|${batchLabel()}`) % 12), duties: {}, dutyDay: -1, earned: 0, passedOut: null };
      return { ok: true };
    },

    /** Inside ctx.once: one duty, a choice in a scene. One a game day, from an open stage. */
    duty(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): Small | Refused {
      const g = gate(session, body);
      if (!g.ok) return g;
      const c = minigamesOf(ctx, db), me = session.publicId, row = rowOf(c, me);
      if (!row) return no('not_joined', 'Join the camp first.');
      const duty = dutyOf(idOf(body.duty) ?? ''), option = duty?.options.find((entry) => entry.id === idOf(body.option));
      if (!duty || !option) return no('unknown_duty', 'There is no such duty.');
      const stageAt = STAGES.findIndex((stage) => stage.duties.some((entry) => entry.id === duty.id));
      if (dayNumber(row, now) < stageAt * STAGE_DAYS) return no('stage_closed', `${STAGES[stageAt]!.title} opens on day ${stageAt * STAGE_DAYS + 1} of camp.`);
      if (row.duties[duty.id]) return { ok: true, paid: 0 };
      if (row.dutyDay === dayOf(now)) return no('one_a_day', 'One duty a day is enough. Come back tomorrow.');
      row.duties[duty.id] = { points: option.points, option: option.id, day: dayOf(now) };
      row.dutyDay = dayOf(now);
      const paid = pay(c, me, g.life, g.cityId, DUTY_PAY, now);
      row.earned += paid;
      return { ok: true, paid };
    },

    /** Inside ctx.once: the passing out, on day 22 of camp (day 21 counting from none) with every duty done: the honour, the posting and the pay, once. */
    passOut(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): Small | Refused {
      const g = gate(session, body);
      if (!g.ok) return g;
      const c = minigamesOf(ctx, db), me = session.publicId, row = rowOf(c, me);
      if (!row) return no('not_joined', 'Join the camp first.');
      if (row.passedOut) return { ok: true, paid: 0 };
      if (dayNumber(row, now) < ARC_DAYS) return no('not_yet', `The passing out parade is on day ${ARC_DAYS + 1} of camp.`);
      const left = DUTIES.filter((duty) => !row.duties[duty.id]).length;
      if (left) return no('duties_left', `${left} ${left === 1 ? 'duty is' : 'duties are'} still undone.`);
      const score = points(row);
      row.passedOut = { day: dayOf(now), honour: honourFor(score), posting: POSTINGS[hash(`${me}|${row.batch}|posting|${score}`) % POSTINGS.length]! };
      const paid = pay(c, me, g.life, g.cityId, PASS_OUT_PAY, now);
      row.earned += paid;
      return { ok: true, paid };
    },
  };
}
export type NyscService = ReturnType<typeof nyscService>;
