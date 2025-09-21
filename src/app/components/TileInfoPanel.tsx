import { Tile, TerrainType } from "@/types/Tile";
import React from "react";
import { useGameStore } from "../store/rootStore";
import { WorkerType } from "@/types/Workers";

interface TileInfoPanelProps {
  selectedTile: Tile | undefined;
}   

export const TileInfoPanel: React.FC<TileInfoPanelProps> = ({ selectedTile }) => {
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const startProspecting = useGameStore((s) => s.startProspecting);
  const startDevelopment = useGameStore((s) => s.startDevelopment);
  const startConstruction = useGameStore((s) => s.startConstruction);
  const oilDrillingTechUnlocked = useGameStore((s) => s.oilDrillingTechUnlocked);

  if (!selectedTile) {
    return <div style={{ padding: "10px" }}>No tile selected</div>;
  }

  const terrainAllowsProspecting = [
    TerrainType.BarrenHills,
    TerrainType.Mountains,
    TerrainType.Swamp,
    TerrainType.Desert,
    TerrainType.Tundra,
  ].includes(selectedTile.terrain);

  const prospectorOnTile = selectedTile.workers.find(w => w.id === selectedWorkerId && w.type === WorkerType.Prospector);
  const canProspect = !!prospectorOnTile && terrainAllowsProspecting && !selectedTile.prospecting;

  // New workers: show simple status if a job is running
  const dev = selectedTile.developmentJob;
  const con = selectedTile.constructionJob;

  // Controls: allow starting development/construction using the selected worker
  const selectedWorker = selectedTile.workers.find(w => w.id === selectedWorkerId);
  const canStartAnyJob = !!selectedWorker && !dev && !con && !selectedTile.prospecting;

  const startL1 = () => selectedWorker && startDevelopment(selectedTile.id, selectedWorker.id, selectedWorker.type as any, 1);
  const startL2 = () => selectedWorker && startDevelopment(selectedTile.id, selectedWorker.id, selectedWorker.type as any, 2);
  const startL3 = () => selectedWorker && startDevelopment(selectedTile.id, selectedWorker.id, selectedWorker.type as any, 3);

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
      {canStartAnyJob && selectedWorker && [WorkerType.Farmer, WorkerType.Rancher, WorkerType.Forester, WorkerType.Miner, WorkerType.Driller].includes(selectedWorker.type as any) && (
        <div style={{ marginTop: 10 }}>
          <div style={{ marginBottom: 4 }}><strong>Development:</strong> {workerHint}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={startL1} title="Target Level 1" style={{ padding: "4px 8px" }}>L1</button>
            <button onClick={startL2} title="Target Level 2" style={{ padding: "4px 8px" }}>L2</button>
            <button onClick={startL3} title="Target Level 3" style={{ padding: "4px 8px" }}>L3</button>
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