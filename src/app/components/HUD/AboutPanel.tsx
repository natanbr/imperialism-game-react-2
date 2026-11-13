import React, { useId } from "react";
import { useGameStore } from "@/store/rootStore";
import { selectActiveNation } from "@/store/selectors";
import { nationColor, THEME } from "@/styles/theme";
import mapStyles from "../MapView.module.css";
import { Modal } from "../Modal";

/** A short sample of a map border line, drawn with the map's own class (line style) and colour token. */
const LineSample: React.FC<{ stroke: string; className: string }> = ({ stroke, className }) => (
  <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true" focusable="false">
    <line x1="2" y1="4" x2="26" y2="4" stroke={stroke} className={className} />
  </svg>
);

/**
 * Credits, with the CC BY 3.0 attribution the Game Icons licence asks for (FR-089), and the map legend
 * of the three border lines (FR-235). The Great Power sample is in the viewed nation's colour. A modal
 * dialog over the whole page (FR-236), rendered into the body so the HUD's clipped panel does not hold it.
 */
export const AboutPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const nation = useGameStore(selectActiveNation);
  const titleId = useId();
  const legendId = useId();
  return (
    <Modal titleId={titleId} onClose={onClose} overlayClassName="about-overlay" className="about-panel" portal>
      <div className="about-header">
        <h2 id={titleId} className="about-title">
          About
        </h2>
        <button className="icon-button" onClick={onClose} aria-label="Close about">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <p>A web remake of Imperialism (1997).</p>
      <p>
        Icons by{" "}
        <a href="https://game-icons.net" target="_blank" rel="noopener noreferrer">
          game-icons.net
        </a>{" "}
        contributors,{" "}
        <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">
          CC BY 3.0
        </a>
        .
      </p>
      <strong id={legendId}>Map legend</strong>
      <ul className="map-legend" aria-labelledby={legendId}>
        <li>
          <LineSample stroke={nationColor(nation?.colorSlot)} className={mapStyles.territoryBorder} />
          <span>Solid line: Great Power border</span>
        </li>
        <li>
          <LineSample stroke={THEME.minor} className={mapStyles.minorBorder} />
          <span>Dashed slate line: minor nation border</span>
        </li>
        <li>
          <LineSample stroke={THEME.provinceBorder} className={mapStyles.provinceBorder} />
          <span>Dotted line: province border</span>
        </li>
      </ul>
    </Modal>
  );
};
