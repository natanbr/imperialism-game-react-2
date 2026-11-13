// FR-196, M7 done: the v2 trade baseline. 40 turns on the continent ("partners" market) with both Great
// Powers played by the scripted player: both open consulates early, both trade with minor nations, and the
// computer keeps a positive treasury. The measured numbers are logged and written into FR-196's status.
import { beforeAll, describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { pairKey } from '@/engine/diplomacy/relations';
import type { GameState } from '@/types/GameState';
import { invariantViolations, N1, N2, nationOf, worldViolations } from './fixtures';

const SEEDS = [1, 2, 3, 4];
const TURNS = 40;
const NATIONS = [N1, N2];

interface Game {
  /** The first turn after which the nation holds a consulate with a minor. */
  consulateBy: Record<string, number | undefined>;
  /** Deals with a minor counterparty (a goods-sold or goods-bought event), by nation. */
  minorDeals: Record<string, number>;
  /** The minors each nation dealt with. */
  minorsDealt: Record<string, string[]>;
  refused: number;
  /** Nation 2's treasury after every turn. */
  n2Treasury: number[];
  violations: string[];
  final: GameState;
}

function play(seed: number): Game {
  const start = newGame({ seed, world: 'continent' });
  const minors = new Set(start.minorNations.map(m => m.id));
  const game: Game = {
    consulateBy: { [N1]: undefined, [N2]: undefined },
    minorDeals: { [N1]: 0, [N2]: 0 },
    minorsDealt: { [N1]: [], [N2]: [] },
    refused: 0,
    n2Treasury: [],
    violations: [],
    final: start,
  };
  let s = start;
  for (let turn = 1; turn <= TURNS; turn++) {
    const orders = Object.fromEntries(NATIONS.map(id => [id, scriptedPlayer(s, id)]));
    const result = resolveTurn(s, orders, s.seed);
    game.refused += result.events.filter(e => e.type === 'order-rejected').length;
    for (const e of result.events) {
      if ((e.type !== 'goods-sold' && e.type !== 'goods-bought') || !e.counterpartyId || !minors.has(e.counterpartyId)) continue;
      game.minorDeals[e.nationId]++;
      if (!game.minorsDealt[e.nationId].includes(e.counterpartyId)) game.minorsDealt[e.nationId].push(e.counterpartyId);
    }
    s = result.state;
    for (const id of NATIONS) {
      const holds = [...minors].some(m => s.diplomacy[pairKey(id, m)].consulates.includes(id));
      if (holds && game.consulateBy[id] === undefined) game.consulateBy[id] = turn;
    }
    game.n2Treasury.push(nationOf(s, N2).treasury);
    game.violations.push(...[...invariantViolations(s), ...worldViolations(s, start)].map(v => `turn ${turn}: ${v}`));
  }
  game.final = s;
  return game;
}

describe('FR-196 the v2 trade baseline: 40 turns, both nations scripted, seeds 1 to 4', () => {
  const games = new Map<number, { first: Game; again: Game }>();
  beforeAll(() => {
    for (const seed of SEEDS) games.set(seed, { first: play(seed), again: play(seed) });
    console.log(
      'FR-196 measured:',
      JSON.stringify(
        SEEDS.map(seed => {
          const g = games.get(seed)!.first;
          return {
            seed,
            consulateBy: g.consulateBy,
            minorDeals: g.minorDeals,
            minorsDealt: g.minorsDealt,
            treasury: NATIONS.map(id => nationOf(g.final, id).treasury),
          };
        })
      )
    );
  }, 300_000);

  it('FR-196 the games are played on the continent with the partners market', () => {
    for (const seed of SEEDS) {
      const { final } = games.get(seed)!.first;
      expect({ worldId: final.worldId, mode: final.market?.mode, turn: final.turn }).toEqual({ worldId: 'continent', mode: 'partners', turn: TURNS + 1 });
    }
  });

  it('FR-196 each nation holds a consulate by turn 5', () => {
    for (const seed of SEEDS) {
      const { consulateBy } = games.get(seed)!.first;
      for (const id of NATIONS) expect({ seed, id, by: (consulateBy[id] ?? 99) <= 5 }).toEqual({ seed, id, by: true });
    }
  });

  it('FR-196 both nations trade with minor nations: deals with at least 2 minors, at least 20 deals with minors in all', () => {
    for (const seed of SEEDS) {
      const { minorDeals, minorsDealt } = games.get(seed)!.first;
      const minors = new Set(NATIONS.flatMap(id => minorsDealt[id]));
      expect({ seed, minors: minors.size >= 2, deals: minorDeals[N1] + minorDeals[N2] >= 20 }).toEqual({ seed, minors: true, deals: true });
      for (const id of NATIONS) expect({ seed, id, trades: minorDeals[id] > 0 }).toEqual({ seed, id, trades: true });
    }
  });

  it('FR-196 nation 2\'s treasury is at 0 or more every turn and above 0 at turn 40', () => {
    for (const seed of SEEDS) {
      const { n2Treasury } = games.get(seed)!.first;
      expect(n2Treasury).toHaveLength(TURNS);
      expect({ seed, negative: n2Treasury.filter(t => t < 0) }).toEqual({ seed, negative: [] });
      expect(n2Treasury[TURNS - 1]).toBeGreaterThan(0);
    }
  });

  it('FR-196 no order is refused and the invariants hold after every turn', () => {
    expect(SEEDS.map(seed => ({ seed, refused: games.get(seed)!.first.refused, violations: games.get(seed)!.first.violations }))).toEqual(
      SEEDS.map(seed => ({ seed, refused: 0, violations: [] }))
    );
  });

  it('FR-196 the same seed gives the same game', () => {
    for (const seed of SEEDS) {
      const { first, again } = games.get(seed)!;
      expect(again.final).toEqual(first.final);
    }
  });
});
