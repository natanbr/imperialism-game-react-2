// The one table from the game to Nathan's approved art pack (NR-031, FR-272): public/assets/ink-and-wash/, kept as
// supplied (its manifest lists every file with its checksum). Art ids are not game enums, so every use of the pack goes
// through this file; tests/ui/inkArt.test.ts checks each entry against the manifest and the files on disk.
import type { RegimentType } from "@/engine";

/** Where the pack is served from (Next serves public/ at the root). */
export const INK_ART_BASE = "/assets/ink-and-wash/";

const art = (file: string) => `${INK_ART_BASE}${file}`;

/**
 * The era-1 picture of each regiment type. The pack draws three eras per Imp1 line (light infantry: light infantry,
 * sharpshooters, rangers; light artillery: horse artillery, field artillery, mobile artillery; heavy artillery: heavy
 * artillery, siege artillery, railroad gun), so the era-1 Light Artillery is the horse artillery and the era-1
 * Artillery the heavy artillery. All 256x256, the figure standing on the bottom centre.
 */
const REGIMENT_ART: Record<RegimentType, string> = {
  minutemen: "army/militia.png",
  skirmishers: "army/light-infantry.png",
  regulars: "army/regulars.png",
  grenadiers: "army/grenadiers.png",
  hussars: "army/hussars.png",
  cuirassiers: "army/cuirassiers.png",
  lightArtillery: "army/horse-artillery.png",
  artillery: "army/heavy-artillery.png",
  sappers: "army/sappers.png",
};

/** The regiment type's picture. */
export const regimentArt = (type: RegimentType): string => art(REGIMENT_ART[type]);

/** The fort levels the pack draws (infrastructure/fort-1.png to fort-3.png, 256x256, centred). */
export const FORT_LEVELS = [1, 2, 3] as const;

/** The fort's picture; none below level 1, the strongest fort above level 3. */
export const fortArt = (level: number): string | undefined =>
  level >= 1 ? art(`infrastructure/fort-${Math.min(Math.floor(level), FORT_LEVELS.length)}.png`) : undefined;

/**
 * The pack's RED attack arrow (map-ui/army-attack.svg, 120x56): a broad curved arrow whose tail's middle and tip are
 * the points below, in the file's own units. The map scales and turns it so they land on the two army markers (FR-273).
 */
export const ATTACK_ARROW_ART = {
  url: art("map-ui/army-attack.svg"),
  width: 120,
  height: 56,
  /** The middle of the tail's edge, from (7, 36.3) to (9, 51.7). */
  tail: { x: 8, y: 44 },
  tip: { x: 112, y: 9 },
} as const;
