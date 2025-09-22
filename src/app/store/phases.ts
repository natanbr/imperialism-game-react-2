// Turn phases orchestration and per-phase logic
import { GameMap } from "@/types/Map";
import { Tile, TerrainType } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import { ProspectorDiscoveryDurationTurns } from "@/definisions/workerDurations";

// Resolves prospecting completion for a single tile
const resolveProspectingOnTile = (tile: Tile, nextTurn: number): Tile => {
  let t: Tile = { ...tile };
  if (t.prospecting && (nextTurn - t.prospecting.startedOnTurn) >= ProspectorDiscoveryDurationTurns) {
    let discoveredType: ResourceType | undefined;
    if (t.terrain === TerrainType.BarrenHills || t.terrain === TerrainType.Mountains) {
      const options = [ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems];
      discoveredType = options[Math.floor(Math.random() * options.length)];
    } else if (t.terrain === TerrainType.Swamp || t.terrain === TerrainType.Desert || t.terrain === TerrainType.Tundra) {
      discoveredType = ResourceType.Oil;
    }
    const newResource = discoveredType ? { type: discoveredType, level: 0, discovered: true } : t.resource;
    t = { ...t, resource: newResource, prospecting: undefined };
  }
  return t;
};

// Resolves development job completion for a single tile
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

// Resolves construction job completion for a single tile
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

// Clears completion indicators one turn after completion (UI pulse)
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

// Nation Development Phase: prospecting, development, construction, and cleanup
export const runNationDevelopmentPhase = (map: GameMap, nextTurn: number): GameMap => {
  const tiles: Tile[][] = map.tiles.map(row => row.map(tile => {
    let t: Tile = { ...tile };
    t = resolveProspectingOnTile(t, nextTurn);
    t = resolveDevelopmentJobOnTile(t, nextTurn);
    t = resolveConstructionJobOnTile(t, nextTurn);
    t = clearCompletionIndicators(t, nextTurn);
    return t;
  }));
  return { ...map, tiles };
};

// Placeholders for remaining phases (extend as systems are implemented)
export const runDiplomacyPhase = (map: GameMap): GameMap => map;
export const runTradePhase = (map: GameMap): GameMap => map;
export const runProductionPhase = (map: GameMap): GameMap => map;
export const runCombatPhase = (map: GameMap): GameMap => map;
export const runInterceptionsPhase = (map: GameMap): GameMap => map;
export const runLogisticsPhase = (map: GameMap): GameMap => map;

export const runTurnPhases = (map: GameMap, _currentTurn: number, nextTurn: number): GameMap => {
  const afterDev = runNationDevelopmentPhase(map, nextTurn);
  const afterDip = runDiplomacyPhase(afterDev);
  const afterTrade = runTradePhase(afterDip);
  const afterProd = runProductionPhase(afterTrade);
  const afterCombat = runCombatPhase(afterProd);
  const afterInter = runInterceptionsPhase(afterCombat);
  const finalMap = runLogisticsPhase(afterInter);
  return finalMap;
};