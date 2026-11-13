"use client";
import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * The one modal dialog of the game (FR-236, the WAI-ARIA dialog pattern): every dialog renders its content in it.
 * It is `role="dialog"` with `aria-modal`, named by its visible title (`titleId`). On open the focus moves to its
 * first control (or to the dialog itself), on close it goes back to the element that had it; Tab and Shift+Tab stay
 * inside; Escape and a click on the backdrop close it. Only the top dialog of a stack answers the keys. A part of the
 * dialog can answer Escape first while it is shown (`useEscapeFirst`: the war question).
 */
export interface ModalProps {
  /** The id of the visible title: the dialog's name (aria-labelledby). */
  titleId: string;
  /** The id of the text that describes it (aria-describedby), if any. */
  describedBy?: string;
  /** Escape and a click on the backdrop call it. Without it the dialog has no close (Game over). */
  onClose?: () => void;
  /** What Escape does when it is not `onClose` (Accept Offer: reject, FR-175). */
  onEscape?: () => void;
  /** Where the focus goes on open: the first control (default), or the dialog itself (Accept Offer: Enter accepts). */
  initialFocus?: "first-control" | "dialog";
  /** When it changes, the focus moves in again as on open (Accept Offer: the next offer in the same dialog). */
  focusKey?: string;
  /** The backdrop's class: it covers the page and centres the dialog. */
  overlayClassName?: string;
  className?: string;
  /** Renders into document.body: for a dialog opened from inside a clipped panel (the HUD's About). */
  portal?: boolean;
  children: React.ReactNode;
}

/** The open dialogs, oldest first: only the last one answers the keys (Diplomacy over Capital). */
const openDialogs: object[] = [];

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

/** The controls Tab visits inside `root`, in page order (no roving-tabindex item that is not current). */
function tabbables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) => el.tabIndex >= 0 && !el.closest("[hidden], [inert]") && (typeof el.checkVisibility !== "function" || el.checkVisibility())
  );
}

/** What last took the focus inside the dialog, and its place among the controls when it took it (-1: not a control). */
interface LastFocus {
  el: Element;
  index: number;
}

/**
 * Tab or Shift+Tab inside the dialog, wrapping at both ends; from a spot that is not a control, the next one after it.
 * When the focus has left the dialog for the page because an order disabled or removed the focused control (Chrome's
 * focus fix-up), it goes on from that control's place, not from the top.
 */
function moveFocus(dialog: HTMLElement, forward: boolean, last: LastFocus | null): void {
  const list = tabbables(dialog);
  if (list.length === 0) {
    dialog.focus();
    return;
  }
  let active = document.activeElement;
  if (!(active && dialog.contains(active)) && last) {
    if (dialog.contains(last.el)) {
      active = last.el;
    } else if (last.index >= 0) {
      // Removed (Withdraw): the control now at its place comes next, the one before it on Shift+Tab
      const at = Math.min(last.index, list.length);
      list[forward ? at % list.length : (at - 1 + list.length) % list.length].focus();
      return;
    }
  }
  let index = active instanceof HTMLElement ? list.indexOf(active) : -1;
  if (index === -1 && active && active !== dialog && dialog.contains(active)) {
    // On the dialog's text, a focused group (the war question) or a disabled control: go on from there
    const after = list.findIndex((el) => active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    index = forward ? (after === -1 ? list.length : after) - 1 : after === -1 ? list.length : after;
  } else if (index === -1) {
    index = forward ? -1 : list.length;
  }
  const next = forward ? (index + 1) % list.length : (index - 1 + list.length) % list.length;
  list[next].focus();
}

/** Registers a part's Escape answer with its dialog; returns the unregister. */
const EscapeFirst = createContext<((answer: () => void) => () => void) | null>(null);

/**
 * While the calling component is mounted, Escape anywhere in its dialog calls `answer` instead of closing the dialog,
 * wherever the focus is (the war question: "Keep the peace", FR-236). The part mounted last answers first.
 */
export function useEscapeFirst(answer: () => void): void {
  const register = useContext(EscapeFirst);
  const latest = useRef(answer);
  useEffect(() => {
    latest.current = answer;
  });
  useEffect(() => register?.(() => latest.current()), [register]);
}

export const Modal: React.FC<ModalProps> = ({
  titleId,
  describedBy,
  onClose,
  onEscape,
  initialFocus = "first-control",
  focusKey,
  overlayClassName,
  className,
  portal = false,
  children,
}) => {
  const dialog = useRef<HTMLDivElement>(null);
  // The latest handlers, for the key listener that lives as long as the dialog
  const handlers = useRef({ onClose, onEscape });
  useEffect(() => {
    handlers.current = { onClose, onEscape };
  });
  // A click closes only when it both starts and ends on the backdrop (not a drag out of the dialog)
  const pressedOnBackdrop = useRef(false);
  // The Escape answers of the parts shown now (useEscapeFirst), oldest first
  const escapeFirst = useRef<(() => void)[]>([]);
  const registerEscape = useCallback((answer: () => void) => {
    escapeFirst.current = [...escapeFirst.current, answer];
    return () => {
      escapeFirst.current = escapeFirst.current.filter((a) => a !== answer);
    };
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const token = {};
    openDialogs.push(token);
    const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    // Where the focus was inside, so Tab goes on from there after an order took the focus away (moveFocus)
    let last: LastFocus | null = null;
    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement) last = { el: e.target, index: tabbables(el).indexOf(e.target) };
    };
    el.addEventListener("focusin", onFocusIn);
    (initialFocus === "dialog" ? el : (tabbables(el)[0] ?? el)).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      // Only the top dialog answers; a key a control already handled (preventDefault) is left alone
      if (openDialogs[openDialogs.length - 1] !== token || e.defaultPrevented) return;
      if (e.key === "Escape") {
        const act = escapeFirst.current[escapeFirst.current.length - 1] ?? handlers.current.onEscape ?? handlers.current.onClose;
        if (!act) return;
        e.preventDefault();
        act();
      } else if (e.key === "Tab") {
        e.preventDefault();
        moveFocus(el, !e.shiftKey, last);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("focusin", onFocusIn);
      const i = openDialogs.indexOf(token);
      if (i >= 0) openDialogs.splice(i, 1);
      if (opener?.isConnected) opener.focus();
    };
    // The focus moves in when the dialog opens; focusKey moves it again below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opened = useRef(false);
  useEffect(() => {
    const el = dialog.current;
    if (!opened.current || !el) {
      opened.current = true;
      return;
    }
    (initialFocus === "dialog" ? el : (tabbables(el)[0] ?? el)).focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const overlay = (
    <div
      className={overlayClassName}
      data-testid="dialog-backdrop"
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        const onBackdrop = pressedOnBackdrop.current && e.target === e.currentTarget;
        pressedOnBackdrop.current = false;
        if (onBackdrop) handlers.current.onClose?.();
      }}
    >
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={describedBy} tabIndex={-1} className={className}>
        <EscapeFirst.Provider value={registerEscape}>{children}</EscapeFirst.Provider>
      </div>
    </div>
  );
  return portal ? createPortal(overlay, document.body) : overlay;
};

export default Modal;
