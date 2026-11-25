import { describe, expect, it } from 'vitest';
import { readSave, saveOf, type SavedGame } from '@/store/persistence';
import { createGameStore } from '@/store/rootStore';
import type { Nation } from '@/types/Nation';

const human = 'nation-1';
const scripted = 'nation-2';
const open = { kind: 'openCredit', nationId: human } as const;
const read = (save: SavedGame) => readSave({ getItem: () => JSON.stringify(save) }).kind;
const fresh = () => createGameStore({ seed: 4, world: 'two-islands' });

function opened() {
  const store = fresh();
  expect(store.getState().submitOrder(open)).toEqual({ ok: true });
  return store;
}

function withNation(save: SavedGame, id: string, patch: Partial<Nation>): SavedGame {
  const nations = save.game.nations.map(n => n.id === id ? { ...n, ...patch } : n);
  return { ...save, game: { ...save.game, nations } };
}

describe('NR-039 credit authorization in v1 saves', () => {
  it('accepts ordinary v1 placeholder fields and authentic opening Orders before and after settlement', () => {
    const legacy = saveOf(fresh().getState());
    expect(legacy.version).toBe(1);
    expect(legacy.game.nations[0]).toMatchObject({ debt: 0, creditLimit: 5000 });
    expect(read(legacy)).toBe('usable');
    const store = opened();
    expect(read(withNation(saveOf(store.getState()), human, { treasury: -200 }))).toBe('usable');
    store.getState().advanceTurn();
    expect(read(saveOf(store.getState()))).toBe('usable');
  });

  it('refuses an account without the owning human’s logged opening, and a logged opening whose account is absent', () => {
    const save = saveOf(opened().getState());
    expect(read({ ...save, ordersThisTurn: [] })).toBe('unusable');
    expect(read(withNation(save, human, { creditAccount: undefined }))).toBe('unusable');
  });

  it('refuses a scripted opening and an opening filed under the wrong nation', () => {
    const save = saveOf(opened().getState());
    const account = save.game.nations[0].creditAccount;
    const ai = { ...open, nationId: scripted };
    expect(read({ ...withNation(save, scripted, { creditAccount: account }),
      orderLog: [{ turn: 1, nationId: scripted, orders: [ai] }] })).toBe('unusable');
    expect(read({ ...save, ordersThisTurn: [], orderLog: [{ turn: 1, nationId: scripted, orders: [open] }] })).toBe('unusable');
  });

  it.each([
    { limit: 200 },
    { limit: 200, saleReceipts: [0, 0, 0, 0, 0] },
    { limit: 200, saleReceipts: [-3] },
    { limit: 200, saleReceipts: [2.5] },
    { limit: 200.5, saleReceipts: [] },
    { limit: 10000, saleReceipts: [0] },
  ])('refuses malformed or inconsistent account figures %j', malformed => {
    const save = withNation(saveOf(opened().getState()), human, { creditAccount: malformed as NonNullable<Nation['creditAccount']> });
    expect(read(save)).toBe('unusable');
  });

  it('refuses negative cash for a cash-only nation and nonnumeric cash even for a borrower', () => {
    const save = saveOf(opened().getState());
    expect(read(withNation(save, scripted, { treasury: -1 }))).toBe('unusable');
    expect(read(withNation(saveOf(fresh().getState()), human, { treasury: -1 }))).toBe('unusable');
    expect(read(withNation(save, human, { treasury: NaN }))).toBe('unusable');
  });
});
