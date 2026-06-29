import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Json } from "@/lib/database.types";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import {
  addFavorite,
  audioSrcFromBase64,
  CASTING_DAILY_CAP,
  CastingError,
  clampVoiceSettings,
  clearBracket,
  composeVoiceDescription,
  deleteVoice,
  discard,
  emptyBracket,
  generateVoicePreviews,
  isCast,
  loadBracket,
  removeFavorite,
  sampleTextFor,
  saveBracket,
  saveVoiceWinner,
  setPool,
  setWinner,
  synthesizePreview,
  voiceSettingsFrom,
  VOICE_DESIGN_DEFAULTS,
  VOICE_SETTINGS_RANGES,
  type AuditionCandidate,
  type BracketState,
  type VoiceDesignPrompt,
  type VoiceGender,
  type VoiceSettings,
} from "@/lib/casting";
import { createClient } from "@/lib/supabase/client";
import { toBible, type FlatChar } from "./shared";

type CastingStudioPanelProps = {
  character: FlatChar;
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
  onCharacterPatched: (
    id: string,
    patch: { voice_id?: string | null; voice_settings?: Json | null },
  ) => void;
  showFlash: (msg: string, err?: boolean) => void;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
};

const DESIGN_SLIDERS: ReadonlyArray<{
  key: "age" | "grit" | "comedy_menace" | "bombast";
  label: string;
  left: string;
  right: string;
}> = [
  { key: "age", label: "Age", left: "Young", right: "Older" },
  { key: "grit", label: "Grit", left: "Smooth", right: "Gravelly" },
  { key: "comedy_menace", label: "Tone", left: "Comedic", right: "Menacing" },
  { key: "bombast", label: "Delivery", left: "Understated", right: "Bombastic" },
];

