import React from 'react';
import { DevelopmentJob } from '@/types/jobs/DevelopmentJob';
import { ConstructionJob } from '@/types/jobs/ConstructionJob';
import { UI_ICONS } from '../icons';
import { GameIcon } from '../GameIcon';
import styles from './Tile.module.css';

export interface TileJobsProps {
  prospecting?: { startedOnTurn: number; workerId: string };
  developmentJob?: DevelopmentJob;
  constructionJob?: ConstructionJob;
}

/** Markers for the jobs running on a tile; their titles name them (FR-085). */
const TileJobsInner: React.FC<TileJobsProps> = ({ prospecting, developmentJob, constructionJob }) => {
  if (!prospecting && !developmentJob && !constructionJob) return null;
  return (
    <span className={styles.jobs}>
      {prospecting && (
        <span className={styles.job} title="Prospecting in progress">
          <GameIcon name={UI_ICONS.prospecting} />
        </span>
      )}
      {developmentJob && (
        <span className={styles.job} title="Development in progress">
          <GameIcon name={UI_ICONS.development} />
        </span>
      )}
      {constructionJob && (
        <span className={styles.job} title="Construction in progress">
          <GameIcon name={UI_ICONS.construction} />
        </span>
      )}
    </span>
  );
};

export const TileJobs = React.memo(TileJobsInner);
TileJobs.displayName = 'TileJobs';
