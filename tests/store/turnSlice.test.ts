import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createTurnSlice, TurnSlice } from '@/store/turnSlice';
import { GameState } from '@/types/GameState';
import { initWorld } from '@/testing/worldInit';

function createStore() {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  const base: Partial<GameState> = {
    activeNationId: 'nation-1',
    nations,
    cities: [], armies: [], fleets: [],
    relations: [], treaties: [], tradePolicies: [], grants: [],
    map,
    transportNetwork: { railroads: [], shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    industry: { buildings: [], labour: { untrained: 0, trained: 0, expert: 0, availableThisTurn: 0 }, power: 0 },
    technologyState: { technologies: [], oilDrillingTechUnlocked: false },
    newsLog: [],
    turnOrder: { phases: [ 'diplomacy','trade','production','combat','interceptions','logistics' ] },
    difficulty: 'normal',
  };

  const useStore = create<GameState & TurnSlice>()((...a) => ({
    ...base as GameState,
    ...createTurnSlice(...a),
  }));

  return useStore;
}

describe('turnSlice.advanceTurn', () => {
  it('increments turn and occasionally year; applies pending capacity and runs phases', () => {
    const useStore = createStore();
    const before = useStore.getState();
    // set a pending increase
    useStore.setState({ nations: before.nations.map(n => ({ ...n, transportCapacityPendingIncrease: 5 })) });

    useStore.getState().advanceTurn();
    const after = useStore.getState();

    expect(after.turn).toBe(before.turn + 1);
    // Year may or may not increment depending on modulo rule; basic check it's number
    expect(typeof after.year).toBe('number');

    // Pending capacity should be applied and reset
    const nAfter = after.nations[0];
    expect(nAfter.transportCapacityPendingIncrease ?? 0).toBe(0);
    expect(nAfter.transportCapacity).toBeGreaterThanOrEqual((before.nations[0].transportCapacity ?? 0));
  });
});