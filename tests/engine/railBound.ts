// The FR-124 rail bound (NR-022), shared by the FR-124 and FR-125 acceptance tests. Not a test file.
import { capitalComponent } from '@/engine/ai/railPlan';
import { getNeighborCoords } from '@/engine/map/mapHelpers';
import type { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';

/** Steps over the nation's land from a tile to its capital (breadth-first). */
export function landDistanceToCapital(s: GameState, nationId: string, from: { x: number; y: number }): number {
  const capital = s.map.tiles.flat().find(t => t.ownerNationId === nationId && t.terrain === TerrainType.Capital)!;
  const seen = new Map<string, number>([[`${from.x},${from.y}`, 0]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = seen.get(`${cur.x},${cur.y}`)!;
    if (cur.x === capital.x && cur.y === capital.y) return d;
    for (const [x, y] of getNeighborCoords(s.map, cur.x, cur.y)) {
      const t = s.map.tiles[y][x];
      if (seen.has(`${x},${y}`) || t.ownerNationId !== nationId) continue;
      seen.set(`${x},${y}`, d + 1);
      queue.push({ x, y });
    }
  }
  return Infinity;
}

/**
 * The rail a player that only joins depots needs: each joined depot's land distance to the capital, + 3.
 * Only depots in the capital's rail component count: a depot not joined yet has no rail to allow for.
 */
export function railBound(s: GameState, nationId: string): number {
  const component = capitalComponent(s, nationId);
  const joined = s.transportNetwork.railroadNetworks![nationId].depots.filter(d => component.has(`${d.x},${d.y}`));
  return joined.reduce((sum, d) => sum + landDistanceToCapital(s, nationId, d), 0) + 3;
}
