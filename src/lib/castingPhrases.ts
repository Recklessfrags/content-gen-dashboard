export type PhraseSlot = "accent" | "timbre" | "pitch" | "pace" | "persona" | "emotion";

export type PhraseChip = {
  id: string;
  label: string;
  clause: string;
};

export type BuilderSelections = {
  gender?: string;
  ageBand?: string;
  accent?: string;
  timbre?: string;
  pitch?: string;
  pace?: string;
  persona?: string;
  emotion?: string;
  other?: Partial<Record<PhraseSlot, string>>;
};

export const GENDER_OPTIONS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "androgynous", label: "Androgynous" },
] as const;

export const AGE_BAND_OPTIONS = [
  { id: "early-20s", label: "early 20s" },
  { id: "late-20s", label: "late 20s" },
  { id: "30s", label: "30s" },
  { id: "late-30s", label: "late 30s" },
  { id: "40s", label: "40s" },
  { id: "50s", label: "50s" },
  { id: "60s", label: "60s" },
] as const;

export const ACCENT_BANK: readonly PhraseChip[] = [
  { id: "general-american", label: "General American", clause: "neutral General American accent, educated but conversational" },
  { id: "british-rp", label: "British RP", clause: "crisp British Received Pronunciation, polished and articulate" },
  { id: "soft-southern-us", label: "Soft Southern US", clause: "a gentle Southern US lilt, warm and unhurried" },
  { id: "new-york-edge", label: "New York edge", clause: "a flat New York edge, quick and streetwise" },
  { id: "light-irish", label: "Light Irish", clause: "a light Irish warmth to the vowels, lyrical but grounded" },
  { id: "working-class-london", label: "Working-class London", clause: "a working-class London accent, plain-spoken and direct" },
];

export const TIMBRE_BANK: readonly PhraseChip[] = [
  { id: "warm-smooth", label: "Warm & smooth", clause: "a warm, smooth tone with a rounded, easy resonance" },
  { id: "bright-reedy", label: "Bright & reedy", clause: "a bright, reedy timbre with a clean cutting edge" },
  { id: "deep-gravelly", label: "Deep & gravelly", clause: "a deep, gravelly voice with a rough low-end rasp" },
  { id: "dry-close-micd", label: "Dry & close-mic'd", clause: "a dry, close-mic'd sound, present and up against the ear" },
  { id: "rich-resonant", label: "Rich & resonant", clause: "a rich, resonant tone with full chest and body" },
  { id: "thin-wiry", label: "Thin & wiry", clause: "a thin, nasal-edged timbre with a wiry character" },
  { id: "breathy-intimate", label: "Breathy & intimate", clause: "a breathy, intimate tone with soft air on every word" },
];

export const PITCH_BANK: readonly PhraseChip[] = [
  { id: "wide-expressive", label: "Wide & expressive", clause: "wide, expressive pitch that rises and falls freely" },
  { id: "narrow-controlled", label: "Narrow & controlled", clause: "a narrow, controlled pitch range held tightly in check" },
  { id: "downward-authority", label: "Downward authority", clause: "it lands each statement with a downward drop that reads as authority" },
  { id: "upward-bright", label: "Upward & bright", clause: "pitch that lifts brightly at phrase-ends, open and eager" },
  { id: "flat-pops", label: "Flat with pops", clause: "a mostly flat delivery with sudden pops of emphasis" },
];

export const PACE_BANK: readonly PhraseChip[] = [
  { id: "measured-unhurried", label: "Measured & unhurried", clause: "deliberate, unhurried pacing with small pauses and precise emphasis" },
  { id: "rapid-fire-clipped", label: "Rapid-fire & clipped", clause: "rapid-fire, clipped delivery that barely stops for breath" },
  { id: "conversational", label: "Conversational", clause: "an easy conversational rhythm, relaxed and natural" },
  { id: "punchy-staccato", label: "Punchy & staccato", clause: "punchy, staccato cadence that hits each beat hard" },
  { id: "flowing-legato", label: "Flowing & legato", clause: "a flowing, legato cadence that glides between phrases" },
  { id: "urgent-driving", label: "Urgent & driving", clause: "an urgent, driving pace that pushes relentlessly forward" },
];

