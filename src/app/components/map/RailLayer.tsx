import React from "react";
import type { RailConstructionDrawing, RailPieceDrawing } from "../railDrawing";
import styles from "./RailLayer.module.css";

/**
 * One railed tile's piece (FR-570), inside the map's overlay SVG. Memoized on the drawing object, which `railDrawing`
 * keeps per tile, so a turn that leaves a tile's rail as it was does not render it again.
 */
export const RailPiece = React.memo(function RailPiece({ piece }: { piece: RailPieceDrawing }) {
  return (
    <g
      data-testid="rail-tile"
      data-rail-tile-id={piece.tileId}
      data-nation-id={piece.nationId}
      data-shape={piece.shape}
      data-bridge={piece.bridge ? "true" : undefined}
      data-station={piece.station ? "true" : undefined}
      aria-hidden="true"
    >
      <path d={piece.wash} className={styles.wash} data-testid="rail-wash" />
      {piece.trestle && <path d={piece.trestle} className={styles.trestle} data-testid="rail-trestle" />}
      <path d={piece.ties} className={styles.ties} data-testid="rail-ties" />
      <path d={piece.rails} className={styles.rails} data-testid="rail-rails" />
      {piece.platform && <path d={piece.platform} className={styles.platform} data-testid="rail-platform" />}
    </g>
  );
});

/** A rail section under construction (FR-570): pencil ties from the tile it starts on, no rails. */
export const RailConstruction = React.memo(function RailConstruction({ section }: { section: RailConstructionDrawing }) {
  return (
    <g data-testid="rail-construction" data-rail-tile-id={section.tileId} data-from-tile-id={section.fromTileId} aria-hidden="true">
      <path d={section.ties} className={styles.pencil} data-testid="rail-pencil" />
    </g>
  );
});
