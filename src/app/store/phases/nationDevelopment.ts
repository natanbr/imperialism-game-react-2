import { GameMap } from "@/types/Map";
import { TerrainType, Tile } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import { ProspectorDiscoveryDurationTurns } from "@/definisions/workerDurations";

// Resolve prospecting discoveries that are due this turn
export function resolveProspecting(tiles: Tile[][], nextTurn: number): Tile[][] {
  return tiles.map(row => row.map(tile => {
    let t = { ...tile };
    if (t.prospecting && (nextTurn - t.prospecting.startedOnTurn) >= ProspectorDiscoveryDurationTurns) {
      let discoveredType: ResourceType | undefined;
      if (t.terrain === TerrainType.BarrenHills || t.terrain === TerrainType.Mountains) {
        const options = [ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems];
        discoveredType = options[Math.floor(Math.random() * options.length)];
      } else if (t.terrain === TerrainType.Swamp || t.terrain === TerrainType.Desert || t.terrain === TerrainType.Tundra) {
        discoveredType = ResourceType.Oil;
      }
      const newResource = discoveredType ? { type: discoveredType, level: 1, discovered: true } : t.resource;
      t = { ...t, resource: newResource, prospecting: undefined };
    }
    return t;
  }));
}

// Resolve development jobs that complete this turn
export function resolveDevelopmentJobs(tiles: Tile[][], nextTurn: number): Tile[][] {
  return tiles.map(row => row.map(tile => {
    let t = { ...tile };
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
  }));
}

// Resolve construction jobs that complete this turn
export function resolveConstructionJobs(tiles: Tile[][], nextTurn: number): Tile[][] {
  return tiles.map(row => row.map(tile => {
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
  }));
}

// Clear completion indicators one turn after being shown
export function clearCompletionIndicators(tiles: Tile[][], nextTurn: number): Tile[][] {
  return tiles.map(row => row.map(tile => {
    let t: Tile = { ...tile };
    if (t.developmentJob?.completed && t.developmentJob.completedOnTurn && nextTurn > t.developmentJob.completedOnTurn) {
      t = { ...t, developmentJob: undefined };
    }
    if (t.constructionJob?.completed && t.constructionJob.completedOnTurn && nextTurn > t.constructionJob.completedOnTurn) {
      t = { ...t, constructionJob: undefined };
    }
    return t;
  }));
}

// Orchestrates "Nation Development" phase
export function nationDevelopmentPhase(map: GameMap, _currentTurn: number, nextTurn: number): GameMap {
  let tiles = map.tiles;
  tiles = resolveProspecting(tiles, nextTurn);
  tiles = resolveDevelopmentJobs(tiles, nextTurn);
  tiles = resolveConstructionJobs(tiles, nextTurn);
  tiles = clearCompletionIndicators(tiles, nextTurn);
  return { ...map, tiles };
}