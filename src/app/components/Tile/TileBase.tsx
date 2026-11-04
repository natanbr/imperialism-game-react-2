import React from 'react';
import { TerrainType } from '@/types/Tile';
import { GameIcon } from '../GameIcon';
import styles from './Tile.module.css';

export interface TileBaseProps {
  tileId: string;
  /** The accessible name (FR-095); not drawn */
  label: string;
  terrain: TerrainType;
  hasRiver: boolean;
  backgroundColor: string;
  border: string;
  boxShadow: string | undefined;
  isSelected: boolean;
  cursor: string;
  hasJobCompleted: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

/**
 * The tile's faint terrain tint and grid line (FR-086); the selected tile adds the accent ring (FR-087).
 */
const TileBaseInner: React.FC<TileBaseProps> = ({
  tileId,
  label,
  terrain,
  hasRiver,
  backgroundColor,
  border,
  boxShadow,
  isSelected,
  cursor,
  hasJobCompleted,
  onClick,
  children,
}) => {
  return (
    <div
      data-testid="tile"
      data-tile-id={tileId}
      role="group"
      aria-label={label}
      data-terrain={terrain}
      data-selected={isSelected ? 'true' : undefined}
      className={`${styles.tile} ${hasJobCompleted ? styles.tileJobCompleted : ''}`}
      style={{ backgroundColor, border, boxShadow, cursor }}
      onClick={onClick}
    >
      {hasRiver && (
        <span className={styles.river} title="River">
          <GameIcon name="GiRiver" />
        </span>
      )}
      {children}
    </div>
  );
};

export const TileBase = React.memo(TileBaseInner);
TileBase.displayName = 'TileBase';
