import { useCallback, useRef, useState } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { Idea, IdeaStatus } from "@/lib/types";
import type { WireIdea } from "@/components/controlroom/shared";

type UseIdeasOptions = {
  showFlash: (msg: string, err?: boolean) => void;
};

const makeTempIdeaId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useIdeas(
  supabase: ReturnType<typeof createClient>,
  { showFlash }: UseIdeasOptions,
) {
  const [ideas, setIdeas] = useState<WireIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingTitle, setSubmittingTitle] = useState<string | null>(null);
  const requestRef = useRef(0);
  const submittingTitleRef = useRef<string | null>(null);

  const refetch = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Idea[]>();

    if (requestRef.current !== requestId) return;
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    setIdeas((current) => {
      const localOnly = current.filter((idea) => idea.clientWriteState);
      const localIds = new Set(localOnly.map((idea) => idea.id));
      const remote = (data ?? []).filter((idea) => !localIds.has(idea.id));
      return [...localOnly, ...remote];
    });
  }, [supabase]);

  const startIdeaInsert = useCallback(
    async (
      tempId: string,
      title: string,
      note: string,
      characterId: string | null,
      channel: string,
    ) => {
      if (submittingTitleRef.current === title) return;
      submittingTitleRef.current = title;
      setSubmittingTitle(title);

      setIdeas((xs) =>
        xs.map((idea) =>
          idea.id === tempId
            ? { ...idea, clientWriteState: "saving", clientError: undefined }
            : idea,
        ),
      );

      const { data, error } = await supabase
        .from("ideas")
        .insert({
          title,
          note,
          character_id: characterId,
          channel,
          status: "backlog",
        })
        .select("*")
        .single();

      submittingTitleRef.current = null;
      setSubmittingTitle(null);

      if (error || !data) {
        const message = error?.message ?? "Unknown database error";
        showFlash("Could not log idea — " + message, true);
        setIdeas((xs) =>
          xs.map((idea) =>
            idea.id === tempId
              ? { ...idea, clientWriteState: "failed", clientError: message }
              : idea,
          ),
        );
        return;
      }

      const savedIdea: WireIdea = { ...(data as Idea), clientKey: tempId };
      // Dedup-aware swap: if a concurrent refetch already supplied the real row
      // while this insert was in flight, drop that duplicate and keep only the
      // swapped optimistic card (stable key = tempId). Prevents two cards sharing
      // the same real id when "retry"/refetch overlaps an in-flight insert.
      setIdeas((xs) => {
        const withoutDup = xs.filter(
          (idea) => idea.id !== savedIdea.id || idea.id === tempId,
        );
        return withoutDup.map((idea) => (idea.id === tempId ? savedIdea : idea));
      });
    },
    [showFlash, supabase],
  );

  const addIdea = useCallback(
    async (title: string, note: string, characterId: string | null, channel: string) => {
      if (!title || submittingTitleRef.current === title) return;

      const tempId = makeTempIdeaId();
      const optimisticIdea: WireIdea = {
        id: tempId,
        owner: "",
        title,
        note,
        character_id: characterId,
        channel,
        status: "backlog",
        created_at: new Date().toISOString(),
        clientKey: tempId,
        clientWriteState: "saving",
      };

      setError(null);
      setLoading(false);
      setIdeas((xs) => [optimisticIdea, ...xs]);
      await startIdeaInsert(tempId, title, note, optimisticIdea.character_id, optimisticIdea.channel);
    },
    [startIdeaInsert],
  );

  const retryIdea = useCallback(
    (idea: WireIdea) => {
      if (!idea.clientWriteState || idea.clientWriteState !== "failed") return;
      void startIdeaInsert(
        idea.id,
        idea.title.trim(),
        idea.note.trim(),
        idea.character_id,
        idea.channel,
      );
    },
    [startIdeaInsert],
  );

  const dismissIdea = useCallback((id: string) => {
    setIdeas((xs) => xs.filter((idea) => idea.id !== id));
  }, []);

  const setIdeaStatus = useCallback(
    async (id: string, targetStatus: IdeaStatus) => {
      const idea = ideas.find((x) => x.id === id);
      if (!idea || idea.clientWriteState) return;
      if (idea.status === targetStatus) return;
      setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, status: targetStatus } : x)));
      const { error } = await supabase.from("ideas").update({ status: targetStatus }).eq("id", id);
      if (error) {
        // revert on failure
        setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, status: idea.status } : x)));
        showFlash("Status update failed", true);
      }
    },
    [ideas, showFlash, supabase],
  );

  const setIdeaField = useCallback(
    async (id: string, f: "character_id" | "channel", v: string) => {
      const prev = ideas.find((x) => x.id === id);
      if (!prev || prev.clientWriteState) return;
      const valueToPersist = f === "character_id" && v === "" ? null : v;
      setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, [f]: valueToPersist } : x)));
      const { error } =
        f === "character_id"
          ? await supabase.from("ideas").update({ character_id: valueToPersist }).eq("id", id)
          : await supabase.from("ideas").update({ channel: v }).eq("id", id);
      if (error && prev) {
        setIdeas((xs) => xs.map((x) => (x.id === id ? prev : x)));
        showFlash("Tag update failed", true);
      }
    },
    [ideas, showFlash, supabase],
  );

  return {
    ideas,
    loading,
    error,
    submittingTitle,
    refetch,
    addIdea,
    retryIdea,
    dismissIdea,
    setIdeaStatus,
    setIdeaField,
  };
}
