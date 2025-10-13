import React from 'react';
import { Worker } from '@/types/Workers';
import { WORKER_ICONS } from '@/constants/gameConstants';
import styles from './Tile.module.css';

export interface TileWorkersProps {
  workers: Worker[];
  selectedWorkerId: string | undefined;
  onWorkerSelect: (workerId: string) => void;
}

/**
 * Component to display workers on a tile
 */
export const TileWorkers: React.FC<TileWorkersProps> = ({
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
          className={`${styles.workerButton} ${
            selectedWorkerId === worker.id ? styles.workerButtonSelected : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onWorkerSelect(worker.id);
          }}
          title={worker.type}
        >
          {WORKER_ICONS[worker.type]}
        </button>
      ))}
    </div>
  );
};
