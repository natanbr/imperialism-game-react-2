// M5 acceptance on the continent: FR-260 (replaces FR-157 from M8) the continent plays 40 turns with the current
// scripted player, with the start army's scores pinned; FR-215 (replaces FR-158 from M8): the start army's upkeep
// changes the treasury, so the frozen M4 player's turn-1 orders are the same on both worlds, and without the FR-203
// start forces it does turn by turn the same on both. FR-305/510: the fourth Council elects a winner.
// FR-302: the scripted player gives the same orders as in the game without the Council.
import { beforeAll, describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { forceSize } from '@/engine/army/armies';
import { SCRIPTED_GARRISON } from '@/definisions/regiments';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameEvent } from '@/engine/turn/context';
import { computerOrders } from '@/engine/ai/players';
import { abstainedProvinces } from '@/engine/council/council';
import { railLinksOf } from '@/engine/systems/railroadSystem';
import { scoreOf } from '@/engine/score/score';
import type { Order } from '@/engine/orders/Order';
import type { NationId } from '@/types/Common';
import type { GameState } from '@/types/GameState';
import type { Score } from '@/types/Score';
import type { WorldId } from '@/types/World';
import type { MarketMode } from '@/types/Market';
import { m4ScriptedPlayer } from './m4ScriptedPlayer';
import { invariantViolations, N1, N2, nationOf, worldViolations } from './fixtures';
import { beforeRanches, historicalContinent, withoutStartForces } from './armyFixtures';
import { withoutCouncil } from './withoutCouncil';

const SEEDS = [1, 2, 3, 4];
const TURNS = 40;

/** What FR-158 compares of a nation after each turn. */
interface NationTurn {
  turn: number;
  score: Score;
  treasury: number;
  warehouse: Record<string, number>;
  /** Each own tile's resource, its level and whether it is found: "3-9 grain 1 found". */
  levels: string[];
  links: string[];
}
interface Game {
  /** Both nations, every turn: the scripted ones and the idle one. */
  turns: Record<NationId, NationTurn[]>;
  refused: number;
  /** Nation 2's meals; the invariants and the world invariants (E3) of the whole state, after every turn. */
  health: { meals: number; sick: number; starved: number; violations: string[] };
  /** Nation 2's army upkeep each turn (FR-202; 0 on a turn without an `army-upkeep` event) and its no-pay disbands. */
  upkeep: number[];
  noPay: number;
  /** Every nation's orders of each turn (FR-302) and the Council meetings (FR-305). */
  orders: Record<string, Order[]>[];
  councils: Extract<GameEvent, { type: 'council-met' }>[];
  final: GameState;
}

function nationTurn(state: GameState, nationId: NationId, turn: number): NationTurn {
  const n = nationOf(state, nationId);
  return {
    turn,
    score: scoreOf(state, nationId),
    treasury: n.treasury,
    warehouse: { ...n.warehouse },
    levels: state.map.tiles
      .flat()
      .filter(t => t.ownerNationId === nationId && t.resource)
      .map(t => `${t.id} ${t.resource!.type} ${t.resource!.level} ${t.resource!.discovered === false ? 'hidden' : 'found'}`),
    links: railLinksOf(state)
      .filter(l => l.nationId === nationId)
      .map(l => `${l.from.x},${l.from.y}-${l.to.x},${l.to.y}`),
  };
}

/**
 * 40 turns from the real new game on `world`; the orders of the scripted nations from `orders`, none for an idle one.
 * FR-198: the continent games of FR-260 and FR-215 name the world market (`market: 'world'`), since M7 gives the
 * continent the partners market (FR-242); the partners continent is FR-247's. `prepare` changes the new game first
 * (FR-215: `withoutStartForces`).
 */
