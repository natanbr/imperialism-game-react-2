'use client';

import { useEffect, useRef, useState } from 'react';
import { HUD } from './components/HUD';
import { MapView } from './components/MapView';
import { WarehouseModal } from './components/WarehouseModal';
import { CapitalModal } from './components/CapitalModal';
import { MarketModal } from './components/MarketModal';
import { DealBookModal } from './components/DealBookModal';
import { DiplomacyModal } from './components/DiplomacyModal';
import { AcceptOfferModal } from './components/AcceptOfferModal';
import { ArmyModal } from './components/ArmyModal';
import { ArmouryModal } from './components/ArmouryModal';
import { AttackModal } from './components/AttackModal';
import { BattleModal } from './components/BattleModal';
import { CouncilModal } from './components/CouncilModal';
import { GameOverModal } from './components/GameOverModal';
import { SavedGameDialog } from './components/SavedGameDialog';
import { HowToPlay } from './components/HowToPlay';
import TransportAllocationModal from './components/TransportAllocationModal';
import { ConstructionOptionsModal } from './components/ConstructionOptionsModal';
import { useGameStore } from './store/rootStore';
import { selectActiveNationCapacity } from './store/selectors';
import { HOW_TO_PLAY_SEEN_KEY, readFlag, readSave, startAutosave, writeFlag, type SaveSlot } from './store/persistence';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { centreOnCapital, startNewGameOnCapital } from './hooks/mapActions';

/**
 * The game in play (FR-359, FR-360, FR-362): at the start the page reads the save slot once (the only place that loads a
 * save). An empty slot plays the store's new game at once; a save, usable or not, waits for the player's choice in the
 * "Saved game" dialog. Once the game in play is decided the autosave keeps the slot up to date (FR-357, FR-358) and the
 * page asks before leaving only while the game is not stored (FR-363). A new game started here opens How to play in a
 * browser that has not closed it before (FR-430); a continued game does not.
 */
function useSavedGame() {
  const [offered, setOffered] = useState<Exclude<SaveSlot, { kind: 'empty' }> | null>(null);
  const [playing, setPlaying] = useState(false);
  // Read once per page load: React's development double effects must not read the slot the first run just wrote
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;
    const slot = readSave();
    if (slot.kind === 'empty') {
      setPlaying(true);
      offerHowToPlay();
    } else setOffered(slot);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const autosave = startAutosave(useGameStore);
    // The game now in play: a new one, or the restored one with a fresh date
    autosave.saveNow();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!autosave.beforeUnload()) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      autosave.stop();
    };
  }, [playing]);

  const decide = (start: () => void) => {
    start();
    setOffered(null);
    setPlaying(true);
  };
  return {
    offered,
    onContinue: () =>
      decide(() => {
        if (offered?.kind === 'usable') useGameStore.getState().restoreGame(offered.save);
        centreOnCapital();
      }),
    onNewGame: () =>
      decide(() => {
        // The new game closes every dialog (startNewGame), so How to play opens after it
        startNewGameOnCapital();
        offerHowToPlay();
      }),
  };
}

/** FR-430: How to play on a browser's first new game; the flag is written when it is closed, not when it opens. */
function offerHowToPlay() {
  if (!readFlag(HOW_TO_PLAY_SEEN_KEY)) useGameStore.getState().openHowToPlay();
}

export default function Home() {
  const isTransportAllocationOpen = useGameStore((s) => s.isTransportAllocationOpen);
  const closeTransportAllocation = useGameStore((s) => s.closeTransportAllocation);
  const capacity = useGameStore(selectActiveNationCapacity);
  const endTurn = useGameStore((s) => s.endTurn);
  const isHowToPlayOpen = useGameStore((s) => s.isHowToPlayOpen);
  const closeHowToPlay = useGameStore((s) => s.closeHowToPlay);
  const { offered, onContinue, onNewGame } = useSavedGame();

  // Enable keyboard shortcuts: "n" ends the turn as Advance Turn does, under the same lock (FR-423)
  useKeyboardShortcuts({
    onAdvanceTurn: endTurn,
  });

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <MapView />
      <HUD />
      <WarehouseModal />
      <CapitalModal />
      <MarketModal />
      <DealBookModal />
      <DiplomacyModal />
      <ArmouryModal />
      <ArmyModal />
      <AttackModal />
      <ConstructionOptionsModal />
      <GameOverModal />
      {/* FR-299: after the Battle screens of an End Turn, before the game-over screen (each waits for the one before) */}
      <CouncilModal />
      {/* After the game-over screen: a conquest's last battle is seen first (FR-232) */}
      <BattleModal />
      <AcceptOfferModal />
      {isTransportAllocationOpen && (
        <TransportAllocationModal
          capacity={capacity}
          onClose={closeTransportAllocation}
        />
      )}
      {/* FR-430: closing it, by Close or Escape, records that this browser has seen it */}
      {isHowToPlayOpen && (
        <HowToPlay
          onClose={() => {
            closeHowToPlay();
            writeFlag(HOW_TO_PLAY_SEEN_KEY);
          }}
        />
      )}
      {/* FR-359: last, above every dialog the saved game may open (its game-over screen) */}
      {offered && <SavedGameDialog save={offered.kind === 'usable' ? offered.save : undefined} onContinue={onContinue} onNewGame={onNewGame} />}
    </div>
  );
}
