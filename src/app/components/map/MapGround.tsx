import React, { useId, useMemo } from "react";
import { GROUND_ART, GROUND_ART_PX } from "../art/inkArt";
import { THEME } from "@/styles/theme";
import { shorelineLayout, type GroundBox } from "./shoreline";
import styles from "./MapGround.module.css";

export interface MapGroundProps {
  /** The map's land and water pattern (`groundSignature`): the only input, so the ground is rebuilt only when it changes. */
  signature: string;
}

/** Alpha masks: only their alpha counts, so they need no colour (a luminance mask would need white). */
const ALPHA_MASK: React.CSSProperties = { maskType: "alpha" };

/** A texture repeated at its own 512 px from the map's origin, never stretched. */
const Texture: React.FC<{ id: string; href: string }> = ({ id, href }) => (
  <pattern id={id} patternUnits="userSpaceOnUse" x={0} y={0} width={GROUND_ART_PX} height={GROUND_ART_PX}>
    <image href={href} width={GROUND_ART_PX} height={GROUND_ART_PX} />
  </pattern>
);

const box = (b: GroundBox) => ({ x: b.x, y: b.y, width: b.width, height: b.height });

/**
 * The map's ground (FR-321): deep water, a band of shallows, a sand rim and the grass of the land, through three rounded
 * masks drawn from the land tiles, as the art pack's demo draws its shoreline; desert and tundra tiles add a 48 px patch
 * of their base texture with a soft edge. One SVG behind the tile rows, hidden from assistive technology. Its filters are
 * costly to paint, so it is built only when the land and water pattern changes (React.memo on the signature) and drawn
 * on a layer of its own (MapGround.module.css).
 */
const MapGroundInner: React.FC<MapGroundProps> = ({ signature }) => {
  // Unique per instance; React's id characters are not needed in a url(#...) reference
  const prefix = `ground-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const layout = useMemo(() => shorelineLayout(signature), [signature]);
  const id = {
    cells: `${prefix}-land-cells`,
    water: `${prefix}-water`,
    grass: `${prefix}-grass`,
    desert: `${prefix}-desert`,
    tundra: `${prefix}-tundra`,
    fade: `${prefix}-fade`,
    patch: `${prefix}-patch`,
    mask: (name: string) => `${prefix}-${name}`,
    filter: (name: string) => `${prefix}-${name}-filter`,
  };
  const url = (ref: string) => `url(#${ref})`;
  const bounds = { x: 0, y: 0, width: layout.width, height: layout.height };
  const kinds = new Set(layout.patches.map((p) => p.kind));

  return (
    <svg
      className={styles.ground}
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
      focusable="false"
      data-testid="map-ground"
    >
      <defs>
        <g id={id.cells}>
          {layout.cells.map((c) => (
            <rect key={`${c.x},${c.y}`} {...box(c)} />
          ))}
        </g>
        {layout.masks.map((m) => (
          <React.Fragment key={m.name}>
            <filter id={id.filter(m.name)} {...box(layout.region)} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              {m.expansion > 0 && <feMorphology in="SourceAlpha" operator="dilate" radius={m.expansion} />}
              <feGaussianBlur stdDeviation={layout.blur} />
              <feComponentTransfer>
                <feFuncA type="linear" slope={layout.alphaSlope} intercept={layout.alphaIntercept} />
              </feComponentTransfer>
            </filter>
            <mask id={id.mask(m.name)} {...box(layout.region)} maskUnits="userSpaceOnUse" style={ALPHA_MASK}>
              <use href={`#${id.cells}`} filter={url(id.filter(m.name))} />
            </mask>
          </React.Fragment>
        ))}
        <Texture id={id.water} href={GROUND_ART.water} />
        <Texture id={id.grass} href={GROUND_ART.grass} />
        {kinds.has("desert") && <Texture id={id.desert} href={GROUND_ART.desert} />}
        {kinds.has("tundra") && <Texture id={id.tundra} href={GROUND_ART.tundra} />}
        {kinds.size > 0 && (
          <>
            {/* The patch's soft edge: whole inside half its radius, fading out to its edge */}
            <radialGradient id={id.fade}>
              <stop offset="0.5" stopOpacity={1} />
              <stop offset="1" stopOpacity={0} />
            </radialGradient>
            <mask id={id.patch} maskContentUnits="objectBoundingBox" style={ALPHA_MASK}>
              <rect width={1} height={1} fill={url(id.fade)} />
            </mask>
          </>
        )}
      </defs>
      <rect {...bounds} fill={THEME.groundWater} />
      <rect {...bounds} fill={url(id.water)} />
      <rect {...bounds} fill={THEME.groundShallows} mask={url(id.mask("shallows"))} />
      <rect {...bounds} fill={THEME.groundSand} mask={url(id.mask("sand"))} />
      <g mask={url(id.mask("land"))}>
        <rect {...bounds} fill={THEME.groundGrass} />
        <rect {...bounds} fill={url(id.grass)} />
      </g>
      {layout.patches.map((p) => (
        <g key={`${p.x},${p.y}`} mask={url(id.patch)} data-ground-patch={p.kind}>
          <rect {...box(p)} fill={p.kind === "desert" ? THEME.groundDesert : THEME.groundTundra} />
          <rect {...box(p)} fill={url(p.kind === "desert" ? id.desert : id.tundra)} />
        </g>
      ))}
    </svg>
  );
};

export const MapGround = React.memo(MapGroundInner);
MapGround.displayName = "MapGround";
