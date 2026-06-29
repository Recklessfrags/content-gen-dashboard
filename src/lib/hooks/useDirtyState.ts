/**
 * Compares saved and current plain-data values for unsaved edit detection.
 * CONTRACT: plain JSON-serialisable data only (strings, numbers, booleans, null,
 * arrays, plain objects). Values JSON cannot represent — `undefined` members,
 * `NaN`/`Infinity`, `Date`, `Map`, `Set` — are normalised and may compare equal;
 * do not rely on this for dirty-tracking such values.
 */
import { useMemo } from "react";

function stableStringify(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

export function isDeepEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function useDirtyState<T>(current: T, saved: T): boolean {
  return useMemo(() => !isDeepEqual(current, saved), [current, saved]);
}
