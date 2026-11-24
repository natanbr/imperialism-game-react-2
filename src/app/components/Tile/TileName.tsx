import React from 'react';
import styles from './Tile.module.css';
import { NationFlag } from '../NationFlag';
import { nationMark } from '../nationMark';
import { useGameStore } from '@/store/rootStore';

/**
 * A minor nation's name on its capital tile, below the capital icon (FR-153 d). Hidden from assistive
 * technology: the tile's own name already says "Capital, owned by Arvelia" (FR-155).
 */
const TileNameInner: React.FC<{ minorId: string; name: string }> = ({ minorId, name }) => {
  const nations = useGameStore((s) => s.game.nations);
  const minorNations = useGameStore((s) => s.game.minorNations);
  // FR-564: the tag's border in the minor's own colour, as its flag and its dashed border
  return (
    <span className={styles.minorName} data-testid="minor-name" aria-hidden="true" style={{ borderColor: nationMark({ nations, minorNations }, minorId).colour }}>
      <NationFlag nationId={minorId} />
      {name}
    </span>
  );
};

export const TileName = React.memo(TileNameInner);
TileName.displayName = 'TileName';
