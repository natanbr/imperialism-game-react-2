import type { GameState } from "@/types/GameState";
import { MaterialType, ResourceType } from "@/types/Resource";
import { WorkerStatus, WorkerType } from "@/types/Workers";
import type { Order } from "../orders/Order";
import { applyOrder } from "../orders/apply";
import { findWorker, nationById, workersOf, type WorkerLocation } from "../orders/queries";
import { bestDepotSite, nextRailTiles, tilesByReach } from "./railPlan";
import { validateOrder } from "../orders/validate";
import type { Nation } from "@/types/Nation";
import type { BuildingType, ProductionOutput } from "@/types/Industry";
import { BUILDING_ORDER, BUILDINGS } from "@/definisions/industryBuildings";
import { FREIGHT_CAR_COST, RECIPES } from "@/definisions/ResourceConversions";
import { TRADE_COMMODITIES } from "@/definisions/marketPrices";
import { buildingOf } from "../industry/industryState";
import { labourPerUnit, labourTotal } from "../industry/labour";
import { isTradeCommodity, tradeCapacityOf, tradeOrdersOf } from "../market/market";
import { mealNeeds } from "../systems/foodSystem";
import { productionSystem } from "../systems/productionSystem";
import { createTurnContext } from "../turn/context";

/**
 * A player is any function from the game state to its orders for this turn. Scripted and,
 * from v3, LLM players share this shape (NR-006).
 */
export type Player = (state: GameState, nationId: string) => Order[];

/**
 * A small scripted player. Deterministic: tiles are scanned row by row and workers in map order,
 * the engineer first. It plans on a private copy of the state, applying each order it keeps, so
 * every order it returns is valid in sequence (FR-016). Order of its plan: transport, a freight car,
 * production, world-market trade (FR-070), then the civilians: the engineer joins depots to the
 * capital by the shortest rail path or starts the depot that gathers most (FR-122), the others work
 * the tiles the capital and the depots gather from first (FR-123).
 */
export const scriptedPlayer: Player = (state, nationId) => {
  const orders: Order[] = [];
  let view = state;
  const propose = (order: Order): boolean => {
    if (!validateOrder(view, order).ok) return false;
    view = applyOrder(view, order);
    orders.push(order);
    return true;
  };

  const nation = nationById(state, nationId);
  if (!nation) return orders;

  // Ship the fruit and meat the workers eat plus one canned-food batch's worth, and the grain
  // for both that the warehouse lacks; leave the rest to the greedy fill. Shipments arrive after
  // production, so the extra fruit and meat wait in the warehouse for next turn's canned-food
  // order (FR-054). Always valid, so the nation issues at least one order every turn.
  const { workers } = nation.industry;
  const needs = mealNeeds(workers.untrained + workers.trained + workers.expert);
  const canning = cannedFoodBatchInputs();
  const grainInStock = (nation.warehouse as Record<string, number>)[ResourceType.Grain] ?? 0;
  propose({
    kind: "setTransportAllocations",
    nationId,
    allocations: {
      [ResourceType.Fruit]: needs.fruit + canning.fruit,
      [ResourceType.Livestock]: needs.meat + canning.meat,
      [ResourceType.Grain]: Math.max(0, needs.grain + canning.grain - grainInStock),
    },
  });
  propose({ kind: "changeTransportCapacity", nationId, delta: 1 });

  // Industry, planned afresh each turn (FR-070): standing orders kept from last turn would hold the
  // labour, so they are cleared first; then one canned-food batch (so the workers keep raw food to
  // eat), then each building's outputs at the most the stock, labour and capacity allow, in the
  // production order.
  for (const building of BUILDING_ORDER) {
    for (const [output, amount] of Object.entries(buildingOf(nationById(view, nationId)!, building).orders)) {
      if ((amount ?? 0) > 0) propose({ kind: "setProduction", nationId, building, output: output as ProductionOutput, amount: 0 });
    }
  }
  const plan: [BuildingType, ProductionOutput][] = [["foodProcessing", MaterialType.CannedFood]];
  for (const building of BUILDING_ORDER) {
    for (const output of BUILDINGS[building].outputs) if (building !== "foodProcessing") plan.push([building, output]);
  }
  for (const [building, output] of plan) {
    const def = BUILDINGS[building];
    const batch = RECIPES[output].batch;
    const most = def.unlimited ? batch : buildingOf(nationById(view, nationId)!, building).capacity;
    for (let amount = most - (most % batch); amount > 0; amount -= batch) {
      if (propose({ kind: "setProduction", nationId, building, output, amount })) break;
    }
  }

  planTrade(() => view, nationId, propose);

  // The engineer plans first, so the depot he starts is paid for and its tiles count as gathered
  // when the others choose (FR-123). The sort is stable: the others keep their map order.
  const civilians = workersOf(state, nationId).sort(
    (a, b) => Number(b.worker.type === WorkerType.Engineer) - Number(a.worker.type === WorkerType.Engineer)
  );
  for (const { worker } of civilians) {
    const current = findWorker(view, worker.id);
    if (!current || current.worker.status !== WorkerStatus.Available || current.worker.justMoved) continue;
    for (const order of candidateOrders(view, nationId, current)) {
      if (propose(order)) break;
    }
  }
  return orders;
};

