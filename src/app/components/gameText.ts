// Display text for engine data: refused orders and turn events (FR-024).
import type { GameEvent, Order, OrderKind, RejectReason } from "@/engine";

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
  changeTransportCapacity: "Transport capacity",
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
  "insufficient-resources": "not enough coal or iron ore",
  "invalid-amount": "invalid amount",
};

export function refusalText({ order, reason }: { order: Order; reason: RejectReason }): string {
  return `${ORDER_TEXT[order.kind]} refused: ${REFUSAL_TEXT[reason]}.`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
    case "turn-ended":
      return null;
  }
}
