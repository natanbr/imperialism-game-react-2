"use client";
import React from "react";
import IndustryCard from "../IndustryCard";
import styles from "./CapitalModal.module.css";

interface IndustrySectionProps {
  oilUnlocked: boolean;
}

export const IndustrySection: React.FC<IndustrySectionProps> = ({ oilUnlocked }) => {
  return (
    <section className={styles.section}>
      <div className={styles.sectionContent}>
        <h3>Industry</h3>
        <div className={styles.industryGrid}>
          <IndustryCard title="Trade School" sliders={[{ label: "Untrained" }, { label: "Trained" }, { label: "Expert" }]} />
          <IndustryCard title="Textile Mill" />
          <IndustryCard title="Lumber Mill" />
          <IndustryCard title="Steel Mill" />
          <IndustryCard title="Food Processing" />
          <IndustryCard title="Furniture Factory" />
          <IndustryCard title="Clothing Factory" />
          <IndustryCard title="Fuel Processing" hidden={!oilUnlocked} />
          <IndustryCard title="Electricity Production" hidden={!oilUnlocked} />
          <IndustryCard title="Armory" sliders={[]} />
          <IndustryCard title="Shipyard" sliders={[]} />
        </div>
      </div>
    </section>
  );
};
