import React, { useEffect, useRef, useState } from "react";
import { TileInfoPanel } from "./TileInfoPanel";
import { useGameStore } from '../store/rootStore';
import { selectActiveNation } from "../store/selectors";
import { TurnIndicator, NationStats, ActionButtons, NewsPanel, FoodWarning, ScoreIndicator, ScoreTable } from "./HUD/index";
import { AboutPanel } from "./HUD/AboutPanel";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { startNewGameOnCapital } from "@/hooks/mapActions";

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
                            <GameIcon name={UI_ICONS.newGame} /> New game
                        </button>
                        <button className="icon-button" onClick={() => setAboutOpen((open) => !open)} title="About and credits">
                            <GameIcon name={UI_ICONS.about} /> About
                        </button>
                    </div>
                </div>
                {isConfirmingNewGame && <ConfirmNewGame onDone={() => setConfirmingNewGame(false)} />}
                {isAboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
                <TurnIndicator />
                <NationStats />
                <ScoreIndicator />
                <ScoreTable />
                <FoodWarning />

                <TileInfoPanel selectedTile={selectedTile} />
                <NewsPanel />

                {/* Debug section, last: the tile's coordinates and the seed, for bug reports */}
                {selectedTile && (
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
