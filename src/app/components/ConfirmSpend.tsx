"use client";
import React, { useId } from "react";
import { useGameStore } from "@/store/rootStore";
import { submitAndSay } from "@/hooks/tileClickOrders";
import { Modal } from "./Modal";
import { money } from "./gameText";

/**
 * The question before an order of $1,000 or more (FR-383, card Q82): the job, the tile, the price, the turns and the cancel
 * rule, then "Spend $5,000" and "Keep the money". Only Spend sends the order; Keep, Escape and the backdrop send nothing.
 * After a map click's Spend the civilian selection ends on the clicked tile, as after any job ordered by a click.
 */
export const ConfirmSpend: React.FC = () => {
  const spend = useGameStore((s) => s.pendingSpend);
  const closeSpend = useGameStore((s) => s.closeSpend);
  const titleId = useId();
  const questionId = useId();

  if (!spend) return null;

  const onSpend = () => {
    const { selectWorker, selectTile } = useGameStore.getState();
    closeSpend();
    submitAndSay(spend.order);
    if (spend.selectTileId !== undefined) {
      selectWorker(undefined);
      selectTile(spend.selectTileId);
    }
  };

  return (
    <Modal titleId={titleId} describedBy={questionId} onClose={closeSpend} overlayClassName="question-overlay" className="question-dialog" portal>
      <h2 id={titleId} className="question-title">
        Spend {money(spend.price)}?
      </h2>
      <p id={questionId} className="question-text">
        {spend.question}
      </p>
      <div className="question-answers">
        <button type="button" className="btn btn-primary" onClick={onSpend}>
          Spend {money(spend.price)}
        </button>
        <button type="button" className="btn btn-plain" onClick={closeSpend}>
          Keep the money
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmSpend;
