import { setImmediate as yieldToRunner } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { COMPUTER_ID } from './humans';
import { runGame } from './harness';

const starting = new Set(newGame({ seed: 1, world: 'continent' }).nations.find(n => n.id === COMPUTER_ID)!.technologies ?? []);
const results: { seed: number; bought: string[] }[] = [];
for (let seed = 1; seed <= 24; seed++) {
  const game = runGame({ seed, human: 'idle', turns: 20 });
  const nation = game.final.nations.find(n => n.id === COMPUTER_ID)!;
  results.push({ seed, bought: [...new Set(nation.technologies)].filter(id => !starting.has(id)) });
  await yieldToRunner();
}
const qualifying = results.filter(row => row.bought.length >= 3).length;
it(`FR-527 Valdoria owns at least three purchased technologies by turn 20 in ${qualifying}/24 idle games`, () => {
  expect(qualifying, JSON.stringify(results)).toBe(24);
});
