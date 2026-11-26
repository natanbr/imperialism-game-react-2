// Task 58 follow-up: Vitest runs a file's synchronous tests one after another through promise jobs alone, so the worker
// never reached its event loop until the file ended. In a full run tests/ui/boardOfTrade.test.tsx blocked its worker for
// 89 s, longer than Vitest's 60 s worker-to-main RPC limit, and the run failed on "Timeout calling onTaskUpdate" with every
// test passed. tests/yieldBetweenTests.ts (vitest.config.ts setupFiles) gives the worker one event-loop turn after each test.
import { describe, expect, it } from 'vitest';

describe('the worker reaches its event loop between tests', () => {
  let macrotaskRan = false;

  it('schedules a macrotask and returns without waiting for it', () => {
    setImmediate(() => { macrotaskRan = true; });
    expect(macrotaskRan).toBe(false);
  });

  it('finds the macrotask already run when the next test starts', () => {
    expect(macrotaskRan).toBe(true);
  });
});
