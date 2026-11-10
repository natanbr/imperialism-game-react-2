import React, { useRef, useState } from 'react';
import { Worker } from '@/types/Workers';
import { UI_ICONS, WORKER_ICONS } from '../icons';
import { GameIcon } from '../GameIcon';
import styles from './Tile.module.css';

/** Where the tray opens beside its tile, so it stays on the map near the map's edges. */
export interface TrayPlacement {
  align: 'start' | 'center' | 'end';
  above: boolean;
}

export interface TileWorkersProps {
  workers: Worker[];
  /** The player's nation: only its civilians are buttons (FR-108). */
  playerId: string;
  /** The name of the other nation whose civilians stand here, for their marker's label. */
  otherNationName: string | undefined;
  selectedWorkerId: string | undefined;
  /** The tile is selected and no worker is: the stack's civilians show in the tray (FR-110). */
  trayOpen: boolean;
  trayPlacement: TrayPlacement;
  /**
   * One of the player's civilians is selected and stands on another tile: a click on this tile's
   * civilians is a click on the tile, the selected civilian's order for it (FR-115).
   */
  passClickToTile: boolean;
  /** Selects a civilian; undefined deselects (a click on the selected one, FR-115). */
  onWorkerSelect: (workerId: string | undefined) => void;
  onOpenTray: () => void;
}

const WorkerButton: React.FC<{ worker: Worker; selected: boolean; passClickToTile: boolean; onSelect: (id: string | undefined) => void }> = ({ worker, selected, passClickToTile, onSelect }) => (
  <button
    type="button"
    data-testid="worker-button"
    data-worker-type={worker.type}
    data-worker-id={worker.id}
    data-nation-id={worker.nationId}
    className={`${styles.workerTarget} ${styles.workerButton} ${selected ? styles.workerButtonSelected : ''}`}
    onClick={(e) => {
      if (passClickToTile) return; // the tile handles it
      e.stopPropagation();
      onSelect(selected ? undefined : worker.id);
    }}
    title={worker.type}
    aria-label={worker.type}
    aria-pressed={selected}
  >
    <GameIcon name={WORKER_ICONS[worker.type]} />
  </button>
);

/**
 * The civilians on a tile (FR-085, FR-108, FR-110). The player's are 24 px buttons: one civilian is
 * its own button; several are one stack button with their count, and while the tile is selected (and
 * no worker is) a tray beside the tile holds a button for each. Another nation's civilians are a
 * marker, not a button: a click on it falls through to the tile, which only shows them.
 * Any tile may hold a stack (FR-115). While a civilian of the player standing elsewhere is selected,
 * a click here also falls through to the tile, so the selected civilian moves or works here; a click
 * on the selected civilian's own button deselects it.
 * Keyboard (FR-111): Escape closes the tray, and picking from the tray or closing it puts the focus
 * back on the stack button, so it is not lost when the tray goes.
 */
const TileWorkersInner: React.FC<TileWorkersProps> = ({
  workers,
  playerId,
  otherNationName,
  selectedWorkerId,
  trayOpen,
  trayPlacement,
  passClickToTile,
  onWorkerSelect,
  onOpenTray,
}) => {
  const stackRef = useRef<HTMLButtonElement>(null);
  // Escape hides the tray until it opens again: reset whenever trayOpen changes (React's "adjust
  // state when a prop changes" pattern, no effect needed)
  const [dismissed, setDismissed] = useState(false);
  const [wasOpen, setWasOpen] = useState(trayOpen);
  if (wasOpen !== trayOpen) {
    setWasOpen(trayOpen);
    setDismissed(false);
  }
  if (workers.length === 0) return null;
  const own = workers.filter((w) => w.nationId === playerId);
  const theirs = workers.filter((w) => w.nationId !== playerId);
  const selectedHere = own.find((w) => w.id === selectedWorkerId);
  const theirName = otherNationName ?? theirs[0]?.nationId;
  const showTray = own.length > 1 && trayOpen && !dismissed;
  const closeOnEscape = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape' || !showTray) return;
    e.stopPropagation();
    setDismissed(true);
    stackRef.current?.focus();
  };
  const pickFromTray = (workerId: string | undefined) => {
    onWorkerSelect(workerId);
    stackRef.current?.focus();
  };
  const stackName = selectedHere ? `${own.length} civilians, ${selectedHere.type} selected` : `${own.length} civilians: choose one`;

  return (
    <>
      <div className={styles.workers}>
        {theirs.length > 0 && (
          <span
            className={`${styles.workerTarget} ${styles.workerMarker}`}
            role="img"
            aria-label={theirs.length === 1 ? `${theirName}: ${theirs[0].type}` : `${theirName}: ${theirs.length} civilians`}
            title={theirs.length === 1 ? `${theirName}: ${theirs[0].type}` : `${theirName}: ${theirs.length} civilians`}
            data-testid="worker-marker"
            data-nation-id={theirs[0].nationId}
            data-count={theirs.length}
          >
            <GameIcon name={theirs.length === 1 ? WORKER_ICONS[theirs[0].type] : UI_ICONS.civilians} />
            {theirs.length > 1 && <span className={styles.count} aria-hidden="true">{theirs.length}</span>}
          </span>
        )}
        {own.length === 1 && (
          <WorkerButton worker={own[0]} selected={own[0].id === selectedWorkerId} passClickToTile={passClickToTile} onSelect={onWorkerSelect} />
        )}
        {own.length > 1 && (
          <button
            ref={stackRef}
            type="button"
            data-testid="worker-stack"
            data-nation-id={playerId}
            data-count={own.length}
            data-selected-worker={selectedHere?.type}
            aria-expanded={showTray}
            aria-label={stackName}
            title={stackName}
            className={`${styles.workerTarget} ${styles.workerButton} ${selectedHere ? styles.workerButtonSelected : ''}`}
            onClick={(e) => {
              if (passClickToTile) return; // the tile handles it
              e.stopPropagation();
              setDismissed(false);
              onOpenTray();
            }}
            onKeyDown={closeOnEscape}
          >
            <GameIcon name={selectedHere ? WORKER_ICONS[selectedHere.type] : UI_ICONS.civilians} />
            <span className={styles.count} aria-hidden="true">{own.length}</span>
          </button>
        )}
      </div>
      {showTray && (
        <div
          role="group"
          aria-label="Civilians on this tile"
          data-testid="worker-tray"
          className={[
            styles.tray,
            trayPlacement.align === 'start' ? styles.trayStart : trayPlacement.align === 'end' ? styles.trayEnd : '',
            trayPlacement.above ? styles.trayAbove : '',
          ].join(' ')}
          style={{ gridTemplateColumns: `repeat(${Math.min(4, own.length)}, auto)` }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={closeOnEscape}
        >
          {own.map((worker) => (
            <WorkerButton key={worker.id} worker={worker} selected={worker.id === selectedWorkerId} passClickToTile={false} onSelect={pickFromTray} />
          ))}
        </div>
      )}
    </>
  );
};

export const TileWorkers = React.memo(TileWorkersInner);
TileWorkers.displayName = 'TileWorkers';