type Propose = (order: Order) => boolean;

/** Proposes the largest of `most`, `most - 1`, ... 1 that validates; returns it, or 0. */
function proposeMost(propose: Propose, most: number, order: (amount: number) => Order): number {
  for (let amount = most; amount > 0; amount--) if (propose(order(amount))) return amount;
  return 0;
}

/**
 * World-market orders (FR-070): (1) offer surplus with up to half the holds, (2) bid for the
 * inputs next turn's planned run lacks, (3) offer more surplus with any holds left. Surplus is
 * tradeable stock this turn's production does not use and the planned run does not need; canned
 * food is kept for meals and migrants. `view` is the plan so far, after the production orders.
 */
function planTrade(view: () => GameState, nationId: string, propose: Propose): void {
  const start = view();
  const nation = nationById(start, nationId);
  if (!nation) return;
  const { after, leftNow } = projectProduction(start, nationId);
  const needs = plannedRunNeeds(nation);
  const needed = new Set<string>(needs.flatMap((need) => need.types));
  const surplus = TRADE_COMMODITIES.filter((c) => c !== MaterialType.CannedFood && !needed.has(c));

  const offer = (holds: number) => {
    let budget = holds;
    for (const commodity of surplus) {
      if (budget <= 0) return;
      const offered = tradeOrdersOf(view(), nationId).sell[commodity] ?? 0;
      const more = Math.min(budget, Math.floor(leftNow[commodity] ?? 0) - offered);
      budget -= proposeMost(propose, more, (amount) => ({ kind: "sellCommodity", nationId, commodity, amount: offered + amount }));
    }
  };

  offer(Math.floor(tradeCapacityOf(start, nationId).holds / 2));
  for (const { types, amount } of needs) {
    const buyAs = types.find(isTradeCommodity);
    if (!buyAs) continue;
    const bids = tradeOrdersOf(view(), nationId).buy;
    const have = types.reduce((sum, t) => sum + (after[t] ?? 0) + (isTradeCommodity(t) ? (bids[t] ?? 0) : 0), 0);
    const lack = Math.min(amount - have, tradeCapacityOf(view(), nationId).free);
    const current = bids[buyAs] ?? 0;
    proposeMost(propose, lack, (n) => ({ kind: "buyCommodity", nationId, commodity: buyAs, amount: current + n }));
  }
  offer(tradeCapacityOf(view(), nationId).free);
}

/**
 * The warehouse after this turn's production (`after`) and the stock that production leaves
 * untouched now (`leftNow`: after, less what it makes), from a run of the production phase on
 * the plan. Nothing is kept; systems never mutate their input.
 */
function projectProduction(state: GameState, nationId: string): { after: Record<string, number>; leftNow: Record<string, number> } {
  const made: Record<string, number> = {};
  const ctx = createTurnContext({
    turn: state.turn,
    emit: (e) => {
      if (e.type === "goods-produced" && e.nationId === nationId) made[e.output] = (made[e.output] ?? 0) + e.amount;
    },
  });
  const after = { ...(nationById(productionSystem(state, ctx), nationId)!.warehouse as Record<string, number>) };
  const leftNow = Object.fromEntries(Object.entries(after).map(([key, n]) => [key, n - (made[key] ?? 0)]));
  return { after, leftNow };
}