function play(
  world: WorldId,
  orders: (s: GameState) => Record<string, Order[]>,
  seed: number,
  market?: MarketMode,
  prepare: (s: GameState) => GameState = s => s,
  resolve: typeof resolveTurn = resolveTurn
): Game {
  const start = prepare(newGame({ seed, world, ...(market ? { market } : {}) }));
  let state = start;
  let refused = 0;
  const turns: Record<NationId, NationTurn[]> = { [N1]: [], [N2]: [] };
  const health = { meals: 0, sick: 0, starved: 0, violations: [] as string[] };
  const upkeep: number[] = [];
  let noPay = 0;
  const ordersByTurn: Record<string, Order[]>[] = [];
  const councils: Game['councils'] = [];
  for (let turn = 1; turn <= TURNS; turn++) {
    const given = orders(state);
    ordersByTurn.push(given);
    const result = resolve(state, given, state.seed);
    for (const e of result.events) if (e.type === 'council-met') councils.push(e);
    refused += result.events.filter(e => e.type === 'order-rejected').length;
    let paid = 0;
    for (const e of result.events) {
      if (e.type === 'army-upkeep' && e.nationId === N2) paid += e.amount;
      if (e.type === 'regiments-disbanded' && e.nationId === N2 && e.reason === 'no-pay') noPay += e.count;
      if (e.type !== 'workers-fed' || e.nationId !== N2) continue;
      health.meals++;
      health.sick += e.sick;
      health.starved += e.starved;
    }
    upkeep.push(paid);
    state = result.state;
    health.violations.push(...[...invariantViolations(state), ...worldViolations(state, start)].map(v => `turn ${turn}: ${v}`));
    for (const nationId of [N1, N2]) turns[nationId].push(nationTurn(state, nationId, turn));
  }
  return { turns, refused, health, upkeep, noPay, orders: ordersByTurn, councils, final: state };
}

/** The world a game was played on, as its final state records it (F1: the test must not pass on a world option ignored). */
const worldOf = ({ final }: Game) => ({ worldId: final.worldId, minorNations: final.minorNations.length, provinces: final.provinces.length });
const CONTINENT = { worldId: 'continent', minorNations: 4, provinces: 12 };
const TWO_ISLANDS = { worldId: 'two-islands', minorNations: 0, provinces: 0 };

/** The store's End Turn: the registry's orders for every computer nation, here nation 2 only (FR-099). */
const current = (s: GameState) => computerOrders(s);
const frozenM4 = (s: GameState) => ({ [N2]: m4ScriptedPlayer(s, N2) });
/** R3: both nations played by the frozen M4 player, so nation 1's land next to Arvelia is worked too. */
const frozenM4Both = (s: GameState) => ({ [N1]: m4ScriptedPlayer(s, N1), [N2]: m4ScriptedPlayer(s, N2) });


