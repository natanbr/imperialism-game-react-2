import { Tile } from "@/types/Tile";
import React from "react";
import { useGameStore } from "../store/rootStore";
import { Worker, WorkerStatus, WorkerType } from "@/types/Workers";
import { PROSPECTABLE_TERRAIN_TYPES } from "../definisions/terrainDefinitions";
import { DEVELOPMENT_WORKER_TYPES } from "../definisions/workerDefinitions";
import { canBuildRailAt } from "@/engine/map/mapHelpers";
import { countryName, countryOfTile, isMinorNation, provinceOf } from "@/engine";
import { PROSPECT_COST, DEVELOPMENT_COST, CONSTRUCTION_COST } from "@/definisions/workPrices";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import { ConstructionKind } from "@/types/jobs/ConstructionJob";
import { commodityName, TERRAIN_TEXT, workerJobLabel } from "./gameText";
import { UI_ICONS, WORKER_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { THEME } from "@/styles/theme";

interface TileInfoPanelProps {
  selectedTile: Tile | undefined;
}

const WorkerStatusIndicator: React.FC<{ status: WorkerStatus }> = ({ status }) => {
  const color = {
    [WorkerStatus.Available]: THEME.good,
    [WorkerStatus.Moved]: THEME.warn,
    [WorkerStatus.Working]: THEME.bad,
  }[status];

  return <span style={{ marginRight: 8, color }}>●</span>;
};

/**
 * The selected tile in the HUD. On the player's land it offers the selected civilian's jobs; another
 * country's tile, a Great Power's or a minor nation's, is shown read-only, with no control that builds
 * an order (FR-108, FR-155). On a world with provinces it names a Great Power tile's province (FR-155, FR-235).
 */
export const TileInfoPanel: React.FC<TileInfoPanelProps> = ({ selectedTile }) => {
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const setSelectedWorkerId = useGameStore((s) => s.setSelectedWorkerId);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const map = useGameStore((s) => s.game.map);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const activeNation = useGameStore((s) => s.game.nations.find(n => n.id === s.activeNationId));
  const game = useGameStore((s) => s.game);

  if (!selectedTile) {
    return <div style={{ padding: "10px" }}>No tile selected</div>;
  }

  // The country the tile belongs to, a Great Power or a minor nation, and its province (FR-155)
  const countryId = countryOfTile(game, selectedTile);
  const ownerName = countryId ? (countryName(game, countryId) ?? countryId) : undefined;
  const minor = countryId !== undefined && isMinorNation(game, countryId);
  const province = provinceOf(game, selectedTile.id);
  const isTheirs = countryId !== undefined && countryId !== activeNationId;
  const ownerText = !ownerName ? "Unclaimed" : minor ? `${ownerName} (minor nation)` : `${ownerName}${countryId === activeNationId ? " (you)" : ""}`;
  const resource = selectedTile.resource;
  const resourceText = !resource
    ? "None"
    : resource.discovered === false
      ? "Not yet prospected"
      : `${commodityName(resource.type)} (L${resource.level})`;

  const handleCancelAction = (workerId: string) => {
    if (window.confirm("Are you sure you want to cancel this action?")) {
      submitOrder({ kind: "cancelWorkerAction", nationId: activeNationId, workerId, tileId: selectedTile.id });
    }
  };
  const startProspecting = (workerId: string) =>
    submitOrder({ kind: "startProspecting", nationId: activeNationId, workerId, tileId: selectedTile.id });
  const startDevelopment = (workerId: string) =>
    submitOrder({ kind: "startDevelopment", nationId: activeNationId, workerId, tileId: selectedTile.id });
  const startConstruction = (workerId: string, structure: ConstructionKind) =>
    submitOrder({ kind: "startConstruction", nationId: activeNationId, workerId, tileId: selectedTile.id, structure });

  const renderWorkerActions = (worker: Worker) => {
    if (worker.status !== WorkerStatus.Available) return null;

    if (worker.type === WorkerType.Prospector) {
      const canProspect = !selectedTile.prospecting && (activeNation?.treasury ?? 0) >= PROSPECT_COST && PROSPECTABLE_TERRAIN_TYPES.includes(selectedTile.terrain);
      if (canProspect) {
        return <button onClick={() => startProspecting(worker.id)} title={`Cost: $${PROSPECT_COST}`} className="btn btn-action"><GameIcon name={UI_ICONS.prospecting} /> Prospect</button>;
      }
    }

    if (DEVELOPMENT_WORKER_TYPES.includes(worker.type)) {
      const treasury = activeNation?.treasury ?? 0;
      const resource = selectedTile.resource;

      // Check if resource exists and is discovered
      const hasDiscoveredResource = resource && resource.discovered !== false;
      const currentLevel = resource?.level ?? 0;
      const nextLevel = (currentLevel + 1) as 1 | 2 | 3;

      if (nextLevel > 3) return null;

      const canAfford = treasury >= DEVELOPMENT_COST[nextLevel];
      const isEnabled = hasDiscoveredResource && canAfford;
      const jobLabel = `Develop ${worker.type} L${nextLevel}`;

      // Determine the title message
      let titleMessage = `${jobLabel} ($${DEVELOPMENT_COST[nextLevel]})`;
      if (!hasDiscoveredResource) {
        titleMessage = "Resource not discovered - use Prospector first";
      } else if (!canAfford) {
        titleMessage = `Not enough funds (need $${DEVELOPMENT_COST[nextLevel]})`;
      }

      return (
        <button
            onClick={() => startDevelopment(worker.id)}
            title={titleMessage}
            disabled={!isEnabled}
            className="btn btn-action">
          {jobLabel}
        </button>
      );
    }

    if (worker.type === WorkerType.Engineer) {
      const [tx, ty] = parseTileIdToArray(selectedTile.id);
      const railAllowed = canBuildRailAt(map, tx, ty, activeNationId);

      const canAfford = (kind: ConstructionKind) => (activeNation?.treasury ?? 0) >= CONSTRUCTION_COST[kind];

      return (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {!selectedTile.depot && <button onClick={() => startConstruction(worker.id, "depot")} disabled={!canAfford('depot')} className="btn btn-action">Construct Depot</button>}
          {!selectedTile.port && <button onClick={() => startConstruction(worker.id, "port")} disabled={!canAfford('port')} className="btn btn-action">Construct Port</button>}
          {<button onClick={() => startConstruction(worker.id, "fort")} disabled={!canAfford('fort')} className="btn btn-action">Construct Fort</button>}
          {!selectedTile.connected && <button onClick={() => startConstruction(worker.id, "rail")} disabled={!railAllowed || !canAfford('rail')} className="btn btn-action">Construct Rail</button>}
        </div>
      );
    }

    return null;
  };

  return (
    <div data-testid="tile-info" style={{ padding: "8px 0", borderTop: `1px solid ${THEME.line}` }}>
      <h3>Tile Info</h3>
      <p><strong>Terrain:</strong> {TERRAIN_TEXT[selectedTile.terrain] ?? selectedTile.terrain}</p>
      <p><strong>River:</strong> {selectedTile.hasRiver ? "Yes" : "No"}</p>
      <p><strong>Resource:</strong> {resourceText}</p>
      <p data-testid="tile-owner">
        <strong>Owner:</strong> {ownerText}
      </p>
      {/* A minor is one province named after it, so its tile skips the line (FR-235) */}
      {province && !minor && (
        <p data-testid="tile-province">
          <strong>Province:</strong> {province.name}
        </p>
      )}
      {isTheirs && (
        <p className="tile-note">
          {minor
            ? `${ownerName} is a minor nation: you can watch its land, not give orders here.`
            : `${ownerName}'s land: you can watch it, not give orders here.`}
        </p>
      )}

      <div style={{ marginTop: 12 }}>
        <strong>Workers on Tile:</strong>
        {selectedTile.workers.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, marginTop: 4 }}>
            {selectedTile.workers.map(w => {
              // Only the player's civilians can be picked and given orders (FR-108)
              const own = w.nationId === activeNationId;
              return (
              <li key={w.id}
                onClick={own ? () => setSelectedWorkerId(w.id) : undefined}
                style={{ background: own && selectedWorkerId === w.id ? THEME.surfaceSunken : 'transparent', padding: '4px', borderRadius: '4px', cursor: own ? 'pointer' : 'default' }}>
                <WorkerStatusIndicator status={w.status} />
                <GameIcon name={WORKER_ICONS[w.type]} /> <span>{w.type} - {workerJobLabel(selectedTile, w) ?? w.status}</span>
                {own && (w.status === WorkerStatus.Moved || w.status === WorkerStatus.Working) && (
                  <button
                    onClick={() => handleCancelAction(w.id)}
                    className="btn btn-danger"
                    style={{ marginLeft: 8, padding: '4px 8px', fontSize: 11, width: 'auto' }}>
                    Cancel
                  </button>
                )}
                {own && selectedWorkerId === w.id && renderWorkerActions(w)}
              </li>
              );
            })}
          </ul>
        ) : (
          <p>None</p>
        )}
      </div>
    </div>
  );
};