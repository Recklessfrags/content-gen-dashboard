"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { applyTheme, getStoredTheme, toggleTheme } from "@/lib/theme";
import type { AuroraTheme } from "@/lib/theme";

type AuroraShellProps = {
  children: ReactNode;
  operatorInitials?: string;
  signOutSlot?: ReactNode;
  nav?: {
    activeKey: NavKey;
    onNavigate: (key: NavKey) => void;
  };
};

type NavKey = "channels" | "characters" | "ideas" | "runs" | "review";

const NAV_ITEMS: { key: NavKey; label: string; icon: ReactNode }[] = [
  { key: "channels", label: "Channels", icon: <ChannelsIcon /> },
  { key: "characters", label: "Characters", icon: <CharactersIcon /> },
  { key: "ideas", label: "Ideas", icon: <IdeasIcon /> },
  { key: "runs", label: "Runs", icon: <RunsIcon /> },
  { key: "review", label: "Review", icon: <ReviewIcon /> },
];

export function AuroraShell({
  children,
  operatorInitials = "OP",
  signOutSlot,
  nav,
}: AuroraShellProps) {
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
            {signOutSlot}
          </div>
        </header>

        <main>{children}</main>

        {nav ? (
          <nav className="app-nav-bar" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-current={nav.activeKey === item.key ? "page" : undefined}
                onClick={() => nav.onNavigate(item.key)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        ) : null}
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

function ChannelsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
    </svg>
  );
}

function CharactersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function IdeasIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M8.5 14.5A7 7 0 1 1 15.5 14.5C14.5 15.3 14 16 14 18h-4c0-2-.5-2.7-1.5-3.5Z" />
    </svg>
  );
}

function RunsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m8 5 11 7-11 7V5Z" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
