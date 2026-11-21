import { expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { owns } from '@/engine/orders/queries';

it('FR-520 each nation starts with the two historical technologies and three Q131 gifts, independently', () => {
  const state = newGame({ seed: 1, world: 'continent' });
  const [first, second] = state.nations;
  const start = ['compoundSteamEngine', 'dynamite', 'highPressureSteamEngine', 'ironRailroadBridge', 'seedDrill'];
  for (const nation of state.nations) expect([...(nation.technologies ?? [])].sort()).toEqual(start);
  expect(first.technologies).not.toBe(second.technologies);
  const differing = { ...state, nations: [{ ...first, technologies: ['oilDrilling'] }, second] };
  expect(owns(differing, first.id, 'oilDrilling')).toBe(true);
  expect(owns(differing, second.id, 'oilDrilling')).toBe(false);
  expect(owns(differing, 'unknown', 'oilDrilling')).toBe(false);
});
