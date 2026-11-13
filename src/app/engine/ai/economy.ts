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
import type { BuildingType, ProductionOutput } from "@/types/Industry";
import type { TradeAmounts, TradeCommodity } from "@/types/Market";
import { GoodsType, MaterialType, ResourceType } from "@/types/Resource";
import type { Order } from "../orders/Order";
import { nationById } from "../orders/queries";
import { BUILDING_ORDER, BUILDINGS, nextCapacity } from "@/definisions/industryBuildings";
import { FREIGHT_CAR_COST, RECIPES, TRAINING_COST } from "@/definisions/ResourceConversions";
import { TRADE_COMMODITIES } from "@/definisions/marketPrices";
import { SCORE_WEIGHTS } from "@/definisions/scoreWeights";
import { CONSTRUCTION_COST, DEVELOPMENT_COST } from "@/definisions/workPrices";
import { buildingOf } from "../industry/industryState";
import { healthyWorkers, labourTotal } from "../industry/labour";
import { marketOf, priceOf, tradeCapacityOf, tradeOrdersOf } from "../market/market";
import { marketModeOf } from "../market/partners";
import { partnerDemand, partnerSupply, planConsulate } from "./scriptedPartners";
import { mealNeeds } from "../systems/foodSystem";
import { productionSystem } from "../systems/productionSystem";
import { computeLogisticsTransport, logisticsSystem } from "../systems/logisticsSystem";
import { transportConnectivitySystem } from "../systems/transportConnectivitySystem";
import { createTurnContext } from "../turn/context";
import { turnLimitOf } from "../turn/gameOver";
import { SCRIPTED_GARRISON } from "@/definisions/regiments";
import { armsWanted, planGarrison } from "./scriptedArmy";

export type Propose = (order: Order) => boolean;
type Stock = Record<string, number>;

/** Turns still to be resolved after this one (0 on the last turn). */
export const turnsAfter = (state: GameState): number => Math.max(0, turnLimitOf(state) - state.turn);

/**
 * Cash kept for the civilians (FR-128, FR-129): bids never take the treasury below it, and below it
 * the run makes goods for sale before pairs. One depot and five level-1 jobs, what the civilians
 * spend in a few turns. Measured: $1,500 and $4,000 both scored lower at turn 40 (journal, M4.2).
 */
export const CASH_RESERVE = CONSTRUCTION_COST.depot + 5 * DEVELOPMENT_COST[1];

/** Untrained to trained gives 1 more labour a turn from next turn on; trained to expert 2 more (FR-130). */
export const TRAIN_MIN_TURNS = 3;
export const EXPERT_MIN_TURNS = 8;

/** A freight car costs a lumber + steel pair (one capacity point) and 2 labour: none in the last turns (FR-127). */
export const CAR_MIN_TURNS = 8;

/** A lumber + steel pair expands one capacity point: worth buying while both cost less than its points (FR-128). */
export const PAIR_VALUE = SCORE_WEIGHTS.pointsPerCapacity * SCORE_WEIGHTS.dollarsPerPoint;

const nationOf = (state: GameState, nationId: string): Nation => nationById(state, nationId)!;
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
  planFreightCars(view, nationId, propose);
  planExpansion(view, nationId, propose);
  proposeRun(view, nationId, propose);
  planTrade(view, nationId, propose);
}

// --- transport (FR-127) ---------------------------------------------------------------------

/** What the tiles deliver to the capital and the active depots this turn, by resource. */
const gatheredOf = (state: GameState, nationId: string): Stock =>
  computeLogisticsTransport(state.map, nationId, state.transportNetwork.railroadNetworks?.[nationId]);

/**
 * Units worth shipping this turn, in priority order: the meal's raw food that the warehouse lacks
 * (keeping one meal in stock), plus one canned-food batch's while the cans are fewer than the
 * workers; the steel mill's coal and iron (the scarcer in stock first), the lumber mill's timber,
 * the textile mill's cotton and wool, each up to two turns of its mill at full capacity. The
 * logistics phase fills any cars left from the other resources.
 */
export function shippingWants(state: GameState, nationId: string): [string, number][] {
  const nation = nationOf(state, nationId);
  const stock = nation.warehouse as Stock;
  const gathered = gatheredOf(state, nationId);
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
  ];
}

function planTransport(state: GameState, nationId: string, propose: Propose): void {
  propose({ kind: "setTransportAllocations", nationId, allocations: Object.fromEntries(shippingWants(state, nationId)) });
}

