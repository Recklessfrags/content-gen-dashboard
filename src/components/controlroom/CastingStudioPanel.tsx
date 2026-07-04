import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Json } from "@/lib/database.types";
import { loadCastBrief } from "@/lib/castBrief";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import {
  addFavorite,
  audioSrcFromBase64,
  CASTING_DAILY_CAP,
  CastingError,
  GENERATION_DEFAULTS,
  GENERATION_RANGES,
  KIT_PREVIEW_SCAFFOLD,
  clampVoiceSettings,
  clampVoiceDesignPrompt,
  clampGeneration,
  clearBracket,
  composeVoiceDescription,
  deleteVoice,
  discard,
  emptyBracket,
  generateVoicePreviews,
  isCast,
  isValidVoiceDescription,
  loadBracket,
  reconcileBracket,
  removeFavorite,
  sampleTextFor,
  saveBracket,
  saveVoiceWinner,
  setPool,
  setWinner,
  synthesizePreview,
  voiceSettingsFrom,
  writeCastToCharacter,
  VOICE_DESCRIPTION_MIN,
  VOICE_DESCRIPTION_SOFT_MAX,
  VOICE_SETTINGS_RANGES,
  type AuditionCandidate,
  type BracketState,
  type VoiceDesignPrompt,
  type VoiceGeneration,
  type VoiceRecipe,
  type VoiceSettings,
} from "@/lib/casting";
import {
  ACCENT_BANK,
  AGE_BAND_OPTIONS,
  EMOTION_BANK,
  GENDER_OPTIONS,
  PACE_BANK,
  PERSONA_BANK,
  PITCH_BANK,
  TIMBRE_BANK,
  assembleKitDescription,
  isBuilderSelections,
  type BuilderSelections,
  type PhraseChip,
  type PhraseSlot,
} from "@/lib/castingPhrases";
import { createClient } from "@/lib/supabase/client";
import {
  createVoiceTemplate,
  deleteVoiceTemplate,
  listVoiceTemplates,
  templateRecipe,
  type VoiceTemplate,
} from "@/lib/voiceTemplates";
import { toBible, type FlatChar } from "./shared";

type CastingStudioPanelProps = {
  character: FlatChar;
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
  onCharacterPatched: (
    id: string,
    patch: { voice_id?: string | null; voice_settings?: Json | null; voice_recipe?: Json | null },
  ) => void;
  showFlash: (msg: string, err?: boolean) => void;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
  variant?: "modal" | "inline";
  suggestedPersonaChipId?: string | null;
};

const GUIDANCE_PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "Low", value: 2 },
  { label: "Mid", value: GENERATION_DEFAULTS.guidance_scale },
  { label: "High", value: 12 },
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

const DEFAULT_BUILDER_SELECTIONS: BuilderSelections = {
  gender: "female",
  ageBand: "40s",
  accent: "general-american",
  timbre: "warm-smooth",
  pitch: "downward-authority",
  pace: "measured-unhurried",
  persona: "deadpan-demystifier",
  emotion: "dry-amused",
};

const CHIP_ROWS: ReadonlyArray<{
  slot: PhraseSlot;
  label: string;
  chips: readonly PhraseChip[];
}> = [
  { slot: "accent", label: "Accent", chips: ACCENT_BANK },
  { slot: "timbre", label: "Timbre", chips: TIMBRE_BANK },
  { slot: "pitch", label: "Pitch", chips: PITCH_BANK },
  { slot: "pace", label: "Pace", chips: PACE_BANK },
  { slot: "persona", label: "Persona", chips: PERSONA_BANK },
  { slot: "emotion", label: "Emotion", chips: EMOTION_BANK },
];

export function purgeCreatedVoiceId(
  createdVoiceIds: Map<string, string>,
  deletedVoiceId: string,
): void {
  for (const [generatedVoiceId, createdVoiceId] of createdVoiceIds) {
    if (createdVoiceId === deletedVoiceId) {
      createdVoiceIds.delete(generatedVoiceId);
    }
  }
}

function withSuggestedPersona(base: BuilderSelections, chipId: string | null | undefined): BuilderSelections {
  if (chipId && PERSONA_BANK.some((p) => p.id === chipId)) {
    return { ...base, persona: chipId };
  }
  return base;
}

