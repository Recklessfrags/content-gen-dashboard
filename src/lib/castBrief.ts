import type { CastBrief } from "@/lib/channelGuideline";

function castBriefKey(characterId: string): string {
  return `cast_brief_${characterId}`;
}

/** Stash a channel's cast brief for a character so the Casting Studio can seed the
 * voice design from it. Non-binding, client-only (mirrors the casting bracket store).
 * No-op if there is no voice_description. */
export function stashCastBrief(characterId: string, brief: CastBrief): void {
  if (typeof window === "undefined" || !characterId || !brief.voice_description.trim()) return;
  try {
    window.localStorage.setItem(castBriefKey(characterId), JSON.stringify(brief));
  } catch {
    // localStorage full / unavailable — best-effort
  }
}

export function loadCastBrief(characterId: string): CastBrief | null {
  if (typeof window === "undefined" || !characterId) return null;
  try {
    const raw = window.localStorage.getItem(castBriefKey(characterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CastBrief>;
    return {
      voice_description: typeof parsed.voice_description === "string" ? parsed.voice_description : "",
      preview_line: typeof parsed.preview_line === "string" ? parsed.preview_line : "",
    };
  } catch {
    return null;
  }
}
