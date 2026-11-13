"use client";
import React, { useId, useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { selectActiveNation } from "../store/selectors";
import type { Order } from "@/engine";
import { money, refusalText } from "./gameText";
import { armouryView, type ArmouryCardView, type ArmouryItem, type ArmouryItemKey, type AtHandItem } from "./army/armouryView";
import { Stepper } from "./market/Stepper";
import styles from "./army/Army.module.css";
import { COMMODITY_ICONS, UI_ICONS, type IconName } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal } from "./Modal";

const ITEM_ICONS: Record<ArmouryItemKey, IconName | null> = {
  worker: UI_ICONS.civilians,
  armaments: COMMODITY_ICONS.armaments,
  horses: COMMODITY_ICONS.horses,
  cash: null,
};

/** "Cost: 1 untrained worker, 1 armaments, $500" or "At hand: ... 0 armaments (short) ..." as a named list. */
const ItemList: React.FC<{ label: "Cost" | "At hand"; items: readonly (ArmouryItem | AtHandItem)[] }> = ({ label, items }) => (
  <div className={styles.items}>
    {/* The list carries the name for assistive technology; the visible label is not read twice */}
    <span className={styles.itemsLabel} aria-hidden="true">
      {label}:
    </span>
    <ul className={styles.itemList} aria-label={label}>
      {items.map((item) => {
        const short = "short" in item && item.short;
        const icon = ITEM_ICONS[item.key];
        return (
          <li key={item.key} className={`${styles.item} ${short ? styles.short : ""}`} data-short={short ? "true" : undefined}>
            {icon && <GameIcon name={icon} />} {item.text}
            {short && (
              <>
                {" "}
                <span>(short)</span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  </div>
);

const RegimentCard: React.FC<{ card: ArmouryCardView; onChange: (count: number) => void }> = ({ card, onChange }) => (
  <article className={styles.card} aria-label={card.name}>
    <div className={styles.cardHead}>
      <h3>{card.name}</h3>
      <span className={styles.category}>{card.category}</span>
    </div>
    <p className={styles.stats} data-testid="stats">
      <span>
        Firepower <strong>{card.firepower}</strong>
      </span>
      <span>
        Move <strong>{card.move}</strong>
      </span>
      <span>
        Range <strong>{card.range}</strong>
      </span>
      <span>Entrench: {card.entrench ? "yes" : "no"}</span>
    </p>
    <ItemList label="Cost" items={card.cost} />
    <ItemList label="At hand" items={card.atHand} />
    <div className={styles.order}>
      <span className={styles.itemsLabel}>This turn:</span>
      <Stepper
        label="Recruit"
        name={card.name}
        value={card.count}
        testId="count"
        moreRefusal={card.moreRefusal}
        note={card.moreRefusal ? { text: card.moreRefusal, tone: "refusal" } : undefined}
        hideLessAtZero
        onChange={onChange}
      />
    </div>
  </article>
);

/** The Armoury's content; mounted only while it is open. */
const Armoury: React.FC = () => {
  const close = useGameStore((s) => s.closeArmoury);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const lastRejection = useGameStore((s) => s.lastRejection);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);
  const titleId = useId();
  const noteId = useId();

  const view = useMemo(() => (nation ? armouryView(game, nation) : null), [game, nation]);

  const recruit = (card: ArmouryCardView) => (count: number) => {
    if (!nation) return;
    const order: Order = { kind: "setRecruitment", nationId: nation.id, regiment: card.type, count };
    submitOrder(order);
  };

  return (
    <Modal titleId={titleId} describedBy={noteId} onClose={close} overlayClassName={styles.overlay} className={styles.armoury}>
      <header className={styles.header}>
        <h2 id={titleId}>
          <GameIcon name={UI_ICONS.armoury} /> Armoury
        </h2>
        {view && (
          <span className={styles.summary} data-testid="armoury-cash">
            Cash: <strong>{money(view.treasury)}</strong>
          </span>
        )}
        <button className={styles.closeButton} onClick={close} aria-label="Close Armoury">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <p id={noteId} className={styles.note} data-testid="armoury-note">
        New regiments join the army in the capital next turn.
      </p>

      {lastRejection && (
        <div className={styles.refusal} role="alert" data-testid="armoury-refusal">
          {refusalText(lastRejection)}
        </div>
      )}

      {view && (
        <div className={styles.cards}>
          {view.cards.map((card) => (
            <RegimentCard key={card.type} card={card} onChange={recruit(card)} />
          ))}
        </div>
      )}
    </Modal>
  );
};

/**
 * The Armoury (FR-212; Imp1 Armory, rules 11 section 4): one card per recruitable regiment (FR-200) with its stats, its
 * cost, what is at hand (a short item marked "short") and this turn's count with "−" and "+" (`setRecruitment`); "+" is
 * disabled with its reason when the engine would refuse one more. Opened from the capital dialog on a world with provinces.
 */
export const ArmouryModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isArmouryOpen);
  if (!isOpen) return null;
  return <Armoury />;
};

export default ArmouryModal;
