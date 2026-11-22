import { expect, it } from 'vitest';
import { computerOrdersTimes, percentile, runGame } from './harness';

it('FR-481 records an idle 40-turn game in under 15 seconds and each plan in under 5 seconds', () => {
  const idle = runGame({ seed: 1, human: 'idle' });
  const times = computerOrdersTimes([idle]);
  const p95 = percentile(times, 95);
  console.log(`FR-481 idle seed 1: ${idle.seconds.toFixed(1)} s over ${times.length} turns, computerOrders p95 ${p95.toFixed(1)} ms and max ${Math.max(...times).toFixed(1)} ms`);

  expect(idle.seconds).toBeLessThan(15);
  expect(times).toHaveLength(40);
  for (const time of times) {
    expect(time).toBeGreaterThanOrEqual(0);
    expect(time).toBeLessThan(5_000);
  }
  expect(p95).toBeGreaterThanOrEqual(0);
});
