import React from 'react';
import { FortPicture } from '../art/ArtPicture';
import styles from './Tile.module.css';

export interface TileFortProps {
  /** The fort the battle counts (`tile.fortLevel`, FR-203), 1 or more. */
  level: number;
  /**
   * The top-right is taken: a depot or a port stands there (FR-356), or a stack's count reaches into it. The mark then
   * takes the top-left, which a crowded capital leaves free (its army chips stand low, FR-346).
   */
  rightTaken: boolean;
}

/**
 * A fort on the map (FR-388, card Q88): the pack's fort as a 16 px mark in a top corner, its level in its title ("Fort
 * level 1"), not in the tile's name (FR-095); the picture is decoration (alt ""), so a screen reader hears the tile only.
 */
const TileFortInner: React.FC<TileFortProps> = ({ level, rightTaken }) => (
  <span
    className={`${styles.fortMark} ${rightTaken ? styles.fortMarkLeft : styles.fortMarkRight}`}
    data-testid="fort-mark"
    data-fort-level={level}
    title={`Fort level ${level}`}
  >
    <FortPicture level={level} size={16} className={styles.fortPicture} />
  </span>
);

export const TileFort = React.memo(TileFortInner);
TileFort.displayName = 'TileFort';
