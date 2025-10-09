import React from 'react';
import styles from './Tile.module.css';

export interface TileInfrastructureProps {
  depot: boolean;
  depotActive: boolean;
  port: boolean;
  portActive: boolean;
}

/**
 * Component to display infrastructure (depots, ports) on a tile
 */
export const TileInfrastructure: React.FC<TileInfrastructureProps> = ({
  depot,
  depotActive,
  port,
  portActive,
}) => {
  return (
    <>
      {depot && (
        <div className={styles.depot} title="Depot">
          <span>🏬</span>
          <span className={styles.statusIndicator}>
            {depotActive ? '🟢' : '🔴'}
          </span>
        </div>
      )}
      {port && (
        <div className={styles.port} title="Port">
          <span>⚓</span>
          <span className={styles.statusIndicator}>
            {portActive ? '🟢' : '🔴'}
          </span>
        </div>
      )}
    </>
  );
};
