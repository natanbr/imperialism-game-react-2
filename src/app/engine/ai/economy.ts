// The scripted player's economy (NR-023, FR-126 to FR-131): what it ships, trains, builds, makes and
// trades each turn. Read-only planning on the player's private view; every order goes through
// `propose`, which keeps only the orders that validate in sequence (FR-016). Deterministic: fixed
// orders everywhere, no randomness.
//
// Where the points come from (score: $100 = 1 point, a capacity point = 10, a resource level = 10):
// a lumber + a steel expand a building by one capacity point (10 points; sold, the two bring about
// $600 = 6), so the industry turns its coal, iron and timber into lumber + steel pairs first; goods
// fill the 4 cargo holds for the cash that pays for level-1 development ($100 for 10 points); spare
// holds and cash buy more pairs while a pair costs less than the $1,000 its point is worth.
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import type { Tile } from "@/types/Tile";
import type { BuildingType, ProductionOutput } from "@/types/Industry";
import type { TradeAmounts, TradeCommodity } from "@/types/Market";
import { SHIPS } from "@/definisions/ships";
import { GoodsType, MaterialType, ResourceType } from "@/types/Resource";
import type { Order } from "../orders/Order";
import { nationById } from "../orders/queries";
import { BUILDING_ORDER, BUILDINGS, nextCapacity } from "@/definisions/industryBuildings";
import { FREIGHT_CAR_COST, MIGRANT_COST, RECIPES, TRAINING_COST } from "@/definisions/ResourceConversions";
import { TRADE_COMMODITIES } from "@/definisions/marketPrices";
import { SCORE_WEIGHTS } from "@/definisions/scoreWeights";
import { CONSTRUCTION_COST, DEVELOPMENT_COST } from "@/definisions/workPrices";
import { buildingOf, START_WORKERS } from "../industry/industryState";
import { planProduction } from "../industry/productionPlan";
import { GRADES, healthyWorkers, labourTotal } from "../industry/labour";
import { marketOf, priceOf, tradeCapacityOf, tradeOrdersOf } from "../market/market";
import { marketModeOf } from "../market/partners";
import { partnerDemand, partnerSupply, planConsulate } from "./scriptedPartners";
import { councilTradeInputs, embassySaving, planInfluence } from "./scriptedInfluence";
import { greatPowerTradeCaps } from "./scriptedGreatPowerTrade";
import { mealNeeds } from "../systems/foodSystem";
import { productionSystem } from "../systems/productionSystem";
import { projectedFreightPlan, projectedFreightSupply, rawFreightSupply, updateNationStateWithTransportedResources } from "../systems/logisticsSystem";
import { transportConnectivitySystem } from "../systems/transportConnectivitySystem";
import { developmentSystem } from "../systems/developmentSystem";
import { createTurnContext } from "../turn/context";
import { turnLimitOf } from "../turn/gameOver";
import { SCRIPTED_GARRISON } from "@/definisions/regiments";
import { armsWanted, planGarrison, upkeepReserve } from "./scriptedArmy";
import { workersKeptForCampaign } from "./scriptedWar";
import { capitalComponent } from "./railPlan";
import { upkeepOf } from "../army/armies";
import { townChains } from "../world/towns";
import { WorkerType } from "@/types/Workers";

export type Propose = (order: Order) => boolean;
type Stock = Record<string, number>;

/** Turns still to be resolved after this one (0 on the last turn). */
export const turnsAfter = (state: GameState): number => Math.max(0, turnLimitOf(state) - state.turn);

/**
 * The cash reserve of a new game (FR-128, FR-129): one depot and a level-1 job for each of the five developers. Since
 * FR-454 the reserve follows what the civilians need soon (`cashReserve`); this is its value while the engineer is free
 * to start a depot, and a nation with an army keeps it (FR-213's recruit floor).
 */
export const CASH_RESERVE = CONSTRUCTION_COST.depot + 5 * DEVELOPMENT_COST[1];

/** The most one rail section costs (swamp, mountains): kept while a depot is being built or joined (FR-454). */
const RAIL_RESERVE = 300;
const DEVELOPERS: readonly WorkerType[] = [WorkerType.Farmer, WorkerType.Rancher, WorkerType.Forester, WorkerType.Miner, WorkerType.Driller];

/** FR-454: one level-one job for each of the nation's developers on its land. */
export function developerReserve(ownTiles: Tile[], nationId: string): number {
  const developers = ownTiles.reduce((n, t) => n + t.workers.filter((w) => w.nationId === nationId && DEVELOPERS.includes(w.type)).length, 0);
  return developers * DEVELOPMENT_COST[1];
}

/**
 * FR-454: the cash the civilians need soon, kept from bids and the pairs-first run (FR-128, FR-129) and, without an
 * army, from training (FR-460): a level-1 job ($100) for each developer, plus a depot's price while the engineer is
 * free to start one (no depot being built, every built depot joined to the capital), else one rail section. Cash beyond
 * it buys lumber + steel pairs instead of lying idle until the next depot. A new game keeps CASH_RESERVE; so does a
 * nation with an army (FR-213, FR-274).
 */
export function cashReserve(state: GameState, nationId: string): number {
  if (upkeepOf(state, nationId) > 0) return Math.max(CASH_RESERVE, SCRIPTED_GARRISON.treasuryFloor);
  const own = state.map.tiles.flat().filter((t) => t.ownerNationId === nationId);
  const component = capitalComponent(state, nationId);
  const depotWork = own.some((t) => t.constructionJob?.kind === "depot" || (!!t.depot && !component.has(`${t.x},${t.y}`)));
  return developerReserve(own, nationId) + (depotWork ? RAIL_RESERVE : CONSTRUCTION_COST.depot);
}

/** Untrained to trained gives 1 more labour a turn from next turn on; trained to expert 2 more (FR-130). */
export const TRAIN_MIN_TURNS = 3;
export const EXPERT_MIN_TURNS = 8;

/** A freight car costs a lumber + steel pair (one capacity point) and 2 labour: none in the last turns (FR-127). */
export const CAR_MIN_TURNS = 8;

