import { PERSONA_BANK } from "@/lib/castingPhrases";
import type { ChannelProfile, ChannelProfileUpsertInput } from "@/lib/channelProfiles";

type PersonaSuggestionField =
  | "channel"
  | "display_name"
  | "voice_archetype"
  | "treatment"
  | "fact_anchor"
  | "character";

type ChannelPersonaProfileFields = Pick<ChannelProfile, PersonaSuggestionField>;
type ChannelPersonaUpsertFields = Pick<ChannelProfileUpsertInput, PersonaSuggestionField>;

export type SuggestPersonaInput = Partial<{
  [Field in PersonaSuggestionField]:
    | ChannelPersonaProfileFields[Field]
    | ChannelPersonaUpsertFields[Field]
    | null
    | undefined;
}>;

type SuggestionScope = "voice_archetype" | "niche";

type SuggestPersonaRule = {
  scope: SuggestionScope;
  keywords: readonly string[];
  chipId: string;
};

const NICHE_FIELDS = ["channel", "display_name", "treatment", "fact_anchor"] as const;

export const SUGGEST_PERSONA_RULES = [
  { scope: "voice_archetype", keywords: ["drill", "sergeant"], chipId: "drill-sergeant-historian" },
  { scope: "voice_archetype", keywords: ["hype", "announcer", "street"], chipId: "street-energizer" },
  { scope: "voice_archetype", keywords: ["npr", "explainer"], chipId: "wry-regulatory-insider" },
  { scope: "niche", keywords: ["food", "fda", "identity", "ingredient", "snack"], chipId: "wry-regulatory-insider" },
  { scope: "niche", keywords: ["animal", "nature", "wildlife", "creature"], chipId: "hushed-naturalist" },
  { scope: "niche", keywords: ["crime", "mystery", "unsolved"], chipId: "true-crime-skeptic" },
  { scope: "niche", keywords: ["history", "archival", "historical", "footnote"], chipId: "drill-sergeant-historian" },
  { scope: "niche", keywords: ["wellness", "sleep", "meditation", "mindful"], chipId: "serene-guide" },
  { scope: "niche", keywords: ["sport", "sports", "action", "athletics"], chipId: "breathless-announcer" },
  { scope: "niche", keywords: ["news", "briefing", "headline"], chipId: "broadcast-anchor" },
  { scope: "niche", keywords: ["comedy", "absurd", "weird", "bizarre"], chipId: "deadpan-absurdist" },
  { scope: "niche", keywords: ["drama", "villain", "thriller"], chipId: "menacing-mastermind" },
  { scope: "niche", keywords: ["story", "campfire", "folklore", "legend"], chipId: "campfire-storyteller" },
  { scope: "niche", keywords: ["grandma", "cozy", "wholesome", "heartwarming"], chipId: "warm-grandmother" },
  { scope: "niche", keywords: ["noir", "detective", "hardboiled"], chipId: "hardboiled-noir-narrator" },
  { scope: "niche", keywords: ["confession", "secret"], chipId: "late-night-confessor" },
] as const satisfies readonly SuggestPersonaRule[];

const PERSONA_LABELS = new Map(PERSONA_BANK.map((persona) => [persona.id, persona.label]));

for (const rule of SUGGEST_PERSONA_RULES) {
  if (!PERSONA_LABELS.has(rule.chipId)) {
    throw new Error(`suggestPersonaForChannel rule references unknown persona chip "${rule.chipId}"`);
  }
}

function tokenize(value: string | null | undefined): string[] {
  return (value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function tokensFor(values: readonly (string | null | undefined)[]): Set<string> {
  return new Set(values.flatMap((value) => tokenize(value)));
}

function matchedKeyword(rule: SuggestPersonaRule, tokens: Set<string>): string | null {
  return rule.keywords.find((keyword) => tokens.has(keyword)) ?? null;
}

function personaLabel(chipId: string): string {
  return PERSONA_LABELS.get(chipId) ?? chipId;
}

export function suggestPersonaForChannel(
  input: SuggestPersonaInput,
): { chipId: string; reason: string } | null {
  const voiceTokens = tokensFor([input.voice_archetype]);
  const nicheTokens = tokensFor(NICHE_FIELDS.map((field) => input[field]));

  for (const rule of SUGGEST_PERSONA_RULES) {
    const keyword = matchedKeyword(rule, rule.scope === "voice_archetype" ? voiceTokens : nicheTokens);
    if (keyword) {
      const scope = rule.scope === "voice_archetype" ? "voice_archetype" : "niche";
      return {
        chipId: rule.chipId,
        reason: `matched ${scope} "${keyword}" -> ${personaLabel(rule.chipId)}`,
      };
    }
  }

  return null;
}
