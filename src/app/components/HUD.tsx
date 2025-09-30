import React from "react";
import { TileInfoPanel } from "./TileInfoPanel";
import { useGameStore } from '../store/rootStore';
import { TurnIndicator, NationStats, ActionButtons } from "./HUD/index";

export const HUD: React.FC = () => {
    const selectedTileId = useGameStore((s) => s.selectedTileId);
    const map = useGameStore((s) => s.map);
    const selectedTile = map.tiles.flat().find(tile => tile.id === selectedTileId);

    return (
        <div className="hud-container">
            <div>
                <h2 className="hud-title">HUD</h2>
                <TurnIndicator />
                <NationStats />

                {/* Debug section */}
                {selectedTile && (
                    <div className="hud-debug-section">
                        <div className="hud-debug-title">Debug</div>
                        <div><strong>Tile:</strong> {selectedTile.x},{selectedTile.y} (id {selectedTile.id})</div>
                    </div>
                )}

                <TileInfoPanel selectedTile={selectedTile} />
            </div>

            <ActionButtons />
        </div>
    );
};