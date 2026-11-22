import type { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import { noWorkers } from "../industry/labour";
import { marketOf, tradeOrdersOf } from "../market/market";
import { warehouseWith } from "../world/startWorld";
import { developmentSystem } from "../systems/developmentSystem";
import { diplomacySystem } from "../systems/diplomacySystem";
import { tradeSystem } from "../systems/tradeSystem";
import { disbandSystem, recruitSystem, upkeepSystem } from "../systems/armySystem";
import { productionSystem } from "../systems/productionSystem";
import { shipyardSystem } from "../systems/shipyardSystem";
import { transportConnectivitySystem } from "../systems/transportConnectivitySystem";
import { logisticsSystem } from "../systems/logisticsSystem";
import { tradeDeliverySystem } from "../systems/tradeDeliverySystem";
import { foodSystem } from "../systems/foodSystem";
import { universitySystem } from "../systems/universitySystem";
import { technologySystem } from "../systems/technologySystem";
import { advanceClock, promoteFreightCars, resetWorkers } from "../systems/turnHousekeeping";
import { createTurnContext } from "../turn/context";

const visibleTerrainFields = ["id", "x", "y", "terrain", "hasRiver", "provinceId", "cityId",
  "ownerNationId", "explored", "visible", "port", "depot", "fortLevel", "connected"] as const satisfies readonly (keyof Tile)[];

function publicTerrain(tile: Tile): Tile {
  const terrain = Object.fromEntries(visibleTerrainFields.map(key => [key, tile[key]])) as Pick<Tile, typeof visibleTerrainFields[number]>;
  return { ...terrain, workers: [], resource: tile.resource?.discovered === false ? undefined : tile.resource };
}

/** An opponent remains on the public map and Board, but has no economic orders in our forecast.
 * Build its placeholder from public identity fields: even reading and then clearing its mills,
 * escrowed balance or recruit orders would cross the FR-497 information boundary. */
export function researchView(state: GameState, nationId: string): GameState {
  const market = marketOf(state);
  return {
    ...state,
    nations: state.nations.map(n => n.id === nationId ? n : {
      id: n.id, name: n.name, colorSlot: n.colorSlot, controller: n.controller, cities: n.cities,
      fleets: [], treasury: 0, merchantMarine: { holds: 0, avgSpeed: 0 }, transportCapacity: 0,
      warehouse: warehouseWith(), industry: { workers: noWorkers(), training: noWorkers(), sick: noWorkers(), buildings: {}, recruits: 0 },
    }),
    intents: state.intents.filter(i => i.nationId === nationId),
    market: { ...market, orders: { [nationId]: tradeOrdersOf(state, nationId) }, deliveries: {} },
    transportAllocationsByNation: { [nationId]: state.transportAllocationsByNation?.[nationId] ?? {} },
    map: { ...state.map, tiles: state.map.tiles.map(row => row.map(t => t.ownerNationId === nationId ? t : publicTerrain(t))) },
  };
}

/** Resolve the paid orders in normal economic phase order. Other powers keep their visible armies
 * and give no new orders. Future battle outcomes and random price drift are unknown. */
export function nextResearchSeason(state: GameState, nationId: string): GameState {
  const ctx = createTurnContext({ turn: state.turn, rng: { next: () => 0.5 } });
  const jobs = developmentSystem(state, ctx);
  const traded = tradeSystem(diplomacySystem(jobs, ctx), ctx);
  const own = traded.nations.find(n => n.id === nationId)!;
  const funded = upkeepSystem(disbandSystem({ ...traded, nations: [own] }, ctx), ctx);
  let next = { ...funded, nations: traded.nations.map(n => n.id === nationId ? funded.nations[0] : n) };
  for (const phase of [productionSystem, recruitSystem, shipyardSystem, transportConnectivitySystem, logisticsSystem,
    tradeDeliverySystem, foodSystem, universitySystem, technologySystem, promoteFreightCars, resetWorkers, advanceClock]) {
    next = phase(next, ctx);
  }
  return { ...next, intents: [] };
}
