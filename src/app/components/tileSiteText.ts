// What a civilian's job costs, how long it takes and why the engine would refuse it (FR-381, FR-382, FR-383): one
// wording for Tile Info, Construction Options, the map's status line and the spend question; and who collects a tile
// (FR-391). Whether a job can start is the engine's validateOrder; this file only words its reason with the tile's facts.
// It reads state, never builds it.
import { collectingHub, validateOrder, type Order, type RejectReason } from "@/engine";
import {
  DEVELOPMENT_WORKER_TYPES,
  TECH,
  findWorker,
  hasTechnology,
  isLand,
  nextResourceLevel,
  railTerrainAllowed,
  tileById,
} from "@/engine/orders/queries";
import { ResourceDevelopmentTable } from "@/definisions/ResourceDevelopment";
import { DEVELOPMENT_COST, PROSPECT_COST, constructionCost } from "@/definisions/workPrices";
import { EngineerBuildDurationsTurns, ProspectorDiscoveryDurationTurns, WorkerLevelDurationsTurns } from "@/definisions/workerDurations";
import { PROSPECTABLE_TERRAIN_TYPES } from "@/definisions/terrainDefinitions";
import type { GameState } from "@/types/GameState";
import { TerrainType, type Tile } from "@/types/Tile";
import { WorkerStatus, WorkerType, type Worker } from "@/types/Workers";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import { REFUSAL_TEXT, TERRAIN_TEXT, commodityName, money } from "./gameText";

/** A job's price, paid when it is ordered, and the turns it takes. */
export interface JobCost {
  price: number;
  turns: number;
}

/** An order that starts a civilian's job: on its own tile, or on the tile it moves to. */
type JobOrder = Extract<
  Order,
  {
    kind:
      | "startProspecting"
      | "moveAndStartProspecting"
      | "startDevelopment"
      | "moveAndStartDevelopment"
      | "startConstruction"
      | "moveAndStartConstruction"
      | "moveAndBuildRail";
  }
>;

const JOB_KINDS: ReadonlySet<Order["kind"]> = new Set([
  "startProspecting",
  "moveAndStartProspecting",
  "startDevelopment",
  "moveAndStartDevelopment",
  "startConstruction",
  "moveAndStartConstruction",
  "moveAndBuildRail",
]);
const isJobOrder = (order: Order): order is JobOrder => JOB_KINDS.has(order.kind);

/** The civilian a job order is for and the tile its job would be on. */
function jobSite(state: GameState, order: JobOrder): { worker: Worker; tile: Tile } | undefined {
  const worker = findWorker(state, order.workerId)?.worker;
  const tile = tileById(state, "tileId" in order ? order.tileId : order.toTileId);
  return worker && tile ? { worker, tile } : undefined;
}

/** The structure a job order builds, if it builds one. */
function structureOf(order: JobOrder): ConstructionKind | undefined {
  if (order.kind === "moveAndBuildRail") return "rail";
  return order.kind === "startConstruction" || order.kind === "moveAndStartConstruction" ? order.structure : undefined;
}

/** What a job order would cost and how many turns it takes (workPrices.ts, workerDurations.ts); undefined for no job. */
export function jobCost(state: GameState, order: Order): JobCost | undefined {
  if (!isJobOrder(order)) return undefined;
  const site = jobSite(state, order);
  if (!site) return undefined;
  const structure = structureOf(order);
  if (structure) return { price: constructionCost(structure, site.tile.terrain), turns: EngineerBuildDurationsTurns[structure] || 1 };
  if (order.kind === "startProspecting" || order.kind === "moveAndStartProspecting") {
    return { price: PROSPECT_COST, turns: ProspectorDiscoveryDurationTurns };
  }
  const level = nextResourceLevel(site.tile);
  if (level > 3) return undefined;
  const next = level as 1 | 2 | 3;
  // The engine's own fallback: a type without a duration table takes one turn (apply.ts)
  return { price: DEVELOPMENT_COST[next], turns: WorkerLevelDurationsTurns[site.worker.type]?.[next] || 1 };
}

/** "$5,000, 3 turns"; a one-turn job shows its price alone ("$100"). */
export const costText = ({ price, turns }: JobCost): string => (turns > 1 ? `${money(price)}, ${turns} turns` : money(price));

