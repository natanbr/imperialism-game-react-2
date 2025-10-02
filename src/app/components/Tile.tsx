import React, { useMemo } from "react";
import { DRILLING_TERRAINS, FARMING_TERRAINS, FORESTRY_TERRAINS, MINING_TERRAINS, PROSPECTABLE_TERRAIN_TYPES, RANCHING_TERRAINS } from "../definisions/terrainDefinitions";
import { canBuildRailAt } from "../store/helpers/mapHelpers";
import { useGameStore } from '../store/rootStore';
import { PossibleAction } from "../types/actions";
import { GameMap } from '../types/Map';
import { ResourceType } from "../types/Resource";
import { TerrainType, Tile } from "../types/Tile";
import { Worker, WorkerStatus, WorkerType } from "../types/Workers";

const getPossibleAction = (tile: Tile, selectedWorker: Worker | null, map: GameMap): PossibleAction => {
  if (!selectedWorker || selectedWorker.status !== WorkerStatus.Available) return null;

  const { terrain, resource, ownerNationId, developmentJob, constructionJob, fortLevel, depot, port } = tile;

  if (ownerNationId !== selectedWorker.nationId) return null;

  switch (selectedWorker.type) {
    case WorkerType.Prospector:
      if (PROSPECTABLE_TERRAIN_TYPES.includes(terrain) && !resource?.discovered && !tile.prospecting) {
        return { type: 'prospect' };
      }
      break;
    case WorkerType.Engineer:
      if (!constructionJob) {
        // Forts in capitals/cities
        if ((terrain === TerrainType.Capital || terrain === TerrainType.Town) && (fortLevel ?? 0) < 3) {
          return { type: 'construct', kind: 'fort' };
        }
        // Rails
        if (canBuildRailAt(map, tile.x, tile.y, selectedWorker.nationId)) {
          return { type: 'construct', kind: 'rail' };
        }
        // Depot/Port Modal
        const isLand = tile.terrain !== TerrainType.Water;
        if (isLand && !depot && !port) {
          return { type: 'open-construct-modal' };
        }
      }
      break;
      case WorkerType.Farmer:
      case WorkerType.Rancher:
      case WorkerType.Forester:
      case WorkerType.Miner:
      case WorkerType.Driller:
        if (!developmentJob) {
          const targetLevel = (resource?.level || 0) + 1;
          if (targetLevel > 3) return null;

          const terrainMap = {
            [WorkerType.Farmer]: FARMING_TERRAINS,
            [WorkerType.Rancher]: RANCHING_TERRAINS,
            [WorkerType.Forester]: FORESTRY_TERRAINS,
            [WorkerType.Miner]: MINING_TERRAINS,
            [WorkerType.Driller]: DRILLING_TERRAINS,
          };

          if (terrainMap[selectedWorker.type].includes(terrain)) {
            return { type: 'develop', workerType: selectedWorker.type, level: targetLevel as 1 | 2 | 3 };
          }
        }
        break;
    }

    return null;
  };

interface TileProps {
  tile: Tile;
}

const terrainColors: Record<TerrainType, string> = {
  [TerrainType.DryPlains]: "#d2f5a3",
  [TerrainType.OpenRange]: "#e6e2b3",
  [TerrainType.HorseRanch]: "#b6cf96",
  [TerrainType.Plantation]: "#a3d977",
  [TerrainType.Farm]: "#f5e6a3",
  [TerrainType.Orchard]: "#b6e2a3",
  [TerrainType.FertileHills]: "#b7d7a8",
  [TerrainType.BarrenHills]: "#b6cf96",
  [TerrainType.Mountains]: "#b0a9a9",
  [TerrainType.HardwoodForest]: "#228b22",
  [TerrainType.ScrubForest]: "#459c45",
  [TerrainType.Swamp]: "#556b2f",
  [TerrainType.Desert]: "#f4e19c",
  [TerrainType.Tundra]: "#e0f7fa",
  [TerrainType.Water]: "#b3e0ff",
  [TerrainType.River]: "#1e90ff",
  [TerrainType.Town]: "#ffe4b5",
  [TerrainType.Capital]: "#ffb347",
  [TerrainType.Coast]: "#87ceeb",
};

