// Display text for engine data: worker jobs, refused orders and turn events (FR-024).
import type { GameEvent, Order, OrderKind, RejectReason } from "@/engine";
import type { Tile } from "@/types/Tile";
import type { BuildingType } from "@/types/Industry";
import { WorkerStatus, WorkerType, type Worker } from "@/types/Workers";

const ORDER_TEXT: Record<OrderKind, string> = {
  moveWorker: "Move",
  moveAndBuildRail: "Build rail",
  startProspecting: "Prospect",
  startDevelopment: "Develop",
  startConstruction: "Build",
  moveAndStartProspecting: "Move and prospect",
  moveAndStartDevelopment: "Move and develop",
  moveAndStartConstruction: "Move and build",
  cancelWorkerAction: "Cancel",
  setTransportAllocations: "Transport plan",
  changeTransportCapacity: "Freight cars",
  setProduction: "Production",
  expandBuilding: "Expansion",
  trainWorkers: "Training",
  recruitWorkers: "Migration",
};

export const REFUSAL_TEXT: Record<RejectReason, string> = {
  "unknown-nation": "unknown nation",
  "unknown-worker": "that worker no longer exists",
  "not-owner": "that is not yours",
  "wrong-worker-type": "this worker cannot do that job",
  "worker-busy": "the worker is busy with a job",
  "worker-moved": "the worker already moved this turn",
  "invalid-target": "not possible on that tile",
  "tile-occupied": "another job is under way on that tile",
  "invalid-site": "that tile is not a valid site",
  "insufficient-funds": "not enough money",
  "insufficient-resources": "not enough goods in the warehouse",
  "insufficient-labour": "not enough free labour",
  "limit-reached": "over the limit",
  "invalid-amount": "invalid amount",
};

export function refusalText({ order, reason }: { order: Order; reason: RejectReason }): string {
  return `${ORDER_TEXT[order.kind]} refused: ${REFUSAL_TEXT[reason]}.`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const BUILDING_TEXT: Record<BuildingType, string> = {
  textileMill: "Textile mill",
  clothingFactory: "Clothing factory",
  lumberMill: "Lumber mill",
  furnitureFactory: "Furniture factory",
  steelMill: "Steel mill",
  metalWorks: "Metal works",
  refinery: "Refinery",
  foodProcessing: "Food processing",
};

/** News of a meal: only bad news is news. */
function foodNews(sick: number, starved: number): string | null {
  const parts: string[] = [];
  if (sick > 0) parts.push(`${sick} worker${sick === 1 ? "" : "s"} ate the wrong food and fell sick`);
  if (starved > 0) parts.push(`${starved} worker${starved === 1 ? "" : "s"} starved`);
  return parts.length > 0 ? `${capitalize(parts.join("; "))}.` : null;
}

/** One line of news for the event, or null when it is not news (the end of the turn). */
export function eventText(event: GameEvent): string | null {
  switch (event.type) {
    case "order-rejected":
      return refusalText(event);
    case "resource-discovered":
      return `Prospectors found ${event.resource ?? "nothing"} at ${event.tileId}.`;
    case "development-completed":
      return `Tile ${event.tileId} developed to level ${event.level}.`;
    case "construction-completed":
      return `${capitalize(event.structure)} finished at ${event.tileId}.`;
    case "goods-produced":
      return `Produced ${event.amount} ${event.output}.`;
    case "freight-cars-built":
      return `${event.count} freight car${event.count === 1 ? "" : "s"} built.`;
    case "building-expanded":
      return `${BUILDING_TEXT[event.building]} expanded to ${event.capacity}.`;
    case "workers-trained":
      return `${event.count} worker${event.count === 1 ? "" : "s"} trained to ${event.to}.`;
    case "workers-fed":
      return foodNews(event.sick, event.starved);
    case "workers-recruited":
      return `${event.count} migrant${event.count === 1 ? "" : "s"} joined the workforce.`;
    case "turn-ended":
      return null;
  }
}

/** Tiles whose development or construction finished in these events (the map's "done" mark). */
export function completedTileIds(events: readonly GameEvent[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const e of events) {
    if (e.type === "development-completed" || e.type === "construction-completed") ids.add(e.tileId);
  }
  return ids;
}

const DEVELOPMENT_JOB_PREFIX: Partial<Record<WorkerType, string>> = {
  [WorkerType.Farmer]: "Farming",
  [WorkerType.Rancher]: "Ranching",
  [WorkerType.Forester]: "Forestry",
  [WorkerType.Miner]: "Mining",
  [WorkerType.Driller]: "Drilling",
  [WorkerType.Developer]: "Developing",
};

/**
 * What the worker is doing, read from the job it holds on its tile ("Farming to level 2",
 * "Constructing depot", "Prospecting"), "Moved" for a worker that moved this turn, or nothing.
 */
export function workerJobLabel(tile: Tile, worker: Worker): string | undefined {
  if (worker.status === WorkerStatus.Moved) return "Moved";
  if (worker.status !== WorkerStatus.Working) return undefined;
  if (tile.prospecting?.workerId === worker.id) return "Prospecting";
  const development = tile.developmentJob;
  if (development && development.workerId === worker.id) {
    return `${DEVELOPMENT_JOB_PREFIX[development.workerType] ?? "Developing"} to level ${development.targetLevel}`;
  }
  const construction = tile.constructionJob;
  if (construction && construction.workerId === worker.id) {
    return `Constructing ${construction.kind}`;
  }
  return undefined;
}
