'use client';

import { HUD } from './components/HUD';
import { MapView } from './components/MapView';
import { WarehouseModal } from './components/WarehouseModal';
import { CapitalModal } from './components/CapitalModal';
import TransportAllocationModal from './components/TransportAllocationModal';
import { useGameStore } from './store/rootStore';

export default function Home() {
  const isTransportAllocationOpen = useGameStore((s) => s.isTransportAllocationOpen);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <MapView />
      <HUD />
      <WarehouseModal />
      <CapitalModal />
      {isTransportAllocationOpen && (
        <TransportAllocationModal
          capacity={useGameStore.getState().nations.find(n => n.id === useGameStore.getState().activeNationId)?.transportCapacity ?? 0}
          onClose={useGameStore.getState().closeTransportAllocation}
        />
      )}
    </div>
  );

}
