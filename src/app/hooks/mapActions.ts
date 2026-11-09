// UI actions shared by the HUD and the game-over screen. Plain functions on the store, no React.
import { cameraOnCapital } from "@/components/camera";
import { useGameStore } from "@/store/rootStore";

/** The capital back in the middle of the map area (FR-083), scrolled even if the store already agrees (FR-092). */
export function centreOnCapital(): void {
  const { game, activeNationId, moveCamera } = useGameStore.getState();
  const camera = cameraOnCapital(game, activeNationId);
  if (camera) moveCamera(camera.x, camera.y);
}

/** A new game, with the map centred on its capital (FR-109). */
export function startNewGameOnCapital(): void {
  useGameStore.getState().startNewGame();
  centreOnCapital();
}
