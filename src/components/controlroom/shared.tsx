import React from "react";
import type { Json } from "@/lib/database.types";
import { resolveParkKind } from "@/lib/jobs";
import {
  BIBLE_FIELDS,
  type Bible,
  type Character,
  type CharacterBibleRevision,
  type CharacterStatus,
  type Episode,
  type Idea,
  type IdeaStatus,
  type Receipt,
} from "@/lib/types";

export type FlatChar = {
  id: string;
  codename: string;
  concept: string;
  status: CharacterStatus;
  created_at: string;
  voice_id: string | null;
  voice_settings: Json | null;
  voice_recipe: Json | null;
  reference_image_url: string | null;
  visual_style: string | null;
} & { [K in (typeof BIBLE_FIELDS)[number]]: string };


export type CostReceipt = Pick<Receipt, "episode_id" | "seq" | "provider" | "stage" | "spend_so_far">;
export type { QueueJob } from "@/lib/jobs";
export type ParkKind = ReturnType<typeof resolveParkKind>;
export type JobParkResolution = {
  kind: ParkKind;
  loading: boolean;
  stage: string | null;
  error: string | null;
};
export type IdeaWriteState = "saving" | "failed";
export type WireIdea = Idea & {
  clientKey?: string;
  clientWriteState?: IdeaWriteState;
  clientError?: string;
};

export type ProviderCost = {
  name: string;
  amount: number;
  percentage: number;
};

export type CharacterCost = {
  characterId: string | null;
  label: string;
  amount: number;
  percentage: number;
  episodeCount: number;
};

export type EpisodeCost = {
  episode: Episode;
  liveSpend: number;
  isInFlight: boolean;
};

export type CostStats = {
  grandTotal: number;
  providerSplit: ProviderCost[];
  characterSplit: CharacterCost[];
  episodeCosts: EpisodeCost[];
};

export type EditableCharacterFields = Pick<FlatChar, "codename" | "concept" | "status"> & {
  bible: Bible;
};

export type PendingDirtyAction = {
  run: () => void;
  cancel?: () => void;
};

export function flatten(row: Character): FlatChar {
  const bible = row.bible || {};
  const flat: Record<string, string> & Pick<FlatChar, "status"> = {
    id: row.id,
    codename: row.codename ?? "",
    concept: row.concept ?? "",
    status: row.status ?? "draft",
    created_at: row.created_at,
  };
  for (const f of BIBLE_FIELDS) flat[f] = bible[f] ?? "";
  return {
    ...(flat as FlatChar),
    voice_id: row.voice_id ?? null,
    voice_settings: row.voice_settings ?? null,
    voice_recipe: row.voice_recipe ?? null,
    reference_image_url: row.reference_image_url ?? null,
    visual_style: row.visual_style ?? null,
  };
}

export function toBible(c: FlatChar): Bible {
  const bible: Bible = {};
  for (const f of BIBLE_FIELDS) bible[f] = c[f] ?? "";
  return bible;
}

export function editableSnapshot(c: FlatChar): EditableCharacterFields {
  return {
    codename: c.codename,
    concept: c.concept,
    status: c.status,
    bible: toBible(c),
  };
}

export function savedSnapshotsById(chars: FlatChar[]): Record<string, EditableCharacterFields> {
  return Object.fromEntries(chars.map((c) => [c.id, editableSnapshot(c)]));
}

export function applyEditableSnapshot(c: FlatChar, snapshot: EditableCharacterFields): FlatChar {
  const next: FlatChar = {
    ...c,
    codename: snapshot.codename,
    concept: snapshot.concept,
    status: snapshot.status,
  };
  for (const f of BIBLE_FIELDS) next[f] = snapshot.bible[f] ?? "";
  return next;
}

export function flattenRevision(row: CharacterBibleRevision, character: Pick<FlatChar, "id" | "created_at">): FlatChar {
  const bible = row.bible || {};
  const flat: Record<string, string> & Pick<FlatChar, "status"> = {
    id: character.id,
    codename: row.codename ?? "",
    concept: row.concept ?? "",
    status: row.status === "active" ? "active" : "draft",
    created_at: character.created_at,
  };
  for (const f of BIBLE_FIELDS) flat[f] = bible[f] ?? "";
  // Revisions snapshot the bible, not the cast — casting fields are not versioned.
  return {
    ...(flat as FlatChar),
    voice_id: null,
    voice_settings: null,
    voice_recipe: null,
    reference_image_url: null,
    visual_style: null,
  };
}

export const FIELD_LABELS: Record<(typeof BIBLE_FIELDS)[number], string> = {
  voice: "Voice & identity",
  cadence: "Cadence",
  vocab: "Vocabulary",
  offlimits: "Off-limits",
  lines: "Gold-standard lines",
  beats: "Beat template",
  runtime: "Runtime target",
};

export type EnqueueSubmitResult =
  | { kind: "success" }
  | { kind: "duplicate" }
  | { kind: "error"; message: string };

