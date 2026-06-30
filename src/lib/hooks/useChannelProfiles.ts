import { useCallback, useEffect, useRef, useState } from "react";
import type { ChannelProfile } from "@/lib/channelProfiles";
import type { createClient } from "@/lib/supabase/client";

export function useChannelProfiles(supabase: ReturnType<typeof createClient>) {
  const [profiles, setProfiles] = useState<ChannelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("channel_profiles")
      .select("*")
      .order("channel", { ascending: true })
      .returns<ChannelProfile[]>();
    if (requestRef.current !== requestId) return;
    setLoading(false);
    if (error) {
      setProfiles([]);
      setError(error.message);
      return;
    }
    setProfiles(data ?? []);
  }, [supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { profiles, loading, error, refetch };
}
