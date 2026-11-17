import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TileInfoPanel } from "./TileInfoPanel";
import { useGameStore } from '../store/rootStore';
import { selectActiveNation } from "../store/selectors";
import { TurnIndicator, NextCouncil, NationStats, ActionButtons, NewsPanel, FoodWarning, UpkeepWarning, ScoreIndicator, ScoreTable } from "./HUD/index";
import { AboutPanel } from "./HUD/AboutPanel";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { startNewGameOnCapital } from "@/hooks/mapActions";

/** FR-377: the Debug box is for bug reports, shown only with `debug` in the URL's query (none in the server render). */
const noSubscription = () => () => {};
const useDebugQuery = (): boolean =>
    useSyncExternalStore(noSubscription, () => new URLSearchParams(window.location.search).has("debug"), () => false);

/**
 * New game throws the running game away, so the HUD asks first, in place (FR-109). The panel takes
 * the focus when it opens (FR-111), so a keyboard or screen reader user lands on the question; it
 * is the panel and not Start new game, so a stray Enter does not throw the game away.
 */
const ConfirmNewGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
    const panel = useRef<HTMLDivElement>(null);
    useEffect(() => {
        panel.current?.focus();
    }, []);
    return (
        <div ref={panel} tabIndex={-1} id="confirm-new-game" className="confirm-panel" role="group" aria-label="Confirm new game">
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

export const HUD: React.FC = () => {
    const selectedTileId = useGameStore((s) => s.selectedTileId);
    const map = useGameStore((s) => s.game.map);
    const seed = useGameStore((s) => s.game.seed);
    const nation = useGameStore(selectActiveNation);
    const selectedTile = map.tiles.flat().find(tile => tile.id === selectedTileId);
    // The credits panel and the New game question are view state only, so they live here (FR-089, FR-109)
    const [isAboutOpen, setAboutOpen] = useState(false);
    const [isConfirmingNewGame, setConfirmingNewGame] = useState(false);
    const debug = useDebugQuery();

    // FR-424: the labels are spans, so a window under 500 px high shows the icons only (globals.css); the names stay
    return (
        <div className="hud-container" data-edge-scroll="horizontal-only">
            <div className="hud-content">
                <div className="hud-header">
                    <h2 className="hud-title">{nation?.name ?? "HUD"}</h2>
                    <div className="hud-header-actions">
                        <button
                            className="icon-button"
                            onClick={() => setConfirmingNewGame((open) => !open)}
                            title="Start a new game"
                            aria-expanded={isConfirmingNewGame}
                            aria-controls={isConfirmingNewGame ? "confirm-new-game" : undefined}
                        >
                            <GameIcon name={UI_ICONS.newGame} /> <span className="hud-header-label">New game</span>
                        </button>
                        <button className="icon-button" onClick={() => setAboutOpen((open) => !open)} title="About and credits">
                            <GameIcon name={UI_ICONS.about} /> <span className="hud-header-label">About</span>
                        </button>
                    </div>
                </div>
                {isConfirmingNewGame && <ConfirmNewGame onDone={() => setConfirmingNewGame(false)} />}
                {isAboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
                <TurnIndicator />
                <NationStats />
                <ScoreIndicator />
                {/* FR-371: the selected tile where the player looks, right under the turn, cash and score */}
                <TileInfoPanel selectedTile={selectedTile} />
                <ScoreTable />
                {/* FR-371: the Council line and its projection after Tile Info (FR-301, FR-314) */}
                <NextCouncil />
                <FoodWarning />
                <UpkeepWarning />
                <NewsPanel />

                {/* Debug section, last: the tile's coordinates and the seed, for bug reports (FR-377: only with ?debug) */}
                {debug && selectedTile && (
                    <div className="hud-debug-section">
                        <div className="hud-debug-title">Debug</div>
                        <div><strong>Tile:</strong> {selectedTile.x},{selectedTile.y} (id {selectedTile.id})</div>
                        <div><strong>Seed:</strong> {seed}</div>
                    </div>
                )}
            </div>

            <ActionButtons />
        </div>
    );
};
