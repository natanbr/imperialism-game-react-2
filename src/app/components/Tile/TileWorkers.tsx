import React from 'react';
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
  onWorkerSelect: (workerId: string) => void;
  onOpenTray: () => void;
}

const WorkerButton: React.FC<{ worker: Worker; selected: boolean; onSelect: (id: string) => void }> = ({ worker, selected, onSelect }) => (
  <button
    type="button"
    data-testid="worker-button"
    data-worker-type={worker.type}
    data-worker-id={worker.id}
    data-nation-id={worker.nationId}
    className={`${styles.workerTarget} ${styles.workerButton} ${selected ? styles.workerButtonSelected : ''}`}
    onClick={(e) => {
      e.stopPropagation();
      onSelect(worker.id);
    }}
    title={worker.type}
    aria-label={worker.type}
  >
    <GameIcon name={WORKER_ICONS[worker.type]} />
  </button>
);

/**
 * The civilians on a tile (FR-085, FR-108, FR-110). The player's are 24 px buttons: one civilian is
 * its own button; several are one stack button with their count, and while the tile is selected (and
 * no worker is) a tray beside the tile holds a button for each. Another nation's civilians are a
 * marker, not a button: a click on it falls through to the tile, which only shows them.
 */
const TileWorkersInner: React.FC<TileWorkersProps> = ({
  workers,
  playerId,
  otherNationName,
  selectedWorkerId,
  trayOpen,
  trayPlacement,
  onWorkerSelect,
  onOpenTray,
}) => {
  if (workers.length === 0) return null;
  const own = workers.filter((w) => w.nationId === playerId);
  const theirs = workers.filter((w) => w.nationId !== playerId);
  const selectedHere = own.find((w) => w.id === selectedWorkerId);
  const theirName = otherNationName ?? theirs[0]?.nationId;
  const showTray = own.length > 1 && trayOpen;

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
        {own.length === 1 && <WorkerButton worker={own[0]} selected={own[0].id === selectedWorkerId} onSelect={onWorkerSelect} />}
        {own.length > 1 && (
          <button
            type="button"
            data-testid="worker-stack"
            data-nation-id={playerId}
            data-count={own.length}
            data-selected-worker={selectedHere?.type}
            aria-expanded={showTray}
            aria-label={`${own.length} civilians: choose one`}
            title={selectedHere ? `${own.length} civilians, ${selectedHere.type} selected` : `${own.length} civilians: choose one`}
            className={`${styles.workerTarget} ${styles.workerButton} ${selectedHere ? styles.workerButtonSelected : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenTray();
            }}
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
        >
          {own.map((worker) => (
            <WorkerButton key={worker.id} worker={worker} selected={worker.id === selectedWorkerId} onSelect={onWorkerSelect} />
          ))}
        </div>
      )}
    </>
  );
};

export const TileWorkers = React.memo(TileWorkersInner);
TileWorkers.displayName = 'TileWorkers';
