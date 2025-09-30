import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { Tile, TerrainType } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import { ProspectorDiscoveryDurationTurns } from "@/definisions/workerDurations";

export interface RngLike {
  next: () => number; // [0,1)
}

export const developmentSystem = (state: GameState, rng: RngLike): GameState => {
  const nextTurn = state.turn + 1;
  const newMap = runNationDevelopmentPhase(state.map, nextTurn, rng);
  return { ...state, map: newMap };
};

import { MINERAL_RESOURCES } from "@/definisions/resourceDefinitions";

const runNationDevelopmentPhase = (map: GameMap, nextTurn: number, rng: RngLike): GameMap => {
  const tiles: Tile[][] = map.tiles.map(row => row.map(tile => {
    let t: Tile = { ...tile };
    t = resolveProspectingOnTile(t, nextTurn, rng);
    t = resolveDevelopmentJobOnTile(t, nextTurn);
    t = resolveConstructionJobOnTile(t, nextTurn);
    t = clearCompletionIndicators(t, nextTurn);
    return t;
  }));
  return { ...map, tiles };
};

const discoverResourceOnTile = (tile: Tile, rng: RngLike): Resource | undefined => {
    if (tile.resource) {
        return { ...tile.resource, discovered: true };
    }

    let resourceType: ResourceType;
    switch (tile.terrain) {
        case TerrainType.BarrenHills:
        case TerrainType.Mountains:
            const minerals = MINERAL_RESOURCES.filter(r => r !== ResourceType.Gold && r !== ResourceType.Gems);
            resourceType = minerals[Math.floor(rng.next() * minerals.length)];
            break;
        case TerrainType.Swamp:
        case TerrainType.Desert:
        case TerrainType.Tundra:
            resourceType = ResourceType.Oil;
            break;
        default:
            return undefined;
    }

    return {
        type: resourceType,
        level: 0,
        discovered: true,
    };
};

const resolveProspectingOnTile = (tile: Tile, nextTurn: number, rng: RngLike): Tile => {
  let t: Tile = { ...tile };
  if (t.prospecting && (nextTurn - t.prospecting.startedOnTurn) >= ProspectorDiscoveryDurationTurns) {
    const newResource = discoverResourceOnTile(t, rng);
    t = { ...t, resource: newResource, prospecting: undefined };
  }
  return t;
};

const resolveDevelopmentJobOnTile = (tile: Tile, nextTurn: number): Tile => {
  let t: Tile = { ...tile };
  if (t.developmentJob && !t.developmentJob.completed) {
    const elapsed = nextTurn - t.developmentJob.startedOnTurn;
    if (elapsed >= t.developmentJob.durationTurns) {
      let newResource = t.resource;
      if (newResource) {
        const target = Math.max(newResource.level, t.developmentJob.targetLevel);
        newResource = { ...newResource, level: target };
      }
      t = { ...t, resource: newResource, developmentJob: { ...t.developmentJob, completed: true, completedOnTurn: nextTurn } };
    }
  }
  return t;
};

const resolveConstructionJobOnTile = (tile: Tile, nextTurn: number): Tile => {
  let t: Tile = { ...tile };
  if (t.constructionJob && !t.constructionJob.completed) {
    const elapsed = nextTurn - t.constructionJob.startedOnTurn;
    if (elapsed >= t.constructionJob.durationTurns) {
      const update: Partial<Tile> = {};
      switch (t.constructionJob.kind) {
        case "depot": update.depot = true; break;
        case "port": update.port = true; break;
        case "fort": update.fortLevel = Math.max(1, t.fortLevel || 0); break;
        case "rail": update.connected = true; break;
      }
      t = { ...t, ...update, constructionJob: { ...t.constructionJob, completed: true, completedOnTurn: nextTurn } };
    }
  }
  return t;
};

const clearCompletionIndicators = (tile: Tile, nextTurn: number): Tile => {
  let t: Tile = { ...tile };
  if (t.developmentJob?.completed && t.developmentJob.completedOnTurn && nextTurn > t.developmentJob.completedOnTurn) {
    t = { ...t, developmentJob: undefined };
  }
  if (t.constructionJob?.completed && t.constructionJob.completedOnTurn && nextTurn > t.constructionJob.completedOnTurn) {
    t = { ...t, constructionJob: undefined };
  }
  return t;
};


