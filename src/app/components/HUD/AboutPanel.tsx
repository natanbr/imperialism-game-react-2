import React from "react";

/** Credits, with the CC BY 3.0 attribution the Game Icons licence asks for (FR-089). */
export const AboutPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="about-panel" role="dialog" aria-label="About">
    <div className="about-header">
      <strong>About</strong>
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
  </div>
);
