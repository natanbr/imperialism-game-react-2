import { beforeAll, describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

// Each snippet occupies one line of a single valid module. Match the diagnostic to that
// line so a neighbouring violation cannot make a missing restriction pass.
const forbidden = [
  ['FR-001', "import { useState } from 'react';", 'no-restricted-imports'],
  ['FR-001', "import { create } from 'zustand';", 'no-restricted-imports'],
  ['FR-001', "import { useGameStore } from '@/store/rootStore';", 'no-restricted-imports'],
  ['FR-001', "import { useGameStore as relativeStore } from '../store/rootStore';", 'no-restricted-imports'],
  ['FR-001', "import HUD from '@/components/HUD';", 'no-restricted-imports'],
  ['FR-001', "import Link from 'next/link';", 'no-restricted-imports'],
  ['FR-001', 'export const w = window.innerWidth;', 'no-restricted-globals'],
  ['FR-001', 'export const d = document.title;', 'no-restricted-globals'],
  ['FR-001', 'export const r = Math.random();', 'no-restricted-properties'],
  ['FR-001', 'export const t = Date.now();', 'no-restricted-properties'],
  ['FR-002', 'export const date = new Date();', 'no-restricted-syntax'],
  ['FR-002', 'export const time = performance.now();', 'no-restricted-properties'],
  ['FR-002', 'export const uuid = crypto.randomUUID();', 'no-restricted-globals'],
  ['FR-002', 'export const bytes = crypto.getRandomValues(new Uint8Array(4));', 'no-restricted-globals'],
  ['FR-080', "import { initWorld } from '@/testing/worldInit';", 'no-restricted-imports'],
  ['FR-080', "import { createTwoNationGame } from '../testing/mockNation';", 'no-restricted-imports'],
].map(([fr, code, rule], index) => ({ fr, code, rule, line: index + 1 }));

const allowed = [
  "import type { GameState } from '@/types/GameState';",
  "import { PROSPECT_COST } from '@/definisions/workPrices';",
  'export const probe = (s: GameState) => s.turn + PROSPECT_COST;',
];

describe('engine lint guard', () => {
  let messages: ESLint.LintResult['messages'];

  beforeAll(async () => {
    const code = [...forbidden.map(row => row.code), ...allowed].join('\n');
    // Use the production engine rules and TS parser without initializing Next's UI plugins.
    const eslint = new ESLint({ overrideConfigFile: 'eslint.engine.mjs' });
    const [result] = await eslint.lintText(code, { filePath: 'src/app/engine/__lintProbe__.ts' });
    expect(result.fatalErrorCount).toBe(0);
    messages = result.messages;
  }, 30_000);

  it.each(forbidden)('$fr forbids $code inside src/app/engine', ({ line, rule }) => {
    expect(messages).toContainEqual(expect.objectContaining({ line, ruleId: rule }));
  }, 30_000);

  it('FR-001 allows pure imports such as game types and definitions', () => {
    const allowedMessages = messages.filter(message => message.line > forbidden.length);
    expect(allowedMessages.map(message => message.ruleId)).not.toContain('no-restricted-imports');
  }, 30_000);
});
