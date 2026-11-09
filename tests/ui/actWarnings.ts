// FR-110 (f): a UI test file calls this at its top level so that every test in it fails when React
// prints a "not wrapped in act(...)" warning (a state update the test did not wait for).
import { afterEach, beforeEach, expect, vi, type MockInstance } from 'vitest';

export const ACT_WARNING = /not wrapped in act/;

/** The console.error messages of one test that are act() warnings, each joined into one line. */
export const actWarnings = (spy: MockInstance<typeof console.error>): string[] =>
  spy.mock.calls.map((args) => args.map(String).join(' ')).filter((message) => ACT_WARNING.test(message));

export function failOnActWarnings(): void {
  let spy: MockInstance<typeof console.error>;
  beforeEach(() => {
    // Spy only: the messages still print, so a failure shows the warning in full
    spy = vi.spyOn(console, 'error');
  });
  afterEach(() => {
    const warnings = actWarnings(spy);
    spy.mockRestore();
    expect(warnings, 'FR-110 (f) no act() warning').toEqual([]);
  });
}
