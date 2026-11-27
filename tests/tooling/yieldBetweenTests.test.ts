// Task 58 follow-up: Vitest runs a file's synchronous tests one after another through promise jobs alone, so the worker
// never reached its event loop until the file ended. In a full run tests/ui/boardOfTrade.test.tsx blocked its worker for
// 89 s, longer than Vitest's 60 s worker-to-main RPC limit, and the run failed on "Timeout calling onTaskUpdate" with every
// test passed. tests/yieldBetweenTests.ts (vitest.config.ts setupFiles) gives the worker one event-loop turn after each test.
import { expect, it, onTestFinished } from 'vitest';

it('finds the macrotask already run after the configured afterEach hook', () => {
  let macrotaskRan = false;
  setImmediate(() => { macrotaskRan = true; });
  expect(macrotaskRan).toBe(false);
  // Vitest calls this after all afterEach hooks, before the next test starts.
  onTestFinished(() => { expect(macrotaskRan).toBe(true); });
});
