import { afterEach } from 'vitest';
import { setImmediate as yieldToRunner } from 'node:timers/promises';

// Vitest chains a file's synchronous tests through promise jobs alone, so without this the worker reaches its event loop
// only when the file ends. A file of many synchronous tests then outlasts the worker's 60 s RPC limit and the run fails on
// "Timeout calling onTaskUpdate" although every test passed. One event-loop turn after each test lets the worker read the
// main process's replies (regression test: tests/tooling/yieldBetweenTests.test.ts).
afterEach(() => yieldToRunner());
