import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { computerOrders } from '@/engine/ai/players';
import { N2 } from './fixtures';
import { play } from './scriptedGame';

// FR-523 changes which sites can be developed. Pin the resulting 40-turn FR-464 replay
// separately so the original M16.1 order logs and scores remain independently verifiable.
const recordings = [
  { seed: 1, orders: 510, hash: '466507fde01491f43d013cdfd6ce15d29520ff499b2a87c2369897b64921e8eb', scores: [1451, 240] },
  { seed: 2, orders: 506, hash: '849cadbf6313288d471da2c146b596d8b9b69b4f7efef8aff03bac1a0945d73f', scores: [1444, 240] },
  { seed: 3, orders: 485, hash: '4c1f39b22c8c47e2f516152a6b84d04c059bfb30de0414d34e7d05de364f8794', scores: [1535, 240] },
  { seed: 4, orders: 519, hash: '9b6c38bba1eb35ff200b58b44588cf685409619142fe4302312dcdb8b19d49ec', scores: [1364, 240] },
];

describe('FR-523 FR-464 M16b two-islands computer orders and scores', () => {
  it.each(recordings)('replays every order on seed $seed', ({ seed, orders, hash, scores }) => {
    const game = play(state => computerOrders(state)[N2], seed, 'm16b');
    const log = JSON.stringify(game.orders, (_, value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]))
        : value
    );
    const measured = {
      turns: game.orders.length,
      orders: game.orders.reduce((count, turn) => count + turn[N2].length, 0),
      hash: createHash('sha256').update(log).digest('hex'),
      scores: Object.fromEntries(game.final.gameOver!.scores.map(entry => [entry.nationId, entry.total])),
    };
    console.log('FR-523 FR-464', JSON.stringify({ seed, ...measured }));
    expect(measured).toEqual({ turns: 40, orders, hash, scores: { 'nation-2': scores[0], 'nation-1': scores[1] } });
  });
});
