import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import { useGameStore } from "@/store/rootStore";
<<<<<<< HEAD
import { GameMap } from "@/types/Map";
import React, { useRef } from "react";
import { TileComponent } from "./Tile";

interface MapViewProps {
  map: GameMap;
}

export const MapView: React.FC<MapViewProps> = ({ map }) => {
=======
<<<<<<< HEAD
import { GameMap } from "@/types/Map";
import React, { useRef } from "react";
import { TileComponent } from "./Tile";

interface MapViewProps {
  map: GameMap;
}

export const MapView: React.FC<MapViewProps> = ({ map }) => {
=======
<<<<<<< HEAD
import { GameMap } from "@/types/Map";
import React, { useRef } from "react";
import { TileComponent } from "./Tile";

interface MapViewProps {
  map: GameMap;
}

export const MapView: React.FC<MapViewProps> = ({ map }) => {
=======
import React, { useRef } from "react";
import { TileComponent } from "./Tile";

export const MapView: React.FC = () => {
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cameraX = useGameStore((s) => s.cameraX);
  const cameraY = useGameStore((s) => s.cameraY);
  const moveCamera = useGameStore((s) => s.moveCamera);
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
  const map = useGameStore((s) => s.map);
  const nations = useGameStore((s) => s.nations);
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)

  useEdgeScroll({ containerRef, onMove: moveCamera });

  return (
    <div style={{ display: "flex" }}>
      <div
        ref={containerRef}
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          border: "2px solid white",
          position: "relative",
        }}
      >
        <div
          style={{
            transform: `translate(${-cameraX}px, ${-cameraY}px)`,
            display: "grid",
            gridTemplateColumns: `repeat(${map.config.cols}, auto)`,
            width: 'max-content',
          }}
        >
          {map.tiles.flat().map((tile) => (
            <TileComponent key={tile.id} tile={tile} />
          ))}
        </div>

      </div>
    </div>
  );
};
