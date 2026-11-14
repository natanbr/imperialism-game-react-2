import React from 'react';
import { InkPicture } from '../art/ArtPicture';
import { DEPOT_ART, PORT_ART, STATION_ART } from '../art/inkArt';
import styles from './Tile.module.css';

export interface TileInfrastructureProps {
  depot: boolean;
  depotActive: boolean;
  port: boolean;
  portActive: boolean;
  /** The tile shows a level badge at its top-left: two stations side by side would reach it, so they stack (FR-324). */
  besideBadge?: boolean;
}

const Station: React.FC<{ kind: 'Depot' | 'Port'; active: boolean }> = ({ kind, active }) => {
  const name = `${kind}: ${active ? 'connected' : 'not connected'}`;
  return (
    <span className={styles.station} role="img" aria-label={name} title={name} data-connected={active ? 'true' : 'false'}>
      <InkPicture src={kind === 'Depot' ? DEPOT_ART : PORT_ART} alt="" size={14} className={styles.stationPicture} />
      <InkPicture src={active ? STATION_ART.connected : STATION_ART.disconnected} alt="" size={8} className={styles.stationMark} />
    </span>
  );
};

/**
 * Depots and ports: the art pack's pictures along the tile's top edge from the right (the depot rightmost), each with
 * the pack's station mark on its bottom-right, a filled disc when connected and a ring when not, and the state in the
 * title and accessible name, so it does not rest on colour alone (FR-079, FR-093, FR-324).
 */
const TileInfrastructureInner: React.FC<TileInfrastructureProps> = ({ depot, depotActive, port, portActive, besideBadge = false }) => {
  if (!depot && !port) return null;
  const stacked = depot && port && besideBadge;
  return (
    <span className={`${styles.stations} ${stacked ? styles.stationsStacked : ''}`}>
      {depot && <Station kind="Depot" active={depotActive} />}
      {port && <Station kind="Port" active={portActive} />}
    </span>
  );
};

export const TileInfrastructure = React.memo(TileInfrastructureInner);
TileInfrastructure.displayName = 'TileInfrastructure';
