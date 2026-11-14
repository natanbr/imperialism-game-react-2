// M5 acceptance on the continent: FR-260 (replaces FR-157 from M8) the continent plays 40 turns with the current
// scripted player, with the start army's scores pinned; FR-215 (replaces FR-158 from M8): the start army's upkeep
// changes the treasury, so the frozen M4 player's turn-1 orders are the same on both worlds, and without the FR-203
// start forces it does turn by turn the same on both. M10: FR-305 the FR-260 games hold the 4 Council meetings without a
// winner; FR-302 the scripted player gives the same orders as in the game without the Council.
import { beforeAll, describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { forceSize } from '@/engine/army/armies';
import { SCRIPTED_GARRISON } from '@/definisions/regiments';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameEvent } from '@/engine/turn/context';
import { computerOrders } from '@/engine/ai/players';
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
import { withoutStartForces } from './armyFixtures';
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

  it('FR-260 FR-215 with the start army (FR-203) nation 2 pays its $100 upkeep every turn, has nothing disbanded for want of money and keeps 4 arms in its capital province', () => {
    expect(SEEDS.map(seed => ({ seed, upkeep: games.get(seed)!.first.upkeep, noPay: games.get(seed)!.first.noPay }))).toEqual(
      SEEDS.map(seed => ({ seed, upkeep: Array(TURNS).fill(100), noPay: 0 }))
    );
    const capitalArms = (s: GameState) => forceSize(s.armies.find(a => a.ownerId === N2 && a.provinceId === 'province-nation-2-sw') ?? { regiments: [] });
    expect(SEEDS.map(seed => capitalArms(games.get(seed)!.first.final))).toEqual(SEEDS.map(() => SCRIPTED_GARRISON.capitalArms));
  });

  /** Nation 2's turn-40 score of each seed in one game kind. */
  const scores = (kind: 'first' | 'bare' | 'twoIslands') => SEEDS.map(seed => games.get(seed)![kind].turns[N2][TURNS - 1].score.total);

  it('FR-260 with the start army nation 2\'s turn-40 score is the pinned 1419, 1451, 1441, 1469 (seeds 1 to 4)', () => {
    // Review R1: the start army's $100 upkeep (FR-202) moves the score from the two-islands one; these are the numbers a
    // change must move on purpose, as FR-159's v1 baselines.
    expect(scores('first')).toEqual([1419, 1451, 1441, 1469]);
  });

  it('FR-260 FR-215 without the start forces nation 2\'s turn-40 score on the continent is the same seed\'s score on two-islands: 1493, 1496, 1490, 1476', () => {
    // The seams of M5 to M8 change nothing else: only the start army (its upkeep) and the 4 horses move the continent game.
    const at40 = (game: Game) => game.turns[N2][TURNS - 1].score;
    expect(SEEDS.map(seed => at40(games.get(seed)!.bare))).toEqual(SEEDS.map(seed => at40(games.get(seed)!.twoIslands)));
    expect(scores('twoIslands')).toEqual([1493, 1496, 1490, 1476]);
    console.log('FR-260 nation 2 score at turn 40, continent with the start army / without / two-islands:', JSON.stringify(SEEDS.map((seed, i) => [seed, scores('first')[i], scores('bare')[i], scores('twoIslands')[i]])));
  });

  it('FR-305 each FR-260 game holds 4 meetings (turns 10, 20, 30 and 40, dated Summer 1817 to Winter 1824), none with a winner, and ends by the turn limit', () => {
    const meetings = (game: Game) => game.councils.map(c => [c.turn, c.year, c.winnerId ?? null]);
    expect(SEEDS.map(seed => meetings(games.get(seed)!.first))).toEqual(SEEDS.map(() => [[10, 1817, null], [20, 1819, null], [30, 1822, null], [40, 1824, null]]));
    expect(SEEDS.map(seed => games.get(seed)!.first.final.gameOver!.reason)).toEqual(SEEDS.map(() => undefined));
    expect(SEEDS.map(seed => games.get(seed)!.twoIslands.councils)).toEqual(SEEDS.map(() => []));
    const counts = SEEDS.map(seed => [seed, games.get(seed)!.first.councils.map(c => `t${c.turn} ${c.nominees.map(n => `${n.nationId}:${n.total}`).join('/')}`)]);
    console.log('FR-305 Council per seed (meeting turn, the votes of each nominee, of 12):', JSON.stringify(counts));
  });

  it('FR-302 the scripted player gives the same orders on every turn as in the game without the Council, and the games end the same', () => {
    for (const seed of SEEDS) {
      const { first, noCouncil } = games.get(seed)!;
      expect(first.orders).toHaveLength(TURNS);
      for (let i = 0; i < TURNS; i++) expect(first.orders[i], `seed ${seed} turn ${i + 1}`).toEqual(noCouncil.orders[i]);
      expect(noCouncil.councils).toEqual([]);
      expect(first.final).toEqual(noCouncil.final);
    }
  });
});

describe('FR-215 the seams with the start army: the frozen M4 player on both worlds, seeds 1 to 4 (replaces FR-158)', () => {
  /** Nation 2 scripted and nation 1 idle, and (R3) both nations scripted; the continent without its start forces. */
  const games = new Map<number, Record<'n2' | 'both', Record<WorldId, Game>>>();
  beforeAll(() => {
    for (const seed of SEEDS) {
      games.set(seed, {
        n2: { 'two-islands': play('two-islands', frozenM4, seed), continent: play('continent', frozenM4, seed, 'world', withoutStartForces) },
        both: { 'two-islands': play('two-islands', frozenM4Both, seed), continent: play('continent', frozenM4Both, seed, 'world', withoutStartForces) },
      });
    }
  }, 180_000);

  it.each(SEEDS)('FR-215 seed %i: the frozen M4 player\'s turn-1 orders on the continent (start army, world market) equal its two-islands turn-1 orders', seed => {
    const continent = newGame({ seed, world: 'continent', market: 'world' });
    const v1 = newGame({ seed, world: 'two-islands' });

    expect(m4ScriptedPlayer(continent, N2)).toEqual(m4ScriptedPlayer(v1, N2));
    // R3: nation 1's too, whose land borders Arvelia
    expect(m4ScriptedPlayer(continent, N1)).toEqual(m4ScriptedPlayer(v1, N1));
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
