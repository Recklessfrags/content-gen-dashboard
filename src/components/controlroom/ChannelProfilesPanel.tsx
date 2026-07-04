import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Json } from "@/lib/database.types";
import { PERSONA_BANK } from "@/lib/castingPhrases";
import {
  AROUSAL_CEILING,
  CLAIM_DISCIPLINE,
  FACT_ANCHOR,
  TREATMENT,
  VOICE_ARCHETYPE_SUGGESTIONS,
  buildChannelProfileUpsert,
  defaultChannelProfile,
  joinListInput,
  parseEngagementPosture,
  parseLengthTarget,
  parsePackaging,
  parsePlatforms,
  parseSourceLadder,
  splitListInput,
  type ChannelProfile,
  type ChannelProfileUpsertInput,
} from "@/lib/channelProfiles";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  GuidelineGenError,
  generateChannelGuidelines,
  type CastBrief,
} from "@/lib/channelGuideline";
import { logGuidelineKeepRate } from "@/lib/channelGuidelineTelemetry";
import { stashCastBrief } from "@/lib/castBrief";
import { suggestPersonaForChannel } from "@/lib/suggestPersona";
import type { createClient } from "@/lib/supabase/client";
import { Field } from "./shared";

type ChannelProfilesPanelProps = {
  supabase: ReturnType<typeof createClient>;
  profiles: ChannelProfile[];
  characters?: CharacterOption[];
  loading: boolean;
  error: string | null;
  onRefetch: () => Promise<void> | void;
  scopedChannel?: string;
};

type CharacterOption = {
  id: string;
  codename: string;
};

type FormState = {
  channel: string;
  description: string;
  displayName: string;
  character_id: string | null;
  character: string;
  voiceArchetype: string;
  factAnchor: string;
  treatment: string;
  claimDiscipline: string;
  arousalCeiling: string;
  sourceLadder: string;
  platforms: string;
  titleStyle: string;
  thumbnailStyle: string;
  shortSeconds: string;
};

type ProposalField = {
  key: keyof FormState;
  label: string;
  proposed: string;
  current: string;
  enforced: boolean;
  accepted: boolean;
};
type Proposal = {
  generatedAt: string;
  brief: string;
  assumptions: string[];
  castBrief: CastBrief;
  fields: ProposalField[];
};
type AppliedProposal = {
  generatedAt: string;
  castBrief: CastBrief;
  fields: { key: keyof FormState; proposed: string }[];
};

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function comparableCodename(value: string) {
  return value.trim().toLowerCase();
}

function jsonValue(value: ChannelProfile["source_ladder"] | undefined): Json {
  return value ?? [];
}

function profileToForm(
  profile: ChannelProfile | ChannelProfileUpsertInput,
  characters: CharacterOption[],
): FormState {
  const engagement = parseEngagementPosture(profile.engagement_posture ?? {});
  const packaging = parsePackaging(profile.packaging ?? {});
  const lengthTarget = parseLengthTarget(profile.length_target ?? {});
  const characterName = profile.character?.trim() ?? "";
  const matchedCharacterId =
    profile.character_id ??
    (characterName
      ? (characters.find(
          (character) =>
            comparableCodename(character.codename) ===
            comparableCodename(characterName),
        )?.id ?? null)
      : null);

  return {
    channel: profile.channel ?? "",
    description: profile.description ?? "",
    displayName: profile.display_name ?? "",
    character_id: matchedCharacterId,
    character: characterName,
    voiceArchetype: profile.voice_archetype ?? "",
    factAnchor: profile.fact_anchor ?? "none",
    treatment: profile.treatment ?? "archival_documentary",
    claimDiscipline: engagement.claim_discipline,
    arousalCeiling: engagement.arousal_ceiling,
    sourceLadder: joinListInput(
      parseSourceLadder(jsonValue(profile.source_ladder)),
    ),
    platforms: joinListInput(parsePlatforms(jsonValue(profile.platforms))),
    titleStyle: packaging.title_style ?? "",
    thumbnailStyle: packaging.thumbnail_style ?? "",
    shortSeconds:
      typeof lengthTarget.short_s === "number"
        ? String(lengthTarget.short_s)
        : "",
  };
}

