// UI actions shared by the HUD and the game-over screen. Plain functions on the store, no React.
import { cameraOnCapital, mapAreaOf, openingView } from "@/components/camera";
import { useGameStore } from "@/store/rootStore";
import type { NewGameOptions } from "@/engine";

/** The capital back in the middle of the map area (FR-083), scrolled even if the store already agrees (FR-092). */
export function centreOnCapital(): void {
  const { game, activeNationId, moveCamera } = useGameStore.getState();
  const camera = cameraOnCapital(game, activeNationId);
  if (camera) moveCamera(camera.x, camera.y);
}

/**
 * How the map opens (FR-567): the land fitted to the map area, or on a screen smaller than the land 100% on the capital
 * (FR-083). On the first view, a continued game and a new one.
 */
export function openMap(): void {
  const { game, activeNationId, zoomTo } = useGameStore.getState();
  const view = openingView(game, activeNationId, mapAreaOf(window));
  zoomTo(view.zoom, view.camera);
}

export function startGameOnCapital(options: Partial<NewGameOptions>): void {
  useGameStore.getState().startNewGame(options);
  openMap();
}

/** A new game, with the map opened on its land or its capital (FR-109, FR-567). */
export function startNewGameOnCapital(): void {
  startGameOnCapital({ difficulty: "normal" });
}
