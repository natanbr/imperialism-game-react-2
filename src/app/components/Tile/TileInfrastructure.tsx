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

const Station: React.FC<{ kind: 'Depot' | 'Port'; active: boolean }> = ({ kind, active }) => {
  const name = `${kind}: ${active ? 'connected' : 'not connected'}`;
  return (
    <span className={styles.station} role="img" aria-label={name} title={name} data-connected={active ? 'true' : 'false'}>
      <GameIcon name={kind === 'Depot' ? UI_ICONS.depot : UI_ICONS.port} />
      <span className={`${styles.statusDot} ${active ? styles.statusOn : styles.statusOff}`} />
    </span>
  );
};

/**
 * Depots and ports: a filled green dot when connected, a hollow red ring when not, and the state in
 * the title and accessible name, so it does not rest on colour alone (FR-079, FR-085, FR-093).
 */
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
