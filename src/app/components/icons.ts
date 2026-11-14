// The Game Icons that stay (FR-084, narrowed by FR-335 in M11): Game Icons by game-icons.net contributors, CC BY 3.0
// (credited in the HUD's About panel, FR-089), through react-icons/gi, only where the art pack has no picture (Q60).
// Terrains, resources, goods, civilians, buildings, depot and port are the pack's (components/art/inkArt.ts).
// Icons are named by their Game Icons export name, so the name survives minification and the DOM can carry it
// (`data-icon`).
import type { IconType } from "react-icons";
import {
  GiAnticlockwiseRotation,
  GiCampingTent,
  GiCheckeredFlag,
  GiCrossedSwords,
  GiCrosshair,
  GiHammerNails,
  GiHourglass,
  GiInfo,
  GiMagnifyingGlass,
  GiMeepleGroup,
  GiOpenBook,
  GiPitchfork,
  GiPlayButton,
  GiRiver,
  GiScales,
  GiScrollUnfurled,
  GiSwordClash,
  GiVote,
} from "react-icons/gi";

/** Every Game Icon the UI uses, by its export name: the `UI_ICONS` values and the river marker. */
export const GI = {
  GiAnticlockwiseRotation,
  GiCampingTent,
  GiCheckeredFlag,
  GiCrossedSwords,
  GiCrosshair,
  GiHammerNails,
  GiHourglass,
  GiInfo,
  GiMagnifyingGlass,
  GiMeepleGroup,
  GiOpenBook,
  GiPitchfork,
  GiPlayButton,
  /** The river marker on a tile (FR-323): the pack draws rivers as paths from data the game does not have */
  GiRiver,
  GiScales,
  GiScrollUnfurled,
  GiSwordClash,
  GiVote,
} satisfies Record<string, IconType>;

export type IconName = keyof typeof GI;

export const UI_ICONS = {
  /** The 10 px job markers on a tile */
  prospecting: "GiMagnifyingGlass",
  development: "GiHourglass",
  construction: "GiHammerNails",
  market: "GiScales",
  center: "GiCrosshair",
  advanceTurn: "GiPlayButton",
  finalScores: "GiCheckeredFlag",
  about: "GiInfo",
  newGame: "GiAnticlockwiseRotation",
  /** Several civilians on one tile: the stack button (FR-110); the pack has no group picture (FR-325) */
  civilians: "GiMeepleGroup",
  /** The Diplomacy screen (FR-177): the Imp1 overtures scroll */
  diplomacy: "GiScrollUnfurled",
  /** The Deal Book (FR-195): the Imp1 ledger is an open book */
  dealBook: "GiOpenBook",
  /** An army on the map and the Army screen (FR-210, FR-211): the Imp1 encampment tents */
  army: "GiCampingTent",
  /** Militia in an army marker (FR-210): the Minutemen's local levy */
  militia: "GiPitchfork",
  /** The Attack screen (FR-230): the Imp1 crossed swords over an enemy province */
  attack: "GiCrossedSwords",
  /** The Battle screen (FR-231) */
  battle: "GiSwordClash",
  /** The Council of Governors (FR-298, FR-301): the governors' vote */
  council: "GiVote",
} as const satisfies Record<string, IconName>;
