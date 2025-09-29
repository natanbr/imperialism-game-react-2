import { Tile } from "@/types/Tile";
import React from "react";
import { useGameStore } from "../store/rootStore";
import { Worker, WorkerStatus, WorkerType } from "@/types/Workers";
import { PROSPECTABLE_TERRAIN_TYPES } from "../definisions/terrainDefinitions";
import { DEVELOPMENT_WORKER_TYPES } from "../definisions/workerDefinitions";
import { canBuildRailAt } from "@/store/helpers/mapHelpers";
import { PROSPECT_COST, DEVELOPMENT_COST, CONSTRUCTION_COST } from "@/definisions/workPrices";

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
  const startProspecting = useGameStore((s) => s.startProspecting);
  const startDevelopment = useGameStore((s) => s.startDevelopment);
  const startConstruction = useGameStore((s) => s.startConstruction);
  const cancelJob = useGameStore((s) => s.cancelJob);
  const oilDrillingTechUnlocked = useGameStore((s) => s.technologyState.oilDrillingTechUnlocked);
  const map = useGameStore((s) => s.map);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const activeNation = useGameStore((s) => s.nations.find(n => n.id === s.activeNationId));
  const setSelectedWorkerId = useGameStore((s) => s.setSelectedWorkerId);

  if (!selectedTile) {
    return <div style={{ padding: "10px" }}>No tile selected</div>;
  }

  const terrainAllowsProspecting = PROSPECTABLE_TERRAIN_TYPES.includes(selectedTile.terrain);
  const selectedWorker = selectedTile.workers.find(w => w.id === selectedWorkerId);

  // A worker can start a job if they are available and haven't moved this turn
  const canStartJob = selectedWorker && selectedWorker.status === WorkerStatus.Available && !selectedWorker.justMoved;

  const handleCancelJob = (workerId: string) => {
    if (window.confirm("Are you sure you want to cancel this worker's job?")) {
      cancelJob(selectedTile.id, workerId);
    }
  };

  const renderWorkerActions = (worker: Worker) => {
    const isSelected = worker.id === selectedWorkerId;
    if (!isSelected) return null;

    // Prospector actions
    if (worker.type === WorkerType.Prospector) {
      const canProspect = canStartJob && terrainAllowsProspecting && !selectedTile.prospecting && (activeNation?.treasury ?? 0) >= PROSPECT_COST;
      return canProspect && (
        <button onClick={() => startProspecting(selectedTile.id, worker.id)} title={`Cost: $${PROSPECT_COST}`}>
          Prospect ⛏️
        </button>
      );
    }

    // Development actions
    if (DEVELOPMENT_WORKER_TYPES.includes(worker.type)) {
      const treasury = activeNation?.treasury ?? 0;
      const canAffordL1 = treasury >= DEVELOPMENT_COST[1];
      const canAffordL2 = treasury >= DEVELOPMENT_COST[2];
      const canAffordL3 = treasury >= DEVELOPMENT_COST[3];
      const currentLevel = selectedTile.resource?.level ?? 0;
      const enableL1 = currentLevel === 0;
      const enableL2 = currentLevel === 1;
      const enableL3 = currentLevel === 2;

      return canStartJob && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          <button onClick={() => startDevelopment(selectedTile.id, worker.id, worker.type, 1)} title={`L1 ($${DEVELOPMENT_COST[1]})`} disabled={!enableL1 || !canAffordL1}>L1</button>
          <button onClick={() => startDevelopment(selectedTile.id, worker.id, worker.type, 2)} title={`L2 ($${DEVELOPMENT_COST[2]})`} disabled={!enableL2 || !canAffordL2}>L2</button>
          <button onClick={() => startDevelopment(selectedTile.id, worker.id, worker.type, 3)} title={`L3 ($${DEVELOPMENT_COST[3]})`} disabled={!enableL3 || !canAffordL3}>L3</button>
        </div>
      );
    }

    // Construction actions
    if (worker.type === WorkerType.Engineer) {
      const [tx, ty] = selectedTile.id.split("-").map(Number);
      const railAllowed = canBuildRailAt(map, tx, ty, activeNationId);
      return canStartJob && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          <button onClick={() => startConstruction(selectedTile.id, worker.id, "depot")}>Depot</button>
          <button onClick={() => startConstruction(selectedTile.id, worker.id, "port")}>Port</button>
          <button onClick={() => startConstruction(selectedTile.id, worker.id, "fort")}>Fort</button>
          <button onClick={() => startConstruction(selectedTile.id, worker.id, "rail")} disabled={!railAllowed}>Rail</button>
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
              <li key={w.id} onClick={() => setSelectedWorkerId(w.id)} style={{ background: selectedWorkerId === w.id ? '#444' : 'transparent', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}>
                <WorkerStatusIndicator status={w.status} />
                <span>{w.type}</span>
                {w.status === WorkerStatus.Working && (
                  <button onClick={() => handleCancelJob(w.id)} style={{ marginLeft: 8, padding: '2px 6px', fontSize: 10, background: '#c0392b', color: 'white', border: 'none', borderRadius: 2 }}>
                    Cancel
                  </button>
                )}
                {renderWorkerActions(w)}
              </li>
            ))}
          </ul>
        ) : (
          <p>None</p>
        )}
      </div>

      {/* Global job status indicators */}
      {selectedTile.prospecting && (
        <div style={{ marginTop: 8, color: "#ffd54f" }}>Prospecting in progress…</div>
      )}
      {selectedTile.developmentJob && !selectedTile.developmentJob.completed && (
        <div style={{ marginTop: 8 }}>
          <strong>Development:</strong> {selectedTile.developmentJob.workerType} → L{selectedTile.developmentJob.targetLevel} (~{selectedTile.developmentJob.durationTurns} turns)
        </div>
      )}
      {selectedTile.constructionJob && !selectedTile.constructionJob.completed && (
        <div style={{ marginTop: 4 }}>
          <strong>Construction:</strong> {selectedTile.constructionJob.kind} (~{selectedTile.constructionJob.durationTurns} turns)
        </div>
      )}
    </div>
  );
};