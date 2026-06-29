/** Stores and evaluates a local browser-only USD budget target. */
export const BUDGET_STORAGE_KEY = "ccr.budgetTargetUsd";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getBudgetTarget(): number | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  const storedValue = window.localStorage.getItem(BUDGET_STORAGE_KEY);

  if (storedValue === null) {
    return null;
  }

  const parsedValue = Number(storedValue);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function setBudgetTarget(value: number | null): void {
  if (!canUseLocalStorage()) {
    return;
  }

  if (value === null || !Number.isFinite(value) || value <= 0) {
    window.localStorage.removeItem(BUDGET_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(BUDGET_STORAGE_KEY, String(value));
}

export function budgetStatus(
  spend: number,
  target: number | null,
): { over: boolean; ratio: number | null } {
  const safeSpend = Math.max(0, spend);
  const safeTarget = target !== null && Number.isFinite(target) && target > 0 ? target : null;

  return {
    over: safeTarget !== null && spend > safeTarget,
    ratio: safeTarget === null ? null : safeSpend / safeTarget,
  };
}
