// FR-464 pins every computer order and each checkpoint in the four two-islands campaigns.
import { createHash } from 'crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { computerOrders } from '@/engine/ai/players';
import { N2 } from './fixtures';
import { play, SEEDS, start, type Game } from './scriptedGame';

const CHANGED =
  'the AI order log for the two-islands world changed; a requirement row must say so; re-record the constants only with ' +
  'the row id and reason (FR-125 requires 1.5 times the frozen player\'s score)';

/** JSON with every object's keys sorted, so the hash follows the orders and their order, not the order of their fields. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    return `{${entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

interface Pinned {
  seed: number;
  turns: number;
  /** How many orders in all: a first hint at what changed. */
  orders: number;
  /** sha256 of the canonical JSON of every turn's orders by nation, turn 1 first. */
  log: string;
  /** The final score of each nation (`gameOver.scores`, highest first). */
  scores: Record<string, number>;
  /** Joined depots, rail links and rail bound at turns 15, 25 and 40. */
  rail: number[][];
}

// Re-record only with the requirement row's id and the reason (see CHANGED)
const GOLDEN: Pinned[] = [
  // FR-616: Fish changes the food plan, depot route and later orders. Seed 1, orders 529 -> 562, score 1643 -> 1485.
  // Hash 27ee667b3904d673ffee765149f37fd33e24ce9f87af635cbd0638ec06fdbae5 -> bf71813db1a8b3a1777d41a1f86cc667fa5e192a400cfa967af2fa41335b435e.
  // Depots/links/bound: 2/8/11, 4/12/27, 5/16/33 -> 2/5/11, 4/10/24, 6/17/37.
  { seed: 1, turns: 40, orders: 562, log: 'bf71813db1a8b3a1777d41a1f86cc667fa5e192a400cfa967af2fa41335b435e', scores: { 'nation-2': 1485, 'nation-1': 240 }, rail: [[2, 5, 11], [4, 10, 24], [6, 17, 37]] },
  // FR-616: Fish changes the food plan, depot route and later orders. Seed 2, orders 503 -> 559, score 1546 -> 1353.
  // Hash eb5dcffe5198c82f8bdf1023fcaace919552fc3bd7a45f0265f8719b65ce3a55 -> 78f78b1ccff43268108552b1c6906b46b936e627cee686a2fbf91d51177312e0.
  // Depots/links/bound: 2/8/11, 4/12/27, 4/12/27 -> 2/5/11, 4/10/24, 6/17/37.
  { seed: 2, turns: 40, orders: 559, log: '78f78b1ccff43268108552b1c6906b46b936e627cee686a2fbf91d51177312e0', scores: { 'nation-2': 1353, 'nation-1': 240 }, rail: [[2, 5, 11], [4, 10, 24], [6, 17, 37]] },
  // FR-616: Fish changes the food plan, depot route and later orders. Seed 3, orders 502 -> 561, score 1530 -> 1456.
  // Hash 047bf977b0de80a897c7bfdcba7115164e5e3d47827fdd71c45e1d41d7d6ccae -> a9c952ff6cf1840c5f84fae041f9b97d1bd0c6df7a1bc3d84c5e9ee014d8deab.
  // Depots/links/bound: 2/8/11, 4/12/27, 5/16/33 -> 2/5/11, 4/10/24, 6/17/37.
  { seed: 3, turns: 40, orders: 561, log: 'a9c952ff6cf1840c5f84fae041f9b97d1bd0c6df7a1bc3d84c5e9ee014d8deab', scores: { 'nation-2': 1456, 'nation-1': 240 }, rail: [[2, 5, 11], [4, 10, 24], [6, 17, 37]] },
  // FR-616: Fish changes the food plan, depot route and later orders. Seed 4, orders 533 -> 563, score 1637 -> 1511.
  // Hash d26fc62495eb21d0241f7e4ca676fbef470b31d4f4af9a2473f129cdcd524293 -> 0eee92248f049b070cd75020a715a811d46f8f3c2fbda1eb6a8049539731f64f.
  // Depots/links/bound: 2/8/11, 4/12/27, 5/16/33 -> 2/5/11, 4/10/24, 6/17/37.
  { seed: 4, turns: 40, orders: 563, log: '0eee92248f049b070cd75020a715a811d46f8f3c2fbda1eb6a8049539731f64f', scores: { 'nation-2': 1511, 'nation-1': 240 }, rail: [[2, 5, 11], [4, 10, 24], [6, 17, 37]] },
];

const pinnedOf = (seed: number, game: Game): Pinned => ({
  seed,
  rail: game.checkpoints.map(c => [c.depotsJoined, c.links, c.bound]),
  turns: game.orders.length,
  orders: game.orders.reduce((n, turn) => n + Object.values(turn).reduce((m, list) => m + list.length, 0), 0),
  log: createHash('sha256').update(canonical(game.orders)).digest('hex'),
  scores: Object.fromEntries(game.final.gameOver!.scores.map((s) => [s.nationId, s.total])),
});

describe('FR-464 the two-islands AI order log and final scores are pinned: seeds 1 to 4, 40 turns', () => {
  const games = new Map<number, Game>();
  beforeAll(() => {
    // Through the registry (FR-099), as tests/engine/scriptedScore.test.ts plays it
    for (const seed of SEEDS) games.set(seed, play((s) => computerOrders(s)[N2], seed));
  }, 180_000);

  it('FR-464 on two-islands nation 2 is the only computer nation, so its orders are every scripted nation\'s', () => {
    expect(SEEDS.map((seed) => Object.keys(computerOrders(start(seed))))).toEqual(SEEDS.map(() => [N2]));
  });

  it('FR-464 every order given, turn by turn, and the final scores are the recorded ones', () => {
    const actual = SEEDS.map((seed) => pinnedOf(seed, games.get(seed)!));
    console.log('FR-464', JSON.stringify(actual, null, 2));
    expect(actual, CHANGED).toEqual(GOLDEN);
  });
});