/**
 * The inputs of next turn's planned run: each built mill and factory in production order, its
 * first output at capacity while the labour lasts, after one canned-food batch and one freight
 * car. Inputs that may be mixed (cotton or wool) stay one group.
 */
function plannedRunNeeds(nation: Nation): { types: readonly string[]; amount: number }[] {
  let labour = labourTotal(nation.industry) - RECIPES[MaterialType.CannedFood].labour - FREIGHT_CAR_COST.labour;
  const needs = new Map<string, { types: readonly string[]; amount: number }>();
  for (const building of BUILDING_ORDER) {
    const def = BUILDINGS[building];
    const { capacity } = buildingOf(nation, building);
    if (def.unlimited || capacity <= 0) continue;
    const output = def.outputs[0];
    const recipe = RECIPES[output];
    const units = Math.min(capacity, Math.floor(Math.max(0, labour) / labourPerUnit(output)));
    const batches = Math.floor(units / recipe.batch);
    if (batches <= 0) continue;
    labour -= batches * recipe.labour;
    for (const input of recipe.inputs) {
      const key = input.types.join("+");
      needs.set(key, { types: input.types, amount: (needs.get(key)?.amount ?? 0) + batches * input.amount });
    }
  }
  return [...needs.values()];
}

/** The fruit and the livestock-or-fish one canned-food batch takes (from the recipe). */
function cannedFoodBatchInputs(): { grain: number; fruit: number; meat: number } {
  const amountOf = (type: ResourceType) =>
    RECIPES[MaterialType.CannedFood].inputs.find((input) => input.types.includes(type))?.amount ?? 0;
  return { grain: amountOf(ResourceType.Grain), fruit: amountOf(ResourceType.Fruit), meat: amountOf(ResourceType.Livestock) };
}

/** What this civilian could do, best first; validation picks the first one that is allowed. */
function candidateOrders(view: GameState, nationId: string, { worker, tile }: WorkerLocation): Order[] {
  const workerId = worker.id;
  if (worker.type === WorkerType.Engineer) return engineerOrders(view, nationId, workerId, tile.id);
  const prospecting = worker.type === WorkerType.Prospector;
  return tilesByReach(view, nationId).map((t): Order => {
    if (t.id === tile.id) {
      return prospecting ? { kind: "startProspecting", nationId, workerId, tileId: t.id } : { kind: "startDevelopment", nationId, workerId, tileId: t.id };
    }
    return prospecting
      ? { kind: "moveAndStartProspecting", nationId, workerId, toTileId: t.id }
      : { kind: "moveAndStartDevelopment", nationId, workerId, toTileId: t.id };
  });
}

/**
 * The engineer (FR-122): (1) the next rail tile of the shortest path joining a built depot to the
 * capital's network; else (2), while no depot is being built, the depot that newly gathers most. It
 * lays no rail that joins nothing and builds no port (nothing it ships needs one).
 */
function engineerOrders(view: GameState, nationId: string, workerId: string, standingOn: string): Order[] {
  const rail = nextRailTiles(view, nationId).flatMap((toTileId): Order[] => [
    { kind: "moveAndBuildRail", nationId, workerId, toTileId },
    { kind: "moveAndStartConstruction", nationId, workerId, toTileId, structure: "rail" },
  ]);
  if (rail.length > 0) return rail;
  const building = view.map.tiles.flat().some((t) => t.ownerNationId === nationId && t.constructionJob?.kind === "depot");
  if (building) return [];
  const site = bestDepotSite(view, nationId);
  if (!site) return [];
  if (site.tileId === standingOn) return [{ kind: "startConstruction", nationId, workerId, tileId: site.tileId, structure: "depot" }];
  return [{ kind: "moveAndStartConstruction", nationId, workerId, toTileId: site.tileId, structure: "depot" }];
}
