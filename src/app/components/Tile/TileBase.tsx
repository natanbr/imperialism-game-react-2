import React from 'react';
import { TerrainType } from '@/types/Tile';
import styles from './Tile.module.css';

export interface TileBaseProps {
  terrain: TerrainType;
  hasRiver: boolean;
  backgroundColor: string;
  borderColor: string;
  borderWidth: string;
  cursor: string;
  hasJobCompleted: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

/**
 * Base tile component that renders the terrain background and border
 */
export const TileBase: React.FC<TileBaseProps> = ({
  terrain,
  hasRiver,
  backgroundColor,
  borderColor,
  borderWidth,
  cursor,
  hasJobCompleted,
  onClick,
  children,
}) => {
  return (
    <div
      className={`${styles.tile} ${hasJobCompleted ? styles.tileJobCompleted : ''}`}
      style={{
        backgroundColor,
        border: `${borderWidth} solid ${borderColor}`,
        cursor,
      }}
      onClick={onClick}
    >
      <div className={styles.terrainLabel}>{terrain}</div>
      {hasRiver && <div className={styles.riverIcon}>🌊</div>}
      {children}
    </div>
  );
};
