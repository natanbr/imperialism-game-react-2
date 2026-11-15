import React from 'react';
import { Resource } from '@/types/Tile';
import { InkPicture } from '../art/ArtPicture';
import { resourceMarkArt } from '../art/inkArt';
import styles from './Tile.module.css';

export interface TileResourceProps {
  resource: Resource;
  /** The tile holds a depot and a port, side by side along the top: the badge stands below them (FR-356). */
  low?: boolean;
}

/**
 * The resource's level as a small badge, "L1" to "L3", nothing at level 0 (FR-085); and a known mineral's or oil's
 * goods picture as a 16 px mark at the bottom-left, since a mine or an oil well does not say which one it is (FR-323).
 */
const TileResourceInner: React.FC<TileResourceProps> = ({ resource, low = false }) => {
  const mark = resourceMarkArt({ resource });
  return (
    <>
      {mark && <InkPicture src={mark} alt="" size={16} className={styles.resourceMark} testId="resource-mark" />}
      {resource.level > 0 && (
        <span className={low ? `${styles.levelBadge} ${styles.levelBadgeLow}` : styles.levelBadge} data-testid="level-badge" aria-label={`Development level ${resource.level}`}>
          L{resource.level}
        </span>
      )}
    </>
  );
};

export const TileResource = React.memo(TileResourceInner);
TileResource.displayName = 'TileResource';
