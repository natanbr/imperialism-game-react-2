import React, { useCallback, useState } from "react";
import { TileInfoPanel } from "./TileInfoPanel";
import { useGameStore } from "../store/rootStore";
import { NewsPanel } from "./HUD/index";
import { Alerts } from "./HUD/Alerts";
import { ALL_GROUPS_CLOSED, HudGroups, type GroupId, type GroupsOpen } from "./HUD/HudGroups";

/**
 * The right pane (M12b, docs/specs/hud.md section 2b), under the top bar: Tile Info first (FR-470; with no tile a
 * placeholder line, card Q112), the alerts (FR-471), the news in the free height (FR-472) and the closed groups at the
 * bottom (FR-473). No command: Advance Turn and the dialog buttons are the top bar's (card Q113, one Advance Turn on the
 * page). `.hud-content` is the one scroll area with its fade (FR-235). The groups' open state is this
 * component's: the HUD stays mounted for the page's life, so End Turn and New game keep it, a reload closes them, and it
 * is never saved.
 */
export const HUD: React.FC = () => {
    const selectedTileId = useGameStore((s) => s.selectedTileId);
    const map = useGameStore((s) => s.game.map);
    const selectedTile = selectedTileId ? map.tiles.flat().find((tile) => tile.id === selectedTileId) : undefined;
    const [open, setOpen] = useState<GroupsOpen>(ALL_GROUPS_CLOSED);
    const toggle = useCallback((id: GroupId) => setOpen((groups) => ({ ...groups, [id]: !groups[id] })), []);

    return (
        <div className="hud-container" data-edge-scroll="horizontal-only">
            <div className="hud-content">
                {selectedTile ? (
                    <TileInfoPanel selectedTile={selectedTile} />
                ) : (
                    <p className="hud-tile-none" data-testid="tile-info-none">
                        No tile selected: click a tile on the map.
                    </p>
                )}
                <Alerts />
                <NewsPanel />
                <HudGroups open={open} onToggle={toggle} />
            </div>
        </div>
    );
};
