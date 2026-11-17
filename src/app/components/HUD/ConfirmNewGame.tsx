import React, { useEffect, useLayoutEffect, useRef } from "react";
import { startNewGameOnCapital } from "@/hooks/mapActions";
import { leftInWindow } from "./hudView";

export const CONFIRM_NEW_GAME_ID = "confirm-new-game";

/**
 * New game throws the running game away, so the top bar asks first (FR-109), in a panel under New game (FR-480). The panel
 * takes the focus when it opens (FR-111), so a keyboard or screen reader user lands on the question; it is the panel and
 * not Start new game, so a stray Enter does not throw the game away. Escape closes it like Keep playing, and is taken, so
 * the map's own Escape does not also drop the selection (hooks/useMapKeyboard.ts skips a key whose default is prevented).
 * It stands in the page right after New game, so the Tab order runs New game, the question, About (M12b review A11Y-1: in
 * the body, Shift+Tab left it for the pane and Tab from Keep playing left the page). Fixed under the bar, so the strip's
 * sideways scroll (below 1024 px) does not clip it; its left edge follows the button on a resize or a scroll.
 * Trap: it lies over the pane only because the bar does (TopBar.module.css, z-index). `data-edge-scroll` keeps the map
 * still under the pointer, as over the bar (FR-366).
 */
export const ConfirmNewGame: React.FC<{ anchor: React.RefObject<HTMLElement | null>; onDone: () => void }> = ({ anchor, onDone }) => {
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const place = () => {
      const button = anchor.current;
      const el = panel.current;
      if (!button || !el) return;
      // FR-480: under New game, kept 8 px inside the window
      el.style.left = `${leftInWindow(button.getBoundingClientRect().left, el.getBoundingClientRect().width, window.innerWidth)}px`;
    };
    place();
    window.addEventListener("resize", place);
    // Scroll events do not bubble: caught on the way down, the strip's among them
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);
  useEffect(() => {
    // Without scrolling: the panel is fixed, so the strip it sits in must not move to show it
    panel.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div
      ref={panel}
      tabIndex={-1}
      id={CONFIRM_NEW_GAME_ID}
      className="confirm-panel"
      role="group"
      aria-label="Confirm new game"
      data-edge-scroll=""
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        onDone();
      }}
    >
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
    </div>
  );
};
