// The worlds a new game can start on (FR-144); `engine/world/worlds.ts` builds each one.

export type WorldId = "two-islands" | "continent" | "random";
export type RandomMapSize = "standard" | "large";

export function normalizeRandomMapSize(size: unknown): RandomMapSize {
  return size === "large" ? "large" : "standard";
}