describe('FR-260 (replaces FR-157) the continent plays: 40 turns, nation 2 scripted, nation 1 idle, seeds 1 to 4', () => {
  /** `bare`: the continent without its FR-203 start forces (FR-215); `noCouncil`: the engine without the Council (FR-302). */
  const games = new Map<number, { first: Game; again: Game; twoIslands: Game; bare: Game; noCouncil: Game }>();
  beforeAll(async () => {
    const off = await withoutCouncil();
    for (const seed of SEEDS) {
      games.set(seed, {
        first: play('continent', current, seed, 'world'),
        again: play('continent', current, seed, 'world'),
        twoIslands: play('two-islands', current, seed),
        bare: play('continent', current, seed, 'world', withoutStartForces),
        noCouncil: play('continent', s => off.computerOrders(s), seed, 'world', s => s, off.resolveTurn),
      });
    }
  }, 240_000);

  it('FR-260 the games are played on the continent: worldId, 4 minor nations and 12 provinces at the end', () => {
    expect(SEEDS.map(seed => worldOf(games.get(seed)!.first))).toEqual(SEEDS.map(() => CONTINENT));
    expect(SEEDS.map(seed => worldOf(games.get(seed)!.twoIslands))).toEqual(SEEDS.map(() => TWO_ISLANDS));
  });

  it('FR-260 the world invariants see a written minor tile, an owner that disagrees with its province, a moved province and a left intent', () => {
    const start = newGame({ seed: 1, world: 'continent' });
    const patchTile = (s: GameState, id: string, patch: Partial<GameState['map']['tiles'][number][number]>): GameState => ({
      ...s,
      map: { ...s.map, tiles: s.map.tiles.map(row => row.map(t => (t.id === id ? { ...t, ...patch } : t))) },
    });
    expect(worldViolations(start, start)).toEqual([]);
    expect(worldViolations(patchTile(start, '10-3', { ownerNationId: N1 }), start)).toEqual([
      'tile 10-3 owner nation-1, province province-minor-1 owner minor-1',
      'minor tile 10-3 changed',
    ]);
    expect(worldViolations(patchTile(start, '3-9', { ownerNationId: N2 }), start)).toEqual(['tile 3-9 owner nation-2, province province-nation-1-sw owner nation-1']);
    expect(worldViolations(patchTile(start, '3-9', { provinceId: 'province-nation-1-nw' }), start)).toEqual([
      'tile 3-9 names province-nation-1-nw, which does not list it',
      'province province-nation-1-sw lists 3-9, which names province-nation-1-nw',
    ]);
    const intent = { id: 'intent-1-1', kind: 'pact', nationId: N1, turn: 1 };
    expect(worldViolations({ ...start, intents: [intent] }, start)).toEqual(['1 intents left after the turn']);
  });

  it('FR-260 the registry plays nation 2 only (nation 1 is the human)', () => {
    expect(Object.keys(computerOrders(newGame({ seed: 1, world: 'continent' })))).toEqual([N2]);
  });

  it('FR-260 no order is refused on any seed', () => {
    expect(SEEDS.map(seed => games.get(seed)!.first.refused)).toEqual(SEEDS.map(() => 0));
  });

  it('FR-518 the scripted nation trains no University civilian in any of its 40 turns', () => {
    for (const seed of SEEDS) {
      const orders = games.get(seed)!.first.orders.flatMap(turn => turn[N2] ?? []);
      expect(orders.filter(o => o.kind === 'setUniversity' && o.count > 0)).toEqual([]);
    }
  });

  it('FR-260 nation 2 is fed every turn, no worker sick or starved, and the invariants and world invariants hold after every turn', () => {
    expect(SEEDS.map(seed => ({ seed, ...games.get(seed)!.first.health }))).toEqual(
      SEEDS.map(seed => ({ seed, meals: TURNS, sick: 0, starved: 0, violations: [] }))
    );
  });

  it('FR-260 the same seed gives a deep-equal game', () => {
    for (const seed of SEEDS) {
      const { first, again } = games.get(seed)!;
      expect(again.final).toEqual(first.final);
      expect(first.final.turn).toBe(TURNS + 1);
    }
  });

  it('FR-260 nation 2 develops on the continent: its score grows over the game on every seed', () => {
    const rows = SEEDS.map(seed => {
      const { turns } = games.get(seed)!.first;
      return { seed, grew: turns[N2][TURNS - 1].score.total > scoreOf(newGame({ seed, world: 'continent' }), N2).total };
    });
    console.log('FR-260 nation 2 score at turn 40:', JSON.stringify(SEEDS.map(seed => [seed, games.get(seed)!.first.turns[N2][TURNS - 1].score.total])));
    expect(rows).toEqual(SEEDS.map(seed => ({ seed, grew: true })));
  });

  // Re-recorded by M13 T-15 (FR-499; moved by FR-482, FR-487, FR-488, FR-489): was "$100 upkeep every turn and 4 arms in
  // its capital province" on every seed (no regiment recruited in 40 turns). With FR-482 the campaign raises the regiments
  // it can (no horses in "world": Grenadiers, Skirmishers, Regulars) from turn 11, so the upkeep rises from turn 12; seed 1
  // colonises Arvelia (war turn 21) and takes Testland North-East (war turn 30 since FR-538, was 28; FR-488, FR-489; the
  // upkeep steps did not move with it), seed 3 colonises Arvelia
  // (war turn 27). On seeds 2 and 4 the campaign stops short (field 29 against 37.5 needed on seed 4: the $2,500 campaign
  // floor stops the recruits) and its regiments stay in the capital province: 7 arms. Still exact, and still nothing
  // disbanded for want of money.
  const UPKEEP = (steps: [number, number][]) => steps.flatMap(([amount, turns]) => Array(turns).fill(amount));
  it('FR-260 FR-215 with the start army (FR-203) nation 2 pays the upkeep of the regiments it raises every turn, has nothing disbanded for want of money and keeps at least 4 arms in its capital province', () => {
    expect(SEEDS.map(seed => ({ seed, upkeep: games.get(seed)!.first.upkeep, noPay: games.get(seed)!.first.noPay }))).toEqual([
      { seed: 1, upkeep: UPKEEP([[100, 11], [125, 1], [150, 8], [175, 5], [200, 7], [225, 3], [250, 5]]), noPay: 0 },
      { seed: 2, upkeep: UPKEEP([[100, 11], [125, 1], [150, 8], [175, 4], [200, 16]]), noPay: 0 },
      { seed: 3, upkeep: UPKEEP([[100, 11], [125, 1], [150, 8], [175, 4], [200, 11], [225, 5]]), noPay: 0 },
      { seed: 4, upkeep: UPKEEP([[100, 11], [125, 1], [150, 14], [175, 13], [200, 1]]), noPay: 0 },
    ]);
    const capitalArms = (s: GameState) => forceSize(s.armies.find(a => a.ownerId === N2 && a.provinceId === 'province-nation-2-sw') ?? { regiments: [] });
    expect(SCRIPTED_GARRISON.capitalArms).toBe(4);
    // FR-518: different recruiting and campaign dates change the old capital counts [4,7,4,7].
    expect(SEEDS.map(seed => capitalArms(games.get(seed)!.first.final))).toEqual([4, 4, 4, 4]);
  });

  /** Nation 2's turn-40 score of each seed in one game kind. */
  const scores = (kind: 'first' | 'bare' | 'twoIslands') => SEEDS.map(seed => games.get(seed)![kind].turns[N2][TURNS - 1].score.total);

  it('FR-260 FR-510 FR-518 pins the continent turn-40 scores with the start army', () => {
    // Review R1: the start army's $100 upkeep (FR-202) moves the score from the two-islands one; these are the numbers a
    // change must move on purpose, as FR-159's v1 baselines.
    // M12 strategy C re-record (FR-456, FR-457 depot sites; FR-458 the campaign keeps its trained workers): 1419, 1451,
    // 1441, 1469 -> 1507, 1546, 1548, 1660, every seed up
    // M12 FR-459 re-record (no civilian works a tile the engineer's rail still needs): seed 4 1660 -> 1685, seeds 1 to 3
    // unchanged
    // M13 T-15 re-record (FR-499; moved by FR-482 to FR-489, FR-485's migrants with T-15's meal check): 1507, 1546, 1548,
    // 1685 -> 1454, 1352, 1477, 1430, every seed down (-53, -194, -71, -255). The campaign's regiments (FR-482) cost their
    // price and upkeep from turn 11 (see the upkeep test); seeds 1 and 3 win a colony for it, seeds 2 and 4 never reach the
    // campaign's strength in "world" (no horses) and keep paying. The partners game, the app's, is FR-487's and FR-247's.
    // M13 review fix round re-record (FR-538, review ST-01: before a war on a Great Power the army gathers at the front and
    // declares only at more than twice the defence there, so the warning shows first): seed 1 1454 -> 1443 (-11; the war
    // on Testland turn 28 -> 30 and Testland North-East taken turn 29 -> 31, 2 turns less of its output); seeds 2 to 4
    // unchanged (no war on a Great Power)
    // FR-505: seed 1 1443 -> 1363, seed 3 1477 -> 1367. Uncollected developments in their conquered
    // provinces now earn zero. Seeds 2 and 4 conquered no land and their scores stay the same.
    // FR-518: [1363,1352,1367,1430] before ranches and fleets. All four buy an Indiaman on turn 12.
    // Ship materials compete with factory expansion, changing production and the campaign's timing.
    expect(scores('first')).toEqual([1159, 1225, 1207, 1222]);
  });

  it('FR-260 FR-215 FR-518 pins the army-less continent and protected two-islands turn-40 scores', () => {
    // Even without its army, the M15 continent has ranches and builds two ships; two-islands has neither.
    const bareScore = (treasury: number, capacity: number, developedLevels: number, total: number): Score => ({
      nationId: N2, treasury, capacity, developedLevels, jobsPaid: 0,
      points: { treasury: Math.floor(treasury / 100), industry: capacity * 10, development: developedLevels * 10, workInProgress: 0 },
      total,
    });
    expect(SEEDS.map(seed => games.get(seed)!.bare.turns[N2][TURNS - 1].score)).toEqual([
      bareScore(10012, 80, 53, 1430), bareScore(9787, 76, 57, 1427),
      bareScore(11835, 80, 56, 1478), bareScore(10716, 80, 55, 1457),
    ]);
    // M12 strategy C re-record (FR-454 to FR-457, the FR-125 margin): 1493, 1496, 1490, 1476 -> 1551, 1591, 1592, 1522
    // M12 FR-459 re-record: 1551, 1591, 1592, 1522 -> 1590, 1546, 1524, 1655 (FR-125's turn-40 numbers). Every seed first
    // differs on turn 10 (the rancher works 17-5, not 16-5 on the depot 17-4's rail path, which is joined a turn earlier
    // by one section fewer); seeds 2 and 3 end lower (-45, -68) with the same depots and as many development jobs.
    // Accepted: no depot waits for a job on its rail path any more and every turn-40 ratio is 2.02 or more
    // M12 FR-460 re-record: 1590, 1546, 1524, 1655 -> 1643, 1546, 1530, 1637. From turn 18 a training to expert ($1,000)
    // waits until the cash above the reserve pays for it; seeds 1 and 3 end higher (+53, +6), seed 4 lower (-18: 3 experts
    // at turn 40, not 5), seed 2 is unchanged. Accepted: the engineer is no longer kept from a rail section for want of
    // cash (two-islands seeds 7 and 15 joined the depot 20-2 a turn late), and the lowest FR-125 ratio rose from 1.51 to 1.60
    expect(scores('twoIslands')).toEqual([1643, 1546, 1530, 1637]);
    console.log('FR-260 nation 2 score at turn 40, continent with the start army / without / two-islands:', JSON.stringify(SEEDS.map((seed, i) => [seed, scores('first')[i], scores('bare')[i], scores('twoIslands')[i]])));
  });

  it('FR-305 FR-510 each FR-260 game holds four meetings and elects its winner in Winter 1824', () => {
    const meetings = (game: Game) => game.councils.map(c => [c.turn, c.year, c.winnerId ?? null]);
    // FR-501/502: four turn-limit endings -> four Council winners. The three earlier ballots still have no winner.
    const winners = [N2, N1, N2, N1];
    expect(SEEDS.map(seed => meetings(games.get(seed)!.first))).toEqual(winners.map(id => [[10, 1817, null], [20, 1819, null], [30, 1822, null], [40, 1824, id]]));
    expect(SEEDS.map(seed => games.get(seed)!.first.final.gameOver!.reason)).toEqual(['council', 'council', 'council', 'council']);
    expect(SEEDS.map(seed => games.get(seed)!.twoIslands.councils)).toEqual(SEEDS.map(() => []));
    const counts = SEEDS.map(seed => [seed, games.get(seed)!.first.councils.map(c => `t${c.turn} ${c.nominees.map(n => `${n.nationId}:${n.total}`).join('/')}`)]);
    console.log('FR-305 Council per seed (meeting turn, the votes of each nominee, of 12):', JSON.stringify(counts));
  });

  // Re-recorded by M13 T-15 (FR-499; moved by FR-487, FR-488, FR-489): was 4 to 4 at every meeting of every seed. Seeds 2
  // and 4 still are; seed 1 colonises Arvelia (turn 22) and takes Testland North-East (turn 29), so the turn-30 and turn-40
  // meetings are Valdoria 6 (Controlled 5, Colonies 1) to Testland 3; seed 3 colonises Arvelia (turn 28): 5 to 4. Arvelia's
  // province no longer abstains on those seeds. Still no winner (9 needed).
  // Re-recorded by the M13 review fix round (FR-538, review ST-01): seed 1 takes Testland North-East on turn 31 (war turn
  // 30; was 29 and 28), after the turn-30 meeting, so that meeting is Testland 4 to Valdoria 5 (Controlled 4, Colonies 1;
  // was 3 to 6); the turn-40 meeting is unchanged (3 to 6). Seeds 2 to 4 unchanged.
  it('FR-305 FR-510 each meeting counts each source of votes, including every free minor at turn 40', () => {
    const columns = (game: Game) =>
      game.councils.map(c => ({
        turn: c.turn,
        nominees: [...c.nominees].map(n => [n.nationId, n.controlled, n.colonies, n.otherGreatPowers, n.otherMinorNations, n.total]).sort(),
        abstained: abstainedProvinces(c),
      }));
    const fourToFour = (turn: number) => ({
      turn,
      nominees: [
        [N1, 4, 0, 0, 0, 4],
        [N2, 4, 0, 0, 0, 4],
      ],
      abstained: ['province-minor-1', 'province-minor-2', 'province-minor-3', 'province-minor-4'],
    });
    const count = (turn: number, testland: number[], valdoria: number[], abstained: string[]) => ({
      turn,
      nominees: [
        [N1, ...testland],
        [N2, ...valdoria],
      ],
      abstained,
    });
    // FR-501: the final Testland–Valdoria counts change by seed: 3–6 -> 6–6, 4–4 -> 4–8, 4–5 -> 7–5,
    // 4–4 -> 4–8. After conquest on seeds 1 and 3 the three free minors favor Testland; the four tied
    // minors on seeds 2 and 4 vote for Valdoria on standing.
    // FR-518: Arvelia falls on turns 27,26,26 for seeds 1–3. Seeds 1 and 3 also take Testland
    // North-East on turn 39. Seed 4 takes neither; standing gives Testland the four free minors.
    const afterColony = count(30, [4, 0, 0, 0, 4], [4, 1, 0, 0, 5], ['province-minor-2', 'province-minor-3', 'province-minor-4']);
    const lateConquest = count(40, [3, 0, 0, 3, 6], [5, 1, 0, 0, 6], []);
    expect(SEEDS.map(seed => columns(games.get(seed)!.first))).toEqual([
      [fourToFour(10), fourToFour(20), afterColony, lateConquest],
      [fourToFour(10), fourToFour(20), afterColony, count(40, [4, 0, 0, 3, 7], [4, 1, 0, 0, 5], [])],
      [fourToFour(10), fourToFour(20), afterColony, lateConquest],
      [fourToFour(10), fourToFour(20), fourToFour(30), count(40, [4, 0, 0, 4, 8], [4, 0, 0, 0, 4], [])],
    ]);
  });

  it('FR-302 FR-510 the scripted player gives the same orders through the final Council and only the recorded outcome differs', () => {
    for (const seed of SEEDS) {
      const { first, noCouncil } = games.get(seed)!;
      expect(first.orders).toHaveLength(TURNS);
      for (let i = 0; i < TURNS; i++) expect(first.orders[i], `seed ${seed} turn ${i + 1}`).toEqual(noCouncil.orders[i]);
      expect(noCouncil.councils).toEqual([]);
      // Equal turn-limit endings -> the same state plus the elected winner and its final ballot (FR-502).
      const { type, turn, year, ...vote } = first.councils[3];
      expect(type).toBe('council-met');
      expect(first.final).toEqual({
        ...noCouncil.final,
        gameOver: { ...noCouncil.final.gameOver, turn, year, reason: 'council', winnerId: vote.winnerId, decidedBy: vote.decidedBy, council: vote },
      });
    }
  });
});

