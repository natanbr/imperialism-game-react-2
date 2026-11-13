'use client';

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
import { GameOverModal } from './components/GameOverModal';
import TransportAllocationModal from './components/TransportAllocationModal';
import { ConstructionOptionsModal } from './components/ConstructionOptionsModal';
import { useGameStore } from './store/rootStore';
import { selectActiveNationCapacity } from './store/selectors';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function Home() {
  const isTransportAllocationOpen = useGameStore((s) => s.isTransportAllocationOpen);
  const closeTransportAllocation = useGameStore((s) => s.closeTransportAllocation);
  const capacity = useGameStore(selectActiveNationCapacity);
  const advanceTurn = useGameStore((s) => s.advanceTurn);

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    onAdvanceTurn: advanceTurn,
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
      {/* After the game-over screen: a conquest's last battle is seen first (FR-232) */}
      <BattleModal />
      <AcceptOfferModal />
      {isTransportAllocationOpen && (
        <TransportAllocationModal
          capacity={capacity}
          onClose={closeTransportAllocation}
        />
      )}
    </div>
  );
}