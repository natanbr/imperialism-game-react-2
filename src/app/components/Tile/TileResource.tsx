import React from 'react';
import { Resource } from '@/types/Tile';
import styles from './Tile.module.css';

export interface TileResourceProps {
  resource: Resource;
}

/** The resource's level as a small badge, "L1" to "L3"; nothing at level 0 (FR-085). */
const TileResourceInner: React.FC<TileResourceProps> = ({ resource }) => {
  if (resource.level <= 0) return null;
  return (
    <span className={styles.levelBadge} data-testid="level-badge" aria-label={`Development level ${resource.level}`}>
      L{resource.level}
    </span>
  );
};

export const TileResource = React.memo(TileResourceInner);
TileResource.displayName = 'TileResource';
