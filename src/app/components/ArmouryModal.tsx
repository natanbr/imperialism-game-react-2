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

/** "Cost: 1 untrained worker, 1 armament, $500" as a named list on one line (FR-264). */
const CostList: React.FC<{ items: readonly ArmouryItem[] }> = ({ items }) => (
  <div className={styles.items}>
    {/* The list carries the name for assistive technology; the visible label is not read twice */}
    <span className={styles.itemsLabel} aria-hidden="true">
      Cost:
    </span>
    <ul className={styles.itemList} aria-label="Cost">
      {items.map((item) => {
        const icon = ITEM_ICONS[item.key];
        return (
          <li key={item.key} className={styles.item}>
            {icon && <GameIcon name={icon} />} {item.text}
          </li>
        );
      })}
    </ul>
  </div>
);

/**
 * "At hand", one line per item (FR-264): "Armaments: 1 in warehouse, 1 reserved by this order", a short item marked
 * "(short)" in text as well as colour. The line wraps only between its parts, so an amount is never cut.
 */
const AtHandList: React.FC<{ items: readonly AtHandItem[] }> = ({ items }) => (
  <div className={styles.items}>
    <span className={styles.itemsLabel} aria-hidden="true">
      At hand:
    </span>
    <ul className={`${styles.itemList} ${styles.atHandList}`} aria-label="At hand">
      {items.map((item) => {
        const icon = ITEM_ICONS[item.key];
        const [first, ...rest] = item.parts;
        return (
          <li key={item.key} className={`${styles.atHandItem} ${item.short ? styles.short : ""}`} data-short={item.short ? "true" : undefined}>
            <span className={styles.part}>
              {icon && <GameIcon name={icon} />} {item.label}: {first}
              {rest.length > 0 ? "," : ""}
            </span>
            {rest.map((part, i) => (
              <React.Fragment key={part}>
                {" "}
                <span className={styles.part}>
                  {part}
                  {i < rest.length - 1 ? "," : ""}
                </span>
              </React.Fragment>
            ))}
            {item.short && (
              <>
                {" "}
                <span className={`${styles.part} ${styles.shortMark}`}>(short)</span>
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
    <CostList items={card.cost} />
    <AtHandList items={card.atHand} />
    <div className={styles.order}>
      <span className={styles.orderLabel}>This turn:</span>
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
        {/* In the header, so the three rows of cards keep the height (FR-264) */}
        <p id={noteId} className={styles.headerNote} data-testid="armoury-note">
          New regiments join the army in the capital next turn.
        </p>
        {view && (
          <span className={styles.summary} data-testid="armoury-cash">
            Cash: <strong>{money(view.treasury)}</strong>
          </span>
        )}
        {view && (
          <span className={styles.summary} data-testid="army-upkeep">
            {view.upkeep}
          </span>
        )}
        <button className={styles.closeButton} onClick={close} aria-label="Close Armoury">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {view?.upkeepWarning && (
        <div className={styles.warning} role="status" data-testid="army-upkeep-warning">
          {view.upkeepWarning}
        </div>
      )}

      {lastRejection && (
        <div className={styles.refusal} role="alert" data-testid="armoury-refusal">
          {refusalText(lastRejection)}
        </div>
      )}

      {view && (
        <div className={styles.cards} data-testid="armoury-cards">
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
