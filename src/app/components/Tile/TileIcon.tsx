import React from 'react';
import type { IconName } from '../icons';
import { GameIcon } from '../GameIcon';
import styles from './Tile.module.css';

export interface TileIconProps {
  name: IconName | null;
  /** Workers or a minor's name tag take the bottom half: the icon moves up and shrinks. */
  crowded: boolean;
}

/** The icon for what the tile holds (`tileIconOf`, FR-085); none on open sea. */
const TileIconInner: React.FC<TileIconProps> = ({ name, crowded }) => {
  if (!name) return null;
  return (
    <span className={`${styles.icon} ${crowded ? styles.iconCrowded : ''}`}>
      <GameIcon name={name} testId="tile-icon" />
    </span>
  );
};

export const TileIcon = React.memo(TileIconInner);
TileIcon.displayName = 'TileIcon';
