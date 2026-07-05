"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { applyTheme, getStoredTheme, toggleTheme } from "@/lib/theme";
import type { AuroraTheme } from "@/lib/theme";
import { useUiMode } from "./UiModeContext";

type AuroraShellProps = {
  children: ReactNode;
  operatorInitials?: string;
};

export function AuroraShell({ children, operatorInitials = "OP" }: AuroraShellProps) {
  const [theme, setTheme] = useState<AuroraTheme>("dark");
  const { mode, setMode } = useUiMode();

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
    <div className="aurora-app" data-aurora-shell="true" data-theme={theme} data-ui-mode={mode}>
      <div className="aurora-container" aria-hidden="true" />
      <svg className="noise-overlay" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves={3}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      <div className="app-container">
        <header className="app-header">
          <div className="wordmark">
            <div className="wordmark-icon avatar avatar--sm" aria-hidden="true">
              C
            </div>
            <div className="wordmark-text text-display">Control Room</div>
          </div>
          <div className="header-actions">
            <div
              className="mode-toggle"
              role="group"
              aria-label="Detail level"
            >
              <button
                type="button"
                className={"mode-toggle-option" + (mode === "basic" ? " is-active" : "")}
                aria-pressed={mode === "basic"}
                onClick={() => setMode("basic")}
              >
                Basic
              </button>
              <button
                type="button"
                className={"mode-toggle-option" + (mode === "advanced" ? " is-active" : "")}
                aria-pressed={mode === "advanced"}
                onClick={() => setMode("advanced")}
              >
                Advanced
              </button>
            </div>
            <button
              type="button"
              className="theme-toggle"
              aria-label={`Switch to ${nextTheme} theme`}
              aria-pressed={theme === "dark"}
              onClick={handleToggleTheme}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="avatar avatar-op avatar--sm" aria-label="Operator">
              {normalizeInitials(operatorInitials)}
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}

function normalizeInitials(initials: string): string {
  const trimmed = initials.trim().slice(0, 3).toUpperCase();
  return trimmed === "" ? "OP" : trimmed;
}

function SunIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="4.22" x2="19.78" y2="5.64" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