/** A lumber + steel pair expands one capacity point: worth buying while both cost less than its points (FR-128). */
export const PAIR_VALUE = SCORE_WEIGHTS.pointsPerCapacity * SCORE_WEIGHTS.dollarsPerPoint;

const nationOf = (state: GameState, nationId: string): Nation => nationById(state, nationId)!;
/** Start putting materials aside when a phase fills the fleet. Three full phases justify the order itself. */
function fullTradePhases(state: GameState, nationId: string): number {
  if (!state.provinces.length) return 0;
  const marine = nationOf(state, nationId).merchantMarine;
  if (marine.pendingShips?.indiaman || (marine.lastShipOrderTurn !== undefined && state.turn - marine.lastShipOrderTurn < 4)) return 0;
  return (marine.tradeHistory ?? []).filter(phase => phase.holds > 0 && phase.used === phase.holds).length;
}
export function saveShipMaterials(state: GameState, nationId: string): boolean {
  if (nationOf(state, nationId).controller !== "scripted") return false;
  // Unmatched partner bids can leave a small fleet idle again before its mills finish the hull.
  // World-market orders always settle, so the existing cargo history is enough there.
  return fullTradePhases(state, nationId) >= (marketModeOf(state) === "partners" ? 1 : 3);
}
const mouthsOf = (nation: Nation): number => {
  const { untrained, trained, expert } = nation.industry.workers;
  return untrained + trained + expert;
};
const capacityOf = (nation: Nation, building: BuildingType): number => {
  const { capacity, pendingCapacity } = buildingOf(nation, building);
  return capacity + pendingCapacity;
};

/**
 * The whole economy of one turn, in the order the orders must be given. The garrison's recruit (FR-213) comes right
 * after the standing orders are cleared, so its worker is free before training and the run take the labour.
 */
export function planEconomy(view: () => GameState, nationId: string, propose: Propose): void {
  planTransport(view(), nationId, propose);
  clearStandingOrders(view(), nationId, propose);
  planGarrison(view, nationId, propose);
  planTraining(view, nationId, propose);
  if (fullTradePhases(view(), nationId) >= 3) {
    propose({ kind: "setShipyard", nationId, ship: "indiaman", count: 1 });
  }
  if (!saveShipMaterials(view(), nationId)) planFreightCars(view, nationId, propose);
  planExpansion(view, nationId, propose);
  proposeRun(view, nationId, propose);
  const workforce = view();
  const replaceWorker = migrantsWanted(workforce, nationId) > 0;
  if (replaceWorker) planMigrant(workforce, nationId, propose);
  planTrade(view, nationId, propose);
  if (!replaceWorker) planOptionalMigrant(workforce, view(), nationId, propose);
}

// --- transport (FR-127) ---------------------------------------------------------------------

const townCommodities = new Set<string>(townChains.flatMap(([, material, good]) => [material, good]));

/**
 * FR-628: the town materials and goods of a forecast collection, one entry per commodity holding every town's units.
 * The entries keep the order in which each commodity first entered the collection: the first producing province's
 * chain order (material before good), then any commodity only a later province adds. That is not each town's own
 * offer order. The whole forecast is wanted: lumber and steel build capacity, fabric feeds the clothing factory and
 * the goods sell. A raw-only collection has none. The forecast reads only the nation's own towns on its own map
 * (FR-497).
 */
export const townShippingWants = (collected: Stock): [string, number][] =>
  Object.entries(collected).filter(([commodity, units]) => townCommodities.has(commodity) && units > 0);

/**
 * Units worth shipping this turn, in priority order: the meal's raw food that the warehouse lacks
 * (keeping one meal in stock), plus one canned-food batch's while the cans are fewer than the
 * workers; the steel mill's coal and iron (the scarcer in stock first), the lumber mill's timber,
 * the textile mill's cotton and wool, each up to two turns of its mill at full capacity; then the towns' materials and
 * goods (`towns`, FR-628), before the cars left for the other resources. As for a person, the planned amounts come
 * first and the towns before ordinary freight.
 */
export function shippingWants(
  state: GameState, nationId: string, gathered = rawFreightSupply(state, nationId), towns = townShippingWants(gathered)
): [string, number][] {
  const nation = nationOf(state, nationId);
  const stock = nation.warehouse as Stock;
  const mouths = mouthsOf(nation);
  const needs = mealNeeds(mouths);
  const canning = (stock[MaterialType.CannedFood] ?? 0) < mouths;
  const batch = (type: ResourceType) =>
    canning ? (RECIPES[MaterialType.CannedFood].inputs.find((input) => input.types.includes(type))?.amount ?? 0) : 0;
  const food = (type: ResourceType, need: number): [string, number] => {
    const want = need + batch(type);
    return [type, Math.max(0, Math.min(want, need + want - (stock[type] ?? 0)))];
  };
  const input = (type: ResourceType, perTurn: number): [string, number] => [
    type,
    Math.max(0, Math.min(gathered[type] ?? 0, 2 * perTurn - (stock[type] ?? 0))),
  ];
  const steelCap = capacityOf(nation, "steelMill");
  const fibreUse = 2 * capacityOf(nation, "textileMill");
  const ores = [input(ResourceType.Coal, steelCap), input(ResourceType.IronOre, steelCap)].sort(
    (a, b) => (stock[a[0]] ?? 0) - (stock[b[0]] ?? 0)
  );
  return [
    food(ResourceType.Grain, needs.grain),
    food(ResourceType.Fruit, needs.fruit),
    food(ResourceType.Livestock, needs.meat),
    ...ores,
    input(ResourceType.Timber, 2 * capacityOf(nation, "lumberMill")),
    input(ResourceType.Cotton, fibreUse),
    input(ResourceType.Wool, fibreUse),
    ...towns,
  ];
}

/**
 * The scripted transport plan since FR-389 (a set amount is exact, an absent commodity automatic), for `capacity` cars
 * and the `collected` units: each commodity with a want is set, in the wants' order, to the larger of its want and what
 * the rule from before FR-389 (the wants first, then the cars left filled in tile order) ships of it; every other
 * commodity stays automatic and takes the cars left in tile order. The logistics phase then ships what that rule
 * shipped. The fill follows the collection's key order, with raw tile and Fish supply before town commodities, not the
 * logistics phase's towns-first order (FR-628). The towns lose nothing by it: `townShippingWants` makes their whole
 * forecast a want, so they take their cars before the fill. Example: 15 cars, collected grain 10, livestock 4, fruit 5, cotton 2, wants livestock 1 and cotton 2:
 * { livestock: 3, cotton: 2 }, and the logistics phase ships livestock 3, cotton 2, grain 10.
 */
