import { railLinksOf } from "@/engine";
import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import { useGameStore } from "@/store/rootStore";
import { selectArmyMarkersBySeat } from "@/store/selectors";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TileComponent } from "./Tile";
import { cameraOnCapital } from "./camera";
import { computeRailSegmentsPixels } from "./railSegments";
import {
  borderPaths,
  minorBorderPaths,
  minorBorderSegments,
  provinceBorderPaths,
  provinceBorderSegments,
  territoryBorderSegments,
} from "./territoryBorders";
import { THEME, TILE_PX } from "@/styles/theme";
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
  const provinces = useGameStore((s) => s.game.provinces);
  const minorNations = useGameStore((s) => s.game.minorNations);
  const transportNetwork = useGameStore((s) => s.game.transportNetwork);
  // Each seat tile's army markers (FR-210); every other tile gets none, so its props stay the same
  const armyMarkers = useGameStore(selectArmyMarkersBySeat);

  // The camera is the container's scroll position (FR-083): the browser keeps it inside the map,
  // and the store mirrors it so the Center button and the first view can set it.
  const scrollBy = useCallback((dx: number, dy: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft += dx;
    el.scrollTop += dy;
  }, []);
  useEdgeScroll({ containerRef, onMove: scrollBy });

  // A layout effect, so the scroll lands in the same commit as the camera (and as `data-ready`), before
  // anything can read the page (FR-091). `cameraMoves` re-runs it when Center asks for the camera the
  // store already holds (FR-092).
  const cameraMoves = useGameStore((s) => s.cameraMoves);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollLeft !== cameraX) el.scrollLeft = cameraX;
    if (el.scrollTop !== cameraY) el.scrollTop = cameraY;
  }, [cameraX, cameraY, cameraMoves]);

  // The first view centres the capital. `data-ready` then tells e2e specs the page is live: the
  // server-rendered map is visible before React handles clicks, and on a screen that holds the whole
  // map (FR-088) the first view no longer scrolls, so "the capital is in view" proves nothing.
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const { game, activeNationId } = useGameStore.getState();
    const camera = cameraOnCapital(game, activeNationId);
    if (camera) useGameStore.getState().moveCamera(camera.x, camera.y);
    setReady(true);
  }, []);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) setCamera(el.scrollLeft, el.scrollTop);
  }, [setCamera]);

  // The rail graph the depot lights use, drawn as it is (FR-079)
  const railSegments = useMemo(() => computeRailSegmentsPixels(railLinksOf({ transportNetwork }), TILE_PX, TILE_PX / 2), [transportNetwork]);
  // Each nation's territory as one outline in its colour (FR-087); inside it the provinces, dotted, and
  // each minor nation's land, dashed (FR-153)
  const borders = useMemo(() => borderPaths(territoryBorderSegments(map, nations)), [map, nations]);
  const provinceBorders = useMemo(() => provinceBorderPaths(provinceBorderSegments(map, provinces)), [map, provinces]);
  const minorBorders = useMemo(
    () => minorBorderPaths(minorBorderSegments(map, provinces, minorNations), minorNations),
    [map, provinces, minorNations]
  );
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
                  armyMarkers={armyMarkers.get(tile.id)}
                />
              ))}
            </div>
          ))}

          {/* Province lines, territory borders, minor borders on top where they meet one, then the railroad (FR-079, FR-153) */}
          <svg
            width={overlayWidth}
            height={overlayHeight}
            className={styles.railOverlay}
          >
            {provinceBorders.map((b) => (
              <path key={b.ownerId} d={b.d} stroke={THEME.provinceBorder} className={styles.provinceBorder} data-testid="province-border" data-owner-id={b.ownerId} />
            ))}
            {borders.map((b) => (
              <path key={b.nationId} d={b.d} stroke={b.color} className={styles.territoryBorder} data-testid="territory-border" />
            ))}
            {minorBorders.map((b) => (
              <path key={b.minorId} d={b.d} stroke={THEME.minor} className={styles.minorBorder} data-testid="minor-border" data-minor-id={b.minorId} />
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
                data-nation-id={s.nationId}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};
