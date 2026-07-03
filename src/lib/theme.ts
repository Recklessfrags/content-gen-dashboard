export type AuroraTheme = "light" | "dark";

const STORAGE_KEY = "aurora-theme";

function isAuroraTheme(value: string | null): value is AuroraTheme {
  return value === "light" || value === "dark";
}

export function getStoredTheme(): AuroraTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isAuroraTheme(stored) ? stored : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: AuroraTheme): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;

  const themeColor = theme === "dark" ? "#05050A" : "#F8F9FA";
  let themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (!themeColorMeta) {
    themeColorMeta = document.createElement("meta");
    themeColorMeta.name = "theme-color";
    document.head.appendChild(themeColorMeta);
  }

  themeColorMeta.content = themeColor;

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Theme still applies for the current session when storage is unavailable.
  }
}

export function toggleTheme(): AuroraTheme {
  const nextTheme: AuroraTheme = getStoredTheme() === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  return nextTheme;
}
