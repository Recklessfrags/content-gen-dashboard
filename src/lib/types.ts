// Shared types for the Control Room dashboard.

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

export type Character = {
  id: string;
  owner: string;
  codename: string;
  concept: string;
  status: CharacterStatus;
  bible: Bible;
  created_at: string;
  updated_at: string;
};

export type IdeaStatus = "backlog" | "active" | "used";

export type Idea = {
  id: string;
  owner: string;
  title: string;
  note: string;
  character_id: string | null;
  channel: string;
  status: IdeaStatus;
  created_at: string;
};

// Episodes are written by the content pipeline (this is the pipeline's real
// schema). The dashboard reads them read-only; there is no per-character link.
export type Sentinel = {
  stage?: string;
  provider?: string;
  verdict?: string;
  reason?: string;
  [key: string]: unknown;
};

export type Episode = {
  episode_id: string;
  food: string;
  status: string;
  final_stage: string | null;
  message: string | null;
  spend: number;
  sentinels: Sentinel[];
  created_at: string;
  updated_at: string;
};

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
