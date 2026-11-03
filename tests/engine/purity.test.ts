import { describe, it, expect } from 'vitest';
import { addDepot, addPort, addRailroad } from '@/engine/systems/railroadSystem';
import { createTurnContext } from '@/engine/turn/context';
import { TURN_PHASES } from '@/engine/turn/phases';
import { GameState } from '@/types/GameState';
import { deepFreeze, game, setTile, T } from './fixtures';
import { parseTileIdToArray } from '@/utils/tileIdUtils';

const at = (tileId: string) => {
  const [x, y] = parseTileIdToArray(tileId);
  return { x, y };
};

/** A state whose rail network already has a branch, so the helpers must extend existing arrays. */
function withRailNetwork(): GameState {
  return addRailroad(game(), 'nation-1', at(T.farm1));
}

function frozenCopy(state: GameState): { frozen: GameState; snapshot: GameState } {
  const snapshot = structuredClone(state);
  return { frozen: deepFreeze(structuredClone(state)), snapshot };
}

describe('rail network helpers do not mutate their input', () => {
  it.each([
    ['addRailroad', (s: GameState) => addRailroad(s, 'nation-1', at(T.orchard1))],
    ['addDepot', (s: GameState) => addDepot(s, 'nation-1', at(T.dryPlains1))],
    ['addPort', (s: GameState) => addPort(s, 'nation-1', at(T.range1))],
  ])('FR-013 %s leaves a deep-frozen input unchanged', (_name, run) => {
    const { frozen, snapshot } = frozenCopy(withRailNetwork());

    const next = run(frozen);

    expect(frozen).toEqual(snapshot);
    expect(next).not.toBe(frozen);
  });

  it('FR-013 addRailroad still links the new rail into the copy it returns', () => {
    const { frozen } = frozenCopy(withRailNetwork());

    const next = addRailroad(frozen, 'nation-1', at(T.orchard1));

    const graph = next.transportNetwork.railroadNetworks!['nation-1'].graph;
    expect(graph['3,1']).toContainEqual({ x: 2, y: 1 });
    expect(graph['2,1']).toContainEqual({ x: 3, y: 1 });
    expect(frozen.transportNetwork.railroadNetworks!['nation-1'].graph['2,1']).not.toContainEqual({ x: 3, y: 1 });
  });
});

describe('turn systems do not mutate their input', () => {
  it('FR-012 FR-013 every phase system takes (state, ctx) and leaves a deep-frozen input unchanged', () => {
    // Rail, depot and port jobs that finish this turn exercise the network helpers inside developmentSystem.
    let state = withRailNetwork();
    state = setTile(state, T.orchard1, { constructionJob: { workerId: 'x', kind: 'rail', startedOnTurn: 0, durationTurns: 1 } });
    state = setTile(state, T.dryPlains1, { constructionJob: { workerId: 'y', kind: 'depot', startedOnTurn: 0, durationTurns: 1 } });
    state = setTile(state, T.coastFarm1, { constructionJob: { workerId: 'z', kind: 'port', startedOnTurn: 0, durationTurns: 1 } });
    const { frozen, snapshot } = frozenCopy(state);
    const ctx = createTurnContext({ turn: frozen.turn, seed: frozen.seed });

    let s = frozen;
    for (const system of TURN_PHASES) {
      expect(system.length).toBeLessThanOrEqual(2);
      s = system(s, ctx);
    }

    expect(frozen).toEqual(snapshot);
    expect(s.transportNetwork.railroadNetworks!['nation-1'].depots).toContainEqual(expect.objectContaining({ x: 2, y: 2 }));
  });
});
