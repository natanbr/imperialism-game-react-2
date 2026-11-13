// M5 acceptance on the continent: FR-157 the continent plays 40 turns with the current scripted player;
// FR-158 the seams are neutral: the frozen M4 player does turn by turn the same on both worlds.
import { beforeAll, describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
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
 * FR-198: the continent games of FR-157 and FR-158 name the world market (`market: 'world'`), since M7 gives the
 * continent the partners market (FR-182); the partners continent is FR-196's.
 */
function play(world: WorldId, orders: (s: GameState) => Record<string, Order[]>, seed: number, market?: MarketMode): Game {
  const start = newGame({ seed, world, ...(market ? { market } : {}) });
  let state = start;
  let refused = 0;
  const turns: Record<NationId, NationTurn[]> = { [N1]: [], [N2]: [] };
  const health = { meals: 0, sick: 0, starved: 0, violations: [] as string[] };
  for (let turn = 1; turn <= TURNS; turn++) {
    const result = resolveTurn(state, orders(state), state.seed);
    refused += result.events.filter(e => e.type === 'order-rejected').length;
    for (const e of result.events) {
      if (e.type !== 'workers-fed' || e.nationId !== N2) continue;
      health.meals++;
      health.sick += e.sick;
      health.starved += e.starved;
    }
    state = result.state;
    health.violations.push(...[...invariantViolations(state), ...worldViolations(state, start)].map(v => `turn ${turn}: ${v}`));
    for (const nationId of [N1, N2]) turns[nationId].push(nationTurn(state, nationId, turn));
  }
  return { turns, refused, health, final: state };
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

describe('FR-157 the continent plays: 40 turns, nation 2 scripted, nation 1 idle, seeds 1 to 4', () => {
  const games = new Map<number, { first: Game; again: Game; twoIslands: Game }>();
  beforeAll(() => {
    for (const seed of SEEDS) {
      games.set(seed, {
        first: play('continent', current, seed, 'world'),
        again: play('continent', current, seed, 'world'),
        twoIslands: play('two-islands', current, seed),
      });
    }
  }, 180_000);

  it('FR-157 the games are played on the continent: worldId, 4 minor nations and 12 provinces at the end', () => {
    expect(SEEDS.map(seed => worldOf(games.get(seed)!.first))).toEqual(SEEDS.map(() => CONTINENT));
    expect(SEEDS.map(seed => worldOf(games.get(seed)!.twoIslands))).toEqual(SEEDS.map(() => TWO_ISLANDS));
  });

  it('FR-157 the world invariants see a written minor tile, an owner that disagrees with its province, a moved province and a left intent', () => {
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

  it('FR-157 the registry plays nation 2 only (nation 1 is the human)', () => {
    expect(Object.keys(computerOrders(newGame({ seed: 1, world: 'continent' })))).toEqual([N2]);
  });

  it('FR-157 no order is refused on any seed', () => {
    expect(SEEDS.map(seed => games.get(seed)!.first.refused)).toEqual(SEEDS.map(() => 0));
  });

  it('FR-157 nation 2 is fed every turn, no worker sick or starved, and the invariants and world invariants hold after every turn', () => {
    expect(SEEDS.map(seed => ({ seed, ...games.get(seed)!.first.health }))).toEqual(
      SEEDS.map(seed => ({ seed, meals: TURNS, sick: 0, starved: 0, violations: [] }))
    );
  });

  it('FR-157 the same seed gives a deep-equal game', () => {
    for (const seed of SEEDS) {
      const { first, again } = games.get(seed)!;
      expect(again.final).toEqual(first.final);
      expect(first.final.turn).toBe(TURNS + 1);
    }
  });

  it('FR-157 nation 2 develops on the continent: its score grows over the game on every seed', () => {
    const rows = SEEDS.map(seed => {
      const { turns } = games.get(seed)!.first;
      return { seed, grew: turns[N2][TURNS - 1].score.total > scoreOf(newGame({ seed, world: 'continent' }), N2).total };
    });
    console.log('FR-157 nation 2 score at turn 40:', JSON.stringify(SEEDS.map(seed => [seed, games.get(seed)!.first.turns[N2][TURNS - 1].score.total])));
    expect(rows).toEqual(SEEDS.map(seed => ({ seed, grew: true })));
  });

  it('FR-157 nation 2\'s turn-40 score on the continent is the same seed\'s score on two-islands', () => {
    const at40 = (game: Game) => game.turns[N2][TURNS - 1].score;
    expect(SEEDS.map(seed => at40(games.get(seed)!.first))).toEqual(SEEDS.map(seed => at40(games.get(seed)!.twoIslands)));
  });
});

describe('FR-158 the seams are neutral: the frozen M4 player on both worlds, seeds 1 to 4', () => {
  /** Nation 2 scripted and nation 1 idle, and (R3) both nations scripted. */
  const games = new Map<number, Record<'n2' | 'both', Record<WorldId, Game>>>();
  beforeAll(() => {
    for (const seed of SEEDS) {
      games.set(seed, {
        n2: { 'two-islands': play('two-islands', frozenM4, seed), continent: play('continent', frozenM4, seed, 'world') },
        both: { 'two-islands': play('two-islands', frozenM4Both, seed), continent: play('continent', frozenM4Both, seed, 'world') },
      });
    }
  }, 180_000);

  it('FR-158 each pair compares a two-islands game with a continent game (worldId, minor nations, provinces)', () => {
    for (const seed of SEEDS) {
      for (const run of ['n2', 'both'] as const) {
        const { 'two-islands': v1, continent } = games.get(seed)![run];
        expect({ v1: worldOf(v1), continent: worldOf(continent) }).toEqual({ v1: TWO_ISLANDS, continent: CONTINENT });
      }
    }
  });

  it.each(SEEDS)('FR-158 seed %i: every turn both nations (nation 2 scripted, nation 1 idle) have the same score, treasury, warehouse, tile levels and rail links on both worlds', seed => {
    const { 'two-islands': v1, continent } = games.get(seed)!.n2;
    for (const nationId of [N1, N2]) {
      expect(continent.turns[nationId]).toHaveLength(TURNS);
      for (let i = 0; i < TURNS; i++) expect(continent.turns[nationId][i]).toEqual(v1.turns[nationId][i]);
    }
  });

  it.each(SEEDS)('FR-158 seed %i: with both nations scripted, every turn both nations are the same on both worlds', seed => {
    const { 'two-islands': v1, continent } = games.get(seed)!.both;
    for (const nationId of [N1, N2]) {
      expect(continent.turns[nationId]).toHaveLength(TURNS);
      for (let i = 0; i < TURNS; i++) expect(continent.turns[nationId][i]).toEqual(v1.turns[nationId][i]);
    }
  });

  it('FR-158 the frozen M4 player has as many orders refused on the continent as on two-islands', () => {
    for (const run of ['n2', 'both'] as const) {
      const refused = (world: WorldId) => SEEDS.map(seed => games.get(seed)![run][world].refused);
      expect(refused('continent')).toEqual(refused('two-islands'));
    }
  });

  it('FR-158 the world invariants hold after every turn of every continent game', () => {
    const violations = SEEDS.flatMap(seed => (['n2', 'both'] as const).flatMap(run => games.get(seed)![run].continent.health.violations));
    expect(violations).toEqual([]);
  });
});
