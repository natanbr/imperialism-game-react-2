import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { startNewGameOnCapital } from "@/hooks/mapActions";

export const CONFIRM_NEW_GAME_ID = "confirm-new-game";

/**
 * New game throws the running game away, so the top bar asks first (FR-109), in a panel under the bar at its right end
 * (FR-480). The panel takes the focus when it opens (FR-111), so a keyboard or screen reader user lands on the question;
 * it is the panel and not Start new game, so a stray Enter does not throw the game away.
 * Rendered into the body: inside the bar (z 10, before the pane in the page) the pane would be drawn over it. Its
 * `data-edge-scroll` keeps the map still under the pointer, as over the bar (FR-366).
 */
export const ConfirmNewGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.focus();
  }, []);
  return createPortal(
    <div ref={panel} tabIndex={-1} id={CONFIRM_NEW_GAME_ID} className="confirm-panel" role="group" aria-label="Confirm new game" data-edge-scroll="">
      <p>Start a new game? This game will be lost.</p>
      <div className="confirm-actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            startNewGameOnCapital();
            onDone();
          }}
        >
          Start new game
        </button>
        <button className="btn btn-plain btn-sm" onClick={onDone}>
          Keep playing
        </button>
      </div>
    </div>,
    document.body
  );
};
