"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useGameStore } from "@/store/rootStore";
import TransportAllocationModal from "../TransportAllocationModal";
import { CapitalHeader } from "./CapitalHeader";
import { CapitalSidebar } from "./CapitalSidebar";
import { IndustrySection } from "./IndustrySection";
import { TransportSection } from "./TransportSection";
import styles from "./CapitalModal.module.css";

export const CapitalModalRefactored: React.FC = () => {
  const isOpen = useGameStore((s) => s.isCapitalOpen);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const nations = useGameStore((s) => s.nations);
  const technologyState = useGameStore((s) => s.technologyState);
  const purchaseCapacity = useGameStore((s) => s.purchaseTransportCapacityIncrease);
  const turn = useGameStore((s) => s.turn);

  const nation = nations.find((n) => n.id === activeNationId);
  const industry = nation?.industry;

  // Transportation of commodities popup state
  const [isAllocOpen, setAllocOpen] = useState(false);

  const capacity = nation?.transportCapacity ?? 0;

  // Transport UI helpers
  const [buyCount, setBuyCount] = useState<number>(0);
  const { maxPurchasable } = useMemo(() => {
    const stock = nation?.warehouse ?? {} as Record<string, number>;
    const coal = Number(stock.coal ?? stock.Coal ?? 0);
    const iron = Number(stock.ironOre ?? stock.IronOre ?? 0);
    const maxByCoal = Math.floor(coal / 1);
    const maxByIron = Math.floor(iron / 1);
    return {
      maxPurchasable: Math.max(0, Math.min(maxByCoal, maxByIron)),
    };
  }, [nation]);

  // Auto-reset the slider at the start of each new turn
  useEffect(() => {
    setBuyCount(0);
  }, [turn]);

  const applyDelta = (newValue: number) => {
    if (!nation) return;
    const prev = buyCount;
    const totalAllowed = prev + maxPurchasable;
    const next = Math.max(0, Math.min(Math.floor(newValue) || 0, totalAllowed));
    const delta = next - prev;
    if (delta !== 0) {
      purchaseCapacity(nation.id, delta);
    }
    setBuyCount(next);
  };

  if (!isOpen) return null;

  const oilUnlocked = !!technologyState?.oilDrillingTechUnlocked;
  const workers = industry?.workers ?? { untrained: 0, trained: 0, expert: 0 };
  const power = industry?.power ?? { total: 0, available: 0, electricity: 0 };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <CapitalHeader nationName={nation?.name} />

        <div className={styles.body}>
          {/* Left sidebar */}
          <CapitalSidebar
            workersAvailable={power.available}
            workersUntrained={workers.untrained}
            workersTrained={workers.trained}
            workersExpert={workers.expert}
            electricity={power.electricity}
            oilUnlocked={oilUnlocked}
          />

          {/* Center content */}
          <main className={styles.main}>
            <div className={styles.mainGrid}>
              <IndustrySection oilUnlocked={oilUnlocked} />
              <TransportSection
                capacity={capacity}
                capacityPendingIncrease={nation?.transportCapacityPendingIncrease}
                buyCount={buyCount}
                maxPurchasable={maxPurchasable}
                onSliderChange={applyDelta}
                onOpenAllocation={() => setAllocOpen(true)}
              />
            </div>
          </main>

          {/* Right sidebar */}
          <CapitalSidebar
            workersAvailable={power.available}
            workersUntrained={workers.untrained}
            workersTrained={workers.trained}
            workersExpert={workers.expert}
            electricity={power.electricity}
            oilUnlocked={oilUnlocked}
          />
        </div>

        {/* Transportation of Commodities Popup */}
        {isAllocOpen && (
          <TransportAllocationModal
            capacity={capacity}
            onClose={() => setAllocOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CapitalModalRefactored;