export function priorityPlan(capacity: number, collected: Stock, wants: readonly (readonly [string, number])[]): Record<string, number> {
  const shipped: Stock = {};
  let used = 0;
  const ship = (res: string, wanted: number) => {
    const units = Math.max(0, Math.min(wanted, (collected[res] ?? 0) - (shipped[res] ?? 0), capacity - used));
    if (units <= 0) return;
    shipped[res] = (shipped[res] ?? 0) + units;
    used += units;
  };
  const wanted = wants.map(([res, want]) => [res, Math.floor(want) || 0] as const).filter(([, want]) => want > 0);
  for (const [res, want] of wanted) ship(res, want);
  for (const [res, amount] of Object.entries(collected)) ship(res, amount);
  return Object.fromEntries(wanted.map(([res, want]) => [res, Math.max(want, shipped[res] ?? 0)]));
}

const carsOf = (state: GameState, nationId: string): number => Math.max(0, nationOf(state, nationId).transportCapacity ?? 0);

/** The first plan, on what the hubs collect now: the one the trade's projection ships (`projectTurn` runs no development). */
function planTransport(state: GameState, nationId: string, propose: Propose): void {
  const gathered = projectedFreightSupply(state, nationId);
  const allocations = priorityPlan(carsOf(state, nationId), gathered, shippingWants(state, nationId, gathered));
  propose({ kind: "setTransportAllocations", nationId, allocations });
}

/**
 * What the hubs collect in the logistics phase of the turn `view` plans (its orders given): after the development
 * phase finishes this turn's jobs (a rail, a depot, a tile's next level) and the connectivity phase updates the hubs.
 */
export function collectedAtLogistics(view: GameState, nationId: string): Stock {
  const ctx = createTurnContext({ turn: view.turn });
  const connected = transportConnectivitySystem(developmentSystem(view, ctx), ctx);
  // A survey can finish in the real settlement. Its result is still private while orders are being planned.
  return projectedFreightSupply(connected, nationId, view.map);
}

/**
 * FR-389: the plan given again once the turn's other orders are known (scriptedPlayer, after the civilians): a rail
 * an engineer starts may finish in this turn's development phase and join a new hub, and a set amount no longer takes
 * the cars that frees. The raw wants are the turn's start's (`start`), the collection and the towns' wants (FR-628) the
 * logistics phase's (`collectedAtLogistics(view)`); the cars ordered this turn join only after the phases.
 */
export function planFinalTransport(start: GameState, view: GameState, nationId: string, propose: Propose): void {
  const collected = collectedAtLogistics(view, nationId);
  const wants = shippingWants(start, nationId, rawFreightSupply(start, nationId), townShippingWants(collected));
  const allocations = priorityPlan(carsOf(view, nationId), collected, wants);
  propose({ kind: "setTransportAllocations", nationId, allocations });
}

/** One freight car a turn while the cargo worth shipping is more than the cars carry (FR-127). */
function planFreightCars(view: () => GameState, nationId: string, propose: Propose): void {
  const state = view();
  if (turnsAfter(state) < CAR_MIN_TURNS) return;
  // Raw wants only (FR-628): FR-628 changed which freight ships first, not when a car is bought. Counting town goods
  // here would also bring back the town projection that Task 57 removed from this per-turn query.
  const wanted = shippingWants(state, nationId).reduce((sum, [, n]) => sum + n, 0);
  if (wanted > Math.max(0, nationOf(state, nationId).transportCapacity ?? 0)) propose({ kind: "changeTransportCapacity", nationId, delta: 1 });
}

// --- industry -------------------------------------------------------------------------------

/** Standing orders kept from last turn would hold labour and stock: the run is planned afresh (FR-070). */
function clearStandingOrders(state: GameState, nationId: string, propose: Propose): void {
  const nation = nationOf(state, nationId);
  for (const building of BUILDING_ORDER) {
    for (const [output, amount] of Object.entries(buildingOf(nation, building).orders)) {
      if ((amount ?? 0) > 0) propose({ kind: "setProduction", nationId, building, output: output as ProductionOutput, amount: 0 });
    }
  }
}

/**
 * FR-460: the cash training may spend. The economy plans before the civilians, so a nation without an army keeps its
 * reserve (`cashReserve`, FR-454) for them: before FR-460 a training to expert ($1,000) left the engineer $116 for a
 * rail section (two-islands seed 7, turn 25), and the depot joined a turn late. A nation with an army trains as before
 * (FR-455, FR-458: its regiments draw trained workers): keeping a reserve there too lowered FR-260's start-army scores
 * (by up to 55 points), so its engineer can still wait a turn for a section (card Q107). FR-542: either way it leaves the
 * embassy's $5,000 while one is wanted (`embassySaving`).
 */
const trainingCash = (state: GameState, nation: Nation): number =>
  nation.treasury - (upkeepOf(state, nation.id) > 0 ? 0 : cashReserve(state, nation.id)) - embassySaving(state, nation.id);

/**
 * Training (FR-130), only on a turn whose run would use all the labour (less than 2 left, so more
 * labour would be used): as many as the paper and cash allow (`trainingCash`, FR-460), untrained first.
 */
function planTraining(view: () => GameState, nationId: string, propose: Propose): void {
  const left = turnsAfter(view());
  if (planRun(view(), nationId).labour >= 2) return;
  for (const from of ["untrained", "trained"] as const) {
    if (left < (from === "untrained" ? TRAIN_MIN_TURNS : EXPERT_MIN_TURNS)) continue;
    const nation = nationOf(view(), nationId);
    const cost = TRAINING_COST[from];
    const paper = (nation.warehouse as Stock)[MaterialType.Paper] ?? 0;
    // FR-458: the campaign's recruits keep their grade
    const free = healthyWorkers(nation.industry, from) - workersKeptForCampaign(view(), nationId, from);
    const most = Math.min(free, Math.floor(paper / cost.paper), Math.floor(trainingCash(view(), nation) / cost.cash));
    for (let n = most; n > 0; n--) if (propose({ kind: "trainWorkers", nationId, from, delta: n })) break;
  }
}

