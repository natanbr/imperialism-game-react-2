import React from "react";
import type { RegimentType } from "@/engine";
import { CAPITOL_ART, fortArt, regimentArt } from "./inkArt";

interface PictureProps {
  src: string;
  /** "" beside text that names the thing (decorative); the thing's name when the picture stands alone (FR-272). */
  alt: string;
  /** The square box it is drawn in, in px; the pack's pictures are 256x256 and keep their proportions. */
  size: number;
  className?: string;
}

/**
 * One picture of the art pack (NR-031). A plain image: the files are small fixed PNGs served as they are, so Next's
 * image optimiser would only re-encode what the pack asks to keep as supplied.
 */
const Picture: React.FC<PictureProps> = ({ src, alt, size, className }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} width={size} height={size} className={className} draggable={false} decoding="async" />
);

/** A regiment's picture (FR-272); `alt` "" when its name is written beside it. */
export const RegimentPicture: React.FC<{ type: RegimentType; alt?: string; size?: number; className?: string }> = ({ type, alt = "", size = 32, className }) => (
  <Picture src={regimentArt(type)} alt={alt} size={size} className={className} />
);

/** A fort's picture (FR-272); nothing below level 1. */
export const FortPicture: React.FC<{ level: number; alt?: string; size?: number; className?: string }> = ({ level, alt = "", size = 40, className }) => {
  const src = fortArt(level);
  return src ? <Picture src={src} alt={alt} size={size} className={className} /> : null;
};

/** The capitol, the Council screen's header picture (FR-298): decorative, the title beside it names the Council. */
export const CapitolPicture: React.FC<{ size?: number; className?: string }> = ({ size = 96, className }) => (
  <Picture src={CAPITOL_ART} alt="" size={size} className={className} />
);
