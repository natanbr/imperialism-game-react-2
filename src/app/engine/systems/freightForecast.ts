import type { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import { buildingOf } from "../industry/industryState";
import { createTurnContext } from "../turn/context";
import { townFactories } from "../world/towns";
import { developmentSystem } from "./developmentSystem";
import { forecastFreight, transportShipments } from "./logisticsSystem";
import { finishBuildings } from "./productionSystem";
import { transportConnectivitySystem } from "./transportConnectivitySystem";

/**
 * What the hubs collect in the logistics phase of the turn `view` plans (its orders given): after the development
 * phase finishes this turn's jobs (a rail, a depot, a tile's next level), the production phase this owner's town
 * factory expansions, and the connectivity phase updates the hubs. The scripted player's plan (FR-389, FR-628).
 */
export function freightAtLogistics(view: GameState, nationId: string) {
  const ctx = createTurnContext({ turn: view.turn });
  const connected = transportConnectivitySystem(developmentSystem(view, ctx), ctx);
  const owner = connected.nations.find(n => n.id === nationId);
  if (owner && Object.values(townFactories).some(factory => buildingOf(owner, factory).pendingCapacity > 0)) {
    const buildings = finishBuildings(nationId, owner.industry, ctx);
    const nations = connected.nations.map(n => n === owner ? { ...n, industry: { ...n.industry, buildings } } : n);
    return forecastFreight({ ...connected, nations }, nationId, view.map);
  }
  // A survey can finish in the real settlement. Its result is still private while orders are being planned.
  return forecastFreight(connected, nationId, view.map);
}

/** A job the viewer runs: on its own land, or by its civilian on a Minor Nation tile it holds (FR-634). */
const ownJob = (tile: Tile, viewerId: string, workerId: string) =>
  tile.ownerNationId === viewerId || tile.workers.some(w => w.id === workerId && w.nationId === viewerId);

/**
 * The state with only the viewer's development and construction jobs (FR-497): another nation's jobs are its own
 * business, and no survey finishes, as its result is drawn in the settlement.
 */
function ownWork(state: GameState, viewerId: string): GameState {
  const tiles = state.map.tiles.map(row => row.map(tile => {
    const development = tile.developmentJob && !ownJob(tile, viewerId, tile.developmentJob.workerId);
    const construction = tile.constructionJob && tile.ownerNationId !== viewerId;
    if (!tile.prospecting && !development && !construction) return tile;
    return {
      ...tile,
      prospecting: undefined,
      ...(development && { developmentJob: undefined }),
      ...(construction && { constructionJob: undefined }),
    };
  }));
  return { ...state, map: { ...state.map, tiles } };
}

/**
 * FR-646: the transport plan of this End Turn as far as `viewerId` knows it: its own jobs that finish before logistics
 * (a tile's next level, a rail, a depot or a port), its town factories' expansions and the hubs those connect, shipped
 * under its plan and cars. The popup's rows and header and the Armoury's horse supply (FR-517) read it, so they equal
 * what the logistics phase ships.
 */
export function knownFreightPlan(
  state: GameState, viewerId: string, capacity: number, plan = state.transportAllocationsByNation?.[viewerId]
) {
  const { collected, collectionOrder } = freightAtLogistics(ownWork(state, viewerId), viewerId);
  return { collected, shipments: transportShipments(capacity, collected, plan, collectionOrder) };
}
