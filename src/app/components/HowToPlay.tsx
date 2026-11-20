"use client";
import React, { useId } from "react";
import { COUNCIL, OVERTURE_COST, turnLimitOf, votesNeeded } from "@/engine";
import { MINOR_DEMAND } from "@/definisions/partnersMarket";
import type { GameState } from "@/types/GameState";
import { useGameStore } from "@/store/rootStore";
import { commodityName, councilEndRule, money } from "./gameText";
import { Modal } from "./Modal";

/** "a", "a and b", "a, b and c". */
const andList = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export interface HowToPlayText {
  goal: string;
  money: string;
  firstTurn: string[];
}

/**
 * FR-431: what How to play says, its numbers read from the game (turn limit, Council turns, votes needed) and the rules
 * (the consulate's price, what a minor buys). A world without provinces, or a turn limit before the first meeting, has no
 * Council: the goal is the score alone.
 */
export function howToPlayText(state: GameState): HowToPlayText {
  const limit = turnLimitOf(state);
  const councilTurns: number[] = [];
  if (state.provinces.length > 0) for (let turn = COUNCIL.firstTurn; turn <= limit; turn += COUNCIL.interval) councilTurns.push(turn);
  const votes = state.provinces.length;
  const goal =
    councilTurns.length === 0
      ? `Have the best score after ${limit} turns.`
      : `The Council of Governors meets on ${councilTurns.length === 1 ? "turn" : "turns"} ${andList(councilTurns.map(String))}. ${councilEndRule(votesNeeded(votes, state.nations.length), votes, councilTurns[councilTurns.length - 1])}`;
  const goods = andList(Object.keys(MINOR_DEMAND).map((key) => commodityName(key).toLowerCase()));
  return {
    goal,
    money: `Open a consulate with a minor nation in Diplomacy (${money(OVERTURE_COST.consulate)}). Once it opens at End Turn, that minor buys ${goods} from you on the Board of Trade.`,
    firstTurn: [
      "Pick a civilian from the stack at your capital and click a tile to send it there or set it to work.",
      "Open Capital and set what your mills and factories make.",
      'End the turn with Advance Turn or the key "n".',
    ],
  };
}

/**
 * How to play (FR-430, FR-431): the goal, how money is made and a first turn. page.tsx opens it on a browser's first new
 * game and About opens it at any time; Close (focused) and Escape close it, and page.tsx records that it was seen.
 * FR-529: in a short window (640x360, 1280x720 at 200% zoom) only the text scrolls, the title and Close stay in view; the
 * text is a Tab stop before Close, so the focus opens on Close, the last control (as the Council's body, FR-425).
 */
export const HowToPlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const game = useGameStore((s) => s.game);
  const titleId = useId();
  const text = howToPlayText(game);
  return (
    <Modal titleId={titleId} onClose={onClose} initialFocus="last-control" overlayClassName="about-overlay" className="about-panel howto-panel">
      <div className="about-header">
        <h2 id={titleId} className="about-title">
          How to play
        </h2>
      </div>
      <div className="howto-body" tabIndex={0} role="region" aria-label="How to play text">
        <h3>The goal</h3>
        <p data-testid="howto-goal">{text.goal}</p>
        <h3>Making money</h3>
        <p data-testid="howto-money">{text.money}</p>
        <h3>Your first turn</h3>
        <ol data-testid="howto-first-turn">
          {text.firstTurn.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </div>
      <div className="confirm-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
};

export default HowToPlay;
