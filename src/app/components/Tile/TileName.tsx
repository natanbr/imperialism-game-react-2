import React from 'react';
import styles from './Tile.module.css';
import { NationFlag } from '../NationFlag';

/**
 * A minor nation's name on its capital tile, below the capital icon (FR-153 d). Hidden from assistive
 * technology: the tile's own name already says "Capital, owned by Arvelia" (FR-155).
 */
const TileNameInner: React.FC<{ minorId: string; name: string }> = ({ minorId, name }) => (
  <span className={styles.minorName} data-testid="minor-name" aria-hidden="true">
    <NationFlag nationId={minorId} />
    {name}
  </span>
);

export const TileName = React.memo(TileNameInner);
TileName.displayName = 'TileName';
