import React, { useEffect } from "react";
import { useGameStore } from "@/store/rootStore";
import styles from "./MapView.module.css";

/** How long the map's status line stays (FR-373); the next map click takes it away sooner. */
export const MAP_STATUS_MS = 6000;

/**
 * The map's status line (FR-373, FR-374): a refused order from a map click, Tile Info or Construction Options, said at the
 * bottom centre of the map area, where the player looks. The live region is always in the page, so a screen reader
 * hears each new line (polite); the line itself shows for 6 seconds.
 */
export const MapStatus: React.FC = () => {
  const status = useGameStore((s) => s.mapStatus);
  const clearMapStatus = useGameStore((s) => s.clearMapStatus);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => {
      // Only this line: a newer one has its own 6 seconds
      if (useGameStore.getState().mapStatus === status) clearMapStatus();
    }, MAP_STATUS_MS);
    return () => window.clearTimeout(timer);
  }, [status, clearMapStatus]);

  return (
    <div className={styles.mapStatus} role="status" aria-live="polite" data-testid="map-status">
      {status && <span className={styles.mapStatusText}>{status.text}</span>}
    </div>
  );
};
