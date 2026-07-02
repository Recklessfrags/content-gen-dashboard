import { useCallback, useRef, useState } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { Character } from "@/lib/types";
import {
  applyEditableSnapshot,
  editableSnapshot,
  flatten,
  savedSnapshotsById,
  type EditableCharacterFields,
  type FlatChar,
} from "@/components/controlroom/shared";

type CharacterLoadResult =
  | { ok: true; chars: FlatChar[] }
  | { ok: false; error: string };

export function useCharacters(supabase: ReturnType<typeof createClient>) {
  const [chars, setChars] = useState<FlatChar[]>([]);
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, EditableCharacterFields>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const refetch = useCallback(
    async (onLoaded?: (flat: FlatChar[]) => void): Promise<CharacterLoadResult | undefined> => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .order("created_at", { ascending: true })
        .returns<Character[]>();

      if (requestRef.current !== requestId) return undefined;
      setLoading(false);
      if (error) {
        setChars([]);
        setSavedSnapshots({});
        setLoadError(error.message);
        return { ok: false, error: error.message };
      }

      const flat = (data ?? []).map(flatten);
      setChars(flat);
      setSavedSnapshots(savedSnapshotsById(flat));
      onLoaded?.(flat);
      return { ok: true, chars: flat };
    },
    [supabase],
  );

  const setField = useCallback((id: string | null, field: keyof FlatChar, val: string) => {
    if (!id) return;
    setChars((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
  }, []);

  const applySnapshot = useCallback((id: string, snapshot: EditableCharacterFields) => {
    setChars((cs) => cs.map((c) => (c.id === id ? applyEditableSnapshot(c, snapshot) : c)));
  }, []);

  const patchCharacter = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<FlatChar, "voice_id" | "voice_settings" | "voice_recipe" | "reference_image_url" | "visual_style">
      >,
    ) => {
      setChars((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    },
    [],
  );

  const applyCharacter = useCallback((id: string, character: FlatChar) => {
    setChars((cs) => cs.map((c) => (c.id === id ? character : c)));
  }, []);

  const addCharacter = useCallback(async () => {
    const { data, error } = await supabase
      .from("characters")
      .insert({ codename: "New character", status: "draft", bible: {} })
      .select("*")
      .single();

    if (error || !data) return { data: null, error };

    const flat = flatten(data as Character);
    setChars((cs) => [...cs, flat]);
    setSavedSnapshots((snapshots) => ({ ...snapshots, [flat.id]: editableSnapshot(flat) }));
    return { data: flat, error: null };
  }, [supabase]);

  const commitSnapshot = useCallback((id: string, snapshot: EditableCharacterFields) => {
    setSavedSnapshots((snapshots) => ({
      ...snapshots,
      [id]: snapshot,
    }));
  }, []);

  return {
    chars,
    loading,
    loadError,
    savedSnapshots,
    refetch,
    setField,
    applySnapshot,
    applyCharacter,
    patchCharacter,
    addCharacter,
    commitSnapshot,
  };
}
