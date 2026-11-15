import React from 'react';
import { InkPicture } from '../art/ArtPicture';
import styles from './Tile.module.css';

/** The tile's 40 x 40 content box: the picture fills it, as the art pack's demo draws its map objects. */
const PICTURE_PX = 40;
/** A crowded capital's or town's picture: larger and lifted, so the civilians' button and the army chip leave it readable (FR-346). */
const CROWDED_PX = 48;

export interface TileIconProps {
  /** `tileArt(tile)`; none on water, river and coast (the ground draws them). */
  src: string | undefined;
  /**
   * A capital or town on which civilians or a minor's name tag stand: their 24 px button and the army chip would cover
   * the middle of the whole-box picture, so it is drawn at 48 px, lifted into the gap between the row above's pictures
   * (FR-346).
   */
  crowded?: boolean;
}

/**
 * The pack's picture of what the tile holds (`tileArt`, FR-322), decorative: the tile's name says it (FR-095). It fills
 * the tile below the border and rail overlay and never shrinks or moves for the marks on it, except on a crowded capital
 * or town, the tiles a player looks for (FR-346).
 */
const TileIconInner: React.FC<TileIconProps> = ({ src, crowded = false }) =>
  src ? (
    <InkPicture
      src={src}
      alt=""
      size={crowded ? CROWDED_PX : PICTURE_PX}
      className={crowded ? `${styles.icon} ${styles.iconCrowded}` : styles.icon}
      testId="tile-icon"
    />
  ) : null;

export const TileIcon = React.memo(TileIconInner);
TileIcon.displayName = 'TileIcon';
