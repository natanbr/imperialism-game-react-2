'use client';

import { useMemo } from 'react';
import { HUD } from './components/HUD';
import { MapView } from './components/MapView';
import { WarehouseModal } from './components/WarehouseModal';
import { CapitalModal } from './components/CapitalModal';
import TransportAllocationModal from './components/TransportAllocationModal';
import { ConstructionOptionsModal } from './components/ConstructionOptionsModal';
import { useGameStore } from './store/rootStore';

export default function Home() {
  const isTransportAllocationOpen = useGameStore((s) => s.isTransportAllocationOpen);
  const closeTransportAllocation = useGameStore((s) => s.closeTransportAllocation);
  const nations = useGameStore((s) => s.nations);
  const activeNationId = useGameStore((s) => s.activeNationId);

  const capacity = useMemo(() => {
    const activeNation = nations.find(n => n.id === activeNationId);
    return activeNation?.transportCapacity ?? 0;
  }, [nations, activeNationId]);

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
