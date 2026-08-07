"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CHARACTER_CONCEPT_MAX,
  CHARACTER_CONCEPT_MIN,
  CharacterGenerationError,
  generateCharacter,
  type GeneratedCharacter,
} from "@/lib/castingCharacter";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";

export function CharacterGenerator({
  supabase,
  concept,
  onGenerated,
}: {
  supabase: SupabaseClient<SupabaseCompatibleDatabase>;
  concept: string;
  onGenerated: (character: GeneratedCharacter) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capReached, setCapReached] = useState(false);
  const conceptLength = concept.trim().length;

  const generate = async () => {
    if (generating || capReached) return;
    setGenerating(true);
    setError(null);
    try {
      onGenerated(await generateCharacter(supabase, concept));
    } catch (caught) {
      const generationError = caught instanceof CharacterGenerationError
        ? caught
        : new CharacterGenerationError("Could not generate a character.");
      setError(generationError.message);
      if (generationError.capReached) setCapReached(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="character-generator" aria-live="polite">
      <button
        className="btn ghost"
        type="button"
        onClick={() => void generate()}
        disabled={
          generating ||
          capReached ||
          conceptLength < CHARACTER_CONCEPT_MIN ||
          conceptLength > CHARACTER_CONCEPT_MAX
        }
      >
        {generating ? "Generating…" : "Generate from concept"}
      </button>
      <p className="hint">Creates an editable character draft. Review every field before saving.</p>
      {error && (
        <p className="character-generator-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