const resourceIcons: Partial<Record<ResourceType, string>> = {
  [ResourceType.Grain]: "🌾",
  [ResourceType.Timber]: "🌲",
  [ResourceType.IronOre]: "⛏️",
  [ResourceType.Coal]: "⚫",
  [ResourceType.Oil]: "🛢️",
  [ResourceType.Gold]: "💰",
  [ResourceType.Gems]: "💎",
  [ResourceType.Fish]: "🐟",
};

export const TileComponent: React.FC<TileProps> = ({ tile }) => {
  const { terrain, hasRiver, resource, workers, ownerNationId } = tile;

  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const selectTile = useGameStore((s) => s.selectTile);
  const selectWorker = useGameStore((s) => s.selectWorker);
  const moveSelectedWorkerToTile = useGameStore((s) => s.moveSelectedWorkerToTile);
  const nations = useGameStore((s) => s.nations);
  const map = useGameStore((s) => s.map);
  const transportNetwork = useGameStore((s) => s.transportNetwork);

  const selectedWorker = useMemo(() => {
    if (!selectedWorkerId) return null;
    for (const row of map.tiles) {
      for (const t of row) {
        const worker = t.workers.find(w => w.id === selectedWorkerId);
        if (worker) return worker;
      }
    }
    return null;
  }, [selectedWorkerId, map.tiles]);

  const possibleAction = getPossibleAction(tile, selectedWorker, map);

  const cursor = useMemo(() => {
    if (!possibleAction) return 'auto';
    switch (possibleAction.type) {
      case 'prospect':
        return 'crosshair';
      case 'develop':
        return 'pointer';
      case 'construct':
        if (possibleAction.kind === 'rail') return 'grab';
        if (possibleAction.kind === 'fort') return 'cell';
        return 'pointer';
      case 'open-construct-modal':
        return 'pointer';
      default:
        return 'auto';
    }
  }, [possibleAction]);

  const isSelected = selectedTileId === tile.id;

  const isWorkerSelected = (wId: string) => selectedWorkerId === wId;

  const jobCompleted = tile.developmentJob?.completed || tile.constructionJob?.completed;

  const ownerNation = ownerNationId ? nations.find(n => n.id === ownerNationId) : null;
  const borderColor = isSelected
    ? "red"
    : ownerNation
    ? ownerNation.color
    : "#555";
  const borderWidth = ownerNation ? "3px" : "1px";

  const nationNetwork = ownerNationId ? transportNetwork.railroadNetworks?.[ownerNationId] : undefined;
  const depotStatus = useMemo(() => {
    if (!tile.depot || !nationNetwork) return false;
    const depotNode = nationNetwork.depots.find(d => d.x === tile.x && d.y === tile.y);
    return depotNode?.isActive ?? false;
  }, [tile.depot, tile.x, tile.y, nationNetwork]);

  const portStatus = useMemo(() => {
    if (!tile.port || !nationNetwork) return false;
    const portNode = nationNetwork.ports.find(p => p.x === tile.x && p.y === tile.y);
    return portNode?.isActive ?? false;
  }, [tile.port, tile.x, tile.y, nationNetwork]);

  const handleTileClick = () => {
    if (selectedWorker && possibleAction) {
      const isSameTile = selectedWorker.assignedTileId === tile.id;
      const {
        startProspecting,
        moveAndStartProspecting,
        startDevelopment,
        moveAndStartDevelopment,
        startConstruction,
        moveAndStartConstruction,
        openConstructionModal,
        selectWorker,
      } = useGameStore.getState();

      switch (possibleAction.type) {
        case 'prospect':
          isSameTile
            ? startProspecting(tile.id, selectedWorker.id)
            : moveAndStartProspecting(tile.id, selectedWorker.id);
          break;
        case 'develop':
          isSameTile
            ? startDevelopment(tile.id, selectedWorker.id, possibleAction.workerType, possibleAction.level)
            : moveAndStartDevelopment(tile.id, selectedWorker.id, possibleAction.workerType, possibleAction.level);
          break;
        case 'construct':
          isSameTile
            ? startConstruction(tile.id, selectedWorker.id, possibleAction.kind)
            : moveAndStartConstruction(tile.id, selectedWorker.id, possibleAction.kind);
          break;
        case 'open-construct-modal':
          openConstructionModal(tile.id, selectedWorker.id);
          return;
      }
      selectWorker(undefined);
      selectTile(tile.id);
    } else if (selectedWorkerId) {
      moveSelectedWorkerToTile(tile.id, selectedWorkerId);
      selectTile(tile.id);
    } else {
      selectTile(tile.id);
    }
  };

  return (
    <div
      onClick={handleTileClick}
      style={{
        border: `${borderWidth} solid ${borderColor}`,
        backgroundColor: terrainColors[terrain] || "#ccc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        width: "100px",
        height: "100px",
        position: "relative",
        userSelect: "none",
        boxShadow: jobCompleted ? "0 0 12px 4px #ffd54f" : undefined,
        transition: "box-shadow 200ms ease",
        cursor,
      }}
    >
      <div>{terrain}</div>
      {hasRiver && <div style={{ fontSize: "12px" }}>🌊</div>}
      {resource && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>{resource.discovered ? resourceIcons[resource.type] : ""}</span>
          <span aria-label={`Development level ${resource.level}`} style={{ fontSize: 12 }}>
            {"🏗️".repeat(resource.level)}
          </span>
          <span>(L{resource.level})</span>
        </div>
      )}

      {/* Built infrastructure icons with active flags */}
      {tile.depot && (
        <div title="Depot" style={{ position: "absolute", top: 4, left: 4, fontSize: 16, display: "flex", alignItems: "center", gap: 2 }}>
          <span>🏬</span>
          <span style={{ fontSize: 12 }}>{depotStatus ? "🟢" : "🔴"}</span>
        </div>
      )}
      {tile.port && (
        <div title="Port" style={{ position: "absolute", top: 4, left: 28, fontSize: 16, display: "flex", alignItems: "center", gap: 2 }}>
          <span>⚓</span>
          <span style={{ fontSize: 12 }}>{portStatus ? "🟢" : "🔴"}</span>
        </div>
      )}

      {/* Worker selection buttons (all workers present on tile) */}
      {workers.length > 0 && (
        <div style={{ position: "absolute", bottom: 2, right: 2, display: "flex", gap: 4, flexWrap: "wrap", maxWidth: "96px", justifyContent: "flex-end" }}>
          {workers.map((w) => (
            <button
              key={w.id}
              onClick={(e) => { e.stopPropagation(); selectWorker(w.id); }}
              title={w.type}
              style={{
                fontSize: "16px",
                lineHeight: 1,
                border: isWorkerSelected(w.id) ? "2px solid yellow" : "1px solid transparent",
                borderRadius: 4,
                background: "rgba(255,255,255,0.2)",
                padding: "0 2px",
                cursor: "pointer",
                filter: "drop-shadow(0 0 2px #fff)",
              }}
            >
              {w.type === WorkerType.Prospector && "👁️"}
              {w.type === WorkerType.Farmer && "🚜"}
              {w.type === WorkerType.Rancher && "🐄"}
              {w.type === WorkerType.Forester && "🌲"}
              {w.type === WorkerType.Miner && "⛏️"}
              {w.type === WorkerType.Driller && "🛢️"}
              {w.type === WorkerType.Engineer && "🛠️"}
            </button>
          ))}
        </div>
      )}

      {/* Simple icons indicating a job is in progress on this tile */}
      {tile.prospecting && (
        <div title="Prospecting in progress" style={{ position: "absolute", top: 4, right: 4, fontSize: 14 }}>⏳</div>
      )}
      {tile.developmentJob && !tile.developmentJob.completed && (
        <div title="Development in progress" style={{ position: "absolute", bottom: 4, right: 4, fontSize: 14 }}>⏳</div>
      )}
      {tile.constructionJob && !tile.constructionJob.completed && (
        <div title="Construction in progress" style={{ position: "absolute", bottom: 4, left: 4, fontSize: 14 }}>🛠️</div>
      )}
    </div>
  );
};