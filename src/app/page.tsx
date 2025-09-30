'use client';

import { HUD } from './components/HUD';
import { MapView } from './components/MapView';
import { WarehouseModal } from './components/WarehouseModal';
import { CapitalModal } from './components/CapitalModal';
import TransportAllocationModal from './components/TransportAllocationModal';
import { ConstructionOptionsModal } from './components/ConstructionOptionsModal';
import { useGameStore } from './store/rootStore';
import { shallow } from 'zustand/shallow';

export default function Home() {
  const { isTransportAllocationOpen, activeNation, closeTransportAllocation } =
    useGameStore(
      (s) => ({
        isTransportAllocationOpen: s.isTransportAllocationOpen,
        activeNation: s.nations.find((n) => n.id === s.activeNationId),
        closeTransportAllocation: s.closeTransportAllocation,
      }),
      shallow,
    );

  const transportCapacity = activeNation?.transportCapacity ?? 0;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <MapView />
      <HUD />
      <WarehouseModal />
      <CapitalModal />
      <ConstructionOptionsModal />
      {isTransportAllocationOpen && (
        <TransportAllocationModal
          capacity={transportCapacity}
          onClose={closeTransportAllocation}
        />
      )}
    </div>
  );
}