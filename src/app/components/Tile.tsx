import React, { useCallback, useMemo } from 'react';
import { countryName, countryOfTile } from '@/engine';
import { useGameStore } from '@/store/rootStore';
import { selectClickCursors, selectSelectedWorkerAndTile, selectTilesCompletedLastTurn } from '@/store/selectors';
import { Tile, TerrainType } from '@/types/Tile';
import { TransportNetwork } from '@/types/Transport';
import { useTileActions } from '@/hooks/useTileActions';
import { useTileVisuals } from '@/hooks/useTileVisuals';
import { useTileClickHandler } from '@/hooks/useTileClickHandler';
import { civilianArt, resourceMarkArt, tileArt } from './art/inkArt';
import { prefetchPictures } from './art/prefetch';
import { tileLabel } from './gameText';
import { NationFlag } from './NationFlag';
import { isLandTerrain } from './map/shoreline';
import {
  TileBase,
  TileIcon,
  TileResource,
  TileInfrastructure,
  TileWorkers,
  TileJobs,
  TileName,
  TileArmy,
  TileFort,
} from './Tile/index';
import type { TrayPlacement } from './Tile/TileWorkers';
import type { MarkerView } from './army/armyView';
import styles from './Tile/Tile.module.css';

interface TileProps {
  tile: Tile;
  fishing?: boolean;
  selectedTileId: string | undefined;
  selectedWorkerId: string | undefined;
  transportNetwork: TransportNetwork;
  /** On a province's seat: its army markers (FR-210); absent elsewhere. */
  armyMarkers?: readonly MarkerView[];
  townMarker?: { label: string; glyph: string };
  /** The map's one Tab stop (FR-369). */
  tabbable?: boolean;
}

/**
 * One map tile: three hooks for the logic (useTileActions, useTileVisuals, useTileClickHandler) and
 * sub-components in Tile/ for what it shows (the art pack's pictures, FR-322 to FR-325). Ownership is not
 * drawn here: MapView draws each nation's territory as a border overlay (FR-087), and the land and sea
 * under the tiles as one ground (FR-321).
 *
 * Props come from MapView, so tiles do not each subscribe to the whole map; React.memo skips tiles
 * whose props did not change.
 */
