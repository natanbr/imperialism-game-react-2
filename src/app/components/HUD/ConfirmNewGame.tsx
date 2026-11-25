import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { parseMapSeed } from "@/engine";
import { startGameOnCapital } from "@/hooks/mapActions";
import type { RandomMapSize, WorldId } from "@/types/World";
import { DIFFICULTY_LABEL, leftInWindow, SIZE_LABEL, WORLD_LABEL } from "./hudView";

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
  const id = useId();
  const [world, setWorld] = useState<WorldId>("continent");
  const [size, setSize] = useState<RandomMapSize>("standard");
  const [difficulty, setDifficulty] = useState<"normal" | "demo">("normal");
  const [fixedSeedOpen, setFixedSeedOpen] = useState(false);
  const [seedText, setSeedText] = useState("");
  const randomMap = world === "random";
  const showSeed = randomMap || fixedSeedOpen;
  const seed = parseMapSeed(showSeed ? seedText : "");
  const invalid = seed.kind === "invalid";

  function start(level: "normal" | "demo") {
    if (seed.kind === "invalid") return;
    startGameOnCapital({
      world, difficulty: level,
      ...(randomMap && { randomMapSize: size }),
      ...(seed.kind === "seed" && { seed: seed.seed }),
    });
    onDone();
  }

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
      aria-describedby={`${id}-warning`}
      data-edge-scroll=""
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        onDone();
      }}
    >
      <p id={`${id}-warning`} className="confirm-warning">Start a new game? This game will be lost.</p>
      <form onSubmit={(event) => { event.preventDefault(); start(difficulty); }}>
        <div className="confirm-field">
          <label htmlFor={`${id}-map`}>Map</label>
          <select id={`${id}-map`} name="world" value={world} onChange={e => setWorld(e.target.value as WorldId)}>
            {(["continent", "two-islands", "random"] as const).map(value => <option key={value} value={value}>{WORLD_LABEL[value]}</option>)}
          </select>
        </div>
        {randomMap ? (
          <div className="confirm-field">
            <label htmlFor={`${id}-size`}>Random size</label>
            <select id={`${id}-size`} name="randomMapSize" value={size} onChange={e => setSize(e.target.value as RandomMapSize)}>
              {(["standard", "large"] as const).map(value => <option key={value} value={value}>{SIZE_LABEL[value]}</option>)}
            </select>
          </div>
        ) : (
          <button type="button" className="btn btn-plain btn-sm confirm-disclosure" aria-expanded={fixedSeedOpen}
            aria-controls={`${id}-seed-field`} onClick={() => setFixedSeedOpen(!fixedSeedOpen)}>
            Set replay seed
          </button>
        )}
        <div id={`${id}-seed-field`} className="confirm-field" hidden={!showSeed}>
          <label htmlFor={`${id}-seed`}>Seed</label>
          <input id={`${id}-seed`} name="seed" type="text" value={seedText} onChange={e => setSeedText(e.target.value)}
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off"
            aria-invalid={invalid} aria-describedby={invalid ? `${id}-seed-hint ${id}-seed-error` : `${id}-seed-hint`} />
          <span className="confirm-hint" id={`${id}-seed-hint`}>Enter a number or key word, or leave blank for a new seed.</span>
          <span className="confirm-error" id={`${id}-seed-error`} aria-live="polite">{invalid &&
            "Use a whole number from 0 to 4294967295, or 1–64 letters (A–Z), digits, spaces or hyphens with at least one letter."}</span>
        </div>
        <div className="confirm-field">
          <label htmlFor={`${id}-difficulty`}>Difficulty</label>
          <select id={`${id}-difficulty`} name="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value as "normal" | "demo")}>
            {(["normal", "demo"] as const).map(value => <option key={value} value={value}>{DIFFICULTY_LABEL[value]}</option>)}
          </select>
        </div>
        <div className="confirm-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={invalid}>Start new game</button>
          <button type="button" className="btn btn-plain btn-sm" onClick={onDone}>Keep playing</button>
        </div>
        <div className="confirm-demo">
          <button type="button" className="btn btn-plain btn-sm" aria-describedby={`${id}-demo`}
            disabled={invalid} onClick={() => start("demo")}>Start Demo game</button>
          <p id={`${id}-demo`} className="confirm-note">
            Demo: more cash and troops, and a dashboard of every nation&apos;s numbers.
          </p>
        </div>
      </form>
    </div>
  );
};