const garrisonTarget = (state: GameState, nationId: string): number =>
  armsWanted(state, nationId) ? SCRIPTED_GARRISON.armaments : 0;

/** The armaments the run makes first while arms are wanted (FR-213, FR-274): up to 2 in stock, within the metal works. */
const garrisonArmaments = (nation: Nation, target: number): number => {
  const short = target - (nation.warehouse[GoodsType.Armaments] ?? 0);
  return Math.max(0, Math.min(short, buildingOf(nation, "metalWorks").capacity));
};

/** Materials expansion and coastal defence may spend after paid orders, standing production and protected plans. */
export function stockAfterCommitments(state: GameState, nationId: string) {
  const nation = nationOf(state, nationId);
  const { stock, made } = planProduction(nation);
  const hull = saveShipMaterials(state, nationId) ? SHIPS.indiaman : undefined;
  const migrant = nextMigrantWanted(state, nationId);
  const arms = garrisonTarget(state, nationId);
  // Scheduled batches have already taken their inputs from stock. Reserve inputs only for the unfilled plan.
  const furniture = migrant && !made.furniture ? RECIPES[GoodsType.Furniture].inputs[0].amount : 0;
  const clothing = migrant && !made.clothing ? RECIPES[GoodsType.Clothing].inputs[0].amount : 0;
  const armsToMake = Math.max(0, garrisonArmaments(nation, arms) - (made.armaments ?? 0));
  // Unbuilt cars refund their cost at resolution. An order now can spend only what is already in the warehouse.
  const free = (resource: MaterialType | GoodsType, reserved: number) =>
    Math.max(0, Math.min(nation.warehouse[resource] ?? 0, (stock[resource] ?? 0) - reserved));
  return {
    lumber: free(MaterialType.Lumber, (hull?.lumber ?? 0) + furniture),
    fabric: free(MaterialType.Fabric, (hull?.fabric ?? 0) + clothing),
    steel: free(MaterialType.Steel, armsToMake * RECIPES[GoodsType.Armaments].inputs[0].amount),
    armaments: free(GoodsType.Armaments, arms),
  };
}

/** The lumber + steel pairs the labour can make a turn (4 labour a pair). */
const pairsLabourAllows = (nation: Nation): number =>
  Math.floor(labourTotal(nation.industry) / (RECIPES[MaterialType.Lumber].labour + RECIPES[MaterialType.Steel].labour));

/**
 * Every lumber + steel pair in stock becomes capacity (FR-126): first the steel and lumber mills,
 * while they are smaller than the pairs the labour can make, then the building whose next step is
 * cheapest (ties to the smaller building, then production order: a point scores the same anywhere,
 * so the factories grow evenly). The refinery needs Oil Drilling and is skipped. Under an army threat
 * the steel of the garrison's armaments stays out (FR-213: the run makes them first).
 */
function planExpansion(view: () => GameState, nationId: string, propose: Propose): void {
  const capped = BUILDING_ORDER.filter((b) => !BUILDINGS[b].unlimited && !BUILDINGS[b].needsOilDrilling);
  const { lumber, steel } = stockAfterCommitments(view(), nationId);
  let pairs = Math.min(lumber, steel);
  for (let guard = 0; guard < 64; guard++) {
    const nation = nationOf(view(), nationId);
    const target = pairsLabourAllows(nation);
    const steps = capped
      .map((building) => {
        const size = capacityOf(nation, building);
        const cost = nextCapacity(BUILDINGS[building].kind, size) - size;
        const mill = building === "steelMill" || building === "lumberMill";
        return { building, size, cost, first: mill && size < target ? 0 : 1 };
      })
      .filter((step) => step.cost <= pairs)
      .sort((a, b) => a.first - b.first || a.cost - b.cost || a.size - b.size);
    const expanded = steps.find(({ building }) => propose({ kind: "expandBuilding", nationId, building }));
    if (!expanded) return;
    pairs -= expanded.cost;
  }
}

interface Run {
  /** Labour left unused. */
  labour: number;
  stock: Stock;
  room: Partial<Record<BuildingType, number>>;
  made: Partial<Record<ProductionOutput, number>>;
}

/** Makes up to `units` of `output` within the run's labour, room and stock; returns what it made. */
function make(run: Run, output: ProductionOutput, units: number): number {
  const recipe = RECIPES[output];
  const building = recipe.building as BuildingType;
  const unlimited = BUILDINGS[building].unlimited;
  const room = unlimited ? Infinity : (run.room[building] ?? 0);
  const inStock = Math.min(
    ...recipe.inputs.map((input) => Math.floor(input.types.reduce((sum, t) => sum + (run.stock[t] ?? 0), 0) / input.amount))
  );
  const batches = Math.max(0, Math.min(Math.floor(Math.min(units, room) / recipe.batch), Math.floor(run.labour / recipe.labour), inStock));
  if (batches <= 0) return 0;
  // A mixed input (cotton or wool) is taken from the larger stock first, as the production phase does.
  for (const input of recipe.inputs) {
    let remaining = batches * input.amount;
    for (const type of [...input.types].sort((a, b) => (run.stock[b] ?? 0) - (run.stock[a] ?? 0))) {
      const take = Math.min(run.stock[type] ?? 0, remaining);
      run.stock[type] = (run.stock[type] ?? 0) - take;
      remaining -= take;
    }
  }
  run.labour -= batches * recipe.labour;
  if (!unlimited) run.room[building] = room - batches * recipe.batch;
  run.made[output] = (run.made[output] ?? 0) + batches * recipe.batch;
  return batches * recipe.batch;
}

/**
 * FR-455: the labour one turn of what the hubs gather needs (the transport screen's figures): a timber
 * (half a lumber), a coal + iron ore pair (a steel) 2, a cotton or wool 1 for its half fabric and 1/2 for its quarter
 * clothing. The start stock is left out: it is spent within a few turns whatever the labour.
 */
