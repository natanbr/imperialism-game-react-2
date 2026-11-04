import React, { useState } from "react";
import { TileInfoPanel } from "./TileInfoPanel";
import { useGameStore } from '../store/rootStore';
import { selectActiveNation } from "../store/selectors";
import { TurnIndicator, NationStats, ActionButtons, NewsPanel, FoodWarning, ScoreIndicator } from "./HUD/index";
import { AboutPanel } from "./HUD/AboutPanel";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";

export const HUD: React.FC = () => {
    const selectedTileId = useGameStore((s) => s.selectedTileId);
    const map = useGameStore((s) => s.game.map);
    const seed = useGameStore((s) => s.game.seed);
    const nation = useGameStore(selectActiveNation);
    const selectedTile = map.tiles.flat().find(tile => tile.id === selectedTileId);
    // The credits panel is view state only, so it lives here and not in the store (FR-089)
    const [isAboutOpen, setAboutOpen] = useState(false);

    return (
        <div className="hud-container" data-edge-scroll="horizontal-only">
            <div>
                <div className="hud-header">
                    <h2 className="hud-title">{nation?.name ?? "HUD"}</h2>
                    <button className="icon-button" onClick={() => setAboutOpen((open) => !open)} title="About and credits">
                        <GameIcon name={UI_ICONS.about} /> About
                    </button>
                </div>
                {isAboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
                <TurnIndicator />
                <NationStats />
                <ScoreIndicator />
                <FoodWarning />

                {/* Debug section */}
                {selectedTile && (
                    <div className="hud-debug-section">
                        <div className="hud-debug-title">Debug</div>
                        <div><strong>Tile:</strong> {selectedTile.x},{selectedTile.y} (id {selectedTile.id})</div>
                        <div><strong>Seed:</strong> {seed}</div>
                    </div>
                )}

                <TileInfoPanel selectedTile={selectedTile} />
                <NewsPanel />
            </div>

            <ActionButtons />
        </div>
    );
};
