import React from "react";
import { GI, type IconName } from "./icons";

export interface GameIconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  testId?: string;
}

/** One Game Icon (FR-084), decorative: the text or title next to it names the thing. */
export const GameIcon: React.FC<GameIconProps> = ({ name, size = "1em", className, testId }) => {
  const Icon = GI[name];
  return <Icon size={size} className={className} aria-hidden="true" focusable="false" data-icon={name} data-testid={testId} />;
};