export function hubLabourNeed(state: GameState, nationId: string): number {
  const gathered = rawFreightSupply(state, nationId);
  const of = (type: ResourceType) => gathered[type] ?? 0;
  const steel = Math.min(of(ResourceType.Coal), of(ResourceType.IronOre)) * RECIPES[MaterialType.Steel].labour;
  const timber = (of(ResourceType.Timber) / RECIPES[MaterialType.Lumber].inputs[0].amount) * RECIPES[MaterialType.Lumber].labour;
  const fibre = of(ResourceType.Cotton) + of(ResourceType.Wool);
  const fabric = fibre / RECIPES[MaterialType.Fabric].inputs[0].amount;
  const clothing = fabric / RECIPES[GoodsType.Clothing].inputs[0].amount;
  return steel + timber + fabric * RECIPES[MaterialType.Fabric].labour + clothing * RECIPES[GoodsType.Clothing].labour;
}

/**
 * Paper next turn's training can use: one per untrained worker, two per trained one (when it still pays). FR-455: none
 * while the workers' labour covers what the hubs gather a turn (`hubLabourNeed`): more labour would then stand idle,
 * and the paper only takes the lumber mill's timber from lumber (measured: the 10 start timber made into paper on turns
 * 1 and 2 cost 4 lumber + steel pairs by turn 15). A nation with an army trains as before: its regiments draw trained
 * workers (the campaign's Cuirassiers, FR-274), so there training pays beyond the labour.
 */
function paperWanted(state: GameState, nation: Nation): number {
  if (upkeepOf(state, nation.id) === 0 && hubLabourNeed(state, nation.id) <= labourTotal(nation.industry)) return 0;
  const left = turnsAfter(state) - 1;
  const { industry } = nation;
  let want = 0;
  if (left >= TRAIN_MIN_TURNS) want += (industry.workers.untrained - industry.training.untrained) * TRAINING_COST.untrained.paper;
  if (left >= EXPERT_MIN_TURNS) want += (industry.workers.trained + industry.training.untrained) * TRAINING_COST.trained.paper;
  return Math.max(0, want - ((nation.warehouse as Stock)[MaterialType.Paper] ?? 0));
}

/**
 * This turn's run on the current plan (FR-129; nothing is ordered), by priority: under an army threat
 * the armaments the garrison recruits with, up to 2 in stock (FR-213); canned food while
 * the cans are fewer than the workers; while a migrant is wanted next turn (FR-485) a clothing and a furniture for him
 * and the fabric of the clothing after; paper for next turn's training; then the pairs and the goods,
 * the goods first while the treasury is below the reserve (`cashReserve`, FR-454); last, canned food from raw food above a
 * meal. Pairs: lumber + steel, the scarcer one first, so the pairs stay even. Goods for the holds
 * from stock the pairs do not need: clothing, furniture from unpaired lumber, and fabric and spare
 * lumber for next turn's goods. On the last turn nothing is made: it would be neither used nor sold.
 * `labour` replaces the workers' labour (FR-486's measure runs it with unlimited labour).
 */
export function planRun(state: GameState, nationId: string, labour = labourTotal(nationOf(state, nationId).industry)): Run {
  const nation = nationOf(state, nationId);
  const stock = { ...(nation.warehouse as Stock) };
  const room: Run["room"] = {};
  for (const building of BUILDING_ORDER) room[building] = buildingOf(nation, building).capacity;
  const cars = Math.max(0, Math.floor(nation.transportCapacityPendingIncrease ?? 0));
  const run: Run = { labour: labour - cars * FREIGHT_CAR_COST.labour, stock, room, made: {} };
  const left = turnsAfter(state);
  if (left === 0) return run;

  const mouths = mouthsOf(nation);
  const needs = mealNeeds(mouths);
  const aboveMeal = (): boolean =>
    (stock[ResourceType.Grain] ?? 0) >= needs.grain + 2 &&
    (stock[ResourceType.Fruit] ?? 0) >= needs.fruit + 1 &&
    (stock[ResourceType.Livestock] ?? 0) >= needs.meat + 1;
  const start = { ...stock };
  const have = (type: string) => (stock[type] ?? 0) + (run.made[type as ProductionOutput] ?? 0);

  // FR-213: under a threat the run first makes the garrison's armaments, up to 2 in stock
  make(run, GoodsType.Armaments, garrisonArmaments(nation, garrisonTarget(state, nationId)));
  if (saveShipMaterials(state, nationId)) {
    // A full fleet competes with expansion for lumber and with the clothing factory for fabric.
    // Reserve this hull's stock and run the mills for its shortfall before those uses.
    for (const material of [MaterialType.Lumber, MaterialType.Fabric] as const) {
      const target = SHIPS.indiaman[material];
      make(run, material, Math.max(0, target - (stock[material] ?? 0)));
      stock[material] = Math.max(0, (stock[material] ?? 0) - target);
    }
  }
  while (have(MaterialType.CannedFood) < mouths && aboveMeal() && make(run, MaterialType.CannedFood, 2) > 0);
  if (nextMigrantWanted(state, nationId)) {
    // FR-485: made this turn, in the warehouse for next turn's migrant (goods made this turn are not offered)
    make(run, GoodsType.Clothing, 1);
    make(run, GoodsType.Furniture, 1);
    make(run, MaterialType.Fabric, RECIPES[GoodsType.Clothing].inputs[0].amount - (stock[MaterialType.Fabric] ?? 0) - (run.made[MaterialType.Fabric] ?? 0));
  }
  make(run, MaterialType.Paper, paperWanted(state, nation));

  const pairs = () => {
    for (let guard = 0; guard < 256; guard++) {
      const first = have(MaterialType.Steel) <= have(MaterialType.Lumber) ? MaterialType.Steel : MaterialType.Lumber;
      if (make(run, first, 1) > 0) continue;
      // The scarcer one (steel when even) cannot be made: one more of the other would have no pair.
      return;
    }
  };
  const goods = () => {
    make(run, GoodsType.Clothing, Infinity);
    // A furniture takes 2 lumber: only lumber with no steel to pair with is spent (FR-140).
    const unpaired = (start[MaterialType.Lumber] ?? 0) - (start[MaterialType.Steel] ?? 0);
    make(run, GoodsType.Furniture, Math.max(0, Math.floor(unpaired / RECIPES[GoodsType.Furniture].inputs[0].amount)));
    if (left < 2) return;
    make(run, MaterialType.Fabric, 2 * capacityOf(nation, "clothingFactory") - (stock[MaterialType.Fabric] ?? 0));
    const spareLumber = have(MaterialType.Lumber) - have(MaterialType.Steel);
    make(run, MaterialType.Lumber, 2 * capacityOf(nation, "furnitureFactory") - spareLumber);
  };
  if (nation.treasury < cashReserve(state, nationId)) {
    goods();
    pairs();
  } else {
    pairs();
    goods();
  }
  while (aboveMeal() && make(run, MaterialType.CannedFood, 2) > 0);
  return run;
}

