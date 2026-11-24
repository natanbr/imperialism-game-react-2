"use client";
import React, { useId, useMemo, useRef, useState } from "react";
import { useGameStore } from "../../store/rootStore";
import { selectActiveNation } from "../../store/selectors";
import type { Order } from "@/engine";
import type { TradeCommodity } from "@/types/Market";
import { money } from "../gameText";
import { boardView, lastTurnTrades, repeatTrades, startSide, type BoardRowView, type PartnerView, type TradeSide } from "./boardView";
import { Stepper } from "./Stepper";
import { BoardDetails } from "./BoardDetails";
import { TradePolicies } from "./TradePolicies";
import styles from "./Market.module.css";
import { UI_ICONS } from "../icons";
import { GameIcon } from "../GameIcon";
import { Modal } from "../Modal";
import { InkPicture } from "../art/ArtPicture";
import { goodsArt } from "../art/inkArt";
import { NationFlag } from "../NationFlag";

type TabId = "board" | "details" | "policies";

/** FR-577: the three views of the Board of Trade, in this order; each opening starts on the first. */
const TABS: readonly { id: TabId; name: string }[] = [
  { id: "board", name: "Board" },
  { id: "details", name: "Details" },
  { id: "policies", name: "Trade policies" },
];

/**
 * FR-574: "Sellers" or "Buyers" and the minors' flags, nothing more (their units are on the Details tab). A minor we
 * cannot trade with this turn is dimmed and outlined, and its tooltip and accessible name give the reason.
 */
