// Phase 3 of the turn, industrial production (rules 01 section 1, rules 05; FR-037 to FR-039,
// FR-041). Everything made here is usable next turn.
import type { GameState } from "@/types/GameState";
import type { BuildingType, IndustryBuilding, IndustryState, ProductionOutput, WorkerGrade } from "@/types/Industry";
import type { Nation } from "@/types/Nation";
import { BUILDINGS } from "@/definisions/industryBuildings";
import { TRAINED_TO } from "@/definisions/ResourceConversions";
import { planProduction } from "../industry/productionPlan";
import type { TurnContext, TurnSystem } from "../turn/context";

/**
 * One nation's production, as planned by planProduction (FR-116): the inputs leave the warehouse as
 * each building runs; outputs are added only at the end, so nothing made this turn is used this turn.
 */
function produceNation(nation: Nation, ctx: TurnContext): Nation {
  const industry = nation.industry;
  const { cars, made, stock } = planProduction(nation);
  if (cars > 0) ctx.emit({ type: "freight-cars-built", nationId: nation.id, count: cars });

  for (const [output, amount] of Object.entries(made) as [ProductionOutput, number][]) {
    stock[output] = (stock[output] ?? 0) + amount;
    ctx.emit({ type: "goods-produced", nationId: nation.id, output, amount });
  }

  // The built cars wait in the pending count; promoteFreightCars puts them in service after every
  // phase, so this turn's shipping uses the old capacity (FR-101, NR-016).
  return {
    ...nation,
    warehouse: stock as Nation["warehouse"],
    transportCapacityPendingIncrease: cars,
    industry: promoteTrainees(nation.id, { ...industry, buildings: finishBuildings(nation.id, industry, ctx) }, ctx),
  };
}

/** Expansions ordered this turn take effect; food processing forgets its orders (FR-033, FR-038). */
function finishBuildings(nationId: string, industry: IndustryState, ctx: TurnContext): IndustryState["buildings"] {
  const buildings: Partial<Record<BuildingType, IndustryBuilding>> = {};
  for (const [name, building] of Object.entries(industry.buildings) as [BuildingType, IndustryBuilding | undefined][]) {
    if (!building) continue;
    const def = BUILDINGS[name];
    const capacity = building.capacity + building.pendingCapacity;
    if (building.pendingCapacity > 0) ctx.emit({ type: "building-expanded", nationId, building: name, capacity });
    buildings[name] = { capacity, pendingCapacity: 0, orders: def?.keepsOrders === false ? {} : building.orders };
  }
  return buildings;
}

/** Trainees finished their turn of training and move up one grade (FR-041). */
function promoteTrainees(nationId: string, industry: IndustryState, ctx: TurnContext): IndustryState {
  const workers = { ...industry.workers };
  for (const from of ["untrained", "trained"] as const) {
    const count = Math.min(industry.training[from], workers[from]);
    if (count <= 0) continue;
    const to: WorkerGrade = TRAINED_TO[from];
    workers[from] -= count;
    workers[to] += count;
    ctx.emit({ type: "workers-trained", nationId, to: TRAINED_TO[from], count });
  }
  return { ...industry, workers, training: { untrained: 0, trained: 0, expert: 0 } };
}

export const productionSystem: TurnSystem = (state: GameState, ctx: TurnContext): GameState => ({
  ...state,
  nations: state.nations.map((nation) => produceNation(nation, ctx)),
});