function proposeRun(view: () => GameState, nationId: string, propose: Propose): void {
  const run = planRun(view(), nationId);
  for (const building of BUILDING_ORDER) {
    for (const output of BUILDINGS[building].outputs) {
      const amount = run.made[output] ?? 0;
      const batch = RECIPES[output].batch;
      for (let n = amount; n > 0; n -= batch) if (propose({ kind: "setProduction", nationId, building, output, amount: n })) break;
    }
  }
}

// --- workforce (FR-485, FR-486; card Q116 (b)) ---------------------------------------------------

/** A migrant only while at least this many turns follow: he joins after this turn's meal and works from next turn on. */
export const MIGRANT_MIN_TURNS = 3;

/** FR-486: the capacity points this turn's run leaves idle for want of labour that call for a migrant. */
export const MIGRANT_IDLE_CAPACITY = 4;

/** A new game's workforce (START_WORKERS: 7), what FR-485 keeps. */
const START_WORKFORCE = GRADES.reduce((n, grade) => n + START_WORKERS[grade], 0);

/** Healthy workers (not sick; a worker in training is back next turn) and the migrants ordered this turn. */
const workforceOf = (nation: Nation): number =>
  GRADES.reduce((n, grade) => n + nation.industry.workers[grade] - nation.industry.sick[grade], 0) + nation.industry.recruits;

const hasMigrantGoods = (nation: Nation): boolean =>
  Object.entries(MIGRANT_COST).every(([commodity, each]) => ((nation.warehouse as Stock)[commodity] ?? 0) >= (each ?? 0));

/**
 * FR-485: the workers it is short of a new game's workforce (its regiments took them, FR-455), on a world with provinces;
 * always 0 on a world without (FR-498: two-islands play does not move).
 */
export function migrantsWanted(state: GameState, nationId: string): number {
  if (state.provinces.length === 0) return 0;
  return Math.max(0, START_WORKFORCE - workforceOf(nationOf(state, nationId)));
}

/** FR-485: one more migrant is wanted after this turn's (if its goods are in stock now), with the turns to use him. */
function nextMigrantWanted(state: GameState, nationId: string): boolean {
  if (turnsAfter(state) < MIGRANT_MIN_TURNS + 1) return false;
  const now = hasMigrantGoods(nationOf(state, nationId)) ? 1 : 0;
  return migrantsWanted(state, nationId) - now > 0;
}

/**
 * M13 T-15 (FR-485, FR-040): a migrant leaves the cans this turn's meal needs: the meal slots that the raw food in the
 * warehouse at meal time (after this turn's run and shipment, `projectTurn`) does not cover take a can each. Measured
 * before it: FR-260 seed 2, turn 18, the migrant took the one can and a worker fell sick.
 */
function migrantLeavesTheMeal(state: GameState, nationId: string): boolean {
  const atMeal = projectTurn(state, nationId).next;
  const needs = mealNeeds(mouthsOf(nationOf(state, nationId)));
  const short = (need: number, ...types: ResourceType[]) => Math.max(0, need - types.reduce((n, t) => n + (atMeal[t] ?? 0), 0));
  const cans = short(needs.grain, ResourceType.Grain) + short(needs.fruit, ResourceType.Fruit) + short(needs.meat, ResourceType.Livestock, ResourceType.Fish);
  return (atMeal[MaterialType.CannedFood] ?? 0) - (MIGRANT_COST[MaterialType.CannedFood] ?? 0) >= cans;
}

const cappedRoom = (run: Run): number => BUILDING_ORDER.filter((b) => !BUILDINGS[b].unlimited).reduce((n, b) => n + (run.room[b] ?? 0), 0);

/**
 * FR-486: the capacity points this turn's run (`planRun`) leaves idle for want of labour: the room of the capped
 * buildings it would fill from its stock with unlimited labour, less what it fills with the labour it has.
 */
export const idleForWantOfLabour = (state: GameState, nationId: string): number =>
  cappedRoom(planRun(state, nationId)) - cappedRoom(planRun(state, nationId, Infinity));

/**
 * FR-485, FR-486: the migrant must leave the meal's cans and have at least MIGRANT_MIN_TURNS to work.
 * FR-485 replacement workers get their goods before this turn's offers.
 */
function planMigrant(state: GameState, nationId: string, propose: Propose): void {
  if (turnsAfter(state) >= MIGRANT_MIN_TURNS && migrantLeavesTheMeal(state, nationId)) propose({ kind: "recruitWorkers", nationId, delta: 1 });
}

/** FR-486: a worker to staff idle mills gets only goods surplus to this turn's partners, including a new consulate. */
function planOptionalMigrant(beforeTrade: GameState, afterTrade: GameState, nationId: string, propose: Propose): void {
  if (beforeTrade.provinces.length === 0 || marketModeOf(beforeTrade) !== "partners" || turnsAfter(beforeTrade) < MIGRANT_MIN_TURNS) return;
  const nation = nationOf(beforeTrade, nationId);
  if (nation.industry.recruits > 0 || idleForWantOfLabour(beforeTrade, nationId) < MIGRANT_IDLE_CAPACITY) return;
  const stock = nation.warehouse as Stock;
  const demand = partnerDemand(afterTrade, nationId);
  const spare = Object.entries(MIGRANT_COST).every(([c, each]) => (stock[c] ?? 0) - (demand[c as TradeCommodity] ?? 0) >= (each ?? 0));
  if (spare) planMigrant(afterTrade, nationId, propose);
}

