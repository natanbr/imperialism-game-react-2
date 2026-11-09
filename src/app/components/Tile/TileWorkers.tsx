import React from 'react';
import { Worker } from '@/types/Workers';
import { WORKER_ICONS } from '../icons';
import { GameIcon } from '../GameIcon';
import styles from './Tile.module.css';

export interface TileWorkersProps {
  workers: Worker[];
  selectedWorkerId: string | undefined;
  onWorkerSelect: (workerId: string) => void;
}

/**
 * The workers on a tile, one button each with its Game Icon (FR-085)
 */
const TileWorkersInner: React.FC<TileWorkersProps> = ({
  workers,
  selectedWorkerId,
  onWorkerSelect,
}) => {
  if (workers.length === 0) return null;

  return (
    <div className={styles.workers}>
      {workers.map((worker) => (
        <button
          key={worker.id}
          data-testid="worker-button"
          data-worker-type={worker.type}
          data-worker-id={worker.id}
          data-nation-id={worker.nationId}
          className={`${styles.workerButton} ${
            selectedWorkerId === worker.id ? styles.workerButtonSelected : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onWorkerSelect(worker.id);
          }}
          title={worker.type}
          aria-label={worker.type}
        >
          <GameIcon name={WORKER_ICONS[worker.type]} />
        </button>
      ))}
    </div>
  );
};

export const TileWorkers = React.memo(TileWorkersInner);
TileWorkers.displayName = 'TileWorkers';
