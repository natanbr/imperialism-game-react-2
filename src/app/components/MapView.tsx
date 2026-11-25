import { railLinksOf } from "@/engine";
import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import { useGameStore } from "@/store/rootStore";
import { selectArmyMarkersBySeat, selectAttackArrows, selectMarchArrows } from "@/store/selectors";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { TileComponent } from "./Tile";
import { GROUND_ART, GROUND_ART_PX } from "./art/inkArt";
import { mapAreaOf, mapOffset, type MapArea } from "./camera";
import { nextZoom, useMapKeyboard, zoomBy, zoomMapTo } from "@/hooks/useMapKeyboard";
import { useMapZoomGestures } from "@/hooks/useMapZoomGestures";
import { openMap } from "@/hooks/mapActions";
import { MapGround } from "./map/MapGround";
import { MapStatus } from "./MapStatus";
import { ConfirmSpend } from "./ConfirmSpend";
import { groundSignature } from "./map/shoreline";
import { computeRailSegmentsPixels } from "./railSegments";
import { railDrawing } from "./railDrawing";
import { RailConstruction, RailPiece } from "./map/RailLayer";
import {
  borderPaths,
  minorBorderPaths,
  minorBorderSegments,
  provinceBorderPaths,
  provinceBorderSegments,
  territoryBorderSegments,
} from "./territoryBorders";
import { HUD_PX, THEME, TILE_PX } from "@/styles/theme";
import { nationMark } from "./nationMark";
import styles from "./MapView.module.css";

/**
 * The tile an arrow key moves the keyboard to (FR-369): left and right along the row, up and down to the row above or
 * below in the same column (odd rows are shifted half a tile); the same tile at the map's edge; undefined for another key.
 */
export function neighbourTileId(tileId: string, key: string, { cols, rows }: { cols: number; rows: number }): string | undefined {
  const step = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[key];
  if (!step) return undefined;
  const [x, y] = tileId.split("-").map(Number);
  const nx = Math.min(cols - 1, Math.max(0, x + step[0]));
  const ny = Math.min(rows - 1, Math.max(0, y + step[1]));
  return `${nx}-${ny}`;
}