// --- world market (FR-128) ------------------------------------------------------------------

/**
 * The stock that this turn's production leaves untouched now (`leftNow`) and the warehouse once this
 * turn's shipment is in (`next`, what next turn starts with before trade), from a run of the
 * production and transport phases on the plan; nothing is kept.
 */
function projectTurn(state: GameState, nationId: string): { leftNow: Stock; next: Stock } {
  const made: Stock = {};
  const ctx = createTurnContext({
    turn: state.turn,
    emit: (e) => {
      if (e.type === "goods-produced" && e.nationId === nationId) made[e.output] = (made[e.output] ?? 0) + e.amount;
    },
  });
  const produced = productionSystem(state, ctx);
  const after = nationOf(produced, nationId).warehouse as Stock;
  const leftNow = Object.fromEntries(Object.entries(after).map(([key, n]) => [key, n - (made[key] ?? 0)]));
  const connected = transportConnectivitySystem(produced, ctx);
  const nation = nationOf(connected, nationId);
  const { shipments } = projectedFreightPlan(connected, nationId, carsOf(connected, nationId));
  return { leftNow, next: updateNationStateWithTransportedResources(nation, shipments).warehouse };
}

/**
 * What next turn's run may use, kept from the holds: all lumber and steel (pairs) and paper
 * (training), a meal of canned food, and one full run of the mills (coal and iron only as far as
 * they pair with each other). Goods are all sold, except under an army threat the garrison's 2
 * armaments (FR-213). On the last turn nothing is kept: stock is not scored.
 */
function nextUseOf(state: GameState, nationId: string, next: Stock): Stock {
  if (turnsAfter(state) === 0) return {};
  const nation = nationOf(state, nationId);
  const steelCap = capacityOf(nation, "steelMill");
  const fibreUse = 2 * capacityOf(nation, "textileMill");
  const ore = (other: ResourceType) => Math.min(steelCap, next[other] ?? 0);
  return {
    [GoodsType.Armaments]: garrisonTarget(state, nationId),
    [MaterialType.Lumber]: Infinity,
    [MaterialType.Steel]: Infinity,
    [MaterialType.Paper]: Infinity,
    [MaterialType.CannedFood]: mouthsOf(nation),
    [MaterialType.Fabric]: 2 * capacityOf(nation, "clothingFactory"),
    [ResourceType.Coal]: ore(ResourceType.IronOre),
    [ResourceType.IronOre]: ore(ResourceType.Coal),
    [ResourceType.Timber]: 2 * capacityOf(nation, "lumberMill"),
    [ResourceType.Cotton]: fibreUse,
    [ResourceType.Wool]: fibreUse,
  };
}

/** The goods the minors buy (FR-184); in "partners" the scripted player offers only these (FR-245 (c)). */
const MINOR_GOODS: readonly TradeCommodity[] = [GoodsType.Clothing, GoodsType.Furniture, GoodsType.Hardware];

/**
 * FR-245 (b): the raw inputs next turn's run lacks, each up to one turn of its mill at capacity: timber for the
 * lumber mill, coal and iron ore for the steel mill (the inputs of a lumber + steel pair, worth buying while
 * 2 timber + 1 coal + 1 iron ore cost less than PAIR_VALUE), and cotton for the textile mill (wool counts as
 * cotton; while the 4 units of a clothing cost less than a clothing). Not in the last 2 turns: what arrives
 * next turn is made into steel and lumber the turn after.
 */
function rawWants(state: GameState, nationId: string, next: Stock): TradeAmounts {
  if (turnsAfter(state) < 2) return {};
  const nation = nationOf(state, nationId);
  const market = marketOf(state);
  const price = (c: TradeCommodity) => priceOf(market, c);
  const short = (need: number, have: number) => Math.max(0, need - have);
  const wants: TradeAmounts = {};
  if (2 * price(ResourceType.Timber) + price(ResourceType.Coal) + price(ResourceType.IronOre) < PAIR_VALUE) {
    const steelCap = capacityOf(nation, "steelMill");
    wants[ResourceType.Timber] = short(2 * capacityOf(nation, "lumberMill"), next[ResourceType.Timber] ?? 0);
    wants[ResourceType.Coal] = short(steelCap, next[ResourceType.Coal] ?? 0);
    wants[ResourceType.IronOre] = short(steelCap, next[ResourceType.IronOre] ?? 0);
  }
  const fabric = RECIPES[MaterialType.Fabric].inputs[0].amount * RECIPES[GoodsType.Clothing].inputs[0].amount;
  if (fabric * price(ResourceType.Cotton) < price(GoodsType.Clothing)) {
    wants[ResourceType.Cotton] = short(2 * capacityOf(nation, "textileMill"), (next[ResourceType.Cotton] ?? 0) + (next[ResourceType.Wool] ?? 0));
  }
  return Object.fromEntries(Object.entries(wants).filter(([, n]) => (n ?? 0) > 0));
}

/**
 * The 4 cargo holds (FR-063, FR-128) each turn: (1) offer the units that pay more a hold than half
 * a bought pair gains, best world price first (ties in market order); (2) bid for the lumber or
 * steel that pairs with stock, then for whole pairs, while lumber + steel cost less than PAIR_VALUE
 * and the bids leave the reserve (`cashReserve`, FR-454; not on the last turn); (3) offer the rest, best price first.
 * Offers stop at what this turn's run leaves and next turn's run keeps.
 *
 * In a "partners" market (FR-245; scriptedPartners.ts) nobody sells lumber or steel: a consulate first, only
 * with a minor whose offer or demand it will use; step (2) bids for the raw inputs of its mills instead
 * (`rawWants`), each bid capped at what the minors it may trade with offer; offers are goods only, each capped
 * at what those minors want. In "world" nothing changes. M13: the grants (`planInfluence`, FR-490) come right after
 * the consulate, and in "partners" the trade with another Great Power (`greatPowerTradeCaps`, FR-493) raises those caps
 * and adds its bids after the mills' inputs; from turn 7 a standing bid of 1 steel toward a Great Power a person plays
 * goes before them (FR-539).
 */