export function ChannelProfilesPanel({
  supabase,
  profiles,
  characters = [],
  loading,
  error,
  onRefetch,
  scopedChannel,
}: ChannelProfilesPanelProps) {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    error?: boolean;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [lastApplied, setLastApplied] = useState<AppliedProposal | null>(null);
  const [aiFlagged, setAiFlagged] = useState<Set<string>>(new Set());
  const hydratedChannelRef = useRef<string | null>(null);

  const selectedProfile = useMemo(
    () =>
      profiles.find((profile) => profile.channel === selectedChannel) ?? null,
    [profiles, selectedChannel],
  );
  const isDefaultProfile = !creating && form?.channel === "default";
  const personaSuggestion = useMemo(() => {
    if (!form) return null;

    const suggestion = suggestPersonaForChannel({
      channel: form.channel,
      description: form.description,
      display_name: form.displayName,
      voice_archetype: form.voiceArchetype,
      treatment: form.treatment,
      fact_anchor: form.factAnchor,
      character: form.character,
    });
    if (!suggestion) return null;

    const persona = PERSONA_BANK.find((chip) => chip.id === suggestion.chipId);
    return persona ? { ...suggestion, label: persona.label } : null;
  }, [
    form?.channel,
    form?.description,
    form?.displayName,
    form?.voiceArchetype,
    form?.treatment,
    form?.factAnchor,
    form?.character,
  ]);

  useEffect(() => {
    if (loading || creating) return;

    if (profiles.length === 0) {
      setSelectedChannel(null);
      hydratedChannelRef.current = null;
      setForm(null);
      return;
    }

    const scopedProfile = scopedChannel
      ? (profiles.find((profile) => profile.channel === scopedChannel) ?? null)
      : null;
    if (scopedChannel && !scopedProfile) {
      setSelectedChannel(null);
      hydratedChannelRef.current = null;
      setForm(null);
      return;
    }
    const nextProfile = scopedProfile ?? selectedProfile ?? profiles[0];
    if (!nextProfile) return;
    setSelectedChannel(nextProfile.channel);
    if (nextProfile.channel !== hydratedChannelRef.current) {
      hydratedChannelRef.current = nextProfile.channel;
      setForm(profileToForm(nextProfile, characters));
    }
  }, [characters, creating, loading, profiles, scopedChannel, selectedProfile]);

  useEffect(() => {
    if (creating || !form || form.character_id || !form.character.trim())
      return;

    const matchedCharacter = characters.find(
      (character) =>
        comparableCodename(character.codename) ===
        comparableCodename(form.character),
    );
    if (matchedCharacter) {
      setForm((current) =>
        current && !current.character_id
          ? { ...current, character_id: matchedCharacter.id }
          : current,
      );
    }
  }, [characters, creating, form]);

  const updateForm = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((current) => (current ? { ...current, [key]: value } : current));
    },
    [],
  );

  const updateCharacter = useCallback(
    (characterId: string) => {
      const nextCharacterId = characterId || null;
      const selectedCharacter = nextCharacterId
        ? (characters.find((character) => character.id === nextCharacterId) ??
          null)
        : null;

      setForm((current) =>
        current
          ? {
              ...current,
              character_id: nextCharacterId,
              character: selectedCharacter?.codename ?? "",
            }
          : current,
      );
    },
    [characters],
  );

  const clearAiFlag = useCallback((key: string) => {
    setAiFlagged((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }, []);

  const generate = async () => {
    if (!form || generating) return;
    setGenerating(true);
    setNotice(null);
    try {
      const { brief, suggestions, assumptions, cast_brief } = await generateChannelGuidelines(supabase, form.description);
      const s = suggestions;
      const current = form;
      const mk = (key: keyof FormState, label: string, proposed: string, enforced: boolean): ProposalField => ({
        key, label, proposed, current: String(current[key] ?? ""), enforced, accepted: true,
      });
      const fields: ProposalField[] = [
        mk("displayName", "Display name", s.display_name, false),
        mk("voiceArchetype", "Voice archetype", s.voice_archetype, false),
        mk("factAnchor", "Fact anchor", s.fact_anchor, false),
        mk("treatment", "Treatment", s.treatment, false),
        mk("claimDiscipline", "Claim discipline", s.engagement_posture.claim_discipline, true),
        mk("arousalCeiling", "Arousal ceiling", s.engagement_posture.arousal_ceiling, true),
        mk("sourceLadder", "Source ladder", joinListInput(s.source_ladder), false),
        mk("platforms", "Platforms", joinListInput(s.platforms), false),
        mk("titleStyle", "Title style", s.packaging.title_style, false),
        mk("thumbnailStyle", "Thumbnail style", s.packaging.thumbnail_style, false),
        mk("shortSeconds", "Short length (s)", typeof s.length_target.short_s === "number" ? String(s.length_target.short_s) : "", false),
      ].filter((f) => f.enforced || f.proposed.trim().length > 0);
      setProposal({ generatedAt: new Date().toISOString(), brief, assumptions, castBrief: cast_brief, fields });
      setNotice({ message: "Draft generated — review each field, then Apply. Nothing is saved yet." });
    } catch (genError) {
      setNotice({
        message: genError instanceof GuidelineGenError ? genError.message : "Could not generate guidelines.",
        error: true,
      });
    } finally {
      setGenerating(false);
    }
  };

  const toggleProposalField = (key: keyof FormState) => {
    setProposal((current) =>
      current ? { ...current, fields: current.fields.map((f) => (f.key === key ? { ...f, accepted: !f.accepted } : f)) } : current,
    );
  };

  const applyProposal = () => {
    if (!proposal) return;
    const accepted = proposal.fields.filter((f) => f.accepted);
    accepted.forEach((f) => updateForm(f.key, f.proposed));
    setAiFlagged(new Set(accepted.filter((f) => f.enforced).map((f) => String(f.key))));
    setLastApplied({
      generatedAt: proposal.generatedAt,
      castBrief: proposal.castBrief,
      fields: accepted.map((f) => ({ key: f.key, proposed: f.proposed })),
    });
    setProposal(null);
    setNotice({ message: "Applied — review the flagged dials, then Save." });
  };

  const dismissProposal = () => setProposal(null);

  const copyCastBrief = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setNotice({ message: "Cast brief copied." }); } catch { /* ignore */ }
  };

  const selectProfile = (profile: ChannelProfile) => {
    setCreating(false);
    setSelectedChannel(profile.channel);
    hydratedChannelRef.current = profile.channel;
    setForm(profileToForm(profile, characters));
    setNotice(null);
    setProposal(null);
    setLastApplied(null);
    setAiFlagged(new Set());
  };

  const startNew = () => {
    setCreating(true);
    setSelectedChannel(null);
    hydratedChannelRef.current = null;
    setForm(profileToForm(defaultChannelProfile(""), characters));
    setNotice(null);
    setProposal(null);
    setLastApplied(null);
    setAiFlagged(new Set());
  };

  const formToInput = (current: FormState): ChannelProfileUpsertInput => {
    const shortSeconds = current.shortSeconds.trim();
    const lengthTarget =
      shortSeconds.length > 0 ? { short_s: Number(shortSeconds) } : {};

    if (shortSeconds.length > 0 && !Number.isFinite(lengthTarget.short_s)) {
      throw new Error("length_target.short_s must be a number");
    }

    const selectedCharacter = current.character_id
      ? (characters.find(
          (character) => character.id === current.character_id,
        ) ?? null)
      : null;
    // No-implicit-wipe: when unassigned, preserve an unmatchable legacy free-text name
    // (explicit "Unassigned" already cleared current.character to "" → still nulls).
    const characterMirror = current.character_id
      ? (selectedCharacter?.codename ?? current.character) || null
      : current.character.trim() || null;

    return {
      channel: current.channel,
      description: current.description,
      display_name: current.displayName,
      fact_anchor: current.factAnchor,
      treatment: current.treatment,
      character_id: current.character_id,
      character: characterMirror,
      source_ladder: splitListInput(current.sourceLadder),
      voice_archetype: current.voiceArchetype || null,
      packaging: {
        title_style: current.titleStyle,
        thumbnail_style: current.thumbnailStyle,
      },
      engagement_posture: {
        claim_discipline: current.claimDiscipline,
        arousal_ceiling: current.arousalCeiling,
      },
      length_target: lengthTarget,
      platforms: splitListInput(current.platforms),
    };
  };

  const saveProfile = async () => {
    if (!form || saving) return;

    setSaving(true);
    setNotice(null);
    try {
      const built = buildChannelProfileUpsert(formToInput(form));
      const { error: upsertError } = await supabase
        .from("channel_profiles")
        .upsert(built, { onConflict: "channel" });

      if (upsertError) {
        setNotice({ message: upsertError.message, error: true });
        return;
      }

      setCreating(false);
      setSelectedChannel(built.channel);
      hydratedChannelRef.current = built.channel;
      setForm(profileToForm(built, characters));
      await onRefetch();
      setNotice({ message: "Channel profile saved." });
      if (lastApplied) {
        const rows = lastApplied.fields.map((f) => ({
          field: String(f.key),
          proposed: f.proposed,
          saved: String(form[f.key] ?? ""),
        }));
        void logGuidelineKeepRate(supabase, built.channel, lastApplied.generatedAt, rows);
        if (built.character_id && lastApplied.castBrief.voice_description.trim()) {
          stashCastBrief(built.character_id, lastApplied.castBrief);
        }
      }
      setProposal(null);
      setLastApplied(null);
      setAiFlagged(new Set());
    } catch (saveError) {
      setNotice({
        message:
          saveError instanceof Error
            ? saveError.message
            : "Could not save profile.",
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteProfile = async () => {
    if (!form || creating || form.channel === "default" || deleting) return;

    const deletingChannel = form.channel;
    const confirmed = window.confirm(
      `Delete channel "${form.displayName || deletingChannel}"? Jobs already routed to it keep working via the default profile.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setNotice(null);
    try {
      const { error: deleteError } = await supabase
        .from("channel_profiles")
        .delete()
        .eq("channel", deletingChannel);

      if (deleteError) {
        setNotice({ message: deleteError.message, error: true });
        return;
      }

      const nextProfile =
        profiles.find((profile) => profile.channel !== deletingChannel) ?? null;
      setSelectedChannel(nextProfile?.channel ?? null);
      hydratedChannelRef.current = nextProfile?.channel ?? null;
      setForm(nextProfile ? profileToForm(nextProfile, characters) : null);
      await onRefetch();
      setNotice({ message: "Channel profile deleted." });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="spin" /> Loading channel profiles…
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty">
        <h3>Channel profiles offline</h3>
        <p>Couldn&apos;t reach channel profiles: {error}</p>
        <button className="btn" type="button" onClick={() => void onRefetch()}>
          Retry Channels
        </button>
      </div>
    );
  }

  if (scopedChannel && !form) {
    return (
      <div className="empty">
        <h3>Channel profile unavailable</h3>
        <p>Couldn&apos;t find the fixed channel profile for this workspace.</p>
      </div>
    );
  }

  if (!form && profiles.length === 0) {
    return (
      <div className="empty">
        <h3>No channels yet</h3>
        <p>
          Create a channel profile to store operator intent for script treatment
          and engagement posture.
        </p>
        <button className="btn" type="button" onClick={startNew}>
          + New channel
        </button>
      </div>
    );
  }

  return (
    <div className={"main channel-profiles" + (scopedChannel ? " scoped" : "")}>
      {!scopedChannel && (
        <aside className="roster">
          <div className="col-head">
            <h2>Channels</h2>
            <span className="count">{profiles.length} on file</span>
          </div>
          <div className="roster-list">
            {profiles.map((profile) => (
              <button
                key={profile.channel}
                className={
                  "pcard" +
                  (!creating && profile.channel === form?.channel ? " on" : "")
                }
                type="button"
                onClick={() => selectProfile(profile)}
              >
                <div className="codename">
                  {profile.display_name || profile.channel}
                </div>
                <div className="concept">{profile.channel}</div>
                <div className="meta">
                  <span className="chip draft">
                    {labelize(profile.treatment)}
                  </span>
                </div>
              </button>
            ))}
            <button className="addbtn" type="button" onClick={startNew}>
              + New channel
            </button>
          </div>
        </aside>
      )}

      <section className="dossier" aria-labelledby="channel-profile-title">
        {!scopedChannel && (
          <div className="mobile-roster">
            <label className="eyebrow" htmlFor="mobile-channel-roster-select">
              SELECT CHANNEL
            </label>
            <select
              id="mobile-channel-roster-select"
              className="mobile-roster-select"
              value={creating ? "" : (form?.channel ?? "")}
              onChange={(event) => {
                const nextProfile = profiles.find(
                  (profile) => profile.channel === event.target.value,
                );
                if (nextProfile) selectProfile(nextProfile);
              }}
              disabled={creating}
              aria-label="Select channel"
            >
              {creating ? (
                <option value="">(new channel)</option>
              ) : (
                profiles.map((profile) => (
                  <option key={profile.channel} value={profile.channel}>
                    {profile.display_name || profile.channel}
                  </option>
                ))
              )}
            </select>
            <button
              className="mobile-roster-new"
              type="button"
              onClick={startNew}
              disabled={creating}
              aria-label="Create new channel"
            >
              + NEW
            </button>
          </div>
        )}

        <header className="dossier-head">
          <div className="filecode">
            <span>CHANNEL PROFILE</span>
            <span className="live">{creating ? "NEW ROW" : "EDITING ROW"}</span>
          </div>
          {scopedChannel ? (
            <h2 id="channel-profile-title">
              {form?.displayName || form?.channel || "New channel"}
            </h2>
          ) : (
            <h1 id="channel-profile-title">
              {form?.displayName || form?.channel || "New channel"}
            </h1>
          )}
          <p className="sub">
            Store channel-level treatment, source, packaging, and ADR-005
            intent.
          </p>
        </header>

        {form && (
          <>
            <div className="sheet channel-profile-sheet">
              <section
                className="channel-profile-section"
                aria-labelledby="channel-profile-concept-heading"
              >
                <h3
                  id="channel-profile-concept-heading"
                  className="text-title channel-profile-section-title"
                >
                  Concept
                </h3>
                <Field
                  id="channel-profile-description"
                  label="Channel concept"
                  hint="What is this channel about? Plain language — this seeds guideline auto-generation."
                  value={form.description}
                  onChange={(value) => updateForm("description", value)}
                  rows={4}
                />
                <div className="field" aria-live="polite">
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => void generate()}
                    disabled={generating || form.description.trim().length < DESCRIPTION_MIN || form.description.trim().length > DESCRIPTION_MAX}
                  >
                    {generating ? "Generating…" : "Generate from concept"}
                  </button>
                  <span className="hint">
                    Drafts editable guideline fields from the concept. Non-binding — review and Save. Enforced dials are flagged.
                  </span>
                </div>
                {proposal && (
                  <div className="autogen-review" aria-live="polite">
                    <div className="autogen-review-head">
                      <strong>Proposed guidelines</strong>
                      <span className="hint">Review each field, then Apply. Nothing is saved until you Save the channel.</span>
                    </div>
                    {proposal.brief && (
                      <details className="autogen-brief">
                        <summary>Editorial brief</summary>
                        <p>{proposal.brief}</p>
                      </details>
                    )}
                    {proposal.assumptions.length > 0 && (
                      <p className="hint">
                        <span aria-hidden="true">🧭 </span>
                        <strong>Assumptions:</strong> {proposal.assumptions.join(" · ")}
                      </p>
                    )}
                    <ul className="autogen-fields">
                      {proposal.fields.map((f) => (
                        <li key={String(f.key)} className="autogen-field">
                          <label className="autogen-field-accept">
                            <input type="checkbox" checked={f.accepted} onChange={() => toggleProposalField(f.key)} />
                            <span className="autogen-field-label">
                              {f.label}
                              {f.enforced && <span className="badge">enforced</span>}
                            </span>
                          </label>
                          <div className="autogen-field-diff">
                            <span className="autogen-current">{f.current || "—"}</span>
                            <span aria-hidden="true"> → </span>
                            <span className="autogen-proposed">{f.proposed || "—"}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {proposal.castBrief.voice_description && (
                      <div className="autogen-castbrief">
                        <div className="autogen-castbrief-head">
                          <strong>Cast brief</strong>
                          <button type="button" className="btn ghost" onClick={() => void copyCastBrief(proposal.castBrief.voice_description)}>
                            Copy
                          </button>
                        </div>
                        <p>{proposal.castBrief.voice_description}</p>
                        {proposal.castBrief.preview_line && <p className="hint">“{proposal.castBrief.preview_line}”</p>}
                        <p className="hint">Seeds the Casting Studio voice design when you Save (needs an assigned character).</p>
                      </div>
                    )}
                    <div className="autogen-review-actions">
                      <button type="button" className="btn" onClick={applyProposal}>Apply accepted</button>
                      <button type="button" className="btn ghost" onClick={dismissProposal}>Dismiss</button>
                    </div>
                  </div>
                )}
                <div className="grid2">
                  <Field
                    id="channel-profile-channel"
                    label="Channel"
                    hint={creating ? "Primary key" : "Primary key - read-only"}
                    value={form.channel}
                    onChange={(value) => updateForm("channel", value)}
                    rows={1}
                    multiline={false}
                    readOnly={!creating}
                  />
                  <Field
                    id="channel-profile-display-name"
                    label="Display name"
                    value={form.displayName}
                    onChange={(value) => updateForm("displayName", value)}
                    rows={1}
                    multiline={false}
                  />
                </div>
              </section>

              <section
                className="channel-profile-section"
                aria-labelledby="channel-profile-character-voice-heading"
              >
                <h3
                  id="channel-profile-character-voice-heading"
                  className="text-title channel-profile-section-title"
                >
                  Character &amp; voice
                </h3>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="channel-profile-character">
                      <span className="eyebrow">Character</span>
                      <span className="field-label-side">
                        <span className="hint">Optional</span>
                      </span>
                    </label>
                    <select
                      id="channel-profile-character"
                      value={form.character_id ?? ""}
                      onChange={(event) => updateCharacter(event.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {characters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.codename}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="channel-profile-voice-archetype">
                      <span className="eyebrow">Voice archetype</span>
                      <span className="field-label-side">
                        <span className="hint">Optional, open vocabulary</span>
                      </span>
                    </label>
                    <input
                      id="channel-profile-voice-archetype"
                      list="channel-profile-voice-suggestions"
                      type="text"
                      value={form.voiceArchetype}
                      onChange={(event) =>
                        updateForm("voiceArchetype", event.target.value)
                      }
                    />
                    <datalist id="channel-profile-voice-suggestions">
                      {VOICE_ARCHETYPE_SUGGESTIONS.map((suggestion) => (
                        <option key={suggestion} value={suggestion} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </section>

              <section
                className="channel-profile-section"
                aria-labelledby="channel-profile-content-settings-heading"
              >
                <h3
                  id="channel-profile-content-settings-heading"
                  className="text-title channel-profile-section-title"
                >
                  Content settings
                </h3>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="channel-profile-fact-anchor">
                      <span className="eyebrow">Fact anchor</span>
                    </label>
                    <select
                      id="channel-profile-fact-anchor"
                      value={form.factAnchor}
                      onChange={(event) =>
                        updateForm("factAnchor", event.target.value)
                      }
                    >
                      {FACT_ANCHOR.map((value) => (
                        <option key={value} value={value}>
                          {labelize(value)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="channel-profile-treatment">
                      <span className="eyebrow">Treatment</span>
                    </label>
                    <select
                      id="channel-profile-treatment"
                      value={form.treatment}
                      onChange={(event) =>
                        updateForm("treatment", event.target.value)
                      }
                    >
                      {TREATMENT.map((value) => (
                        <option key={value} value={value}>
                          {labelize(value)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {personaSuggestion && (
                  <div className="field" aria-live="polite">
                    <p className="hint">
                      <span aria-hidden="true">💡 </span>
                      Suggested casting persona:{" "}
                      <strong>{personaSuggestion.label}</strong> - seeds the
                      Casting Card when you cast this channel&apos;s character.{" "}
                      {personaSuggestion.reason}
                    </p>
                  </div>
                )}

                <fieldset className="dials-inert">
                  <legend>
                    <span className="eyebrow">Engagement dials</span>
                    <span className="badge">
                      Active — enforced pipeline-side
                    </span>
                  </legend>
                  <p className="hint">
                    Enforced by the worker at job start (ADR-005): claim
                    discipline gates Tier-1 levers, arousal ceiling gates
                    Tier-2. Missing or invalid values fail safe to fact_first /
                    conservative.
                  </p>
                  <div className="grid2">
                    <div className="field">
                      <label htmlFor="channel-profile-claim-discipline">
                        <span className="eyebrow">Claim discipline</span>
                        {aiFlagged.has("claimDiscipline") && (
                          <span className="badge">AI-suggested · enforced · review</span>
                        )}
                      </label>
                      <select
                        id="channel-profile-claim-discipline"
                        value={form.claimDiscipline}
                        onChange={(event) => {
                          updateForm("claimDiscipline", event.target.value);
                          clearAiFlag("claimDiscipline");
                        }}
                      >
                        {CLAIM_DISCIPLINE.map((value) => (
                          <option key={value} value={value}>
                            {labelize(value)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="channel-profile-arousal-ceiling">
                        <span className="eyebrow">Arousal ceiling</span>
                        {aiFlagged.has("arousalCeiling") && (
                          <span className="badge">AI-suggested · enforced · review</span>
                        )}
                      </label>
                      <select
                        id="channel-profile-arousal-ceiling"
                        value={form.arousalCeiling}
                        onChange={(event) => {
                          updateForm("arousalCeiling", event.target.value);
                          clearAiFlag("arousalCeiling");
                        }}
                      >
                        {AROUSAL_CEILING.map((value) => (
                          <option key={value} value={value}>
                            {labelize(value)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>
              </section>

              <section
                className="channel-profile-section"
                aria-labelledby="channel-profile-sources-packaging-heading"
              >
                <h3
                  id="channel-profile-sources-packaging-heading"
                  className="text-title channel-profile-section-title"
                >
                  Sources &amp; packaging
                </h3>
                <div className="grid2">
                  <Field
                    id="channel-profile-source-ladder"
                    label="Source ladder"
                    hint="Newline or comma list"
                    value={form.sourceLadder}
                    onChange={(value) => updateForm("sourceLadder", value)}
                    rows={5}
                    mono
                  />
                  <Field
                    id="channel-profile-platforms"
                    label="Platforms"
                    hint="Newline or comma list"
                    value={form.platforms}
                    onChange={(value) => updateForm("platforms", value)}
                    rows={5}
                    mono
                  />
                </div>

                <div className="grid2">
                  <Field
                    id="channel-profile-title-style"
                    label="Title style"
                    value={form.titleStyle}
                    onChange={(value) => updateForm("titleStyle", value)}
                    rows={1}
                    multiline={false}
                  />
                  <Field
                    id="channel-profile-thumbnail-style"
                    label="Thumbnail style"
                    value={form.thumbnailStyle}
                    onChange={(value) => updateForm("thumbnailStyle", value)}
                    rows={1}
                    multiline={false}
                  />
                </div>

                <div className="field channel-number-field">
                  <label htmlFor="channel-profile-short-seconds">
                    <span className="eyebrow">Short length target</span>
                    <span className="field-label-side">
                      <span className="hint">Seconds, optional</span>
                    </span>
                  </label>
                  <input
                    id="channel-profile-short-seconds"
                    type="number"
                    min="0"
                    step="1"
                    value={form.shortSeconds}
                    onChange={(event) =>
                      updateForm("shortSeconds", event.target.value)
                    }
                  />
                </div>
              </section>
            </div>

            <div className="savebar channel-profile-actions">
              <button
                className="btn"
                type="button"
                onClick={() => void saveProfile()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save channel"}
              </button>
              {!scopedChannel && (
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => void deleteProfile()}
                  disabled={creating || deleting || isDefaultProfile}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
              {!scopedChannel && isDefaultProfile && (
                <span className="hint">
                  fallback profile, can&apos;t delete
                </span>
              )}
              {notice && (
                <span className={"flash show" + (notice.error ? " err" : "")}>
                  {notice.message}
                </span>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