const lower = (terrain: TerrainType): string => (TERRAIN_TEXT[terrain] ?? terrain).toLowerCase();
const sentence = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
const article = (word: string): string => (/^[aeiou]/i.test(word) ? "An" : "A");
const HILLS: readonly TerrainType[] = [TerrainType.BarrenHills, TerrainType.FertileHills];

/** "barren hills, mountains, swamp, desert and tundra" */
function listOf(items: readonly string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The technology rail on `terrain` needs (queries.ts railTerrainAllowed). */
function railTechnology(terrain: TerrainType): string | undefined {
  if (HILLS.includes(terrain)) return "the Compound Steam Engine";
  if (terrain === TerrainType.Swamp) return "the Iron Railroad Bridge";
  if (terrain === TerrainType.Mountains) return "Dynamite";
  return undefined;
}

function railSiteText(state: GameState, tile: Tile): string {
  if (tile.terrain === TerrainType.Capital) return "The capital is where your rail network starts.";
  if (tile.connected) return "This tile already has rail.";
  const technology = railTechnology(tile.terrain);
  if (technology && !railTerrainAllowed(state, tile)) return `Rail on ${lower(tile.terrain)} needs ${technology}.`;
  return "Rail must join your network: build it next to your rail, a depot, a port or the capital.";
}

/** Why `structure` cannot stand on `tile` (queries.ts isDepotSite, isPortSite, isFortSite, isRailSite). */
function constructionSiteText(state: GameState, tile: Tile, structure: ConstructionKind): string {
  const capital = tile.terrain === TerrainType.Capital;
  switch (structure) {
    case "depot":
      if (tile.depot) return "This tile already has a depot.";
      if (capital) return "The capital already gathers goods like a depot.";
      if (HILLS.includes(tile.terrain) && !hasTechnology(state, TECH.compoundSteamEngine)) {
        return "A depot on hills needs the Compound Steam Engine.";
      }
      return "Too close to the capital or another depot.";
    case "port":
      if (tile.port) return "This tile already has a port.";
      if (capital) return "The capital is already a port.";
      if (HILLS.includes(tile.terrain) || tile.terrain === TerrainType.Mountains) return `A port cannot stand on ${lower(tile.terrain)}.`;
      return "A port needs the sea or a river next to it.";
    case "fort":
      return "This tile already has a fort.";
    case "rail":
      return railSiteText(state, tile);
  }
}

/** The reason a job order is refused, worded from the tile's facts; undefined where the engine's reason says it all. */
function siteReason(state: GameState, order: JobOrder, reason: RejectReason): string | undefined {
  const site = jobSite(state, order);
  if (!site) return undefined;
  const { worker, tile } = site;
  const structure = structureOf(order);
  const prospecting = order.kind === "startProspecting" || order.kind === "moveAndStartProspecting";
  if (reason === "invalid-site") {
    if (structure) return constructionSiteText(state, tile, structure);
    if (prospecting) return `Prospectors search only ${listOf(PROSPECTABLE_TERRAIN_TYPES.map(lower))}.`;
    return `${article(worker.type)} ${worker.type} cannot work ${lower(tile.terrain)}.`;
  }
  if (reason === "invalid-target") {
    // The civilian is not on this tile, or the target is the sea: the engine's own words
    if (!isLand(tile)) return undefined;
    if (!("toTileId" in order) && findWorker(state, order.workerId)?.tile.id !== tile.id) return undefined;
    if (prospecting) {
      if (!tile.resource) return "Nothing here for a prospector to find.";
      return tile.resource.discovered ? "Already prospected." : undefined;
    }
    if (DEVELOPMENT_WORKER_TYPES.includes(worker.type) && !structure) {
      if (!tile.resource) return "Nothing here to develop.";
      if (tile.resource.discovered === false) return "No resource found here yet: a prospector must find it first.";
      if (nextResourceLevel(tile) > 3) return "Already at level 3.";
    }
  }
  return undefined;
}

/**
 * The line under a refused job offer (FR-381): "A farmer cannot work barren hills.", "A port needs the sea or a river next
 * to it.", "Too close to the capital or another depot.", "This tile already has a fort.", "Not enough money (needs
 * $5,000)."; for a reason with nothing to add, the engine's refusal as a sentence ("The worker already moved this turn.").
 */
export function offerRefusalText(state: GameState, order: Order, reason: RejectReason): string {
  if (reason === "insufficient-funds") {
    const cost = jobCost(state, order);
    return cost ? `Not enough money (needs ${money(cost.price)}).` : sentence(REFUSAL_TEXT[reason]);
  }
  if (reason === "tile-has-job") return "Another civilian is already working this tile.";
  return (isJobOrder(order) ? siteReason(state, order, reason) : undefined) ?? sentence(REFUSAL_TEXT[reason]);
}

/**
 * What the map's status line adds to a refusal (FR-373 with FR-381): the site reason where the tile's facts say more than
 * the engine's reason ("A farmer cannot work barren hills."); undefined otherwise.
 */
export function refusalDetail(state: GameState, order: Order, reason: RejectReason): string | undefined {
  return isJobOrder(order) ? siteReason(state, order, reason) : undefined;
}

/** One job a civilian on its own tile is offered in Tile Info (FR-381): its button's name, its order, price and refusal. */
export interface JobOffer {
  name: string;
  order: Order;
  cost?: JobCost;
  /** Why the engine would refuse it; undefined when it would accept. */
  refusal?: string;
}

const STRUCTURES: readonly ConstructionKind[] = ["depot", "port", "fort", "rail"];
const capitalized = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/**
 * The jobs Tile Info offers `worker` on the tile it stands on, by its type, each checked by the engine's validateOrder:
 * Prospect; Develop <type> L<next level> (none past level 3: see `jobNote`); the engineer's Construct Depot, Port, Fort
 * and Rail. The names stay as before (FR-381).
 */
export function jobOffers(state: GameState, nationId: string, worker: Worker, tile: Tile): JobOffer[] {
  const base = { nationId, workerId: worker.id, tileId: tile.id };
  const offers: { name: string; order: Order }[] = [];
  if (worker.type === WorkerType.Prospector) offers.push({ name: "Prospect", order: { kind: "startProspecting", ...base } });
  if (DEVELOPMENT_WORKER_TYPES.includes(worker.type) && nextResourceLevel(tile) <= 3) {
    offers.push({ name: `Develop ${worker.type} L${nextResourceLevel(tile)}`, order: { kind: "startDevelopment", ...base } });
  }
  if (worker.type === WorkerType.Engineer) {
    for (const structure of STRUCTURES) {
      offers.push({ name: `Construct ${capitalized(structure)}`, order: { kind: "startConstruction", ...base, structure } });
    }
  }
  return offers.map(({ name, order }) => {
    const result = validateOrder(state, order);
    return { name, order, cost: jobCost(state, order), refusal: result.ok ? undefined : offerRefusalText(state, order, result.reason) };
  });
}

/** A line in place of an offer that no longer exists: a development worker on a resource at level 3. */
export function jobNote(worker: Worker, tile: Tile): string | undefined {
  return DEVELOPMENT_WORKER_TYPES.includes(worker.type) && nextResourceLevel(tile) > 3 ? "Already at level 3." : undefined;
}

/** From this price on an order asks first (FR-383, card Q82). */
export const ASK_BEFORE_SPENDING = 1000;

/** The question asked before a costly order (FR-383) and the price its Spend button names. */
export interface SpendQuestion {
  question: string;
  price: number;
}

/**
 * The question before an order of $1,000 or more (FR-383): "Develop forester to level 3 at 6-4 for $5,000 (3 turns)?
 * Cancelled this turn, the money comes back; later, it is lost."; undefined for a cheaper order or one that is no job.
 */
export function spendQuestion(state: GameState, order: Order): SpendQuestion | undefined {
  if (!isJobOrder(order)) return undefined;
  const cost = jobCost(state, order);
  const site = jobSite(state, order);
  if (!cost || !site || cost.price < ASK_BEFORE_SPENDING) return undefined;
  const structure = structureOf(order);
  const job = structure
    ? `Build a ${structure === "rail" ? "rail section" : structure}`
    : order.kind === "startProspecting" || order.kind === "moveAndStartProspecting"
      ? "Prospect"
      : `Develop ${site.worker.type} to level ${nextResourceLevel(site.tile)}`;
  const turns = `${cost.turns} turn${cost.turns === 1 ? "" : "s"}`;
  return {
    price: cost.price,
    question: `${job} at ${site.tile.id} for ${money(cost.price)} (${turns})? Cancelled this turn, the money comes back; later, it is lost.`,
  };
}

/** The question Tile Info's Cancel asks (FR-386, FR-387): its title, what follows, its two answers and what Yes sends. */
export interface CancelQuestion {
  title: string;
  consequence: string;
  confirm: string;
  keep: string;
  /** One `cancelWorkerAction`, or two for a move and a job ordered by one click this turn: the job's, then the move's. */
  orders: Order[];
}

/** What the civilian's job cost when it was ordered, and the turn it was ordered on; undefined without a job of its own. */
function heldJob(tile: Tile, workerId: string): { paid: number; startedOnTurn: number } | undefined {
  if (tile.prospecting?.workerId === workerId) return { paid: PROSPECT_COST, startedOnTurn: tile.prospecting.startedOnTurn };
  const development = tile.developmentJob;
  if (development?.workerId === workerId) {
    return { paid: DEVELOPMENT_COST[development.targetLevel], startedOnTurn: development.startedOnTurn };
  }
  const construction = tile.constructionJob;
  if (construction?.workerId === workerId) {
    return { paid: constructionCost(construction.kind, tile.terrain), startedOnTurn: construction.startedOnTurn };
  }
  return undefined;
}

/**
 * The question before Tile Info's Cancel (FR-386), worded as the engine settles it (apply.ts `cancel`, refundThisTurn):
 * a job ordered this turn, "Cancel the farmer's job? The $1,000 comes back."; one ordered earlier, "Stop the farmer's
 * job? The $1,000 paid is lost."; a move this turn, "Cancel the farmer's move? It goes back to 2-9.". A civilian that
 * moved and started its job with one click this turn goes back too, by a second cancel (FR-387): "... The farmer goes
 * back to 2-9.". Undefined when there is nothing to cancel.
 */
export function cancelQuestion(state: GameState, nationId: string, worker: Worker, tile: Tile): CancelQuestion | undefined {
  const cancel: Order = { kind: "cancelWorkerAction", nationId, workerId: worker.id, tileId: tile.id };
  const movedFrom = worker.justMoved && worker.previousTileId ? worker.previousTileId : undefined;
  const job = heldJob(tile, worker.id);
  if (job && job.startedOnTurn === state.turn) {
    return {
      title: `Cancel the ${worker.type}'s job?`,
      consequence: `The ${money(job.paid)} comes back.${movedFrom ? ` The ${worker.type} goes back to ${movedFrom}.` : ""}`,
      confirm: "Cancel the job",
      keep: "Keep working",
      orders: movedFrom ? [cancel, cancel] : [cancel],
    };
  }
  if (job) {
    return { title: `Stop the ${worker.type}'s job?`, consequence: `The ${money(job.paid)} paid is lost.`, confirm: "Stop the job", keep: "Keep working", orders: [cancel] };
  }
  if (worker.previousTileId && worker.status === WorkerStatus.Moved) {
    return { title: `Cancel the ${worker.type}'s move?`, consequence: `It goes back to ${worker.previousTileId}.`, confirm: "Cancel the move", keep: "Stay here", orders: [cancel] };
  }
  return undefined;
}

/**
 * Who collects the tile's resource for the warehouse (FR-391), by the logistics phase's own rule (`collectingHub`): "Collected
 * by the capital: 2 grain a turn", "Collected by the depot at 7-8: 1 grain a turn" (or the port), with the units the
 * development table gives at the tile's level ("no coal until it is developed" at 0); "Not collected: no connected depot,
 * port or capital next to it". Undefined on another country's tile and on a tile with no known resource.
 */
export function collectionText(state: GameState, nationId: string, tile: Tile): string | undefined {
  const resource = tile.resource;
  if (tile.ownerNationId !== nationId || !resource || resource.discovered === false) return undefined;
  const hub = collectingHub(state, nationId, tile.id);
  if (!hub) return "Not collected: no connected depot, port or capital next to it";
  const by = hub.kind === "capital" ? "the capital" : `the ${hub.kind} at ${hub.tileId}`;
  const units = ResourceDevelopmentTable[resource.type]?.[resource.level] ?? 0;
  const goods = commodityName(resource.type).toLowerCase();
  return `Collected by ${by}: ${units > 0 ? `${units} ${goods} a turn` : `no ${goods} until it is developed`}`;
}
