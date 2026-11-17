"use client";
import React, { useCallback, useEffect, useId, useMemo } from "react";
import { pendingProposalsFor } from "@/engine";
import { useGameStore } from "../store/rootStore";
import { isDialogOpen } from "../store/controls/overlaySlice";
import { offerEffectText, proposalText } from "./diplomacy/diplomacyView";
import styles from "./diplomacy/Diplomacy.module.css";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal } from "./Modal";

/** Enter on these keeps its own meaning (a button's click, a field's input), so it does not accept the offer. */
const ownsEnter = (target: EventTarget | null): boolean =>
  target instanceof HTMLButtonElement ||
  target instanceof HTMLInputElement ||
  target instanceof HTMLSelectElement ||
  target instanceof HTMLTextAreaElement;

/**
 * Accept Offer (FR-175, the Imp1 screen): at the start of the player's turn each proposal made to them opens here,
 * oldest first, once no other dialog is open (FR-409: after the Battle and Council screens, so their Enter answers no
 * offer). Under the Imp1 sentence, what accepting does (FR-411). Accept and Reject build `answerProposal`; Escape
 * rejects and Enter accepts (Imp1: Esc and Return). Closing it (×, or a click on the backdrop, FR-236) leaves the
 * proposal unanswered: its dialog does not come back, the proposer's panel in Diplomacy keeps it answerable (FR-410),
 * and End Turn refuses it if it is still unanswered.
 */
export const AcceptOfferModal: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const dismissed = useGameStore((s) => s.dismissedProposalIds);
  const dismiss = useGameStore((s) => s.dismissProposal);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const waiting = useGameStore(isDialogOpen);
  const titleId = useId();
  const textId = useId();
  const effectId = useId();

  const proposal = useMemo(
    () => (game.gameOver || waiting ? undefined : pendingProposalsFor(game, activeNationId).find((p) => !dismissed.includes(p.id))),
    [game, activeNationId, dismissed, waiting]
  );
  const proposalId = proposal?.id;

  const answer = useCallback(
    (accept: boolean) => {
      if (proposalId) submitOrder({ kind: "answerProposal", nationId: activeNationId, proposalId, accept });
    },
    [proposalId, activeNationId, submitOrder]
  );

  useEffect(() => {
    if (!proposalId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !ownsEnter(e.target)) {
        e.preventDefault();
        answer(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [proposalId, answer]);

  if (!proposal) return null;

  return (
    <Modal
      titleId={titleId}
      describedBy={`${textId} ${effectId}`}
      initialFocus="dialog"
      focusKey={proposal.id}
      onClose={() => dismiss(proposal.id)}
      onEscape={() => answer(false)}
      overlayClassName={styles.offerOverlay}
      className={styles.offer}
    >
        <header className={styles.header}>
          <h2 id={titleId}>
            <GameIcon name={UI_ICONS.diplomacy} />Accept Offer
          </h2>
          <button onClick={() => dismiss(proposal.id)} className={styles.closeButton} aria-label="Close offer" title="Close: an offer not answered by End Turn is refused">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <p id={textId} className={styles.offerText} data-testid="offer-text">
          {proposalText(game, proposal)}
        </p>
        <p id={effectId} className={styles.offerEffect} data-testid="offer-effect">
          {offerEffectText(game, proposal)}
        </p>
        <footer className={styles.offerFooter}>
          <button className={`${styles.button} ${styles.warButton}`} onClick={() => answer(false)}>
            Reject
          </button>
          <span className={styles.offerHint}>Enter accepts, Escape rejects</span>
          <button className={styles.primaryButton} onClick={() => answer(true)}>
            Accept
          </button>
        </footer>
    </Modal>
  );
};

export default AcceptOfferModal;
