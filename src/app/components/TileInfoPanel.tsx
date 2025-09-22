import { Tile, TerrainType } from "@/types/Tile";
import React from "react";
import { useGameStore } from "../store/rootStore";
import { WorkerType } from "@/types/Workers";
import { PROSPECTABLE_TERRAIN_TYPES } from "../definisions/terrainDefinitions";
import { DEVELOPMENT_WORKER_TYPES } from "../definisions/workerDefinitions";

interface TileInfoPanelProps {
  selectedTile: Tile | undefined;
}

export const TileInfoPanel: React.FC<TileInfoPanelProps> = ({ selectedTile }) => {
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const startProspecting = useGameStore((s) => s.startProspecting);
  const startDevelopment = useGameStore((s) => s.startDevelopment);
  const startConstruction = useGameStore((s) => s.startConstruction);
  const oilDrillingTechUnlocked = useGameStore((s) => s.technologyState.oilDrillingTechUnlocked);

  if (!selectedTile) {
    return <div style={{ padding: "10px" }}>No tile selected</div>;
  }

  const terrainAllowsProspecting = PROSPECTABLE_TERRAIN_TYPES.includes(selectedTile.terrain);

  const prospectorOnTile = selectedTile.workers.find(w => w.id === selectedWorkerId && w.type === WorkerType.Prospector);
  const canProspect = !!prospectorOnTile && terrainAllowsProspecting && !selectedTile.prospecting;

  // New workers: show simple status if a job is running
  const dev = selectedTile.developmentJob;
  const con = selectedTile.constructionJob;
  const hasActiveDev = !!dev && !dev.completed;
  const hasActiveCon = !!con && !con.completed;
  const hasActiveProspecting = !!selectedTile.prospecting;

  // Controls: allow starting development/construction using the selected worker
  const selectedWorker = selectedTile.workers.find(w => w.id === selectedWorkerId);
  const canStartAnyJob = !!selectedWorker && !hasActiveDev && !hasActiveCon && !hasActiveProspecting;

  const startL1 = () => selectedWorker && startDevelopment(selectedTile.id, selectedWorker.id, selectedWorker.type, 1);
  const startL2 = () => selectedWorker && startDevelopment(selectedTile.id, selectedWorker.id, selectedWorker.type, 2);
  const startL3 = () => selectedWorker && startDevelopment(selectedTile.id, selectedWorker.id, selectedWorker.type, 3);

  // Enable only the next valid level: if resource is undefined or level is N, only N+1 is enabled
  const currentLevel = selectedTile.resource?.level ?? 0;
  const enableL1 = currentLevel === 0;
  const enableL2 = currentLevel === 1;
  const enableL3 = currentLevel === 2;

  const startDepot = () => selectedWorker && startConstruction(selectedTile.id, selectedWorker.id, "depot");
  const startPort = () => selectedWorker && startConstruction(selectedTile.id, selectedWorker.id, "port");
  const startFort = () => selectedWorker && startConstruction(selectedTile.id, selectedWorker.id, "fort");
  const startRail = () => selectedWorker && startConstruction(selectedTile.id, selectedWorker.id, "rail");

  // Helper: show hints per worker type
  const workerHint = selectedWorker ? `Selected worker: ${selectedWorker.type}` : "Select a worker on this tile to enable actions";

  return (
    <div style={{ padding: "10px", borderLeft: "2px solid #333", minWidth: "220px" }}>
      <h3>Tile Info</h3>
      <p><strong>Terrain:</strong> {selectedTile.terrain}</p>
      <p><strong>River:</strong> {selectedTile.hasRiver ? "Yes" : "No"}</p>
      <p><strong>Resource:</strong> {selectedTile.resource ? `${selectedTile.resource.type} (L${selectedTile.resource.level})` : "None"}</p>
      <p><strong>Owner:</strong> {selectedTile.ownerNationId || "Unclaimed"}</p>
      <p><strong>Workers:</strong> {selectedTile.workers.length > 0 ? selectedTile.workers.map(w => w.type).join(", ") : "None"}</p>

      {/* Prospector action */}
      {selectedTile.prospecting && (
        <div style={{ marginTop: 8, color: "#ffd54f" }}>Prospecting in progress… result next turn</div>
      )}
      {canProspect && (
        <button
          onClick={() => startProspecting(selectedTile.id, selectedWorkerId!)}
          style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, border: "1px solid #666", background: "#333", color: "#fff", cursor: "pointer" }}
        >
          Prospect ⛏️
        </button>
      )}

      {/* Development controls (Farmer/Rancher/Forester/Miner/Driller) */}
      {canStartAnyJob && selectedWorker && DEVELOPMENT_WORKER_TYPES.includes(selectedWorker.type) && (
        <div style={{ marginTop: 10 }}>
          <div style={{ marginBottom: 4 }}><strong>Development:</strong> {workerHint}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={startL1} title="Target Level 1" style={{ padding: "4px 8px", opacity: enableL1 ? 1 : 0.5, cursor: enableL1 ? "pointer" : "not-allowed" }} disabled={!enableL1}>L1</button>
            <button onClick={startL2} title="Target Level 2" style={{ padding: "4px 8px", opacity: enableL2 ? 1 : 0.5, cursor: enableL2 ? "pointer" : "not-allowed" }} disabled={!enableL2}>L2</button>
            <button onClick={startL3} title="Target Level 3" style={{ padding: "4px 8px", opacity: enableL3 ? 1 : 0.5, cursor: enableL3 ? "pointer" : "not-allowed" }} disabled={!enableL3}>L3</button>
          </div>
          {selectedWorker.type === WorkerType.Driller && !oilDrillingTechUnlocked && (
            <div style={{ marginTop: 4, color: "#ffa726" }}>Requires Oil Drilling tech</div>
          )}
        </div>
      )}

      {/* Construction controls (Engineer) */}
      {canStartAnyJob && selectedWorker && selectedWorker.type === WorkerType.Engineer && (
        <div style={{ marginTop: 10 }}>
          <div style={{ marginBottom: 4 }}><strong>Construction:</strong> {workerHint}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={startDepot} style={{ padding: "4px 8px" }}>Depot</button>
            <button onClick={startPort} style={{ padding: "4px 8px" }}>Port</button>
            <button onClick={startFort} style={{ padding: "4px 8px" }}>Fort</button>
            <button onClick={startRail} style={{ padding: "4px 8px" }}>Rail</button>
          </div>
        </div>
      )}

      {/* Development and construction status */}
      {dev && (
        <div style={{ marginTop: 8 }}>
          <strong>Development:</strong> {dev.workerType} → L{dev.targetLevel} ({dev.completed ? "Done" : `~${dev.durationTurns} turns`})
        </div>
      )}
      {con && (
        <div style={{ marginTop: 4 }}>
          <strong>Construction:</strong> {con.kind} ({con.completed ? "Done" : `~${con.durationTurns} turns`})
        </div>
      )}
    </div>
  );
};