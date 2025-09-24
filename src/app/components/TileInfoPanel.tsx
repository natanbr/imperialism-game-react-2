<<<<<<< HEAD
=======
<<<<<<< HEAD
import { Tile } from "@/types/Tile";
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
import { Tile } from "@/types/Tile";
import React from "react";

interface TileInfoPanelProps {
  selectedTile: Tile | undefined;
}

export const TileInfoPanel: React.FC<TileInfoPanelProps> = ({ selectedTile }) => {
<<<<<<< HEAD
=======
=======
import { Tile, TerrainType } from "@/types/Tile";
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
import React from "react";

interface TileInfoPanelProps {
  selectedTile: Tile | undefined;
}

export const TileInfoPanel: React.FC<TileInfoPanelProps> = ({ selectedTile }) => {
<<<<<<< HEAD
=======
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const startProspecting = useGameStore((s) => s.startProspecting);
  const startDevelopment = useGameStore((s) => s.startDevelopment);
  const startConstruction = useGameStore((s) => s.startConstruction);
  const oilDrillingTechUnlocked = useGameStore((s) => s.technologyState.oilDrillingTechUnlocked);
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)

  if (!selectedTile) {
    return <div style={{ padding: "10px" }}>No tile selected</div>;
  }

<<<<<<< HEAD
=======
<<<<<<< HEAD
  // For now, lookup from mockMap
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
  // For now, lookup from mockMap

  if (!selectedTile) return <div style={{ padding: "10px" }}>Tile not found</div>;

  return (
    <div style={{ padding: "10px", borderLeft: "2px solid #333", minWidth: "200px" }}>
<<<<<<< HEAD
=======
=======
  const terrainAllowsProspecting = PROSPECTABLE_TERRAIN_TYPES.includes(selectedTile.terrain);
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)

  if (!selectedTile) return <div style={{ padding: "10px" }}>Tile not found</div>;

  return (
<<<<<<< HEAD
    <div style={{ padding: "10px", borderLeft: "2px solid #333", minWidth: "200px" }}>
=======
    <div style={{ padding: "10px", borderLeft: "2px solid #333", minWidth: "220px" }}>
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
      <h3>Tile Info</h3>
      <p><strong>Terrain:</strong> {selectedTile.terrain}</p>
      <p><strong>River:</strong> {selectedTile.hasRiver ? "Yes" : "No"}</p>
      <p><strong>Resource:</strong> {selectedTile.resource ? `${selectedTile.resource.type} (L${selectedTile.resource.level})` : "None"}</p>
      <p><strong>Owner:</strong> {selectedTile.ownerNationId || "Unclaimed"}</p>
      <p><strong>Workers:</strong> {selectedTile.workers.length > 0 ? selectedTile.workers.map(w => w.type).join(", ") : "None"}</p>
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======

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
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
    </div>
  );
};