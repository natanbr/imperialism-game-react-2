import React from 'react';
import { Resource } from '@/types/Tile';
import { RESOURCE_ICONS } from '@/constants/gameConstants';
import styles from './Tile.module.css';

export interface TileResourceProps {
  resource: Resource;
}

/**
 * Component to display resource information on a tile
 */
export const TileResource: React.FC<TileResourceProps> = ({ resource }) => {
  const icon = resource.discovered ? RESOURCE_ICONS[resource.type] : '';

  return (
    <div className={styles.resource}>
      {icon && <span className={styles.resourceIcon}>{icon}</span>}
      <span
        className={styles.resourceLevel}
        aria-label={`Development level ${resource.level}`}
      >
        {'🏗️'.repeat(resource.level)}
      </span>
      <span className={styles.resourceLevelText}>(L{resource.level})</span>
    </div>
  );
};
