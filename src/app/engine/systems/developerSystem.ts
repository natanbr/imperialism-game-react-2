// FR-629 (M18j): the Developer is a diplomatic reward, never built. At the end of each settlement a Great Power with
// no Developer receives one when the settled diplomacy record shows its embassy in an independent Minor Nation at
// relation level DEVELOPER_UNLOCK_LEVEL or above. No Order, no random draw; the same rule for every controller.
import { DEVELOPER_UNLOCK_LEVEL } from "@/definisions/developerRules";
import type { MinorNationId, TileId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import { WorkerStatus, WorkerType, type Worker } from "@/types/Workers";
import type { TurnContext, TurnSystem } from "../turn/context";
import { isFallen } from "../army/conquest";
import { levelOfPoints, pairKey, relationOf } from "../diplomacy/relations";
import { universityCapital } from "../orders/civilianOrders";

const hasDeveloper = (state: GameState, nationId: string): boolean =>
  state.map.tiles.some(row => row.some(tile => tile.workers.some(w => w.nationId === nationId && w.type === WorkerType.Developer)));

/**
 * The embassies ordered this turn. This turn's diplomacy phase has already written them into the record, but they
 * are not yet part of a settled position, so they count from the next settlement. Read from the turn's embassy
 * intents, which last until the turn is resolved: the store applies a human's Order when it is submitted, so End
 * Turn's accepted Orders hold only the computer's.
 */
const embassiesOrdered = (state: GameState, ctx: TurnContext): ReadonlySet<string> =>
  new Set(state.intents.flatMap(i => (i.kind === "embassy" && i.turn === ctx.turn && i.targetId !== undefined ? [pairKey(i.nationId, i.targetId)] : [])));

/** The first Minor Nation, in state order, whose relation with the nation earns it a Developer. */
function sponsorOf(state: GameState, nationId: string, ordered: ReadonlySet<string>): MinorNationId | undefined {
  return state.minorNations.find(minor => {
    if (minor.colonyOf !== undefined || ordered.has(pairKey(nationId, minor.id))) return false;
    const pair = relationOf(state, nationId, minor.id);
    return pair !== undefined && pair.war === undefined && pair.embassies.includes(nationId) && levelOfPoints(pair.points) >= DEVELOPER_UNLOCK_LEVEL;
  })?.id;
}

/**
 * Runs after `universitySystem`, so the Developer, like a graduate, is Available on the capital tile for the next turn.
 * Returns its input unchanged when no nation qualifies, as on every world without Minor Nations.
 */
export const developerSystem: TurnSystem = (state, ctx) => {
  if (state.minorNations.length === 0) return state;
  const ordered = embassiesOrdered(state, ctx);
  const arrivals = new Map<TileId, Worker[]>();
  for (const nation of state.nations) {
    if (hasDeveloper(state, nation.id) || isFallen(state, nation.id)) continue;
    const minorId = sponsorOf(state, nation.id, ordered);
    const capital = minorId && universityCapital(state, nation);
    if (!minorId || !capital) continue;
    const worker: Worker = {
      id: `developer-${nation.id}-${ctx.turn}`, type: WorkerType.Developer, nationId: nation.id,
      assignedTileId: capital.id, efficiency: 100, status: WorkerStatus.Available, justMoved: false,
    };
    arrivals.set(capital.id, [...(arrivals.get(capital.id) ?? []), worker]);
    ctx.emit({ type: "developer-arrived", nationId: nation.id, workerId: worker.id, tileId: capital.id, minorId });
  }
  if (arrivals.size === 0) return state;
  const tiles = state.map.tiles.map(row => (row.some(tile => arrivals.has(tile.id))
    ? row.map(tile => {
      const arriving = arrivals.get(tile.id);
      return arriving ? { ...tile, workers: [...tile.workers, ...arriving] } : tile;
    })
    : row));
  return { ...state, map: { ...state.map, tiles } };
};
