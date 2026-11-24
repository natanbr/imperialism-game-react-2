import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "@/store/rootStore";
import type { Toast } from "@/store/controls/toastSlice";
import { refusalText } from "./gameText";
import styles from "./Toasts.module.css";

/** FR-569: how long a message that is not an error stays unless closed. */
export const TOAST_MS = 6000;

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const dismiss = useGameStore((s) => s.dismissToast);
  useEffect(() => {
    // An error has no timer: it stays until Close or the next accepted order (see Toasts)
    if (toast.tone === "error") return;
    const timer = setTimeout(() => dismiss(toast.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [dismiss, toast.id, toast.tone]);
  return (
    <div className={`${styles.toast} ${toast.tone === "error" ? styles.error : ""}`} data-testid="toast">
      <span className={styles.text} data-testid="toast-text">
        {toast.text}
      </span>
      <button type="button" className={`icon-button ${styles.close}`} aria-label="Close message" onClick={() => dismiss(toast.id)}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
};

/**
 * FR-569 (owner feedback 2026-11-23): refused orders, and any other message, as toasts in a fixed stack under the top
 * bar at the map area's top left (clear of the zoom buttons and the status line at its bottom; over an open dialog's
 * title, not its buttons), so nothing is pushed down. Each refused order the store records (`lastRejection`, a new object
 * per refusal) becomes one toast. Trap: an open dialog keeps the keyboard inside it (Modal's focus trap), so an error
 * toast's Close cannot be reached by keyboard; errors therefore have no timer and leave with the next accepted order, a
 * dialog opened or the turn ended (the store then clears `lastRejection`), or Close. Other messages stay 6 s. Two live
 * regions, present before any toast so screen readers announce what enters them: errors assertive, the rest polite.
 * Rendered into the body, above every dialog, after the first client render (no portal on the server).
 */
export const Toasts: React.FC = () => {
  const toasts = useGameStore((s) => s.toasts);
  const showToast = useGameStore((s) => s.showToast);
  const dismissErrors = useGameStore((s) => s.dismissErrors);
  const rejection = useGameStore((s) => s.lastRejection);
  // The refusal already there when the stack mounts (a restored page) is old news: only later ones become toasts
  const seen = useRef(rejection);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (rejection && rejection !== seen.current) showToast(refusalText(rejection), "error");
    else if (!rejection && seen.current) dismissErrors();
    seen.current = rejection;
  }, [rejection, showToast, dismissErrors]);

  if (!mounted) return null;
  return createPortal(
    <div className={styles.stack} data-testid="toasts">
      <div role="alert" aria-live="assertive" className={styles.region} data-testid="toast-alerts">
        {toasts.filter((t) => t.tone === "error").map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
      <div role="status" aria-live="polite" className={styles.region} data-testid="toast-notes">
        {toasts.filter((t) => t.tone !== "error").map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </div>,
    document.body
  );
};
