import React, { useRef, useState } from "react";
import { useGameStore } from "@/store/rootStore";
import { selectActiveNation } from "@/store/selectors";
import { UI_ICONS } from "../icons";
import { GameIcon } from "../GameIcon";
import { NationSwatch } from "../NationSwatch";
import { AboutPanel } from "./AboutPanel";
import { ActionButtons, BarButton } from "./ActionButtons";
import { CONFIRM_NEW_GAME_ID, ConfirmNewGame } from "./ConfirmNewGame";
import { DebugDashboard } from "./DebugDashboard";
import { CashChange, NationStats } from "./NationStats";
import { ScoreIndicator, ScoreRank } from "./ScoreIndicator";
import { NextCouncil, TurnIndicator } from "./TurnIndicator";
import styles from "./TopBar.module.css";

/**
 * New game and About (FR-109, FR-089). The question and the credits are view state only, so they live here; the question
 * opens under New game (FR-480), right after it in the page (the Tab order, M12b review A11Y-1), and gives the focus back
 * to New game when it closes. FR-562: on the Demo level only, Dashboard after About; whether it is open is view state too.
 */
const GameButtons: React.FC = () => {
  const [isConfirming, setConfirming] = useState(false);
  const [isAboutOpen, setAboutOpen] = useState(false);
  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const isDemo = useGameStore((s) => s.game.difficulty === "demo");
  const newGame = useRef<HTMLButtonElement>(null);
  return (
    <div className="topbar-group">
      <BarButton
        ref={newGame}
        name="New game"
        title="Start a new game"
        icon={<GameIcon name={UI_ICONS.newGame} />}
        onClick={() => setConfirming((open) => !open)}
        aria-expanded={isConfirming}
        aria-controls={isConfirming ? CONFIRM_NEW_GAME_ID : undefined}
      />
      {isConfirming && (
        <ConfirmNewGame
          anchor={newGame}
          onDone={() => {
            setConfirming(false);
            newGame.current?.focus();
          }}
        />
      )}
      <BarButton name="About" title="About and credits" icon={<GameIcon name={UI_ICONS.about} />} onClick={() => setAboutOpen((open) => !open)} />
      {isAboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
      {/* The art has no dashboard icon yet (docs/specs/m18-playtest-comfort.md section 3, item 8): the magnifying glass */}
      {isDemo && (
        <BarButton
          name="Dashboard"
          title="Dashboard: every nation's numbers (Demo level)"
          icon={<GameIcon name="GiMagnifyingGlass" />}
          aria-haspopup="dialog"
          onClick={() => setDashboardOpen((open) => !open)}
        />
      )}
      {isDemo && isDashboardOpen && <DebugDashboard onClose={() => setDashboardOpen(false)} />}
    </div>
  );
};

/**
 * The top bar (FR-465, FR-466; docs/specs/hud.md section 2a), in the spirit of the original's strip of season, year and
 * treasury: across the window's top, the right pane and the map drawn from its bottom (camera.ts mapAreaOf). Left, the
 * status blocks of two 16 px lines each: the nation, the turn (and the next Council), the cash (and last turn's change),
 * the score (and its rank); right, the buttons, Advance Turn last. `data-edge-scroll`: a pointer over it never scrolls
 * the map (FR-479, FR-366). Below 700 px the nation and the "Turn:", "Cash:", "Score:" prefixes are hidden from sight
 * only (`topbar-wide-only`, FR-467).
 */
export const TopBar: React.FC = () => {
  const nation = useGameStore(selectActiveNation);
  return (
    <header className={styles.bar} data-testid="topbar" data-edge-scroll="">
      <div className={styles.status} data-testid="topbar-status">
        <div className={`${styles.nation} topbar-wide-only`} data-testid="topbar-nation">
          <NationSwatch slot={nation?.colorSlot} />
          {/* The title: short of room the name ends in an ellipsis (M12b review A11Y-5) */}
          <h2 className="hud-title" title={nation?.name}>
            {nation?.name ?? "HUD"}
          </h2>
        </div>
        <div className={`${styles.block} ${styles.turn}`} data-testid="topbar-turn">
          <TurnIndicator />
          <NextCouncil />
        </div>
        <div className={styles.block} data-testid="topbar-cash">
          <NationStats />
          <CashChange />
        </div>
        <div className={styles.block} data-testid="topbar-score">
          <ScoreIndicator />
          <ScoreRank />
        </div>
      </div>
      <div className={styles.actions} data-testid="topbar-actions">
        <ActionButtons>
          <GameButtons />
        </ActionButtons>
      </div>
    </header>
  );
};
