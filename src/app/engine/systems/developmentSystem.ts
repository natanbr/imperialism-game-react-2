import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { Tile, TerrainType, Resource } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import { ProspectorDiscoveryDurationTurns } from "@/definisions/workerDurations";
import { DRILLING_TERRAINS } from "@/definisions/terrainDefinitions";
import { MINERAL_RESOURCES } from "@/definisions/resourceDefinitions";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import type { Rng } from "../rng";
import type { TurnContext } from "../turn/context";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import { addRailroad, addDepot, addPort, initializeRailroadNetworks } from "./railroadSystem";
import { provinceById, startOwnerOf } from "../world/provinces";

const coordsOf = (tileId: string) => {
  const [x, y] = parseTileIdToArray(tileId);
  return { x, y };
};

interface FinishedConstruction {
  nationId: string;
  x: number;
  y: number;
  kind: ConstructionKind;
  /** Rail: the tile the section was built from (FR-136). */
  railFrom?: string;
}

/**
 * Resolves prospecting, development and construction jobs. A finished job leaves its tile in the
 * same resolution (FR-032); finished rail, depots and ports join the nation's rail network, a rail
 * section linked to the tile it was built from only (FR-136).
 */
export const developmentSystem = (state: GameState, ctx: TurnContext): GameState => {
  let newState = { ...state };

  // Lazy initialization of railroad networks
  if (!newState.transportNetwork.railroadNetworks) {
    const railroadNetworks = initializeRailroadNetworks(newState.map, newState.nations);
    newState = {
      ...newState,
      transportNetwork: {
        ...newState.transportNetwork,
        railroadNetworks,
      },
    };
  }

  const finished: FinishedConstruction[] = [];
  newState = { ...newState, map: runNationDevelopmentPhase(newState, ctx, finished) };

  for (const { nationId, x, y, kind, railFrom } of finished) {
    if (kind === "rail") newState = addRailroad(newState, nationId, { x, y }, railFrom ? coordsOf(railFrom) : undefined);
    else if (kind === "depot") newState = addDepot(newState, nationId, { x, y });
    else if (kind === "port") newState = addPort(newState, nationId, { x, y });
  }

  return newState;
};

const runNationDevelopmentPhase = (state: GameState, ctx: TurnContext, finished: FinishedConstruction[]): GameMap => {
  const { nextTurn, rng } = ctx;
  const tiles: Tile[][] = state.map.tiles.map(row => row.map(tile => {
    let t: Tile = tile;
    t = resolveProspectingOnTile(state, t, nextTurn, rng);
    t = resolveDevelopmentJobOnTile(t, nextTurn);
    t = resolveConstructionJobOnTile(t, nextTurn);
    reportCompletions(tile, t, ctx, finished);
    return t;
  }));
  return { ...state.map, tiles };
};

/** A job that disappeared in this system has finished (cancelling is an order, not a system). */
const reportCompletions = (before: Tile, after: Tile, ctx: TurnContext, finished: FinishedConstruction[]): void => {
  const nationId = after.ownerNationId;
  if (before.prospecting && !after.prospecting) {
    ctx.emit({ type: "resource-discovered", tileId: after.id, nationId, resource: after.resource?.type });
  }
  if (before.developmentJob && !after.developmentJob) {
    // FR-634: a held Minor Nation tile has no owner; its news goes to the holder whose improver worked it
    const { workerId, targetLevel } = before.developmentJob;
    const developer = nationId ?? before.workers.find(w => w.id === workerId)?.nationId;
    ctx.emit({ type: "development-completed", tileId: after.id, nationId: developer, level: targetLevel });
  }
  if (before.constructionJob && !after.constructionJob) {
    const { kind, railFrom } = before.constructionJob;
    ctx.emit({ type: "construction-completed", tileId: after.id, nationId, structure: kind });
    if (nationId) finished.push({ nationId, x: after.x, y: after.y, kind, railFrom });
  }
};

function surveyDeposit(state: GameState, tile: Tile, rng: Rng): Resource | undefined {
  const possible: (ResourceType | undefined)[] = [undefined];
  if (DRILLING_TERRAINS.includes(tile.terrain)) possible.push(ResourceType.Oil);
  if (tile.terrain === TerrainType.BarrenHills) {
    possible.push(ResourceType.Coal, ResourceType.IronOre);
  }
  if (tile.terrain === TerrainType.Mountains) {
    const province = tile.provinceId && provinceById(state, tile.provinceId);
    const minorOrigin = province && state.minorNations.some(minor => minor.id === startOwnerOf(province));
    possible.push(...MINERAL_RESOURCES.filter(type => type !== ResourceType.Gems || minorOrigin));
  }
  const type = possible[Math.floor(rng.next() * possible.length)];
  return type && { type, level: 0, discovered: true };
}

function resolveProspectingOnTile(state: GameState, tile: Tile, nextTurn: number, rng: Rng): Tile {
  if (!tile.prospecting || nextTurn - tile.prospecting.startedOnTurn < ProspectorDiscoveryDurationTurns) return tile;
  if (tile.resource) return { ...tile, resource: { ...tile.resource, discovered: true }, prospecting: undefined };
  return { ...tile, resource: surveyDeposit(state, tile, rng), prospected: true, prospecting: undefined };
}

const resolveDevelopmentJobOnTile = (tile: Tile, nextTurn: number): Tile => {
  const job = tile.developmentJob;
  if (!job || nextTurn - job.startedOnTurn < job.durationTurns) return tile;
  const resource = tile.resource ? { ...tile.resource, level: Math.max(tile.resource.level, job.targetLevel) } : tile.resource;
  return { ...tile, resource, developmentJob: undefined };
};

const resolveConstructionJobOnTile = (tile: Tile, nextTurn: number): Tile => {
  const job = tile.constructionJob;
  if (!job || nextTurn - job.startedOnTurn < job.durationTurns) return tile;
  const update: Partial<Tile> = {};
  switch (job.kind) {
    case "depot": update.depot = true; break;
    case "port": update.port = true; break;
    case "fort": update.fortLevel = Math.max(1, tile.fortLevel || 0); break;
    case "rail": break;
  }
  return { ...tile, ...update, constructionJob: undefined };
};
