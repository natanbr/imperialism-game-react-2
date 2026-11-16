"use client";
import React, { useId } from "react";
import { turnLimitOf } from "@/engine";
import type { SavedGame } from "@/store/persistence";
import { dateText } from "./gameText";
import { Modal } from "./Modal";

/** "Testland, turn 6 of 40, Summer 1816"; a finished game "Testland, game over after turn 40 of 40, Winter 1824" (FR-359). */
export function savedGameText(save: SavedGame): string {
  const { game } = save;
  const name = game.nations.find((n) => n.id === save.activeNationId)?.name ?? save.activeNationId;
  const limit = turnLimitOf(game);
  return game.gameOver
    ? `${name}, game over after turn ${game.gameOver.turn} of ${limit}, ${dateText(game.gameOver.turn, game.gameOver.year)}`
    : `${name}, turn ${game.turn} of ${limit}, ${dateText(game.turn, game.year)}`;
}

/** FR-362: a save that cannot be loaded is not guessed at. */
export const UNUSABLE_SAVE_TEXT = "The saved game could not be loaded (it was made by another version of the game).";

/**
 * The start of the page with a save in the slot (FR-359, FR-362): Continue (focused) restores it, New game throws it away.
 * An unusable save says why and offers New game only. No close: the player picks one, so Escape and the backdrop do
 * nothing. page.tsx mounts it and does what the buttons ask.
 */
export const SavedGameDialog: React.FC<{ save?: SavedGame; onContinue: () => void; onNewGame: () => void }> = ({ save, onContinue, onNewGame }) => {
  const titleId = useId();
  const textId = useId();
  return (
    <Modal titleId={titleId} describedBy={textId} overlayClassName="about-overlay" className="about-panel">
      <div className="about-header">
        <h2 id={titleId} className="about-title">
          Saved game
        </h2>
      </div>
      <p id={textId} data-testid="saved-game-text">
        {save ? savedGameText(save) : UNUSABLE_SAVE_TEXT}
      </p>
      <div className="confirm-actions">
        {save && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onContinue}>
            Continue
          </button>
        )}
        <button type="button" className={`btn btn-sm ${save ? "btn-plain" : "btn-primary"}`} onClick={onNewGame}>
          New game
        </button>
      </div>
    </Modal>
  );
};

export default SavedGameDialog;
