import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import { useGameStore } from "@/store/rootStore";
import React, { useRef } from "react";
import { TileComponent } from "./Tile";

export const MapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cameraX = useGameStore((s) => s.cameraX);
  const cameraY = useGameStore((s) => s.cameraY);
  const moveCamera = useGameStore((s) => s.moveCamera);
  const map = useGameStore((s) => s.map);
  const nations = useGameStore((s) => s.nations);

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
            width: 'max-content',
          }}
        >
          {map.tiles.map((row, y) => (
            <div key={y} style={{ display: "flex", marginLeft: y % 2 === 1 ? 50 : 0 }}>
              {row.map((tile) => (
                <TileComponent key={tile.id} tile={tile} />
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