// Module-level so editing a textarea does not remount the input (focus-safe).
export function Field({
  id,
  label,
  hint,
  value,
  onChange,
  rows = 3,
  multiline = rows > 1,
  mono,
  readOnly = false,
  locked = false,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  multiline?: boolean;
  mono?: boolean;
  readOnly?: boolean;
  locked?: boolean;
}) {
  const controlStyle = mono ? { fontFamily: "var(--mono)", fontSize: "12.5px" } : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>
        <span className="eyebrow">{label}</span>
        <span className="field-label-side">
          {locked && <span className="badge lock-badge">LOCKED - PREVIEW</span>}
          {hint && <span className="hint">{hint}</span>}
        </span>
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          aria-readonly={readOnly}
          style={controlStyle}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          aria-readonly={readOnly}
          style={controlStyle}
        />
      )}
    </div>
  );
}

export function formatRevisionDate(createdAt: string) {
  return new Date(createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

export function Icon({ name }: { name: string }) {
  const p =
    {
      roster: "M4 20v-2a4 4 0 014-4h0M16 14a4 4 0 014 4v2M12 4a4 4 0 100 8 4 4 0 000-8z",
      wire: "M4 6h16M4 12h16M4 18h10",
      queue: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      runs: "M5 12l4 4 10-10",
      overview: "M4 4h6v6H4V4zm10 0h6v6h-6V4zm-10 10h6v6H4v-6zm10 0h6v6h-6v-6z",
      channels: "M4 7h16M4 12h16M4 17h16M7 5v4M12 10v4M17 15v4",
      cost: "M12 8c-3.31 0-6 2.24-6 5s2.69 5 6 5 6-2.24 6-5-2.69-5-6-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-10c-3.31 0-6 2.24-6 5h12c0-2.76-2.69-5-6-5z",
      exit: "M14 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-2M9 12h12m0 0l-3-3m3 3l-3 3",
      clock: "M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    }[name] || "";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={p} />
    </svg>
  );
}

export const CLEARED_STATUSES = new Set(["success", "cleared", "approved", "complete", "completed", "done"]);
export const FAILED_STATUSES = new Set(["failed", "fail", "rejected", "error"]);

export function normalizeEpisodeStatus(status: string | null | undefined) {
  return (status || "").trim().toLowerCase();
}

export function isClearedStatus(status: string | null | undefined) {
  return CLEARED_STATUSES.has(normalizeEpisodeStatus(status));
}

export function isFailedStatus(status: string | null | undefined) {
  return FAILED_STATUSES.has(normalizeEpisodeStatus(status));
}

export function isInFlightStatus(status: string | null | undefined) {
  return !isClearedStatus(status) && !isFailedStatus(status);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUsd(value: number, digits = 2) {
  return `${new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} USD`;
}

export function providerBucket(provider: string | null) {
  const cleaned = (provider ?? "").trim();
  return cleaned.length > 0 ? cleaned : "Deterministic / None";
}

export function computeCostStats(
  episodes: Episode[],
  receipts: CostReceipt[],
  characters: Pick<FlatChar, "id" | "codename">[] = [],
): CostStats {
  const receiptGroups = new Map<string, CostReceipt[]>();
  for (const receipt of receipts) {
    const existing = receiptGroups.get(receipt.episode_id);
    if (existing) existing.push(receipt);
    else receiptGroups.set(receipt.episode_id, [receipt]);
  }

  const providerTotals = new Map<string, number>();
  const characterTotals = new Map<string | null, { amount: number; episodeCount: number }>();
  const episodeCosts: EpisodeCost[] = [];
  let grandTotal = 0;

  for (const episode of episodes) {
    const sortedReceipts = [...(receiptGroups.get(episode.episode_id) ?? [])].sort(
      (a, b) => Number(a.seq ?? 0) - Number(b.seq ?? 0),
    );
    let previousSpend = 0;
    let maxSpend = 0;

    for (const receipt of sortedReceipts) {
      const currentSpend = Number(receipt.spend_so_far ?? 0);
      const delta = Math.max(0, currentSpend - previousSpend);
      const provider = providerBucket(receipt.provider);
      providerTotals.set(provider, (providerTotals.get(provider) ?? 0) + delta);
      if (currentSpend > maxSpend) maxSpend = currentSpend;
      previousSpend = currentSpend;
    }

    grandTotal += maxSpend;
    const characterId = episode.character_id;
    const existingCharacterTotal = characterTotals.get(characterId);
    if (existingCharacterTotal) {
      existingCharacterTotal.amount += maxSpend;
      existingCharacterTotal.episodeCount += 1;
    } else {
      characterTotals.set(characterId, { amount: maxSpend, episodeCount: 1 });
    }
    episodeCosts.push({
      episode,
      liveSpend: maxSpend,
      // Status vocabulary matches Overview; spend gates whether an in-flight run is visually called out.
      isInFlight: isInFlightStatus(episode.status) && maxSpend > 0,
    });
  }

  const providerSplit = Array.from(providerTotals.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));

  const characterNames = new Map(characters.map((character) => [character.id, character.codename]));
  const characterSplit = Array.from(characterTotals.entries())
    .map(([characterId, { amount, episodeCount }]) => {
      let label = "Unattributed";
      if (characterId !== null) {
        if (characterNames.has(characterId)) {
          label = characterNames.get(characterId)?.trim() || "Untitled character";
        } else {
          label = "Unknown character";
        }
      }

      return {
        characterId,
        label,
        amount,
        percentage: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
        episodeCount,
      };
    })
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

  return { grandTotal, providerSplit, characterSplit, episodeCosts };
}
