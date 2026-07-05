export type UiMode = "basic" | "advanced";

const STORAGE_KEY = "aurora-ui-mode";

function isUiMode(value: string | null): value is UiMode {
  return value === "basic" || value === "advanced";
}

export function getStoredMode(): UiMode {
  if (typeof window === "undefined") {
    return "basic";
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isUiMode(stored) ? stored : "basic";
  } catch {
    return "basic";
  }
}

export function setStoredMode(mode: UiMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Mode still applies for the current session when storage is unavailable.
  }
}
