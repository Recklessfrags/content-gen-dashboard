import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Json } from "@/lib/database.types";
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
import type { createClient } from "@/lib/supabase/client";
import { Field } from "./shared";

type ChannelProfilesPanelProps = {
  supabase: ReturnType<typeof createClient>;
  profiles: ChannelProfile[];
  loading: boolean;
  error: string | null;
  onRefetch: () => Promise<void> | void;
};

type FormState = {
  channel: string;
  displayName: string;
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

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function jsonValue(value: ChannelProfile["source_ladder"] | undefined): Json {
  return value ?? [];
}

function profileToForm(profile: ChannelProfile | ChannelProfileUpsertInput): FormState {
  const engagement = parseEngagementPosture(profile.engagement_posture ?? {});
  const packaging = parsePackaging(profile.packaging ?? {});
  const lengthTarget = parseLengthTarget(profile.length_target ?? {});

  return {
    channel: profile.channel ?? "",
    displayName: profile.display_name ?? "",
    character: profile.character ?? "",
    voiceArchetype: profile.voice_archetype ?? "",
    factAnchor: profile.fact_anchor ?? "none",
    treatment: profile.treatment ?? "archival_documentary",
    claimDiscipline: engagement.claim_discipline,
    arousalCeiling: engagement.arousal_ceiling,
    sourceLadder: joinListInput(parseSourceLadder(jsonValue(profile.source_ladder))),
    platforms: joinListInput(parsePlatforms(jsonValue(profile.platforms))),
    titleStyle: packaging.title_style ?? "",
    thumbnailStyle: packaging.thumbnail_style ?? "",
    shortSeconds:
      typeof lengthTarget.short_s === "number" ? String(lengthTarget.short_s) : "",
  };
}

export function ChannelProfilesPanel({
  supabase,
  profiles,
  loading,
  error,
  onRefetch,
}: ChannelProfilesPanelProps) {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const hydratedChannelRef = useRef<string | null>(null);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.channel === selectedChannel) ?? null,
    [profiles, selectedChannel],
  );
  const isDefaultProfile = !creating && form?.channel === "default";

  useEffect(() => {
    if (loading || creating) return;

    if (profiles.length === 0) {
      setSelectedChannel(null);
      hydratedChannelRef.current = null;
      setForm(null);
      return;
    }

    const nextProfile = selectedProfile ?? profiles[0];
    if (!nextProfile) return;
    setSelectedChannel(nextProfile.channel);
    if (nextProfile.channel !== hydratedChannelRef.current) {
      hydratedChannelRef.current = nextProfile.channel;
      setForm(profileToForm(nextProfile));
    }
  }, [creating, loading, profiles, selectedProfile]);

  const updateForm = useCallback((key: keyof FormState, value: string) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }, []);

  const selectProfile = (profile: ChannelProfile) => {
    setCreating(false);
    setSelectedChannel(profile.channel);
    hydratedChannelRef.current = profile.channel;
    setForm(profileToForm(profile));
    setNotice(null);
  };

  const startNew = () => {
    setCreating(true);
    setSelectedChannel(null);
    hydratedChannelRef.current = null;
    setForm(profileToForm(defaultChannelProfile("")));
    setNotice(null);
  };

  const formToInput = (current: FormState): ChannelProfileUpsertInput => {
    const shortSeconds = current.shortSeconds.trim();
    const lengthTarget =
      shortSeconds.length > 0 ? { short_s: Number(shortSeconds) } : {};

    if (shortSeconds.length > 0 && !Number.isFinite(lengthTarget.short_s)) {
      throw new Error("length_target.short_s must be a number");
    }

    return {
      channel: current.channel,
      display_name: current.displayName,
      fact_anchor: current.factAnchor,
      treatment: current.treatment,
      character: current.character || null,
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
      setForm(profileToForm(built));
      await onRefetch();
      setNotice({ message: "Channel profile saved." });
    } catch (saveError) {
      setNotice({
        message: saveError instanceof Error ? saveError.message : "Could not save profile.",
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteProfile = async () => {
    if (!form || creating || form.channel === "default" || deleting) return;

    setDeleting(true);
    setNotice(null);
    try {
      const deletingChannel = form.channel;
      const { error: deleteError } = await supabase
        .from("channel_profiles")
        .delete()
        .eq("channel", deletingChannel);

      if (deleteError) {
        setNotice({ message: deleteError.message, error: true });
        return;
      }

      const nextProfile = profiles.find((profile) => profile.channel !== deletingChannel) ?? null;
      setSelectedChannel(nextProfile?.channel ?? null);
      hydratedChannelRef.current = nextProfile?.channel ?? null;
      setForm(nextProfile ? profileToForm(nextProfile) : null);
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

  if (!form && profiles.length === 0) {
    return (
      <div className="empty">
        <h3>No channels yet</h3>
        <p>Create a channel profile to store operator intent for script treatment and engagement posture.</p>
        <button className="btn" type="button" onClick={startNew}>
          + New channel
        </button>
      </div>
    );
  }

  return (
    <div className="main channel-profiles">
      <aside className="roster">
        <div className="col-head">
          <h2>Channels</h2>
          <span className="count">{profiles.length} on file</span>
        </div>
        <div className="roster-list">
          {profiles.map((profile) => (
            <button
              key={profile.channel}
              className={"pcard" + (!creating && profile.channel === form?.channel ? " on" : "")}
              type="button"
              onClick={() => selectProfile(profile)}
            >
              <div className="codename">{profile.display_name || profile.channel}</div>
              <div className="concept">{profile.channel}</div>
              <div className="meta">
                <span className="chip draft">{labelize(profile.treatment)}</span>
              </div>
            </button>
          ))}
          <button className="addbtn" type="button" onClick={startNew}>
            + New channel
          </button>
        </div>
      </aside>

      <section className="dossier" aria-labelledby="channel-profile-title">
        <header className="dossier-head">
          <div className="filecode">
            <span>CHANNEL PROFILE</span>
            <span className="live">{creating ? "NEW ROW" : "EDITING ROW"}</span>
          </div>
          <h1 id="channel-profile-title">
            {form?.displayName || form?.channel || "New channel"}
          </h1>
          <p className="sub">
            Store channel-level treatment, source, packaging, and ADR-005 intent.
          </p>
        </header>

        {form && (
          <>
            <div className="sheet channel-profile-sheet">
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

              <div className="grid2">
                <Field
                  id="channel-profile-character"
                  label="Character"
                  hint="Optional"
                  value={form.character}
                  onChange={(value) => updateForm("character", value)}
                  rows={1}
                  multiline={false}
                />
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
                    onChange={(event) => updateForm("voiceArchetype", event.target.value)}
                  />
                  <datalist id="channel-profile-voice-suggestions">
                    {VOICE_ARCHETYPE_SUGGESTIONS.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid2">
                <div className="field">
                  <label htmlFor="channel-profile-fact-anchor">
                    <span className="eyebrow">Fact anchor</span>
                  </label>
                  <select
                    id="channel-profile-fact-anchor"
                    value={form.factAnchor}
                    onChange={(event) => updateForm("factAnchor", event.target.value)}
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
                    onChange={(event) => updateForm("treatment", event.target.value)}
                  >
                    {TREATMENT.map((value) => (
                      <option key={value} value={value}>
                        {labelize(value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <fieldset className="dials-inert">
                <legend>
                  <span className="eyebrow">Engagement dials</span>
                  <span className="badge">Stored — not yet active</span>
                </legend>
                <p className="hint">
                  Saved as operator intent. The pipeline does not act on these yet (worker-read + ADR-005 enforcement land later).
                </p>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="channel-profile-claim-discipline">
                      <span className="eyebrow">Claim discipline</span>
                    </label>
                    <select
                      id="channel-profile-claim-discipline"
                      value={form.claimDiscipline}
                      onChange={(event) => updateForm("claimDiscipline", event.target.value)}
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
                    </label>
                    <select
                      id="channel-profile-arousal-ceiling"
                      value={form.arousalCeiling}
                      onChange={(event) => updateForm("arousalCeiling", event.target.value)}
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
                  onChange={(event) => updateForm("shortSeconds", event.target.value)}
                />
              </div>
            </div>

            <div className="savebar channel-profile-actions">
              <button className="btn" type="button" onClick={() => void saveProfile()} disabled={saving}>
                {saving ? "Saving..." : "Save channel"}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => void deleteProfile()}
                disabled={creating || deleting || isDefaultProfile}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              {isDefaultProfile && (
                <span className="hint">fallback profile, can&apos;t delete</span>
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
