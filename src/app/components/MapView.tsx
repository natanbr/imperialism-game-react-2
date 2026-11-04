import { railLinksOf } from "@/engine";
import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import { useGameStore } from "@/store/rootStore";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TileComponent } from "./Tile";
import { cameraOnCapital } from "./camera";
import { computeRailSegmentsPixels } from "./railSegments";
import { borderPaths, territoryBorderSegments } from "./territoryBorders";
import { TILE_PX } from "@/styles/theme";
import styles from "./MapView.module.css";

export const MapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Extract all selectors at MapView level to prevent re-renders in child tiles
  const cameraX = useGameStore((s) => s.cameraX);
  const cameraY = useGameStore((s) => s.cameraY);
  const setCamera = useGameStore((s) => s.setCamera);
  const map = useGameStore((s) => s.game.map);
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const nations = useGameStore((s) => s.game.nations);
  const transportNetwork = useGameStore((s) => s.game.transportNetwork);

  // The camera is the container's scroll position (FR-083): the browser keeps it inside the map,
  // and the store mirrors it so the Center button and the first view can set it.
  const scrollBy = useCallback((dx: number, dy: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft += dx;
    el.scrollTop += dy;
  }, []);
  useEdgeScroll({ containerRef, onMove: scrollBy });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollLeft !== cameraX) el.scrollLeft = cameraX;
    if (el.scrollTop !== cameraY) el.scrollTop = cameraY;
  }, [cameraX, cameraY]);

  // The first view centres the capital. `data-ready` then tells e2e specs the page is live: the
  // server-rendered map is visible before React handles clicks, and on a screen that holds the whole
  // map (FR-088) the first view no longer scrolls, so "the capital is in view" proves nothing.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { game, activeNationId } = useGameStore.getState();
    const camera = cameraOnCapital(game, activeNationId);
    if (camera) useGameStore.getState().setCamera(camera.x, camera.y);
    setReady(true);
  }, []);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) setCamera(el.scrollLeft, el.scrollTop);
  }, [setCamera]);

  // The rail graph the depot lights use, drawn as it is (FR-079)
  const railSegments = useMemo(() => computeRailSegmentsPixels(railLinksOf({ transportNetwork }), TILE_PX, TILE_PX / 2), [transportNetwork]);
  // Each nation's territory as one outline in its colour (FR-087)
  const borders = useMemo(() => borderPaths(territoryBorderSegments(map, nations)), [map, nations]);
  const overlayWidth = map.config.cols * TILE_PX + TILE_PX / 2; // extra for odd-row shift
  const overlayHeight = map.config.rows * TILE_PX;

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.container} onScroll={onScroll} data-testid="map-scroll" data-ready={ready ? "true" : undefined}>
        <div className={styles.viewport}>
          {map.tiles.map((row, y) => (
            <div key={y} className={`${styles.row} ${y % 2 === 1 ? styles.rowOdd : ''}`}>
              {row.map((tile) => (
                <TileComponent
                  key={tile.id}
                  tile={tile}
                  selectedTileId={selectedTileId}
                  selectedWorkerId={selectedWorkerId}
                  transportNetwork={transportNetwork}
                />
              ))}
            </div>
          ))}

          {/* Territory borders, then the railroad (FR-079) */}
          <svg
            width={overlayWidth}
            height={overlayHeight}
            className={styles.railOverlay}
          >
            {borders.map((b) => (
              <path key={b.nationId} d={b.d} stroke={b.color} className={styles.territoryBorder} data-testid="territory-border" />
            ))}
            {railSegments.map((s, i) => (
              <line
                key={i}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                className={styles.railSegment}
                data-testid="rail-segment"
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};
