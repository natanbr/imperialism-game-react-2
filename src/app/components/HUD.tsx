import React from "react";
import { TileInfoPanel } from "./TileInfoPanel";
import { useGameStore } from '../store/rootStore';
<<<<<<< HEAD
=======
<<<<<<< HEAD
import { GameMap } from '../types/Map';
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
import { GameMap } from '../types/Map';

interface HUDProps {
    map: GameMap;
}

export const HUD: React.FC<HUDProps> = ({ map }) => {
    const selectedTileId = useGameStore((s) => s.selectedTileId);
<<<<<<< HEAD
=======
=======
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)

interface HUDProps {
    map: GameMap;
}

export const HUD: React.FC<HUDProps> = ({ map }) => {
    const selectedTileId = useGameStore((s) => s.selectedTileId);
<<<<<<< HEAD
=======
    const map = useGameStore((s) => s.map);
    const turn = useGameStore((s) => s.turn);
    const year = useGameStore((s) => s.year);
    const advanceTurn = useGameStore((s) => s.advanceTurn);

    const selectedTile = map.tiles.flat().find(tile => tile.id === selectedTileId);
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)

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
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
        }}
        >
        <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>HUD</h2>
        <TileInfoPanel selectedTile={map.tiles.flat().find(tile => tile.id === selectedTileId)} />
        {/* Later: add unit info, stockpile, turn controls */}
        </div>
    );
};





=======
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
        }}
        >
        <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>HUD</h2>
        <TileInfoPanel selectedTile={map.tiles.flat().find(tile => tile.id === selectedTileId)} />
        {/* Later: add unit info, stockpile, turn controls */}
        </div>
    );
};
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)




<<<<<<< HEAD

=======

=======
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
