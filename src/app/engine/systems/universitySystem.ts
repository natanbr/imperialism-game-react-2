import type { UniversityCivilian } from "@/definisions/universityFees";
import { WorkerStatus, type Worker } from "@/types/Workers";
import type { TurnSystem } from "../turn/context";
import { universityCapital, withUniversity } from "../orders/civilianOrders";

/** After combat and the meal, surviving disbanded civilians and graduates become available for next turn. */
export const universitySystem: TurnSystem = (state) => {
  const graduates = new Map<string, Worker[]>();
  const afterOrders = state.nations.map(nation => {
    const orders = Object.entries(nation.university ?? {}) as [UniversityCivilian, number][];
    if (orders.length === 0) return nation;
    const capital = universityCapital(state, nation);
    if (!capital) return orders.reduce((n, [type]) => withUniversity(n, type, 0), nation);
    const workers: Worker[] = [];
    for (const [type, count] of orders) {
      for (let index = 0; index < count; index++) {
        workers.push({
          id: `university-${nation.id}-${state.turn}-${type}-${index + 1}`, nationId: nation.id, type,
          assignedTileId: capital.id, efficiency: 100, status: WorkerStatus.Available, justMoved: false,
        });
      }
    }
    graduates.set(capital.id, workers);
    return { ...nation, university: {} };
  });

  const returned = new Map<string, number>();
  const tiles = state.map.tiles.map(row => row.map(tile => {
    const arriving = graduates.get(tile.id);
    if (!arriving && !tile.workers.some(w => w.pendingDisband)) return tile;
    const staying = tile.workers.filter(w => {
      if (!w.pendingDisband) return true;
      returned.set(w.nationId, (returned.get(w.nationId) ?? 0) + 1);
      return false;
    });
    return { ...tile, workers: arriving ? [...staying, ...arriving] : staying };
  }));

  const nations = afterOrders.map(n => {
    const count = returned.get(n.id);
    if (!count) return n;
    const workers = { ...n.industry.workers, expert: n.industry.workers.expert + count };
    return { ...n, industry: { ...n.industry, workers } };
  });
  if (nations.every((n, i) => n === state.nations[i])) return state;
  return { ...state, nations, map: graduates.size || returned.size ? { ...state.map, tiles } : state.map };
};
