import { STARTUP_SETTLEMENTS, UPGRADE_SETTLEMENTS } from "@/engine/systems/townDevelopmentSystem";
import { TOWN_CAPACITY_PER_TIER, TOWN_MAX_TIER, TOWN_TILES_PER_TIER } from "@/engine/world/towns";
import { useGameStore } from "@/store/rootStore";
import type { Province } from "@/types/Province";
import { commodityName } from "../gameText";
import { selectOwnTownViews, type OwnTownView } from "./townView";
import styles from "./TownInspection.module.css";

function firstTierGaps(town: OwnTownView, chain: OwnTownView["chains"][number]): string[] {
  const { cotton, wool, timber, coal, ironOre } = town.resources;
  const counts = {
    textile: { "cotton or wool": cotton + wool },
    wood: { timber },
    metal: { coal, "iron ore": ironOre },
  };
  const missing = Object.entries(counts[chain.chain])
    .filter(([, count]) => count < TOWN_TILES_PER_TIER)
    .map(([name, count]) => `${TOWN_TILES_PER_TIER} ${name} tiles (${count} known)`);
  if (chain.capacity < TOWN_CAPACITY_PER_TIER) {
    missing.push(`${chain.factoryName} capacity ${TOWN_CAPACITY_PER_TIER} (${chain.capacity} installed)`);
  }
  return missing;
}

export function TownInspection({ province }: { province: Province }) {
  const town = useGameStore(s => selectOwnTownViews(s).find(item => item.province.id === province.id));
  if (!town) return <p>Town seat at {province.seatTileId}.</p>;
  const { resources, capital, progress } = town;
  const excluded = capital === "own" || capital === "minor";
  const knownTiles = <p><strong>Known tiles</strong> · {resources.cotton} cotton, {resources.wool} wool, {resources.timber} timber,
    {" "}{resources.coal} coal, {resources.ironOre} iron ore.</p>;
  if (excluded) {
    return <section aria-label="Town development">
      <details className={styles.capitalException}>
        <summary>Town · Idle capital</summary>
        <p>{capital === "own" ? "Your own capital" : "A founding minor capital"} earns no town output.</p>
        <p>{province.name} · Seat {province.seatTileId}</p>
        <p>{town.connected ? town.route : "No connected depot or open port serves this seat."}</p>
        {knownTiles}
      </details>
    </section>;
  }
  const elapsed = progress?.connectedSettlements ?? 0;
  const offered = Object.entries(town.output).map(([key, amount]) => `${amount} ${commodityName(key)}`).join(", ");
  return (
    <section className={styles.inspection} aria-label="Town development">
      <h4>{province.name} town</h4>
      <p><strong>{town.status}</strong> · Seat {province.seatTileId}</p>
      <p>{town.route}</p>
      {town.connected && town.status === "Idle" && <>
        <p><strong>Still needed for first output</strong></p>
        <ul aria-label="Missing requirements for first output">
          {town.chains.map(chain => <li key={chain.chain}>
            {commodityName(chain.material)} needs {firstTierGaps(town, chain).join(" and ")}.
          </li>)}
        </ul>
      </>}
      <p>{capital === "captured"
        ? "A captured Great Power capital can start on its first qualifying settlement."
        : `Startup: ${Math.min(elapsed, STARTUP_SETTLEMENTS)} of ${STARTUP_SETTLEMENTS} connected settlements.`}</p>
      <p><strong>Next settlement before freight</strong> · {offered || "None"}. Estimated at current routes and installed factory sizes.</p>
      {knownTiles}
      <details>
        <summary>Factory requirements and growth</summary>
        <ul>
          {town.chains.map(chain => {
            const matured = progress?.matured[chain.chain] ?? 0;
            const interval = progress?.upgradeSettlements[chain.chain] ?? 0;
            return <li key={chain.chain}>
              <strong>{chain.factoryName}</strong> · Installed capacity {chain.capacity}.
              {" "}{matured > 0 && `Matured tier ${matured}. `}
              {matured > chain.supportedTier && `Current resources and capacity support tier ${chain.supportedTier}. `}
              {matured > 0 && chain.supportedTier > matured &&
                `Growth toward tier ${matured + 1}: ${interval} of ${UPGRADE_SETTLEMENTS} qualifying settlements. `}
              {chain.nextRequirement && `Next tier after the estimate needs ${chain.nextRequirement}.`}
              {chain.nextTier === null && (matured === TOWN_MAX_TIER ? "Highest tier reached." : "The next settlement reaches the highest tier.")}
            </li>;
          })}
        </ul>
      </details>
    </section>
  );
}