/** One freight car a turn while the cargo worth shipping is more than the cars carry (FR-127). */
function planFreightCars(view: () => GameState, nationId: string, propose: Propose): void {
  const state = view();
  if (turnsAfter(state) < CAR_MIN_TURNS) return;
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
 * Training (FR-130), only on a turn whose run would use all the labour (less than 2 left, so more
 * labour would be used): as many as the paper and cash allow, untrained first.
 */
function planTraining(view: () => GameState, nationId: string, propose: Propose): void {
  const left = turnsAfter(view());
  if (planRun(view(), nationId).labour >= 2) return;
  for (const from of ["untrained", "trained"] as const) {
    if (left < (from === "untrained" ? TRAIN_MIN_TURNS : EXPERT_MIN_TURNS)) continue;
    const nation = nationOf(view(), nationId);
    const cost = TRAINING_COST[from];
    const paper = (nation.warehouse as Stock)[MaterialType.Paper] ?? 0;
    const most = Math.min(healthyWorkers(nation.industry, from), Math.floor(paper / cost.paper), Math.floor(nation.treasury / cost.cash));
    for (let n = most; n > 0; n--) if (propose({ kind: "trainWorkers", nationId, from, delta: n })) break;
  }
}

/** The armaments the run makes first while arms are wanted (FR-213, FR-274): up to 2 in stock, within the metal works. */
const garrisonArmaments = (state: GameState, nationId: string): number => {
  if (!armsWanted(state, nationId)) return 0;
  const nation = nationOf(state, nationId);
  const short = SCRIPTED_GARRISON.armaments - ((nation.warehouse as Stock)[GoodsType.Armaments] ?? 0);
  return Math.max(0, Math.min(short, buildingOf(nation, "metalWorks").capacity));
};

/** The steel those armaments take (2 each). */
const garrisonSteel = (state: GameState, nationId: string): number =>
  garrisonArmaments(state, nationId) * RECIPES[GoodsType.Armaments].inputs[0].amount;

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
  const reserved = garrisonSteel(view(), nationId);
  for (let guard = 0; guard < 64; guard++) {
    const nation = nationOf(view(), nationId);
    const stock = nation.warehouse as Stock;
    const pairs = Math.min(stock[MaterialType.Lumber] ?? 0, (stock[MaterialType.Steel] ?? 0) - reserved);
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
    if (!steps.some(({ building }) => propose({ kind: "expandBuilding", nationId, building }))) return;
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

/** Paper next turn's training can use: one per untrained worker, two per trained one (when it still pays). */
function paperWanted(state: GameState, nation: Nation): number {
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
 * the cans are fewer than the workers; paper for next turn's training; then the pairs and the goods,
 * the goods first while the treasury is below CASH_RESERVE; last, canned food from raw food above a
 * meal. Pairs: lumber + steel, the scarcer one first, so the pairs stay even. Goods for the holds
 * from stock the pairs do not need: clothing, furniture from unpaired lumber, and fabric and spare
 * lumber for next turn's goods. On the last turn nothing is made: it would be neither used nor sold.
 */
export function planRun(state: GameState, nationId: string): Run {
  const nation = nationOf(state, nationId);
  const stock = { ...(nation.warehouse as Stock) };
  const room: Run["room"] = {};
  for (const building of BUILDING_ORDER) room[building] = buildingOf(nation, building).capacity;
  const cars = Math.max(0, Math.floor(nation.transportCapacityPendingIncrease ?? 0));
  const run: Run = { labour: labourTotal(nation.industry) - cars * FREIGHT_CAR_COST.labour, stock, room, made: {} };
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
  make(run, GoodsType.Armaments, garrisonArmaments(state, nationId));
  while (have(MaterialType.CannedFood) < mouths && aboveMeal() && make(run, MaterialType.CannedFood, 2) > 0);
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
  if (nation.treasury < CASH_RESERVE) {
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
  const shipped = logisticsSystem(transportConnectivitySystem(produced, ctx), ctx);
  return { leftNow, next: { ...(nationOf(shipped, nationId).warehouse as Stock) } };
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
    ...(armsWanted(state, nationId) ? { [GoodsType.Armaments]: SCRIPTED_GARRISON.armaments } : {}),
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
 * and the bids leave CASH_RESERVE (not on the last turn); (3) offer the rest, best price first.
 * Offers stop at what this turn's run leaves and next turn's run keeps.
 *
 * In a "partners" market (FR-245; scriptedPartners.ts) nobody sells lumber or steel: a consulate first, only
 * with a minor whose offer or demand it will use; step (2) bids for the raw inputs of its mills instead
 * (`rawWants`), each bid capped at what the minors it may trade with offer; offers are goods only, each capped
 * at what those minors want. In "world" nothing changes.
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
    planConsulate(view, nationId, CASH_RESERVE, { buy: raw, sell }, propose);
  }
  const supply = partners ? partnerSupply(view(), nationId) : undefined;
  const demand = partners ? partnerDemand(view(), nationId) : undefined;
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
      const wanted = demand ? (demand[commodity] ?? 0) : Infinity;
      const more = Math.min(free, Math.min(sellable(commodity), wanted) - offered);
      for (let n = more; n > 0; n--) if (propose({ kind: "sellCommodity", nationId, commodity, amount: offered + n })) break;
    }
  };
  const bid = (commodity: TradeCommodity, units: number): number => {
    const current = tradeOrdersOf(view(), nationId).buy[commodity] ?? 0;
    const cash = nationOf(view(), nationId).treasury - CASH_RESERVE;
    const offered = supply ? (supply[commodity] ?? 0) - current : Infinity;
    const most = Math.min(units, tradeCapacityOf(view(), nationId).free, Math.floor(cash / priceOf(market, commodity)), offered);
    for (let n = most; n > 0; n--) if (propose({ kind: "buyCommodity", nationId, commodity, amount: current + n })) return n;
    return 0;
  };

  offer(buyGainPerHold);
  if (partners) {
    for (const [commodity, units] of Object.entries(raw) as [TradeCommodity, number][]) bid(commodity, units);
  } else if (buying) {
    const lumber = next[MaterialType.Lumber] ?? 0;
    const steel = next[MaterialType.Steel] ?? 0;
    if (lumber > steel) bid(MaterialType.Steel, lumber - steel);
    else if (steel > lumber) bid(MaterialType.Lumber, steel - lumber);
    for (let guard = 0; guard < 16; guard++) {
      if (tradeCapacityOf(view(), nationId).free < 2) break;
      if (nationOf(view(), nationId).treasury - CASH_RESERVE < pairPrice) break;
      if (bid(MaterialType.Lumber, 1) === 0 || bid(MaterialType.Steel, 1) === 0) break;
    }
  }
  offer(-Infinity);
}
