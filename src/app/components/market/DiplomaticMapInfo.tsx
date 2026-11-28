import { RELATION_SWATCHES } from "@/engine";
import { relationColor } from "@/styles/theme";
import { NationFlag } from "../NationFlag";
import { relationText } from "../diplomacy/diplomacyView";
import {
  HOME_FILL, MILITARY_WORDS, militaryFill, POLITICAL_FILLS, UNKNOWN_FILL,
  type DiplomaticCountry, type HomeInformation, type InformationMode,
} from "./diplomaticMapView";
import styles from "./TradePolicyMap.module.css";
import boardStyles from "./Market.module.css";

function Swatch({ fill }: { fill: string }) {
  return <span className={styles.swatch} style={{ background: fill }} aria-hidden="true" />;
}

/** "ranked after the first turn" opens a table cell as "Ranked after the first turn". */
const cell = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function DiplomaticMapKey({ mode }: { mode: InformationMode }) {
  return (
    <div role="group" aria-label={`${mode} key`} className={styles.key}>
      {mode === "Relationships" ? RELATION_SWATCHES.map((name, level) => (
        <span className={styles.keyItem} key={name}>
          <Swatch fill={relationColor(level)} />
          <span aria-hidden="true">{level + 1} {name}</span>
          <span className={styles.srOnly}>{relationText(level)}</span>
        </span>
      )) : mode === "Information" ? MILITARY_WORDS.map(word => (
        <span className={styles.keyItem} key={word}><Swatch fill={militaryFill(word)} />{word}</span>
      )) : Object.entries(POLITICAL_FILLS).map(([name, fill]) => (
        <span className={styles.keyItem} key={name}><Swatch fill={fill} />{name}</span>
      ))}
      <span className={styles.keyItem}><Swatch fill={HOME_FILL} />Home</span>
      <span className={styles.keyItem}><Swatch fill={UNKNOWN_FILL} />{mode === "Information" ? "Colony" : "No relations"}</span>
      {mode === "Political status" && <>
        <span className={styles.keyItem}><b className={styles.officeLetter}>C</b> Consulate</span>
        <span className={styles.keyItem}><b className={styles.officeLetter}>E</b> Embassy</span>
      </>}
    </div>
  );
}

interface Props {
  mode: InformationMode;
  viewer: string;
  selected?: DiplomaticCountry;
}

export function CountryDetail({ mode, viewer, selected }: Props) {
  return (
    <section className={styles.detail} aria-label="Selected country" aria-live="polite">
      {!selected ? "No counterpart is available in this view." : mode === "Information" ? <>
        <strong>Information: {selected.name}</strong>{" "}
        <span>Provinces {selected.provinces}</span>{" "}
        <span><Swatch fill={selected.fill} /> Military {selected.status}</span>
        {selected.industry !== undefined && <>{" "}<span>Industry {selected.industry}</span></>}
      </> : <>
        <strong>{viewer} and {selected.name}</strong>{" "}
        <span><Swatch fill={selected.fill} /> {selected.status}</span>
        {mode === "Political status" && <>{" "}<span>Our offices in {selected.name}: {selected.offices.join(", ") || "None"}</span></>}
      </>}
    </section>
  );
}

export function InformationList({ viewer, home, selected, countries, select }: Omit<Props, "mode"> & {
  home: HomeInformation;
  countries: DiplomaticCountry[];
  select: (id: string) => void;
}) {
  return (
    <table className={`${boardStyles.table} ${styles.infoTable}`} aria-label="Information by country">
      <thead><tr>
        <th scope="col">Country</th><th scope="col">Provinces</th><th scope="col">Military</th><th scope="col">Industry</th>
      </tr></thead>
      <tbody>
        <tr>
          <th scope="row">{viewer}</th><td>{home.provinces}</td><td><Swatch fill={HOME_FILL} /> Our forces</td>
          <td>{cell(home.industry)}</td>
        </tr>
        {countries.map(country => (
          <tr key={country.id}>
            <th scope="row">
              <button className={boardStyles.sideButton} type="button" aria-pressed={country.id === selected?.id}
                onClick={() => select(country.id)}>
                <NationFlag nationId={country.id} /> {country.name}
              </button>
            </th>
            <td>{country.provinces}</td>
            <td><Swatch fill={country.fill} /> {country.status}</td>
            <td>{country.industry === undefined ? "—" : cell(country.industry)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DiplomaticCountryList({ mode, viewer, selected, countries, select }: Props & {
  countries: DiplomaticCountry[];
  select: (id: string) => void;
}) {
  return (
    <table className={`${boardStyles.table} ${styles.infoTable}`} aria-label={`${mode} by country`}>
      <thead><tr>
        <th scope="col">Country</th><th scope="col">{mode === "Relationships" ? "Relationship" : "Status"}</th>
        {mode === "Political status" && <th scope="col">Our offices there</th>}
      </tr></thead>
      <tbody>
        <tr>
          <th scope="row">{viewer}</th><td><Swatch fill={HOME_FILL} /> Home</td>
          {mode === "Political status" && <td>—</td>}
        </tr>
        {countries.map(country => (
          <tr key={country.id}>
            <th scope="row">
              <button className={boardStyles.sideButton} type="button" aria-pressed={country.id === selected?.id}
                onClick={() => select(country.id)}>
                <NationFlag nationId={country.id} /> {country.name}
              </button>
            </th>
            <td><Swatch fill={country.fill} /> {country.status}</td>
            {mode === "Political status" && <td>{country.offices.join(", ") || "None"}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
