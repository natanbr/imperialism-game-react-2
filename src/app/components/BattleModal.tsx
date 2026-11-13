"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BattleReport } from "@/engine";
import { useGameStore } from "../store/rootStore";
import { battleView, FATE_TEXT, stepText, type BattleTokenView } from "./army/battleView";
import styles from "./army/War.module.css";
import { FortPicture, RegimentPicture } from "./art/ArtPicture";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal } from "./Modal";

/** One round a second while "Play" runs (FR-231). */
const ROUND_MS = 1000;

/** Imp1's bar colours: green while fit, yellow when hurt, red near broken (the FR-220 rout line, 25). */
const barClass = (health: number) => (health <= 25 ? styles.broken : health <= 50 ? styles.hurt : "");

/** A regiment on the battlefield: its picture, its owner's swatch and name, its health bar with the number. */
const Token: React.FC<{ token: BattleTokenView; health: number; status: string; firstColumn: number }> = ({ token, health, status, firstColumn }) => (
  <li
    className={`${styles.token} ${status ? styles.tokenOut : ""}`}
    data-column={token.column}
    style={{ gridColumn: token.column - firstColumn + 1, gridRow: token.row }}
  >
    <RegimentPicture type={token.type} size={36} className={styles.tokenPicture} />
    <span className={styles.tokenBody}>
      <span className={styles.tokenName}>
        <span className={styles.swatch} style={{ background: token.color }} aria-hidden="true" data-testid="token-swatch" />
        <span data-testid="token-name">{token.name}</span>
      </span>
      <span className={styles.tokenHealth}>
        <span className={styles.tokenTrack} aria-hidden="true">
          <span className={`${styles.tokenBar} ${barClass(health)}`} style={{ width: `${health}%` }} data-testid="token-bar" />
        </span>
        <span data-testid="token-health">{health}%</span>
        {status && (
          <span className={styles.tokenStatus} data-testid="token-status">
            {status}
          </span>
        )}
      </span>
    </span>
  </li>
);

/** The replay of one report; keyed by its place in the queue, so the next battle starts at its deployment. */
const BattleReplay: React.FC<{ report: BattleReport; remaining: number }> = ({ report, remaining }) => {
  const close = useGameStore((s) => s.closeBattle);
  const game = useGameStore((s) => s.game);
  const playerId = useGameStore((s) => s.activeNationId);
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const view = useMemo(() => battleView(report, game, playerId), [report, game, playerId]);
  const rounds = view.rounds.length;
  // 0 the deployment, 1 to n the rounds, n + 1 the result
  const result = rounds + 1;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const running = playing && step < result;

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setStep((s) => Math.min(s + 1, result)), ROUND_MS);
    return () => clearTimeout(timer);
  }, [running, step, result]);

  // At the result Next round and Skip are disabled: the focus they held goes to Close
  useEffect(() => {
    if (step !== result) return;
    const active = document.activeElement;
    if (!active || active === document.body || (active instanceof HTMLButtonElement && active.disabled)) closeButton.current?.focus();
  }, [step, result]);

  const frame = view.frames[Math.min(step, view.frames.length - 1)];
  const now = new Map(frame.regiments.map((r) => [r.id, r]));
  const atResult = step === result;
  const wall = view.fortLevel >= 1;
  const side = (which: "attacker" | "defender") => view.tokens.filter((t) => t.side === which);
  const token = (t: BattleTokenView, firstColumn: number) => {
    const r = now.get(t.id)!;
    return <Token key={t.id} token={t} health={r.health} status={FATE_TEXT[r.status]} firstColumn={firstColumn} />;
  };
  const won = view.resultText === "Province Taken!" || view.resultText === "Enemy Beaten Back!";

  return (
    <Modal titleId={titleId} onClose={close} overlayClassName={styles.battleOverlay} className={styles.battle}>
      <header className={styles.header}>
        <h2 id={titleId}>
          <GameIcon name={UI_ICONS.battle} /> {view.title}
        </h2>
        <span className={styles.summary}>
          {view.attackersName} attacked {view.defenderName}
        </span>
      </header>

      <div className={styles.battleBody}>
        <div className={styles.field}>
          <ul className={styles.fieldSide} aria-label={`Attackers: ${view.attackersName}`}>
            {side("attacker").map((t) => token(t, 1))}
          </ul>
          {wall && (
            <div className={styles.wall} data-testid="battle-wall">
              <FortPicture level={view.fortLevel} alt={`Fort level ${view.fortLevel}`} size={56} className={styles.wallPicture} />
            </div>
          )}
          <ul className={styles.fieldSide} aria-label={`Defenders: ${view.defenderName}`}>
            {side("defender").map((t) => token(t, wall ? 4 : 3))}
          </ul>
        </div>

        <div className={styles.log}>
          <p className={styles.step} aria-live="polite" data-testid="battle-step">
            {stepText(step, rounds)}
          </p>
          {atResult ? (
            <>
              <p className={`${styles.result} ${won ? styles.won : styles.lost}`} role="status" data-testid="battle-result">
                {view.resultText}
              </p>
              <ul className={styles.casualties} aria-label="Casualties">
                {view.casualties.map((c) => (
                  <li key={c.id} className={styles.casualty}>
                    <span className={styles.swatch} style={{ background: c.color }} aria-hidden="true" />
                    <span>{c.name}</span> <span className={styles.casualtyText}>{c.text}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : step === 0 ? (
            <p className={styles.hint}>Each round the defenders fire first, then the attackers: cavalry, infantry, then artillery.</p>
          ) : (
            <ol className={styles.shots} aria-label={`Shots of round ${step}`}>
              {view.rounds[step - 1].map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.button} disabled={atResult} onClick={() => setStep((s) => Math.min(s + 1, result))}>
          Next round
        </button>
        <button type="button" className={styles.button} disabled={atResult} onClick={() => setPlaying(!running)}>
          {running ? "Pause" : "Play"}
        </button>
        <button type="button" className={styles.button} disabled={atResult} onClick={() => setStep(result)}>
          Skip to result
        </button>
        {remaining > 0 && (
          <span className={`${styles.more} ${styles.footerEnd}`} data-testid="battles-left">
            {remaining === 1 ? "1 more battle to see" : `${remaining} more battles to see`}
          </span>
        )}
        <button ref={closeButton} type="button" className={`${styles.button} ${remaining > 0 ? "" : styles.footerEnd}`} onClick={close}>
          Close
        </button>
      </footer>
    </Modal>
  );
};

/**
 * The Battle screen (FR-231; Imp1 battlefield and casualty book, rules 11 sections 6 and 7): it replays the first report
 * of the store's `battleQueue` round by round on a small grid, from the report alone, and ends with the result line for
 * the player's side and the casualties. End Turn queues the battles the player fought (FR-232); a news line one battle.
 * It builds no order.
 */
export const BattleModal: React.FC = () => {
  const queue = useGameStore((s) => s.battleQueue);
  const report = queue[0];
  if (!report) return null;
  return <BattleReplay key={`${queue.length}-${report.provinceId}-${report.nationId}`} report={report} remaining={queue.length - 1} />;
};

export default BattleModal;
