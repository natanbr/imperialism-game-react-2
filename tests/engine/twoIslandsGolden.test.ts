// FR-464 (closeout review 2): the FR-125 margin is thinnest on seed 3 at turn 25 (903 against the 844.5 needed, 58.5 points;
// 4.5 points before FR-460), so a change to the scripted player, or to any rule it reads, must not slip by unseen. The 40-turn two-islands game of tests/engine/scriptedScore.test.ts
// (the same harness, tests/engine/scriptedGame.ts) on seeds 1 to 4: every order the scripted nation gave, turn by turn,
// hashed, and the final scores, pinned. Recorded 2026-11-16 on b384b99 with FR-461 to FR-463 (no engine change).
import { createHash } from 'crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { computerOrders } from '@/engine/ai/players';
import { N2 } from './fixtures';
import { play, SEEDS, start, type Game } from './scriptedGame';

const CHANGED =
  'the AI order log for the two-islands world changed; a requirement row must say so; re-record the constants only with ' +
  'the row id and reason (FR-125 margin is thinnest on seed 3 at turn 25: 903 against the 844.5 needed)';

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
}

// Re-record only with the requirement row's id and the reason (see CHANGED)
const GOLDEN: Pinned[] = [
  { seed: 1, turns: 40, orders: 529, log: '27ee667b3904d673ffee765149f37fd33e24ce9f87af635cbd0638ec06fdbae5', scores: { 'nation-2': 1643, 'nation-1': 240 } },
  { seed: 2, turns: 40, orders: 503, log: 'eb5dcffe5198c82f8bdf1023fcaace919552fc3bd7a45f0265f8719b65ce3a55', scores: { 'nation-2': 1546, 'nation-1': 240 } },
  { seed: 3, turns: 40, orders: 502, log: '047bf977b0de80a897c7bfdcba7115164e5e3d47827fdd71c45e1d41d7d6ccae', scores: { 'nation-2': 1530, 'nation-1': 240 } },
  { seed: 4, turns: 40, orders: 533, log: 'd26fc62495eb21d0241f7e4ca676fbef470b31d4f4af9a2473f129cdcd524293', scores: { 'nation-2': 1637, 'nation-1': 240 } },
];

const pinnedOf = (seed: number, game: Game): Pinned => ({
  seed,
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
