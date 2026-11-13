import React from 'react';
import type { MarkerView } from '../army/armyView';
import { UI_ICONS } from '../icons';
import { GameIcon } from '../GameIcon';
import styles from './Tile.module.css';

export interface TileArmyProps {
  /** The markers of this seat tile, the province's owner first. */
  markers: readonly MarkerView[];
  /** Opens the Army screen of the province (FR-211). */
  onOpen: (provinceId: string) => void;
  /** The seat carries a minor's name tag at its bottom (FR-153 d): the markers sit higher, clear of it. */
  high?: boolean;
}

/** The force size on the owner's colour (with the tents), then the militia (with a pitchfork). */
const MarkerBody: React.FC<{ marker: MarkerView }> = ({ marker }) => (
  <>
    {marker.regiments > 0 && (
      <span className={styles.armyForce} data-testid="army-force" style={{ backgroundColor: marker.color }}>
        <GameIcon name={UI_ICONS.army} />
        {marker.forceSize}
      </span>
    )}
    {marker.militia > 0 && (
      <span className={styles.armyMilitia} data-testid="army-militia">
        <GameIcon name={UI_ICONS.militia} />
        {marker.militia}
      </span>
    )}
  </>
);

/**
 * The army markers on a province's seat tile (FR-210; Imp1 encampment tents): one chip per country with regiments
 * there, in its colour, with its force size and its militia count. The player's own is a button that opens the Army
 * screen; another country's is an image, and a click on it is a click on the tile.
 */
const TileArmyInner: React.FC<TileArmyProps> = ({ markers, onOpen, high = false }) => (
  <div className={`${styles.armies} ${high ? styles.armiesHigh : ''}`}>
    {markers.map((marker) => {
      const className = `${styles.armyMarker} ${marker.regiments > 0 && marker.militia > 0 ? '' : styles.armyMarkerSingle}`;
      return marker.own ? (
        <button
          key={marker.ownerId}
          type="button"
          data-testid="army-marker"
          data-owner-id={marker.ownerId}
          className={className}
          style={{ borderColor: marker.color }}
          aria-label={marker.label}
          title={marker.label}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(marker.provinceId);
          }}
        >
          <MarkerBody marker={marker} />
        </button>
      ) : (
        <span
          key={marker.ownerId}
          role="img"
          data-testid="army-marker"
          data-owner-id={marker.ownerId}
          className={className}
          style={{ borderColor: marker.color }}
          aria-label={marker.label}
          title={marker.label}
        >
          <MarkerBody marker={marker} />
        </span>
      );
    })}
  </div>
);

export const TileArmy = React.memo(TileArmyInner);
TileArmy.displayName = 'TileArmy';
