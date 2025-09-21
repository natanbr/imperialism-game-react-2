// Game state slice for Zustand store composition
import { NewsItem } from "@/types/Common";
import { Nation } from "@/types/Nation";
import { GameMap } from "@/types/Map";
import { StateCreator } from 'zustand';
import { initWorld } from "@/testing/worldInit";
import { WorkerType, Worker } from "@/types/Workers";
import { TerrainType } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import { WorkerLevelDurationsTurns, EngineerBuildDurationsTurns, ProspectorDiscoveryDurationTurns } from "@/definisions/workerDurations";

export interface GameStateSlice {
  turn: number;
  year: number;
  activeNationId: string;
  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
  newsLog: NewsItem[];
  nations: Nation[];
  map: GameMap;
  
  // Simple tech flags for gating
  oilDrillingTechUnlocked: boolean;
  
  // Actions
  setActiveNation: (nationId: string) => void;
  advanceTurn: () => void;
  addNews: (news: NewsItem) => void;
  setNations: (nations: Nation[]) => void;
  setMap: (map: GameMap) => void;
  moveSelectedWorkerToTile: (targetTileId: string, selectedWorkerId: string) => void;
  startProspecting: (tileId: string, workerId: string) => void;
  startDevelopment: (tileId: string, workerId: string, workerType: WorkerType, targetLevel: 1 | 2 | 3) => void;
  startConstruction: (tileId: string, workerId: string, kind: "depot" | "port" | "fort" | "rail") => void;
  setOilDrillingTech: (unlocked: boolean) => void;
}

