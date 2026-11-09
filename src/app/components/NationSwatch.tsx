import React from "react";
import { nationColor } from "@/styles/theme";

/**
 * A small square in the nation's slot colour (FR-097), shown beside its name (FR-106). Hidden from
 * assistive technology: the name next to it says which nation it is, so colour is never the only cue.
 */
export const NationSwatch: React.FC<{ slot: number | undefined }> = ({ slot }) => (
  <span className="nation-swatch" data-testid="swatch" aria-hidden="true" style={{ backgroundColor: nationColor(slot) }} />
);