export function CastingStudioPanel({
  character,
  supabase,
  onClose,
  onCharacterPatched,
  showFlash,
  restoreFocusRef,
  variant = "modal",
  suggestedPersonaChipId = null,
}: CastingStudioPanelProps) {
  const inline = variant === "inline";
  const suggestedPersonaRef = useRef(suggestedPersonaChipId);
  const panelRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const mainInitialFocusRef = useRef<HTMLElement | null>(null);
  const browseRecordsRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerReturnRef = useRef<HTMLButtonElement>(null);
  const saveDialogRef = useRef<HTMLDivElement>(null);
  const saveNameRef = useRef<HTMLInputElement>(null);
  const saveTriggerRef = useRef<HTMLButtonElement>(null);
  const lockDialogRef = useRef<HTMLDivElement>(null);
  const lockAckRef = useRef<HTMLInputElement>(null);
  const lockReturnRef = useRef<HTMLButtonElement | null>(null);
  const createdVoiceIdsRef = useRef<Map<string, string>>(new Map());
  const characterRecipeInputs = useMemo(
    () => castingInputsFromRecipe(character.voice_recipe),
    [character.voice_recipe],
  );
  const initialBuilderSelections =
    characterRecipeInputs?.builderState ?? withSuggestedPersona(DEFAULT_BUILDER_SELECTIONS, suggestedPersonaChipId);

  const [voiceDescription, setVoiceDescription] = useState(
    () => characterRecipeInputs?.voiceDescription ?? assembleKitDescription(initialBuilderSelections),
  );
  const channelCastBrief = useMemo(() => loadCastBrief(character.id), [character.id]);
  const [builderSelections, setBuilderSelections] = useState<BuilderSelections>(() => initialBuilderSelections);
  const [builderDetached, setBuilderDetached] = useState(() => characterRecipeInputs?.detached ?? false);
  const [sampleText, setSampleText] = useState(() =>
    characterRecipeInputs?.previewText ||
    sampleTextFor({
      codename: character.codename,
      concept: character.concept,
      bible: toBible(character),
    }),
  );
  const [generation, setGeneration] = useState<VoiceGeneration>(
    () => pinUiGeneration(characterRecipeInputs?.generation),
  );
  const [seedInput, setSeedInput] = useState(() =>
    characterRecipeInputs?.generation.seed !== null && characterRecipeInputs?.generation.seed !== undefined
      ? String(characterRecipeInputs.generation.seed)
      : "",
  );
  const [seedNeedsClear, setSeedNeedsClear] = useState(
    () => characterRecipeInputs?.generation.seed !== null && characterRecipeInputs?.generation.seed !== undefined,
  );
  const [bracket, setBracket] = useState<BracketState>(() => loadBracket(character.id));
  const bracketRef = useRef(bracket);
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
  const [templates, setTemplates] = useState<VoiceTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [lockConfirmCandidate, setLockConfirmCandidate] = useState<AuditionCandidate | null>(null);
  const [lockAcknowledged, setLockAcknowledged] = useState(false);

  const synthDirty = useMemo(
    () => (Object.keys(synth) as Array<keyof VoiceSettings>).some((k) => synth[k] !== savedSynth[k]),
    [synth, savedSynth],
  );
  const sampleLen = sampleText.trim().length;
  const sampleValid = sampleLen >= 100 && sampleLen <= 1000;
  const descriptionLen = voiceDescription.trim().length;
  const descriptionValid = isValidVoiceDescription(voiceDescription);
  const canGenerate = descriptionValid && sampleValid && !capReached && !designing;

  useScrollLock(!inline);

  const closeDrawer = useCallback(() => {
    mainInitialFocusRef.current = browseRecordsRef.current;
    setDrawerOpen(false);
  }, []);

  const closeSaveDialog = useCallback(() => {
    mainInitialFocusRef.current = saveTriggerRef.current;
    setSaveDialogOpen(false);
    setTemplateName("");
    setTemplateDescription("");
    setSaveTemplateError(null);
  }, []);

  const openSaveDialog = useCallback(() => {
    setDrawerOpen(false);
    setSaveDialogOpen(true);
  }, []);

  const openDrawer = useCallback(() => {
    closeSaveDialog();
    setDrawerOpen(true);
  }, [closeSaveDialog]);

  const closeLockDialog = useCallback(() => {
    mainInitialFocusRef.current = lockReturnRef.current;
    setLockConfirmCandidate(null);
    setLockAcknowledged(false);
  }, []);

  useFocusTrap({
    active: !inline && !saveDialogOpen && !drawerOpen && !lockConfirmCandidate,
    containerRef: panelRef,
    onEscape: () => {
      onClose();
    },
    initialFocusRef: mainInitialFocusRef,
    restoreFocusRef,
  });

  useFocusTrap({
    active: saveDialogOpen && !lockConfirmCandidate,
    containerRef: saveDialogRef,
    onEscape: closeSaveDialog,
    initialFocusRef: saveNameRef,
    restoreFocusRef: saveTriggerRef,
  });

  useFocusTrap({
    active: drawerOpen && !lockConfirmCandidate,
    containerRef: drawerRef,
    onEscape: closeDrawer,
    initialFocusRef: drawerReturnRef,
    restoreFocusRef: browseRecordsRef,
  });

  useFocusTrap({
    active: Boolean(lockConfirmCandidate),
    containerRef: lockDialogRef,
    onEscape: closeLockDialog,
    initialFocusRef: lockAckRef,
    restoreFocusRef: lockReturnRef,
  });

  useEffect(() => {
    if (saveDialogOpen || drawerOpen || lockConfirmCandidate) return;
    mainInitialFocusRef.current = firstFieldRef.current;
  }, [drawerOpen, saveDialogOpen, lockConfirmCandidate]);

  useEffect(() => {
    suggestedPersonaRef.current = suggestedPersonaChipId;
  }, [suggestedPersonaChipId]);

  // Guard against setState after the panel is closed/unmounted mid-request
  // (Edge/ElevenLabs calls can be slow).
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    bracketRef.current = bracket;
  }, [bracket]);

  useEffect(() => {
    const inputs = castingInputsFromRecipe(character.voice_recipe);
    const nextBuilder = inputs?.builderState ?? withSuggestedPersona(DEFAULT_BUILDER_SELECTIONS, suggestedPersonaRef.current);
    setBuilderSelections(nextBuilder);
    setBuilderDetached(inputs?.detached ?? false);
    setVoiceDescription(inputs?.voiceDescription ?? assembleKitDescription(nextBuilder));
    setSampleText(
      inputs?.previewText ||
        sampleTextFor({
          codename: character.codename,
          concept: character.concept,
          bible: toBible(character),
        }),
    );
    const nextGeneration = pinUiGeneration(inputs?.generation);
    setGeneration(nextGeneration);
    if (nextGeneration.seed !== null) {
      setSeedInput(String(nextGeneration.seed));
      setSeedNeedsClear(true);
    } else {
      setSeedInput("");
      setSeedNeedsClear(false);
    }
    setAppliedTemplateName(null);
    setAppliedNotice(null);
  }, [character.id, character.voice_recipe, character.codename, character.concept]);

  // Reconcile the local bracket against the canonical DB voice on mount and whenever
  // characters.voice_id changes underneath (e.g. a re-cast elsewhere once Realtime lands).
  useEffect(() => {
    const { state, staleWinnerCleared } = reconcileBracket(bracketRef.current, character.voice_id);
    if (staleWinnerCleared) {
      bracketRef.current = state;
      setBracket(state);
      if (aliveRef.current) {
        showFlash("This casting bracket's saved winner no longer matches the character's live voice — cleared.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconcile keys on the DB voice only
  }, [character.voice_id]);

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

  const refreshTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplateError(null);
    try {
      const rows = await listVoiceTemplates(supabase);
      if (!aliveRef.current) return;
      setTemplates(rows);
    } catch (e) {
      if (!aliveRef.current) return;
      setTemplateError(e instanceof Error ? e.message : "Could not load voice templates.");
    } finally {
      if (aliveRef.current) setTemplatesLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  useEffect(() => {
    if (!appliedNotice) return undefined;
    const timer = window.setTimeout(() => {
      if (aliveRef.current) setAppliedNotice(null);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [appliedNotice]);

  useEffect(() => {
    if (drawerOpen) {
      drawerRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (saveDialogOpen) {
      saveDialogRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [saveDialogOpen]);

  useEffect(() => {
    if (lockConfirmCandidate) {
      lockDialogRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [lockConfirmCandidate]);

  const handleLayerMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handleApplyTemplate = (template: VoiceTemplate) => {
    const recipe = templateRecipe(template);
    const nextInputs = castingInputsFromRecipe(recipe as unknown as Json);
    const nextBuilder = nextInputs?.builderState ?? DEFAULT_BUILDER_SELECTIONS;
    setBuilderSelections(nextBuilder);
    setBuilderDetached(nextInputs?.detached ?? !recipe.design_prompt.builder_state);
    setVoiceDescription(nextInputs?.voiceDescription ?? composeVoiceDescription(recipe.design_prompt));
    if (recipe.design_prompt.preview_text_raw) {
      setSampleText(recipe.design_prompt.preview_text_raw);
    }
    setGeneration(pinUiGeneration(recipe.generation));
    if (recipe.generation.seed !== null) {
      setSeedInput(String(recipe.generation.seed));
      setSeedNeedsClear(true);
    } else {
      setSeedInput("");
      setSeedNeedsClear(false);
    }
    setSynth(recipe.voice_settings);
    setAppliedTemplateName(recipe.template_name ?? null);
    setAppliedNotice(recipe.template_name ?? null);
    closeDrawer();
    setTemplateError(null);
  };

  const handleSaveTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingTemplate) return;
    setSaveTemplateError(null);
    setSavingTemplate(true);
    try {
      const created = await createVoiceTemplate(supabase, {
        name: templateName,
        description: templateDescription,
        designPrompt: {
          voice_description_raw: voiceDescription,
          preview_text_raw: sampleText,
          builder_state: builderSelections,
        },
        generation: {
          ...generation,
          seed: seedNeedsClear ? null : generation.seed,
        },
        voiceSettings: synth,
        sourceCodename: character.codename || null,
      });
      if (!aliveRef.current) return;
      setTemplates((rows) =>
        [...rows, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      closeSaveDialog();
      showFlash("✓ Voice profile filed");
    } catch (e) {
      if (!aliveRef.current) return;
      setSaveTemplateError(e instanceof Error ? e.message : "Could not save template.");
    } finally {
      if (aliveRef.current) setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (deletingTemplateId) return;
    setDeletingTemplateId(templateId);
    setTemplateError(null);
    try {
      await deleteVoiceTemplate(supabase, templateId);
      if (!aliveRef.current) return;
      setTemplates((rows) => rows.filter((row) => row.id !== templateId));
      setConfirmDeleteId(null);
    } catch (e) {
      if (!aliveRef.current) return;
      setTemplateError(e instanceof Error ? e.message : "Could not delete template.");
    } finally {
      if (aliveRef.current) setDeletingTemplateId(null);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setError(null);
    setDesigning(true);
    try {
      const activeGeneration = {
        ...generation,
        seed: seedNeedsClear ? null : generation.seed,
      };
      const candidates = await generateVoicePreviews(supabase, {
        voice_description_raw: voiceDescription,
        preview_text: sampleText,
        model_id: activeGeneration.model_id,
        guidance_scale: activeGeneration.guidance_scale,
        seed: activeGeneration.seed,
        quality: activeGeneration.quality,
        builder_state: builderSelections,
      });
      if (!aliveRef.current) return;
      const stamped = candidates.map((candidate) => ({
        ...candidate,
        ...(appliedTemplateName ? { template_name: appliedTemplateName } : {}),
      }));
      setBracket((b) => setPool(b, stamped));
      if (activeGeneration.seed !== null) {
        setSeedNeedsClear(true);
      }
      if (stamped.length === 0) {
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

  const handleRequestLock = (
    candidate: AuditionCandidate,
    trigger: HTMLButtonElement,
  ) => {
    lockReturnRef.current = trigger;
    setDrawerOpen(false);
    setSaveDialogOpen(false);
    setLockConfirmCandidate(candidate);
    setLockAcknowledged(false);
  };

  const handleLock = async (candidate: AuditionCandidate) => {
    if (locking) return;
    const previousVoiceId = character.voice_id;
    setError(null);
    setLocking(candidate.generated_voice_id);
    try {
      const nextSettings = clampVoiceSettings(synth);
      const recipe: VoiceRecipe = {
        design_prompt: {
          ...(candidate.prompt_state ?? {}),
          voice_description_raw: candidateDescription(candidate),
          preview_text_raw: candidatePreviewText(candidate),
          ...(candidate.builder_state ? { builder_state: candidate.builder_state } : {}),
        },
        generation: candidateGeneration(candidate),
        voice_settings: nextSettings,
        ...(candidate.template_name ? { template_name: candidate.template_name } : {}),
      };
      let voiceId = createdVoiceIdsRef.current.get(candidate.generated_voice_id);
      if (!voiceId) {
        voiceId = await saveVoiceWinner(
          supabase,
          character.codename || "Untitled character",
          candidateDescription(candidate),
          candidate.generated_voice_id,
        );
        createdVoiceIdsRef.current.set(candidate.generated_voice_id, voiceId);
      }
      await writeCastToCharacter(supabase, character.id, voiceId, nextSettings, recipe);
      if (!aliveRef.current) return;
      onCharacterPatched(character.id, {
        voice_id: voiceId,
        voice_settings: nextSettings as unknown as Json,
        voice_recipe: recipe as unknown as Json,
      });
      setSynth(nextSettings);
      setSavedSynth(nextSettings);
      setBracket((b) => setWinner(b, candidate, voiceId));
      closeLockDialog();
      showFlash("✓ Voice cast and locked to character");
      if (previousVoiceId && previousVoiceId !== voiceId) {
        try {
          // Intentional: character_bible_revisions is bible-only; keeping dead
          // voice ids needs a future voice-history table, not a schema change here.
          await deleteVoice(supabase, previousVoiceId);
          purgeCreatedVoiceId(createdVoiceIdsRef.current, previousVoiceId);
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

  const applyBuilderSelections = (nextSelections: BuilderSelections) => {
    setBuilderSelections(nextSelections);
    setVoiceDescription(assembleKitDescription(nextSelections));
    setBuilderDetached(false);
  };

  const confirmManualOverwrite = () =>
    !builderDetached || window.confirm("This overwrites your manual edits — proceed?");

  const updateBuilderSelection = (patch: Partial<BuilderSelections>) => {
    if (!confirmManualOverwrite()) return;
    applyBuilderSelections({
      ...builderSelections,
      ...patch,
      other: {
        ...(builderSelections.other ?? {}),
        ...(patch.other ?? {}),
      },
    });
  };

  const updateBuilderSlot = (slot: PhraseSlot, chipId: string) => {
    if (!confirmManualOverwrite()) return;
    const nextOther = { ...(builderSelections.other ?? {}) };
    delete nextOther[slot];
    applyBuilderSelections({
      ...builderSelections,
      [slot]: chipId,
      other: nextOther,
    });
  };

  const updateBuilderOther = (slot: PhraseSlot, text: string) => {
    const nextOther = { ...(builderSelections.other ?? {}), [slot]: text };
    applyBuilderSelections({
      ...builderSelections,
      [slot]: "other",
      other: nextOther,
    });
  };

  const resetBuilderDescription = () => {
    applyBuilderSelections(builderSelections);
  };

  const renderCandidate = (candidate: AuditionCandidate, kind: "pool" | "favorite") => {
    const isWinner = bracket.winner?.generated_voice_id === candidate.generated_voice_id;
    const stampedGeneration = candidateGeneration(candidate);
    const ariaLabel = `Audition candidate — ${stampedGeneration.model_id}, guidance ${stampedGeneration.guidance_scale}, seed ${stampedGeneration.seed ?? "random"}`;
    return (
      <li key={candidate.generated_voice_id} className={"casting-candidate" + (isWinner ? " is-winner" : "")}>
        <div className="casting-candidate-head">
          <span className="eyebrow">
            {isWinner ? "WINNER · " : ""}
            {stampedGeneration.model_id === "eleven_ttv_v3" ? "Voice Design v3" : "Voice Design v2"}
          </span>
          <span className="casting-stamp">
            guidance {stampedGeneration.guidance_scale} · seed {stampedGeneration.seed ?? "random"}
          </span>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- ephemeral TTS audition, no captions exist */}
        <audio
          className="casting-audio"
          controls
          preload="none"
          aria-label={ariaLabel}
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
            onClick={(event) => handleRequestLock(candidate, event.currentTarget)}
          >
            {locking === candidate.generated_voice_id ? "Locking…" : "Lock as winner"}
          </button>
        </div>
      </li>
    );
  };

  const renderTemplateCard = (template: VoiceTemplate) => {
    const recipe = templateRecipe(template);
    const settingsTags = recipe.voice_settings;
    const descriptionPreview = recipe.design_prompt.voice_description_raw ?? composeVoiceDescription(recipe.design_prompt);
    const confirming = confirmDeleteId === template.id;
    const deleting = deletingTemplateId === template.id;

    return (
      <li
        key={template.id}
        className={"ccr-tpl-card" + (confirming ? " is-confirming" : "") + (deleting ? " is-deleting" : "")}
      >
        <div className="ccr-tpl-card__head">
          <div>
            <h4 className="ccr-tpl-card__title">{template.name}</h4>
            {template.source_codename && (
              <p className="ccr-tpl-card__meta">SRC: {template.source_codename}</p>
            )}
          </div>
        </div>
        {template.description && <p className="ccr-tpl-card__desc">{template.description}</p>}
        <div className="ccr-tpl-recipe" aria-label={`Recipe for ${template.name}`}>
          <span className="ccr-tpl-recipe__tag">DESC: {descriptionPreview.trim().length}</span>
          <span className="ccr-tpl-recipe__tag">
            MODEL: {recipe.generation.model_id === "eleven_ttv_v3" ? "v3" : "v2"}
          </span>
          <span className="ccr-tpl-recipe__tag">GUIDE: {recipe.generation.guidance_scale}</span>
          <span className="ccr-tpl-recipe__tag">SEED: {recipe.generation.seed ?? "random"}</span>
          <span className="ccr-tpl-recipe__tag">SPD: {settingsTags.speed.toFixed(2)}</span>
        </div>
        <div className="ccr-tpl-actions">
          {confirming ? (
            <>
              <button
                className="btn ghost compact"
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDeleteId(null)}
              >
                [ CANCEL ]
              </button>
              <button
                className="btn compact ccr-btn-purge"
                type="button"
                disabled={deleting}
                aria-busy={deleting}
                onClick={() => void handleDeleteTemplate(template.id)}
              >
                {deleting ? "[ PURGING... ]" : "[ CONFIRM PURGE ]"}
              </button>
            </>
          ) : (
            <>
              <button className="btn compact ccr-btn-stamp" type="button" onClick={() => handleApplyTemplate(template)}>
                [ LOAD PROFILE ]
              </button>
              <button className="ccr-btn-purge" type="button" onClick={() => setConfirmDeleteId(template.id)}>
                [ PURGE ]
              </button>
            </>
          )}
        </div>
      </li>
    );
  };

  const content = (
    <>
        <div className="col-head">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {!inline && (
              <button ref={firstFieldRef} className="btn ghost close-btn" type="button" onClick={onClose}>
                ← Back
              </button>
            )}
            <h2 id="casting-panel-title">Casting Studio</h2>
          </div>
          <div className="casting-header-actions">
            <button ref={browseRecordsRef} className="ccr-tpl-trigger" type="button" onClick={openDrawer}>
              [ BROWSE RECORDS ({templates.length}) ]
            </button>
            <span className={"chip " + (cast ? "active" : "draft")}>
              {cast ? "CAST" : "UNCAST"}
            </span>
          </div>
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
          {cast && (
            <span className="chip" role="status">
              Currently cast — this character has a live locked voice. Locking a new winner replaces it (the old
              voice is deleted).
            </span>
          )}
        </div>

        <div className="drilldown-content casting-content">
          {error && (
            <p className="history-error" role="alert">
              {error}
            </p>
          )}
          {drawerOpen && (
            <div ref={drawerRef} className="ccr-tpl-drawer" role="region" aria-label="Voice template library">
              <div className="ccr-tpl-header">
                <div>
                  <h3>STANDARDIZED VOICE PROFILES</h3>
                  <p>NOTICE: PREVIEWS UNAVAILABLE IN ARCHIVE. LOAD PROFILE TO AUDITION.</p>
                </div>
                <button ref={drawerReturnRef} className="ccr-tpl-trigger" type="button" onClick={closeDrawer}>
                  [X] RETURN
                </button>
              </div>
              {templateError && (
                <p className="history-error" role="alert">
                  {templateError}
                </p>
              )}
              {templatesLoading ? (
                <p className="ccr-tpl-loading" role="status">[ LOADING RECORDS... ]</p>
              ) : templates.length === 0 ? (
                <div className="ccr-tpl-empty">
                  <h4>NO PROFILES ON RECORD.</h4>
                  <p>
                    The archive is barren. To establish a standardized profile, calibrate the parameters in the
                    Casting Studio and execute the [ FILE AS TEMPLATE ] directive. Hypothetical entries are strictly
                    prohibited; only tested configurations may be filed.
                  </p>
                </div>
              ) : (
                <ul className="ccr-tpl-list">{templates.map(renderTemplateCard)}</ul>
              )}
            </div>
          )}

          {/* ── Voice design (re-cast) ─────────────────────────────────── */}
          <section className="casting-section" aria-labelledby="casting-design-title">
            <h3 id="casting-design-title" className="casting-section-title">
              Voice Design <span className="casting-cost-tag">spends credits · re-cast</span>
            </h3>
            {appliedNotice && (
              <p className="ccr-tpl-applied" role="status">
                [ PARAMETERS LOADED: {appliedNotice} — design + synthesis settings staged ]
              </p>
            )}

            <div className={"casting-card" + (builderDetached ? " is-detached" : "")}>
              <div className="casting-pick-grid">
                <div className="field">
                  <span className="eyebrow">Gender</span>
                  <div className="casting-chip-row" role="group" aria-label="Gender">
                    {GENDER_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        className={"casting-choice-chip" + (builderSelections.gender === option.id ? " is-selected" : "")}
                        type="button"
                        aria-pressed={builderSelections.gender === option.id}
                        disabled={designing}
                        onClick={() => updateBuilderSelection({ gender: option.id })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="eyebrow">Age band</span>
                  <div className="casting-chip-row" role="group" aria-label="Age band">
                    {AGE_BAND_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        className={"casting-choice-chip" + (builderSelections.ageBand === option.id ? " is-selected" : "")}
                        type="button"
                        aria-pressed={builderSelections.ageBand === option.id}
                        disabled={designing}
                        onClick={() => updateBuilderSelection({ ageBand: option.id })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {CHIP_ROWS.map((row) => {
                const selected = builderSelections[row.slot];
                const otherText = builderSelections.other?.[row.slot] ?? "";
                const otherActive = selected === "other" || otherText.trim().length > 0;
                return (
                  <div className="casting-chip-bank" key={row.slot}>
                    <span className="eyebrow">{row.label}</span>
                    <div className="casting-chip-row" role="group" aria-label={row.label}>
                      {row.chips.map((chip) => (
                        <button
                          key={chip.id}
                          className={"casting-choice-chip" + (selected === chip.id ? " is-selected" : "")}
                          type="button"
                          aria-pressed={selected === chip.id}
                          disabled={designing}
                          onClick={() => updateBuilderSlot(row.slot, chip.id)}
                        >
                          {chip.label}
                        </button>
                      ))}
                      <button
                        className={"casting-choice-chip" + (otherActive ? " is-selected" : "")}
                        type="button"
                        aria-pressed={otherActive}
                        disabled={designing}
                        onClick={() => updateBuilderSelection({ [row.slot]: "other", other: { [row.slot]: otherText } })}
                      >
                        Other...
                      </button>
                    </div>
                    {otherActive && (
                      <input
                        className="casting-other-input"
                        type="text"
                        value={otherText}
                        disabled={designing || builderDetached}
                        aria-label={`Other ${row.label}`}
                        onChange={(event) => updateBuilderOther(row.slot, event.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="field">
              <label htmlFor="casting-description">
                <span className="eyebrow">Assembled voice description</span>
                <span className="field-label-side">
                  {builderDetached && (
                    <button
                      className="btn ghost compact"
                      type="button"
                      disabled={designing}
                      onClick={resetBuilderDescription}
                    >
                      Reset to picks
                    </button>
                  )}
                  <span className={"hint" + (descriptionValid ? "" : " error-hint")}>
                    {descriptionLen} chars · min {VOICE_DESCRIPTION_MIN} · target {VOICE_DESCRIPTION_SOFT_MAX}
                  </span>
                </span>
              </label>
              <textarea
                id="casting-description"
                value={voiceDescription}
                rows={8}
                disabled={designing}
                aria-invalid={!descriptionValid}
                onChange={(event) => {
                  setVoiceDescription(event.target.value);
                  setBuilderDetached(true);
                }}
              />
              {channelCastBrief?.voice_description && channelCastBrief.voice_description !== voiceDescription && (
                <button
                  type="button"
                  className="btn ghost compact"
                  disabled={designing}
                  onClick={() => {
                    setVoiceDescription(channelCastBrief.voice_description);
                    setBuilderDetached(true);
                  }}
                >
                  Seed from channel cast brief
                </button>
              )}
            </div>

            <div className="field">
              <label htmlFor="casting-sample">
                <span className="eyebrow">Audition script</span>
                <span className="field-label-side">
                  <span className={"hint" + (sampleValid ? "" : " error-hint")}>{sampleLen}/1000 · min 100</span>
                </span>
              </label>
              <textarea
                id="casting-sample"
                value={sampleText}
                rows={5}
                disabled={designing}
                aria-invalid={!sampleValid}
                onChange={(event) => setSampleText(event.target.value)}
              />
              <p className="hint casting-prose">
                Use a real cold-open + a reveal beat; punctuation drives the delivery.
              </p>
              <div className="casting-inline-actions">
                <button
                  className="btn ghost compact"
                  type="button"
                  disabled={designing}
                  onClick={() => setSampleText(KIT_PREVIEW_SCAFFOLD)}
                >
                  Insert KIT preview scaffold
                </button>
              </div>
            </div>

            <div className="casting-generation-grid">
              <div className="field">
                <span className="eyebrow">Model</span>
                <div className="casting-readonly-pill" aria-label="Voice model">Voice Design v3</div>
              </div>
              <div className="field">
                <label htmlFor="casting-guidance">
                  <span className="eyebrow">Guidance scale</span>
                  <span className="field-label-side">
                    <span className="hint">{generation.guidance_scale}</span>
                  </span>
                </label>
                <div className="status-segmented-control casting-guidance-presets" role="group" aria-label="Guidance presets">
                  {GUIDANCE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      className={"segment-btn" + (generation.guidance_scale === preset.value ? " active-segment" : "")}
                      type="button"
                      aria-pressed={generation.guidance_scale === preset.value}
                      disabled={designing}
                      onClick={() => setGeneration((value) => ({ ...value, guidance_scale: preset.value }))}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  id="casting-guidance"
                  type="range"
                  min={GENERATION_RANGES.guidance_scale.min}
                  max={GENERATION_RANGES.guidance_scale.max}
                  step={1}
                  value={generation.guidance_scale}
                  disabled={designing}
                  onChange={(event) =>
                    setGeneration((value) => ({ ...value, guidance_scale: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="casting-seed">
                  <span className="eyebrow">Seed</span>
                  <span className="field-label-side">
                    <span className="hint">{seedInput.trim() ? "pinned" : "random"}</span>
                  </span>
                </label>
                <div className="casting-seed-row">
                  <input
                    id="casting-seed"
                    type="number"
                    min={GENERATION_RANGES.seed.min}
                    max={GENERATION_RANGES.seed.max}
                    step={1}
                    value={seedInput}
                    disabled={designing}
                    placeholder="Random"
                    onChange={(event) => {
                      const next = event.target.value;
                      setSeedInput(next);
                      setSeedNeedsClear(false);
                      setGeneration((value) => ({ ...value, seed: clampGeneration({ ...value, seed: next }).seed }));
                    }}
                  />
                  <button
                    className="btn ghost compact"
                    type="button"
                    disabled={designing}
                    onClick={() => {
                      setSeedInput("");
                      setSeedNeedsClear(false);
                      setGeneration((value) => ({ ...value, seed: null }));
                    }}
                  >
                    New seed / clear
                  </button>
                </div>
                {seedNeedsClear && (
                  <p className="hint casting-seed-warning" role="status">
                    Loaded seed will not be reused unless edited; clear it for a visibly random run.
                  </p>
                )}
              </div>
            </div>

            <div className="casting-generate-row">
              <p className="casting-credit-warning" role="note">
                Generating previews spends ElevenLabs credits.
                {castsLeft !== null && (
                  <> {castsLeft} of {CASTING_DAILY_CAP} casts left today.</>
                )}
              </p>
              <div className="casting-primary-actions">
                <button
                  className="btn"
                  type="button"
                  disabled={!canGenerate}
                  aria-busy={designing}
                  onClick={handleGenerate}
                >
                  {designing ? "Synthesizing…" : "Generate previews"}
                </button>
                <button ref={saveTriggerRef} className="ccr-tpl-save-btn" type="button" onClick={openSaveDialog}>
                  [ FILE AS TEMPLATE ]
                </button>
                {appliedTemplateName && (
                  <span className="ccr-tpl-source">seeded from: {appliedTemplateName}</span>
                )}
              </div>
            </div>

            {saveDialogOpen && (
              <div className="ccr-tpl-dialog" role="dialog" aria-modal="true" aria-labelledby="ccr-tpl-dialog-title" ref={saveDialogRef}>
                <form onSubmit={handleSaveTemplate}>
                  <h4 id="ccr-tpl-dialog-title">FILE VOICE PROFILE</h4>
                  <label htmlFor="ccr-tpl-name">
                    <span className="eyebrow">DESIGNATION</span>
                  </label>
                  <input
                    ref={saveNameRef}
                    id="ccr-tpl-name"
                    type="text"
                    value={templateName}
                    minLength={2}
                    maxLength={60}
                    required
                    aria-invalid={Boolean(saveTemplateError)}
                    aria-describedby={saveTemplateError ? "ccr-tpl-name-error" : undefined}
                    onChange={(event) => {
                      setTemplateName(event.target.value);
                      setSaveTemplateError(null);
                    }}
                  />
                  {saveTemplateError && (
                    <p id="ccr-tpl-name-error" className="ccr-tpl-error" role="alert">
                      {saveTemplateError}
                    </p>
                  )}
                  <label htmlFor="ccr-tpl-description">
                    <span className="eyebrow">REMARKS</span>
                  </label>
                  <textarea
                    id="ccr-tpl-description"
                    rows={3}
                    value={templateDescription}
                    onChange={(event) => setTemplateDescription(event.target.value)}
                  />
                  <div className="ccr-tpl-dialog-actions">
                    <button className="btn ghost compact" type="button" disabled={savingTemplate} onClick={closeSaveDialog}>
                      [ CANCEL ]
                    </button>
                    <button className="btn compact ccr-btn-stamp" type="submit" disabled={savingTemplate} aria-busy={savingTemplate}>
                      {savingTemplate ? "[ PROCESSING... ]" : "[ STAMP RECORD ]"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {capReached && (
              <p className="history-error" role="status">
                Daily casting cap reached. Re-casting unlocks tomorrow.
              </p>
            )}
          </section>

          {lockConfirmCandidate && (
            <div
              ref={lockDialogRef}
              className="ccr-tpl-dialog casting-lock-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="casting-lock-title"
            >
              <h4 id="casting-lock-title">CONFIRM AUDITIONED WINNER</h4>
              <div className="casting-lock-summary">
                <div>
                  <span className="eyebrow">TARGET</span>
                  <p>{character.codename || "Untitled character"}</p>
                </div>
                <div>
                  <span className="eyebrow">DESCRIPTION</span>
                  <pre>{candidateDescription(lockConfirmCandidate)}</pre>
                </div>
                <div>
                  <span className="eyebrow">AUDITION SCRIPT</span>
                  <pre>{candidatePreviewText(lockConfirmCandidate)}</pre>
                </div>
                <div>
                  <span className="eyebrow">GENERATION</span>
                  <p>{generationSummary(candidateGeneration(lockConfirmCandidate))}</p>
                </div>
              </div>
              <label className="casting-toggle casting-ack">
                <input
                  ref={lockAckRef}
                  type="checkbox"
                  checked={lockAcknowledged}
                  onChange={(event) => setLockAcknowledged(event.target.checked)}
                />
                <span>I&apos;ve auditioned this voice on representative copy</span>
              </label>
              <div className="ccr-tpl-dialog-actions">
                <button
                  className="btn ghost compact"
                  type="button"
                  disabled={locking !== null}
                  onClick={closeLockDialog}
                >
                  [ CANCEL ]
                </button>
                <button
                  className="btn compact ccr-btn-stamp"
                  type="button"
                  disabled={!lockAcknowledged || locking !== null}
                  aria-busy={locking === lockConfirmCandidate.generated_voice_id}
                  onClick={() => void handleLock(lockConfirmCandidate)}
                >
                  {locking === lockConfirmCandidate.generated_voice_id ? "[ LOCKING... ]" : "[ CONFIRM LOCK ]"}
                </button>
              </div>
            </div>
          )}

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
    </>
  );

  if (inline) {
    return (
      <section ref={panelRef} className="casting-inline" aria-labelledby="casting-panel-title">
        {(drawerOpen || saveDialogOpen || lockConfirmCandidate) && (
          <div className="casting-inline-backdrop" aria-hidden="true" />
        )}
        {content}
      </section>
    );
  }

  return (
    <div className="history-layer" role="presentation" onMouseDown={handleLayerMouseDown}>
      <aside
        ref={panelRef}
        className="drilldown-panel casting-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="casting-panel-title"
      >
        {content}
      </aside>
    </div>
  );
}

function candidateDescription(candidate: AuditionCandidate): string {
  return candidate.voice_description_raw || composeVoiceDescription(candidate.prompt_state ?? {});
}

function candidatePreviewText(candidate: AuditionCandidate): string {
  return candidate.preview_text_raw || "";
}

function candidateGeneration(candidate: AuditionCandidate): VoiceGeneration {
  return clampGeneration({
    model_id: candidate.model_id,
    guidance_scale: candidate.guidance_scale,
    seed: candidate.seed,
    quality: candidate.quality,
  });
}

function generationSummary(generation: VoiceGeneration): string {
  return [
    `model_id: ${generation.model_id}`,
    `guidance_scale: ${generation.guidance_scale}`,
    `seed: ${generation.seed ?? "random"}`,
    `quality: ${generation.quality ?? "default"}`,
  ].join(" · ");
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function castingInputsFromRecipe(recipeJson: Json | null): {
  voiceDescription: string;
  previewText: string;
  generation: VoiceGeneration;
  builderState: BuilderSelections | null;
  detached: boolean;
} | null {
  const recipe = jsonRecord(recipeJson);
  if (Object.keys(recipe).length === 0) return null;
  const designPrompt = clampVoiceDesignPrompt(
    jsonRecord(recipe.design_prompt) as Partial<VoiceDesignPrompt>,
  );
  const voiceDescription =
    typeof designPrompt.voice_description_raw === "string" &&
    designPrompt.voice_description_raw.trim().length > 0
      ? designPrompt.voice_description_raw
      : composeVoiceDescription(designPrompt);
  const builderState = isBuilderSelections(designPrompt.builder_state)
    ? designPrompt.builder_state
    : null;
  const assembled = builderState ? assembleKitDescription(builderState) : "";
  const previewText =
    typeof designPrompt.preview_text_raw === "string" ? designPrompt.preview_text_raw : "";
  return {
    voiceDescription,
    previewText,
    generation: clampGeneration(jsonRecord(recipe.generation)),
    builderState,
    detached: builderState ? voiceDescription !== assembled : true,
  };
}

function pinUiGeneration(generation: VoiceGeneration | null | undefined): VoiceGeneration {
  return {
    ...(generation ?? GENERATION_DEFAULTS),
    model_id: GENERATION_DEFAULTS.model_id,
  };
}