export const createGameStateSlice: StateCreator<GameStateSlice> = (set, get) => ({
  turn: 1,
  year: 1900,
  activeNationId: "nation-1",
  difficulty: "normal",
  newsLog: [],
  oilDrillingTechUnlocked: false,
  // Use new world initialization
  ...(() => { const { map, nations } = initWorld({ cols: 5, rows: 5 }); return { map, nations }; })(),
  
  // Actions
  setActiveNation: (nationId: string) => set({ activeNationId: nationId }),
  setOilDrillingTech: (unlocked: boolean) => set({ oilDrillingTechUnlocked: unlocked }),
  advanceTurn: () => set((state) => {
    const nextTurn = state.turn + 1;
    const nextYear = state.year + (state.turn % 4 === 0 ? 1 : 0); // Advance year every 4 turns (seasons)

    // Resolve actions started on previous turns
    const resolvedTiles = state.map.tiles.map(row => row.map(tile => {
      let t = { ...tile };

      // 1) Prospecting resolves after 1 turn (using configured duration)
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

      // 2) Development jobs resolve when duration has elapsed
      if (t.developmentJob && !t.developmentJob.completed) {
        const elapsed = nextTurn - t.developmentJob.startedOnTurn;
        if (elapsed >= t.developmentJob.durationTurns) {
          // Improve resource level if present or create a base resource for certain terrains
          let newResource = t.resource;
          if (newResource) {
            const target = Math.max(newResource.level, t.developmentJob.targetLevel);
            newResource = { ...newResource, level: target };
          }
          t = { ...t, resource: newResource, developmentJob: { ...t.developmentJob, completed: true, completedOnTurn: nextTurn } };
        }
      }

      // 3) Construction jobs resolve when duration elapsed
      if (t.constructionJob && !t.constructionJob.completed) {
        const elapsed = nextTurn - t.constructionJob.startedOnTurn;
        if (elapsed >= t.constructionJob.durationTurns) {
          // Apply building effects
          let update: any = {};
          switch (t.constructionJob.kind) {
            case "depot": update.depot = true; break;
            case "port": update.port = true; break;
            case "fort": update.fortLevel = Math.max(1, t.fortLevel || 0); break;
            case "rail": update.connected = true; break;
          }
          t = { ...t, ...update, constructionJob: { ...t.constructionJob, completed: true, completedOnTurn: nextTurn } };
        }
      }

      // 4) Auto-clear completion indicator after being shown for 1 turn
      if (t.developmentJob?.completed && t.developmentJob.completedOnTurn && nextTurn > t.developmentJob.completedOnTurn) {
        const { developmentJob, ...rest } = t as any;
        t = { ...rest, developmentJob: undefined } as any;
      }
      if (t.constructionJob?.completed && t.constructionJob.completedOnTurn && nextTurn > t.constructionJob.completedOnTurn) {
        const { constructionJob, ...rest } = t as any;
        t = { ...rest, constructionJob: undefined } as any;
      }

      return t;
    }));

    return {
      turn: nextTurn,
      year: nextYear,
      map: { ...state.map, tiles: resolvedTiles },
    };
  }),
  addNews: (news: NewsItem) => set((state) => ({ 
    newsLog: [...state.newsLog, news] 
  })),
  setNations: (nations: Nation[]) => set({ nations }),
  setMap: (map: GameMap) => set({ map }),

  // Movement: allow movement to any owned land tile of same nation
  moveSelectedWorkerToTile: (targetTileId: string, selectedWorkerId: string) => {
    const state = get(); 

    if (!selectedWorkerId) return;

    const map = state.map as GameMap;

    // Find current tile containing the worker
    let fromX = -1, fromY = -1, worker: Worker | undefined;
    outer: for (let y = 0; y < map.config.rows; y++) {
      for (let x = 0; x < map.config.cols; x++) {
        const t = map.tiles[y][x];
        const w = t.workers.find((w: Worker) => w.id === selectedWorkerId);
        if (w) { fromX = x; fromY = y; worker = w; break outer; }
      }
    }
    if (!worker) return;

    // Locate target tile
    const [tx, ty] = targetTileId.split('-').map(Number);
    if (Number.isNaN(tx) || Number.isNaN(ty)) return;

    const target = map.tiles[ty]?.[tx];
    if (!target) return;

    // Must be land (not water/river) and owned by same nation
    const isLand = target.terrain !== TerrainType.Water && target.terrain !== TerrainType.River;
    const sameNation = target.ownerNationId === worker.nationId;
    if (!isLand || !sameNation) return;

    // Update tiles immutably
    const newTiles = map.tiles.map((row, y) => row.map((t, x) => {
      if (x === fromX && y === fromY) {
        return { ...t, workers: t.workers.filter((w) => w.id !== selectedWorkerId) };
      }
      if (x === tx && y === ty) {
        return { ...t, workers: [...t.workers, { ...worker!, assignedTileId: `${tx}-${ty}` }] };
      }
      return t;
    }));

    set({ map: { ...map, tiles: newTiles } });
  },

  // Start a prospecting action on the selected tile by a prospector
  startProspecting: (tileId: string, workerId: string) => {
    set((state) => {
      const [tx, ty] = tileId.split('-').map(Number);
      const tile = state.map.tiles[ty]?.[tx];
      if (!tile) return {};

      const terrainAllowed = [
        TerrainType.BarrenHills,
        TerrainType.Mountains,
        TerrainType.Swamp,
        TerrainType.Desert,
        TerrainType.Tundra,
      ].includes(tile.terrain);

      const hasWorker = tile.workers.some(w => w.id === workerId && w.type === WorkerType.Prospector);
      const alreadyProspecting = !!tile.prospecting;
      const alreadyDiscovered = tile.resource?.discovered === true;

      if (!terrainAllowed || !hasWorker || alreadyProspecting || alreadyDiscovered) return {};

      const newRow = [...state.map.tiles[ty]];
      newRow[tx] = { ...tile, prospecting: { startedOnTurn: state.turn, workerId } };
      const newTiles = [...state.map.tiles];
      newTiles[ty] = newRow;

      return { map: { ...state.map, tiles: newTiles } };
    });
  },

  // Start a development job (Farmer, Rancher, Forester, Miner, Driller)
  startDevelopment: (tileId: string, workerId: string, workerType: WorkerType, targetLevel: 1 | 2 | 3) => {
    set((state) => {
      const [tx, ty] = tileId.split('-').map(Number);
      const tile = state.map.tiles[ty]?.[tx];
      if (!tile) return {};

      // Validate worker is on tile and of given type
      const workerOnTile = tile.workers.some(w => w.id === workerId && w.type === workerType);
      if (!workerOnTile || tile.developmentJob) return {};

      // Validate terrain per workerType
      const terrainValid = (
        (workerType === WorkerType.Farmer && [TerrainType.Farm, TerrainType.Plantation, TerrainType.Orchard].includes(tile.terrain)) ||
        (workerType === WorkerType.Rancher && [TerrainType.OpenRange, TerrainType.FertileHills].includes(tile.terrain)) ||
        (workerType === WorkerType.Forester && [TerrainType.HardwoodForest].includes(tile.terrain)) ||
        (workerType === WorkerType.Miner && [TerrainType.BarrenHills, TerrainType.Mountains].includes(tile.terrain)) ||
        (workerType === WorkerType.Driller && [TerrainType.Swamp, TerrainType.Desert, TerrainType.Tundra].includes(tile.terrain))
      );
      if (!terrainValid) return {};

      // Gating: Miner requires discovered mineral; Driller requires discovered oil + tech
      if (workerType === WorkerType.Miner) {
        const isMineral = tile.resource && [
          ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems
        ].includes(tile.resource.type);
        if (!isMineral || !tile.resource?.discovered) return {};
      }
      if (workerType === WorkerType.Driller) {
        const isOil = tile.resource?.type === ResourceType.Oil;
        const hasTech = get().oilDrillingTechUnlocked === true;
        if (!isOil || !tile.resource?.discovered || !hasTech) return {};
      }

      // Get duration from table; fallback to 1
      const duration = WorkerLevelDurationsTurns[workerType]?.[targetLevel] ?? 1;

      const newRow = [...state.map.tiles[ty]];
      newRow[tx] = { ...tile, developmentJob: { workerId, workerType, targetLevel, startedOnTurn: state.turn, durationTurns: duration } };
      const newTiles = [...state.map.tiles];
      newTiles[ty] = newRow;
      return { map: { ...state.map, tiles: newTiles } };
    });
  },

  // Start a construction job (Engineer)
  startConstruction: (tileId: string, workerId: string, kind: "depot" | "port" | "fort" | "rail") => {
    set((state) => {
      const [tx, ty] = tileId.split('-').map(Number);
      const tile = state.map.tiles[ty]?.[tx];
      if (!tile) return {};

      const workerOnTile = tile.workers.some(w => w.id === workerId && w.type === WorkerType.Engineer);
      if (!workerOnTile || tile.constructionJob) return {};

      const duration = EngineerBuildDurationsTurns[kind] ?? 1;

      const newRow = [...state.map.tiles[ty]];
      newRow[tx] = { ...tile, constructionJob: { workerId, kind, startedOnTurn: state.turn, durationTurns: duration } };
      const newTiles = [...state.map.tiles];
      newTiles[ty] = newRow;
      return { map: { ...state.map, tiles: newTiles } };
    });
  },
});