function planTrade(view: () => GameState, nationId: string, propose: Propose): void {
  const partners = marketModeOf(view()) === "partners";
  const start = view();
  const { leftNow, next } = projectTurn(start, nationId);
  const keep = nextUseOf(start, nationId, next);
  const sellable = (commodity: TradeCommodity) =>
    Math.floor(Math.min(leftNow[commodity] ?? 0, (next[commodity] ?? 0) - (keep[commodity] ?? 0)));
  const raw = partners ? rawWants(start, nationId, next) : {};
  if (partners) {
    const sell = Object.fromEntries(MINOR_GOODS.map((c) => [c, Math.max(0, sellable(c))]).filter(([, n]) => (n as number) > 0));
    planConsulate(view, nationId, cashReserve(start, nationId), { buy: raw, sell }, propose);
  }
  // FR-490, FR-542 (M13): the embassy, the pact and the grants before a Council meeting (scriptedInfluence.ts)
  planInfluence(view, nationId, cashReserve(start, nationId), propose);
  const supply = partners ? partnerSupply(view(), nationId) : undefined;
  const demand = partners ? partnerDemand(view(), nationId) : undefined;
  // FR-493 (M13): trade with another Great Power, on top of the minors' supply and demand (scriptedGreatPowerTrade.ts)
  const shipLumber = saveShipMaterials(view(), nationId) ? SHIPS.indiaman.lumber : 0;
  const rival = partners ? greatPowerTradeCaps(view(), nationId, next, shipLumber) : undefined;
  const market = marketOf(start);
  const ranked = [...TRADE_COMMODITIES].sort((a, b) => priceOf(market, b) - priceOf(market, a));
  const pairPrice = priceOf(market, MaterialType.Lumber) + priceOf(market, MaterialType.Steel);
  const buying = turnsAfter(start) > 0 && pairPrice < PAIR_VALUE;
  const buyGainPerHold = buying ? (PAIR_VALUE - pairPrice) / 2 / SCORE_WEIGHTS.dollarsPerPoint : 0;

  const offer = (aboveGain: number) => {
    for (const commodity of ranked) {
      if (priceOf(market, commodity) / SCORE_WEIGHTS.dollarsPerPoint <= aboveGain) return;
      const free = tradeCapacityOf(view(), nationId).free;
      if (free <= 0) return;
      const offered = tradeOrdersOf(view(), nationId).sell[commodity] ?? 0;
      const wanted = demand ? (demand[commodity] ?? 0) + (rival?.sell[commodity] ?? 0) : Infinity;
      const more = Math.min(free, Math.min(sellable(commodity), wanted) - offered);
      for (let n = more; n > 0; n--) if (propose({ kind: "sellCommodity", nationId, commodity, amount: offered + n })) break;
    }
  };
  const bid = (commodity: TradeCommodity, units: number, floor = cashReserve(start, nationId)): number => {
    const current = tradeOrdersOf(view(), nationId).buy[commodity] ?? 0;
    const cash = nationOf(view(), nationId).treasury - floor;
    const offered = supply ? (supply[commodity] ?? 0) + (rival?.buy[commodity] ?? 0) - current : Infinity;
    const most = Math.min(units, tradeCapacityOf(view(), nationId).free, Math.floor(cash / priceOf(market, commodity)), offered);
    for (let n = most; n > 0; n--) if (propose({ kind: "buyCommodity", nationId, commodity, amount: current + n })) return n;
    return 0;
  };

  offer(buyGainPerHold);
  if (partners) {
    // FR-493 (a): a bid toward another Great Power that offered the commodity last turn goes before the mills' inputs
    const rivalBids = Object.entries(rival?.buy ?? {}) as [TradeCommodity, number][];
    // A single hold can complete a pair: bid for the material scarcer in next turn's warehouse first.
    rivalBids.sort(([a], [b]) => (next[a] ?? 0) - (next[b] ?? 0));
    for (const [commodity, units] of rivalBids) if (rival?.offeredLastTurn.includes(commodity)) bid(commodity, units);
    // FR-539: the standing steel bid toward a person, before the mills' inputs, so they cannot fill the 4 holds first (QA
    // check 4 saw them full; placed after them it also met FR-539's sim rows, so this is for robustness). Its
    // floor is the upkeep reserve, not cashReserve: unanswered, it is refunded in this turn's trade phase, and during the
    // campaign on a minor the treasury stays below cashReserve (measured: the Steel row on 6 of turns 3 to 20, required 9).
    for (const [commodity, units] of Object.entries(rival?.standing ?? {}) as [TradeCommodity, number][]) {
      const current = tradeOrdersOf(view(), nationId).buy[commodity] ?? 0;
      if (units > current) bid(commodity, units - current, upkeepReserve(start, nationId));
    }
    // Use one of the mills' wanted units for Council support first. Its price, reserve,
    // remaining turns and quantity are subject to the same limits as every raw bid.
    const supported = councilTradeInputs(view(), nationId, next).find(input => (raw[input] ?? 0) > 0 && bid(input, 1) > 0);
    for (const [commodity, units] of Object.entries(raw) as [TradeCommodity, number][]) {
      bid(commodity, commodity === supported ? units - 1 : units);
    }
    for (const [commodity, units] of rivalBids) if (!rival?.offeredLastTurn.includes(commodity)) bid(commodity, units);
  } else if (buying) {
    const lumber = next[MaterialType.Lumber] ?? 0;
    const steel = next[MaterialType.Steel] ?? 0;
    if (lumber > steel) bid(MaterialType.Steel, lumber - steel);
    else if (steel > lumber) bid(MaterialType.Lumber, steel - lumber);
    for (let guard = 0; guard < 16; guard++) {
      if (tradeCapacityOf(view(), nationId).free < 2) break;
      if (nationOf(view(), nationId).treasury - cashReserve(start, nationId) < pairPrice) break;
      if (bid(MaterialType.Lumber, 1) === 0 || bid(MaterialType.Steel, 1) === 0) break;
    }
  }
  offer(-Infinity);
}