/** The sea past the map (FR-340): the ground's own water texture at its own size; the rest of the rule is in the CSS. */
const SEA_PAST_THE_MAP: React.CSSProperties = {
  backgroundImage: `url(${GROUND_ART.water})`,
  backgroundSize: `${GROUND_ART_PX}px ${GROUND_ART_PX}px`,
};

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
  // The player's march and attack orders of this turn, drawn as arrows until End Turn (FR-263, FR-273)
  const marchArrows = useGameStore(selectMarchArrows);
  const attackArrows = useGameStore(selectAttackArrows);

  // The camera is the container's scroll position (FR-083): the browser keeps it inside the map,
  // and the store mirrors it so the Center button and the first view can set it.
  const scrollBy = useCallback((dx: number, dy: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft += dx;
    el.scrollTop += dy;
  }, []);
  // Only over the map, whose right edge is the HUD's left one (FR-366)
  useEdgeScroll({ containerRef, onMove: scrollBy, rightInset: HUD_PX });

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

  // The first view fits the land (the whole grid on oversized maps) or centres the capital (FR-567, FR-598). `data-ready`
  // then tells e2e specs the page is live: the server-rendered map is visible before React handles clicks, and on a screen
  // that holds the whole map (FR-088) the first view no longer scrolls, so "the capital is in view" proves nothing.
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    openMap();
    setReady(true);
  }, []);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) setCamera(el.scrollLeft, el.scrollTop);
  }, [setCamera]);

  // FR-367: a map with more than 64 px to spare on an axis of the map area is centred on it. The area is read after the
  // first commit (the server render knows no window), in a layout effect, so the first paint already shows it.
  const zoom = useGameStore((s) => s.zoom);
  const [area, setArea] = useState<MapArea>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const read = () => {
      setArea(mapAreaOf(window));
      // A wider window can raise the minimum above the player's current zoom (FR-598).
      zoomMapTo(useGameStore.getState().zoom);
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  const offset = mapOffset(area, map.config, zoom);
  useMapKeyboard();
  // FR-567: Ctrl and the wheel, a trackpad pinch and two fingers zoom the map, not the page
  useMapZoomGestures(containerRef);
  // FR-368: the map is zoomed as one layer (CSS zoom scales every length inside it, so tiles, rail, borders, marks, arrows
  // and clicks stay together); the offset and the HUD padding are screen pixels, so they are divided by the zoom
  const viewportStyle: React.CSSProperties = {};
  if (zoom !== 1) Object.assign(viewportStyle, { zoom, paddingRight: HUD_PX / zoom });
  if (offset.x > 0) viewportStyle.marginLeft = offset.x / zoom;
  if (offset.y > 0) viewportStyle.marginTop = offset.y / zoom;
  // The sea past the map continues the ground's water from the map's origin, at the map's zoom (FR-340)
  const seaStyle: React.CSSProperties =
    zoom === 1 && offset.x === 0 && offset.y === 0
      ? SEA_PAST_THE_MAP
      : { ...SEA_PAST_THE_MAP, backgroundSize: `${GROUND_ART_PX * zoom}px ${GROUND_ART_PX * zoom}px`, backgroundPosition: `${offset.x}px ${offset.y}px` };

  // FR-369: the map is one Tab stop, the tile the keyboard moved to, else the selected tile, else the capital. A new
  // selection (a click, Enter) or the focus leaving the map forgets the keyboard's tile. FR-445: a deselection (Escape)
  // keeps the focused tile the Tab stop, so it keeps its tabindex and the focus stays on it.
  const capitalCityId = useGameStore((s) => s.game.nations.find((n) => n.id === s.activeNationId)?.cities[0]);
  const capitalTileId = useMemo(
    () => (capitalCityId ? map.tiles.flat().find((t) => t.cityId === capitalCityId)?.id : undefined),
    [map, capitalCityId]
  );
  const [keyboardTileId, setKeyboardTileId] = useState<string | undefined>(undefined);
  // The tile that has the focus, kept by the focus events: a ref, as moving the focus draws nothing by itself
  const focusedTileId = useRef<string | undefined>(undefined);
  const [selectionSeen, setSelectionSeen] = useState(selectedTileId);
  if (selectionSeen !== selectedTileId) {
    setSelectionSeen(selectedTileId);
    setKeyboardTileId(selectedTileId === undefined ? focusedTileId.current : undefined);
  }
  const tabStopId = keyboardTileId ?? selectedTileId ?? capitalTileId;
  const [isNarrowNoteDismissed, setNarrowNoteDismissed] = useState(false);
  const onMapKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = e.target as HTMLElement;
      // Only the tile itself: a civilian or army button on it handles its own keys
      if (el.getAttribute("data-testid") !== "tile") return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
        return;
      }
      const next = neighbourTileId(el.getAttribute("data-tile-id") ?? "", e.key, map.config);
      if (next === undefined) return;
      e.preventDefault();
      flushSync(() => setKeyboardTileId(next));
      const target = containerRef.current?.querySelector<HTMLElement>(`[data-tile-id="${next}"]`);
      target?.focus();
      target?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    },
    [map.config]
  );
  const onMapFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    focusedTileId.current = el.getAttribute("data-testid") === "tile" ? (el.getAttribute("data-tile-id") ?? undefined) : undefined;
  }, []);
  const onMapBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    focusedTileId.current = undefined;
    setKeyboardTileId(undefined);
  }, []);

  // The ground is drawn from the land and water pattern only: a string, so MapGround's memo holds across turns (FR-321)
  const ground = useMemo(() => groundSignature(map.tiles), [map]);
  // The rail graph the depot lights use, drawn as it is (FR-079): one line per link that paints nothing (FR-348), and
  // over the links each railed tile's piece and each section under construction in the ink and wash style (FR-570)
  const railLinks = useMemo(() => railLinksOf({ transportNetwork }), [transportNetwork]);
  const railSegments = useMemo(() => computeRailSegmentsPixels(railLinks, TILE_PX, TILE_PX / 2), [railLinks]);
  const rail = useMemo(() => railDrawing(map, railLinks, TILE_PX), [map, railLinks]);
  // Each nation's territory as one outline in its colour (FR-087); inside it the provinces, dotted, and
  // each minor nation's land, dashed (FR-153)
  const borders = useMemo(() => borderPaths(territoryBorderSegments(map, nations)), [map, nations]);
  const provinceBorders = useMemo(() => provinceBorderPaths(provinceBorderSegments(map, provinces)), [map, provinces]);
  const minorBorders = useMemo(
    () => minorBorderPaths(minorBorderSegments(map, provinces, minorNations), minorNations),
    [map, provinces, minorNations]
  );
  // FR-327: every border line lies on a pale halo, the art pack's territory-line halo colour
  const halos = useMemo(
    () => [
      ...provinceBorders.map((b) => ({ key: `province:${b.ownerId}`, d: b.d })),
      ...borders.map((b) => ({ key: `territory:${b.nationId}`, d: b.d })),
      ...minorBorders.map((b) => ({ key: `minor:${b.minorId}`, d: b.d })),
    ],
    [provinceBorders, borders, minorBorders]
  );
  const overlayWidth = map.config.cols * TILE_PX + TILE_PX / 2; // extra for odd-row shift
  const overlayHeight = map.config.rows * TILE_PX;

  return (
    <div className={styles.wrapper}>
      <div
        ref={containerRef}
        className={styles.container}
        style={seaStyle}
        onScroll={onScroll}
        data-testid="map-scroll"
        data-ready={ready ? "true" : undefined}
      >
        <div
          className={styles.viewport}
          style={viewportStyle}
          data-testid="map-viewport"
          data-zoom={zoom}
          onKeyDown={onMapKeyDown}
          onFocus={onMapFocus}
          onBlur={onMapBlur}
        >
          <MapGround signature={ground} />
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
                  tabbable={tile.id === tabStopId}
                />
              ))}
            </div>
          ))}

          {/* Above the tile pictures, below every tile mark (FR-328). The pale halos first, each under its line (FR-327); then
              province lines, territory borders, minor borders on top where they meet one, then the railroad (FR-079, FR-153) */}
          <svg
            width={overlayWidth}
            height={overlayHeight}
            className={styles.railOverlay}
          >
            {halos.map((h) => (
              <path key={h.key} d={h.d} stroke={THEME.mapHalo} className={styles.borderHalo} data-testid="border-halo" />
            ))}
            {provinceBorders.map((b) => (
              <path key={b.ownerId} d={b.d} stroke={THEME.provinceBorder} className={styles.provinceBorder} data-testid="province-border" data-owner-id={b.ownerId} />
            ))}
            {borders.map((b) => (
              <path key={b.nationId} d={b.d} stroke={b.color} className={styles.territoryBorder} data-testid="territory-border" data-nation-id={b.nationId} />
            ))}
            {minorBorders.map((b) => (
              <path key={b.minorId} d={b.d} stroke={nationMark({ nations, minorNations }, b.minorId).colour} className={styles.minorBorder} data-testid="minor-border" data-minor-id={b.minorId} />
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
            {rail.pieces.map((p) => (
              <RailPiece key={p.tileId} piece={p} />
            ))}
            {rail.constructions.map((c) => (
              <RailConstruction key={c.tileId} section={c} />
            ))}
          </svg>

          {/* This turn's attacks and marches (FR-263, FR-273): above the tile icons and the civilians, below the army
              markers (Tile.module.css). RED is an attack, the art pack's own arrow; GREEN a march, in the pack's colours */}
          {(marchArrows.length > 0 || attackArrows.length > 0) && (
            <svg width={overlayWidth} height={overlayHeight} className={styles.marchOverlay}>
              {attackArrows.map((a) => (
                <g key={`${a.fromProvinceId}>${a.toProvinceId}`} role="img" aria-label={a.label} data-testid="attack-arrow">
                  <image
                    href={a.href}
                    width={a.width}
                    height={a.height}
                    transform={`matrix(${a.matrix.join(" ")})`}
                    aria-hidden="true"
                    data-testid="attack-art"
                  />
                  <circle cx={a.countAt.x} cy={a.countAt.y} r={8} fill={THEME.armyAttack} className={styles.marchCountBack} />
                  <text x={a.countAt.x} y={a.countAt.y} className={styles.marchCount} data-testid="attack-count">
                    {a.count}
                  </text>
                </g>
              ))}
              {marchArrows.map((a) => (
                <g key={`${a.fromProvinceId}>${a.toProvinceId}`} role="img" aria-label={a.label} data-testid="march-arrow">
                  <line x1={a.line.x1} y1={a.line.y1} x2={a.line.x2} y2={a.line.y2} className={styles.marchHalo} />
                  <line
                    x1={a.line.x1}
                    y1={a.line.y1}
                    x2={a.line.x2}
                    y2={a.line.y2}
                    stroke={a.ink}
                    className={styles.marchOutline}
                    data-testid="march-outline"
                  />
                  <line x1={a.line.x1} y1={a.line.y1} x2={a.line.x2} y2={a.line.y2} stroke={a.color} className={styles.marchLine} data-testid="march-line" />
                  <polygon points={a.head} fill={a.color} stroke={a.ink} className={styles.marchHead} data-testid="march-head" />
                  <circle cx={a.countAt.x} cy={a.countAt.y} r={8} fill={a.color} className={styles.marchCountBack} />
                  <text x={a.countAt.x} y={a.countAt.y} className={styles.marchCount} data-testid="march-count">
                    {a.count}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>
      {/* FR-368: the zoom steps, at the map area's bottom left; the keys "+" and "-" too (useMapKeyboard) */}
      <div className={styles.zoomControls} role="group" aria-label="Map zoom">
        <button type="button" className={styles.zoomButton} aria-label="Zoom in" title="Zoom in" disabled={nextZoom(zoom, 1, area, map.config) === undefined} onClick={() => zoomBy(1)}>
          +
        </button>
        <button type="button" className={styles.zoomButton} aria-label="Zoom out" title="Zoom out" disabled={nextZoom(zoom, -1, area, map.config) === undefined} onClick={() => zoomBy(-1)}>
          −
        </button>
      </div>
      <MapStatus />
      {/* FR-383: the question before a costly order, from a map click, Tile Info or Construction Options */}
      <ConfirmSpend />
      {/* FR-429: below 700 px of width (the CSS shows it there only) one line says the game wants a wider window */}
      {!isNarrowNoteDismissed && (
        <div className={styles.narrowWindow} data-testid="narrow-window">
          <span>Imperialism is made for a window at least 1024 px wide.</span>
          <button type="button" className={styles.narrowDismiss} aria-label="Dismiss" title="Dismiss" onClick={() => setNarrowNoteDismissed(true)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
};
