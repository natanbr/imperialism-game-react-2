import React from 'react';
import { InkPicture } from '../art/ArtPicture';
import { DEPOT_ART, PORT_ART, STATION_ART } from '../art/inkArt';
import styles from './Tile.module.css';

export interface TileInfrastructureProps {
  depot: boolean;
  depotActive: boolean;
  port: boolean;
  portActive: boolean;
}

/** The station's picture and its state mark (FR-347): readable at 1x. */
const STATION_PX = 20;
const MARK_PX = 11;

const Station: React.FC<{ kind: 'Depot' | 'Port'; active: boolean }> = ({ kind, active }) => {
  const name = `${kind}: ${active ? 'connected' : 'not connected'}`;
  return (
    <span className={styles.station} role="img" aria-label={name} title={name} data-connected={active ? 'true' : 'false'}>
      <InkPicture src={kind === 'Depot' ? DEPOT_ART : PORT_ART} alt="" size={STATION_PX} className={styles.stationPicture} />
      <InkPicture src={active ? STATION_ART.connected : STATION_ART.disconnected} alt="" size={MARK_PX} className={styles.stationMark} />
    </span>
  );
};

/**
 * Depots and ports: the art pack's pictures at 20 px in the tile's top-right corner (a depot and a port stacked, the depot
 * on top), each with the pack's station mark at 11 px on its top-right, a filled disc when connected and a ring when not,
 * and the state in the title and accessible name, so it does not rest on colour alone (FR-079, FR-093, FR-347).
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
