"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { getStoredMode, setStoredMode, type UiMode } from "@/lib/uiMode";

type UiModeContextValue = {
  mode: UiMode;
  advanced: boolean;
  setMode: (mode: UiMode) => void;
};

const UiModeContext = createContext<UiModeContextValue | null>(null);

export function UiModeProvider({ children }: { children: ReactNode }) {
  // Default to "basic" for consumer-friendliness; hydrate the stored choice on mount
  // (localStorage isn't available during SSR).
  const [mode, setModeState] = useState<UiMode>("basic");

  useEffect(() => {
    setModeState(getStoredMode());
  }, []);

  const value = useMemo<UiModeContextValue>(
    () => ({
      mode,
      advanced: mode === "advanced",
      setMode: (next: UiMode) => {
        setModeState(next);
        setStoredMode(next);
      },
    }),
    [mode],
  );

  return <UiModeContext.Provider value={value}>{children}</UiModeContext.Provider>;
}

// Fail-open: consumers rendered OUTSIDE a provider (e.g. the legacy `.cr` shell) see
// everything (advanced), so surfaces the toggle doesn't reach are never hidden.
export function useUiMode(): UiModeContextValue {
  const ctx = useContext(UiModeContext);
  if (!ctx) {
    return { mode: "advanced", advanced: true, setMode: () => {} };
  }
  return ctx;
}
