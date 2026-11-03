// FR-079: railLinksOf lists every link of every nation's rail graph once; the map draws exactly these.
import { describe, it, expect } from 'vitest';
import { railLinksOf } from '@/engine';
import { addRailroad } from '@/engine/systems/railroadSystem';
import type { GameState } from '@/types/GameState';
import { game, N1, N2 } from './fixtures';

const pairs = (s: GameState, nationId: string) =>
  railLinksOf(s)
    .filter(l => l.nationId === nationId)
    .map(l => `${l.from.x},${l.from.y}-${l.to.x},${l.to.y}`)
    .sort();

describe('FR-079 railLinksOf', () => {
  it('FR-079 a fresh game has no links (the capital alone is one node)', () => {
    expect(railLinksOf(game())).toEqual([]);
  });

  it('FR-079 lists each link once, the endpoint with the lower row (then column) first, per nation', () => {
    // nation-1: capital (1,1) -> rail (2,1) -> rail (2,0); (1,1) and (2,0) are neighbours too (odd row 1).
    let s = addRailroad(game(), N1, { x: 2, y: 1 });
    s = addRailroad(s, N1, { x: 2, y: 0 });
    // nation-2: capital (6,1) -> rail (5,1).
    s = addRailroad(s, N2, { x: 5, y: 1 });

    expect(pairs(s, N1)).toEqual(['1,1-2,1', '2,0-1,1', '2,0-2,1']);
    expect(pairs(s, N2)).toEqual(['5,1-6,1']);
    expect(railLinksOf(s)).toHaveLength(4);
  });

  it('FR-079 a state without rail networks has no links', () => {
    const s = game();
    expect(railLinksOf({ transportNetwork: { ...s.transportNetwork, railroadNetworks: undefined } })).toEqual([]);
  });
});
