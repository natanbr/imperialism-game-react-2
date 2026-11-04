import React from 'react';
import { UI_ICONS } from '../icons';
import { GameIcon } from '../GameIcon';
import styles from './Tile.module.css';

export interface TileInfrastructureProps {
  depot: boolean;
  depotActive: boolean;
  port: boolean;
  portActive: boolean;
}

const Station: React.FC<{ kind: 'Depot' | 'Port'; active: boolean }> = ({ kind, active }) => (
  <span className={styles.station} title={kind} data-connected={active ? 'true' : 'false'}>
    <GameIcon name={kind === 'Depot' ? UI_ICONS.depot : UI_ICONS.port} />
    <span className={`${styles.statusDot} ${active ? styles.statusOn : styles.statusOff}`} />
  </span>
);

/** Depots and ports, each with a green dot when connected and a red one when not (FR-079, FR-085). */
const TileInfrastructureInner: React.FC<TileInfrastructureProps> = ({ depot, depotActive, port, portActive }) => {
  if (!depot && !port) return null;
  return (
    <span className={styles.stations}>
      {depot && <Station kind="Depot" active={depotActive} />}
      {port && <Station kind="Port" active={portActive} />}
    </span>
  );
};

export const TileInfrastructure = React.memo(TileInfrastructureInner);
TileInfrastructure.displayName = 'TileInfrastructure';
