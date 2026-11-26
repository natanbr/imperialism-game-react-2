import { isRecord } from "./isRecord";

/** Differences point backwards from the current game to the historical replay position.
 * An object contains edits to its children, [value] restores a whole value, and [] removes a field.
 * Arrays of the same length can share unchanged elements, including entire rows of map tiles. */
export type CheckpointEdit = { [key: string]: CheckpointEdit } | [unknown] | [];

export function checkpointDifference(current: unknown, historical: unknown): CheckpointEdit | undefined {
  if (current === historical) return undefined;
  if (historical === undefined) return [];
  if ((isRecord(current) && isRecord(historical)) ||
      (Array.isArray(current) && Array.isArray(historical) && current.length === historical.length)) {
    const remaining = new Map(Object.entries(current));
    const edits: Record<string, CheckpointEdit> = Object.create(null);
    for (const [key, value] of Object.entries(historical)) {
      const difference = checkpointDifference(remaining.get(key), value);
      if (difference !== undefined) edits[key] = difference;
      remaining.delete(key);
    }
    for (const [key, value] of remaining) {
      if (value !== undefined) edits[key] = [];
    }
    return Object.keys(edits).length ? edits : undefined;
  }
  return [historical];
}

export function restoreCheckpoint(current: unknown, edit: unknown): unknown {
  if (Array.isArray(edit) && edit.length <= 1) return edit[0];
  if (!isRecord(edit)) throw new Error("Invalid replay edit");
  if (Array.isArray(current)) {
    const items = [...current];
    for (const [key, change] of Object.entries(edit)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= items.length || String(index) !== key) throw new Error("Invalid replay index");
      const restored = restoreCheckpoint(current[index], change);
      if (restored === undefined) throw new Error("Missing replay array element");
      items[index] = restored;
    }
    return items;
  }
  if (!isRecord(current)) throw new Error("Invalid replay checkpoint");
  const fields = new Map(Object.entries(current));
  for (const [key, change] of Object.entries(edit)) {
    const restored = restoreCheckpoint(fields.get(key), change);
    if (restored === undefined) fields.delete(key);
    else fields.set(key, restored);
  }
  return Object.fromEntries(fields);
}
