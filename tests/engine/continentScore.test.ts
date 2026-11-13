// M5 acceptance on the continent: FR-157 the continent plays 40 turns with the current scripted player;
// FR-158 the seams are neutral: the frozen M4 player does turn by turn the same on both worlds.
import { beforeAll, describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { computerOrders } from '@/engine/ai/players';
import { railLinksOf } from '@/engine/systems/railroadSystem';
import { scoreOf } from '@/engine/score/score';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import type { Score } from '@/types/Score';
import type { WorldId } from '@/types/World';
import { m4ScriptedPlayer } from './m4ScriptedPlayer';
import { invariantViolations, N2, nationOf } from './fixtures';

const SEEDS = [1, 2, 3, 4];
const TURNS = 40;

/** What FR-158 compares of nation 2 after each turn. */
interface Nation2 {
  turn: number;
  score: Score;
  treasury: number;
  warehouse: Record<string, number>;
  /** Each own tile's resource, its level and whether it is found: "3-9 grain 1 found". */
  levels: string[];
  links: string[];
}
interface Game {
  turns: Nation2[];
  refused: number;
  health: { meals: number; sick: number; starved: number; violations: string[] };
  final: GameState;
}

function nation2(state: GameState, turn: number): Nation2 {
  const n = nationOf(state, N2);
  return {
    turn,
    score: scoreOf(state, N2),
    treasury: n.treasury,
    warehouse: { ...n.warehouse },
    levels: state.map.tiles
      .flat()
      .filter(t => t.ownerNationId === N2 && t.resource)
      .map(t => `${t.id} ${t.resource!.type} ${t.resource!.level} ${t.resource!.discovered === false ? 'hidden' : 'found'}`),
    links: railLinksOf(state)
      .filter(l => l.nationId === N2)
      .map(l => `${l.from.x},${l.from.y}-${l.to.x},${l.to.y}`),
  };
}

/** 40 turns from the real new game on `world`; nation 2's orders from `orders`, none for nation 1 (idle). */
function play(world: WorldId, orders: (s: GameState) => Record<string, Order[]>, seed: number): Game {
  let state = newGame({ seed, world });
  let refused = 0;
  const turns: Nation2[] = [];
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
    health.violations.push(...invariantViolations(state).map(v => `turn ${turn}: ${v}`));
    turns.push(nation2(state, turn));
  }
  return { turns, refused, health, final: state };
}

/** The store's End Turn: the registry's orders for every computer nation, here nation 2 only (FR-099). */
const current = (s: GameState) => computerOrders(s);
const frozenM4 = (s: GameState) => ({ [N2]: m4ScriptedPlayer(s, N2) });

describe('FR-157 the continent plays: 40 turns, nation 2 scripted, nation 1 idle, seeds 1 to 4', () => {
  const games = new Map<number, { first: Game; again: Game }>();
  beforeAll(() => {
    for (const seed of SEEDS) games.set(seed, { first: play('continent', current, seed), again: play('continent', current, seed) });
  }, 180_000);

  it('FR-157 the registry plays nation 2 only (nation 1 is the human)', () => {
    expect(Object.keys(computerOrders(newGame({ seed: 1, world: 'continent' })))).toEqual([N2]);
  });

  it('FR-157 no order is refused on any seed', () => {
    expect(SEEDS.map(seed => games.get(seed)!.first.refused)).toEqual(SEEDS.map(() => 0));
  });

  it('FR-157 nation 2 is fed every turn, no worker sick or starved, and the invariants hold after every turn', () => {
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
      return { seed, grew: turns[TURNS - 1].score.total > scoreOf(newGame({ seed, world: 'continent' }), N2).total };
    });
    console.log('FR-157 nation 2 score at turn 40:', JSON.stringify(SEEDS.map(seed => [seed, games.get(seed)!.first.turns[TURNS - 1].score.total])));
    expect(rows).toEqual(SEEDS.map(seed => ({ seed, grew: true })));
  });
});

describe('FR-158 the seams are neutral: the frozen M4 player on both worlds, seeds 1 to 4', () => {
  const games = new Map<number, Record<WorldId, Game>>();
  beforeAll(() => {
    for (const seed of SEEDS) {
      games.set(seed, { 'two-islands': play('two-islands', frozenM4, seed), continent: play('continent', frozenM4, seed) });
    }
  }, 180_000);

  it.each(SEEDS)('FR-158 seed %i: every turn nation 2 has the same score, treasury, warehouse, tile levels and rail links on both worlds', seed => {
    const { 'two-islands': v1, continent } = games.get(seed)!;
    expect(continent.turns).toHaveLength(TURNS);
    for (let i = 0; i < TURNS; i++) expect(continent.turns[i]).toEqual(v1.turns[i]);
  });

  it('FR-158 the frozen M4 player has as many orders refused on the continent as on two-islands', () => {
    const refused = (world: WorldId) => SEEDS.map(seed => games.get(seed)![world].refused);
    expect(refused('continent')).toEqual(refused('two-islands'));
  });
});
