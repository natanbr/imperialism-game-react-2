import React, { useId, useRef, useState } from 'react';
import { Worker, WorkerType } from '@/types/Workers';
import { UI_ICONS } from '../icons';
import { GameIcon } from '../GameIcon';
import { InkPicture } from '../art/ArtPicture';
import { civilianArt } from '../art/inkArt';
import { prefetchPictures } from '../art/prefetch';
import styles from './Tile.module.css';

/**
 * A civilian's pack figure (FR-325), standing on the bottom of its 24 px target; decorative, the button or marker names
 * the civilian. The pack has no picture of a group, so a group keeps the Game Icon (Q60).
 */
const Figure: React.FC<{ type: WorkerType }> = ({ type }) => (
  <InkPicture src={civilianArt(type)} alt="" size={20} className={styles.workerFigure} />
);

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
   * The type of the player's civilian that is selected and stands on another tile, if any: a click on one of this tile's
   * civilians then selects that one instead, and its button is named "Select <type>" (FR-385; FR-115 sent the selected
   * civilian here); a move onto this tile is a click on the tile outside the buttons.
   */
  selectedElsewhere: WorkerType | undefined;
  /** Selects a civilian; undefined deselects (a click on the selected one, FR-115). */
  onWorkerSelect: (workerId: string | undefined) => void;
  onOpenTray: () => void;
  /**
   * A crowded capital or town, or a tile with a depot or a port: the civilians sit in the content box's corner, off the
   * large picture (FR-346) or below the stations' drawings (FR-356).
   */
  corner?: boolean;
}

/** The name of a civilian button while another civilian is selected: what its click does (FR-385). */
const selectThis = (type: WorkerType) => `Select ${type}`;

const WorkerButton: React.FC<{
  worker: Worker;
  selected: boolean;
  selectedElsewhere: WorkerType | undefined;
  onSelect: (id: string | undefined) => void;
  id?: string;
}> = ({ worker, selected, selectedElsewhere, onSelect, id }) => (
  <button
    type="button"
    id={id}
    data-testid="worker-button"
    data-worker-type={worker.type}
    data-worker-id={worker.id}
    data-nation-id={worker.nationId}
    className={`${styles.workerTarget} ${styles.workerButton} ${selected ? styles.workerButtonSelected : ''}`}
    onClick={(e) => {
      e.stopPropagation();
      onSelect(selected ? undefined : worker.id);
    }}
    title={selectedElsewhere ? selectThis(worker.type) : worker.type}
    aria-label={selectedElsewhere ? selectThis(worker.type) : worker.type}
    aria-pressed={selected}
  >
    <Figure type={worker.type} />
  </button>
);

/**
 * A civilian in the tray (FR-433): its 24 px button with the type written under it ("Prospector"). The text labels the
 * button, so a click on it picks the civilian too; screen readers skip it and hear the button's name (FR-110).
 */
const TrayItem: React.FC<{ worker: Worker; selected: boolean; onSelect: (id: string | undefined) => void }> = ({ worker, selected, onSelect }) => {
  const id = useId();
  return (
    <div className={styles.trayItem}>
      <WorkerButton id={id} worker={worker} selected={selected} selectedElsewhere={undefined} onSelect={onSelect} />
      <label htmlFor={id} className={styles.trayName} data-testid="worker-caption" aria-hidden="true">
        {worker.type.charAt(0).toUpperCase() + worker.type.slice(1)}
      </label>
    </div>
  );
};

/**
 * The civilians on a tile (FR-085, FR-108, FR-110). The player's are 24 px buttons: one civilian is
 * its own button; several are one stack button with their count, and while the tile is selected (and
 * no worker is) a tray beside the tile holds a button for each, its type written under it (FR-433). Another nation's civilians are a
 * marker, not a button: a click on it falls through to the tile, which only shows them.
 * Any tile may hold a stack (FR-115). While a civilian of the player standing elsewhere is selected, a click on a
 * civilian here selects that one ("Select <type>", its figure stays), and a click on the stack opens the tray to pick
 * one, with no order (FR-385); the selected civilian moves or works here by a click on the tile outside the buttons. A
 * click on the selected civilian's own button deselects it.
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
  selectedElsewhere,
  onWorkerSelect,
  onOpenTray,
  corner = false,
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
      <div className={corner ? `${styles.workers} ${styles.workersCorner}` : styles.workers}>
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
            {theirs.length === 1 ? <Figure type={theirs[0].type} /> : <GameIcon name={UI_ICONS.civilians} />}
            {theirs.length > 1 && <span className={styles.count} aria-hidden="true">{theirs.length}</span>}
          </span>
        )}
        {own.length === 1 && (
          <WorkerButton worker={own[0]} selected={own[0].id === selectedWorkerId} selectedElsewhere={selectedElsewhere} onSelect={onWorkerSelect} />
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
              e.stopPropagation();
              setDismissed(false);
              onOpenTray();
            }}
            onKeyDown={closeOnEscape}
            // From the keyboard: the tray's figures start loading before Enter opens it (FR-342; the pointer: Tile.tsx)
            onFocus={() => prefetchPictures(own.map((w) => civilianArt(w.type)))}
          >
            {selectedHere ? <Figure type={selectedHere.type} /> : <GameIcon name={UI_ICONS.civilians} />}
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
            <TrayItem key={worker.id} worker={worker} selected={worker.id === selectedWorkerId} onSelect={pickFromTray} />
          ))}
        </div>
      )}
    </>
  );
};

export const TileWorkers = React.memo(TileWorkersInner);
TileWorkers.displayName = 'TileWorkers';
