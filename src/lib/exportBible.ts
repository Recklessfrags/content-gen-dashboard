/** Serializes arbitrary character bible data to Markdown and downloads it client-side. */
type BibleExportInput = {
  codename?: string;
  concept?: string;
  status?: string;
  bible?: Record<string, unknown>;
};

function titleizeField(field: string): string {
  const spaced = field
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();

  if (spaced.length === 0) {
    return "Untitled Field";
  }

  return spaced.replace(/\b\w/g, (character) => character.toUpperCase());
}

function stableValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entryValue]) => [key, stableValue(entryValue)]),
  );
}

function markdownForValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "_Not set_";
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : "_Not set_";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return `\`\`\`json\n${JSON.stringify(stableValue(value), null, 2)}\n\`\`\``;
}

function safeFilename(filename: string): string {
  const trimmedFilename = filename.trim();
  return trimmedFilename.length > 0 ? trimmedFilename : "character-bible.md";
}

export function bibleToMarkdown(input: BibleExportInput): string {
  const codename = input.codename?.trim() || "Untitled Character";
  const status = input.status?.trim() || "Unknown";
  const concept = input.concept?.trim();
  const lines = [`# ${codename}`, "", `Status: ${status}`, ""];

  if (concept) {
    lines.push(concept, "");
  }

  const bibleEntries = Object.entries(input.bible ?? {})
    .filter(([, value]) => value !== undefined)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  for (const [field, value] of bibleEntries) {
    lines.push(`## ${titleizeField(field)}`, "", markdownForValue(value), "");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function downloadMarkdown(filename: string, markdown: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = safeFilename(filename);
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
