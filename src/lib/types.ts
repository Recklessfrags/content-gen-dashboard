// Shared types for the Control Room dashboard.

import type { Tables } from "@/lib/database.types";

// The character "bible" lives in a jsonb column on purpose: new sections are
// new keys, no migration needed. These are the v1 sections from the prototype.
export type Bible = {
  voice?: string;
  cadence?: string;
  vocab?: string;
  offlimits?: string;
  lines?: string;
  beats?: string;
  runtime?: string;
  // room to add: catchphrase bank, voice-sample URL, do/don't gallery, etc.
  [key: string]: string | undefined;
};

export type CharacterStatus = "active" | "draft";

export type Character = Omit<Tables<"characters">, "bible" | "status"> & {
  bible: Bible;
  status: CharacterStatus;
};

export type CharacterBibleRevision = Omit<
  Tables<"character_bible_revisions">,
  "bible" | "status"
> & {
  bible: Bible;
  status: CharacterStatus | null;
};

export type IdeaStatus = "backlog" | "active" | "used";

export type Idea = Omit<Tables<"ideas">, "status"> & {
  status: IdeaStatus;
};

// Episodes are written by the content pipeline (this is the pipeline's real
// schema). The dashboard reads them read-only.
export type Sentinel = {
  stage?: string;
  provider?: string;
  verdict?: string;
  reason?: string;
  [key: string]: unknown;
};

export type Episode = Omit<Tables<"episodes">, "sentinels"> & {
  sentinels: Sentinel[];
};

export type Receipt = Tables<"receipts">;

export const CHANNELS = [
  "Food",
  "Dark history",
  "Knot-tying",
  "Animals",
  "Avatar",
] as const;

export const STATUS_CYCLE: Record<IdeaStatus, IdeaStatus> = {
  backlog: "active",
  active: "used",
  used: "backlog",
};

export const STATUS_LABEL: Record<IdeaStatus, string> = {
  backlog: "Backlog",
  active: "In progress",
  used: "Used",
};

// The editable fields of the bible, in the order they appear in the dossier.
export const BIBLE_FIELDS = [
  "voice",
  "cadence",
  "vocab",
  "offlimits",
  "lines",
  "beats",
  "runtime",
] as const;
