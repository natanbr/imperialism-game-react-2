// FR-161, FR-163, FR-164, FR-167, FR-180 (engine part): diplomacy through the store, the path the app
// uses. A diplomacy order is submitted and paid at once; End Turn resolves it with nation 2's scripted
// orders; the news names the minor nation; the order log replays the game (FR-100).
import { describe, it, expect } from 'vitest';
import { createGameStore } from '@/store/rootStore';
import { newsLines } from '@/components/gameText';
import { countryName, pairKey, resolveTurn, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';

const N1 = 'nation-1';
const ARVELIA = 'minor-1';
const LORRAN = 'minor-3';
const propose = (overture: 'consulate' | 'embassy' | 'war', targetId: string): Order => ({ kind: 'proposeOverture', nationId: N1, overture, targetId });
const treasury = (s: GameState) => s.nations.find(n => n.id === N1)!.treasury;

describe('FR-180 diplomacy through the store (the engine half of the M6 e2e)', () => {
  it('FR-163 FR-180 a consulate with Arvelia: $500 at once; after End Turn the pair holds it and the news names Arvelia', () => {
    const store = createGameStore({ seed: 3 });
    const before = treasury(store.getState().game);

    expect(store.getState().submitOrder(propose('consulate', ARVELIA))).toEqual({ ok: true });
    expect(treasury(store.getState().game)).toBe(before - 500);
    store.getState().advanceTurn();

    const { game, eventLog } = store.getState();
    expect(game.diplomacy[pairKey(N1, ARVELIA)].consulates).toEqual([N1]);
    expect(treasury(game)).toBe(before - 500 - 100); // FR-202: the start army's upkeep
    const nameOf = (id: string) => countryName(game, id) ?? id;
    expect(newsLines(eventLog.at(-1)!.events, N1, nameOf)).toContain('Consulate opened in Arvelia.');
  });

  it('FR-164 FR-167 FR-180 consulate on turn 1, embassy on turn 2, war on Lorran on turn 3: at war since turn 4; the log replays the game', () => {
    const store = createGameStore({ seed: 3 });
    const initial = store.getState().game;

    expect(store.getState().submitOrder(propose('consulate', ARVELIA)).ok).toBe(true);
    store.getState().advanceTurn();
    expect(store.getState().submitOrder(propose('embassy', ARVELIA)).ok).toBe(true);
    store.getState().advanceTurn();
    expect(store.getState().game.diplomacy[pairKey(N1, ARVELIA)].embassies).toEqual([N1]);
    expect(store.getState().submitOrder(propose('war', LORRAN)).ok).toBe(true);
    store.getState().advanceTurn();

    const { game, eventLog, orderLog } = store.getState();
    expect(game.turn).toBe(4);
    expect(game.diplomacy[pairKey(N1, LORRAN)].war).toEqual({ aggressors: [N1], since: 4 });
    const nameOf = (id: string) => countryName(game, id) ?? id;
    expect(newsLines(eventLog.at(-1)!.events, N1, nameOf)).toContain('War declared on Lorran! The war starts next turn.');
    expect(eventLog.flatMap(r => r.events).filter(e => e.type === 'order-rejected' || e.type === 'overture-failed')).toEqual([]);

    let replayed = initial;
    for (const turn of [1, 2, 3]) {
      const orders = Object.fromEntries(orderLog.filter(e => e.turn === turn).map(e => [e.nationId, e.orders]));
      replayed = resolveTurn(replayed, orders, replayed.seed).state;
    }
    expect(replayed).toEqual(game);
  });

  it('FR-161 a withdrawn embassy is refunded in the store and leaves nothing at End Turn', () => {
    const store = createGameStore({ seed: 3 });
    store.getState().submitOrder(propose('consulate', ARVELIA));
    store.getState().advanceTurn();
    const before = treasury(store.getState().game);

    store.getState().submitOrder(propose('embassy', ARVELIA));
    expect(treasury(store.getState().game)).toBe(before - 5000);
    expect(store.getState().submitOrder({ kind: 'withdrawOverture', nationId: N1, overture: 'embassy', targetId: ARVELIA })).toEqual({ ok: true });
    expect(treasury(store.getState().game)).toBe(before);
    store.getState().advanceTurn();

    expect(store.getState().game.diplomacy[pairKey(N1, ARVELIA)].embassies).toEqual([]);
  });
});
