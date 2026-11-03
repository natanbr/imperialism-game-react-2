import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

// Lints a probe file that pretends to live inside the engine package, so the guard is tested
// without writing a bad file to disk.
async function engineLintRules(code: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [result] = await eslint.lintText(code, { filePath: 'src/app/engine/__lintProbe__.ts' });
  return result.messages.map(m => m.ruleId ?? 'parse-error');
}

describe('engine lint guard', () => {
  it.each([
    ["import { useState } from 'react';", 'react'],
    ["import { create } from 'zustand';", 'zustand'],
    ["import { useGameStore } from '@/store/rootStore';", '@/store'],
    ["import { useGameStore } from '../store/rootStore';", 'relative store path'],
    ["import HUD from '@/components/HUD';", '@/components'],
    ["import Link from 'next/link';", 'next'],
  ])('FR-001 forbids %s (%s) inside src/app/engine', async (importLine) => {
    const rules = await engineLintRules(`${importLine}\nexport const probe = 1;\n`);
    expect(rules).toContain('no-restricted-imports');
  }, 30_000);

  it.each([
    ['export const w = window.innerWidth;', 'window'],
    ['export const d = document.title;', 'document'],
    ['export const r = Math.random();', 'Math.random'],
    ['export const t = Date.now();', 'Date.now'],
  ])('FR-001 forbids %s (%s) inside src/app/engine', async (code) => {
    const rules = await engineLintRules(`${code}\n`);
    expect(rules.some(r => r === 'no-restricted-globals' || r === 'no-restricted-properties')).toBe(true);
  }, 30_000);

  it.each([
    ['export const d = new Date();', 'new Date()', 'no-restricted-syntax'],
    ['export const t = performance.now();', 'performance.now()', 'no-restricted-properties'],
    ['export const u = crypto.randomUUID();', 'crypto', 'no-restricted-globals'],
    ['export const b = crypto.getRandomValues(new Uint8Array(4));', 'crypto.getRandomValues', 'no-restricted-globals'],
  ])('FR-002 forbids %s (%s) inside src/app/engine', async (code, _label, rule) => {
    const rules = await engineLintRules(`${code}\n`);
    expect(rules).toContain(rule);
  }, 30_000);

  it.each([
    ["import { initWorld } from '@/testing/worldInit';", '@/testing'],
    ["import { createTwoNationGame } from '../testing/mockNation';", 'relative testing path'],
  ])('FR-043 forbids %s (%s) inside src/app/engine', async (importLine) => {
    const rules = await engineLintRules(`${importLine}\nexport const probe = 1;\n`);
    expect(rules).toContain('no-restricted-imports');
  }, 30_000);

  it('FR-001 allows pure imports such as game types and definitions', async () => {
    const rules = await engineLintRules(
      "import type { GameState } from '@/types/GameState';\nimport { PROSPECT_COST } from '@/definisions/workPrices';\n" +
        'export const probe = (s: GameState) => s.turn + PROSPECT_COST;\n'
    );
    expect(rules).not.toContain('no-restricted-imports');
  }, 30_000);
});