const TileComponentInner: React.FC<TileProps> = ({
  tile,
  fishing = false,
  selectedTileId,
  selectedWorkerId,
  transportNetwork,
  armyMarkers,
  townMarker,
  tabbable = false,
}) => {
  // Store selectors (only for actions and map reference)
  const selectWorker = useGameStore((s) => s.selectWorker);
  const selectTile = useGameStore((s) => s.selectTile);
  const openArmy = useGameStore((s) => s.openArmy);
  const map = useGameStore((s) => s.game.map);
  const playerId = useGameStore((s) => s.activeNationId);

  // Get selected worker
  const { worker: selectedWorker } = useGameStore(selectSelectedWorkerAndTile);
  const jobJustCompleted = useGameStore((s) => selectTilesCompletedLastTurn(s).has(tile.id));
  // The country the tile belongs to, a Great Power or a minor nation (FR-155)
  const ownerName = useGameStore((s) => {
    const country = countryOfTile(s.game, tile);
    return country ? countryName(s.game, country) : undefined;
  });
  // FR-639: the Great Power that holds this Minor Nation tile, public from the settlement of its purchase (FR-640)
  const holderId = useGameStore((s) => s.game.overseasLand?.[tile.id]?.holderId);
  const holderName = useGameStore((s) => (holderId ? (s.game.nations.find((n) => n.id === holderId)?.name ?? holderId) : undefined));
  // A minor nation's capital carries its name (FR-153 d)
  const minorCapital = useGameStore((s) => s.game.minorNations.find((m) => m.capitalTileId === tile.id));
  // The other nation whose civilians stand here (FR-108); strings, so the subscription stays cheap
  const otherNationName = useGameStore((s) => {
    const id = tile.workers.find((w) => w.nationId !== s.activeNationId)?.nationId;
    return id ? (s.game.nations.find((n) => n.id === id)?.name ?? id) : undefined;
  });

  const isSelected = selectedTileId === tile.id;
  // A civilian of the player is selected elsewhere: a click on one of this tile's civilians selects that one (FR-385)
  const selectedElsewhere = selectedWorkerId && !tile.workers.some((w) => w.id === selectedWorkerId) ? selectedWorker?.type : undefined;

  const possibleAction = useTileActions(tile, selectedWorker, map);
  // FR-379: the cursor follows what the click does first (a job, a construction, rail, a move), one table for the map
  const cursorAction = useGameStore((s) => selectClickCursors(s).get(tile.id) ?? null);
  const tileVisuals = useTileVisuals(cursorAction, isLandTerrain(tile.terrain));
  const handleTileClick = useTileClickHandler(tile, selectedWorker, possibleAction);

  // The stack button opens the tray: the tile selected, no worker (FR-110)
  const openTray = useCallback(() => {
    selectWorker(undefined);
    selectTile(tile.id);
  }, [selectWorker, selectTile, tile.id]);
  // FR-453: picking a civilian here selects this tile too, so Tile Info shows it with its job offers; a deselect (its
  // second click, FR-115) leaves the tile selected
  const pickWorker = useCallback(
    (workerId: string | undefined) => {
      selectWorker(workerId);
      if (workerId !== undefined) selectTile(tile.id);
    },
    [selectWorker, selectTile, tile.id]
  );
  const trayPlacement = useMemo<TrayPlacement>(() => ({
    align: tile.x <= 1 ? 'start' : tile.x >= map.config.cols - 2 ? 'end' : 'center',
    above: tile.y >= map.config.rows - 3,
  }), [tile.x, tile.y, map.config.cols, map.config.rows]);
  // The player's stack: the pointer coming onto the tile starts loading the tray's figures before a click opens it (FR-342)
  const stackArt = useMemo(() => {
    const own = tile.workers.filter((w) => w.nationId === playerId);
    return own.length > 1 ? own.map((w) => civilianArt(w.type)) : undefined;
  }, [tile.workers, playerId]);
  const prefetchStack = useMemo(() => (stackArt ? () => prefetchPictures(stackArt) : undefined), [stackArt]);
  // A capital or town is the tile a player looks for: civilians or a minor's name tag on it draw its picture larger and
  // move the civilians to the corner, so it stays readable (FR-346)
  const crowded =
    (tile.terrain === TerrainType.Capital || tile.terrain === TerrainType.Town) && (tile.workers.length > 0 || minorCapital !== undefined);
  // A depot or a port takes the top-right: the civilians move to the corner, below its drawing; a depot and a port stand
  // side by side along the top, and the level badge and job markers below them (FR-356)
  const station = !!tile.depot || !!tile.port;
  const twoStations = !!tile.depot && !!tile.port;
  // FR-388: the fort the battle counts (FR-203) takes the top-right, or the top-left when a station or a stack's count is
  // there (more than one civilian: a count shows)
  const fortLevel = tile.fortLevel ?? 0;
  const fortRightTaken = station || tile.workers.length > 1;
  // A fort in the top-left would lie over the level badge and the job markers: they move below it, as under two stations
  // (M12 review L2-08). Not on a crowded capital, whose army chips stand low (FR-346); it has no level badge.
  const marksLow = twoStations || (fortLevel > 0 && fortRightTaken && !crowded);

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
      label={fishing ? `${tileLabel(tile, ownerName, holderName)}, fishing ground` : tileLabel(tile, ownerName, holderName)}
      description={townMarker?.label}
      fishing={fishing}
      terrain={tile.terrain}
      hasRiver={tile.hasRiver ?? false}
      besideResourceMark={resourceMarkArt(tile) !== undefined}
      border={tileVisuals.border}
      isSelected={isSelected}
      cursor={tileVisuals.cursor}
      hasJobCompleted={jobJustCompleted}
      onClick={handleTileClick}
      onPointerEnter={prefetchStack}
      tabbable={tabbable}
    >
      <TileIcon src={tileArt(tile)} crowded={crowded} />
      {townMarker && <span aria-hidden="true" className={styles.townMarker} title={townMarker.label}
        data-testid="town-marker">{townMarker.glyph}</span>}
      {minorCapital && <TileName minorId={minorCapital.id} name={minorCapital.name} />}

      {tile.resource && <TileResource resource={tile.resource} low={marksLow} />}

      <TileInfrastructure
        depot={tile.depot ?? false}
        depotActive={depotActive}
        port={tile.port ?? false}
        portActive={portActive}
      />

      {fortLevel > 0 && <TileFort level={fortLevel} rightTaken={fortRightTaken} />}

      {/* FR-639: the holder's flag in its colour and pattern, drawn inline (no picture file, FR-339); the label names it */}
      {holderId && (
        <span className={styles.holdingFlag} data-testid="holding-flag" aria-hidden="true">
          <NationFlag nationId={holderId} />
        </span>
      )}

      <TileWorkers
        workers={tile.workers}
        playerId={playerId}
        otherNationName={otherNationName}
        selectedWorkerId={selectedWorkerId}
        trayOpen={isSelected && !selectedWorkerId}
        trayPlacement={trayPlacement}
        selectedElsewhere={selectedElsewhere}
        onWorkerSelect={pickWorker}
        onOpenTray={openTray}
        corner={crowded || station}
      />

      <TileJobs
        prospecting={tile.prospecting}
        developmentJob={tile.developmentJob}
        constructionJob={tile.constructionJob}
        low={marksLow}
      />

      {armyMarkers && armyMarkers.length > 0 && <TileArmy markers={armyMarkers} onOpen={openArmy} high={minorCapital !== undefined} low={crowded} />}
    </TileBase>
  );
};

export const TileComponent = React.memo(TileComponentInner);
TileComponent.displayName = 'TileComponent';
