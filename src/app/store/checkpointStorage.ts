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
    const historicalFields = Object.entries(historical);
    // A partial edit keeps surviving keys first and appends new keys. When that order differs,
    // describe every field in checkpoint order so the reader can rebuild this object in order.
    const needsFieldOrder = isRecord(current) && [...remaining.keys()]
      .filter(key => Object.hasOwn(historical, key))
      .some((key, index) => key !== historicalFields[index][0]);
    const edits: Record<string, CheckpointEdit> = Object.create(null);
    for (const [key, value] of historicalFields) {
      const difference = checkpointDifference(remaining.get(key), value);
      if (difference !== undefined) edits[key] = difference;
      else if (needsFieldOrder) {
        if (value === undefined) edits[key] = [];
        else edits[key] = isRecord(value) || Array.isArray(value) ? {} : [value];
      }
      remaining.delete(key);
    }
    for (const [key, value] of remaining) {
      if (value !== undefined || needsFieldOrder) edits[key] = [];
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
  const coversAllFields = Object.keys(current).every(key => Object.hasOwn(edit, key));
  const fields = coversAllFields ? new Map<string, unknown>() : new Map(Object.entries(current));
  for (const [key, change] of Object.entries(edit)) {
    const restored = restoreCheckpoint(Object.hasOwn(current, key) ? current[key] : undefined, change);
    if (restored === undefined) fields.delete(key);
    else fields.set(key, restored);
  }
  return Object.fromEntries(fields);
}