const FlagList: React.FC<{ label: "Sellers" | "Buyers"; partners: PartnerView[]; testId: string }> = ({ label, partners, testId }) => (
  <div className={styles.partners} data-testid={testId}>
    {/* The list carries the name for assistive technology; the visible label is not read twice */}
    <span className={styles.partnersLabel} aria-hidden="true">
      {label}
    </span>
    <ul className={styles.flagList} aria-label={label}>
      {partners.map((p) => {
        const name = p.barrier ? `${p.name} (${p.barrier})` : p.name;
        return (
          <li key={p.minorId} className={p.barrier ? styles.flagBarred : styles.flag} data-barred={p.barrier ? "true" : undefined}>
            <span role="img" aria-label={name} title={name}>
              <NationFlag nationId={p.minorId} />
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);

/** FR-574: the row's one order, Buy or Sell (rules 06 section 2: a commodity is bought or sold in a turn, never both). */
const SideChoice: React.FC<{ name: string; side: TradeSide; onChoose: (side: TradeSide) => void }> = ({ name, side, onChoose }) => (
  <span className={styles.sideChoice}>
    {(["buy", "sell"] as const).map((s) => (
      <button
        key={s}
        type="button"
        className={styles.sideButton}
        aria-pressed={side === s}
        aria-label={`${s === "buy" ? "Buy" : "Sell"} ${name}`}
        onClick={() => onChoose(s)}
      >
        {s === "buy" ? "Buy" : "Sell"}
      </button>
    ))}
  </span>
);

/**
 * The Board of Trade (FR-194, FR-248, FR-252 to FR-254; M18c FR-573 to FR-577; Imp1 Board of Trade, rules 11 sections 1
 * and 1.2). A bar of figures under the title (cash, what this turn's purchases took, the buying power left, holds and
 * purchases, FR-573), then three tabs (FR-577): the Board, one row per commodity in the Board order with Price, Available,
 * a Buy/Sell choice and one stepper for that side, and the minors' flags (FR-574); Details, what the Board no longer shows
 * (FR-575); Trade policies, the subsidy and boycott toward each country (FR-576). Every control sends one order through
 * submitOrder, and a "+" the engine would refuse is disabled with its reason in its tooltip and accessible name. A fixed
 * frame: at 1280x720 the dialog fits the window and only the open tab scrolls.
 */
export const BoardOfTrade: React.FC = () => {
  const close = useGameStore((s) => s.closeMarket);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);
  const titleId = useId();
  const tabsId = useId();

  const orderLog = useGameStore((s) => s.orderLog);
  const [repeated, setRepeated] = useState<{ turn: number; text: string } | null>(null);
  // Mounted only while the market is open (MarketModal), so each opening starts on the Board (FR-577)
  const [tab, setTab] = useState<TabId>("board");
  const tabButtons = useRef(new Map<TabId, HTMLButtonElement>());

  const view = useMemo(() => (nation ? boardView(game, nation) : null), [game, nation]);
  // FR-574: each row's side as the dialog opened, so a row does not jump sides while the holds or the cash run out
  const [chosen, setChosen] = useState<Partial<Record<TradeCommodity, TradeSide>>>(() =>
    Object.fromEntries((view?.rows ?? []).map((row) => [row.commodity, startSide(row)]))
  );
  // FR-397: last turn's bids and offers, from the order log (NR-018 kept: the engine holds no standing trade order)
  const lastTrades = useMemo(() => (nation ? lastTurnTrades(orderLog, nation.id, game.turn) : []), [orderLog, nation, game.turn]);

  const send = (kind: "sellCommodity" | "buyCommodity", commodity: TradeCommodity) => (amount: number) => {
    if (!nation) return;
    const order: Order = { kind, nationId: nation.id, commodity, amount };
    submitOrder(order);
  };

  /** A row with an order stays on its side; otherwise the side chosen, or the one it started on. */
  const sideOf = (row: BoardRowView): TradeSide => (row.bid > 0 ? "buy" : row.offer > 0 ? "sell" : (chosen[row.commodity] ?? startSide(row)));

  /** FR-574: switching sides first takes back the other side's order (an order of 0), then shows the chosen stepper. */
  const choose = (row: BoardRowView) => (side: TradeSide) => {
    if (side === sideOf(row)) return;
    if (side === "sell" && row.bid > 0) send("buyCommodity", row.commodity)(0);
    if (side === "buy" && row.offer > 0) send("sellCommodity", row.commodity)(0);
    setChosen((current) => ({ ...current, [row.commodity]: side }));
  };

  /** FR-397, FR-398: each unit through submitOrder; the line says how many and, for a refused one, why. Shown this turn only. */
  const repeat = () => {
    if (!nation) return;
    const outcome = repeatTrades(lastTrades, nation.id, () => useGameStore.getState().game, submitOrder);
    setRepeated({ turn: game.turn, text: outcome.text });
  };

  /** FR-577: Left and Right (wrapping), Home and End move the focus and open that tab; only the open tab is in the Tab order. */
  const onTabKey = (e: React.KeyboardEvent) => {
    const at = TABS.findIndex((t) => t.id === tab);
    const targets: Record<string, number> = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: TABS.length - 1 };
    const target = targets[e.key];
    if (target === undefined) return;
    e.preventDefault();
    const next = TABS[(target + TABS.length) % TABS.length].id;
    setTab(next);
    tabButtons.current.get(next)?.focus();
  };
  const tabId = (id: TabId) => `${tabsId}-tab-${id}`;
  const panelId = `${tabsId}-panel`;

  return (
    <Modal titleId={titleId} onClose={close} overlayClassName={styles.overlay} className={styles.board}>
      <header className={styles.header}>
        <h2 id={titleId}>
          <GameIcon name={UI_ICONS.market} />Board of Trade — {nation && <NationFlag nationId={nation.id} />}
          {nation?.name ?? "Unknown"}
        </h2>
        <button onClick={close} className={styles.closeButton} aria-label="Close Board of Trade">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {view && (
        <div className={styles.statusBar} data-testid="board-status">
          <span data-testid="market-cash" title="The treasury before this turn's purchases">
            Cash: <strong>{money(view.cash)}</strong>
          </span>
          <span data-testid="market-committed" title="Paid for this turn's purchases at the board price; any unit not bought is paid back at End Turn">
            Committed: <strong>{money(view.committed)}</strong>
          </span>
          <span data-testid="market-power" title="The cash left after this turn's purchases">
            Buying power: <strong>{money(view.treasury)}</strong>
          </span>
          <span data-testid="market-holds" title="Every unit traded takes one hold this turn">
            {view.holdsText}
          </span>
          <span data-testid="market-bids" title="At most this many commodities can be bought in one turn">
            {view.bidsText}
          </span>
          {nation && lastTrades.length > 0 && (
            <span className={styles.repeat}>
              <button type="button" className={styles.plainButton} onClick={repeat}>
                Repeat last turn&apos;s trades
              </button>
              {repeated?.turn === game.turn && (
                <span data-testid="repeat-result" role="status">
                  {repeated.text}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      <div role="tablist" aria-label="Board of Trade views" className={styles.tabs} onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              if (el) tabButtons.current.set(t.id, el);
              else tabButtons.current.delete(t.id);
            }}
            id={tabId(t.id)}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={tab === t.id ? panelId : undefined}
            tabIndex={tab === t.id ? 0 : -1}
            className={`${styles.tab} ${tab === t.id ? styles.tabSelected : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {view && nation && (
        <div role="tabpanel" id={panelId} aria-labelledby={tabId(tab)} className={styles.boardPane} data-testid={`board-tab-${tab}`}>
          {tab === "board" && (
            <table className={`${styles.table} ${styles.boardTable}`}>
              <thead>
                <tr>
                  <th>Commodity</th>
                  <th className={styles.number}>Price</th>
                  <th className={styles.number}>Available</th>
                  <th>Order</th>
                  <th>Quantity</th>
                  <th>Market</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => {
                  const side = sideOf(row);
                  return (
                    <tr key={row.commodity} data-testid={`trade-row-${row.commodity}`}>
                      <td className={styles.fixed} data-testid="name">
                        <InkPicture src={goodsArt(row.commodity)} alt="" inline />{row.name}
                      </td>
                      <td className={`${styles.number} ${styles.fixed}`} data-testid="price">
                        {money(row.price)}
                      </td>
                      <td className={`${styles.number} ${styles.fixed}`} data-testid="available">
                        {row.available}
                      </td>
                      <td className={styles.fixed} data-testid="order">
                        <SideChoice name={row.name} side={side} onChoose={choose(row)} />
                      </td>
                      <td className={styles.stepCell}>
                        {side === "buy" ? (
                          <Stepper
                            label="Buy"
                            name={row.name}
                            value={row.bid}
                            testId="bid"
                            moreRefusal={row.bidMoreRefusal}
                            hideLessAtZero
                            refusalInName
                            onChange={send("buyCommodity", row.commodity)}
                          />
                        ) : (
                          <Stepper
                            label="Sell"
                            name={row.name}
                            value={row.offer}
                            testId="offer"
                            moreRefusal={row.offerMoreRefusal}
                            hideLessAtZero
                            refusalInName
                            onChange={send("sellCommodity", row.commodity)}
                          />
                        )}
                      </td>
                      <td className={styles.partnersCell} data-testid="market">
                        {row.sellers.length > 0 && <FlagList label="Sellers" partners={row.sellers} testId="sellers" />}
                        {row.buyers.length > 0 && <FlagList label="Buyers" partners={row.buyers} testId="buyers" />}
                        {row.noMinorText && (
                          <span className={styles.noMinor} role="img" aria-label={row.noMinorText} title={row.noMinorText} data-testid="no-minor-mark">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {tab === "details" && <BoardDetails view={view} />}
          {tab === "policies" && <TradePolicies game={game} nationId={nation.id} submitOrder={submitOrder} />}
        </div>
      )}
    </Modal>
  );
};

export default BoardOfTrade;
