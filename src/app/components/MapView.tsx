import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import { useGameStore } from "@/store/rootStore";
import React, { useMemo, useRef } from "react";
import { TileComponent } from "./Tile";
import { computeRailSegmentsPixels } from "./railSegments";
import styles from "./MapView.module.css";

export const MapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Extract all selectors at MapView level to prevent re-renders in child tiles
  const cameraX = useGameStore((s) => s.cameraX);
  const cameraY = useGameStore((s) => s.cameraY);
  const moveCamera = useGameStore((s) => s.moveCamera);
  const map = useGameStore((s) => s.game.map);
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const nations = useGameStore((s) => s.game.nations);
  const transportNetwork = useGameStore((s) => s.game.transportNetwork);

  useEdgeScroll({ containerRef, onMove: moveCamera });

  // Compute rail segments in pixel coordinates for overlay rendering
  const railSegments = useMemo(() => computeRailSegmentsPixels(map, 100, 50), [map]);
  const overlayWidth = map.config.cols * 100 + 50; // extra for odd-row shift
  const overlayHeight = map.config.rows * 100;

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.container}>
        <div
          className={styles.viewport}
          style={{
            transform: `translate(${-cameraX}px, ${-cameraY}px)`,
          }}
        >
          {map.tiles.map((row, y) => (
            <div key={y} className={`${styles.row} ${y % 2 === 1 ? styles.rowOdd : ''}`}>
              {row.map((tile) => (
                <TileComponent
                  key={tile.id}
                  tile={tile}
                  selectedTileId={selectedTileId}
                  selectedWorkerId={selectedWorkerId}
                  nations={nations}
                  transportNetwork={transportNetwork}
                />
              ))}
            </div>
          ))}

          {/* Railroad overlay */}
          <svg
            width={overlayWidth}
            height={overlayHeight}
            className={styles.railOverlay}
          >
            {railSegments.map((s, i) => (
              <line
                key={i}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                className={styles.railSegment}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};
