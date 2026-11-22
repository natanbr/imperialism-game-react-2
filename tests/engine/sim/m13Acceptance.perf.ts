import { setImmediate as yieldToRunner } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { computerOrdersTimes, percentile, runGame, type GameRecord } from './harness';
import { M13_SCENARIOS } from './m13Scenarios';

const P95_LIMIT_MS = 100;

// As in the functional acceptance suite, collect the games before checking the result.
const games: GameRecord[] = [];
for (const { human, seeds } of Object.values(M13_SCENARIOS)) {
  for (const seed of seeds) {
    games.push(runGame({ seed, human }));
    await yieldToRunner();
  }
}

it('FR-497 computerOrders stays within 100 ms at the 95th percentile over the acceptance games', () => {
  const times = computerOrdersTimes(games);
  const p95 = percentile(times, 95);
  const summary = `FR-497 computerOrders p95 ${p95.toFixed(1)} ms and max ${Math.max(...times).toFixed(1)} ms over ${times.length} turns of ${games.length} games (p95 required <= ${P95_LIMIT_MS} ms)`;
  console.log(summary);
  expect(p95, summary).toBeLessThanOrEqual(P95_LIMIT_MS);
});
