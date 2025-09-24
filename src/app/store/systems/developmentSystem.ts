import {
  ProspectorDiscoveryDurationTurns,
} from "@/definisions/workerDurations";
import { ResourceType } from "@/types/Resource";
import { TerrainType } from "@/types/Tile";
import { GameStore } from "../types";
import { Tile } from "@/types/Tile";

const resolveProspectingOnTile = (tile: Tile, nextTurn: number): Tile => {
  let t: Tile = { ...tile };
  if (
    t.prospecting &&
    nextTurn - t.prospecting.startedOnTurn >= ProspectorDiscoveryDurationTurns
  ) {
    let discoveredType: ResourceType | undefined;
    if (
      t.terrain === TerrainType.BarrenHills ||
      t.terrain === TerrainType.Mountains
    ) {
      const options = [
        ResourceType.Coal,
        ResourceType.IronOre,
        ResourceType.Gold,
        ResourceType.Gems,
      ];
      discoveredType = options[Math.floor(Math.random() * options.length)];
    } else if (
      t.terrain === TerrainType.Swamp ||
      t.terrain === TerrainType.Desert ||
      t.terrain === TerrainType.Tundra
    ) {
      discoveredType = ResourceType.Oil;
    }
    const newResource = discoveredType
      ? { type: discoveredType, level: 0, discovered: true }
      : t.resource;
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
      t = {
        ...t,
        resource: newResource,
        developmentJob: {
          ...t.developmentJob,
          completed: true,
          completedOnTurn: nextTurn,
        },
      };
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
        case "depot":
          update.depot = true;
          break;
        case "port":
          update.port = true;
          break;
        case "fort":
          update.fortLevel = Math.max(1, t.fortLevel || 0);
          break;
        case "rail":
          update.connected = true;
          break;
      }
      t = {
        ...t,
        ...update,
        constructionJob: {
          ...t.constructionJob,
          completed: true,
          completedOnTurn: nextTurn,
        },
      };
    }
  }
  return t;
};

const clearCompletionIndicators = (tile: Tile, nextTurn: number): Tile => {
  let t: Tile = { ...tile };
  if (
    t.developmentJob?.completed &&
    t.developmentJob.completedOnTurn &&
    nextTurn > t.developmentJob.completedOnTurn
  ) {
    t = { ...t, developmentJob: undefined };
  }
  if (
    t.constructionJob?.completed &&
    t.constructionJob.completedOnTurn &&
    nextTurn > t.constructionJob.completedOnTurn
  ) {
    t = { ...t, constructionJob: undefined };
  }
  return t;
};

export const developmentSystem = (state: GameStore, nextTurn: number): GameStore => {
  const tiles: Tile[][] = state.map.tiles.map((row) =>
    row.map((tile) => {
      let t: Tile = { ...tile };
      t = resolveProspectingOnTile(t, nextTurn);
      t = resolveDevelopmentJobOnTile(t, nextTurn);
      t = resolveConstructionJobOnTile(t, nextTurn);
      t = clearCompletionIndicators(t, nextTurn);
      return t;
    })
  );

  return {
    ...state,
    map: {
      ...state.map,
      tiles,
    },
  };
};