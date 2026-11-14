import React from 'react';
import { InkPicture } from '../art/ArtPicture';
import styles from './Tile.module.css';

/** The tile's 40 x 40 content box: the picture fills it, as the art pack's demo draws its map objects. */
const PICTURE_PX = 40;

export interface TileIconProps {
  /** `tileArt(tile)`; none on water, river and coast (the ground draws them). */
  src: string | undefined;
}

/**
 * The pack's picture of what the tile holds (`tileArt`, FR-322), decorative: the tile's name says it (FR-095). It
 * fills the tile below the border and rail overlay and never shrinks or moves; the marks lie over it.
 */
const TileIconInner: React.FC<TileIconProps> = ({ src }) =>
  src ? <InkPicture src={src} alt="" size={PICTURE_PX} className={styles.icon} testId="tile-icon" /> : null;

export const TileIcon = React.memo(TileIconInner);
TileIcon.displayName = 'TileIcon';