describe('FR-215 the seams with the start army: the frozen M4 player on both worlds, seeds 1 to 4 (replaces FR-158)', () => {
  /** Nation 2 scripted and nation 1 idle, and (R3) both nations scripted; the continent without its start forces. */
  const games = new Map<number, Record<'n2' | 'both', Record<WorldId, Game>>>();
  beforeAll(() => {
    for (const seed of SEEDS) {
      games.set(seed, {
        n2: { 'two-islands': play('two-islands', frozenM4, seed), continent: play('continent', frozenM4, seed, 'world', historicalContinent) },
        both: { 'two-islands': play('two-islands', frozenM4Both, seed), continent: play('continent', frozenM4Both, seed, 'world', historicalContinent) },
      });
    }
  }, 180_000);

  it.each(SEEDS)('FR-215 FR-518 seed %i: only the M15 orchard changes the frozen M4 player\'s turn-1 orders on the continent', seed => {
    const continent = newGame({ seed, world: 'continent', market: 'world' });
    const v1 = newGame({ seed, world: 'two-islands' });

    for (const nationId of [N1, N2]) {
      const islandOrders = m4ScriptedPlayer(v1, nationId);
      expect(m4ScriptedPlayer(beforeRanches(continent), nationId)).toEqual(islandOrders);
      // Two level-1 orchards yielded four fruit; today's one level-2 orchard yields three.
      const transport = { kind: 'setTransportAllocations', nationId };
      expect(islandOrders.at(-1)).toEqual({ ...transport, allocations: { fruit: 4, livestock: 2 } });
      expect(m4ScriptedPlayer(continent, nationId)).toEqual([
        ...islandOrders.slice(0, -1), { ...transport, allocations: { fruit: 3, livestock: 2 } },
      ]);
    }
    expect(continent.armies.length).toBeGreaterThan(0);
  });

  it('FR-215 each pair compares a two-islands game with a continent game (worldId, minor nations, provinces)', () => {
    for (const seed of SEEDS) {
      for (const run of ['n2', 'both'] as const) {
        const { 'two-islands': v1, continent } = games.get(seed)![run];
        expect({ v1: worldOf(v1), continent: worldOf(continent) }).toEqual({ v1: TWO_ISLANDS, continent: CONTINENT });
      }
    }
  });

  it.each(SEEDS)('FR-215 seed %i: without the start forces, every turn both nations (nation 2 scripted, nation 1 idle) have the same score, treasury, warehouse, tile levels and rail links on both worlds', seed => {
    const { 'two-islands': v1, continent } = games.get(seed)!.n2;
    for (const nationId of [N1, N2]) {
      expect(continent.turns[nationId]).toHaveLength(TURNS);
      for (let i = 0; i < TURNS; i++) expect(continent.turns[nationId][i]).toEqual(v1.turns[nationId][i]);
    }
  });

  it.each(SEEDS)('FR-215 seed %i: without the start forces, with both nations scripted, every turn both nations are the same on both worlds', seed => {
    const { 'two-islands': v1, continent } = games.get(seed)!.both;
    for (const nationId of [N1, N2]) {
      expect(continent.turns[nationId]).toHaveLength(TURNS);
      for (let i = 0; i < TURNS; i++) expect(continent.turns[nationId][i]).toEqual(v1.turns[nationId][i]);
    }
  });

  it('FR-215 the frozen M4 player has as many orders refused on the continent as on two-islands', () => {
    for (const run of ['n2', 'both'] as const) {
      const refused = (world: WorldId) => SEEDS.map(seed => games.get(seed)![run][world].refused);
      expect(refused('continent')).toEqual(refused('two-islands'));
    }
  });

  it('FR-215 the world invariants hold after every turn of every continent game', () => {
    const violations = SEEDS.flatMap(seed => (['n2', 'both'] as const).flatMap(run => games.get(seed)![run].continent.health.violations));
    expect(violations).toEqual([]);
  });
});
