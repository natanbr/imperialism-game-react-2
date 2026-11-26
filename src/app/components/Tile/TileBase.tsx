import React from 'react';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { InkPicture } from '../art/ArtPicture';
import { COAL_FISH_ATLAS, SELECTION_ART, goodsArt } from '../art/inkArt';
import { GameIcon } from '../GameIcon';
import styles from './Tile.module.css';

export interface TileBaseProps {
  tileId: string;
  /** The accessible name (FR-095); not drawn */
  label: string;
  description?: string;
  terrain: TerrainType;
  hasRiver: boolean;
  fishing?: boolean;
  /** The tile shows a resource mark at its bottom-left (FR-323): the river marker moves beside it. */
  besideResourceMark: boolean;
  border: string;
  isSelected: boolean;
  cursor: string;
  hasJobCompleted: boolean;
  onClick: () => void;
  /** The pointer comes onto the tile: loads what a click may show next (FR-342); absent on most tiles. */
  onPointerEnter?: () => void;
  /** The map's one Tab stop (FR-369): the selected tile, the focused one, or the capital. */
  tabbable?: boolean;
  children?: React.ReactNode;
}

/**
 * The tile's faint grid line (FR-087) over the map's ground (FR-321: no colour of its own); the selected tile adds the
 * art pack's corner brackets (FR-326) as an element of its own, drawn above the territory borders and rail (FR-110).
 */
const TileBaseInner: React.FC<TileBaseProps> = ({
  tileId,
  label,
  description,
  terrain,
  hasRiver,
  fishing,
  besideResourceMark,
  border,
  isSelected,
  cursor,
  hasJobCompleted,
  onClick,
  onPointerEnter,
  tabbable = false,
  children,
}) => {
  return (
    <div
      data-testid="tile"
      data-tile-id={tileId}
      role="group"
      aria-label={label}
      aria-describedby={description ? `town-seat-${tileId}` : undefined}
      title={description}
      data-terrain={terrain}
      data-selected={isSelected ? 'true' : undefined}
      className={`${styles.tile} ${hasJobCompleted ? styles.tileJobCompleted : ''}`}
      style={{ border, cursor }}
      tabIndex={tabbable ? 0 : undefined}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
    >
      {description && <span id={`town-seat-${tileId}`} hidden>{description}</span>}
      {isSelected && (
        <span className={styles.selectionRing} data-testid="selection-ring" aria-hidden="true">
          <InkPicture src={SELECTION_ART.url} alt="" width={SELECTION_ART.width} height={SELECTION_ART.height} className={styles.selectionMark} />
        </span>
      )}
      {fishing && (
        <InkPicture src={goodsArt(ResourceType.Fish)} sheet={COAL_FISH_ATLAS} alt="" title="Fishing ground"
          size={20} className={`${styles.fishing} ${styles.rightFrame}`} testId="fishing-ground" />
      )}
      {hasRiver && (
        <span className={`${styles.river} ${besideResourceMark ? styles.riverBesideMark : ''}`} title="River">
          <GameIcon name="GiRiver" />
        </span>
      )}
      {children}
    </div>
  );
};

export const TileBase = React.memo(TileBaseInner);
TileBase.displayName = 'TileBase';
