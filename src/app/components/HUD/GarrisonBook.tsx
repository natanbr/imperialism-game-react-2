import { useState } from "react";
import { provincesOf, REGIMENTS } from "@/engine";
import { useGameStore } from "@/store/rootStore";
import { armyRoster, FORCE_SIZE_NOTE } from "../army/armyView";
import styles from "./Stats.module.css";

export function GarrisonBook() {
  const game = useGameStore(s => s.game);
  const viewer = useGameStore(s => s.activeNationId);
  const [selectedId, setSelectedId] = useState<string>();
  const provinces = provincesOf(game, viewer);
  // Recheck ownership on every render, including the first render after restoring a save.
  const province = provinces.find(p => p.id === selectedId) ?? provinces[0];
  if (!province) return <p>You hold no provinces.</p>;

  const visible = { ...game, intents: game.intents.filter(intent => intent.nationId === viewer) };
  const { rows, forceSize } = armyRoster(visible, viewer, province.id);
  return (
    <div className={styles.garrison}>
      <div className={styles.garrisonHeader}>
        <label>
          Province
          <select value={province.id} onChange={e => setSelectedId(e.target.value)}>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <p>Force Size: <strong>{forceSize}</strong></p>
      </div>
      {rows.length ? (
        <>
          <table className={styles.roster} aria-label={`Regiments in ${province.name}`}>
            <thead><tr>
              <th scope="col">Regiment</th><th scope="col">Type</th><th scope="col">Health</th><th scope="col">Status</th>
            </tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <th scope="row">{row.name}</th>
                  <td>{REGIMENTS[row.type].name}</td>
                  <td>{row.health}%</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.garrisonNote} data-testid="force-size-note">{FORCE_SIZE_NOTE}</p>
        </>
      ) : <p>No regiment of ours is here.</p>}
    </div>
  );
}