const GENDER_OPTIONS: ReadonlyArray<{ value: VoiceGender; label: string }> = [
  { value: "androgynous", label: "Androgynous" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const SYNTH_SLIDERS: ReadonlyArray<{
  key: "stability" | "similarity_boost" | "style" | "speed";
  label: string;
  hint: string;
}> = [
  { key: "stability", label: "Stability", hint: "Lower is more expressive; higher is more consistent." },
  { key: "similarity_boost", label: "Similarity", hint: "Adherence to the cast voice." },
  { key: "style", label: "Style", hint: "Style exaggeration (0 = neutral)." },
  { key: "speed", label: "Speed", hint: "Narration pace (0.7–1.2)." },
];

export function CastingStudioPanel({
  character,
  supabase,
  onClose,
  onCharacterPatched,
  showFlash,
  restoreFocusRef,
}: CastingStudioPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);

  const [prompt, setPrompt] = useState<VoiceDesignPrompt>({ ...VOICE_DESIGN_DEFAULTS });
  const [sampleText, setSampleText] = useState(() =>
    sampleTextFor({
      codename: character.codename,
      concept: character.concept,
      bible: toBible(character),
    }),
  );
  const [bracket, setBracket] = useState<BracketState>(() => loadBracket(character.id));
  const [designing, setDesigning] = useState(false);
  const [castsLeft, setCastsLeft] = useState<number | null>(null);
  const [capReached, setCapReached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cast = isCast(character);
  const [synth, setSynth] = useState<VoiceSettings>(() => voiceSettingsFrom(character));
  const [savedSynth, setSavedSynth] = useState<VoiceSettings>(() => voiceSettingsFrom(character));
  const [testing, setTesting] = useState(false);
  const [testAudioSrc, setTestAudioSrc] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [locking, setLocking] = useState<string | null>(null);

  const synthDirty = useMemo(
    () => (Object.keys(synth) as Array<keyof VoiceSettings>).some((k) => synth[k] !== savedSynth[k]),
    [synth, savedSynth],
  );
  const sampleLen = sampleText.trim().length;
  const sampleValid = sampleLen >= 100 && sampleLen <= 1000;

  useScrollLock();

  useFocusTrap({
    active: true,
    containerRef: panelRef,
    onEscape: onClose,
    initialFocusRef: firstFieldRef,
    restoreFocusRef,
  });

  // Guard against setState after the panel is closed/unmounted mid-request
  // (Edge/ElevenLabs calls can be slow).
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Persist the in-progress tournament so a reload doesn't lose it.
  useEffect(() => {
    saveBracket(bracket);
  }, [bracket]);

  const refreshCastsLeft = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("casting_usage")
      .select("count")
      .eq("day", today)
      .maybeSingle();
    if (!aliveRef.current) return;
    const used = typeof data?.count === "number" ? data.count : 0;
    const left = Math.max(0, CASTING_DAILY_CAP - used);
    setCastsLeft(left);
    setCapReached(left <= 0);
  }, [supabase]);

  useEffect(() => {
    void refreshCastsLeft();
  }, [refreshCastsLeft]);

  const handleLayerMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handleGenerate = async () => {
    if (designing || !sampleValid) return;
    setError(null);
    setDesigning(true);
    try {
      const candidates = await generateVoicePreviews(supabase, prompt, sampleText);
      if (!aliveRef.current) return;
      setBracket((b) => setPool(b, candidates));
      if (candidates.length === 0) {
        setError("ElevenLabs returned no previews — try adjusting the design.");
      }
      await refreshCastsLeft();
    } catch (e) {
      if (!aliveRef.current) return;
      if (e instanceof CastingError) {
        setError(e.message);
        if (e.capReached) {
          setCapReached(true);
          setCastsLeft(0);
        }
      } else {
        setError("Could not generate previews.");
      }
    } finally {
      if (aliveRef.current) setDesigning(false);
    }
  };

  const handleLock = async (candidate: AuditionCandidate) => {
    if (locking) return;
    const previousVoiceId = character.voice_id;
    setError(null);
    setLocking(candidate.generated_voice_id);
    try {
      const description = composeVoiceDescription(candidate.prompt_state);
      const voiceId = await saveVoiceWinner(
        supabase,
        character.codename || "Untitled character",
        description,
        candidate.generated_voice_id,
      );
      const { error: updateError } = await supabase
        .from("characters")
        .update({ voice_id: voiceId })
        .eq("id", character.id);
      if (!aliveRef.current) return;
      if (updateError) {
        setError(`Saved the voice but could not write it to the character: ${updateError.message}`);
        return;
      }
      onCharacterPatched(character.id, { voice_id: voiceId });
      setBracket((b) => setWinner(b, candidate));
      showFlash("✓ Voice cast and locked to character");
      if (previousVoiceId && previousVoiceId !== voiceId) {
        try {
          // Intentional: character_bible_revisions is bible-only; keeping dead
          // voice ids needs a future voice-history table, not a schema change here.
          await deleteVoice(supabase, previousVoiceId);
        } catch (deleteError) {
          console.warn("Could not remove the previous voice from the ElevenLabs library.", deleteError);
        }
      }
      if (!aliveRef.current) return;
      await refreshCastsLeft();
    } catch (e) {
      if (!aliveRef.current) return;
      if (e instanceof CastingError) {
        setError(e.message);
        if (e.capReached) {
          setCapReached(true);
          setCastsLeft(0);
        }
      } else {
        setError("Could not save the voice.");
      }
    } finally {
      if (aliveRef.current) setLocking(null);
    }
  };

  const handleTest = async () => {
    if (testing || !character.voice_id) return;
    setError(null);
    setTesting(true);
    setTestAudioSrc(null);
    try {
      const probe =
        "Here is how this voice reads a line at the current settings — listen for pace, warmth, and consistency.";
      const result = await synthesizePreview(supabase, probe, character.voice_id, synth);
      if (!aliveRef.current) return;
      setTestAudioSrc(audioSrcFromBase64(result.audio_base_64, result.media_type));
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e instanceof CastingError ? e.message : "Could not synthesize a preview.");
    } finally {
      if (aliveRef.current) setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (savingSettings || !synthDirty) return;
    setSavingSettings(true);
    const next = clampVoiceSettings(synth);
    const { error: updateError } = await supabase
      .from("characters")
      .update({ voice_settings: next as unknown as Json })
      .eq("id", character.id);
    if (!aliveRef.current) return;
    setSavingSettings(false);
    if (updateError) {
      showFlash("Could not save voice settings — " + updateError.message, true);
      return;
    }
    setSavedSynth(next);
    setSynth(next);
    onCharacterPatched(character.id, { voice_settings: next as unknown as Json });
    showFlash("✓ Live voice settings saved (no re-cast)");
  };

  const handleResetBracket = () => {
    clearBracket(character.id);
    setBracket(emptyBracket(character.id));
  };

  const renderCandidate = (candidate: AuditionCandidate, kind: "pool" | "favorite") => {
    const isWinner = bracket.winner?.generated_voice_id === candidate.generated_voice_id;
    return (
      <li key={candidate.generated_voice_id} className={"casting-candidate" + (isWinner ? " is-winner" : "")}>
        <div className="casting-candidate-head">
          <span className="eyebrow">
            {isWinner ? "WINNER · " : ""}
            {GENDER_OPTIONS.find((g) => g.value === (candidate.prompt_state.gender ?? "androgynous"))?.label}
          </span>
          <span className="casting-stamp">{describePrompt(candidate.prompt_state)}</span>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- ephemeral TTS audition, no captions exist */}
        <audio
          className="casting-audio"
          controls
          preload="none"
          aria-label={`Audition candidate — ${describePrompt(candidate.prompt_state)}`}
          src={audioSrcFromBase64(candidate.audio_base_64, candidate.media_type)}
        />
        <div className="casting-candidate-actions">
          {kind === "pool" ? (
            <>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setBracket((b) => addFavorite(b, candidate))}
              >
                ★ Keep
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setBracket((b) => discard(b, candidate))}
              >
                Discard
              </button>
            </>
          ) : (
            <button
              className="btn ghost"
              type="button"
              onClick={() => setBracket((b) => removeFavorite(b, candidate))}
            >
              Remove
            </button>
          )}
          <button
            className="btn"
            type="button"
            disabled={locking !== null}
            aria-busy={locking === candidate.generated_voice_id}
            onClick={() => handleLock(candidate)}
          >
            {locking === candidate.generated_voice_id ? "Locking…" : "Lock as winner"}
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="history-layer" role="presentation" onMouseDown={handleLayerMouseDown}>
      <aside
        ref={panelRef}
        className="drilldown-panel casting-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="casting-panel-title"
      >
        <div className="col-head">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button ref={firstFieldRef} className="btn ghost close-btn" type="button" onClick={onClose}>
              ← Back
            </button>
            <h2 id="casting-panel-title">Casting Studio</h2>
          </div>
          <span className={"chip " + (cast ? "active" : "draft")}>
            {cast ? "CAST" : "UNCAST"}
          </span>
        </div>

        <div className="detail-cap">
          <div>
            <span className="eyebrow">CHARACTER</span>
            <div className="topic-title">{character.codename || "Untitled character"}</div>
          </div>
          {!cast && (
            <span className="chip draft" role="status">
              Not production-ready until a voice is locked
            </span>
          )}
        </div>

        <div className="drilldown-content casting-content">
          {error && (
            <p className="history-error" role="alert">
              {error}
            </p>
          )}

          {/* ── Voice design (re-cast) ─────────────────────────────────── */}
          <section className="casting-section" aria-labelledby="casting-design-title">
            <h3 id="casting-design-title" className="casting-section-title">
              Voice Design <span className="casting-cost-tag">spends credits · re-cast</span>
            </h3>

            <div className="casting-sliders">
              {DESIGN_SLIDERS.map((s) => (
                <div className="casting-slider" key={s.key}>
                  <label htmlFor={`casting-design-${s.key}`}>
                    <span className="eyebrow">{s.label}</span>
                    <span className="casting-slider-ends">
                      <span>{s.left}</span>
                      <span>{s.right}</span>
                    </span>
                  </label>
                  <input
                    id={`casting-design-${s.key}`}
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={prompt[s.key]}
                    disabled={designing}
                    onChange={(e) => setPrompt((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>

            <div className="field">
              <div className="status-segmented-control" role="group" aria-label="Gender hint">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    className={"segment-btn" + (prompt.gender === g.value ? " active-segment" : "")}
                    type="button"
                    aria-pressed={prompt.gender === g.value}
                    disabled={designing}
                    onClick={() => setPrompt((p) => ({ ...p, gender: g.value }))}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="casting-sample">
                <span className="eyebrow">Audition sample</span>
                <span className="field-label-side">
                  <span className={"hint" + (sampleValid ? "" : " error-hint")}>{sampleLen}/1000 · min 100</span>
                </span>
              </label>
              <textarea
                id="casting-sample"
                value={sampleText}
                rows={4}
                disabled={designing}
                onChange={(e) => setSampleText(e.target.value)}
              />
              <p className="hint casting-prose">Prompt sent: “{composeVoiceDescription(prompt)}”</p>
            </div>

            <div className="casting-generate-row">
              <p className="casting-credit-warning" role="note">
                ⚠ Generating previews spends ElevenLabs credits.
                {castsLeft !== null && (
                  <> {castsLeft} of {CASTING_DAILY_CAP} casts left today.</>
                )}
              </p>
              <button
                className="btn"
                type="button"
                disabled={designing || !sampleValid || capReached}
                aria-busy={designing}
                onClick={handleGenerate}
              >
                {designing ? "Synthesizing…" : "Generate previews"}
              </button>
            </div>
            {capReached && (
              <p className="history-error" role="status">
                Daily casting cap reached. Re-casting unlocks tomorrow.
              </p>
            )}
          </section>

          {/* ── Tournament ─────────────────────────────────────────────── */}
          {(bracket.pool.length > 0 || bracket.favorites.length > 0) && (
            <section className="casting-section" aria-labelledby="casting-tournament-title">
              <div className="casting-section-head">
                <h3 id="casting-tournament-title" className="casting-section-title">
                  Tournament
                </h3>
                <button className="btn ghost" type="button" onClick={handleResetBracket}>
                  Clear bracket
                </button>
              </div>

              {bracket.favorites.length > 0 && (
                <>
                  <p className="eyebrow casting-group-label">Favorites (carried forward)</p>
                  <ul className="casting-candidates">
                    {bracket.favorites.map((c) => renderCandidate(c, "favorite"))}
                  </ul>
                </>
              )}

              {bracket.pool.length > 0 && (
                <>
                  <p className="eyebrow casting-group-label">Latest batch</p>
                  <ul className="casting-candidates">
                    {bracket.pool.map((c) => renderCandidate(c, "pool"))}
                  </ul>
                </>
              )}
            </section>
          )}

          {/* ── Live synthesis tuning ──────────────────────────────────── */}
          <section className="casting-section" aria-labelledby="casting-synth-title">
            <h3 id="casting-synth-title" className="casting-section-title">
              Live Synthesis Tuning <span className="casting-cost-tag cheap">no re-cast · no credits</span>
            </h3>
            {!cast ? (
              <p className="hint">Lock a voice above before tuning live settings.</p>
            ) : (
              <>
                <div className="casting-sliders">
                  {SYNTH_SLIDERS.map((s) => {
                    const range = VOICE_SETTINGS_RANGES[s.key];
                    return (
                      <div className="casting-slider" key={s.key}>
                        <label htmlFor={`casting-synth-${s.key}`}>
                          <span className="eyebrow">{s.label}</span>
                          <span className="field-label-side">
                            <span className="hint">{synth[s.key].toFixed(2)}</span>
                          </span>
                        </label>
                        <input
                          id={`casting-synth-${s.key}`}
                          type="range"
                          min={range.min}
                          max={range.max}
                          step={0.01}
                          value={synth[s.key]}
                          onChange={(e) =>
                            setSynth((v) => ({ ...v, [s.key]: Number(e.target.value) }))
                          }
                        />
                        <p className="hint">{s.hint}</p>
                      </div>
                    );
                  })}
                </div>

                <label className="casting-toggle">
                  <input
                    type="checkbox"
                    checked={synth.use_speaker_boost}
                    onChange={(e) => setSynth((v) => ({ ...v, use_speaker_boost: e.target.checked }))}
                  />
                  <span>Speaker boost</span>
                </label>

                <div className="casting-generate-row">
                  <button className="btn ghost" type="button" disabled={testing} aria-busy={testing} onClick={handleTest}>
                    {testing ? "Synthesizing…" : "Test synthesis"}
                  </button>
                  <button
                    className="btn"
                    type="button"
                    disabled={!synthDirty || savingSettings}
                    aria-busy={savingSettings}
                    onClick={handleSaveSettings}
                  >
                    {savingSettings ? "Saving…" : "Save settings"}
                  </button>
                </div>
                {testAudioSrc && (
                  // eslint-disable-next-line jsx-a11y/media-has-caption -- ephemeral TTS audition
                  <audio
                    className="casting-audio"
                    controls
                    preload="none"
                    aria-label="Live synthesis preview at the current settings"
                    src={testAudioSrc}
                  />
                )}
              </>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function describePrompt(p: VoiceDesignPrompt): string {
  const band = (n: number) => (n < 1 / 3 ? "low" : n < 2 / 3 ? "mid" : "high");
  return `age ${band(p.age)} · grit ${band(p.grit)} · tone ${band(p.comedy_menace)} · delivery ${band(p.bombast)}`;
}
