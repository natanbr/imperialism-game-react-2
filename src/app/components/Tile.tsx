import React, { useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/rootStore';
import { selectSelectedWorkerAndTile, selectTilesCompletedLastTurn } from '@/store/selectors';
import { Tile } from '@/types/Tile';
import { TransportNetwork } from '@/types/Transport';
import { useTileActions } from '@/hooks/useTileActions';
import { useTileVisuals } from '@/hooks/useTileVisuals';
import { useTileClickHandler } from '@/hooks/useTileClickHandler';
import { tileIconOf } from './icons';
import { tileLabel } from './gameText';
import {
  TileBase,
  TileIcon,
  TileResource,
  TileInfrastructure,
  TileWorkers,
  TileJobs,
} from './Tile/index';
import type { TrayPlacement } from './Tile/TileWorkers';

interface TileProps {
  tile: Tile;
  selectedTileId: string | undefined;
  selectedWorkerId: string | undefined;
  transportNetwork: TransportNetwork;
}

/**
 * One map tile: three hooks for the logic (useTileActions, useTileVisuals, useTileClickHandler) and
 * sub-components in Tile/ for what it shows (FR-085). Ownership is not drawn here: MapView draws
 * each nation's territory as a border overlay (FR-087).
 *
 * Props come from MapView, so tiles do not each subscribe to the whole map; React.memo skips tiles
 * whose props did not change.
 */
const TileComponentInner: React.FC<TileProps> = ({
  tile,
  selectedTileId,
  selectedWorkerId,
  transportNetwork
}) => {
  // Store selectors (only for actions and map reference)
  const selectWorker = useGameStore((s) => s.selectWorker);
  const selectTile = useGameStore((s) => s.selectTile);
  const map = useGameStore((s) => s.game.map);
  const playerId = useGameStore((s) => s.activeNationId);

  // Get selected worker
  const { worker: selectedWorker } = useGameStore(selectSelectedWorkerAndTile);
  const jobJustCompleted = useGameStore((s) => selectTilesCompletedLastTurn(s).has(tile.id));
  const ownerName = useGameStore((s) => (tile.ownerNationId ? s.game.nations.find((n) => n.id === tile.ownerNationId)?.name : undefined));
  // The other nation whose civilians stand here (FR-108); strings, so the subscription stays cheap
  const otherNationName = useGameStore((s) => {
    const id = tile.workers.find((w) => w.nationId !== s.activeNationId)?.nationId;
    return id ? (s.game.nations.find((n) => n.id === id)?.name ?? id) : undefined;
  });

  const isSelected = selectedTileId === tile.id;

  const possibleAction = useTileActions(tile, selectedWorker, map);
  const tileVisuals = useTileVisuals(tile, possibleAction);
  const handleTileClick = useTileClickHandler(tile, selectedWorker, possibleAction);

  // The stack button opens the tray: the tile selected, no worker (FR-110)
  const openTray = useCallback(() => {
    selectWorker(undefined);
    selectTile(tile.id);
  }, [selectWorker, selectTile, tile.id]);
  const trayPlacement = useMemo<TrayPlacement>(() => ({
    align: tile.x <= 1 ? 'start' : tile.x >= map.config.cols - 2 ? 'end' : 'center',
    above: tile.y >= map.config.rows - 3,
  }), [tile.x, tile.y, map.config.cols, map.config.rows]);

  // Compute infrastructure status
  const nationNetwork = tile.ownerNationId
    ? transportNetwork.railroadNetworks?.[tile.ownerNationId]
    : undefined;

  const depotActive = useMemo(() => {
    if (!tile.depot || !nationNetwork) return false;
    const depotNode = nationNetwork.depots.find(
      (d) => d.x === tile.x && d.y === tile.y
    );
    return depotNode?.isActive ?? false;
  }, [tile.depot, tile.x, tile.y, nationNetwork]);

  const portActive = useMemo(() => {
    if (!tile.port || !nationNetwork) return false;
    const portNode = nationNetwork.ports.find(
      (p) => p.x === tile.x && p.y === tile.y
    );
    return portNode?.isActive ?? false;
  }, [tile.port, tile.x, tile.y, nationNetwork]);

  return (
    <TileBase
      tileId={tile.id}
      label={tileLabel(tile, ownerName)}
      terrain={tile.terrain}
      hasRiver={tile.hasRiver ?? false}
      backgroundColor={tileVisuals.terrainColor}
      border={tileVisuals.border}
      isSelected={isSelected}
      cursor={tileVisuals.cursor}
      hasJobCompleted={jobJustCompleted}
      onClick={handleTileClick}
    >
      <TileIcon name={tileIconOf(tile)} crowded={tile.workers.length > 0} />

      {tile.resource && <TileResource resource={tile.resource} />}

      <TileInfrastructure
        depot={tile.depot ?? false}
        depotActive={depotActive}
        port={tile.port ?? false}
        portActive={portActive}
      />

      <TileWorkers
        workers={tile.workers}
        playerId={playerId}
        otherNationName={otherNationName}
        selectedWorkerId={selectedWorkerId}
        trayOpen={isSelected && !selectedWorkerId}
        trayPlacement={trayPlacement}
        onWorkerSelect={selectWorker}
        onOpenTray={openTray}
      />

      <TileJobs
        prospecting={tile.prospecting}
        developmentJob={tile.developmentJob}
        constructionJob={tile.constructionJob}
      />
    </TileBase>
  );
};

export const TileComponent = React.memo(TileComponentInner);
TileComponent.displayName = 'TileComponent';
