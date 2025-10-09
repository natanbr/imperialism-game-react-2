'use client';

import { HUD } from './components/HUD';
import { MapView } from './components/MapView';
import { WarehouseModal } from './components/WarehouseModal';
import { CapitalModal } from './components/CapitalModal';
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
      <ConstructionOptionsModal />
      {isTransportAllocationOpen && (
        <TransportAllocationModal
          capacity={capacity}
          onClose={closeTransportAllocation}
        />
      )}
    </div>
  );
}