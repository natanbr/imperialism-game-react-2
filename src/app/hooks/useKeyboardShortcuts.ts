import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onAdvanceTurn: () => void;
}

/** A form field or editable text: its keys are typing (or picking an option: "n" on a select jumps to "none"). */
function isField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable === true ||
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
}

/** Any dialog on the page: the player is entering orders there, so a key never ends the turn under it. */
const isDialogOpen = (): boolean => document.querySelector('[role="dialog"]') !== null;

/**
 * Global keyboard shortcuts. "n" ends the turn (End Turn cannot be undone), but never from a form field or while a
 * dialog is open (FR-178, review fix round).
 */
export function useKeyboardShortcuts({ onAdvanceTurn }: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isField(e.target) || isDialogOpen()) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onAdvanceTurn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onAdvanceTurn]);
}
