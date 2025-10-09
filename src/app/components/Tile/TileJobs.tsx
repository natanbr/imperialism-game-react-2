import React from 'react';
import { DevelopmentJob } from '@/types/jobs/DevelopmentJob';
import { ConstructionJob } from '@/types/jobs/ConstructionJob';
import styles from './Tile.module.css';

export interface TileJobsProps {
  prospecting?: { startedOnTurn: number; workerId: string };
  developmentJob?: DevelopmentJob;
  constructionJob?: ConstructionJob;
}

/**
 * Component to display job indicators on a tile
 */
export const TileJobs: React.FC<TileJobsProps> = ({
  prospecting,
  developmentJob,
  constructionJob,
}) => {
  return (
    <>
      {prospecting && (
        <div className={styles.jobProspecting} title="Prospecting in progress">
          ⏳
        </div>
      )}
      {developmentJob && !developmentJob.completed && (
        <div className={styles.jobDevelopment} title="Development in progress">
          ⏳
        </div>
      )}
      {constructionJob && !constructionJob.completed && (
        <div className={styles.jobConstruction} title="Construction in progress">
          🛠️
        </div>
      )}
    </>
  );
};