export const PERSONA_BANK: readonly PhraseChip[] = [
  { id: "wry-regulatory-insider", label: "Wry regulatory insider", clause: "a documentary explainer who reads the fine print and finds the rules genuinely funny" },
  { id: "drill-sergeant-historian", label: "Drill-sergeant historian", clause: "a theatrical drill-sergeant historian who treats every forgotten footnote like a personal scandal, outrage played for laughs" },
  { id: "warm-grandmother", label: "Warm grandmother", clause: "a warm grandmother handing you a cup of tea, gentle, unhurried, and kind" },
  { id: "hushed-naturalist", label: "Hushed naturalist", clause: "a hushed nature-documentary narrator following small dramas with quiet awe" },
  { id: "true-crime-skeptic", label: "True-crime skeptic", clause: "a true-crime narrator quietly dismantling the official story one detail at a time" },
  { id: "late-night-confessor", label: "Late-night confessor", clause: "a late-night radio host leaning into the mic to let you in on a secret" },
  { id: "deadpan-absurdist", label: "Deadpan absurdist", clause: "a deadpan reporter delivering the completely ridiculous with a perfectly straight face" },
  { id: "hardboiled-noir-narrator", label: "Hardboiled noir narrator", clause: "a hardboiled noir narrator recounting it all like a case that went cold" },
  { id: "carnival-barker", label: "Carnival barker", clause: "a carnival barker with a glint in the eye and something to sell you" },
  { id: "jaded-insider", label: "Jaded insider", clause: "a jaded insider who has seen exactly how the sausage gets made and is not impressed" },
  { id: "giddy-obsessive", label: "Giddy obsessive", clause: "a giddy obsessive who cannot wait one more second to show you the best part" },
  { id: "steady-mentor", label: "Steady mentor", clause: "a steady mentor who genuinely wants you to get it, patient and encouraging" },
  { id: "street-energizer", label: "Street energizer", clause: "a hyped-up street voice hitting every syllable, all momentum and swagger" },
  { id: "sardonic-wit", label: "Sardonic wit", clause: "a dry, sardonic wit who finds nearly everything mildly and delightfully absurd" },
  { id: "serene-guide", label: "Serene guide", clause: "a serene, softly-spoken guide inviting you to slow down and breathe" },
  { id: "breathless-announcer", label: "Breathless announcer", clause: "a breathless play-by-play announcer calling every moment like the final seconds" },
  { id: "menacing-mastermind", label: "Menacing mastermind", clause: "a smooth, menacing mastermind savoring every word like a trap being set" },
  { id: "broadcast-anchor", label: "Broadcast anchor", clause: "a crisp broadcast anchor delivering it with measured, unshakable authority" },
  { id: "campfire-storyteller", label: "Campfire storyteller", clause: "a folksy storyteller leaning in to spin an intimate, late-night yarn" },
];

export const EMOTION_BANK: readonly PhraseChip[] = [
  { id: "dry-amused", label: "Dry & amused", clause: "deadpan but never flat, a knowing half-smile in the read" },
  { id: "warm-reassuring", label: "Warm & reassuring", clause: "warm and reassuring, every line offered like a steady hand" },
  { id: "intense-commanding", label: "Intense & commanding", clause: "intense and commanding, brooking no argument" },
  { id: "sincere-earnest", label: "Sincere & earnest", clause: "sincere and earnest, fully believing every word" },
  { id: "playful-mischievous", label: "Playful & mischievous", clause: "playful and mischievous, always half in on the joke" },
  { id: "ominous-foreboding", label: "Ominous & foreboding", clause: "ominous and foreboding, a quiet threat under every phrase" },
];

const BANKS: Record<PhraseSlot, readonly PhraseChip[]> = {
  accent: ACCENT_BANK,
  timbre: TIMBRE_BANK,
  pitch: PITCH_BANK,
  pace: PACE_BANK,
  persona: PERSONA_BANK,
  emotion: EMOTION_BANK,
};

const SLOT_ORDER: readonly PhraseSlot[] = ["accent", "timbre", "pitch", "pace", "persona", "emotion"];

function cap(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
}

function optionLabel<T extends readonly { id: string; label: string }[]>(options: T, id: string | undefined): string {
  return options.find((option) => option.id === id)?.label ?? "";
}

function slotClause(selections: BuilderSelections, slot: PhraseSlot): string {
  const other = selections.other?.[slot]?.trim();
  if (other) return other;
  const selected = selections[slot];
  return BANKS[slot].find((chip) => chip.id === selected)?.clause ?? "";
}

export function isBuilderSelections(value: unknown): value is BuilderSelections {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const optionalStrings = ["gender", "ageBand", ...SLOT_ORDER];
  const stringsValid = optionalStrings.every(
    (key) => record[key] === undefined || typeof record[key] === "string",
  );
  if (!stringsValid) return false;
  if (record.other === undefined) return true;
  if (!record.other || typeof record.other !== "object" || Array.isArray(record.other)) return false;
  const other = record.other as Record<string, unknown>;
  return Object.entries(other).every(
    ([key, text]) => SLOT_ORDER.includes(key as PhraseSlot) && (text === undefined || typeof text === "string"),
  );
}

export function assembleKitDescription(selections: BuilderSelections): string {
  const sentences = ["Perfect audio quality, studio recording."];
  const gender = selections.gender;
  const ageBand = optionLabel(AGE_BAND_OPTIONS, selections.ageBand);
  const accent = slotClause(selections, "accent");
  const voiceParts =
    gender === "androgynous"
      ? ["An androgynous voice", ageBand, accent].filter(Boolean)
      : [cap(optionLabel(GENDER_OPTIONS, gender)), ageBand, accent].filter(Boolean);
  if (voiceParts.length > 0) {
    sentences.push(`${voiceParts.join(", ")}.`);
  }

  const timbre = slotClause(selections, "timbre");
  const pitch = slotClause(selections, "pitch");
  if (timbre || pitch) {
    sentences.push(`${timbre ? [cap(timbre), pitch].filter(Boolean).join("; ") : cap(pitch)}.`);
  }

  const pace = slotClause(selections, "pace");
  const persona = slotClause(selections, "persona");
  if (pace || persona) {
    sentences.push(`${pace ? [cap(pace), persona].filter(Boolean).join(" — ") : cap(persona)}.`);
  }

  const emotion = slotClause(selections, "emotion");
  if (emotion) {
    sentences.push(`${cap(emotion)}.`);
  }

  return sentences.join(" ");
}
