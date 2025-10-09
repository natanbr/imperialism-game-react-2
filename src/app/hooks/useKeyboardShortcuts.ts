import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onAdvanceTurn: () => void;
}

/**
 * Hook to manage global keyboard shortcuts for the game
 */
export function useKeyboardShortcuts({ onAdvanceTurn }: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // 'n' key - advance turn
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
