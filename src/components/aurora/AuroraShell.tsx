"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { applyTheme, getStoredTheme, toggleTheme } from "@/lib/theme";
import type { AuroraTheme } from "@/lib/theme";

type AuroraShellProps = {
  children: ReactNode;
  headerActions?: ReactNode;
};

export function AuroraShell({ children, headerActions }: AuroraShellProps) {
  const [theme, setTheme] = useState<AuroraTheme>("dark");

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  function handleToggleTheme() {
    setTheme(toggleTheme());
  }

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <div className="aurora-app" data-aurora-shell="true" data-theme={theme}>
      <div className="aurora-backdrop" aria-hidden="true" />
      <div className="aurora-noise" aria-hidden="true" />

      <header className="app-header" aria-label="Control Room">
        <div className="action-row">
          <span className="avatar avatar--cast avatar--sm" aria-hidden="true">
            CR
          </span>
          <span className="text-title">Control Room</span>
        </div>

        <div className="action-row">
          {headerActions}
          <button
            type="button"
            className="au-btn au-btn-ghost"
            aria-label={`Switch to ${nextTheme} theme`}
            aria-pressed={theme === "dark"}
            onClick={handleToggleTheme}
          >
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </header>

      <main className="aurora-container">{children}</main>
    </div>
  );
}
