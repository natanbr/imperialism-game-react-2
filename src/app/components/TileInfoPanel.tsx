import { Tile } from "@/types/Tile";
import React from "react";
import { useGameStore } from "../store/rootStore";
import { Worker, WorkerStatus, WorkerType } from "@/types/Workers";
import { PROSPECTABLE_TERRAIN_TYPES } from "../definisions/terrainDefinitions";
import { DEVELOPMENT_WORKER_TYPES } from "../definisions/workerDefinitions";
import { canBuildRailAt } from "@/store/helpers/mapHelpers";
import { PROSPECT_COST, DEVELOPMENT_COST, CONSTRUCTION_COST } from "@/definisions/workPrices";
import { parseTileIdToArray } from "@/utils/tileIdUtils";

interface TileInfoPanelProps {
  selectedTile: Tile | undefined;
}

const WorkerStatusIndicator: React.FC<{ status: WorkerStatus }> = ({ status }) => {
  const color = {
    [WorkerStatus.Available]: "green",
    [WorkerStatus.Moved]: "yellow",
    [WorkerStatus.Working]: "red",
  }[status];

  return <span style={{ marginRight: 8, color }}>●</span>;
};

export const TileInfoPanel: React.FC<TileInfoPanelProps> = ({ selectedTile }) => {
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const setSelectedWorkerId = useGameStore((s) => s.setSelectedWorkerId);
  const startProspecting = useGameStore((s) => s.startProspecting);
  const startDevelopment = useGameStore((s) => s.startDevelopment);
  const startConstruction = useGameStore((s) => s.startConstruction);
  const cancelAction = useGameStore((s) => s.cancelAction);
  const oilDrillingTechUnlocked = useGameStore((s) => s.technologyState.oilDrillingTechUnlocked);
  const map = useGameStore((s) => s.map);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const activeNation = useGameStore((s) => s.nations.find(n => n.id === s.activeNationId));

  if (!selectedTile) {
    return <div style={{ padding: "10px" }}>No tile selected</div>;
  }

  const handleCancelAction = (workerId: string) => {
    if (window.confirm("Are you sure you want to cancel this action?")) {
      cancelAction(selectedTile.id, workerId);
    }
  };

  const renderWorkerActions = (worker: Worker) => {
    if (worker.status !== WorkerStatus.Available) return null;

    if (worker.type === WorkerType.Prospector) {
      const canProspect = !selectedTile.prospecting && (activeNation?.treasury ?? 0) >= PROSPECT_COST && PROSPECTABLE_TERRAIN_TYPES.includes(selectedTile.terrain);
      if (canProspect) {
        return <button onClick={() => startProspecting(selectedTile.id, worker.id)} title={`Cost: $${PROSPECT_COST}`}>Prospect ⛏️</button>;
      }
    }

    if (DEVELOPMENT_WORKER_TYPES.includes(worker.type)) {
      const treasury = activeNation?.treasury ?? 0;
      const currentLevel = selectedTile.resource?.level ?? 0;
      const nextLevel = (currentLevel + 1) as 1 | 2 | 3;

      if (nextLevel > 3) return null;

      const canAfford = treasury >= DEVELOPMENT_COST[nextLevel];
      const jobLabel = `Develop ${worker.type} L${nextLevel}`;

      return (
        <button onClick={() => startDevelopment(selectedTile.id, worker.id, worker.type, nextLevel)} title={`${jobLabel} ($${DEVELOPMENT_COST[nextLevel]})`} disabled={!canAfford}>
          {jobLabel}
        </button>
      );
    }

    if (worker.type === WorkerType.Engineer) {
      const [tx, ty] = parseTileIdToArray(selectedTile.id);
      const railAllowed = canBuildRailAt(map, tx, ty, activeNationId);

      const canAfford = (kind: 'depot' | 'port' | 'fort' | 'rail') => (activeNation?.treasury ?? 0) >= CONSTRUCTION_COST[kind];

      return (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {!selectedTile.depot && <button onClick={() => startConstruction(selectedTile.id, worker.id, "depot")} disabled={!canAfford('depot')}>Construct Depot</button>}
          {!selectedTile.port && <button onClick={() => startConstruction(selectedTile.id, worker.id, "port")} disabled={!canAfford('port')}>Construct Port</button>}
          {<button onClick={() => startConstruction(selectedTile.id, worker.id, "fort")} disabled={!canAfford('fort')}>Construct Fort</button>}
          {!selectedTile.connected && <button onClick={() => startConstruction(selectedTile.id, worker.id, "rail")} disabled={!railAllowed || !canAfford('rail')}>Construct Rail</button>}
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ padding: "10px", borderLeft: "2px solid #333", minWidth: "220px" }}>
      <h3>Tile Info</h3>
      <p><strong>Terrain:</strong> {selectedTile.terrain}</p>
      <p><strong>River:</strong> {selectedTile.hasRiver ? "Yes" : "No"}</p>
      <p><strong>Resource:</strong> {selectedTile.resource ? `${selectedTile.resource.type} (L${selectedTile.resource.level})` : "None"}</p>
      <p><strong>Owner:</strong> {selectedTile.ownerNationId || "Unclaimed"}</p>

      <div style={{ marginTop: 12 }}>
        <strong>Workers on Tile:</strong>
        {selectedTile.workers.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, marginTop: 4 }}>
            {selectedTile.workers.map(w => (
              <li key={w.id} onClick={() => setSelectedWorkerId && setSelectedWorkerId(w.id)} style={{ background: selectedWorkerId === w.id ? '#444' : 'transparent', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}>
                <WorkerStatusIndicator status={w.status} />
                <span>{w.type} - {w.jobDescription || w.status}</span>
                {(w.status === WorkerStatus.Moved || w.status === WorkerStatus.Working) && (
                  <button onClick={() => handleCancelAction(w.id)} style={{ marginLeft: 8, padding: '2px 6px', fontSize: 10, background: '#c0392b', color: 'white', border: 'none', borderRadius: 2 }}>
                    Cancel
                  </button>
                )}
                {selectedWorkerId === w.id && renderWorkerActions(w)}
              </li>
            ))}
          </ul>
        ) : (
          <p>None</p>
        )}
      </div>
    </div>
  );
};