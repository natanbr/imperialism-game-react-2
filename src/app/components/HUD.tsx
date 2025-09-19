import React from "react";
import { TileInfoPanel } from "./TileInfoPanel";
import { useGameStore } from '../store/rootStore';
import { GameMap } from '../types/Map';

interface HUDProps {
    map: GameMap;
}

export const HUD: React.FC<HUDProps> = ({ map }) => {
    const selectedTileId = useGameStore((s) => s.selectedTileId);

    return (
        <div
        style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "250px",
            height: "100%",
            backgroundColor: "#222",
            color: "#eee",
            padding: "12px",
            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            zIndex: 10,
            overflowY: "auto",
        }}
        >
        <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>HUD</h2>
        <TileInfoPanel selectedTile={map.tiles.flat().find(tile => tile.id === selectedTileId)} />
        {/* Later: add unit info, stockpile, turn controls */}
        </div>
    );
};



  
        