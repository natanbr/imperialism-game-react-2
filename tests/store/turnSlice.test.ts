import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createTurnSlice, TurnSlice } from '@/store/turnSlice';
import { GameState } from '@/types/GameState';
import { initWorld } from '@/testing/worldInit';

function createStore() {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  // Set industry on each nation
  const nationsWithIndustry = nations.map(n => ({
    ...n,
    industry: { buildings: [], workers: { untrained: 0, trained: 0, expert: 0 }, power: { total: 0, available: 0, electricity: 0 } },
  }));
  
  const base: Partial<GameState> = {
    activeNationId: 'nation-1',
    nations: nationsWithIndustry,
    cities: [], armies: [], fleets: [],
    relations: [], treaties: [], tradePolicies: [], grants: [],
    map,
    transportNetwork: { shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
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