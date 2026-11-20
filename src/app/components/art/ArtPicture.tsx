import React from "react";
import type { RegimentType } from "@/engine";
import { CAPITOL_ART, artFileOf, artInfoOf, fortArt, regimentArt } from "./inkArt";

export interface InkPictureProps {
  /** A URL from the table (`components/art/inkArt.ts`). */
  src: string;
  /** A map sprite sheet containing this source picture. data-art still names the original artwork. */
  sheet?: string;
  /** "" beside text that names the thing (decorative); the thing's name when the picture stands alone (FR-272). */
  alt: string;
  /** A square box in px; the pictures keep their proportions inside it. */
  size?: number;
  /** A box of another shape in px (the SVG marks, such as the 42x16 rail piece); each defaults to `size`. */
  width?: number;
  height?: number;
  /** On a text line: 1.25em square, from the `img[data-art-inline]` rule in globals.css (FR-320). */
  inline?: boolean;
  className?: string;
  /** Its `data-testid`. */
  testId?: string;
  title?: string;
}

/**
 * One picture of the art pack (NR-031, NR-032; FR-320). A plain image: the files are small fixed PNGs and SVGs served as
 * they are, so Next's image optimiser would only re-encode what the pack asks to keep as supplied. `data-art` names the
 * manifest file, as `data-icon` names a Game Icon; `data-art-anchor` lets globals.css draw full-body figures from the
 * bottom centre.
 */
export const InkPicture: React.FC<InkPictureProps> = ({ src, sheet, alt, size, width = size, height = size, inline = false, className, testId, title }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={sheet ?? src}
    alt={alt}
    width={width}
    height={height}
    className={className}
    title={title}
    data-testid={testId}
    data-art={artFileOf(src)}
    data-art-anchor={artInfoOf(src)?.anchor}
    data-art-inline={inline ? "" : undefined}
    draggable={false}
    decoding="async"
  />
);

/** A regiment's picture (FR-272); `alt` "" when its name is written beside it. */
export const RegimentPicture: React.FC<{ type: RegimentType; alt?: string; size?: number; className?: string }> = ({ type, alt = "", size = 32, className }) => (
  <InkPicture src={regimentArt(type)} alt={alt} size={size} className={className} />
);

/** A fort's picture (FR-272); nothing below level 1. */
export const FortPicture: React.FC<{ level: number; alt?: string; size?: number; className?: string }> = ({ level, alt = "", size = 40, className }) => {
  const src = fortArt(level);
  return src ? <InkPicture src={src} alt={alt} size={size} className={className} /> : null;
};

/** The capitol, the Council screen's header picture (FR-298): decorative, the title beside it names the Council. */
export const CapitolPicture: React.FC<{ size?: number; className?: string }> = ({ size = 96, className }) => (
  <InkPicture src={CAPITOL_ART} alt="" size={size} className={className} />
);
